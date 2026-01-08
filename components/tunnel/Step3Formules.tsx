"use client";

import { useState, FormEvent } from "react";
import { Package, Home, Sparkles, ArrowRight, Check } from "lucide-react";

type FormuleType = "ECONOMIQUE" | "STANDARD" | "PREMIUM";

interface Step3FormulesProps {
  surfaceM2: string;
  formule: FormuleType;
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

export default function Step3Formules({
  surfaceM2,
  formule,
  onFieldChange,
  onSubmit,
  isSubmitting,
  error,
}: Step3FormulesProps) {
  const surface = parseInt(surfaceM2) || 60;
  const isSurfaceValid = surface >= 10 && surface <= 500;

  // Pricing adjusté selon formule
  const getPricing = () => {
    const volumeM3 = Math.round(surface * 0.7);
    let pricePerM2Min = 12;
    let pricePerM2Max = 20;

    if (formule === "ECONOMIQUE") {
      pricePerM2Min = 10;
      pricePerM2Max = 15;
    } else if (formule === "STANDARD") {
      pricePerM2Min = 15;
      pricePerM2Max = 22;
    } else if (formule === "PREMIUM") {
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
    <div className="grid lg:grid-cols-2 gap-12 items-start">
      {/* Left: Form */}
      <div className="order-2 lg:order-1">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/10 px-4 py-1.5 text-sm font-semibold text-[#0F172A] mb-6">
            <span className="h-2 w-2 rounded-full bg-[#6BCFCF]" />
            Étape 3/4
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4 leading-tight">
            Surface et formule
          </h2>
          
          <p className="text-lg text-[#1E293B]/70 leading-relaxed">
            Pour estimer le volume et vous proposer la formule adaptée.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Surface */}
          <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8]">
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Surface approximative (m²)
            </label>
            <div className="relative">
              <input
                type="number"
                value={surfaceM2}
                onChange={(e) => onFieldChange("surfaceM2", e.target.value)}
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
              <p className="text-sm text-red-600 mt-2">
                Surface entre 10 et 500 m²
              </p>
            )}
            <p className="text-xs text-[#1E293B]/60 mt-2">
              💡 Approximation suffisante — les photos affineront l'estimation
            </p>
          </div>

          {/* Formules */}
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">
              Choisissez votre formule
            </h3>
            
            <div className="grid gap-4">
              {FORMULES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFieldChange("formule", f.id)}
                  className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                    formule === f.id
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
                      formule === f.id ? "bg-[#6BCFCF] text-white" : "bg-[#F8F9FA] text-[#0F172A]"
                    }`}>
                      {f.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-[#0F172A]">{f.label}</h4>
                        {formule === f.id && (
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

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !isSurfaceValid}
            className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#1E293B] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <span>{isSubmitting ? "Enregistrement..." : "Continuer vers les photos"}</span>
            {!isSubmitting && (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>

          <p className="text-center text-sm text-[#1E293B]/60">
            ⏱️ Dernière étape : photos pour des devis précis
          </p>
        </form>
      </div>

      {/* Right: Pricing preview mockup */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-8">
        <div className="relative w-full max-w-[400px] mx-auto">
          <div className="relative bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-8 border border-[#E3E5E8]">
            <div className="space-y-6">
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6BCFCF] to-[#A8E8E8] mx-auto">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                  Estimation IA
                </h3>
                <p className="text-sm text-[#1E293B]/70">
                  Volume estimé : <strong className="text-[#0F172A]">{pricing.volumeM3}m³</strong>
                </p>
              </div>

              {/* Price estimate */}
              <div className="p-4 rounded-2xl bg-[#6BCFCF]/10 border border-[#6BCFCF]/30">
                <p className="text-xs text-[#1E293B]/60 mb-1">
                  Fourchette {formule === "ECONOMIQUE" ? "Éco" : formule === "STANDARD" ? "Standard" : "Premium"}
                </p>
                <p className="text-3xl font-bold text-[#0F172A]">
                  {pricing.priceMin} - {pricing.priceMax}€
                </p>
                <p className="text-xs text-[#1E293B]/60 mt-2">
                  Prix final dans vos devis personnalisés
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                  <span className="text-[#1E293B]/70">Basé sur {surface}m²</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                  <span className="text-[#1E293B]/70">Affinage par photos IA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                  <span className="text-[#1E293B]/70">3-5 devis comparables</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[#E3E5E8] text-center">
                <p className="text-xs text-[#1E293B]/60">
                  📸 Ajoutez des photos pour un devis précis à ±5%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

