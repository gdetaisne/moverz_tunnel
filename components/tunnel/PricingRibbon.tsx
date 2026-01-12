import type { ReactNode } from "react";

function euro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

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
    <div className="fixed inset-x-0 bottom-3 z-50 px-3 sm:bottom-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-[#E3E5E8] bg-white/85 shadow-brand moverz-glass">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60">
                Estimation {isIndicative ? "indicative" : "en temps réel"}
              </p>
              <p className="truncate text-sm font-semibold text-[#0F172A]">
                {hasRange ? (
                  <>
                    {euro(minEur)} – {euro(maxEur)}
                  </>
                ) : (
                  <>Complétez votre projet pour voir une fourchette</>
                )}
              </p>
              <p className="text-[11px] text-[#1E293B]/55">
                {hasRange ? "Selon formule & options. Fourchette estimative." : " "}
              </p>
            </div>

            {leftSlot ? (
              <div className="flex-shrink-0">{leftSlot}</div>
            ) : (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center rounded-full bg-[#6BCFCF]/15 px-3 py-1 text-[11px] font-semibold text-[#2B7A78]">
                  Live
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


