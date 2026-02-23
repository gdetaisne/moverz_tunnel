import { NextRequest, NextResponse } from "next/server";
import { calculatePricing, type DensityType, type FormuleType } from "@/lib/pricing/calculate";
import {
  BASELINE_DISTANCE_BUFFER_KM,
  DISPLAY_CENTER_BIAS,
  computeBaselineEstimate,
  computeMoverzFeeProvision,
  getDisplayedCenter,
} from "@/lib/pricing/scenarios";
import {
  DECOTE,
  DENSITY_COEFFICIENTS,
  FORMULE_MULTIPLIERS,
  LA_POSTE_RATES_EUR_PER_M3,
  PRIX_MIN_SOCLE,
  SERVICES_PRIX,
  TYPE_COEFFICIENTS,
} from "@/lib/pricing/constants";

type ElevatorType = "yes" | "partial" | "no";

type SimulatorPayload = {
  surfaceM2: number;
  distanceKm: number;
  formule: FormuleType;
  density: DensityType;
  seasonFactor: number;
  originFloor: number;
  originElevator: ElevatorType;
  destinationFloor: number;
  destinationElevator: ElevatorType;
  longCarry: boolean;
  tightAccess: boolean;
  difficultParking: boolean;
  extraVolumeM3: number;
  services: {
    monteMeuble: boolean;
    piano: "droit" | "quart" | null;
    debarras: boolean;
  };
  step3Addons?: {
    accessSideCounts?: {
      narrow_access?: number;
      long_carry?: number;
      difficult_parking?: number;
      lift_required?: number;
    };
    objects?: {
      piano?: boolean;
      coffreFort?: boolean;
      aquarium?: boolean;
      objetsFragilesVolumineux?: boolean;
      meublesTresLourdsCount?: number;
    };
  };
  step3Box?: {
    originIsBox?: boolean;
    destinationIsBox?: boolean;
    originBoxVolumeM3?: number;
  };
};

type SanitizedAddons = {
  accessSideCounts: {
    narrow_access: number;
    long_carry: number;
    difficult_parking: number;
    lift_required: number;
  };
  objects: {
    piano: boolean;
    coffreFort: boolean;
    aquarium: boolean;
    objetsFragilesVolumineux: boolean;
    meublesTresLourdsCount: number;
  };
};

type SanitizedBox = {
  originIsBox: boolean;
  destinationIsBox: boolean;
  originBoxVolumeM3: number | null;
};

