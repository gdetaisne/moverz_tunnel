'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createLead,
  updateLead,
  uploadLeadPhotos,
  ensureLinkingToken,
} from "@/lib/api/client";
import {
  calculatePricing,
  calculateVolume,
  type DensityType,
  type FormuleType,
  type HousingType,
} from "@/lib/pricing/calculate";
import { COEF_VOLUME, FORMULE_MULTIPLIERS } from "@/lib/pricing/constants";

const STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Projet" },
  { id: 3, label: "Volume & formules" },
  { id: 4, label: "Photos & inventaire" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const HOUSING_SURFACE_DEFAULTS: Record<HousingType, string> = {
  studio: "20",
  t1: "25",
  t2: "40",
  t3: "60",
  t4: "75",
  t5: "90",
  house: "110",
  house_1floor: "120",
  house_2floors: "140",
  house_3floors: "160",
};

const HOUSING_LABELS: Record<HousingType, string> = {
  studio: "Studio",
  t1: "T1",
  t2: "T2",
  t3: "T3",
  t4: "T4",
  t5: "T5+",
  house: "Maison plain-pied",
  house_1floor: "Maison 1 étage",
  house_2floors: "Maison 2 étages",
  house_3floors: "Maison 3+ étages",
};

const COMFORT_FORMULAS: FormuleType[] = ["ECONOMIQUE", "STANDARD", "PREMIUM"];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  originPostalCode: string;
  originCity: string;
  originAddress: string;
  originLat: number | null;
  originLon: number | null;
  originHousingType: HousingType;
  destinationPostalCode: string;
  destinationCity: string;
  destinationAddress: string;
  destinationLat: number | null;
  destinationLon: number | null;
  movingDate: string;
  movingDateEnd: string;
  dateFlexible: boolean;
  housingType: HousingType;
  surfaceM2: string;
  originFloor: string;
  originElevator: string;
  originFurnitureLift: "unknown" | "no" | "yes";
  originCarryDistance:
    | "0-10"
    | "10-20"
    | "20-30"
    | "30-40"
    | "40-50"
    | "50-60"
    | "60-70"
    | "70-80"
    | "80-90"
    | "90-100";
  originParkingAuth: boolean;
  destinationHousingType: HousingType;
  destinationFloor: string;
  destinationElevator: string;
  destinationFurnitureLift: "unknown" | "no" | "yes";
  destinationCarryDistance:
    | "0-10"
    | "10-20"
    | "20-30"
    | "30-40"
    | "40-50"
    | "50-60"
    | "60-70"
    | "70-80"
    | "80-90"
    | "90-100";
  destinationParkingAuth: boolean;
  destinationUnknown: boolean;
  density: DensityType;
  formule: FormuleType;
  serviceMonteMeuble: boolean;
  servicePiano: "none" | "droit" | "quart";
  serviceDebarras: boolean;
  optionStorage: boolean;
  optionCleaning: boolean;
  optionPackingMaterials: boolean;
  optionDismantlingFull: boolean;
  optionDifficultAccess: boolean;
  notes: string;
}

type UploadStatus = "pending" | "uploading" | "uploaded" | "error";

interface LocalUploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
  previewUrl: string;
  photoId?: string;
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
}

interface Process2InventoryRow {
  roomType: string;
  roomLabel: string;
  itemLabel: string;
  quantity: number;
}

function compactModelName(model?: string): string {
  if (!model) return "modèle IA";
  if (model.startsWith("claude-3-5-haiku")) return "Claude 3.5 Haiku";
  if (model.startsWith("claude-3-5-sonnet")) return "Claude 3.5 Sonnet";
  return model;
}

const INITIAL_FORM_STATE: FormState = {
  firstName: "Guillaume",
  lastName: "",
  email: "test@moverz.dev",
  phone: "",
  originPostalCode: "33000",
  originCity: "Bordeaux",
  originAddress: "10 rue de la Paix, 3e étage",
  originLat: null,
  originLon: null,
  originHousingType: "t3",
  destinationPostalCode: "75001",
  destinationCity: "Paris",
  destinationAddress: "20 avenue des Champs, 2e étage",
  destinationLat: null,
  destinationLon: null,
  movingDate: new Date().toISOString().slice(0, 10),
  movingDateEnd: new Date().toISOString().slice(0, 10),
  dateFlexible: true,
  housingType: "t3",
  surfaceM2: "65",
  originFloor: "3",
  originElevator: "none",
  originFurnitureLift: "unknown",
  originCarryDistance: "0-10",
  originParkingAuth: false,
  destinationHousingType: "t3",
  destinationFloor: "2",
  destinationElevator: "medium",
  destinationFurnitureLift: "unknown",
  destinationCarryDistance: "0-10",
  destinationParkingAuth: false,
  destinationUnknown: false,
  density: "normal",
  formule: "STANDARD",
  serviceMonteMeuble: false,
  servicePiano: "none",
  serviceDebarras: false,
  optionStorage: false,
  optionCleaning: false,
  optionPackingMaterials: false,
  optionDismantlingFull: false,
  optionDifficultAccess: false,
  notes: "Test local – veuillez ignorer ce dossier.",
};

function estimateDistanceKm(
  originPostalCode: string,
  destinationPostalCode: string,
  originLat: number | null,
  originLon: number | null,
  destinationLat: number | null,
  destinationLon: number | null
) {
  // Si on dispose de coordonnées précises (BAN / Nominatim), on calcule une distance haversine.
  if (
    originLat != null &&
    originLon != null &&
    destinationLat != null &&
    destinationLon != null
  ) {
    const R = 6371; // rayon moyen de la Terre en km
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(destinationLat - originLat);
    const dLon = toRad(destinationLon - originLon);
    const la1 = toRad(originLat);
    const la2 = toRad(destinationLat);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    if (Number.isFinite(dist) && dist > 0) {
      return Math.min(1200, Math.round(dist));
    }
  }

  // Fallback heuristique par codes postaux (approx département à département).
  if (!originPostalCode || !destinationPostalCode) return 50;
  if (originPostalCode === destinationPostalCode) return 10;
  const o = parseInt(originPostalCode.slice(0, 2), 10);
  const d = parseInt(destinationPostalCode.slice(0, 2), 10);
  if (Number.isNaN(o) || Number.isNaN(d)) return 50;
  const diff = Math.abs(o - d);
  return Math.min(1000, 40 + diff * 40);
}

function formatPrice(price: number | null | undefined) {
  if (price == null || Number.isNaN(price)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMovingDateRange(form: FormState): string {
  const { movingDate, movingDateEnd, dateFlexible } = form;

  const format = (value: string | null | undefined) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
    });
  };

  let main = "";

  if (movingDate && movingDateEnd && movingDateEnd !== movingDate) {
    main = `du ${format(movingDate)} au ${format(movingDateEnd)}`;
  } else if (movingDate) {
    main = `le ${format(movingDate)}`;
  }

  if (dateFlexible) {
    main = main ? `${main} (flexible)` : "Date flexible";
  }

  return main || "Date à préciser";
}

function formatDistanceLabel(straightKm: number): string {
  // straightKm est la distance "à vol d'oiseau" (Haversine).
  if (!Number.isFinite(straightKm) || straightKm <= 0) return "";

  const vol = Math.round(straightKm);

  // Facteur d'approximation pour la route :
  // - petits trajets : peu d'écart
  // - longs trajets : autoroutes qui allongent le chemin
  const factor =
    vol <= 50 ? 1.25 : vol <= 200 ? 1.4 : 1.5;

  const road = Math.round(vol * factor);
  const isLocal = road <= 80;

  if (isLocal) {
    return `Déménagement local · ~${road} km par la route (${vol} km à vol d’oiseau)`;
  }

  return `Environ ~${road} km par la route (${vol} km à vol d’oiseau)`;
}

function getSeasonFactor(dateStr: string | null | undefined): number {
  if (!dateStr) return 1;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 1;
  const month = d.getMonth() + 1; // 1-12

  // Haute saison : été (juin–septembre) + fin d'année
  if ((month >= 6 && month <= 9) || month === 12) return 1.3;

  // Basse saison : janvier-février + novembre
  if (month === 1 || month === 2 || month === 11) return 0.85;

  // Saison "normale"
  return 1.0;
}

function formatHousingCard(
  type: HousingType,
  floor: string | undefined
): { icon: string; title: string; subtitle: string } {
  const baseLabel = HOUSING_LABELS[type];

  const nFloor = Number.parseInt(floor || "", 10);
  const floorLabel =
    Number.isFinite(nFloor) && nFloor > 0 ? `${nFloor}e étage` : "Étage à préciser";

  if (type.startsWith("house")) {
    return {
      icon: "🏠",
      title: baseLabel,
      subtitle: "Maison individuelle",
    };
  }

  return {
    icon: "🏢",
    title: `Appartement ${baseLabel}`,
    subtitle: floorLabel,
  };
}

function MovingTruckIcon() {
  return (
    <svg
      viewBox="0 0 64 32"
      aria-hidden="true"
      className="h-4 w-7 text-slate-950"
    >
      {/* Traits de vitesse */}
      <g
        className="truck-speed-lines"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="4" y1="12" x2="14" y2="12" />
        <line x1="4" y1="17" x2="12" y2="17" />
        <line x1="4" y1="22" x2="10" y2="22" />
      </g>

      {/* Corps du camion */}
      <rect
        x="16"
        y="8"
        width="28"
        height="16"
        rx="2"
        fill="currentColor"
      />

      {/* Cabine à droite */}
      <path
        d="M44 12h10a2 2 0 0 1 2 2v10h-12z"
        fill="currentColor"
      />
      {/* Fenêtre cabine */}
      <rect x="47" y="14" width="6" height="5" rx="1" fill="rgba(15,23,42,0.9)" />

      {/* Roues */}
      <g fill="currentColor">
        <circle cx="24" cy="26" r="3.3" />
        <circle cx="48" cy="26" r="3.3" />
      </g>
      <g fill="#0f172a">
        <circle cx="24" cy="26" r="1.6" />
        <circle cx="48" cy="26" r="1.6" />
      </g>

      <style jsx>{`
        .truck-speed-lines {
          animation: truck-speed 0.7s ease-out infinite;
        }
        @keyframes truck-speed {
          0% {
            opacity: 0;
            transform: translateX(0);
          }
          40% {
            opacity: 1;
            transform: translateX(-1px);
          }
          100% {
            opacity: 0;
            transform: translateX(-3px);
          }
        }
      `}</style>
    </svg>
  );
}

