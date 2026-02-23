// Client HTTP du tunnel pour gérer les LeadTunnel via les routes Next.js internes (/api/leads).

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

    const logLevel = response.status === 400 ? "warn" : "error";
    console[logLevel](`${logLevel === "error" ? "❌" : "⚠️"} Erreur création lead:`, {
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
  originCountryCode?: string;
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

  // Options détaillées du tunnel (JSON structuré)
  // Contient : pricing, accessV2, volumeAdjustments, services, notes, pricingSnapshot
  tunnelOptions?: unknown;
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

export async function getBackofficeLead(backofficeLeadId: string): Promise<any> {
  const response = await fetch(`/api/backoffice/leads/${backofficeLeadId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
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
    throw new Error(errorData?.error || errorData?.message || "Failed to load lead");
  }

  const data = await response.json();
  return data?.data ?? data;
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
  // Option B: meta tunnel pour déclencher conversion auto côté Back Office
  originCountryCode?: string;
  destCountryCode?: string;
  tunnelStep?: number;
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



