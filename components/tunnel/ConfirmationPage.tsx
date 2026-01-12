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
    <div className="max-w-3xl mx-auto text-center">
      {/* Success icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mx-auto mb-8 animate-scale-in">
        <Check className="w-10 h-10 text-white" strokeWidth={3} />
      </div>

      {/* Title */}
      <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
        Merci {firstName} ! 🎉
      </h2>
      
      <p className="text-xl text-[#1E293B]/70 mb-8 leading-relaxed">
        Votre dossier est créé. Pour recevoir des devis <strong className="text-[#0F172A]">vraiment comparables</strong>,
        envoyez-nous des photos de <strong className="text-[#0F172A]">toutes vos pièces</strong>.
      </p>

      {/* Linking code (if available) */}
      {linkingCode && (
        <div className="inline-flex items-center gap-3 bg-[#F8F9FA] rounded-2xl px-6 py-4 mb-8 border border-[#E3E5E8]">
          <FileText className="w-5 h-5 text-[#6BCFCF]" />
          <div className="text-left">
            <p className="text-xs text-[#1E293B]/60 font-medium">Votre code dossier</p>
            <p className="text-lg font-bold text-[#0F172A] tracking-wider">{linkingCode}</p>
          </div>
        </div>
      )}

      {/* Pricing incentive */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="rounded-2xl border border-[#E3E5E8] bg-white p-6 shadow-sm text-left">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60">
                Votre estimation {estimateIsIndicative ? "indicative" : "actuelle"}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                {hasEstimate ? (
                  <>
                    {euro(estimateMinEur)} – {euro(estimateMaxEur)}
                  </>
                ) : (
                  <>Fourchette en cours de calcul</>
                )}
              </p>
              <p className="mt-1 text-sm text-[#1E293B]/70">
                Les photos réduisent l’incertitude → on évite les marges “au cas où”.
              </p>
            </div>

            <div className="rounded-2xl bg-[#0F172A] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Impact photos
              </p>
              <p className="mt-1 text-lg font-bold">
                {hasEstimate ? (
                  <>
                    jusqu’à {euro(savingsMax)}
                    <span className="text-sm font-semibold text-white/70">
                      {" "}
                      potentiel
                    </span>
                  </>
                ) : (
                  <>Plus de précision</>
                )}
              </p>
              <p className="mt-1 text-[11px] text-white/55">
                Indicatif (souvent ~{euro(savingsMin)}–{euro(savingsMax)}).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="max-w-md mx-auto mb-12 space-y-4">
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
                // Desktop upload: on passe l'id Back Office (source de vérité)
                const url = new URL("/upload-photos", window.location.origin);
                if (leadId) url.searchParams.set("leadId", leadId);
                if (linkingCode) url.searchParams.set("code", linkingCode); // affichage uniquement
                window.location.href = url.toString();
              }}
              disabled={!leadId}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white border-2 border-[#E3E5E8] px-8 py-4 text-base font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5 transition-all duration-200"
            >
              <Upload className="w-5 h-5" />
              <span>Ajouter mes photos depuis cet ordinateur</span>
            </button>
          </>
        )}
      </div>

      {/* What happens next */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E3E5E8] p-8 text-left">
        <h3 className="text-lg font-bold text-[#0F172A] mb-6 text-center">
          📋 Que se passe-t-il maintenant ?
        </h3>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold">
              1
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] mb-1">
                Vous envoyez vos photos (WhatsApp ou email)
              </p>
              <p className="text-sm text-[#1E293B]/70">
                Salon, chambres, cuisine, cave, garage, escaliers, parking...
                <br />
                <span className="text-[#6BCFCF] font-medium">Plus de photos = devis plus justes</span>
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
              2
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] mb-1">
                Notre IA prépare votre dossier en 30 secondes
              </p>
              <p className="text-sm text-[#1E293B]/70">
                Estimation volume, inventaire, dossier standardisé pour tous les déménageurs
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold">
              3
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] mb-1">
                Vous recevez 3 à 5 devis comparables
              </p>
              <p className="text-sm text-[#1E293B]/70">
                Sous 48-72h par email • Déménageurs locaux vérifiés • Prix basés sur la même estimation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Email confirmation */}
      {confirmationRequested && (
        <div className="mt-8 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center justify-center gap-2 text-sm text-blue-900">
            <Clock className="w-4 h-4" />
            <p>
              Un email de confirmation a été envoyé à <strong>{email}</strong>
            </p>
          </div>
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

