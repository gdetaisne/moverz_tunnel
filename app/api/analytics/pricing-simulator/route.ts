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
  const density = raw.density === "light" || raw.density === "normal" ? raw.density : "dense";
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
    const raw = calculatePricing({
      surfaceM2: input.surfaceM2,
      housingType: "t2",
      density: input.density,
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
      extraVolumeM3: input.extraVolumeM3,
    });

    const detailedWithProvision = withProvision(raw.prixMin, raw.prixFinal, raw.prixMax);
    const baseline = computeBaselineEstimate({
      surfaceM2: input.surfaceM2,
      distanceKm: input.distanceKm,
      formule: input.formule,
    });

    return NextResponse.json(
      {
        input,
        detailed: {
          raw,
          withProvision: detailedWithProvision,
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
