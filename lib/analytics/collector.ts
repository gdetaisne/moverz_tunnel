/**
 * Client-side analytics collector.
 * Collects enriched browser data and sends to /api/analytics/events.
 * Never blocks the tunnel — all errors are silently caught.
 */

"use client";

// ============================================================
// Types
// ============================================================

export interface AnalyticsPayload {
  // Identifiers
  sessionId: string;
  leadTunnelId?: string | null;
  backofficeLeadId?: string | null;

  // Event
  eventType: string;
  logicalStep?: string | null;
  screenId?: string | null;

  // Acquisition
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer?: string | null;
  landingUrl?: string | null;

  // Device
  device?: string | null;
  userAgent?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  language?: string | null;
  timezone?: string | null;
  connectionType?: string | null;

  // Context
  urlPath: string;
  email?: string | null;

  // Snapshots
  formSnapshot?: Record<string, unknown> | null;
  pricingSnapshot?: Record<string, unknown> | null;

  // Extra
  extra?: Record<string, unknown> | null;

  // Client timestamp
  clientTimestamp?: string | null;
}

// ============================================================
// Browser data collection
// ============================================================

interface BrowserEnrichment {
  device: string;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  timezone: string;
  connectionType: string | null;
  referrer: string;
}

let _browserData: BrowserEnrichment | null = null;

function getBrowserData(): BrowserEnrichment {
  if (_browserData) return _browserData;
  if (typeof window === "undefined") {
    return {
      device: "unknown",
      userAgent: "",
      screenWidth: 0,
      screenHeight: 0,
      language: "",
      timezone: "",
      connectionType: null,
      referrer: "",
    };
  }

  const ua = navigator.userAgent;
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(ua);

  _browserData = {
    device: isMobile ? "mobile" : isTablet ? "tablet" : "desktop",
    userAgent: ua,
    screenWidth: window.screen?.width ?? window.innerWidth,
    screenHeight: window.screen?.height ?? window.innerHeight,
    language: navigator.language || "",
    timezone: Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || "",
    connectionType: (navigator as any).connection?.effectiveType ?? null,
    referrer: document.referrer || "",
  };
  return _browserData;
}

// ============================================================
// UTM + acquisition params (captured once at page load)
// ============================================================

interface AcquisitionParams {
  source: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  landingUrl: string;
}

let _acquisitionParams: AcquisitionParams | null = null;

export function captureAcquisitionParams(): AcquisitionParams {
  if (_acquisitionParams) return _acquisitionParams;
  if (typeof window === "undefined") {
    return {
      source: "direct",
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      gclid: null,
      fbclid: null,
      landingUrl: "",
    };
  }

  const params = new URLSearchParams(window.location.search);

  _acquisitionParams = {
    source: params.get("source") || params.get("src") || "direct",
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    gclid: params.get("gclid"),
    fbclid: params.get("fbclid"),
    landingUrl: window.location.href,
  };

  // Persist to sessionStorage so they survive step navigation
  try {
    sessionStorage.setItem("moverz_acq_params", JSON.stringify(_acquisitionParams));
  } catch { /* ignore */ }

  return _acquisitionParams;
}

export function getAcquisitionParams(): AcquisitionParams {
  if (_acquisitionParams) return _acquisitionParams;

  // Try restoring from sessionStorage
  if (typeof window !== "undefined") {
    try {
      const saved = sessionStorage.getItem("moverz_acq_params");
      if (saved) {
        _acquisitionParams = JSON.parse(saved);
        return _acquisitionParams!;
      }
    } catch { /* ignore */ }
  }

  return captureAcquisitionParams();
}

// ============================================================
// Session ID (reuse existing logic)
// ============================================================

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return `ssr_${Date.now()}`;

  const key = "moverz_tunnel_session_id";
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

// ============================================================
// Send analytics event
// ============================================================

export async function sendAnalyticsEvent(
  input: Omit<AnalyticsPayload, "sessionId" | "urlPath"> & {
    sessionId?: string;
    urlPath?: string;
  }
): Promise<void> {
  try {
    const browser = getBrowserData();
    const acq = getAcquisitionParams();

    const payload: AnalyticsPayload = {
      // Identifiers
      sessionId: input.sessionId || getOrCreateSessionId(),
      leadTunnelId: input.leadTunnelId,
      backofficeLeadId: input.backofficeLeadId,

      // Event
      eventType: input.eventType,
      logicalStep: input.logicalStep,
      screenId: input.screenId,

      // Acquisition
      source: input.source ?? acq.source,
      utmSource: acq.utmSource,
      utmMedium: acq.utmMedium,
      utmCampaign: acq.utmCampaign,
      utmContent: acq.utmContent,
      utmTerm: acq.utmTerm,
      gclid: acq.gclid,
      fbclid: acq.fbclid,
      referrer: browser.referrer,
      landingUrl: acq.landingUrl,

      // Device
      device: browser.device,
      userAgent: browser.userAgent,
      screenWidth: browser.screenWidth,
      screenHeight: browser.screenHeight,
      language: browser.language,
      timezone: browser.timezone,
      connectionType: browser.connectionType,

      // Context
      urlPath: input.urlPath ?? (typeof window !== "undefined" ? window.location.pathname : "/"),
      email: input.email,

      // Snapshots
      formSnapshot: input.formSnapshot,
      pricingSnapshot: input.pricingSnapshot,

      // Extra
      extra: input.extra,

      // Timing
      clientTimestamp: new Date().toISOString(),
    };

    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // Survives page unload
    });
  } catch {
    // NEVER block the tunnel for analytics
  }
}
