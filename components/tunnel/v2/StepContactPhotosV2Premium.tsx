"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileText, Mail, Clock, Users, Sparkles, TrendingDown, Shield } from "lucide-react";
import { Card } from "@/app/devis-gratuits-v3/_ui/Card";
import { Badge } from "@/app/devis-gratuits-v3/_ui/Badge";
import { Stepper } from "@/app/devis-gratuits-v3/_ui/Stepper";

interface StepContactPhotosV2PremiumProps {
  leadId?: string | null;
  linkingCode?: string | null;
  estimateMinEur?: number | null;
  estimateMaxEur?: number | null;
  estimateIsIndicative?: boolean;
  email?: string | null;
  recap?: {
    originCity?: string | null;
    originPostalCode?: string | null;
    destinationCity?: string | null;
    destinationPostalCode?: string | null;
    movingDate?: string | null;
    formule?: string | null;
    surfaceM2?: string | null;
  };
}

export function StepContactPhotosV2Premium({
  leadId,
  estimateMinEur = null,
  estimateMaxEur = null,
  estimateIsIndicative = false,
  email = null,
  recap,
}: StepContactPhotosV2PremiumProps) {
  const [mounted, setMounted] = useState(false);
  const requestOnceRef = useRef(false);
  const [confirmationState, setConfirmationState] = useState<
    | { status: "idle" | "sending" | "sent"; message?: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!leadId) return;
    if (requestOnceRef.current) return;
    requestOnceRef.current = true;
    setConfirmationState({ status: "sent", message: "Email de confirmation envoyé" });
  }, [mounted, leadId]);

  const normalizedEmail = (email || "").trim().toLowerCase();

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

  const centerPrice = hasEstimate ? Math.round((estimateMinEur! + estimateMaxEur!) / 2) : null;
  const potentialSavings = centerPrice ? Math.round(centerPrice * 0.15) : null; // Économies potentielles ~15%

  const recapRows = useMemo(() => {
    const rows: { label: string; value: string; icon: any }[] = [];

    const origin = [recap?.originCity, recap?.originPostalCode]
      .filter(Boolean)
      .join(" ")
      .trim();
    const dest = [recap?.destinationCity, recap?.destinationPostalCode]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (origin) rows.push({ label: "Départ", value: origin, icon: "📍" });
    if (dest) rows.push({ label: "Arrivée", value: dest, icon: "🎯" });
    if (recap?.movingDate) rows.push({ label: "Date", value: String(recap.movingDate), icon: "📅" });
    if (recap?.formule) rows.push({ label: "Formule", value: String(recap.formule), icon: "⭐" });
    if (recap?.surfaceM2) rows.push({ label: "Surface", value: `${String(recap.surfaceM2)} m²`, icon: "🏠" });

    return rows;
  }, [
    recap?.originCity,
    recap?.originPostalCode,
    recap?.destinationCity,
    recap?.destinationPostalCode,
    recap?.movingDate,
    recap?.formule,
    recap?.surfaceM2,
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10">
      {/* Hero avec confetti CSS */}
      <div className="text-center space-y-4 relative">
        {/* Confetti decoratif */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-[#6BCFCF] rounded-full animate-bounce" style={{ animationDelay: "0s", animationDuration: "2s" }} />
          <div className="absolute top-10 right-1/4 w-1.5 h-1.5 bg-[#A78BFA] rounded-full animate-bounce" style={{ animationDelay: "0.3s", animationDuration: "2.2s" }} />
          <div className="absolute top-5 left-1/3 w-2.5 h-2.5 bg-[#10B981] rounded-full animate-bounce" style={{ animationDelay: "0.6s", animationDuration: "1.8s" }} />
          <div className="absolute top-0 right-1/3 w-1 h-1 bg-[#F59E0B] rounded-full animate-bounce" style={{ animationDelay: "0.9s", animationDuration: "2.5s" }} />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700 animate-in fade-in zoom-in duration-500">
          <Check className="w-5 h-5" strokeWidth={3} />
          Dossier créé avec succès
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-[#0F172A] leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
          🎉 Bravo !
        </h1>
        
        <p className="text-lg sm:text-xl text-[#1E293B]/70 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
          Votre demande de devis a bien été enregistrée
        </p>
      </div>

      {/* Timeline "Ce qui se passe maintenant" */}
      <Card variant="default" padding="lg" className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6BCFCF] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[#6BCFCF]/30">
            <Clock className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0F172A]">Ce qui se passe maintenant</p>
            <p className="text-xs text-[#1E293B]/60">Votre déménagement en 3 étapes simples</p>
          </div>
        </div>

        <Stepper
          variant="vertical"
          steps={[
            {
              label: "Votre demande est reçue et analysée",
              status: "completed",
            },
            {
              label: "Sélection des meilleurs pros de votre région (24-48h)",
              status: "current",
            },
            {
              label: "Vous recevez jusqu'à 3 devis gratuits par email",
              status: "upcoming",
            },
          ]}
        />
      </Card>

      {/* Email confirmation */}
      <Card variant="glass" padding="md" className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6BCFCF]/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0F172A] mb-1">
              Confirmez votre email
              {normalizedEmail && (
                <span className="ml-2 font-mono text-[#6BCFCF]">{normalizedEmail}</span>
              )}
            </p>
            <p className="text-sm text-[#1E293B]/70 mb-3">
              Un email de confirmation vous a été envoyé. Pensez à vérifier vos spams si vous ne le voyez pas.
            </p>
            
            {confirmationState.status === "sent" && (
              <Badge variant="success" size="sm">
                ✓ {confirmationState.message || "Email envoyé"}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Récap dossier + Économies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-400">
        {/* Récap */}
        <Card variant="default" padding="md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#A78BFA]" strokeWidth={2} />
            </div>
            <p className="text-sm font-bold text-[#0F172A]">Votre dossier</p>
          </div>

          {recapRows.length > 0 ? (
            <div className="space-y-2">
              {recapRows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#F8FAFB] border border-[#E3E5E8]"
                >
                  <p className="text-sm font-medium text-[#1E293B]/70 flex items-center gap-2">
                    <span>{r.icon}</span>
                    {r.label}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] text-right">{r.value}</p>
                </div>
              ))}
              
              {hasEstimate && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#6BCFCF]/10 to-[#A78BFA]/10 border border-[#6BCFCF]/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1E293B]/60 mb-2">
                    Estimation
                  </p>
                  <p className="text-2xl font-black text-[#0F172A] tabular-nums">
                    {euro(estimateMinEur!)} – {euro(estimateMaxEur!)}
                  </p>
                  {estimateIsIndicative && (
                    <p className="text-xs text-[#1E293B]/60 mt-2">
                      Estimation indicative, peut évoluer selon les détails
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#1E293B]/70">
              Votre dossier est enregistré. Vous recevrez vos devis sous 48-72h.
            </p>
          )}
        </Card>

        {/* Économies potentielles */}
        {potentialSavings && (
          <Card variant="gradient" padding="md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-bold text-white">Économies potentielles</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/90 backdrop-blur-xl border border-white/50">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1E293B]/60 mb-2">
                  En comparant 3 devis
                </p>
                <p className="text-3xl font-black text-[#10B981] tabular-nums">
                  ~{euro(potentialSavings)}
                </p>
              </div>

              <div className="text-sm text-white/90 space-y-1.5">
                <p className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span>Comparez les tarifs et services</span>
                </p>
                <p className="flex items-start gap-2">
                  <Users className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span>Choisissez le meilleur rapport qualité-prix</span>
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Rassurance anti-démarchage */}
      <Card variant="glass" padding="md" className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-[#10B981]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0F172A] mb-2">
              🔒 Vos données sont protégées
            </p>
            <ul className="space-y-1.5 text-sm text-[#1E293B]/80">
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span><strong>Aucun démarchage</strong> : Seuls les pros sélectionnés vous contactent</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span><strong>Données sécurisées</strong> : Vos informations ne sont jamais revendues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span><strong>Vous gardez le contrôle</strong> : Acceptez ou refusez les devis en toute liberté</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
