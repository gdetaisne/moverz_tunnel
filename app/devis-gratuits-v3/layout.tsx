import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Demande de devis déménagement | Moverz",
  description:
    "Tunnel de demande de devis déménagement Moverz – estimation, informations projet et validation, conçu mobile first.",
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://devis.moverz.fr/devis-gratuits-v3",
  },
};

export default function DevisGratuitsV3Layout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
