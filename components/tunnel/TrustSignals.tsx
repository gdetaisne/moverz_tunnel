"use client";

import { Shield, Clock, Check, Star } from "lucide-react";

export default function TrustSignals() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-2xl shadow-sm border border-[#E3E5E8]">
      <div className="text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6BCFCF]/10 mx-auto mb-2">
          <Shield className="w-5 h-5 text-[#6BCFCF]" />
        </div>
        <p className="text-sm font-semibold text-[#0F172A]">Données cryptées</p>
        <p className="text-xs text-[#1E293B]/60">SSL & RGPD</p>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6BCFCF]/10 mx-auto mb-2">
          <Clock className="w-5 h-5 text-[#6BCFCF]" />
        </div>
        <p className="text-sm font-semibold text-[#0F172A]">Réponse 24h</p>
        <p className="text-xs text-[#1E293B]/60">Moyenne</p>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6BCFCF]/10 mx-auto mb-2">
          <Star className="w-5 h-5 text-[#6BCFCF]" />
        </div>
        <p className="text-sm font-semibold text-[#0F172A]">Note 4.9/5</p>
        <p className="text-xs text-[#1E293B]/60">clients</p>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6BCFCF]/10 mx-auto mb-2">
          <Check className="w-5 h-5 text-[#6BCFCF]" />
        </div>
        <p className="text-sm font-semibold text-[#0F172A]">100% gratuit</p>
        <p className="text-xs text-[#1E293B]/60">Sans engagement</p>
      </div>
    </div>
  );
}