function isAuthorized(req: NextRequest): boolean {
  const expectedPassword = process.env.ANALYTICS_PASSWORD || "";
  const password = req.nextUrl.searchParams.get("password") || "";
  return !!expectedPassword && password === expectedPassword;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function sanitizePayload(raw: Partial<SimulatorPayload>): SimulatorPayload {
  const formule = raw.formule === "ECONOMIQUE" || raw.formule === "PREMIUM" ? raw.formule : "STANDARD";
  const density = raw.density === "light" || raw.density === "dense" ? raw.density : "normal";
  const originElevator =
    raw.originElevator === "no" || raw.originElevator === "partial" ? raw.originElevator : "yes";
  const destinationElevator =
    raw.destinationElevator === "no" || raw.destinationElevator === "partial" ? raw.destinationElevator : "yes";
  const piano = raw.services?.piano === "droit" || raw.services?.piano === "quart" ? raw.services.piano : null;

  return {
    surfaceM2: Math.max(10, Math.min(500, Math.round(toNumber(raw.surfaceM2, 60)))),
    distanceKm: Math.max(0, toNumber(raw.distanceKm, 120)),
    formule,
    density,
    seasonFactor: Math.max(0.5, Math.min(2, toNumber(raw.seasonFactor, 1))),
    originFloor: Math.max(0, Math.round(toNumber(raw.originFloor, 0))),
    originElevator,
    destinationFloor: Math.max(0, Math.round(toNumber(raw.destinationFloor, 0))),
    destinationElevator,
    longCarry: Boolean(raw.longCarry),
    tightAccess: Boolean(raw.tightAccess),
    difficultParking: Boolean(raw.difficultParking),
    extraVolumeM3: Math.max(0, toNumber(raw.extraVolumeM3, 1.8)),
    services: {
      monteMeuble: Boolean(raw.services?.monteMeuble),
      piano,
      debarras: Boolean(raw.services?.debarras),
    },
  };
}

function sanitizeAddons(raw: Partial<SimulatorPayload>["step3Addons"]): SanitizedAddons {
  const toCount = (v: unknown) => Math.max(0, Math.min(2, Math.round(toNumber(v, 0))));
  const toHeavyCount = (v: unknown) => Math.max(0, Math.min(50, Math.round(toNumber(v, 0))));
  return {
    accessSideCounts: {
      narrow_access: toCount(raw?.accessSideCounts?.narrow_access),
      long_carry: toCount(raw?.accessSideCounts?.long_carry),
      difficult_parking: toCount(raw?.accessSideCounts?.difficult_parking),
      lift_required: toCount(raw?.accessSideCounts?.lift_required),
    },
    objects: {
      piano: Boolean(raw?.objects?.piano),
      coffreFort: Boolean(raw?.objects?.coffreFort),
      aquarium: Boolean(raw?.objects?.aquarium),
      objetsFragilesVolumineux: Boolean(raw?.objects?.objetsFragilesVolumineux),
      meublesTresLourdsCount: toHeavyCount(raw?.objects?.meublesTresLourdsCount),
    },
  };
}

function sanitizeBox(raw: Partial<SimulatorPayload>["step3Box"]): SanitizedBox {
  const parsedBoxVolume = toNumber(raw?.originBoxVolumeM3, 0);
  return {
    originIsBox: Boolean(raw?.originIsBox),
    destinationIsBox: Boolean(raw?.destinationIsBox),
    originBoxVolumeM3:
      Number.isFinite(parsedBoxVolume) && parsedBoxVolume > 0
        ? Math.round(parsedBoxVolume * 10) / 10
        : null,
  };
}

function withProvision(prixMin: number, prixFinal: number, prixMax: number) {
  const centerBefore = getDisplayedCenter(prixMin, prixMax);
  const provision = computeMoverzFeeProvision(centerBefore);
  const nextMin = prixMin + provision;
  const nextFinal = prixFinal + provision;
  const nextMax = prixMax + provision;
  return {
    provisionEur: provision,
    centerBeforeProvisionEur: centerBefore,
    centerAfterProvisionEur: getDisplayedCenter(nextMin, nextMax),
    prixMin: nextMin,
    prixFinal: nextFinal,
    prixMax: nextMax,
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      hypotheses: {
        displayCenterBias: DISPLAY_CENTER_BIAS,
        baselineDistanceBufferKm: BASELINE_DISTANCE_BUFFER_KM,
        step2Defaults: {
          density: "normal",
          kitchenIncluded: "appliances",
          kitchenApplianceCount: 3,
          extraVolumeM3: 1.8,
          seasonFactor: 1,
          originFloor: 0,
          destinationFloor: 0,
          originElevator: "yes",
          destinationElevator: "yes",
          longCarry: false,
          tightAccess: false,
          difficultParking: false,
          liftRequired: false,
        },
        decote: DECOTE,
        prixMinSocle: PRIX_MIN_SOCLE,
        densityCoefficients: DENSITY_COEFFICIENTS,
        housingCoefficients: TYPE_COEFFICIENTS,
        formuleMultipliersReference: FORMULE_MULTIPLIERS,
        laPosteRatesEurPerM3: LA_POSTE_RATES_EUR_PER_M3,
        servicesPricesEur: SERVICES_PRIX,
        moverzFeeProvisionRule: "MAX(100€ ; 10% du centre estimé)",
        accessRules: {
          longCarry: "+5%",
          tightAccess: "+5%",
          difficultParking: "+3%",
          floorNoElevator: {
            floor1: "+5%",
            floor2: "+10%",
            floor3AndAbove: "+15%",
            floor4AndAboveMonteMeuble: true,
          },
          floorPartialElevator: {
            floor1: "+2%",
            floor2: "+6%",
            floor3AndAbove: "+10%",
          },
        },
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<SimulatorPayload>;
    const input = sanitizePayload(body);
    const addons = sanitizeAddons(body.step3Addons);
    const box = sanitizeBox(body.step3Box);
    const divisor = TYPE_COEFFICIENTS.t2 * DENSITY_COEFFICIENTS.normal;
    const effectiveSurfaceM2 =
      box.originIsBox && box.originBoxVolumeM3 != null
        ? Math.max(10, Math.min(500, Math.round(box.originBoxVolumeM3 / divisor)))
        : input.surfaceM2;
    const effectiveDensity: DensityType = box.originIsBox ? "normal" : input.density;
    const effectiveExtraVolumeM3 = box.originIsBox ? 0 : input.extraVolumeM3;
    const raw = calculatePricing({
      surfaceM2: effectiveSurfaceM2,
      housingType: "t2",
      density: effectiveDensity,
      distanceKm: input.distanceKm,
      seasonFactor: input.seasonFactor,
      originFloor: input.originFloor,
      originElevator: input.originElevator,
      destinationFloor: input.destinationFloor,
      destinationElevator: input.destinationElevator,
      formule: input.formule,
      services: input.services,
      longCarry: input.longCarry,
      tightAccess: input.tightAccess,
      difficultParking: input.difficultParking,
      extraVolumeM3: effectiveExtraVolumeM3,
    });

    const detailedWithProvision = withProvision(raw.prixMin, raw.prixFinal, raw.prixMax);
    const accessHousingBaselineRaw = calculatePricing({
      surfaceM2: effectiveSurfaceM2,
      housingType: "t2",
      density: effectiveDensity,
      distanceKm: input.distanceKm,
      seasonFactor: input.seasonFactor,
      originFloor: 0,
      originElevator: "yes",
      destinationFloor: 0,
      destinationElevator: "yes",
      formule: input.formule,
      services: { monteMeuble: false, piano: null, debarras: false },
      longCarry: false,
      tightAccess: false,
      difficultParking: false,
      extraVolumeM3: effectiveExtraVolumeM3,
    });
    const accessHousingCurrentRaw = calculatePricing({
      surfaceM2: effectiveSurfaceM2,
      housingType: "t2",
      density: effectiveDensity,
      distanceKm: input.distanceKm,
      seasonFactor: input.seasonFactor,
      originFloor: input.originFloor,
      originElevator: input.originElevator,
      destinationFloor: input.destinationFloor,
      destinationElevator: input.destinationElevator,
      formule: input.formule,
      services: { monteMeuble: false, piano: null, debarras: false },
      longCarry: false,
      tightAccess: false,
      difficultParking: false,
      extraVolumeM3: effectiveExtraVolumeM3,
    });
    const accessHousingBaselineWithProvision = withProvision(
      accessHousingBaselineRaw.prixMin,
      accessHousingBaselineRaw.prixFinal,
      accessHousingBaselineRaw.prixMax
    );
    const accessHousingCurrentWithProvision = withProvision(
      accessHousingCurrentRaw.prixMin,
      accessHousingCurrentRaw.prixFinal,
      accessHousingCurrentRaw.prixMax
    );
    const accessHousingRawDeltaEur =
      accessHousingCurrentWithProvision.centerAfterProvisionEur -
      accessHousingBaselineWithProvision.centerAfterProvisionEur;
    const accessHousingBoxDiscountEur =
      (box.originIsBox || box.destinationIsBox) && accessHousingRawDeltaEur > 0
        ? Math.round(accessHousingRawDeltaEur * 0.2)
        : 0;
    const accessFixedAddonEur =
      addons.accessSideCounts.narrow_access * 70 +
      addons.accessSideCounts.long_carry * 80 +
      addons.accessSideCounts.difficult_parking * 100 +
      addons.accessSideCounts.lift_required * 250;
    const objectsFixedAddonEur =
      (addons.objects.piano ? 150 : 0) +
      (addons.objects.coffreFort ? 150 : 0) +
      (addons.objects.aquarium ? 100 : 0) +
      (addons.objects.objetsFragilesVolumineux ? 80 : 0) +
      addons.objects.meublesTresLourdsCount * 100;
    const totalFixedAddonsEur = accessFixedAddonEur + objectsFixedAddonEur;
    const detailedWithProvisionAndAddons = {
      ...detailedWithProvision,
      prixMin: detailedWithProvision.prixMin + totalFixedAddonsEur - accessHousingBoxDiscountEur,
      prixFinal: detailedWithProvision.prixFinal + totalFixedAddonsEur - accessHousingBoxDiscountEur,
      prixMax: detailedWithProvision.prixMax + totalFixedAddonsEur - accessHousingBoxDiscountEur,
      centerAfterProvisionEur:
        detailedWithProvision.centerAfterProvisionEur + totalFixedAddonsEur - accessHousingBoxDiscountEur,
    };
    const baseline = computeBaselineEstimate({
      surfaceM2: effectiveSurfaceM2,
      distanceKm: input.distanceKm,
      formule: input.formule,
    });

    return NextResponse.json(
      {
        input,
        effectiveInput: {
          surfaceM2: effectiveSurfaceM2,
          density: effectiveDensity,
          extraVolumeM3: effectiveExtraVolumeM3,
        },
        detailed: {
          raw,
          withProvision: detailedWithProvision,
          withProvisionAndAddons: detailedWithProvisionAndAddons,
          addons: {
            accessFixedAddonEur,
            objectsFixedAddonEur,
            totalFixedAddonsEur,
            accessSideCounts: addons.accessSideCounts,
            objects: addons.objects,
            box: {
              ...box,
              accessHousingRawDeltaEur,
              accessHousingBoxDiscountEur,
            },
          },
        },
        baseline,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[analytics/pricing-simulator] Error:", error);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
