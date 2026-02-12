"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  onComplete?: () => void;
}

export function CountUp({
  end,
  duration = 2000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  onComplete,
}: CountUpProps) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(easeOut * end);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [end, duration, onComplete]);
  
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(count);
  
  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
