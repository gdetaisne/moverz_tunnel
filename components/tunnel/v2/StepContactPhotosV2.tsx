"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileText, Mail } from "lucide-react";
interface StepContactPhotosV2Props {
  leadId?: string | null;
  // Conservé pour compat (ancien écran) — plus utilisé
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

export function StepContactPhotosV2({
  leadId,
  estimateMinEur = null,
  estimateMaxEur = null,
  estimateIsIndicative = false,
  email = null,
  recap,
}: StepContactPhotosV2Props) {
  const [mounted, setMounted] = useState(false);
  const requestOnceRef = useRef(false);
  const [confirmationState, setConfirmationState] = useState<
    | { status: "idle" | "sending" | "sent"; message?: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    setMounted(true);
  }, []);

  // L'email de confirmation est déclenché automatiquement par le Back Office
  // dès que le lead a un email et que les documents sont prêts.
  // Pas d'appel côté tunnel.
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

    const origin = [recap?.originCity, recap?.originPostalCode]
      .filter(Boolean)
      .join(" ")
      .trim();
    const dest = [recap?.destinationCity, recap?.destinationPostalCode]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (origin) rows.push({ label: "Départ", value: origin });
    if (dest) rows.push({ label: "Arrivée", value: dest });
    if (recap?.movingDate) rows.push({ label: "Date", value: String(recap.movingDate) });
    if (recap?.formule) rows.push({ label: "Formule", value: String(recap.formule) });
    if (recap?.surfaceM2) rows.push({ label: "Surface", value: `${String(recap.surfaceM2)} m²` });
    if (hasEstimate) {
      rows.push({
        label: "Estimation",
        value: `${euro(estimateMinEur!)} – ${euro(estimateMaxEur!)}`,
      });
    }

    return rows;
  }, [
    recap?.originCity,
    recap?.originPostalCode,
    recap?.destinationCity,
    recap?.destinationPostalCode,
    recap?.movingDate,
    recap?.formule,
    recap?.surfaceM2,
    hasEstimate,
    estimateMinEur,
    estimateMaxEur,
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10 border border-[#10B981]/30 px-3 py-1 text-xs font-semibold text-green-700 shadow-sm">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          Dossier créé
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-[#0F172A] leading-tight">
          Bravo
        </h1>
      </div>

      <div className="rounded-2xl border border-[#E3E5E8] bg-white/95 backdrop-blur-sm p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm">
            <Mail className="h-5 w-5 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0F172A]">
              Merci de confirmer votre adresse email
              {normalizedEmail ? (
                <>
                  {" "}
                  : <span className="font-mono">{normalizedEmail}</span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-[#1E293B]/70">
              Vous avez reçu un mail de confirmation{normalizedEmail ? ` sur ${normalizedEmail}` : ""}.
            </p>

            {confirmationState.status === "sending" && (
              <p className="mt-3 text-xs text-[#1E293B]/60">
                Envoi de l'email de confirmation…
              </p>
            )}
            {confirmationState.status === "sent" && (
              <p className="mt-3 text-xs text-green-700">
                {confirmationState.message || "Email de confirmation envoyé"}
              </p>
            )}
            {confirmationState.status === "error" && (
              <p className="mt-3 text-xs text-amber-700">
                {confirmationState.message} (pensez à vérifier vos spams)
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#F8F9FA] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6]/10 to-[#A78BFA]/10 shadow-sm flex items-center justify-center">
            <FileText className="h-4 w-4 text-[#8B5CF6]" strokeWidth={2} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
            Récapitulatif de votre dossier
          </p>
        </div>

        {recapRows.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {recapRows.map((r) => (
              <div
                key={r.label}
                className="flex items-start justify-between gap-4 rounded-xl bg-white/95 backdrop-blur-sm px-4 py-3 border border-[#E3E5E8] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                <p className="text-sm font-medium text-[#1E293B]/70">{r.label}</p>
                <p className="text-sm font-semibold text-[#0F172A] text-right">{r.value}</p>
              </div>
            ))}
            {estimateIsIndicative && hasEstimate && (
              <p className="text-xs text-[#1E293B]/60">
                Estimation indicative (elle peut évoluer selon les détails du dossier).
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#1E293B]/70">
            Votre dossier est bien enregistré. Vous recevrez vos devis sous 48–72h.
          </p>
        )}
      </div>
    </div>
  );
}

