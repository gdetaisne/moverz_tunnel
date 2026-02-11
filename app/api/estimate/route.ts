import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculatePricing } from "@/lib/pricing/calculate";

/**
 * GET /api/estimate?originPostalCode=75011&destinationPostalCode=13001&surface=60&formule=STANDARD
 *
 * Retourne une estimation rapide (fourchette min/max)
 * avec des hypothèses conservatrices (mêmes que Step 2 du tunnel).
 * Le paramètre `formule` est optionnel (défaut: STANDARD).
 *
 * Utilisé par la home moverz.fr pour afficher un budget indicatif
 * avant de rediriger vers le tunnel complet (Step 3).
 */

const FORMULES = ["ECONOMIQUE", "STANDARD", "PREMIUM"] as const;

const EstimateQuerySchema = z.object({
  originPostalCode: z
    .string()
    .min(2, "Code postal origine requis")
    .max(10),
  destinationPostalCode: z
    .string()
    .min(2, "Code postal destination requis")
    .max(10),
  surface: z.coerce
    .number()
    .int()
    .min(10, "Surface min 10 m²")
    .max(500, "Surface max 500 m²"),
  formule: z.enum(FORMULES).optional().default("STANDARD"),
});

/**
 * Heuristique distance par codes postaux (même logique que le tunnel Step 2).
 * Pas de coordonnées GPS ici → fallback département.
 */
function estimateDistanceFromPostalCodes(
  originPostalCode: string,
  destinationPostalCode: string
): number {
  if (!originPostalCode || !destinationPostalCode) return 50;
  if (originPostalCode === destinationPostalCode) return 10;
  const o = parseInt(originPostalCode.slice(0, 2), 10);
  const d = parseInt(destinationPostalCode.slice(0, 2), 10);
  if (Number.isNaN(o) || Number.isNaN(d)) return 50;
  const diff = Math.abs(o - d);
  return Math.min(1000, 40 + diff * 40);
}

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = EstimateQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Paramètres invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { originPostalCode, destinationPostalCode, surface, formule } = parsed.data;

    // Distance heuristique (+5 km buffer, comme Step 2 du tunnel)
    const cityDistanceKm = estimateDistanceFromPostalCodes(
      originPostalCode,
      destinationPostalCode
    );
    const distanceKm = Math.max(0, cityDistanceKm + 5);

    // Hypothèses conservatrices (alignées sur Step 2 du tunnel)
    const result = calculatePricing({
      surfaceM2: surface,
      housingType: "t2",
      density: "dense",
      distanceKm,
      seasonFactor: 1,
      originFloor: 0,
      originElevator: "yes",
      destinationFloor: 0,
      destinationElevator: "yes",
      formule,
      services: { monteMeuble: false, piano: null, debarras: false },
      extraVolumeM3: 3 * 0.6, // ~cuisine (3 appareils)
    });

    return NextResponse.json({
      prixMin: result.prixMin,
      prixMax: result.prixMax,
      prixCentre: Math.round((result.prixMin + result.prixMax) / 2),
      volumeM3: result.volumeM3,
      distanceKm,
      formule,
      // Métadonnées pour debug
      input: {
        originPostalCode,
        destinationPostalCode,
        surface,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ GET /api/estimate error:", err);
    }
    return NextResponse.json(
      { message: "Erreur interne" },
      { status: 500 }
    );
  }
}
