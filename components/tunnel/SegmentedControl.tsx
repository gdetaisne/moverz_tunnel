/**
 * SegmentedControl Component — Design System V1 Premium
 * Radio button group with premium styling
 * Similar to iOS segmented control / Ramp.com button groups
 * 
 * Back-office safe: presentational wrapper for radio inputs
 */

"use client";

import type { ReactNode } from "react";

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SegmentedControlOption[];
  label?: string;
  helper?: string;
  error?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SegmentedControl({
  name,
  value,
  onChange,
  options,
  label,
  helper,
  error,
  className = "",
  size = "md",
}: SegmentedControlProps) {
  const sizeClasses = {
    sm: "h-10 text-sm",
    md: "h-input text-base",
    lg: "h-14 text-lg",
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}

      {/* Segmented control */}
      <div
        className={`
          inline-flex items-center gap-1
          p-1
          bg-bg-tertiary
          border border-border-neutral
          rounded-lg
          ${error ? "border-error" : ""}
        `}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          const isDisabled = option.disabled;

          return (
            <label
              key={option.value}
              className={`
                flex items-center justify-center gap-2
                px-4
                ${sizeClasses[size]}
                rounded-md
                font-medium
                cursor-pointer
                transition-all duration-fast
                
                ${
                  isSelected
                    ? "bg-surface-primary text-text-primary shadow-sm border border-border-neutral"
                    : "bg-transparent text-text-secondary hover:text-text-primary"
                }
                
                ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-surface-hover"
                }
              `}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={(e) => onChange(e.target.value)}
                disabled={isDisabled}
                className="sr-only"
              />
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>

      {/* Helper text or error message */}
      {helper && !error && (
        <p className="text-sm text-text-muted">{helper}</p>
      )}
      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