type AddressSuggestion = {
  label: string;
  addressLine?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
};

interface AddressAutocompleteProps {
  label: string;
  placeholder: string;
  helperText?: string;
  mode: "fr" | "world";
  initialValue?: string;
  onSelect: (value: AddressSuggestion) => void;
}

function AddressAutocomplete({
  label,
  placeholder,
  helperText,
  mode,
  initialValue,
  onSelect,
}: AddressAutocompleteProps) {
  const [input, setInput] = useState(initialValue ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Record<string, AddressSuggestion[]>>({});

  useEffect(() => {
    setInput(initialValue ?? "");
  }, [initialValue]);

  const fetchSuggestionsFr = async (query: string): Promise<AddressSuggestion[]> => {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
      query
    )}&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features: {
        properties: {
          label: string;
          city?: string;
          postcode?: string;
        };
        geometry?: { coordinates?: [number, number] };
      }[];
    };
    return data.features.map((f) => ({
      label: f.properties.label,
      addressLine: f.properties.label,
      city: f.properties.city,
      postalCode: f.properties.postcode,
      countryCode: "fr",
      lon: f.geometry?.coordinates?.[0],
      lat: f.geometry?.coordinates?.[1],
    }));
  };

  const fetchSuggestionsWorld = async (query: string): Promise<AddressSuggestion[]> => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&addressdetails=1&limit=5`;
    const res = await fetch(url, {
      headers: {
        // Nominatim conseille de mettre un User-Agent ou un email, mais côté browser on est limité.
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      display_name: string;
      lat: string;
      lon: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        hamlet?: string;
        postcode?: string;
        country_code?: string;
      };
    }[];
    return data.map((item) => {
      const addr = item.address ?? {};
      const city =
        addr.city || addr.town || addr.village || addr.hamlet || undefined;
      return {
        label: item.display_name,
        addressLine: item.display_name,
        city,
        postalCode: addr.postcode,
        countryCode: addr.country_code,
        lat: Number.parseFloat(item.lat),
        lon: Number.parseFloat(item.lon),
      };
    });
  };

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }
    if (cacheRef.current[trimmed]) {
      setResults(cacheRef.current[trimmed]);
      return;
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setIsLoading(true);
    try {
      const suggestions =
        mode === "fr"
          ? await fetchSuggestionsFr(trimmed)
          : await fetchSuggestionsWorld(trimmed);
      cacheRef.current[trimmed] = suggestions;
      if (!ctrl.signal.aborted) {
        setResults(suggestions);
      }
    } catch {
      if (!ctrl.signal.aborted) {
        setResults([]);
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const handleChange = (value: string) => {
    setInput(value);
    setShowDropdown(true);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      runSearch(value).catch(() => {});
    }, 300);
  };

  const handleSelect = (s: AddressSuggestion) => {
    setInput(s.label);
    setShowDropdown(false);
    setResults([]);
    onSelect(s);
  };

  return (
    <div className="relative space-y-1">
      <label className="block text-xs font-medium text-slate-200">{label}</label>
      {helperText && (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      )}
      <input
        type="text"
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true);
        }}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        placeholder={placeholder}
        autoComplete="off"
      />
      {isLoading && (
        <p className="mt-1 text-[11px] text-slate-500">Recherche…</p>
      )}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-950/95 text-xs shadow-lg shadow-black/40">
          {results.map((s, idx) => (
            <button
              key={`${s.label}-${idx}`}
              type="button"
              className="w-full px-3 py-2 text-left text-slate-100 hover:bg-slate-800/80"
              onClick={() => handleSelect(s)}
            >
              <div className="line-clamp-2">{s.label}</div>
              {s.postalCode && s.city && (
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                  {s.postalCode} {s.city}{" "}
                  {s.countryCode && s.countryCode.toUpperCase() !== "FR"
                    ? `· ${s.countryCode.toUpperCase()}`
                    : ""}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BoxesStack({
  className,
  box1Class,
  box2Class,
  box3Class,
}: {
  className?: string;
  box1Class?: string;
  box2Class?: string;
  box3Class?: string;
}) {
  return (
    <div className={["relative h-8 w-16 overflow-visible", className].filter(Boolean).join(" ")}>
      {/* Carton 1 – au sol, à droite */}
      <div
        className={[
          "absolute left-4 top-[-0.75rem] text-lg",
          box1Class,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        📦
      </div>
      {/* Carton 2 – au sol, légèrement à gauche */}
      <div
        className={[
          "absolute left-0 top-[-1rem] text-base",
          box2Class,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        📦
      </div>
      {/* Carton 3 – empilé au-dessus, centré */}
      <div
        className={[
          "absolute left-2.5 top-[-0.8rem] text-base",
          box3Class,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        📦
      </div>
    </div>
  );
}

function Step3MovingDayIntro({
  form,
  distanceKm,
  onComplete,
}: {
  form: FormState;
  distanceKm: number;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"calendar" | "load" | "drive">("calendar");
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDestinationBoxes, setShowDestinationBoxes] = useState(false);

  const baseDate = useMemo(() => {
    const d = new Date(form.movingDate || new Date().toISOString().slice(0, 10));
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  }, [form.movingDate]);

  const days = useMemo(() => {
    const arr: { label: string; isMain: boolean; weekday: string }[] = [];
    for (let offset = -2; offset <= 2; offset += 1) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + offset);
      const day = d.getDate().toString().padStart(2, "0");
      const weekdayRaw = d
        .toLocaleDateString("fr-FR", { weekday: "short" })
        .replace(".", "");
      const weekday = weekdayRaw.slice(0, 2).toUpperCase();
      arr.push({ label: day, isMain: offset === 0, weekday });
    }
    return arr;
  }, [baseDate]);

  useEffect(() => {
    let timeouts: number[] = [];

    const stepDuration = 500; // 0,5 s par date pour laisser le temps de lire

    // Phase 1: calendrier qui défile jour par jour
    days.forEach((_, index) => {
      const id = window.setTimeout(() => {
        setActiveIndex(index);
      }, index * stepDuration);
      timeouts.push(id);
    });

    // Phase 2: cartons qui tombent
    const loadTimeout = window.setTimeout(() => {
      setPhase("load");
    }, days.length * stepDuration + 600);
    timeouts.push(loadTimeout);

    // Phase 3: camion qui part vers l'arrivée
    const driveTimeout = window.setTimeout(() => {
      setPhase("drive");
    }, days.length * stepDuration + 1800);
    timeouts.push(driveTimeout);

    // Apparition des cartons à l'arrivée, une fois le camion presque arrivé
    const destBoxesTimeout = window.setTimeout(() => {
      setShowDestinationBoxes(true);
    }, days.length * stepDuration + 3600);
    timeouts.push(destBoxesTimeout);

    // Fin: on laisse l’animation camion se jouer avant le callback (optionnel)
    const doneTimeout = window.setTimeout(() => {
      onComplete();
    }, days.length * stepDuration + 5200);
    timeouts.push(doneTimeout);

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [days.length, onComplete]);

  const departureBoxStage = useMemo(() => {
    // 1er jour: 1 carton, 2e: 2 cartons, 3e et suivants: 3 cartons empilés
    if (activeIndex === 0) return 1;
    if (activeIndex === 1) return 2;
    if (activeIndex >= 2) return 3;
    return 3;
  }, [activeIndex]);

  const originCityLabel = form.originCity || "Ville de départ";
  const destinationCityLabel = form.destinationCity || "Ville d’arrivée";

  const distanceLabel = formatDistanceLabel(distanceKm);

  const originHousing = formatHousingCard(form.originHousingType, form.originFloor);
  const destinationHousing = formatHousingCard(
    form.destinationHousingType,
    form.destinationFloor
  );

  return (
    <div className="flex min-h-[260px] flex-col justify-between rounded-2xl bg-slate-950/80 p-4 ring-1 ring-slate-800/70">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
          Votre jour J
        </p>
        <p className="text-sm font-semibold text-slate-50">
          On retient votre départ, votre arrivée et surtout cette date.
        </p>
        <p className="text-[11px] text-slate-400">
          Tout ce qu’on va faire ensuite sert à sécuriser ce jour‑là, sans
          mauvaises surprises.
        </p>
      </div>

      {/* Calendrier animé façon agenda */}
      <div className="mt-3 flex flex-col items-center justify-center gap-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
          Calendrier
        </p>
        <div className="flex items-end gap-1 rounded-2xl bg-slate-900/80 px-3 py-2">
          {days.map((day, index) => {
            const isActive = index === activeIndex;
            const isMain = day.isMain;
            return (
              <div
                key={day.label + index}
                className={[
                  "flex h-10 w-8 flex-col items-center justify-between rounded-md border px-1 py-1 text-[11px] transition-all duration-300",
                  isActive
                    ? "border-amber-400 bg-amber-500/20 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.45)] scale-110"
                    : "border-slate-700 bg-slate-900 text-slate-400 scale-95",
                  isMain && "font-semibold",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="text-[9px] uppercase tracking-wide text-slate-400">
                  {day.weekday}
                </span>
                <span className="text-[11px]">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ligne départ / arrivée + animations cartons + camion */}
      {/* Cartes logement (schéma par type) */}
      <div className="mt-4 mb-2 flex justify-between gap-4 text-[11px] text-slate-200">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/90 text-lg">
            {originHousing.icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-50">
              {originHousing.title}
            </p>
            <p className="text-[10px] text-slate-400">{originHousing.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-xs font-semibold text-slate-50">
              {destinationHousing.title}
            </p>
            <p className="text-[10px] text-slate-400">
              {destinationHousing.subtitle}
            </p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/90 text-lg">
            {destinationHousing.icon}
          </div>
        </div>
      </div>

      {/* Ligne 2 : villes */}
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-50">
        <span>{originCityLabel}</span>
        <span>{destinationCityLabel}</span>
      </div>

      {/* Ligne 3 : animation cartons + camion */}
      <div className="space-y-3 text-xs text-slate-200">
        <div className="relative flex items-center justify-between gap-4">
          {/* Pile de cartons au départ (gauche) */}
          <BoxesStack
            className="mt-1"
            box1Class={[
              "transition-opacity duration-300",
              phase === "drive" || departureBoxStage < 1
                ? "opacity-0"
                : "opacity-100 box-fall-1",
              phase === "load" && departureBoxStage >= 1
                ? "box-into-truck-1"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            box2Class={[
              "transition-opacity duration-300",
              phase === "drive" || departureBoxStage < 2
                ? "opacity-0"
                : "opacity-100 box-fall-2",
              phase === "load" && departureBoxStage >= 2
                ? "box-into-truck-2"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            box3Class={[
              "transition-opacity duration-300",
              phase === "drive" || departureBoxStage < 3
                ? "opacity-0"
                : "opacity-100 box-fall-3",
              phase === "load" && departureBoxStage >= 3
                ? "box-into-truck-3"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />

          <div className="relative h-1 flex-1 rounded-full bg-slate-800/80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0,_rgba(56,189,248,0.5),transparent_55%),radial-gradient(circle_at_100%,rgba(16,185,129,0.5),transparent_55%)] opacity-40" />
            {/* Camion qui part quand la date principale est atteinte */}
            <div
              className={[
                "truck-on-line absolute -top-3 left-0 flex h-7 w-9 items-center justify-center rounded-lg bg-sky-400 text-xs font-semibold text-slate-950 shadow-md shadow-sky-500/40",
                phase === "calendar" && "opacity-0",
                phase === "load" && "opacity-100",
                phase === "drive" && "truck-drive",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <MovingTruckIcon />
            </div>
          </div>

          {/* Pile de cartons à l'arrivée (droite), réutilise exactement la même pile */}
          <BoxesStack
            className="ml-auto mt-1"
            box1Class={showDestinationBoxes ? "dest-box-1" : "opacity-0"}
            box2Class={showDestinationBoxes ? "dest-box-2" : "opacity-0"}
            box3Class={showDestinationBoxes ? "dest-box-3" : "opacity-0"}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{distanceLabel}</span>
          <span>On s’occupe de tout le chemin.</span>
        </div>
      </div>

      <style jsx>{`
        .box-fall-1 {
          animation: box-fall-1 800ms ease-out forwards;
        }
        .box-fall-2 {
          animation: box-fall-2 900ms ease-out forwards;
        }
        .box-fall-3 {
          animation: box-fall-3 950ms ease-out forwards;
        }
        @keyframes box-fall-1 {
          0% {
            transform: translateY(0) rotate(-6deg);
            opacity: 0;
          }
          100% {
            transform: translateY(14px) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes box-fall-2 {
          0% {
            transform: translateY(0) rotate(4deg);
            opacity: 0;
          }
          100% {
            transform: translateY(18px) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes box-fall-3 {
          0% {
            transform: translateY(-10px) rotate(2deg);
            opacity: 0;
          }
          100% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
        }
        .box-into-truck-1 {
          animation: box-into-truck-1 900ms ease-in forwards;
        }
        .box-into-truck-2 {
          animation: box-into-truck-2 950ms ease-in forwards;
        }
        .box-into-truck-3 {
          animation: box-into-truck-3 1000ms ease-in forwards;
        }
        @keyframes box-into-truck-1 {
          0% {
            transform: translateY(14px) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-6px) translateX(28px) scale(0.4);
            opacity: 0;
          }
        }
        @keyframes box-into-truck-2 {
          0% {
            transform: translateY(18px) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-4px) translateX(24px) scale(0.4);
            opacity: 0;
          }
        }
        @keyframes box-into-truck-3 {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-10px) translateX(26px) scale(0.4);
            opacity: 0;
          }
        }
        .truck-drive {
          animation: truck-drive 3.2s ease-in-out forwards;
        }
        @keyframes truck-drive {
          0% {
            left: 0;
            opacity: 1;
          }
          100% {
            left: calc(100% - 2.25rem); /* largeur approx. du camion */
            opacity: 1;
          }
        }
        .dest-box-1 {
          animation: dest-box-pop 750ms ease-out forwards;
        }
        .dest-box-2 {
          animation: dest-box-pop 850ms ease-out forwards;
          animation-delay: 80ms;
        }
        .dest-box-3 {
          animation: dest-box-pop 900ms ease-out forwards;
          animation-delay: 140ms;
        }
        @keyframes dest-box-pop {
          0% {
            transform: translateY(10px) scale(0.5);
            opacity: 0;
          }
          60% {
            transform: translateY(-2px) scale(1.05);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function DevisGratuitsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const src = searchParams.get("src") ?? undefined;

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [linkingToken, setLinkingToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localUploadFiles, setLocalUploadFiles] = useState<LocalUploadFile[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [analysisProcesses, setAnalysisProcesses] = useState<AnalysisProcess[] | null>(
    null
  );
  const [process2Inventory, setProcess2Inventory] = useState<Process2InventoryRow[] | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOriginOpen, setIsOriginOpen] = useState(true);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [analysisElapsedMs, setAnalysisElapsedMs] = useState<number>(0);
  const [analysisTargetSeconds, setAnalysisTargetSeconds] = useState<number | null>(
    null
  );
  const [photoFlowChoice, setPhotoFlowChoice] = useState<
    "none" | "photos_now" | "whatsapp_later"
  >("none");
  const [isDestinationForeign, setIsDestinationForeign] = useState(false);

  const goToStep = (next: StepId) => {
    setCurrentStep(next);
    setMaxReachedStep((prev) => (next > prev ? next : prev));
  };

  const distanceKm = useMemo(
    () =>
      estimateDistanceKm(
        form.originPostalCode,
        form.destinationPostalCode,
        form.originLat,
        form.originLon,
        form.destinationLat,
        form.destinationLon
      ),
    [
      form.originPostalCode,
      form.destinationPostalCode,
      form.originLat,
      form.originLon,
      form.destinationLat,
      form.destinationLon,
    ]
  );

  const estimatedVolumeM3 = useMemo(() => {
    const surface = Number(form.surfaceM2.replace(",", "."));
    if (!surface || !Number.isFinite(surface)) return null;
    try {
      return calculateVolume(surface, form.housingType, form.density);
    } catch {
      return null;
    }
  }, [form.surfaceM2, form.housingType, form.density]);

  const seasonFactor = useMemo(
    () => getSeasonFactor(form.movingDate),
    [form.movingDate]
  );

  const pricePerM3NoSeason = useMemo(
    () => COEF_VOLUME * FORMULE_MULTIPLIERS[form.formule],
    [form.formule]
  );

  const pricePerM3Seasoned = useMemo(
    () => pricePerM3NoSeason * seasonFactor,
    [pricePerM3NoSeason, seasonFactor]
  );

  const pricingByFormule = useMemo(() => {
    const surface = Number(form.surfaceM2.replace(",", "."));
    if (!surface || !Number.isFinite(surface)) return null;

    const baseInput = {
      surfaceM2: surface,
      housingType: form.housingType,
      density: form.density,
      distanceKm,
      seasonFactor,
      originFloor: parseInt(form.originFloor || "0", 10) || 0,
      originElevator:
        form.originElevator === "none"
          ? ("no" as const)
          : form.originElevator === "small"
          ? ("partial" as const)
          : ("yes" as const),
      destinationFloor: parseInt(form.destinationFloor || "0", 10) || 0,
      destinationElevator:
        form.destinationElevator === "none"
          ? ("no" as const)
          : form.destinationElevator === "small"
          ? ("partial" as const)
          : ("yes" as const),
      services: {
        monteMeuble: form.serviceMonteMeuble,
        piano:
          form.servicePiano === "none"
            ? null
            : form.servicePiano === "droit"
            ? ("droit" as const)
            : ("quart" as const),
        debarras: form.serviceDebarras,
      },
    };

    const formules: FormuleType[] = ["ECONOMIQUE", "STANDARD", "PREMIUM"];
    return formules.reduce<Record<FormuleType, ReturnType<typeof calculatePricing>>>(
      (acc, formule) => {
        acc[formule] = calculatePricing({ ...baseInput, formule });
        return acc;
      },
      {} as any
    );
  }, [
    form.surfaceM2,
    form.housingType,
    form.density,
    form.originFloor,
    form.originElevator,
    form.destinationFloor,
    form.destinationElevator,
    distanceKm,
  ]);

  const activePricing = useMemo(
    () => (pricingByFormule ? pricingByFormule[form.formule] : null),
    [pricingByFormule, form.formule]
  );

  const volumePriceApprox = useMemo(() => {
    if (estimatedVolumeM3 == null || !Number.isFinite(estimatedVolumeM3)) {
      return null;
    }
    return Math.round(estimatedVolumeM3 * pricePerM3Seasoned);
  }, [estimatedVolumeM3, pricePerM3Seasoned]);

  const comfortScrollRef = useRef<HTMLDivElement | null>(null);

  // Restauration session (évite toute perte de données en cas de refresh / fermeture onglet)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("moverz_tunnel_form_state");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        form?: Partial<FormState>;
        currentStep?: StepId;
        leadId?: string | null;
      };
      if (!parsed || typeof parsed !== "object" || !parsed.form) return;

      setForm((prev) => ({ ...prev, ...parsed.form }));
      if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 4) {
        setCurrentStep(parsed.currentStep);
        setMaxReachedStep(parsed.currentStep);
      }
      if (parsed.leadId) {
        setLeadId(parsed.leadId);
      }
    } catch {
      // Si le JSON est corrompu, on ignore et on repart sur l'état par défaut
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("moverz_tunnel_form_state");
      }
    }
    // une seule fois au mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde automatique (sans perte silencieuse de données)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({
      form,
      currentStep,
      leadId,
    });
    window.localStorage.setItem("moverz_tunnel_form_state", payload);
  }, [form, currentStep, leadId]);

  // Centrer la formule active dans le swiper mobile (Standard par défaut)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = comfortScrollRef.current;
    if (!container) return;
    if (window.innerWidth >= 640) return; // desktop: pas de scroll horizontal

    const index = COMFORT_FORMULAS.indexOf(form.formule);
    if (index === -1) return;

    const cardWidth = container.clientWidth * 0.8; // min-w-[78%] ~ 80%
    const gap = 12; // approx gap-3
    const target =
      Math.max(
        0,
        index * (cardWidth + gap) - (container.clientWidth - cardWidth) / 2
      ) || 0;

    container.scrollTo({
      left: target,
      behavior: "smooth",
    });
  }, [form.formule]);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  const deepLinkWhatsapp = useMemo(() => {
    if (!whatsappNumber || !linkingToken) return null;
    const message = `Bonjour, je veux compléter mon inventaire avec des photos. Mon code dossier est : ${linkingToken}`;
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${whatsappNumber}?text=${encoded}`;
  }, [whatsappNumber, linkingToken]);

  const handleWhatsappLater = async () => {
    if (!leadId) {
      setError("Lead introuvable. Revenez à l’étape précédente puis réessayez.");
      return;
    }
    if (!whatsappNumber) {
      setError(
        "Numéro WhatsApp non configuré. Merci de terminer sans WhatsApp pour le moment."
      );
      return;
    }
    setError(null);
    try {
      setIsSubmitting(true);
      const res = await ensureLinkingToken(leadId);
      const token = res.linkingToken;
      if (token && typeof window !== "undefined") {
        const message = `Bonjour, je souhaite envoyer des photos pour mon déménagement. Mon code dossier est : ${token}`;
        const encoded = encodeURIComponent(message);
        const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
        window.open(url, "_blank");
      }
      // On marque le tunnel comme continué plus tard
      await updateLead(leadId, { photosStatus: "PENDING" });
      router.push("/devis-gratuits/merci");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la préparation de la suite sur WhatsApp.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoInventory = async () => {
    if (!leadId) {
      setError("Lead introuvable. Revenez à l’étape précédente puis réessayez.");
      return;
    }
    setError(null);
    try {
      setIsSubmitting(true);
      await updateLead(leadId, { photosStatus: "NONE" });
      router.push("/devis-gratuits/merci");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la finalisation sans inventaire.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyzePhotos = async () => {
    if (!leadId || localUploadFiles.length === 0) return;
    setError(null);
    try {
      const start = Date.now();
      setAnalysisStartedAt(start);
      setAnalysisElapsedMs(0);
      setIsUploadingPhotos(true);
      setIsAnalyzing(true);
      setLocalUploadFiles((prev) =>
        prev.map((f) =>
          f.status === "pending" ? { ...f, status: "uploading", error: undefined } : f
        )
      );

      const pendingFiles = localUploadFiles
        .filter((f) => f.status === "pending")
        .map((f) => f.file);

      if (pendingFiles.length === 0 && analysisProcesses) {
        setIsUploadingPhotos(false);
        setIsAnalyzing(false);
        return;
      }

      if (pendingFiles.length === 0) {
        throw new Error(
          "Aucune nouvelle photo à analyser. Ajoutez des photos puis réessayez."
        );
      }

      const result = await uploadLeadPhotos(leadId, pendingFiles);

      const totalForTimer = result.success.length || pendingFiles.length || 1;
      setAnalysisTargetSeconds(totalForTimer * 3);

      setLocalUploadFiles((prev) =>
        prev.map((f) => {
          const ok = result.success.find(
            (s) => s.originalFilename === f.file.name
          );
          const ko = result.errors.find(
            (e) => e.originalFilename === f.file.name
          );
          if (ok) {
            return {
              ...f,
              status: "uploaded",
              error: undefined,
              photoId: ok.id,
            };
          }
          if (ko) {
            return {
              ...f,
              status: "error",
              error: ko.reason,
            };
          }
          return f;
        })
      );

      if (result.success.length > 0) {
        const processes: AnalysisProcess[] = [];
        try {
          const classifyRes = await fetch("/api/ai/process2-classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId,
              photos: result.success.map((p) => ({
                id: p.id,
                storageKey: p.storageKey,
                originalFilename: p.originalFilename,
              })),
            }),
          });

          if (classifyRes.ok) {
            const classifyData = (await classifyRes.json()) as {
              results?: {
                photoId: string;
                roomGuessPrimary: string | null;
                roomGuessConfidence: number | null;
              }[];
              inventory?: Process2InventoryRow[];
            };

            const results = classifyData.results ?? [];
            const inventory = classifyData.inventory ?? [];

            const byRoomType = new Map<string, string[]>();
            for (const r of results) {
              const type = r.roomGuessPrimary ?? "INCONNU";
              const list = byRoomType.get(type) ?? [];
              list.push(r.photoId);
              byRoomType.set(type, list);
            }

            const roomTypeLabels: Record<string, string> = {
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

            const process2Rooms: AnalyzedRoom[] = Array.from(
              byRoomType.entries()
            ).map(([roomType, photoIds], index) => ({
              roomId: `process2-${roomType}-${index}`,
              roomType,
              label: roomTypeLabels[roomType] ?? roomType,
              photoIds,
              items: [
                {
                  label: `${photoIds.length} photo(s)`,
                  category: "AUTRE",
                  quantity: photoIds.length,
                  confidence: 1,
                  flags: {},
                },
              ],
            }));

            processes.push({
              id: "process2",
              label: "Process 2",
              model: "Claude (1 requête par photo)",
              rooms: process2Rooms,
            });
            setProcess2Inventory(inventory);
          }
        } catch (err) {
          console.error("Erreur Process 2 (classification par photo):", err);
        }

        setAnalysisProcesses(processes);
        setAnalysisElapsedMs((prev) =>
          prev > 0 ? prev : Date.now() - (analysisStartedAt ?? Date.now())
        );

        try {
          await updateLead(leadId, { photosStatus: "UPLOADED" });
        } catch (e: unknown) {
          const msg =
            e instanceof Error ? e.message.toLowerCase() : String(e ?? "");
          if (msg.includes("leadtunnel introuvable")) {
            console.warn(
              "Lead introuvable lors de la mise à jour photosStatus (UPLOADED)."
            );
          } else {
            throw e;
          }
        }
      } else if (result.errors.length > 0) {
        setError(
          "Aucun fichier n’a pu être enregistré. Vous pouvez réessayer ou les envoyer plus tard."
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de l’upload ou de l’analyse des photos.";
      setError(message);
    } finally {
      setIsUploadingPhotos(false);
      setIsAnalyzing(false);
    }
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next: FormState = { ...prev, [key]: value };

      // Garder housingType cohérent avec le logement de départ
      if (key === "originHousingType") {
        const housing = value as HousingType;
        next.housingType = housing;
        const suggestedSurface = HOUSING_SURFACE_DEFAULTS[housing];
        // Si on était encore sur la valeur par défaut précédente, on met à jour
        if (!prev.surfaceM2 || prev.surfaceM2 === HOUSING_SURFACE_DEFAULTS[prev.housingType]) {
          next.surfaceM2 = suggestedSurface;
        }
      }

      return next;
    });
  };

  // Assurer des coordonnées même si l'utilisateur n'a pas cliqué sur une suggestion
  // (par ex. CP/ville pré-remplis ou saisis manuellement).
  useEffect(() => {
    if (form.originLat != null && form.originLon != null) return;
    if (!form.originPostalCode || !form.originCity) return;

    const controller = new AbortController();

    const run = async () => {
      try {
        const q = `${form.originPostalCode} ${form.originCity}`;
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
          q
        )}&limit=1`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as {
          features?: { geometry?: { coordinates?: [number, number] } }[];
        };
        const coords = data.features?.[0]?.geometry?.coordinates;
        if (!coords) return;
        const [lon, lat] = coords;
        if (typeof lat === "number" && typeof lon === "number") {
          updateField("originLat", lat);
          updateField("originLon", lon);
        }
      } catch {
        // ignore erreurs réseau / abort
      }
    };

    void run();

    return () => controller.abort();
  }, [form.originPostalCode, form.originCity, form.originLat, form.originLon]);

  useEffect(() => {
    if (form.destinationLat != null && form.destinationLon != null) return;
    if (!form.destinationPostalCode || !form.destinationCity) return;
    if (isDestinationForeign) return; // pour l'étranger, on compte sur Nominatim

    const controller = new AbortController();

    const run = async () => {
      try {
        const q = `${form.destinationPostalCode} ${form.destinationCity}`;
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
          q
        )}&limit=1`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as {
          features?: { geometry?: { coordinates?: [number, number] } }[];
        };
        const coords = data.features?.[0]?.geometry?.coordinates;
        if (!coords) return;
        const [lon, lat] = coords;
        if (typeof lat === "number" && typeof lon === "number") {
          updateField("destinationLat", lat);
          updateField("destinationLon", lon);
        }
      } catch {
        // ignore erreurs réseau / abort
      }
    };

    void run();

    return () => controller.abort();
  }, [
    form.destinationPostalCode,
    form.destinationCity,
    form.destinationLat,
    form.destinationLon,
    isDestinationForeign,
  ]);

  const addLocalFiles = (files: FileList | File[]) => {
    const array = Array.from(files);
    if (array.length === 0) return;
    setLocalUploadFiles((prev) => {
      const existingKeys = new Set(
        prev.map((f) => `${f.file.name}-${f.file.size}-${f.file.type}`)
      );
      const next: LocalUploadFile[] = [...prev];
      for (const file of array) {
        const key = `${file.name}-${file.size}-${file.type}`;
        if (existingKeys.has(key)) continue;
        next.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          file,
          status: "pending",
          previewUrl: URL.createObjectURL(file),
        });
      }
      return next;
    });
  };

  const resetUploads = () => {
    setLocalUploadFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      return [];
    });
    setIsUploadingPhotos(false);
    setIsAnalyzing(false);
    setAnalysisProcesses(null);
    setProcess2Inventory(null);
    setAnalysisStartedAt(null);
    setAnalysisElapsedMs(0);
  };

  const isOriginComplete =
    !!form.originPostalCode &&
    !!form.originCity &&
    !!form.originHousingType &&
    !!form.originCarryDistance;

  const isDestinationComplete =
    !!form.destinationPostalCode &&
    !!form.destinationCity &&
    !!form.destinationHousingType &&
    !!form.destinationCarryDistance;

  const originSummary = [
    [form.originPostalCode, form.originCity].filter(Boolean).join(" "),
    HOUSING_LABELS[form.originHousingType],
  ]
    .filter(Boolean)
    .join(" · ");

  const destinationSummary = [
    [form.destinationPostalCode, form.destinationCity].filter(Boolean).join(" "),
    HOUSING_LABELS[form.destinationHousingType],
  ]
    .filter(Boolean)
    .join(" · ");

  const handleSubmitStep1 = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedFirstName = form.firstName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedFirstName) {
      setError("Merci de renseigner un prénom ou surnom.");
      return;
    }
    if (
      !trimmedEmail ||
      !trimmedEmail.includes("@") ||
      !trimmedEmail.includes(".")
    ) {
      setError("Merci de renseigner une adresse email valide.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        primaryChannel: "web" as const,
        firstName: trimmedFirstName,
        lastName: form.lastName.trim() || null,
        email: trimmedEmail,
        phone: form.phone.trim() || null,
        source: src ?? null,
      };

      const { id } = await createLead(payload);
      setLeadId(id);
      goToStep(2);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors de la création de votre demande.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chronomètre affiché (≈ 3 s / photo) pour l'analyse Process 2
  useEffect(() => {
    if (!analysisStartedAt) return;
    if (analysisTargetSeconds == null) return;
    if (!isUploadingPhotos && !isAnalyzing) return;
    if (typeof window === "undefined") return;

    const start = analysisStartedAt;
    const id = window.setInterval(() => {
      const elapsedSec = (Date.now() - start) / 1000;
      const cappedMs = Math.min(elapsedSec, analysisTargetSeconds) * 1000;
      setAnalysisElapsedMs(cappedMs);
    }, 200);

    return () => {
      window.clearInterval(id);
    };
  }, [analysisStartedAt, analysisTargetSeconds, isUploadingPhotos, isAnalyzing]);

  const handleSubmitStep3 = async (e: FormEvent) => {
    e.preventDefault();
    if (!leadId) return;
    setError(null);

    const surface = Number(form.surfaceM2.replace(",", "."));
    const pricing =
      pricingByFormule && pricingByFormule[form.formule]
        ? pricingByFormule[form.formule]
        : null;

    const extras: string[] = [];
    if (form.serviceMonteMeuble) extras.push("Monte‑meuble à prévoir");
    if (form.servicePiano === "droit") extras.push("Piano droit");
    if (form.servicePiano === "quart") extras.push("Piano quart de queue");
    if (form.serviceDebarras) extras.push("Besoin de débarras");
    if (form.optionPackingMaterials)
      extras.push("Cartons et protections fournis par Moverz");
    if (form.optionDismantlingFull)
      extras.push("Beaucoup de meubles à démonter / remonter");
    if (form.optionStorage) extras.push("Stockage temporaire / garde‑meuble");
    if (form.optionCleaning) extras.push("Nettoyage de fin de déménagement");
    if (form.optionDifficultAccess)
      extras.push("Accès camion très contraint (rue étroite / centre‑ville)");

    const extraText =
      extras.length > 0 ? `Options : ${extras.join(", ")}` : "";

    const updatePayload = {
      formCompletionStatus: "complete" as const,
      originPostalCode: form.originPostalCode || null,
      originCity: form.originCity || null,
      originAddress: form.originAddress || null,
      destinationPostalCode: form.destinationPostalCode || null,
      destinationCity: form.destinationCity || null,
      destinationAddress: form.destinationAddress || null,
      movingDate: form.movingDate || null,
      details:
        [form.notes, extraText].filter((part) => part && part.length > 0).join("\n\n") ||
        null,
      housingType: form.housingType,
      surfaceM2: Number.isFinite(surface) && surface > 0 ? surface : null,
      density: form.density,
      formule: form.formule,
      volumeM3: pricing ? pricing.volumeM3 : null,
      distanceKm: pricing ? pricing.distanceKm : distanceKm,
      priceMin: pricing ? pricing.prixMin : null,
      priceMax: pricing ? pricing.prixMax : null,
    };

    try {
      setIsSubmitting(true);

      const performUpdate = async (id: string) => {
        await updateLead(id, updatePayload);
      };

      try {
        await performUpdate(leadId);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message.toLowerCase() : String(err ?? "");

        // Cas fréquent en prod : l'ID présent dans le localStorage ne correspond plus
        // à la base (redeploy, reset SQLite). On recrée un lead et on rejoue la mise à jour.
        if (msg.includes("leadtunnel introuvable")) {
          try {
            const trimmedFirstName = form.firstName.trim();
            const trimmedEmail = form.email.trim().toLowerCase();

            const createPayload = {
              primaryChannel: "web" as const,
              firstName: trimmedFirstName || "Client",
              lastName: form.lastName.trim() || null,
              email: trimmedEmail || "test@moverz.dev",
              phone: form.phone.trim() || null,
              source: src ?? null,
            };

            const { id: newId } = await createLead(createPayload);
            setLeadId(newId);

            await performUpdate(newId);
          } catch (retryErr) {
            console.error(
              "❌ Erreur lors de la recréation du lead après 404:",
              retryErr
            );
            throw err; // on remonte l'erreur d'origine au handler global
          }
        } else {
          throw err;
        }
      }

      setCurrentStep(4);
      // token sera généré à la demande côté écran final
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors de la validation de votre demande.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* En-tête tunnel – uniquement sur l'étape 1 pour alléger les suivantes */}
      {currentStep === 1 && (
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold leading-snug text-slate-50 sm:text-3xl">
            Demande de devis déménagement
          </h1>
          <p className="max-w-prose text-sm text-slate-300 sm:text-base">
            Un seul dossier complet, plusieurs déménageurs vérifiés vous
            contactent. Plus vous êtes précis, plus les devis seront pertinents.
          </p>
        </header>
      )}

      {/* Stepper simple, mobile first */}
      <nav
        aria-label="Étapes du tunnel"
        className="rounded-2xl bg-slate-900/60 p-3 shadow-sm ring-1 ring-slate-800"
      >
        {/* Mobile : barre de progression + libellé courant */}
        <div className="space-y-2 sm:hidden">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-slate-300">
              Étape{" "}
              <span className="font-semibold text-slate-50">
                {currentStep}
              </span>{" "}
              sur {STEPS.length}
            </p>
            <p className="truncate text-xs font-semibold text-sky-300">
              {STEPS.find((s) => s.id === currentStep)?.label}
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop : timeline complète */}
        <div className="hidden items-center justify-between gap-4 sm:flex">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isLast = index === STEPS.length - 1;
            const canGoToStep = step.id <= maxReachedStep;

            return (
              <div
                key={step.id}
                className="flex flex-1 items-center gap-3 last:flex-none"
              >
                <button
                  type="button"
                  disabled={!canGoToStep}
                  onClick={canGoToStep ? () => goToStep(step.id as StepId) : undefined}
                  className="flex flex-col items-center gap-1 text-center disabled:cursor-default"
                >
                  <div
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all",
                      isActive
                        ? "border-sky-400 bg-sky-400 text-slate-950 shadow-[0_0_0_4px_rgba(56,189,248,0.25)]"
                        : isCompleted
                        ? "border-emerald-400 bg-emerald-400 text-slate-950"
                        : "border-slate-600/70 bg-slate-900 text-slate-300",
                      canGoToStep && !isActive ? "hover:border-sky-300 hover:text-sky-200" : "",
                    ].join(" ")}
                  >
                    {isCompleted ? "✓" : step.id}
                  </div>
                  <span
                    className={[
                      "text-[11px] font-medium",
                      isActive
                        ? "text-sky-300"
                        : isCompleted
                        ? "text-slate-200"
                        : "text-slate-400",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </button>
                {!isLast && (
                  <div className="h-px flex-1 rounded-full bg-slate-700/70" />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Étape 1 – Contact */}
      {currentStep === 1 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <form className="space-y-5" onSubmit={handleSubmitStep1}>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-100">
                Comment voulez-vous qu’on vous appelle ?
                </label>
              <p className="text-xs text-slate-400">
                Juste pour personnaliser nos échanges, vous pouvez mettre un prénom ou un surnom.
              </p>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="Prénom ou surnom"
                  autoComplete="given-name"
                />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-100">
                Email de contact
              </label>
              <p className="text-xs text-slate-400">
                Usage strictement interne pour vous tenir informé de l’évolution
                de votre dossier et vous envoyer vos devis. Jamais partagé ni
                revendu.
              </p>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="vous@email.fr"
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Création en cours…" : "Commencer ma demande"}
            </button>
          </form>
        </section>
      )}

      {/* Étape 2 – Projet (départ / arrivée sous forme d'accordéons) */}
      {currentStep === 2 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              goToStep(3);
            }}
          >
            {/* Bloc départ : accordéon avec résumé + statut de complétion */}
            <div className="overflow-hidden rounded-2xl bg-slate-950/40 ring-1 ring-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsOriginOpen(true);
                  setIsDestinationOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Départ
                  </p>
                  <p className="mt-1 truncate text-[11px] text-slate-400">
                    {originSummary || "Code postal, ville, type de logement…"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isOriginComplete
                        ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/60"
                        : "bg-slate-800/80 text-slate-200 ring-1 ring-slate-600/80",
                    ].join(" ")}
                  >
                    {isOriginComplete ? "✓ Validé" : "À compléter"}
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900 text-xs text-slate-200">
                    {isOriginOpen ? "−" : "+"}
                  </span>
                </div>
              </button>
              {isOriginOpen && (
                <div className="space-y-3 border-t border-slate-800 bg-slate-950/70 p-3">
                  <AddressAutocomplete
                    label="Adresse de départ"
                    placeholder="10 rue de la Paix, 33000 Bordeaux"
                    helperText="Vous pouvez saisir une adresse complète, une ville ou un code postal."
                    mode="fr"
                    initialValue={
                      form.originAddress ||
                      [form.originPostalCode, form.originCity]
                        .filter(Boolean)
                        .join(" ")
                    }
                    onSelect={(s) => {
                      updateField("originAddress", s.addressLine ?? s.label);
                      updateField("originPostalCode", s.postalCode ?? "");
                      updateField("originCity", s.city ?? "");
                      updateField("originLat", s.lat ?? null);
                      updateField("originLon", s.lon ?? null);
                    }}
                  />
                  <p className="text-[11px] text-slate-500">
                    {form.originPostalCode && form.originCity
                      ? `${form.originPostalCode} ${form.originCity}`
                      : "Code postal et ville seront remplis automatiquement."}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Type de logement
                      </label>
                      <select
                        value={form.originHousingType}
                        onChange={(e) =>
                          updateField(
                            "originHousingType",
                            e.target.value as HousingType
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="studio">Studio</option>
                        <option value="t1">T1</option>
                        <option value="t2">T2</option>
                        <option value="t3">T3</option>
                        <option value="t4">T4</option>
                        <option value="t5">T5</option>
                        <option value="house">Maison plain-pied</option>
                        <option value="house_1floor">Maison +1 étage</option>
                        <option value="house_2floors">Maison +2 étages</option>
                        <option value="house_3floors">
                          Maison 3 étages ou +
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Distance de portage (m)
                      </label>
                      <select
                        value={form.originCarryDistance}
                        onChange={(e) =>
                          updateField(
                            "originCarryDistance",
                            e.target.value as FormState["originCarryDistance"]
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="0-10">0–10 m</option>
                        <option value="10-20">10–20 m</option>
                        <option value="20-30">20–30 m</option>
                        <option value="30-40">30–40 m</option>
                        <option value="40-50">40–50 m</option>
                        <option value="50-60">50–60 m</option>
                        <option value="60-70">60–70 m</option>
                        <option value="70-80">70–80 m</option>
                        <option value="80-90">80–90 m</option>
                        <option value="90-100">90–100 m</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bloc arrivée : accordéon avec résumé + statut de complétion */}
            <div className="overflow-hidden rounded-2xl bg-slate-950/40 ring-1 ring-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDestinationOpen(true);
                  setIsOriginOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Arrivée
                  </p>
                  <p className="mt-1 truncate text-[11px] text-slate-400">
                    {destinationSummary || "Code postal, ville, type de logement…"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isDestinationComplete
                        ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/60"
                        : "bg-slate-800/80 text-slate-200 ring-1 ring-slate-600/80",
                    ].join(" ")}
                  >
                    {isDestinationComplete ? "✓ Validé" : "À compléter"}
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900 text-xs text-slate-200">
                    {isDestinationOpen ? "−" : "+"}
                  </span>
                </div>
              </button>
              {isDestinationOpen && (
                <div className="space-y-3 border-t border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-200">
                      Adresse d’arrivée
                    </p>
                    <label className="flex items-center gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-500"
                        checked={isDestinationForeign}
                        onChange={(e) => setIsDestinationForeign(e.target.checked)}
                      />
                      Adresse à l’étranger
                      </label>
                    </div>

                  <AddressAutocomplete
                    label=""
                    placeholder={
                      isDestinationForeign
                        ? "10 Downing St, London, UK"
                        : "20 avenue des Champs-Élysées, 75008 Paris"
                    }
                    helperText={
                      isDestinationForeign
                        ? "Incluez le pays (ex: Barcelone, Espagne)."
                        : "Vous pouvez saisir une adresse complète, une ville ou un code postal."
                    }
                    mode={isDestinationForeign ? "world" : "fr"}
                    initialValue={
                      form.destinationAddress ||
                      [form.destinationPostalCode, form.destinationCity]
                        .filter(Boolean)
                        .join(" ")
                    }
                    onSelect={(s) => {
                      updateField("destinationAddress", s.addressLine ?? s.label);
                      updateField("destinationPostalCode", s.postalCode ?? "");
                      updateField("destinationCity", s.city ?? "");
                      updateField("destinationLat", s.lat ?? null);
                      updateField("destinationLon", s.lon ?? null);
                    }}
                  />
                  <p className="text-[11px] text-slate-500">
                    {form.destinationPostalCode && form.destinationCity
                      ? `${form.destinationPostalCode} ${form.destinationCity}`
                      : isDestinationForeign
                      ? "Ville, pays et code postal seront remplis automatiquement si possible."
                      : "Code postal et ville seront remplis automatiquement."}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Type de logement
                      </label>
                      <select
                        value={form.destinationHousingType}
                        onChange={(e) =>
                          updateField(
                            "destinationHousingType",
                            e.target.value as HousingType
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="studio">Studio</option>
                        <option value="t1">T1</option>
                        <option value="t2">T2</option>
                        <option value="t3">T3</option>
                        <option value="t4">T4</option>
                        <option value="t5">T5</option>
                        <option value="house">Maison plain-pied</option>
                        <option value="house_1floor">Maison +1 étage</option>
                        <option value="house_2floors">Maison +2 étages</option>
                        <option value="house_3floors">
                          Maison 3 étages ou +
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Distance de portage (m)
                      </label>
                      <select
                        value={form.destinationCarryDistance}
                        onChange={(e) =>
                          updateField(
                            "destinationCarryDistance",
                            e.target.value as FormState["destinationCarryDistance"]
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="0-10">0–10 m</option>
                        <option value="10-20">10–20 m</option>
                        <option value="20-30">20–30 m</option>
                        <option value="30-40">30–40 m</option>
                        <option value="40-50">40–50 m</option>
                        <option value="50-60">50–60 m</option>
                        <option value="60-70">60–70 m</option>
                        <option value="70-80">70–80 m</option>
                        <option value="80-90">80–90 m</option>
                        <option value="90-100">90–100 m</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Distance estimée (information indicative) */}
            {formatDistanceLabel(distanceKm) && (
              <p className="text-[11px] text-slate-400">
                {formatDistanceLabel(distanceKm)}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr),minmax(0,1.1fr)]">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-100">
                  Date souhaitée
                </label>
                <input
                  type="date"
                  value={form.movingDate}
                  onChange={(e) => updateField("movingDate", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-100">
                  Fin de période (optionnel)
                </label>
                <input
                  type="date"
                  value={form.movingDateEnd}
                  onChange={(e) => updateField("movingDateEnd", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.dateFlexible}
                onChange={(e) => updateField("dateFlexible", e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-500/40"
              />
              <span>Je peux être flexible de quelques jours autour de cette date</span>
            </label>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-100">
                Détails utiles (optionnel)
              </label>
              <p className="text-xs text-slate-400">
                Étages, ascenseur, monte‑meuble, volume approximatif… ce qui
                vous semble important.
              </p>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="Ex: T3 au 3e sans ascenseur, monte‑meuble possible côté cour…"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-400"
              >
                Retour
              </button>
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition hover:bg-sky-300"
              >
                Étape suivante
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Étape 3 – Volume & formules */}
      {currentStep === 3 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <form className="space-y-5" onSubmit={handleSubmitStep3}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-50">
              Volume estimé & formules
            </h2>
            </div>

            {/* Bloc estimation volume + formules */}
            <div className="space-y-4 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Estimation rapide
              </p>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr),minmax(0,1.3fr)]">
                {/* Colonne gauche : densité + surface/volume */}
                <div className="space-y-4">
                  {/* 1. Densité en premier */}
                    <div className="space-y-1">
                    <p className="block text-xs font-medium text-slate-200">
                      Quantité de meubles et affaires
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Commencez par choisir si votre logement est plutôt
                      minimaliste, standard ou bien rempli.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
                        <button
                          type="button"
                          onClick={() => updateField("density", "light")}
                          className={[
                            "flex w-full flex-col items-center justify-between rounded-2xl border px-4 py-4 text-center text-[11px] transition",
                            form.density === "light"
                              ? "border-emerald-400 bg-emerald-500/8 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                              : "border-slate-700/80 bg-slate-950/60 hover:border-emerald-300/70",
                          ].join(" ")}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-300/60 bg-emerald-500/10">
                            <div className="grid grid-cols-3 gap-[1px]">
                              {[
                                true,
                                false,
                                false,
                                false,
                                true,
                                false,
                                false,
                                false,
                                true,
                              ].map((filled, idx) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <span
                                  key={idx}
                                  className={[
                                    "h-2 w-2 rounded-[2px]",
                                    filled
                                      ? "bg-emerald-300"
                                      : "bg-emerald-900/30",
                                  ].join(" ")}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-semibold text-slate-50">
                              Minimaliste
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Peu de meubles · cartons limités
                            </div>
                          </div>
                          <div className="mt-3 inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                            -10% volume
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateField("density", "normal")}
                          className={[
                            "flex w-full flex-col items-center justify-between rounded-2xl border px-4 py-4 text-center text-[11px] transition",
                            form.density === "normal"
                              ? "border-sky-400 bg-sky-500/8 shadow-[0_0_0_1px_rgba(56,189,248,0.45)]"
                              : "border-slate-700/80 bg-slate-950/60 hover:border-sky-300/70",
                          ].join(" ")}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-300/60 bg-sky-500/10">
                            <div className="grid grid-cols-3 gap-[1px]">
                              {[
                                true,
                                false,
                                true,
                                false,
                                true,
                                false,
                                true,
                                false,
                                true,
                              ].map((filled, idx) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <span
                                  key={idx}
                                  className={[
                                    "h-2 w-2 rounded-[2px]",
                                    filled ? "bg-sky-300" : "bg-sky-900/30",
                                  ].join(" ")}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-semibold text-slate-50">
                              Standard
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Meubles classiques · affaires normales
                            </div>
                          </div>
                          <div className="mt-3 inline-flex items-center rounded-full border border-sky-300/70 bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
                            Volume normal
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateField("density", "dense")}
                          className={[
                            "flex w-full flex-col items-center justify-between rounded-2xl border px-4 py-4 text-center text-[11px] transition",
                            form.density === "dense"
                              ? "border-amber-400 bg-amber-500/8 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]"
                              : "border-slate-700/80 bg-slate-950/60 hover:border-amber-300/70",
                          ].join(" ")}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300/60 bg-amber-500/10">
                            <div className="grid grid-cols-3 gap-[1px]">
                              {[
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                              ].map((filled, idx) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <span
                                  key={idx}
                                  className={[
                                    "h-2 w-2 rounded-[2px]",
                                    filled ? "bg-amber-300" : "bg-amber-900/30",
                                  ].join(" ")}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-semibold text-slate-50">
                              Bien rempli
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Beaucoup de meubles · déco · intérieur chargé
                            </div>
                          </div>
                          <div className="mt-3 inline-flex items-center rounded-full border border-amber-300/70 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                            +10% volume
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Surface ensuite + volume estimé + rappel type logement */}
                  <div className="space-y-2">
                    <div className="space-y-1 text-xs text-slate-300">
                      <p className="font-medium text-slate-200">
                        Type de logement (départ)
                      </p>
                      <p className="text-[11px]">
                        {HOUSING_LABELS[form.originHousingType]} —{" "}
                        {HOUSING_SURFACE_DEFAULTS[form.originHousingType]} m²
                        estimés.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-200">
                          Surface approximative (m²)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={300}
                          value={form.surfaceM2}
                          onChange={(e) => updateField("surfaceM2", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="block text-xs font-medium text-slate-200">
                          Volume estimé
                        </p>
                        <p className="mt-1 inline-flex min-h-[32px] items-center rounded-xl bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-50">
                          {estimatedVolumeM3 != null
                            ? `${estimatedVolumeM3.toLocaleString("fr-FR", {
                                maximumFractionDigits: 1,
                              })} m³`
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Calculé automatiquement à partir de la surface et de la
                      quantité de meubles.
                    </p>
                  </div>
                </div>

              {/* Choix niveau de confort (swipe horizontal sur mobile) */}
              <div
                ref={comfortScrollRef}
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible"
              >
                {COMFORT_FORMULAS.map(
                  (formule) => {
                    const isActive = form.formule === formule;
                    const pricing =
                      pricingByFormule && pricingByFormule[formule]
                        ? pricingByFormule[formule]
                        : null;
                    const title =
                      formule === "ECONOMIQUE"
                        ? "Je privilégie le budget"
                        : formule === "STANDARD"
                        ? "Équilibre budget / confort"
                        : "Je veux être 100 % tranquille";
                    const label =
                      formule === "ECONOMIQUE"
                        ? "ÉCO"
                        : formule === "STANDARD"
                        ? "STANDARD"
                        : "PREMIUM";
                    const bullets =
                      formule === "ECONOMIQUE"
                        ? [
                            "Vous emballez vos cartons",
                            "Nous gérons portage + transport",
                            "Démontage limité (lit principal)",
                          ]
                        : formule === "STANDARD"
                        ? [
                            "Protection du mobilier et portage complet",
                            "Démontage/remontage des meubles principaux",
                            "Bon compromis budget / confort",
                          ]
                        : [
                            "Emballage renforcé (fragiles, penderies…)",
                            "Démontage/remontage étendu, repositionnement",
                            "Planning plus souple et équipe dédiée",
                          ];
                    return (
                      <button
                        key={formule}
                        type="button"
                        onClick={() => updateField("formule", formule)}
                        className={[
                          "flex min-w-[78%] flex-col gap-2 rounded-2xl border p-3 text-left text-xs transition snap-start sm:min-w-0",
                          isActive
                            ? "border-sky-400 bg-sky-500/15 shadow-sm shadow-sky-500/30"
                            : "border-slate-700 bg-slate-950/60 hover:border-slate-500",
                        ].join(" ")}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                          {label}
                        </span>
                        <span className="text-[12px] font-medium text-slate-50">
                          {title}
                        </span>
                        <span className="text-[12px] font-semibold text-slate-100">
                          {pricing
                            ? `${formatPrice(pricing.prixMin)} – ${formatPrice(
                                pricing.prixMax
                              )}`
                            : "Calcul…"}
                        </span>
                        <ul className="mt-1 space-y-1 text-[11px] text-slate-400">
                          {bullets.map((b) => (
                            <li key={b} className="flex gap-1">
                              <span className="mt-[2px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  }
                )}
              </div>

              {activePricing &&
                estimatedVolumeM3 != null &&
                Number.isFinite(distanceKm) && (
                  <div className="mt-3 space-y-1 rounded-2xl bg-slate-950/70 p-3 text-[11px] text-slate-300 ring-1 ring-slate-800">
                    <p className="font-semibold text-slate-100">
                      Comment sont estimés les prix ?
                    </p>
                    <p>
                      Le prix de votre déménagement dépend de nombreux critères
                      dont principalement :
                    </p>
                    <ul className="ml-4 list-disc space-y-1">
                      <li>
                        <span className="font-semibold">Volume :</span>{" "}
                        dans votre cas,{" "}
                        {estimatedVolumeM3.toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })}{" "}
                        m³ correspondent à environ{" "}
                        <span className="font-semibold">
                          {volumePriceApprox != null
                            ? formatPrice(volumePriceApprox)
                            : "—"}
                        </span>
                        .
                      </li>
                      <li>
                        <span className="font-semibold">Distance :</span>{" "}
                        {distanceKm < 30
                          ? "dans votre cas, déménagement local, donc pas de sur‑coût significatif lié à la distance."
                          : `dans votre cas, environ ${Math.round(
                              distanceKm
                            )} km à parcourir, ce qui pèse aussi dans le prix.`}
                      </li>
                      <li>
                        <span className="font-semibold">
                          Période de l&apos;année :
                        </span>{" "}
                        {seasonFactor > 1.01
                          ? `dans votre cas, vous risquez une majoration d’environ ${formatPrice(
                              Math.max(
                                0,
                                activePricing.prixFinal -
                                  Math.round(
                                    activePricing.prixFinal / seasonFactor
                                  )
                              )
                            )}.`
                          : seasonFactor < 0.99
                          ? `dans votre cas, vous bénéficiez d’une légère réduction par rapport à la haute saison.`
                          : "dans votre cas, pas de majoration particulière liée à la période."}
                      </li>
                    </ul>
                    <p className="mt-1 text-[10px] text-slate-400">
                      NB : Un m³ supplémentaire vous coûterait dans ces
                      conditions environ{" "}
                      <span className="font-semibold">
                        {Math.round(pricePerM3Seasoned).toLocaleString("fr-FR")}{" "}
                        €
                      </span>
                      .
                    </p>
                  </div>
                )}

              {/* Autres besoins éventuels (tous les services optionnels regroupés) */}
              <div className="mt-4 space-y-2 rounded-2xl bg-slate-950/60 p-3 text-[11px] text-slate-300">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Autres besoins éventuels
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "serviceMonteMeuble",
                        !form.serviceMonteMeuble
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.serviceMonteMeuble
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Monte‑meuble à prévoir
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("serviceDebarras", !form.serviceDebarras)
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.serviceDebarras
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Besoin de débarras
                  </button>
                  {[
                    ["none", "Pas de piano"],
                    ["droit", "Piano droit"],
                    ["quart", "Piano quart de queue"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateField(
                          "servicePiano",
                          value as FormState["servicePiano"]
                        )
                      }
                      className={[
                        "rounded-full border px-3 py-1 text-left",
                        form.servicePiano === value
                          ? "border-sky-400 bg-sky-500/20 text-sky-100"
                          : "border-slate-700 bg-slate-900/60 text-slate-200",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "optionPackingMaterials",
                        !form.optionPackingMaterials
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionPackingMaterials
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Cartons / protections fournis
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "optionDismantlingFull",
                        !form.optionDismantlingFull
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionDismantlingFull
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Beaucoup de meubles à démonter / remonter
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("optionStorage", !form.optionStorage)
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionStorage
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Besoin de stockage temporaire / garde‑meuble
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("optionCleaning", !form.optionCleaning)
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionCleaning
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Nettoyage de fin de déménagement
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "optionDifficultAccess",
                        !form.optionDifficultAccess
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionDifficultAccess
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Accès très contraint (rue étroite, centre‑ville difficile
                    pour le camion)
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-400"
              >
                Modifier
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !leadId}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Validation…" : "Valider ma demande"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Étape 4 – Photos & inventaire */}
      {currentStep === 4 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <div className="space-y-6">
            {photoFlowChoice !== "photos_now" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-50">
                  Pourquoi ajouter des photos ?
                </h2>
                {/* Schéma visuel simple : photos → IA → inventaire + déclaration */}
                <div className="space-y-1 rounded-2xl bg-slate-950/80 p-3 ring-1 ring-slate-800/70">
                <p className="text-[11px] font-medium text-slate-300">
                  Ce qui se passe derrière en 2 minutes :
                </p>
                <div className="flex flex-col items-stretch gap-2 text-[11px] text-slate-100 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-[12px]">
                      📷
                    </div>
                    <span className="font-medium">Vos photos du logement</span>
                  </div>
                  <div className="hidden items-center text-slate-500 sm:flex">
                    ➜
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-[12px]">
                      🤖
                    </div>
                    <span className="font-medium">Traitement intelligent Moverz</span>
                  </div>
                  <div className="hidden items-center text-slate-500 sm:flex">
                    ➜
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-[12px]">
                      📋
                    </div>
                    <span className="font-medium">
                      Inventaire détaillé + déclaration de valeur prête
                    </span>
                  </div>
                </div>
                </div>
                <p className="text-xs text-slate-300">
                  En 2 minutes, vos photos nous donnent tout ce qu’il faut :
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/70">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">
                    V
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-50">
                      Volume ultra‑précis
                    </p>
                    <p className="text-slate-400">
                      Estimation calibrée, moins de suppléments et de mauvaises
                      surprises.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/70">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-semibold text-sky-300">
                    i
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-50">
                      Inventaire automatique
                    </p>
                    <p className="text-slate-400">
                      Plus besoin de tout lister pièce par pièce, on le fait pour
                      vous et le déménageur.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/70">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-semibold text-amber-300">
                    €
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-50">
                      Déclaration de valeur prête
                    </p>
                    <p className="text-slate-400">
                      Document obligatoire pour être bien couvert en cas de casse,
                      pré‑rempli pour vous.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-slate-800/70">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/15 text-[11px] font-semibold text-fuchsia-300">
                    ⚡
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-50">
                      Zéro stress, moins d’échanges
                    </p>
                    <p className="text-slate-400">
                      Le déménageur comprend tout de suite votre logement, sans
                      visite ni appels.
                    </p>
                  </div>
                </div>
                </div>
                <p className="text-[11px] font-medium text-emerald-300">
                  → 4 photos par pièce suffisent (vue générale + deux angles +
                  détails si besoin).
                </p>
              </div>
            )}

            {/* Choix initial du mode de complétion */}
            {photoFlowChoice === "none" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPhotoFlowChoice("photos_now")}
                  className="w-full rounded-2xl bg-sky-500/90 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/40 transition hover:bg-sky-400"
                >
                  J’ai les photos (ou je peux les prendre maintenant)
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoFlowChoice("whatsapp_later")}
                  className="w-full rounded-2xl border border-sky-400/70 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-sky-100 hover:border-sky-300"
                >
                  Je ne peux pas le faire maintenant, continuer plus tard sur WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleNoInventory}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
                >
                  Je ne souhaite pas d’inventaire détaillé ni de déclaration de valeur
                  (devis approximatifs sans photos)
                </button>
              </div>
            )}

            {/* Mode WhatsApp plus tard : petite confirmation puis déclenchement du lien */}
            {photoFlowChoice === "whatsapp_later" && (
              <div className="space-y-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800">
                <p className="text-sm font-semibold text-slate-50">
                  Continuer plus tard sur WhatsApp
                </p>
                <p className="text-xs text-slate-300">
                  Nous allons préparer une conversation WhatsApp avec votre dossier.
                  Vous pourrez nous envoyer vos photos plus tard, en toute
                  tranquillité.
                </p>
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="text-[11px] text-slate-400">
                  Vous pourrez partager votre numéro directement dans la
                  conversation WhatsApp si vous le souhaitez.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleWhatsappLater}
                    disabled={isSubmitting}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting
                      ? "Ouverture de WhatsApp…"
                      : "Ouvrir WhatsApp et continuer plus tard"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoFlowChoice("none")}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}

            {/* Mode photos maintenant : zone d'upload + analyse */}
            {photoFlowChoice === "photos_now" && (
              <>
                {/* Zone d'upload */}
                <div className="space-y-3">
                  <div
                    className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-600/80 bg-slate-950/70 px-4 py-8 text-center transition hover:border-sky-400/70 hover:bg-slate-900/80"
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer?.files?.length) {
                        addLocalFiles(e.dataTransfer.files);
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.heic,.heif"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          addLocalFiles(e.target.files);
                        }
                      }}
                    />
                    <p className="text-sm font-medium text-slate-100">
                      Glissez vos photos ici ou cliquez pour sélectionner des fichiers.
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Formats acceptés : JPG, JPEG, PNG, WEBP, HEIC, HEIF.
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Idéal : 4 photos par pièce (vue générale, deux angles, détails).
                    </p>
                  </div>

                  {localUploadFiles.length > 0 && (
                    <div className="space-y-2 rounded-2xl bg-slate-950/70 p-3 text-xs text-slate-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Photos sélectionnées
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {localUploadFiles.map((item) => {
                          const isImage = item.file.type.startsWith("image/");
                          const borderClass =
                            item.status === "uploaded"
                              ? "border-emerald-400"
                              : item.status === "uploading"
                              ? "border-sky-400"
                              : item.status === "error"
                              ? "border-rose-400"
                              : "border-slate-600";

                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`relative h-14 w-14 overflow-hidden rounded-xl border ${borderClass} bg-slate-900`}
                              onClick={() =>
                                setLocalUploadFiles((prev) =>
                                  prev.filter((f) => f.id !== item.id)
                                )
                              }
                              disabled={item.status === "uploading"}
                              title="Retirer cette photo"
                            >
                              {isImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.previewUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-200">FILE</span>
                              )}
                              <span className="absolute right-0 top-0 rounded-bl-md bg-slate-900/80 px-1 text-[9px] text-slate-100">
                                ×
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={handleAnalyzePhotos}
                          disabled={
                            !leadId ||
                            isUploadingPhotos ||
                            isAnalyzing ||
                            localUploadFiles.every((f) => f.status !== "pending")
                          }
                          className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/40 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUploadingPhotos || isAnalyzing
                            ? "Analyse en cours…"
                            : "Analyser mes photos"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {photoFlowChoice === "photos_now" &&
              (analysisProcesses || isUploadingPhotos || isAnalyzing) && (
                <div className="space-y-3 rounded-2xl bg-slate-950/80 p-3 text-xs text-slate-200 ring-1 ring-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Aperçu de votre inventaire par pièce
                </p>
                {analysisStartedAt && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400">
                      Temps d’analyse (≈ 3 s / photo){" "}
                      {isUploadingPhotos || isAnalyzing ? "en cours" : "total"} :{" "}
                      {(analysisElapsedMs / 1000).toFixed(1)} s
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            analysisTargetSeconds && analysisTargetSeconds > 0
                              ? (analysisElapsedMs / 1000 / analysisTargetSeconds) *
                                  100
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {analysisProcesses && (
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr),minmax(0,1.1fr)]">
                  {/* Colonne gauche : cartes Process 2 avec vignettes par pièce */}
                  <div className="space-y-3">
                    {analysisProcesses.map((proc) => (
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
                          </div>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                            {proc.rooms.reduce(
                              (sum, room) =>
                                sum +
                                room.items.reduce(
                                  (acc, it) => acc + it.quantity,
                                  0
                                ),
                              0
                            )}{" "}
                            éléments
                          </span>
                        </div>
                        <div className="space-y-2">
                          {proc.rooms.map((room) => (
                            <div
                              key={room.roomId}
                              className="space-y-1 rounded-xl bg-slate-900/70 p-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold text-slate-50">
                                  {room.label}
                                </p>
                                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                                  {room.items.reduce(
                                    (acc, it) => acc + it.quantity,
                                    0
                                  )}{" "}
                                  éléments
                                </span>
                              </div>
                              {/* Pour le Process 2, on affiche un mini strip de vignettes par pièce */}
                              {proc.id === "process2" && room.photoIds.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {room.photoIds.slice(0, 6).map((pid) => {
                                    const file = localUploadFiles.find(
                                      (f) => f.photoId === pid
                                    );
                                    if (file) {
                                      return (
                                        <div
                                          key={pid}
                                          className="h-8 w-8 overflow-hidden rounded-md border border-slate-700/80 bg-slate-800"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={file.previewUrl}
                                            alt={file.file.name}
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      );
                                    }
                                    return (
                                      <div
                                        key={pid}
                                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80 bg-slate-800 text-[9px] text-slate-300"
                                      >
                                        ?
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Colonne droite : tableau synthétique Pièce / Article / Qté */}
                  {process2Inventory && process2Inventory.length > 0 && (
                    <div className="space-y-2 rounded-2xl bg-slate-950/90 p-3 ring-1 ring-slate-800/80">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Détail des objets détectés
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
                </div>
              )}
            </div>
          )}

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}

            {/* Les actions finales se font désormais via les 3 boutons du haut.
                On retire les anciens boutons "Analyser mes photos" / "Je les enverrai plus tard". */}
          </div>
        </section>
      )}
    </div>
  );
}

export default function DevisGratuitsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-slate-300">Chargement…</div>}>
      <DevisGratuitsPageInner />
    </Suspense>
  );
}

