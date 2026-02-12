"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Home, Mail, User, Phone, HelpCircle, Check } from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";
import { DatePickerFr } from "@/components/tunnel/DatePickerFr";
import { PriceRangeInline } from "@/components/tunnel/PriceRangeInline";

type QuestionKey = "narrow_access" | "long_carry" | "difficult_parking" | "lift_required";

interface StepAccessLogisticsV2Props {
  // addresses / logement
  originAddress: string;
  originPostalCode: string;
  originCity: string;
  originCountryCode?: string;
  originLat?: number | null;
  originLon?: number | null;
  originHousingType: string;
  originFloor: string;
  destinationAddress: string;
  destinationPostalCode: string;
  destinationCity: string;
  destinationCountryCode?: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  destinationUnknown?: boolean;
  destinationHousingType: string;
  destinationFloor: string;
  // Volume
  density: "" | "light" | "normal" | "dense";
  kitchenIncluded: "" | "none" | "appliances" | "full";
  kitchenApplianceCount: string;
  movingDate: string;
  dateFlexible: boolean;
  routeDistanceKm?: number | null;
  routeDistanceProvider?: "osrm" | "fallback" | null;
  pricingCart?: {
    firstEstimateMinEur: number | null;
    firstEstimateMaxEur: number | null;
    firstEstimateCenterEur: number | null;
    refinedMinEur: number | null;
    refinedMaxEur: number | null;
    refinedCenterEur: number | null;
    lines: Array<{
      key: "distance" | "density" | "kitchen" | "date" | "access";
      label: string;
      status: string;
      amountEur: number;
      confirmed?: boolean;
    }>;
    formuleLabel?: string;
  };
  onFieldChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  showValidation?: boolean;
  access_type: "simple" | "constrained";
  narrow_access: boolean;
  long_carry: boolean;
  difficult_parking: boolean;
  lift_required: boolean;
  access_details: string;
  // Contact (déplacé en fin de step 3, email obligatoire)
  firstName: string;
  email: string;
  phone: string;
  // Formule (déplacée depuis Step 2)
  selectedFormule: "ECONOMIQUE" | "STANDARD" | "PREMIUM";
  onFormuleChange: (v: "ECONOMIQUE" | "STANDARD" | "PREMIUM") => void;
  pricingByFormule?: {
    ECONOMIQUE: { priceMin: number; priceMax: number };
    STANDARD: { priceMin: number; priceMax: number };
    PREMIUM: { priceMin: number; priceMax: number };
  } | null;
  // Services en plus (mappés sur les mêmes champs que V1)
  serviceFurnitureStorage: boolean;
  serviceCleaning: boolean;
  serviceFullPacking: boolean;
  serviceFurnitureAssembly: boolean;
  serviceInsurance: boolean;
  serviceWasteRemoval: boolean;
  serviceHelpWithoutTruck: boolean;
  serviceSpecificSchedule: boolean;
  specificNotes: string;
}

const questions: Array<{ key: QuestionKey; label: string }> = [
  { key: "narrow_access", label: "Petit ascenseur / passages étroits ?" },
  { key: "long_carry", label: "Portage > 10 m ?" },
  { key: "difficult_parking", label: "Stationnement compliqué ?" },
  { key: "lift_required", label: "Besoin d’un monte-meuble ?" },
];

const SERVICE_LABELS: Array<{ key: keyof StepAccessLogisticsV2Props; label: string }> = [
  { key: "serviceFurnitureStorage", label: "Garde-meuble" },
  { key: "serviceCleaning", label: "Nettoyage / débarras" },
  { key: "serviceFullPacking", label: "Emballage complet" },
  { key: "serviceFurnitureAssembly", label: "Montage meubles neufs" },
  { key: "serviceInsurance", label: "Assurance renforcée" },
  { key: "serviceWasteRemoval", label: "Évacuation déchets" },
  { key: "serviceHelpWithoutTruck", label: "Aide sans camion" },
  { key: "serviceSpecificSchedule", label: "Horaires spécifiques" },
];

