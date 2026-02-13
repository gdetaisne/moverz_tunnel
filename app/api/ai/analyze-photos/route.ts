import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface AnalyzePhotoInput {
  id: string;
  storageKey: string;
  originalFilename: string;
}

interface AnalyzeRequestBody {
  leadId?: string;
  photos: AnalyzePhotoInput[];
}

interface AnalysisProcessPayload {
  model: string;
  rooms: any[];
  moverInsights?: string[];
  totalMs?: number;
}

const CLAUDE_MODEL_PRIMARY =
  process.env.CLAUDE_MODEL ?? "claude-3-5-haiku-20241022";
// Process 2 utilise le même modèle, mais avec une stratégie chunkée.
const CLAUDE_MODEL_CHUNKED = CLAUDE_MODEL_PRIMARY;

// Même dossier que pour la route d'upload
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Process 1 : limite le nombre d'images envoyées en un seul appel.
const MAX_PHOTOS_FOR_AI = Number(process.env.AI_MAX_PHOTOS ?? "6");
// Process 2 : taille maximale d'un chunk d'images (analyse chunkée).
const MAX_PHOTOS_PER_CHUNK = Number(
  process.env.AI_MAX_PHOTOS_PER_CHUNK ?? "10"
);

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json().catch(() => ({}))) as AnalyzeRequestBody;

    if (!json || !Array.isArray(json.photos) || json.photos.length === 0) {
      return NextResponse.json(
        { error: "Aucune photo fournie pour l'analyse." },
        { status: 400 }
      );
    }

    const hasClaudeKey = !!process.env.CLAUDE_API_KEY;

    // V1: si pas de clé ou pour rester robuste, on a un fallback déterministe.
    if (!hasClaudeKey) {
      console.warn(
        "[AI] CLAUDE_API_KEY non défini – utilisation du fallback local d'inventaire."
      );
      const fallbackRooms = createFallbackAnalysis(json.photos);
      const fallbackInsights = buildMoverInsightsFromRooms(fallbackRooms);
      return NextResponse.json({
        rooms: fallbackRooms,
        moverInsights: fallbackInsights,
        process1: { model: "fallback", rooms: fallbackRooms, moverInsights: fallbackInsights },
        process2: { model: "fallback", rooms: fallbackRooms, moverInsights: fallbackInsights },
      });
    }

    // Process 1 : on ne prend que les premières photos pour l'IA
    const photosForProcess1 = json.photos.slice(0, MAX_PHOTOS_FOR_AI);

    // Charger les images normalisées depuis le disque pour le process 1
    const loadedImagesProcess1 = await Promise.all(
      photosForProcess1.map(async (photo, index) => {
        const fullPath = path.join(UPLOAD_DIR, photo.storageKey);
        try {
          const buffer = await fs.readFile(fullPath);
          const base64 = buffer.toString("base64");
          return { photo, base64, index };
        } catch (error) {
          console.error("❌ Impossible de lire le fichier pour l'analyse IA:", {
            storageKey: photo.storageKey,
            fullPath,
            error,
          });
          return null;
        }
      })
    );

    const validImagesProcess1 = loadedImagesProcess1.filter(
      (img): img is { photo: AnalyzePhotoInput; base64: string; index: number } =>
        img !== null
    );

    if (validImagesProcess1.length === 0) {
      console.warn(
        "[AI] Aucune image exploitable pour l'analyse – fallback local utilisé."
      );
      const fallbackRooms = createFallbackAnalysis(json.photos);
      const fallbackInsights = buildMoverInsightsFromRooms(fallbackRooms);
      return NextResponse.json({
        rooms: fallbackRooms,
        moverInsights: fallbackInsights,
        process1: { model: "fallback", rooms: fallbackRooms, moverInsights: fallbackInsights },
        process2: { model: "fallback", rooms: fallbackRooms, moverInsights: fallbackInsights },
      });
    }

    const promptProcess1 = buildPrompt(
      validImagesProcess1.map((i) => i.photo)
    );

    // Process 2 : on souhaite couvrir toutes les photos (avec chunking)
    const loadedImagesAll = await Promise.all(
      json.photos.map(async (photo, index) => {
        const fullPath = path.join(UPLOAD_DIR, photo.storageKey);
        try {
          const buffer = await fs.readFile(fullPath);
          const base64 = buffer.toString("base64");
          return { photo, base64, index };
        } catch (error) {
          console.error(
            "❌ Impossible de lire le fichier pour l'analyse IA (process 2):",
            {
              storageKey: photo.storageKey,
              fullPath,
              error,
            }
          );
          return null;
        }
      })
    );

    const validImagesAll = loadedImagesAll.filter(
      (img): img is { photo: AnalyzePhotoInput; base64: string; index: number } =>
        img !== null
    );

    // Process 1 : appel global (limité à MAX_PHOTOS_FOR_AI)
    // Process 2 : appels chunkés pour couvrir toutes les photos
    const [primaryResult, secondaryResult] = await Promise.allSettled([
      callClaudeForRooms(
        CLAUDE_MODEL_PRIMARY,
        validImagesProcess1,
        promptProcess1,
        json.photos
      ),
      callClaudeChunkedForRooms(
        CLAUDE_MODEL_CHUNKED,
        validImagesAll,
        json.photos
      ),
    ]);

    const fallbackRooms = createFallbackAnalysis(json.photos);

    const process1: AnalysisProcessPayload = (() => {
      if (primaryResult.status === "fulfilled" && primaryResult.value) {
        return primaryResult.value;
      }
      return { model: CLAUDE_MODEL_PRIMARY, rooms: fallbackRooms };
    })();

    const process2: AnalysisProcessPayload = (() => {
      if (secondaryResult.status === "fulfilled" && secondaryResult.value) {
        return secondaryResult.value;
      }
      return { model: CLAUDE_MODEL_CHUNKED, rooms: fallbackRooms };
    })();

    // Pour compatibilité, on garde `rooms` = résultat du process 1
    const moverInsights =
      process1.moverInsights && process1.moverInsights.length > 0
        ? process1.moverInsights
        : buildMoverInsightsFromRooms(process1.rooms);
    return NextResponse.json({
      rooms: process1.rooms,
      moverInsights,
      process1,
      process2,
    });
  } catch (error) {
    console.error("❌ Erreur POST /api/ai/analyze-photos:", error);
    const fallbackRooms = createFallbackAnalysis([]);
    const fallbackInsights = buildMoverInsightsFromRooms(fallbackRooms);
    return NextResponse.json({
      rooms: fallbackRooms,
      moverInsights: fallbackInsights,
      process1: { model: CLAUDE_MODEL_PRIMARY, rooms: fallbackRooms, moverInsights: fallbackInsights },
      process2: { model: CLAUDE_MODEL_CHUNKED, rooms: fallbackRooms, moverInsights: fallbackInsights },
      error: "Erreur interne lors de l'analyse.",
    });
  }
}

