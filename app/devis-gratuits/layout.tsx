import type { Metadata } from "next";
import Script from "next/script";
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
  const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

  return (
    <main className="min-h-screen bg-surface-0 text-text-1">
      {GA4_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('js', new Date());
              gtag('config', '${GA4_ID}');
            `}
          </Script>
        </>
      ) : null}

      {/* Un seul conteneur scrollable (pas de min-h-screen imbriqués) pour
          éviter les effets de "double scroll" et de contenu qui sort de
          l'écran sur Safari iOS. On ajoute un padding bas confortable pour
          que les boutons ne soient pas masqués par la barre système. */}
      <div className="relative mx-auto flex max-w-4xl flex-col px-4 pt-6 pb-24 sm:px-6 lg:px-8 sm:pb-12">
        {/* Flat premium background (no gradients) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-28 h-64"
          style={{
            background: "rgba(107, 207, 207, 0.06)",
          }}
        />
        {children}
      </div>
    </main>
  );
}


