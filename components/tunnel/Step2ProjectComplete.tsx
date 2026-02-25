"use client";

import { useEffect, useState, FormEvent } from "react";
import { MapPin, Home, Calendar, Building2, ArrowRight, Check, AlertCircle, X } from "lucide-react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { DatePickerFr } from "./DatePickerFr";

interface Step2ProjectCompleteProps {
  // Départ
  originPostalCode: string;
  originCity: string;
  originAddress: string;
  originLat: number | null;
  originLon: number | null;
  originHousingType: string;
  originBoxVolumeM3: string;
  originFloor: string;
  originElevator: string;
  originAccess: string;
  originFurnitureLift: string; // unknown/no/yes
  originCarryDistance: string; // "" or "10-20"..."90-100"
  originParkingAuth: boolean;
  originTightAccess: boolean;
  
  // Arrivée
  destinationPostalCode: string;
  destinationCity: string;
  destinationAddress: string;
  destinationLat: number | null;
  destinationLon: number | null;
  destinationHousingType: string;
  destinationFloor: string;
  destinationElevator: string;
  destinationAccess: string;
  destinationFurnitureLift: string;
  destinationCarryDistance: string;
  destinationParkingAuth: boolean;
  destinationTightAccess: boolean;
  destinationUnknown: boolean;
  
  // Date
  movingDate: string;
  dateFlexible: boolean;

  // Accès V2 — descriptions inline par lieu
  originAccessDetails: string;
  destinationAccessDetails: string;
  
  onFieldChange: (field: string, value: any) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  error: string | null;
  showValidation?: boolean;
}

const HOUSING_TYPES = [
  { value: "studio", label: "Studio" },
  { value: "t1", label: "T1" },
  { value: "t2", label: "T2" },
  { value: "t3", label: "T3" },
  { value: "t4", label: "T4" },
  { value: "t5", label: "T5+" },
];

// V2 style: on évite les formats complexes; on capture juste "portage > 10m" (oui/non)
const CARRY_DISTANCE_ON_VALUE = "10-20";

const FLOOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "RDC" },
  { value: "1", label: "1er" },
  { value: "2", label: "2e" },
  { value: "3", label: "3e" },
  { value: "4", label: "4e" },
  { value: "5", label: "5e" },
  { value: "6", label: "6e et plus" },
];

