"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, Check, X } from "lucide-react";
import { uploadBackofficePhotos } from "@/lib/api/client";
import PremiumShell from "@/components/tunnel/PremiumShell";

function UploadPhotosContent() {
  const searchParams = useSearchParams();
  const linkingCode = searchParams.get("code") || "";
  const leadId = searchParams.get("leadId") || "";
  
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<{
    uploadedCount: number;
    totalPhotos: number;
    errors: { originalFilename: string; reason: string }[];
  } | null>(null);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue lors de l'upload.";
      setError(msg);
      setUploaded(false);
    } finally {
      setUploading(false);
    }
  };

  const TARGET_PHOTOS = 12;
  const photoCount = files.length;
  const progress = Math.min(1, photoCount / TARGET_PHOTOS);
  const score = Math.round(35 + progress * 65); // 35–100

  const scoreLabel =
    score >= 90 ? "Très élevé" : score >= 75 ? "Élevé" : score >= 55 ? "Correct" : "Faible";

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
            {/* Compact incentive */}
            <section className="moverz-animate-fade-in rounded-3xl border border-[#E3E5E8] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E293B]/60">
                    Devis plus comparables, plus vite
                  </p>
                  <p className="mt-1 text-sm text-[#1E293B]/70">
                    Ajoutez des photos → on réduit l’incertitude (volume + accès) → moins de marge “au cas où”.
                  </p>
                </div>

                <div className="flex-shrink-0 rounded-2xl bg-[#0F172A] px-4 py-3 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Score
                    </p>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90">
                      {scoreLabel}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <p className="text-xl font-bold">{score}</p>
                    <p className="text-[11px] text-white/60">
                      {photoCount}/{TARGET_PHOTOS}
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#6BCFCF] moverz-transition-fast"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-white/60">
                    Objectif: 10–12 photos (toutes les pièces)
                  </p>
                </div>
              </div>
            </section>

            {/* Instructions */}
            <div className="moverz-animate-fade-in rounded-3xl border border-[#E3E5E8] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <h2 className="mb-4 text-xl font-bold text-[#0F172A]">
                Quoi photographier
              </h2>
              <div className="flex flex-wrap gap-2 text-sm text-[#1E293B]/75">
                {[
                  "Salon",
                  "Chambres",
                  "Cuisine",
                  "SDB / WC",
                  "Cave / Garage",
                  "Escaliers",
                  "Entrée immeuble",
                  "Meubles volumineux",
                ].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-[#E3E5E8] bg-[#F8F9FA] px-3 py-1"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#1E293B]/60">
                Le but: capturer <span className="font-semibold text-[#0F172A]">les volumes + les accès</span> (photos simples, pas besoin d’être parfait).
              </p>
            </div>

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
                    className="text-sm text-[#1E293B]/65 hover:text-[#0F172A] transition-colors"
                  >
                    Tout supprimer
                  </button>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square overflow-hidden rounded-2xl border border-[#E3E5E8] bg-white">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="mt-1 truncate text-xs text-[#1E293B]/60">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading || !leadId}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#6BCFCF] px-8 py-4 text-base font-semibold text-[#0F172A] hover:bg-[#5BBFBF] disabled:opacity-50 disabled:cursor-not-allowed moverz-transition-fast"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0F172A] border-t-transparent" />
                      <span>Upload en cours...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Envoyer {files.length} photo{files.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
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

