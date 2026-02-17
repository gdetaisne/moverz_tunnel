import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  computeBaselineEstimate,
  getDisplayedCenter,
  BASELINE_DISTANCE_BUFFER_KM,
} from "@/lib/pricing/scenarios";

/**
 * GET /api/estimate?originPostalCode=75011&destinationPostalCode=13001&surface=60&formule=STANDARD
 *
 * Retourne une estimation rapide (fourchette min/max)
 * avec des hypothèses conservatrices (mêmes que Step 2 du tunnel).
 *
 * Distance : OSRM (route réelle) entre centres-villes + 15 km de buffer.
 * Fallback : heuristique CP si BAN ou OSRM échouent.
 *
 * Accepte aussi originLat/originLon/destinationLat/destinationLon pour
 * éviter le géocodage BAN si le client les connaît déjà.
 *
 * Utilisé par la home moverz.fr pour afficher un budget indicatif
 * avant de rediriger vers le tunnel complet (Step 3).
 */

const FORMULES = ["ECONOMIQUE", "STANDARD", "PREMIUM"] as const;
// Timeouts calibrés pour limiter les fallbacks heuristiques incohérents
// tout en restant sous la fenêtre client (~5s).
const BAN_TIMEOUT_MS = 2600;
const OSRM_TIMEOUT_MS = 1200;
const GEO_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const DISTANCE_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

const EstimateQuerySchema = z.object({
  originPostalCode: z
    .string()
    .min(2, "Code postal origine requis")
    .max(10),
  destinationPostalCode: z
    .string()
    .min(2, "Code postal destination requis")
    .max(10),
  originCity: z.string().min(1).max(120).optional(),
  destinationCity: z.string().min(1).max(120).optional(),
  surface: z.coerce
    .number()
    .int()
    .min(10, "Surface min 10 m²")
    .max(500, "Surface max 500 m²"),
  formule: z.enum(FORMULES).optional().default("STANDARD"),
  // Coordonnées optionnelles (skip le géocodage BAN si fournies)
  originLat: z.coerce.number().finite().min(-90).max(90).optional(),
  originLon: z.coerce.number().finite().min(-180).max(180).optional(),
  destinationLat: z.coerce.number().finite().min(-90).max(90).optional(),
  destinationLon: z.coerce.number().finite().min(-180).max(180).optional(),
});

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const geocodeCache = new Map<string, CacheEntry<[number, number]>>();
const osrmDistanceCache = new Map<string, CacheEntry<number>>();
const geocodeInFlight = new Map<string, Promise<[number, number] | null>>();
const osrmInFlight = new Map<string, Promise<number | null>>();

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setInCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number
): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Géocode un code postal via BAN (api-adresse.data.gouv.fr).
 * Retourne [lat, lon] ou null si échec.
 */
async function geocodePostalCode(
  postalCode: string,
  city?: string
): Promise<[number, number] | null> {
  const cityPart = (city || "").trim().toLowerCase();
  const cacheKey = `${postalCode.trim()}|${cityPart}`;
  const cached = getFromCache(geocodeCache, cacheKey);
  if (cached) return cached;

  const inFlight = geocodeInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const reqPromise = (async () => {
    try {
      // Alignement avec `AddressAutocomplete` (kind=city):
      // q = ville, filtre postcode séparé.
      const query = cityPart || postalCode;
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        query
      )}&type=municipality&postcode=${encodeURIComponent(postalCode)}&limit=1`;
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), BAN_TIMEOUT_MS);
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        features?: { geometry?: { coordinates?: [number, number] } }[];
      };
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (!coords) return null;
      const [lon, lat] = coords;
      if (typeof lat === "number" && typeof lon === "number") {
        const parsed: [number, number] = [lat, lon];
        setInCache(geocodeCache, cacheKey, parsed, GEO_CACHE_TTL_MS);
        return parsed;
      }
      return null;
    } catch {
      return null;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      geocodeInFlight.delete(cacheKey);
    }
  })();

  geocodeInFlight.set(cacheKey, reqPromise);
  return reqPromise;
}

/**
 * Calcule la distance route via OSRM public.
 * Retourne la distance en km ou null si échec.
 */
async function osrmDistanceKm(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number
): Promise<number | null> {
  const cacheKey = [
    Math.round(originLat * 1e4) / 1e4,
    Math.round(originLon * 1e4) / 1e4,
    Math.round(destLat * 1e4) / 1e4,
    Math.round(destLon * 1e4) / 1e4,
  ].join(":");
  const cached = getFromCache(osrmDistanceCache, cacheKey);
  if (typeof cached === "number") return cached;

  const inFlight = osrmInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const reqPromise = (async () => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false&alternatives=false&steps=false`;
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
      const res = await fetch(url, {
        headers: { "User-Agent": "moverz-tunnel (estimate)" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        routes?: Array<{ distance?: number }>;
      };
      const distanceM = data?.routes?.[0]?.distance;
      if (typeof distanceM !== "number" || distanceM <= 0) return null;
      const distanceKm = Math.max(1, Math.round(distanceM / 1000));
      setInCache(
        osrmDistanceCache,
        cacheKey,
        distanceKm,
        DISTANCE_CACHE_TTL_MS
      );
      return distanceKm;
    } catch {
      return null;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      osrmInFlight.delete(cacheKey);
    }
  })();

  osrmInFlight.set(cacheKey, reqPromise);
  return reqPromise;
}

