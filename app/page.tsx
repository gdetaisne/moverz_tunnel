import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-slate-900/80 p-6 shadow-xl ring-1 ring-slate-800">
        <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
          Tunnel Moverz
        </h1>
        <p className="text-sm text-slate-300 sm:text-base">
          Ceci est l’entrée technique du tunnel. En production, les visiteurs
          seront redirigés ici depuis les sites locaux.
        </p>
        <Link
          href="/devis-gratuits?src=dev-local"
          className="inline-flex w-full items-center justify-center rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition hover:bg-sky-300"
        >
          Ouvrir le tunnel de devis
        </Link>
      </div>
    </main>
  );
}


