"use client";

import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "gradient" | "glass";
  padding?: "sm" | "md" | "lg";
  hoverable?: boolean;
  children: ReactNode;
}

export function Card({
  variant = "default",
  padding = "md",
  hoverable = false,
  className = "",
  children,
  ...props
}: CardProps) {
  const baseClasses = "rounded-xl sm:rounded-2xl transition-all duration-500";
  
  const variantClasses = {
    default: "bg-white sm:bg-white/80 sm:backdrop-blur-xl border border-gray-100 sm:border-white/20 shadow-sm sm:shadow-[0_8px_32px_rgba(107,207,207,0.12)]",
    gradient: "bg-gradient-to-br from-[#A8E6D8] via-[#6BCFCF] to-[#A78BFA]/60 border border-white/20 shadow-xl shadow-[#6BCFCF]/20 relative overflow-hidden",
    glass: "bg-white/70 backdrop-blur-xl border border-gray-100 sm:border-white/30 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
  };
  
  const paddingClasses = {
    sm: "p-4 sm:p-6",
    md: "p-6 sm:p-8",
    lg: "p-6 sm:p-10",
  };
  
  const hoverClasses = hoverable ? "sm:hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)] sm:hover:scale-[1.01]" : "";
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${className}`}
      {...props}
    >
      {variant === "gradient" && (
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      )}
      <div className={variant === "gradient" ? "relative z-10" : ""}>
        {children}
      </div>
    </div>
  );
}
