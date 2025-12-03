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


