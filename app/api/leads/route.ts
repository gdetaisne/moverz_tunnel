import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createLeadSchema = z.object({
  primaryChannel: z.enum(["web", "whatsapp"]).default("web"),
  firstName: z.string().min(1, "Le prénom est requis").nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email("Email invalide").nullable().optional(),
  phone: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = createLeadSchema.parse(json);

    const lead = await prisma.leadTunnel.create({
      data: {
        primaryChannel: parsed.primaryChannel,
        firstName: parsed.firstName ?? null,
        lastName: parsed.lastName ?? null,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        source: parsed.source ?? null,
        formCompletionStatus: "partial",
        photoStatus: "none",
      },
    });

    return NextResponse.json({ id: lead.id, linkingToken: lead.linkingToken });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("❌ Erreur POST /api/leads:", error);
    return NextResponse.json(
      { error: "Erreur interne, veuillez réessayer plus tard." },
      { status: 500 }
    );
  }
}


