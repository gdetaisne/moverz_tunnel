"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileText, Mail } from "lucide-react";
import { requestBackofficeConfirmation } from "@/lib/api/client";

interface ConfirmationPageProps {
  firstName: string;
  email: string;
  linkingCode?: string;
  // Conservé pour compat (ancien écran) — plus utilisé
  confirmationRequested?: boolean;
  leadId?: string;
  estimateMinEur?: number | null;
  estimateMaxEur?: number | null;
  estimateIsIndicative?: boolean;
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

export default function ConfirmationPage({
  firstName,
  email,
  linkingCode,
  leadId,
  estimateMinEur = null,
  estimateMaxEur = null,
  estimateIsIndicative = false,
  recap,
}: ConfirmationPageProps) {
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

    const storageKey = `moverz_confirmation_requested_${leadId}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "1") {
      setConfirmationState({ status: "sent", message: "Email de confirmation envoyé" });
      return;
    }

    setConfirmationState({ status: "sending" });
    (async () => {
      try {
        const res = await requestBackofficeConfirmation(leadId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, "1");
        }
        setConfirmationState({ status: "sent", message: res.message });
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible d'envoyer l'email de confirmation.";
        setConfirmationState({ status: "error", message: msg });
      }
    })();
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

    if (firstName?.trim()) rows.push({ label: "Prénom", value: firstName.trim() });

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
    if (linkingCode) rows.push({ label: "Code dossier", value: linkingCode });

    return rows;
  }, [
    firstName,
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
    linkingCode,
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          Dossier créé
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] leading-[1.1]">
          Bravo
        </h2>
      </div>

      <div className="rounded-2xl border border-[#E3E5E8] bg-white p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#6BCFCF]/10">
            <Mail className="h-5 w-5 text-[#2B7A78]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0F172A]">
              Merci de confirmer votre adresse email{" "}
              <span className="font-mono">{normalizedEmail}</span>
            </p>
            <p className="mt-1 text-sm text-[#1E293B]/70">
              Vous avez reçu un mail de confirmation sur {normalizedEmail}.
            </p>

            {confirmationState.status === "sending" && (
              <p className="mt-3 text-xs text-[#1E293B]/60">Envoi de l'email de confirmation…</p>
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

      <div className="mt-8 rounded-2xl bg-[#F8F9FA] p-5 md:p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#0F172A]" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
            Récapitulatif de votre dossier
          </p>
        </div>

        {recapRows.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {recapRows.map((r) => (
              <div
                key={r.label}
                className="flex items-start justify-between gap-4 rounded-xl bg-white px-4 py-3 border border-[#E3E5E8]"
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

