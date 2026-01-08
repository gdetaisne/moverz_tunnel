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
}

export default function Step1Contact({
  firstName,
  email,
  onFirstNameChange,
  onEmailChange,
  onSubmit,
  isSubmitting,
  error,
}: Step1ContactProps) {
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const { isMobile } = useDeviceDetection();

  const isFirstNameValid = firstName.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Left: Form */}
      <div className="order-2 lg:order-1">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/10 px-4 py-1.5 text-sm font-semibold text-[#0F172A] mb-6">
            <span className="h-2 w-2 rounded-full bg-[#6BCFCF]" />
            Étape 1/4
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4 leading-tight">
            On commence par vos infos de contact
          </h2>
          
          <p className="text-lg text-[#1E293B]/70 leading-relaxed">
            Pour vous envoyer vos devis et suivre votre dossier.{" "}
            <span className="text-[#1E293B] font-medium">Jamais partagé ni revendu.</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Prénom */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
              <User className="w-4 h-4 text-[#6BCFCF]" />
              Comment voulez-vous qu'on vous appelle ?
            </label>
            <div className="relative">
              <input
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
              {firstNameTouched && (
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
            {firstNameTouched && !isFirstNameValid && (
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
              {emailTouched && (
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
            {emailTouched && !isEmailValid && (
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

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !isFirstNameValid || !isEmailValid}
            className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#1E293B] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
      <div className="order-1 lg:order-2 relative">
        <div className="relative w-full max-w-[360px] mx-auto">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 rounded-[3rem] blur-3xl" />
          
          {/* Card mockup */}
          <div className="relative bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-8 border border-[#E3E5E8]">
            <div className="space-y-6">
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6BCFCF] to-[#A8E8E8] mx-auto">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>

              {/* Title */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">
              {isMobile ? "WhatsApp recommandé" : "Rapide et sécurisé"}
            </h3>
            <p className="text-sm text-[#1E293B]/70">
              {isMobile 
                ? "Upload photos direct depuis votre mobile" 
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
                  🔒 Connexion sécurisée • RGPD conforme
                </p>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -right-4 top-20 bg-white rounded-xl shadow-xl px-4 py-2 rotate-6 border border-[#6BCFCF]/30">
            <p className="text-xs font-bold text-[#0F172A]">1200+</p>
            <p className="text-xs text-[#1E293B]/60">déménagements</p>
          </div>
        </div>
      </div>
    </div>
  );
}

