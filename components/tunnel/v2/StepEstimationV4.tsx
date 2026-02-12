/**
 * StepEstimationV4 — Moverz V4 Design System
 * Écran 2: Affichage estimation avec moment "dopamine"
 * 
 * ✅ Back-office safe: pas de changement de logique
 * ✅ Tracking safe: pas de changement de tracking
 */

"use client";

import { FormEvent, useEffect, useState } from "react";
import { Truck, Calendar, TrendingDown, Sparkles, Shield, HelpCircle } from "lucide-react";
import { CardV4, ButtonV4 } from "@/components/tunnel-v4";
import { CountUp } from "@/app/devis-gratuits-v3/_ui/CountUp";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showContent, setShowContent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
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
  
  const centerPrice =
    priceMin != null && priceMax != null ? Math.round((priceMin + priceMax) / 2) : null;
  
  // Animation: skeleton 1s → reveal budget avec count-up
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Animation: chips apparaissent après le count-up
  useEffect(() => {
    if (showContent) {
      const timer = setTimeout(() => {
        setShowDetails(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [showContent]);
  
  return (
    <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8">
      {/* Hero: Budget estimé avec moment dopamine */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 justify-center">
          <div
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full"
            style={{
              background: "var(--color-accent-light)",
              color: "var(--color-accent)",
            }}
          >
            Estimation indicative
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-center leading-tight"
            style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
          >
            Votre budget estimé
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Basé sur {effectiveDistanceKm ? "des" : "plus de 1000"} déménagements similaires
          </p>
        </div>
        
        {/* Main estimation card */}
        <CardV4 padding="lg" animate>
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {!showContent ? (
                // Skeleton loading state
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 py-8"
                >
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "var(--color-accent)" }}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "var(--color-accent)" }}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "var(--color-accent)" }}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                  <div
                    className="h-12 mx-auto rounded"
                    style={{
                      width: "60%",
                      background: "var(--color-border-light)",
                    }}
                  />
                  <div
                    className="h-20 mx-auto rounded"
                    style={{
                      width: "80%",
                      background: "var(--color-border-light)",
                    }}
                  />
                </motion.div>
              ) : (
                // Content revealed avec count-up
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {/* Prix central avec count-up */}
                  <div className="text-center py-4">
                    <p
                      className="text-sm font-medium mb-3"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Budget estimé
                    </p>
                    <div
                      className="text-6xl sm:text-7xl font-bold leading-none tracking-tight tabular-nums"
                      style={{
                        fontFamily: "var(--font-sora)",
                        color: "var(--color-text)",
                      }}
                    >
                      {centerPrice ? (
                        <CountUp
                          end={centerPrice}
                          duration={1800}
                          suffix=" €"
                          className="inline-block"
                        />
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>—</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Fourchette min/max */}
                  <div
                    className="grid grid-cols-2 gap-4 pt-6"
                    style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                    <div
                      className="text-center p-4 rounded-lg"
                      style={{
                        background: "rgba(22,163,74,0.05)",
                        border: "1px solid rgba(22,163,74,0.2)",
                      }}
                    >
                      <p
                        className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center justify-center gap-1.5"
                        style={{ color: "var(--color-success)" }}
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        Minimum
                      </p>
                      <p
                        className="text-2xl font-bold tabular-nums"
                        style={{
                          fontFamily: "var(--font-sora)",
                          color: "var(--color-success)",
                        }}
                      >
                        {priceMin != null ? fmtEur(priceMin) : "—"}
                      </p>
                    </div>
                    <div
                      className="text-center p-4 rounded-lg"
                      style={{
                        background: "rgba(220,38,38,0.05)",
                        border: "1px solid rgba(220,38,38,0.2)",
                      }}
                    >
                      <p
                        className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center justify-center gap-1.5"
                        style={{ color: "var(--color-danger)" }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Maximum
                      </p>
                      <p
                        className="text-2xl font-bold tabular-nums"
                        style={{
                          fontFamily: "var(--font-sora)",
                          color: "var(--color-danger)",
                        }}
                      >
                        {priceMax != null ? fmtEur(priceMax) : "—"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardV4>
        
        {/* Chips explicatives (apparaissent après le count-up) */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {/* Distance */}
              <CardV4 padding="sm" className="flex items-start gap-3 hover:shadow-md transition-all">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-accent-light)" }}
                >
                  <Truck className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-bold uppercase tracking-wide mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Distance
                  </p>
                  <p
                    className="text-lg font-bold tabular-nums"
                    style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
                  >
                    {distanceText}
                  </p>
                  {originCity && destinationCity && (
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {originCity} → {destinationCity}
                    </p>
                  )}
                </div>
              </CardV4>
              
              {/* Volume */}
              <CardV4 padding="sm" className="flex items-start gap-3 hover:shadow-md transition-all">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-accent-light)" }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: "var(--color-accent)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-bold uppercase tracking-wide mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Volume
                  </p>
                  <p
                    className="text-lg font-bold tabular-nums"
                    style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
                  >
                    {volumeText}
                  </p>
                  {surfaceM2 && (
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      ~{surfaceM2} m² déclarés
                    </p>
                  )}
                </div>
              </CardV4>
              
              {/* Formule */}
              <CardV4 padding="sm" className="flex items-start gap-3 hover:shadow-md transition-all">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-accent-light)" }}
                >
                  <Calendar className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-bold uppercase tracking-wide mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Formule
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
                  >
                    {formuleLabel}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-accent)" }}>
                    Modifiable
                  </p>
                </div>
              </CardV4>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Rassurance + CTA */}
      <div className="space-y-4">
        <CardV4 padding="md" className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-accent-light)" }}
          >
            <Shield className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          </div>
          <div className="flex-1">
            <p
              className="text-sm font-semibold mb-2"
              style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
            >
              Pourquoi affiner en 60 secondes ?
            </p>
            <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <li className="flex items-start gap-2">
                <span style={{ color: "var(--color-accent)" }}>•</span>
                <span><strong>Budget ultra-précis</strong> : accès, date, densité</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "var(--color-accent)" }}>•</span>
                <span><strong>Devis sur-mesure</strong> : les pros voient vos besoins exacts</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "var(--color-accent)" }}>•</span>
                <span><strong>Zéro mauvaise surprise</strong> : prix final = prix estimé</span>
              </li>
            </ul>
          </div>
        </CardV4>
        
        <div className="space-y-3">
          <ButtonV4
            type="submit"
            variant="accent"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            Affiner mon estimation en 60 sec 🚀
          </ButtonV4>
          <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            ~1 minute • Gratuit • Sans engagement
          </p>
        </div>
      </div>
      
      {/* Debug rows (si activé) */}
      {debug && debugRows.length > 0 && (
        <CardV4 padding="md" className="space-y-3">
          <p
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "var(--color-text)" }}
          >
            <span
              className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
              style={{ background: "rgba(245,158,11,0.1)", color: "var(--color-warning)" }}
            >
              Debug
            </span>
            Détail du calcul
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
