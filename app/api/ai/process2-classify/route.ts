import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

// --- Types d'entrée / sortie ---

interface ClassifyPhotoInput {
  id: string; // LeadPhoto ID
  storageKey: string;
  originalFilename: string;
}

interface ClassifyRequestBody {
  leadId: string;
  photos: ClassifyPhotoInput[];
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

interface InventoryRow {
  roomType: string;
  roomLabel: string;
  itemLabel: string;
  quantity: number;
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  volumeM3?: number | null;
  valueEstimateEur?: number | null;
  valueJustification?: string | null;
}

// --- Constantes ---

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

// --- Handler principal ---

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now();
    const json = (await req.json().catch(() => ({}))) as ClassifyRequestBody;

    if (!json || !json.leadId || !Array.isArray(json.photos) || json.photos.length === 0) {
      return NextResponse.json(
        { error: "Paramètres invalides pour la classification (leadId + photos requis)." },
        { status: 400 }
      );
    }

    if (!process.env.CLAUDE_API_KEY) {
      console.warn("[AI][Process2] CLAUDE_API_KEY manquant – aucune classification effectuée.");
      return NextResponse.json({ results: [], inventory: [] });
    }

    const results: PhotoClassificationResult[] = [];
    const photoImages = new Map<string, string>(); // photoId -> base64 image

    // 1 requête IA par photo (classification)
    for (const photo of json.photos) {
      const fullPath = path.join(UPLOAD_DIR, photo.storageKey);
      try {
        const buffer = await fs.readFile(fullPath);
        const base64 = buffer.toString("base64");
        photoImages.set(photo.id, base64);

        const prompt = buildClassificationPrompt(photo);

        const res = await fetch("https://api.anthropic.com/v1/messages", {
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
        });

        if (!res.ok) {
          console.error(
            `[AI][Process2] Erreur classification photo ${photo.id} (${photo.originalFilename}):`,
            await res.text()
          );
          continue;
        }

        const data = (await res.json()) as any;
        const text = data?.content?.[0]?.text ?? "";

        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          console.error(
            `[AI][Process2] Réponse non JSON pour la photo ${photo.id}, ignorée:`,
            text
          );
          continue;
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

        try {
          await (prisma.leadPhoto as any).update({
            where: { id: photo.id },
            data: {
              roomClassificationStatus: primary ? "DONE" : "AMBIGU",
              roomGuessPrimary: primary,
              roomGuessConfidence: confidence,
              roomGuessAlternatives: alternatives,
            },
          });
        } catch (err) {
          console.error(
            `[AI][Process2] Erreur mise à jour LeadPhoto ${photo.id} pour la classification:`,
            err
          );
        }

        results.push({
          photoId: photo.id,
          roomGuessPrimary: primary,
          roomGuessConfidence: confidence,
          roomGuessAlternatives: alternatives,
        });
      } catch (error) {
        console.error(
          `[AI][Process2] Erreur de lecture ou classification pour la photo ${photo.id}:`,
          error
        );
      }
    }

    // Regroupement par type de pièce
    const byRoomType = new Map<string, string[]>(); // roomType -> [photoId]
    for (const r of results) {
      const type = r.roomGuessPrimary ?? "INCONNU";
      const list = byRoomType.get(type) ?? [];
      list.push(r.photoId);
      byRoomType.set(type, list);
    }

    const inventoryRows: InventoryRow[] = [];

    // Inventaire par pièce (hors INCONNU)
    const roomEntries = Array.from(byRoomType.entries()).filter(
      ([roomType]) => roomType !== "INCONNU"
    );

    await Promise.all(
      roomEntries.map(async ([roomType, photoIds]) => {
        const label = ROOM_TYPE_LABELS[roomType] ?? roomType;
        const base64Images = photoIds
          .map((id) => photoImages.get(id))
          .filter((b64): b64 is string => !!b64);

        if (base64Images.length === 0) return;

        // 1) Appel IA pour l'inventaire de cette pièce
        let items: RoomInventoryItem[] = [];
        try {
          items = await callClaudeInventoryForRoom(roomType, label, base64Images);
        } catch (error) {
          console.error(
            `[AI][Process2] Erreur appel inventaire pour la pièce ${roomType}:`,
            error
          );
          return;
        }

        // 2) On remplit toujours le tableau de synthèse pour le front,
        //    même si la persistance en base échoue plus tard.
        for (const item of items) {
          inventoryRows.push({
            roomType,
            roomLabel: label,
            itemLabel: item.label,
            quantity: item.quantity,
            widthCm: item.widthCm ?? null,
            depthCm: item.depthCm ?? null,
            heightCm: item.heightCm ?? null,
            volumeM3: item.volumeM3 ?? null,
            valueEstimateEur: item.valueEstimateEur ?? null,
            valueJustification: item.valueJustification ?? null,
          });
        }

        // 3) Persistance en base (LeadRoom / LeadRoomItem / LeadPhoto) mise en pause :
        //    on privilégie pour l'instant le retour rapide au front.
      })
    );

    const totalMs = Date.now() - startedAt;

    // Enregistrer un run d'analyse pour suivi interne (comparaison de modèles, temps, etc.)
    try {
      await prisma.leadAnalysisRun.create({
        data: {
          leadId: json.leadId,
          processType: "PROCESS2",
          model: CLAUDE_MODEL_CLASSIFY,
          photosCount: json.photos.length,
          totalMs,
          qualityScore: null,
          qualityNotes: null,
        },
      });
    } catch (err) {
      console.error("[AI][Process2] Erreur enregistrement LeadAnalysisRun:", err);
    }

    return NextResponse.json({ results, inventory: inventoryRows });
  } catch (error) {
    console.error("❌ Erreur POST /api/ai/process2-classify:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de la classification des photos (Process 2)." },
      { status: 500 }
    );
  }
}

// --- Helpers IA ---

async function callClaudeInventoryForRoom(
  roomType: string,
  roomLabel: string,
  base64Images: string[]
): Promise<RoomInventoryItem[]> {
  const prompt = buildInventoryPrompt(roomType, roomLabel);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL_CLASSIFY,
      max_tokens: 700,
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
  });

  if (!res.ok) {
    console.error(
      `[AI][Process2] Erreur appel inventaire pour ${roomType}:`,
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
      `[AI][Process2] Réponse inventaire non JSON pour ${roomType}:`,
      text
    );
    return [];
  }

  if (!parsed || !Array.isArray(parsed.items)) {
    console.error(
      `[AI][Process2] Réponse inventaire invalide (pas de items) pour ${roomType}`
    );
    return [];
  }

  return parsed.items as RoomInventoryItem[];
}

function buildClassificationPrompt(photo: ClassifyPhotoInput): string {
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

function buildInventoryPrompt(roomType: string, roomLabel: string): string {
  return `
Tu es un assistant expert en déménagement.
On te montre plusieurs photos d'une même pièce : "${roomLabel}" (type ${roomType}).
À partir de ces images, tu dois produire un inventaire des objets principaux à déménager.

Pour chaque objet, tu dois essayer de donner :
- des dimensions approximatives (largeur, profondeur, hauteur en cm),
- un volume approximatif en m3,
- une estimation de valeur en euros, avec une courte justification.

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

Règles :
- Regroupe les objets identiques (ex: 4 chaises identiques => 1 ligne "Chaise", quantity: 4).
- Ne descends pas dans le trop petit (pas besoin de compter les livres un par un).
- Sois particulièrement attentif aux objets volumineux, fragiles ou de forte valeur.
`.trim();
}


