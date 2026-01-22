"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Check, Upload, ImagePlus, X, Loader2 } from "lucide-react";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const canUpload = !!leadId && mounted && !isMobile;

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

  // Impact photos: on affiche un gain basé sur la fourchette précédente.
  // Hypothèse UX: des photos détaillées améliorent la précision et peuvent réduire le prix final (~10%).
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
    // Previews uniquement pour la dernière sélection (évite de stocker trop d’URLs)
    return lastSelection.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSelection]);

  useEffect(() => {
    return () => {
      // cleanup
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
      setUploadError("Identifiant dossier manquant. Revenez à l’étape précédente.");
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
      const msg = err instanceof Error ? err.message : "Erreur inconnue lors de l’upload.";
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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
          Dernière étape
        </p>
        <p className="text-sm text-[#1E293B]/70">
          Envoyez vos photos pour recevoir vos devis.
        </p>
        {!leadId && (
          <p className="text-sm text-[#B91C1C]">
            Une information manque. Revenez à l’étape précédente pour renseigner votre email.
          </p>
        )}
      </div>

      {/* Hero section - moverz.fr style */}
      <div className="grid lg:grid-cols-[1fr,340px] gap-12 lg:gap-20 items-center">
        {/* Left: Message */}
        <div className="text-center lg:text-left order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-6">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Dossier créé
          </div>
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-[#0F172A] mb-6 leading-[1.1]">
            Photographiez <span className="text-[#6BCFCF]">toutes</span> vos pièces
          </h2>
          
          <p className="text-base md:text-lg text-[#1E293B]/70 mb-10 leading-relaxed">
            Plus vous envoyez de photos détaillées, plus les déménageurs peuvent estimer précisément <strong>le volume et le temps nécessaire</strong>
          </p>

          {/* Estimate impact - ULTRA SIMPLE */}
          {hasEstimate && (
            <div className="relative overflow-hidden rounded-3xl border border-[#E3E5E8] bg-white p-6 md:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              {/* Premium accent */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#6BCFCF]/18 blur-2xl" />
                <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[#6BCFCF]/12 blur-2xl" />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60">
                    Impact des photos
                  </p>
                  <span className="rounded-full bg-[#E7FAFA] px-3 py-1 text-xs font-semibold text-[#2B7A78]">
                    Jusqu’à -10%*
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr,1fr] md:items-end">
                  <div className="rounded-2xl bg-[#0F172A] p-5 text-white shadow-[0_8px_24px_rgba(15,23,42,0.25)]">
                    <p className="text-sm text-white/80">Économie potentielle</p>
                    <p className="mt-2 text-4xl md:text-5xl font-black tracking-tight tabular-nums">
                      {savingsText ?? "—"}
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      Ajoutez des photos maintenant pour réduire l’incertitude du devis.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E3E5E8] bg-white/70 p-5 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[#1E293B]/70">Estimation</span>
                      <span className="text-sm font-semibold text-[#0F172A] tabular-nums">
                        {`${euro(estimateMinEur)} – ${euro(estimateMaxEur)}`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-sm text-[#1E293B]/70">Avec photos</span>
                      <span className="text-sm font-semibold text-[#0F172A] tabular-nums">
                        {`${euro(discountedMin)} – ${euro(discountedMax)}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowImpactDetails((v) => !v)}
                      className="mt-3 text-xs font-semibold text-[#0F172A] underline underline-offset-2"
                    >
                      {showImpactDetails ? "Masquer le détail" : "Voir le détail"}
                    </button>

                    {showImpactDetails && (
                      <div className="mt-3 text-xs text-[#1E293B]/60">
                        *Hypothèse UX: photos complètes → volume/temps mieux estimés → marge
                        d’incertitude réduite.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Realistic iPhone mockup - moverz.fr style */}
        <div className="order-1 lg:order-2 relative">
          <div className="relative mx-auto w-full max-w-[300px]">
            {/* Phone frame - cleaner */}
            <div className="relative bg-[#1a1a1a] rounded-[3rem] p-3 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a1a] rounded-b-3xl z-10" />
              
              {/* Screen */}
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
                      <img
                        src="/icon.png"
                        alt="Moverz"
                        className="w-5 h-5 object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A]">Moverz</p>
                      <p className="text-[10px] text-[#1E293B]/50">en ligne</p>
                    </div>
                  </div>
                </div>
                
                {/* Chat content */}
                <div className="p-3 space-y-2 h-[420px] overflow-hidden bg-[#ECE5DD]">
                  {/* Message bubble */}
                  <div className="flex justify-start mb-3">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-[10px] text-[#0F172A] leading-relaxed">
                        Bonjour! Envoyez-moi <strong>3 à 8 photos</strong> 📸 par pièce pour recevoir des devis précis 💰
                      </p>
                      <p className="text-[8px] text-[#1E293B]/40 mt-1">10:42</p>
                    </div>
                  </div>

                  {/* Photo grid bubbles - realistic */}
                  <div className="flex justify-end">
                    <div className="grid grid-cols-2 gap-1 max-w-[80%]">
                      {/* Real-looking photo thumbnails */}
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100" />
                        <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          Salon
                        </div>
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100" />
                        <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          Cuisine
                        </div>
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-50 to-rose-100" />
                        <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          Chambre
                        </div>
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-emerald-50 to-lime-100" />
                        <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                          SdB
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="text-[8px] text-[#1E293B]/40">✓✓ 10:44</div>
                  </div>

                  {/* Response */}
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-[10px] text-[#0F172A]">
                        Parfait! 🎉 Vos <strong>3 à 5 devis</strong> arrivent sous <strong>48-72h</strong>
                      </p>
                    </div>
                  </div>
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
            
            {/* Floating badge - simpler */}
            <div className="absolute -right-6 top-20 bg-white rounded-xl shadow-md px-3 py-2 border border-gray-100">
              <p className="text-[10px] font-bold text-[#0F172A]">3 min</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - light style like moverz.fr */}
      <div className="mb-8 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
            Dernière étape
          </p>
          <p className="text-sm text-[#1E293B]/70">
            Envoyez quelques photos pour transformer cette estimation en devis concrets.
          </p>
          <WhatsAppCTA 
            source="tunnel-v2" 
            linkingCode={linkingCode || undefined} 
            leadId={leadId || undefined}
            variant="primary"
          />

          {/* Desktop upload option */}
          {mounted && !isMobile && (
            <>
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
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (!files.length) return;
                  void handleUploadFiles(files);
                  // reset value so selecting same files again works
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
                  "w-full rounded-3xl border-2 bg-white p-5 text-left transition-all duration-200",
                  !leadId
                    ? "border-[#E3E5E8] opacity-60"
                    : isDragging
                    ? "border-[#6BCFCF] bg-[#F0FAFA]"
                    : "border-dashed border-[#E3E5E8] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6BCFCF]/15 text-[#2B7A78]">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">
                        Glissez-déposez vos photos ici
                      </p>
                      <p className="mt-1 text-sm text-[#1E293B]/70">
                        ou{" "}
                        <button
                          type="button"
                          onClick={openFilePicker}
                          disabled={!canUpload || uploading}
                          className="font-semibold text-[#0F172A] underline underline-offset-2"
                        >
                          choisissez des fichiers
                        </button>
                      </p>
                      <p className="mt-2 text-xs text-[#1E293B]/60">
                        Idéalement 3–8 photos par pièce (bonne lumière, angles larges).
                      </p>
                    </div>
                  </div>

                  {uploadSummary?.uploadedCount ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      {uploadSummary.uploadedCount} envoyées
                    </div>
                  ) : null}
                </div>

                {(uploadError || uploadSummary?.errors?.length) && (
                  <div className="mt-4 rounded-2xl border border-[#E3E5E8] bg-[#F8F9FA] p-4">
                    {uploadError && (
                      <p className="text-sm font-medium text-[#B91C1C]">{uploadError}</p>
                    )}
                    {!!uploadSummary?.errors?.length && (
                      <div className="mt-2 space-y-1">
                        {uploadSummary.errors.slice(0, 3).map((e) => (
                          <p key={e.originalFilename} className="text-xs text-[#1E293B]/70">
                            <span className="font-semibold">{e.originalFilename}:</span> {e.reason}
                          </p>
                        ))}
                        {uploadSummary.errors.length > 3 && (
                          <p className="text-xs text-[#1E293B]/60">
                            +{uploadSummary.errors.length - 3} autres erreurs
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {previewUrls.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
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
                    <div className="mt-3 grid grid-cols-4 gap-2">
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

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={!canUpload || uploading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white border-2 border-[#E3E5E8] px-6 py-3 text-sm font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5 transition-all duration-200 disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Envoi en cours…" : "Ajouter des photos"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const url = new URL("/upload-photos", window.location.origin);
                      if (leadId) url.searchParams.set("leadId", leadId);
                      if (linkingCode) url.searchParams.set("code", linkingCode);
                      window.location.href = url.toString();
                    }}
                    disabled={!leadId}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E293B] transition-all duration-200 disabled:opacity-60"
                  >
                    Ouvrir l’analyse (optionnel)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compact next steps */}
      <div className="rounded-2xl bg-[#F8F9FA] p-6 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
          Prochaines étapes
        </p>
        <div className="mt-4 space-y-3 text-sm text-[#1E293B]/70">
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
