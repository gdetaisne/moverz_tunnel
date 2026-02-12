"use client";

import { InputHTMLAttributes, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  errorMessage?: string | null;
  icon?: LucideIcon;
  validated?: boolean;
  children?: ReactNode;
}

export function Field({
  label,
  helperText,
  errorMessage,
  icon: Icon,
  validated,
  className = "",
  required,
  type = "text",
  ...props
}: FieldProps) {
  const hasError = !!errorMessage;
  
  const inputClasses = [
    "w-full rounded-xl border-2 px-4 py-3 text-base text-[#0F172A] transition-all duration-200",
    hasError
      ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/15"
      : validated
      ? "border-[#10B981] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15"
      : "border-[#E3E5E8] focus:border-[#6BCFCF] focus:ring-4 focus:ring-[#6BCFCF]/20",
    "focus:outline-none focus:bg-white",
    className,
  ].join(" ");
  
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#6BCFCF]" strokeWidth={2} />
              </div>
            )}
            {label}
          </label>
          {required && (
            <span className="text-[11px] font-semibold text-[#1E293B]/50">Requis</span>
          )}
        </div>
      )}
      
      <div className="relative">
        <input
          type={type}
          className={inputClasses}
          {...props}
        />
        
        {validated && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {helperText && !errorMessage && (
        <p className="text-xs text-[#1E293B]/60">{helperText}</p>
      )}
      
      {errorMessage && (
        <p className="text-sm font-medium text-[#EF4444] flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
