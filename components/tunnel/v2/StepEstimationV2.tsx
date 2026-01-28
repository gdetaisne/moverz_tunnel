"use client";

import { FormEvent } from "react";
import { PriceRangeInline } from "@/components/tunnel/PriceRangeInline";

interface StepEstimationV2Props {
  volume: number | null;
  routeDistanceKm?: number | null;
  displayDistanceKm?: number | null;
  priceMin: number | null;
  priceMax: number | null;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  pricingByFormule?: {
    ECONOMIQUE: { priceMin: number; priceMax: number };
    STANDARD: { priceMin: number; priceMax: number };
    PREMIUM: { priceMin: number; priceMax: number };
  } | null;
  selectedFormule: "ECONOMIQUE" | "STANDARD" | "PREMIUM";
  onFormuleChange: (v: "ECONOMIQUE" | "STANDARD" | "PREMIUM") => void;
}

export function StepEstimationV2({
  volume,
  routeDistanceKm = null,
  displayDistanceKm = null,
  priceMin,
  priceMax,
  onSubmit,
  isSubmitting,
  pricingByFormule = null,
  selectedFormule,
  onFormuleChange,
}: StepEstimationV2Props) {
  const volumeText = volume != null ? `${volume} m³` : "—";
  const effectiveDistanceKm =
    displayDistanceKm != null && Number.isFinite(displayDistanceKm)
      ? displayDistanceKm
      : routeDistanceKm;
  const distanceText =
    effectiveDistanceKm != null && Number.isFinite(effectiveDistanceKm)
      ? `${Math.round(effectiveDistanceKm)} km`
      : "—";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-3">
        <div className="rounded-2xl border border-[#E3E5E8] bg-white p-4 space-y-3">
          <div>
            <p className="text-sm text-[#1E293B]/70">Basé sur des déménagements similaires</p>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6BCFCF] mb-1">
                💰 Budget estimé
              </p>
              <PriceRangeInline minEur={priceMin} maxEur={priceMax} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60 mb-1">
                Pour
              </p>
              <p className="text-lg font-semibold text-[#0F172A]">
                {volumeText} - {distanceText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {pricingByFormule && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#0F172A]">Choisissez votre formule</p>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:snap-none">
            {[
              {
                id: "ECONOMIQUE" as const,
                label: "Éco",
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
                bullets: ["Tout inclus", "Emballage complet", "Clé en main"],
              },
            ].map((f) => {
              const price = pricingByFormule[f.id];
              const selected = selectedFormule === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFormuleChange(f.id)}
                  className={`w-[240px] flex-shrink-0 snap-start rounded-2xl border p-4 text-left transition-all duration-200 md:w-full md:flex-shrink md:snap-none ${
                    selected
                      ? "border-[#6BCFCF] bg-[#F0FAFA] shadow-sm"
                      : "border-[#E3E5E8] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-[#0F172A]">{f.label}</p>
                    {f.recommended && (
                      <span className="rounded-full bg-[#E7FAFA] px-2 py-0.5 text-[10px] font-semibold text-[#2B7A78]">
                        Recommandé
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <PriceRangeInline
                      minEur={price?.priceMin ?? null}
                      maxEur={price?.priceMax ?? null}
                      variant="compact"
                    />
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-[#1E293B]/70">
                    {f.bullets.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-[#0F172A] text-white font-semibold py-4 text-base hover:bg-[#1E293B] transition-all"
        >
          {isSubmitting ? "Chargement..." : "Affiner mon devis"}
        </button>
        <p className="text-center text-sm text-[#1E293B]/70">~1 min restante</p>
      </div>
    </form>
  );
}
