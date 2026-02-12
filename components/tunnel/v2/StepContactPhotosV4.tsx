/**
 * StepContactPhotosV4 — Moverz V4 Design System
 * Écran 4: Confirmation "Bravo!"
 * 
 * ✅ Back-office safe: pas de changement de logique
 * ✅ Tracking safe: pas de changement de tracking
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Mail, Clock, TrendingDown, Shield } from "lucide-react";
import { CardV4 } from "@/components/tunnel-v4";
import { motion } from "framer-motion";

interface StepContactPhotosV4Props {
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

export function StepContactPhotosV4({
  leadId,
  estimateMinEur = null,
  estimateMaxEur = null,
  estimateIsIndicative = false,
  email = null,
  recap,
}: StepContactPhotosV4Props) {
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
    const rows: { label: string; value: string; icon: string }[] = [];

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
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4"
      >
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
          style={{
            background: "rgba(22,163,74,0.1)",
            border: "1px solid rgba(22,163,74,0.3)",
            color: "var(--color-success)",
          }}
        >
          <CheckCircle2 className="w-5 h-5" strokeWidth={3} />
          Dossier créé avec succès
        </div>

        <h1
          className="text-5xl sm:text-6xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
        >
          🎉 Bravo !
        </h1>
        
        <p
          className="text-lg sm:text-xl max-w-2xl mx-auto"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Votre demande de devis a bien été enregistrée
        </p>
      </motion.div>

      {/* Timeline */}
      <CardV4 padding="lg" animate>
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{
              background: "var(--color-accent-light)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <Clock className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
            >
              Ce qui se passe maintenant
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Votre déménagement en 3 étapes simples
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-accent)" }}
            >
              <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <p className="text-sm" style={{ color: "var(--color-text)" }}>
              Votre demande est reçue et analysée
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "var(--color-accent-light)",
                border: "2px solid var(--color-accent)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--color-accent)" }}
              />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Sélection des meilleurs pros de votre région (24-48h)
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "var(--color-border-light)",
                border: "2px solid var(--color-border)",
              }}
            />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Vous recevez jusqu'à 3 devis gratuits par email
            </p>
          </div>
        </div>
      </CardV4>

      {/* Email confirmation */}
      <CardV4 padding="md" animate>
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--color-accent-light)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <Mail className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
          </div>
          <div className="flex-1">
            <p
              className="text-sm font-semibold mb-1"
              style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
            >
              Confirmez votre email
              {normalizedEmail && (
                <span
                  className="ml-2 font-mono"
                  style={{ color: "var(--color-accent)" }}
                >
                  {normalizedEmail}
                </span>
              )}
            </p>
            <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Un email de confirmation vous a été envoyé. Pensez à vérifier vos spams si vous ne le voyez pas.
            </p>
            
            {confirmationState.status === "sent" && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(22,163,74,0.1)",
                  color: "var(--color-success)",
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                {confirmationState.message || "Email envoyé"}
              </div>
            )}
          </div>
        </div>
      </CardV4>

      {/* Récap dossier + Économies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Récap */}
        <CardV4 padding="md" animate>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{
                background: "var(--color-accent-light)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <FileText className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            </div>
            <p
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
            >
              Votre dossier
            </p>
          </div>

          {recapRows.length > 0 ? (
            <div className="space-y-2">
              {recapRows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg"
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-sm font-medium flex items-center gap-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span>{r.icon}</span>
                    {r.label}
                  </p>
                  <p
                    className="text-sm font-bold text-right"
                    style={{ color: "var(--color-text)" }}
                  >
                    {r.value}
                  </p>
                </div>
              ))}
              
              {hasEstimate && (
                <div
                  className="mt-4 p-4 rounded-xl"
                  style={{
                    background: "var(--color-accent-light)",
                    border: "1px solid var(--color-accent)",
                  }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-wide mb-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Estimation
                  </p>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
                  >
                    {euro(estimateMinEur!)} – {euro(estimateMaxEur!)}
                  </p>
                  {estimateIsIndicative && (
                    <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                      Estimation indicative, peut évoluer selon les détails
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Votre dossier est enregistré. Vous recevrez vos devis sous 48-72h.
            </p>
          )}
        </CardV4>

        {/* Économies potentielles */}
        {potentialSavings && (
          <CardV4
            padding="md"
            variant="highlighted"
            animate
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 flex items-center justify-center"
                style={{
                  background: "var(--color-accent)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <TrendingDown className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
              >
                Économies potentielles
              </p>
            </div>

            <div className="space-y-3">
              <div
                className="p-4 rounded-xl"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wide mb-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  En comparant 3 devis
                </p>
                <p
                  className="text-3xl font-bold tabular-nums"
                  style={{ fontFamily: "var(--font-sora)", color: "var(--color-success)" }}
                >
                  ~{euro(potentialSavings)}
                </p>
              </div>

              <div className="text-sm space-y-1.5" style={{ color: "var(--color-text-secondary)" }}>
                <p className="flex items-start gap-2">
                  <span style={{ color: "var(--color-accent)" }}>•</span>
                  <span>Comparez les tarifs et services</span>
                </p>
                <p className="flex items-start gap-2">
                  <span style={{ color: "var(--color-accent)" }}>•</span>
                  <span>Choisissez le meilleur rapport qualité-prix</span>
                </p>
              </div>
            </div>
          </CardV4>
        )}
      </div>

      {/* Rassurance anti-démarchage */}
      <CardV4 padding="md" animate className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(22,163,74,0.1)",
          }}
        >
          <Shield className="w-6 h-6" style={{ color: "var(--color-success)" }} />
        </div>
        <div className="flex-1">
          <p
            className="text-sm font-semibold mb-2"
            style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
          >
            🔒 Vos données sont protégées
          </p>
          <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-success)" }}>•</span>
              <span><strong>Aucun démarchage</strong> : Seuls les pros sélectionnés vous contactent</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-success)" }}>•</span>
              <span><strong>Données sécurisées</strong> : Vos informations ne sont jamais revendues</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-success)" }}>•</span>
              <span><strong>Vous gardez le contrôle</strong> : Acceptez ou refusez les devis en toute liberté</span>
            </li>
          </ul>
        </div>
      </CardV4>
    </div>
  );
}
