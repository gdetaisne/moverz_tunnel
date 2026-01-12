"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PremiumShell from "@/components/tunnel/PremiumShell";

function normalizeApiBaseUrl(raw: string): string {
  let normalized = (raw || "").trim().replace(/\/+$/, "");
  normalized = normalized.replace(/\/(api|public)$/i, "");
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

function ConfirmLeadInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const apiBaseUrl = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
    return normalizeApiBaseUrl(raw);
  }, []);

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Lien invalide : token manquant.");
      return;
    }
    if (!apiBaseUrl) {
      setStatus("error");
      setError("Configuration manquante : NEXT_PUBLIC_API_URL.");
      return;
    }

    const run = async () => {
      setStatus("loading");
      setError(null);
      try {
        const url = `${apiBaseUrl}/public/leads/confirm?token=${encodeURIComponent(
          token
        )}`;
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) {
          let msg = `Erreur (${res.status})`;
          try {
            const data = await res.json();
            msg = data?.error || data?.message || msg;
          } catch {
            // ignore
          }
          throw new Error(msg);
        }
        setStatus("ok");
      } catch (e: unknown) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    };

    void run();
  }, [token, apiBaseUrl]);

  return (
    <PremiumShell containerClassName="flex items-center justify-center">
      <div className="w-full max-w-md text-center moverz-animate-fade-in">
        <div className="mb-8">
          <img src="/icon.png" alt="Moverz" className="h-10 w-auto mx-auto" />
        </div>

        <div className="rounded-3xl border border-[#E3E5E8] bg-white/85 p-6 shadow-brand moverz-glass sm:p-8">
          {status === "loading" ? (
            <>
              <div className="mx-auto mb-5 inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent" />
              <h1 className="text-2xl font-bold text-[#0F172A]">
                Confirmation en cours…
              </h1>
              <p className="mt-2 text-sm text-[#1E293B]/70">
                Merci de patienter quelques secondes.
              </p>
            </>
          ) : status === "ok" ? (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-sm">
                <span className="text-2xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0F172A]">
                Adresse email confirmée
              </h1>
              <p className="mt-2 text-sm text-[#1E293B]/70">
                Merci. Votre demande peut maintenant être traitée.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700 border border-red-200">
                <span className="text-2xl">!</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0F172A]">
                Impossible de confirmer
              </h1>
              <p className="mt-2 text-sm text-[#1E293B]/70">
                {error || "Une erreur est survenue."}
              </p>
            </>
          )}
        </div>
      </div>
    </PremiumShell>
  );
}

export default function ConfirmLeadPage() {
  return (
    <Suspense
      fallback={
        <PremiumShell containerClassName="flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent mb-4"></div>
            <p className="text-[#1E293B]/70">Chargement...</p>
          </div>
        </PremiumShell>
      }
    >
      <ConfirmLeadInner />
    </Suspense>
  );
}


