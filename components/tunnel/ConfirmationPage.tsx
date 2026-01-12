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
    <div className="max-w-5xl mx-auto">
      {/* Hero section - moverz.fr style */}
      <div className="grid lg:grid-cols-[1fr,340px] gap-12 lg:gap-20 items-center mb-20">
        {/* Left: Message */}
        <div className="text-center lg:text-left order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-6">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Dossier créé
          </div>
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-[#0F172A] mb-6 leading-[1.1]">
            Photographiez <span className="text-[#6BCFCF]">toutes</span> vos pièces
          </h2>
          
          <p className="text-base md:text-lg text-[#1E293B]/70 mb-10 leading-relaxed">
            Plus vous envoyez de photos détaillées, plus les déménageurs peuvent estimer précisément <strong>le volume et le temps nécessaire</strong>
          </p>

          {/* Estimate impact - ULTRA SIMPLE */}
          {hasEstimate && (
            <div className="relative rounded-3xl bg-white border border-[#E3E5E8] p-8 md:p-10 mb-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6BCFCF]" />
              
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6BCFCF] mb-2">
                  Vous économisez
                </p>
                <p className="text-5xl md:text-6xl font-black text-[#0F172A] tracking-tight mb-1">
                  {euro(savingsMax)}
                </p>
                <p className="text-sm text-[#1E293B]/60">
                  en envoyant vos photos maintenant
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Realistic iPhone mockup - moverz.fr style */}
        <div className="order-1 lg:order-2 relative">
          <div className="relative mx-auto w-full max-w-[300px]">
            {/* Phone frame - cleaner */}
            <div className="relative bg-[#1a1a1a] rounded-[3rem] p-3 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a1a] rounded-b-3xl z-10" />
              
              {/* Screen */}
              <div className="bg-[#f5f5f7] rounded-[2.5rem] overflow-hidden relative">
                {/* Status bar */}
                <div className="h-12 bg-white flex items-center justify-between px-8 pt-2">
                  <span className="text-[10px] font-semibold">9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-3 border border-black rounded-sm" />
                  </div>
                </div>
                
                {/* Header */}
                <div className="bg-white px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">M</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A]">Moverz</p>
                      <p className="text-[10px] text-[#1E293B]/50">en ligne</p>
                    </div>
                  </div>
                </div>
                
                {/* Chat content */}
                <div className="p-3 space-y-2 h-[420px] overflow-hidden">
                  {/* Message bubble */}
                  <div className="flex justify-start mb-3">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-[10px] text-[#0F172A] leading-relaxed">
                        Bonjour! Envoyez-moi <strong>3 à 8 photos</strong> 📸 par pièce pour recevoir des devis précis 💰
                      </p>
                      <p className="text-[8px] text-[#1E293B]/40 mt-1">10:42</p>
                    </div>
                  </div>

                  {/* Photo grid bubbles - realistic */}
                  <div className="flex justify-end">
                    <div className="grid grid-cols-2 gap-1 max-w-[80%]">
                      {/* Real-looking photo thumbnails */}
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100" />
                        <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          Salon
                        </div>
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100" />
                        <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          Cuisine
                        </div>
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-50 to-rose-100" />
                        <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          Chambre
                        </div>
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-emerald-50 to-lime-100" />
                        <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          SdB
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="text-[8px] text-[#1E293B]/40">✓✓ 10:44</div>
                  </div>

                  {/* Response */}
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-[10px] text-[#0F172A]">
                        Parfait! 🎉 Vos <strong>3 à 5 devis</strong> arrivent sous <strong>48-72h</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="bg-white border-t border-gray-200 px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 bg-[#f5f5f7] rounded-full px-3 py-1.5 text-[10px] text-[#1E293B]/40">
                    iMessage
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#007AFF] flex items-center justify-center">
                    <span className="text-white text-xs">↑</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating badge - simpler */}
            <div className="absolute -right-6 top-20 bg-white rounded-xl shadow-md px-3 py-2 border border-gray-100">
              <p className="text-[10px] font-bold text-[#0F172A]">3 min</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - light style like moverz.fr */}
      <div className="mb-16 text-center">
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
                  <div className="w-full border-t border-[#E3E5E8]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-[#1E293B]/60">ou</span>
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white border-2 border-[#E3E5E8] px-8 py-4 text-base font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5 transition-all duration-200"
              >
                <Upload className="w-5 h-5" />
                <span>Depuis cet ordinateur</span>
              </button>
            </>
          )}
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

