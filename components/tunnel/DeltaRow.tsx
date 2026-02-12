/**
 * DeltaRow Component — Design System V1 Premium
 * Row showing pricing adjustment delta (+/- amount)
 * Used in live pricing summary (cart)
 * Subtle animation on value change
 * 
 * Back-office safe: presentational only
 */

"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface DeltaRowProps {
  label: string;
  amount: number; // Positive = increases price, Negative = decreases
  showIcon?: boolean;
  highlighted?: boolean;
  className?: string;
}

export function DeltaRow({
  label,
  amount,
  showIcon = true,
  highlighted = false,
  className = "",
}: DeltaRowProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger animation on amount change
  useEffect(() => {
    if (amount !== 0) {
      setIsAnimating(true);
      const timeout = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [amount]);

  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const isNeutral = amount === 0;

  const amountColor = isPositive
    ? "text-error"
    : isNegative
    ? "text-success"
    : "text-text-muted";

  const Icon = isPositive
    ? TrendingUp
    : isNegative
    ? TrendingDown
    : Minus;

  return (
    <div
      className={`
        flex items-center justify-between gap-3
        py-3 px-4
        rounded-md
        transition-all duration-base
        ${
          highlighted || isAnimating
            ? "bg-brand-primary-light ring-2 ring-brand-primary/20"
            : "bg-transparent hover:bg-surface-hover"
        }
        ${className}
      `}
    >
      {/* Label with optional icon */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showIcon && (
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${amountColor}`}
            strokeWidth={2}
          />
        )}
        <span className="text-sm font-medium text-text-primary truncate">
          {label}
        </span>
      </div>

      {/* Amount with animation */}
      <span
        className={`
          text-sm font-semibold tabular-nums
          ${amountColor}
          transition-all duration-fast
          ${isAnimating ? "scale-110" : "scale-100"}
        `}
      >
        {amount > 0 && "+"}
        {amount} €
      </span>
    </div>
  );
}
