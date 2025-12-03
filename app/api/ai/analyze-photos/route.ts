import { NextRequest, NextResponse } from "next/server";

interface AnalyzePhotoInput {
  id: string;
  storageKey: string;
  originalFilename: string;
}

interface AnalyzeRequestBody {
  leadId?: string;
  photos: AnalyzePhotoInput[];
}

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
      const fallbackRooms = createFallbackAnalysis(json.photos);
      return NextResponse.json({ rooms: fallbackRooms });
    }

    const prompt = buildPrompt(json.photos);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1200,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("❌ Erreur appel Claude:", await res.text());
      const fallbackRooms = createFallbackAnalysis(json.photos);
      return NextResponse.json({ rooms: fallbackRooms });
    }

    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text ?? "";

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("❌ Réponse Claude non JSON, fallback utilisé:", text);
      const fallbackRooms = createFallbackAnalysis(json.photos);
      return NextResponse.json({ rooms: fallbackRooms });
    }

    if (!parsed || !Array.isArray(parsed.rooms)) {
      const fallbackRooms = createFallbackAnalysis(json.photos);
      return NextResponse.json({ rooms: fallbackRooms });
    }

    return NextResponse.json({ rooms: parsed.rooms });
  } catch (error) {
    console.error("❌ Erreur POST /api/ai/analyze-photos:", error);
    const fallbackRooms = createFallbackAnalysis([]);
    return NextResponse.json(
      { rooms: fallbackRooms, error: "Erreur interne lors de l'analyse." },
      { status: 500 }
    );
  }
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


