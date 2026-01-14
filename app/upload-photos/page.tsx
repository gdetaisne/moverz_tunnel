"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, Check, X, Trash2, Sparkles } from "lucide-react";
import {
  analyzeTunnelPhotos,
  listBackofficePhotos,
  uploadBackofficePhotos,
  uploadTunnelPhotos,
} from "@/lib/api/client";
import PremiumShell from "@/components/tunnel/PremiumShell";

function UploadPhotosContent() {
  const searchParams = useSearchParams();
  const linkingCode = searchParams.get("code") || "";
  const leadId = searchParams.get("leadId") || "";
  
  const [files, setFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<
    Array<{ id: string; url: string; originalFilename: string }>
  >([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<{
    volumeTotalM3: number;
    rooms: Array<{
      roomType: string;
      label: string;
      photosCount: number;
      volumeTotalM3: number;
      topItems: Array<{ label: string; quantity: number; volumeM3: number | null }>;
    }>;
  } | null>(null);
  const [uploadSummary, setUploadSummary] = useState<{
    uploadedCount: number;
    totalPhotos: number;
    errors: { originalFilename: string; reason: string }[];
  } | null>(null);

  const canSubmit = !!leadId && files.length > 0 && !uploading && !analyzing;
  const canAnalyze = !!leadId && files.length > 0 && !uploading && !analyzing;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!leadId) return;
      setLoadingExisting(true);
      try {
        const photos = await listBackofficePhotos(leadId);
        if (!cancelled) setExistingPhotos(photos);
      } catch {
        // ignore: on garde la page utilisable même si listing indispo
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type.startsWith('image/')
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setError(null);
    setUploadSummary(null);

    if (!leadId) {
      setError("Impossible d'envoyer vos photos: identifiant dossier manquant.");
      return;
    }
    if (files.length === 0) {
      setError("Aucune photo sélectionnée.");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadBackofficePhotos(leadId, files);
      const uploadedCount = res.data.uploaded?.length ?? 0;
      setUploadSummary({
        uploadedCount,
        totalPhotos: res.data.totalPhotos ?? 0,
        errors: res.data.errors ?? [],
      });
      setUploaded(true);
      // Refresh listing (et fallback: merge local)
      try {
        const refreshed = await listBackofficePhotos(leadId);
        setExistingPhotos(refreshed);
      } catch {
        // fallback merge
        const added = (res.data.uploaded ?? []).filter((p) => typeof p?.url === "string");
        setExistingPhotos((prev) => {
          const byUrl = new Set(prev.map((p) => p.url));
          const merged = [...prev];
          for (const p of added) {
            if (!byUrl.has(p.url)) {
              merged.push({
                id: String(p.id ?? p.url),
                url: p.url,
                originalFilename: String(p.originalFilename ?? ""),
              });
            }
          }
          return merged;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue lors de l'upload.";
      setError(msg);
      setUploaded(false);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setAnalysisSummary(null);

    if (!leadId) {
      setError("Impossible d'analyser: identifiant dossier manquant.");
      return;
    }
    if (files.length === 0) {
      setError("Ajoutez au moins une photo avant d'analyser.");
      return;
    }

    setAnalyzing(true);
    try {
      // 1) Upload local (tunnel) -> récupère storageKey pour analyse
      const localUpload = await uploadTunnelPhotos(leadId, files);
      if (localUpload.errors.length > 0 && localUpload.success.length === 0) {
        setError("Aucune photo n'a pu être préparée pour l'analyse.");
        return;
      }

      // 2) Analyse (same-room + inventaire par pièce)
      const summary = await analyzeTunnelPhotos(localUpload.success);
      setAnalysisSummary(summary);

      // 3) Push au Back Office (source de vérité + devis)
      try {
        await uploadBackofficePhotos(leadId, files);
        // refresh listing pour afficher les photos déjà reçues
        const refreshed = await listBackofficePhotos(leadId);
        setExistingPhotos(refreshed);
      } catch (err) {
        console.warn("⚠️ Upload Back Office après analyse échoué:", err);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erreur inconnue lors de l'analyse.";
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <PremiumShell>
      {/* Header */}
      <header className="moverz-animate-fade-in mb-8 rounded-3xl border border-[#E3E5E8] bg-white/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] moverz-glass">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Moverz" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">
                Ajoutez vos photos
              </h1>
              <p className="mt-1 text-sm text-[#1E293B]/70">
                {leadId ? (
                  <>
                    Dossier :{" "}
                    <span className="font-mono text-[#2B7A78]">{leadId}</span>
                    {linkingCode ? (
                      <>
                        {" "}
                        · Code :{" "}
                        <span className="font-mono text-[#2B7A78]">
                          {linkingCode}
                        </span>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    Dossier :{" "}
                    <span className="font-mono text-amber-700">Non fourni</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
        {!uploaded ? (
          <div className="space-y-8">
            {/* Existing photos (if any) */}
            {leadId && (loadingExisting || existingPhotos.length > 0) && (
              <div className="rounded-3xl border border-[#E3E5E8] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    Photos déjà reçues
                  </h2>
                  <span className="text-sm text-[#1E293B]/70">
                    {loadingExisting ? "…" : `${existingPhotos.length}`}
                  </span>
                </div>

                {existingPhotos.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {existingPhotos.slice(0, 12).map((p) => (
                      <div
                        key={p.id}
                        className="aspect-square overflow-hidden rounded-2xl border border-[#E3E5E8] bg-[#F8F9FA]"
                      >
                        <img
                          src={p.url}
                          alt={p.originalFilename || "Photo"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#1E293B]/70">
                    {loadingExisting ? "Chargement…" : "Aucune photo enregistrée pour ce dossier."}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                {error}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={`relative moverz-animate-fade-in rounded-3xl border-2 border-dashed p-10 text-center moverz-transition-fast ${
                isDragging
                  ? "border-[#6BCFCF] bg-[#6BCFCF]/10"
                  : "border-[#E3E5E8] bg-white/70 hover:border-[#6BCFCF]/60 hover:bg-white"
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6BCFCF]/15 text-[#2B7A78] shadow-sm">
                <Upload className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-[#0F172A]">
                Glissez vos photos ici
              </h3>
              <p className="text-[#1E293B]/70">
                ou cliquez pour sélectionner des fichiers
              </p>
              <p className="mt-2 text-sm text-[#1E293B]/55">
                JPG, PNG, HEIC acceptés
              </p>
            </div>

            {/* Preview grid */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {files.length} photo{files.length > 1 ? 's' : ''} sélectionnée{files.length > 1 ? 's' : ''}
                  </h3>
                  <button
                    onClick={() => setFiles([])}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#1E293B]/70 hover:text-[#0F172A] transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Tout supprimer
                  </button>
                </div>

                {/* Thumbnails (smaller) */}
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square overflow-hidden rounded-2xl border border-[#E3E5E8] bg-white shadow-sm">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        aria-label="Supprimer cette photo"
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#0F172A] shadow-md ring-1 ring-black/5 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Résumé en dessous des photos (demandé) */}
                {analysisSummary && (
                  <div className="rounded-3xl border border-[#E3E5E8] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-bold text-[#0F172A]">
                        Résumé de l’analyse (indicatif)
                      </h2>
                      <div className="text-sm text-[#1E293B]/70">
                        Volume total estimé :{" "}
                        <span className="font-semibold text-[#0F172A]">
                          {analysisSummary.volumeTotalM3} m³
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {analysisSummary.rooms.slice(0, 6).map((r, idx) => (
                        <div
                          key={`${r.roomType}-${idx}`}
                          className="rounded-2xl border border-[#E3E5E8] bg-[#F8F9FA] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-[#0F172A]">
                              {r.label}
                            </div>
                            <div className="text-xs text-[#1E293B]/60 text-right">
                              <div>
                                {r.photosCount} photo{r.photosCount > 1 ? "s" : ""}
                              </div>
                              <div className="font-semibold text-[#0F172A]">
                                Total : {r.volumeTotalM3} m³
                              </div>
                            </div>
                          </div>
                          {r.topItems.length > 0 ? (
                            <ul className="mt-2 space-y-1 text-sm text-[#1E293B]/70">
                              {r.topItems.slice(0, 3).map((it, j) => (
                                <li key={j} className="flex justify-between gap-3">
                                  <span className="truncate">
                                    {it.quantity > 1 ? `${it.quantity}× ` : ""}
                                    {it.label}
                                  </span>
                                  <span className="shrink-0 text-[#1E293B]/60">
                                    {typeof it.volumeM3 === "number"
                                      ? `${Math.round(it.volumeM3 * 10) / 10} m³`
                                      : "—"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="mt-2 text-sm text-[#1E293B]/70">
                              Objets non détectés.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 text-xs text-[#1E293B]/55">
                      Total = meubles + cartons (objets divers). Estimation automatique.
                    </div>
                  </div>
                )}

                {!leadId && (
                  <p className="text-xs text-amber-800">
                    Identifiant dossier manquant: revenez depuis la page de confirmation.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          // Success state
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500 mx-auto mb-6">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            
            <h2 className="text-3xl font-bold text-[#0F172A] mb-4">
              Photos envoyées
            </h2>
            
            <p className="text-xl text-[#1E293B]/70 mb-8">
              Vous allez recevoir vos devis sous 48-72h par email.
            </p>

            {uploadSummary && uploadSummary.errors.length > 0 && (
              <div className="mb-8 rounded-3xl bg-white p-6 border border-[#E3E5E8] max-w-md mx-auto text-left shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <h3 className="text-lg font-bold text-[#0F172A] mb-2">
                  Certaines photos n'ont pas pu être envoyées
                </h3>
                <ul className="space-y-2 text-sm text-[#1E293B]/70">
                  {uploadSummary.errors.slice(0, 5).map((e, idx) => (
                    <li key={idx}>
                      <span className="font-mono">{e.originalFilename}</span>: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-3xl bg-white p-6 border border-[#E3E5E8] max-w-md mx-auto shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-bold text-[#0F172A] mb-4">Que se passe-t-il maintenant ?</h3>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-[#0F172A] font-semibold">Notre IA analyse vos photos</p>
                    <p className="text-sm text-[#1E293B]/70">Estimation volume et inventaire</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-[#0F172A] font-semibold">Dossier envoyé aux déménageurs</p>
                    <p className="text-sm text-[#1E293B]/70">Déménageurs locaux vérifiés</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="text-[#0F172A] font-semibold">Vous recevez 3-5 devis</p>
                    <p className="text-sm text-[#1E293B]/70">Prix basés sur la même estimation</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.location.href = "https://moverz.fr"}
              className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-[#E3E5E8] bg-white px-8 py-3 text-base font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5 moverz-transition-fast"
            >
              Retour à l'accueil
            </button>
          </div>
        )}
      
      {/* Footer note */}
      <div className="mt-10">
        <p className="text-center text-sm text-[#1E293B]/55">
          Vos photos sont sécurisées et ne seront utilisées que pour votre devis
        </p>
      </div>

      {/* Sticky CTA bar */}
      {!uploaded && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
          <div className="pointer-events-auto mx-auto w-full max-w-5xl px-4 pb-4">
            <div className="rounded-3xl border border-[#E3E5E8] bg-white/90 p-3 shadow-[0_10px_40px_rgba(0,0,0,0.10)] backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-[#1E293B]/70">
                  {files.length > 0 ? (
                    <>
                      <span className="font-semibold text-[#0F172A]">{files.length}</span>{" "}
                      photo{files.length > 1 ? "s" : ""} prête{files.length > 1 ? "s" : ""} à envoyer
                    </>
                  ) : (
                    <span>Sélectionne des photos pour confirmer.</span>
                  )}
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    disabled={!canAnalyze}
                    onClick={handleAnalyze}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#E3E5E8] bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#6BCFCF]/5 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4" />
                    {analyzing ? "Analyse…" : "Analyser mon dossier"}
                  </button>

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!canSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6BCFCF] px-7 py-3 text-sm font-semibold text-[#0F172A] hover:bg-[#5BBFBF] disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0F172A] border-t-transparent" />
                        <span>Upload…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Confirmer et obtenir mes devis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PremiumShell>
  );
}

export default function UploadPhotosPage() {
  return (
    <Suspense
      fallback={
        <PremiumShell containerClassName="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent mb-4"></div>
            <p className="text-[#1E293B]/70">Chargement...</p>
          </div>
        </PremiumShell>
      }
    >
      <UploadPhotosContent />
    </Suspense>
  );
}