export default function Step2ProjectComplete(props: Step2ProjectCompleteProps) {
  // Destination obligatoire: si une session persistée avait destinationUnknown=true,
  // on la remet à false pour éviter un formulaire incohérent.
  useEffect(() => {
    if (props.destinationUnknown) {
      props.onFieldChange("destinationUnknown", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.destinationUnknown]);

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  function markTouched(field: string) {
    setTouchedFields((prev) => new Set(prev).add(field));
  }

  const BLOCK_ORDER = ["origin-addr", "origin-housing", "dest-addr", "dest-housing", "date"];

  const [visitedBlocks, setVisitedBlocks] = useState<Set<string>>(new Set());

  const markVisitedUpTo = (blockId: string) => {
    const idx = BLOCK_ORDER.indexOf(blockId);
    if (idx <= 0) return;
    setVisitedBlocks((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < idx; i++) next.add(BLOCK_ORDER[i]);
      if (next.size === prev.size) return prev;
      return next;
    });
  };

  const markAllVisited = () => {
    setVisitedBlocks((prev) => {
      const next = new Set(BLOCK_ORDER);
      if (next.size === prev.size) return prev;
      return next;
    });
  };

  const normalizeAccessChoice = (raw: string): "simple" | "complicated" | "other" => {
    if (raw === "constrained") return "complicated";
    if (raw === "easy") return "simple";
    if (raw === "simple" || raw === "complicated" || raw === "other") return raw;
    return "simple";
  };

  const computeAccessV2FromUi = (params: {
    originAccess: string;
    destinationAccess: string;
    originHousingType: string;
    destinationHousingType: string;
    originFloor: string;
    destinationFloor: string;
    originElevator: string;
    destinationElevator: string;
  }) => {
    const originAccessChoice = normalizeAccessChoice(params.originAccess);
    const destinationAccessChoice = normalizeAccessChoice(params.destinationAccess);
    const originFloorNum = Number.parseInt(params.originFloor || "0", 10) || 0;
    const destinationFloorNum = Number.parseInt(params.destinationFloor || "0", 10) || 0;
    const originIsHouseLike = params.originHousingType === "house" || params.originHousingType === "box" || originFloorNum === 0;
    const destIsHouseLike = params.destinationHousingType === "house" || params.destinationHousingType === "box" || destinationFloorNum === 0;

    const originElevatorIsSmall = params.originElevator === "small" || params.originElevator === "partial";
    const destElevatorIsSmall = params.destinationElevator === "small" || params.destinationElevator === "partial";

    const anyOther =
      originAccessChoice === "other" ||
      destinationAccessChoice === "other" ||
      params.originElevator === "other" ||
      params.destinationElevator === "other";

    const anyComplicated =
      originAccessChoice === "complicated" || destinationAccessChoice === "complicated";

    // Heuristique simple: on bascule en "constrained" si un accès est compliqué / autre, ou si petit ascenseur.
    const access_type = anyComplicated || anyOther || originElevatorIsSmall || destElevatorIsSmall ? "constrained" : "simple";
    const narrow_access = Boolean(originElevatorIsSmall || destElevatorIsSmall || (anyComplicated && (originIsHouseLike || destIsHouseLike)));
    const long_carry = Boolean(anyComplicated && (originIsHouseLike || destIsHouseLike));
    const difficult_parking = Boolean(anyComplicated);
    const lift_required = Boolean(
      (!originIsHouseLike && originFloorNum >= 4 && params.originElevator === "no") ||
      (!destIsHouseLike && destinationFloorNum >= 4 && params.destinationElevator === "no")
    );

    return { access_type, narrow_access, long_carry, difficult_parking, lift_required, anyOther };
  };

  const syncAccessV2 = (overrides?: Partial<{
    originAccess: string;
    destinationAccess: string;
    originHousingType: string;
    destinationHousingType: string;
    originFloor: string;
    destinationFloor: string;
    originElevator: string;
    destinationElevator: string;
  }>) => {
    const next = {
      originAccess: overrides?.originAccess ?? props.originAccess,
      destinationAccess: overrides?.destinationAccess ?? props.destinationAccess,
      originHousingType: overrides?.originHousingType ?? props.originHousingType,
      destinationHousingType: overrides?.destinationHousingType ?? props.destinationHousingType,
      originFloor: overrides?.originFloor ?? props.originFloor,
      destinationFloor: overrides?.destinationFloor ?? props.destinationFloor,
      originElevator: overrides?.originElevator ?? props.originElevator,
      destinationElevator: overrides?.destinationElevator ?? props.destinationElevator,
    };
    const v2 = computeAccessV2FromUi(next);
    props.onFieldChange("access_type", v2.access_type);
    props.onFieldChange("narrow_access", v2.narrow_access);
    props.onFieldChange("long_carry", v2.long_carry);
    props.onFieldChange("difficult_parking", v2.difficult_parking);
    props.onFieldChange("lift_required", v2.lift_required);

    // Auto: si 4e+ sans ascenseur => monte-meuble requis (on garde le champ existant pour pricing/payload)
    const originFloorNum = Number.parseInt(next.originFloor || "0", 10) || 0;
    const destFloorNum = Number.parseInt(next.destinationFloor || "0", 10) || 0;
    const originNeedsLift = originFloorNum >= 4 && next.originElevator === "no" && next.originHousingType !== "house" && next.originHousingType !== "box";
    const destNeedsLift = destFloorNum >= 4 && next.destinationElevator === "no" && next.destinationHousingType !== "house" && next.destinationHousingType !== "box";
    if (originNeedsLift) props.onFieldChange("originFurnitureLift", "yes");
    if (destNeedsLift) props.onFieldChange("destinationFurnitureLift", "yes");
  };

  // Init: reflète l'état UI dans accessV2 (global) dès l'arrivée sur l'étape.
  useEffect(() => {
    syncAccessV2();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MIN_DAYS_AHEAD = 14;
  const minMovingDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + MIN_DAYS_AHEAD);
    return d.toISOString().split("T")[0]!;
  })();

  const isMovingDateTooSoon =
    Boolean(props.movingDate) && props.movingDate < minMovingDate;

  const originIsHouse = props.originHousingType === "house";
  const destinationIsHouse = props.destinationHousingType === "house";
  const originIsBox = props.originHousingType === "box";
  const destinationIsBox = props.destinationHousingType === "box";
  const originIsApartment = !originIsHouse && !originIsBox && !!props.originHousingType;
  const destinationIsApartment = !destinationIsHouse && !destinationIsBox && !!props.destinationHousingType;

  const originBoxVolumeOk =
    !originIsBox || (Number.parseFloat(String(props.originBoxVolumeM3 || "")) > 0);
  const isOriginValid =
    props.originAddress.trim().length >= 5 &&
    props.originHousingType.length > 0 &&
    originBoxVolumeOk;
    
  const isDestinationValid =
    props.destinationAddress.trim().length >= 5 &&
    props.destinationHousingType.length > 0;
  
  const isDateValid = props.movingDate.length > 0 && !isMovingDateTooSoon;
  const isFormValid = isOriginValid && isDestinationValid && isDateValid;

  const getBlockStatus = (blockId: string): { valid: boolean; errorMsg: string } | null => {
    if (!visitedBlocks.has(blockId)) return null;
    switch (blockId) {
      case "origin-addr":
        return props.originAddress.trim().length >= 5
          ? { valid: true, errorMsg: "" }
          : { valid: false, errorMsg: "Adresse de départ manquante" };
      case "origin-housing": {
        if (!props.originHousingType) return { valid: false, errorMsg: "Type de logement manquant" };
        if (originIsBox && !originBoxVolumeOk) return { valid: false, errorMsg: "Volume du box manquant" };
        if (originIsApartment && !props.originFloor) return { valid: false, errorMsg: "Étage manquant" };
        const oFloor = Number.parseInt(props.originFloor || "0", 10) || 0;
        if (originIsApartment && oFloor > 0 && !props.originElevator) return { valid: false, errorMsg: "Ascenseur et accès manquant" };
        if ((originIsHouse || originIsBox || (originIsApartment && oFloor === 0)) && !props.originAccess) return { valid: false, errorMsg: "Accès manquant" };
        const originIsOther = props.originElevator === "other" || normalizeAccessChoice(props.originAccess) === "other";
        if (originIsOther && (props.originAccessDetails || "").trim().length < 10) return { valid: false, errorMsg: "Précisez les contraintes (min. 10 car.)" };
        return { valid: true, errorMsg: "" };
      }
      case "dest-addr":
        return props.destinationAddress.trim().length >= 5
          ? { valid: true, errorMsg: "" }
          : { valid: false, errorMsg: "Adresse d'arrivée manquante" };
      case "dest-housing": {
        if (!props.destinationHousingType) return { valid: false, errorMsg: "Type de logement manquant" };
        const dFloor = Number.parseInt(props.destinationFloor || "0", 10) || 0;
        if (destinationIsApartment && !props.destinationFloor) return { valid: false, errorMsg: "Étage manquant" };
        if (destinationIsApartment && dFloor > 0 && !props.destinationElevator) return { valid: false, errorMsg: "Ascenseur et accès manquant" };
        if ((destinationIsHouse || destinationIsBox || (destinationIsApartment && dFloor === 0)) && !props.destinationAccess) return { valid: false, errorMsg: "Accès manquant" };
        const destIsOther = props.destinationElevator === "other" || normalizeAccessChoice(props.destinationAccess) === "other";
        if (destIsOther && (props.destinationAccessDetails || "").trim().length < 10) return { valid: false, errorMsg: "Précisez les contraintes (min. 10 car.)" };
        return { valid: true, errorMsg: "" };
      }
      case "date":
        if (!props.movingDate) return { valid: false, errorMsg: "Date manquante" };
        if (isMovingDateTooSoon) return { valid: false, errorMsg: `Date trop proche (min. ${MIN_DAYS_AHEAD}j)` };
        return { valid: true, errorMsg: "" };
      default:
        return null;
    }
  };

  const BlockBadge = ({ blockId }: { blockId: string }) => {
    const status = getBlockStatus(blockId);
    if (!status) return null;
    if (status.valid) {
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 shrink-0">
          <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 shrink-0">
          <X className="w-4 h-4 text-red-600" strokeWidth={3} />
        </span>
        <span className="text-xs text-red-600">{status.errorMsg}</span>
      </span>
    );
  };

  const setHousingCategory = (
    which: "origin" | "destination",
    category: "apartment" | "house" | "box"
  ) => {
    const prefix = which === "origin" ? "origin" : "destination";
    const current =
      which === "origin" ? props.originHousingType : props.destinationHousingType;

    if (category === "house") {
      markTouched(`${prefix}HousingType`);
      props.onFieldChange(`${prefix}HousingType`, "house");
      // N.A.
      props.onFieldChange(`${prefix}Floor`, "");
      props.onFieldChange(`${prefix}Elevator`, "");
      props.onFieldChange(`${prefix}TightAccess`, false);
      // Reset: l'utilisateur devra ré-expliciter le besoin si nécessaire.
      props.onFieldChange(`${prefix}FurnitureLift`, "no");
      return;
    }

    if (category === "box") {
      markTouched(`${prefix}HousingType`);
      props.onFieldChange(`${prefix}HousingType`, "box");
      props.onFieldChange(`${prefix}Floor`, "");
      props.onFieldChange(`${prefix}Elevator`, "");
      props.onFieldChange(`${prefix}FurnitureLift`, "no");
      props.onFieldChange(`${prefix}TightAccess`, false);
      syncAccessV2(which === "origin" ? { originHousingType: "box" } : { destinationHousingType: "box" });
      return;
    }

    // apartment
    markTouched(`${prefix}HousingType`);
    if (current && current !== "house" && current !== "box") return; // on conserve la taille si déjà choisie
    // Valeur par défaut (rapide) si on bascule depuis Maison / vide
    props.onFieldChange(`${prefix}HousingType`, "t2");
  };

  const missingFields: Array<{ id: string; label: string }> = [];
  if (props.originAddress.trim().length < 5) missingFields.push({ id: "origin-address", label: "Adresse départ" });
  if (!props.originHousingType) missingFields.push({ id: "origin-housingType", label: "Logement départ" });
  if (originIsBox && !originBoxVolumeOk) missingFields.push({ id: "origin-box-volume", label: "Volume box départ" });
  if (!props.destinationUnknown) {
    if (props.destinationAddress.trim().length < 5) missingFields.push({ id: "destination-address", label: "Adresse arrivée" });
    if (!props.destinationHousingType) missingFields.push({ id: "destination-housingType", label: "Logement arrivée" });
  }
  if (!isDateValid) missingFields.push({ id: "movingDate", label: "Date" });
  {
    const v2 = computeAccessV2FromUi({
      originAccess: props.originAccess,
      destinationAccess: props.destinationAccess,
      originHousingType: props.originHousingType,
      destinationHousingType: props.destinationHousingType,
      originFloor: props.originFloor,
      destinationFloor: props.destinationFloor,
      originElevator: props.originElevator,
      destinationElevator: props.destinationElevator,
    });
    const originIsOtherAccess = props.originElevator === "other" || normalizeAccessChoice(props.originAccess) === "other";
    const destIsOtherAccess = props.destinationElevator === "other" || normalizeAccessChoice(props.destinationAccess) === "other";
    if (originIsOtherAccess && (props.originAccessDetails || "").trim().length < 10) {
      missingFields.push({ id: "origin-access-details", label: "Contraintes d’accès (départ)" });
    }
    if (destIsOtherAccess && (props.destinationAccessDetails || "").trim().length < 10) {
      missingFields.push({ id: "dest-access-details", label: "Contraintes d’accès (arrivée)" });
    }
  }

  const showErrors = Boolean(props.showValidation);

  const focusField = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable =
      (el as any).focus
        ? el
        : (el.querySelector?.(
            "input,textarea,select,button,[tabindex]:not([tabindex='-1'])"
          ) as HTMLElement | null);
    focusable?.focus?.();
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="hidden md:inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/10 px-4 py-1.5 text-sm font-semibold text-[#0F172A] mb-6">
          <span className="h-2 w-2 rounded-full bg-[#6BCFCF]" />
          Étape 2/4
        </div>

        <h2 className="text-2xl md:text-4xl font-bold text-[#0F172A] mb-3 md:mb-4 leading-tight">
          Décrivez votre déménagement
        </h2>
        
        <p className="hidden md:block text-lg text-[#1E293B]/70 leading-relaxed">
          Ces informations permettent aux déménageurs de vous faire des devis comparables.
        </p>
      </div>

      <form onSubmit={props.onSubmit} noValidate className="space-y-0 md:space-y-8">
        {/* === DÉPART === */}
        <div className="pb-6 space-y-6 md:pb-0 md:p-6 md:rounded-2xl md:bg-[#F8F9FA] md:border md:border-[#E3E5E8]">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#6BCFCF]" />
            <h3 className="text-lg font-bold text-[#0F172A]">Départ</h3>
          </div>

          {/* Adresse (1 champ) */}
          <AddressAutocomplete
            label="Adresse de départ *"
            labelSuffix={<BlockBadge blockId="origin-addr" />}
            placeholder="10 rue de la Paix, 33000 Bordeaux"
            inputId="origin-address"
            initialValue={
              props.originAddress ||
              [props.originPostalCode, props.originCity].filter(Boolean).join(" ")
            }
            onInputChange={(raw) => {
              // V2-ish: dès qu'on retape une adresse, on reflète le texte dans le state
              // et on invalide les infos dérivées (CP/ville/coords) pour éviter du “stale”.
              props.onFieldChange("originAddress", raw);
              if (props.originPostalCode) props.onFieldChange("originPostalCode", "");
              if (props.originCity) props.onFieldChange("originCity", "");
              if (props.originLat != null) props.onFieldChange("originLat", null);
              if (props.originLon != null) props.onFieldChange("originLon", null);
            }}
            onSelect={(s) => {
              markTouched("originAddress");
              props.onFieldChange("originAddress", s.addressLine ?? s.label);
              props.onFieldChange("originPostalCode", s.postalCode ?? "");
              props.onFieldChange("originCity", s.city ?? "");
              props.onFieldChange("originLat", s.lat ?? null);
              props.onFieldChange("originLon", s.lon ?? null);
            }}
          />
          {showErrors && props.originAddress.trim().length < 5 && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Adresse obligatoire
            </p>
          )}
          {(props.originPostalCode || props.originCity) && (
            <p className="text-xs text-[#1E293B]/60">
              {props.originPostalCode} {props.originCity}
              {props.originLat != null && props.originLon != null ? " · coords OK" : " · coords manquantes"}
            </p>
          )}

          {/* Type de logement */}
          <div id="origin-housingType" onFocusCapture={() => markVisitedUpTo("origin-housing")}>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-[#0F172A]">Type de logement *</label>
              <BlockBadge blockId="origin-housing" />
            </div>

            {/* Catégorie */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setHousingCategory("origin", "apartment")}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  originIsApartment
                    ? "bg-[#6BCFCF] text-white"
                    : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                }`}
              >
                Appartement
              </button>
              <button
                type="button"
                onClick={() => setHousingCategory("origin", "house")}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  originIsHouse
                    ? "bg-[#6BCFCF] text-white"
                    : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                }`}
              >
                Maison
              </button>
              <button
                type="button"
                onClick={() => setHousingCategory("origin", "box")}
                className={`px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  originIsBox
                    ? "bg-[#6BCFCF] text-white"
                    : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                }`}
              >
                Box
              </button>
            </div>

            {/* Taille (appartement) */}
            {originIsApartment && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {HOUSING_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      markTouched("originHousingType");
                      props.onFieldChange("originHousingType", type.value);
                    }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      props.originHousingType === type.value
                        ? "bg-[#0F172A] text-white"
                        : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}

            {(showErrors || touchedFields.has("originHousingType")) && !props.originHousingType && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Type de logement obligatoire
              </p>
            )}
          </div>

          {/* Box (départ): volume exact */}
          {originIsBox && (
            <div id="origin-box-volume" onFocusCapture={() => markVisitedUpTo("origin-housing")}>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Volume exact du box (m³) *
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step={0.1}
                value={props.originBoxVolumeM3 || ""}
                onChange={(e) => {
                  markTouched("originBoxVolumeM3");
                  props.onFieldChange("originBoxVolumeM3", e.target.value);
                }}
                placeholder="Ex: 8"
                className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
              />
              {(showErrors || touchedFields.has("originBoxVolumeM3")) &&
                (!props.originBoxVolumeM3 ||
                  Number.parseFloat(String(props.originBoxVolumeM3)) <= 0) && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Volume obligatoire
                  </p>
                )}
            </div>
          )}

          {/* Étage + Ascenseur et accès */}
          {(() => {
            const originIsBox = props.originHousingType === "box";
            const originIsApartmentEffective = !originIsHouse && !originIsBox && !!props.originHousingType;
            const originFloorNum = Number.parseInt(props.originFloor || "0", 10) || 0;
            const showFloor = originIsApartmentEffective;
            const showElevatorChoices = originIsApartmentEffective && originFloorNum > 0;
            const showAccessChoices = originIsHouse || originIsBox || (originIsApartmentEffective && originFloorNum === 0);
            const originAccessChoice = normalizeAccessChoice(props.originAccess);

            return (
              <div className="space-y-3" onFocusCapture={() => markVisitedUpTo("dest-addr")}>
                {showFloor && (
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Étage</label>
                    <select
                      value={props.originFloor}
                      onChange={(e) => {
                        const nextFloor = e.target.value;
                        props.onFieldChange("originFloor", nextFloor);
                        if ((Number.parseInt(nextFloor || "0", 10) || 0) === 0) {
                          props.onFieldChange("originElevator", "");
                        }
                        syncAccessV2({ originFloor: nextFloor, originElevator: (Number.parseInt(nextFloor || "0", 10) || 0) === 0 ? "" : props.originElevator });
                      }}
                      className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                    >
                      <option value="" disabled>Sélectionnez</option>
                      {FLOOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">Ascenseur et accès</label>

                  {showElevatorChoices ? (
                    <select
                      value={props.originElevator}
                      onChange={(e) => {
                        const next = e.target.value;
                        props.onFieldChange("originElevator", next);
                        const f = Number.parseInt(props.originFloor || "0", 10) || 0;
                        if (next === "no" && f >= 4) props.onFieldChange("originFurnitureLift", "yes");
                        else props.onFieldChange("originFurnitureLift", "no");
                        syncAccessV2({ originElevator: next });
                      }}
                      className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                    >
                      <option value="" disabled>Sélectionnez</option>
                      <option value="yes">Ascenseur &gt; 3 places</option>
                      <option value="small">Petit ascenseur</option>
                      <option value="no">Pas d’ascenseur</option>
                      <option value="other">Autre</option>
                    </select>
                  ) : showAccessChoices ? (
                    <select
                      value={props.originAccess}
                      onChange={(e) => {
                        const next = e.target.value;
                        props.onFieldChange("originAccess", next);
                        syncAccessV2({ originAccess: next });
                      }}
                      className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                    >
                      <option value="" disabled>Sélectionnez</option>
                      <option value="simple">Accès simple</option>
                      <option value="complicated">Accès compliqué</option>
                      <option value="other">Autre</option>
                    </select>
                  ) : null}

                  {(props.originElevator === "other" || originAccessChoice === "other") && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        Décrivez les contraintes d'accès (départ) *
                      </label>
                      <textarea
                        value={props.originAccessDetails || ""}
                        onChange={(e) => {
                          markTouched("originAccessDetails");
                          props.onFieldChange("originAccessDetails", e.target.value);
                        }}
                        rows={3}
                        placeholder={originIsHouse
                          ? "Ex : portail < 2,5 m, portage > 10 m, accès camion compliqué"
                          : "Ex : il faut prévoir de bloquer la rue, impossible de se garer devant"}
                        className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/50 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                      />
                      {(showErrors || touchedFields.has("originAccessDetails")) &&
                        (props.originAccessDetails || "").trim().length < 10 && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Merci de préciser (au moins 10 caractères).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* === ARRIVÉE === */}
        <div className="pt-6 border-t border-[#E3E5E8] space-y-6 md:pt-0 md:border-t-0 md:p-6 md:rounded-2xl md:bg-[#F8F9FA] md:border md:border-[#E3E5E8]">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#6BCFCF]" />
            <h3 className="text-lg font-bold text-[#0F172A]">Arrivée</h3>
          </div>

          <>
              <div onFocusCapture={() => markVisitedUpTo("dest-addr")}>
              <AddressAutocomplete
                label="Adresse d'arrivée *"
                labelSuffix={<BlockBadge blockId="dest-addr" />}
                placeholder="20 place Bellecour, 69002 Lyon"
                inputId="destination-address"
                initialValue={
                  props.destinationAddress ||
                  [props.destinationPostalCode, props.destinationCity]
                    .filter(Boolean)
                    .join(" ")
                }
                onInputChange={(raw) => {
                  props.onFieldChange("destinationAddress", raw);
                  if (props.destinationPostalCode) props.onFieldChange("destinationPostalCode", "");
                  if (props.destinationCity) props.onFieldChange("destinationCity", "");
                  if (props.destinationLat != null) props.onFieldChange("destinationLat", null);
                  if (props.destinationLon != null) props.onFieldChange("destinationLon", null);
                }}
                onSelect={(s) => {
                  markTouched("destinationAddress");
                  props.onFieldChange("destinationAddress", s.addressLine ?? s.label);
                  props.onFieldChange("destinationPostalCode", s.postalCode ?? "");
                  props.onFieldChange("destinationCity", s.city ?? "");
                  props.onFieldChange("destinationLat", s.lat ?? null);
                  props.onFieldChange("destinationLon", s.lon ?? null);
                }}
              />
              {showErrors && props.destinationAddress.trim().length < 5 && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Adresse obligatoire
                </p>
              )}
              {(props.destinationPostalCode || props.destinationCity) && (
                <p className="text-xs text-[#1E293B]/60">
                  {props.destinationPostalCode} {props.destinationCity}
                  {props.destinationLat != null && props.destinationLon != null ? " · coords OK" : " · coords manquantes"}
                </p>
              )}
              </div>

              {/* Type de logement */}
              <div id="destination-housingType" onFocusCapture={() => markVisitedUpTo("dest-housing")}>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-[#0F172A]">Type de logement *</label>
                  <BlockBadge blockId="dest-housing" />
                </div>

                {/* Catégorie */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setHousingCategory("destination", "apartment")}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      destinationIsApartment
                        ? "bg-[#6BCFCF] text-white"
                        : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                    }`}
                  >
                    Appartement
                  </button>
                  <button
                    type="button"
                    onClick={() => setHousingCategory("destination", "house")}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      destinationIsHouse
                        ? "bg-[#6BCFCF] text-white"
                        : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                    }`}
                  >
                    Maison
                  </button>
                  <button
                    type="button"
                    onClick={() => setHousingCategory("destination", "box")}
                    className={`px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                      destinationIsBox
                        ? "bg-[#6BCFCF] text-white"
                        : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                    }`}
                  >
                    Box
                  </button>
                </div>

                {/* Taille (appartement) */}
            {destinationIsApartment && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {HOUSING_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          markTouched("destinationHousingType");
                          props.onFieldChange("destinationHousingType", type.value);
                        }}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          props.destinationHousingType === type.value
                            ? "bg-[#0F172A] text-white"
                            : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}

                {(showErrors || touchedFields.has("destinationHousingType")) &&
                  !props.destinationHousingType && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Type de logement obligatoire
                    </p>
                  )}
              </div>

              {/* Étage + Ascenseur et accès */}
              {(() => {
                const destinationIsBox = props.destinationHousingType === "box";
                const destinationIsApartmentEffective =
                  !destinationIsHouse && !destinationIsBox && !!props.destinationHousingType;
                const destinationFloorNum = Number.parseInt(props.destinationFloor || "0", 10) || 0;
                const showFloor = destinationIsApartmentEffective;
                const showElevatorChoices = destinationIsApartmentEffective && destinationFloorNum > 0;
                const showAccessChoices =
                  destinationIsHouse ||
                  destinationIsBox ||
                  (destinationIsApartmentEffective && destinationFloorNum === 0);
                const destinationAccessChoice = normalizeAccessChoice(props.destinationAccess);

                return (
                  <div className="space-y-3" onFocusCapture={() => markVisitedUpTo("access")}>
                    {showFloor && (
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">Étage</label>
                        <select
                          value={props.destinationFloor}
                          onChange={(e) => {
                            const nextFloor = e.target.value;
                            props.onFieldChange("destinationFloor", nextFloor);
                            if ((Number.parseInt(nextFloor || "0", 10) || 0) === 0) {
                              props.onFieldChange("destinationElevator", "");
                            }
                            syncAccessV2({
                              destinationFloor: nextFloor,
                              destinationElevator:
                                (Number.parseInt(nextFloor || "0", 10) || 0) === 0
                                  ? ""
                                  : props.destinationElevator,
                            });
                          }}
                          className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                        >
                          <option value="" disabled>Sélectionnez</option>
                          {FLOOR_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">Ascenseur et accès</label>

                      {showElevatorChoices ? (
                        <select
                          value={props.destinationElevator}
                          onChange={(e) => {
                            const next = e.target.value;
                            props.onFieldChange("destinationElevator", next);
                            const f = Number.parseInt(props.destinationFloor || "0", 10) || 0;
                            if (next === "no" && f >= 4) props.onFieldChange("destinationFurnitureLift", "yes");
                            else props.onFieldChange("destinationFurnitureLift", "no");
                            syncAccessV2({ destinationElevator: next });
                          }}
                          className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                        >
                          <option value="" disabled>Sélectionnez</option>
                          <option value="yes">Ascenseur &gt; 3 places</option>
                          <option value="small">Petit ascenseur</option>
                          <option value="no">Pas d’ascenseur</option>
                          <option value="other">Autre</option>
                        </select>
                      ) : showAccessChoices ? (
                        <select
                          value={props.destinationAccess}
                          onChange={(e) => {
                            const next = e.target.value;
                            props.onFieldChange("destinationAccess", next);
                            syncAccessV2({ destinationAccess: next });
                          }}
                          className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                        >
                          <option value="" disabled>Sélectionnez</option>
                          <option value="simple">Accès simple</option>
                          <option value="complicated">Accès compliqué</option>
                          <option value="other">Autre</option>
                        </select>
                      ) : null}

                      {(props.destinationElevator === "other" || destinationAccessChoice === "other") && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-[#0F172A] mb-2">
                            Décrivez les contraintes d’accès (arrivée) *
                          </label>
                          <textarea
                            value={props.destinationAccessDetails || ""}
                            onChange={(e) => {
                              markTouched("destinationAccessDetails");
                              props.onFieldChange("destinationAccessDetails", e.target.value);
                            }}
                            rows={3}
                            placeholder={destinationIsHouse
                              ? "Ex : portail < 2,5 m, portage > 10 m, accès camion compliqué"
                              : "Ex : il faut prévoir de bloquer la rue, impossible de se garer devant"}
                            className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/50 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                          />
                          {(showErrors || touchedFields.has("destinationAccessDetails")) &&
                            (props.destinationAccessDetails || "").trim().length < 10 && (
                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              Merci de préciser (au moins 10 caractères).
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
          </>
        </div>

        {/* === DATE === */}
        <div className="pt-6 border-t border-[#E3E5E8] space-y-4 md:pt-0 md:border-t-0 md:p-6 md:rounded-2xl md:bg-[#F8F9FA] md:border md:border-[#E3E5E8]" onFocusCapture={() => markVisitedUpTo("date")}>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#6BCFCF]" />
            <h3 className="text-lg font-bold text-[#0F172A]">Date souhaitée</h3>
            <BlockBadge blockId="date" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">Date de déménagement *</label>
            <DatePickerFr
              id="movingDate"
              value={props.movingDate}
              onChange={(d) => {
                markTouched("movingDate");
                props.onFieldChange("movingDate", d);
              }}
              min={minMovingDate}
              error={(showErrors || touchedFields.has("movingDate")) && !isDateValid}
              defaultOpen={false}
              startPhase="months"
              openOnFieldClick
            />
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E3E5E8] cursor-pointer hover:border-[#6BCFCF] transition-colors">
            <input
              type="checkbox"
              checked={props.dateFlexible}
              onChange={(e) => props.onFieldChange("dateFlexible", e.target.checked)}
              className="w-5 h-5 rounded border-[#E3E5E8] text-[#6BCFCF] focus:ring-2 focus:ring-[#6BCFCF]/20"
            />
            <span className="text-sm text-[#0F172A]">
              Je suis flexible sur la date (±1 semaine)
            </span>
          </label>

          {(showErrors || touchedFields.has("movingDate")) && !isDateValid && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {isMovingDateTooSoon
                ? `Date trop proche — minimum ${MIN_DAYS_AHEAD} jours (à partir du ${minMovingDate})`
                : "Date obligatoire"}
            </p>
          )}
        </div>

        {/* Error message */}
        {props.error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-900">{props.error}</p>
          </div>
        )}

        {/* Validation summary */}
        {showErrors && missingFields.length > 0 && (
          <div className="rounded-xl border border-[#E3E5E8] bg-[#F8F9FA] px-4 py-3 text-sm text-[#0F172A]/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {missingFields.length} champ{missingFields.length > 1 ? "s" : ""} manquant
                {missingFields.length > 1 ? "s" : ""} :
              </span>
              {missingFields.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => focusField(f.id)}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#0F172A]/70 border border-[#E3E5E8] hover:border-[#6BCFCF]"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={props.isSubmitting}
          aria-disabled={props.isSubmitting || !isFormValid}
          onFocus={() => markAllVisited()}
          className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white hover:bg-[#1E293B] transition-all duration-200 ${
            !isFormValid && !props.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          } ${props.isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span>{props.isSubmitting ? "Enregistrement..." : "Compléter mon dossier"}</span>
          {!props.isSubmitting && (
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
        </button>
      </form>
    </div>
  );
}

