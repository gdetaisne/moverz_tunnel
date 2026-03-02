"use client";

import { PhoneOff, Clock, Shield, Users } from "lucide-react";

const ITEMS = [
  { icon: PhoneOff,   label: "Zéro harcèlement" },
  { icon: Clock,      label: "3+ devis sous 3–5 jours" },
  { icon: Shield,     label: "100% gratuit" },
  { icon: Users,      label: "1000+ déménageurs contrôlés" },
] as const;

export function ReassuranceBar() {
  return (
    <div
      className="w-full py-2 px-4"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(14,165,166,0.10)",
      }}
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2">
        {ITEMS.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-[calc(50%-4px)] sm:w-auto justify-center sm:justify-start"
            style={{
              border: "1px solid rgba(14,165,166,0.20)",
              color: "#475569",
              background: "rgba(14,165,166,0.04)",
            }}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[#0EA5A6]" strokeWidth={2} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
