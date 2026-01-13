"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackTunnelEvent } from "@/lib/api/client";
import PremiumShell from "@/components/tunnel/PremiumShell";

function MerciPageInner() {
  const searchParams = useSearchParams();
  const source =
    searchParams.get("source") ??
    searchParams.get("src") ??
    searchParams.get("utm_source") ??
    undefined;
  const email = searchParams.get("email") ?? undefined;

  useEffect(() => {
    let backofficeLeadId: string | undefined;
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("moverz_tunnel_form_state");
        if (raw) {
          const parsed = JSON.parse(raw) as { backofficeLeadId?: string | null; leadId?: string | null };
          // Prio: backofficeLeadId (Lead Postgres)
          if (parsed?.backofficeLeadId) backofficeLeadId = String(parsed.backofficeLeadId);
          // Fallback: certains états legacy utilisent leadId pour le Back Office
          if (!backofficeLeadId && parsed?.leadId) backofficeLeadId = String(parsed.leadId);
        }
      }
    } catch {
      // ignore (tracking best-effort)
    }

    void trackTunnelEvent({
      eventType: "TUNNEL_COMPLETED",
      logicalStep: "THANK_YOU",
      screenId: "thank_you_v1",
      source,
      email,
      backofficeLeadId,
    });
  }, [source, email]);

  return (
    <PremiumShell containerClassName="flex items-center justify-center">
      <div className="w-full max-w-md text-center moverz-animate-fade-in">
        {/* Logo Moverz en haut */}
        <div className="mb-8">
          <img src="/icon.png" alt="Moverz" className="h-10 w-auto mx-auto" />
        </div>

        <div className="w-full space-y-5 rounded-3xl border border-[#E3E5E8] bg-white/85 p-6 shadow-brand moverz-glass sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-sm">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
            Merci pour votre demande !
          </h1>
          <p className="text-sm text-[#1E293B]/70 sm:text-base">
            Votre dossier est créé. On s'occupe du reste.
          </p>

          <div className="space-y-3 rounded-2xl bg-[#F8F9FA] p-4 text-left border border-[#E3E5E8]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60">
              Prochaines étapes
            </p>
            <ul className="space-y-2 text-sm text-[#1E293B]/75">
              <li>
                <span className="font-semibold text-[#0F172A]">1)</span> Ouvrez l’email
                de confirmation
              </li>
              <li>
                <span className="font-semibold text-[#0F172A]">2)</span> Cliquez sur le
                lien pour valider votre adresse
              </li>
              <li>
                <span className="font-semibold text-[#0F172A]">3)</span> (Optionnel)
                Ajoutez des photos pour des devis plus justes
              </li>
            </ul>
          </div>

          <p className="text-[11px] text-[#1E293B]/60 sm:text-xs">
            Pas reçu l’email ? Vérifiez vos spams. Sinon, répondez à l’email de bienvenue ou
            contactez‑nous pour corriger l’adresse.
          </p>
        </div>
      </div>
    </PremiumShell>
  );
}

export default function MerciPage() {
  return (
    <Suspense
      fallback={
        <PremiumShell containerClassName="flex items-center justify-center">
          <div className="p-4 text-[#1E293B]/70">Chargement…</div>
        </PremiumShell>
      }
    >
      <MerciPageInner />
    </Suspense>
  );
}