async function callClaudeForRooms(
  model: string,
  validImages: { photo: AnalyzePhotoInput; base64: string; index: number }[],
  prompt: string,
  allPhotos: AnalyzePhotoInput[]
): Promise<AnalysisProcessPayload | null> {
  try {
    const startedAt = Date.now();
    console.log("[AI] Appel Claude", {
      processModel: model,
      photos: validImages.length,
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        // On laisse plus de marge pour les champs de dimensions / valeur
        max_tokens: 1500,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              // Images dans l'ordre référencé dans le prompt
              ...validImages.map((img) => ({
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: img.base64,
                },
              })),
            ] as any[],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`❌ Erreur appel Claude (${model}):`, await res.text());
      return null;
    }

    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text ?? "";

    let parsed: any;
    try {
      // Version simple (celle qui tourne en prod) :
      // on suppose que Claude renvoie un JSON pur dans `text`.
      parsed = JSON.parse(text);
    } catch {
      console.error(
        `❌ Réponse Claude non JSON pour le modèle ${model}, fallback utilisé:`,
        text
      );
      return null;
    }

    if (!parsed || !Array.isArray(parsed.rooms)) {
      console.error(
        `❌ Réponse Claude JSON invalide (pas de rooms) pour le modèle ${model}`
      );
      return null;
    }

    const promptInsights = Array.isArray(parsed.moverInsights)
      ? parsed.moverInsights.filter(
          (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
        )
      : [];
    const moverInsights = buildMoverInsightsFromRooms(parsed.rooms, promptInsights);

    const totalMs = Date.now() - startedAt;
    return { model, rooms: parsed.rooms, moverInsights, totalMs };
  } catch (error) {
    console.error(`❌ Exception lors de l'appel Claude (${model}):`, error);
    return null;
  }
}

