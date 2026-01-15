// Client HTTP du tunnel pour gérer les LeadTunnel via les routes Next.js internes (/api/leads).

import {
  applyPackagingRules,
  enrichItemsWithBusinessRules,
} from "@/lib/inventory/businessRules";

export interface LeadTunnelCreatePayload {
  primaryChannel?: "web" | "whatsapp";
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
}

export interface LeadTunnelUpdatePayload {
  formCompletionStatus?: "none" | "partial" | "complete";
  photoStatus?: "none" | "planned_whatsapp" | "received_whatsapp" | "received_web";
  photosStatus?: "NONE" | "PENDING" | "UPLOADED";
  // Projet & estimation
  originPostalCode?: string | null;
  originCity?: string | null;
  originAddress?: string | null;
  destinationPostalCode?: string | null;
  destinationCity?: string | null;
  destinationAddress?: string | null;
  movingDate?: string | null;
  details?: string | null;

  housingType?:
    | "studio"
    | "t1"
    | "t2"
    | "t3"
    | "t4"
    | "t5"
    | "house"
    | "house_1floor"
    | "house_2floors"
    | "house_3floors"
    | null;
  surfaceM2?: number | null;
  density?: "light" | "normal" | "dense" | null;
  formule?: "ECONOMIQUE" | "STANDARD" | "PREMIUM" | null;
  volumeM3?: number | null;
  distanceKm?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;

  ensureLinkingToken?: boolean;
}

export interface LeadTunnelResponse {
  id: string;
  linkingToken: string | null;
}

async function handleResponse(res: Response): Promise<LeadTunnelResponse> {
  if (!res.ok) {
    // Important: en prod, une 404 peut arriver si le leadId restauré depuis localStorage
    // ne correspond plus à la DB SQLite (redeploy, reset). On veut déclencher le fallback
    // de recréation côté UI (qui cherche "LeadTunnel introuvable").
    if (res.status === 404) {
      throw new Error("LeadTunnel introuvable");
    }
    let errorMessage = "Erreur lors de la communication avec le serveur.";
    try {
      const data = await res.json();
      if (typeof data?.error === "string") {
        errorMessage = data.error;
      } else if (typeof data?.message === "string") {
        errorMessage = data.message;
      }
    } catch {
      // garder message générique
    }
    throw new Error(errorMessage);
  }

  const data = (await res.json()) as { id: string; linkingToken?: string | null };

  if (!data?.id) {
    throw new Error("Réponse invalide du serveur (id manquant).");
  }

  return {
    id: data.id,
    linkingToken: data.linkingToken ?? null,
  };
}

