"use client";

/**
 * StepAccessLogisticsV4 — Moverz V4 Design System (Simplified — moverz.fr style)
 * Step 3: Logistics, Access, Contact, Formule
 * 
 * ✅ Back-office safe
 * ✅ Tracking safe
 * ❌ Services additionnels facultatifs RETIRÉS
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin,
  Calendar,
  Home,
  Mail,
  User,
  Phone,
  ChevronDown,
  Camera,
  Upload,
  ArrowRight,
  ArrowDown,
  Check,
  Loader2,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";
import { DatePickerFr } from "@/components/tunnel/DatePickerFr";
import { CardV4 } from "@/components/tunnel-v4";
import { uploadLeadPhotos, type UploadedPhoto } from "@/lib/api/client";

type QuestionKey = "narrow_access" | "long_carry" | "difficult_parking" | "lift_required";

interface StepAccessLogisticsV4Props {
  leadId?: string | null;
  // Addresses
  originAddress: string;
  originPostalCode: string;
  originCity: string;
  originCountryCode?: string;
  originLat?: number | null;
  originLon?: number | null;
  originHousingType: string;
  originFloor: string;
  originFloorTouched?: boolean;
  originElevator: string;
  originElevatorTouched?: boolean;
  destinationAddress: string;
  destinationPostalCode: string;
  destinationCity: string;
  destinationCountryCode?: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  destinationUnknown?: boolean;
  destinationHousingType: string;
  destinationFloor: string;
  destinationFloorTouched?: boolean;
  destinationElevator: string;
  destinationElevatorTouched?: boolean;
  // Volume
  density: "" | "light" | "normal" | "dense";
  kitchenIncluded: "" | "none" | "appliances" | "full";
  kitchenApplianceCount: string;
  movingDate: string;
  dateFlexible: boolean;
  routeDistanceKm?: number | null;
  routeDistanceProvider?: "osrm" | "fallback" | null;
  onFieldChange: (field: string, value: any) => void;
  onAiInsightsChange?: (insights: string[]) => void;
  onDensityAiNoteChange?: (note: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  showValidation?: boolean;
  access_type: "simple" | "constrained";
  narrow_access: boolean;
  long_carry: boolean;
  difficult_parking: boolean;
  lift_required: boolean;
  access_details: string;
  // Contact
  firstName: string;
  email: string;
  phone: string;
  specificNotes: string;
  // Formule
  selectedFormule: "ECONOMIQUE" | "STANDARD" | "PREMIUM";
  onFormuleChange: (v: "ECONOMIQUE" | "STANDARD" | "PREMIUM") => void;
  pricingByFormule?: {
    ECONOMIQUE: { priceMin: number; priceMax: number };
    STANDARD: { priceMin: number; priceMax: number };
    PREMIUM: { priceMin: number; priceMax: number };
  } | null;
  collapseAllOnEnterToken?: number;
}

const questions: Array<{ key: QuestionKey; label: string }> = [
  { key: "narrow_access", label: "Petit ascenseur / passages étroits ?" },
  { key: "long_carry", label: "Portage > 10 m ?" },
  { key: "difficult_parking", label: "Stationnement compliqué ?" },
  { key: "lift_required", label: "Besoin d'un monte-meuble ?" },
];

const FLOOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "RDC" },
  { value: "1", label: "1er" },
  { value: "2", label: "2e" },
  { value: "3", label: "3e" },
  { value: "4", label: "4e ou +" },
];

const getMinMovingDateIso = (): string => {
  const d = new Date();
  // Midi local: évite un décalage de date sur les fuseaux non-UTC.
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 15);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function AnimatedSection({
  contentKey,
  isOpen,
  children,
}: {
  contentKey: string;
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          key={contentKey}
          initial={{ height: 0, opacity: 0, y: -4 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onAnimationStart={() => setIsTransitioning(true)}
          onAnimationComplete={() => setIsTransitioning(false)}
          style={{ overflow: isTransitioning ? "hidden" : "visible" }}
        >
          <div className="pt-1">{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function StepAccessLogisticsV4(props: StepAccessLogisticsV4Props) {
  type SectionKey = "trajet" | "date" | "volume" | "formule" | "contact";
  type PipelineStepKey =
    | "normalize"
    | "compress"
    | "temp_save"
    | "ai_analysis";
  type PipelineStepStatus = "pending" | "in_progress" | "done" | "error";
  type PhotoAnalysisContext = "specific_constraints" | "density";

  const PIPELINE_STEPS: Array<{ key: PipelineStepKey; label: string }> = [
    { key: "normalize", label: "Normalisation de l'image" },
    { key: "compress", label: "Compression" },
    { key: "temp_save", label: "Sauvegarde temporaire" },
    { key: "ai_analysis", label: "Analyse IA" },
  ];

  const minMovingDate = useMemo(() => {
    return getMinMovingDateIso();
  }, []);

  const isApartment = (t: string) => {
    const normalized = (t || "").trim().toLowerCase();
    return normalized === "t1" || normalized === "t2" || normalized === "t3" || normalized === "t4" || normalized === "t5";
  };
  const showValidation = !!props.showValidation;
  const isOriginAddressValid = (props.originAddress || "").trim().length >= 5;
  const isDestinationAddressValid = (props.destinationAddress || "").trim().length >= 5;
  const isFirstNameValid = (props.firstName || "").trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((props.email || "").trim());
  const isMovingDateValid = !!props.movingDate && props.movingDate >= minMovingDate;
  const isDensityValid = props.density !== "";
  const isKitchenSelectionValid = props.kitchenIncluded !== "";
  const isKitchenValid =
    props.kitchenIncluded !== "appliances" ||
    (Number.parseInt(String(props.kitchenApplianceCount || "").trim(), 10) || 0) >= 1;
  const [touched, setTouched] = useState({
    originAddress: false,
    destinationAddress: false,
    movingDate: false,
    density: false,
    kitchenIncluded: false,
    kitchenApplianceCount: false,
    firstName: false,
    email: false,
  });
  const markTouched = (...fields: Array<keyof typeof touched>) => {
    setTouched((prev) => {
      const next = { ...prev };
      for (const field of fields) next[field] = true;
      return next;
    });
  };
  const shouldShowFieldError = (field: keyof typeof touched) =>
    showValidation || touched[field];
  const sectionOrder: SectionKey[] = ["trajet", "date", "volume", "formule", "contact"];
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    trajet: true,
    date: true,
    volume: true,
    formule: true,
    contact: true,
  });
  const [activeSection, setActiveSection] = useState<SectionKey | "missingInfo" | null>("trajet");
  const [formuleExplicitChoice, setFormuleExplicitChoice] = useState(
    props.selectedFormule !== "STANDARD"
  );
  const [contactValidated, setContactValidated] = useState(false);
  const [emailCheckState, setEmailCheckState] = useState<"idle" | "checking" | "valid" | "invalid" | "error">("idle");
  const [emailCheckMessage, setEmailCheckMessage] = useState<string | null>(null);
  useEffect(() => {
    if (props.selectedFormule !== "STANDARD") {
      setFormuleExplicitChoice(true);
    }
  }, [props.selectedFormule]);
  const [showMissingInfoPanel, setShowMissingInfoPanel] = useState(false);
  const [missingInfoValidated, setMissingInfoValidated] = useState(false);
  const missingInfoPanelOpen = showMissingInfoPanel;
  const [activeMissingInfoTab, setActiveMissingInfoTab] = useState<"constraints" | "notes" | "photos">("photos");
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [activePhotoKeys, setActivePhotoKeys] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, string>>({});
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);
  const [photoPanelError, setPhotoPanelError] = useState<string | null>(null);
  const [moverInsights, setMoverInsights] = useState<string[]>([]);
  const [constraintsReturnIaText, setConstraintsReturnIaText] = useState("");
  const [densityReturnIaText, setDensityReturnIaText] = useState("");
  const [densityAiNote, setDensityAiNote] = useState("");
  const [densityPhotoStatus, setDensityPhotoStatus] =
    useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [fallbackUploadLeadId, setFallbackUploadLeadId] = useState<string | null>(null);
  const [isDragOverPhotos, setIsDragOverPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const densityPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoAnalysisContext, setPhotoAnalysisContext] =
    useState<PhotoAnalysisContext>("specific_constraints");
  const [pipelineStatuses, setPipelineStatuses] = useState<Record<PipelineStepKey, PipelineStepStatus>>({
    normalize: "pending",
    compress: "pending",
    temp_save: "pending",
    ai_analysis: "pending",
  });
  const [pipelineVisibleSteps, setPipelineVisibleSteps] = useState<PipelineStepKey[]>([]);
  const activeUploadedPhotos = useMemo(
    () =>
      uploadedPhotos.filter((p) =>
        activePhotoKeys.includes(p.storageKey || p.id)
      ),
    [uploadedPhotos, activePhotoKeys]
  );

  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const parseAccessSides = () => {
    const sides: Record<QuestionKey, { origin?: boolean; destination?: boolean }> = {
      narrow_access: {},
      long_carry: {},
      difficult_parking: {},
      lift_required: {},
    };

    const parts = (props.access_details || "").split("|").filter(Boolean);
    for (const p of parts) {
      const [loc, key] = p.split(":") as [string, QuestionKey];
      if (!key) continue;
      if (loc === "origin") sides[key].origin = true;
      if (loc === "destination") sides[key].destination = true;
    }
    return sides;
  };

  const toggleSide = (q: QuestionKey, loc: "origin" | "destination") => {
    setMissingInfoValidated(false);
    const current = parseAccessSides();
    const was = current[q]?.[loc] ?? false;
    current[q][loc] = !was;

    const parts: string[] = [];
    for (const qKey of Object.keys(current) as QuestionKey[]) {
      if (current[qKey].origin) parts.push(`origin:${qKey}`);
      if (current[qKey].destination) parts.push(`destination:${qKey}`);
    }

    const newDetail = parts.join("|");
    props.onFieldChange("access_details", newDetail);

    const hasAny = parts.length > 0;
    if (hasAny !== (props.access_type === "constrained")) {
      props.onFieldChange("access_type", hasAny ? "constrained" : "simple");
    }
  };

  const renderLogementPicker = (
    prefix: "origin" | "destination",
    housingType: string,
    floor: string,
    elevator: string,
    setHousingType: (v: string) => void,
    setFloor: (v: string) => void,
    setElevator: (v: string) => void
  ) => {
    const locationLabel = prefix === "origin" ? "Départ" : "Arrivée";
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Logement · {locationLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHousingType("house")}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: housingType === "house"
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: housingType === "house" ? "#FFFFFF" : "var(--color-text)",
                border: housingType === "house"
                  ? "none"
                  : "2px solid var(--color-border)",
              }}
            >
              Maison
            </button>
            <button
              type="button"
              onClick={() => {
                setHousingType("t2");
                // Appartement: on force un choix explicite d'étage (RDC inclus).
                setFloor("");
                props.onFieldChange(`${prefix}FloorTouched`, false);
                // Et un choix explicite d'ascenseur.
                setElevator("");
                props.onFieldChange(`${prefix}ElevatorTouched`, false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: isApartment(housingType)
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: isApartment(housingType) ? "#FFFFFF" : "var(--color-text)",
                border: isApartment(housingType)
                  ? "none"
                  : "2px solid var(--color-border)",
              }}
            >
              Appartement
            </button>
          </div>
        </div>

        {isApartment(housingType) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Étage
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {FLOOR_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setFloor(o.value)}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background:
                        floor === o.value ? "var(--color-accent)" : "var(--color-surface)",
                      color: floor === o.value ? "#FFFFFF" : "var(--color-text)",
                      border:
                        floor === o.value
                          ? "none"
                          : "2px solid var(--color-border)",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Ascenseur
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: "yes", label: "Oui" },
                  { value: "partial", label: "Oui mais petit" },
                  { value: "none", label: "Non" },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setElevator(o.value)}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background:
                        elevator === o.value ? "var(--color-accent)" : "var(--color-surface)",
                      color: elevator === o.value ? "#FFFFFF" : "var(--color-text)",
                      border:
                        elevator === o.value
                          ? "none"
                          : "2px solid var(--color-border)",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ToggleYes = ({
    active,
    disabled = false,
    onToggle,
    ariaLabel,
  }: {
    active: boolean;
    disabled?: boolean;
    onToggle: () => void;
    ariaLabel: string;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-label={ariaLabel}
      className="w-14 h-8 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: active ? "var(--color-accent)" : "var(--color-border)",
      }}
    >
      <div
        className="w-6 h-6 rounded-full bg-white shadow-md transition-transform"
        style={{
          transform: active ? "translateX(28px)" : "translateX(4px)",
        }}
      />
    </button>
  );

  const destinationUnknown = !!props.destinationUnknown;

  useEffect(() => {
    if (props.leadId) return;
    const key = "moverz_photo_upload_lead_id";
    const existing =
      typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (existing) {
      setFallbackUploadLeadId(existing);
      return;
    }
    const generated = `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, generated);
    }
    setFallbackUploadLeadId(generated);
  }, [props.leadId]);

  const analyzePhotosLive = async (
    photos: UploadedPhoto[],
    forcedContext?: PhotoAnalysisContext
  ) => {
    const analysisContext = forcedContext ?? photoAnalysisContext;
    const isDensityFlow = analysisContext === "density";
    if (photos.length === 0) {
      setMoverInsights([]);
      if (isDensityFlow) {
        setDensityReturnIaText("");
        setDensityAiNote("");
        setDensityPhotoStatus("idle");
        props.onDensityAiNoteChange?.("");
      } else {
        setConstraintsReturnIaText("");
        props.onAiInsightsChange?.([]);
      }
      return;
    }
    setIsAnalyzingPhotos(true);
    if (isDensityFlow) {
      setDensityPhotoStatus("analyzing");
    }
    setPhotoPanelError(null);
    try {
      const res = await fetch("/api/ai/analyze-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: props.leadId ?? undefined,
          analysisContext,
          photos: photos.map((p) => ({
            id: p.id,
            storageKey: p.storageKey,
            originalFilename: p.originalFilename,
            url: p.url ?? undefined,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error("L'analyse IA a échoué.");
      }

      const data = (await res.json()) as {
        moverInsights?: string[];
        rooms?: any[];
        densitySuggestion?: "light" | "normal" | "dense";
        densityRationale?: string;
      };
      const explicitInsights = Array.isArray(data.moverInsights)
        ? data.moverInsights.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        : [];
      if (explicitInsights.length > 0) {
        setMoverInsights(explicitInsights);
        if (isDensityFlow) {
          const densityText = formatInsightsToText(explicitInsights);
          setDensityReturnIaText(densityText);
          const suggestedDensity = data.densitySuggestion;
          if (suggestedDensity) {
            props.onFieldChange("density", suggestedDensity);
          }
          const rationale = (data.densityRationale || explicitInsights[0] || "").trim();
          const note = rationale
            ? `Analyse photo : ${rationale}`
            : `Analyse photo : densité ${densityLabelFromId(
                suggestedDensity || (props.density || "normal")
              ).toLowerCase()} suggérée.`;
          setDensityAiNote(note);
          props.onDensityAiNoteChange?.(note);
          setDensityPhotoStatus("done");
        } else {
          setConstraintsReturnIaText(formatInsightsToText(explicitInsights));
          props.onAiInsightsChange?.(explicitInsights);
        }
        return;
      }

      // Fallback visuel robuste si l'IA ne renvoie pas de synthèse textuelle.
      const roomCount = Array.isArray(data.rooms) ? data.rooms.length : 0;
      const fallbackInsights = [
        `${photos.length} photo(s) analysée(s).`,
        roomCount > 0 ? `${roomCount} zone(s) de chargement potentielle(s) détectée(s).` : "Peu de signal exploitable, ajouter d'autres photos pour affiner.",
      ];
      setMoverInsights(fallbackInsights);
      if (isDensityFlow) {
        setDensityReturnIaText(formatInsightsToText(fallbackInsights));
        const note = `Analyse photo : ${fallbackInsights[0]}`;
        setDensityAiNote(note);
        props.onDensityAiNoteChange?.(note);
        setDensityPhotoStatus("done");
      } else {
        setConstraintsReturnIaText(formatInsightsToText(fallbackInsights));
        props.onAiInsightsChange?.(fallbackInsights);
      }
    } catch (error) {
      if (isDensityFlow) {
        setDensityPhotoStatus("error");
      }
      setPhotoPanelError(error instanceof Error ? error.message : "Erreur IA.");
    } finally {
      setIsAnalyzingPhotos(false);
    }
  };

  const toDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné."));
      reader.readAsDataURL(file);
    });

  const openDensityPhotoFlow = () => {
    setPhotoAnalysisContext("density");
    densityPhotoInputRef.current?.click();
  };

  const parseInsightsFromText = (text: string): string[] =>
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-•\s]+/, "").trim())
      .filter((line) => line.length > 0);

  const formatInsightsToText = (insights: string[]) =>
    insights.map((v) => `• ${v}`).join("\n");

  const densityLabelFromId = (value: "light" | "normal" | "dense") =>
    value === "light" ? "Léger" : value === "dense" ? "Dense" : "Normal";

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const showPipelineStep = (step: PipelineStepKey) => {
    setPipelineVisibleSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  };

  const setPipelineStepStatus = (step: PipelineStepKey, status: PipelineStepStatus) => {
    showPipelineStep(step);
    setPipelineStatuses((prev) => ({ ...prev, [step]: status }));
  };

  const handlePhotoUploadAndAnalyze = async (files: File[]) => {
    if (isUploadingPhotos || isAnalyzingPhotos) return;
    const uploadLeadId = props.leadId ?? fallbackUploadLeadId;
    if (!uploadLeadId) {
      setPhotoPanelError("Initialisation en cours, réessayez dans un instant.");
      return;
    }
    if (files.length === 0) return;

    setIsUploadingPhotos(true);
    setPhotoPanelError(null);
    setPipelineVisibleSteps([]);
    setPipelineStatuses({
      normalize: "pending",
      compress: "pending",
      temp_save: "pending",
      ai_analysis: "pending",
    });
    try {
      setPipelineStepStatus("normalize", "in_progress");
      await sleep(200);
      setPipelineStepStatus("normalize", "done");

      setPipelineStepStatus("compress", "in_progress");
      await sleep(200);
      setPipelineStepStatus("compress", "done");

      setPipelineStepStatus("temp_save", "in_progress");
      const result = await uploadLeadPhotos(uploadLeadId, files);
      if (result.errors.length > 0) {
        setPhotoPanelError(result.errors[0]?.reason ?? "Certaines photos n'ont pas pu être traitées.");
      }

      const localPreviewQueue = await Promise.all(files.map((file) => toDataUrl(file)));

      const nextPhotos: UploadedPhoto[] = [];
      const seen = new Set<string>();
      for (const p of [...uploadedPhotos, ...result.success]) {
        const key = p.storageKey || p.id;
        if (!seen.has(key)) {
          seen.add(key);
          nextPhotos.push(p);
        }
      }
      setPhotoPreviewUrls((prev) => {
        const next = { ...prev };
        for (const photo of result.success) {
          const photoKey = photo.storageKey || photo.id;
          if (next[photoKey]) continue;
          const candidate = localPreviewQueue.length > 0 ? localPreviewQueue.shift()! : "";
          if (candidate) next[photoKey] = candidate;
        }
        return next;
      });
      setUploadedPhotos(nextPhotos);
      setActivePhotoKeys((prev) => {
        const prevSet = new Set(prev);
        const merged = [...prev];
        for (const p of result.success) {
          const key = p.storageKey || p.id;
          if (!prevSet.has(key)) {
            prevSet.add(key);
            merged.push(key);
          }
        }
        return merged;
      });
      // IMPORTANT: toujours analyser toutes les photos actives (déjà visibles) + nouvelles.
      const photosForAnalysis: UploadedPhoto[] = (() => {
        const merged: UploadedPhoto[] = [];
        const mergedSeen = new Set<string>();
        for (const p of [...activeUploadedPhotos, ...result.success]) {
          const key = p.storageKey || p.id;
          if (mergedSeen.has(key)) continue;
          mergedSeen.add(key);
          merged.push(p);
        }
        return merged;
      })();
      setPipelineStepStatus("temp_save", "done");
      setPipelineStepStatus("ai_analysis", "in_progress");
      await analyzePhotosLive(photosForAnalysis);
      // En flux densité: une fois la densité sélectionnée/justifiée, on enchaîne
      // automatiquement une analyse "contraintes spécifiques" dédiée (sans densité).
      if (photoAnalysisContext === "density") {
        await analyzePhotosLive(photosForAnalysis, "specific_constraints");
      }
      setPipelineStepStatus("ai_analysis", "done");
    } catch (error) {
      setPhotoPanelError(error instanceof Error ? error.message : "Erreur upload.");
      const currentStep =
        pipelineStatuses.ai_analysis === "in_progress"
          ? "ai_analysis"
          : pipelineStatuses.temp_save === "in_progress"
          ? "temp_save"
          : pipelineStatuses.compress === "in_progress"
          ? "compress"
          : "normalize";
      setPipelineStepStatus(currentStep, "error");
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const onPhotoFilesPicked = async (files: File[]) => {
    if (files.length === 0) return;
    setMissingInfoValidated(false);
    await handlePhotoUploadAndAnalyze(files);
  };

  const removeUploadedPhoto = async (photo: UploadedPhoto) => {
    setMissingInfoValidated(false);
    const photoKey = photo.storageKey || photo.id;
    setPhotoPreviewUrls((prev) => {
      const next = { ...prev };
      delete next[photoKey];
      return next;
    });
    setActivePhotoKeys((prev) => prev.filter((k) => k !== photoKey));
    const remainingActive = activeUploadedPhotos.filter(
      (p) => (p.storageKey || p.id) !== photoKey
    );
    setPhotoPanelError(null);
    await analyzePhotosLive(remainingActive);
    if (photoAnalysisContext === "density") {
      await analyzePhotosLive(remainingActive, "specific_constraints");
    }
  };

  const isOriginHousingValid = !!(props.originHousingType || "").trim();
  const isDestinationHousingValid = !!(props.destinationHousingType || "").trim();
  const isOriginFloorValid =
    !isApartment(props.originHousingType) ||
    (!!(props.originFloor || "").trim() &&
      ((props.originFloorTouched ?? false) || (props.originFloor || "").trim() !== "0"));
  const isOriginElevatorValid =
    !isApartment(props.originHousingType) ||
    (!!(props.originElevator || "").trim() &&
      ((props.originElevatorTouched ?? false) || (props.originElevator || "").trim() !== "none"));
  const isDestinationFloorValid =
    !isApartment(props.destinationHousingType) ||
    (!!(props.destinationFloor || "").trim() &&
      ((props.destinationFloorTouched ?? false) ||
        (props.destinationFloor || "").trim() !== "0"));
  const isDestinationElevatorValid =
    !isApartment(props.destinationHousingType) ||
    (!!(props.destinationElevator || "").trim() &&
      ((props.destinationElevatorTouched ?? false) ||
        (props.destinationElevator || "").trim() !== "none"));
  const isFormuleValid =
    formuleExplicitChoice &&
    (props.selectedFormule === "ECONOMIQUE" ||
      props.selectedFormule === "STANDARD" ||
      props.selectedFormule === "PREMIUM");

  const sectionMeta: Record<SectionKey, { valid: boolean; summary: string }> = {
    trajet: {
      valid:
        isOriginAddressValid &&
        isDestinationAddressValid &&
        isOriginHousingValid &&
        isDestinationHousingValid &&
        isOriginFloorValid &&
        isDestinationFloorValid &&
        isOriginElevatorValid &&
        isDestinationElevatorValid,
      summary: `${props.originCity || "Départ"} → ${props.destinationCity || "Arrivée"}`,
    },
    date: {
      valid: isMovingDateValid,
      summary: props.movingDate ? props.movingDate : "Date à confirmer",
    },
    volume: {
      valid: isDensityValid && isKitchenSelectionValid && isKitchenValid,
      summary: `${props.density ? densityLabelFromId(props.density) : "Densité ?"} · ${
        props.kitchenIncluded === "full"
          ? "Cuisine complète"
          : props.kitchenIncluded === "appliances"
          ? "Cuisine équipée"
          : props.kitchenIncluded === "none"
          ? "Sans cuisine"
          : "Cuisine ?"
      }`,
    },
    formule: {
      valid: isFormuleValid,
      summary:
        !formuleExplicitChoice
          ? "À choisir"
          : props.selectedFormule === "ECONOMIQUE"
          ? "Éco"
          : props.selectedFormule === "PREMIUM"
          ? "Premium"
          : "Standard",
    },
    contact: {
      valid: isFirstNameValid && isEmailValid && contactValidated,
      summary: props.firstName && props.email ? `${props.firstName} · ${props.email}` : "Coordonnées à finaliser",
    },
  };
  const sectionLocked: Record<SectionKey, boolean> = {
    trajet: false,
    date: !sectionMeta.trajet.valid,
    volume: !sectionMeta.date.valid,
    formule: !sectionMeta.volume.valid,
    contact: !sectionMeta.formule.valid,
  };
  const isMissingInfoLocked = !sectionMeta.contact.valid;

  const prevSectionValidityRef = useRef<Record<SectionKey, boolean>>({
    trajet: sectionMeta.trajet.valid,
    date: sectionMeta.date.valid,
    volume: sectionMeta.volume.valid,
    formule: sectionMeta.formule.valid,
    contact: sectionMeta.contact.valid,
  });
  const lastAutoScrollRef = useRef<{ key: SectionKey | null; at: number }>({
    key: null,
    at: 0,
  });

  useEffect(() => {
    const prev = prevSectionValidityRef.current;
    const next = {
      trajet: sectionMeta.trajet.valid,
      date: sectionMeta.date.valid,
      volume: sectionMeta.volume.valid,
      formule: sectionMeta.formule.valid,
      contact: sectionMeta.contact.valid,
    };

    const newlyValidated = sectionOrder.find((k) => !prev[k] && next[k]);
    if (newlyValidated) {
      const currentIndex = sectionOrder.indexOf(newlyValidated);
      const following = sectionOrder.find((k, idx) => idx > currentIndex && !next[k]);
      setOpenSections((state) => ({
        ...state,
        [newlyValidated]: false,
        ...(following ? { [following]: true } : {}),
      }));
      if (following) {
        setActiveSection(following);
      }
      if (following) {
        // Laisse le layout se stabiliser après collapse, puis scrolle de façon contrôlée
        // (alignement haut) pour éviter les "sauts" trop bas en mobile.
        window.setTimeout(() => {
          const target = document.getElementById(`v4-header-${following}`);
          if (!target) return;
          const rect = target.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;
          const isAlreadyWellPositioned = rect.top >= 16 && rect.top <= vh * 0.42;
          if (isAlreadyWellPositioned) return;

          // UX guard: ne jamais auto-scroller vers le bas à la validation d'un bloc.
          // Si la section suivante est plus bas, on laisse l'utilisateur poursuivre naturellement.
          if (rect.top > 16) return;

          const now = Date.now();
          if (lastAutoScrollRef.current.key === following && now - lastAutoScrollRef.current.at < 900) {
            return;
          }

          const desiredTop = Math.max(0, window.scrollY + rect.top - 16);
          if (Math.abs(desiredTop - window.scrollY) < 24) return;

          lastAutoScrollRef.current = { key: following, at: now };
          window.scrollTo({
            top: desiredTop,
            behavior: "smooth",
          });
        }, 140);
      }
    }
    prevSectionValidityRef.current = next;
  }, [
    sectionMeta.trajet.valid,
    sectionMeta.date.valid,
    sectionMeta.volume.valid,
    sectionMeta.formule.valid,
    sectionMeta.contact.valid,
  ]);

  useEffect(() => {
    setOpenSections((state) => ({
      ...state,
      date: sectionLocked.date ? false : state.date,
      volume: sectionLocked.volume ? false : state.volume,
      formule: sectionLocked.formule ? false : state.formule,
      contact: sectionLocked.contact ? false : state.contact,
    }));
    if (isMissingInfoLocked && missingInfoPanelOpen) {
      setShowMissingInfoPanel(false);
      if (activeSection === "missingInfo") setActiveSection(null);
    }
  }, [
    sectionLocked.date,
    sectionLocked.volume,
    sectionLocked.formule,
    sectionLocked.contact,
    isMissingInfoLocked,
    missingInfoPanelOpen,
    activeSection,
  ]);

  useEffect(() => {
    if (!props.collapseAllOnEnterToken || props.collapseAllOnEnterToken <= 0) return;
    setOpenSections({
      trajet: false,
      date: false,
      volume: false,
      formule: false,
      contact: false,
    });
    setShowMissingInfoPanel(false);
    setActiveSection(null);
  }, [props.collapseAllOnEnterToken]);

  const renderSectionHeader = (key: SectionKey, title: string) => {
    const meta = sectionMeta[key];
    const isOpen = openSections[key];
    const isLocked = sectionLocked[key];
    const statusLabel = isLocked ? "Verrouillé" : isOpen ? "En cours" : "À compléter";
    const statusColor = meta.valid
      ? "var(--color-success)"
      : isLocked
      ? "var(--color-text-muted)"
      : isOpen
      ? "var(--color-accent)"
      : "var(--color-text-muted)";
    return (
      <button
        id={`v4-header-${key}`}
        type="button"
        disabled={isLocked}
        onClick={() => {
          if (isLocked) return;
          setOpenSections((state) => {
            const willOpen = !state[key];
            if (!willOpen) {
              setActiveSection((prev) => (prev === key ? null : prev));
              return { ...state, [key]: false };
            }

            const currentIndex = sectionOrder.indexOf(key);
            const previousKey = currentIndex > 0 ? sectionOrder[currentIndex - 1] : null;
            const shouldClosePrevious = previousKey ? sectionMeta[previousKey].valid : false;
            setActiveSection(key);

            return {
              ...state,
              [key]: true,
              ...(previousKey && shouldClosePrevious ? { [previousKey]: false } : {}),
            };
          });
        }}
        className={`w-full rounded-xl border px-3 text-left flex items-center justify-between gap-3 disabled:cursor-not-allowed ${
          meta.valid && !isOpen ? "py-1.5" : "py-2"
        }`}
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          opacity: isLocked ? 0.62 : 1,
        }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {title}
          </p>
          {isLocked ? (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              Terminez le bloc précédent pour débloquer
            </p>
          ) : !isOpen ? (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {meta.summary}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {!meta.valid && (
            <span className="text-xs font-semibold" style={{ color: statusColor }}>
              {statusLabel}
            </span>
          )}
          {meta.valid ? (
            <Check className="w-4 h-4" style={{ color: "var(--color-success)" }} />
          ) : isLocked ? (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>•</span>
          ) : (
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              style={{ color: "var(--color-text-muted)" }}
            />
          )}
        </div>
      </button>
    );
  };

  const sectionFrameStyle = (isActive: boolean): React.CSSProperties => ({
    borderColor: isActive ? "var(--color-accent)" : "transparent",
    background: isActive ? "var(--color-accent-light)" : "transparent",
  });

  const renderSubBlock = (
    title: string,
    complete: boolean,
    children: React.ReactNode
  ) => (
    <div
      className="rounded-xl border p-3 space-y-3"
      style={{
        borderColor: complete ? "var(--color-success)" : "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {title}
        </p>
        <span
          className="text-xs font-semibold"
          style={{ color: complete ? "var(--color-success)" : "var(--color-text-muted)" }}
        >
          {complete ? "Complet" : "À compléter"}
        </span>
      </div>
      {children}
    </div>
  );

  const runSilentEmailCheck = async (email: string): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch("/api/email/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        return { ok: true, message: "Vérification indisponible, vous pouvez continuer." };
      }
      const data = (await res.json()) as {
        ok?: boolean;
        verdict?: "valid" | "invalid" | "unknown";
        reason?: string;
      };
      if (data.verdict === "invalid") {
        return { ok: false, message: data.reason || "Adresse email non recevable." };
      }
      return { ok: true, message: data.reason || "Email vérifié." };
    } catch {
      return { ok: true, message: "Vérification indisponible, vous pouvez continuer." };
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-44 sm:pb-24">
      <input
        ref={densityPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          await onPhotoFilesPicked(files);
          e.currentTarget.value = "";
        }}
      />
      {/* Addresses */}
      <div
        id="v4-section-trajet"
        className="order-1 space-y-1 rounded-2xl border p-1.5 transition-colors duration-200"
        style={sectionFrameStyle(activeSection === "trajet")}
      >
      {renderSectionHeader("trajet", "Trajet & logements")}
      <AnimatedSection contentKey="trajet" isOpen={openSections.trajet}>
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Votre trajet
            </p>
          </div>

          <div className="space-y-4">
            {renderSubBlock(
              "Départ",
              isOriginAddressValid &&
                isOriginHousingValid &&
                isOriginFloorValid &&
                isOriginElevatorValid,
              <>
                <AddressAutocomplete
              label={
                props.originCity
                  ? `Départ · ${props.originCity}${
                      props.originPostalCode ? ` (${props.originPostalCode})` : ""
                    }`
                  : "Adresse de départ"
              }
              placeholder="Ex: 10 rue de la République"
              inputId="v4-origin-address"
              initialValue={props.originAddress || ""}
              required
              contextPostalCode={props.originPostalCode || undefined}
              contextCity={props.originCity || undefined}
              contextCountryCode={(props.originCountryCode || "").trim() || undefined}
              validated={props.originLat != null && props.originLon != null}
              errorMessage={
                shouldShowFieldError("originAddress") && !isOriginAddressValid
                  ? "Adresse de départ requise"
                  : null
              }
              onInputChange={(raw) => {
                markTouched("originAddress");
                props.onFieldChange("originAddress", raw);
              }}
              onSelect={(s) => {
                markTouched("originAddress");
                props.onFieldChange("originAddress", s.addressLine ?? s.label ?? "");
                props.onFieldChange("originCity", s.city ?? "");
                props.onFieldChange("originPostalCode", s.postalCode ?? "");
                props.onFieldChange(
                  "originCountryCode",
                  (s.countryCode ?? "fr").toLowerCase()
                );
                props.onFieldChange("originLat", s.lat ?? null);
                props.onFieldChange("originLon", s.lon ?? null);
              }}
            />
                {renderLogementPicker(
                  "origin",
                  props.originHousingType,
                  props.originFloor,
                  props.originElevator,
                  (v) => props.onFieldChange("originHousingType", v),
                  (v) => props.onFieldChange("originFloor", v),
                  (v) => props.onFieldChange("originElevator", v)
                )}
              </>
            )}

            {renderSubBlock(
              "Arrivée",
              isDestinationAddressValid &&
                isDestinationHousingValid &&
                isDestinationFloorValid &&
                isDestinationElevatorValid,
              <>
                <AddressAutocomplete
              label={
                props.destinationCity
                  ? `Arrivée · ${props.destinationCity}${
                      props.destinationPostalCode
                        ? ` (${props.destinationPostalCode})`
                        : ""
                    }`
                  : "Adresse d'arrivée"
              }
              placeholder="Ex: 5 avenue Victor Hugo"
              inputId="v4-destination-address"
              initialValue={props.destinationAddress || ""}
              required
              contextPostalCode={props.destinationPostalCode || undefined}
              contextCity={props.destinationCity || undefined}
              contextCountryCode={(props.destinationCountryCode || "").trim() || undefined}
              validated={props.destinationLat != null && props.destinationLon != null}
              errorMessage={
                shouldShowFieldError("destinationAddress") && !isDestinationAddressValid
                  ? "Adresse d'arrivée requise"
                  : null
              }
              onInputChange={(raw) => {
                markTouched("destinationAddress");
                props.onFieldChange("destinationAddress", raw);
              }}
              onSelect={(s) => {
                markTouched("destinationAddress");
                props.onFieldChange("destinationAddress", s.addressLine ?? s.label ?? "");
                props.onFieldChange("destinationCity", s.city ?? "");
                props.onFieldChange("destinationPostalCode", s.postalCode ?? "");
                props.onFieldChange(
                  "destinationCountryCode",
                  (s.countryCode ?? "fr").toLowerCase()
                );
                props.onFieldChange("destinationLat", s.lat ?? null);
                props.onFieldChange("destinationLon", s.lon ?? null);
              }}
            />
                {renderLogementPicker(
                  "destination",
                  props.destinationHousingType,
                  props.destinationFloor,
                  props.destinationElevator,
                  (v) => props.onFieldChange("destinationHousingType", v),
                  (v) => props.onFieldChange("destinationFloor", v),
                  (v) => props.onFieldChange("destinationElevator", v)
                )}
              </>
            )}
          </div>
        </div>
      </CardV4>
      </AnimatedSection>
      </div>

      {/* Date */}
      <div
        id="v4-section-date"
        className="order-2 space-y-1 rounded-2xl border p-1.5 transition-colors duration-200"
        style={sectionFrameStyle(activeSection === "date")}
      >
      {renderSectionHeader("date", "Date de déménagement")}
      <AnimatedSection contentKey="date" isOpen={openSections.date}>
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Date de déménagement
            </p>
          </div>

          <DatePickerFr
            id="v4-moving-date"
            value={props.movingDate}
            onChange={(d) => {
              markTouched("movingDate");
              props.onFieldChange("movingDate", d);
            }}
            min={minMovingDate}
            error={shouldShowFieldError("movingDate") && !isMovingDateValid}
          />
          {shouldShowFieldError("movingDate") && !isMovingDateValid && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
              Date requise (minimum 15 jours)
            </p>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={props.dateFlexible}
              onChange={(e) => props.onFieldChange("dateFlexible", e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--color-accent)" }}
            />
            <span className="text-sm" style={{ color: "var(--color-text)" }}>
              Mes dates sont flexibles (±3 jours)
            </span>
          </label>
        </div>
      </CardV4>
      </AnimatedSection>
      </div>

      {/* Volume */}
      <div
        id="v4-section-volume"
        className="order-3 space-y-1 rounded-2xl border p-1.5 transition-colors duration-200"
        style={sectionFrameStyle(activeSection === "volume")}
      >
      {renderSectionHeader("volume", "Volume & densité")}
      <AnimatedSection contentKey="volume" isOpen={openSections.volume}>
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Volume & densité
            </p>
          </div>

          <div id="v4-density-section">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text)" }}
            >
              Densité de meubles
            </label>
            {densityAiNote && (
              <p
                className="mb-2 text-xs"
                style={{ color: "var(--color-accent)" }}
              >
                {densityAiNote}
              </p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { id: "light", label: "Léger" },
                { id: "normal", label: "Normal" },
                { id: "dense", label: "Dense" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    markTouched("density");
                    props.onFieldChange("density", d.id);
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background:
                      props.density === d.id ? "var(--color-accent)" : "var(--color-surface)",
                    color: props.density === d.id ? "#FFFFFF" : "var(--color-text)",
                    border:
                      props.density === d.id ? "none" : "2px solid var(--color-border)",
                  }}
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                onClick={openDensityPhotoFlow}
                className="col-span-3 sm:col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  border: "2px solid var(--color-border)",
                }}
                title="Ajouter des photos pour aider l'estimation de densité"
                aria-label="Ajouter des photos pour la densité de meubles"
              >
                {densityPhotoStatus === "analyzing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : densityPhotoStatus === "done" ? (
                  <Check className="w-4 h-4" style={{ color: "var(--color-success)" }} />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span className="sm:hidden">Photo densité</span>
              </button>
            </div>
            {shouldShowFieldError("density") && !isDensityValid && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                Densité requise
              </p>
            )}
          </div>

          <div id="v4-kitchen-section">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text)" }}
            >
              Cuisine équipée ?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "none", label: "Non" },
                { id: "appliances", label: "Oui" },
                { id: "full", label: "Complète" },
              ].map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => {
                    markTouched("kitchenIncluded");
                    props.onFieldChange("kitchenIncluded", k.id);
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background:
                      props.kitchenIncluded === k.id
                        ? "var(--color-accent)"
                        : "var(--color-surface)",
                    color:
                      props.kitchenIncluded === k.id ? "#FFFFFF" : "var(--color-text)",
                    border:
                      props.kitchenIncluded === k.id
                        ? "none"
                        : "2px solid var(--color-border)",
                  }}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {shouldShowFieldError("kitchenIncluded") && !isKitchenSelectionValid && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                Sélection cuisine requise
              </p>
            )}
          </div>

          {props.kitchenIncluded === "appliances" && (
            <div>
              <label
                htmlFor="v4-kitchen-count"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Nombre d'électroménagers
              </label>
              <input
                id="v4-kitchen-count"
                type="number"
                min={1}
                max={20}
                value={props.kitchenApplianceCount}
                onChange={(e) =>
                  props.onFieldChange("kitchenApplianceCount", e.target.value)
                }
                onBlur={() => markTouched("kitchenApplianceCount")}
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "var(--color-bg)",
                  border: `2px solid ${
                    shouldShowFieldError("kitchenApplianceCount") && !isKitchenValid
                      ? "var(--color-danger)"
                      : "var(--color-border)"
                  }`,
                  color: "var(--color-text)",
                }}
                placeholder="3"
              />
              {shouldShowFieldError("kitchenApplianceCount") && !isKitchenValid && (
                <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                  Nombre requis (min 1)
                </p>
              )}
            </div>
          )}
        </div>
      </CardV4>
      </AnimatedSection>
      </div>

      {/* Informations complémentaires (dépliant) */}
      <div
        className="order-6 space-y-1 rounded-2xl border p-1.5 transition-colors duration-200"
        style={sectionFrameStyle(activeSection === "missingInfo")}
      >
          <button
            type="button"
            disabled={isMissingInfoLocked}
            onClick={() => {
              if (isMissingInfoLocked) return;
              setShowMissingInfoPanel((v) => {
                const next = !v;
                if (next) setActiveSection("missingInfo");
                else setActiveSection((prev) => (prev === "missingInfo" ? null : prev));
                return next;
              });
            }}
            className={`w-full rounded-xl border px-3 text-left flex items-center justify-between gap-3 disabled:cursor-not-allowed ${
              missingInfoValidated && !missingInfoPanelOpen ? "py-1.5" : "py-2"
            }`}
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              opacity: isMissingInfoLocked ? 0.62 : 1,
            }}
            aria-expanded={missingInfoPanelOpen}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                Ajouter des précisions (facultatif)
              </p>
              {!missingInfoPanelOpen && (
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {missingInfoValidated ? "Précisions validées" : "Photos / contraintes / notes"}
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2" aria-hidden>
              {(!missingInfoValidated || isMissingInfoLocked) && (
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: isMissingInfoLocked
                      ? "var(--color-text-muted)"
                      : missingInfoPanelOpen
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {isMissingInfoLocked ? "Verrouillé" : missingInfoPanelOpen ? "En cours" : "Facultatif"}
                </span>
              )}
              {missingInfoValidated ? (
                <Check className="w-4 h-4" style={{ color: "var(--color-success)" }} />
              ) : (
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${missingInfoPanelOpen ? "rotate-180" : ""}`}
                  style={{ color: "var(--color-text-muted)" }}
                />
              )}
            </div>
          </button>
          {isMissingInfoLocked && (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Terminez d'abord "Coordonnées" pour débloquer ce bloc.
            </p>
          )}

          <AnimatedSection contentKey="missingInfo" isOpen={missingInfoPanelOpen}>
            <CardV4 padding="md">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: "photos" as const, label: "photo + IA", withCamera: true },
                  { id: "constraints" as const, label: "Contraintes Usuelles" },
                  { id: "notes" as const, label: "champs libre" },
                ].map((tab) => {
                  const selected = activeMissingInfoTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveMissingInfoTab(tab.id);
                        if (tab.id === "photos") {
                          setPhotoAnalysisContext("specific_constraints");
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: selected ? "var(--color-accent)" : "var(--color-surface)",
                        color: selected ? "#FFFFFF" : "var(--color-text)",
                        border: selected ? "none" : "2px solid var(--color-border)",
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {tab.withCamera ? <Camera className="w-3.5 h-3.5" /> : null}
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeMissingInfoTab === "constraints" && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    Contraintes usuelles. à préciser
                  </p>

                  <div className="hidden sm:block">
                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
                      <div className="grid grid-cols-[1fr,120px,120px] border-b" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}>
                        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                          Contrainte
                        </div>
                        <div className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                          Départ
                        </div>
                        <div className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                          Arrivée
                        </div>
                      </div>
                      {questions.map((q) => {
                        const sides = parseAccessSides()[q.key];
                        const destDisabled = destinationUnknown;
                        return (
                          <div
                            key={q.key}
                            className="grid grid-cols-[1fr,120px,120px] items-center border-t"
                            style={{ borderColor: "var(--color-border)" }}
                          >
                            <div className="px-3 py-3 text-sm font-medium" style={{ color: "var(--color-text)" }}>
                              {q.label}
                            </div>
                            <div className="px-3 py-2 flex justify-center">
                              <ToggleYes
                                active={Boolean(sides?.origin)}
                                onToggle={() => toggleSide(q.key, "origin")}
                                ariaLabel={`Départ: ${q.label}`}
                              />
                            </div>
                            <div className="px-3 py-2 flex justify-center">
                              <ToggleYes
                                active={Boolean(sides?.destination)}
                                disabled={destDisabled}
                                onToggle={() => toggleSide(q.key, "destination")}
                                ariaLabel={`Arrivée: ${q.label}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:hidden space-y-2">
                    {questions.map((q) => {
                      const sides = parseAccessSides()[q.key];
                      const destDisabled = destinationUnknown;
                      return (
                        <div
                          key={q.key}
                          className="rounded-xl border p-3 space-y-2"
                          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                        >
                          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                            {q.label}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                                Départ
                              </span>
                              <ToggleYes
                                active={Boolean(sides?.origin)}
                                onToggle={() => toggleSide(q.key, "origin")}
                                ariaLabel={`Départ: ${q.label}`}
                              />
                            </div>
                            <div className="w-px h-8" style={{ background: "var(--color-border)" }} />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                                Arrivée
                              </span>
                              <ToggleYes
                                active={Boolean(sides?.destination)}
                                disabled={destDisabled}
                                onToggle={() => toggleSide(q.key, "destination")}
                                ariaLabel={`Arrivée: ${q.label}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeMissingInfoTab === "notes" && (
                <div className="space-y-3">
                  <label
                    htmlFor="v4-specific-notes"
                    className="block text-sm font-semibold"
                    style={{ color: "var(--color-text)" }}
                  >
                    D'autre spécificitées à prendre en compte
                  </label>
                  <textarea
                    id="v4-specific-notes"
                    value={props.specificNotes}
                    onChange={(e) => {
                      setMissingInfoValidated(false);
                      props.onFieldChange("specificNotes", e.target.value);
                    }}
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-sm resize-y"
                    style={{
                      background: "var(--color-bg)",
                      border: "2px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    placeholder={`Exemple :\nJ'ai un Piano droit, et une armoire très lourde et indémontable\nj'aimerais si possible que vous fassiez le menage dans le logement de départ :-)`}
                  />
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Champ optionnel
                  </p>
                </div>
              )}

              {activeMissingInfoTab === "photos" && (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Ajouter des photos pour une estimation plus precise. Nous analysons vos photos pour enrichir votre dossier.
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                    <div
                      className="rounded-xl p-3 space-y-3"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        Import / Drag and drop
                      </p>
                      <div
                        className="rounded-xl p-4 text-center border-2 border-dashed transition-colors"
                        style={{
                          borderColor: isDragOverPhotos ? "var(--color-accent)" : "var(--color-border)",
                          background: isDragOverPhotos ? "var(--color-accent-light)" : "var(--color-surface)",
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOverPhotos(true);
                        }}
                        onDragLeave={() => setIsDragOverPhotos(false)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setIsDragOverPhotos(false);
                          const files = Array.from(e.dataTransfer.files || []);
                          await onPhotoFilesPicked(files);
                        }}
                      >
                        <Upload className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--color-accent)" }} />
                        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          Deposez vos photos ici
                        </p>
                      </div>
                      <input
                        ref={photoInputRef}
                        id="v4-optional-photos"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          await onPhotoFilesPicked(files);
                          e.currentTarget.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-full rounded-xl px-3 py-2 text-sm font-semibold"
                        style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", color: "var(--color-text)" }}
                      >
                        Importer des photos
                      </button>
                      {activeUploadedPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {activeUploadedPhotos.map((photo) => {
                            const key = photo.storageKey || photo.id;
                            const previewSrc = photoPreviewUrls[key] || photo.url || "";
                            return (
                              <div
                                key={key}
                                className="relative rounded-lg overflow-hidden border"
                                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                              >
                                {previewSrc ? (
                                  <img
                                    src={previewSrc}
                                    alt={photo.originalFilename}
                                    className="w-full h-20 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-20 flex items-center justify-center">
                                    <Camera className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await removeUploadedPhoto(photo);
                                  }}
                                  className="absolute top-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
                                  aria-label="Supprimer cette photo"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="hidden lg:flex items-center justify-center px-1">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                        <span>IA</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex lg:hidden items-center justify-center">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                        <span>IA</span>
                        <ArrowDown className="w-4 h-4" />
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-3 space-y-2"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        Retour IA (contraintes particulières)
                      </p>
                      {moverInsights.length === 0 && !isAnalyzingPhotos && (
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          Ajoutez des photos pour obtenir un retour IA.
                        </p>
                      )}
                      {(isUploadingPhotos || isAnalyzingPhotos) && pipelineVisibleSteps.length > 0 && (
                        <div className="space-y-1.5">
                          {PIPELINE_STEPS.filter((s) => pipelineVisibleSteps.includes(s.key)).map((step) => {
                            const status = pipelineStatuses[step.key];
                            return (
                              <div key={step.key} className="flex items-center justify-between gap-2">
                                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                  {step.label}
                                </span>
                                {status === "done" ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase"
                                    style={{ color: "var(--color-success)" }}
                                  >
                                    <Check className="w-3 h-3" />
                                    validé
                                  </span>
                                ) : (
                                  <span
                                    className="text-[10px] font-semibold uppercase"
                                    style={{
                                      color:
                                        status === "error"
                                          ? "var(--color-danger)"
                                          : "var(--color-accent)",
                                    }}
                                  >
                                    {status === "error" ? "erreur" : "en cours"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {photoPanelError && (
                        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
                          {photoPanelError}
                        </p>
                      )}
                      {activeUploadedPhotos.length > 0 && (
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {activeUploadedPhotos.length} photo(s) active(s)
                        </p>
                      )}
                      {uploadedPhotos.length > activeUploadedPhotos.length && (
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {uploadedPhotos.length - activeUploadedPhotos.length} photo(s) masquée(s) (conservées en historique).
                        </p>
                      )}
                      <textarea
                        value={
                          photoAnalysisContext === "density"
                            ? densityReturnIaText
                            : constraintsReturnIaText
                        }
                        onChange={(e) => {
                          setMissingInfoValidated(false);
                          const nextText = e.target.value;
                          const parsed = parseInsightsFromText(nextText);
                          setMoverInsights(parsed);
                          if (photoAnalysisContext === "density") {
                            setDensityReturnIaText(nextText);
                            const note = nextText.trim() ? `Analyse photo : ${nextText.trim()}` : "";
                            setDensityAiNote(note);
                            props.onDensityAiNoteChange?.(note);
                          } else {
                            setConstraintsReturnIaText(nextText);
                            props.onAiInsightsChange?.(parsed);
                          }
                        }}
                        rows={8}
                        className="w-full rounded-xl px-3 py-2 text-sm resize-y"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)",
                        }}
                        placeholder={
                          photoAnalysisContext === "density"
                            ? "Retour IA densité : sélection suggérée + justification."
                            : "Le retour IA apparaîtra ici. Vous pouvez l'ajuster avant envoi."
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setMissingInfoValidated(true);
                  setShowMissingInfoPanel(false);
                }}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: "var(--color-accent)",
                  color: "#FFFFFF",
                }}
              >
                Valider ces précisions
              </button>
            </div>
            </CardV4>
          </AnimatedSection>
      </div>

      {/* Formule */}
      {props.pricingByFormule && (
        <div
          id="v4-section-formule"
          className="order-4 space-y-1 rounded-2xl border p-1.5 transition-colors duration-200"
          style={sectionFrameStyle(activeSection === "formule")}
        >
        {renderSectionHeader("formule", "Formule")}
        <AnimatedSection contentKey="formule" isOpen={openSections.formule}>
        <CardV4 padding="md">
          <div className="space-y-4">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Votre formule
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                {
                  id: "ECONOMIQUE" as const,
                  label: "Éco",
                  recommended: false,
                  bullets: ["Transport uniquement", "Vous emballez"],
                },
                {
                  id: "STANDARD" as const,
                  label: "Standard",
                  recommended: true,
                  bullets: ["Transport + aide", "Emballage basique"],
                },
                {
                  id: "PREMIUM" as const,
                  label: "Premium",
                  recommended: false,
                  bullets: ["Tout inclus", "Emballage complet"],
                },
              ] as const).map((f) => {
                const price = props.pricingByFormule![f.id];
                const selected =
                  (formuleExplicitChoice || props.selectedFormule !== "STANDARD") &&
                  props.selectedFormule === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFormuleExplicitChoice(true);
                      props.onFormuleChange(f.id);
                    }}
                    className="relative rounded-xl p-4 text-left transition-all"
                    style={{
                      background: selected
                        ? "var(--color-accent-light)"
                        : "var(--color-surface)",
                      border: `2px solid ${
                        selected ? "var(--color-accent)" : "var(--color-border)"
                      }`,
                    }}
                  >
                    {f.recommended && (
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: "var(--color-accent)",
                          color: "#FFFFFF",
                        }}
                      >
                        + Top
                      </div>
                    )}
                    <p
                      className="text-lg font-bold mb-2"
                      style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
                    >
                      {f.label}
                    </p>
                    <p
                      className="text-sm font-bold mb-3"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {fmtEur(price?.priceMin ?? 0)} – {fmtEur(price?.priceMax ?? 0)}
                    </p>
                    <ul className="space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {f.bullets.map((b, i) => (
                        <li key={i}>• {b}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        </CardV4>
        </AnimatedSection>
        </div>
      )}

      {/* Contact */}
      <div
        id="v4-section-contact"
        className="order-5 space-y-1 rounded-2xl border p-1.5 transition-colors duration-200"
        style={sectionFrameStyle(activeSection === "contact")}
      >
      {renderSectionHeader("contact", "Coordonnées")}
      <AnimatedSection contentKey="contact" isOpen={openSections.contact}>
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Vos coordonnées
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="v4-firstName"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Prénom
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ color: "var(--color-text-muted)" }}
                />
                <input
                  id="v4-firstName"
                  type="text"
                  value={props.firstName}
                onChange={(e) => {
                  setContactValidated(false);
                  setEmailCheckState("idle");
                  setEmailCheckMessage(null);
                  props.onFieldChange("firstName", e.target.value);
                }}
                  onBlur={() => markTouched("firstName")}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    border: `2px solid ${
                      shouldShowFieldError("firstName") && !isFirstNameValid
                        ? "var(--color-danger)"
                        : "var(--color-border)"
                    }`,
                    color: "var(--color-text)",
                  }}
                  placeholder="Jean"
                />
              </div>
              {shouldShowFieldError("firstName") && !isFirstNameValid && (
                <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                  Prénom requis
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="v4-phone"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Téléphone (optionnel)
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ color: "var(--color-text-muted)" }}
                />
                <input
                  id="v4-phone"
                  type="tel"
                  value={props.phone}
                  onChange={(e) => props.onFieldChange("phone", e.target.value)}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    border: "2px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="v4-email"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text)" }}
            >
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: "var(--color-text-muted)" }}
              />
              <input
                id="v4-email"
                type="email"
                value={props.email}
                onChange={(e) => {
                  setContactValidated(false);
                  setEmailCheckState("idle");
                  setEmailCheckMessage(null);
                  props.onFieldChange("email", e.target.value);
                }}
                onBlur={() => markTouched("email")}
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                style={{
                  background: "var(--color-bg)",
                  border: `2px solid ${
                    shouldShowFieldError("email") && !isEmailValid
                      ? "var(--color-danger)"
                      : "var(--color-border)"
                  }`,
                  color: "var(--color-text)",
                }}
                placeholder="jean@exemple.fr"
              />
            </div>
            {shouldShowFieldError("email") && !isEmailValid && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                Email valide requis
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Adresse email de contact (obligatoire)
            </p>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={async () => {
                markTouched("firstName", "email");
                if (!isFirstNameValid || !isEmailValid) return;
                setEmailCheckState("checking");
                setEmailCheckMessage("Vérification silencieuse de l'email...");
                const check = await runSilentEmailCheck((props.email || "").trim());
                if (check.ok) {
                  setContactValidated(true);
                  setEmailCheckState("valid");
                  setEmailCheckMessage(check.message);
                } else {
                  setContactValidated(false);
                  setEmailCheckState("invalid");
                  setEmailCheckMessage(check.message);
                }
              }}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{
                background: "var(--color-accent)",
                color: "#FFFFFF",
              }}
            >
              {emailCheckState === "checking" ? "Validation..." : "Valider les coordonnées"}
            </button>
            {emailCheckMessage && (
              <p
                className="text-xs"
                style={{
                  color:
                    emailCheckState === "invalid"
                      ? "var(--color-danger)"
                      : emailCheckState === "valid"
                      ? "var(--color-success)"
                      : "var(--color-text-muted)",
                }}
              >
                {emailCheckMessage}
              </p>
            )}
          </div>
        </div>
      </CardV4>
      </AnimatedSection>
      </div>

      {/* CTA */}
      <div className="order-7 space-y-3">
        <button
          id="v4-primary-submit-cta"
          type="button"
          disabled={props.isSubmitting}
          onClick={props.onSubmit}
          className="group relative w-full rounded-xl py-4 text-base font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-300 touch-manipulation overflow-hidden"
          style={{
            background: "var(--color-accent)",
            boxShadow: "0 4px 16px rgba(14,165,166,0.3)",
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {props.isSubmitting ? "Enregistrement..." : "Lancer ma demande de devis"}
            {!props.isSubmitting && (
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            )}
          </span>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            style={{ background: "var(--color-surface)" }}
          />
        </button>

        <p className="text-xs text-center font-medium" style={{ color: "var(--color-text-muted)" }}>
          ~30 sec restantes
        </p>
      </div>
    </div>
  );
}
