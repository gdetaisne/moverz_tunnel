/**
 * Card Component V4 — Moverz Design System
 * Border gris fin, shadow discrète, radius 12px
 * Variant "highlighted" pour accent turquoise
 */

"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

export interface CardV4Props {
  children: ReactNode;
  variant?: "default" | "highlighted";
  padding?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
}

export function CardV4({
  children,
  variant = "default",
  padding = "md",
  className = "",
  animate = false,
}: CardV4Props) {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const variantStyles = {
    default: {
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      boxShadow: "var(--shadow-sm)",
    },
    highlighted: {
      background: "rgba(14,165,166,0.02)",
      border: "1px solid var(--color-accent)",
      boxShadow: "var(--shadow-md)",
    },
  };

  const cardContent = (
    <div
      className={`
        ${paddingClasses[padding]}
        ${className}
      `}
      style={{
        borderRadius: "var(--radius-md)",
        ...variantStyles[variant],
      }}
    >
      {children}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}
