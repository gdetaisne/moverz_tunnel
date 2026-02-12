/**
 * Progress Component V4 — Moverz Design System
 * Barre fine turquoise (6px), transition smooth
 */

"use client";

export interface ProgressV4Props {
  value: number; // 0-100
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function ProgressV4({
  value,
  label,
  showPercent = true,
  className = "",
}: ProgressV4Props) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label + Percent */}
      {(label || showPercent) && (
        <div className="flex items-center justify-between">
          {label && (
            <p
              className="text-xs font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              {label}
            </p>
          )}
          {showPercent && (
            <p
              className="text-xs font-semibold tabular-nums"
              style={{ color: "var(--color-accent)" }}
            >
              {Math.round(clampedValue)}%
            </p>
          )}
        </div>
      )}

      {/* Progress container */}
      <div
        className="w-full h-1.5 overflow-hidden"
        style={{
          background: "var(--color-border-light)",
          borderRadius: "999px",
        }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Progress fill */}
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${clampedValue}%`,
            background: "var(--color-accent)",
            borderRadius: "999px",
          }}
        />
      </div>
    </div>
  );
}
