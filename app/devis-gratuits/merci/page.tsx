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
      <div className="w-full max-w-md space-y-5 rounded-3xl border border-surface-3 bg-white/90 p-6 shadow-soft backdrop-blur sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-brand-deep to-brand-spark text-white shadow-brand">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Merci pour votre demande !
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Votre dossier est créé. On s’occupe du reste.
        </p>

        <div className="space-y-3 rounded-2xl bg-surface-1 p-4 text-left ring-1 ring-surface-3">
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


