"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Package, Home, Sparkles, ArrowRight, Check } from "lucide-react";

type FormuleType = "" | "ECONOMIQUE" | "STANDARD" | "PREMIUM";

type PricingDetails = {
  surfaceM2: number;
  housingType: string;
  density: string;
  distanceKm: number;
  distanceSource: "osrm" | "fallback" | null;
  seasonFactor: number;
  originFloor: number;
  originElevator: string;
  destinationFloor: number;
  destinationElevator: string;
  services: {
    monteMeuble: boolean;
    piano: string | null;
    debarras: boolean;
  };
  constants: {
    typeCoefficient: number;
    densityCoefficient: number;
    PRIX_MIN_SOCLE: number;
    distanceBand: string;
    rateEurPerM3: number;
    volumeScale?: number;
  };
  intermediate: {
    baseVolumeM3: number;
    adjustedVolumeM3: number;
    baseNoSeasonEur: number;
    coeffEtage: number;
    servicesTotalEur: number;
    centreNoSeasonEur: number;
    centreSeasonedEur: number;
  };
};

interface Step3VolumeServicesProps {
  surfaceM2: string;
  formule: FormuleType;
  pricing: { volumeM3: number; priceMin: number; priceMax: number } | null;
  pricingByFormule?: Partial<
    Record<FormuleType, { priceMin: number; priceMax: number }>
  > | null;
  pricingDetails?: PricingDetails | null;
  
  // Services en plus
  serviceFurnitureStorage: boolean;
  serviceCleaning: boolean;
  serviceFullPacking: boolean;
  serviceFurnitureAssembly: boolean;
  serviceInsurance: boolean;
  serviceWasteRemoval: boolean;
  serviceHelpWithoutTruck: boolean;
  serviceSpecificSchedule: boolean;
  
  // Autres besoins
  hasPiano: boolean;
  hasFragileItems: boolean;
  hasSpecificFurniture: boolean;
  specificNotes: string;
  
  onFieldChange: (field: string, value: any) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  error: string | null;
  showValidation?: boolean;
}

const FORMULES: Array<{
  id: FormuleType;
  label: string;
  icon: React.ReactNode;
  features: string[];
  recommended?: boolean;
}> = [
  {
    id: "ECONOMIQUE",
    label: "Éco",
    icon: <Package className="w-6 h-6" />,
    features: [
      "Transport uniquement",
      "Vous emballez",
      "Idéal budget serré",
    ],
  },
  {
    id: "STANDARD",
    label: "Standard",
    icon: <Home className="w-6 h-6" />,
    features: [
      "Transport + aide",
      "Emballage basique",
      "Le plus populaire",
    ],
    recommended: true,
  },
  {
    id: "PREMIUM",
    label: "Premium",
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      "Tout inclus",
      "Emballage complet",
      "Clé en main",
    ],
  },
];

const SERVICES: Array<{
  key: string;
  label: string;
  includedIn?: FormuleType[];
}> = [
  { key: "serviceFullPacking", label: "Emballage complet", includedIn: ["PREMIUM"] },
  { key: "serviceCleaning", label: "Nettoyage / débarras", includedIn: ["PREMIUM"] },
  { key: "serviceInsurance", label: "Assurance renforcée", includedIn: ["PREMIUM"] },
  { key: "serviceWasteRemoval", label: "Évacuation déchets", includedIn: ["PREMIUM"] },
  { key: "serviceFurnitureStorage", label: "Garde-meuble" },
  { key: "serviceFurnitureAssembly", label: "Montage meubles neufs" },
  { key: "serviceHelpWithoutTruck", label: "Aide sans camion" },
  { key: "serviceSpecificSchedule", label: "Horaires spécifiques" },
];

