/**
 * InlineHint Component — Design System V1 Premium
 * Small reassurance hints (e.g. "Numéro masqué", "0 démarchage")
 * Subtle, non-intrusive, premium styling
 * 
 * Back-office safe: presentational only
 */

import type { ReactNode } from "react";

export interface InlineHintProps {
  icon?: ReactNode;
  children: ReactNode;
  variant?: "default" | "success" | "info";
  className?: string;
}

export function InlineHint({
  icon,
  children,
  variant = "default",
  className = "",
}: InlineHintProps) {
  const variantClasses = {
    default: "text-text-muted",
    success: "text-success",
    info: "text-brand-primary",
  };

  return (
    <div
      className={`
        flex items-center gap-2
        text-sm
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
