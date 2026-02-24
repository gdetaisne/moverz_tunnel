"use client";

import { useState, FormEvent } from "react";
import { Mail, User, ArrowRight, Check, X } from "lucide-react";
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

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Left: Form */}
      <div className="order-1">
        <div className="mb-4 md:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/10 px-4 py-1.5 text-sm font-semibold text-[#0F172A] mb-6">
            <span className="h-2 w-2 rounded-full bg-[#6BCFCF]" />
            Étape 1/4
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] mb-3 md:mb-4 leading-tight">
            Vos infos de contact
          </h2>
          
          <p className="hidden md:block text-lg text-[#1E293B]/70 leading-relaxed">
            Pour vous envoyer vos devis et suivre votre dossier.{" "}
            <span className="text-[#1E293B] font-medium">Jamais partagé ni revendu.</span>
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {/* Prénom */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
              <User className="w-4 h-4 text-[#6BCFCF]" />
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
                className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 pr-12 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                placeholder="Prénom ou surnom"
                autoComplete="given-name"
              />
              {(firstNameTouched || showValidation) && (
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  {isFirstNameValid ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                      <X className="w-4 h-4 text-red-600" strokeWidth={3} />
                    </span>
                  )}
                </span>
              )}
            </div>
            {showFirstNameError && (
              <p className="text-sm text-red-600">
                Un prénom, nom ou surnom (minimum 2 caractères)
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
              <Mail className="w-4 h-4 text-[#6BCFCF]" />
              Email de contact
            </label>
            <div className="relative">
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmailTouched(true);
                  onEmailChange(e.target.value);
                }}
                className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 pr-12 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                placeholder="vous@email.fr"
                autoComplete="email"
              />
              {(emailTouched || showValidation) && (
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  {isEmailValid ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                      <X className="w-4 h-4 text-red-600" strokeWidth={3} />
                    </span>
                  )}
                </span>
              )}
            </div>
            {showEmailError && (
              <p className="text-sm text-red-600">
                Merci de saisir un email valide
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* Validation summary */}
          {showValidation && missingFields.length > 0 && (
            <div className="rounded-xl border border-[#E3E5E8] bg-[#F8F9FA] px-4 py-3 text-sm text-[#0F172A]/80">
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
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#0F172A]/70 border border-[#E3E5E8] hover:border-[#6BCFCF]"
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
            disabled={isSubmitting}
            aria-disabled={isSubmitting || !isFormValid}
            className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white hover:bg-[#1E293B] transition-all duration-200 ${
              !isFormValid && !isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span>{isSubmitting ? "Création en cours..." : "Commencer ma demande"}</span>
            {!isSubmitting && (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-sm text-[#1E293B]/60">
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
              <span>Gratuit</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
              <span>3 min</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
              <span>0 spam</span>
            </div>
          </div>
        </form>
      </div>

      {/* Right: Mockup illustration */}
      <div className="order-2 relative hidden lg:block">
        <div className="relative w-full max-w-[360px] mx-auto">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-[#6BCFCF]/5 rounded-[3rem] blur-3xl" />
          
          {/* Card mockup */}
          <div className="relative bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-8 border border-[#E3E5E8]">
            <div className="space-y-6">
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#6BCFCF] mx-auto">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>

              {/* Title */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">
              {isMobile ? "WhatsApp recommandé" : "Rapide et sécurisé"}
            </h3>
            <p className="text-sm text-[#1E293B]/70">
              {isMobile 
                ? "Demande rapide depuis votre mobile" 
                : "Vos données sont protégées et ne seront jamais partagées"}
            </p>
          </div>

              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F9FA]">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                    <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-[#0F172A]">
                    <strong>3 à 5 devis</strong> comparables
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F9FA]">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                    <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-[#0F172A]">
                    Réponse sous <strong>48-72h</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F9FA]">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                    <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-[#0F172A]">
                    Déménageurs <strong>vérifiés</strong>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[#E3E5E8] text-center">
                <p className="text-xs text-[#1E293B]/60">
                  Connexion sécurisée • RGPD conforme
                </p>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -right-4 top-20 bg-white rounded-xl shadow-md px-4 py-2 border border-gray-100">
            <p className="text-xs font-bold text-[#0F172A]">1200+</p>
            <p className="text-xs text-[#1E293B]/60">déménagements</p>
          </div>
        </div>
      </div>
    </div>
  );
}

