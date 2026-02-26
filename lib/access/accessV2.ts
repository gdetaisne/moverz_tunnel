export type AccessChoice = "simple" | "complicated" | "other";
export type AccessType = "simple" | "constrained";

export interface AccessSideFlags {
  narrow_access: boolean;
  long_carry: boolean;
  difficult_parking: boolean;
  lift_required: boolean;
}

export interface ComputeAccessV2Params {
  originAccess: string;
  destinationAccess: string;
  originHousingType: string;
  destinationHousingType: string;
  originFloor: string;
  destinationFloor: string;
  originElevator: string;
  destinationElevator: string;
}

export interface ComputeAccessV2Result {
  access_type: AccessType;
  narrow_access: boolean;
  long_carry: boolean;
  difficult_parking: boolean;
  lift_required: boolean;
  anyOther: boolean;
  origin: AccessSideFlags;
  destination: AccessSideFlags;
}

export function normalizeAccessChoice(raw: string): AccessChoice {
  if (raw === "constrained") return "complicated";
  if (raw === "easy") return "simple";
  if (raw === "simple" || raw === "complicated" || raw === "other") return raw;
  return "simple";
}

function isHouseLike(housingType: string, floorNum: number): boolean {
  return housingType === "house" || housingType === "box" || floorNum === 0;
}

export function computeAccessV2FromUi(params: ComputeAccessV2Params): ComputeAccessV2Result {
  const originAccessChoice = normalizeAccessChoice(params.originAccess);
  const destinationAccessChoice = normalizeAccessChoice(params.destinationAccess);
  const originFloorNum = Number.parseInt(params.originFloor || "0", 10) || 0;
  const destinationFloorNum = Number.parseInt(params.destinationFloor || "0", 10) || 0;

  const originIsHouseLike = isHouseLike(params.originHousingType, originFloorNum);
  const destIsHouseLike = isHouseLike(params.destinationHousingType, destinationFloorNum);

  const originElevatorIsSmall = params.originElevator === "small" || params.originElevator === "partial";
  const destElevatorIsSmall = params.destinationElevator === "small" || params.destinationElevator === "partial";

  const anyOther =
    originAccessChoice === "other" ||
    destinationAccessChoice === "other" ||
    params.originElevator === "other" ||
    params.destinationElevator === "other";

  const originComplicated = originAccessChoice === "complicated";
  const destComplicated = destinationAccessChoice === "complicated";

  // Par côté — règle produit: "petit ascenseur" => narrow_access uniquement sur le côté concerné.
  const origin: AccessSideFlags = {
    narrow_access: Boolean(originElevatorIsSmall || (originComplicated && originIsHouseLike)),
    long_carry: Boolean(originComplicated && originIsHouseLike),
    difficult_parking: Boolean(originComplicated),
    lift_required: Boolean(
      !originIsHouseLike && originFloorNum >= 4 && params.originElevator === "no",
    ),
  };

  const destination: AccessSideFlags = {
    narrow_access: Boolean(destElevatorIsSmall || (destComplicated && destIsHouseLike)),
    long_carry: Boolean(destComplicated && destIsHouseLike),
    difficult_parking: Boolean(destComplicated),
    lift_required: Boolean(
      !destIsHouseLike && destinationFloorNum >= 4 && params.destinationElevator === "no",
    ),
  };

  const narrow_access = origin.narrow_access || destination.narrow_access;
  const long_carry = origin.long_carry || destination.long_carry;
  const difficult_parking = origin.difficult_parking || destination.difficult_parking;
  const lift_required = origin.lift_required || destination.lift_required;

  const access_type: AccessType =
    narrow_access || long_carry || difficult_parking || lift_required || anyOther
      ? "constrained"
      : "simple";

  return {
    access_type,
    narrow_access,
    long_carry,
    difficult_parking,
    lift_required,
    anyOther,
    origin,
    destination,
  };
}

