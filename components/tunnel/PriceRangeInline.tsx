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
      : (() => {
          // On pousse légèrement vers le max pour que le montant "à retenir"
          // soit plus proche de ce que le client anticipe comme prix final.
          // 0.5 = milieu; 0.6 = un peu plus haut.
          const CENTER_BIAS = 0.6;
          const raw = minEur + (maxEur - minEur) * CENTER_BIAS;
          // garde-fou: ne jamais dépasser le max
          return Math.min(raw, maxEur);
        })();

  const size =
    variant === "compact"
      ? {
          label: "text-[10px]",
          side: "text-xs",
          center: "text-xl",
        }
      : {
          label: "text-[11px]",
          side: "text-xs",
          center: "text-3xl",
        };

  return (
    <div
      className={[
        // Resserre (mobile-first) : moins de gap, meilleur alignement visuel
        "grid grid-cols-[1fr,auto,1fr] items-end gap-2",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      <div className="text-left">
        <p className={`${size.label} font-bold uppercase tracking-[0.2em] text-[#64748B]`}>
          min
        </p>
        <p className={`${size.side} font-bold text-emerald-500`}>{euro(minEur)}</p>
      </div>

      <div className="text-center">
        <p className={`${size.center} font-black text-[#0F172A] leading-[0.95]`}>
          {euro(calc)}
        </p>
      </div>

      <div className="text-right">
        <p className={`${size.label} font-bold uppercase tracking-[0.2em] text-[#64748B]`}>
          max
        </p>
        <p className={`${size.side} font-bold text-rose-400`}>{euro(maxEur)}</p>
      </div>
    </div>
  );
}

