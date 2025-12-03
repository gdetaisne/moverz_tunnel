import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const updateLeadSchema = z.object({
  // Suivi de progression
  formCompletionStatus: z.enum(["none", "partial", "complete"]).optional(),
  photoStatus: z
    .enum(["none", "planned_whatsapp", "received_whatsapp", "received_web"])
    .optional(),
  photosStatus: z.enum(["NONE", "PENDING", "UPLOADED"]).optional(),

  // Champs projet & estimation
  originPostalCode: z.string().nullable().optional(),
  originCity: z.string().nullable().optional(),
  originAddress: z.string().nullable().optional(),
  destinationPostalCode: z.string().nullable().optional(),
  destinationCity: z.string().nullable().optional(),
  destinationAddress: z.string().nullable().optional(),
  movingDate: z.string().nullable().optional(),
  details: z.string().nullable().optional(),

  housingType: z
    .enum([
      "studio",
      "t1",
      "t2",
      "t3",
      "t4",
      "t5",
      "house",
      "house_1floor",
      "house_2floors",
      "house_3floors",
    ])
    .nullable()
    .optional(),
  surfaceM2: z.number().int().nullable().optional(),
  density: z.enum(["light", "normal", "dense"]).nullable().optional(),
  formule: z
    .enum(["ECONOMIQUE", "STANDARD", "PREMIUM"])
    .nullable()
    .optional(),
  volumeM3: z.number().nullable().optional(),
  distanceKm: z.number().nullable().optional(),
  priceMin: z.number().int().nullable().optional(),
  priceMax: z.number().int().nullable().optional(),

  // Génération de token de liaison WhatsApp
  ensureLinkingToken: z.boolean().optional(),
});

function generateLinkingToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  const code = Array.from({ length: 6 }, pick).join("");
  return `MZ-${code}`;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json().catch(() => ({}));
    const parsed = updateLeadSchema.parse(json);

    const { ensureLinkingToken, photosStatus: nextPhotosStatus, ...updatable } =
      parsed;

    const existing = await prisma.leadTunnel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "LeadTunnel introuvable" },
        { status: 404 }
      );
    }

    let linkingToken = existing.linkingToken;

    if (ensureLinkingToken && !linkingToken) {
      // Générer un token unique (en pratique, collisions très improbables)
      linkingToken = generateLinkingToken();
    }

    const updated = await prisma.leadTunnel.update({
      where: { id },
      data: {
        ...updatable,
        formCompletionStatus:
          updatable.formCompletionStatus ?? existing.formCompletionStatus,
        photoStatus: updatable.photoStatus ?? existing.photoStatus,
        linkingToken,
      },
    });

    // ⚠️ Contournement : Prisma ne connaît pas encore le champ photosStatus
    // dans le client généré, donc on le met à jour via une requête brute.
    if (nextPhotosStatus && nextPhotosStatus !== existing.photosStatus) {
      await prisma.$executeRawUnsafe(
        'UPDATE "LeadTunnel" SET "photosStatus" = ? WHERE "id" = ?',
        nextPhotosStatus,
        id
      );
    }

    return NextResponse.json({
      id: updated.id,
      linkingToken: updated.linkingToken,
      formCompletionStatus: updated.formCompletionStatus,
      photoStatus: updated.photoStatus,
      photosStatus: nextPhotosStatus ?? existing.photosStatus,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("❌ Erreur PATCH /api/leads/[id]:", error);
    return NextResponse.json(
      { error: "Erreur interne, veuillez réessayer plus tard." },
      { status: 500 }
    );
  }
}


