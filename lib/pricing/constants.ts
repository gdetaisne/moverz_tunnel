export const TYPE_COEFFICIENTS = {
  // Anciens × 1.15 pour absorber le rebase densité (normal = 1.0)
  studio: 0.46,
  t1: 0.4025,
  t2: 0.4025,
  t3: 0.4025,
  t4: 0.46,
  t5: 0.46,
  house: 0.46,
  house_1floor: 0.46,
  house_2floors: 0.46,
  house_3floors: 0.46,
} as const;

export const DENSITY_COEFFICIENTS = {
  light: 0.78,   // Peu meublé : -22 % vs normal
  normal: 1.0,   // Référence
  dense: 1.17,   // Très meublé : +17 % vs normal
} as const;

export const FORMULE_MULTIPLIERS = {
  // ÉCO : 0,75 ; STANDARD : 1 ; PREMIUM : 1,25
  ECONOMIQUE: 0.75,
  STANDARD: 1.0,
  PREMIUM: 1.25,
} as const;

export const SERVICES_PRIX = {
  monteMeuble: 200,
  pianoDroit: 200,
  pianoQuart: 250,
  debarras: 100,
} as const;

export const OBJETS_SPECIFIQUES_PRIX = {
  piano: 200,
  coffreFort: 150,
  aquarium: 100,
  objetsFragilesVolumineux: 80,
  meublesTresLourd: 100,
} as const;

// Décote globale (pricing base). -0.2 => -20% (factor 0.8).
// Option A: appliquée à `rateEurPerM3` + `COEF_DISTANCE` uniquement (pas au socle, ni aux services).
export const DECOTE = -0.2 as const;

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