// Process 2 : appels chunkés pour couvrir toutes les photos (max 10 images par appel)
async function callClaudeChunkedForRooms(
  model: string,
  validImages: { photo: AnalyzePhotoInput; base64: string; index: number }[],
  allPhotos: AnalyzePhotoInput[]
): Promise<AnalysisProcessPayload | null> {
  const CHUNK_SIZE = MAX_PHOTOS_PER_CHUNK;
  if (validImages.length === 0) return null;
  const startedAt = Date.now();

  const chunks: {
    photos: AnalyzePhotoInput[];
    images: { photo: AnalyzePhotoInput; base64: string; index: number }[];
  }[] = [];

  for (let i = 0; i < validImages.length; i += CHUNK_SIZE) {
    const imagesChunk = validImages.slice(i, i + CHUNK_SIZE);
    const photosChunk = imagesChunk.map((img) => img.photo);
    chunks.push({ photos: photosChunk, images: imagesChunk });
  }

  const results = await Promise.allSettled(
    chunks.map(async (chunk, idx) => {
      const chunkPrompt = buildPrompt(chunk.photos);
      console.log("[AI][Process2] Appel chunk", {
        model,
        chunkIndex: idx,
        photos: chunk.photos.length,
      });
      return callClaudeForRooms(
        model,
        chunk.images,
        chunkPrompt,
        allPhotos
      );
    })
  );

  const allRooms: any[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value && Array.isArray(r.value.rooms)) {
      allRooms.push(...r.value.rooms);
    }
  }

  if (allRooms.length === 0) {
    console.warn("[AI][Process2] Aucun chunk exploitable – retour null.");
    return null;
  }

  const totalMs = Date.now() - startedAt;
  return { model, rooms: allRooms, totalMs };
}

function buildPrompt(photos: AnalyzePhotoInput[]): string {
  const list = photos
    .map((p, index) => `- photoId: "${p.id}", filename: "${p.originalFilename}" (n°${index + 1})`)
    .join("\n");

  return `
Tu es déménageur professionnel.
Le client a envoyé des photos dans la section "contraintes spécifiques".
Ton rôle: produire une note opérationnelle utile au chef d'équipe déménagement.
On te donne une liste de photos et les images associées. Tu dois :
1) Regrouper les photos par pièce logique (salon, cuisine, chambres, etc.).
2) Pour chaque pièce, proposer un inventaire d'objets plausibles, sans doublons.
3) Pour chaque objet, si possible, estimer des dimensions (largeur/profondeur/hauteur en centimètres),
   calculer un volume approximatif en m3 et proposer une estimation de valeur en euros avec une courte justification.
4) Produire une synthèse qui remonte UNIQUEMENT ce qui sort de l'ordinaire pour un déménagement.
5) Regrouper ces points par typologies pertinentes (exemples: fragilité, encombrement, accès),
   sans forcer des catégories vides.
6) Dans chaque typologie, citer des objets concrets + format utile uniquement si pertinent.

Tu as accès aux images envoyées dans cette requête.

CONTRAINTES DE TON :
- Jamais de jugement de valeur, jamais de formulation dépréciative sur le logement ou les affaires du client.
- Si un espace semble très encombré, utiliser un vocabulaire neutre et factuel (ex: "densité élevée d'objets").
- Rester très synthétique et concret.
- Pas de phrase vague: chaque point doit citer un objet ou une contrainte concrète.
- Cohérence métier obligatoire :
  - ne classe pas un rideau en objet fragile,
  - ne mets pas de dimensions inutiles (ex: épaisseur d'un tableau, objets qui entrent dans un carton),
  - mets les dimensions/volume seulement pour les objets qui impactent vraiment la manutention.
- Si aucune contrainte inhabituelle n'est détectée, renvoyer une synthèse courte qui le dit explicitement.

IMPORTANT :
- Réponds STRICTEMENT en JSON valide UTF-8, sans texte avant/après.
- Le JSON doit respecter cette forme :
{
  "moverInsights": [
    "Typologie pertinente : points concrets utiles au déménageur"
  ],
  "rooms": [
    {
      "roomId": "string",
      "roomType": "SALON|CUISINE|CHAMBRE|SALLE_DE_BAIN|WC|COULOIR|BUREAU|BALCON|CAVE|GARAGE|AUTRE",
      "label": "string lisible (ex: Salon, Chambre 1)",
      "photoIds": ["photoId1", "photoId2"],
      "items": [
        {
          "label": "string",
          "category": "LIT|CANAPE|TABLE|CHAISE|ARMOIRE|ELECTROMENAGER|TV|BIBLIOTHEQUE|DECORATION|RANGEMENT|AUTRE",
          "quantity": 1,
          "confidence": 0.0,
          "widthCm": 0,          // largeur approximative en cm (nombre)
          "depthCm": 0,          // profondeur approximative en cm (nombre)
          "heightCm": 0,         // hauteur approximative en cm (nombre)
          "volumeM3": 0.0,       // volume approximatif en m3 (nombre)
          "valueEstimateEur": 0, // estimation de valeur en euros (nombre)
          "valueJustification": "courte phrase expliquant l'estimation (ex: canapé 3 places milieu de gamme, env. 800€ neuf)",
          "flags": {
            "fragile": boolean,
            "highValue": boolean,
            "requiresDisassembly": boolean
          }
        }
      ]
    }
  ]
}

Voici la liste des photos :
${list}
`.trim();
}

