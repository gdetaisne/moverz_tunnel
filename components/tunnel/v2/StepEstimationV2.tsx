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

      {/* Note: le prix affiché est basé sur la formule sélectionnée.
          Le choix de formule se fait en Step 3. */}
      <p className="text-xs text-center text-[#1E293B]/60">
        Estimation basée sur la formule {formuleLabel} — vous pourrez changer à l&apos;étape suivante.
      </p>

      {debug && debugRows.length > 0 && (
        <div className="rounded-2xl border border-[#E3E5E8] bg-white p-4">
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
          className="w-full rounded-full bg-[#0F172A] text-white font-semibold py-4 text-base hover:bg-[#1E293B] transition-all"
        >
          {isSubmitting ? "Chargement..." : "Affiner mon devis"}
        </button>
        <p className="text-center text-sm text-[#1E293B]/70">~1 min restante</p>
      </div>
    </form>
  );
}
