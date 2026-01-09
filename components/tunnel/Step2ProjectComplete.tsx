"use client";

import { useState, FormEvent } from "react";
import { MapPin, Home, Calendar, Building2, Layers, ArrowRight, Check, AlertCircle } from "lucide-react";
import { AddressAutocomplete } from "./AddressAutocomplete";

interface Step2ProjectCompleteProps {
  // Départ
  originPostalCode: string;
  originCity: string;
  originAddress: string;
  originLat: number | null;
  originLon: number | null;
  originHousingType: string;
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
  { value: "3", label: "Au‑delà" }, // 3+ étages
];

export default function Step2ProjectComplete(props: Step2ProjectCompleteProps) {
  const renderConstrainedOptions = (which: "origin" | "destination") => {
    const prefix = which === "origin" ? "origin" : "destination";
    const access = which === "origin" ? props.originAccess : props.destinationAccess;
    const furnitureLift =
      which === "origin" ? props.originFurnitureLift : props.destinationFurnitureLift;
    const carryDistance =
      which === "origin" ? props.originCarryDistance : props.destinationCarryDistance;
    const parkingAuth =
      which === "origin" ? props.originParkingAuth : props.destinationParkingAuth;
    const tightAccess =
      which === "origin" ? props.originTightAccess : props.destinationTightAccess;
    const housingType =
      which === "origin" ? props.originHousingType : props.destinationHousingType;
    const isHouse = housingType === "house";
    const floor = which === "origin" ? props.originFloor : props.destinationFloor;
    const elevator = which === "origin" ? props.originElevator : props.destinationElevator;

    if (access !== "constrained") return null;

    const portageEnabled = carryDistance !== "";
    const monteMeubleEnabled = furnitureLift === "yes";

    const YesNo = (props2: {
      value: boolean;
      onChange: (v: boolean) => void;
      yesLabel?: string;
      noLabel?: string;
    }) => (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => props2.onChange(false)}
          className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
            props2.value === false
              ? "bg-[#0F172A] text-white"
              : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
          }`}
        >
          {props2.noLabel ?? "Non"}
        </button>
        <button
          type="button"
          onClick={() => props2.onChange(true)}
          className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
            props2.value === true
              ? "bg-[#6BCFCF] text-white"
              : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
          }`}
        >
          {props2.yesLabel ?? "Oui"}
        </button>
      </div>
    );

    return (
      <div className="mt-4 space-y-4 rounded-xl border border-[#E3E5E8] bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Détails d’accès</p>
          <p className="text-xs text-[#1E293B]/60">
            Uniquement si l’accès est difficile (pour affiner le devis).
          </p>
        </div>

        {/* 1 option par ligne */}
        <div className="space-y-3">
          {/* Appartement: ordre demandé */}
          {!isHouse && (
            <>
              {/* Petit ascenseur / passages serrés */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">
                    Petit ascenseur / passages serrés
                  </p>
                </div>
                <div className="w-44">
                  <YesNo
                    value={Boolean(tightAccess)}
                    onChange={(v) => props.onFieldChange(`${prefix}TightAccess`, v)}
                  />
                </div>
              </div>

              {/* Monte-meuble (ouvre seulement si passages serrés = Oui) */}
              {tightAccess && (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A]">Besoin d’un monte‑meuble</p>
                  </div>
                  <div className="w-44">
                    <YesNo
                      value={monteMeubleEnabled}
                      onChange={(v) =>
                        props.onFieldChange(`${prefix}FurnitureLift`, v ? "yes" : "no")
                      }
                    />
                  </div>
                </div>
              )}

              {/* Portage > 10m */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">Portage &gt; 10 m</p>
                </div>
                <div className="w-44">
                  <YesNo
                    value={portageEnabled}
                    onChange={(v) =>
                      props.onFieldChange(`${prefix}CarryDistance`, v ? CARRY_DISTANCE_ON_VALUE : "")
                    }
                  />
                </div>
              </div>

              {/* Stationnement compliqué */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">Stationnement compliqué</p>
                </div>
                <div className="w-44">
                  <YesNo
                    value={Boolean(parkingAuth)}
                    onChange={(v) => props.onFieldChange(`${prefix}ParkingAuth`, v)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Maison: ordre demandé */}
          {isHouse && (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">Portage &gt; 10 m</p>
                </div>
                <div className="w-44">
                  <YesNo
                    value={portageEnabled}
                    onChange={(v) =>
                      props.onFieldChange(`${prefix}CarryDistance`, v ? CARRY_DISTANCE_ON_VALUE : "")
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">Stationnement compliqué</p>
                </div>
                <div className="w-44">
                  <YesNo
                    value={Boolean(parkingAuth)}
                    onChange={(v) => props.onFieldChange(`${prefix}ParkingAuth`, v)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">Passages serrés</p>
                </div>
                <div className="w-44">
                  <YesNo
                    value={Boolean(tightAccess)}
                    onChange={(v) => props.onFieldChange(`${prefix}TightAccess`, v)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">Besoin d’un monte‑meuble</p>
                </div>
                <div className="w-44">
                  <YesNo
                    value={monteMeubleEnabled}
                    onChange={(v) =>
                      props.onFieldChange(`${prefix}FurnitureLift`, v ? "yes" : "no")
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  function markTouched(field: string) {
    setTouchedFields((prev) => new Set(prev).add(field));
  }

  // Avec l'autocomplete adresse (FR + Europe), on valide d'abord l'adresse + le logement.
  // Le CP/ville peuvent être absents/incomplets (cas étranger) sans bloquer le parcours.
  const isOriginValid =
    props.originAddress.trim().length >= 5 && props.originHousingType.length > 0;
    
  const isDestinationValid =
    props.destinationUnknown ||
    (props.destinationAddress.trim().length >= 5 &&
      props.destinationHousingType.length > 0);
  
  const isDateValid = props.movingDate.length > 0;
  const isFormValid = isOriginValid && isDestinationValid && isDateValid;
  const originIsHouse = props.originHousingType === "house";
  const destinationIsHouse = props.destinationHousingType === "house";
  const originIsApartment = !originIsHouse && !!props.originHousingType;
  const destinationIsApartment = !destinationIsHouse && !!props.destinationHousingType;

  const setHousingCategory = (
    which: "origin" | "destination",
    category: "apartment" | "house"
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
      return;
    }

    // apartment
    markTouched(`${prefix}HousingType`);
    if (current && current !== "house") return; // on conserve la taille si déjà choisie
    // Valeur par défaut (rapide) si on bascule depuis Maison / vide
    props.onFieldChange(`${prefix}HousingType`, "t2");
  };

  const missingFields: Array<{ id: string; label: string }> = [];
  if (props.originAddress.trim().length < 5) missingFields.push({ id: "origin-address", label: "Adresse départ" });
  if (!props.originHousingType) missingFields.push({ id: "origin-housingType", label: "Logement départ" });
  if (!props.destinationUnknown) {
    if (props.destinationAddress.trim().length < 5) missingFields.push({ id: "destination-address", label: "Adresse arrivée" });
    if (!props.destinationHousingType) missingFields.push({ id: "destination-housingType", label: "Logement arrivée" });
  }
  if (!isDateValid) missingFields.push({ id: "movingDate", label: "Date" });

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
          Votre trajet & logements
        </h2>
        
        <p className="hidden md:block text-lg text-[#1E293B]/70 leading-relaxed">
          Pour un devis précis basé sur vos accès et la configuration.
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
            placeholder="10 rue de la Paix, 33000 Bordeaux"
            inputId="origin-address"
            initialValue={
              props.originAddress ||
              [props.originPostalCode, props.originCity].filter(Boolean).join(" ")
            }
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
          <div id="origin-housingType">
            <label className="block text-sm font-medium text-[#0F172A] mb-2">Type de logement *</label>

            {/* Catégorie */}
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* Taille (appartement) */}
            {!originIsHouse && (
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

          {/* Étage + Ascenseur (Appartement uniquement) */}
          {!originIsHouse && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">Étage</label>
                <select
                  value={props.originFloor || "0"}
                  onChange={(e) => props.onFieldChange("originFloor", e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                >
                  {FLOOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">Ascenseur</label>
                <select
                  value={props.originElevator}
                  onChange={(e) => props.onFieldChange("originElevator", e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                >
                  <option value="none">Non renseigné</option>
                  <option value="yes">Oui</option>
                  <option value="no">Non</option>
                </select>
              </div>
            </div>
          )}

          {/* Accès */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">Accès</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => props.onFieldChange("originAccess", "easy")}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  props.originAccess === "easy"
                    ? "bg-[#6BCFCF] text-white"
                    : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                }`}
              >
                Facile
              </button>
              <button
                type="button"
                onClick={() => props.onFieldChange("originAccess", "constrained")}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  props.originAccess === "constrained"
                    ? "bg-[#6BCFCF] text-white"
                    : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                }`}
              >
                Contraint
              </button>
            </div>

            {renderConstrainedOptions("origin")}
          </div>
        </div>

        {/* === ARRIVÉE === */}
        <div className="pt-6 border-t border-[#E3E5E8] space-y-6 md:pt-0 md:border-t-0 md:p-6 md:rounded-2xl md:bg-[#F8F9FA] md:border md:border-[#E3E5E8]">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#6BCFCF]" />
            <h3 className="text-lg font-bold text-[#0F172A]">Arrivée</h3>
          </div>

          {/* Checkbox: destination inconnue */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E3E5E8] cursor-pointer hover:border-[#6BCFCF] transition-colors">
            <input
              type="checkbox"
              checked={props.destinationUnknown}
              onChange={(e) => props.onFieldChange("destinationUnknown", e.target.checked)}
              className="w-5 h-5 rounded border-[#E3E5E8] text-[#6BCFCF] focus:ring-2 focus:ring-[#6BCFCF]/20"
            />
            <span className="text-sm text-[#0F172A]">
              Je ne connais pas encore mon adresse d'arrivée
            </span>
          </label>

          {!props.destinationUnknown && (
            <>
              <AddressAutocomplete
                label="Adresse d'arrivée *"
                placeholder="20 place Bellecour, 69002 Lyon"
                inputId="destination-address"
                initialValue={
                  props.destinationAddress ||
                  [props.destinationPostalCode, props.destinationCity]
                    .filter(Boolean)
                    .join(" ")
                }
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

              {/* Type de logement */}
              <div id="destination-housingType">
                <label className="block text-sm font-medium text-[#0F172A] mb-2">Type de logement *</label>

                {/* Catégorie */}
                <div className="grid grid-cols-2 gap-3">
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
                </div>

                {/* Taille (appartement) */}
                {!destinationIsHouse && (
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

              {/* Étage + Ascenseur (Appartement uniquement) */}
              {!destinationIsHouse && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Étage</label>
                    <select
                      value={props.destinationFloor || "0"}
                      onChange={(e) => props.onFieldChange("destinationFloor", e.target.value)}
                      className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                    >
                      {FLOOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Ascenseur</label>
                    <select
                      value={props.destinationElevator}
                      onChange={(e) => props.onFieldChange("destinationElevator", e.target.value)}
                      className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                    >
                      <option value="none">Non renseigné</option>
                      <option value="yes">Oui</option>
                      <option value="no">Non</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Accès */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">Accès</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => props.onFieldChange("destinationAccess", "easy")}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      props.destinationAccess === "easy"
                        ? "bg-[#6BCFCF] text-white"
                        : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                    }`}
                  >
                    Facile
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onFieldChange("destinationAccess", "constrained")}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      props.destinationAccess === "constrained"
                        ? "bg-[#6BCFCF] text-white"
                        : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                    }`}
                  >
                    Contraint
                  </button>
                </div>

                {renderConstrainedOptions("destination")}
              </div>
            </>
          )}
        </div>

        {/* === DATE === */}
        <div className="pt-6 border-t border-[#E3E5E8] space-y-4 md:pt-0 md:border-t-0 md:p-6 md:rounded-2xl md:bg-[#F8F9FA] md:border md:border-[#E3E5E8]">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#6BCFCF]" />
            <h3 className="text-lg font-bold text-[#0F172A]">Date souhaitée</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">Date de déménagement *</label>
            <input
              id="movingDate"
              type="date"
              value={props.movingDate}
              onChange={(e) => {
                markTouched("movingDate");
                props.onFieldChange("movingDate", e.target.value);
              }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
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
              Date obligatoire
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
          className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#1E293B] hover:shadow-xl transition-all duration-200 ${
            !isFormValid && !props.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          } ${props.isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span>{props.isSubmitting ? "Enregistrement..." : "Continuer"}</span>
          {!props.isSubmitting && (
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
        </button>
      </form>
    </div>
  );
}

