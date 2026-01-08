"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, Check, X, Image as ImageIcon } from "lucide-react";

function UploadPhotosContent() {
  const searchParams = useSearchParams();
  const linkingCode = searchParams.get("code") || "";
  
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

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
    setUploading(true);
    
    // TODO: Implement actual upload to server
    // For now, just simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setUploaded(true);
    setUploading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B]">
      {/* Header */}
      <div className="bg-[#0F172A] border-b border-white/10 py-6">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Upload vos photos</h1>
              <p className="text-sm text-white/60 mt-1">
                Code dossier : <span className="font-mono text-[#6BCFCF]">{linkingCode || "Non fourni"}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!uploaded ? (
          <div className="space-y-8">
            {/* Instructions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">📸 Photos recommandées</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-white/70">
                <div>✓ Salon</div>
                <div>✓ Chambres</div>
                <div>✓ Cuisine</div>
                <div>✓ Cave / Garage</div>
                <div>✓ Escaliers</div>
                <div>✓ Parking</div>
                <div>✓ Entrée immeuble</div>
                <div>✓ Ascenseur</div>
                <div>✓ Meubles volumineux</div>
              </div>
              <p className="text-xs text-white/50 mt-4">
                💡 Plus de photos = devis plus justes (±5%)
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging
                  ? "border-[#6BCFCF] bg-[#6BCFCF]/10"
                  : "border-white/20 bg-white/5 hover:border-white/40"
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <Upload className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Glissez vos photos ici
              </h3>
              <p className="text-white/60">
                ou cliquez pour sélectionner des fichiers
              </p>
              <p className="text-sm text-white/40 mt-2">
                JPG, PNG, HEIC acceptés
              </p>
            </div>

            {/* Preview grid */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">
                    {files.length} photo{files.length > 1 ? 's' : ''} sélectionnée{files.length > 1 ? 's' : ''}
                  </h3>
                  <button
                    onClick={() => setFiles([])}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Tout supprimer
                  </button>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-xl bg-white/10 border border-white/20 overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-white/60 mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#6BCFCF] px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#5BBFBF] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Upload en cours...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Envoyer {files.length} photo{files.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          // Success state
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500 mx-auto mb-6">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              Photos envoyées ! 🎉
            </h2>
            
            <p className="text-xl text-white/70 mb-8">
              Vous allez recevoir vos devis sous 48-72h par email.
            </p>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white mb-4">Que se passe-t-il maintenant ?</h3>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-white font-semibold">Notre IA analyse vos photos</p>
                    <p className="text-sm text-white/60">Estimation volume et inventaire</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-white font-semibold">Dossier envoyé aux déménageurs</p>
                    <p className="text-sm text-white/60">Déménageurs locaux vérifiés</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="text-white font-semibold">Vous recevez 3-5 devis</p>
                    <p className="text-sm text-white/60">Prix basés sur la même estimation</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.location.href = "https://moverz.fr"}
              className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-8 py-3 text-base font-semibold text-white hover:bg-white/10 transition-all"
            >
              Retour à l'accueil
            </button>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-sm text-white/40">
          🔒 Vos photos sont sécurisées et ne seront utilisées que pour votre devis
        </p>
      </div>
    </main>
  );
}

export default function UploadPhotosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent mb-4"></div>
          <p className="text-white/70">Chargement...</p>
        </div>
      </div>
    }>
      <UploadPhotosContent />
    </Suspense>
  );
}

