/**
 * Button Component V4 — Moverz Design System
 * Primary: Noir mat (#0B0F19)
 * Accent: Turquoise (#0EA5A6)
 * Hover: opacity 0.9 + scale 0.98
 */

"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonV4Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

export function ButtonV4({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonV4Props) {
  const sizeClasses = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const variantStyles = {
    primary: {
      background: "var(--color-text)", // Noir profond #0B0F19
      color: "#FFFFFF",
    },
    accent: {
      background: "var(--color-accent)", // Turquoise #0EA5A6
      color: "#FFFFFF",
    },
    secondary: {
      background: "var(--color-surface)",
      color: "var(--color-text)",
      border: "1px solid var(--color-border)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text-secondary)",
    },
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold font-inter
        outline-none
        transition-all duration-200
        
        ${sizeClasses[size]}
        
        ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.98]"}
        
        ${className}
      `}
      style={{
        borderRadius: "var(--radius-sm)",
        ...variantStyles[variant],
      }}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
