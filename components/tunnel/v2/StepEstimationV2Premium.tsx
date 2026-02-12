"use client";

import { FormEvent, useEffect, useState } from "react";
import { Sparkles, TrendingDown, Truck, Calendar, HelpCircle } from "lucide-react";
import { Card } from "@/app/devis-gratuits-v3/_ui/Card";
import { Button } from "@/app/devis-gratuits-v3/_ui/Button";
import { Badge } from "@/app/devis-gratuits-v3/_ui/Badge";
import { Skeleton } from "@/app/devis-gratuits-v3/_ui/Skeleton";
import { CountUp } from "@/app/devis-gratuits-v3/_ui/CountUp";
import { Tooltip } from "@/app/devis-gratuits-v3/_ui/Tooltip";

interface StepEstimationV2PremiumProps {
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

export function StepEstimationV2Premium({
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
}: StepEstimationV2PremiumProps) {
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
      <div className="space-y-4">
        <div className="flex items-center gap-3 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6BCFCF] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[#6BCFCF]/30 animate-pulse">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6BCFCF]">
              Votre estimation
            </p>
            <p className="text-sm text-[#1E293B]/70">
              Basée sur {effectiveDistanceKm ? "des" : "plus de 1000"} déménagements similaires
            </p>
          </div>
        </div>
        
        <Card variant="default" padding="lg" className="relative overflow-hidden">
          {/* Decorative gradient background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#6BCFCF]/10 to-[#A78BFA]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            {!showContent ? (
              // Skeleton loading state
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-[#6BCFCF] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-[#6BCFCF] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-[#6BCFCF] rounded-full animate-bounce" />
                </div>
                <Skeleton variant="text" width="60%" height="2rem" className="mx-auto" />
                <Skeleton variant="text" width="80%" height="4rem" className="mx-auto" />
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Skeleton variant="rect" height="3rem" />
                  <Skeleton variant="rect" height="3rem" />
                </div>
              </div>
            ) : (
              // Content revealed avec count-up
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Prix central avec count-up */}
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#1E293B]/60 mb-3">
                    Budget estimé
                  </p>
                  <div className="text-6xl sm:text-7xl font-black text-[#0F172A] leading-none tracking-tight tabular-nums mb-6">
                    {centerPrice ? (
                      <CountUp
                        end={centerPrice}
                        duration={1800}
                        suffix=" €"
                        className="inline-block bg-gradient-to-r from-[#6BCFCF] via-[#0F172A] to-[#A78BFA] bg-clip-text text-transparent"
                      />
                    ) : (
                      <span className="text-[#1E293B]/40">—</span>
                    )}
                  </div>
                </div>
                
                {/* Fourchette min/max */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E3E5E8]">
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2 flex items-center justify-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Minimum
                    </p>
                    <p className="text-2xl font-black text-emerald-600 tabular-nums">
                      {priceMin != null ? fmtEur(priceMin) : "—"}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Maximum
                    </p>
                    <p className="text-2xl font-black text-rose-600 tabular-nums">
                      {priceMax != null ? fmtEur(priceMax) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* Chips explicatives (apparaissent après le count-up) */}
        {showDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E3E5E8] hover:border-[#6BCFCF] hover:shadow-md transition-all duration-200">
              <div className="w-10 h-10 rounded-lg bg-[#6BCFCF]/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1E293B]/60">
                    Distance
                  </p>
                  <Tooltip
                    content="Distance calculée via les routes réelles (OSRM). Plus précise qu'une distance à vol d'oiseau."
                    iconOnly
                  />
                </div>
                <p className="text-lg font-black text-[#0F172A] tabular-nums">{distanceText}</p>
                {originCity && destinationCity && (
                  <p className="text-xs text-[#1E293B]/50 truncate">
                    {originCity} → {destinationCity}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E3E5E8] hover:border-[#6BCFCF] hover:shadow-md transition-all duration-200">
              <div className="w-10 h-10 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#A78BFA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1E293B]/60">
                    Volume
                  </p>
                  <Tooltip
                    content="Volume estimé selon votre surface et le type de logement. Affinage précis à l'étape suivante."
                    iconOnly
                  />
                </div>
                <p className="text-lg font-black text-[#0F172A] tabular-nums">{volumeText}</p>
                {surfaceM2 && (
                  <p className="text-xs text-[#1E293B]/50">~{surfaceM2} m² déclarés</p>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E3E5E8] hover:border-[#6BCFCF] hover:shadow-md transition-all duration-200">
              <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#10B981]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1E293B]/60">
                    Formule
                  </p>
                  <Tooltip
                    content="Vous pourrez choisir entre Éco, Standard et Premium à l'étape suivante."
                    iconOnly
                  />
                </div>
                <p className="text-lg font-black text-[#0F172A]">{formuleLabel}</p>
                <Badge variant="premium" size="sm" className="mt-1">
                  Modifiable
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Rassurance + CTA */}
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-r from-[#F0F9FF] to-[#F8FAFB] border border-[#E3E5E8] p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6BCFCF]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#6BCFCF]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#0F172A] mb-2">
                🎯 Pourquoi affiner en 60 secondes ?
              </p>
              <ul className="space-y-1.5 text-sm text-[#1E293B]/80">
                <li className="flex items-start gap-2">
                  <span className="text-[#6BCFCF] mt-0.5">•</span>
                  <span><strong>Budget ultra-précis</strong> : accès, date, densité</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#6BCFCF] mt-0.5">•</span>
                  <span><strong>Devis sur-mesure</strong> : les pros voient vos besoins exacts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#6BCFCF] mt-0.5">•</span>
                  <span><strong>Zéro mauvaise surprise</strong> : prix final = prix estimé</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            Affiner mon estimation en 60 sec 🚀
          </Button>
          <p className="text-center text-sm text-[#1E293B]/70">
            ~1 minute • Gratuit • Sans engagement
          </p>
        </div>
      </div>
      
      {/* Debug rows (si activé) */}
      {debug && debugRows.length > 0 && (
        <Card variant="glass" padding="md" className="space-y-3">
          <p className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-bold uppercase tracking-wide">Debug</span>
            Détail du calcul
          </p>
          <div className="space-y-2 text-sm">
            {debugRows.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-4">
                <span className="text-[#1E293B]/70">{r.label}</span>
                <span className="font-semibold text-[#0F172A] tabular-nums text-right">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </form>
  );
}
