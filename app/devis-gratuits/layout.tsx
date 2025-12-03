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
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}


