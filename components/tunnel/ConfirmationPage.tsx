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
    <div className="max-w-2xl mx-auto text-center">
      {/* Success icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mx-auto mb-6 animate-scale-in shadow-lg">
        <Check className="w-10 h-10 text-white" strokeWidth={3} />
      </div>

      {/* Title */}
      <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-3">
        Merci {firstName}
      </h2>
      
      <p className="text-lg text-[#1E293B]/70 mb-10 max-w-md mx-auto">
        Dernière étape : ajoutez vos photos pour des devis vraiment justes.
      </p>

      {/* HERO INCENTIVE - Photos impact */}
      {hasEstimate && (
        <div className="relative mb-10 overflow-hidden rounded-3xl border-2 border-[#6BCFCF] bg-gradient-to-br from-[#6BCFCF]/10 via-white to-white p-8 shadow-brand">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#6BCFCF]/20 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2B7A78]">
              Avec photos
            </p>
            <p className="mt-3 text-5xl font-bold text-[#0F172A]">
              jusqu'à {euro(savingsMax)}
            </p>
            <p className="mt-2 text-base text-[#1E293B]/70">
              d'économies potentielles sur votre déménagement
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-[#1E293B]/70 backdrop-blur">
              <span className="font-mono text-xs text-[#2B7A78]">
                {euro(estimateMinEur)} – {euro(estimateMaxEur)}
              </span>
              → marge réduite grâce à vos photos
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="max-w-md mx-auto mb-8 space-y-4">
        {/* WhatsApp CTA (priority) */}
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
              <span>Ajouter depuis cet ordinateur</span>
            </button>
          </>
        )}
      </div>

      {/* Compact next steps */}
      <div className="rounded-2xl bg-[#F8F9FA] p-6 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
          Prochaines étapes
        </p>
        <div className="mt-4 space-y-3 text-sm text-[#1E293B]/70">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#6BCFCF]" />
            <p>Vous envoyez vos photos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#6BCFCF]" />
            <p>Notre IA prépare votre dossier en 30s</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#6BCFCF]" />
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

