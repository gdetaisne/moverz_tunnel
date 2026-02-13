import {
  calculatePricing,
  type FormuleType,
  type PricingInput,
  type PricingOutput,
} from "./calculate";

export const BASELINE_DISTANCE_BUFFER_KM = 15;

// Source de vérité du "centre affiché" (home + step 2 + baseline step 3).
// Modifier cette valeur suffit pour ajuster la projection centrale partout.
export const DISPLAY_CENTER_BIAS = 0.5;

export const BASELINE_FORMULES: FormuleType[] = [
  "ECONOMIQUE",
  "STANDARD",
  "PREMIUM",
];

export type BaselineEstimateOutput = PricingOutput & {
  moverzFeeProvisionEur: number;
  step2CenterBeforeProvisionEur: number;
  step2CenterAfterProvisionEur: number;
};

export function getDisplayedCenter(
  minEur: number,
  maxEur: number,
  bias: number = DISPLAY_CENTER_BIAS
): number {
  return Math.round(minEur + (maxEur - minEur) * bias);
}

export function computeMoverzFeeProvision(estimatedAmountEur: number): number {
  if (!Number.isFinite(estimatedAmountEur) || estimatedAmountEur <= 0) return 100;
  return Math.max(100, Math.round(estimatedAmountEur * 0.1));
}

export function deriveCenterBeforeProvision(
  centerAfterProvisionEur: number
): number {
  if (!Number.isFinite(centerAfterProvisionEur) || centerAfterProvisionEur <= 0) return 0;
  // En-dessous de 1100€, on est forcément sur le plancher fee=100.
  if (centerAfterProvisionEur < 1100) return Math.max(0, Math.round(centerAfterProvisionEur - 100));
  // Au-delà, fee=10% du centre "avant", donc after = before * 1.1
  return Math.max(0, Math.round(centerAfterProvisionEur / 1.1));
}

function applyProvisionToBaselinePricing(pricing: PricingOutput): BaselineEstimateOutput {
  const centerBefore = getDisplayedCenter(pricing.prixMin, pricing.prixMax);
  const fee = computeMoverzFeeProvision(centerBefore);

  const prixMinWithFee = pricing.prixMin + fee;
  const prixFinalWithFee = pricing.prixFinal + fee;
  const prixMaxWithFee = pricing.prixMax + fee;

  return {
    ...pricing,
    prixMin: prixMinWithFee,
    prixFinal: prixFinalWithFee,
    prixMax: prixMaxWithFee,
    moverzFeeProvisionEur: fee,
    step2CenterBeforeProvisionEur: centerBefore,
    step2CenterAfterProvisionEur: getDisplayedCenter(prixMinWithFee, prixMaxWithFee),
  };
}

export function getBaselineDistanceKm(cityDistanceKm: number | null): number | null {
  if (cityDistanceKm == null || !Number.isFinite(cityDistanceKm)) return null;
  return cityDistanceKm + BASELINE_DISTANCE_BUFFER_KM;
}

export function buildBaselinePricingInput(params: {
  surfaceM2: number;
  distanceKm: number;
  formule: FormuleType;
}): PricingInput {
  return {
    surfaceM2: params.surfaceM2,
    housingType: "t2",
    density: "dense",
    distanceKm: params.distanceKm,
    seasonFactor: 1,
    originFloor: 0,
    originElevator: "yes",
    destinationFloor: 0,
    destinationElevator: "yes",
    formule: params.formule,
    services: { monteMeuble: false, piano: null, debarras: false },
    extraVolumeM3: 3 * 0.6,
  };
}

export function computeBaselineEstimate(params: {
  surfaceM2: number;
  distanceKm: number;
  formule: FormuleType;
}): BaselineEstimateOutput {
  const raw = calculatePricing(buildBaselinePricingInput(params));
  return applyProvisionToBaselinePricing(raw);
}

export function computeBaselineEstimateByFormule(params: {
  surfaceM2: number;
  distanceKm: number;
}): Record<FormuleType, BaselineEstimateOutput> {
  return BASELINE_FORMULES.reduce<Record<FormuleType, BaselineEstimateOutput>>(
    (acc, formule) => {
      acc[formule] = computeBaselineEstimate({
        surfaceM2: params.surfaceM2,
        distanceKm: params.distanceKm,
        formule,
      });
      return acc;
    },
    {} as Record<FormuleType, BaselineEstimateOutput>
  );
}
