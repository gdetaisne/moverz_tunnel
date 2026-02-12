/**
 * Field Component — Design System V1 Premium
 * Input field with label, helper text, validation states
 * Height: 48px (--height-input)
 * Spacing: consistent with design tokens
 * 
 * Back-office safe: wrapper component, no logic
 */

"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  helper?: string;
  error?: string;
  isValid?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  wrapperClassName?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  (
    {
      label,
      helper,
      error,
      isValid,
      leftIcon,
      rightIcon,
      className = "",
      wrapperClassName = "",
      disabled,
      ...inputProps
    },
    ref
  ) => {
    const hasError = !!error;
    const showValidIcon = isValid && !hasError && !disabled;

    return (
      <div className={`space-y-1.5 ${wrapperClassName}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputProps.id}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
            {inputProps.required && (
              <span className="ml-1 text-error" aria-label="requis">
                *
              </span>
            )}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            disabled={disabled}
            className={`
              w-full h-input px-4
              ${leftIcon ? "pl-10" : ""}
              ${showValidIcon || rightIcon || hasError ? "pr-10" : ""}
              bg-surface-primary
              border border-border-neutral
              rounded-lg
              text-base text-text-primary
              placeholder:text-text-muted
              transition-all duration-fast
              
              /* Focus state */
              focus:outline-none
              focus:border-border-focus
              focus:shadow-focus
              focus:ring-0
              
              /* Error state */
              ${hasError ? "border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]" : ""}
              
              /* Valid state */
              ${showValidIcon ? "border-success pr-10" : ""}
              
              /* Disabled state */
              disabled:bg-bg-tertiary
              disabled:text-text-disabled
              disabled:cursor-not-allowed
              disabled:border-border-neutral
              
              /* Hover state (not disabled) */
              hover:enabled:border-border-strong
              
              ${className}
            `}
            aria-invalid={hasError}
            aria-describedby={
              error
                ? `${inputProps.id}-error`
                : helper
                ? `${inputProps.id}-helper`
                : undefined
            }
            {...inputProps}
          />

          {/* Right icons (validation or custom) */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {showValidIcon && (
              <CheckCircle2
                className="w-5 h-5 text-success"
                aria-label="valide"
              />
            )}
            {hasError && (
              <AlertCircle
                className="w-5 h-5 text-error"
                aria-label="erreur"
              />
            )}
            {rightIcon && !showValidIcon && !hasError && (
              <div className="text-text-muted">{rightIcon}</div>
            )}
          </div>
        </div>

        {/* Helper text or error message */}
        {helper && !error && (
          <p
            id={`${inputProps.id}-helper`}
            className="text-sm text-text-muted"
          >
            {helper}
          </p>
        )}
        {error && (
          <p
            id={`${inputProps.id}-error`}
            className="text-sm text-error flex items-center gap-1.5"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Field.displayName = "Field";
