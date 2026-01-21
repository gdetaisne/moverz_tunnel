"use client";

import { FormEvent } from "react";

interface StepEstimationV2Props {
  volume: number | null;
  priceMin: number | null;
  priceMax: number | null;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
}

export function StepEstimationV2({
  volume,
  priceMin,
  priceMax,
  onSubmit,
  isSubmitting,
}: StepEstimationV2Props) {
  const budgetText =
    priceMin != null && priceMax != null
      ? `${priceMin} – ${priceMax} €`
      : "—";
  const volumeText = volume != null ? `${volume} m³` : "—";

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
              <p className="text-2xl font-bold text-[#0F172A]">{budgetText}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60 mb-1">
                📦 Volume estimé
              </p>
              <p className="text-lg font-semibold text-[#0F172A]">{volumeText}</p>
            </div>
          </div>
        </div>
      </div>

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
