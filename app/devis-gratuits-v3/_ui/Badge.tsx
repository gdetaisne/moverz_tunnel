"use client";

import { HTMLAttributes, ReactNode } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "info" | "premium";
  size?: "sm" | "md";
  children: ReactNode;
}

export function Badge({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200";
  
  const variantClasses = {
    default: "bg-[#F8FAFB] text-[#0F172A] border border-[#E3E5E8]",
    success: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20",
    warning: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20",
    info: "bg-[#6BCFCF]/10 text-[#6BCFCF] border border-[#6BCFCF]/20",
    premium: "bg-gradient-to-r from-[#6BCFCF]/15 to-[#A78BFA]/15 text-[#A78BFA] border border-[#A78BFA]/40 shadow-sm",
  };
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] uppercase tracking-wide",
    md: "px-3 py-1.5 text-xs uppercase tracking-wider",
  };
  
  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