export function StepAccessLogisticsV2(props: StepAccessLogisticsV2Props) {
  const [showOptions, setShowOptions] = useState(false);
  const minMovingDate = useMemo(() => {
    // Bloquer historique + 15 prochains jours (min = aujourd'hui + 15 jours)
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0]!;
  }, []);

  const isApartment = (t: string) => (t || "").trim() !== "house";
  const FLOOR_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "0", label: "RDC" },
    { value: "1", label: "1er" },
    { value: "2", label: "2e" },
    { value: "3", label: "3e" },
    { value: "4", label: "4e ou +" },
  ];
  const showValidation = !!props.showValidation;
  const isOriginAddressValid = (props.originAddress || "").trim().length >= 5;
  const isDestinationAddressValid = (props.destinationAddress || "").trim().length >= 5;
  const isFirstNameValid = (props.firstName || "").trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((props.email || "").trim());
  const isMovingDateValid = !!props.movingDate && props.movingDate >= minMovingDate;
  const isRouteDistanceValid =
    typeof props.routeDistanceKm === "number" &&
    Number.isFinite(props.routeDistanceKm) &&
    props.routeDistanceKm > 0 &&
    props.routeDistanceProvider === "osrm";
  const isKitchenValid =
    props.kitchenIncluded !== "appliances" ||
    (Number.parseInt(String(props.kitchenApplianceCount || "").trim(), 10) || 0) >= 1;

  const cart = props.pricingCart;
  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const answered = useMemo(
    () => ({
      narrow_access: props.narrow_access,
      long_carry: props.long_carry,
      difficult_parking: props.difficult_parking,
      lift_required: props.lift_required,
    }),
    [props.narrow_access, props.long_carry, props.difficult_parking, props.lift_required]
  );

  // Par défaut sur Step 3 : on pré-sélectionne "Maison" (simple, non ambigu).
  // Important: on ne met PAS de default plus tôt (Step 1/2) pour ne pas impacter l'estimation.
  useEffect(() => {
    if (!(props.originHousingType || "").trim()) props.onFieldChange("originHousingType", "house");
    if (!(props.destinationHousingType || "").trim())
      props.onFieldChange("destinationHousingType", "house");
    if (!(props.originFloor || "").trim()) props.onFieldChange("originFloor", "0");
    if (!(props.destinationFloor || "").trim()) props.onFieldChange("destinationFloor", "0");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const HousingInline = (p: { side: "origin" | "destination" }) => {
    const isOrigin = p.side === "origin";
    const housingType = isOrigin ? props.originHousingType : props.destinationHousingType;
    const floor = isOrigin ? props.originFloor : props.destinationFloor;

    const setHousingType = (v: "house" | "t2") => {
      if (isOrigin) {
        props.onFieldChange("originHousingType", v);
        if (v === "house") props.onFieldChange("originFloor", "0");
      } else {
        props.onFieldChange("destinationHousingType", v);
        if (v === "house") props.onFieldChange("destinationFloor", "0");
      }
    };
    const setFloor = (v: string) => {
      if (isOrigin) props.onFieldChange("originFloor", v);
      else props.onFieldChange("destinationFloor", v);
    };

    return (
      <div className="mt-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Ligne logement (toujours visible) */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#0F172A]">Logement</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHousingType("house")}
                style={{
                  background: !isApartment(housingType) ? "var(--color-text)" : "var(--color-surface)",
                  color: !isApartment(housingType) ? "#FFFFFF" : "var(--color-text)",
                  border: !isApartment(housingType) ? "none" : "2px solid var(--color-border)",
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                Maison
              </button>
              <button
                type="button"
                onClick={() => setHousingType("t2")}
                style={{
                  background: isApartment(housingType) ? "var(--color-text)" : "var(--color-surface)",
                  color: isApartment(housingType) ? "#FFFFFF" : "var(--color-text)",
                  border: isApartment(housingType) ? "none" : "2px solid var(--color-border)",
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                Appartement
              </button>
            </div>
          </div>

          {/* Ligne étage (uniquement si appartement) */}
          {isApartment(housingType) && (
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs font-semibold text-[#1E293B]/60 uppercase tracking-[0.12em]">
                Étage
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {FLOOR_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setFloor(o.value)}
                    className={[
                      "px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all",
                      floor === o.value
                        ? "bg-[#6BCFCF] text-white"
                        : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]",
                    ].join(" ")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleAccessType = (value: "simple" | "constrained") => {
    props.onFieldChange("access_type", value);
    if (value === "simple") {
      props.onFieldChange("narrow_access", false);
      props.onFieldChange("long_carry", false);
      props.onFieldChange("difficult_parking", false);
      props.onFieldChange("lift_required", false);
      props.onFieldChange("access_details", "");
    }
  };

  const ACCESS_SIDES_MARKER = "__accessSidesV1=";
  type AccessSidesState = Record<QuestionKey, { origin: boolean; destination: boolean }>;

    const splitAccessDetails = (raw: string): { userText: string; markerJson: string | null } => {
    const s = String(raw || "");
    const re = new RegExp(`\\n?\\n?${ACCESS_SIDES_MARKER}([^\\n]*)\\s*$`);
    const m = s.match(re);
    if (!m) return { userText: s, markerJson: null };
    return { userText: s.replace(re, ""), markerJson: (m[1] ?? "").trim() || null };
  };

  const destinationUnknown = !!props.destinationUnknown;

  const parseAccessSides = (): AccessSidesState => {
    const blank: AccessSidesState = {
      narrow_access: { origin: false, destination: false },
      long_carry: { origin: false, destination: false },
      difficult_parking: { origin: false, destination: false },
      lift_required: { origin: false, destination: false },
    };

    const { markerJson } = splitAccessDetails(props.access_details ?? "");
    if (markerJson) {
      try {
        const parsed = JSON.parse(markerJson) as any;
        const next = { ...blank };
        (Object.keys(blank) as QuestionKey[]).forEach((k) => {
          const v = parsed?.[k];
          next[k] = {
            origin: Boolean(v?.origin),
            destination: Boolean(v?.destination) && !destinationUnknown,
          };
        });
        return next;
      } catch {
        // ignore
      }
    }

    // Fallback: ancien modèle (un bool global) => on l'affiche sur les 2 colonnes.
    const next = { ...blank };
    (Object.keys(blank) as QuestionKey[]).forEach((k) => {
      const on = Boolean((answered as any)[k]);
      next[k] = { origin: on, destination: on && !destinationUnknown };
    });
    return next;
  };

  const serializeAccessDetails = (userText: string, sides: AccessSidesState): string => {
    const cleanUserText = String(userText || "").replace(/\s+$/g, "");
    return `${cleanUserText}${cleanUserText ? "\n\n" : ""}${ACCESS_SIDES_MARKER}${JSON.stringify(
      sides
    )}`;
  };

  const setAccessSides = (sides: AccessSidesState) => {
    const { userText } = splitAccessDetails(props.access_details ?? "");
    props.onFieldChange("access_details", serializeAccessDetails(userText, sides));
  };

  const setUserAccessDetailsText = (userText: string) => {
    const currentSides = parseAccessSides();
    props.onFieldChange("access_details", serializeAccessDetails(userText, currentSides));
  };

  const toggleSide = (key: QuestionKey, side: "origin" | "destination") => {
    if (side === "destination" && destinationUnknown) return;
    const current = parseAccessSides();
    const next: AccessSidesState = {
      ...current,
      [key]: {
        ...current[key],
        [side]: !current[key][side],
      },
    };
    if (destinationUnknown) {
      next[key].destination = false;
    }
    setAccessSides(next);
    props.onFieldChange(key, Boolean(next[key].origin || next[key].destination));
  };

  const userAccessDetailsText = useMemo(() => {
    const { userText } = splitAccessDetails(props.access_details ?? "");
    return userText;
  }, [props.access_details]);

  const YesNo = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          !value
            ? "bg-[#6BCFCF] text-white"
            : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]"
        }`}
      >
        Non
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          value ? "bg-[#6BCFCF] text-white" : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]"
        }`}
      >
        Oui
      </button>
    </div>
  );

  const ToggleYes = (p: {
    active: boolean;
    disabled?: boolean;
    onToggle: () => void;
    ariaLabel: string;
  }) => (
    <button
      type="button"
      disabled={!!p.disabled}
      aria-label={p.ariaLabel}
      onClick={() => {
        if (p.disabled) return;
        p.onToggle();
      }}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
        p.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        p.active
          ? "bg-[#6BCFCF] text-white"
          : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]",
      ].join(" ")}
    >
      <span>Oui</span>
      {p.active && <Check className="w-4 h-4" />}
    </button>
  );

  const isHousingConfirmed =
    (props.originHousingType || "").trim().length > 0 &&
    (props.destinationHousingType || "").trim().length > 0 &&
    (!isApartment(props.originHousingType) || (props.originFloor || "").trim().length > 0) &&
    (!isApartment(props.destinationHousingType) || (props.destinationFloor || "").trim().length > 0);

  const hasAnyOptionalService =
    Boolean(props.serviceFurnitureStorage) ||
    Boolean(props.serviceCleaning) ||
    Boolean(props.serviceFullPacking) ||
    Boolean(props.serviceFurnitureAssembly) ||
    Boolean(props.serviceInsurance) ||
    Boolean(props.serviceWasteRemoval) ||
    Boolean(props.serviceHelpWithoutTruck) ||
    Boolean(props.serviceSpecificSchedule) ||
    Boolean((props.specificNotes || "").trim());

  return (
    <div className="relative">
      {/* Le formulaire garde toute sa largeur; le panier flotte à droite sans "réserver" de place */}
      <div className="space-y-6 sm:space-y-8">
      {/* Addresses + date minimal */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#0F172A]">Votre trajet</p>
        </div>
        {/* Adresses regroupées (départ + arrivée) */}
        <div className="rounded-xl sm:rounded-2xl bg-white sm:bg-white/70 sm:backdrop-blur-xl border border-gray-100 sm:border-white/30 p-6 sm:p-8 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)] transition-all duration-500">
          <p className="text-sm font-semibold text-[#0F172A]">Adresses</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AddressAutocomplete
              label={
                props.originCity
                  ? `Départ · ${props.originCity}${
                      props.originPostalCode ? ` (${props.originPostalCode})` : ""
                    }`
                  : "Adresse de départ"
              }
              placeholder={
                props.originCity ? `Ex: 10 rue de la République` : "Ex: 10 rue de la République, Paris"
              }
              inputId="v2-origin-address"
              initialValue={props.originAddress || ""}
              required
              contextPostalCode={props.originPostalCode || undefined}
              contextCity={props.originCity || undefined}
              contextCountryCode={(props.originCountryCode || "").trim() || undefined}
              validated={props.originLat != null && props.originLon != null}
              errorMessage={showValidation && !isOriginAddressValid ? "Adresse de départ requise" : null}
              onInputChange={(raw) => {
                props.onFieldChange("originAddress", raw);
              }}
              onSelect={(s) => {
                props.onFieldChange("originAddress", s.addressLine ?? s.label ?? "");
                props.onFieldChange("originCity", s.city ?? "");
                props.onFieldChange("originPostalCode", s.postalCode ?? "");
                props.onFieldChange("originCountryCode", (s.countryCode ?? "fr").toLowerCase());
                props.onFieldChange("originLat", s.lat ?? null);
                props.onFieldChange("originLon", s.lon ?? null);
              }}
            />

            <AddressAutocomplete
              label={
                props.destinationCity
                  ? `Arrivée · ${props.destinationCity}${
                      props.destinationPostalCode ? ` (${props.destinationPostalCode})` : ""
                    }`
                  : "Adresse d’arrivée"
              }
              placeholder={
                props.destinationCity
                  ? `Ex: 20 avenue de la Gare`
                  : "Ex: 20 avenue de la Gare, Lyon"
              }
              inputId="v2-destination-address"
              initialValue={props.destinationAddress || ""}
              required
              contextPostalCode={props.destinationPostalCode || undefined}
              contextCity={props.destinationCity || undefined}
              contextCountryCode={(props.destinationCountryCode || "").trim() || undefined}
              validated={props.destinationLat != null && props.destinationLon != null}
              errorMessage={
                showValidation && !isDestinationAddressValid ? "Adresse d’arrivée requise" : null
              }
              onInputChange={(raw) => {
                props.onFieldChange("destinationAddress", raw);
              }}
              onSelect={(s) => {
                props.onFieldChange("destinationAddress", s.addressLine ?? s.label ?? "");
                props.onFieldChange("destinationCity", s.city ?? "");
                props.onFieldChange("destinationPostalCode", s.postalCode ?? "");
                props.onFieldChange("destinationCountryCode", (s.countryCode ?? "fr").toLowerCase());
                props.onFieldChange("destinationLat", s.lat ?? null);
                props.onFieldChange("destinationLon", s.lon ?? null);
              }}
            />
          </div>

          <div className="mt-3 text-xs text-[#1E293B]/60">
            <span className="font-semibold">Distance entre les adresses :</span>{" "}
            {isRouteDistanceValid ? (
              <>
                {Math.round(props.routeDistanceKm!)} km (OSRM)
              </>
            ) : (
              <>calcul en cours…</>
            )}
          </div>
          {showValidation && !isRouteDistanceValid && (
            <p className="mt-2 text-sm font-medium text-[#EF4444]">
              Distance route requise (merci de sélectionner des adresses valides)
            </p>
          )}
        </div>

        {/* Logement + options (rattachés au départ) */}
        <HousingInline side="origin" />

        {/* Densité + Cuisine (rattachés au logement de départ) */}
        <div className="space-y-4">
          {/* Densité (volume) */}
          <div className="space-y-2 rounded-xl sm:rounded-2xl bg-white sm:bg-white/70 sm:backdrop-blur-xl border border-gray-100 sm:border-white/30 p-6 sm:p-8 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)] transition-all duration-500">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[#0F172A]">Densité</p>
              {props.density === "" && (
                <p className="text-[11px] font-semibold text-[#1E293B]/50">
                  Par défaut : très meublé
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => props.onFieldChange("density", "light")}
                className={[
                  "h-full rounded-xl sm:rounded-2xl border-2 px-5 py-3 sm:px-8 sm:py-5 text-left transition-all duration-300",
                  props.density === "light"
                    ? "border-[#6BCFCF] bg-[#6BCFCF]/10 shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)] ring-2 ring-[#6BCFCF]/30"
                    : "border-gray-200 bg-white hover:border-[#6BCFCF] hover:shadow-sm sm:hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)] sm:hover:scale-[1.02]",
                ].join(" ")}
              >
                <div className={`text-base font-bold ${props.density === "light" ? "text-[#0F172A]" : "text-[#0F172A]"}`}>Peu meublé</div>
                <div className={`mt-1 text-sm ${props.density === "light" ? "text-[#64748B]" : "text-[#64748B]"}`}>
                  Peu de meubles, peu d'objets
                </div>
              </button>

              <button
                type="button"
                onClick={() => props.onFieldChange("density", "normal")}
                className={[
                  "h-full rounded-xl sm:rounded-2xl border-2 px-5 py-3 sm:px-8 sm:py-5 text-left transition-all duration-300",
                  props.density === "normal"
                    ? "border-[#6BCFCF] bg-[#6BCFCF]/10 shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)] ring-2 ring-[#6BCFCF]/30"
                    : "border-gray-200 bg-white hover:border-[#6BCFCF] hover:shadow-sm sm:hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)] sm:hover:scale-[1.02]",
                ].join(" ")}
              >
                <div className={`text-base font-bold ${props.density === "normal" ? "text-[#0F172A]" : "text-[#0F172A]"}`}>Normal</div>
                <div className={`mt-1 text-sm ${props.density === "normal" ? "text-[#64748B]" : "text-[#64748B]"}`}>
                  Logement "classique"
                </div>
              </button>

              <button
                type="button"
                onClick={() => props.onFieldChange("density", "dense")}
                className={[
                  "h-full rounded-xl sm:rounded-2xl border-2 px-5 py-3 sm:px-8 sm:py-5 text-left transition-all duration-300",
                  props.density === "dense"
                    ? "border-[#6BCFCF] bg-[#6BCFCF]/10 shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)] ring-2 ring-[#6BCFCF]/30"
                    : "border-gray-200 bg-white hover:border-[#6BCFCF] hover:shadow-sm sm:hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)] sm:hover:scale-[1.02]",
                ].join(" ")}
              >
                <div className={`text-base font-bold ${props.density === "dense" ? "text-[#0F172A]" : "text-[#0F172A]"}`}>Très meublé</div>
                <div className={`mt-1 text-sm ${props.density === "dense" ? "text-[#64748B]" : "text-[#64748B]"}`}>
                  Beaucoup d'affaires
                </div>
              </button>
            </div>
          </div>

          {/* Cuisine / équipements */}
          <div className="space-y-2 rounded-xl sm:rounded-2xl bg-white sm:bg-white/70 sm:backdrop-blur-xl border border-gray-100 sm:border-white/30 p-6 sm:p-8 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)] transition-all duration-500">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[#0F172A]">Cuisine</p>
              {props.kitchenIncluded === "" && (
                <p className="text-[11px] font-semibold text-[#1E293B]/50">
                  Par défaut : 3 équipements
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  props.onFieldChange("kitchenIncluded", "none");
                  props.onFieldChange("kitchenApplianceCount", "");
                }}
                className={[
                  "h-full rounded-xl sm:rounded-2xl border-2 px-5 py-3 sm:px-8 sm:py-5 text-left transition-all duration-300",
                  props.kitchenIncluded === "none"
                    ? "border-[#6BCFCF] bg-[#6BCFCF]/10 shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)] ring-2 ring-[#6BCFCF]/30"
                    : "border-gray-200 bg-white hover:border-[#6BCFCF] hover:shadow-sm sm:hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)] sm:hover:scale-[1.02]",
                ].join(" ")}
              >
                <div className={`text-base font-bold ${props.kitchenIncluded === "none" ? "text-[#0F172A]" : "text-[#0F172A]"}`}>Rien</div>
                <div className={`mt-1 text-sm ${props.kitchenIncluded === "none" ? "text-[#64748B]" : "text-[#64748B]"}`}>Aucun élément</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  props.onFieldChange("kitchenIncluded", "appliances");
                  if (!(props.kitchenApplianceCount || "").trim()) {
                    props.onFieldChange("kitchenApplianceCount", "3");
                  }
                }}
                className={[
                  "h-full rounded-xl sm:rounded-2xl border-2 px-5 py-3 sm:px-8 sm:py-5 text-left transition-all duration-300",
                  props.kitchenIncluded === "appliances"
                    ? "border-[#6BCFCF] bg-[#6BCFCF]/10 shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)] ring-2 ring-[#6BCFCF]/30"
                    : "border-gray-200 bg-white hover:border-[#6BCFCF] hover:shadow-sm sm:hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)] sm:hover:scale-[1.02]",
                ].join(" ")}
              >
                <div className={`text-base font-bold ${props.kitchenIncluded === "appliances" ? "text-[#0F172A]" : "text-[#0F172A]"}`}>Électroménager</div>
                <div className={`mt-1 text-sm ${props.kitchenIncluded === "appliances" ? "text-[#64748B]" : "text-[#64748B]"}`}>0,6 m³ / équipement</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  props.onFieldChange("kitchenIncluded", "full");
                  props.onFieldChange("kitchenApplianceCount", "");
                }}
                className={[
                  "h-full rounded-xl sm:rounded-2xl border-2 px-5 py-3 sm:px-8 sm:py-5 text-left transition-all duration-300",
                  props.kitchenIncluded === "full"
                    ? "border-[#6BCFCF] bg-[#6BCFCF]/10 shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)] ring-2 ring-[#6BCFCF]/30"
                    : "border-gray-200 bg-white hover:border-[#6BCFCF] hover:shadow-sm sm:hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)] sm:hover:scale-[1.02]",
                ].join(" ")}
              >
                <div className={`text-base font-bold ${props.kitchenIncluded === "full" ? "text-[#0F172A]" : "text-[#0F172A]"}`}>Complète</div>
                <div className={`mt-1 text-sm ${props.kitchenIncluded === "full" ? "text-[#64748B]" : "text-[#64748B]"}`}>+6 m³</div>
              </button>
            </div>

            {props.kitchenIncluded === "appliances" && (
              <div className="mt-2 sm:flex sm:items-end sm:gap-3">
                <label className="block text-xs font-semibold text-[#1E293B]/70 mb-2 sm:mb-0 sm:flex-1">
                  Nombre d’équipements (réfrigérateur, lave-linge, four, etc.)
                </label>
                <div className="sm:w-40">
                  <input
                    id="v2-kitchen-appliance-count"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    type="number"
                    min={1}
                    max={30}
                    value={props.kitchenApplianceCount}
                    onChange={(e) => props.onFieldChange("kitchenApplianceCount", e.target.value)}
                    className={[
                      "w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-[#0F172A] transition-all",
                      showValidation && !isKitchenValid
                        ? "border-[#EF4444] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/15 focus:ring-offset-2"
                        : "border-gray-200 bg-white/90 py-4 text-base focus:border-[#6BCFCF] focus:outline-none focus:ring-4 focus:ring-[#6BCFCF]/20 focus:bg-white focus:shadow-[0_0_0_4px_rgba(107,207,207,0.1)]",
                    ].join(" ")}
                    placeholder="Ex: 3"
                  />
                </div>
                {showValidation && !isKitchenValid && (
                  <p className="mt-2 text-sm font-medium text-[#EF4444] sm:mt-0">
                    (min. 1)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <HousingInline side="destination" />

      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6]/10 to-[#A78BFA]/10 shadow-sm flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#8B5CF6]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#0F172A]">Date souhaitée</p>
        </div>
        <DatePickerFr
          id="v2-moving-date"
          value={props.movingDate}
          onChange={(v) => props.onFieldChange("movingDate", v)}
          min={minMovingDate}
          error={showValidation && !isMovingDateValid}
        />
        {showValidation && !isMovingDateValid && (
          <p className="text-sm font-medium text-[#EF4444]">
            Date requise (au moins J+15)
          </p>
        )}
        <label className="flex items-center gap-2 text-sm text-[#0F172A]">
          <input
            type="checkbox"
            checked={props.dateFlexible}
            onChange={(e) => props.onFieldChange("dateFlexible", e.target.checked)}
          />
          Je suis flexible (±1 semaine)
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/10 to-[#34D399]/10 shadow-sm flex items-center justify-center">
            <Home className="w-5 h-5 text-[#10B981]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#0F172A]">Accès départ & arrivée</p>
        </div>

        <div className="space-y-2 rounded-xl sm:rounded-2xl bg-white sm:bg-white/70 sm:backdrop-blur-xl border border-gray-100 sm:border-white/30 p-6 sm:p-8 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)] transition-all duration-500">
          <p className="text-base font-semibold text-[#0F172A]">
            Les accès départ & arrivée sont-ils simples ?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleAccessType("simple")}
              className={`px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 ${
                props.access_type === "simple"
                  ? "bg-[#6BCFCF]/10 border-2 border-[#6BCFCF] text-[#0F172A] shadow-lg ring-2 ring-[#6BCFCF]/30"
                  : "border-2 border-gray-200 bg-white text-[#0F172A] hover:border-[#6BCFCF] hover:shadow-md hover:scale-[1.02]"
              }`}
            >
              Oui, accès simple
            </button>
            <button
              type="button"
              onClick={() => handleAccessType("constrained")}
              className={`px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 ${
                props.access_type === "constrained"
                  ? "bg-[#6BCFCF]/10 border-2 border-[#6BCFCF] text-[#0F172A] shadow-lg ring-2 ring-[#6BCFCF]/30"
                  : "border-2 border-gray-200 bg-white text-[#0F172A] hover:border-[#6BCFCF] hover:shadow-md hover:scale-[1.02]"
              }`}
            >
              Non, accès contraint
            </button>
          </div>
          <p className="text-sm text-[#1E293B]/70">
            Par défaut, l’accès est considéré comme simple.
            <br />
            Départ et arrivée peuvent être différents : si l’un des deux est contraint, choisissez “accès contraint”.
            <br />
            Nous vous posons des questions uniquement si ce n’est pas le cas.
          </p>
        </div>

        {props.access_type === "constrained" && (
          <div className="space-y-3">
            {/* Contraintes départ / arrivée — tableau desktop, cards mobile */}

            {/* ── Desktop : tableau classique (≥ sm) ── */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-[#E3E5E8] bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-[1fr,120px,120px] bg-[#F8F9FA]">
                <div className="px-3 py-2 text-xs font-semibold text-[#0F172A]/70">Contraintes</div>
                <div className="px-3 py-2 text-xs font-semibold text-[#0F172A]/70 text-center">Départ</div>
                <div className="px-3 py-2 text-xs font-semibold text-[#0F172A]/70 text-center">Arrivée</div>
              </div>
              {questions.map((q) => {
                const sides = parseAccessSides()[q.key];
                const destDisabled = destinationUnknown;
                return (
                  <div
                    key={q.key}
                    className="grid grid-cols-[1fr,120px,120px] items-center border-t border-[#E3E5E8]"
                  >
                    <div className="px-3 py-3 text-sm font-medium text-[#0F172A]">{q.label}</div>
                    <div className="px-3 py-2 flex justify-center">
                      <ToggleYes
                        active={Boolean(sides?.origin)}
                        onToggle={() => toggleSide(q.key, "origin")}
                        ariaLabel={`Départ: ${q.label}`}
                      />
                    </div>
                    <div className="px-3 py-2 flex justify-center">
                      <ToggleYes
                        active={Boolean(sides?.destination)}
                        disabled={destDisabled}
                        onToggle={() => toggleSide(q.key, "destination")}
                        ariaLabel={`Arrivée: ${q.label}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Mobile : layout vertical par contrainte (< sm) ── */}
            <div className="sm:hidden space-y-2">
              {questions.map((q) => {
                const sides = parseAccessSides()[q.key];
                const destDisabled = destinationUnknown;
                return (
                  <div key={q.key} className="rounded-xl border border-[#E3E5E8] bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-3 space-y-2">
                    <p className="text-sm font-medium text-[#0F172A]">{q.label}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#1E293B]/60">Départ</span>
                        <ToggleYes
                          active={Boolean(sides?.origin)}
                          onToggle={() => toggleSide(q.key, "origin")}
                          ariaLabel={`Départ: ${q.label}`}
                        />
                      </div>
                      <div className="w-px h-8 bg-[#E3E5E8]" />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#1E293B]/60">Arrivée</span>
                        <ToggleYes
                          active={Boolean(sides?.destination)}
                          disabled={destDisabled}
                          onToggle={() => toggleSide(q.key, "destination")}
                          ariaLabel={`Arrivée: ${q.label}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {props.access_type === "constrained" && (
          <div>
            <textarea
              value={userAccessDetailsText ?? ""}
              onChange={(e) => setUserAccessDetailsText(e.target.value)}
              placeholder="Ex : arrivée uniquement (rue étroite), départ simple…"
              className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-sm"
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Options facultatives (services en plus) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="w-full flex items-center justify-between rounded-2xl border border-[#E3E5E8] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A]"
        >
          <span>Options supplémentaires (facultatif)</span>
          <span className="text-xs text-[#1E293B]/60">{showOptions ? "Masquer" : "Personnaliser"}</span>
        </button>

        {showOptions && (
          <div className="space-y-4 rounded-xl sm:rounded-2xl bg-white sm:bg-white/70 sm:backdrop-blur-xl border border-gray-100 sm:border-white/30 p-6 sm:p-8 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)] transition-all duration-500">
            <div className="space-y-3">
              {SERVICE_LABELS.map(({ key, label }) => {
                const value = props[key] as boolean;
                return (
                  <div key={String(key)} className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-[#0F172A]">{label}</p>
                    <YesNo
                      value={!!value}
                      onChange={(v) => props.onFieldChange(key as string, v)}
                    />
                  </div>
                );
              })}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">Précisions</p>
              <textarea
                value={props.specificNotes}
                onChange={(e) => props.onFieldChange("specificNotes", e.target.value)}
                placeholder="Ex : besoin d'emballage complet, objets fragiles, contraintes particulières..."
                rows={3}
                className="mt-2 w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-sm text-[#0F172A]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Choix formule (déplacé depuis Step 2) */}
      {props.pricingByFormule && (
        <div className="space-y-4">
          <p className="text-base font-bold text-[#0F172A]">Votre formule</p>
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 sm:snap-none -mx-6 px-6 sm:mx-0 sm:px-0">
            {([
              {
                id: "ECONOMIQUE" as const,
                label: "Éco",
                recommended: false,
                bullets: ["Transport uniquement", "Vous emballez", "Idéal budget serré"],
              },
              {
                id: "STANDARD" as const,
                label: "Standard",
                recommended: true,
                bullets: ["Transport + aide", "Emballage basique", "Le plus populaire"],
              },
              {
                id: "PREMIUM" as const,
                label: "Premium",
                recommended: false,
                bullets: ["Tout inclus", "Emballage complet", "Clé en main"],
              },
            ] as const).map((f) => {
              const price = props.pricingByFormule![f.id];
              const selected = props.selectedFormule === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => props.onFormuleChange(f.id)}
                  className={`w-[280px] flex-shrink-0 snap-start rounded-2xl border-2 p-6 text-left transition-all duration-300 sm:w-full sm:flex-shrink sm:snap-none ${
                    selected
                      ? "border-[#6BCFCF] bg-gradient-to-br from-[#6BCFCF]/10 via-white/50 to-[#A78BFA]/5 shadow-lg shadow-[#6BCFCF]/20 ring-2 ring-[#6BCFCF]/30 sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)]"
                      : "border-gray-200 bg-white shadow-md hover:border-[#6BCFCF] hover:shadow-lg hover:shadow-[#6BCFCF]/15 sm:hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)] sm:hover:scale-[1.02]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xl sm:text-2xl font-black text-[#0F172A]">{f.label}</p>
                    {f.recommended && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6BCFCF]/15 to-[#A78BFA]/15 border border-[#A78BFA]/40 px-2.5 py-1 shadow-sm">
                        <span className="text-[#A78BFA] text-[10px] font-bold uppercase tracking-wide">
                          ✨ Top
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-3 mb-4">
                    <PriceRangeInline
                      minEur={price?.priceMin ?? null}
                      maxEur={price?.priceMax ?? null}
                      variant="compact"
                    />
                  </div>
                  <ul className="space-y-2 text-sm text-[#1E293B]/80">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <span className="text-[#6BCFCF] font-bold mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Contact (email obligatoire) */}
      <div className="space-y-3">
        <div className="rounded-xl sm:rounded-2xl bg-white sm:bg-white/70 sm:backdrop-blur-xl border border-gray-100 sm:border-white/30 p-6 sm:p-8 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)] transition-all duration-500 space-y-3">
          <p className="text-sm font-semibold text-[#0F172A]">Où recevoir vos devis ?</p>
          <p className="text-sm text-[#1E293B]/70">
            Dernière étape ensuite : vous envoyez vos photos pour recevoir vos devis.
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm flex items-center justify-center">
                  <User className="w-4 h-4 text-[#6BCFCF]" strokeWidth={2} />
                </div>
                Prénom (obligatoire)
              </label>
              <input
                id="v2-contact-firstName"
                type="text"
                value={props.firstName}
                onChange={(e) => props.onFieldChange("firstName", e.target.value)}
                className={[
                  "w-full rounded-xl border-2 px-4 py-3 text-base transition-all",
                  showValidation && !isFirstNameValid
                    ? "border-[#EF4444] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/15 focus:ring-offset-2"
                    : "border-gray-200 bg-white/90 py-4 text-base focus:border-[#6BCFCF] focus:outline-none focus:ring-4 focus:ring-[#6BCFCF]/20 focus:bg-white focus:shadow-[0_0_0_4px_rgba(107,207,207,0.1)]",
                ].join(" ")}
                placeholder="Votre prénom"
                required
              />
              {showValidation && !isFirstNameValid && (
                <p className="text-sm font-medium text-[#EF4444]">Prénom requis</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[#6BCFCF]" strokeWidth={2} />
                </div>
                Email (obligatoire)
              </label>
              <input
                id="v2-contact-email"
                type="email"
                value={props.email}
                onChange={(e) => props.onFieldChange("email", e.target.value)}
                className={[
                  "w-full rounded-xl border-2 px-4 py-3 text-base transition-all",
                  showValidation && !isEmailValid
                    ? "border-[#EF4444] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/15 focus:ring-offset-2"
                    : "border-gray-200 bg-white/90 py-4 text-base focus:border-[#6BCFCF] focus:outline-none focus:ring-4 focus:ring-[#6BCFCF]/20 focus:bg-white focus:shadow-[0_0_0_4px_rgba(107,207,207,0.1)]",
                ].join(" ")}
                placeholder="vous@email.fr"
                required
              />
              {showValidation && !isEmailValid && (
                <p className="text-sm font-medium text-[#EF4444]">Email requis</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm flex items-center justify-center">
                  <Phone className="w-4 h-4 text-[#6BCFCF]" strokeWidth={2} />
                </div>
                Téléphone (optionnel)
              </label>
              <input
                type="tel"
                value={props.phone}
                onChange={(e) => props.onFieldChange("phone", e.target.value)}
                className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-base"
                placeholder="+33 6..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Spacer mobile pour compenser le CTA sticky — masqué en desktop */}
      <div className="pb-[env(safe-area-inset-bottom,8rem)] lg:pb-0" />

      {/* Mobile only: sticky budget bar (masqué quand sidebar desktop visible) */}
      <div className="lg:hidden fixed left-0 right-0 bottom-20 bg-gradient-to-b from-transparent to-white/95 backdrop-blur pt-3 pb-1 px-4 z-20">
        <div className="rounded-xl border border-[#E3E5E8] bg-white/90 backdrop-blur px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60">
              Budget affiné
            </p>
            <p className="text-xl font-black text-[#0F172A] tabular-nums">
              {typeof cart?.refinedCenterEur === "number" ? fmtEur(cart.refinedCenterEur) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* CTA sticky mobile / static desktop */}
      <div className="lg:static fixed left-0 right-0 bottom-0 bg-white/95 backdrop-blur px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:px-0 lg:py-0 lg:pb-0 lg:bg-transparent lg:backdrop-blur-none z-30">
        <button
          type="button"
          disabled={props.isSubmitting}
          onClick={props.onSubmit}
          className="group relative w-full rounded-xl bg-[#6BCFCF] sm:bg-gradient-to-r sm:from-[#A8E6D8] sm:via-[#6BCFCF] sm:to-[#5AB8B8] border border-white/20 py-4 sm:py-5 text-base sm:text-lg font-bold text-white shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.4)] hover:bg-[#5AB8B8] sm:hover:shadow-[0_12px_50px_rgba(107,207,207,0.6)] transition-all duration-300 sm:hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 overflow-hidden"
        >
          <span className="relative z-10">{props.isSubmitting ? "Enregistrement..." : "Finaliser mon estimation"}</span>
          
          {/* Gradient hover overlay - desktop only */}
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-[#A8E6D8] to-[#6BCFCF] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Shine effect - desktop only */}
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
        <p className="text-center text-sm text-[#1E293B]/70 mt-1">~30 sec restantes</p>
      </div>
      </div>

      {/* Desktop only: panneau Budget & hypothèses (≥ lg / 1024px) */}
      {/* DÉSACTIVÉ: sidebar déplacée dans page.tsx pour layout grille propre */}
      <aside className="hidden">
        <div className="rounded-3xl border border-white/40 bg-white/90 backdrop-blur-xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#0F172A]">Votre estimation</h3>
            <div className="w-2 h-2 rounded-full bg-[#6BCFCF] animate-pulse" />
          </div>

          {/* Budget affiné - EN PREMIER (hiérarchie inversée) */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6BCFCF]/10 via-[#A8E8E8]/5 to-transparent border-2 border-[#6BCFCF]/30 p-6 shadow-[0_8px_32px_rgba(107,207,207,0.15)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#6BCFCF]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6BCFCF] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6BCFCF]" />
                Budget affiné
              </p>
              {typeof cart?.refinedCenterEur === "number" ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-5xl font-black text-[#0F172A] leading-none tabular-nums tracking-tight transition-all duration-300 drop-shadow-sm">
                      {fmtEur(cart.refinedCenterEur)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#6BCFCF]/20">
                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#1E293B]/50 mb-1">Minimum</p>
                      <p className="text-lg font-black text-[#10B981]">
                        {typeof cart?.refinedMinEur === "number" ? fmtEur(cart.refinedMinEur) : "—"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#1E293B]/50 mb-1">Maximum</p>
                      <p className="text-lg font-black text-[#EF4444]">
                        {typeof cart?.refinedMaxEur === "number" ? fmtEur(cart.refinedMaxEur) : "—"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-sm text-[#1E293B]/60">Calcul en cours...</div>
              )}
            </div>
          </div>

          {/* Ajustements - design moderne */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E3E5E8] to-transparent" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1E293B]/40">
                Ajustements
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E3E5E8] to-transparent" />
            </div>
            <div className="space-y-2">
              {(cart?.lines ?? []).map((l) => {
                const isPos = l.amountEur > 0;
                const isNeg = l.amountEur < 0;
                const isAccess = l.key === "access";
                const isDate = l.key === "date";
                const isDistance = l.key === "distance";
                const tooltips: Record<string, string> = {
                  distance: "La distance est recalculée à partir des adresses quand elles sont renseignées",
                  access: "Les étages et l'absence d'ascenseur augmentent le temps de manutention",
                  date: "Les périodes de forte demande (été, fin de mois) impactent les tarifs",
                };
                
                return (
                  <div 
                    key={l.key} 
                    className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-white/50 border border-[#E3E5E8]/50 hover:border-[#6BCFCF]/30 hover:bg-white/80 transition-all duration-200"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full ${isPos ? 'bg-red-400' : isNeg ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <p className="text-sm font-semibold text-[#0F172A] truncate flex items-center gap-1.5">
                        <span className="truncate">{l.label}</span>
                        {(isDistance || isAccess || isDate) && (
                          <span
                            className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title={tooltips[l.key]}
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-[#6BCFCF]" />
                          </span>
                        )}
                      </p>
                    </div>
                    <div
                      className={[
                        "shrink-0 text-base font-black tabular-nums transition-colors",
                        isPos ? "text-[#EF4444]" : isNeg ? "text-[#10B981]" : "text-[#1E293B]/40",
                      ].join(" ")}
                    >
                      {l.amountEur > 0 ? "+" : ""}
                      {l.amountEur} €
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Première estimation - design subtil et collapsible */}
          <details className="group">
            <summary className="cursor-pointer list-none rounded-xl bg-[#F8F9FA] p-4 hover:bg-[#F1F2F4] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1E293B]/50 mb-1">
                    Première estimation
                  </p>
                  {typeof cart?.firstEstimateCenterEur === "number" && (
                    <p className="text-2xl font-black text-[#1E293B]/60 tabular-nums">
                      {fmtEur(cart.firstEstimateCenterEur)}
                    </p>
                  )}
                </div>
                <svg 
                  className="w-5 h-5 text-[#1E293B]/40 transition-transform group-open:rotate-180" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-3 space-y-3 px-4">
              {typeof cart?.firstEstimateCenterEur === "number" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-green-50/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#1E293B]/40 mb-1">Min</p>
                      <p className="text-base font-bold text-[#10B981]">
                        {typeof cart?.firstEstimateMinEur === "number" ? fmtEur(cart.firstEstimateMinEur) : "—"}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#1E293B]/40 mb-1">Max</p>
                      <p className="text-base font-bold text-[#EF4444]">
                        {typeof cart?.firstEstimateMaxEur === "number" ? fmtEur(cart.firstEstimateMaxEur) : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#1E293B]/40 leading-relaxed">
                    formule {cart?.formuleLabel ?? "Standard"} • villes +5 km • densité très meublé • cuisine 3 équipements • pas de saison • accès RAS
                  </p>
                </>
              ) : (
                <div className="text-sm text-[#1E293B]/40 text-center py-2">Aucune estimation initiale</div>
              )}
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}