function buildMoverInsightsFromRooms(
  rooms: any[],
  promptInsights: string[] = []
): string[] {
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const norm = (v: string) =>
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const fmtDims = (item: any) => {
    const w = Number(item?.widthCm);
    const d = Number(item?.depthCm);
    const h = Number(item?.heightCm);
    if ([w, d, h].every((x) => Number.isFinite(x) && x > 0)) {
      return `~${Math.round(w)}x${Math.round(d)}x${Math.round(h)} cm`;
    }
    const vol = Number(item?.volumeM3);
    if (Number.isFinite(vol) && vol > 0) {
      return `~${vol.toFixed(1)} m³`;
    }
    return "format à confirmer";
  };

  const addUnique = (bucket: string[], seen: Set<string>, value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    const key = norm(cleaned);
    if (seen.has(key)) return;
    seen.add(key);
    bucket.push(cleaned);
  };

  const buckets: Record<string, string[]> = {};
  const bucketSeen: Record<string, Set<string>> = {};

  const isIrrelevantForHandling = (label: string) => {
    const l = norm(label);
    return (
      l.includes("rideau") ||
      l.includes("voilage") ||
      l.includes("coussin") ||
      l.includes("tapis fin")
    );
  };

  const addToBucket = (bucket: string, value: string) => {
    if (!buckets[bucket]) buckets[bucket] = [];
    if (!bucketSeen[bucket]) bucketSeen[bucket] = new Set<string>();
    addUnique(buckets[bucket]!, bucketSeen[bucket]!, value);
  };

  for (const room of safeRooms) {
    const items = Array.isArray(room?.items) ? room.items : [];
    for (const item of items) {
      const label = String(item?.label || "").trim();
      if (!label) continue;
      if (isIrrelevantForHandling(label)) continue;

      const isFragile = item?.flags?.fragile === true || item?.flags?.highValue === true;
      const isBulky =
        item?.flags?.requiresDisassembly === true ||
        (Number.isFinite(Number(item?.volumeM3)) && Number(item?.volumeM3) >= 1.2) ||
        (Number.isFinite(Number(item?.widthCm)) && Number(item?.widthCm) >= 180);

      if (isFragile) {
        addToBucket("Fragilité / protection", `${label} (${fmtDims(item)})`);
      }
      if (isBulky) {
        addToBucket("Manutention lourde / encombrement", `${label} (${fmtDims(item)})`);
      }
      if (item?.flags?.requiresDisassembly === true) {
        addToBucket("Accès / manœuvre", `${label}: démontage/remontage prévu`);
      }
      if (Number.isFinite(Number(item?.widthCm)) && Number(item?.widthCm) >= 180) {
        addToBucket("Accès / manœuvre", `${label}: gabarit large à passer`);
      }
    }
  }

  const fallbackInsights: string[] = Object.entries(buckets)
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .map(([bucket, items]) => `${bucket} : ${items.slice(0, 3).join(", ")}.`);

  const merged = [...promptInsights, ...fallbackInsights]
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  const insights: string[] = [];
  const seen = new Set<string>();
  for (const line of merged) {
    const key = norm(line);
    if (seen.has(key)) continue;
    seen.add(key);
    insights.push(line);
    if (insights.length >= 6) break;
  }

  if (insights.length === 0) {
    insights.push("Aucune contrainte spécifique inhabituelle détectée sur ces photos.");
  }

  return insights;
}

function createFallbackAnalysis(photos: AnalyzePhotoInput[]) {
  if (!photos.length) {
    return [
      {
        roomId: "fallback-salon",
        roomType: "SALON",
        label: "Salon",
        photoIds: [],
        items: [
          {
            label: "Canapé 3 places",
            category: "CANAPE",
            quantity: 1,
            confidence: 0.8,
            flags: { fragile: false, highValue: false, requiresDisassembly: false },
          },
          {
            label: "Meuble TV + télévision",
            category: "TV",
            quantity: 1,
            confidence: 0.7,
            flags: { fragile: true, highValue: true, requiresDisassembly: false },
          },
        ],
      },
    ];
  }

  const roomId = "room-1";
  return [
    {
      roomId,
      roomType: "SALON",
      label: "Salon",
      photoIds: photos.map((p) => p.id),
      items: [
        {
          label: "Canapé 3 places",
          category: "CANAPE",
          quantity: 1,
          confidence: 0.8,
          flags: { fragile: false, highValue: false, requiresDisassembly: false },
        },
        {
          label: "Table basse",
          category: "TABLE",
          quantity: 1,
          confidence: 0.7,
          flags: { fragile: false, highValue: false, requiresDisassembly: false },
        },
      ],
    },
  ];
}