/**
 * Fallback : heuristique par codes postaux (départements).
 * Uniquement si BAN+OSRM échouent.
 */
function heuristicDistanceKm(
  originPostalCode: string,
  destinationPostalCode: string
): number {
  // Fallback de dernier recours seulement.
  // On garde une estimation prudente mais on évite les explosions de distance
  // (qui créent des écarts majeurs avec Step 2/Step 3).
  if (!originPostalCode || !destinationPostalCode) return 80;
  if (originPostalCode === destinationPostalCode) return 10;
  const o = parseInt(originPostalCode.slice(0, 2), 10);
  const d = parseInt(destinationPostalCode.slice(0, 2), 10);
  if (Number.isNaN(o) || Number.isNaN(d)) return 80;
  const diff = Math.abs(o - d);
  const raw = 30 + diff * 16;
  return Math.min(280, Math.max(20, raw));
}

// ─── Route Handler ──────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = EstimateQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Paramètres invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      originPostalCode,
      destinationPostalCode,
      originCity,
      destinationCity,
      surface,
      formule,
      originLat: paramOriginLat,
      originLon: paramOriginLon,
      destinationLat: paramDestLat,
      destinationLon: paramDestLon,
    } = parsed.data;

    // 1. Résoudre les coordonnées (params > BAN géocodage)
    let oLat = paramOriginLat ?? null;
    let oLon = paramOriginLon ?? null;
    let dLat = paramDestLat ?? null;
    let dLon = paramDestLon ?? null;

    // Géocodage BAN en parallèle si besoin
    const needGeoOrigin = oLat == null || oLon == null;
    const needGeoDest = dLat == null || dLon == null;

    if (needGeoOrigin || needGeoDest) {
      const [geoOrigin, geoDest] = await Promise.all([
        needGeoOrigin ? geocodePostalCode(originPostalCode, originCity) : null,
        needGeoDest ? geocodePostalCode(destinationPostalCode, destinationCity) : null,
      ]);
      if (geoOrigin) {
        oLat = geoOrigin[0];
        oLon = geoOrigin[1];
      }
      if (geoDest) {
        dLat = geoDest[0];
        dLon = geoDest[1];
      }
    }

    // 2. Distance OSRM si coordonnées disponibles, sinon fallback heuristique
    let distanceKm: number;
    let distanceProvider: "osrm" | "heuristic";

    if (oLat != null && oLon != null && dLat != null && dLon != null) {
      const osrmKm = await osrmDistanceKm(oLat, oLon, dLat, dLon);
      if (osrmKm != null) {
        distanceKm = osrmKm + BASELINE_DISTANCE_BUFFER_KM;
        distanceProvider = "osrm";
      } else {
        distanceKm =
          heuristicDistanceKm(originPostalCode, destinationPostalCode) +
          BASELINE_DISTANCE_BUFFER_KM;
        distanceProvider = "heuristic";
      }
    } else {
      distanceKm =
        heuristicDistanceKm(originPostalCode, destinationPostalCode) +
        BASELINE_DISTANCE_BUFFER_KM;
      distanceProvider = "heuristic";
    }

    // 3. Calcul du prix (mêmes hypothèses conservatrices que Step 2)
    const result = computeBaselineEstimate({
      surfaceM2: surface,
      distanceKm,
      formule,
    });

    return NextResponse.json({
      prixMin: result.prixMin,
      prixMax: result.prixMax,
      prixCentre: getDisplayedCenter(result.prixMin, result.prixMax),
      volumeM3: result.volumeM3,
      distanceKm,
      distanceProvider,
      formule,
      input: {
        originPostalCode,
        destinationPostalCode,
        originCity: originCity ?? null,
        destinationCity: destinationCity ?? null,
        surface,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ GET /api/estimate error:", err);
    }
    return NextResponse.json(
      { message: "Erreur interne" },
      { status: 500 }
    );
  }
}
