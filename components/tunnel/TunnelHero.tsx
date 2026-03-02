"use client";

interface TunnelHeroProps {
  currentStep: number;
  totalSteps: number;
}

export default function TunnelHero({ currentStep, totalSteps }: TunnelHeroProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E5E7EB]">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="Moverz" className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-tight text-[#111827]">Moverz</span>
        </div>

        {/* Step + timing */}
        <div className="flex items-center gap-2 text-sm font-medium text-[#475569]">
          <span className="tabular-nums">Étape {currentStep}/{totalSteps}</span>
          <span className="text-[#D1D5DB]">·</span>
          <span className="text-[#0EA5A6]">
            {currentStep === 1 ? "~3 min" : currentStep === 2 ? "~2 min" : "~1 min"}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#F3F4F6]">
        <div
          className="h-full bg-[#0EA5A6] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        />
      </div>
    </header>
  );
}
