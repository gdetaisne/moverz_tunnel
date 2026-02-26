"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, RotateCcw, Pencil } from "lucide-react";
import { requestBackofficeConfirmation, updateBackofficeLead } from "@/lib/api/client";

interface ConfirmationPageProps {
  firstName: string;
  email: string;
  leadId?: string;
  // Conservé pour compat (anciens appels)
  linkingCode?: string;
  confirmationRequested?: boolean;
  estimateMinEur?: number | null;
  estimateMaxEur?: number | null;
  estimateIsIndicative?: boolean;

  onGoToStep?: (step: 1 | 2 | 3) => void;
  onEmailChange?: (value: string) => void;
}

type ConfirmationState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; message: string }
  | { status: "error"; message: string };

function normalizeEmail(v: string) {
  return (v || "").trim().toLowerCase();
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ConfirmationPage({
  firstName,
  email,
  leadId,
  onGoToStep,
  onEmailChange,
}: ConfirmationPageProps) {
  const [mounted, setMounted] = useState(false);
  const requestOnceRef = useRef(false);

  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({ status: "idle" });
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(email);

  const normalizedEmail = normalizeEmail(email);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sendConfirmation = async (opts?: { force?: boolean }) => {
    if (!leadId) {
      setConfirmationState({ status: "error", message: "Identifiant dossier manquant." });
      return;
    }
    const storageKey = `moverz_confirmation_requested_${leadId}`;
    const emailKey = normalizedEmail;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;

    // Garde anti spam : si déjà envoyé pour cet email, on n'en renvoie pas automatiquement.
    if (!opts?.force && stored && stored === emailKey) {
      setConfirmationState({ status: "sent", message: "Email envoyé" });
      return;
    }

    try {
      setConfirmationState({ status: "sending" });
      const res = await requestBackofficeConfirmation(leadId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, emailKey);
      }
      setConfirmationState({ status: "sent", message: res.message ?? "Email envoyé" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible d'envoyer l'email de confirmation.";
      setConfirmationState({ status: "error", message: msg });
    }
  };

  // Envoi auto (1 fois) à l'arrivée sur l'écran
  useEffect(() => {
    if (!mounted) return;
    if (!leadId) return;
    if (requestOnceRef.current) return;
    requestOnceRef.current = true;
    void sendConfirmation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, leadId]);

  const saveEmail = async () => {
    if (!leadId) {
      setConfirmationState({ status: "error", message: "Identifiant dossier manquant." });
      return;
    }
    const next = normalizeEmail(emailDraft);
    if (!isValidEmail(next)) {
      setConfirmationState({ status: "error", message: "Merci de saisir un email valide." });
      return;
    }

    try {
      setConfirmationState({ status: "sending" });
      await updateBackofficeLead(leadId, { email: next });
      onEmailChange?.(next);
      setIsEditingEmail(false);

      // Forcer un nouvel envoi après changement d'email
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`moverz_confirmation_requested_${leadId}`);
      }
      await sendConfirmation({ force: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de mettre à jour l'email.";
      setConfirmationState({ status: "error", message: msg });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-warning-light px-3 py-1 text-xs font-semibold text-warning-fg">
          <Mail className="w-3.5 h-3.5" strokeWidth={3} />
          Validation email requise
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-text-primary leading-[1.1]">
          Plus qu'une étape{firstName?.trim() ? `, ${firstName.trim()}` : ""} !
        </h1>
        <p className="text-lg text-text-body/70">
          Confirmez votre email pour que votre dossier soit transmis aux déménageurs.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-turquoise/10">
            <Mail className="h-5 w-5 text-accent" />
          </div>

          <div className="flex-1">
            {!isEditingEmail ? (
              <>
                <p className="text-sm font-semibold text-text-primary">
                  Confirmez votre email pour recevoir vos devis
                </p>
                <p className="mt-1 text-sm text-text-body/70">
                  Cliquez sur le lien envoyé à <span className="font-mono">{normalizedEmail || "—"}</span>.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailDraft(email);
                      setIsEditingEmail(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:border-turquoise"
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier mon email
                  </button>

                  <button
                    type="button"
                    onClick={() => void sendConfirmation({ force: true })}
                    className="inline-flex items-center gap-2 rounded-xl bg-btn-primary px-4 py-2 text-xs font-semibold text-white hover:bg-btn-primary-hover"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Renvoyer l’email
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-text-primary">Modifier votre email</p>
                <input
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-2 text-sm"
                  placeholder="vous@email.fr"
                  inputMode="email"
                  autoComplete="email"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingEmail(false);
                      setEmailDraft(email);
                    }}
                    className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-text-primary"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveEmail()}
                    className="rounded-xl bg-btn-primary px-4 py-2 text-xs font-semibold text-white hover:bg-btn-primary-hover"
                  >
                    Enregistrer & renvoyer
                  </button>
                </div>
              </div>
            )}

            {confirmationState.status === "error" && (
              <p className="mt-3 text-xs text-warning-fg">
                {confirmationState.message} (pensez à vérifier vos spams)
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-surface-alt p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-body/60">
          Prochaines étapes
        </p>
        <div className="mt-4 space-y-3 text-sm text-text-body/70">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-success-light text-success text-xs font-bold">
              1
            </span>
            <p>Confirmez votre email pour valider votre demande.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-info-light text-info text-xs font-bold">
              2
            </span>
            <p>Nous préparons votre dossier et le transmettons aux déménageurs.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-info-light text-info text-xs font-bold">
              3
            </span>
            <p>Vous recevez 3 à 5 devis par email sous 5 à 7 jours.</p>
          </div>
        </div>

        {onGoToStep ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:border-turquoise"
            >
              Modifier contact
            </button>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:border-turquoise"
            >
              Modifier projet
            </button>
            <button
              type="button"
              onClick={() => onGoToStep(3)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:border-turquoise"
            >
              Modifier formules
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

