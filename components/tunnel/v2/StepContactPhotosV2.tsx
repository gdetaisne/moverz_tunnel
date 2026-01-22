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
  const [showImpactDetails, setShowImpactDetails] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

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

  const euro = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  const eur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  // Impact photos
  const DISCOUNT_RATE = 0.1;
  const discountedMin = hasEstimate ? Math.round(estimateMinEur * (1 - DISCOUNT_RATE)) : 0;
  const discountedMax = hasEstimate ? Math.round(estimateMaxEur * (1 - DISCOUNT_RATE)) : 0;
  const savingsMin = hasEstimate ? Math.max(0, Math.round(estimateMinEur - discountedMin)) : 0;
  const savingsMax = hasEstimate ? Math.max(0, Math.round(estimateMaxEur - discountedMax)) : 0;
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

  const handleSendWhatsAppEmail = async () => {
    if (!leadId || !linkingCode) {
      setUploadError("Identifiant dossier manquant.");
      return;
    }
    setSendingEmail(true);
    try {
      // TODO: appeler l'API pour envoyer l'email avec le lien WhatsApp
      // Simulé pour l'instant
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setEmailSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi de l'email.";
      setUploadError(msg);
    } finally {
      setSendingEmail(false);
    }
  };

  // Impact card component (réutilisable)
  const ImpactCard = () =>
    hasEstimate ? (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-[2px] shadow-[0_20px_50px_rgba(15,23,42,0.3)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-[#6BCFCF]/30 blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-[#6BCFCF]/20 blur-3xl" />
        </div>

        <div className="relative rounded-[calc(1.5rem-2px)] bg-[#0F172A] p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">
              Impact des photos
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/20 border border-[#6BCFCF]/40 px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6BCFCF] animate-pulse" />
              <span className="text-[10px] font-bold text-[#6BCFCF]">-10% estimé</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-lg md:text-xl font-bold text-white/90 mb-2">Gagnez</p>
            <div className="inline-block relative">
              <div className="absolute inset-0 blur-2xl bg-[#6BCFCF]/20" />
              <p className="relative text-6xl md:text-7xl font-black text-white tabular-nums tracking-tight leading-none">
                {savingsText ?? "—"}
              </p>
            </div>
            <p className="mt-3 text-sm text-white/60">en ajoutant vos photos maintenant</p>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
            <button
              type="button"
              onClick={() => setShowImpactDetails((v) => !v)}
              className="w-full flex items-center justify-between group"
            >
              <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                {showImpactDetails ? "Masquer le détail" : "Voir comment on calcule"}
              </span>
              <svg
                className={`w-5 h-5 text-white/60 transition-transform duration-200 ${
                  showImpactDetails ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showImpactDetails && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Estimation actuelle</span>
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {`${euro(estimateMinEur)} – ${euro(estimateMaxEur)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Avec photos détaillées</span>
                  <span className="text-sm font-semibold text-[#6BCFCF] tabular-nums">
                    {`${euro(discountedMin)} – ${euro(discountedMax)}`}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-white/50 leading-relaxed">
                    Photos complètes → volume et temps mieux estimés → marge d'incertitude réduite → meilleur prix final.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;

  // Mobile layout
  if (mounted && isMobile) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
            Dernière étape
          </p>
          <h2 className="text-2xl font-black text-[#0F172A]">
            Envoyez vos photos 📸
          </h2>
          {!leadId && (
            <p className="text-sm text-[#B91C1C]">
              Une information manque. Revenez à l'étape précédente.
            </p>
          )}
        </div>

        {/* CTA WhatsApp principal (above the fold) */}
        <div className="space-y-3">
          <WhatsAppCTA 
            source="tunnel-v2-mobile" 
            linkingCode={linkingCode || undefined} 
            leadId={leadId || undefined}
            variant="primary"
          />
          <p className="text-xs text-center text-[#1E293B]/60">
            Le lien s'ouvre dans WhatsApp → envoyez 3-8 photos par pièce
          </p>
        </div>

        {/* Impact card */}
        <ImpactCard />

        {/* Option upload mobile */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E3E5E8]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
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

  // Desktop layout
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
          Dernière étape
        </p>
        <h2 className="text-3xl font-black text-[#0F172A]">
          Envoyez vos photos pour recevoir vos devis 📸
        </h2>
        {!leadId && (
          <p className="text-sm text-[#B91C1C]">
            Une information manque. Revenez à l'étape précédente pour renseigner votre email.
          </p>
        )}
      </div>

      {/* Grid: Impact card + mockup */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <ImpactCard />
        
        {/* Mockup iPhone - compact */}
        <div className="relative">
          <div className="relative mx-auto w-full max-w-[280px]">
            <div className="relative bg-[#1a1a1a] rounded-[3rem] p-3 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a1a] rounded-b-3xl z-10" />
              
              <div className="bg-[#f5f5f7] rounded-[2.5rem] overflow-hidden relative">
                <div className="h-12 bg-white flex items-center justify-between px-8 pt-2">
                  <span className="text-[10px] font-semibold">9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-3 border border-black rounded-sm" />
                  </div>
                </div>
                
                <div className="bg-white px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#E3E5E8] shadow-sm flex items-center justify-center overflow-hidden">
                      <img src="/icon.png" alt="Moverz" className="w-5 h-5 object-contain" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A]">Moverz</p>
                      <p className="text-[10px] text-[#1E293B]/50">en ligne</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 space-y-2 h-[380px] overflow-hidden bg-[#ECE5DD]">
                  <div className="flex justify-start mb-2">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-[10px] text-[#0F172A] leading-relaxed">
                        Envoyez <strong>3-8 photos</strong> 📸 par pièce
                      </p>
                      <p className="text-[8px] text-[#1E293B]/40 mt-1">10:42</p>
                    </div>
                  </div>

                  <div className="flex justify-end mb-1">
                    <div className="grid grid-cols-2 gap-0.5 max-w-[75%]">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-amber-200 to-orange-100" />
                      <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-50" />
                      <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-pink-50" />
                      <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-green-100 to-emerald-50" />
                    </div>
                  </div>

                  <div className="flex justify-end mb-2">
                    <div className="text-[8px] text-[#1E293B]/40">✓✓ 10:44</div>
                  </div>

                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-[10px] text-[#0F172A]">
                        Parfait! 🎉 Devis sous <strong>48-72h</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F0F2F5] border-t border-gray-200 px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 bg-white rounded-full px-3 py-2 text-[10px] text-[#1E293B]/40">
                    Message
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">➤</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Options desktop */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-[#0F172A] text-center">
          Choisissez votre méthode d'envoi
        </p>

        {/* Option 1: WhatsApp par email */}
        {!emailSent ? (
          <button
            type="button"
            onClick={handleSendWhatsAppEmail}
            disabled={!canUpload || sendingEmail}
            className="w-full rounded-3xl bg-gradient-to-r from-[#6BCFCF] to-[#2B7A78] p-[2px] shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60"
          >
            <div className="rounded-[calc(1.5rem-2px)] bg-white px-6 py-4 flex items-center justify-center gap-3">
              <Mail className="h-5 w-5 text-[#2B7A78]" />
              <span className="text-base font-semibold text-[#0F172A]">
                {sendingEmail ? "Envoi en cours…" : "Recevoir le lien WhatsApp par email"}
              </span>
            </div>
          </button>
        ) : (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-sm font-semibold text-green-700">
              ✓ Email envoyé ! Vérifiez votre boîte de réception.
            </p>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E3E5E8]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-[#1E293B]/60">ou</span>
          </div>
        </div>

        {/* Option 2: Dropzone */}
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
            "w-full rounded-3xl border-2 bg-white p-6 text-center transition-all duration-200",
            !leadId
              ? "border-[#E3E5E8] opacity-60"
              : isDragging
              ? "border-[#6BCFCF] bg-[#F0FAFA] scale-[1.02]"
              : "border-dashed border-[#E3E5E8] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5",
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
              <p className="mt-2 text-xs text-[#1E293B]/60">
                Idéalement 3–8 photos par pièce (bonne lumière, angles larges)
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

      {/* Next steps */}
      <div className="rounded-2xl bg-[#F8F9FA] p-6 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60 mb-4">
          Prochaines étapes
        </p>
        <div className="space-y-3 text-sm text-[#1E293B]/70">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
              <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
            </div>
            <p>Vous envoyez vos photos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
              <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
            </div>
            <p>Notre IA prépare votre dossier en 30s</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
              <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
            </div>
            <p>Vous recevez 3-5 devis sous 48-72h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
