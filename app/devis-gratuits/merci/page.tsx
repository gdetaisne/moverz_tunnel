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
          {/* Barre teal clair (gauche/haut) */}
          <path d="M2 8C2 4.68629 4.68629 2 8 2H12C15.3137 2 18 4.68629 18 8V18C18 19.6569 16.6569 21 15 21H11C9.34315 21 8 19.6569 8 18V12C8 10.8954 8.89543 10 10 10H12" stroke="#6BCFCF" strokeWidth="4" strokeLinecap="round"/>
          {/* Barre teal foncé (droite/bas) */}
          <path d="M28 24C28 27.3137 25.3137 30 22 30H18C14.6863 30 12 27.3137 12 24V14C12 12.3431 13.3431 11 15 11H19C20.6569 11 22 12.3431 22 14V20C22 21.1046 21.1046 22 20 22H18" stroke="#2B7A78" strokeWidth="4" strokeLinecap="round"/>
          {/* Texte Moverz */}
          <text x="36" y="20" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fontWeight="600" fill="#0F172A">Moverz</text>
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


