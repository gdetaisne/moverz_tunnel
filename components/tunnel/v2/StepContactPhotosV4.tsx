/**
 * StepContactPhotosV4 — Moverz V4 Design System (Simplified — moverz.fr style)
 * Écran 4: Confirmation "Bravo!"
 * 
 * ✅ Back-office safe
 * ✅ Tracking safe
 */

"use client";

import { useEffect, useRef, useState } from "react";
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
  email = null,
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
              Un email de confirmation vous a été envoyé. Cliquez sur le lien reçu pour valider votre adresse.
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

      {/* Timeline */}
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Ce qui se passe maintenant
            </p>
          </div>

          <div className="space-y-3">
            {[
              "1. Vous validez votre mail",
              "2. Nous contactons les meilleurs déménageurs",
              "3. Nous centralisons toutes les réponses / devis",
              "4. On vous fait un récap dans 5 à 7 jours",
            ].map((text, idx) => (
              <div key={text} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    background: idx === 0 ? "var(--color-accent)" : "var(--color-accent-light)",
                    color: idx === 0 ? "#fff" : "var(--color-accent)",
                    border: idx === 0 ? "none" : "1px solid var(--color-accent)",
                  }}
                >
                  {idx + 1}
                </div>
                <p
                  className="text-sm"
                  style={{
                    color: idx === 0 ? "var(--color-text)" : "var(--color-text-secondary)",
                    fontWeight: idx === 0 ? 600 : 400,
                  }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardV4>
    </div>
  );
}
