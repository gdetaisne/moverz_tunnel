"use client";

import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rect" | "circle";
  width?: string;
  height?: string;
}

export function Skeleton({
  variant = "rect",
  width,
  height,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gradient-to-r from-[#E3E5E8] via-[#F8FAFB] to-[#E3E5E8] bg-[length:200%_100%]";
  
  const variantClasses = {
    text: "h-4 rounded",
    rect: "rounded-xl",
    circle: "rounded-full",
  };
  
  const customStyle = {
    ...style,
    width: width || (variant === "text" ? "100%" : undefined),
    height: height || (variant === "text" ? "1rem" : "4rem"),
    animation: "shimmer 2s infinite linear",
  };
  
  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={customStyle}
        {...props}
      />
    </>
  );
}
