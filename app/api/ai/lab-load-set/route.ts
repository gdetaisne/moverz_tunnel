import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

interface AnalyzePhotoInput {
  id: string;
  storageKey: string;
  originalFilename: string;
}

const bodySchema = z.object({
  setName: z.enum(["set_1", "set_2", "set_3"]),
});

// Dossier local contenant les sets de test (usage DEV uniquement)
// /Users/guillaumestehelin/moverz_tunnel_temp/Photo test/{set_1,set_2,set_3}
const TEST_BASE_DIR =
  "/Users/guillaumestehelin/moverz_tunnel_temp/Photo test";

const UPLOAD_BASE_DIR = path.join(process.cwd(), "uploads", "ai-lab");

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const { setName } = bodySchema.parse(json);

    const sourceDir = path.join(TEST_BASE_DIR, setName);

    let files: string[];
    try {
      files = await fs.readdir(sourceDir);
    } catch (error) {
      console.error("[AI-LAB] Impossible de lire le dossier source:", {
        sourceDir,
        error,
      });
      return NextResponse.json(
        { error: "Dossier de test introuvable ou illisible." },
        { status: 500 }
      );
    }

    const imageFiles = files.filter((name) => {
      const lower = name.toLowerCase();
      return (
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".heic") ||
        lower.endsWith(".heif")
      );
    });

    if (imageFiles.length === 0) {
      return NextResponse.json({ photos: [] satisfies AnalyzePhotoInput[] });
    }

    const destDir = path.join(UPLOAD_BASE_DIR, setName);
    await fs.mkdir(destDir, { recursive: true });

    const photos: AnalyzePhotoInput[] = [];

    for (const fileName of imageFiles) {
      const sourcePath = path.join(sourceDir, fileName);
      const destPath = path.join(destDir, fileName);

      try {
        // On copie les fichiers dans uploads/ai-lab/{set}
        await fs.copyFile(sourcePath, destPath);
      } catch (error) {
        console.error("[AI-LAB] Erreur lors de la copie du fichier:", {
          sourcePath,
          destPath,
          error,
        });
        continue;
      }

      photos.push({
        id: `${setName}-${fileName}`,
        storageKey: path.join("ai-lab", setName, fileName).replace(/\\/g, "/"),
        originalFilename: fileName,
      });
    }

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("❌ Erreur POST /api/ai/lab-load-set:", error);
    return NextResponse.json(
      { error: "Erreur interne lors du chargement du set de test." },
      { status: 500 }
    );
  }
}



