import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-3xl space-y-8 rounded-3xl bg-slate-900/90 p-6 shadow-xl ring-1 ring-slate-800 sm:p-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
            Tunnel Moverz
          </p>
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
            Comment vont se dérouler les prochaines étapes ?
          </h1>
          <p className="text-sm text-slate-300 sm:text-[15px]">
            En moins de 15 minutes, vous obtenez une estimation fiable de votre
            budget et, si vous le souhaitez, un inventaire complet prêt pour les
            déménageurs.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Étape 1 */}
          <section className="space-y-3 rounded-2xl bg-slate-950/80 p-4 ring-1 ring-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                  Étape 1
                </p>
                <h2 className="mt-1 text-sm font-semibold text-slate-50 sm:text-base">
                  Constitution de votre dossier
                </h2>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/40">
                2–3 minutes
              </span>
            </div>
            <p className="text-xs text-slate-300 sm:text-[13px]">
              Quelques questions simples sur vos adresses, votre logement et
              votre période souhaitée.
            </p>
            <ul className="ml-4 list-disc space-y-1 text-xs text-slate-300 sm:text-[13px]">
              <li>
                estimation de budget{" "}
                <span className="font-semibold">fiable</span> pour votre profil ;
              </li>
              <li>aucun engagement, vos coordonnées restent confidentielles ;</li>
              <li>
                vous pouvez revenir modifier les informations à tout moment.
              </li>
            </ul>
          </section>

          {/* Étape 2 */}
          <section className="space-y-3 rounded-2xl bg-slate-950/80 p-4 ring-1 ring-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                  Étape 2 (facultative mais recommandée)
                </p>
                <h2 className="mt-1 text-sm font-semibold text-slate-50 sm:text-base">
                  Inventaire automatique à partir de vos photos
                </h2>
              </div>
              <span className="inline-flex flex-col items-end text-right text-[11px] text-slate-300">
                <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 font-semibold text-sky-200 ring-1 ring-sky-400/40">
                  ≈ 10 min de photos
                </span>
                <span className="mt-0.5 text-[10px] text-slate-400">
                  &lt; 1 min d’analyse par l’IA
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-300 sm:text-[13px]">
              Vous pourrez nous envoyer des photos de votre logement. Nous les
              transformons automatiquement en inventaire structuré et
              déclaration de valeur.
            </p>
            <ul className="ml-4 list-disc space-y-1 text-xs text-slate-300 sm:text-[13px]">
              <li>plus de déménageurs intéressés par votre dossier ;</li>
              <li>devis plus précis et souvent moins élevés ;</li>
              <li>
                moins de travail pour vous ensuite (inventaire déjà rédigé pour
                les devis et l’assurance).
              </li>
            </ul>
          </section>
        </div>

        <div className="space-y-3 rounded-2xl bg-slate-950/80 p-4 ring-1 ring-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Vos photos restent privées
          </p>
          <p className="text-xs text-slate-300 sm:text-[13px]">
            Les photos que vous nous confiez servent uniquement à analyser le
            volume et à produire vos documents d’inventaire. Elles sont
            stockées de façon sécurisée, ne sont jamais revendues et peuvent
            être supprimées à tout moment sur simple demande.
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


