export const TYPE_COEFFICIENTS = {
  studio: 0.3,
  t1: 0.3,
  t2: 0.35,
  t3: 0.35,
  t4: 0.4,
  t5: 0.4,
  house: 0.45,
} as const;

export const DENSITY_COEFFICIENTS = {
  light: 0.9, // Sobre : -10%
  normal: 1.0, // Normal : baseline
  dense: 1.1, // Bien meublé : +10%
} as const;

export const FORMULE_MULTIPLIERS = {
  ECONOMIQUE: 1.1,
  STANDARD: 1.25,
  PREMIUM: 1.4,
} as const;

export const SERVICES_PRIX = {
  monteMeuble: 150,
  pianoDroit: 200,
  pianoQuart: 250,
  debarras: 100,
} as const;

// Coefficients de base (alignés sur le tunnel Marseille / La Poste)
export const COEF_VOLUME = 80; // €/m3
export const COEF_DISTANCE = 1.2; // €/km
export const PRIX_MIN_SOCLE = 400; // Prix minimum


