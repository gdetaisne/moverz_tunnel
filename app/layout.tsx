import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";

/* Moverz Design System V4 Fonts */
const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Moverz – Tunnel de demande de devis",
  description:
    "Tunnel centralisé de demande de devis déménagement Moverz, pensé mobile first avec option d'envoi de photos par WhatsApp.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${sora.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-surface-0 text-text-1 antialiased font-inter">
        {children}
      </body>
    </html>
  );
}