export default function Step3VolumeServices(props: Step3VolumeServicesProps) {
  const surface = parseInt(props.surfaceM2) || 60;
  const isSurfaceValid = surface >= 10 && surface <= 500;
  const [showDetails, setShowDetails] = useState(false);
  const showErrors = Boolean(props.showValidation);
  const isFormuleSelected = !!props.formule;
  const isFormValid = isSurfaceValid && isFormuleSelected;
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const anySelected = SERVICES.some(
      (s) => props[s.key as keyof Step3VolumeServicesProps] as boolean
    );
    if (anySelected && !showOptions) setShowOptions(true);
  }, [props.formule]);

  const missingFields: Array<{ id: string; label: string }> = [];
  if (!isSurfaceValid) missingFields.push({ id: "surfaceM2", label: "Surface" });
  if (!isFormuleSelected) missingFields.push({ id: "formule-select", label: "Formule" });

  const selectedOptionsCount = useMemo(() => {
    let n = 0;
    for (const service of SERVICES) {
      if (props[service.key as keyof Step3VolumeServicesProps] as boolean) n++;
    }
    if (props.specificNotes?.trim()) n++;
    return n;
  }, [
    props.serviceFurnitureStorage,
    props.serviceCleaning,
    props.serviceFullPacking,
    props.serviceFurnitureAssembly,
    props.serviceInsurance,
    props.serviceWasteRemoval,
    props.serviceHelpWithoutTruck,
    props.serviceSpecificSchedule,
    props.specificNotes,
  ]);

  const YesNo = (p: { value: boolean; onChange: (v: boolean) => void }) => (
    <div className="grid w-44 grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => p.onChange(false)}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          p.value === false
            ? "bg-[#0F172A] text-white"
            : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
        }`}
      >
        Non
      </button>
      <button
        type="button"
        onClick={() => p.onChange(true)}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          p.value === true
            ? "bg-[#6BCFCF] text-white"
            : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
        }`}
      >
        Oui
      </button>
    </div>
  );

  const focusField = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if ((el as any).focus) (el as any).focus();
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="hidden md:inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/10 px-4 py-1.5 text-sm font-semibold text-[#0F172A] mb-6">
          <span className="h-2 w-2 rounded-full bg-[#6BCFCF]" />
          Étape 3/4
        </div>

        <h2 className="text-2xl md:text-4xl font-bold text-[#0F172A] mb-3 md:mb-4 leading-tight">
          Choisissez votre niveau de service
        </h2>
        
        <p className="hidden md:block text-lg text-[#1E293B]/70 leading-relaxed">
          Derniers détails pour un devis sur-mesure.
        </p>
      </div>

      <form onSubmit={props.onSubmit} noValidate className="space-y-6">
        {/* Surface */}
        <div className="md:p-6 md:rounded-2xl md:bg-[#F8F9FA] md:border md:border-[#E3E5E8]">
          <label className="block text-sm font-medium text-[#0F172A] mb-2">
            Surface du point de départ, garages et dépendances inclus (m²) *
          </label>
          <div className="relative">
            <input
              id="surfaceM2"
              type="number"
              value={props.surfaceM2}
              onChange={(e) => props.onFieldChange("surfaceM2", e.target.value)}
              min={10}
              max={500}
              className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
              placeholder="60"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E293B]/60 text-sm">
              m²
            </span>
          </div>
          {showErrors && !isSurfaceValid && (
            <p className="text-sm text-red-600 mt-2">Surface entre 10 et 500 m²</p>
          )}
          <div className="mt-4 p-4 rounded-xl bg-white border border-[#E3E5E8]">
            <p className="text-sm text-[#1E293B]/70">
              📦 Volume estimé :{" "}
              <strong className="text-[#0F172A]">
                {props.pricing ? `${props.pricing.volumeM3}m³` : "—"}
              </strong>
            </p>
            <p className="text-sm text-[#1E293B]/70 mt-1">
              💰 Fourchette{" "}
              {props.formule === "ECONOMIQUE"
                ? "Éco"
                : props.formule === "STANDARD"
                ? "Standard"
                : "Premium"}{" "}
              :{" "}
              <strong className="text-[#0F172A]">
                {props.pricing ? `${props.pricing.priceMin} - ${props.pricing.priceMax}€` : "—"}
              </strong>
            </p>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="rounded-full border border-[#E3E5E8] bg-white px-3 py-1 text-xs font-semibold text-[#0F172A]/70 shadow-sm hover:border-[#6BCFCF]/60 hover:text-[#0F172A] transition"
              >
                {showDetails ? "Masquer le détail" : "Voir le détail"}
              </button>
              {props.pricingDetails?.housingType && (
                <span className="rounded-full bg-[#6BCFCF]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0F172A]">
                  type {props.pricingDetails.housingType}
                </span>
              )}
            </div>

            {showDetails && props.pricingDetails && (
              <div className="mt-4 rounded-2xl border border-[#E3E5E8] bg-white/80 p-4 text-xs text-[#0F172A]/80 shadow-[0_6px_20px_rgba(0,0,0,0.05)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[#0F172A]">Détails du calcul</div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#1E293B]/60">
                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5">
                      distance {props.pricingDetails.distanceKm} km ·{" "}
                      {props.pricingDetails.distanceSource === "osrm" ? "route OSRM" : "fallback CP"}
                    </span>
                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5">
                      band {props.pricingDetails.constants.distanceBand} ·{" "}
                      {props.pricingDetails.constants.rateEurPerM3} €/m³
                    </span>
                    {typeof props.pricingDetails.constants.volumeScale === "number" && (
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5">
                        scale {props.pricingDetails.constants.volumeScale.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-[#E3E5E8] bg-[#F8F9FA] p-3">
                    <div className="text-xs font-semibold text-[#0F172A]">Entrées</div>
                    <dl className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Surface</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.surfaceM2} m²
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Type logement</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.housingType} (coef{" "}
                          {props.pricingDetails.constants.typeCoefficient})
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Densité</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.density} (coef{" "}
                          {props.pricingDetails.constants.densityCoefficient})
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Saisonnalité</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.seasonFactor.toFixed(2)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Étages</dt>
                        <dd className="font-mono text-[#0F172A]">
                          O={props.pricingDetails.originFloor} ({props.pricingDetails.originElevator}), D=
                          {props.pricingDetails.destinationFloor} ({props.pricingDetails.destinationElevator})
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Services</dt>
                        <dd className="font-mono text-[#0F172A] text-right">
                          monteMeuble={String(props.pricingDetails.services.monteMeuble)}
                          <br />
                          piano={props.pricingDetails.services.piano ?? "null"}
                          <br />
                          debarras={String(props.pricingDetails.services.debarras)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-[#E3E5E8] bg-[#F8F9FA] p-3">
                    <div className="text-xs font-semibold text-[#0F172A]">Calcul</div>
                    <dl className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Volume base</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.intermediate.baseVolumeM3} m³
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Volume ajusté</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.intermediate.adjustedVolumeM3} m³
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Base avant saison</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.intermediate.baseNoSeasonEur} € (min{" "}
                          {props.pricingDetails.constants.PRIX_MIN_SOCLE})
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Coeff étage</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.intermediate.coeffEtage}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Services</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.intermediate.servicesTotalEur} €
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Centre (hors saison)</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.intermediate.centreNoSeasonEur} €
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[#1E293B]/70">Centre (saisonné)</dt>
                        <dd className="font-mono text-[#0F172A]">
                          {props.pricingDetails.intermediate.centreSeasonedEur} €
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Formules */}
        <div id="formule-select">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">Choisissez votre formule *</h3>
          {showErrors && !isFormuleSelected && (
            <p className="text-sm text-red-600 mb-3">Veuillez sélectionner une formule</p>
          )}
          
          <div className="grid gap-4">
            {FORMULES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => props.onFieldChange("formule", f.id)}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                  props.formule === f.id
                    ? "border-[#6BCFCF] bg-[#6BCFCF]/5"
                    : "border-[#E3E5E8] bg-white hover:border-[#6BCFCF]/50"
                }`}
              >
                {f.recommended && (
                  <div className="absolute -top-3 left-6 bg-[#6BCFCF] text-white px-3 py-1 rounded-full text-xs font-bold">
                    Recommandé
                  </div>
                )}
                
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl ${
                    props.formule === f.id ? "bg-[#6BCFCF] text-white" : "bg-[#F8F9FA] text-[#0F172A]"
                  }`}>
                    {f.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-[#0F172A]">{f.label}</h4>
                      {props.formule === f.id && (
                        <Check className="w-5 h-5 text-[#6BCFCF]" strokeWidth={3} />
                      )}
                    </div>

                    <div className="mb-3 text-sm text-[#1E293B]/70">
                      💰{" "}
                      <span className="font-semibold text-[#0F172A]">
                        {props.pricingByFormule?.[f.id]
                          ? `${props.pricingByFormule[f.id]!.priceMin} - ${props.pricingByFormule[f.id]!.priceMax}€`
                          : "—"}
                      </span>
                    </div>
                    
                    <ul className="space-y-1">
                      {f.features.map((feature, i) => (
                        <li key={i} className="text-sm text-[#1E293B]/70 flex items-center gap-2">
                          <span className="text-[#6BCFCF]">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Options (facultatif) */}
        <div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-2">Options (facultatif)</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                !showOptions
                  ? "bg-[#6BCFCF] text-white"
                  : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
              }`}
            >
              Aucune
            </button>
            <button
              type="button"
              onClick={() => setShowOptions(true)}
              className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                showOptions
                  ? "bg-[#6BCFCF] text-white"
                  : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
              }`}
            >
              Personnaliser
              {selectedOptionsCount > 0 ? ` (${selectedOptionsCount})` : ""}
            </button>
          </div>

          {showOptions && (
            <div className="mt-4 space-y-6 rounded-2xl border border-[#E3E5E8] bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Services en plus</p>
                <div className="mt-3 space-y-3">
                  {SERVICES.map((service) => {
                    const value = props[service.key as keyof Step3VolumeServicesProps] as boolean;
                    const isIncluded = !!service.includedIn && !!props.formule && service.includedIn.includes(props.formule as FormuleType);
                    return (
                      <div key={service.key} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#0F172A]">{service.label}</p>
                          {isIncluded && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6BCFCF] bg-[#6BCFCF]/10 px-1.5 py-0.5 rounded">
                              inclus
                            </span>
                          )}
                        </div>
                        <YesNo onChange={(v) => props.onFieldChange(service.key, v)} value={value} />
                      </div>
                    );
                  })}
          </div>
        </div>

              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Précisions</p>
            <textarea
              value={props.specificNotes}
              onChange={(e) => props.onFieldChange("specificNotes", e.target.value)}
                  placeholder="Ex: rue étroite, horaires, objets fragiles, contraintes particulières..."
              rows={3}
                  className="mt-2 w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
            />
          </div>
            </div>
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
          className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white hover:bg-[#1E293B] transition-all duration-200 ${
            !isFormValid && !props.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          } ${props.isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span>{props.isSubmitting ? "Envoi du dossier..." : "Envoyer mon dossier"}</span>
          {!props.isSubmitting && (
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
        </button>

        <p className="text-center text-sm text-[#1E293B]/60">
          Votre dossier sera transmis à des déménageurs sélectionnés
        </p>
      </form>
    </div>
  );
}

