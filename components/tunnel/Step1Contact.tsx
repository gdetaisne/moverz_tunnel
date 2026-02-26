"use client";

import { useState, FormEvent } from "react";
import { Mail, User, ArrowRight, Check, X, Loader2 } from "lucide-react";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

interface Step1ContactProps {
  firstName: string;
  email: string;
  onFirstNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  showValidation?: boolean;
}

async function checkEmailApi(email: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch("/api/email/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return { ok: true, message: "" };
    const data = (await res.json()) as {
      ok?: boolean;
      verdict?: "valid" | "invalid" | "unknown";
      reason?: string;
    };
    if (data.verdict === "invalid") {
      return { ok: false, message: data.reason || "Adresse email non recevable." };
    }
    return { ok: true, message: data.reason || "" };
  } catch {
    return { ok: true, message: "" };
  }
}

export default function Step1Contact({
  firstName,
  email,
  onFirstNameChange,
  onEmailChange,
  onSubmit,
  isSubmitting,
  error,
  showValidation,
}: Step1ContactProps) {
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailApiError, setEmailApiError] = useState<string | null>(null);
  const { isMobile } = useDeviceDetection();

  const isFirstNameValid = firstName.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = isFirstNameValid && isEmailValid;

  const missingFields: Array<{ id: string; label: string }> = [];
  if (!isFirstNameValid) missingFields.push({ id: "contact-firstName", label: "Prénom" });
  if (!isEmailValid) missingFields.push({ id: "contact-email", label: "Email" });

  const showFirstNameError = (showValidation || firstNameTouched) && !isFirstNameValid;
  const showEmailError = (showValidation || emailTouched) && !isEmailValid;

  const focusField = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if ((el as any).focus) (el as any).focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting || emailChecking) return;

    setEmailApiError(null);
    setEmailChecking(true);
    const check = await checkEmailApi(email.trim());
    setEmailChecking(false);

    if (!check.ok) {
      setEmailApiError(check.message);
      return;
    }

    await onSubmit(e);
  };

  const busy = isSubmitting || emailChecking;

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Left: Form */}
      <div className="order-1">
        <div className="mb-4 md:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-turquoise/10 px-4 py-1.5 text-sm font-semibold text-text-primary mb-6">
            <span className="h-2 w-2 rounded-full bg-turquoise" />
            Étape 1/4
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-text-primary mb-3 md:mb-4 leading-tight">
            Constituez votre dossier
          </h2>
          
          <p className="hidden md:block text-lg text-text-body/70 leading-relaxed">
            On a besoin de vos coordonnées pour vous transmettre les devis.{" "}
            <span className="text-text-body font-medium">Jamais partagé ni revendu.</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Prénom */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <User className="w-4 h-4 text-turquoise" />
              Comment voulez-vous qu'on vous appelle ?
            </label>
            <div className="relative">
              <input
                id="contact-firstName"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstNameTouched(true);
                  onFirstNameChange(e.target.value);
                }}
                className="w-full rounded-xl border-2 border-border bg-white px-4 pr-12 py-3 text-base text-text-primary placeholder:text-text-body/40 focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise/20 transition-all"
                placeholder="Prénom ou surnom"
                autoComplete="given-name"
              />
              {(firstNameTouched || showValidation) && (
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  {isFirstNameValid ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-light">
                      <Check className="w-4 h-4 text-success" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger-light">
                      <X className="w-4 h-4 text-danger" strokeWidth={3} />
                    </span>
                  )}
                </span>
              )}
            </div>
            {showFirstNameError && (
              <p className="text-sm text-danger">
                Un prénom, nom ou surnom (minimum 2 caractères)
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Mail className="w-4 h-4 text-turquoise" />
              Email de contact
            </label>
            <div className="relative">
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmailTouched(true);
                  setEmailApiError(null);
                  onEmailChange(e.target.value);
                }}
                className={`w-full rounded-xl border-2 bg-white px-4 pr-12 py-3 text-base text-text-primary placeholder:text-text-body/40 focus:outline-none focus:ring-2 transition-all ${
                  emailApiError
                    ? "border-danger focus:border-danger focus:ring-danger/15"
                    : "border-border focus:border-turquoise focus:ring-turquoise/20"
                }`}
                placeholder="vous@email.fr"
                autoComplete="email"
              />
              {emailChecking ? (
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <Loader2 className="w-5 h-5 text-[#6BCFCF] animate-spin" />
                </span>
              ) : (emailTouched || showValidation) ? (
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  {isEmailValid && !emailApiError ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-light">
                      <Check className="w-4 h-4 text-success" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger-light">
                      <X className="w-4 h-4 text-danger" strokeWidth={3} />
                    </span>
                  )}
                </span>
              ) : null}
            </div>
            {showEmailError && !emailApiError && (
              <p className="text-sm text-danger">
                Merci de saisir un email valide
              </p>
            )}
            {emailApiError && (
              <p className="text-sm text-danger">
                {emailApiError}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-danger-light/50 border border-danger/20">
              <p className="text-sm text-text-primary">{error}</p>
            </div>
          )}

          {/* Validation summary */}
          {showValidation && missingFields.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm text-text-primary/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {missingFields.length} champ{missingFields.length > 1 ? "s" : ""} manquant
                  {missingFields.length > 1 ? "s" : ""} :
                </span>
                {missingFields.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => focusField(f.id)}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-text-primary/70 border border-border hover:border-turquoise"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={busy}
            aria-disabled={busy || !isFormValid}
            className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-btn-primary px-8 py-4 text-base font-semibold text-white hover:bg-btn-primary-hover transition-all duration-200 ${
              !isFormValid && !busy ? "opacity-50 cursor-not-allowed" : ""
            } ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span>
              {emailChecking
                ? "Vérification de l'email..."
                : isSubmitting
                ? "Création du dossier..."
                : "Commencer mon dossier"}
            </span>
            {!busy && (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
            {emailChecking && (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
          </button>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-sm text-text-body/60">
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-success" strokeWidth={3} />
              <span>Gratuit</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-success" strokeWidth={3} />
              <span>3 min</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-success" strokeWidth={3} />
              <span>0 spam</span>
            </div>
          </div>
        </form>
      </div>

      {/* Right: Mockup illustration */}
      <div className="order-2 relative hidden lg:block">
        <div className="relative w-full max-w-[360px] mx-auto">
          <div className="absolute inset-0 bg-turquoise/5 rounded-[3rem] blur-3xl" />
          
          <div className="relative bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-8 border border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-turquoise mx-auto">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>

          <div className="text-center">
            <h3 className="text-xl font-bold text-text-primary mb-2">
              {isMobile ? "WhatsApp recommandé" : "Rapide et sécurisé"}
            </h3>
            <p className="text-sm text-text-body/70">
              {isMobile 
                ? "Demande rapide depuis votre mobile" 
                : "Vos données sont protégées et ne seront jamais partagées"}
            </p>
          </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-alt">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-success-light">
                    <Check className="w-4 h-4 text-success" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-text-primary">
                    <strong>3 à 5 devis</strong> comparables
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-alt">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-success-light">
                    <Check className="w-4 h-4 text-success" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-text-primary">
                    Réponse sous <strong>48-72h</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-alt">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-success-light">
                    <Check className="w-4 h-4 text-success" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-text-primary">
                    Déménageurs <strong>vérifiés</strong>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border text-center">
                <p className="text-xs text-text-body/60">
                  Connexion sécurisée • RGPD conforme
                </p>
              </div>
            </div>
          </div>

          <div className="absolute -right-4 top-20 bg-white rounded-xl shadow-md px-4 py-2 border border-border-light">
            <p className="text-xs font-bold text-text-primary">1200+</p>
            <p className="text-xs text-text-body/60">déménagements</p>
          </div>
        </div>
      </div>
    </div>
  );
}
