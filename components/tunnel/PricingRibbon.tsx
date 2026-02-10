import type { ReactNode } from "react";
import { PriceRangeInline } from "@/components/tunnel/PriceRangeInline";

export default function PricingRibbon({
  minEur,
  maxEur,
  isIndicative,
  leftSlot,
}: {
  minEur: number | null;
  maxEur: number | null;
  isIndicative?: boolean;
  leftSlot?: ReactNode;
}) {
  const hasRange =
    typeof minEur === "number" &&
    typeof maxEur === "number" &&
    Number.isFinite(minEur) &&
    Number.isFinite(maxEur) &&
    maxEur > 0;

  return (
    <div className="sticky top-3 z-30">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E3E5E8] bg-white/80 px-4 py-3 shadow-sm moverz-glass sm:w-auto">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60">
              Estimation {isIndicative ? "indicative" : "live"}
            </p>
            <div className="truncate text-sm font-semibold text-[#0F172A]">
              {hasRange ? (
                <PriceRangeInline minEur={minEur} maxEur={maxEur} variant="compact" />
              ) : (
                <>Complétez pour voir une fourchette</>
              )}
            </div>
          </div>

          {leftSlot ? (
            <div className="flex-shrink-0">{leftSlot}</div>
          ) : (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center rounded-full bg-[#6BCFCF]/15 px-3 py-1 text-[11px] font-semibold text-[#2B7A78]">
                Fourchette
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


