"use client";

import { useState } from "react";
import { Smartphone, QrCode, Copy, Check, X } from "lucide-react";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import QRCode from "qrcode";

interface WhatsAppCTAProps {
  source?: string;
  linkingCode?: string;
  variant?: "primary" | "secondary";
}

export default function WhatsAppCTA({ 
  source = "tunnel", 
  linkingCode,
  variant = "primary" 
}: WhatsAppCTAProps) {
  const { isMobile } = useDeviceDetection();
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "33752986581";
  
  const message = linkingCode 
    ? `Bonjour, je veux compléter mon dossier avec des photos.\n\nMon code dossier : ${linkingCode}`
    : `Bonjour, je voudrais obtenir 3 à 5 devis pour mon déménagement.\n\nVille de départ :\nVille d'arrivée :\nDate souhaitée :\n\nJe vais envoyer des photos de TOUTES les pièces.\n\n1 message/jour max • 0 spam`;

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  const whatsappDeepLink = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;

  async function generateQR() {
    try {
      const url = await QRCode.toDataURL(whatsappLink, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("Error generating QR code:", err);
    }
  }

  function handleClick() {
    if (isMobile) {
      // Mobile: open WhatsApp directly
      window.location.href = whatsappDeepLink;
    } else {
      // Desktop: show QR code modal
      generateQR();
      setShowQRModal(true);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(whatsappLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isPrimary = variant === "primary";

  return (
    <>
      {/* CTA Button */}
      <button
        onClick={handleClick}
        className={`group w-full inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-base font-semibold transition-all duration-200 ${
          isPrimary
            ? "bg-[#25D366] text-white hover:bg-[#20BA5A] shadow-sm"
            : "bg-white text-[#0F172A] border-2 border-[#E3E5E8] hover:border-[#B7EAE3] shadow-sm"
        }`}
      >
        <Smartphone className="w-5 h-5" />
        <div className="flex flex-col items-start">
          <span>{isMobile ? "Envoyer mes photos" : "Continuer"} sur WhatsApp</span>
          {isPrimary && (
            <span className="text-xs font-normal opacity-90">
              {isMobile ? "Photos de toutes les pièces" : "Scanner le QR code"}
            </span>
          )}
        </div>
        {!isMobile && <QrCode className="w-5 h-5" />}
      </button>

      {/* QR Code Modal (Desktop only) */}
      {showQRModal && !isMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
            {/* Close button */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Content */}
            <div className="text-center">
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mx-auto mb-6">
                <Smartphone className="w-8 h-8 text-green-600" />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-[#0F172A] mb-2">
                Scanner avec votre téléphone
              </h3>
              <p className="text-[#1E293B]/70 mb-6">
                Ouvrez WhatsApp sur votre mobile et scannez le QR code
              </p>

              {/* QR Code */}
              {qrDataUrl && (
                <div className="bg-white p-6 rounded-2xl border-2 border-[#E3E5E8] mb-6">
                  <img src={qrDataUrl} alt="QR Code WhatsApp" className="w-full max-w-[240px] mx-auto" />
                </div>
              )}

              {/* Checklist */}
              <div className="bg-[#F8F9FA] rounded-2xl p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-[#0F172A] mb-3">
                  Photos recommandées
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#1E293B]/70">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                    Salon
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                    Chambres
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                    Cuisine
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                    Cave/Garage
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                    Entrée
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                    Escaliers
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[#E3E5E8]" />
                <p className="text-xs text-[#1E293B]/60 font-medium">ou</p>
                <div className="flex-1 h-px bg-[#E3E5E8]" />
              </div>

              {/* Copy link button */}
              <button
                onClick={handleCopyLink}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#E3E5E8] bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#F8F9FA] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Lien copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier le lien WhatsApp</span>
                  </>
                )}
              </button>

              <p className="text-xs text-[#1E293B]/60 mt-4">
                1 message/jour max • Stop quand vous voulez • 0 spam
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

