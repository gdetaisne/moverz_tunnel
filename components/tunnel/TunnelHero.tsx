"use client";

import { useEffect, useState } from "react";

interface TunnelHeroProps {
  currentStep: number;
  totalSteps: number;
}

export default function TunnelHero({ currentStep, totalSteps }: TunnelHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const progress = (currentStep / totalSteps) * 100;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white py-8 md:py-16">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div 
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative"
        style={{
          animation: mounted ? 'fadeInUp 1s ease-out' : 'none',
        }}
      >
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold mb-4 md:mb-6 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#6BCFCF] animate-pulse" />
            <span>Demande de devis gratuite</span>
          </div>

          {/* Marketing copy (desktop only) */}
          <div className="hidden md:block">
            <h1 className="text-5xl font-bold mb-4 leading-tight">
              3 à 5 devis comparables
              <br />
              <span className="text-[#6BCFCF]">en 3 minutes</span>
            </h1>
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              Des déménageurs locaux contrôlés • Estimation par photos • 0 spam
            </p>
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/60">Progression</span>
              <span className="text-white font-semibold">
                Étape {currentStep}/{totalSteps}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-[#6BCFCF] to-[#A8E8E8] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/50 mt-2">
              ~{Math.max(1, 4 - currentStep)} min restantes
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />
    </section>
  );
}

