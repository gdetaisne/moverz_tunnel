export type Ga4EventParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function getAbVariant(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(/(?:^|; )moverz_ab_variant=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function ga4Event(eventName: string, params?: Ga4EventParams) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  try {
    const ab = getAbVariant();
    window.gtag("event", eventName, { ...params, ...(ab ? { ab_variant: ab } : {}) });
  } catch {
    // Never break the tunnel for analytics.
  }
}


