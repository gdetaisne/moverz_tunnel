"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingDown, TrendingUp, HelpCircle, Shield, PhoneOff, CheckCircle, X } from "lucide-react";
import { CountUp } from "@/app/devis-gratuits-v3/_ui/CountUp";
import { Badge } from "@/app/devis-gratuits-v3/_ui/Badge";

interface PricingLine {
  key: "distance" | "density" | "kitchen" | "date" | "access";
  label: string;
  status: string;
  amountEur: number;
  confirmed?: boolean;
}

interface LiveEstimatePanelProps {
  refinedMinEur: number | null;
  refinedMaxEur: number | null;
  refinedCenterEur: number | null;
  firstEstimateMinEur?: number | null;
  firstEstimateMaxEur?: number | null;
  firstEstimateCenterEur?: number | null;
  lines?: PricingLine[];
  formuleLabel?: string;
  className?: string;
}

export function LiveEstimatePanel({
  refinedMinEur,
  refinedMaxEur,
  refinedCenterEur,
  firstEstimateMinEur,
  firstEstimateMaxEur,
  firstEstimateCenterEur,
  lines = [],
  formuleLabel = "Standard",
  className = "",
}: LiveEstimatePanelProps) {
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<string | null>(null);
  const previousCenterRef = useRef<number | null>(null);

  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  // Micro-animation: highlight la ligne qui vient de changer
  useEffect(() => {
    if (refinedCenterEur != null && previousCenterRef.current !== refinedCenterEur) {
      // Trouver quelle ligne a changé en comparant avec les props précédentes
      // Pour simplifier, on highlight la dernière ligne avec confirmed=true
      const lastConfirmedLine = lines.findLast((l) => l.confirmed && l.amountEur !== 0);
      if (lastConfirmedLine) {
        setHighlightedLine(lastConfirmedLine.key);
        setTimeout(() => setHighlightedLine(null), 500);
      }
      previousCenterRef.current = refinedCenterEur;
    }
  }, [refinedCenterEur, lines]);

  // Limiter à 5 drivers max (specs)
  const displayedLines = lines.slice(0, 5);

  return (
    <>
      {/* Desktop: Panneau sticky */}
      <aside className={`hidden lg:block ${className}`}>
        <div className="rounded-3xl bg-gradient-to-br from-gradient-panel-from via-turquoise to-gradient-panel-to/60 p-6 shadow-xl shadow-turquoise/20 border border-white/20 relative overflow-hidden">
          {/* Subtle white glow overlay */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Votre estimation</h3>
              <Badge variant="success" size="sm" className="bg-white/30 backdrop-blur-xl border-white/40 text-white animate-pulse">
                <span className="relative inline-flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                LIVE
              </Badge>
            </div>

            {/* Prix principal */}
            {typeof refinedCenterEur === "number" && (
              <div className="rounded-2xl bg-white/90 backdrop-blur-xl p-6 border border-white/50 shadow-lg shadow-white/30 relative overflow-hidden">
                {/* Accent line top */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#6BCFCF] to-transparent" />

                <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-primary/50 mb-3">
                  Budget affiné
                </p>

                <div className="text-center mb-5">
                  <p className="text-6xl font-black text-text-primary leading-none tracking-tight tabular-nums">
                    <CountUp
                      end={refinedCenterEur}
                      duration={200}
                      decimals={0}
                      prefix=""
                      suffix=" €"
                    />
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-text-primary/10">
                  <div className="text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-primary/40 mb-1.5">
                      Minimum
                    </p>
                    <p className="text-lg font-semibold text-success tabular-nums">
                      {typeof refinedMinEur === "number" ? fmtEur(refinedMinEur) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-primary/40 mb-1.5">
                      Maximum
                    </p>
                    <p className="text-lg font-semibold text-danger tabular-nums">
                      {typeof refinedMaxEur === "number" ? fmtEur(refinedMaxEur) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ajustements (max 5 drivers) */}
            {displayedLines.length > 0 && (
              <div className="space-y-3">
                <div className="mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/90">
                    Ajustements
                  </p>
                </div>

                <div className="space-y-2">
                  {displayedLines.map((line) => {
                    const isPositive = line.amountEur > 0;
                    const isNegative = line.amountEur < 0;
                    const isHighlighted = highlightedLine === line.key;

                    return (
                      <div
                        key={line.key}
                        className={[
                          "group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-xl border border-white/60 hover:bg-white hover:border-white shadow-sm hover:shadow-md transition-all duration-200",
                          isHighlighted && "ring-2 ring-turquoise shadow-glow-turquoise",
                        ].join(" ")}
                        style={{
                          animation: isHighlighted ? "highlight 500ms ease-out" : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isPositive
                                ? "bg-danger"
                                : isNegative
                                ? "bg-success"
                                : "bg-neutral"
                            }`}
                          />
                          <p className="text-sm font-medium text-text-primary truncate">
                            {line.label}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-semibold tabular-nums transition-all duration-150 ${
                            isPositive
                              ? "text-danger"
                              : isNegative
                              ? "text-success"
                              : "text-text-muted"
                          }`}
                        >
                          {line.amountEur > 0 ? "+" : ""}
                          {line.amountEur} €
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTA Détail */}
            <button
              type="button"
              onClick={() => setShowDetailDrawer(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/30 text-sm font-semibold text-white transition-all duration-200 hover:shadow-md"
            >
              <HelpCircle className="w-4 h-4" strokeWidth={2} />
              Voir le détail du calcul
            </button>

            {/* Trust line */}
            <div className="pt-4 border-t border-white/20 space-y-2">
              <div className="flex items-center gap-2 text-xs text-white/90">
                <CheckCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                <span>Entreprises vérifiées</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/90">
                <PhoneOff className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                <span>Numéro masqué</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/90">
                <Shield className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                <span>0 démarchage</span>
              </div>
            </div>

            {/* Première estimation (collapsible) */}
            {typeof firstEstimateCenterEur === "number" && (
              <details className="group/details">
                <summary className="cursor-pointer list-none rounded-xl bg-white/60 backdrop-blur-xl border border-white/60 hover:bg-white/80 hover:border-white shadow-sm hover:shadow-md p-4 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-primary/50 mb-1">
                      Première estimation
                    </p>
                    <p className="text-lg font-semibold text-text-primary/80 tabular-nums">
                        {fmtEur(firstEstimateCenterEur)}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-text-primary/50 transition-transform group-open/details:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3 px-4 pb-4">
                  <div className="text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-primary/40 mb-1">
                      Min
                    </p>
                    <p className="text-sm font-semibold text-success tabular-nums">
                      {typeof firstEstimateMinEur === "number"
                        ? fmtEur(firstEstimateMinEur)
                        : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-primary/40 mb-1">
                      Max
                    </p>
                    <p className="text-sm font-semibold text-danger tabular-nums">
                      {typeof firstEstimateMaxEur === "number"
                        ? fmtEur(firstEstimateMaxEur)
                        : "—"}
                    </p>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes highlight {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.02);
            }
            100% {
              transform: scale(1);
            }
          }
        `}</style>
      </aside>

      {/* Mobile: Bottom bar */}
      <div className="lg:hidden fixed left-0 right-0 bottom-20 bg-gradient-to-b from-transparent to-white/95 backdrop-blur pt-3 pb-1 px-4 z-20 pointer-events-none">
        <button
          type="button"
          onClick={() => setShowMobileSheet(true)}
          className="pointer-events-auto w-full rounded-xl border border-border bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <Badge
              variant="success"
              size="sm"
              className="bg-success/10 border-success/20 text-success"
            >
              <span className="relative inline-flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              LIVE
            </Badge>
            <div className="text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-body/60">
                Budget affiné
              </p>
              <p className="text-xl font-black text-text-primary tabular-nums">
                {typeof refinedCenterEur === "number" ? fmtEur(refinedCenterEur) : "—"}
              </p>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-turquoise"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      </div>

      {/* Mobile: Bottom sheet */}
      {showMobileSheet && (
        <div
          className="lg:hidden fixed inset-0 z-50 animate-in fade-in duration-300"
          onClick={() => setShowMobileSheet(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gradient-panel-from via-turquoise to-gradient-panel-to/60 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="sticky top-0 pt-3 pb-2 flex justify-center bg-gradient-to-b from-white/20 to-transparent">
              <div className="w-12 h-1.5 rounded-full bg-white/50" />
            </div>

            <div className="p-6 pb-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Votre estimation</h3>
                <button
                  type="button"
                  onClick={() => setShowMobileSheet(false)}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/30 transition-all"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              {/* Prix principal */}
              {typeof refinedCenterEur === "number" && (
                <div className="rounded-2xl bg-white/90 backdrop-blur-xl p-6 border border-white/50 shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-primary/50 mb-3">
                    Budget affiné
                  </p>
                  <div className="text-center mb-5">
                    <p className="text-5xl font-black text-text-primary leading-none tracking-tight tabular-nums">
                      {fmtEur(refinedCenterEur)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-text-primary/10">
                    <div className="text-left">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-text-primary/40 mb-1.5">
                        Minimum
                      </p>
                      <p className="text-base font-semibold text-success tabular-nums">
                        {typeof refinedMinEur === "number" ? fmtEur(refinedMinEur) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-text-primary/40 mb-1.5">
                        Maximum
                      </p>
                      <p className="text-base font-semibold text-danger tabular-nums">
                        {typeof refinedMaxEur === "number" ? fmtEur(refinedMaxEur) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ajustements */}
              {displayedLines.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/90">
                    Ajustements
                  </p>
                  <div className="space-y-2">
                    {displayedLines.map((line) => {
                      const isPositive = line.amountEur > 0;
                      const isNegative = line.amountEur < 0;

                      return (
                        <div
                          key={line.key}
                          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isPositive
                                ? "bg-danger"
                                : isNegative
                                ? "bg-success"
                                : "bg-neutral"
                            }`}
                          />
                          <p className="text-sm font-medium text-text-primary truncate">
                            {line.label}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            isPositive
                              ? "text-danger"
                              : isNegative
                              ? "text-success"
                              : "text-text-muted"
                          }`}
                          >
                            {line.amountEur > 0 ? "+" : ""}
                            {line.amountEur} €
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trust line */}
              <div className="pt-4 border-t border-white/20 space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <span>Entreprises vérifiées</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <PhoneOff className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <span>Numéro masqué</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <Shield className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <span>0 démarchage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: Drawer détail du calcul */}
      {showDetailDrawer && (
        <div
          className="hidden lg:block fixed inset-0 z-50 animate-in fade-in duration-300"
          onClick={() => setShowDetailDrawer(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[80vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-lg font-bold text-text-primary">Détail du calcul</h3>
              <button
                type="button"
                onClick={() => setShowDetailDrawer(false)}
                className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center transition-all"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-text-primary" strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 5 bullets max */}
              {displayedLines.map((line, idx) => (
                <div
                  key={line.key}
                  className="flex items-start gap-3 p-4 rounded-xl bg-surface-alt border border-border"
                >
                  <div className="w-8 h-8 rounded-full bg-turquoise/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-turquoise">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-primary mb-1">{line.label}</p>
                    <p className="text-xs text-text-body/70 mb-2">{line.status}</p>
                    <p
                      className={`text-base font-bold tabular-nums ${
                        line.amountEur > 0
                          ? "text-danger"
                          : line.amountEur < 0
                          ? "text-success"
                          : "text-text-muted"
                      }`}
                    >
                      {line.amountEur > 0 ? "+" : ""}
                      {line.amountEur} €
                    </p>
                  </div>
                  {line.amountEur > 0 ? (
                    <TrendingUp className="w-5 h-5 text-danger flex-shrink-0" strokeWidth={2} />
                  ) : line.amountEur < 0 ? (
                    <TrendingDown className="w-5 h-5 text-success flex-shrink-0" strokeWidth={2} />
                  ) : null}
                </div>
              ))}

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-text-body/60 text-center">
                  Formule {formuleLabel} • Calcul basé sur vos données déclarées
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
