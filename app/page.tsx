import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-2xl space-y-8 rounded-3xl bg-slate-900/90 p-6 shadow-xl ring-1 ring-slate-800 sm:p-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
            Tunnel Moverz
          </p>
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
            Votre estimation de déménagement en 2 étapes simples
          </h1>
          <p className="text-sm text-slate-300 sm:text-[15px]">
            Vous répondez à quelques questions, puis vous choisissez si vous
            voulez aller plus loin avec des photos. Le tout en moins d’un quart
            d’heure.
          </p>
        </header>

        <div className="space-y-4">
          {/* Étape 1 */}
          <section className="flex items-start gap-3 rounded-2xl bg-slate-950/80 p-4 ring-1 ring-slate-800">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200">
              1
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-50 sm:text-base">
                  2–3 minutes pour créer votre dossier
                </h2>
              </div>
              <p className="text-xs text-slate-300 sm:text-[13px]">
                On vous demande uniquement l’essentiel (adresses, type de
                logement, période) et on calcule une première estimation de
                budget.
              </p>
            </div>
          </section>

          {/* Étape 2 */}
          <section className="flex items-start gap-3 rounded-2xl bg-slate-950/80 p-4 ring-1 ring-slate-800">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-200">
              2
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-50 sm:text-base">
                  +10 minutes de photos (facultatif mais recommandé)
                </h2>
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/40">
                  Inventaire automatique
                </span>
              </div>
              <p className="text-xs text-slate-300 sm:text-[13px]">
                Si vous le souhaitez, vous pourrez prendre quelques photos de
                chaque pièce. Notre IA en déduit automatiquement un inventaire
                et une déclaration de valeur.
              </p>
              <p className="text-xs text-slate-300 sm:text-[13px]">
                Résultat : plus de devis, des prix mieux ajustés et beaucoup
                moins de paperasse pour vous ensuite.
              </p>
              <p className="text-[11px] text-slate-400">
                Temps côté vous : ~10 minutes de photos. Temps côté Moverz :
                moins d’une minute pour les transformer en documents exploitables.
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-3 rounded-2xl bg-slate-950/80 p-4 ring-1 ring-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Confidentialité des photos
          </p>
          <p className="text-xs text-slate-300 sm:text-[13px]">
            Vos photos ne servent qu’à analyser le volume et générer vos
            documents. Elles sont stockées de façon sécurisée, jamais revendues
            et peuvent être supprimées sur simple demande.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400 sm:text-[13px]">
            Prêt ? On commence par la constitution de votre dossier en{" "}
            <span className="font-semibold text-slate-100">2 à 3 minutes</span>.
          </p>
          <Link
            href="/devis-gratuits?src=landing"
            className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition hover:bg-sky-300"
          >
            Commencer mon dossier de déménagement
          </Link>
        </div>
      </div>
    </main>
  );
}


