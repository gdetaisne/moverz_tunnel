export const TYPE_COEFFICIENTS = {
  // 0,35 pour T1/T2/T3 ; 0,4 pour le reste
  studio: 0.4,
  t1: 0.35,
  t2: 0.35,
  t3: 0.35,
  t4: 0.4,
  t5: 0.4,
  house: 0.4,
  // Variantes maison étagée
  house_1floor: 0.4,
  house_2floors: 0.4,
  house_3floors: 0.4,
} as const;

export const DENSITY_COEFFICIENTS = {
  light: 0.9, // Sobre : -10%
  normal: 1.0, // Normal : baseline
  dense: 1.1, // Bien meublé : +10%
} as const;

export const FORMULE_MULTIPLIERS = {
  // ÉCO : 0,75 ; STANDARD : 1 ; PREMIUM : 1,25
  ECONOMIQUE: 0.75,
  STANDARD: 1.0,
  PREMIUM: 1.25,
} as const;

export const SERVICES_PRIX = {
  monteMeuble: 150,
  pianoDroit: 200,
  pianoQuart: 250,
  debarras: 100,
} as const;

// Coefficients de base (alignés sur le tunnel Marseille / La Poste)
// Ces valeurs viennent de `moverz_main` et ont déjà été calibrées sur les cas réels.
export const COEF_VOLUME = 80; // €/m3
export const COEF_DISTANCE = 1.2; // €/km
export const PRIX_MIN_SOCLE = 400; // Prix minimum

// ============================================
// La Poste (référence) — tarifs indicatifs en €/m³ selon la distance
// Source métier: https://www.laposte.fr/demenager/prix-demenagement
// ============================================

/**
 * Grille distance plus granulaire (objectif: éviter l'effet "95 €/m³ dès 101 km").
 *
 * ⚠️ Note: le nom "LA_POSTE_RATES_EUR_PER_M3" est historique. Les valeurs ici
 * sont calibrées sur un bench marché (AlloDemenageur) pour la formule Standard.
 */
export type DistanceBand =
  | "lt_100"
  | "d100_369"
  | "d370_499"
  | "d500_699"
  | "d700_849"
  | "d850_999"
  | "gte_1000";

export function getDistanceBand(distanceKm: number): DistanceBand {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return "lt_100";
  if (distanceKm < 100) return "lt_100";
  if (distanceKm < 370) return "d100_369";
  if (distanceKm < 500) return "d370_499";
  if (distanceKm < 700) return "d500_699";
  if (distanceKm < 850) return "d700_849";
  if (distanceKm < 1000) return "d850_999";
  return "gte_1000";
}

export const LA_POSTE_RATES_EUR_PER_M3 = {
  lt_100: {
    ECONOMIQUE: 35,
    STANDARD: 40,
    PREMIUM: 65,
  },
  d100_369: {
    ECONOMIQUE: 60,
    STANDARD: 75,
    PREMIUM: 110,
  },
  d370_499: {
    ECONOMIQUE: 65,
    STANDARD: 85,
    PREMIUM: 120,
  },
  d500_699: {
    ECONOMIQUE: 75,
    STANDARD: 95,
    PREMIUM: 130,
  },
  d700_849: {
    ECONOMIQUE: 85,
    STANDARD: 105,
    PREMIUM: 140,
  },
  d850_999: {
    ECONOMIQUE: 95,
    STANDARD: 125,
    PREMIUM: 155,
  },
  gte_1000: {
    ECONOMIQUE: 105,
    STANDARD: 145,
    PREMIUM: 170,
  },
} as const satisfies Record<
  DistanceBand,
  Record<keyof typeof FORMULE_MULTIPLIERS, number>
>;


