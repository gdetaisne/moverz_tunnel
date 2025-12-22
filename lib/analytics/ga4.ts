export type Ga4EventParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function ga4Event(eventName: string, params?: Ga4EventParams) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  try {
    window.gtag("event", eventName, params ?? {});
  } catch {
    // Never break the tunnel for analytics.
  }
}


