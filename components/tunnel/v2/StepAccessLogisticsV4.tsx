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
  originBoxVolumeM3: string;
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
  showOptionalDetailsBlock?: boolean;
  /** Called when user enters a new block/section */
  onBlockEntered?: (blockId: string) => void;
}

const questions: Array<{ key: QuestionKey; label: string }> = [
  { key: "narrow_access", label: "Petit ascenseur / passages étroits ?" },
  { key: "long_carry", label: "Portage > 10 m ?" },
  { key: "difficult_parking", label: "Stationnement compliqué ?" },
  { key: "lift_required", label: "Besoin d'un monte-meuble ?" },
];

const OBJECTS_BLOCK_START = "[[OBJETS_SPECIFIQUES_V4_START]]";
const OBJECTS_BLOCK_END = "[[OBJETS_SPECIFIQUES_V4_END]]";
const EXTRA_NOTES_BLOCK_START = "[[ENRICHISSEMENT_NOTES_V4_START]]";
const EXTRA_NOTES_BLOCK_END = "[[ENRICHISSEMENT_NOTES_V4_END]]";

type ObjectsState = {
  piano: boolean;
  coffreFort: boolean;
  meublesTresLourdsCount: number;
  aquarium: boolean;
  objetsFragilesVolumineux: boolean;
};

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
  const isBox = (t: string) => (t || "").trim().toLowerCase() === "box";
  const showValidation = !!props.showValidation;
  const isOriginAddressValid = (props.originAddress || "").trim().length >= 5;
  const isDestinationAddressValid = (props.destinationAddress || "").trim().length >= 5;
  const isFirstNameValid = (props.firstName || "").trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((props.email || "").trim());
  const isMovingDateValid = !!props.movingDate && props.movingDate >= minMovingDate;
  const isOriginBox = isBox(props.originHousingType);
  const isDestinationBox = isBox(props.destinationHousingType);
  const parsedOriginBoxVolumeM3 = Number.parseFloat(
    String(props.originBoxVolumeM3 || "").replace(",", ".")
  );
  const isOriginBoxVolumeValid = Number.isFinite(parsedOriginBoxVolumeM3) && parsedOriginBoxVolumeM3 > 0;
  const isDensityValid = isOriginBox ? true : props.density !== "";
  const isKitchenSelectionValid = isOriginBox ? true : props.kitchenIncluded !== "";
  const isKitchenValid =
    isOriginBox ||
    props.kitchenIncluded !== "appliances" ||
    (Number.parseInt(String(props.kitchenApplianceCount || "").trim(), 10) || 0) >= 1;
  useEffect(() => {
    if (!isOriginBox) return;
    if (props.density !== "normal") {
      props.onFieldChange("density", "normal");
    }
    if (props.kitchenIncluded !== "none") {
      props.onFieldChange("kitchenIncluded", "none");
      props.onFieldChange("kitchenApplianceCount", "");
    }
  }, [isOriginBox, props.density, props.kitchenIncluded, props.onFieldChange]);
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
  const showOptionalDetailsBlock = props.showOptionalDetailsBlock ?? true;
  const [fallbackUploadLeadId, setFallbackUploadLeadId] = useState<string | null>(null);
  const [isDragOverPhotos, setIsDragOverPhotos] = useState(false);
  const [mobileRouteOpen, setMobileRouteOpen] = useState<"origin" | "destination">("origin");
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

  const stripTaggedBlock = (raw: string, startTag: string, endTag: string): string => {
    const start = raw.indexOf(startTag);
    const end = raw.indexOf(endTag);
    if (start === -1 || end === -1 || end < start) return raw.trim();
    const before = raw.slice(0, start).trim();
    const after = raw.slice(end + endTag.length).trim();
    return [before, after].filter(Boolean).join("\n\n").trim();
  };

  const parseObjectsState = (raw: string): ObjectsState => {
    const start = raw.indexOf(OBJECTS_BLOCK_START);
    const end = raw.indexOf(OBJECTS_BLOCK_END);
    const defaults: ObjectsState = {
      piano: false,
      coffreFort: false,
      meublesTresLourdsCount: 0,
      aquarium: false,
      objetsFragilesVolumineux: false,
    };
    if (start === -1 || end === -1 || end < start) return defaults;
    const block = raw.slice(start + OBJECTS_BLOCK_START.length, end);
    const readBool = (key: string) =>
      new RegExp(`^${key}:(true|false)$`, "m").exec(block)?.[1] === "true";
    const countMatch = /^meublesTresLourdsCount:(\d+)$/m.exec(block);
    return {
      piano: readBool("piano"),
      coffreFort: readBool("coffreFort"),
      meublesTresLourdsCount: countMatch ? Number.parseInt(countMatch[1], 10) : 0,
      aquarium: readBool("aquarium"),
      objetsFragilesVolumineux: readBool("objetsFragilesVolumineux"),
    };
  };

  const serializeObjectsState = (state: ObjectsState): string =>
    `${OBJECTS_BLOCK_START}
piano:${state.piano}
coffreFort:${state.coffreFort}
meublesTresLourdsCount:${state.meublesTresLourdsCount}
aquarium:${state.aquarium}
objetsFragilesVolumineux:${state.objetsFragilesVolumineux}
${OBJECTS_BLOCK_END}`;

  const parseExtraNote = (raw: string): string => {
    const start = raw.indexOf(EXTRA_NOTES_BLOCK_START);
    const end = raw.indexOf(EXTRA_NOTES_BLOCK_END);
    if (start === -1 || end === -1 || end < start) return "";
    const block = raw.slice(start + EXTRA_NOTES_BLOCK_START.length, end);
    const read = (key: string) => {
      const m = new RegExp(`^${key}:(.*)$`, "m").exec(block);
      if (!m?.[1]) return "";
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return m[1];
      }
    };
    const unified = read("note");
    if (unified) return unified;
    // Compat: relit l'ancien format multi-champs.
    return [read("depart"), read("arrivee"), read("objets")]
      .filter((v) => v.trim().length > 0)
      .join(" | ");
  };

  const serializeExtraNote = (note: string): string =>
    `${EXTRA_NOTES_BLOCK_START}
note:${encodeURIComponent(note || "")}
${EXTRA_NOTES_BLOCK_END}`;

  const rebuildSpecificNotes = (nextObjects: ObjectsState, nextExtraNote: string) => {
    const withoutObjects = stripTaggedBlock(props.specificNotes || "", OBJECTS_BLOCK_START, OBJECTS_BLOCK_END);
    const base = stripTaggedBlock(withoutObjects, EXTRA_NOTES_BLOCK_START, EXTRA_NOTES_BLOCK_END);
    const hasAnyObject =
      nextObjects.piano ||
      nextObjects.coffreFort ||
      nextObjects.aquarium ||
      nextObjects.objetsFragilesVolumineux ||
      nextObjects.meublesTresLourdsCount > 0;
    const hasExtra = nextExtraNote.trim().length > 0;
    const blocks = [
      hasAnyObject ? serializeObjectsState(nextObjects) : "",
      hasExtra ? serializeExtraNote(nextExtraNote) : "",
    ].filter(Boolean);
    const nextRaw = [base, ...blocks].filter(Boolean).join("\n\n").trim();
    setMissingInfoValidated(false);
    props.onFieldChange("specificNotes", nextRaw);
  };

  const upsertObjectsState = (next: ObjectsState) => {
    const currentNote = parseExtraNote(props.specificNotes || "");
    rebuildSpecificNotes(next, currentNote);
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

  const setSideRas = (loc: "origin" | "destination") => {
    setMissingInfoValidated(false);
    const current = parseAccessSides();
    for (const qKey of Object.keys(current) as QuestionKey[]) {
      current[qKey][loc] = false;
    }
    const parts: string[] = [];
    for (const qKey of Object.keys(current) as QuestionKey[]) {
      if (current[qKey].origin) parts.push(`origin:${qKey}`);
      if (current[qKey].destination) parts.push(`destination:${qKey}`);
    }
    const nextDetails = parts.join("|");
    props.onFieldChange("access_details", nextDetails);
    const hasAny = parts.length > 0;
    props.onFieldChange("access_type", hasAny ? "constrained" : "simple");
    props.onFieldChange("narrow_access", Boolean(current.narrow_access.origin || current.narrow_access.destination));
    props.onFieldChange("long_carry", Boolean(current.long_carry.origin || current.long_carry.destination));
    props.onFieldChange(
      "difficult_parking",
      Boolean(current.difficult_parking.origin || current.difficult_parking.destination)
    );
    props.onFieldChange("lift_required", Boolean(current.lift_required.origin || current.lift_required.destination));
  };

  const floorLabel = (value: string) => FLOOR_OPTIONS.find((o) => o.value === value)?.label ?? "Non renseigné";
  const elevatorLabel = (value: string) =>
    value === "yes" ? "Oui" : value === "partial" ? "Oui mais petit" : value === "none" ? "Non" : "Non renseigné";

  const renderHousingTypePicker = (
    prefix: "origin" | "destination",
    housingType: string,
    setHousingType: (v: string) => void,
    setFloor: (v: string) => void,
    setElevator: (v: string) => void
  ) => {
    const locationLabel = prefix === "origin" ? "Départ" : "Arrivée";
    return (
      <div className="space-y-2">
        <div
          className="flex items-center justify-between gap-3 sm:rounded-lg sm:border sm:px-2 sm:py-2"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg)",
          }}
        >
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
            <button
              type="button"
              onClick={() => {
                setHousingType("box");
                setFloor("0");
                setElevator("yes");
                props.onFieldChange(`${prefix}FloorTouched`, true);
                props.onFieldChange(`${prefix}ElevatorTouched`, true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: isBox(housingType)
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: isBox(housingType) ? "#FFFFFF" : "var(--color-text)",
                border: isBox(housingType)
                  ? "none"
                  : "2px solid var(--color-border)",
              }}
            >
              Box
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderApartmentAccessFields = (
    floor: string,
    elevator: string,
    setFloor: (v: string) => void,
    setElevator: (v: string) => void
  ) => (
    <div className="space-y-3">
      <div
        className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:rounded-lg sm:border sm:px-2 sm:py-2"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-bg)",
        }}
      >
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Étage
            </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 whitespace-nowrap">
              {FLOOR_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setFloor(o.value)}
              className="shrink-0 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all"
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
      <div
        className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:rounded-lg sm:border sm:px-2 sm:py-2"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-bg)",
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          Ascenseur
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 whitespace-nowrap">
          {[
            { value: "yes", label: "Oui" },
            { value: "partial", label: "Oui mais petit" },
            { value: "none", label: "Non" },
          ].map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setElevator(o.value)}
              className="shrink-0 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all"
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
    );

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
  const accessSides = parseAccessSides();
  const originRas = questions.every((q) => !accessSides[q.key]?.origin);
  const destinationRas = questions.every((q) => !accessSides[q.key]?.destination);
  const objectsState = parseObjectsState(props.specificNotes || "");
  const extraNote = parseExtraNote(props.specificNotes || "");
  const objectsRas =
    !objectsState.piano &&
    !objectsState.coffreFort &&
    !objectsState.aquarium &&
    !objectsState.objetsFragilesVolumineux &&
    objectsState.meublesTresLourdsCount <= 0;

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
      valid: isOriginBox ? isOriginBoxVolumeValid : isDensityValid && isKitchenSelectionValid && isKitchenValid,
      summary: isOriginBox
        ? isOriginBoxVolumeValid
          ? `Box départ · ${parsedOriginBoxVolumeM3} m³`
          : "Box départ · volume à renseigner"
        : `${props.density ? densityLabelFromId(props.density) : "Densité ?"} · ${
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
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const AUTO_ADVANCE_DELAY_MS = 380;

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

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
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        const currentIndex = sectionOrder.indexOf(newlyValidated);
        const following = sectionOrder.find((k, idx) => idx > currentIndex && !next[k]);
        const shouldOpenMissingInfo =
          showOptionalDetailsBlock && newlyValidated === "contact" && !isMissingInfoLocked;
        setOpenSections((state) => ({
          ...state,
          [newlyValidated]: false,
          ...(following ? { [following]: true } : {}),
        }));
        if (shouldOpenMissingInfo) {
          setShowMissingInfoPanel(true);
          setActiveSection("missingInfo");
        } else if (following) {
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
        if (shouldOpenMissingInfo) {
          window.setTimeout(() => {
            const target = document.getElementById("v4-header-missingInfo");
            target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 140);
        }
        autoAdvanceTimerRef.current = null;
      }, AUTO_ADVANCE_DELAY_MS);
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
    showOptionalDetailsBlock,
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

  // Track block transitions
  useEffect(() => {
    if (activeSection && props.onBlockEntered) {
      props.onBlockEntered(activeSection);
    }
  }, [activeSection]);

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
            <div className="hidden sm:grid sm:grid-cols-2 gap-3">
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
                  {renderHousingTypePicker(
                    "origin",
                    props.originHousingType,
                    (v) => props.onFieldChange("originHousingType", v),
                    (v) => props.onFieldChange("originFloor", v),
                    (v) => props.onFieldChange("originElevator", v)
                  )}
                  {isApartment(props.originHousingType) &&
                    renderApartmentAccessFields(
                      props.originFloor,
                      props.originElevator,
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
                  {renderHousingTypePicker(
                    "destination",
                    props.destinationHousingType,
                    (v) => props.onFieldChange("destinationHousingType", v),
                    (v) => props.onFieldChange("destinationFloor", v),
                    (v) => props.onFieldChange("destinationElevator", v)
                  )}
                  {isApartment(props.destinationHousingType) &&
                    renderApartmentAccessFields(
                      props.destinationFloor,
                      props.destinationElevator,
                      (v) => props.onFieldChange("destinationFloor", v),
                      (v) => props.onFieldChange("destinationElevator", v)
                    )}
                </>
              )}
          </div>

            <div className="sm:hidden space-y-3">
              {([
                { key: "origin" as const, title: "Départ" },
                { key: "destination" as const, title: "Arrivée" },
              ] as const).map(({ key, title }) => {
                const isOpen = mobileRouteOpen === key;
                const isOrigin = key === "origin";
                const isComplete = isOrigin
                  ? isOriginAddressValid && isOriginHousingValid && isOriginFloorValid && isOriginElevatorValid
                  : isDestinationAddressValid &&
                    isDestinationHousingValid &&
                    isDestinationFloorValid &&
                    isDestinationElevatorValid;
                const housingType = isOrigin ? props.originHousingType : props.destinationHousingType;
                const floor = isOrigin ? props.originFloor : props.destinationFloor;
                const elevator = isOrigin ? props.originElevator : props.destinationElevator;
                return (
                  <div key={key} className="rounded-xl border" style={{ borderColor: isComplete ? "var(--color-success)" : "var(--color-border)", background: "var(--color-surface)" }}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 flex items-center justify-between"
                      onClick={() => {
                        setMobileRouteOpen(key);
                      }}
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{title}</p>
                        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {isApartment(housingType)
                            ? `Appartement · ${floorLabel(floor)} · ${elevatorLabel(elevator)}`
                            : isBox(housingType)
                            ? "Box"
                            : "Maison"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: isComplete ? "var(--color-success)" : "var(--color-text-muted)" }}>
                        {isComplete ? "Complet" : isOpen ? "En cours" : "À compléter"}
                      </span>
                    </button>
                    <AnimatedSection contentKey={`route-${key}`} isOpen={isOpen}>
                      <div className="px-3 pb-3 space-y-3">
                        {isOrigin ? (
                          <AddressAutocomplete
                            label={
                              props.originCity
                                ? `Départ · ${props.originCity}${
                                    props.originPostalCode ? ` (${props.originPostalCode})` : ""
                                  }`
                                : "Adresse de départ"
                            }
                            placeholder="Ex: 10 rue de la République"
                            inputId="v4-origin-address-mobile"
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
                              props.onFieldChange("originCountryCode", (s.countryCode ?? "fr").toLowerCase());
                              props.onFieldChange("originLat", s.lat ?? null);
                              props.onFieldChange("originLon", s.lon ?? null);
                            }}
                          />
                        ) : (
                          <AddressAutocomplete
                            label={
                              props.destinationCity
                                ? `Arrivée · ${props.destinationCity}${
                                    props.destinationPostalCode ? ` (${props.destinationPostalCode})` : ""
                                  }`
                                : "Adresse d'arrivée"
                            }
                            placeholder="Ex: 5 avenue Victor Hugo"
                            inputId="v4-destination-address-mobile"
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
                              props.onFieldChange("destinationCountryCode", (s.countryCode ?? "fr").toLowerCase());
                              props.onFieldChange("destinationLat", s.lat ?? null);
                              props.onFieldChange("destinationLon", s.lon ?? null);
                            }}
                          />
                        )}
                        {isOrigin
                          ? renderHousingTypePicker(
              "origin",
              props.originHousingType,
              (v) => props.onFieldChange("originHousingType", v),
                              (v) => props.onFieldChange("originFloor", v),
                              (v) => props.onFieldChange("originElevator", v)
                            )
                          : renderHousingTypePicker(
              "destination",
              props.destinationHousingType,
              (v) => props.onFieldChange("destinationHousingType", v),
                              (v) => props.onFieldChange("destinationFloor", v),
                              (v) => props.onFieldChange("destinationElevator", v)
                            )}
                        {isApartment(housingType) &&
                          renderApartmentAccessFields(
                            floor,
                            elevator,
                            (v) =>
                              isOrigin
                                ? props.onFieldChange("originFloor", v)
                                : props.onFieldChange("destinationFloor", v),
                            (v) =>
                              isOrigin
                                ? props.onFieldChange("originElevator", v)
                                : props.onFieldChange("destinationElevator", v)
                          )}
                      </div>
                    </AnimatedSection>
                  </div>
                );
              })}
            </div>
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
            {isOriginBox && (
              <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Départ en box : densité fixée automatiquement à "Normal".
              </p>
            )}
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
                  disabled={isOriginBox}
                  onClick={() => {
                    markTouched("density");
                    props.onFieldChange("density", d.id);
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
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
                disabled={isOriginBox}
                onClick={openDensityPhotoFlow}
                className="col-span-3 sm:col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
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

          {isOriginBox && (
            <div id="v4-box-volume-section">
              <label
                htmlFor="v4-origin-box-volume-m3"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Volume exact de la box (m³)
              </label>
              <input
                id="v4-origin-box-volume-m3"
                type="number"
                min={1}
                max={400}
                step={0.1}
                value={props.originBoxVolumeM3}
                onChange={(e) => props.onFieldChange("originBoxVolumeM3", e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "var(--color-bg)",
                  border: `2px solid ${
                    shouldShowFieldError("density") && !isOriginBoxVolumeValid
                      ? "var(--color-danger)"
                      : "var(--color-border)"
                  }`,
                  color: "var(--color-text)",
                }}
                placeholder="Ex: 18"
              />
              {shouldShowFieldError("density") && !isOriginBoxVolumeValid && (
                <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                  Volume exact requis pour un départ en box
                </p>
              )}
            </div>
          )}

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
                  disabled={isOriginBox}
                  onClick={() => {
                    markTouched("kitchenIncluded");
                    props.onFieldChange("kitchenIncluded", k.id);
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
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

          {!isOriginBox && props.kitchenIncluded === "appliances" && (
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
      {showOptionalDetailsBlock && (
      <div
        className="order-6 space-y-1 rounded-2xl border p-1.5 transition-colors duration-200"
        style={sectionFrameStyle(activeSection === "missingInfo")}
      >
                    <button
            id="v4-header-missingInfo"
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
              Ajouter des précisions
              </p>
              {!missingInfoPanelOpen && (
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  Pré-rempli : rien à déclarer
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2" aria-hidden>
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
                {isMissingInfoLocked ? "Verrouillé" : missingInfoPanelOpen ? "En cours" : "Pré-rempli"}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${missingInfoPanelOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--color-text-muted)" }}
              />
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
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--color-text)" }}>
                  Derniere étape, 1 minute pour éviter les imprévus
                </h3>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Un accès mal déclaré peut générer 150 à 500 € de frais supplémentaires.
                </p>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  ⏱ 1 minute pour sécuriser votre estimation
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

              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
                <div
                  className="order-1 sm:order-1 min-w-[85%] sm:min-w-0 snap-start rounded-xl border p-3 flex flex-col gap-3"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    1. Objets spécifiques
                  </p>
                  {[
                    { key: "piano", label: "Piano" },
                    { key: "coffreFort", label: "Coffre-fort" },
                    { key: "aquarium", label: "Aquarium" },
                    { key: "objetsFragilesVolumineux", label: "Objets fragiles volumineux" },
                  ].map((item) => {
                    const active = Boolean(objectsState[item.key as keyof ObjectsState]);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          upsertObjectsState({
                            ...objectsState,
                            [item.key]: !active,
                          } as ObjectsState)
                        }
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: active ? "var(--color-accent-light)" : "var(--color-bg)",
                          color: "var(--color-text)",
                          border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                      Meuble(s) très lourd(s)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={objectsState.meublesTresLourdsCount}
                      onChange={(e) => {
                        const next = Number.parseInt(e.target.value || "0", 10);
                        upsertObjectsState({
                          ...objectsState,
                          meublesTresLourdsCount: Number.isFinite(next) ? Math.max(0, next) : 0,
                        });
                      }}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                    />
                  </div>
                  <div className="mt-auto space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        upsertObjectsState({
                          piano: false,
                          coffreFort: false,
                          meublesTresLourdsCount: 0,
                          aquarium: false,
                          objetsFragilesVolumineux: false,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        background: objectsRas ? "var(--color-accent)" : "var(--color-bg)",
                        color: objectsRas ? "#fff" : "var(--color-text)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      Rien à déclarer
                    </button>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhotos || isAnalyzingPhotos}
                      className="w-full px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                      style={{
                        background: "transparent",
                        color: "var(--color-text-secondary)",
                        border: "1px dashed var(--color-border)",
                      }}
                    >
                      <Camera className="w-3.5 h-3.5 inline mr-1" />
                      Ajouter une photo (optionnel)
                      </button>
                  </div>
                </div>

                {!isOriginBox && (
                <div
                  className="order-2 sm:order-2 min-w-[85%] sm:min-w-0 snap-start rounded-xl border p-3 flex flex-col gap-3"
                                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                              >
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    2. Contraintes au départ
                  </p>
                  {questions.map((q) => {
                    const active = Boolean(accessSides[q.key]?.origin);
                    return (
                                <button
                        key={`origin-${q.key}`}
                                  type="button"
                        onClick={() => toggleSide(q.key, "origin")}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: active ? "var(--color-accent-light)" : "var(--color-bg)",
                          color: "var(--color-text)",
                          border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                        }}
                      >
                        {q.label}
                                </button>
                            );
                          })}
                  <div className="mt-auto space-y-2">
                    <button
                      type="button"
                      onClick={() => setSideRas("origin")}
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        background: originRas ? "var(--color-accent)" : "var(--color-bg)",
                        color: originRas ? "#fff" : "var(--color-text)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      Rien à déclarer
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhotos || isAnalyzingPhotos}
                      className="w-full px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                      style={{
                        background: "transparent",
                        color: "var(--color-text-secondary)",
                        border: "1px dashed var(--color-border)",
                      }}
                    >
                      <Camera className="w-3.5 h-3.5 inline mr-1" />
                      Ajouter une photo (optionnel)
                    </button>
                      </div>
                    </div>
                )}

                    {!isDestinationBox && (
                    <div
                  className="order-3 sm:order-3 min-w-[85%] sm:min-w-0 snap-start rounded-xl border p-3 flex flex-col gap-3"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    3. Contraintes à l'arrivée
                  </p>
                  {questions.map((q) => {
                    const active = Boolean(accessSides[q.key]?.destination);
                            return (
                      <button
                        key={`destination-${q.key}`}
                        type="button"
                        disabled={destinationUnknown}
                        onClick={() => toggleSide(q.key, "destination")}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                                    style={{
                          background: active ? "var(--color-accent-light)" : "var(--color-bg)",
                          color: "var(--color-text)",
                          border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                        }}
                      >
                        {q.label}
                      </button>
                            );
                          })}
                  <div className="mt-auto space-y-2">
                    <button
                      type="button"
                      onClick={() => setSideRas("destination")}
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        background: destinationRas ? "var(--color-accent)" : "var(--color-bg)",
                        color: destinationRas ? "#fff" : "var(--color-text)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      Rien à déclarer
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhotos || isAnalyzingPhotos}
                      className="w-full px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                      style={{
                        background: "transparent",
                        color: "var(--color-text-secondary)",
                        border: "1px dashed var(--color-border)",
                      }}
                    >
                      <Camera className="w-3.5 h-3.5 inline mr-1" />
                      Ajouter une photo (optionnel)
                    </button>
                        </div>
                </div>
                    )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  Précision manuelle (commune)
                </label>
                <input
                  type="text"
                  value={extraNote}
                  onChange={(e) => rebuildSpecificNotes(objectsState, e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  placeholder="Ajouter une précision utile (optionnel)"
                />
              </div>

                      {photoPanelError && (
                        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
                          {photoPanelError}
                        </p>
                      )}
                      {activeUploadedPhotos.length > 0 && (
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {activeUploadedPhotos.length} photo(s) ajoutée(s) au dossier.
                        </p>
                      )}
                    </div>
      </CardV4>
          </AnimatedSection>
                </div>
              )}

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
