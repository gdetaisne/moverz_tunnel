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
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Check className="w-4 h-4" strokeWidth={3} />
          Dossier créé
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-[#0F172A] leading-tight">
          Bravo
        </h1>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6BCFCF]/10">
            <Mail className="h-6 w-6 text-[#6BCFCF]" strokeWidth={2} />
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

      <div className="rounded-2xl bg-[#F8FAFB] p-8 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6BCFCF]/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#64748B]">
            Récapitulatif de votre dossier
          </p>
        </div>

        {recapRows.length > 0 ? (
          <div className="mt-6 grid gap-3">
            {recapRows.map((r) => (
              <div
                key={r.label}
                className="flex items-start justify-between gap-4 rounded-xl bg-white px-5 py-4 border border-gray-100 shadow-sm"
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

