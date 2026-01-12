"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PremiumShell from "@/components/tunnel/PremiumShell";

export default function HomePage() {
  const router = useRouter();

  const startTunnel = () => {
    router.push("/devis-gratuits?src=landing");
  };

  return (
    <PremiumShell containerClassName="flex items-center justify-center">
      <div
        className="w-full max-w-2xl cursor-pointer space-y-8 rounded-3xl border border-[#E3E5E8] bg-white/80 p-6 shadow-brand moverz-glass sm:p-8 moverz-animate-fade-in"
        role="button"
        tabIndex={0}
        onClick={startTunnel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startTunnel();
          }
        }}
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2B7A78]">
            Tunnel Moverz
          </p>
          <h1 className="text-2xl font-semibold text-[#0F172A] sm:text-3xl">
            Votre estimation de déménagement en 2 étapes simples
          </h1>
          <p className="text-sm text-[#1E293B]/70 sm:text-[15px]">
            Vous répondez à quelques questions, puis vous choisissez si vous
            voulez aller plus loin avec des photos. Le tout en moins d’un quart
            d’heure.
          </p>
        </header>

        <div className="space-y-4">
          {/* Étape 1 */}
          <section className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#E3E5E8]">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#6BCFCF]/20 text-xs font-semibold text-[#2B7A78]">
              1
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#0F172A] sm:text-base">
                  2–3 minutes pour créer votre dossier
                </h2>
              </div>
              <p className="text-xs text-[#1E293B]/70 sm:text-[13px]">
                On vous demande uniquement l’essentiel (adresses, type de
                logement, période) et on calcule une première estimation de
                budget.
              </p>
            </div>
          </section>

          {/* Étape 2 */}
          <section className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#E3E5E8]">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-700">
              2
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#0F172A] sm:text-base">
                  Analyse et traitement de vos photos (facultatif)
                </h2>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Inventaire automatique
                </span>
              </div>
              <p className="text-xs text-[#1E293B]/70 sm:text-[13px]">
                Si vous le souhaitez, vous pourrez prendre quelques photos de
                chaque pièce. Notre IA en déduit automatiquement un inventaire
                et une déclaration de valeur.
              </p>
              <p className="text-xs text-[#1E293B]/70 sm:text-[13px]">
                Résultat : plus de devis, des prix mieux ajustés et beaucoup
                moins de paperasse pour vous ensuite.
              </p>
              <p className="text-[11px] text-[#1E293B]/55">
                Temps côté vous : ~10 minutes de photos. Temps côté Moverz :
                moins d’une minute pour les transformer en documents exploitables.
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-[#E3E5E8]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/55">
            Confidentialité des photos
          </p>
          <p className="text-xs text-[#1E293B]/70 sm:text-[13px]">
            Vos photos ne servent qu’à analyser le volume et générer vos
            documents. Elles sont stockées de façon sécurisée, jamais revendues
            et peuvent être supprimées sur simple demande.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#1E293B]/60 sm:text-[13px]">
            Prêt ? On commence par la constitution de votre dossier en{" "}
            <span className="font-semibold text-[#0F172A]">2 à 3 minutes</span>.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              startTunnel();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-[#6BCFCF] px-5 py-2.5 text-sm font-semibold text-[#0F172A] shadow-brand moverz-transition-fast hover:bg-[#5BBFBF]"
          >
            Commencer mon dossier de déménagement
          </button>
        </div>
      </div>
    </PremiumShell>
  );
}


