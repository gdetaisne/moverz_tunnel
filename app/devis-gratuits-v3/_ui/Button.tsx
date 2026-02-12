"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "group relative inline-flex items-center justify-center font-bold transition-all duration-300 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-[#6BCFCF] sm:bg-gradient-to-r sm:from-[#A8E6D8] sm:via-[#6BCFCF] sm:to-[#5AB8B8] border border-white/20 text-white shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.4)] hover:bg-[#5AB8B8] sm:hover:shadow-[0_12px_50px_rgba(107,207,207,0.6)] sm:hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5 active:scale-[0.98]",
    ghost: "bg-transparent text-[#0F172A] hover:bg-[#F8FAFB] active:scale-[0.98]",
  };
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm rounded-lg",
    md: "px-6 py-3 text-base rounded-xl",
    lg: "px-8 py-4 sm:py-5 text-base sm:text-lg rounded-xl",
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      <span className="relative z-10">
        {isLoading ? "Chargement..." : children}
      </span>
      
      {/* Gradient hover overlay - primary desktop only */}
      {variant === "primary" && (
        <>
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-[#A8E6D8] to-[#6BCFCF] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </>
      )}
    </button>
  );
}
