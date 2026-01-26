"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Check, Upload, ImagePlus, X, Loader2, Smartphone, Mail, TrendingUp, Users, Zap } from "lucide-react";
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
  const [mockupAnimationStep, setMockupAnimationStep] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animation mockup (desktop only)
  useEffect(() => {
    if (!mounted || isMobile) return;

    let cancelled = false;

    const runCycle = () => {
      if (cancelled) return;
      setMockupAnimationStep(0);

      setTimeout(() => !cancelled && setMockupAnimationStep(1), 600);
      setTimeout(() => !cancelled && setMockupAnimationStep(2), 1200);
      setTimeout(() => !cancelled && setMockupAnimationStep(3), 1800);
      setTimeout(() => !cancelled && setMockupAnimationStep(4), 2400);
      setTimeout(() => !cancelled && setMockupAnimationStep(5), 3200);
      setTimeout(() => !cancelled && runCycle(), 5500);
    };

    runCycle();

    return () => {
      cancelled = true;
    };
  }, [mounted, isMobile]);

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
        </div>

        {/* Benefits Grid - Style sobre Mobile */}
        <div className="space-y-3">
          {/* Bénéfice 1 : Économies */}
          <div className="relative rounded-2xl bg-white border border-[#E3E5E8] p-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6BCFCF]/10 mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-[#0F172A] mb-1">
              {hasEstimate ? `${eur(savingsMin)}-${eur(savingsMax)}€` : "60-170€"}
            </p>
            <p className="text-xs font-medium text-[#1E293B]/60">
              économisés en moyenne avec photos
            </p>
          </div>

          {/* Bénéfice 2 : Taux de réponse */}
          <div className="relative rounded-2xl bg-white border border-[#E3E5E8] p-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6BCFCF]/10 mx-auto mb-2">
              <Users className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-[#0F172A] mb-1">
              +50%
            </p>
            <p className="text-xs font-medium text-[#1E293B]/60">
              de taux de réponse avec photos
            </p>
          </div>

          {/* Bénéfice 3 : Nombre de devis */}
          <div className="relative rounded-2xl bg-white border border-[#E3E5E8] p-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6BCFCF]/10 mx-auto mb-2">
              <Zap className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-[#0F172A] mb-1">
              2x
            </p>
            <p className="text-xs font-medium text-[#1E293B]/60">
              plus de devis reçus sous 48-72h
            </p>
          </div>
        </div>

        <WhatsAppCTA 
          source="tunnel-v2-mobile" 
          linkingCode={linkingCode || undefined} 
          leadId={leadId || undefined}
          variant="primary"
        />
        <p className="text-xs text-center text-[#1E293B]/60">
          🔒 0 spam • &lt;2 min
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
      </div>

      {/* Benefits Grid - Style sobre */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Bénéfice 1 : Économies */}
        <div className="relative rounded-2xl bg-white border border-[#E3E5E8] p-6 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6BCFCF]/10 mx-auto mb-3">
            <TrendingUp className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
            {hasEstimate ? `${eur(savingsMin)}-${eur(savingsMax)}€` : "60-170€"}
          </p>
          <p className="text-xs font-medium text-[#1E293B]/60">
            économisés en moyenne avec photos
          </p>
        </div>

        {/* Bénéfice 2 : Taux de réponse */}
        <div className="relative rounded-2xl bg-white border border-[#E3E5E8] p-6 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6BCFCF]/10 mx-auto mb-3">
            <Users className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
            +50%
          </p>
          <p className="text-xs font-medium text-[#1E293B]/60">
            de taux de réponse avec photos
          </p>
        </div>

        {/* Bénéfice 3 : Nombre de devis */}
        <div className="relative rounded-2xl bg-white border border-[#E3E5E8] p-6 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6BCFCF]/10 mx-auto mb-3">
            <Zap className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
            2x
          </p>
          <p className="text-xs font-medium text-[#1E293B]/60">
            plus de devis reçus sous 48-72h
          </p>
        </div>
      </div>

      {/* Upload depuis cet ordinateur (EN PREMIER sur desktop) */}
      <div className="space-y-4">
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
            "w-full rounded-2xl border-2 bg-white p-8 text-center transition-all duration-200",
            !leadId
              ? "border-[#E3E5E8] opacity-60"
              : isDragging
              ? "border-[#6BCFCF] bg-[#F0FAFA]"
              : "border-[#E3E5E8] hover:border-[#6BCFCF] hover:bg-[#F0FAFA]/30",
          ].join(" ")}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#6BCFCF]/10">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#6BCFCF]" />
              ) : (
                <ImagePlus className="h-6 w-6 text-[#6BCFCF]" />
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-[#0F172A]">
                Glissez-déposez vos photos ici
              </p>
              <p className="mt-1 text-sm text-[#1E293B]/60">
                ou{" "}
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={!canUpload || uploading}
                  className="font-semibold text-[#6BCFCF] underline underline-offset-2 hover:text-[#2B7A78]"
                >
                  choisissez des fichiers
                </button>
              </p>
              <p className="mt-3 text-xs text-[#1E293B]/50">
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

      {/* Séparateur "ou" */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E3E5E8]"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-4 bg-white text-[#1E293B]/60">ou</span>
        </div>
      </div>

      {/* CTA WhatsApp (EN SECOND sur desktop) */}
      <div className="space-y-3">
        <WhatsAppCTA 
          source="tunnel-v2-desktop" 
          linkingCode={linkingCode || undefined} 
          leadId={leadId || undefined}
          variant="secondary"
        />
        <p className="text-xs text-center text-[#1E293B]/60">
          🔒 0 spam • uniquement pour recevoir vos photos • &lt;2 min
        </p>
      </div>

      {/* Mockup iPhone (exemple pédagogique: 3-4 photos salon) */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60 mb-6">
          Exemple : 3-4 photos de votre salon
        </p>
        <div className="relative mx-auto w-full max-w-[300px]">
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes fadeInUp {
                from {
                  opacity: 0;
                  transform: translateY(10px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `
          }} />
          
          <div className="relative bg-[#1a1a1a] rounded-[3rem] p-3 shadow-xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a1a] rounded-b-3xl z-10" />
            
            <div className="bg-[#f5f5f7] rounded-[2.5rem] overflow-hidden relative">
              {/* Status bar */}
              <div className="h-12 bg-white flex items-center justify-between px-8 pt-2">
                <span className="text-[10px] font-semibold">9:41</span>
                <div className="flex gap-1">
                  <div className="w-4 h-3 border border-black rounded-sm" />
                </div>
              </div>
              
              {/* Header */}
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
              
              {/* Chat content */}
              <div className="p-3 space-y-2 h-[360px] overflow-hidden bg-[#ECE5DD]">
                {/* Message initial */}
                {mockupAnimationStep >= 1 && (
                  <div className="flex justify-start mb-2 animate-[fadeInUp_0.3s_ease-out]">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                      <p className="text-[10px] text-[#0F172A] leading-relaxed">
                        Envoyez 3-4 photos de votre salon 📸
                      </p>
                      <p className="text-[8px] text-[#1E293B]/40 mt-1">10:42</p>
                    </div>
                  </div>
                )}

                {/* Photo 1 - Vue large salon */}
                {mockupAnimationStep >= 2 && (
                  <div className="flex justify-end mb-1 animate-[fadeInUp_0.3s_ease-out]">
                    <div className="w-[45%] aspect-square rounded-lg overflow-hidden shadow-md">
                      <img 
                        src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop&q=80" 
                        alt="Salon vue large"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Photos 2 & 3 - Angles différents */}
                {mockupAnimationStep >= 3 && (
                  <div className="flex justify-end mb-1 animate-[fadeInUp_0.3s_ease-out]">
                    <div className="grid grid-cols-2 gap-1 w-[65%]">
                      <div className="aspect-square rounded-lg overflow-hidden shadow-md">
                        <img 
                          src="https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=300&h=300&fit=crop&q=80" 
                          alt="Salon angle 2"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden shadow-md">
                        <img 
                          src="https://images.unsplash.com/photo-1567016432779-094069958ea5?w=300&h=300&fit=crop&q=80" 
                          alt="Salon angle 3"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Photo 4 - Détail salon */}
                {mockupAnimationStep >= 4 && (
                  <div className="flex justify-end mb-1 animate-[fadeInUp_0.3s_ease-out]">
                    <div className="w-[45%] aspect-square rounded-lg overflow-hidden shadow-md">
                      <img 
                        src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&q=80" 
                        alt="Salon détail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Check marks */}
                {mockupAnimationStep >= 4 && (
                  <div className="flex justify-end mb-2 animate-[fadeIn_0.2s_ease-out]">
                    <div className="text-[8px] text-[#1E293B]/40">✓✓ 10:44</div>
                  </div>
                )}

                {/* Réponse */}
                {mockupAnimationStep >= 5 && (
                  <div className="flex justify-start animate-[fadeInUp_0.3s_ease-out]">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-[10px] text-[#0F172A]">
                        Parfait! 🎉 Faites pareil pour chaque pièce
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input bar */}
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
