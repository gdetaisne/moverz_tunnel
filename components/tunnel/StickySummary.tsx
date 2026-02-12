/**
 * StickySummary Component — Design System V1 Premium
 * Desktop sticky pricing summary (cart)
 * Shows live pricing with top 5 drivers
 * Premium, clean design (no pastel gradients)
 * 
 * Back-office safe: presentational only, data passed as props
 */

"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { DeltaRow } from "./DeltaRow";
import { InlineHint } from "./InlineHint";
import { Shield, PhoneOff, CheckCircle } from "lucide-react";

export interface PricingDriver {
  key: string;
  label: string;
  amount: number;
  highlighted?: boolean;
}

export interface StickySummaryProps {
  priceCenter: number;
  priceMin: number;
  priceMax: number;
  drivers: PricingDriver[]; // Max 5
  formule?: string;
  showDetail?: boolean;
  onDetailClick?: () => void;
  className?: string;
}

export function StickySummary({
  priceCenter,
  priceMin,
  priceMax,
  drivers,
  formule = "Standard",
  showDetail = true,
  onDetailClick,
  className = "",
}: StickySummaryProps) {
  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  // Limit to top 5 drivers
  const topDrivers = drivers.slice(0, 5);

  return (
    <aside
      className={`
        hidden lg:block
        sticky top-28
        ${className}
      `}
    >
      <div
        className="
          rounded-xl
          bg-surface-primary
          border border-border-neutral
          shadow-lg
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-neutral bg-bg-secondary">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">
              Votre estimation
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-success-light text-success text-xs font-medium uppercase tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              Live
            </span>
          </div>
        </div>

        {/* Main price */}
        <div className="px-6 py-6 bg-surface-primary">
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

        {/* Detail link */}
        {showDetail && onDetailClick && (
          <div className="px-6 py-4 border-t border-border-neutral">
            <button
              onClick={onDetailClick}
              className="
                w-full
                inline-flex items-center justify-center gap-2
                text-sm font-medium text-brand-primary
                hover:text-brand-primary-hover
                transition-colors duration-fast
              "
            >
              <HelpCircle className="w-4 h-4" strokeWidth={2} />
              Voir le détail du calcul
            </button>
          </div>
        )}

        {/* Trust hints */}
        <div className="px-6 py-4 border-t border-border-neutral bg-bg-secondary space-y-2">
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
      </div>
    </aside>
  );
}
