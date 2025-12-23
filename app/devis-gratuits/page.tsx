'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CameraCapture } from "../components/CameraCapture";
import { useRouter, useSearchParams } from "next/navigation";
import { ga4Event } from "@/lib/analytics/ga4";
import {
  createLead,
  updateLead,
  uploadLeadPhotos,
  createBackofficeLead,
  updateBackofficeLead,
  requestBackofficeConfirmation,
  uploadBackofficePhotos,
  saveBackofficeInventory,
  sendBackofficePhotoReminder,
  trackTunnelEvent,
  type LeadTunnelCreatePayload,
  type SaveBackofficeInventoryPayload,
} from "@/lib/api/client";
import {
  calculatePricing,
  calculateVolume,
  type DensityType,
  type FormuleType,
  type HousingType,
} from "@/lib/pricing/calculate";
import {
  COEF_DISTANCE,
  COEF_VOLUME,
  FORMULE_MULTIPLIERS,
  PRIX_MIN_SOCLE,
} from "@/lib/pricing/constants";
import {
  enrichItemsWithBusinessRules,
  applyPackagingRules,
  type RoomLike,
  type ItemLike,
} from "@/lib/inventory/businessRules";
import { MOVERZ_WHATSAPP_NUMBER } from "@/lib/config/whatsapp";

const STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Projet" },
  { id: 3, label: "Formules" },
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

function stepIdToLogicalStep(step: StepId): "CONTACT" | "PROJECT" | "RECAP" | "PHOTOS" {
  switch (step) {
    case 1:
      return "CONTACT";
    case 2:
      return "PROJECT";
    case 3:
      return "RECAP";
    case 4:
    default:
      return "PHOTOS";
  }
}

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
  originHousingType: HousingType | "";
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
    | ""
    | "0-10"
    | "10-20"
    | "20-30"
    | "30-40"
    | "40-50"
    | "50-60"
    | "60-70"
    | "70-80"
    | "80-90"
    | "90-100"
    | "OUI";
  originParkingAuth: boolean;
  destinationHousingType: HousingType | "";
  destinationFloor: string;
  destinationElevator: string;
  destinationFurnitureLift: "unknown" | "no" | "yes";
  destinationCarryDistance:
    | ""
    | "0-10"
    | "10-20"
    | "20-30"
    | "30-40"
    | "40-50"
    | "50-60"
    | "60-70"
    | "70-80"
    | "80-90"
    | "90-100"
    | "OUI";
  destinationParkingAuth: boolean;
  destinationUnknown: boolean;
  density: DensityType;
  formule: FormuleType;
  serviceMonteMeuble: boolean;
  servicePiano: "none" | "droit" | "quart";
  serviceDebarras: boolean;
  optionStorage: boolean;
  optionCleaning: boolean;
  optionDismantlingFull: boolean;
  optionDifficultAccess: boolean;
  // Accès détaillés
  accessNoElevator: boolean; // Escaliers sans ascenseur
  accessSmallElevator: boolean; // Petit ascenseur / passages serrés
  accessTruckDifficult: boolean; // Accès camion difficile
  // Services additionnels (étape 3)
  servicePackingFull: boolean; // Emballage complet
  serviceMountNewFurniture: boolean; // Montage meubles neufs
  serviceInsuranceExtra: boolean; // Assurance renforcée
  serviceWasteRemoval: boolean; // Évacuation déchets
  serviceHelpNoTruck: boolean; // Aide sans camion
  serviceSpecialHours: boolean; // Horaires spécifiques
  // Mobilier spécifique détaillé
  furnitureAmericanFridge: boolean; // Frigo US lourd
  furnitureSafe: boolean; // Coffre-fort / armoire forte
  furnitureBilliard: boolean; // Billard
  furnitureAquarium: boolean; // Aquarium / vitrine
  furnitureOver25kg: boolean; // Objet(s) > 25 kg
  furnitureVeryFragile: boolean; // Objets très fragiles
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
  id: string;
  roomType: string;
  roomLabel: string;
  itemLabel: string;
  category?: string;
  source?: "ai" | "manual" | "carton";
  quantity: number;
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  // volume emballé utilisé pour les calculs (cartons, protections…)
  volumeM3?: number | null;
  // volume nu (meuble sans emballage), purement informatif
  volumeNuM3?: number | null;
  valueEstimateEur?: number | null;
  valueJustification?: string | null;
  fragile?: boolean;
  packagingFactor?: number | null;
  packagingReason?: string | null;
  dependencies?: {
    id: string;
    label: string;
    quantity: number;
    volumeNuM3?: number | null;
    volumeM3?: number | null;
  }[];
}

interface RoomPhotosForBackoffice {
  roomLabel: string;
  roomType?: string;
  photoUrls: string[];
}

function getInventoryItemIcon(row: Process2InventoryRow): string {
  const category = (row.category ?? "").toUpperCase();
  const label = row.itemLabel.toLowerCase();

  if (category === "LIT" || label.includes("lit")) return "🛏️";
  if (
    category === "CANAPE" ||
    label.includes("canapé") ||
    label.includes("canape") ||
    label.includes("fauteuil")
  )
    return "🛋️";
  if (category === "TABLE" || label.includes("table")) return "🍽️";
  if (category === "CHAISE" || label.includes("chaise") || label.includes("tabouret"))
    return "🪑";
  if (
    category === "ARMOIRE" ||
    category === "RANGEMENT" ||
    label.includes("armoire") ||
    label.includes("commode")
  )
    return "🗄️";
  if (category === "BIBLIOTHEQUE" || label.includes("bibliothèque") || label.includes("bibliotheque"))
    return "📚";
  if (category === "TV" || label.includes("tv") || label.includes("télé") || label.includes("tele"))
    return "📺";
  if (
    category === "ELECTROMENAGER" ||
    label.includes("frigo") ||
    label.includes("lave-vaisselle") ||
    label.includes("lave vaisselle") ||
    label.includes("four")
  )
    return "🧊";
  if (category === "CARTON" || label.includes("carton")) return "📦";
  if (label.includes("lampe") || label.includes("lustre") || label.includes("lumière"))
    return "💡";
  if (label.includes("plante")) return "🪴";
  return "📌";
}

interface LabProcess2Response {
  model: string;
  rooms: AnalyzedRoom[];
  totalMs?: number;
  classifyMs?: number;
  inventoryMs?: number;
}

const KNOWN_ITEMS: { label: string; volumeM3?: number }[] = [
  { label: "Canapé 2 places", volumeM3: 2 },
  { label: "Canapé 3 places", volumeM3: 2.5 },
  { label: "Canapé d’angle", volumeM3: 3 },
  { label: "Fauteuil", volumeM3: 0.8 },
  { label: "Table basse", volumeM3: 0.5 },
  { label: "Table à manger 4 personnes", volumeM3: 1.2 },
  { label: "Table à manger 6 personnes", volumeM3: 1.5 },
  { label: "Chaise", volumeM3: 0.15 },
  { label: "Lit simple complet", volumeM3: 1 },
  { label: "Lit double complet 140", volumeM3: 1.5 },
  { label: "Lit double complet 160", volumeM3: 1.8 },
  { label: "Lit double complet 180", volumeM3: 2 },
  { label: "Armoire 2 portes", volumeM3: 1.5 },
  { label: "Armoire 3 portes", volumeM3: 2 },
  { label: "Commode 3 tiroirs", volumeM3: 0.5 },
  { label: "Bibliothèque", volumeM3: 1 },
  { label: "Meuble TV", volumeM3: 0.8 },
  { label: "Téléviseur", volumeM3: 0.1 },
];

function compactModelName(model?: string): string {
  if (!model) return "modèle IA";
  if (model.startsWith("claude-3-5-haiku")) return "Claude 3.5 Haiku";
  if (model.startsWith("claude-3-5-sonnet")) return "Claude 3.5 Sonnet";
  return model;
}

