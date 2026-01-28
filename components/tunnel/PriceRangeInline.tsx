import type { HTMLAttributes } from "react";

type Variant = "default" | "compact";

function roundUpToHundred(n: number): number {
  // Arrondi à la centaine supérieure (ex: 1118 -> 1200)
  return Math.ceil(n / 100) * 100;
}

function euro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(roundUpToHundred(n));
}

export function PriceRangeInline({
  minEur,
  maxEur,
  calculatedEur,
  variant = "default",
  className,
  ...rest
}: {
  minEur: number | null;
  maxEur: number | null;
  calculatedEur?: number | null;
  variant?: Variant;
} & HTMLAttributes<HTMLDivElement>) {
  const hasRange =
    typeof minEur === "number" &&
    typeof maxEur === "number" &&
    Number.isFinite(minEur) &&
    Number.isFinite(maxEur) &&
    maxEur > 0;

  if (!hasRange) {
    return (
      <div className={className} {...rest}>
        —
      </div>
    );
  }

  const calc =
    typeof calculatedEur === "number" && Number.isFinite(calculatedEur)
      ? calculatedEur
      : (minEur + maxEur) / 2;

  const size =
    variant === "compact"
      ? {
          label: "text-[10px]",
          side: "text-[11px]",
          center: "text-sm",
        }
      : {
          label: "text-[11px]",
          side: "text-xs",
          center: "text-2xl",
        };

  return (
    <div
      className={[
        "grid grid-cols-[1fr,auto,1fr] items-end gap-3",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      <div className="text-left">
        <p className={`${size.label} font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60`}>
          min
        </p>
        <p className={`${size.side} font-semibold text-[#14532D]`}>{euro(minEur)}</p>
      </div>

      <div className="text-center">
        <p className={`${size.center} font-black text-[#0F172A] leading-none`}>
          {euro(calc)}
        </p>
      </div>

      <div className="text-right">
        <p className={`${size.label} font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60`}>
          max
        </p>
        <p className={`${size.side} font-semibold text-[#7F1D1D]`}>{euro(maxEur)}</p>
      </div>
    </div>
  );
}

