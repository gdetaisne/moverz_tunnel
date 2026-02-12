/**
 * Input Component V4 — Moverz Design System
 * Border gris fin, focus turquoise accent, checkmark vert quand valide
 * Back-office safe: wrapper component, no logic
 */

"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface InputV4Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  helper?: string;
  error?: string;
  isValid?: boolean;
  wrapperClassName?: string;
}

export const InputV4 = forwardRef<HTMLInputElement, InputV4Props>(
  (
    {
      label,
      helper,
      error,
      isValid,
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
            className="block text-sm font-medium"
            style={{ color: "var(--color-text)" }}
          >
            {label}
            {inputProps.required && (
              <span className="ml-1" style={{ color: "var(--color-danger)" }} aria-label="requis">
                *
              </span>
            )}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Input */}
          <input
            ref={ref}
            disabled={disabled}
            className={`
              w-full
              px-3.5 py-2.5
              text-sm
              outline-none
              transition-all duration-150
              font-inter
              
              ${showValidIcon || hasError ? "pr-10" : ""}
              
              ${
                hasError
                  ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]"
                  : showValidIcon
                  ? "border-[var(--color-accent)]"
                  : "border-[var(--color-border)] focus:border-[var(--color-accent)]"
              }
              
              ${disabled ? "opacity-50 cursor-not-allowed bg-[var(--color-border-light)]" : "bg-[var(--color-surface)]"}
            `}
            style={{
              borderRadius: "var(--radius-sm)",
              borderWidth: "1px",
              borderStyle: "solid",
              color: "var(--color-text)",
              boxShadow: inputProps.value || inputProps.defaultValue 
                ? "0 0 0 3px rgba(14,165,166,0.08)" 
                : hasError 
                ? "0 0 0 3px rgba(220,38,38,0.08)"
                : "none",
            }}
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

          {/* Icons (validation) */}
          <AnimatePresence>
            {showValidIcon && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <CheckCircle2
                  className="w-4 h-4"
                  style={{ color: "var(--color-accent)" }}
                  aria-label="valide"
                />
              </motion.div>
            )}
            {hasError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <AlertCircle
                  className="w-4 h-4"
                  style={{ color: "var(--color-danger)" }}
                  aria-label="erreur"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Helper text or error message */}
        {helper && !error && (
          <p
            id={`${inputProps.id}-helper`}
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {helper}
          </p>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            id={`${inputProps.id}-error`}
            className="text-xs flex items-center gap-1.5"
            style={{ color: "var(--color-danger)" }}
            role="alert"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{error}</span>
          </motion.p>
        )}
      </div>
    );
  }
);

InputV4.displayName = "InputV4";
