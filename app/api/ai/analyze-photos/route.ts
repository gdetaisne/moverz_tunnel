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
  analysisContext?: "specific_constraints" | "density";
  photos: AnalyzePhotoInput[];
}

interface AnalysisProcessPayload {
  model: string;
  rooms: any[];
  moverInsights?: string[];
  densitySuggestion?: "light" | "normal" | "dense";
  densityRationale?: string;
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
      validImagesProcess1.map((i) => i.photo),
      json.analysisContext
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
        json.photos,
        json.analysisContext
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
      densitySuggestion: process1.densitySuggestion,
      densityRationale: process1.densityRationale,
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

    const parsedRooms = Array.isArray(parsed?.rooms) ? parsed.rooms : [];
    const promptInsights = Array.isArray(parsed.moverInsights)
      ? parsed.moverInsights.filter(
          (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
        )
      : [];
    const densitySuggestion =
      parsed?.densitySuggestion === "light" ||
      parsed?.densitySuggestion === "normal" ||
      parsed?.densitySuggestion === "dense"
        ? parsed.densitySuggestion
        : undefined;
    const densityRationale =
      typeof parsed?.densityRationale === "string" && parsed.densityRationale.trim().length > 0
        ? parsed.densityRationale.trim()
        : undefined;
    const moverInsights = buildMoverInsightsFromRooms(parsedRooms, promptInsights);

    const totalMs = Date.now() - startedAt;
    return {
      model,
      rooms: parsedRooms,
      moverInsights,
      densitySuggestion,
      densityRationale,
      totalMs,
    };
  } catch (error) {
    console.error(`❌ Exception lors de l'appel Claude (${model}):`, error);
    return null;
  }
}

// Process 2 : appels chunkés pour couvrir toutes les photos (max 10 images par appel)
async function callClaudeChunkedForRooms(
  model: string,
  validImages: { photo: AnalyzePhotoInput; base64: string; index: number }[],
  allPhotos: AnalyzePhotoInput[],
  analysisContext?: AnalyzeRequestBody["analysisContext"]
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
      const chunkPrompt = buildPrompt(chunk.photos, analysisContext);
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

function buildPrompt(
  photos: AnalyzePhotoInput[],
  analysisContext: AnalyzeRequestBody["analysisContext"] = "specific_constraints"
): string {
  const list = photos
    .map((p, index) => `- photoId: "${p.id}", filename: "${p.originalFilename}" (n°${index + 1})`)
    .join("\n");

  if (analysisContext === "density") {
    return `
Tu es déménageur professionnel expérimenté.
Le client a envoyé des photos pour aider à évaluer la densité réelle du mobilier.
Ta mission est d'évaluer uniquement la densité opérationnelle et son impact logistique.

Tu dois produire UNIQUEMENT une note opérationnelle structurée :
1) Déterminer le niveau dominant de densité : light | normal | dense
2) Indiquer si la densité est homogène ou hétérogène selon les zones visibles
3) Justifier factuellement à partir d'éléments visuels observables
4) Indiquer l'impact logistique potentiel (ex: + emballage, + temps manutention, circulation réduite)
5) Si la visibilité est partielle, signaler l'incertitude

CONTRAINTES :
- Aucun jugement de valeur.
- Strictement factuel.
- Très synthétique.
- Pas d'hypothèse sur pièces non visibles.

IMPORTANT :
- Réponds STRICTEMENT en JSON valide UTF-8, sans texte avant/après.
- Respecte STRICTEMENT ce format et ces clés.
- "moverInsights" doit reprendre les mêmes éléments que "operationalImpact" (même sens, formulation courte).
{
  "densitySuggestion": "light|normal|dense",
  "densityDistribution": "homogeneous|heterogeneous|uncertain",
  "visibilityConfidence": "low|medium|high",
  "densityRationale": "Justification courte et factuelle",
  "operationalImpact": [
    "Impact logistique 1",
    "Impact logistique 2"
  ],
  "moverInsights": [
    "Impact logistique 1",
    "Impact logistique 2"
  ]
}

Voici la liste des photos :
${list}
`.trim();
  }

  return `
Tu es déménageur professionnel expérimenté.
Le client a envoyé des photos du logement de départ.
Ta mission est d'identifier UNIQUEMENT les contraintes spécifiques pertinentes pour l'organisation d'un déménagement.

Tu dois :
1) Identifier uniquement les éléments visibles ayant un impact logistique réel.
2) Classer chaque contrainte dans une catégorie : fragile | volumineux | lourd | demontage | acces | protection | autre.
3) Décrire brièvement l'impact opérationnel concret.
4) Indiquer le niveau d'impact estimé : low | medium | high.
5) Si la visibilité est partielle, signaler l'incertitude.

IMPORTANT :
- Ne jamais analyser la densité globale (traitée ailleurs).
- Aucun jugement de valeur.
- Strictement factuel.
- Pas d'hypothèse sur pièces non visibles.
- Si aucune contrainte inhabituelle n'est détectée, le préciser clairement.
- Réponds STRICTEMENT en JSON valide UTF-8, sans texte avant/après.
- Respecte STRICTEMENT ce format et ces clés.
- "moverInsights" doit résumer les contraintes majeures en 1-3 points courts.
{
  "visibilityConfidence": "low|medium|high",
  "constraints": [
    {
      "category": "fragile|volumineux|lourd|demontage|acces|protection|autre",
      "description": "Objet ou contrainte visible",
      "operationalImpact": "Impact concret pour l'équipe",
      "impactLevel": "low|medium|high"
    }
  ],
  "moverInsights": [
    "Point opérationnel 1",
    "Point opérationnel 2"
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

  const dedupPromptInsights = (() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of promptInsights) {
      const cleaned = String(raw || "").trim();
      if (!cleaned) continue;
      const key = norm(cleaned);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cleaned);
      if (out.length >= 6) break;
    }
    return out;
  })();
  if (dedupPromptInsights.length > 0) return dedupPromptInsights;

  const unusualEntries: string[] = [];
  const seenUnusual = new Set<string>();

  const isIrrelevantForHandling = (label: string) => {
    const l = norm(label);
    return (
      l.includes("rideau") ||
      l.includes("voilage") ||
      l.includes("coussin") ||
      l.includes("tapis fin")
    );
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
      const hasAccessConstraint =
        item?.flags?.requiresDisassembly === true ||
        (Number.isFinite(Number(item?.widthCm)) && Number(item?.widthCm) >= 180);

      if (!(isFragile || isBulky || hasAccessConstraint)) continue;

      const reasons: string[] = [];
      if (isFragile) reasons.push("protection renforcée");
      if (isBulky) reasons.push("manutention lourde");
      if (hasAccessConstraint) reasons.push("passage à anticiper");
      addUnique(
        unusualEntries,
        seenUnusual,
        `${label} (${fmtDims(item)}) : ${reasons.join(", ")}`
      );
    }
  }

  if (unusualEntries.length > 0) return unusualEntries.slice(0, 6);
  return ["Aucune contrainte spécifique inhabituelle détectée sur ces photos."];
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


