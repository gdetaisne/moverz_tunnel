"use client";

import { useState, useEffect } from "react";
import { Check, Clock, FileText, Upload } from "lucide-react";
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero section - simple */}
      <div className="mb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-6">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Dossier créé
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] mb-6 leading-[1.1]">
            Envoyez des photos <span className="text-[#6BCFCF]">(optionnel)</span>
          </h2>
          
          <p className="text-base md:text-lg text-[#1E293B]/70 mb-10 leading-relaxed max-w-2xl mx-auto">
            Avec des photos, les déménageurs voient exactement ce qu'ils déplacent : <strong>devis plus précis, moins de surprises le jour J</strong>. Mais pas d'inquiétude, vous recevrez vos devis dans tous les cas !
          </p>

          {/* Estimate display - simple info */}
          {hasEstimate && (
            <div className="relative rounded-3xl bg-white border border-[#E3E5E8] p-6 md:p-8 mb-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] max-w-md mx-auto">
              <div className="flex items-baseline gap-2 justify-center">
                <p className="text-sm text-[#1E293B]/60">Estimation actuelle :</p>
                <p className="text-2xl md:text-3xl font-bold text-[#0F172A]">
                  {euro(estimateMinEur)} - {euro(estimateMaxEur)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section - simple */}
      <div className="mb-16 text-center">
        <div className="max-w-md mx-auto space-y-3">
          {/* Main CTA: Terminer - most prominent */}
          <button
            onClick={() => {
              // Redirection vers la home ou fermeture du tunnel
              window.location.href = "https://moverz.fr";
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white hover:bg-[#1E293B] transition-all duration-200"
          >
            <Check className="w-5 h-5" />
            <span>Terminer et recevoir mes devis</span>
          </button>

          <p className="text-xs text-[#1E293B]/60 py-2">
            Vous recevrez vos devis par email dans les 48-72h
          </p>

          {/* Separator */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E3E5E8]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-[#1E293B]/50">Ou envoyer des photos maintenant</span>
            </div>
          </div>

          {/* Upload option */}
          <button
            onClick={() => {
              const url = new URL("/upload-photos", window.location.origin);
              if (leadId) url.searchParams.set("leadId", leadId);
              if (linkingCode) url.searchParams.set("code", linkingCode);
              window.location.href = url.toString();
            }}
            disabled={!leadId}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#E3E5E8] px-6 py-3 text-sm font-medium text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#F8F9FA] transition-all duration-200"
          >
            <Upload className="w-4 h-4" />
            <span>Uploader {mounted && !isMobile ? "depuis cet ordinateur" : "des photos"}</span>
          </button>
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
            <p>Votre dossier est créé et transmis aux déménageurs</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-100">
              <Clock className="w-3 h-3 text-blue-600" strokeWidth={3} />
            </div>
            <p>Si vous envoyez des photos, notre IA les analyse en 30s</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-100">
              <FileText className="w-3 h-3 text-blue-600" strokeWidth={3} />
            </div>
            <p>Vous recevez 3-5 devis par email sous 48-72h</p>
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
