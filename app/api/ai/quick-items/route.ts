import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const CLAUDE_MODEL_QUICK_ITEMS =
  process.env.CLAUDE_MODEL_QUICK_ITEMS ??
  process.env.CLAUDE_MODEL_CLASSIFY ??
  process.env.CLAUDE_MODEL ??
  "claude-3-5-haiku-20241022";

const quickItemsSchema = z.object({
  photos: z
    .array(
      z.object({
        id: z.string().min(1),
        storageKey: z.string().min(1),
        originalFilename: z.string().min(1),
      })
    )
    .min(1),
});

type QuickItemsInput = z.infer<typeof quickItemsSchema>;

function buildQuickItemsPrompt(photo: { id: string; originalFilename: string }) {
  // Important: prompt volontairement simple, pas de mesures, on veut uniquement "quoi est visible".
  return `
Tu es un assistant pour un déménagement.
On te montre UNE photo d'un logement et tu dois détecter des meubles/objets encombrants.

Réponds STRICTEMENT en JSON, sans texte avant ou après, avec la forme :
{
  "detectedTypes": ["BED","WARDROBE","SOFA","FRIDGE","WASHER","TABLE","TV","MIRROR","PIANO"],
  "detectedLabels": ["Lit","Armoire / dressing", "..."]
}

Règles:
- detectedTypes contient uniquement des valeurs de la liste ci-dessus.
- detectedLabels contient des libellés français courts correspondants (même ordre).
- Ne mets un type que si tu es raisonnablement confiant (sinon ne l'inclus pas).
- Pas de dimensions, pas de volume, pas de quantité fine.

Infos fichier:
- id interne: "${photo.id}"
- nom de fichier: "${photo.originalFilename}"
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = quickItemsSchema.parse(json) as QuickItemsInput;

    if (!process.env.CLAUDE_API_KEY) {
      // En dev, on ne bloque jamais le tunnel si la clé n'est pas configurée.
      return NextResponse.json({
        results: parsed.photos.map((p) => ({
          photoId: p.id,
          detectedTypes: [],
          detectedLabels: [],
        })),
        model: "no-key",
      });
    }

    const results: Array<{
      photoId: string;
      detectedTypes: string[];
      detectedLabels: string[];
    }> = [];

    for (const photo of parsed.photos) {
      const fullPath = path.join(UPLOAD_DIR, photo.storageKey);
      try {
        const buffer = await fs.readFile(fullPath);
        const base64 = buffer.toString("base64");

        const prompt = buildQuickItemsPrompt(photo);

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": process.env.CLAUDE_API_KEY as string,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL_QUICK_ITEMS,
            max_tokens: 250,
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
          const errText = await res.text().catch(() => "");
          console.error(
            `[AI][QuickItems] Erreur API pour photo ${photo.id} (${photo.originalFilename}):`,
            errText
          );
          results.push({
            photoId: photo.id,
            detectedTypes: [],
            detectedLabels: [],
          });
          continue;
        }

        const data = (await res.json()) as any;
        const text = data?.content?.[0]?.text ?? "";

        let decoded: any;
        try {
          decoded = JSON.parse(text);
        } catch {
          console.error(
            `[AI][QuickItems] Réponse non JSON pour photo ${photo.id}:`,
            text
          );
          results.push({
            photoId: photo.id,
            detectedTypes: [],
            detectedLabels: [],
          });
          continue;
        }

        const rawTypes: string[] = Array.isArray(decoded?.detectedTypes)
          ? (decoded.detectedTypes as unknown[]).filter(
              (t): t is string => typeof t === "string"
            )
          : [];
        const rawLabels: string[] = Array.isArray(decoded?.detectedLabels)
          ? (decoded.detectedLabels as unknown[]).filter(
              (t): t is string => typeof t === "string"
            )
          : [];

        const normalizeType = (t: string): string | null => {
          const u = t.trim().toUpperCase();
          const map: Record<string, string> = {
            BED: "BED",
            LIT: "BED",
            WARDROBE: "WARDROBE",
            ARMOIRE: "WARDROBE",
            DRESSING: "WARDROBE",
            SOFA: "SOFA",
            CANAPE: "SOFA",
            "CANAPÉ": "SOFA",
            FRIDGE: "FRIDGE",
            FRIGO: "FRIDGE",
            REFRIGERATEUR: "FRIDGE",
            "RÉFRIGÉRATEUR": "FRIDGE",
            WASHER: "WASHER",
            "LAVE-LINGE": "WASHER",
            "LAVE LINGE": "WASHER",
            TABLE: "TABLE",
            TV: "TV",
            ECRAN: "TV",
            "ÉCRAN": "TV",
            MIRROR: "MIRROR",
            MIROIR: "MIRROR",
            PIANO: "PIANO",
          };
          const normalized = map[u] ?? null;
          const allowed = new Set([
            "BED",
            "WARDROBE",
            "SOFA",
            "FRIDGE",
            "WASHER",
            "TABLE",
            "TV",
            "MIRROR",
            "PIANO",
          ]);
          return normalized && allowed.has(normalized) ? normalized : null;
        };

        const detectedTypes = Array.from(
          new Set(
            rawTypes
              .map((t) => normalizeType(t))
              .filter((t): t is string => !!t)
          )
        );

        const defaultLabelByType: Record<string, string> = {
          BED: "Lit",
          WARDROBE: "Armoire / dressing",
          SOFA: "Canapé",
          FRIDGE: "Frigo",
          WASHER: "Lave‑linge",
          TABLE: "Table",
          TV: "TV / écran",
          MIRROR: "Miroir / tableau",
          PIANO: "Piano",
        };

        const detectedLabels =
          rawLabels.length > 0
            ? rawLabels.slice(0, detectedTypes.length)
            : detectedTypes.map((t) => defaultLabelByType[t] ?? t);

        results.push({
          photoId: photo.id,
          detectedTypes,
          detectedLabels,
        });
      } catch (error) {
        console.error(
          `[AI][QuickItems] Erreur lecture/analyse photo ${photo.id} (${photo.storageKey}):`,
          error
        );
        results.push({
          photoId: photo.id,
          detectedTypes: [],
          detectedLabels: [],
        });
      }
    }

    return NextResponse.json({
      results,
      model: CLAUDE_MODEL_QUICK_ITEMS,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("❌ Erreur POST /api/ai/quick-items:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l'analyse rapide des photos." },
      { status: 500 }
    );
  }
}


