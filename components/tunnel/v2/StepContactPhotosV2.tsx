"use client";

import { FormEvent } from "react";
import { Mail, User } from "lucide-react";
import WhatsAppCTA from "@/components/tunnel/WhatsAppCTA";

interface StepContactPhotosV2Props {
  firstName: string;
  email: string;
  phone: string;
  leadId?: string | null;
  linkingCode?: string | null;
  onFirstNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
}

export function StepContactPhotosV2({
  firstName,
  email,
  phone,
  leadId,
  linkingCode,
  onFirstNameChange,
  onEmailChange,
  onPhoneChange,
  onSubmit,
  isSubmitting,
}: StepContactPhotosV2Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-[#0F172A]">Où souhaitez-vous recevoir vos devis ?</h2>
        <p className="text-sm text-[#1E293B]/70">
          Dernière étape — envoyez vos photos pour recevoir vos devis.
        </p>
        <p className="text-sm text-[#1E293B]/70">
          Un conseiller Moverz vérifie votre dossier avant l’envoi.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
            <User className="w-4 h-4 text-[#6BCFCF]" />
            Prénom (optionnel)
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-base"
            placeholder="Votre prénom"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
            <Mail className="w-4 h-4 text-[#6BCFCF]" />
            Email (obligatoire)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-base"
            placeholder="vous@email.fr"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#0F172A]">Téléphone (optionnel)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-base"
            placeholder="+33 6..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <WhatsAppCTA
          source="tunnel-v2"
          linkingCode={linkingCode || undefined}
          leadId={leadId || undefined}
          variant="primary"
        />
        <button
          type="button"
          disabled={!leadId}
          onClick={() => {
            const url = new URL("/upload-photos", window.location.origin);
            if (leadId) url.searchParams.set("leadId", leadId);
            if (linkingCode) url.searchParams.set("code", linkingCode);
            window.location.href = url.toString();
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white border-2 border-[#E3E5E8] px-8 py-4 text-base font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5 transition-all duration-200"
        >
          Depuis cet ordinateur
        </button>
      </div>

      <div className="md:static fixed left-0 right-0 bottom-0 bg-white/95 backdrop-blur px-4 py-4 md:px-0 md:py-0">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-[#0F172A] text-white font-semibold py-4 text-base hover:bg-[#1E293B] transition-all"
        >
          {isSubmitting ? "Envoi..." : "Accéder à mes devis"}
        </button>
      </div>
    </form>
  );
}
