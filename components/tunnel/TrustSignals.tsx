"use client";

import { PhoneOff, BadgeCheck, Clock, Shield } from "lucide-react";

const SIGNALS = [
  { icon: PhoneOff,   title: "Zéro harcèlement",        sub: "Promesse Moverz" },
  { icon: BadgeCheck, title: "Entreprises vérifiées",    sub: "Sélection rigoureuse" },
  { icon: Clock,      title: "3+ devis sous 3–5 jours", sub: "Comparables & fiables" },
  { icon: Shield,     title: "100% gratuit",             sub: "1000+ déménageurs contrôlés" },
] as const;

export default function TrustSignals() {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-xl border"
      style={{
        borderColor: "rgba(14,165,166,0.15)",
        boxShadow: "0 10px 24px rgba(2,6,23,0.08)",
      }}
    >
      {SIGNALS.map(({ icon: Icon, title, sub }) => (
        <div key={title} className="text-center">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-2"
            style={{ background: "rgba(14,165,166,0.08)" }}
          >
            <Icon className="w-5 h-5 text-[#0EA5A6]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#111827]">{title}</p>
          <p className="text-xs mt-0.5 text-[#475569]">{sub}</p>
        </div>
      ))}
    </div>
  );
}
