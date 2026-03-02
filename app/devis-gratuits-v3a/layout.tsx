import type { Metadata } from "next";
import Script from "next/script";
import "../globals.css";

export const metadata: Metadata = {
  title: "Demande de devis déménagement | Moverz",
  description:
    "Tunnel de demande de devis déménagement Moverz – estimation, informations projet et validation, conçu mobile first.",
};

export default function DevisGratuitsV3aLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

  return (
      <main className="min-h-screen bg-[#E0F7F7] text-slate-900">
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

      <div className="relative mx-auto flex max-w-5xl flex-col px-4 pt-2 pb-24 sm:px-8 lg:px-12 sm:pb-12">
        {children}
      </div>
    </main>
  );
}
