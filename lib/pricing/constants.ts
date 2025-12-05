export const TYPE_COEFFICIENTS = {
  // 0,35 pour T1/T2/T3 ; 0,3 pour le reste
  studio: 0.3,
  t1: 0.35,
  t2: 0.35,
  t3: 0.35,
  t4: 0.3,
  t5: 0.3,
  house: 0.3,
  // Variantes maison étagée
  house_1floor: 0.3,
  house_2floors: 0.3,
  house_3floors: 0.3,
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


