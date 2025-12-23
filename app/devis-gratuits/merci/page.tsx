"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackTunnelEvent } from "@/lib/api/client";

function MerciPageInner() {
  const searchParams = useSearchParams();
  const source =
    searchParams.get("source") ??
    searchParams.get("src") ??
    searchParams.get("utm_source") ??
    undefined;
  const email = searchParams.get("email") ?? undefined;

  useEffect(() => {
    void trackTunnelEvent({
      eventType: "TUNNEL_COMPLETED",
      logicalStep: "THANK_YOU",
      screenId: "thank_you_v1",
      source,
      email,
    });
  }, [source, email]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {/* Logo Moverz en haut */}
      <div className="mb-8">
        <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
          {/* Icon M stylisé */}
          <path d="M8 4L12 8L16 4L12 12L8 4Z" fill="#2B7A78" opacity="0.8"/>
          <path d="M4 8L8 12L12 8V20H8L4 16V8Z" fill="#2B7A78"/>
          <path d="M12 8L16 12L20 8V20H16L12 16V8Z" fill="#6BCFCF"/>
          {/* Texte Moverz */}
          <text x="28" y="20" fontFamily="system-ui, -apple-system, sans-serif" fontSize="18" fontWeight="600" fill="#0F172A">Moverz</text>
        </svg>
      </div>
      
      <div className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Merci pour votre demande !
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Votre dossier est créé. On s'occupe du reste.
        </p>

        <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-left border border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Prochaines étapes
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              <span className="font-semibold text-slate-900">1)</span> Ouvrez l’email
              de confirmation
            </li>
            <li>
              <span className="font-semibold text-slate-900">2)</span> Cliquez sur le
              lien pour valider votre adresse
            </li>
            <li>
              <span className="font-semibold text-slate-900">3)</span> (Optionnel)
              Ajoutez des photos pour des devis plus justes
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-slate-500 sm:text-xs">
          Pas reçu l’email ? Vérifiez vos spams. Sinon, répondez à l’email de bienvenue ou
          contactez‑nous pour corriger l’adresse.
        </p>
      </div>
    </div>
  );
}

export default function MerciPage() {
  return (
    <Suspense fallback={<div className="p-4 text-slate-600">Chargement…</div>}>
      <MerciPageInner />
    </Suspense>
  );
}


