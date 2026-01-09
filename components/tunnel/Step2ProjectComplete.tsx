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
  { value: "house", label: "Maison" },
];

export default function Step2ProjectComplete(props: Step2ProjectCompleteProps) {
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
        <div className="inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/10 px-4 py-1.5 text-sm font-semibold text-[#0F172A] mb-6">
          <span className="h-2 w-2 rounded-full bg-[#6BCFCF]" />
          Étape 2/4
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4 leading-tight">
          Votre trajet & logements
        </h2>
        
        <p className="text-lg text-[#1E293B]/70 leading-relaxed">
          Pour un devis précis basé sur vos accès et la configuration.
        </p>
      </div>

      <form onSubmit={props.onSubmit} noValidate className="space-y-8">
        {/* === DÉPART === */}
        <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8] space-y-6">
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
            <div className="grid grid-cols-4 gap-2">
              {HOUSING_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    markTouched("originHousingType");
                    props.onFieldChange("originHousingType", type.value);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    props.originHousingType === type.value
                      ? "bg-[#6BCFCF] text-white"
                      : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {(showErrors || touchedFields.has("originHousingType")) && !props.originHousingType && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Type de logement obligatoire
              </p>
            )}
          </div>

          {/* Étage + Ascenseur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">Étage</label>
              <input
                type="number"
                value={props.originFloor}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return props.onFieldChange("originFloor", "");
                  const n = Number.parseInt(raw, 10);
                  if (!Number.isFinite(n)) return props.onFieldChange("originFloor", "");
                  props.onFieldChange("originFloor", String(Math.min(50, Math.max(0, n))));
                }}
                min="0"
                max="50"
                className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
              />
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
          </div>
        </div>

        {/* === ARRIVÉE === */}
        <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8] space-y-6">
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
                <div className="grid grid-cols-4 gap-2">
                  {HOUSING_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        markTouched("destinationHousingType");
                        props.onFieldChange("destinationHousingType", type.value);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        props.destinationHousingType === type.value
                          ? "bg-[#6BCFCF] text-white"
                          : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                {(showErrors || touchedFields.has("destinationHousingType")) && !props.destinationHousingType && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Type de logement obligatoire
                  </p>
                )}
              </div>

              {/* Étage + Ascenseur */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">Étage</label>
                  <input
                    type="number"
                    value={props.destinationFloor}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") return props.onFieldChange("destinationFloor", "");
                      const n = Number.parseInt(raw, 10);
                      if (!Number.isFinite(n)) return props.onFieldChange("destinationFloor", "");
                      props.onFieldChange("destinationFloor", String(Math.min(50, Math.max(0, n))));
                    }}
                    min="0"
                    max="50"
                    className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                  />
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
              </div>
            </>
          )}
        </div>

        {/* === DATE === */}
        <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8] space-y-4">
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

