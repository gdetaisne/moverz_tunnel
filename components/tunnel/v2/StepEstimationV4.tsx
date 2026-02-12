/**
 * StepEstimationV4 — Moverz V4 Design System (Simplified — moverz.fr style)
 * Écran 2: Affichage estimation simple et clean
 * 
 * ✅ Back-office safe: pas de changement de logique
 * ✅ Tracking safe: pas de changement de tracking
 */

"use client";

import { FormEvent } from "react";
import { CardV4 } from "@/components/tunnel-v4";

interface StepEstimationV4Props {
  volume: number | null;
  routeDistanceKm?: number | null;
  displayDistanceKm?: number | null;
  priceMin: number | null;
  priceMax: number | null;
  formuleLabel?: string;
  originCity?: string;
  destinationCity?: string;
  surfaceM2?: string;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  debug?: boolean;
  debugRows?: Array<{ label: string; value: string }>;
}

export function StepEstimationV4({
  volume,
  routeDistanceKm = null,
  displayDistanceKm = null,
  priceMin,
  priceMax,
  formuleLabel = "Standard",
  originCity = "",
  destinationCity = "",
  surfaceM2 = "",
  onSubmit,
  isSubmitting,
  debug = false,
  debugRows = [],
}: StepEstimationV4Props) {
  const volumeText = volume != null ? `${volume} m³` : "—";
  const effectiveDistanceKm =
    displayDistanceKm != null && Number.isFinite(displayDistanceKm)
      ? displayDistanceKm
      : routeDistanceKm;
  const distanceText =
    effectiveDistanceKm != null && Number.isFinite(effectiveDistanceKm)
      ? `${Math.round(effectiveDistanceKm)} km`
      : "—";
  
  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <CardV4 padding="lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold w-fit mx-auto"
              style={{
                background: "var(--color-accent-light)",
                color: "var(--color-accent)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--color-accent)" }}
              />
              Estimation indicative
            </div>
            
            <h1
              className="text-3xl sm:text-4xl font-bold"
              style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
            >
              Votre budget estimé
            </h1>
            
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {originCity && destinationCity ? (
                <>
                  {originCity} → {destinationCity} · {surfaceM2 || volumeText}
                </>
              ) : (
                "Basé sur des déménagements similaires"
              )}
            </p>
          </div>
          
          {/* Prix fourchette */}
          <div className="text-center py-6 space-y-4">
            <p
              className="text-5xl sm:text-6xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
            >
              {priceMin != null && priceMax != null ? (
                <>
                  {fmtEur(priceMin)} – {fmtEur(priceMax)}
                </>
              ) : (
                <span style={{ color: "var(--color-text-muted)" }}>—</span>
              )}
            </p>
            
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Formule {formuleLabel} · Estimation non contractuelle
            </p>
          </div>
          
          {/* Details */}
          {effectiveDistanceKm != null && volume != null && (
            <div
              className="grid grid-cols-2 gap-4 pt-6"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="text-center">
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Distance
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
                >
                  {distanceText}
                </p>
              </div>
              <div className="text-center">
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Volume
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
                >
                  {volumeText}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardV4>
      
      {/* Rassurance simple */}
      <CardV4 padding="md">
        <div className="space-y-2">
          <p
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
          >
            Pourquoi affiner en 60 secondes ?
          </p>
          <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-accent)" }}>•</span>
              <span>Budget ultra-précis : accès, date, densité</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-accent)" }}>•</span>
              <span>Devis sur-mesure : les pros voient vos besoins exacts</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-accent)" }}>•</span>
              <span>Zéro mauvaise surprise : prix final = prix estimé</span>
            </li>
          </ul>
        </div>
      </CardV4>
      
      {/* CTA */}
      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full rounded-xl py-4 text-base font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-300 touch-manipulation overflow-hidden"
          style={{
            background: "var(--color-accent)",
            boxShadow: "0 4px 16px rgba(14,165,166,0.3)",
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isSubmitting ? "Chargement..." : "Affiner mon estimation"}
            {!isSubmitting && (
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </span>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            style={{ background: "var(--color-surface)" }}
          />
        </button>
        
        <p className="text-xs text-center font-medium" style={{ color: "var(--color-text-muted)" }}>
          Gratuit · Sans engagement · Sans appel
        </p>
      </div>
      
      {/* Debug rows (si activé) */}
      {debug && debugRows.length > 0 && (
        <CardV4 padding="md" className="space-y-3">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Debug — Détail du calcul
          </p>
          <div className="space-y-2 text-sm">
            {debugRows.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-4">
                <span style={{ color: "var(--color-text-secondary)" }}>{r.label}</span>
                <span
                  className="font-semibold tabular-nums text-right"
                  style={{ color: "var(--color-text)" }}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </CardV4>
      )}
    </form>
  );
}
