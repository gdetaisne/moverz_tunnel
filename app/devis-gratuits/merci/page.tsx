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
          Votre dossier de déménagement a bien été créé. Si vous avez déjà
          envoyé des photos, nous venons de produire pour vous un inventaire
          détaillé, une déclaration de valeur et un dossier complet prêt pour
          les déménageurs.
        </p>
        <p className="text-xs text-slate-600 sm:text-sm">
          Un email de confirmation vient de vous être envoyé. Il vous suffit de
          cliquer sur le lien dans cet email pour valider votre adresse et
          lancer la recherche de devis.
        </p>
        <p className="text-[11px] text-slate-500 sm:text-xs">
          Si l’adresse email indiquée n’est pas la bonne ou si vous ne recevez
          rien, répondez simplement à l’email de bienvenue ou contactez‑nous
          pour la corriger : nous mettrons votre dossier à jour.
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