export async function createLead(
  payload: LeadTunnelCreatePayload
): Promise<LeadTunnelResponse> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateLead(
  id: string,
  payload: LeadTunnelUpdatePayload
): Promise<LeadTunnelResponse> {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function ensureLinkingToken(id: string): Promise<LeadTunnelResponse> {
  return updateLead(id, {
    ensureLinkingToken: true,
    photoStatus: "planned_whatsapp",
  });
}

export interface UploadedPhoto {
  id: string;
  url: string | null;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadPhotosResult {
  success: UploadedPhoto[];
  errors: { originalFilename: string; reason: string }[];
}

export async function uploadLeadPhotos(
  leadId: string,
  files: File[]
): Promise<UploadPhotosResult> {
  const formData = new FormData();
  formData.append("leadId", leadId);
  files.forEach((file) => {
    formData.append("files", file);
  });

  const res = await fetch("/api/uploads/photos", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errorMessage = "Erreur lors de l'upload des photos.";
    try {
      const data = await res.json();
      if (typeof data?.error === "string") {
        errorMessage = data.error;
      }
    } catch {
      // garder message générique
    }
    throw new Error(errorMessage);
  }

  const data = (await res.json()) as UploadPhotosResult;
  return {
    success: data.success ?? [],
    errors: data.errors ?? [],
  };
}

// ============================================
// TUNNEL EVENTS TRACKING (Backoffice /public/tunnel-events)
// ============================================

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL n'est pas défini. Configure cette variable d'environnement pour pointer vers le Back Office (ex: https://moverz-backoffice..., sans suffixe /api)."
    );
  }

  // Tolérance: certains environnements configurent NEXT_PUBLIC_API_URL avec un suffixe (/api, /public).
  // Le tunnel utilise ensuite /public/leads..., donc on normalise pour éviter /api/public/leads...
  let normalized = baseUrl.trim().replace(/\/+$/, "");
  normalized = normalized.replace(/\/(api|public)$/i, "");
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

type LogicalStep = "ENTRY" | "CONTACT" | "PROJECT" | "RECAP" | "THANK_YOU" | "PHOTOS";

export interface TrackTunnelEventInput {
  eventType: string;
  logicalStep?: LogicalStep;
  screenId?: string;
  leadTunnelId?: string;
  backofficeLeadId?: string;
  source?: string;
  email?: string;
  extra?: Record<string, unknown>;
}

function getOrCreateTunnelSessionId(): string {
  if (typeof window === "undefined") {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  const key = "moverz_tunnel_session_id";
  let sessionId = window.localStorage.getItem(key);
  if (!sessionId) {
    sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export async function trackTunnelEvent(input: TrackTunnelEventInput): Promise<void> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const sessionId = getOrCreateTunnelSessionId();

    const payload: Record<string, unknown> = {
      sessionId,
      leadTunnelId: input.leadTunnelId,
      leadId: input.backofficeLeadId,
      source: input.source,
      urlPath:
        typeof window !== "undefined" && window.location
          ? window.location.pathname
          : "/devis-gratuits",
      eventType: input.eventType,
      logicalStep: input.logicalStep,
      screenId: input.screenId,
      timestamp: new Date().toISOString(),
      email: input.email,
      extra: input.extra,
    };

    await fetch(`${API_BASE_URL}/public/tunnel-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      // Important pour les events envoyés juste avant unload
      keepalive: true,
    });
  } catch (error) {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
      // En prod on ne casse jamais le tunnel pour un problème d'analytics
      // eslint-disable-next-line no-console
      console.warn("Failed to track tunnel event", error);
    }
  }
}

// Client HTTP pour communiquer avec le Back Office (routes /public/leads)

// getApiBaseUrl est déjà défini plus haut (section tracking) et réutilisé ici.

export interface CreateLeadPayload {
  // Champs requis (d’après createLeadSchema)
  firstName: string;
  email: string;

  // Champs optionnels
  lastName?: string;
  phone?: string;
  source?: string;
  estimationMethod?: "FORM" | "PHOTO" | "MANUAL_ADMIN";
  status?: "NEW" | "CONTACTED" | "CONVERTED" | "ABANDONED";
}

export async function createBackofficeLead(
  payload: CreateLeadPayload
): Promise<{ id: string }> {
  const API_BASE_URL = getApiBaseUrl();

  const response = await fetch(`${API_BASE_URL}/public/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorData: any = {};
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      try {
        errorData = await response.json();
      } catch {
        const text = await response.text();
        errorData = { rawResponse: text };
      }
    } else {
      const text = await response.text();
      errorData = { rawResponse: text };
    }

    console.error("❌ Erreur création lead:", {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });

    let errorMessage =
      errorData.error ||
      errorData.message ||
      errorData.rawResponse ||
      `Failed to create lead (${response.status})`;

    if (errorData.details && Array.isArray(errorData.details)) {
      try {
        const validationErrors = errorData.details
          .map((d: any) => {
            const pathStr = Array.isArray(d.path)
              ? d.path.join(".")
              : d.path || "unknown";
            return `${pathStr}: ${d.message || d.code || "validation error"}`;
          })
          .join(", ");
        errorMessage = `${errorMessage} - ${validationErrors}`;
      } catch {
        // on garde le message de base
      }
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();

  if (result?.success && result.data?.id) {
    return { id: result.data.id };
  }
  if (result?.id) {
    return { id: result.id };
  }

  throw new Error("Invalid response format from backend");
}

// ============================================
// UPDATE BACKOFFICE LEAD (PATCH)
// ============================================

export interface UpdateBackofficeLeadPayload {
  // Contact
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;

  // Source & Status
  source?: string;
  estimationMethod?: "AI_PHOTO" | "FORM" | "MANUAL_ADMIN";
  status?: "NEW" | "CONTACTED" | "CONVERTED" | "ABANDONED";

  // Adresses (noms Prisma back-office)
  originAddress?: string;
  originCity?: string;
  originPostalCode?: string;
  destAddress?: string;
  destCity?: string;
  destPostalCode?: string;
  destCountryCode?: string;

  // Dates
  movingDate?: string; // ISO date
  dateFlexible?: boolean;

  // Volume & Surface
  surfaceM2?: number;
  estimatedVolume?: number;
  density?: "LIGHT" | "MEDIUM" | "HEAVY";

  // Formule & Prix
  formule?: "ECONOMIQUE" | "STANDARD" | "PREMIUM";
  estimatedPriceMin?: number;
  estimatedPriceAvg?: number;
  estimatedPriceMax?: number;
  estimatedSavingsEur?: number;

  // Détails logement origine
  originHousingType?: string;
  originFloor?: number;
  originElevator?: "OUI" | "NON" | "PARTIEL";
  originFurnitureLift?: string;
  originCarryDistance?: string;
  originParkingAuth?: boolean;

  // Détails logement destination
  destHousingType?: string;
  destFloor?: number;
  destElevator?: "OUI" | "NON" | "PARTIEL";
  destFurnitureLift?: string;
  destCarryDistance?: string;
  destParkingAuth?: boolean;

  // Photos
  photosUrls?: string;
  aiEstimationConfidence?: number;

  // Options détaillées du tunnel (JSON structuré)
  tunnelOptions?: unknown;
}

export interface BackofficePhotoListResult {
  photos: string[];
}

function parsePhotosUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((url) => typeof url === "string" && url.trim().length > 0);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s || s === "[]") return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.filter((url) => typeof url === "string" && url.trim().length > 0);
      }
    } catch {
      // fallback: consider raw as single url
    }
    return [s];
  }
  return [];
}