const INITIAL_FORM_STATE: FormState = {
  // Contact - vide par défaut (obligatoire à remplir par l'utilisateur)
  firstName: "",
  lastName: "",
  email: "",
  phone: "",

  // Adresse origine - vide par défaut (obligatoire)
  originPostalCode: "",
  originCity: "",
  originAddress: "",
  originLat: null,
  originLon: null,
  originHousingType: "", // L'utilisateur doit choisir

  // Adresse destination - vide par défaut (obligatoire)
  destinationPostalCode: "",
  destinationCity: "",
  destinationAddress: "",
  destinationLat: null,
  destinationLon: null,

  // Date - vide par défaut (obligatoire à sélectionner)
  movingDate: "", // Vide = l'utilisateur doit choisir
  movingDateEnd: "",
  dateFlexible: false, // Par défaut non flexible (l'utilisateur doit cocher si oui)

  // Logement - valeurs par défaut raisonnables
  housingType: "t2",
  surfaceM2: "", // Vide = calculé selon housingType ou saisi par l'utilisateur
  originFloor: "0", // RDC par défaut
  originElevator: "none", // Pas d'ascenseur par défaut
  originFurnitureLift: "unknown",
  originCarryDistance: "",
  originParkingAuth: false,

  destinationHousingType: "",
  destinationFloor: "0",
  destinationElevator: "none",
  destinationFurnitureLift: "unknown",
  destinationCarryDistance: "",
  destinationParkingAuth: false,
  destinationUnknown: false,

  // Estimation - valeurs par défaut
  density: "normal", // Standard par défaut
  formule: "STANDARD", // Formule standard par défaut

  // Options - toutes désactivées par défaut
  serviceMonteMeuble: false,
  servicePiano: "none",
  serviceDebarras: false,
  optionStorage: false,
  optionCleaning: false,
  optionDismantlingFull: false,
  optionDifficultAccess: false,
  accessNoElevator: false,
  accessSmallElevator: false,
  accessTruckDifficult: false,

  // Services additionnels (étape 3)
  servicePackingFull: false,
  serviceMountNewFurniture: false,
  serviceInsuranceExtra: false,
  serviceWasteRemoval: false,
  serviceHelpNoTruck: false,
  serviceSpecialHours: false,

  // Mobilier spécifique détaillé
  furnitureAmericanFridge: false,
  furnitureSafe: false,
  furnitureBilliard: false,
  furnitureAquarium: false,
  furnitureOver25kg: false,
  furnitureVeryFragile: false,

  // Notes - vide
  notes: "",
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

function getUrgencyFactor(dateStr: string | null | undefined): number {
  if (!dateStr) return 1;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 1;

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Déménagement déjà passé ou très lointain : pas de surcoût d'urgence
  if (diffDays <= 0 || diffDays > 365) return 1;

  // +15 % si départ dans moins de 30 jours
  if (diffDays <= 30) return 1.15;

  return 1;
}

function formatHousingCard(
  type: HousingType | "",
  floor: string | undefined
): { icon: string; title: string; subtitle: string } {
  const effectiveType: HousingType = (type || "t2") as HousingType;
  const baseLabel = HOUSING_LABELS[effectiveType];

  const nFloor = Number.parseInt(floor || "", 10);
  const floorLabel =
    Number.isFinite(nFloor) && nFloor > 0 ? `${nFloor}e étage` : "Étage à préciser";

  if (effectiveType.startsWith("house")) {
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
  placeId?: string;
};

interface AddressAutocompleteProps {
  label: string;
  placeholder: string;
  helperText?: string;
  mode: "fr" | "world";
  initialValue?: string;
  onSelect: (value: AddressSuggestion) => void;
  status?: "valid" | "invalid";
  showStatus?: boolean;
}

function AddressAutocomplete({
  label,
  placeholder,
  helperText,
  mode,
  initialValue,
  onSelect,
  status,
  showStatus,
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

  const fetchSuggestionsFr = async (
    query: string,
    signal?: AbortSignal
  ): Promise<AddressSuggestion[]> => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    // Si une clé Google Places est configurée, on passe par Google.
    if (apiKey) {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&types=geocode&language=fr&components=country:fr&key=${apiKey}`;

      const res = await fetch(url, { signal });
      if (!res.ok) return [];

      const data = (await res.json()) as {
        predictions?: {
          description: string;
          place_id: string;
        }[];
      };

      const predictions = data.predictions ?? [];
      return predictions.map((p) => ({
        label: p.description,
        addressLine: p.description,
        countryCode: "fr",
        placeId: p.place_id,
      }));
    }

    // Fallback: BAN si pas de clé Google.
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
      query
    )}&limit=5`;
    const res = await fetch(url, { signal });
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

  const fetchSuggestionsWorld = async (
    query: string,
    signal?: AbortSignal
  ): Promise<AddressSuggestion[]> => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&addressdetails=1&limit=5`;
    const res = await fetch(url, {
      headers: {
        // Nominatim conseille de mettre un User-Agent ou un email, mais côté browser on est limité.
      },
      signal,
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
          ? await fetchSuggestionsFr(trimmed, ctrl.signal)
          : await fetchSuggestionsWorld(trimmed, ctrl.signal);
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

  const handleSelect = async (s: AddressSuggestion) => {
    setInput(s.label);
    setShowDropdown(false);
    setResults([]);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    if (apiKey && s.placeId) {
      try {
        setIsLoading(true);
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
          s.placeId
        )}&fields=address_component,geometry,formatted_address&language=fr&key=${apiKey}`;

        const res = await fetch(detailsUrl);
        if (res.ok) {
          const data = (await res.json()) as {
            result?: {
              formatted_address?: string;
              geometry?: { location?: { lat: number; lng: number } };
              address_components?: {
                long_name: string;
                short_name: string;
                types: string[];
              }[];
            };
          };

          const result = data.result;
          if (result) {
            let city: string | undefined;
            let postalCode: string | undefined;

            for (const comp of result.address_components ?? []) {
              if (comp.types.includes("postal_code")) {
                postalCode = comp.long_name;
              }
              if (
                comp.types.includes("locality") ||
                comp.types.includes("postal_town")
              ) {
                city = comp.long_name;
              }
            }

            const location = result.geometry?.location;

            const enhanced: AddressSuggestion = {
              ...s,
              label: result.formatted_address ?? s.label,
              addressLine: result.formatted_address ?? s.addressLine,
              city: city ?? s.city,
              postalCode: postalCode ?? s.postalCode,
              lat: location?.lat ?? s.lat,
              lon: location?.lng ?? s.lon,
            };

            setIsLoading(false);
            onSelect(enhanced);
            return;
          }
        }
      } catch {
        // en cas d'erreur Google, on retombe sur la version de base
      } finally {
        setIsLoading(false);
      }
    }

    onSelect(s);
  };

  return (
    <div className="relative space-y-1">
      <label className="block text-xs font-medium text-slate-700">{label}</label>
      {helperText && (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      )}
      <div className="relative mt-1">
        <input
          type="text"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 pr-8 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25"
          placeholder={placeholder}
          autoComplete="off"
        />
        {showStatus && status && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            {status === "valid" ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                ✓
              </span>
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                ✕
              </span>
            )}
          </span>
        )}
      </div>
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

  const originHousing = formatHousingCard(
    form.originHousingType,
    form.originHousingType.startsWith("house") ? "0" : form.originFloor
  );
  const destinationHousing = formatHousingCard(
    form.destinationHousingType,
    form.destinationHousingType.startsWith("house") ? "0" : form.destinationFloor
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

          <div className="relative h-1 flex-1 rounded-full bg-surface-3/80">
            {/* Camion qui part quand la date principale est atteinte */}
            <div
              className={[
                "truck-on-line absolute -top-3 left-0 flex h-7 w-9 items-center justify-center rounded-lg bg-brand-spark text-xs font-semibold text-brand-navy shadow-md shadow-brand",
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
  const source =
    searchParams.get("source") ??
    searchParams.get("src") ??
    searchParams.get("utm_source") ??
    undefined;
  const from = searchParams.get("from") ?? undefined;
  const citySlug =
    searchParams.get("city_slug") ??
    searchParams.get("citySlug") ??
    undefined;

  const getStepMeta = (step: StepId) => {
    const stepLabel = STEPS.find((s) => s.id === step)?.label ?? String(step);
    return { step_index: step, step_name: stepLabel };
  };

  const gaBaseParams = useMemo(
    () => ({
      source,
      from,
      city_slug: citySlug,
    }),
    [source, from, citySlug]
  );

  // Pré-chauffer l'API d'adresses dès l'arrivée sur le tunnel pour éviter
  // que la toute première requête d'autocomplétion prenne 5-10s.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }, 3000);

    (async () => {
      try {
        await fetch(
          "https://api-adresse.data.gouv.fr/search/?q=75001&limit=1",
          { signal: controller.signal }
        );
      } catch {
        // On ignore complètement les erreurs : c'est un pré-chauffage best-effort.
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM_STATE,
    formule: "STANDARD",
  });
  const [leadId, setLeadId] = useState<string | null>(null);
  const [backofficeLeadId, setBackofficeLeadId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedSubmitStep1, setHasTriedSubmitStep1] = useState(false);
  const [hasTriedSubmitStep2, setHasTriedSubmitStep2] = useState(false);
  const [hasTriedSubmitStep3, setHasTriedSubmitStep3] = useState(false);
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [originAddressTouched, setOriginAddressTouched] = useState(false);
  const [originHousingTouched, setOriginHousingTouched] = useState(false);
  const [originDistanceTouched, setOriginDistanceTouched] = useState(false);
  const [destinationAddressTouched, setDestinationAddressTouched] =
    useState(false);
  const [destinationHousingTouched, setDestinationHousingTouched] =
    useState(false);
  const [destinationDistanceTouched, setDestinationDistanceTouched] =
    useState(false);
  const [surfaceTouched, setSurfaceTouched] = useState(false);
  const [hasCustomAccess, setHasCustomAccess] = useState(false);
  const [hasCustomFurniture, setHasCustomFurniture] = useState(false);
  const [hasExtraServices, setHasExtraServices] = useState(false);
  const [showPricingDetails, setShowPricingDetails] = useState(false);
  const [localUploadFiles, setLocalUploadFiles] = useState<LocalUploadFile[]>([]);
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean | null>(null);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [showUploadOnMobile, setShowUploadOnMobile] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [analysisProcesses, setAnalysisProcesses] = useState<AnalysisProcess[] | null>(
    null
  );
  const [process2Inventory, setProcess2Inventory] = useState<Process2InventoryRow[] | null>(
    null
  );
  const [roomPhotosForBackoffice, setRoomPhotosForBackoffice] = useState<
    RoomPhotosForBackoffice[] | null
  >(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [analysisElapsedMs, setAnalysisElapsedMs] = useState<number>(0);
  const [analysisTargetSeconds, setAnalysisTargetSeconds] = useState<number | null>(
    null
  );
  const [photoFlowChoice, setPhotoFlowChoice] = useState<
    "none" | "web" | "whatsapp"
  >("none");

  // -----------------------
  // GA4 tracking (mandatory)
  // -----------------------
  const hasFiredFormStartRef = useRef(false);
  const lastPhotosCountRef = useRef(0);
  const hasFiredLeadSubmitRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasFiredFormStartRef.current) return;

    const fire = () => {
      if (hasFiredFormStartRef.current) return;
      hasFiredFormStartRef.current = true;
      ga4Event("form_start", {
        ...gaBaseParams,
        ...getStepMeta(currentStep),
      });
    };

    const onPointerDown = () => fire();
    const onKeyDown = () => fire();

    window.addEventListener("pointerdown", onPointerDown, { once: true });
    window.addEventListener("keydown", onKeyDown, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaBaseParams, currentStep]);

  useEffect(() => {
    const photosCount = localUploadFiles.filter((f) => f.status !== "error").length;
    if (photosCount <= 0) return;
    if (photosCount <= lastPhotosCountRef.current) return;
    lastPhotosCountRef.current = photosCount;

    ga4Event("photos_added", {
      ...gaBaseParams,
      ...getStepMeta(currentStep),
      photos_count: photosCount,
    });
  }, [gaBaseParams, currentStep, localUploadFiles]);

  // Pré-remplissage depuis l'URL (liens back-office / relances).
  // Important : ne jamais écraser une saisie utilisateur déjà commencée.
  const prefill = useMemo(() => {
    const getFirst = (...keys: string[]) => {
      for (const k of keys) {
        const v = searchParams.get(k);
        if (v && v.trim()) return v.trim();
      }
      return "";
    };

    return {
      firstName: getFirst(
        "contactName",
        "firstName",
        "name",
        "fullName",
        "contact_name",
        "first_name"
      ),
      email: getFirst("contactEmail", "email", "mail", "contact_email"),
    };
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((!prefill.firstName && !prefill.email) || firstNameTouched || emailTouched) return;

    setForm((prev) => {
      const next = { ...prev };
      if (!prev.firstName?.trim() && prefill.firstName) {
        next.firstName = prefill.firstName;
      }
      if (!prev.email?.trim() && prefill.email) {
        next.email = prefill.email;
      }
      return next;
    });
  }, [prefill.firstName, prefill.email, firstNameTouched, emailTouched]);

  // Détection simple des devices à pointeur "grossier" (mobile / tablette),
  // pour privilégier la caméra intégrée sur mobile tout en gardant un fallback upload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(pointer: coarse)");

    const update = (match: boolean) => {
      setIsCoarsePointer(match);
    };

    update(mql.matches);

    const listener = (event: MediaQueryListEvent) => {
      update(event.matches);
    };

    mql.addEventListener("change", listener);

    return () => {
      mql.removeEventListener("change", listener);
    };
  }, []);

  const [hasPhotosAnswer, setHasPhotosAnswer] = useState<"pending" | "yes" | "no" | null>(null);
  const [showWhatsAppFlow, setShowWhatsAppFlow] = useState(false);
  const [isDestinationForeign, setIsDestinationForeign] = useState(false);
  const [excludedInventoryIds, setExcludedInventoryIds] = useState<string[]>([]);
  const [newItemDrafts, setNewItemDrafts] = useState<
    Record<string, { query: string; quantity: string }>
  >({});
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(
    null
  );
  const [editingInventoryDraft, setEditingInventoryDraft] = useState<{
    itemLabel: string;
    quantity: string;
    volumeM3: string;
    valueEstimateEur: string;
  } | null>(null);
  const [inventoryLayoutVariant, setInventoryLayoutVariant] = useState<
    "list" | "icons"
  >("list");
  const [activeInventoryRoomId, setActiveInventoryRoomId] = useState<string | null>(
    null
  );

  const trimmedFirstName = form.firstName.trim();
  const trimmedEmail = form.email.trim().toLowerCase();
  const isFirstNameValid = trimmedFirstName.length > 0;
  const isEmailValid =
    trimmedEmail.length > 0 &&
    trimmedEmail.includes("@") &&
    trimmedEmail.includes(".");

  const isOriginAddressFieldValid = Boolean(
    form.originPostalCode && form.originCity && form.originAddress
  );
  const isOriginHousingValid = Boolean(form.originHousingType);

  const isDestinationAddressFieldValid = Boolean(
    form.destinationUnknown ||
      (form.destinationPostalCode &&
        form.destinationCity &&
        form.destinationAddress)
  );
  const isDestinationHousingValid = Boolean(
    form.destinationUnknown || form.destinationHousingType
  );

  // On considère désormais la distance de portage comme une info facultative :
  // elle n'entre plus dans la validation "bloquante" de l'étape 2.
  const isOriginAddressValid =
    isOriginAddressFieldValid && isOriginHousingValid;
  const isDestinationAddressValid =
    isDestinationAddressFieldValid && isDestinationHousingValid;
  const isSurfaceValid = (() => {
    const raw = form.surfaceM2 ?? "";
    const n = Number(String(raw).replace(",", "."));
    return n > 0 && Number.isFinite(n);
  })();
  const isMovingDateValid = Boolean(form.movingDate);

  const isDev =
    typeof process !== "undefined" && process.env.NODE_ENV !== "production";

  const inventoryVolume = useMemo(() => {
    if (!process2Inventory || process2Inventory.length === 0) {
      return { total: null as number | null, byRoom: {} as Record<string, number> };
    }

    const byRoom: Record<string, number> = {};
    let total = 0;

    for (const row of process2Inventory) {
      if (excludedInventoryIds.includes(row.id)) continue;
      if (typeof row.volumeM3 !== "number") continue;
      const rowTotal = row.volumeM3 * (row.quantity || 1);
      total += rowTotal;
      const key = row.roomLabel || row.roomType;
      byRoom[key] = (byRoom[key] || 0) + rowTotal;
    }

    if (!Number.isFinite(total) || total <= 0) {
      return { total: null as number | null, byRoom };
    }
    return { total, byRoom };
  }, [process2Inventory, excludedInventoryIds]);

  const inventoryRooms = useMemo(() => {
    if (!process2Inventory || process2Inventory.length === 0) return [];
    const map = new Map<
      string,
      {
        roomKey: string;
        roomLabel: string;
        roomType: string;
      }
    >();
    for (const row of process2Inventory) {
      const key = `${row.roomType}__${row.roomLabel}`;
      if (!map.has(key)) {
        map.set(key, {
          roomKey: key,
          roomLabel: row.roomLabel,
          roomType: row.roomType,
        });
      }
    }
    return Array.from(map.values());
  }, [process2Inventory]);

  useEffect(() => {
    if (!inventoryRooms.length) {
      setActiveInventoryRoomId(null);
      return;
    }
    setActiveInventoryRoomId((prev) => prev ?? inventoryRooms[0]?.roomKey ?? null);
  }, [inventoryRooms]);

  // S'assure qu'un lead existe bien dans le Back Office et retourne son id.
  // Utilisé à la fois à l'étape 1 (création) et plus tard (étape 4) pour éviter
  // les cas où l'utilisateur reprend un tunnel ancien qui n'avait pas encore
  // été synchronisé côté Back Office.
  const ensureBackofficeLeadId = async (
    options?: { forceNew?: boolean }
  ): Promise<string | null> => {
    if (backofficeLeadId && !options?.forceNew) return backofficeLeadId;

    const trimmedFirstName = form.firstName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      // On ne tente pas de créer un lead BO si les infos de base sont manquantes.
      return null;
    }

    try {
      const backofficePayload = {
        firstName: trimmedFirstName,
        email: trimmedEmail,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        source: source ?? undefined,
        estimationMethod: "FORM" as const,
      };
      const { id: boLeadId } = await createBackofficeLead(backofficePayload);
      setBackofficeLeadId(boLeadId);
      console.log("✅ Lead créé/synchronisé dans le Back Office:", boLeadId);
      return boLeadId;
    } catch (boErr) {
      console.warn(
        "Impossible de synchroniser avec le Back Office (ensureBackofficeLeadId):",
        boErr
      );
      return null;
    }
  };

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
    const rawSurface = form.surfaceM2 ?? "";
    const surface = Number(String(rawSurface).replace(",", "."));
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

  const urgencyFactor = useMemo(
    () => getUrgencyFactor(form.movingDate),
    [form.movingDate]
  );

  const combinedSeasonFactor = useMemo(
    () => seasonFactor * urgencyFactor,
    [seasonFactor, urgencyFactor]
  );

  const pricePerM3NoSeason = useMemo(
    () => COEF_VOLUME * FORMULE_MULTIPLIERS[form.formule],
    [form.formule]
  );

  const pricePerM3Seasoned = useMemo(
    () => pricePerM3NoSeason * combinedSeasonFactor,
    [pricePerM3NoSeason, combinedSeasonFactor]
  );

  const pricingByFormule = useMemo(() => {
    const surface = Number(form.surfaceM2.replace(",", "."));
    if (!surface || !Number.isFinite(surface)) return null;

    const isOriginHouse =
      form.originHousingType === "house" ||
      form.originHousingType === "house_1floor" ||
      form.originHousingType === "house_2floors" ||
      form.originHousingType === "house_3floors";
    const isDestinationHouse =
      form.destinationHousingType === "house" ||
      form.destinationHousingType === "house_1floor" ||
      form.destinationHousingType === "house_2floors" ||
      form.destinationHousingType === "house_3floors";

    const baseInput = {
      surfaceM2: surface,
      housingType: form.housingType,
      density: form.density,
      distanceKm,
      seasonFactor: combinedSeasonFactor,
      originFloor: isOriginHouse ? 0 : parseInt(form.originFloor || "0", 10) || 0,
      originElevator:
        form.originElevator === "none"
          ? ("no" as const)
          : form.originElevator === "small"
          ? ("partial" as const)
          : ("yes" as const),
      destinationFloor: isDestinationHouse
        ? 0
        : parseInt(form.destinationFloor || "0", 10) || 0,
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
    combinedSeasonFactor,
    form.serviceMonteMeuble,
    form.servicePiano,
    form.serviceDebarras,
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
        backofficeLeadId?: string | null;
        inventoryExclusions?: string[];
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
      if (parsed.backofficeLeadId) {
        setBackofficeLeadId(parsed.backofficeLeadId);
      }
      if (Array.isArray(parsed.inventoryExclusions)) {
        setExcludedInventoryIds(parsed.inventoryExclusions);
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
      backofficeLeadId,
      inventoryExclusions: excludedInventoryIds,
    });
    window.localStorage.setItem("moverz_tunnel_form_state", payload);
  }, [form, currentStep, leadId, backofficeLeadId, excludedInventoryIds]);

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

  const isLeadNotFoundError = (err: unknown): boolean => {
    const msg =
      err instanceof Error
        ? err.message.toLowerCase()
        : String(err ?? "").toLowerCase();
    return msg.includes("leadtunnel introuvable");
  };

  const handleLeadNotFound = (context: string) => {
    console.warn(
      `LeadTunnel introuvable (${context}). Réinitialisation de l'état local (dev).`
    );
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("moverz_tunnel_form_state");
      } catch (storageErr) {
        console.warn(
          "Impossible de nettoyer moverz_tunnel_form_state dans le localStorage:",
          storageErr
        );
      }
    }
  };

  const deepLinkWhatsapp = useMemo(() => {
    if (!whatsappNumber) return null;
    const message = `Bonjour, je souhaite envoyer des photos pour mon déménagement.`;
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${whatsappNumber}?text=${encoded}`;
  }, [whatsappNumber]);

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
      // Ouvre WhatsApp directement (pas besoin de linking token)
      if (typeof window !== "undefined") {
        const message = `Bonjour, je souhaite envoyer des photos pour mon déménagement.`;
        const encoded = encodeURIComponent(message);
        const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
        window.open(url, "_blank");
      }
      // On marque le tunnel comme continué plus tard
      await updateLead(leadId, { photosStatus: "PENDING" });
      router.push("/devis-gratuits/merci");
    } catch (err: unknown) {
      if (isLeadNotFoundError(err)) {
        handleLeadNotFound("whatsapp_later");
        router.push("/devis-gratuits/merci");
        return;
      }
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
      if (isLeadNotFoundError(err)) {
        handleLeadNotFound("no_inventory");
        router.push("/devis-gratuits/merci");
        return;
      }
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

      let effectiveBackofficeLeadId = backofficeLeadId;
      if (!effectiveBackofficeLeadId) {
        effectiveBackofficeLeadId = await ensureBackofficeLeadId();
      }

      let backofficeUploaded:
        | {
            originalFilename: string;
            url: string;
          }[]
        | null = null;

      if (effectiveBackofficeLeadId) {
        try {
          const uploadRes = await uploadBackofficePhotos(
            effectiveBackofficeLeadId,
            pendingFiles
          );

          backofficeUploaded =
            uploadRes.data?.uploaded
              ?.filter((p) => typeof p.originalFilename === "string" && !!p.url)
              .map((p) => ({
                originalFilename: p.originalFilename,
                url: p.url,
              })) ?? null;
        } catch (err) {
          console.warn(
            "Upload des photos vers le Back Office échoué, les photos restent disponibles côté tunnel uniquement:",
            err
          );
        }
      }

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
          const labRes = await fetch("/api/ai/lab-process2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              photos: result.success.map((p) => ({
                id: p.id,
                storageKey: p.storageKey,
                originalFilename: p.originalFilename,
              })),
            }),
          });

          if (labRes.ok) {
            const labData = (await labRes.json()) as LabProcess2Response;

            // Normalisation minimale pour appliquer les règles métier partagées
            const roomsForRules: RoomLike[] = labData.rooms.map((room) => ({
              roomId: room.roomId,
              roomType: room.roomType,
              roomLabel: room.label,
            }));

            const itemsForRules: ItemLike[] = [];
            labData.rooms.forEach((room) => {
              room.items.forEach((item, idx) => {
                const anyItem = item as any;
                itemsForRules.push({
                  id: `${room.roomId}-${idx}`,
                  roomId: room.roomId,
                  roomLabel: room.label,
                  label: item.label,
                  category: item.category,
                  quantity: item.quantity,
                  confidence: item.confidence,
                  widthCm:
                    typeof anyItem.widthCm === "number"
                      ? anyItem.widthCm
                      : null,
                  depthCm:
                    typeof anyItem.depthCm === "number"
                      ? anyItem.depthCm
                      : null,
                  heightCm:
                    typeof anyItem.heightCm === "number"
                      ? anyItem.heightCm
                      : null,
                  volumeM3Ai:
                    typeof anyItem.volumeM3 === "number"
                      ? anyItem.volumeM3
                      : null,
                  volumeM3Standard: null,
                  volumeM3Final: null,
                  volumeSource: "ai",
                  valueEurTypicalAi:
                    typeof anyItem.valueEstimateEur === "number"
                      ? anyItem.valueEstimateEur
                      : null,
                  valueSource:
                    typeof anyItem.valueEstimateEur === "number"
                      ? "ai"
                      : "none",
                  parentId: null,
                  derivedKind: null,
                });
              });
            });

            // Mapping pièce → photos (URLs Back Office) pour le Back Office
            if (backofficeUploaded && backofficeUploaded.length > 0) {
              const urlByOriginalName = new Map<string, string>();
              backofficeUploaded.forEach((p) => {
                urlByOriginalName.set(p.originalFilename, p.url);
              });

              const photoById = new Map<string, { originalFilename: string }>();
              result.success.forEach((p) => {
                photoById.set(p.id, { originalFilename: p.originalFilename });
              });

              const roomPhotos: RoomPhotosForBackoffice[] = [];

              for (const room of labData.rooms) {
                const urls: string[] = [];

                if (Array.isArray(room.photoIds)) {
                  for (const photoId of room.photoIds) {
                    const meta = photoById.get(photoId);
                    if (!meta) continue;
                    const url = urlByOriginalName.get(meta.originalFilename);
                    if (!url) continue;
                    urls.push(url);
                  }
                }

                const deduped = Array.from(new Set(urls));
                if (deduped.length > 0) {
                  roomPhotos.push({
                    roomLabel: room.label,
                    roomType: room.roomType,
                    photoUrls: deduped,
                  });
                }
              }

              setRoomPhotosForBackoffice(roomPhotos.length > 0 ? roomPhotos : null);
            } else {
              // Pas de mapping fiable vers le Back Office
              setRoomPhotosForBackoffice(null);
            }

            let enrichedItems = enrichItemsWithBusinessRules(
              itemsForRules,
              roomsForRules
            );

            // Volume emballé (carton / protections) appliqué à tous les items
            enrichedItems = applyPackagingRules(enrichedItems);

            // Process unique : rooms depuis lab-process2 (on garde les items IA bruts)
            processes.push({
              id: "process2",
              label: "Analyse IA des photos",
              model: compactModelName(labData.model),
              rooms: labData.rooms,
            });

            // Inventaire à plat Pièce / Article / Qté / mesures / volume / valeur,
            // basé sur les items enrichis (meubles + dérivés)
            const roomById = new Map<string, RoomLike>();
            roomsForRules.forEach((r) => roomById.set(r.roomId, r));

            // Séparation items racine / dérivés (matelas, sommier, contenu armoire…)
            const byParent = new Map<string, ItemLike[]>();
            const baseItems: ItemLike[] = [];
            for (const it of enrichedItems) {
              if (it.parentId) {
                const list = byParent.get(it.parentId) ?? [];
                list.push(it);
                byParent.set(it.parentId, list);
              } else {
                baseItems.push(it);
              }
            }

            // Helper de volumes (nu / emballé) commun à tout le calcul
            const computeVolumes = (src: ItemLike | null) => {
              if (!src) return { nu: 0, packed: 0 };
              const nu =
                src.volumeM3Nu ??
                src.volumeM3Final ??
                src.volumeM3Ai ??
                src.volumeM3Standard ??
                0;
              const packed =
                src.volumeM3Emballé ??
                src.volumeM3Final ??
                src.volumeM3Ai ??
                src.volumeM3Standard ??
                0;
              return { nu, packed };
            };

            // 1) On sépare les "gros" meubles des petits objets par pièce.
            // Les petits objets seront totalement regroupés dans une ligne "Cartons"
            // (avec leur détail visible uniquement dans la modale "Modifier").
            const SMALL_VOLUME_THRESHOLD = 0.15; // m³ nu estimé par objet

            const bigBaseItems: ItemLike[] = [];
            const smallItemsByRoom = new Map<string, ItemLike[]>();

            for (const item of baseItems) {
              const cat = item.category.toUpperCase();
              const { packed } = computeVolumes(item);

              const isAlwaysBigCategory =
                cat === "LIT" ||
                cat === "ARMOIRE" ||
                cat === "ARMOIRE-PENDERIE" ||
                cat === "CANAPE" ||
                cat === "CANAPÉ" ||
                cat === "BUFFET" ||
                cat === "BIBLIOTHEQUE" ||
                cat === "BIBLIOTHÈQUE" ||
                cat === "TABLE" ||
                cat === "ELECTROMENAGER" ||
                cat === "ÉLECTROMÉNAGER" ||
                cat === "GROS_ELECTROMENAGER" ||
                cat === "CARTON";

              const isSmallByVolume =
                !isAlwaysBigCategory && packed > 0 && packed < SMALL_VOLUME_THRESHOLD;

              if (isSmallByVolume) {
                const list = smallItemsByRoom.get(item.roomId) ?? [];
                list.push(item);
                smallItemsByRoom.set(item.roomId, list);
              } else {
                bigBaseItems.push(item);
              }
            }

            const inventory: Process2InventoryRow[] = [];

            // 2) On projette d'abord les "gros" meubles (logique actuelle inchangée)
            for (const item of bigBaseItems) {
              const room = roomById.get(item.roomId);
              const deps = byParent.get(item.id) ?? [];
              const cat = item.category.toUpperCase();

              // volumes du parent (meuble lui-même)
              const parentVolumes = computeVolumes(item);

              // volumes des dépendances (matelas, sommier, contenu…)
              const depsVolumes = deps.reduce(
                (acc, d) => {
                  const v = computeVolumes(d);
                  return {
                    nu: acc.nu + v.nu * (d.quantity || 1),
                    packed: acc.packed + v.packed * (d.quantity || 1),
                  };
                },
                { nu: 0, packed: 0 }
              );

              let volumeNu = parentVolumes.nu * (item.quantity || 1);
              let volumePacked = parentVolumes.packed * (item.quantity || 1);

              if (deps.length > 0) {
                if (cat === "LIT") {
                  // Pour les lits : le volume affiché = somme des composants uniquement
                  volumeNu = depsVolumes.nu;
                  volumePacked = depsVolumes.packed;
                } else if (cat === "ARMOIRE") {
                  // Pour les armoires : meuble + contenu
                  volumeNu += depsVolumes.nu;
                  volumePacked += depsVolumes.packed;
                }
              }

              const depsView =
                deps.length > 0
                  ? deps.map((d) => {
                      const v = computeVolumes(d);
                      return {
                        id: d.id,
                        label: d.label.replace(" (dérivé lit)", ""),
                        quantity: d.quantity,
                        volumeNuM3: v.nu || null,
                        volumeM3: v.packed || null,
                      };
                    })
                  : undefined;

              let label = item.label;
              if (depsView && depsView.length > 0 && cat === "LIT") {
                const names = depsView.map((d) => d.label).join(", ");
                label = `${item.label} (dont ${names})`;
              }

              inventory.push({
                id: item.id,
                roomType: room?.roomType ?? item.roomId,
                roomLabel: room?.roomLabel ?? item.roomLabel,
                itemLabel: label,
                category: item.category,
                source: "ai",
                quantity: item.quantity,
                widthCm: item.widthCm ?? null,
                depthCm: item.depthCm ?? null,
                heightCm: item.heightCm ?? null,
                volumeM3: volumePacked || null,
                volumeNuM3: volumeNu || null,
                valueEstimateEur: item.valueEurTypicalAi ?? null,
                valueJustification: null,
                fragile: item.flags?.fragile ?? false,
                packagingFactor: item.packagingFactor ?? null,
                packagingReason: item.packagingReason ?? null,
                dependencies: depsView,
              });
            }

            // 3) Puis, pour chaque pièce, on crée UNE ligne "Cartons (objets divers)"
            // qui agrège tous les petits objets, avec le détail uniquement en modale.
            const STANDARD_CARTON_VOLUME = 0.08; // m³ / carton standard de déménagement

            for (const [roomId, smallItems] of smallItemsByRoom.entries()) {
              if (smallItems.length === 0) continue;

              const room = roomById.get(roomId);

              // Volume nu total des petits objets
              const totalSmallNu = smallItems.reduce((sum, it) => {
                const v = computeVolumes(it);
                return sum + v.nu * (it.quantity || 1);
              }, 0);

              if (totalSmallNu <= 0) continue;

              const rawCartonsCount = totalSmallNu / STANDARD_CARTON_VOLUME;
              const cartonsCount = Math.max(1, Math.ceil(rawCartonsCount));
              const totalCartonVolume = cartonsCount * STANDARD_CARTON_VOLUME;

              const cartonId = `cartons-${roomId}`;

              // Détail pour la modale : on expose chaque petit objet comme "dépendance"
              const depsView = smallItems.map((it) => {
                const v = computeVolumes(it);
                return {
                  id: it.id,
                  label: it.label,
                  quantity: it.quantity,
                  volumeNuM3: v.nu || null,
                  volumeM3: v.packed || null,
                };
              });

              const packagingFactor =
                totalSmallNu > 0 ? totalCartonVolume / totalSmallNu : null;

              inventory.push({
                id: cartonId,
                roomType: room?.roomType ?? roomId,
                roomLabel: room?.roomLabel ?? (roomId as string),
                itemLabel: "Cartons (objets divers)",
                category: "CARTON",
                source: "carton",
                quantity: cartonsCount,
                widthCm: null,
                depthCm: null,
                heightCm: null,
                volumeM3: Number(totalCartonVolume.toFixed(2)),
                volumeNuM3: Number(totalSmallNu.toFixed(2)),
                valueEstimateEur: null,
                valueJustification: null,
                fragile: false,
                packagingFactor,
                packagingReason: `Objets divers regroupés en cartons (volume nu ${totalSmallNu.toFixed(
                  2
                )} m³, env. ${STANDARD_CARTON_VOLUME.toFixed(2)} m³ par carton)`,
                dependencies: depsView,
              });
            }

            setProcess2Inventory(inventory);
          }
        } catch (err) {
          console.error("Erreur Process 2 (lab-process2):", err);
        }

        setAnalysisProcesses(processes);
        setAnalysisElapsedMs((prev) =>
          prev > 0 ? prev : Date.now() - (analysisStartedAt ?? Date.now())
        );

        try {
          await updateLead(leadId, { photosStatus: "UPLOADED" });
        } catch (err: unknown) {
          if (isLeadNotFoundError(err)) {
            handleLeadNotFound("photos_status_uploaded");
          } else {
            throw err;
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
    form.originHousingType ? HOUSING_LABELS[form.originHousingType] : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const destinationSummary = [
    [form.destinationPostalCode, form.destinationCity].filter(Boolean).join(" "),
    form.destinationHousingType ? HOUSING_LABELS[form.destinationHousingType] : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // Portage long : on utilise une valeur sentinelle simple "OUI"
  // pour ne pas confondre avec les anciennes valeurs "0-10", "10-20", etc.
  const hasLongCarryOrigin = form.originCarryDistance === "OUI";
  const hasLongCarryDestination = form.destinationCarryDistance === "OUI";

  // Service "Nettoyage / débarras" : pour le client c'est un seul choix,
  // mais en interne on garde les deux flags existants.
  const hasCleaningOrClearance = form.serviceDebarras || form.optionCleaning;

  // Logique de logement : on ne parle pas d'ascenseur si logement = maison
  const isHouseLike = form.housingType.startsWith("house");

  // Si des services sont déjà cochés (ancien lead), on force l'état "Oui"
  const hasAnyExtraService =
    form.optionStorage ||
    hasCleaningOrClearance ||
    form.servicePackingFull ||
    form.serviceMountNewFurniture ||
    form.serviceInsuranceExtra ||
    form.serviceWasteRemoval ||
    form.serviceHelpNoTruck ||
    form.serviceSpecialHours;

  useEffect(() => {
    if (hasAnyExtraService) {
      setHasExtraServices(true);
    }
  }, [hasAnyExtraService]);

  const handleSubmitStep1 = async (e: FormEvent) => {
    e.preventDefault();
    setHasTriedSubmitStep1(true);
    setError(null);

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
        source: source ?? null,
      };

      // 1. Créer le lead local (SQLite)
      const { id } = await createLead(payload);
      setLeadId(id);

      // 2. S'assurer qu'un lead existe côté Back Office (idempotent)
      await ensureBackofficeLeadId();

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

  // Si l'utilisateur revient à l'étape 2 avec un piano ou beaucoup de meubles,
  // on active automatiquement le mode "mobilier détaillé" (hors formats présents).
  useEffect(() => {
    if (form.servicePiano !== "none" || form.optionDismantlingFull) {
      setHasCustomFurniture(true);
    }
  }, [form.servicePiano, form.optionDismantlingFull]);

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
    setHasTriedSubmitStep3(true);
    setError(null);

    if (!isSurfaceValid) {
      setError("Merci de vérifier les champs en rouge.");
      return;
    }

    const rawSurface = form.surfaceM2 ?? "";
    const surface = Number(String(rawSurface).replace(",", "."));
    const pricing =
      pricingByFormule && pricingByFormule[form.formule]
        ? pricingByFormule[form.formule]
        : null;

    const extras: string[] = [];
    if (form.serviceMonteMeuble) extras.push("Monte‑meuble à prévoir");
    if (form.servicePiano === "droit") extras.push("Piano droit");
    if (form.servicePiano === "quart") extras.push("Piano quart de queue");
    if (form.serviceDebarras) extras.push("Besoin de débarras");
    if (form.optionDismantlingFull)
      extras.push("Beaucoup de meubles à démonter / remonter");
    if (form.optionStorage) extras.push("Stockage temporaire / garde‑meuble");
    if (form.optionCleaning) extras.push("Nettoyage de fin de déménagement");
    if (form.optionDifficultAccess)
      extras.push("Rue / stationnement compliqué");
    if (form.accessTruckDifficult)
      extras.push("Accès camion difficile");
    if (form.accessNoElevator && !isHouseLike)
      extras.push("Escaliers sans ascenseur");
    if (form.accessSmallElevator && !isHouseLike)
      extras.push("Petit ascenseur / passages serrés");
    if (form.servicePackingFull) extras.push("Emballage complet");
    if (form.serviceMountNewFurniture) extras.push("Montage meubles neufs");
    if (form.serviceInsuranceExtra) extras.push("Assurance renforcée");
    if (form.serviceWasteRemoval) extras.push("Évacuation déchets");
    if (form.serviceHelpNoTruck)
      extras.push("Aide sans camion (changement de palier)");
    if (form.serviceSpecialHours) extras.push("Horaires spécifiques");
    if (form.furnitureAmericanFridge) extras.push("Frigo US lourd");
    if (form.furnitureSafe) extras.push("Coffre‑fort / armoire forte");
    if (form.furnitureBilliard) extras.push("Billard");
    if (form.furnitureAquarium) extras.push("Aquarium / vitrine");
    if (form.furnitureOver25kg) extras.push("Objet(s) > 25 kg");
    if (form.furnitureVeryFragile) extras.push("Objets très fragiles");

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

      let effectiveLeadId = leadId;
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
              source: source ?? null,
            };

            const { id: newId } = await createLead(createPayload);
            setLeadId(newId);
            effectiveLeadId = newId;

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

      // 3. Synchroniser avec le Back Office (PATCH + request-confirmation)
      // Important: on récupère toujours un id BO effectif (création si manquant).
      const effectiveBackofficeLeadId = backofficeLeadId ?? (await ensureBackofficeLeadId());
      if (effectiveBackofficeLeadId) {
        try {
          // Mapper les valeurs du formulaire vers le format back-office
          const mapDensity = (d: string): "LIGHT" | "MEDIUM" | "HEAVY" =>
            d === "light" ? "LIGHT" : d === "dense" ? "HEAVY" : "MEDIUM";

          const mapElevator = (e: string): "OUI" | "NON" | "PARTIEL" =>
            e === "none" ? "NON" : e === "small" ? "PARTIEL" : "OUI";

          const toIsoDate = (raw: string | null | undefined): string | undefined => {
            if (!raw) return undefined;
            const d = new Date(raw);
            if (!Number.isFinite(d.getTime())) return undefined;
            return d.toISOString();
          };

          const safeSurfaceM2 =
            Number.isFinite(surface) && surface > 0 ? Math.round(surface) : undefined;

          const tunnelOptions = {
            access: {
              origin: {
                escalierSansAscenseur: form.accessNoElevator || undefined,
                petitAscenseurPassagesSerres: form.accessSmallElevator || undefined,
                rueStationnementComplique: form.optionDifficultAccess || undefined,
                accesCamionDifficile: form.accessTruckDifficult || undefined,
                portageLong: hasLongCarryOrigin || undefined,
                monteMeuble: form.serviceMonteMeuble || undefined,
                autorisationStationnement: form.originParkingAuth ?? undefined,
              },
              destination: form.destinationUnknown
                ? undefined
                : {
                    escalierSansAscenseur: form.accessNoElevator || undefined,
                    petitAscenseurPassagesSerres: form.accessSmallElevator || undefined,
                    rueStationnementComplique: form.optionDifficultAccess || undefined,
                    accesCamionDifficile: form.accessTruckDifficult || undefined,
                    portageLong: hasLongCarryDestination || undefined,
                    monteMeuble: form.serviceMonteMeuble || undefined,
                    autorisationStationnement: form.destinationParkingAuth ?? undefined,
                  },
            },
            furniture: {
              piano:
                form.servicePiano === "none"
                  ? null
                  : form.servicePiano === "droit"
                  ? "Piano droit"
                  : "Piano quart de queue",
              frigoUSLourd: form.furnitureAmericanFridge || undefined,
              coffreFort: form.furnitureSafe || undefined,
              billard: form.furnitureBilliard || undefined,
              aquariumVitrine: form.furnitureAquarium || undefined,
              objetsPlus25kg: form.furnitureOver25kg || undefined,
              objetsTresFragiles: form.furnitureVeryFragile || undefined,
              beaucoupADemonter: form.optionDismantlingFull || undefined,
            },
            services: {
              gardeMeuble: form.optionStorage || undefined,
              nettoyageDebarras: hasCleaningOrClearance || undefined,
              emballageComplet: form.servicePackingFull || undefined,
              montageMeublesNeufs: form.serviceMountNewFurniture || undefined,
              assuranceRenforcee: form.serviceInsuranceExtra || undefined,
              evacuationDechets: form.serviceWasteRemoval || undefined,
              aideSansCamionPalier: form.serviceHelpNoTruck || undefined,
              horairesSpecifiques: form.serviceSpecialHours || undefined,
            },
          };

          // Champs non remplis = undefined (pas envoyés au back-office)
          // Le filtrage dans updateBackofficeLead enlève les undefined
          const boUpdatePayload = {
            // Adresses - undefined si non rempli
            originAddress: form.originAddress || undefined,
            originCity: form.originCity || undefined,
            originPostalCode: form.originPostalCode || undefined,
            destAddress: form.destinationUnknown ? undefined : (form.destinationAddress || undefined),
            destCity: form.destinationUnknown ? undefined : (form.destinationCity || undefined),
            destPostalCode: form.destinationUnknown ? undefined : (form.destinationPostalCode || undefined),

            // Date - undefined si non sélectionnée
            movingDate: toIsoDate(form.movingDate),
            dateFlexible: form.dateFlexible,

            // Volume & Surface - undefined si non calculé
            surfaceM2: safeSurfaceM2,
            estimatedVolume: pricing ? pricing.volumeM3 : undefined,
            density: form.density ? mapDensity(form.density) : undefined,

            // Formule & Prix - undefined si non sélectionné/calculé
            formule: form.formule || undefined,
            estimatedPriceMin: pricing ? pricing.prixMin : undefined,
            estimatedPriceAvg: pricing ? Math.round((pricing.prixMin + pricing.prixMax) / 2) : undefined,
            estimatedPriceMax: pricing ? pricing.prixMax : undefined,

            // Détails logement origine - undefined si non rempli
            originHousingType: form.originHousingType || undefined,
            originFloor: form.originFloor ? parseInt(form.originFloor, 10) : undefined,
            originElevator: form.originElevator ? mapElevator(form.originElevator) : undefined,
            originParkingAuth: form.originParkingAuth,

            // Détails logement destination - undefined si destination inconnue ou non rempli
            destHousingType: form.destinationUnknown ? undefined : (form.destinationHousingType || undefined),
            destFloor: form.destinationUnknown ? undefined : (form.destinationFloor ? parseInt(form.destinationFloor, 10) : undefined),
            destElevator: form.destinationUnknown ? undefined : (form.destinationElevator ? mapElevator(form.destinationElevator) : undefined),
            destParkingAuth: form.destinationUnknown ? undefined : form.destinationParkingAuth,

            // Options détaillées du tunnel
            tunnelOptions,
          };

          const safePayload = {
            originAddress: boUpdatePayload.originAddress,
            originCity: boUpdatePayload.originCity,
            originPostalCode: boUpdatePayload.originPostalCode,
            destAddress: boUpdatePayload.destAddress,
            destCity: boUpdatePayload.destCity,
            destPostalCode: boUpdatePayload.destPostalCode,
            movingDate: boUpdatePayload.movingDate,
            dateFlexible: boUpdatePayload.dateFlexible,
            surfaceM2: boUpdatePayload.surfaceM2,
            estimatedVolume: boUpdatePayload.estimatedVolume,
            density: boUpdatePayload.density,
            formule: boUpdatePayload.formule,
            estimatedPriceMin: boUpdatePayload.estimatedPriceMin,
            estimatedPriceAvg: boUpdatePayload.estimatedPriceAvg,
            estimatedPriceMax: boUpdatePayload.estimatedPriceMax,
          };

          try {
            await updateBackofficeLead(effectiveBackofficeLeadId, boUpdatePayload);
            console.log("✅ Lead mis à jour dans le Back Office");
          } catch (err: unknown) {
            // Si le lead BO a été supprimé/expiré, on recrée et on rejoue une fois.
            if (err instanceof Error && err.message === "LEAD_NOT_FOUND") {
              const newId = await ensureBackofficeLeadId({ forceNew: true });
              if (newId) {
                await updateBackofficeLead(newId, boUpdatePayload);
                console.log("✅ Lead recréé puis mis à jour dans le Back Office");
                return;
              }
              throw err;
            }

            // Fallback générique : si le BO rejette le payload complet (validation ou 5xx),
            // on tente une mise à jour minimale avec uniquement les champs cœur
            // (adresses, date, surface, volume, prix) pour éviter d'avoir un lead "vide".
            console.warn(
              "Échec mise à jour lead BO avec payload complet, tentative avec payload minimal:",
              err,
            );
            await updateBackofficeLead(effectiveBackofficeLeadId, safePayload);
            console.log("✅ Lead mis à jour dans le Back Office avec payload minimal");
          }
        } catch (boErr) {
          console.warn("Impossible de synchroniser avec le Back Office:", boErr);
        }
      }

      if (!hasFiredLeadSubmitRef.current) {
        hasFiredLeadSubmitRef.current = true;
        ga4Event("lead_submit", {
          ...gaBaseParams,
          ...getStepMeta(3),
          lead_id: effectiveLeadId,
        });
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
    <div className="relative flex flex-1 flex-col gap-6">
      {process.env.NODE_ENV === "development" && (
      <button
        type="button"
        onClick={() => {
          if (typeof window === "undefined") return;
          const ok = window.confirm("Repartir de zéro ? (Reset tunnel)");
          if (!ok) return;

          try {
            window.localStorage.removeItem("moverz_tunnel_form_state");
            window.localStorage.removeItem("moverz_tunnel_session_id");
          } catch {
            // ignore
          }

          // Recharge propre (même URL, sans param spécial)
          window.location.reload();
        }}
          className="pointer-events-auto fixed bottom-3 left-3 z-50 rounded-full border border-surface-3 bg-white/80 px-2 py-1 text-[10px] font-medium text-slate-500 shadow-soft opacity-60 backdrop-blur hover:opacity-100"
          title="Reset (dev)"
      >
        reset
      </button>
      )}

      {/* Header + rassurance (minimal, premium) */}
      <header className="space-y-4 rounded-3xl border border-surface-3 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg bg-brand-deep/10 px-2.5 py-1 ring-1 ring-brand-deep/15">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-spark moverz-animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-deep">
                Demande de devis
              </span>
            </div>
            <h1 className="text-xl font-bold text-brand-navy sm:text-2xl">
              Devis comparables en 3 minutes
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <svg className="h-3.5 w-3.5 text-brand-spark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-slate-900">Les photos</span> évitent les surprises le jour J
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/50 backdrop-blur moverz-transition-fast hover:shadow hover:ring-slate-300/50">
              <svg className="h-3 w-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Gratuit
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/50 backdrop-blur moverz-transition-fast hover:shadow hover:ring-slate-300/50">
              <svg className="h-3 w-3 text-brand-spark" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Pros vérifiés
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/50 backdrop-blur moverz-transition-fast hover:shadow hover:ring-slate-300/50">
              <svg className="h-3 w-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
              0 spam
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:hidden">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/50 backdrop-blur">
            <svg className="h-3 w-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Gratuit
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/50 backdrop-blur">
            <svg className="h-3 w-3 text-brand-spark" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Pros vérifiés
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/50 backdrop-blur">
            <svg className="h-3 w-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
            </svg>
            0 spam
          </span>
        </div>
      </header>

      {/* Stepper simple, mobile first */}
      <nav
        aria-label="Étapes du tunnel"
        className="rounded-3xl border border-surface-3 bg-white/80 p-3 shadow-soft backdrop-blur"
      >
        {/* Mobile : barre de progression + libellé courant */}
        {/* Mobile : mini stepper scrollable et cliquable */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:hidden">
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const canGoBack = step.id < currentStep;
            
            return (
              <button
                key={step.id}
                type="button"
                disabled={!canGoBack && !isActive}
                onClick={canGoBack ? () => goToStep(step.id as StepId) : undefined}
                className={[
                  "flex h-10 min-w-[40px] items-center justify-center rounded-full border text-sm font-bold transition-all antialiased",
                  isActive
                    ? "border-transparent bg-brand-deep text-white shadow-brand"
                    : isCompleted
                    ? "border-brand-deep/30 bg-brand-deep/10 text-brand-deep hover:bg-brand-deep/15"
                    : "border-surface-3 bg-white text-slate-500",
                  canGoBack && !isActive ? "cursor-pointer" : "",
                  !canGoBack && !isActive ? "cursor-default opacity-50" : "",
                ].join(" ")}
                style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
              >
                {isCompleted ? "✓" : step.id}
              </button>
            );
          })}
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
                      "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold moverz-transition-smooth antialiased",
                      isActive
                        ? "border-transparent bg-brand-deep text-white shadow-[0_0_0_4px_rgba(43,122,120,0.18)] moverz-animate-pulse"
                        : isCompleted
                        ? "border-brand-deep/30 bg-brand-deep/10 text-brand-deep"
                        : "border-surface-3 bg-white text-slate-600",
                      canGoToStep && !isActive ? "hover:border-brand-spark/60 hover:text-slate-900 hover:scale-110" : "",
                    ].join(" ")}
                    style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
                  >
                    {isCompleted ? "✓" : step.id}
                  </div>
                  <span
                    className={[
                      "text-[11px] font-medium",
                      isActive
                        ? "text-brand-deep"
                        : isCompleted
                        ? "text-slate-800"
                        : "text-slate-500",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </button>
                {!isLast && (
                  <div className="h-px flex-1 rounded-full bg-surface-3" />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Étape 1 – Contact */}
      {currentStep === 1 && (
        <section className="moverz-animate-fade-in flex-1 rounded-3xl border border-surface-3 bg-white/90 p-4 shadow-soft backdrop-blur sm:p-6">
          <form className="space-y-5" onSubmit={handleSubmitStep1}>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-900">
                Comment voulez-vous qu’on vous appelle ?
              </label>
              {error && !form.firstName && (
                <p className="text-xs text-slate-500">
                  Un prénom, un nom ou un surnom qui sera utilisé dans nos échanges.
                </p>
              )}
              <div className="relative mt-2">
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => {
                    setFirstNameTouched(true);
                    updateField("firstName", e.target.value);
                  }}
                  className="w-full rounded-xl border border-surface-3 bg-surface-1 px-3.5 pr-8 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25"
                  placeholder="Prénom ou surnom"
                  autoComplete="given-name"
                />
                {(hasTriedSubmitStep1 || firstNameTouched) && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    {isFirstNameValid ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                        ✓
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                        ✕
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-900">
                Email de contact
              </label>
              {hasTriedSubmitStep1 && !isEmailValid && (
                <p className="text-xs text-slate-500">
                  Utilisé uniquement pour vous envoyer les devis et suivre votre dossier (jamais partagé ni revendu).
                </p>
              )}
              <div className="relative mt-2">
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => {
                    setEmailTouched(true);
                    updateField("email", e.target.value);
                  }}
                  className="w-full rounded-xl border border-surface-3 bg-surface-1 px-3.5 pr-8 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25"
                  placeholder="vous@email.fr"
                  autoComplete="email"
                />
                {(hasTriedSubmitStep1 || emailTouched) && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    {isEmailValid ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                        ✓
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                        ✕
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {error && (!isFirstNameValid || !isEmailValid) && (
              <p className="text-sm text-rose-400" role="alert">
                Merci de vérifier les champs en rouge.
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-brand-deep px-4 py-3 text-sm font-semibold text-white shadow-brand moverz-transition-smooth hover:bg-brand-navy hover:shadow-brand-lg hover:ring-2 hover:ring-brand-spark/30 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Création en cours…" : "Commencer ma demande"}
            </button>
          </form>
        </section>
      )}

      {/* Étape 2 – Projet (départ / arrivée en blocs ouverts) */}
      {currentStep === 2 && (
        <section className="moverz-animate-fade-in flex-1 rounded-3xl border border-surface-3 bg-white/90 p-4 shadow-soft backdrop-blur sm:p-6">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setHasTriedSubmitStep2(true);
              setError(null);
              
              // Validation étape 2 : champs obligatoires (distance de portage et options d'accès sont facultatifs)
              if (!form.originPostalCode || !form.originCity) {
                setError("Merci de vérifier les champs en rouge.");
                return;
              }
              if (
                !form.destinationUnknown &&
                (!form.destinationPostalCode || !form.destinationCity)
              ) {
                setError("Merci de vérifier les champs en rouge.");
                return;
              }
              if (!form.movingDate) {
                setError("Merci de vérifier les champs en rouge.");
                return;
              }
              if (!isSurfaceValid) {
                setError("Merci de vérifier les champs en rouge.");
                return;
              }
              
              goToStep(3);
            }}
          >
            {/* Bloc départ – toujours ouvert, sans badges */}
            <div className="space-y-3 overflow-hidden rounded-2xl bg-surface-1 p-4 ring-1 ring-surface-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-deep">
                  Départ
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-slate-500">
                    {originSummary || "Code postal, ville, type de logement…"}
                  </p>
                  {(hasTriedSubmitStep2 ||
                    form.originPostalCode ||
                    form.originCity ||
                    form.originHousingType ||
                    form.originCarryDistance) && (
                    <span className="pointer-events-none flex items-center">
                      {isOriginAddressValid ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                          ✓
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                          ✕
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <AddressAutocomplete
                  label="Adresse de départ"
                  placeholder="10 rue de la Paix, 33000 Bordeaux"
                  mode="fr"
                  initialValue={
                    form.originAddress ||
                    [form.originPostalCode, form.originCity]
                      .filter(Boolean)
                      .join(" ")
                  }
                  onSelect={(s) => {
                    setOriginAddressTouched(true);
                    updateField("originAddress", s.addressLine ?? s.label);
                    updateField("originPostalCode", s.postalCode ?? "");
                    updateField("originCity", s.city ?? "");
                    updateField("originLat", s.lat ?? null);
                    updateField("originLon", s.lon ?? null);
                  }}
                  showStatus={hasTriedSubmitStep2 || originAddressTouched}
                  status={
                    isOriginAddressFieldValid ? "valid" : ("invalid" as const)
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Type de logement
                    </label>
                    <div className="relative mt-1">
                      <select
                        value={form.originHousingType}
                        onChange={(e) =>
                          updateField(
                            "originHousingType",
                            e.target.value as HousingType | ""
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 pr-8 py-2.5 text-sm text-slate-900 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25"
                      >
                      <option value="">Choisir le type de logement</option>
                      <option value="studio">Studio (1 pièce)</option>
                      <option value="t1">T1 (chambre + cuisine)</option>
                      <option value="t2">T2 (chambre + salon + cuisine)</option>
                      <option value="t3">T3 (2 chambres + salon + cuisine)</option>
                      <option value="t4">T4 (3 chambres + salon + cuisine)</option>
                      <option value="t5">T5 (4 chambres + salon + cuisine)</option>
                      <option value="house">Maison plain-pied</option>
                      <option value="house_1floor">Maison +1 étage</option>
                      <option value="house_2floors">Maison +2 étages</option>
                      <option value="house_3floors">
                        Maison 3 étages ou +
                      </option>
                      </select>
                      {(hasTriedSubmitStep2 || originHousingTouched) && (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          {isOriginHousingValid ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                              ✓
                            </span>
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                              ✕
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Étage (si appartement) */}
                  {form.originHousingType &&
                   !form.originHousingType.startsWith("house") && (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Étage
                      </label>
                      <div className="relative mt-1">
                        <select
                          value={form.originFloor}
                          onChange={(e) =>
                            updateField("originFloor", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 pr-8 py-2.5 text-sm text-slate-900 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25"
                        >
                          <option value="0">Rez-de-chaussée</option>
                          <option value="1">1er étage</option>
                          <option value="2">2e étage</option>
                          <option value="3">3e étage</option>
                          <option value="4">4e étage</option>
                          <option value="5">5e étage</option>
                          <option value="6">6e étage</option>
                          <option value="7">7e étage</option>
                          <option value="8">8e étage</option>
                          <option value="9">9e étage</option>
                          <option value="10">10e étage ou +</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Distance de portage : désormais gérée uniquement via le chip
                      "Portage > 15 m" dans la section Accès. */}
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)]">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Surface approximative (m²)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={form.surfaceM2}
                        onChange={(e) => {
                          setSurfaceTouched(true);
                          updateField("surfaceM2", e.target.value);
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 pr-8 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25"
                      />
                      {(hasTriedSubmitStep2 || surfaceTouched) && (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          {isSurfaceValid ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                              ✓
                            </span>
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                              ✕
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div />
                </div>
              </div>
            </div>

            {/* Bloc arrivée – toujours ouvert, sans badges */}
            <div className="space-y-3 overflow-hidden rounded-2xl bg-surface-1 p-4 ring-1 ring-surface-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-deep">
                  Arrivée
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-slate-500">
                    {destinationSummary || "Code postal, ville, type de logement…"}
                  </p>
                  {(hasTriedSubmitStep2 ||
                    form.destinationPostalCode ||
                    form.destinationCity ||
                    form.destinationHousingType ||
                    form.destinationCarryDistance ||
                    form.destinationUnknown) && (
                    <span className="pointer-events-none flex items-center">
                      {isDestinationAddressValid ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                          ✓
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                          ✕
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-800">
                    Adresse d’arrivée
                  </p>
                  <label className="flex items-center gap-2 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-surface-3 bg-white text-brand-deep focus:ring-brand-spark/30"
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
                      ? "Incluez aussi le pays (ex: Barcelone, Espagne)."
                      : undefined
                  }
                  mode={isDestinationForeign ? "world" : "fr"}
                  initialValue={
                    form.destinationAddress ||
                    [form.destinationPostalCode, form.destinationCity]
                      .filter(Boolean)
                      .join(" ")
                  }
                  onSelect={(s) => {
                    setDestinationAddressTouched(true);
                    updateField("destinationAddress", s.addressLine ?? s.label);
                    updateField("destinationPostalCode", s.postalCode ?? "");
                    updateField("destinationCity", s.city ?? "");
                    updateField("destinationLat", s.lat ?? null);
                    updateField("destinationLon", s.lon ?? null);
                  }}
                  showStatus={
                    hasTriedSubmitStep2 || destinationAddressTouched
                  }
                  status={
                    isDestinationAddressFieldValid ? "valid" : ("invalid" as const)
                  }
                />
               
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Type de logement
                    </label>
                    <div className="relative mt-1">
                      <select
                        value={form.destinationHousingType}
                        onChange={(e) =>
                          updateField(
                            "destinationHousingType",
                            e.target.value as HousingType | ""
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 pr-8 py-2.5 text-sm text-slate-900 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25"
                      >
                      <option value="">Choisir le type de logement</option>
                      <option value="studio">Studio (1 pièce)</option>
                      <option value="t1">T1 (chambre + cuisine)</option>
                      <option value="t2">T2 (chambre + salon + cuisine)</option>
                      <option value="t3">T3 (2 chambres + salon + cuisine)</option>
                      <option value="t4">T4 (3 chambres + salon + cuisine)</option>
                      <option value="t5">T5 (4 chambres + salon + cuisine)</option>
                      <option value="house">Maison plain-pied</option>
                      <option value="house_1floor">Maison +1 étage</option>
                      <option value="house_2floors">Maison +2 étages</option>
                      <option value="house_3floors">
                        Maison 3 étages ou +
                      </option>
                      </select>
                      {(hasTriedSubmitStep2 || destinationHousingTouched) && !form.destinationUnknown && (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          {isDestinationHousingValid ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                              ✓
                            </span>
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                              ✕
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Étage (si appartement) */}
                  {form.destinationHousingType &&
                   !form.destinationHousingType.startsWith("house") &&
                   !form.destinationUnknown && (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Étage
                      </label>
                      <div className="relative mt-1">
                        <select
                          value={form.destinationFloor}
                          onChange={(e) =>
                            updateField("destinationFloor", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 pr-8 py-2.5 text-sm text-slate-900 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25"
                        >
                          <option value="0">Rez-de-chaussée</option>
                          <option value="1">1er étage</option>
                          <option value="2">2e étage</option>
                          <option value="3">3e étage</option>
                          <option value="4">4e étage</option>
                          <option value="5">5e étage</option>
                          <option value="6">6e étage</option>
                          <option value="7">7e étage</option>
                          <option value="8">8e étage</option>
                          <option value="9">9e étage</option>
                          <option value="10">10e étage ou +</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Distance de portage arrivée : gérée via le chip
                      "Portage > 15 m (arrivée)" dans la section Accès. */}
                </div>
              </div>
            </div>

            {/* Distance estimée (information indicative) */}
            {formatDistanceLabel(distanceKm) && (
              <p className="text-[11px] text-slate-400">
                {formatDistanceLabel(distanceKm)}
              </p>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-900">
                Date souhaitée
              </label>
              <div className="relative mt-1">
                <input
                  type="date"
                  value={form.movingDate}
                  onChange={(e) => updateField("movingDate", e.target.value)}
                  onClick={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker?.();
                    } catch {
                      // showPicker non supporté : fallback silencieux
                    }
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  max={(() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    return d.toISOString().split("T")[0];
                  })()}
                  required
                  className="w-full cursor-pointer rounded-xl border border-surface-3 bg-surface-1 px-3.5 pr-8 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-spark/70 focus:outline-none focus:ring-2 focus:ring-brand-spark/25 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
                {(hasTriedSubmitStep2 || form.movingDate) && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    {isMovingDateValid ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-spark text-[11px] font-bold text-brand-navy shadow-sm">
                        ✓
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm shadow-rose-500/60">
                        ✕
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.dateFlexible}
                onChange={(e) => updateField("dateFlexible", e.target.checked)}
                className="h-4 w-4 rounded border-surface-3 bg-white text-brand-deep focus:ring-brand-spark/30"
              />
              <span>Je peux être flexible de quelques jours autour de cette date</span>
            </label>

            {/* Autres besoins éventuels (tous les services optionnels regroupés) */}
            <div className="space-y-2 rounded-2xl bg-surface-1 p-3 text-[11px] text-slate-700 ring-1 ring-surface-3">
              <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Autres besoins éventuels
                </p>
              </div>

              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {/* Accès */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-600">
                    Accès
              </p>
              <div className="flex flex-wrap gap-1.5">
                    {/* Accès facile (par défaut) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (hasCustomAccess) {
                          // Retour à "accès facile" → on remet les options détaillées à zéro
                          setHasCustomAccess(false);
                          setForm((prev) => ({
                            ...prev,
                            serviceMonteMeuble: false,
                            optionDifficultAccess: false,
                            accessNoElevator: false,
                            accessSmallElevator: false,
                            accessTruckDifficult: false,
                            originCarryDistance:
                              prev.originCarryDistance === "OUI"
                                ? ""
                                : prev.originCarryDistance,
                            destinationCarryDistance:
                              prev.destinationCarryDistance === "OUI"
                                ? ""
                                : prev.destinationCarryDistance,
                          }));
                        }
                      }}
                      className={[
                        "rounded-full border px-3 py-1 text-left moverz-transition-fast",
                        !hasCustomAccess
                          ? "border-brand-deep bg-brand-deep text-white shadow-sm ring-1 ring-brand-spark/20"
                          : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40 hover:shadow-sm",
                      ].join(" ")}
                    >
                      Accès facile
                    </button>
                    {/* Accès contraint : sert juste à ouvrir les options */}
                    <button
                      type="button"
                      onClick={() => setHasCustomAccess(true)}
                      className={[
                        "rounded-full border px-3 py-1 text-left moverz-transition-fast",
                        hasCustomAccess
                          ? "border-brand-deep bg-brand-deep text-white shadow-sm ring-1 ring-brand-spark/20"
                          : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40 hover:shadow-sm",
                      ].join(" ")}
                    >
                      Accès contraint
                    </button>
                  </div>

                  {/* Options détaillées d'accès – visibles uniquement si Accès contraint est actif */}
                  {hasCustomAccess && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                  Monte‑meuble à prévoir
                </button>
                      {!isHouseLike && (
                        <>
                <button
                  type="button"
                  onClick={() =>
                              updateField("accessNoElevator", !form.accessNoElevator)
                  }
                  className={[
                    "rounded-full border px-3 py-1 text-left",
                              form.accessNoElevator
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                            Escaliers sans ascenseur
                </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                "accessSmallElevator",
                                !form.accessSmallElevator
                              )
                            }
                            className={[
                              "rounded-full border px-3 py-1 text-left",
                              form.accessSmallElevator
                                ? "border-brand-deep bg-brand-deep text-white"
                                : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                            ].join(" ")}
                          >
                            Petit ascenseur / passages serrés
                          </button>
                        </>
                      )}
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
                            ? "border-brand-deep bg-brand-deep text-white"
                            : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                        ].join(" ")}
                      >
                        Rue / stationnement compliqué
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            "accessTruckDifficult",
                            !form.accessTruckDifficult
                          )
                        }
                        className={[
                          "rounded-full border px-3 py-1 text-left",
                          form.accessTruckDifficult
                            ? "border-brand-deep bg-brand-deep text-white"
                            : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                        ].join(" ")}
                      >
                        Accès camion difficile
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            "originCarryDistance",
                            (hasLongCarryOrigin ? "" : "OUI") as FormState["originCarryDistance"]
                          )
                        }
                        className={[
                          "rounded-full border px-3 py-1 text-left",
                          hasLongCarryOrigin
                            ? "border-brand-deep bg-brand-deep text-white"
                            : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                        ].join(" ")}
                      >
                        Portage &gt; 15 m (départ)
                      </button>
                      {!form.destinationUnknown && (
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              "destinationCarryDistance",
                              (hasLongCarryDestination ? "" : "OUI") as FormState["destinationCarryDistance"]
                            )
                          }
                          className={[
                            "rounded-full border px-3 py-1 text-left",
                            hasLongCarryDestination
                              ? "border-brand-deep bg-brand-deep text-white"
                              : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                          ].join(" ")}
                        >
                          Portage &gt; 15 m (arrivée)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobilier */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-600">
                    Mobilier / objets spécifiques
                  </p>
                  <div className="flex gap-1.5 flex-wrap md:flex-nowrap">
                    {/* RAS par défaut */}
                    <button
                      type="button"
                      onClick={() => {
                        if (hasCustomFurniture) {
                          // Retour à "rien de particulier"
                          setHasCustomFurniture(false);
                          setForm((prev) => ({
                            ...prev,
                            servicePiano: "none",
                            optionDismantlingFull: false,
                            furnitureAmericanFridge: false,
                            furnitureSafe: false,
                            furnitureBilliard: false,
                            furnitureAquarium: false,
                            furnitureOver25kg: false,
                            furnitureVeryFragile: false,
                          }));
                        }
                      }}
                      className={[
                        "rounded-full border px-3 py-1 text-left",
                        !hasCustomFurniture
                          ? "border-brand-deep bg-brand-deep text-white"
                          : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                      ].join(" ")}
                    >
                      Rien de particulier
                    </button>
                    {/* Ouvre les options détaillées */}
                    <button
                      type="button"
                      onClick={() => setHasCustomFurniture(true)}
                      className={[
                        "rounded-full border px-3 py-1 text-left",
                        hasCustomFurniture
                          ? "border-brand-deep bg-brand-deep text-white"
                          : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                      ].join(" ")}
                    >
                      Mobilier spécifique
                    </button>
                  </div>

                  {/* Détails mobilier (piano / meubles à démonter) – visibles uniquement si Mobilier spécifique est actif */}
                  {hasCustomFurniture && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
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
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                            "furnitureAmericanFridge",
                            !form.furnitureAmericanFridge
                    )
                  }
                  className={[
                    "rounded-full border px-3 py-1 text-left",
                          form.furnitureAmericanFridge
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                        Frigo US lourd
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField("furnitureSafe", !form.furnitureSafe)
                        }
                        className={[
                          "rounded-full border px-3 py-1 text-left",
                          form.furnitureSafe
                            ? "border-brand-deep bg-brand-deep text-white"
                            : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                        ].join(" ")}
                      >
                        Coffre‑fort / armoire forte
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField("furnitureBilliard", !form.furnitureBilliard)
                        }
                        className={[
                          "rounded-full border px-3 py-1 text-left",
                          form.furnitureBilliard
                            ? "border-brand-deep bg-brand-deep text-white"
                            : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                        ].join(" ")}
                      >
                        Billard
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                            "furnitureAquarium",
                            !form.furnitureAquarium
                    )
                  }
                  className={[
                    "rounded-full border px-3 py-1 text-left",
                          form.furnitureAquarium
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                        Aquarium / vitrine
                </button>
                <button
                  type="button"
                  onClick={() =>
                          updateField(
                            "furnitureOver25kg",
                            !form.furnitureOver25kg
                          )
                  }
                  className={[
                    "rounded-full border px-3 py-1 text-left",
                          form.furnitureOver25kg
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                        Objet(s) &gt; 25 kg
                </button>
                <button
                  type="button"
                  onClick={() =>
                          updateField(
                            "furnitureVeryFragile",
                            !form.furnitureVeryFragile
                          )
                  }
                  className={[
                    "rounded-full border px-3 py-1 text-left",
                          form.furnitureVeryFragile
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                        Objets très fragiles
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
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                        Beaucoup de meubles à démonter / remonter
                </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message d'erreur étape 2 */}
            {error && currentStep === 2 && (!isOriginAddressValid || !isDestinationAddressValid || !isMovingDateValid) && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-surface-3 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300"
              >
                Retour
              </button>
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-deep px-4 py-3 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-navy hover:ring-2 hover:ring-brand-spark/30"
              >
                Étape suivante
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Étape 3 – Volume & formules */}
      {currentStep === 3 && (
        <section className="moverz-animate-fade-in flex-1 rounded-3xl border border-surface-3 bg-white/90 p-4 shadow-soft backdrop-blur sm:p-6">
          <form className="space-y-5" onSubmit={handleSubmitStep3}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="text-lg font-semibold text-brand-navy">
                Sélectionnez votre formule
              </h2>
            </div>

            {/* Bloc estimation volume + formules */}
            <div className="space-y-4 rounded-2xl bg-surface-1 p-4 ring-1 ring-surface-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr),minmax(0,1.3fr)]">
                {/* Colonne gauche : densité + surface/volume */}
                <div className="space-y-4">
                  {/* 1. Densité en premier (masquée) */}
                    <div className="space-y-1 hidden">
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
                              ? "border-brand-deep/70 bg-brand-deep/10 shadow-[0_0_0_1px_rgba(43,122,120,0.35)]"
                              : "border-surface-3 bg-surface-1 hover:border-brand-deep/30",
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
                              ? "border-brand-deep/70 bg-brand-deep/10 shadow-[0_0_0_1px_rgba(43,122,120,0.35)]"
                              : "border-surface-3 bg-surface-1 hover:border-brand-deep/30",
                          ].join(" ")}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-spark/60 bg-brand-spark/10">
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
                          <div className="mt-3 inline-flex items-center rounded-full border border-brand-spark/70 bg-brand-spark/20 px-2 py-0.5 text-[10px] font-semibold text-brand-spark">
                            Volume normal
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateField("density", "dense")}
                          className={[
                            "flex w-full flex-col items-center justify-between rounded-2xl border px-4 py-4 text-center text-[11px] transition",
                            form.density === "dense"
                              ? "border-brand-deep/70 bg-brand-deep/10 shadow-[0_0_0_1px_rgba(43,122,120,0.35)]"
                              : "border-surface-3 bg-surface-1 hover:border-brand-deep/30",
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

                  {/* 2. Surface ensuite + volume estimé + rappel type logement (masqué) */}
                  <div className="space-y-2 hidden">
                    <div className="space-y-1 text-xs text-slate-300">
                      <p className="font-medium text-slate-200">
                        Type de logement (départ)
                      </p>
                      <p className="text-[11px]">
                        {HOUSING_LABELS[form.housingType]} —{" "}
                        {HOUSING_SURFACE_DEFAULTS[form.housingType]} m² estimés.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="block text-xs font-medium text-slate-200">
                          Surface approximative (m²)
                        </p>
                        <p className="mt-1 inline-flex min-h-[32px] items-center rounded-xl bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-50">
                          {form.surfaceM2 || "—"}
                        </p>
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
                            "Transport + portage inclus",
                          ]
                        : formule === "STANDARD"
                        ? [
                            "Bon compromis budget / confort",
                            "Protection du mobilier incluse",
                          ]
                        : [
                            "Emballage renforcé (fragiles, penderies…)",
                            "Démontage/remontage étendu",
                          ];
                    return (
                      <button
                        key={formule}
                        type="button"
                        onClick={() => updateField("formule", formule)}
                        className={[
                          "flex min-w-[78%] flex-col gap-2 rounded-2xl border p-3 text-left text-xs snap-start sm:min-w-0 moverz-transition-smooth",
                          isActive
                            ? "border-brand-deep/70 bg-white shadow-brand scale-[1.02] ring-2 ring-brand-spark/30"
                            : "border-surface-3 bg-white hover:border-brand-spark/40 hover:-translate-y-1 hover:shadow-brand",
                        ].join(" ")}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-deep">
                          {label}
                        </span>
                        <span className="text-[12px] font-medium text-slate-900">
                          {title}
                        </span>
                        <span className="text-[12px] font-semibold text-slate-900">
                          {pricing
                            ? `${formatPrice(pricing.prixMin)} – ${formatPrice(
                                pricing.prixMax
                              )}`
                            : "Calcul…"}
                        </span>
                        <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
                          {bullets.map((b) => (
                            <li key={b} className="flex gap-1">
                              <span className="mt-[2px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-spark" />
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
                  <div className="relative mt-3 space-y-2 rounded-2xl bg-surface-1 p-3 text-[11px] text-slate-700 ring-1 ring-surface-3">
                    {(() => {
                      const volumePart = estimatedVolumeM3 * COEF_VOLUME;
                      const distancePart = distanceKm * COEF_DISTANCE;
                      const baseNoSeason = Math.max(
                        volumePart,
                        distancePart,
                        PRIX_MIN_SOCLE
                      );
                      const B = baseNoSeason;
                      const multSeason = seasonFactor;
                      const multUrgency = urgencyFactor;
                      const multFormuleEtage =
                        activePricing.formuleMultiplier * activePricing.coeffEtage;
                      const effetVolumeDistance = B;
                      const effetSaison = B * (multSeason - 1);
                      const effetUrgence =
                        B * multSeason * (multUrgency - 1);
                      const effetFormuleEtage =
                        B *
                        multSeason *
                        multUrgency *
                        (multFormuleEtage - 1);
                      const effetServices = activePricing.servicesTotal;
                      const centre =
                        effetVolumeDistance +
                        effetSaison +
                        effetUrgence +
                        effetFormuleEtage +
                        effetServices;

                      const prixParM3Min =
                        activePricing.prixMin /
                        Math.max(estimatedVolumeM3, 1);
                      const prixParM3Max =
                        activePricing.prixMax /
                        Math.max(estimatedVolumeM3, 1);

                      const distanceImpact =
                        distancePart > volumePart
                          ? (distancePart - volumePart) *
                            multSeason *
                            multUrgency *
                            multFormuleEtage
                          : 0;

                      const ecoPricing = pricingByFormule?.ECONOMIQUE;
                      const standardPricing = pricingByFormule?.STANDARD;
                      const premiumPricing = pricingByFormule?.PREMIUM;

                      let volumeEffectPerM3: number | null = null;
                      if (standardPricing && estimatedVolumeM3 > 0) {
                        const standardCentre = standardPricing.prixFinal;
                        const multFormuleEtageStd =
                          standardPricing.formuleMultiplier *
                          standardPricing.coeffEtage;
                        const effetServicesStd = standardPricing.servicesTotal;
                        const autresEffetsStd =
                          effetSaison + effetUrgence + effetServicesStd;
                        const volumePartStd = standardCentre - autresEffetsStd;
                        volumeEffectPerM3 =
                          volumePartStd / Math.max(estimatedVolumeM3, 1);
                      }

                      return (
                        <>
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">
                              Comment calcule-t-on cette estimation ?
                            </p>
                            <p>
                              Volume + distance + période + options, pour un centre à{" "}
                              <span className="font-semibold text-slate-900">
                                {formatPrice(Math.round(centre))}
                              </span>{" "}
                              (fourchette ±20 %).
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowPricingDetails((v) => !v)}
                            className="inline-flex w-fit items-center rounded-full border border-surface-3 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-soft hover:border-slate-300"
                          >
                            <span className="mr-1">
                              {showPricingDetails ? "Masquer" : "Voir détails"}
                            </span>
                            <span className="text-xs">
                              {showPricingDetails ? "▲" : "▼"}
                            </span>
                          </button>
                          {showPricingDetails && (
                          <ul className="mt-2 ml-4 list-disc space-y-1">
                            <li>
                                <span className="font-semibold">Volume :</span>{" "}
                              {estimatedVolumeM3.toLocaleString("fr-FR", {
                                maximumFractionDigits: 1,
                              })}{" "}
                                m³
                            </li>
                            <li>
                                <span className="font-semibold">Distance :</span>{" "}
                                ~{Math.round(distanceKm).toLocaleString("fr-FR")} km
                            </li>
                            <li>
                                <span className="font-semibold">Options :</span>{" "}
                              {effetServices > 0
                                  ? `≈ ${formatPrice(Math.round(effetServices))}`
                                  : "aucune"}
                            </li>
                          </ul>
                          )}
                          <p className="mt-1 text-[10px] text-slate-500">
                            Repère: +1 m³ ≈{" "}
                            <span className="font-semibold text-slate-700">
                              {Math.round(pricePerM3Seasoned).toLocaleString("fr-FR")} €
                                </span>
                                .
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}

            </div>

            {/* Services en plus (facultatif) */}
            <div className="space-y-2 rounded-2xl bg-surface-1 p-4 ring-1 ring-surface-3">
              <p className="text-xs font-semibold text-slate-900">
                Services en plus (facultatif)
              </p>

              {/* Toggle Non / Oui pour afficher les services */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (hasExtraServices) {
                      setHasExtraServices(false);
                      setForm((prev) => ({
                        ...prev,
                        optionStorage: false,
                        serviceDebarras: false,
                        optionCleaning: false,
                        servicePackingFull: false,
                        serviceMountNewFurniture: false,
                        serviceInsuranceExtra: false,
                        serviceWasteRemoval: false,
                        serviceHelpNoTruck: false,
                        serviceSpecialHours: false,
                      }));
                    }
                  }}
                  className={[
                    "rounded-full border px-3 py-1 text-[11px]",
                    !hasExtraServices
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                  Non
                </button>
                <button
                  type="button"
                  onClick={() => setHasExtraServices(true)}
                  className={[
                    "rounded-full border px-3 py-1 text-[11px]",
                    hasExtraServices
                      ? "border-brand-deep bg-brand-deep text-white"
                      : "border-surface-3 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                  Oui
                </button>
              </div>

              {hasExtraServices && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateField("optionStorage", !form.optionStorage)
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-[11px]",
                      form.optionStorage
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    Garde‑meuble
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => {
                        const next = !hasCleaningOrClearance;
                        return {
                          ...prev,
                          serviceDebarras: next,
                          optionCleaning: next,
                        };
                      })
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-[11px]",
                      hasCleaningOrClearance
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    Nettoyage / débarras
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "servicePackingFull",
                        !form.servicePackingFull
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-[11px]",
                      form.servicePackingFull
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    Emballage complet
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "serviceMountNewFurniture",
                        !form.serviceMountNewFurniture
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-[11px]",
                      form.serviceMountNewFurniture
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    Montage meubles neufs
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "serviceInsuranceExtra",
                        !form.serviceInsuranceExtra
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-[11px]",
                      form.serviceInsuranceExtra
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    Assurance renforcée
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "serviceWasteRemoval",
                        !form.serviceWasteRemoval
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-[11px]",
                      form.serviceWasteRemoval
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    Évacuation déchets
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "serviceHelpNoTruck",
                        !form.serviceHelpNoTruck
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-[11px]",
                      form.serviceHelpNoTruck
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    Aide sans camion (changement de palier)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "serviceSpecialHours",
                        !form.serviceSpecialHours
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-[11px]",
                      form.serviceSpecialHours
                        ? "border-brand-deep bg-brand-deep text-white ring-1 ring-brand-spark/20"
                        : "border-surface-3 bg-white text-slate-700 hover:border-brand-spark/40",
                    ].join(" ")}
                  >
                    Horaires spécifiques
                  </button>
                </div>
              )}

              <p className="text-[10px] text-slate-500">
                Ces services sont optionnels et viendront préciser votre demande au déménageur.
              </p>
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
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-surface-3 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300"
              >
                Modifier
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !leadId}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-deep px-4 py-3 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Validation…" : "Valider ma demande"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Étape 4 – Photos & inventaire */}
      {currentStep === 4 && (
        <section className="moverz-animate-fade-in flex-1 rounded-3xl border border-surface-3 bg-white/90 p-4 shadow-soft backdrop-blur sm:p-6">
          <div className="space-y-6">
            {/* Question initiale : Comment transmettre vos photos ? */}
            {!hasPhotosAnswer && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-brand-navy">
                    Envoyez-nous vos photos
                </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Pour des devis précis et sans surprises
                  </p>
                </div>

                {/* 2 options : Web Upload / WhatsApp */}
                <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
                  
                  {/* Option 1 : Upload Web */}
                  <button
                    type="button"
                    onClick={() => {
                      setHasPhotosAnswer("yes");
                      setPhotoFlowChoice("web");
                    }}
                    className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-surface-3 bg-white p-5 text-center moverz-transition-smooth hover:border-brand-spark/40 hover:-translate-y-1 hover:shadow-brand"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-deep/10 ring-1 ring-brand-deep/10 group-hover:scale-110 moverz-transition-smooth">
                      <svg className="h-7 w-7 text-brand-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Upload web</p>
                      <p className="mt-1 text-xs text-slate-600">Depuis cet appareil</p>
                    </div>
                  </button>

                  {/* Option 2 : WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      setHasPhotosAnswer("yes");
                      setPhotoFlowChoice("whatsapp");
                      setShowWhatsAppFlow(true);
                      // Track GA4
                      ga4Event("whatsapp_option_selected", {
                        ...gaBaseParams,
                      });
                    }}
                    className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-[#25D366]/30 bg-white p-5 text-center moverz-transition-smooth hover:border-[#25D366]/60 hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Badge "Recommandé mobile" */}
                    <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-[#25D366] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-lg">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      Rapide
                    </div>
                    
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] shadow-lg group-hover:scale-110 moverz-transition-smooth">
                      <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">WhatsApp</p>
                      <p className="mt-1 text-xs text-slate-600">Envoi instantané</p>
                    </div>
                  </button>

                </div>

                {/* Encart minimaliste : Pourquoi les photos ? */}
                <div className="max-w-2xl mx-auto rounded-2xl border border-brand-spark/20 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-spark/20">
                      <svg className="h-5 w-5 text-brand-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-semibold text-slate-900">
                        Pourquoi les photos sont essentielles ?
                      </p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 text-brand-spark font-semibold">✓</span>
                          <span>Devis 30% plus précis (évite les marges "au cas où")</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 text-brand-spark font-semibold">✓</span>
                          <span>Moins de surprises et suppléments le jour J</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 text-brand-spark font-semibold">✓</span>
                          <span>Inventaire + déclaration de valeur générés par IA</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Flow WhatsApp (NOUVEAU) */}
            {photoFlowChoice === "whatsapp" && showWhatsAppFlow && (
              <div className="space-y-4 moverz-animate-scale-in">
                
                {/* Card WhatsApp premium */}
                <div className="overflow-hidden rounded-2xl border-2 border-[#25D366]/30 bg-white shadow-brand">
                  
                  {/* Header */}
                  <div className="border-b border-[#25D366]/20 bg-white/80 p-5 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] shadow-lg">
                        <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Envoyez vos photos sur WhatsApp
                        </h3>
                        <p className="text-xs text-slate-600">
                          Instantané et sécurisé
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="space-y-4 p-5">
                    
                    {/* Étapes */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Comment ça marche
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-xs font-bold text-white">
                            1
                          </div>
                          <p className="text-sm text-slate-700">
                            Cliquez sur <strong>&quot;Ouvrir WhatsApp&quot;</strong>
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-xs font-bold text-white">
                            2
                          </div>
                          <p className="text-sm text-slate-700">
                            Envoyez <strong>2–3 photos par pièce</strong>
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-xs font-bold text-white">
                            3
                          </div>
                          <p className="text-sm text-slate-700">
                            Ajoutez si possible la <strong>ville</strong> de départ et d’arrivée
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CTA WhatsApp */}
                    <a
                      href={deepLinkWhatsapp || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        // Track GA4
                        ga4Event("whatsapp_cta_clicked", {
                          ...gaBaseParams,
                          location: "photo_step",
                        });
                      }}
                      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-4 font-bold text-white shadow-lg moverz-transition-smooth hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      Ouvrir WhatsApp
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>

                    {/* Note */}
                    <p className="text-center text-[10px] text-slate-500">
                      Vous serez redirigé vers WhatsApp
                    </p>
                  </div>

                </div>

                {/* Option de revenir en arrière */}
                <button
                  type="button"
                  onClick={() => {
                    setShowWhatsAppFlow(false);
                    setHasPhotosAnswer(null);
                    setPhotoFlowChoice("none");
                  }}
                  className="mx-auto flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 moverz-transition-fast"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Choisir un autre mode d'envoi
                </button>

              </div>
            )}

            {/* Si l'utilisateur a répondu "non", on lui explique pourquoi c'est important */}
            {hasPhotosAnswer === "no" && photoFlowChoice === "none" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-brand-navy">
                  Pourquoi les photos sont importantes
                </h2>
                <p className="text-sm text-slate-600">
                  Sans photos, les devis sont souvent plus larges et les surprises plus probables.
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-surface-3 bg-white p-4 shadow-soft">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-spark/25 text-brand-navy text-sm font-bold">
                        ✓
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          Devis comparables
                        </p>
                        <p className="text-xs text-slate-600">
                          Volume plus fiable, moins de marge “au cas où”.
                  </p>
                </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-surface-3 bg-white p-4 shadow-soft">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-spark/25 text-brand-navy text-sm font-bold">
                        ✓
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          Moins de suppléments
                        </p>
                        <p className="text-xs text-slate-600">
                          Moins de surprises le jour J.
                  </p>
                </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-surface-3 bg-white p-4 shadow-soft">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-spark/25 text-brand-navy text-sm font-bold">
                        ✓
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          Inventaire automatique
                        </p>
                        <p className="text-xs text-slate-600">
                          Inventaire + déclaration de valeur générés.
                  </p>
                </div>
                    </div>
                  </div>
                </div>

                <details className="group rounded-2xl border border-surface-3 bg-white p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                    <span>En savoir plus</span>
                    <span className="text-slate-500 transition-transform group-open:rotate-180">
                      ▼
                  </span>
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      Les photos aident à estimer le volume et à préparer les documents
                      demandés par les déménageurs (inventaire et déclaration de valeur).
                    </p>
                    <p>
                      Pas vos photos maintenant ? On peut vous envoyer un email avec un lien
                      pour finaliser plus tard.
                    </p>
                  </div>
                </details>
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHasPhotosAnswer("yes");
                      setPhotoFlowChoice("web");
                    }}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-deep px-4 py-3 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-navy"
                  >
                    Finalement, j'ai des photos
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!leadId) {
                        setError("Lead introuvable. Revenez à l'étape précédente puis réessayez.");
                        return;
                      }
                      setError(null);
                      try {
                        setIsSubmitting(true);

                      // 1) Mettre à jour le statut photos côté tunnel
                        await updateLead(leadId, { photosStatus: "PENDING" });

                      // 2) S'assurer qu'un lead existe dans le Back Office
                      const boLeadId = await ensureBackofficeLeadId();

                      if (boLeadId) {
                        // 3) Déclencher l'email MINOU "LEAD_PHOTOS_LATER"
                        try {
                          await sendBackofficePhotoReminder(boLeadId);
                        } catch (emailErr) {
                          console.warn("Erreur lors de l'envoi de l'email de relance photos:", emailErr);
                        }
                      } else {
                        console.warn(
                          "Impossible de synchroniser avec le Back Office pour la relance photos (boLeadId manquant)."
                        );
                      }

                        router.push("/devis-gratuits/merci");
                      } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : "Erreur lors de l'envoi de l'email.";
                        setError(message);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-xl border border-surface-3 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Envoi en cours..." : "Recevoir un email pour finaliser plus tard"}
                  </button>
                  <button
                    type="button"
                    onClick={handleNoInventory}
                    className="inline-flex items-center justify-center rounded-xl border border-surface-3 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300"
                  >
                    Continuer sans photos (devis approximatifs)
                  </button>
                </div>
              </div>
            )}

            {/* Contenu existant : seulement si l'utilisateur a choisi le flow WEB */}
            {photoFlowChoice === "web" && (
              <>
            {localUploadFiles.length === 0 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-brand-navy">
                    Ajoutez vos photos
                </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    4 photos par pièce suffisent
                  </p>
                    </div>

                {/* Aide minimaliste */}
                <details className="group max-w-2xl mx-auto rounded-xl border border-surface-3 bg-white p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                    <span>Que photographier ?</span>
                    <span className="text-slate-400 transition-transform group-open:rotate-180">
                      ▼
                    </span>
                  </summary>
                  <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                    <p><strong>Chaque pièce :</strong> vue générale + 2 angles</p>
                    <p><strong>Objets volumineux :</strong> piano, coffre-fort, frigo américain</p>
                    <p><strong>Accès :</strong> escaliers, ascenseur, couloir étroit</p>
                  </div>
                </details>
              </div>
            )}


            {/* Mode photos maintenant : zone d'upload + analyse */}
            {photoFlowChoice === "web" && (
              <>
                <div className="space-y-3">
                  {/* Sur mobile: caméra intégrée comme chemin principal.
                      En cas de refus / non support ou si l'utilisateur choisit explicitement,
                      on bascule sur l'upload classique. */}
                  {isCoarsePointer && !cameraUnavailable && !showUploadOnMobile && (
                    <>
                      <CameraCapture
                        maxPhotos={48}
                        onFilesChange={(files) => {
                          if (files.length) {
                            addLocalFiles(files);
                          }
                        }}
                        onUnavailable={() => {
                          setCameraUnavailable(true);
                        }}
                      />
                      <p className="text-[11px] text-slate-400">
                        Problème avec la caméra ou vous préférez utiliser vos photos
                        déjà présentes dans la galerie ?{" "}
                        <button
                          type="button"
                          onClick={() => setShowUploadOnMobile(true)}
                          className="font-semibold text-brand-spark underline underline-offset-2"
                        >
                          Importer depuis la galerie
                        </button>
                        .
                      </p>
                    </>
                  )}

                  {/* Desktop, ou fallback si la caméra n'est pas disponible / refusée,
                     ou si l'utilisateur a choisi d'utiliser la galerie sur mobile. */}
                  {(!isCoarsePointer || cameraUnavailable || showUploadOnMobile) && (
                    <>
                  <div
                    className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-spark/40 bg-surface-1 px-4 py-8 text-center transition hover:border-brand-spark/60 hover:bg-brand-spark/5"
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
                    <p className="text-sm font-medium text-text-0">
                          Glissez vos photos ici ou cliquez pour sélectionner des
                          fichiers.
                    </p>
                    <p className="mt-2 text-[11px] text-text-1">
                          Formats acceptés : photos standard de smartphone (JPG, JPEG,
                          PNG, WEBP, HEIC, HEIF).
                    </p>
                    <p className="mt-1 text-[11px] text-text-2">
                          Idéal : 4 photos par pièce (vue générale, deux angles,
                          détails).
                    </p>
                  </div>
                    </>
                  )}
                      </div>

                {/* Aperçu des photos sélectionnées + bouton d'analyse (caméra OU upload) */}
                  {localUploadFiles.length > 0 && (
                    <div className="space-y-2 rounded-2xl border border-surface-3 bg-surface-1 p-3 text-xs">
                      <p className="text-xs font-semibold text-slate-700">
                        {localUploadFiles.length} photo{localUploadFiles.length > 1 ? 's' : ''} sélectionnée{localUploadFiles.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {localUploadFiles.map((item) => {
                          const isImage = item.file.type.startsWith("image/");
                          const borderClass =
                            item.status === "uploaded"
                              ? "border-brand-spark"
                              : item.status === "uploading"
                              ? "border-brand-deep"
                              : item.status === "error"
                              ? "border-rose-400"
                              : "border-surface-3";

                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`relative h-14 w-14 overflow-hidden rounded-xl border-2 ${borderClass} bg-surface-1 moverz-transition-fast hover:scale-105`}
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
                                    <span className="text-[10px] text-slate-600">
                                      FILE
                                    </span>
                              )}
                              <span className="absolute right-0 top-0 rounded-bl-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
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
                          className="inline-flex items-center justify-center rounded-xl bg-brand-spark px-5 py-2.5 text-sm font-semibold text-brand-navy shadow-md shadow-brand-spark/40 transition hover:bg-brand-spark/80 hover:ring-2 hover:ring-brand-spark/40 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUploadingPhotos || isAnalyzing
                            ? "Analyse en cours…"
                            : "Analyser mes photos"}
                        </button>
                      </div>
                    </div>
                      )}
              </>
            )}

            {photoFlowChoice === "web" &&
              (analysisProcesses || isUploadingPhotos || isAnalyzing) && (
                <div className="space-y-3 rounded-2xl bg-slate-950/80 p-3 text-xs text-slate-200 ring-1 ring-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Aperçu de votre inventaire par pièce
                </p>
                  {isDev && (
                    <div className="inline-flex items-center gap-0.5 rounded-full bg-slate-900/80 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setInventoryLayoutVariant("list")}
                        className={`rounded-full px-2 py-0.5 ${
                          inventoryLayoutVariant === "list"
                            ? "bg-brand-spark text-brand-navy font-semibold"
                            : "text-slate-300 hover:text-brand-spark"
                        }`}
                      >
                        Liste
                      </button>
                      <button
                        type="button"
                        onClick={() => setInventoryLayoutVariant("icons")}
                        className={`rounded-full px-2 py-0.5 ${
                          inventoryLayoutVariant === "icons"
                            ? "bg-brand-spark text-brand-navy font-semibold"
                            : "text-slate-300 hover:text-brand-spark"
                        }`}
                      >
                        Icônes
                      </button>
                    </div>
                  )}
                </div>
                {analysisStartedAt && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400">
                      Temps d’analyse (≈ 3 s / photo){" "}
                      {isUploadingPhotos || isAnalyzing ? "en cours" : "total"} :{" "}
                      {(analysisElapsedMs / 1000).toFixed(1)} s
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-deep transition-all"
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
                {inventoryVolume.total != null && (
                  <p className="text-[11px] text-slate-300">
                    Volume estimé des objets (hors éléments retirés) :{" "}
                    <span className="font-semibold text-brand-spark">
                      {inventoryVolume.total.toFixed(1)} m³
                    </span>
                  </p>
                )}
                {analysisProcesses && inventoryLayoutVariant === "list" && (
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
                          {proc.rooms.map((room) => {
                            const inventoryForRoomRaw =
                              process2Inventory?.filter(
                                (row) =>
                                  row.roomLabel === room.label &&
                                  row.roomType === room.roomType
                              ) ?? [];

                            const inventoryForRoom = inventoryForRoomRaw;

                            const visibleInventory = inventoryForRoom.filter(
                              (row) => !excludedInventoryIds.includes(row.id)
                            );

                            const totalItems =
                              visibleInventory.length > 0
                                ? visibleInventory.reduce(
                                    (acc, it) => acc + it.quantity,
                                    0
                                  )
                                : room.items.reduce(
                                    (acc, it) => acc + it.quantity,
                                    0
                                  );

                            const roomContent = (
                              <div className="mt-2 space-y-2">
                                {/* Vignettes des photos de la pièce */}
                                {room.photoIds.length > 0 && (
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

                                {/* Inventaire détaillé pour la pièce */}
                                {inventoryForRoom.length > 0 && (
                                  <div className="mt-1 rounded-lg bg-slate-950/80 p-2">
                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                      Inventaire détecté
                                    </p>
                                    <div className="space-y-1">
                                      {inventoryForRoom.map((row, idx) => {
                                        const isExcluded =
                                          excludedInventoryIds.includes(row.id);

                                        return (
                                        <div
                                            key={row.id}
                                            className={`space-y-1 rounded-md px-1 py-1.5 text-[11px] ${
                                              isExcluded
                                                ? "bg-slate-900/40 text-slate-500 line-through opacity-60"
                                                : "bg-slate-900/70 text-slate-200"
                                            }`}
                                          >
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="truncate font-medium">
                                                {row.itemLabel}
                                              </span>
                                                <span className="text-[10px] text-slate-400">
                                                  {typeof row.widthCm === "number" &&
                                                  typeof row.depthCm === "number" &&
                                                  typeof row.heightCm === "number"
                                                    ? `${Math.round(
                                                        row.widthCm
                                                      )}×${Math.round(
                                                        row.depthCm
                                                      )}×${Math.round(
                                                        row.heightCm
                                                      )} cm`
                                                    : "Mesures : —"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 self-start sm:self-auto">
                                                <span className="shrink-0 text-right text-slate-300">
                                                  × {row.quantity}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingInventoryId(row.id);
                                                    setEditingInventoryDraft({
                                                      itemLabel: row.itemLabel,
                                                      quantity: String(row.quantity ?? 1),
                                                      volumeM3:
                                                        typeof row.volumeM3 === "number"
                                                          ? String(row.volumeM3)
                                                          : "",
                                                      valueEstimateEur:
                                                        typeof row.valueEstimateEur ===
                                                        "number"
                                                          ? String(row.valueEstimateEur)
                                                          : "",
                                                    });
                                                  }}
                                                  className="rounded-full border border-slate-600 px-2 py-0.5 text-[9px] text-slate-300 hover:border-brand-spark hover:text-brand-spark"
                                                >
                                                  Modifier
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setExcludedInventoryIds((prev) =>
                                                        prev.includes(row.id)
                                                          ? prev.filter(
                                                            (id) => id !== row.id
                                                            )
                                                          : [...prev, row.id]
                                                    )
                                                  }
                                                  className="rounded-full border border-slate-600 px-2 py-0.5 text-[9px] text-slate-300 hover:border-rose-400 hover:text-rose-300"
                                                >
                                                  {isExcluded ? "Rétablir" : "Retirer"}
                                                </button>
                            </div>
                        </div>
                                            <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="truncate">
                                                {typeof row.volumeNuM3 === "number" &&
                                              typeof row.volumeM3 === "number"
                                                ? `Volume nu : ${row.volumeNuM3.toFixed(
                                                    2
                                                  )} m³ • Emballé : ${row.volumeM3.toFixed(
                                                    2
                                                  )} m³`
                                                : typeof row.volumeM3 === "number"
                                                ? `Volume : ${row.volumeM3.toFixed(
                                                    2
                                                  )} m³`
                                                : "Volume : —"}
                                              </span>
                                              <span className="truncate text-slate-300 sm:text-right">
                                                {typeof row.valueEstimateEur === "number"
                                                  ? `Valeur estimée : ${Math.round(
                                                    row.valueEstimateEur
                                                  )} €`
                                                : ""}
                                            </span>
                                          </div>
                                          {row.dependencies &&
                                            row.dependencies.length > 0 && (
                                              <div className="mt-0.5 space-y-0.5 text-[9px] text-slate-500">
                                                {row.dependencies.map((dep) => (
                                                    <div
                                                      key={dep.id}
                                                      className="flex justify-between gap-2"
                                                    >
                                                    <span className="truncate">
                                                      dont {dep.label} × {dep.quantity}
                                                    </span>
                                                      {typeof dep.volumeM3 ===
                                                        "number" && (
                                                      <span className="shrink-0 text-right">
                                                        {dep.volumeM3.toFixed(2)} m³
                                                      </span>
                                                    )}
                      </div>
                    ))}
                  </div>
                                            )}
                                          {row.packagingReason && (
                                            <p className="text-[9px] text-slate-500">
                                              {(() => {
                                                if (
                                                  typeof row.volumeNuM3 === "number" &&
                                                  typeof row.volumeM3 === "number"
                                                ) {
                                                  const delta =
                                                    row.volumeM3 - row.volumeNuM3;
                                                  const deltaStr =
                                                    delta > 0
                                                      ? `+${delta.toFixed(2)} m³`
                                                      : `${delta.toFixed(2)} m³`;
                                                  return `Emballage : ${row.packagingReason} (${deltaStr})`;
                                                }
                                                return `Emballage : ${row.packagingReason}`;
                                              })()}
                                            </p>
                                          )}
                                          {row.valueJustification && (
                                            <p className="text-[9px] text-slate-500">
                                              {row.valueJustification}
                                            </p>
                                          )}
                        </div>
                                      );
                                    })}
                                    </div>
                                  </div>
                                )}

                                {/* Ajout manuel d'un meuble */}
                                <div className="mt-2 space-y-1 rounded-lg bg-slate-950/60 p-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Ajouter un meuble
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      type="text"
                                      value={newItemDrafts[room.roomId]?.query ?? ""}
                                      onChange={(e) =>
                                        setNewItemDrafts((prev) => ({
                                          ...prev,
                                          [room.roomId]: {
                                            query: e.target.value,
                                            quantity:
                                              prev[room.roomId]?.quantity ?? "1",
                                          },
                                        }))
                                      }
                                      placeholder="Ex: canapé, armoire..."
                                      className="w-40 flex-1 min-w-[120px] rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-brand-spark focus:outline-none focus:ring-1 focus:ring-brand-spark/40"
                                    />
                                    <input
                                      type="number"
                                      min={1}
                                      value={newItemDrafts[room.roomId]?.quantity ?? "1"}
                                      onChange={(e) =>
                                        setNewItemDrafts((prev) => ({
                                          ...prev,
                                          [room.roomId]: {
                                            query: prev[room.roomId]?.query ?? "",
                                            quantity: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-14 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const draft = newItemDrafts[room.roomId];
                                        const query = draft?.query?.trim();
                                        if (!query) return;
                                        const quantity = Math.max(
                                          1,
                                          Number(draft.quantity || "1") || 1
                                        );
                                        const lowerQuery = query.toLowerCase();
                                        const template = KNOWN_ITEMS.find((it) =>
                                          it.label.toLowerCase().includes(lowerQuery)
                                        );
                                        const id = `user-${room.roomId}-${Date.now()}-${Math.random()
                                          .toString(36)
                                          .slice(2)}`;
                                        setProcess2Inventory((prev) => {
                                          const base = prev ?? [];
                                          return [
                                            ...base,
                                            {
                                              id,
                                              roomType: room.roomType,
                                              roomLabel: room.label,
                                              itemLabel:
                                                template?.label ?? query,
                                              category: "MANUAL",
                                              source: "manual",
                                              quantity,
                                              widthCm: null,
                                              depthCm: null,
                                              heightCm: null,
                                              volumeM3: template?.volumeM3 ?? null,
                                              volumeNuM3: template?.volumeM3 ?? null,
                                              valueEstimateEur: null,
                                              valueJustification: null,
                                              fragile: false,
                                              packagingFactor: null,
                                              packagingReason: null,
                                              dependencies: [],
                                            },
                                          ];
                                        });
                                        setNewItemDrafts((prev) => ({
                                          ...prev,
                                          [room.roomId]: { query: "", quantity: "1" },
                                        }));
                                      }}
                                      className="rounded-md bg-sky-500 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
                                    >
                                      Ajouter
                                    </button>
                            </div>
                                  {newItemDrafts[room.roomId]?.query && (
                                    <div className="mt-1 space-y-0.5 text-[10px] text-slate-400">
                                      {KNOWN_ITEMS.filter((it) =>
                                        it.label
                                          .toLowerCase()
                                          .includes(
                                            newItemDrafts[room.roomId].query.toLowerCase()
                                          )
                                      )
                                        .slice(0, 5)
                                        .map((it) => (
                                          <button
                                            key={it.label}
                                            type="button"
                                            onClick={() =>
                                              setNewItemDrafts((prev) => ({
                                                ...prev,
                                                [room.roomId]: {
                                                  query: it.label,
                                                  quantity:
                                                    prev[room.roomId]?.quantity ?? "1",
                                                },
                                              }))
                                            }
                                            className="block w-full truncate rounded-md px-2 py-0.5 text-left hover:bg-slate-800"
                                          >
                                            {it.label}
                                          </button>
                          ))}
                        </div>
                                  )}
                      </div>
                    </div>
                            );

                            return (
                              <div
                                key={room.roomId}
                                className="space-y-2 rounded-xl bg-slate-900/70 p-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[11px] font-semibold text-slate-50">
                                    {room.label}
                                  </p>
                                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                                    {totalItems} éléments
                                  </span>
                                </div>
                                {roomContent}
                    </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {analysisProcesses && inventoryLayoutVariant === "icons" && (
                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-slate-50">
                          Vue icônes par pièce
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Basée sur l&apos;inventaire IA (Process 2)
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {process2Inventory?.reduce(
                          (sum, row) =>
                            excludedInventoryIds.includes(row.id)
                              ? sum
                              : sum + (row.quantity || 1),
                          0
                        ) ?? 0}{" "}
                        éléments
                      </span>
                    </div>

                    {inventoryRooms.length > 1 && (
                      <div className="flex flex-wrap gap-1 rounded-full bg-slate-900/80 p-1 text-[11px]">
                        {inventoryRooms.map((room) => {
                          const isActive = activeInventoryRoomId === room.roomKey;
                          return (
                            <button
                              key={room.roomKey}
                              type="button"
                              onClick={() => setActiveInventoryRoomId(room.roomKey)}
                              className={`rounded-full px-3 py-1 ${
                                isActive
                                  ? "bg-sky-500 text-slate-950 font-semibold"
                                  : "text-slate-200 hover:bg-slate-800"
                              }`}
                            >
                              {room.roomLabel}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {inventoryRooms.length === 1 && (
                      <p className="text-[11px] font-semibold text-slate-100">
                        {inventoryRooms[0]?.roomLabel}
                      </p>
                    )}

                    {activeInventoryRoomId && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {process2Inventory
                            ?.filter((row) => {
                              const key = `${row.roomType}__${row.roomLabel}`;
                              return key === activeInventoryRoomId;
                            })
                            .map((row) => {
                              const isExcluded = excludedInventoryIds.includes(row.id);
                              const icon = getInventoryItemIcon(row);
                              return (
                                <button
                                  key={row.id}
                                  type="button"
                                  onClick={() => {
                                    setEditingInventoryId(row.id);
                                    setEditingInventoryDraft({
                                      itemLabel: row.itemLabel,
                                      quantity: String(row.quantity ?? 1),
                                      volumeM3:
                                        typeof row.volumeM3 === "number"
                                          ? String(row.volumeM3)
                                          : "",
                                      valueEstimateEur:
                                        typeof row.valueEstimateEur === "number"
                                          ? String(row.valueEstimateEur)
                                          : "",
                                    });
                                  }}
                                  className={`relative flex flex-col items-center justify-between gap-1 rounded-xl border px-2 py-2 text-[11px] ${
                                    isExcluded
                                      ? "border-slate-700 bg-slate-900/50 text-slate-500 opacity-60"
                                      : "border-slate-600 bg-slate-900/80 text-slate-100"
                                  }`}
                                >
                                  <span className="text-xl">{icon}</span>
                                  <span className="line-clamp-2 text-center">
                                    {row.itemLabel}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    × {row.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExcludedInventoryIds((prev) =>
                                        prev.includes(row.id)
                                          ? prev.filter((id) => id !== row.id)
                                          : [...prev, row.id]
                                      );
                                    }}
                                    className="absolute right-1 top-1 rounded-full bg-slate-900/80 px-1 text-[9px] text-slate-300 hover:bg-rose-500 hover:text-white"
                                  >
                                    {isExcluded ? "↺" : "✕"}
                                  </button>
                                </button>
                              );
                            })}
                        </div>

                        <div className="mt-2 space-y-1 rounded-lg bg-slate-950/60 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Ajouter un meuble
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={
                                activeInventoryRoomId
                                  ? newItemDrafts[activeInventoryRoomId]?.query ?? ""
                                  : ""
                              }
                              onChange={(e) =>
                                activeInventoryRoomId &&
                                setNewItemDrafts((prev) => ({
                                  ...prev,
                                  [activeInventoryRoomId]: {
                                    query: e.target.value,
                                    quantity:
                                      prev[activeInventoryRoomId]?.quantity ?? "1",
                                  },
                                }))
                              }
                              placeholder="Ex: canapé, armoire..."
                              className="w-40 flex-1 min-w-[120px] rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                            />
                            <input
                              type="number"
                              min={1}
                              value={
                                activeInventoryRoomId
                                  ? newItemDrafts[activeInventoryRoomId]?.quantity ??
                                    "1"
                                  : "1"
                              }
                              onChange={(e) =>
                                activeInventoryRoomId &&
                                setNewItemDrafts((prev) => ({
                                  ...prev,
                                  [activeInventoryRoomId]: {
                                    query: prev[activeInventoryRoomId]?.query ?? "",
                                    quantity: e.target.value,
                                  },
                                }))
                              }
                              className="w-14 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!activeInventoryRoomId) return;
                                const draft =
                                  newItemDrafts[activeInventoryRoomId] ?? null;
                                const query = draft?.query?.trim();
                                if (!query) return;
                                const quantity = Math.max(
                                  1,
                                  Number(draft.quantity || "1") || 1
                                );
                                const lowerQuery = query.toLowerCase();
                                const template = KNOWN_ITEMS.find((it) =>
                                  it.label.toLowerCase().includes(lowerQuery)
                                );
                                const id = `user-${activeInventoryRoomId}-${Date.now()}-${Math.random()
                                  .toString(36)
                                  .slice(2)}`;
                                const roomMeta = inventoryRooms.find(
                                  (r) => r.roomKey === activeInventoryRoomId
                                );
                                if (!roomMeta) return;
                                setProcess2Inventory((prev) => {
                                  const base = prev ?? [];
                                  return [
                                    ...base,
                                    {
                                      id,
                                      roomType: roomMeta.roomType,
                                      roomLabel: roomMeta.roomLabel,
                                      itemLabel: template?.label ?? query,
                                      category: "MANUAL",
                                      source: "manual",
                                      quantity,
                                      widthCm: null,
                                      depthCm: null,
                                      heightCm: null,
                                      volumeM3: template?.volumeM3 ?? null,
                                      volumeNuM3: template?.volumeM3 ?? null,
                                      valueEstimateEur: null,
                                      valueJustification: null,
                                      fragile: false,
                                      packagingFactor: null,
                                      packagingReason: null,
                                      dependencies: [],
                                    },
                                  ];
                                });
                                setNewItemDrafts((prev) => ({
                                  ...prev,
                                  [activeInventoryRoomId]: {
                                    query: "",
                                    quantity: "1",
                                  },
                                }));
                              }}
                              className="rounded-md bg-sky-500 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
                            >
                              Ajouter
                            </button>
                          </div>
                          {activeInventoryRoomId &&
                            newItemDrafts[activeInventoryRoomId]?.query && (
                              <div className="mt-1 space-y-0.5 text-[10px] text-slate-400">
                                {KNOWN_ITEMS.filter((it) =>
                                  it.label
                                    .toLowerCase()
                                    .includes(
                                      newItemDrafts[
                                        activeInventoryRoomId
                                      ].query.toLowerCase()
                                    )
                                )
                                  .slice(0, 5)
                                  .map((it) => (
                                    <button
                                      key={it.label}
                                      type="button"
                                      onClick={() =>
                                        setNewItemDrafts((prev) => ({
                                          ...prev,
                                          [activeInventoryRoomId]: {
                                            query: it.label,
                                            quantity:
                                              prev[activeInventoryRoomId]
                                                ?.quantity ?? "1",
                                          },
                                        }))
                                      }
                                      className="block w-full truncate rounded-md px-2 py-0.5 text-left hover:bg-slate-800"
                                    >
                                      {it.label}
                                    </button>
                                  ))}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            {photoFlowChoice === "web" &&
              process2Inventory &&
              process2Inventory.length > 0 && (
                <div className="mt-4 space-y-2 rounded-2xl bg-emerald-500/10 p-3 text-xs text-emerald-50 ring-1 ring-emerald-400/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    Votre dossier est prêt
                  </p>
                  <p>
                    Nous avons généré automatiquement{" "}
                    <span className="font-semibold">
                      l’inventaire détaillé, la déclaration de valeur et un
                      dossier complet
                    </span>{" "}
                    à partir de vos photos.
                  </p>
                  <p>
                    Un email de confirmation va vous être envoyé à{" "}
                    <span className="font-semibold">
                      {form.email || "votre adresse email"}
                    </span>
                    . Dès que vous l’aurez validé, nous pourrons transmettre
                    votre demande aux déménageurs.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] text-emerald-100">
                      Adresse incorrecte&nbsp;? Vous pouvez revenir corriger vos
                      coordonnées.
                    </p>
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20"
                    >
                      Corriger mon adresse email
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-emerald-100">
                      Quand tout vous semble bon, vous pouvez terminer : votre
                      dossier partira vers les déménageurs une fois l’email
                      confirmé.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!process2Inventory || process2Inventory.length === 0) {
                          router.push("/devis-gratuits/merci");
                          return;
                        }

                        try {
                          if (backofficeLeadId) {
                            let confirmationLeadId = backofficeLeadId;
                            try {
                              const payload: SaveBackofficeInventoryPayload = {
                                items: process2Inventory,
                                excludedInventoryIds,
                              };
                              if (roomPhotosForBackoffice && roomPhotosForBackoffice.length > 0) {
                                payload.photosByRoom = roomPhotosForBackoffice;
                              }

                              await saveBackofficeInventory(backofficeLeadId, payload);
                            } catch (err) {
                              // Cas particulier : le lead Back Office a été supprimé ou n'existe plus.
                              if (
                                err instanceof Error &&
                                err.message === "LEAD_NOT_FOUND"
                              ) {
                                console.warn(
                                  "Lead Back Office introuvable lors de l'enregistrement de l'inventaire, on recrée un lead et on retente une fois."
                                );
                                // On force la création d'un nouveau lead Back Office
                                const newId = await ensureBackofficeLeadId({
                                  forceNew: true,
                                });
                                if (newId) {
                                  confirmationLeadId = newId;
                                  const payload: SaveBackofficeInventoryPayload = {
                                    items: process2Inventory,
                                    excludedInventoryIds,
                                  };
                                  if (
                                    roomPhotosForBackoffice &&
                                    roomPhotosForBackoffice.length > 0
                                  ) {
                                    payload.photosByRoom = roomPhotosForBackoffice;
                                  }

                                  await saveBackofficeInventory(newId, payload);
                                }
                              } else {
                                console.error(
                                  "Erreur lors de l'enregistrement de l'inventaire dans le Back Office:",
                                  err
                                );
                              }
                            }

                            // Déclencher l'email de confirmation APRÈS la sauvegarde inventaire
                            // pour que les PJ (CSV + déclaration) soient présentes.
                            try {
                              await requestBackofficeConfirmation(confirmationLeadId);
                            } catch (confirmErr) {
                              console.warn("Email de confirmation non envoyé (photos now):", confirmErr);
                            }
                          }
                        } finally {
                          // Quoi qu'il arrive, on envoie l'utilisateur vers la page de remerciement.
                          router.push("/devis-gratuits/merci");
                        }
                      }}
                      className="inline-flex items-center rounded-full bg-brand-deep px-4 py-1.5 text-[11px] font-semibold text-white shadow-brand hover:bg-brand-navy hover:ring-2 hover:ring-brand-spark/30"
                    >
                      Terminer et envoyer mon dossier
                    </button>
                  </div>
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

                {/* Bouton retour vers les options (en bas) */}
                <button
                  type="button"
                  onClick={() => {
                    setHasPhotosAnswer(null);
                    setPhotoFlowChoice("none");
                  }}
                  className="mx-auto flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 moverz-transition-fast"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Choisir un autre mode d'envoi
                </button>
            </>
            )}
          </div>
        </section>
      )}

      {/* Modale édition d'un article d'inventaire */}
      {editingInventoryId && editingInventoryDraft && process2Inventory && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-slate-900 p-4 text-xs text-slate-100 shadow-xl ring-1 ring-slate-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Modifier l&apos;objet
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingInventoryId(null);
                  setEditingInventoryDraft(null);
                }}
                className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:border-slate-400"
              >
                Fermer
              </button>
    </div>
            {(() => {
              const row = process2Inventory.find(
                (r) => r.id === editingInventoryId
              );
              if (!row) {
                return (
                  <p className="text-[11px] text-rose-300">
                    Impossible de retrouver cet objet.
                  </p>
                );
              }
              return (
                <>
                  <p className="text-[11px] text-slate-300">
                    Pièce :{" "}
                    <span className="font-semibold">{row.roomLabel}</span>
                  </p>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-100">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editingInventoryDraft.itemLabel}
                        onChange={(e) =>
                          setEditingInventoryDraft((prev) =>
                            prev ? { ...prev, itemLabel: e.target.value } : prev
                          )
                        }
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[11px] font-medium text-slate-100">
                          Quantité
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={editingInventoryDraft.quantity}
                          onChange={(e) =>
                            setEditingInventoryDraft((prev) =>
                              prev ? { ...prev, quantity: e.target.value } : prev
                            )
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-[11px] font-medium text-slate-100">
                          Volume emballé (m³)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editingInventoryDraft.volumeM3}
                          onChange={(e) =>
                            setEditingInventoryDraft((prev) =>
                              prev ? { ...prev, volumeM3: e.target.value } : prev
                            )
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                        />
                      </div>
                    </div>
                    {(() => {
                      const row = process2Inventory.find(
                        (r) => r.id === editingInventoryId
                      );
                      if (!row) return null;
                      return (
                        <div className="space-y-1">
                          {typeof row.volumeNuM3 === "number" && (
                            <p className="text-[10px] text-slate-400">
                              Volume nu IA (référence) :{" "}
                              <span className="font-semibold">
                                {row.volumeNuM3.toFixed(2)} m³
                              </span>
                            </p>
                          )}
                          {row.dependencies && row.dependencies.length > 0 && (
                            <div className="mt-1 space-y-0.5 rounded-lg bg-slate-950/70 p-2 text-[10px] text-slate-300">
                              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Détail des composants
                              </p>
                              {row.dependencies.map((dep) => (
                                <div
                                  key={dep.id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="truncate">
                                    {dep.label} × {dep.quantity}
                                  </span>
                                  <span className="shrink-0 text-right text-slate-400">
                                    {typeof dep.volumeM3 === "number"
                                      ? `${dep.volumeM3.toFixed(2)} m³`
                                      : "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-100">
                        Valeur estimée (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="10"
                        value={editingInventoryDraft.valueEstimateEur}
                        onChange={(e) =>
                          setEditingInventoryDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  valueEstimateEur: e.target.value,
                                }
                              : prev
                          )
                        }
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInventoryId(null);
                        setEditingInventoryDraft(null);
                      }}
                      className="rounded-full border border-slate-600 px-3 py-1 text-[11px] text-slate-200 hover:border-slate-400"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingInventoryDraft) return;
                        const qty = Math.max(
                          1,
                          Number(editingInventoryDraft.quantity || "1") || 1
                        );
                        const vol =
                          editingInventoryDraft.volumeM3.trim() === ""
                            ? null
                            : Number(
                                editingInventoryDraft.volumeM3.replace(",", ".")
                              );
                        const val =
                          editingInventoryDraft.valueEstimateEur.trim() === ""
                            ? null
                            : Number(
                                editingInventoryDraft.valueEstimateEur.replace(
                                  ",",
                                  "."
                                )
                              );
                        setProcess2Inventory((prev) =>
                          (prev ?? []).map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  itemLabel:
                                    editingInventoryDraft.itemLabel || r.itemLabel,
                                  quantity: qty,
                                  volumeM3:
                                    vol != null && Number.isFinite(vol)
                                      ? vol
                                      : r.volumeM3,
                                  valueEstimateEur:
                                    val != null && Number.isFinite(val)
                                      ? val
                                      : r.valueEstimateEur,
                                }
                              : r
                          )
                        );
                        setEditingInventoryId(null);
                        setEditingInventoryDraft(null);
                      }}
                      className="rounded-full bg-sky-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-sm shadow-sky-500/40 hover:bg-sky-400"
                    >
                      Enregistrer
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Debug dev only : bouton discret pour aller direct à l'étape 4 avec photos.
          En dev, si aucun lead n'existe encore, on en crée un minimal avant de sauter à l'étape 4. */}
      {isDev && (
        <button
          type="button"
          onClick={async () => {
            try {
              if (!leadId) {
                const payload: LeadTunnelCreatePayload = {
                  primaryChannel: "web",
                  firstName: form.firstName || "Debug",
                  lastName: form.lastName || null,
                  email: form.email || null,
                  phone: form.phone || null,
                  source: source ?? null,
                };
                const created = await createLead(payload);
                setLeadId(created.id);
                // On synchronise aussi immédiatement un lead dans le Back Office
                await ensureBackofficeLeadId({ forceNew: true });
              }
              setHasPhotosAnswer("yes");
              setPhotoFlowChoice("web");
              setCurrentStep(4 as StepId);
              setMaxReachedStep(4 as StepId);
            } catch (e) {
              console.error("Erreur création lead pour debug step 4:", e);
              setError(
                "Impossible de créer un dossier pour le debug. Vérifie le serveur et réessaie."
              );
            }
          }}
          className="pointer-events-auto fixed bottom-3 right-3 z-50 rounded-full border border-surface-3 bg-white/80 px-3 py-1 text-[10px] font-medium text-slate-600 shadow-soft backdrop-blur hover:border-slate-300"
        >
          Aller step 4 (debug)
        </button>
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

