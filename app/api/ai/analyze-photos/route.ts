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
      return NextResponse.json({
        rooms: fallbackRooms,
        process1: { model: "fallback", rooms: fallbackRooms },
        process2: { model: "fallback", rooms: fallbackRooms },
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
      return NextResponse.json({
        rooms: fallbackRooms,
        process1: { model: "fallback", rooms: fallbackRooms },
        process2: { model: "fallback", rooms: fallbackRooms },
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
    return NextResponse.json({
      rooms: process1.rooms,
      process1,
      process2,
    });
  } catch (error) {
    console.error("❌ Erreur POST /api/ai/analyze-photos:", error);
    const fallbackRooms = createFallbackAnalysis([]);
    return NextResponse.json({
      rooms: fallbackRooms,
      process1: { model: CLAUDE_MODEL_PRIMARY, rooms: fallbackRooms },
      process2: { model: CLAUDE_MODEL_CHUNKED, rooms: fallbackRooms },
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

    const totalMs = Date.now() - startedAt;
    return { model, rooms: parsed.rooms, totalMs };
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
Tu es un assistant qui aide à préparer un inventaire de déménagement.
On te donne une liste de photos (sans le contenu visuel, uniquement les noms de fichiers) et tu dois :
1) Regrouper les photos par pièce logique (salon, cuisine, chambres, etc.).
2) Pour chaque pièce, proposer un inventaire d'objets plausibles, sans doublons.
3) Pour chaque objet, si possible, estimer des dimensions (largeur/profondeur/hauteur en centimètres),
   calculer un volume approximatif en m3 et proposer une estimation de valeur en euros avec une courte justification.

Tu n'as PAS accès aux images, uniquement aux noms de fichiers. Fais de ton mieux pour proposer
un inventaire raisonnable à partir de cette info minimale.

IMPORTANT :
- Réponds STRICTEMENT en JSON valide UTF-8, sans texte avant/après.
- Le JSON doit respecter cette forme :
{
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


