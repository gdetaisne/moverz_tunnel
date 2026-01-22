"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Check, Upload, ImagePlus, X, Loader2, Smartphone, Mail } from "lucide-react";
import WhatsAppCTA from "@/components/tunnel/WhatsAppCTA";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { uploadBackofficePhotos } from "@/lib/api/client";

interface StepContactPhotosV2Props {
  leadId?: string | null;
  linkingCode?: string | null;
  estimateMinEur?: number | null;
  estimateMaxEur?: number | null;
  estimateIsIndicative?: boolean;
}

export function StepContactPhotosV2({
  leadId,
  linkingCode,
  estimateMinEur = null,
  estimateMaxEur = null,
  estimateIsIndicative = false,
}: StepContactPhotosV2Props) {
  const { isMobile } = useDeviceDetection();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<{
    uploadedCount: number;
    totalPhotos: number;
    errors: { originalFilename: string; reason: string }[];
  } | null>(null);
  const [lastSelection, setLastSelection] = useState<File[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canUpload = !!leadId && mounted;

  const hasEstimate =
    typeof estimateMinEur === "number" &&
    typeof estimateMaxEur === "number" &&
    Number.isFinite(estimateMinEur) &&
    Number.isFinite(estimateMaxEur) &&
    estimateMaxEur > 0;

  const eur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  // Impact photos
  const DISCOUNT_RATE = 0.1;
  const savingsMin = hasEstimate ? Math.max(0, Math.round(estimateMinEur * DISCOUNT_RATE)) : 0;
  const savingsMax = hasEstimate ? Math.max(0, Math.round(estimateMaxEur * DISCOUNT_RATE)) : 0;
  const savingsText =
    hasEstimate && savingsMin > 0 && savingsMax > 0
      ? savingsMin === savingsMax
        ? `${eur(savingsMax)} €`
        : `${eur(savingsMin)}–${eur(savingsMax)} €`
      : null;

  const previewUrls = useMemo(() => {
    return lastSelection.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
    }));
  }, [lastSelection]);

  useEffect(() => {
    return () => {
      for (const p of previewUrls) URL.revokeObjectURL(p.url);
    };
  }, [previewUrls]);

  const openFilePicker = () => {
    if (!canUpload) return;
    fileInputRef.current?.click();
  };

  const MAX_MB = 10;

  const handleUploadFiles = async (files: File[]) => {
    setUploadError(null);
    setUploadSummary(null);

    if (!leadId) {
      setUploadError("Identifiant dossier manquant. Revenez à l'étape précédente.");
      return;
    }
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      setUploadError("Ajoutez au moins une image (JPG/PNG/WEBP/HEIC).");
      return;
    }

    const tooLarge = images.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooLarge.length > 0) {
      setUploadError(`${tooLarge.length} photo(s) trop lourdes (max ${MAX_MB} Mo).`);
      return;
    }

    setLastSelection(images);
    setUploading(true);
    try {
      const res = await uploadBackofficePhotos(leadId, images);
      const uploadedCount = res.data.uploaded?.length ?? 0;
      setUploadSummary({
        uploadedCount,
        totalPhotos: res.data.totalPhotos ?? 0,
        errors: res.data.errors ?? [],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue lors de l'upload.";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canUpload || uploading) return;
    void handleUploadFiles(Array.from(e.dataTransfer.files));
  };

  // Mobile layout
  if (mounted && isMobile) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E7FAFA] px-3 py-1.5 text-xs font-semibold text-[#2B7A78]">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Dossier créé
          </div>
          <h1 className="text-3xl font-black text-[#0F172A]">
            Ajoutez vos photos
          </h1>
          <p className="text-sm text-[#1E293B]/70">
            3–8 photos par pièce
          </p>
          {savingsText && (
            <div className="inline-flex items-center gap-2 rounded-full bg-[#E7FAFA] border border-[#6BCFCF]/30 px-4 py-2 text-sm font-semibold text-[#2B7A78]">
              <span className="text-xs">💰</span>
              <span>Gagnez jusqu'à {savingsText}</span>
            </div>
          )}
        </div>

        <WhatsAppCTA 
          source="tunnel-v2-mobile" 
          linkingCode={linkingCode || undefined} 
          leadId={leadId || undefined}
          variant="primary"
        />
        <p className="text-xs text-center text-[#1E293B]/60">
          🔒 0 spam • <2 min
        </p>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E3E5E8]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-white text-[#1E293B]/60">ou</span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (!files.length) return;
            void handleUploadFiles(files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={openFilePicker}
          disabled={!canUpload || uploading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white border-2 border-[#E3E5E8] px-6 py-4 text-sm font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5 transition-all duration-200 disabled:opacity-60"
        >
          <Smartphone className="h-5 w-5" />
          {uploading ? "Envoi en cours…" : "Ajouter depuis ce téléphone"}
        </button>

        {uploadSummary?.uploadedCount ? (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-sm font-semibold text-green-700">
              ✓ {uploadSummary.uploadedCount} photo{uploadSummary.uploadedCount > 1 ? "s" : ""} envoyée{uploadSummary.uploadedCount > 1 ? "s" : ""}
            </p>
          </div>
        ) : null}

        {uploadError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-medium text-red-700">{uploadError}</p>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout (ULTRA-SIMPLE)
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* Header minimal */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#E7FAFA] px-3 py-1.5 text-xs font-semibold text-[#2B7A78]">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          Dossier créé
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-[#0F172A] leading-tight">
          Ajoutez vos photos
        </h1>
        <p className="text-base text-[#1E293B]/70">
          3–8 photos par pièce • angles larges • bonne lumière
        </p>
        {savingsText && (
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E7FAFA] border border-[#6BCFCF]/30 px-4 py-2 text-sm font-semibold text-[#2B7A78]">
            <span className="text-xs">💰</span>
            <span>Gagnez jusqu'à {savingsText}</span>
          </div>
        )}
      </div>

      {/* CTA WhatsApp (principal) */}
      <div className="space-y-3">
        <WhatsAppCTA 
          source="tunnel-v2-desktop" 
          linkingCode={linkingCode || undefined} 
          leadId={leadId || undefined}
          variant="primary"
        />
        <p className="text-xs text-center text-[#1E293B]/60">
          🔒 0 spam • uniquement pour recevoir vos photos • <2 min
        </p>
      </div>

      {/* Alternatives discrètes */}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E3E5E8]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-white text-[#1E293B]/60">ou</span>
          </div>
        </div>

        {/* Email WhatsApp link */}
        <button
          type="button"
          onClick={() => {
            const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "33752986581";
            const message = leadId
              ? `Bonjour, j'ai finalisé le formulaire et je passe aux photos.\nLEAD:${leadId}${linkingCode ? `\nCode dossier: ${linkingCode}` : ""}`
              : `Bonjour, je voudrais obtenir 3 à 5 devis pour mon déménagement.`;
            const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
            const subject = "Lien WhatsApp Moverz";
            const body = `Voici le lien WhatsApp pour envoyer vos photos :\n\n${whatsappLink}`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#E3E5E8] bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#F8F9FA] transition-colors"
        >
          <Mail className="h-4 w-4" />
          M'envoyer le lien par email
        </button>

        {/* Dropzone */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (!files.length) return;
            void handleUploadFiles(files);
            e.target.value = "";
          }}
        />

        <div
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!canUpload || uploading) return;
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={onDrop}
          className={[
            "w-full rounded-3xl border-2 bg-white p-8 text-center transition-all duration-200",
            !leadId
              ? "border-[#E3E5E8] opacity-60"
              : isDragging
              ? "border-[#6BCFCF] bg-[#F0FAFA] scale-[1.01]"
              : "border-dashed border-[#E3E5E8] hover:border-[#6BCFCF]",
          ].join(" ")}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6BCFCF]/15 text-[#2B7A78]">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-[#0F172A]">
                Glissez-déposez vos photos ici
              </p>
              <p className="mt-1 text-sm text-[#1E293B]/70">
                ou{" "}
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={!canUpload || uploading}
                  className="font-semibold text-[#2B7A78] underline underline-offset-2 hover:text-[#6BCFCF]"
                >
                  choisissez des fichiers
                </button>
              </p>
              <p className="mt-3 text-xs text-[#1E293B]/60">
                JPG, PNG, HEIC — jusqu'à {MAX_MB} Mo par photo
              </p>
            </div>

            {uploadSummary?.uploadedCount ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-2 text-sm font-semibold text-green-700">
                <Check className="h-4 w-4" strokeWidth={3} />
                {uploadSummary.uploadedCount} envoyée{uploadSummary.uploadedCount > 1 ? "s" : ""}
              </div>
            ) : null}
          </div>

          {uploadError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{uploadError}</p>
            </div>
          )}

          {previewUrls.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
                  Dernière sélection
                </p>
                <button
                  type="button"
                  onClick={() => setLastSelection([])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E293B]/70 hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4" />
                  Effacer
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {previewUrls.slice(0, 8).map((p) => (
                  <div
                    key={p.url}
                    className="aspect-square overflow-hidden rounded-xl border border-[#E3E5E8] bg-white"
                  >
                    <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                ))}
                {previewUrls.length > 8 && (
                  <div className="aspect-square rounded-xl border border-[#E3E5E8] bg-white flex items-center justify-center">
                    <p className="text-sm font-semibold text-[#1E293B]/70">
                      +{previewUrls.length - 8}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline (projection) */}
      <div className="rounded-2xl border border-[#E3E5E8] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60 mb-4">
          Ensuite
        </p>
        <div className="space-y-3 text-sm text-[#1E293B]/70">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E7FAFA] text-[#2B7A78] text-xs font-bold">
              1
            </div>
            <p>Vous envoyez vos photos</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E7FAFA] text-[#2B7A78] text-xs font-bold">
              2
            </div>
            <p>On prépare votre dossier automatiquement</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E7FAFA] text-[#2B7A78] text-xs font-bold">
              3
            </div>
            <p>Vous recevez 3–5 devis sous 48–72h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