function normalizePhotoUrls(rawUrls: string[]): string[] {
  const base = getApiBaseUrl();
  return rawUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => (url.startsWith("http") ? url : `${base}${url}`));
}

export async function updateBackofficeLead(
  backofficeLeadId: string,
  payload: UpdateBackofficeLeadPayload
): Promise<{ id: string }> {
  // Filtrer les valeurs undefined - on n'envoie que ce qui est défini
  // Cela évite d'écraser des données existantes avec des valeurs vides
  const filteredPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  // Hotfix prod: proxy same-origin pour éviter les soucis cross-origin (Origin/CSRF) côté BO.
  // Le serveur Next relaie ensuite vers `${NEXT_PUBLIC_API_URL}/public/leads/:id`.
  const proxyUrl = `/api/backoffice/leads/${backofficeLeadId}`;
  const response = await fetch(proxyUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filteredPayload),
  });

  if (!response.ok) {
    let errorData: any = {};
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      try {
        errorData = await response.json();
      } catch {
        const text = await response.text();
        errorData = { rawResponse: text };
      }
    } else {
      const text = await response.text();
      errorData = { rawResponse: text };
    }

    console.error("❌ Erreur mise à jour lead:", {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });

    // Si lead non trouvé, on peut avoir besoin de recréer
    if (response.status === 404) {
      throw new Error("LEAD_NOT_FOUND");
    }

    const combined =
      [errorData?.error, errorData?.message].filter(Boolean).join(" - ") ||
      errorData?.rawResponse ||
      null;

    const errorMessage =
      combined || `Failed to update lead (${response.status})`;

    throw new Error(`${errorMessage}`);
  }

  const result = await response.json();

  if (result?.success && result.data?.id) {
    return { id: result.data.id };
  }
  if (result?.id) {
    return { id: result.id };
  }

  throw new Error("Invalid response format from backend");
}

