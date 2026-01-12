import Script from "next/script";
import PremiumShell from "@/components/tunnel/PremiumShell";

export default function WidgetTestPage() {
  return (
    <PremiumShell>
      <div className="w-full flex flex-col md:flex-row gap-10 items-stretch moverz-animate-fade-in">
        <section className="flex-1 flex flex-col justify-center gap-4">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 uppercase tracking-[0.2em]">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" />
            Démo interne
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-[#0F172A]">
            Widget IA Moverz
          </h1>
          <p className="text-sm md:text-base text-[#1E293B]/70 max-w-xl">
            Cette page sert uniquement à tester le widget d&apos;analyse de photos
            intégré via le script <code>moverz-widget.js</code>. Charge 1 à 3 photos
            et vérifie que l&apos;inventaire remonte correctement.
          </p>
          <ul className="mt-2 text-xs text-[#1E293B]/60 space-y-1">
            <li>1. Glisse 1 à 3 photos dans la carte à droite.</li>
            <li>2. Clique sur &quot;Lancer l&apos;analyse&quot; et attends le résultat.</li>
            <li>
              3. Une fois l&apos;inventaire affiché, le bouton devient
              &nbsp;&quot;Obtenir des devis gratuits&quot; et redirige vers le tunnel.
            </li>
          </ul>
        </section>

        <section className="flex-1 flex items-center justify-center">
          <div
            id="moverz-widget-root"
            className="w-full flex items-center justify-center rounded-3xl border border-[#E3E5E8] bg-white p-3 shadow-sm"
          />
        </section>
      </div>

      {/* Script du widget chargé depuis le dossier public */}
      <Script src="/moverz-widget.js" strategy="afterInteractive" />
    </PremiumShell>
  );
}




