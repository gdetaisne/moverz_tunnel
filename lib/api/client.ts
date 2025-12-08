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
// UPLOAD PHOTOS VERS LE BACK OFFICE
// ============================================

interface BackofficeUploadedPhoto {
  id: string;
  url: string;
  originalFilename: string;
}

interface BackofficeUploadPhotosResponse {
  success: boolean;
  data?: {
    uploaded: BackofficeUploadedPhoto[];
    errors: { originalFilename: string; reason: string }[];
    totalPhotos: number;
  };
  error?: string;
}

export async function uploadBackofficeLeadPhotos(
  backofficeLeadId: string,
  files: File[]
): Promise<BackofficeUploadPhotosResponse | null> {
  if (!backofficeLeadId || files.length === 0) {
    return null;
  }

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

  let parsed: BackofficeUploadPhotosResponse;

  try {
    parsed = (await response.json()) as BackofficeUploadPhotosResponse;
  } catch {
    if (!response.ok) {
      console.error(
        "❌ Erreur upload photos back-office (réponse non JSON):",
        response.status,
        response.statusText
      );
      throw new Error(
        `Erreur lors de l'upload des photos vers le Back Office (${response.status})`
      );
    }
    // Réponse 2xx sans JSON exploitable : on considère que ça a (probablement) marché.
    return null;
  }

  if (!response.ok || parsed.success === false) {
    const errorMessage =
      parsed.error ||
      `Erreur lors de l'upload des photos vers le Back Office (${response.status})`;
    throw new Error(errorMessage);
  }

  return parsed;
}

// Client HTTP pour communiquer avec le Back Office (routes /public/leads)

const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL n'est pas défini. Configure cette variable d'environnement pour pointer vers le Back Office."
    );
  }
  return baseUrl.replace(/\/+$/, "");
};

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
}

export async function updateBackofficeLead(
  backofficeLeadId: string,
  payload: UpdateBackofficeLeadPayload
): Promise<{ id: string }> {
  const API_BASE_URL = getApiBaseUrl();

  // Filtrer les valeurs undefined - on n'envoie que ce qui est défini
  // Cela évite d'écraser des données existantes avec des valeurs vides
  const filteredPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  const response = await fetch(`${API_BASE_URL}/public/leads/${backofficeLeadId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
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

    let errorMessage =
      errorData.error ||
      errorData.message ||
      errorData.rawResponse ||
      `Failed to update lead (${response.status})`;

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
// REQUEST CONFIRMATION EMAIL
// ============================================

export async function requestBackofficeConfirmation(
  backofficeLeadId: string
): Promise<{ success: boolean; message: string }> {
  const API_BASE_URL = getApiBaseUrl();

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

    throw new Error(errorData.error || errorData.message || "Failed to request confirmation");
  }

  const result = await response.json();
  return {
    success: result.success ?? true,
    message: result.message ?? "Email de confirmation envoyé",
  };
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


