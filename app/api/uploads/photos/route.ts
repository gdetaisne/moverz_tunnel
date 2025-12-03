import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { prisma } from "@/lib/db";

// Images uniquement (plus de vidéos)
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

// On garde une limite confortable d'upload brut, mais on compresse ensuite.
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 Mo

// Dossier local pour les images normalisées
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function getExtensionFromMime(mime: AllowedMimeType): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const leadId = formData.get("leadId");

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { error: "Paramètre leadId manquant ou invalide." },
        { status: 400 }
      );
    }

    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni.", success: [], errors: [] },
        { status: 400 }
      );
    }

    await ensureUploadDir();

    const success: any[] = [];
    const errors: { originalFilename: string; reason: string }[] = [];

    for (const file of files) {
      const originalFilename = file.name || "fichier-sans-nom";
      const mimeType = file.type;
      const sizeBytes = file.size ?? 0;

      if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
        errors.push({
          originalFilename,
          reason: "Type de fichier non supporté.",
        });
        continue;
      }

      if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        errors.push({
          originalFilename,
          reason: "Fichier trop volumineux.",
        });
        continue;
      }

      // Normalisation : image JPEG, long côté max 2048px, qualité ~80
      const key = path.join(leadId, `${Date.now()}-${nanoid(8)}.jpg`);
      const diskPath = path.join(UPLOAD_DIR, key);

      try {
        await fs.mkdir(path.dirname(diskPath), { recursive: true });

        const buffer = Buffer.from(await file.arrayBuffer());

        // sharp prend en charge la rotation EXIF et la réduction de taille
        const normalized = await sharp(buffer, { failOnError: false })
          .rotate()
          .resize({
            width: 2048,
            height: 2048,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 80,
            mozjpeg: true,
          })
          .toBuffer();

        await fs.writeFile(diskPath, normalized);

        const record = await prisma.leadPhoto.create({
          data: {
            leadId,
            storageKey: key,
            url: null,
            originalFilename,
            mimeType: "image/jpeg",
            sizeBytes: normalized.length,
            analysisStatus: "NONE",
          },
        });

        success.push({
          id: record.id,
          url: record.url,
          storageKey: record.storageKey,
          originalFilename: record.originalFilename,
          mimeType: record.mimeType,
          sizeBytes: record.sizeBytes,
        });
      } catch (error) {
        console.error("❌ Erreur d'upload fichier:", {
          originalFilename,
          error,
        });
        errors.push({
          originalFilename,
          reason: "Erreur interne lors de l'enregistrement du fichier.",
        });
      }
    }

    return NextResponse.json(
      {
        success,
        errors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Erreur POST /api/uploads/photos:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l'upload des photos." },
      { status: 500 }
    );
  }
}


