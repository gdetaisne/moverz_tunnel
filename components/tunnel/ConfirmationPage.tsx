"use client";

import { useState, useEffect } from "react";
import { Check, Clock, FileText, Smartphone, Upload } from "lucide-react";
import WhatsAppCTA from "./WhatsAppCTA";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

interface ConfirmationPageProps {
  firstName: string;
  email: string;
  linkingCode?: string;
  confirmationRequested?: boolean;
  leadId?: string;
  estimateMinEur?: number | null;
  estimateMaxEur?: number | null;
  estimateIsIndicative?: boolean;
}

export default function ConfirmationPage({ 
  firstName, 
  email, 
  linkingCode,
  confirmationRequested = false,
  leadId,
  estimateMinEur = null,
  estimateMaxEur = null,
  estimateIsIndicative = false,
}: ConfirmationPageProps) {
  const { isMobile } = useDeviceDetection();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasEstimate =
    typeof estimateMinEur === "number" &&
    typeof estimateMaxEur === "number" &&
    Number.isFinite(estimateMinEur) &&
    Number.isFinite(estimateMaxEur) &&
    estimateMaxEur > 0;

  const euro = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  const savingsMin = hasEstimate ? Math.round(estimateMaxEur * 0.03) : 0;
  const savingsMax = hasEstimate ? Math.round(estimateMaxEur * 0.08) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero section with visual mockup */}
      <div className="grid lg:grid-cols-2 gap-8 items-center mb-12">
        {/* Left: Message */}
        <div className="text-center lg:text-left order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700 mb-4">
            <Check className="w-4 h-4" strokeWidth={3} />
            Dossier créé
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] mb-4 leading-tight">
            {firstName}, ajoutez vos photos
          </h2>
          
          <p className="text-xl text-[#1E293B]/70 mb-6">
            3 minutes sur WhatsApp = devis précis sans aller-retour
          </p>

          {/* Visual impact */}
          {hasEstimate && (
            <div className="rounded-2xl bg-[#F8F9FA] p-6 border border-[#E3E5E8]">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#1E293B]/60 mb-2">
                Avec photos
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-4xl font-black text-[#0F172A]">
                  {euro(savingsMax)}
                </p>
                <p className="text-lg text-[#1E293B]/70">d'économies</p>
              </div>
              <p className="text-sm text-[#1E293B]/60">
                Fourchette actuelle : {euro(estimateMinEur)} – {euro(estimateMaxEur)}
              </p>
            </div>
          )}
        </div>

        {/* Right: Visual mockup */}
        <div className="order-1 lg:order-2 relative">
          {/* iPhone mockup with photos grid */}
          <div className="relative mx-auto w-full max-w-[280px]">
            {/* Phone frame */}
            <div className="relative bg-[#0F172A] rounded-[3rem] p-4 shadow-2xl border-8 border-[#0F172A]">
              {/* Screen */}
              <div className="bg-white rounded-[2.5rem] overflow-hidden">
                {/* Header */}
                <div className="bg-[#0F172A] text-white p-4 text-center">
                  <p className="text-xs font-semibold">Photos à envoyer</p>
                  <p className="text-[10px] opacity-70">Toutes les pièces</p>
                </div>
                
                {/* Photos grid */}
                <div className="p-4 space-y-3 bg-[#F8F9FA]">
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl bg-gradient-to-br from-[#B7EAE3] to-[#E3E5E8] flex items-center justify-center relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==')] opacity-30" />
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/80">
                          <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* WhatsApp button mockup */}
                  <button className="w-full bg-[#25D366] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Envoyer sur WhatsApp
                  </button>
                </div>
              </div>
            </div>
            
            {/* Floating badge */}
            <div className="absolute -right-4 top-12 bg-white rounded-xl shadow-lg px-4 py-2 border border-[#E3E5E8] rotate-6">
              <p className="text-xs font-bold text-[#0F172A]">3 min</p>
              <p className="text-[10px] text-[#1E293B]/60">chrono</p>
            </div>
          </div>
        </div>
      </div>

      {/* Big visual CTA */}
      <div className="mb-12">
        <div className="bg-[#0F172A] rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-40" />
          
          <div className="relative">
            <p className="text-lg md:text-xl font-semibold mb-2 opacity-90">
              Photographiez <strong>toutes</strong> vos pièces
            </p>
            <p className="text-sm md:text-base opacity-70 mb-8 max-w-xl mx-auto">
              Salon, chambres, cuisine, cave, garage, escaliers, parking...
              Plus vous envoyez de photos, plus les devis sont justes.
            </p>

            {/* Action buttons */}
            <div className="max-w-md mx-auto space-y-4">
              <WhatsAppCTA 
                source="tunnel-confirmation" 
                linkingCode={linkingCode} 
                variant="primary"
              />

              {/* Desktop upload option */}
              {mounted && !isMobile && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-[#0F172A] text-white/60">ou</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const url = new URL("/upload-photos", window.location.origin);
                      if (leadId) url.searchParams.set("leadId", leadId);
                      if (linkingCode) url.searchParams.set("code", linkingCode);
                      window.location.href = url.toString();
                    }}
                    disabled={!leadId}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/10 border-2 border-white/20 px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition-all duration-200"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Depuis cet ordinateur</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compact next steps */}
      <div className="rounded-2xl bg-[#F8F9FA] p-6 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
          Prochaines étapes
        </p>
        <div className="mt-4 space-y-3 text-sm text-[#1E293B]/70">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
              <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
            </div>
            <p>Vous envoyez vos photos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
              <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
            </div>
            <p>Notre IA prépare votre dossier en 30s</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
              <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
            </div>
            <p>Vous recevez 3-5 devis sous 48-72h</p>
          </div>
        </div>
      </div>

      {/* Linking code - discret */}
      {linkingCode && (
        <div className="mt-6 text-center">
          <p className="text-xs text-[#1E293B]/50">
            Code dossier : <span className="font-mono text-[#2B7A78]">{linkingCode}</span>
          </p>
        </div>
      )}

      {/* Email confirmation */}
      {confirmationRequested && (
        <div className="mt-6 rounded-xl bg-blue-50 p-3 text-center text-xs text-blue-900">
          Email de confirmation envoyé à <strong>{email}</strong>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

