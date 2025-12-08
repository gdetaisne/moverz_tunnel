import { NextRequest, NextResponse } from "next/server";
import {
  enrichItemsWithBusinessRules,
  type ItemLike,
  type RoomLike,
} from "@/lib/inventory/businessRules";

interface AnalyzePhotoInput {
  id: string;
  originalFilename: string;
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

const CLAUDE_MODEL_WIDGET =
  process.env.CLAUDE_MODEL_CLASSIFY ??
  process.env.CLAUDE_MODEL ??
  "claude-3-5-haiku-20241022";

const MAX_WIDGET_PHOTOS = 3;
const MAX_WIDGET_PHOTO_BYTES =
  Number(process.env.WIDGET_MAX_PHOTO_MB ?? "8") * 1024 * 1024;

function withCors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin") ?? "*";
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return withCors(
    req,
    new NextResponse(null, {
      status: 204,
    })
  );
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const formData = await req.formData().catch(() => null);

    if (!formData) {
      return withCors(
        req,
        NextResponse.json(
          { error: "Requête invalide (form-data manquant)." },
          { status: 400 }
        )
      );
    }

    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File && (key === "photos" || key === "photo")) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return withCors(
        req,
        NextResponse.json(
          { error: "Aucune photo fournie pour l'analyse widget." },
          { status: 400 }
        )
      );
    }

    if (files.length > MAX_WIDGET_PHOTOS) {
      return withCors(
        req,
        NextResponse.json(
          {
            error: `Trop de photos fournies (${files.length}). Maximum ${MAX_WIDGET_PHOTOS}.`,
          },
          { status: 400 }
        )
      );
    }

    if (!process.env.CLAUDE_API_KEY) {
      console.warn(
        "[AI][Widget] CLAUDE_API_KEY manquant – aucune analyse effectuée."
      );
      return withCors(
        req,
        NextResponse.json({
          model: "no-key",
          rooms: [] as LabRoom[],
          totalMs: 0,
        })
      );
    }

    const base64Images: string[] = [];
    const photosMeta: AnalyzePhotoInput[] = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      if (file.size > MAX_WIDGET_PHOTO_BYTES) {
        return withCors(
          req,
          NextResponse.json(
            {
              error: `Photo trop volumineuse (${Math.round(
                file.size / (1024 * 1024)
              )} Mo). Maximum ${
                MAX_WIDGET_PHOTO_BYTES / (1024 * 1024)
              } Mo par image.`,
            },
            { status: 400 }
          )
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const b64 = buffer.toString("base64");

      base64Images.push(b64);
      photosMeta.push({
        id: `widget-photo-${index + 1}`,
        originalFilename: file.name || `photo-${index + 1}.jpg`,
      });
    }

    const roomType = "AUTRE";
    const roomLabel = "Pièce principale";

    const items = await callClaudeInventoryForRoomWithMeasures(
      roomType,
      roomLabel,
      base64Images,
      photosMeta
    );

    // --- Application des règles métier (lit, armoires, etc.) ---
    const roomForRules: RoomLike = {
      roomId: "widget-main-room",
      roomType,
      roomLabel,
    };

    const itemsForRules: ItemLike[] = [];
    items.forEach((item, idx) => {
      const anyItem = item as any;
      itemsForRules.push({
        id: `${roomForRules.roomId}-${idx}`,
        roomId: roomForRules.roomId,
        roomLabel: roomForRules.roomLabel,
        label: item.label,
        category: item.category,
        quantity: item.quantity,
        confidence: item.confidence,
        widthCm:
          typeof anyItem.widthCm === "number" ? anyItem.widthCm : null,
        depthCm:
          typeof anyItem.depthCm === "number" ? anyItem.depthCm : null,
        heightCm:
          typeof anyItem.heightCm === "number" ? anyItem.heightCm : null,
        volumeM3Ai:
          typeof anyItem.volumeM3 === "number" ? anyItem.volumeM3 : null,
        volumeM3Standard: null,
        volumeM3Final: null,
        volumeSource: "ai",
        valueEurTypicalAi:
          typeof anyItem.valueEstimateEur === "number"
            ? anyItem.valueEstimateEur
            : null,
        valueSource:
          typeof anyItem.valueEstimateEur === "number" ? "ai" : "none",
        parentId: null,
        derivedKind: null,
      });
    });

    const enriched = enrichItemsWithBusinessRules(itemsForRules, [
      roomForRules,
    ]);

    const enrichedRoomItems: RoomInventoryItem[] = enriched.map((item) => {
      const volumeM3 =
        (item.volumeM3Final ??
          item.volumeM3Ai ??
          item.volumeM3Standard) ?? null;

      return {
        label: item.label,
        category: item.category,
        quantity: item.quantity,
        confidence: item.confidence,
        widthCm: item.widthCm ?? null,
        depthCm: item.depthCm ?? null,
        heightCm: item.heightCm ?? null,
        volumeM3,
        valueEstimateEur: item.valueEurTypicalAi ?? null,
        valueJustification: null,
      };
    });

    const end = Date.now();
    const totalMs = end - startedAt;

    const room: LabRoom = {
      roomId: "widget-main-room",
      roomType,
      label: roomLabel,
      photoIds: photosMeta.map((p) => p.id),
      items: enrichedRoomItems,
    };

    return withCors(
      req,
      NextResponse.json({
        model: CLAUDE_MODEL_WIDGET,
        rooms: items.length ? [room] : [],
        totalMs,
      })
    );
  } catch (error) {
    console.error("❌ Erreur POST /api/widget/photo-inventory:", error);
    return withCors(
      req,
      NextResponse.json(
        { error: "Erreur interne lors de l'analyse widget." },
        { status: 500 }
      )
    );
  }
}

async function callClaudeInventoryForRoomWithMeasures(
  roomType: string,
  roomLabel: string,
  base64Images: string[],
  photosMeta: AnalyzePhotoInput[]
): Promise<RoomInventoryItem[]> {
  const prompt = buildInventoryPromptWithMeasures(
    roomType,
    roomLabel,
    photosMeta
  );

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL_WIDGET,
      max_tokens: 1500,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...base64Images.map((b64) => ({
              type: "image" as const,
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
      `[AI][Widget] Erreur appel inventaire widget pour ${roomType}:`,
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
      `[AI][Widget] Réponse inventaire widget non JSON pour ${roomType}:`,
      text
    );
    return [];
  }

  if (!parsed || !Array.isArray(parsed.items)) {
    console.error(
      `[AI][Widget] Réponse inventaire widget invalide (pas de items) pour ${roomType}`
    );
    return [];
  }

  return parsed.items as RoomInventoryItem[];
}

function buildInventoryPromptWithMeasures(
  roomType: string,
  roomLabel: string,
  photos: AnalyzePhotoInput[]
): string {
  const list = photos
    .map(
      (p, index) =>
        `- Photo ${index + 1}: id="${p.id}", fichier="${p.originalFilename}"`
    )
    .join("\n");

  return `
Tu es un assistant expert en déménagement.
On te montre plusieurs photos (1 à 3) d'une même pièce : "${roomLabel}" (type ${roomType}).
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

Voici la liste des photos pour cette pièce :
${list}
`.trim();
}


