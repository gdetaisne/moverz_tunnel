import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const inventoryItemSchema = z.object({
  id: z.string(),
  roomType: z.string(),
  roomLabel: z.string(),
  itemLabel: z.string(),
  quantity: z.number().int(),
  widthCm: z.number().nullable().optional(),
  depthCm: z.number().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  volumeM3: z.number().nullable().optional(),
  volumeNuM3: z.number().nullable().optional(),
  valueEstimateEur: z.number().nullable().optional(),
  fragile: z.boolean().optional(),
  packagingFactor: z.number().nullable().optional(),
  packagingReason: z.string().nullable().optional(),
  dependencies: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        quantity: z.number().int().nullable().optional(),
        volumeNuM3: z.number().nullable().optional(),
        volumeM3: z.number().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
  category: z.string().optional(),
  source: z.enum(["ai", "manual", "carton"]).nullable().optional(),
});

const saveInventorySchema = z.object({
  items: z.array(inventoryItemSchema),
  excludedInventoryIds: z.array(z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    const json = await req.json().catch(() => ({}));
    const parsed = saveInventorySchema.parse(json);

    const existingLead = await prisma.leadTunnel.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!existingLead) {
      return NextResponse.json(
        { error: "LeadTunnel introuvable" },
        { status: 404 }
      );
    }

    const excluded = new Set(parsed.excludedInventoryIds ?? []);

    // Regroupement par pièce (roomType + roomLabel)
    const byRoomKey = new Map<
      string,
      {
        roomType: string;
        roomLabel: string;
        items: z.infer<typeof inventoryItemSchema>[];
      }
    >();

    for (const item of parsed.items) {
      const key = `${item.roomType}::${item.roomLabel}`;
      const bucket = byRoomKey.get(key) ?? {
        roomType: item.roomType,
        roomLabel: item.roomLabel,
        items: [],
      };
      bucket.items.push(item);
      byRoomKey.set(key, bucket);
    }

    // On charge toutes les pièces existantes du lead
    const existingRooms = await prisma.leadRoom.findMany({
      where: { leadId },
      include: { items: true },
    });

    const roomByKey = new Map<
      string,
      {
        id: string;
        roomType: string;
        label: string;
      }
    >();

    for (const room of existingRooms) {
      const key = `${room.roomType}::${room.label}`;
      roomByKey.set(key, {
        id: room.id,
        roomType: room.roomType,
        label: room.label,
      });
    }

    // 1) On prépare / crée les pièces nécessaires
    for (const { roomType, roomLabel } of byRoomKey.values()) {
      const key = `${roomType}::${roomLabel}`;
      if (roomByKey.has(key)) continue;

      const created = await prisma.leadRoom.create({
        data: {
          leadId,
          roomType,
          roomIndex: null,
          label: roomLabel,
          analysisStatus: "DONE",
          inventoryStatus: "DONE",
        },
      });

      roomByKey.set(key, {
        id: created.id,
        roomType: created.roomType,
        label: created.label,
      });
    }

    const roomIds = Array.from(roomByKey.values()).map((r) => r.id);

    // 2) On supprime l'ancien inventaire de ces pièces
    if (roomIds.length > 0) {
      await prisma.leadRoomItem.deleteMany({
        where: {
          roomId: { in: roomIds },
        },
      });
    }

    // 3) On recrée tous les items, en respectant les exclusions et les dépendances
    const createdItemsByFrontId = new Map<string, { id: string }>();

    for (const { roomType, roomLabel, items } of byRoomKey.values()) {
      const roomKey = `${roomType}::${roomLabel}`;
      const room = roomByKey.get(roomKey);
      if (!room) continue;

      // On commence par créer toutes les lignes "parent" (y compris Cartons),
      // puis on créera les dépendances en seconde passe.
      for (const item of items) {
        const isExcluded = excluded.has(item.id);

        const created = await prisma.leadRoomItem.create({
          data: {
            roomId: room.id,
            label: item.itemLabel,
            category: item.category ?? "AUTRE",
            quantity: item.quantity,
            confidence: 1,
            widthCm: item.widthCm ?? null,
            depthCm: item.depthCm ?? null,
            heightCm: item.heightCm ?? null,
            volumeM3Nu: item.volumeNuM3 ?? null,
            volumeM3Emballé: item.volumeM3 ?? null,
            valueEstimateEur: item.valueEstimateEur ?? null,
            packagingFactor: item.packagingFactor ?? null,
            packagingReason: item.packagingReason ?? null,
            isFragile: item.fragile ?? false,
            isHighValue:
              (item.valueEstimateEur ?? 0) >= 500 ||
              (item.source === "carton" && (item.valueEstimateEur ?? 0) > 0),
            requiresDisassembly: false,
            source: item.source ?? "ai",
            isExcluded,
          },
        });

        createdItemsByFrontId.set(item.id, { id: created.id });
      }
    }

    // 4) Seconde passe : dépendances (matelas, contenu de cartons…)
    for (const { roomType, roomLabel, items } of byRoomKey.values()) {
      const roomKey = `${roomType}::${roomLabel}`;
      const room = roomByKey.get(roomKey);
      if (!room) continue;

      for (const item of items) {
        if (!item.dependencies || item.dependencies.length === 0) continue;

        const parent = createdItemsByFrontId.get(item.id);
        if (!parent) continue;

        for (const dep of item.dependencies) {
          const isExcluded = excluded.has(dep.id);

          await prisma.leadRoomItem.create({
            data: {
              roomId: room.id,
              label: dep.label,
              category: "AUTRE",
              quantity: dep.quantity ?? 1,
              confidence: 1,
              volumeM3Nu: dep.volumeNuM3 ?? null,
              volumeM3Emballé: dep.volumeM3 ?? null,
              valueEstimateEur: null,
              isFragile: false,
              isHighValue: false,
              requiresDisassembly: false,
              parentItemId: parent.id,
              derivedKind: "DEPENDENCY",
              source: "ai",
              isExcluded,
            },
          });
        }
      }
    }

    await prisma.leadTunnel.update({
      where: { id: leadId },
      data: {
        // On note que l'inventaire a bien été rempli
        formCompletionStatus: "complete",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données inventaire invalides", details: error.issues },
        { status: 400 }
      );
    }

    console.error("❌ Erreur POST /api/leads/[id]/inventory:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l'enregistrement de l'inventaire." },
      { status: 500 }
    );
  }
}



