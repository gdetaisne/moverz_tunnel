"use client";
import { useEffect, useRef, useState } from "react";

interface TunnelHeroProps {
  currentStep: number;
  totalSteps: number;
}

export default function TunnelHero({ currentStep, totalSteps }: TunnelHeroProps) {
  const progress = (currentStep / totalSteps) * 100;
  const [flashing, setFlashing] = useState(false);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), 900);
    return () => clearTimeout(t);
  }, [currentStep]);

  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl z-40 bg-white/95 backdrop-blur-sm border-b border-[#E5E7EB]">
      <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 h-10">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <img src="/icon.png" alt="Moverz" className="h-5 w-auto" />
          <span className="text-sm font-bold tracking-tight text-[#111827]">Moverz</span>
        </div>

        {/* Step + timing */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#475569]">
          <span className="tabular-nums">Étape {currentStep}/{totalSteps}</span>
          <span className="text-[#D1D5DB]">·</span>
          <span className="text-[#0EA5A6] font-semibold">
            {currentStep === 1 ? "~3 min" : currentStep === 2 ? "~2 min" : "~1 min"}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#F3F4F6]">
        <div
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          className={`h-full bg-[#0EA5A6] transition-all duration-500 ease-out${flashing ? " progress-flash-anim" : ""}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
