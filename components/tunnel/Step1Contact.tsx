"use client";

import { useState, FormEvent } from "react";
import { Mail, User, Phone, ArrowRight, Check, X, Loader2, Shield, TrendingUp, PhoneOff } from "lucide-react";

interface Step1ContactProps {
  firstName: string;
  email: string;
  phone?: string;
  onFirstNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange?: (value: string) => void;
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
  phone,
  onFirstNameChange,
  onEmailChange,
  onPhoneChange,
  onSubmit,
  isSubmitting,
  error,
  showValidation,
}: Step1ContactProps) {
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailApiError, setEmailApiError] = useState<string | null>(null);
  const hasPhone = onPhoneChange !== undefined;
  const isFirstNameValid = firstName.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneValid = !hasPhone || (phone ?? "").trim().length >= 1;
  const isFormValid = isFirstNameValid && isEmailValid && isPhoneValid;

  const missingFields: Array<{ id: string; label: string }> = [];
  if (!isFirstNameValid) missingFields.push({ id: "contact-firstName", label: "Prénom" });
  if (!isEmailValid) missingFields.push({ id: "contact-email", label: "Email" });
  if (!isPhoneValid) missingFields.push({ id: "contact-phone", label: "Téléphone" });

  const showFirstNameError = (showValidation || firstNameTouched) && !isFirstNameValid;
  const showEmailError = (showValidation || emailTouched) && !isEmailValid;
  const showPhoneError = hasPhone && (showValidation || phoneTouched) && !isPhoneValid;

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

          {/* Téléphone (optionnel selon les props) */}
          {hasPhone && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Phone className="w-4 h-4 text-turquoise" />
                Téléphone
              </label>
              <div className="relative">
                <input
                  id="contact-phone"
                  type="tel"
                  value={phone ?? ""}
                  onChange={(e) => {
                    setPhoneTouched(true);
                    onPhoneChange!(e.target.value);
                  }}
                  className="w-full rounded-xl border-2 border-border bg-white px-4 pr-12 py-3 text-base text-text-primary placeholder:text-text-body/40 focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise/20 transition-all"
                  placeholder="06 12 34 56 78"
                  autoComplete="tel"
                />
                {(phoneTouched || showValidation) && (
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                    {isPhoneValid ? (
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
              {showPhoneError && (
                <p className="text-sm text-danger">
                  Merci de renseigner un numéro de téléphone
                </p>
              )}
            </div>
          )}

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
            className={`group w-full sm:max-w-sm sm:mx-auto inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-bold transition-all duration-200 ${
              !isFormValid && !busy
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-[1.02] active:scale-[0.98]"
            } ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{
              background: "#F59E0B",
              color: "#111827",
              boxShadow: "0 4px 20px rgba(245,158,11,0.30)",
            }}
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

      {/* Right: Value proposition */}
      <div className="order-2 hidden lg:flex flex-col justify-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0EA5A6]/10 px-4 py-1.5 text-sm font-semibold text-[#0EA5A6] mb-4">
            <span className="h-2 w-2 rounded-full bg-[#0EA5A6]" />
            Ce qui nous différencie
          </div>
          <h3 className="text-2xl font-black text-[#111827] leading-tight mb-2">
            Pourquoi choisir<br />
            <span className="text-[#0EA5A6]">Moverz ?</span>
          </h3>
          <p className="text-sm text-[#475569] leading-relaxed">
            Moverz ne compare pas seulement des devis.{" "}
            <strong className="text-[#111827]">Moverz compare des entreprises, leur fiabilité et le risque associé.</strong>
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              icon: Shield,
              title: "Pros vérifiés",
              sub: "3 analyses de risque /100 (financier, juridique, avis)",
            },
            {
              icon: TrendingUp,
              title: "Devis comparables",
              sub: "Même base (dossier standardisé) pour tous",
            },
            {
              icon: PhoneOff,
              title: "Sans démarchage",
              sub: "Téléphone masqué jusqu'à votre choix",
            },
          ].map(({ icon: Icon, title, sub }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#E5E7EB]"
              style={{ boxShadow: "0 2px 8px rgba(2,6,23,0.04)" }}
            >
              <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[#0EA5A6]/08"
                style={{ background: "rgba(14,165,166,0.08)" }}>
                <Icon className="w-4.5 h-4.5 text-[#0EA5A6]" style={{ width: "18px", height: "18px" }} strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827]">{title}</p>
                <p className="text-xs text-[#475569] mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
