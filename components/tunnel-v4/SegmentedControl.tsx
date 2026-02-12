/**
 * SegmentedControl Component V4 — Moverz Design System
 * Radio buttons stylisés pour choix Maison/Appartement, Étage, etc.
 * Border gris, selected turquoise
 */

"use client";

import { type ReactNode } from "react";

export interface SegmentOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlV4Props {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControlV4({
  options,
  value,
  onChange,
  name,
  label,
  disabled,
  className = "",
}: SegmentedControlV4Props) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--color-text)" }}
        >
          {label}
        </label>
      )}

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              className={`
                relative flex items-center justify-center gap-2
                px-4 py-3
                cursor-pointer
                transition-all duration-150
                ${disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}
              `}
              style={{
                borderRadius: "var(--radius-sm)",
                border: `1.5px solid ${
                  isSelected ? "var(--color-accent)" : "var(--color-border)"
                }`,
                background: isSelected
                  ? "rgba(14,165,166,0.04)"
                  : "var(--color-surface)",
              }}
            >
              {/* Hidden radio input */}
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="sr-only"
              />

              {/* Icon */}
              {option.icon && (
                <span
                  className="flex-shrink-0"
                  style={{
                    color: isSelected
                      ? "var(--color-accent)"
                      : "var(--color-text-secondary)",
                  }}
                >
                  {option.icon}
                </span>
              )}

              {/* Label */}
              <span
                className="text-sm font-medium"
                style={{
                  color: isSelected
                    ? "var(--color-accent)"
                    : "var(--color-text)",
                }}
              >
                {option.label}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <span
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
