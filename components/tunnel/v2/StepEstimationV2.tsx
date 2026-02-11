"use client";

import { FormEvent } from "react";
import { PriceRangeInline } from "@/components/tunnel/PriceRangeInline";

interface StepEstimationV2Props {
  volume: number | null;
  routeDistanceKm?: number | null;
  displayDistanceKm?: number | null;
  priceMin: number | null;
  priceMax: number | null;
  formuleLabel?: string;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  debug?: boolean;
  debugRows?: Array<{ label: string; value: string }>;
}

export function StepEstimationV2({
  volume,
  routeDistanceKm = null,
  displayDistanceKm = null,
  priceMin,
  priceMax,
  formuleLabel = "Standard",
  onSubmit,
  isSubmitting,
  debug = false,
  debugRows = [],
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
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg space-y-4">
          <div>
            <p className="text-sm text-[#1E293B]/70">Basé sur des déménagements similaires</p>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6BCFCF] mb-2">
                💰 Budget estimé
              </p>
              <PriceRangeInline minEur={priceMin} maxEur={priceMax} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#64748B] mb-2">
                Pour
              </p>
              <p className="text-xl font-bold text-[#0F172A]">
                {volumeText} - {distanceText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Note: le prix affiché est basé sur la formule sélectionnée.
          Le choix de formule se fait en Step 3. */}
      <p className="text-xs text-center text-[#1E293B]/60">
        Estimation basée sur la formule {formuleLabel} — vous pourrez changer à l&apos;étape suivante.
      </p>

      {debug && debugRows.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
          <p className="text-sm font-semibold text-[#0F172A]">Debug — détail du calcul</p>
          <div className="mt-3 space-y-2 text-sm">
            {debugRows.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-4">
                <span className="text-[#1E293B]/70">{r.label}</span>
                <span className="font-semibold text-[#0F172A] tabular-nums text-right">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full rounded-xl bg-gradient-to-r from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8] border border-white/20 py-5 text-lg font-bold text-white shadow-[0_8px_30px_rgba(107,207,207,0.4)] hover:shadow-[0_12px_50px_rgba(107,207,207,0.6)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 overflow-hidden"
        >
          <span className="relative z-10">{isSubmitting ? "Chargement..." : "Affiner mon devis"}</span>
          
          {/* Gradient hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#A8E6D8] to-[#6BCFCF] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
        <p className="text-center text-sm text-[#1E293B]/70">~1 min restante</p>
      </div>
    </form>
  );
}
