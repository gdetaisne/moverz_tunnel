"use client";

interface TunnelHeroProps {
  currentStep: number;
  totalSteps: number;
}

export default function TunnelHero({ currentStep, totalSteps }: TunnelHeroProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E5E7EB]">
      <div className="flex items-center justify-between px-3 sm:px-5 h-10">
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
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg, #0EA5A6, #67E8F9, #0EA5A6)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s ease-in-out infinite",
            boxShadow: "0 0 8px rgba(14,165,166,0.5)",
            transition: "width 700ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>
    </header>
  );
}