export async function listBackofficePhotos(
  backofficeLeadId: string
): Promise<BackofficePhotoListResult> {
  const response = await fetch(`/api/backoffice/leads/${backofficeLeadId}`, {
    method: "GET",
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    if (response.status === 404) {
      throw new Error("LEAD_NOT_FOUND");
    }
    throw new Error(errorData?.error || errorData?.message || "Failed to load photos");
  }

  const data = await response.json();
  const lead = data?.data ?? data;
  const rawUrls = parsePhotosUrls(lead?.photosUrls);
  return { photos: normalizePhotoUrls(rawUrls) };
}

// ============================================
// REQUEST CONFIRMATION EMAIL
// ============================================

export async function requestBackofficeConfirmation(
  backofficeLeadId: string
): Promise<{ success: boolean; message: string }> {
  const API_BASE_URL = getApiBaseUrl();

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  // Le back-office peut renvoyer DOCS_NOT_READY tant que les PJ ne sont pas prêtes.
  const MAX_ATTEMPTS = 4; // ~4 tentatives
  const DEFAULT_RETRY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(
      `${API_BASE_URL}/public/leads/${backofficeLeadId}/request-confirmation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // ignore
      }

      // DOCS_NOT_READY: on attend un peu et on retente (sans spammer d'emails)
      if (errorData?.error === "DOCS_NOT_READY" && attempt < MAX_ATTEMPTS) {
        const retryMs =
          typeof errorData?.retryAfterMs === "number"
            ? errorData.retryAfterMs
            : DEFAULT_RETRY_MS;
        await sleep(retryMs);
        continue;
      }

      console.error("❌ Erreur demande confirmation:", {
        status: response.status,
        errorData,
      });

      if (response.status === 404) {
        throw new Error("LEAD_NOT_FOUND");
      }
      if (response.status === 400 && errorData.error === "Lead email is missing") {
        throw new Error("EMAIL_MISSING");
      }
      if (errorData?.error === "DOCS_NOT_READY") {
        throw new Error("DOCS_NOT_READY");
      }

      throw new Error(
        errorData.error || errorData.message || "Failed to request confirmation"
      );
    }

    const result = await response.json();
    return {
      success: result.success ?? true,
      message: result.message ?? "Email de confirmation envoyé",
    };
  }

  throw new Error("DOCS_NOT_READY");
}

// ============================================
// UPLOAD PHOTOS TO BACKOFFICE
// ============================================

export interface BackofficeUploadedPhoto {
  id: string;
  url: string;
  originalFilename: string;
}

export interface BackofficeUploadPhotosResult {
  success: boolean;
  data: {
    uploaded: BackofficeUploadedPhoto[];
    errors: { originalFilename: string; reason: string }[];
    totalPhotos: number;
  };
}

// ============================================
// UPLOAD PHOTOS TO TUNNEL (local) - for analysis
// ============================================

export interface TunnelUploadedPhoto {
  id: string;
  storageKey: string;
  originalFilename: string;
}

export interface TunnelUploadPhotosResult {
  success: TunnelUploadedPhoto[];
  errors: { originalFilename: string; reason: string }[];
}

export async function uploadTunnelPhotos(
  leadId: string,
  files: File[]
): Promise<TunnelUploadPhotosResult> {
  const formData = new FormData();
  formData.append("leadId", leadId);
  files.forEach((file) => formData.append("files", file));

  const res = await fetch("/api/uploads/photos", {
    method: "POST",
    body: formData,
  });

  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to upload tunnel photos");
  }

  const successRaw = Array.isArray(data?.success) ? data.success : [];
  const errorsRaw = Array.isArray(data?.errors) ? data.errors : [];

  return {
    success: successRaw
      .filter(
        (p: any) =>
          p &&
          typeof p === "object" &&
          typeof p.id === "string" &&
          typeof p.storageKey === "string" &&
          typeof p.originalFilename === "string"
      )
      .map((p: any) => ({
        id: p.id,
        storageKey: p.storageKey,
        originalFilename: p.originalFilename,
      })),
    errors: errorsRaw
      .filter(
        (e: any) =>
          e &&
          typeof e === "object" &&
          typeof e.originalFilename === "string" &&
          typeof e.reason === "string"
      )
      .map((e: any) => ({ originalFilename: e.originalFilename, reason: e.reason })),
  };
}

// ============================================
// ANALYZE TUNNEL PHOTOS (local) - lab-process2
// ============================================

export interface TunnelAnalysisSummary {
  volumeTotalM3: number;
  cartonsTotalCount: number;
  insuranceValueTotalEur: number | null;
  rooms: Array<{
    roomType: string;
    label: string;
    photosCount: number;
    volumeTotalM3: number;
    cartonsCount: number;
    topItems: Array<{ label: string; quantity: number; volumeM3: number | null }>;
  }>;
  raw?: unknown;
}

export async function analyzeTunnelPhotos(
  photos: TunnelUploadedPhoto[]
): Promise<TunnelAnalysisSummary> {
  const res = await fetch("/api/ai/lab-process2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos }),
  });

  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to analyze photos");
  }

  const roomsRaw = Array.isArray(data?.rooms) ? data.rooms : [];

  // Calcul V2 : règles métier (lit -> dérivés, armoire -> contenu, etc.)
  // + emballage (volume emballé) + cartons (petits objets).
  let volumeTotalM3 = 0;
  let cartonsTotalCount = 0;
  let insuranceValueTotalEur = 0;
  let insuranceValueCount = 0;

  const rooms = roomsRaw
    .filter((r: any) => r && typeof r === "object")
    .map((r: any) => {
      const roomId = String(r.roomId ?? r.roomType ?? "room");
      const roomType = String(r.roomType ?? "INCONNU");
      const label = String(r.label ?? r.roomType ?? "Pièce");
      const photosCount = Array.isArray(r.photoIds) ? r.photoIds.length : 0;
      const itemsRaw = Array.isArray(r.items) ? r.items : [];

      // --- Pipeline V2: normaliser -> enrich (contenus/dérivés) -> emballage ---
      const roomsForRules = [{ roomId, roomType, roomLabel: label }];
      const itemsForRules = itemsRaw.map((it: any, idx: number) => ({
        id: `${roomId}-${idx}`,
        roomId,
        roomLabel: label,
        label: String(it?.label ?? "Objet"),
        category: String(it?.category ?? "AUTRE"),
        quantity: typeof it?.quantity === "number" ? it.quantity : 1,
        confidence: typeof it?.confidence === "number" ? it.confidence : 0.5,
        widthCm: typeof it?.widthCm === "number" ? it.widthCm : null,
        depthCm: typeof it?.depthCm === "number" ? it.depthCm : null,
        heightCm: typeof it?.heightCm === "number" ? it.heightCm : null,
        volumeM3Ai: typeof it?.volumeM3 === "number" ? it.volumeM3 : null, // per-unit
        valueEurTypicalAi:
          typeof it?.valueEstimateEur === "number" ? it.valueEstimateEur : null,
        valueSource:
          typeof it?.valueEstimateEur === "number" ? "ai" : ("none" as const),
        volumeSource: "ai" as const,
        parentId: null as string | null,
        derivedKind: null as string | null,
        flags:
          it?.flags && typeof it.flags === "object"
            ? {
                fragile: !!it.flags.fragile,
                highValue: !!it.flags.highValue,
                requiresDisassembly: !!it.flags.requiresDisassembly,
              }
            : undefined,
      }));

      const enriched = enrichItemsWithBusinessRules(itemsForRules, roomsForRules);
      const normalized = applyPackagingRules(enriched);

      // Valorisation assurance (V2): on additionne les valeurs IA des items "racine"
      // (les dérivés type contenu armoire / composants lit n'ont pas de valeur, et on évite le double).
      for (const it of normalized) {
        if (it?.parentId) continue;
        const v =
          typeof it?.valueEurTypicalAi === "number" ? it.valueEurTypicalAi : null;
        const q = typeof it?.quantity === "number" ? it.quantity : 1;
        if (v != null && Number.isFinite(v) && Number.isFinite(q) && v > 0 && q > 0) {
          insuranceValueTotalEur += v * q;
          insuranceValueCount += 1;
        }
      }

      // Volume par pièce (meubles + cartons)
      let roomVolumeM3 = 0;
      let roomCartonsCount = 0;

      // 1) Somme des volumes des "gros" objets (emballés) + 2) cartons pour petits objets
      // Seuils V2
      const SMALL_VOLUME_THRESHOLD = 0.15; // m³ par objet
      const STANDARD_CARTON_VOLUME = 0.08; // m³ / carton

      const isAlwaysBigCategory = (cat: string) => {
        const c = cat.toUpperCase();
        return (
          c === "LIT" ||
          c === "ARMOIRE" ||
          c === "ARMOIRE-PENDERIE" ||
          c === "CANAPE" ||
          c === "CANAPÉ" ||
          c === "BUFFET" ||
          c === "BIBLIOTHEQUE" ||
          c === "BIBLIOTHÈQUE" ||
          c === "TABLE" ||
          c === "ELECTROMENAGER" ||
          c === "ÉLECTROMÉNAGER" ||
          c === "GROS_ELECTROMENAGER" ||
          c === "CARTON"
        );
      };

      const byParent = new Map<string, any[]>();
      const baseItems: any[] = [];
      for (const it of normalized) {
        if (it?.parentId) {
          const list = byParent.get(it.parentId) ?? [];
          list.push(it);
          byParent.set(it.parentId, list);
        } else {
          baseItems.push(it);
        }
      }

      const computeVolumes = (src: any | null) => {
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
        return { nu: Number(nu) || 0, packed: Number(packed) || 0 };
      };

      const bigItems: Array<{ label: string; quantity: number; volumeM3: number | null }> =
        [];
      let totalSmallNu = 0;
      let storageContentNu = 0;

      // Séparation petits / gros (V2)
      const smallBaseItems: any[] = [];
      const bigBaseItems: any[] = [];
      for (const item of baseItems) {
        const cat = String(item?.category ?? "AUTRE");
        const { packed } = computeVolumes(item);
        const isSmallByVolume =
          !isAlwaysBigCategory(cat) && packed > 0 && packed < SMALL_VOLUME_THRESHOLD;
        if (isSmallByVolume) smallBaseItems.push(item);
        else bigBaseItems.push(item);
      }

      // Gros items (avec règles spéciales lit/armoire + contenus)
      for (const item of bigBaseItems) {
        const cat = String(item?.category ?? "AUTRE").toUpperCase();
        const deps = byParent.get(item.id) ?? [];
        const parentVolumes = computeVolumes(item);

        const depsVolumes = deps.reduce(
          (acc: { nu: number; packed: number }, d: any) => {
            const v = computeVolumes(d);
            const q = typeof d?.quantity === "number" ? d.quantity : 1;
            return { nu: acc.nu + v.nu * q, packed: acc.packed + v.packed * q };
          },
          { nu: 0, packed: 0 }
        );

        let volumePacked = parentVolumes.packed * (item.quantity || 1);
        const hasArmoireContent =
          cat === "ARMOIRE" && deps.some((d: any) => d?.derivedKind === "armoire_contenu");

        // Comptage cartons: on inclut le "contenu des rangements" (armoire_contenu) dans le nb de cartons.
        // Important: on NE l'ajoute pas au volume via cartons, car son volume emballé est déjà inclus
        // dans le volume de l'armoire (meuble + contenu) pour rester aligné V2 sur le volume total.
        if (cat === "ARMOIRE" && deps.length > 0) {
          for (const d of deps) {
            if (d?.derivedKind !== "armoire_contenu") continue;
            const v = computeVolumes(d);
            const q = typeof d?.quantity === "number" ? d.quantity : 1;
            if (v.nu > 0) storageContentNu += v.nu * q;
          }
        }

        if (deps.length > 0) {
          if (cat === "LIT") {
            // Lit: volume = composants uniquement (matelas/sommier/parure)
            volumePacked = depsVolumes.packed;
          } else if (cat === "ARMOIRE") {
            // Armoire: meuble + contenu
            volumePacked += depsVolumes.packed;
          }
        }

        if (volumePacked > 0) roomVolumeM3 += volumePacked;

        bigItems.push({
          label:
            cat === "ARMOIRE" && hasArmoireContent
              ? `${String(item?.label ?? "Armoire")} (avec contenu)`
              : String(item?.label ?? "Objet"),
          quantity: typeof item?.quantity === "number" ? item.quantity : 1,
          volumeM3: volumePacked > 0 ? Math.round(volumePacked * 10) / 10 : null,
        });
      }

      // Petits objets -> cartons (V2)
      for (const item of smallBaseItems) {
        const { nu } = computeVolumes(item);
        const q = typeof item?.quantity === "number" ? item.quantity : 1;
        if (nu > 0) totalSmallNu += nu * q;
      }

      // Cartons (objets divers) : on convertit le volume nu des petits objets en cartons.
      if (totalSmallNu > 0) {
        const cartonsCount = Math.max(1, Math.ceil(totalSmallNu / STANDARD_CARTON_VOLUME));
        const cartonsVolume = cartonsCount * STANDARD_CARTON_VOLUME;
        roomCartonsCount = cartonsCount;
        cartonsTotalCount += cartonsCount;
        roomVolumeM3 += cartonsVolume;
        bigItems.push({
          label: "Cartons (objets divers)",
          quantity: cartonsCount,
          volumeM3: Math.round(cartonsVolume * 10) / 10,
        });
      }

      // Contenu des rangements (armoire/buffet) -> cartons (compteur uniquement)
      if (storageContentNu > 0) {
        const storageCartonsCount = Math.max(
          1,
          Math.ceil(storageContentNu / STANDARD_CARTON_VOLUME)
        );
        roomCartonsCount += storageCartonsCount;
        cartonsTotalCount += storageCartonsCount;
        bigItems.push({
          label: "Cartons (contenu rangements)",
          quantity: storageCartonsCount,
          volumeM3: null, // volume déjà inclus dans le meuble (armoire + contenu)
        });
      }

      roomVolumeM3 = Math.round(roomVolumeM3 * 10) / 10;
      volumeTotalM3 += roomVolumeM3;

      const topItems = bigItems
        .slice()
        .sort((a, b) => (b.volumeM3 ?? 0) - (a.volumeM3 ?? 0))
        .slice(0, 4);

      return {
        roomType,
        label,
        photosCount,
        volumeTotalM3: roomVolumeM3,
        cartonsCount: roomCartonsCount,
        topItems,
      };
    });

  volumeTotalM3 = Math.round(volumeTotalM3 * 10) / 10;

  const insuranceValueTotalEurOut =
    insuranceValueCount > 0 ? Math.round(insuranceValueTotalEur) : null;

  return {
    volumeTotalM3,
    cartonsTotalCount,
    insuranceValueTotalEur: insuranceValueTotalEurOut,
    rooms,
    raw: data,
  };
}

export async function uploadBackofficePhotos(
  backofficeLeadId: string,
  files: File[]
): Promise<BackofficeUploadPhotosResult> {
  const API_BASE_URL = getApiBaseUrl();

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("photos", file);
  });

  const response = await fetch(
    `${API_BASE_URL}/public/leads/${backofficeLeadId}/photos`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }

    console.error("❌ Erreur upload photos:", {
      status: response.status,
      errorData,
    });

    if (response.status === 404) {
      throw new Error("LEAD_NOT_FOUND");
    }

    throw new Error(errorData.error || errorData.message || "Failed to upload photos");
  }

  const result = await response.json();
  return {
    success: result.success ?? true,
    data: {
      uploaded: result.data?.uploaded ?? [],
      errors: result.data?.errors ?? [],
      totalPhotos: result.data?.totalPhotos ?? 0,
    },
  };
}

// ============================================
// LIST PHOTOS ALREADY UPLOADED (Backoffice)
// ============================================

export async function listBackofficePhotos(
  backofficeLeadId: string
): Promise<BackofficeUploadedPhoto[]> {
  // On privilégie un proxy same-origin pour éviter CORS et dépendances build-time.
  const res = await fetch(`/api/backoffice/leads/${backofficeLeadId}/photos`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.ok) {
    const data: any = await res.json().catch(() => null);
    const candidates =
      data?.data?.uploaded ??
      data?.data?.photos ??
      data?.uploaded ??
      data?.photos ??
      null;
    if (Array.isArray(candidates)) {
      return candidates
        .filter((p) => p && typeof p === "object" && typeof p.url === "string")
        .map((p) => ({
          id: String(p.id ?? p.url),
          url: String(p.url),
          originalFilename: String(p.originalFilename ?? ""),
        }));
    }
  }

  // Fallback: certains BO ne proposent pas GET /photos; on tente GET /public/leads/:id
  const leadRes = await fetch(`/api/backoffice/leads/${backofficeLeadId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!leadRes.ok) return [];
  const lead: any = await leadRes.json().catch(() => null);

  // Essayer plusieurs formes probables
  const photos =
    lead?.data?.photos ??
    lead?.photos ??
    null;
  if (Array.isArray(photos)) {
    return photos
      .filter((p) => p && typeof p === "object" && typeof p.url === "string")
      .map((p) => ({
        id: String(p.id ?? p.url),
        url: String(p.url),
        originalFilename: String(p.originalFilename ?? ""),
      }));
  }

  const photosUrls = lead?.data?.photosUrls ?? lead?.photosUrls ?? null;
  if (typeof photosUrls === "string" && photosUrls.trim()) {
    try {
      const parsed = JSON.parse(photosUrls);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((u) => typeof u === "string" && u)
          .map((u) => ({ id: u, url: u, originalFilename: "" }));
      }
    } catch {
      // ignore
    }
  }

  return [];
}

// ============================================
// SEND PHOTO REMINDER EMAIL
// ============================================

export async function sendBackofficePhotoReminder(
  backofficeLeadId: string
): Promise<{ success: boolean; message: string }> {
  const API_BASE_URL = getApiBaseUrl();

  const response = await fetch(
    `${API_BASE_URL}/public/leads/${backofficeLeadId}/send-photo-reminder`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }

    console.error("❌ Erreur envoi relance photos:", {
      status: response.status,
      errorData,
    });

    if (response.status === 404) {
      throw new Error("LEAD_NOT_FOUND");
    }

    throw new Error(errorData.error || errorData.message || "Failed to send photo reminder");
  }

  const result = await response.json();
  return {
    success: result.success ?? true,
    message: result.message ?? "Email de relance photos envoyé",
  };
}

// ============================================
// SAVE INVENTORY TO BACKOFFICE
// ============================================

export interface SaveBackofficeInventoryPayload {
  items: any[];
  excludedInventoryIds: string[];
  photosByRoom?: {
    roomLabel: string;
    roomType?: string;
    photoUrls: string[];
  }[];
}

export async function saveBackofficeInventory(
  backofficeLeadId: string,
  payload: SaveBackofficeInventoryPayload
): Promise<{ success: boolean }> {
  const API_BASE_URL = getApiBaseUrl();

  const response = await fetch(
    `${API_BASE_URL}/public/leads/${backofficeLeadId}/inventory`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }

    console.error("❌ Erreur enregistrement inventaire:", {
      status: response.status,
      errorData,
    });

    if (response.status === 404) {
      throw new Error("LEAD_NOT_FOUND");
    }

    throw new Error(
      errorData.error || errorData.message || "Failed to save inventory"
    );
  }

  const result = await response.json();
  return {
    success: result.success ?? true,
  };
}



