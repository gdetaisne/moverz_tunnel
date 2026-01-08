"use client";

import { FormEvent } from "react";
import { Package, Home, Sparkles, ArrowRight, Check } from "lucide-react";

type FormuleType = "ECONOMIQUE" | "STANDARD" | "PREMIUM";

interface Step3VolumeServicesProps {
  surfaceM2: string;
  formule: FormuleType;
  
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

const SERVICES = [
  { key: "serviceFurnitureStorage", label: "Garde-meuble" },
  { key: "serviceCleaning", label: "Nettoyage / débarras" },
  { key: "serviceFullPacking", label: "Emballage complet" },
  { key: "serviceFurnitureAssembly", label: "Montage meubles neufs" },
  { key: "serviceInsurance", label: "Assurance renforcée" },
  { key: "serviceWasteRemoval", label: "Évacuation déchets" },
  { key: "serviceHelpWithoutTruck", label: "Aide sans camion" },
  { key: "serviceSpecificSchedule", label: "Horaires spécifiques" },
];

const OTHER_NEEDS = [
  { key: "hasPiano", label: "Piano" },
  { key: "hasFragileItems", label: "Objets fragiles" },
  { key: "hasSpecificFurniture", label: "Mobilier spécifique" },
];

export default function Step3VolumeServices(props: Step3VolumeServicesProps) {
  const surface = parseInt(props.surfaceM2) || 60;
  const isSurfaceValid = surface >= 10 && surface <= 500;

  // Pricing ajusté selon formule
  const getPricing = () => {
    const volumeM3 = Math.round(surface * 0.7);
    let pricePerM2Min = 12;
    let pricePerM2Max = 20;

    if (props.formule === "ECONOMIQUE") {
      pricePerM2Min = 10;
      pricePerM2Max = 15;
    } else if (props.formule === "STANDARD") {
      pricePerM2Min = 15;
      pricePerM2Max = 22;
    } else if (props.formule === "PREMIUM") {
      pricePerM2Min = 22;
      pricePerM2Max = 35;
    }

    return {
      volumeM3,
      priceMin: Math.round(surface * pricePerM2Min),
      priceMax: Math.round(surface * pricePerM2Max),
    };
  };

  const pricing = getPricing();

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/10 px-4 py-1.5 text-sm font-semibold text-[#0F172A] mb-6">
          <span className="h-2 w-2 rounded-full bg-[#6BCFCF]" />
          Étape 3/4
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4 leading-tight">
          Volume, formule & services
        </h2>
        
        <p className="text-lg text-[#1E293B]/70 leading-relaxed">
          Derniers détails pour un devis sur-mesure.
        </p>
      </div>

      <form onSubmit={props.onSubmit} className="space-y-6">
        {/* Surface */}
        <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8]">
          <label className="block text-sm font-medium text-[#0F172A] mb-2">
            Surface approximative (m²) *
          </label>
          <div className="relative">
            <input
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
          {!isSurfaceValid && (
            <p className="text-sm text-red-600 mt-2">Surface entre 10 et 500 m²</p>
          )}
          <div className="mt-4 p-4 rounded-xl bg-white border border-[#E3E5E8]">
            <p className="text-sm text-[#1E293B]/70">
              📦 Volume estimé : <strong className="text-[#0F172A]">{pricing.volumeM3}m³</strong>
            </p>
            <p className="text-sm text-[#1E293B]/70 mt-1">
              💰 Fourchette {props.formule === "ECONOMIQUE" ? "Éco" : props.formule === "STANDARD" ? "Standard" : "Premium"} : <strong className="text-[#0F172A]">{pricing.priceMin} - {pricing.priceMax}€</strong>
            </p>
          </div>
        </div>

        {/* Formules */}
        <div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">Choisissez votre formule *</h3>
          
          <div className="grid gap-4">
            {FORMULES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => props.onFieldChange("formule", f.id)}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                  props.formule === f.id
                    ? "border-[#6BCFCF] bg-[#6BCFCF]/5 shadow-lg"
                    : "border-[#E3E5E8] bg-white hover:border-[#6BCFCF]/50"
                }`}
              >
                {f.recommended && (
                  <div className="absolute -top-3 left-6 bg-gradient-to-r from-[#6BCFCF] to-[#A8E8E8] text-white px-3 py-1 rounded-full text-xs font-bold">
                    ⭐ Recommandé
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

        {/* Services en plus */}
        <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8]">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">Services en plus (facultatif)</h3>
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map((service) => (
              <label
                key={service.key}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E3E5E8] cursor-pointer hover:border-[#6BCFCF] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={props[service.key as keyof Step3VolumeServicesProps] as boolean}
                  onChange={(e) => props.onFieldChange(service.key, e.target.checked)}
                  className="w-4 h-4 rounded border-[#E3E5E8] text-[#6BCFCF] focus:ring-2 focus:ring-[#6BCFCF]/20"
                />
                <span className="text-sm text-[#0F172A]">{service.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Autres besoins */}
        <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8]">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">Autres besoins (facultatif)</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {OTHER_NEEDS.map((need) => (
                <label
                  key={need.key}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E3E5E8] cursor-pointer hover:border-[#6BCFCF] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={props[need.key as keyof Step3VolumeServicesProps] as boolean}
                    onChange={(e) => props.onFieldChange(need.key, e.target.checked)}
                    className="w-4 h-4 rounded border-[#E3E5E8] text-[#6BCFCF] focus:ring-2 focus:ring-[#6BCFCF]/20"
                  />
                  <span className="text-sm text-[#0F172A]">{need.label}</span>
                </label>
              ))}
            </div>
            
            <textarea
              value={props.specificNotes}
              onChange={(e) => props.onFieldChange("specificNotes", e.target.value)}
              placeholder="Précisions supplémentaires..."
              rows={3}
              className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
            />
          </div>
        </div>

        {/* Error message */}
        {props.error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-900">{props.error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={props.isSubmitting || !isSurfaceValid}
          className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#1E293B] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <span>{props.isSubmitting ? "Enregistrement..." : "Continuer vers les photos"}</span>
          {!props.isSubmitting && (
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
        </button>

        <p className="text-center text-sm text-[#1E293B]/60">
          ⏱️ Dernière étape : photos pour des devis précis
        </p>
      </form>
    </div>
  );
}

