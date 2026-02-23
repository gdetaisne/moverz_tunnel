"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { CardV4 } from "@/components/tunnel-v4";

interface PricingRecap {
  centerEur: number;
  minEur: number;
  maxEur: number;
  formuleLabel?: string;
  originCity?: string;
  destinationCity?: string;
  surfaceM2?: string;
}

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
  specificNotes: string;
  access_details: string;
  access_type: "simple" | "constrained";
  onFieldChange: (field: string, value: any) => void;
  onStartEnrichment?: () => void;
  onSaveEnrichment?: () => Promise<void>;
  isSavingEnrichment?: boolean;
  showPricingRecap?: boolean;
  pricingRecap?: PricingRecap;
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function StepContactPhotosV4({ leadId, email = null, showPricingRecap = false, pricingRecap }: StepContactPhotosV4Props) {
  const [mounted, setMounted] = useState(false);
  const requestOnceRef = useRef(false);
  const [confirmationState, setConfirmationState] = useState<
    { status: "idle" | "sent"; message?: string } | { status: "error"; message: string }
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
            Votre demande est bien enregistrée.
          </p>
        </div>
      </CardV4>

      {showPricingRecap && pricingRecap && (
        <CardV4 padding="lg">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
              Votre estimation
            </p>
            {pricingRecap.originCity && pricingRecap.destinationCity && (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {pricingRecap.originCity} → {pricingRecap.destinationCity}
                {pricingRecap.surfaceM2 ? ` · ${pricingRecap.surfaceM2} m²` : ""}
              </p>
            )}
            <p
              className="text-4xl sm:text-5xl font-bold tabular-nums"
              style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
            >
              {fmtEur(pricingRecap.centerEur)}
            </p>
            <p className="text-sm tabular-nums" style={{ color: "var(--color-text-muted)" }}>
              <span style={{ color: "#047857" }}>Min {fmtEur(pricingRecap.minEur)}</span>
              <span className="mx-2">·</span>
              <span style={{ color: "#b45309" }}>Max {fmtEur(pricingRecap.maxEur)}</span>
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Formule {pricingRecap.formuleLabel || "Standard"} · Estimation non contractuelle
            </p>
          </div>
        </CardV4>
      )}

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
              Cliquez sur le lien reçu pour activer votre dossier.
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

