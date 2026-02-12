/**
 * SummaryDrawer Component — Design System V1 Premium
 * Mobile pricing summary (bottom bar + drawer)
 * Opens from bottom on tap
 * 
 * Back-office safe: presentational only, data passed as props
 */

"use client";

import { useState, useEffect } from "react";
import { X, ChevronUp } from "lucide-react";
import { DeltaRow } from "./DeltaRow";
import { InlineHint } from "./InlineHint";
import { Shield, PhoneOff, CheckCircle } from "lucide-react";

export interface PricingDriver {
  key: string;
  label: string;
  amount: number;
  highlighted?: boolean;
}

export interface SummaryDrawerProps {
  priceCenter: number;
  priceMin: number;
  priceMax: number;
  drivers: PricingDriver[]; // Max 5
  formule?: string;
  className?: string;
}

export function SummaryDrawer({
  priceCenter,
  priceMin,
  priceMax,
  drivers,
  formule = "Standard",
  className = "",
}: SummaryDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  // Limit to top 5 drivers
  const topDrivers = drivers.slice(0, 5);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Bottom bar (collapsed state) */}
      <div
        className={`
          lg:hidden
          fixed left-0 right-0 bottom-0
          bg-surface-primary/95 backdrop-blur-sm
          border-t border-border-neutral
          shadow-xl
          z-fixed
          ${className}
        `}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="
            w-full
            flex items-center justify-between
            px-4 py-3
            text-left
            hover:bg-surface-hover
            transition-colors duration-fast
          "
          aria-label="Voir le détail de l'estimation"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-success-light text-success text-xs font-medium uppercase tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              Live
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Budget estimé
              </p>
              <p className="text-xl font-bold text-text-primary tabular-nums">
                {fmtEur(priceCenter)}
              </p>
            </div>
          </div>
          <ChevronUp className="w-5 h-5 text-text-muted" strokeWidth={2} />
        </button>
      </div>

      {/* Drawer (expanded state) */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-modal"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-bg-overlay animate-in fade-in duration-200" />

          {/* Drawer content */}
          <div
            className="
              absolute bottom-0 left-0 right-0
              max-h-[90vh] overflow-y-auto
              bg-surface-primary
              rounded-t-2xl
              shadow-2xl
              animate-in slide-in-from-bottom duration-300
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="sticky top-0 pt-3 pb-2 flex justify-center bg-surface-primary">
              <div className="w-12 h-1.5 rounded-full bg-neutral-300" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b border-border-neutral">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">
                  Votre estimation
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="
                    w-8 h-8 rounded-full
                    flex items-center justify-center
                    bg-bg-tertiary hover:bg-bg-secondary
                    text-text-secondary hover:text-text-primary
                    transition-all duration-fast
                  "
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Main price */}
            <div className="px-6 py-6">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                    Budget estimé
                  </p>
                  <p className="text-5xl font-bold text-text-primary tabular-nums leading-none">
                    {fmtEur(priceCenter)}
                  </p>
                </div>

                {/* Min/Max range */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-neutral">
                  <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                      Minimum
                    </p>
                    <p className="text-lg font-semibold text-success tabular-nums">
                      {fmtEur(priceMin)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                      Maximum
                    </p>
                    <p className="text-lg font-semibold text-error tabular-nums">
                      {fmtEur(priceMax)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Drivers (adjustments) */}
            {topDrivers.length > 0 && (
              <div className="px-6 py-4 border-t border-border-neutral bg-bg-secondary">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                  Ajustements
                </p>
                <div className="space-y-1">
                  {topDrivers.map((driver) => (
                    <DeltaRow
                      key={driver.key}
                      label={driver.label}
                      amount={driver.amount}
                      highlighted={driver.highlighted}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Trust hints */}
            <div className="px-6 py-4 border-t border-border-neutral space-y-2">
              <InlineHint icon={<CheckCircle className="w-4 h-4" />} variant="default">
                Entreprises vérifiées
              </InlineHint>
              <InlineHint icon={<PhoneOff className="w-4 h-4" />} variant="default">
                Numéro masqué
              </InlineHint>
              <InlineHint icon={<Shield className="w-4 h-4" />} variant="default">
                0 démarchage
              </InlineHint>
            </div>

            {/* Safe area padding for mobile */}
            <div className="h-8" />
          </div>
        </div>
      )}
    </>
  );
}
