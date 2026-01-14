import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface AnalyzePhotoInput {
  id: string;
  storageKey: string;
  originalFilename: string;
}

interface LabRequestBody {
  photos: AnalyzePhotoInput[];
}

interface RoomInventoryItem {
  label: string;
  category: string;
  quantity: number;
  confidence: number;
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  volumeM3?: number | null;
  valueEstimateEur?: number | null;
  valueJustification?: string | null;
  flags?: {
    fragile?: boolean;
    highValue?: boolean;
    requiresDisassembly?: boolean;
  };
}

interface LabRoom {
  roomId: string;
  roomType: string;
  label: string;
  photoIds: string[];
  items: RoomInventoryItem[];
}

interface RoomGuessAlternative {
  roomType: string;
  confidence: number;
}

interface PhotoClassificationResult {
  photoId: string;
  roomGuessPrimary: string | null;
  roomGuessConfidence: number | null;
  roomGuessAlternatives: RoomGuessAlternative[];
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const CLAUDE_MODEL_CLASSIFY =
  process.env.CLAUDE_MODEL_CLASSIFY ??
  process.env.CLAUDE_MODEL ??
  "claude-3-5-haiku-20241022";

const ROOM_TYPE_LABELS: Record<string, string> = {
  SALON: "Salon",
  CUISINE: "Cuisine",
  CHAMBRE: "Chambre",
  SALLE_DE_BAIN: "Salle de bain",
  WC: "WC",
  COULOIR: "Couloir",
  BUREAU: "Bureau",
  BALCON: "Balcon",
  CAVE: "Cave",
  GARAGE: "Garage",
  ENTREE: "Entrée",
  AUTRE: "Autre pièce",
  INCONNU: "À classer / incertain",
};

// Limite de photos par pièce pour l'analyse détaillée
const IS_PROD = process.env.NODE_ENV === "production";
const MAX_PHOTOS_PER_ROOM = Number(process.env.AI_MAX_PHOTOS_PER_ROOM ?? (IS_PROD ? "6" : "10"));

// Limite globale de photos analysées (pour éviter timeouts / OOM en prod)
const MAX_PHOTOS_TOTAL = Number(process.env.AI_MAX_PHOTOS_TOTAL ?? (IS_PROD ? "12" : "50"));

// Concurrence max pour les appels de classification (éviter de tout lancer d'un coup)
const CLASSIFY_CONCURRENCY = Number(
  process.env.AI_LAB_CLASSIFY_CONCURRENCY ?? (IS_PROD ? "3" : "6")
);

// Timeout/budget global pour éviter de faire tomber l'upstream (nginx 502)
const LAB_PROCESS2_BUDGET_MS = Number(process.env.AI_LAB_TIMEOUT_MS ?? "55000");
const CLAUDE_CALL_TIMEOUT_MS = Number(process.env.AI_CLAUDE_TIMEOUT_MS ?? "20000");

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function buildClassificationPrompt(photo: AnalyzePhotoInput): string {
  return `
Tu es un assistant qui aide à un déménagement.
On te montre UNE photo d'un logement. Tu dois deviner à quelle pièce elle correspond.

Réponds STRICTEMENT en JSON, sans texte avant ou après, avec la forme :
{
  "roomGuessPrimary": "SALON|CUISINE|CHAMBRE|SALLE_DE_BAIN|WC|COULOIR|BUREAU|BALCON|CAVE|GARAGE|ENTREE|AUTRE",
  "roomGuessConfidence": 0.0,
  "roomGuessAlternatives": [
    { "roomType": "CHAMBRE", "confidence": 0.6 },
    { "roomType": "BUREAU", "confidence": 0.3 }
  ]
}

Informations sur le fichier :
- id interne : "${photo.id}"
- nom de fichier : "${photo.originalFilename}"
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now();
    const json = (await req.json().catch(() => ({}))) as LabRequestBody;

    if (!json || !Array.isArray(json.photos) || json.photos.length === 0) {
      return NextResponse.json(
        { error: "Aucune photo fournie pour l'analyse (lab-process2)." },
        { status: 400 }
      );
    }

    if (!process.env.CLAUDE_API_KEY) {
      console.warn(
        "[AI][LabProcess2] CLAUDE_API_KEY manquant – aucune analyse effectuée."
      );
      return NextResponse.json({
        model: "no-key",
        rooms: [] as LabRoom[],
        totalMs: 0,
      });
    }

    // 1) Lecture des images (en parallèle) puis classification par photo (même logique que la prod)
    const photoImages = new Map<string, string>(); // photoId -> base64
    const classifications: PhotoClassificationResult[] = [];

    // Cap global (prod): éviter les timeouts / surcharge
    const photosCapped = json.photos.slice(0, MAX_PHOTOS_TOTAL);

    const loaded = await Promise.all(
      photosCapped.map(async (photo) => {
        const fullPath = path.join(UPLOAD_DIR, photo.storageKey);
        try {
          const buffer = await fs.readFile(fullPath);
          const base64 = buffer.toString("base64");
          photoImages.set(photo.id, base64);
          return { photo, base64 };
        } catch (error) {
          console.error(
            `[AI][LabProcess2] Erreur de lecture de la photo ${photo.id}:`,
            error
          );
          return null;
        }
      })
    );

    const validLoaded = loaded.filter(
      (x): x is { photo: AnalyzePhotoInput; base64: string } => x !== null
    );

    // Concurrence limitée pour la classification
    const classifyBatches: { photo: AnalyzePhotoInput; base64: string }[][] = [];
    for (let i = 0; i < validLoaded.length; i += CLASSIFY_CONCURRENCY) {
      classifyBatches.push(validLoaded.slice(i, i + CLASSIFY_CONCURRENCY));
    }

    for (const batch of classifyBatches) {
      if (Date.now() - startedAt > LAB_PROCESS2_BUDGET_MS) {
        console.warn("[AI][LabProcess2] Budget temps atteint pendant classification, stop.");
        break;
      }
      await Promise.all(
        batch.map(async ({ photo, base64 }) => {
        try {
          const prompt = buildClassificationPrompt(photo);

          const timeLeft = LAB_PROCESS2_BUDGET_MS - (Date.now() - startedAt);
          if (timeLeft < 1500) return;

          const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": process.env.CLAUDE_API_KEY as string,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: CLAUDE_MODEL_CLASSIFY,
              max_tokens: 300,
              temperature: 0.1,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    {
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: "image/jpeg",
                        data: base64,
                      },
                    },
                  ],
                },
              ],
            }),
          }, Math.min(CLAUDE_CALL_TIMEOUT_MS, Math.max(1500, timeLeft - 500)));

          if (!res.ok) {
            console.error(
              `[AI][LabProcess2] Erreur classification photo ${photo.id}:`,
              await res.text()
            );
            return;
          }

          const data = (await res.json()) as any;
          const text = data?.content?.[0]?.text ?? "";

          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch {
            console.error(
              `[AI][LabProcess2] Réponse classification non JSON pour la photo ${photo.id}:`,
              text
            );
            return;
          }

          const primary: string | null = parsed?.roomGuessPrimary ?? null;
          const confidence: number | null =
            typeof parsed?.roomGuessConfidence === "number"
              ? parsed.roomGuessConfidence
              : null;
          const alternatives: RoomGuessAlternative[] = Array.isArray(
            parsed?.roomGuessAlternatives
          )
            ? parsed.roomGuessAlternatives.filter(
                (alt: any) =>
                  alt &&
                  typeof alt.roomType === "string" &&
                  typeof alt.confidence === "number"
              )
            : [];

          classifications.push({
            photoId: photo.id,
            roomGuessPrimary: primary,
            roomGuessConfidence: confidence,
            roomGuessAlternatives: alternatives,
          });
        } catch (error) {
          if ((error as any)?.name === "AbortError") {
            console.warn(
              `[AI][LabProcess2] Timeout classification photo ${photo.id} (skip)`
            );
            return;
          }
          console.error(
            `[AI][LabProcess2] Erreur de classification pour la photo ${photo.id}:`,
            error
          );
        }
      })
      );
    }

    // 2) Seconde passe : re‑classification des photos peu confiantes
    const HIGH_CONF_THRESHOLD = 0.9;
    const LOW_CONF_THRESHOLD = 0.6;

    const benchmarksByRoom = new Map<string, string[]>(); // roomType -> [photoId]
    for (const cls of classifications) {
      if (
        cls.roomGuessPrimary &&
        cls.roomGuessPrimary !== "AUTRE" &&
        cls.roomGuessPrimary !== "INCONNU" &&
        (cls.roomGuessConfidence ?? 0) >= HIGH_CONF_THRESHOLD
      ) {
        const list = benchmarksByRoom.get(cls.roomGuessPrimary) ?? [];
        list.push(cls.photoId);
        benchmarksByRoom.set(cls.roomGuessPrimary, list);
      }
    }

    // On tente de corriger uniquement les cas douteux
    await Promise.all(
      classifications.map(async (cls) => {
        const primary = cls.roomGuessPrimary;
        const confidence = cls.roomGuessConfidence ?? 0;

        const isDoubtful =
          !primary ||
          primary === "AUTRE" ||
          primary === "INCONNU" ||
          confidence < LOW_CONF_THRESHOLD;

        if (!isDoubtful) return;

        // On cherche une alternative plausible qui dispose d'au moins une photo "benchmark"
        const candidates: RoomGuessAlternative[] = [];
        if (primary && primary !== "AUTRE" && primary !== "INCONNU") {
          candidates.push({ roomType: primary, confidence });
        }
        candidates.push(
          ...cls.roomGuessAlternatives.filter(
            (alt) =>
              alt.roomType !== "AUTRE" &&
              alt.roomType !== "INCONNU" &&
              alt.confidence >= 0.3
          )
        );

        for (const alt of candidates) {
          const bench = benchmarksByRoom.get(alt.roomType);
          if (!bench || bench.length === 0) continue;

          const refId = bench[0];
          const refImg = photoImages.get(refId);
          const candImg = photoImages.get(cls.photoId);
          if (!refImg || !candImg) continue;

          try {
            const same = await callClaudeSameRoom(
              alt.roomType,
              refImg,
              candImg
            );
            if (same?.sameRoom && (same.confidence ?? 0) >= 0.6) {
              cls.roomGuessPrimary = alt.roomType;
              cls.roomGuessConfidence = same.confidence ?? alt.confidence;
              return;
            }
          } catch (error) {
            console.error(
              "[AI][LabProcess2] Erreur re‑classification same-room:",
              error
            );
          }
        }
      })
    );

    // 3) Regroupement par type de pièce
    const byRoomType = new Map<string, string[]>(); // roomType -> [photoId]
    for (const r of classifications) {
      const type = r.roomGuessPrimary ?? "INCONNU";
      const list = byRoomType.get(type) ?? [];
      list.push(r.photoId);
      byRoomType.set(type, list);
    }

    // 3) Inventaire par pièce avec mesures / volumes / valeurs
    const rooms: LabRoom[] = [];

    const roomEntries = Array.from(byRoomType.entries()).filter(
      ([roomType]) => roomType !== "INCONNU"
    );

    const inventoryStart = Date.now();

    await Promise.all(
      roomEntries.map(async ([roomType, photoIds], index) => {
        if (Date.now() - startedAt > LAB_PROCESS2_BUDGET_MS) {
          return;
        }
        const label = ROOM_TYPE_LABELS[roomType] ?? roomType;

        const selectedPhotoIds = photoIds.slice(0, MAX_PHOTOS_PER_ROOM);
        const imagesForRoom = selectedPhotoIds
          .map((id) => photoImages.get(id))
          .filter((b64): b64 is string => !!b64);

        if (imagesForRoom.length === 0) return;

        const photosMeta = json.photos.filter((p) =>
          selectedPhotoIds.includes(p.id)
        );

        let items: RoomInventoryItem[] = [];
        try {
          items = await callClaudeInventoryForRoomWithMeasures(
            roomType,
            label,
            imagesForRoom,
            photosMeta
          );
        } catch (error) {
          console.error(
            `[AI][LabProcess2] Erreur inventaire pour la pièce ${roomType}:`,
            error
          );
          return;
        }

        rooms.push({
          roomId: `lab2-${roomType}-${index}`,
          roomType,
          label,
          photoIds: selectedPhotoIds,
          items,
        });
      })
    );
    
    const end = Date.now();
    const classifyMs = inventoryStart - startedAt;
    const inventoryMs = end - inventoryStart;
    const totalMs = end - startedAt;

    return NextResponse.json({
      model: CLAUDE_MODEL_CLASSIFY,
      rooms,
      totalMs,
      classifyMs,
      inventoryMs,
      classifications,
    });
  } catch (error) {
    console.error("❌ Erreur POST /api/ai/lab-process2:", error);
    return NextResponse.json(
      { error: "Erreur interne lors du Process 2 labo." },
      { status: 500 }
    );
  }
}

// --- Helpers IA ---

async function callClaudeInventoryForRoomWithMeasures(
  roomType: string,
  roomLabel: string,
  base64Images: string[],
  photosMeta: AnalyzePhotoInput[]
): Promise<RoomInventoryItem[]> {
  const prompt = buildInventoryPromptWithMeasures(roomType, roomLabel, photosMeta);

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL_CLASSIFY,
      max_tokens: 1500,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...base64Images.map((b64) => ({
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: b64,
              },
            })),
          ],
        },
      ],
    }),
  }, CLAUDE_CALL_TIMEOUT_MS);

  if (!res.ok) {
    console.error(
      `[AI][LabProcess2] Erreur appel inventaire pour ${roomType}:`,
      await res.text()
    );
    return [];
  }

  const data = (await res.json()) as any;
  const text = data?.content?.[0]?.text ?? "";

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error(
      `[AI][LabProcess2] Réponse inventaire non JSON pour ${roomType}:`,
      text
    );
    return [];
  }

  if (!parsed || !Array.isArray(parsed.items)) {
    console.error(
      `[AI][LabProcess2] Réponse inventaire invalide (pas de items) pour ${roomType}`
    );
    return [];
  }

  return parsed.items as RoomInventoryItem[];
}

async function callClaudeSameRoom(
  roomType: string,
  refBase64: string,
  candidateBase64: string
): Promise<{ sameRoom: boolean; confidence?: number } | null> {
  const prompt = `
On te montre deux photos.
- La première est une photo de référence d'une pièce de type "${roomType}".
- La deuxième est une autre photo.

Ta tâche est de dire si la DEUXIÈME photo montre la MÊME pièce que la première.

Réponds STRICTEMENT en JSON, sans texte avant ou après, avec la forme :
{
  "sameRoom": true,
  "confidence": 0.0
}
`.trim();

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL_CLASSIFY,
      max_tokens: 200,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: refBase64,
              },
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: candidateBase64,
              },
            },
          ],
        },
      ],
    }),
  }, CLAUDE_CALL_TIMEOUT_MS);

  if (!res.ok) {
    console.error(
      "[AI][LabProcess2] Erreur appel same-room:",
      await res.text()
    );
    return null;
  }

  const data = (await res.json()) as any;
  const text = data?.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.sameRoom !== "boolean") return null;
    const conf =
      typeof parsed?.confidence === "number" ? parsed.confidence : undefined;
    return { sameRoom: parsed.sameRoom, confidence: conf };
  } catch {
    console.error(
      "[AI][LabProcess2] Réponse same-room non JSON:",
      text
    );
    return null;
  }
}

function buildInventoryPromptWithMeasures(
  roomType: string,
  roomLabel: string,
  photos: AnalyzePhotoInput[]
): string {
  const list = photos
    .map((p, index) => `- Photo ${index + 1}: id="${p.id}", fichier="${p.originalFilename}"`)
    .join("\n");

  return `
Tu es un assistant expert en déménagement.
On te montre plusieurs photos d'une même pièce : "${roomLabel}" (type ${roomType}).
À partir de ces images, tu dois produire un inventaire des objets principaux à déménager.

Pour chaque objet, tu dois essayer de donner :
- des dimensions approximatives (largeur, profondeur, hauteur en cm),
- un volume approximatif en m3,
- une estimation de valeur en euros, avec une courte justification.

IMPORTANT :
- Ne te limite pas aux gros meubles : pense aussi aux tapis, luminaires, lampes sur pied, suspensions, petites étagères et éléments de déco volumineux.
- S'il y a plusieurs petits objets similaires (par ex. plusieurs lampes ou plusieurs tapis), regroupe-les sur une même ligne avec une quantité adaptée.

Réponds STRICTEMENT en JSON, sans texte avant ou après, avec la forme :
{
  "items": [
    {
      "label": "Lit double",
      "category": "LIT|CANAPE|TABLE|CHAISE|ARMOIRE|ELECTROMENAGER|TV|BIBLIOTHEQUE|DECORATION|RANGEMENT|AUTRE",
      "quantity": 1,
      "confidence": 0.9,
      "widthCm": 160,
      "depthCm": 200,
      "heightCm": 100,
      "volumeM3": 3.2,
      "valueEstimateEur": 800,
      "valueJustification": "Lit double 160x200 cm milieu de gamme, env. 800€ neuf",
      "flags": {
        "fragile": false,
        "highValue": false,
        "requiresDisassembly": true
      }
    }
  ]
}

Voici la liste des photos pour cette pièce :
${list}
`.trim();
}


