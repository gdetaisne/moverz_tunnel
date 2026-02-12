/**
 * StepContactPhotosV4 — Moverz V4 Design System (Simplified — moverz.fr style)
 * Écran 4: Confirmation "Bravo!"
 * 
 * ✅ Back-office safe
 * ✅ Tracking safe
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Mail, Clock } from "lucide-react";
import { CardV4 } from "@/components/tunnel-v4";

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
    { status: "idle" | "sending" | "sent"; message?: string } | { status: "error"; message: string }
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

  const recapRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [];

    const origin = [recap?.originCity, recap?.originPostalCode].filter(Boolean).join(" ").trim();
    const dest = [recap?.destinationCity, recap?.destinationPostalCode]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (origin) rows.push({ label: "Départ", value: origin });
    if (dest) rows.push({ label: "Arrivée", value: dest });
    if (recap?.movingDate) rows.push({ label: "Date", value: String(recap.movingDate) });
    if (recap?.formule) rows.push({ label: "Formule", value: String(recap.formule) });
    if (recap?.surfaceM2) rows.push({ label: "Surface", value: `${String(recap.surfaceM2)} m²` });

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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero */}
      <CardV4 padding="lg">
        <div className="text-center space-y-4">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold mx-auto"
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
            className="text-4xl sm:text-5xl font-bold"
            style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
          >
            Bravo !
          </h1>

          <p className="text-base sm:text-lg" style={{ color: "var(--color-text-secondary)" }}>
            Votre demande de devis a bien été enregistrée
          </p>
        </div>
      </CardV4>

      {/* Récap (déplacé ici, AVANT timeline) */}
      {recapRows.length > 0 && (
        <CardV4 padding="md">
          <div className="space-y-3">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Récapitulatif de votre demande
            </p>

            {recapRows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between gap-4 py-2"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {r.label}
                </p>
                <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
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
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
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
                    Estimation indicative
                  </p>
                )}
              </div>
            )}
          </div>
        </CardV4>
      )}

      {/* Timeline (déplacé après récap) */}
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Ce qui se passe maintenant
            </p>
          </div>

          <div className="space-y-3">
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

            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex-shrink-0"
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
        </div>
      </CardV4>

      {/* Email confirmation */}
      <CardV4 padding="md">
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
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
              Confirmez votre email
              {normalizedEmail && (
                <span className="ml-2 font-mono" style={{ color: "var(--color-accent)" }}>
                  {normalizedEmail}
                </span>
              )}
            </p>
            <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Un email de confirmation vous a été envoyé. Pensez à vérifier vos spams.
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
                {confirmationState.message || "Email de confirmation envoyé"}
              </div>
            )}
          </div>
        </div>
      </CardV4>
    </div>
  );
}
