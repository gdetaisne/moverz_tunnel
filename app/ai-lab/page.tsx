'use client';

import { useEffect, useMemo, useState } from "react";
import {
  type NormalizedItem,
  type NormalizedProcessResult,
  type NormalizedRoom,
} from "./types";
import { getStandardVolumeForLabel } from "./standardVolumes";
import {
  enrichItemsWithBusinessRules,
  applyPackagingRules,
} from "@/lib/inventory/businessRules";

type TestSetName = "set_1" | "set_2" | "set_3";
type ProcessId = "process1" | "process2";

interface AnalyzePhotoInput {
  id: string;
  storageKey: string;
  originalFilename: string;
}

interface AnalyzedItem {
  label: string;
  category: string;
  quantity: number;
  confidence: number;
  flags?: {
    fragile?: boolean;
    highValue?: boolean;
    requiresDisassembly?: boolean;
  };
}

interface AnalyzedRoom {
  roomId: string;
  roomType: string;
  label: string;
  photoIds: string[];
  items: AnalyzedItem[];
}

interface AnalysisProcess {
  id: "process1" | "process2";
  label: string;
  model: string;
  rooms: AnalyzedRoom[];
  totalMs?: number;
}

interface Process2InventoryRow {
  roomType: string;
  roomLabel: string;
  itemLabel: string;
  quantity: number;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  SALON: "Salon",
  CUISINE: "Cuisine",
  CHAMBRE: "Chambre",
  SALLE_DE_BAIN: "Salle de bain",
  WC: "WC",
  COULOIR: "Couloir",
  BUREAU: "Bureau",
  BALCON: "Balcon",
  CAVE: "Cave",
  GARAGE: "Garage",
  ENTREE: "Entrée",
  AUTRE: "Autre pièce",
  INCONNU: "À classer / incertain",
};

interface AnalyzePhotosResponse {
  rooms: AnalyzedRoom[];
  process1: {
    model: string;
    rooms: AnalyzedRoom[];
  };
  process2: {
    model: string;
    rooms: AnalyzedRoom[];
  };
}

interface LabProcess2Response {
  model: string;
  rooms: AnalyzedRoom[];
  totalMs?: number;
  classifyMs?: number;
  inventoryMs?: number;
  classifications?: {
    photoId: string;
    roomGuessPrimary: string | null;
    roomGuessConfidence: number | null;
  }[];
}

function compactModelName(model?: string): string {
  if (!model) return "modèle IA";
  if (model.startsWith("claude-3-5-haiku")) return "Claude 3.5 Haiku";
  if (model.startsWith("claude-3-5-sonnet")) return "Claude 3.5 Sonnet";
  return model;
}

