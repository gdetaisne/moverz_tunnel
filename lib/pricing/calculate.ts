import {
  TYPE_COEFFICIENTS,
  DENSITY_COEFFICIENTS,
  FORMULE_MULTIPLIERS,
  SERVICES_PRIX,
  COEF_VOLUME,
  PRIX_MIN_SOCLE,
  getDistanceBand,
  LA_POSTE_RATES_EUR_PER_M3,
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Économie d'échelle sur le coût volumique:
 * - petits volumes (≈10 m³) ~ neutre
 * - volumes moyens/grands: €/m³ légèrement plus bas (capé)
 *
 * Formule: clamp((V/10)^(-0.15), 0.75, 1.05)
 */
export function getVolumeEconomyScale(volumeM3: number): number {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return 1;
  const raw = Math.pow(volumeM3 / 10, -0.15);
  return clamp(raw, 0.75, 1.05);
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

  // 2. Prix base (La Poste): tarif €/m³ dépendant de la tranche distance + formule.
  // On conserve l'esprit V2 "max(..., socle)" mais la composante distance est en €/m³,
  // donc elle dépend nécessairement du volume.
  const band = getDistanceBand(input.distanceKm);
  const rateEurPerM3 = LA_POSTE_RATES_EUR_PER_M3[band][input.formule];
  const volumeScale = getVolumeEconomyScale(volumeM3);
  const baseNoSeason = Math.max(
    volumeM3 * rateEurPerM3 * volumeScale,
    PRIX_MIN_SOCLE
  );
  const baseSeasoned = baseNoSeason * input.seasonFactor;

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
  // La formule est déjà intégrée dans le tarif La Poste (rateEurPerM3),
  // donc on neutralise le multiplicateur pour éviter le double comptage.
  const formuleMultiplier = 1;

  // 5. Prix centres sans / avec saison (hors services)
  const centreNoSeasonSansServices = baseNoSeason * formuleMultiplier * coeffEtage;
  const centreSeasonedSansServices = baseSeasoned * formuleMultiplier * coeffEtage;

  // 6. Services additionnels
  let servicesTotal = 0;
  if (input.services.monteMeuble) servicesTotal += SERVICES_PRIX.monteMeuble;
  if (input.services.piano === "droit") servicesTotal += SERVICES_PRIX.pianoDroit;
  if (input.services.piano === "quart") servicesTotal += SERVICES_PRIX.pianoQuart;
  if (input.services.debarras) servicesTotal += SERVICES_PRIX.debarras;

  // 7. Prix final
  const centreNoSeason = centreNoSeasonSansServices + servicesTotal;
  const centreSeasoned = centreSeasonedSansServices + servicesTotal;
  const prixFinal = Math.round(centreSeasoned);

  // 8. Fourchette :
  // - min ancré sur le prix "hors saison" avec -20 %
  // - max sur le prix saisonné avec +20 %
  const prixMin = Math.round(centreNoSeason * 0.8);
  const prixMax = Math.round(centreSeasoned * 1.2);

  return {
    volumeM3,
    distanceKm: input.distanceKm,
    prixBase: Math.round(baseNoSeason),
    formuleMultiplier,
    coeffEtage,
    prixAvecFormule: Math.round(centreSeasonedSansServices),
    servicesTotal,
    prixFinal,
    prixMin,
    prixMax,
  };
}


