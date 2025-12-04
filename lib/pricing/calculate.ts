import {
  TYPE_COEFFICIENTS,
  DENSITY_COEFFICIENTS,
  FORMULE_MULTIPLIERS,
  SERVICES_PRIX,
  COEF_VOLUME,
  COEF_DISTANCE,
  PRIX_MIN_SOCLE,
} from "./constants";

export type HousingType = keyof typeof TYPE_COEFFICIENTS;
export type DensityType = keyof typeof DENSITY_COEFFICIENTS;
export type FormuleType = keyof typeof FORMULE_MULTIPLIERS;

export interface PricingServicesInput {
  monteMeuble: boolean;
  piano: "droit" | "quart" | null;
  debarras: boolean;
}

export interface PricingInput {
  surfaceM2: number;
  housingType: HousingType;
  density: DensityType;
  distanceKm: number;
  seasonFactor: number;
  originFloor: number;
  originElevator: "yes" | "no" | "partial";
  destinationFloor: number;
  destinationElevator: "yes" | "no" | "partial";
  formule: FormuleType;
  services: PricingServicesInput;
}

export interface PricingOutput {
  volumeM3: number;
  distanceKm: number;
  prixBase: number;
  formuleMultiplier: number;
  coeffEtage: number;
  prixAvecFormule: number;
  servicesTotal: number;
  prixFinal: number;
  prixMin: number;
  prixMax: number;
}

export function calculateVolume(
  surfaceM2: number,
  housingType: HousingType,
  density: DensityType = "normal"
): number {
  const baseVolume = surfaceM2 * TYPE_COEFFICIENTS[housingType];
  const adjustedVolume = baseVolume * DENSITY_COEFFICIENTS[density];
  return Math.round(adjustedVolume * 10) / 10; // 1 décimale
}

export function getEtageCoefficient(
  floor: number,
  elevator: "yes" | "no" | "partial"
): number {
  if (elevator === "yes") return 1.0;
  if (floor === 0) return 1.0;
  if (floor <= 2) return 1.05;
  if (floor <= 5) return 1.1;
  return 1.15;
}

export function calculatePricing(input: PricingInput): PricingOutput {
  // 1. Volume avec densité
  const volumeM3 = calculateVolume(
    input.surfaceM2,
    input.housingType,
    input.density
  );

  // 2. Prix base volume / distance : on prend la composante dominante plutôt
  // que de sommer les deux (logique proche des grilles pro).
  const volumePart = volumeM3 * COEF_VOLUME;
  const distancePart = input.distanceKm * COEF_DISTANCE;

  const prixBaseBrut = Math.max(volumePart, distancePart, PRIX_MIN_SOCLE);

  // 2.b. Coefficient saison (haute / basse saison)
  const prixBase = prixBaseBrut * input.seasonFactor;

  // 3. Coefficient étages (pire des deux accès)
  const coeffOrigin = getEtageCoefficient(
    input.originFloor,
    input.originElevator
  );
  const coeffDest = getEtageCoefficient(
    input.destinationFloor,
    input.destinationElevator
  );
  const coeffEtage = Math.max(coeffOrigin, coeffDest);

  // 4. Multiplicateur formule
  const formuleMultiplier = FORMULE_MULTIPLIERS[input.formule];

  // 5. Prix avec formule + accès
  const prixAvecFormule = Math.round(prixBase * formuleMultiplier * coeffEtage);

  // 6. Services additionnels
  let servicesTotal = 0;
  if (input.services.monteMeuble) servicesTotal += SERVICES_PRIX.monteMeuble;
  if (input.services.piano === "droit") servicesTotal += SERVICES_PRIX.pianoDroit;
  if (input.services.piano === "quart") servicesTotal += SERVICES_PRIX.pianoQuart;
  if (input.services.debarras) servicesTotal += SERVICES_PRIX.debarras;

  // 7. Prix final
  const prixFinal = prixAvecFormule + servicesTotal;

  // 8. Fourchette ±10 %
  const prixMin = Math.round(prixFinal * 0.9);
  const prixMax = Math.round(prixFinal * 1.1);

  return {
    volumeM3,
    distanceKm: input.distanceKm,
    prixBase: Math.round(prixBase),
    formuleMultiplier,
    coeffEtage,
    prixAvecFormule,
    servicesTotal,
    prixFinal,
    prixMin,
    prixMax,
  };
}