export default function AiLabPage() {
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunSet, setLastRunSet] = useState<TestSetName | null>(null);

  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [analysisElapsedMs, setAnalysisElapsedMs] = useState(0);

  const [selectedSystems, setSelectedSystems] = useState<{
    process1: boolean;
    process2: boolean;
  }>({
    process1: true,
    process2: false,
  });

  const [analysisProcesses, setAnalysisProcesses] = useState<AnalysisProcess[] | null>(null);
  const [process2Inventory, setProcess2Inventory] = useState<Process2InventoryRow[] | null>(null);
  const [process2Timings, setProcess2Timings] = useState<{
    totalMs?: number;
    classifyMs?: number;
    inventoryMs?: number;
  } | null>(null);

  const [process2Classifications, setProcess2Classifications] = useState<
    LabProcess2Response["classifications"] | null
  >(null);

  const [currentPhotos, setCurrentPhotos] = useState<AnalyzePhotoInput[] | null>(
    null
  );

  // Timer simple pour mesurer le temps d'analyse
  useEffect(() => {
    if (!analysisStartedAt) return;
    const interval = setInterval(() => {
      setAnalysisElapsedMs(Date.now() - analysisStartedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [analysisStartedAt]);

  async function handleRunSet(setName: TestSetName) {
    if (isUploadingPhotos || isAnalyzing) return;

    console.log("[AI-LAB] ▶️ Lancement du test", {
      setName,
      selectedSystems,
    });

    setError(null);
    setLastRunSet(setName);
    setIsUploadingPhotos(true);
    setIsAnalyzing(false);
    setAnalysisProcesses(null);
    setProcess2Inventory(null);
    setProcess2Timings(null);
    setProcess2Classifications(null);
    setCurrentPhotos(null);

    try {
      // 1) Récupération des photos du set depuis le serveur (copie dans uploads/ai-lab)
      const res = await fetch("/api/ai/lab-load-set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setName }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Erreur lab-load-set:", text);
        setError("Erreur lors du chargement du set de test.");
        setIsUploadingPhotos(false);
        return;
      }

      const data = (await res.json()) as { photos: AnalyzePhotoInput[] };
      const uploadedPhotos = data.photos ?? [];

      // On ignore les doublons explicites de type "xxx (2).jpg" dans les analyses
      const photosForAnalysis = uploadedPhotos.filter(
        (p) => !/\(\d+\)\.[^.]+$/i.test(p.originalFilename)
      );

      console.log("[AI-LAB] ✅ Photos chargées depuis le set", {
        setName,
        countTotal: uploadedPhotos.length,
        countAnalyzed: photosForAnalysis.length,
        ignoredDuplicates: uploadedPhotos.length - photosForAnalysis.length,
        sample: uploadedPhotos.slice(0, 3),
      });

      if (photosForAnalysis.length === 0) {
        setError("Aucune photo trouvée pour ce set.");
        setIsUploadingPhotos(false);
        return;
      }

      setIsUploadingPhotos(false);
      setCurrentPhotos(photosForAnalysis);

      // 2) Appels IA sur ces photos
      setIsAnalyzing(true);
      const startedAt = Date.now();
      setAnalysisStartedAt(startedAt);

      const body = JSON.stringify({
        leadId: "ai-lab",
        photos: uploadedPhotos,
      });

      const promises: Promise<void>[] = [];
      const processes: AnalysisProcess[] = [];
      
      // Process 1 – /api/ai/analyze-photos (prod-like, global)
      if (selectedSystems.process1) {
        promises.push(
          fetch("/api/ai/analyze-photos", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ photos: photosForAnalysis }),
          })
            .then(async (res) => {
              if (!res.ok) {
                console.error("[AI-LAB] ❌ Erreur analyze-photos:", await res.text());
                return;
              }
              const data: AnalyzePhotosResponse = await res.json();
              console.log("[AI-LAB] 📥 Réponse /api/ai/analyze-photos", {
                setName,
                roomsProcess1: data.process1?.rooms?.length ?? 0,
              });
              processes.push({
                id: "process1",
                label: "Process 1 – Groupement par noms de fichiers",
                model: compactModelName(data.process1.model),
                rooms: data.process1.rooms,
                totalMs: (data.process1 as any).totalMs,
              });
            })
            .catch((err) => {
              console.error("Erreur fetch analyze-photos:", err);
            })
        );
      }

      // Process 2 – /api/ai/lab-process2 (pipeline 2 temps dédié labo)
      if (selectedSystems.process2) {
        promises.push(
          fetch("/api/ai/lab-process2", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ photos: photosForAnalysis }),
          })
            .then(async (res) => {
              if (!res.ok) {
                console.error("[AI-LAB] ❌ Erreur lab-process2:", await res.text());
                return;
              }
              const data: LabProcess2Response = await res.json();
              console.log("[AI-LAB] 📥 Réponse /api/ai/lab-process2", {
                setName,
                rooms: data.rooms?.length ?? 0,
              });

              setProcess2Timings({
                totalMs: data.totalMs,
                classifyMs: data.classifyMs,
                inventoryMs: data.inventoryMs,
              });

              setProcess2Classifications(data.classifications ?? null);

              // On dérive aussi un tableau synthétique type prod : Pièce / Article / Qté
              const inventory: Process2InventoryRow[] = [];
              (data.rooms ?? []).forEach((room) => {
                room.items.forEach((item) => {
                  inventory.push({
                    roomType: room.roomType,
                    roomLabel: room.label,
                    itemLabel: item.label,
                    quantity: item.quantity,
                  });
                });
              });
              setProcess2Inventory(inventory);

              processes.push({
                id: "process2",
                label: "Process 2 – Classification + inventaire (2 temps, labo)",
                model: compactModelName(data.model),
                rooms: data.rooms,
                totalMs: data.totalMs,
              });
            })
            .catch((err) => {
              console.error("[AI-LAB] ❌ Erreur fetch lab-process2:", err);
            })
        );
      }

      await Promise.all(promises);
      setAnalysisProcesses(processes);

      // 3) Enregistrement des performances pour ce run
      const durationMs = Date.now() - startedAt;
      const nowIso = new Date().toISOString();
      const logsToAdd: ProcessRunLog[] = [];

      console.log("[AI-LAB] ⏱️ Fin du test", {
        setName,
        durationMs,
        processes: processes.map((p) => ({
          id: p.id,
          rooms: p.rooms.length,
        })),
      });

      for (const proc of processes) {
        logsToAdd.push({
          id: `${nowIso}-${proc.id}-${setName}-${logsToAdd.length}`,
          dateIso: nowIso,
          processId: proc.id as ProcessId,
          processLabel: proc.label,
          setName,
          durationMs,
          note: "",
        });
      }

      if (logsToAdd.length > 0) {
        setRunLogs((prev) => [...prev, ...logsToAdd]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'analyse.";
      setError(message);
    } finally {
      setIsAnalyzing(false);
      // On stoppe le compteur une fois l'analyse terminée
      setAnalysisStartedAt(null);
    }
  }

  // --- Normalisation des résultats IA pour le labo ---

  const normalizedByProcess = useMemo(() => {
    if (!analysisProcesses) return {} as Record<string, NormalizedProcessResult>;
    const map: Record<string, NormalizedProcessResult> = {};

    for (const proc of analysisProcesses) {
      const rooms: NormalizedRoom[] = proc.rooms.map((room) => ({
        roomId: room.roomId,
        roomType: room.roomType,
        roomLabel: room.label,
        photoIds: room.photoIds ?? [],
      }));

      let items: NormalizedItem[] = [];
      for (const room of proc.rooms) {
        room.items.forEach((item, idx) => {
          const anyItem = item as any;
          const widthCm =
            typeof anyItem.widthCm === "number" ? anyItem.widthCm : null;
          const depthCm =
            typeof anyItem.depthCm === "number" ? anyItem.depthCm : null;
          const heightCm =
            typeof anyItem.heightCm === "number" ? anyItem.heightCm : null;
          const volumeM3Ai =
            typeof anyItem.volumeM3 === "number" ? anyItem.volumeM3 : null;
          const valueEurTypicalAi =
            typeof anyItem.valueEstimateEur === "number"
              ? anyItem.valueEstimateEur
              : null;

          const normalizedItem: NormalizedItem = {
            id: `${proc.id}-${room.roomId}-${idx}`,
            roomId: room.roomId,
            roomLabel: room.label,
            label: item.label,
            category: item.category,
            quantity: item.quantity,
            confidence: item.confidence,
            widthCm,
            depthCm,
            heightCm,
            volumeM3Ai,
            valueEurTypicalAi,
            valueSource: valueEurTypicalAi != null ? "ai" : "none",
          };

          // Volume standard basé sur la table Default m3 (V1 : volumineux uniquement)
          const standardVolume = getStandardVolumeForLabel(item.label);
          if (typeof standardVolume === "number") {
            normalizedItem.volumeM3Standard = standardVolume;
            const base = typeof volumeM3Ai === "number" ? volumeM3Ai : 0;
            normalizedItem.volumeM3Final = Math.max(base, standardVolume);
            normalizedItem.volumeSource =
              typeof volumeM3Ai === "number"
                ? "ai_or_standard_max"
                : "standard_table";
          }

          items.push(normalizedItem);
        });
      }

      // Application des règles métier V1 (lit => composants, armoires => contenu)
      items = enrichItemsWithBusinessRules(items, rooms);

      // Application des coefficients d'emballage (volume nu -> volume emballé)
      items = applyPackagingRules(items);

      map[proc.id] = {
        processId: proc.id,
        model: proc.model,
        rooms,
        items,
      };
    }

    return map;
  }, [analysisProcesses]);

  const totalItemsByProcess = useMemo(() => {
    const entries: Record<string, number> = {};
    Object.entries(normalizedByProcess).forEach(([procId, result]) => {
      entries[procId] = result.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
    });
    return entries;
  }, [normalizedByProcess]);

  type DisplayRow = {
    roomLabel: string;
    description: string;
    measures: string;
    volumeFinal: string;
    volumeAi: string;
          volumeStandard: string;
          value: string;
          breakdown?: string[];
        };

  const tableByProcess = useMemo(() => {
    const map: Record<string, DisplayRow[]> = {};

    Object.entries(normalizedByProcess).forEach(([procId, result]) => {
      const items = result.items;
      const byParent = new Map<string, NormalizedItem[]>();
      items.forEach((it) => {
        if (it.parentId) {
          const list = byParent.get(it.parentId) ?? [];
          list.push(it);
          byParent.set(it.parentId, list);
        }
      });

      const baseItems = items.filter((it) => !it.parentId);

      const rows: DisplayRow[] = baseItems.map((item) => {
        const derived = byParent.get(item.id) ?? [];

        const { widthCm, depthCm, heightCm } = item;
        const volumeAiBase = item.volumeM3Ai ?? null;
        const volumeStdBase = item.volumeM3Standard ?? null;

        const baseVolume =
          item.volumeM3Final ??
          volumeAiBase ??
          volumeStdBase ??
          null;

        const derivedVolumes = derived.map((d) => {
          const v =
            d.volumeM3Final ??
            d.volumeM3Ai ??
            d.volumeM3Standard ??
            0;
          return v;
        });
        const derivedSum =
          derivedVolumes.length > 0
            ? derivedVolumes.reduce((a, b) => a + b, 0)
            : null;

        let volumeFinal: number | null = baseVolume;
        const breakdownLines: string[] = [];

        if (derived.length > 0) {
          const cat = item.category.toUpperCase();
          if (cat === "LIT") {
            // Pour un lit : le volume = somme des dérivés uniquement
            volumeFinal = derivedSum;
          } else {
            // Pour les autres (armoires, etc.) : meuble + contenu
            const base = baseVolume ?? 0;
            const derivedTotal = derivedSum ?? 0;
            volumeFinal = base + derivedTotal;
            if (baseVolume != null) {
              breakdownLines.push(
                `dont meuble : ${baseVolume.toFixed(2)} m³`
              );
            }
          }

          derived.forEach((d, idx) => {
            const v = derivedVolumes[idx] ?? 0;
            breakdownLines.push(
              `dont ${d.label.replace(" (dérivé lit)", "")} : ${v.toFixed(
                2
              )} m³`
            );
          });
        }

        return {
          roomLabel: item.roomLabel,
          description: `${item.label} (x${item.quantity})`,
          measures:
            typeof widthCm === "number" &&
            typeof depthCm === "number" &&
            typeof heightCm === "number"
              ? `${Math.round(widthCm)}×${Math.round(
                  depthCm
                )}×${Math.round(heightCm)} cm`
              : "—",
          volumeFinal:
            typeof volumeFinal === "number" ? `${volumeFinal.toFixed(2)} m³` : "—",
          volumeAi:
            typeof volumeAiBase === "number"
              ? `${volumeAiBase.toFixed(2)} m³`
              : "—",
          volumeStandard:
            typeof volumeStdBase === "number"
              ? `${volumeStdBase.toFixed(2)} m³`
              : "—",
          value:
            typeof item.valueEurTypicalAi === "number"
              ? `${Math.round(item.valueEurTypicalAi)} €`
              : "—",
          breakdown: breakdownLines.length > 0 ? breakdownLines : undefined,
        };
      });
      map[procId] = rows;
    });

    return map;
  }, [normalizedByProcess]);

  const gridColsClass = useMemo(() => {
    if (!analysisProcesses || analysisProcesses.length === 0) return "grid-cols-1";
    const count = analysisProcesses.length;
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    return "grid-cols-3";
  }, [analysisProcesses]);

  interface ProcessRunLog {
    id: string;
    dateIso: string;
    processId: ProcessId;
    processLabel: string;
    setName: TestSetName;
    durationMs: number;
    note: string;
  }

  const [runLogs, setRunLogs] = useState<ProcessRunLog[]>([]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 space-y-2">
          <h1 className="text-xl font-semibold text-slate-50">
            Labo IA – Analyse de photos
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Page de tests interne pour comparer différentes configurations d&apos;analyse de photos
            (process 1, process 2, classification / inventaire).
          </p>
        </header>

        <div className="space-y-6">
          {/* Bloc 1 : choix du set + explication des process (pleine largeur) */}
          <section className="space-y-4 rounded-2xl bg-slate-900/80 p-4 ring-1 ring-slate-800">
            <h2 className="text-sm font-semibold text-slate-50">
              1. Choisir un jeu de photos de test
            </h2>

            <div className="space-y-3 rounded-2xl bg-slate-950/70 p-3 text-xs text-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Jeux de test (dossier local &quot;Photo test&quot;)
              </p>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li>
                  <span className="font-semibold text-slate-100">set_1</span> : une seule
                  photo
                </li>
                <li>
                  <span className="font-semibold text-slate-100">set_2</span> : une pièce
                  complète
                </li>
                <li>
                  <span className="font-semibold text-slate-100">set_3</span> : un
                  appartement complet
                </li>
              </ul>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleRunSet("set_1")}
                  disabled={isUploadingPhotos || isAnalyzing}
                  className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-sm shadow-sky-500/40 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tester set_1
                </button>
                <button
                  type="button"
                  onClick={() => handleRunSet("set_2")}
                  disabled={isUploadingPhotos || isAnalyzing}
                  className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-sm shadow-sky-500/40 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tester set_2
                </button>
                <button
                  type="button"
                  onClick={() => handleRunSet("set_3")}
                  disabled={isUploadingPhotos || isAnalyzing}
                  className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-sm shadow-sky-500/40 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tester set_3
                </button>
              </div>
              {lastRunSet && (
                <p className="text-[10px] text-slate-400">
                  Dernier set lancé : <span className="font-semibold text-slate-100">{lastRunSet}</span>
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-2xl bg-slate-950/70 p-3 text-xs text-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Systèmes / process à comparer
              </p>
              <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-[2px] h-3 w-3 rounded border-slate-500 bg-slate-900 text-sky-400"
                    checked={selectedSystems.process1}
                    onChange={(e) =>
                      setSelectedSystems((prev) => ({
                        ...prev,
                        process1: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="font-semibold text-slate-100">
                      Process 1
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      /api/ai/analyze-photos – backend Anthropic (Claude, modèle principal)
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-[2px] h-3 w-3 rounded border-slate-500 bg-slate-900 text-sky-400"
                    checked={selectedSystems.process2}
                    onChange={(e) =>
                      setSelectedSystems((prev) => ({
                        ...prev,
                        process2: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="font-semibold text-slate-100">
                      Process 2
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      /api/ai/lab-process2 – classification + inventaire (2 temps, labo)
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400">
                {error}
              </p>
            )}
          </section>

          {/* Bloc 2 : résultats comparés (pleine largeur) */}
          <section className="space-y-3 rounded-2xl bg-slate-900/80 p-4 text-xs ring-1 ring-slate-800">
            <h2 className="text-sm font-semibold text-slate-50">
              2. Résultats des différents systèmes
            </h2>

            {(analysisProcesses || process2Inventory || isUploadingPhotos || isAnalyzing) && (
              <>
                {analysisStartedAt && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400">
                      Temps d&apos;analyse (tous systèmes confondus){" "}
                      {isUploadingPhotos || isAnalyzing ? "en cours" : "total"} :{" "}
                      {(analysisElapsedMs / 1000).toFixed(1)} s
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all"
                        style={{
                          width: `${Math.min(100, analysisElapsedMs / 1000 / 30 * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {analysisProcesses && analysisProcesses.length > 0 && (
                  <div className={`grid gap-3 ${gridColsClass}`}>
                    {analysisProcesses.map((proc) => {
                      const rows = tableByProcess[proc.id] ?? [];
                      return (
                        <div
                          key={proc.id}
                          className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-semibold text-slate-50">
                                {proc.label}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Modèle : {proc.model}
                              </p>
                              {typeof proc.totalMs === "number" && (
                                <p className="text-[10px] text-slate-500">
                                  Temps process : {(proc.totalMs / 1000).toFixed(1)} s
                                </p>
                              )}
                              {proc.id === "process2" && process2Timings && (
                                <p className="text-[10px] text-slate-500">
                                  Classif :{" "}
                                  {process2Timings.classifyMs != null
                                    ? (process2Timings.classifyMs / 1000).toFixed(1)
                                    : "—"}{" "}
                                  s • Inventaire :{" "}
                                  {process2Timings.inventoryMs != null
                                    ? (process2Timings.inventoryMs / 1000).toFixed(1)
                                    : "—"}{" "}
                                  s
                                </p>
                              )}
                            </div>
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                              {totalItemsByProcess[proc.id] ?? 0} éléments
                            </span>
                          </div>

                          <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950">
                            <div className="grid grid-cols-[minmax(0,1.3fr),minmax(0,1.9fr),minmax(80px,0.9fr),minmax(90px,0.9fr),minmax(80px,0.9fr)] border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold text-slate-200">
                              <span>Pièce</span>
                              <span>Description</span>
                              <span className="text-right">Mesures</span>
                              <span className="text-right">Volume</span>
                              <span className="text-right">Valeur</span>
                            </div>
                            <div className="max-h-56 space-y-[1px] overflow-y-auto bg-slate-950">
                              {rows.map((row, idx) => (
                                <div
                                  key={`${proc.id}-${row.roomLabel}-${row.description}-${idx}`}
                                  className="grid grid-cols-[minmax(0,1.3fr),minmax(0,1.9fr),minmax(80px,0.9fr),minmax(90px,0.9fr),minmax(80px,0.9fr)] px-3 py-1.5 text-[11px] text-slate-200 odd:bg-slate-950 even:bg-slate-900/50"
                                >
                                  <span className="truncate">{row.roomLabel}</span>
                                  <span className="truncate">
                                    {row.description}
                                    {row.breakdown &&
                                      row.breakdown.map((line) => (
                                        <span
                                          key={line}
                                          className="block text-[10px] text-slate-500"
                                        >
                                          {line}
                                        </span>
                                      ))}
                                  </span>
                                  <span className="truncate text-right">
                                    {row.measures}
                                  </span>
                                  <span className="truncate text-right">
                                    {row.volumeFinal}
                                    <span className="block text-[10px] text-slate-500">
                                      IA&nbsp;: {row.volumeAi} • Std&nbsp;: {row.volumeStandard}
                                    </span>
                                  </span>
                                  <span className="truncate text-right">
                                    {row.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tableau détaillé de l'inventaire Process 2 (comme en prod) */}
                {process2Inventory && process2Inventory.length > 0 && (
                  <div className="mt-4 space-y-2 rounded-2xl bg-slate-950/90 p-3 ring-1 ring-slate-800/80">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Détail des objets détectés – Process 2 (pipeline 2 temps)
                    </p>
                    <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950">
                      <div className="grid grid-cols-[minmax(0,1.2fr),minmax(0,1.6fr),auto] border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold text-slate-200">
                        <span>Pièce</span>
                        <span>Article</span>
                        <span className="text-right">Qté</span>
                      </div>
                      <div className="max-h-52 space-y-[1px] overflow-y-auto bg-slate-950">
                        {process2Inventory.map((row, idx) => (
                          <div
                            key={`${row.roomLabel}-${row.itemLabel}-${idx}`}
                            className="grid grid-cols-[minmax(0,1.2fr),minmax(0,1.6fr),auto] px-3 py-1.5 text-[11px] text-slate-200 odd:bg-slate-950 even:bg-slate-900/50"
                          >
                            <span className="truncate">{row.roomLabel}</span>
                            <span className="truncate">{row.itemLabel}</span>
                            <span className="text-right">{row.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Détail par photo : affectation de pièce par l'IA (Process 2) */}
                {currentPhotos &&
                  process2Classifications &&
                  process2Classifications.length > 0 && (
                    <div className="mt-4 space-y-2 rounded-2xl bg-slate-950/90 p-3 ring-1 ring-slate-800/80">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Affectation des pièces par photo – Process 2
                      </p>
                      <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950">
                        <div className="grid grid-cols-[minmax(0,2fr),minmax(0,1.3fr),auto] border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold text-slate-200">
                          <span>Photo</span>
                          <span>Pièce IA (finale)</span>
                          <span className="text-right">Confiance finale</span>
                        </div>
                        <div className="max-h-52 space-y-[1px] overflow-y-auto bg-slate-950">
                          {currentPhotos.map((photo) => {
                            const cls = process2Classifications.find(
                              (c) => c.photoId === photo.id
                            );
                            const roomType = cls?.roomGuessPrimary ?? "INCONNU";
                            const roomLabel =
                              ROOM_TYPE_LABELS[roomType] ?? roomType ?? "Inconnu";
                            const confidence =
                              typeof cls?.roomGuessConfidence === "number"
                                ? `${Math.round(cls.roomGuessConfidence * 100)} %`
                                : "—";
                            return (
                              <div
                                key={photo.id}
                                className="grid grid-cols-[minmax(0,2fr),minmax(0,1.3fr),auto] px-3 py-1.5 text-[11px] text-slate-200 odd:bg-slate-950 even:bg-slate-900/50"
                              >
                                <span className="truncate">
                                  {photo.originalFilename}
                                </span>
                                <span className="truncate">{roomLabel}</span>
                                <span className="text-right">{confidence}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                {!analysisProcesses &&
                  (!process2Inventory || process2Inventory.length === 0) &&
                  !isAnalyzing && (
                    <p className="text-[11px] text-slate-500">
                      Aucune analyse encore lancée. Ajoutez des photos et lancez
                      l&apos;analyse pour voir les résultats.
                    </p>
                  )}
              </>
            )}

            {!analysisProcesses &&
              (!process2Inventory || process2Inventory.length === 0) &&
              !isAnalyzing && (
                <p className="text-[11px] text-slate-500">
                  En attente de résultats. Cette colonne affichera les comparaisons
                  entre systèmes.
                </p>
              )}
          </section>

          {/* Bloc 3 : historique des tests */}
          <section className="space-y-3 rounded-2xl bg-slate-900/80 p-4 text-xs ring-1 ring-slate-800">
            <h2 className="text-sm font-semibold text-slate-50">
              3. Historique des tests par process
            </h2>
            {runLogs.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Aucun test enregistré pour l&apos;instant. Chaque nouveau run ajoute une ligne par process.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950">
                <div className="grid grid-cols-[minmax(0,1.4fr),minmax(0,1.4fr),auto,auto,minmax(0,1.4fr)] border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold text-slate-200">
                  <span>Date / heure</span>
                  <span>Process</span>
                  <span className="text-right">Set</span>
                  <span className="text-right">Temps (s)</span>
                  <span>Note</span>
                </div>
                <div className="max-h-56 space-y-[1px] overflow-y-auto bg-slate-950">
                  {runLogs.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-[minmax(0,1.4fr),minmax(0,1.4fr),auto,auto,minmax(0,1.4fr)] px-3 py-1.5 text-[11px] text-slate-200 odd:bg-slate-950 even:bg-slate-900/50"
                    >
                      <span className="truncate">
                        {new Date(log.dateIso).toLocaleString()}
                      </span>
                      <span className="truncate">{log.processLabel}</span>
                      <span className="truncate text-right">{log.setName}</span>
                      <span className="truncate text-right">
                        {(log.durationMs / 1000).toFixed(1)}
                      </span>
                      <span className="truncate text-slate-400">
                        {log.note || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}


