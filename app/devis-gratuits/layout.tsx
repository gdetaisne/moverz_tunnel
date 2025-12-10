import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Demande de devis déménagement | Moverz",
  description:
    "Tunnel de demande de devis déménagement Moverz – estimation, informations projet et validation, conçu mobile first.",
};

export default function DevisGratuitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Un seul conteneur scrollable (pas de min-h-screen imbriqués) pour
          éviter les effets de "double scroll" et de contenu qui sort de
          l'écran sur Safari iOS. On ajoute un padding bas confortable pour
          que les boutons ne soient pas masqués par la barre système. */}
      <div className="mx-auto flex max-w-4xl flex-col px-4 pt-6 pb-24 sm:px-6 lg:px-8 sm:pb-12">
        {children}
      </div>
    </main>
  );
}


