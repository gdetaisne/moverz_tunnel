"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  onFilesChange: (files: File[]) => void;
  maxPhotos?: number;
  className?: string;
  onUnavailable?: () => void;
};

type CaptureState =
  | "idle"
  | "starting"
  | "active"
  | "error"
  | "unsupported"
  | "permission-denied";

export function CameraCapture({
  onFilesChange,
  maxPhotos = 24,
  className,
  onUnavailable,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const startCamera = async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState("unsupported");
      setError(
        "Votre appareil ne permet pas d'utiliser la caméra dans le navigateur. Utilisez plutôt l'upload de photos classique."
      );
      onUnavailable?.();
      return;
    }

    try {
      setError(null);
      setState("starting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        setState("error");
        setError("Erreur interne lors de l'accès à la caméra.");
        stopStream();
        return;
      }

      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Sur certains navigateurs, play() peut échouer silencieusement si pas assez d'interaction utilisateur
      }

      setState("active");
    } catch (err) {
      console.error("[CameraCapture] getUserMedia error", err);
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError")
      ) {
        setState("permission-denied");
        setError(
          "Accès caméra refusé. Vous pouvez autoriser la caméra dans les réglages du navigateur ou utiliser l'upload classique."
        );
      } else {
        setState("error");
        setError(
          "Impossible d'accéder à la caméra. Essayez de recharger la page ou utilisez l'upload classique."
        );
      }
      onUnavailable?.();
      stopStream();
    }
  };

  const handleCapture = async () => {
    if (state !== "active") return;
    const video = videoRef.current;
    if (!video) return;

    try {
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      if (!width || !height) return;

      const maxWidth = 1600;
      const maxHeight = 1200;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      const targetWidth = Math.round(width * ratio);
      const targetHeight = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          "image/jpeg",
          0.9 // qualité élevée, on recompressera côté backend en 400x300
        );
      });

      if (!blob) return;

      const file = new File([blob], `camera-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      setPhotos((prev) => {
        if (prev.length >= maxPhotos) return prev;
        const next = [...prev, file];
        onFilesChange(next);
        return next;
      });
    } catch (err) {
      console.error("[CameraCapture] capture error", err);
      setError(
        "Erreur lors de la capture de la photo. Réessayez ou utilisez l'upload classique."
      );
    }
  };

  const handleRemove = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onFilesChange(next);
      return next;
    });
  };

  const handleStop = () => {
    stopStream();
    setState("idle");
  };

  const canCaptureMore = photos.length < maxPhotos;

  return (
    <div className={className}>
      <div className="space-y-2 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/70">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Recommandations : 3 à 5 photos par pièce. Tout ce qui est vu sera
            pris en compte.
          </p>
          {state === "active" ? (
            <button
              type="button"
              onClick={handleStop}
              className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
            >
              Fermer la caméra
            </button>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-sm shadow-sky-500/40 hover:bg-sky-400"
            >
              Ouvrir la caméra
            </button>
          )}
        </div>

        {(state === "active" || state === "starting") && (
          <div className="mt-2 space-y-2">
            <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-52 w-full bg-black object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCapture}
                disabled={!canCaptureMore || state !== "active"}
                className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {canCaptureMore
                  ? "Prendre une photo"
                  : "Limite de photos atteinte"}
              </button>
              <span className="text-[11px] text-slate-400">
                {photos.length} / {maxPhotos} photo
                {maxPhotos > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-amber-300">
            {error}
          </p>
        )}

        {photos.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Photos prises avec la caméra
            </p>
            <div className="flex flex-wrap gap-2">
              {photos.map((file, index) => {
                const url = URL.createObjectURL(file);
                return (
                  <button
                    key={`${file.name}-${index}`}
                    type="button"
                    className="relative h-14 w-14 overflow-hidden rounded-xl border border-emerald-400/70 bg-slate-900"
                    onClick={() => handleRemove(index)}
                    title="Retirer cette photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 text-[9px] font-medium text-slate-100">
                      Retirer
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(state === "unsupported" || state === "permission-denied") && (
          <p className="mt-1 text-[11px] text-slate-400">
            Si la caméra ne fonctionne pas sur votre appareil, utilisez plutôt
            le bouton d&apos;upload classique juste au-dessus pour sélectionner
            vos photos depuis la galerie.
          </p>
        )}
      </div>
    </div>
  );
}


