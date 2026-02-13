/**
 * Tunnel Devis Gratuits V3 — Design System V1 Premium Applied
 * 
 * ✅ Back-office safe - No API/payload/tracking changes
 * ✅ Tracking safe - All GA4 events preserved
 * ✅ Step 2 present - Estimation screen maintained
 * ✅ Mobile summary ok - StickySummary (desktop) + SummaryDrawer (mobile)
 * 
 * Design: Premium neutral palette (no pastel gradients on dominant surfaces)
 * Inspired by: Ramp.com product-led design
 */

'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ga4Event } from "@/lib/analytics/ga4";
import {
  createBackofficeLead,
  getBackofficeLead,
  updateBackofficeLead,
} from "@/lib/api/client";
import {
  calculatePricing,
  type FormuleType as PricingFormuleType,
  type HousingType,
  calculateVolume,
  getEtageCoefficient,
  getVolumeEconomyScale,
} from "@/lib/pricing/calculate";
import {
  COEF_DISTANCE,
  DENSITY_COEFFICIENTS,
  DECOTE,
  FORMULE_MULTIPLIERS,
  PRIX_MIN_SOCLE,
  TYPE_COEFFICIENTS,
  getDistanceBand,
  LA_POSTE_RATES_EUR_PER_M3,
} from "@/lib/pricing/constants";
import {
  computeBaselineEstimate,
  computeBaselineEstimateByFormule,
  computeMoverzFeeProvision,
  getBaselineDistanceKm,
  getDisplayedCenter,
} from "@/lib/pricing/scenarios";
import { useTunnelState } from "@/hooks/useTunnelState";
import { useTunnelTracking } from "@/hooks/useTunnelTracking";
import { StepQualificationV4 } from "@/components/tunnel/v2/StepQualificationV4";
import { StepEstimationV4 } from "@/components/tunnel/v2/StepEstimationV4";
import { StepAccessLogisticsV4 } from "@/components/tunnel/v2/StepAccessLogisticsV4";
import { StepContactPhotosV4 } from "@/components/tunnel/v2/StepContactPhotosV4";
import { V2ProgressBar } from "@/components/tunnel/v2/V2ProgressBar";
// Design System V1 Premium components
import { StickySummary, SummaryDrawer, type PricingDriver } from "@/components/tunnel";
// Design System V4 SmartCart
import { SmartCart, type CartItem } from "@/components/tunnel-v4";

function DevisGratuitsV3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { state, updateField, updateFields, goToStep, reset } = useTunnelState();
  const source = searchParams.get("source") || searchParams.get("src") || "direct";
  const from = (() => {
    const raw = (searchParams.get("from") || "").trim();
    if (!raw) return "/devis-gratuits-v3";

    // Sécurité: on accepte uniquement une URL relative, ou une URL absolue vers moverz.fr (anti open-redirect)
    if (raw.startsWith("/")) return raw;

    try {
      const url = new URL(raw);
      const allowedHosts = new Set(["moverz.fr", "www.moverz.fr"]);
      if (allowedHosts.has(url.hostname)) return url.toString();
    } catch {
      // ignore
    }

    return "/devis-gratuits-v3";
  })();
  const urlLeadId = (searchParams.get("leadId") || "").trim();
  const hydratedLeadRef = useRef<string | null>(null);
  const debugMode = (searchParams.get("debug") || "").trim() === "1" || (searchParams.get("debug") || "").trim() === "true";

  const [showValidationStep1, setShowValidationStep1] = useState(false);
  const [showValidationStep3, setShowValidationStep3] = useState(false);
  const [aiPhotoInsights, setAiPhotoInsights] = useState<string[]>([]);
  const [densityAiNote, setDensityAiNote] = useState("");
  const [collapseStep3OnEnterToken, setCollapseStep3OnEnterToken] = useState(0);
  const [lastImpactDetailId, setLastImpactDetailId] = useState<
    | "distance"
    | "date"
    | "density"
    | "kitchen"
    | "access_housing"
    | "access_constraints"
    | "formule"
    | null
  >(null);

  const formatInputDateLocal = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMinMovingDateIso = (): string => {
    const d = new Date();
    // Midi local: évite les effets de bord UTC/DST autour de minuit.
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + 15);
    return formatInputDateLocal(d);
  };

  const parseInputDateLocal = (raw: string | null | undefined): Date | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Cas principal du tunnel: "YYYY-MM-DD"
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) {
        const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
    }

    const fallback = new Date(trimmed);
    if (Number.isNaN(fallback.getTime())) return null;
    return fallback;
  };

  // Formatter utilisé dans le rendu (sidebar Step 3, etc.)
  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const containerClassName = useMemo(() => {
    if (state.currentStep === 3) {
      // Step 3: layout grille desktop (formulaire + sidebar côte à côte)
      // → grille 2 colonnes avec gap propre, pas de superposition
      return "w-full px-4 py-8 mx-auto lg:px-8 lg:max-w-[1400px]";
    }
    // Steps 1/2/4: centré classique
    return "max-w-3xl px-4 py-8 space-y-6 mx-auto";
  }, [state.currentStep]);

  useEffect(() => {
    if (state.currentStep !== 4) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, [state.currentStep]);

  const toInputDate = (raw: string | null | undefined): string | undefined => {
    const d = parseInputDateLocal(raw);
    if (!d) return undefined;
    return formatInputDateLocal(d);
  };

  const mapDensityFromBo = (d: string | null | undefined): "light" | "normal" | "dense" | undefined => {
    if (!d) return undefined;
    if (d === "LIGHT") return "light";
    if (d === "HEAVY") return "dense";
    if (d === "MEDIUM") return "normal";
    return undefined;
  };

  const mapElevatorFromBo = (e: string | null | undefined): string | undefined => {
    if (!e) return undefined;
    if (e === "OUI") return "yes";
    if (e === "PARTIEL") return "partial";
    if (e === "NON") return "none";
    return undefined;
  };

  // Reprise dossier: l'URL est la source de vérité si leadId est fourni.
  useEffect(() => {
    if (!urlLeadId) return;
    if (state.leadId === urlLeadId) return;
    updateFields({ leadId: urlLeadId });
  }, [urlLeadId, state.leadId, updateFields]);

  // Hydratation des champs depuis le Back Office (via leadId).
  useEffect(() => {
    if (!urlLeadId) return;
    if (hydratedLeadRef.current === urlLeadId) return;
    hydratedLeadRef.current = urlLeadId;

    let cancelled = false;
    void (async () => {
      try {
        const lead = await getBackofficeLead(urlLeadId);
        if (!lead || cancelled) return;

        const next: Partial<typeof state> = {};
        if (typeof lead.firstName === "string" && lead.firstName.trim()) {
          next.firstName = lead.firstName;
        }
        if (typeof lead.lastName === "string" && lead.lastName.trim()) {
          next.lastName = lead.lastName;
        }
        if (typeof lead.email === "string" && lead.email.trim()) {
          next.email = lead.email;
        }
        if (typeof lead.phone === "string" && lead.phone.trim()) {
          next.phone = lead.phone;
        }

        if (typeof lead.originAddress === "string" && lead.originAddress.trim()) {
          next.originAddress = lead.originAddress;
        }
        if (typeof lead.originCity === "string" && lead.originCity.trim()) {
          next.originCity = lead.originCity;
        }
        if (typeof lead.originPostalCode === "string" && lead.originPostalCode.trim()) {
          next.originPostalCode = lead.originPostalCode;
        }
        if (typeof lead.destAddress === "string" && lead.destAddress.trim()) {
          next.destinationAddress = lead.destAddress;
        }
        if (typeof lead.destCity === "string" && lead.destCity.trim()) {
          next.destinationCity = lead.destCity;
        }
        if (typeof lead.destPostalCode === "string" && lead.destPostalCode.trim()) {
          next.destinationPostalCode = lead.destPostalCode;
        }
        const originLatRaw =
          typeof lead.originLat === "number"
            ? lead.originLat
            : typeof lead.originLat === "string"
            ? Number(lead.originLat)
            : typeof lead.originLatitude === "number"
            ? lead.originLatitude
            : typeof lead.originLatitude === "string"
            ? Number(lead.originLatitude)
            : null;
        const originLonRaw =
          typeof lead.originLon === "number"
            ? lead.originLon
            : typeof lead.originLon === "string"
            ? Number(lead.originLon)
            : typeof lead.originLongitude === "number"
            ? lead.originLongitude
            : typeof lead.originLongitude === "string"
            ? Number(lead.originLongitude)
            : null;
        const destLatRaw =
          typeof lead.destLat === "number"
            ? lead.destLat
            : typeof lead.destLat === "string"
            ? Number(lead.destLat)
            : typeof lead.destinationLat === "number"
            ? lead.destinationLat
            : typeof lead.destinationLat === "string"
            ? Number(lead.destinationLat)
            : null;
        const destLonRaw =
          typeof lead.destLon === "number"
            ? lead.destLon
            : typeof lead.destLon === "string"
            ? Number(lead.destLon)
            : typeof lead.destinationLon === "number"
            ? lead.destinationLon
            : typeof lead.destinationLon === "string"
            ? Number(lead.destinationLon)
            : null;
        if (Number.isFinite(originLatRaw)) next.originLat = originLatRaw;
        if (Number.isFinite(originLonRaw)) next.originLon = originLonRaw;
        if (Number.isFinite(destLatRaw)) next.destinationLat = destLatRaw;
        if (Number.isFinite(destLonRaw)) next.destinationLon = destLonRaw;

        if (typeof lead.originHousingType === "string" && lead.originHousingType.trim()) {
          next.originHousingType = lead.originHousingType;
        }
        if (typeof lead.destHousingType === "string" && lead.destHousingType.trim()) {
          next.destinationHousingType = lead.destHousingType;
        }

        if (lead.originFloor != null) {
          next.originFloor = String(lead.originFloor);
        }
        if (lead.destFloor != null) {
          next.destinationFloor = String(lead.destFloor);
        }
        const originElevator = mapElevatorFromBo(lead.originElevator);
        if (originElevator) next.originElevator = originElevator;
        const destElevator = mapElevatorFromBo(lead.destElevator);
        if (destElevator) next.destinationElevator = destElevator;

        if (typeof lead.originFurnitureLift === "string" && lead.originFurnitureLift.trim()) {
          next.originFurnitureLift = lead.originFurnitureLift;
        }
        if (typeof lead.destFurnitureLift === "string" && lead.destFurnitureLift.trim()) {
          next.destinationFurnitureLift = lead.destFurnitureLift;
        }
        if (typeof lead.originCarryDistance === "string" && lead.originCarryDistance.trim()) {
          next.originCarryDistance = lead.originCarryDistance;
        }
        if (typeof lead.destCarryDistance === "string" && lead.destCarryDistance.trim()) {
          next.destinationCarryDistance = lead.destCarryDistance;
        }
        if (typeof lead.originParkingAuth === "boolean") {
          next.originParkingAuth = lead.originParkingAuth;
        }
        if (typeof lead.destParkingAuth === "boolean") {
          next.destinationParkingAuth = lead.destParkingAuth;
        }

        const movingDate = toInputDate(lead.movingDate);
        if (movingDate) next.movingDate = movingDate;
        if (typeof lead.dateFlexible === "boolean") {
          next.dateFlexible = lead.dateFlexible;
        }
        if (lead.surfaceM2 != null && Number.isFinite(Number(lead.surfaceM2))) {
          next.surfaceM2 = String(lead.surfaceM2);
        }
        const density = mapDensityFromBo(lead.density);
        if (density) next.density = density;
        if (typeof lead.formule === "string" && lead.formule.trim()) {
          next.formule = lead.formule;
        }

        if (!cancelled && Object.keys(next).length > 0) {
          updateFields(next);
        }
      } catch (err) {
        console.warn("⚠️ Unable to hydrate lead from BO:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlLeadId, updateFields]);

  // ── Hydratation depuis query params (moverz.fr → tunnel Step 3) ──
  // URL type: /devis-gratuits-v3?step=3&originPostalCode=75011&originCity=Paris&destinationPostalCode=13001&destinationCity=Marseille&surfaceM2=60
  const hydratedFromUrlRef = useRef(false);
  useEffect(() => {
    if (hydratedFromUrlRef.current) return;
    const stepParam = searchParams.get("step");
    if (stepParam !== "3") return;

    hydratedFromUrlRef.current = true;

    const next: Partial<typeof state> = {};

    const oPC = searchParams.get("originPostalCode")?.trim();
    if (oPC) next.originPostalCode = oPC;

    const oCity = searchParams.get("originCity")?.trim();
    if (oCity) next.originCity = oCity;

    const dPC = searchParams.get("destinationPostalCode")?.trim();
    if (dPC) next.destinationPostalCode = dPC;

    const dCity = searchParams.get("destinationCity")?.trim();
    if (dCity) next.destinationCity = dCity;

    const surfParam = searchParams.get("surfaceM2")?.trim();
    if (surfParam && Number.isFinite(Number(surfParam)) && Number(surfParam) >= 10) {
      next.surfaceM2 = surfParam;
    }

    if (Object.keys(next).length > 0) {
      next.currentStep = 3;
      next.enteredAtStep = 3; // Marque l'entrée directe en Step 3 (depuis moverz.fr)
      updateFields(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assurer des coordonnées même si l'adresse provient d'un lien / BO.
  useEffect(() => {
    if (state.originLat != null && state.originLon != null) return;
    if (!state.originPostalCode || !state.originCity) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        const q = `${state.originPostalCode} ${state.originCity}`;
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
  }, [
    state.originPostalCode,
    state.originCity,
    state.originLat,
    state.originLon,
    updateField,
  ]);

  useEffect(() => {
    if (state.destinationUnknown) return;
    if (state.destinationLat != null && state.destinationLon != null) return;
    if (!state.destinationPostalCode || !state.destinationCity) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        const q = `${state.destinationPostalCode} ${state.destinationCity}`;
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
    state.destinationUnknown,
    state.destinationPostalCode,
    state.destinationCity,
    state.destinationLat,
    state.destinationLon,
    updateField,
  ]);

  // ================================
  // V2 logic: surface defaults by housing type
  // ================================
  const HOUSING_SURFACE_DEFAULTS: Record<string, string> = {
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

  const lastOriginHousingTypeRef = useRef<string>("");

  useEffect(() => {
    // Auto-surface uniquement en Step 1 (aide à la saisie).
    // En Step 3, le changement Maison/Appartement concerne l'accès, pas la surface.
    if (state.currentStep > 1) return;

    const nextType = (state.originHousingType || "").trim();
    const prevType = lastOriginHousingTypeRef.current;
    if (nextType === prevType) return;
    lastOriginHousingTypeRef.current = nextType;

    // Pas encore choisi → ne rien faire
    if (!nextType) return;

    // Si l'utilisateur a déjà touché la surface, on ne la modifie plus automatiquement.
    if (state.surfaceTouched) return;

    const nextDefault = HOUSING_SURFACE_DEFAULTS[nextType];
    if (!nextDefault) return;

    // V2 rule: on n'écrase que si surface vide ou égale à l'ancien défaut.
    const surface = (state.surfaceM2 || "").trim();
    const prevDefault = HOUSING_SURFACE_DEFAULTS[prevType] ?? null;
    // Compat: si une ancienne session a `surfaceM2="60"` (ancien default V3),
    // on le traite comme "non saisi" au premier choix de logement.
    const isLegacyV3Default = !prevType && surface === "60" && !state.surfaceTouched;
    const shouldOverwrite =
      !surface || isLegacyV3Default || (prevDefault && surface === prevDefault);
    if (shouldOverwrite) {
      updateFields({ surfaceM2: nextDefault });
    }
  }, [state.originHousingType, state.currentStep]);
  
  const { trackStep, trackStepChange, trackCompletion, trackError } = useTunnelTracking({
    source,
    from,
    leadId: state.leadId,
  });

  // Track initial entry
  useEffect(() => {
    if (state.currentStep === 1 && !state.leadId) {
      ga4Event("form_start", {
        source,
        from,
        step_name: "CONTACT",
        step_index: 1,
      });
      trackStep(1, "CONTACT", "contact_v3");
    }
  }, [source, from]);

  // Track step views
  useEffect(() => {
      const stepMap = {
        1: { logical: "PROJECT" as const, screen: "qualification_v2" },
        2: { logical: "RECAP" as const, screen: "estimation_v2" },
        3: { logical: "PROJECT" as const, screen: "acces_v2" },
        4: { logical: "THANK_YOU" as const, screen: "confirmation_v2" },
      };
      const current = stepMap[state.currentStep as 1 | 2 | 3 | 4];
      if (current) {
        trackStep(state.currentStep, current.logical, current.screen);
      }
  }, [state.currentStep]);

  const toIsoDate = (raw: string | null | undefined): string | undefined => {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return undefined;
    return d.toISOString();
  };

  // Distance "trajet" (route) via OSRM / OpenStreetMap
  const distanceCacheRef = useRef<Map<string, number>>(new Map());
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDistanceProvider, setRouteDistanceProvider] = useState<
    "osrm" | "fallback" | null
  >(null);

  useEffect(() => {
    if (state.destinationUnknown) {
      setRouteDistanceKm(null);
      setRouteDistanceProvider(null);
      return;
    }

    const oLat = state.originLat;
    const oLon = state.originLon;
    const dLat = state.destinationLat;
    const dLon = state.destinationLon;

    // Pas de coords → on ne peut pas faire de route distance.
    if (oLat == null || oLon == null || dLat == null || dLon == null) {
      setRouteDistanceKm(null);
      setRouteDistanceProvider("fallback");
      return;
    }

    const key = [
      Math.round(oLat * 1e5) / 1e5,
      Math.round(oLon * 1e5) / 1e5,
      Math.round(dLat * 1e5) / 1e5,
      Math.round(dLon * 1e5) / 1e5,
    ].join(":");

    const cached = distanceCacheRef.current.get(key);
    if (typeof cached === "number") {
      setRouteDistanceKm(cached);
      setRouteDistanceProvider("osrm");
      return;
    }

    const ctrl = new AbortController();

    const run = async () => {
      try {
        const res = await fetch("/api/distance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { lat: oLat, lon: oLon },
            destination: { lat: dLat, lon: dLon },
            profile: "driving",
          }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          setRouteDistanceKm(null);
          setRouteDistanceProvider("fallback");
          return;
        }

        const data = (await res.json()) as {
          distanceKm?: number;
          provider?: string;
        };
        const km = typeof data?.distanceKm === "number" ? data.distanceKm : null;
        if (km && km > 0) {
          distanceCacheRef.current.set(key, km);
          setRouteDistanceKm(km);
          setRouteDistanceProvider("osrm");
        } else {
          setRouteDistanceKm(null);
          setRouteDistanceProvider("fallback");
        }
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setRouteDistanceKm(null);
        setRouteDistanceProvider("fallback");
      }
    };

    // Petite temporisation: évite de spammer OSRM quand on tape/blur rapidement.
    const t = window.setTimeout(() => {
      void run();
    }, 300);

    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [
    state.destinationUnknown,
    state.originLat,
    state.originLon,
    state.destinationLat,
    state.destinationLon,
  ]);

  // ── Distance OSRM ville-à-ville (capturée avant Step 3) ──
  // Sert de baseline pour Step 2, Step 3 "Première estimation" et reward.
  // Une fois figée, elle ne bouge plus quand l'utilisateur saisit des adresses exactes.
  const cityOsrmCapturedRef = useRef(false);
  const [cityOsrmDistanceKm, setCityOsrmDistanceKm] = useState<number | null>(null);

  useEffect(() => {
    if (routeDistanceKm == null || routeDistanceProvider !== "osrm") return;

    if (state.currentStep < 3) {
      // Avant Step 3 : toujours mettre à jour (coords = ville)
      setCityOsrmDistanceKm(routeDistanceKm);
      cityOsrmCapturedRef.current = true;
      return;
    }

    // En Step 3+ : capturer UNE FOIS (ex: arrivée directe depuis moverz.fr)
    if (!cityOsrmCapturedRef.current) {
      setCityOsrmDistanceKm(routeDistanceKm);
      cityOsrmCapturedRef.current = true;
    }
  }, [state.currentStep, routeDistanceKm, routeDistanceProvider]);

  const getSeasonFactor = (dateStr: string | null | undefined): number => {
    const d = parseInputDateLocal(dateStr);
    if (!d) return 1;
    const month = d.getMonth() + 1;
    if ((month >= 6 && month <= 9) || month === 12) return 1.3;
    if (month === 1 || month === 2 || month === 11) return 0.85;
    return 1.0;
  };

  const getUrgencyFactor = (dateStr: string | null | undefined): number => {
    const d = parseInputDateLocal(dateStr);
    if (!d) return 1;

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 0 || diffDays > 365) return 1;
    // Step 3 impose déjà un min J+15, donc on ne considère "urgent" que <= 15 jours.
    if (diffDays <= 15) return 1.15;
    return 1;
  };

  const isHouseType = (t: string | null | undefined) =>
    !!t && (t === "house" || t.startsWith("house_"));

  const toPricingElevator = (e: string): "yes" | "no" | "partial" => {
    if (!e || e === "none" || e === "no") return "no";
    if (e === "small" || e === "partial") return "partial";
    return "yes";
  };

  const pricingByFormule = useMemo(() => {
    const surface = parseInt(state.surfaceM2) || 60;
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return null;

    // La surface (m²) est saisie en Step 1; le choix "Maison/Appartement" en Step 3
    // ne doit pas modifier le volume (sinon les prix bougent alors que la surface est déjà connue).
    const housingType = "t2" as const;
    // UI: pas de pré-sélection en Step 3. Calcul: hypothèse par défaut "très meublé".
    const density = (state.density || "dense") as "light" | "normal" | "dense";

    // Exiger une distance route (OSRM). Pas de fallback heuristique.
    if (state.destinationUnknown) return null;
    if (routeDistanceKm == null) return null;
    const distanceKm = routeDistanceKm;
    const seasonFactor = getSeasonFactor(state.movingDate) * getUrgencyFactor(state.movingDate);

    const originIsHouse = isHouseType(state.originHousingType);
    const destIsHouse = isHouseType(state.destinationHousingType);

    const originFloor = originIsHouse ? 0 : parseInt(state.originFloor || "0", 10) || 0;
    const destinationFloor = state.destinationUnknown
      ? 0
      : destIsHouse
      ? 0
      : parseInt(state.destinationFloor || "0", 10) || 0;

    const originElevator = toPricingElevator(state.originElevator);
    const destinationElevator = state.destinationUnknown
      ? "yes"
      : toPricingElevator(state.destinationElevator);

    const monteMeuble = !!state.lift_required;

    const piano =
      state.servicePiano === "droit"
        ? ("droit" as const)
        : state.servicePiano === "quart"
        ? ("quart" as const)
        : null;

    const kitchenExtraVolumeM3 = (() => {
      // UI: pas de pré-sélection en Step 3. Calcul: hypothèse par défaut = 3 équipements.
      const effectiveMode = state.kitchenIncluded || "appliances";
      const effectiveCount =
        state.kitchenIncluded === ""
          ? 3
          : Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;

      if (effectiveMode === "full") return 6;
      if (effectiveMode === "appliances") return Math.max(0, effectiveCount) * 0.6;
      return 0;
    })();

    const longCarry = !!state.long_carry;
    const difficultParking = !!state.difficult_parking;
    const tightAccess = !!state.narrow_access;

    const baseInput = {
      surfaceM2: surface,
      housingType,
      density,
      distanceKm,
      seasonFactor,
      originFloor,
      originElevator,
      destinationFloor,
      destinationElevator,
      services: {
        monteMeuble,
        piano,
        debarras: state.serviceDebarras,
      },
      longCarry,
      difficultParking,
      tightAccess,
      extraVolumeM3: kitchenExtraVolumeM3,
    };

    const formules: PricingFormuleType[] = ["ECONOMIQUE", "STANDARD", "PREMIUM"];
    return formules.reduce<Record<PricingFormuleType, ReturnType<typeof calculatePricing>>>(
      (acc, formule) => {
        acc[formule] = calculatePricing({ ...baseInput, formule });
        return acc;
      },
      {} as any
    );
  }, [
    state.surfaceM2,
    state.originHousingType,
    state.destinationHousingType,
    state.density,
    state.kitchenIncluded,
    state.kitchenApplianceCount,
    state.originPostalCode,
    state.destinationPostalCode,
    state.destinationUnknown,
    routeDistanceKm,
    state.movingDate,
    state.originFloor,
    state.originElevator,
    state.destinationFloor,
    state.destinationElevator,
    state.originFurnitureLift,
    state.destinationFurnitureLift,
    state.servicePiano,
    state.serviceDebarras,
  ]);

  const activePricing = useMemo(() => {
    if (!pricingByFormule) return null;
    return pricingByFormule[state.formule as PricingFormuleType] ?? null;
  }, [pricingByFormule, state.formule]);

  // Step 2 (V2) : estimation basée sur hypothèses fixes (reward) tant qu'on n'a pas les adresses exactes.
  // Hypothèses (alignées sur "Première estimation" du panier Step 3):
  // - distance OSRM ville-à-ville + 15 km (buffer "bonne surprise")
  // - densité très meublé
  // - cuisine = 3 équipements (0,6m³/équipement)
  // - pas de saison
  // - accès RAS
  const v2PricingByFormuleStep2 = useMemo(() => {
    if (state.currentStep !== 2) return null;
    const baselineDistanceKm = getBaselineDistanceKm(cityOsrmDistanceKm);
    if (baselineDistanceKm == null) return null; // attend l'OSRM

    const surface = parseInt(state.surfaceM2) || 60;
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return null;

    return computeBaselineEstimateByFormule({
      surfaceM2: surface,
      distanceKm: baselineDistanceKm,
    });
  }, [
    state.currentStep,
    state.surfaceM2,
    cityOsrmDistanceKm,
  ]);

  // Step 2 affiche le prix de la formule sélectionnée (STANDARD par défaut)
  const activePricingStep2 = useMemo(() => {
    if (!v2PricingByFormuleStep2) return null;
    return v2PricingByFormuleStep2[state.formule as PricingFormuleType] ?? v2PricingByFormuleStep2.STANDARD ?? null;
  }, [v2PricingByFormuleStep2, state.formule]);

  const v2FirstEstimateDistanceKm = useMemo(() => {
    if (state.destinationUnknown) return null;
    return getBaselineDistanceKm(cityOsrmDistanceKm);
  }, [
    state.destinationUnknown,
    cityOsrmDistanceKm,
  ]);

  const v2DebugRowsStep2 = useMemo(() => {
    if (!debugMode) return null;
    if (state.currentStep !== 2) return null;
    const baselineDistanceKm = getBaselineDistanceKm(cityOsrmDistanceKm);
    if (baselineDistanceKm == null) return null;

    const surface = parseInt(state.surfaceM2) || 60;
    const selectedFormule = state.formule as PricingFormuleType;
    const distanceKm = baselineDistanceKm;
    const extraVolumeM3 = 3 * 0.6; // debug Step 2: cuisine=3 équipements
    const baseVolumeM3 = calculateVolume(surface, "t2", "dense");
    const volumeM3 = Math.round((baseVolumeM3 + extraVolumeM3) * 10) / 10;

    const band = getDistanceBand(distanceKm);
    const decoteFactor = 1 + DECOTE;
    const rateRaw = LA_POSTE_RATES_EUR_PER_M3[band][selectedFormule];
    const rateApplied = rateRaw * decoteFactor;
    const volumeScale = getVolumeEconomyScale(volumeM3);
    const volumeCost = volumeM3 * rateApplied * volumeScale;
    const distanceCost = Math.max(0, distanceKm) * COEF_DISTANCE * decoteFactor;
    const socleApplied = volumeCost < PRIX_MIN_SOCLE;
    const baseNoSeason = Math.max(volumeCost, PRIX_MIN_SOCLE) + distanceCost;

    // Baseline Step 2: accès RAS
    const coeffEtage = getEtageCoefficient(0, "yes");
    const coeffAccess = 1;
    const centreNoSeasonSansServices = baseNoSeason * coeffEtage * coeffAccess;

    const pricing = calculatePricing({
      surfaceM2: surface,
      housingType: "t2",
      density: "dense",
      distanceKm,
      seasonFactor: 1,
      originFloor: 0,
      originElevator: "yes",
      destinationFloor: 0,
      destinationElevator: "yes",
      formule: selectedFormule,
      services: { monteMeuble: false, piano: null, debarras: false },
      extraVolumeM3,
    });

    const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
    const fmtEur = (n: number) =>
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

    return [
      { label: "distance baseline (OSRM villes +15)", value: `${Math.round(distanceKm)} km` },
      { label: "band distance", value: band },
      { label: "rate €/m³ (raw)", value: fmt(rateRaw) },
      { label: `DECOTE`, value: `${Math.round(DECOTE * 100)}% (×${fmt(decoteFactor)})` },
      { label: "rate €/m³ (appliquée)", value: fmt(rateApplied) },
      { label: "volume base (t2×dense)", value: `${fmt(baseVolumeM3)} m³` },
      { label: "extra volume cuisine", value: `${fmt(extraVolumeM3)} m³` },
      { label: "volume total", value: `${fmt(volumeM3)} m³` },
      { label: "volumeScale", value: fmt(volumeScale) },
      { label: "volumeCost", value: fmtEur(volumeCost) },
      { label: "distanceCost", value: fmtEur(distanceCost) },
      { label: "socle appliqué ?", value: socleApplied ? `oui (${fmtEur(PRIX_MIN_SOCLE)})` : "non" },
      { label: "baseNoSeason", value: fmtEur(baseNoSeason) },
      { label: "coeffEtage", value: fmt(coeffEtage) },
      { label: "coeffAccess", value: fmt(coeffAccess) },
      { label: "centreNoSeason (hors services)", value: fmtEur(centreNoSeasonSansServices) },
      { label: "prixMin / prixMax", value: `${fmtEur(pricing.prixMin)} — ${fmtEur(pricing.prixMax)}` },
    ];
  }, [
    debugMode,
    state.currentStep,
    state.surfaceM2,
    state.formule,
    cityOsrmDistanceKm,
  ]);

  // Reward baseline (figé) : en cas de refresh direct en Step 3, on hydrate une fois le baseline
  // (mêmes hypothèses que la Step 2) pour éviter l'affichage vide.
  // Utilise la distance OSRM ville-à-ville + 15 km.
  useEffect(() => {
    if (state.currentStep < 3) return;
    if (state.rewardBaselineMinEur != null && state.rewardBaselineMaxEur != null) return;
    const baselineDistanceKm = getBaselineDistanceKm(cityOsrmDistanceKm);
    if (baselineDistanceKm == null) return; // attend l'OSRM

    const surface = parseInt(state.surfaceM2) || 60;
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return;

    const baseline = computeBaselineEstimate({
      surfaceM2: surface,
      distanceKm: baselineDistanceKm,
      formule: state.formule as PricingFormuleType,
    });
    updateFields({
      rewardBaselineMinEur: baseline.prixMin ?? null,
      rewardBaselineMaxEur: baseline.prixMax ?? null,
      rewardBaselineDistanceKm: baselineDistanceKm,
      rewardBaselineFormule: state.formule,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.currentStep,
    state.rewardBaselineMinEur,
    state.rewardBaselineMaxEur,
    state.surfaceM2,
    state.formule,
    cityOsrmDistanceKm,
  ]);

  // Panier (Step 3): Première estimation (hypothèses fixes) → deltas → Budget affiné
  const v2PricingCart = useMemo(() => {
    const centerEur = (minEur: number, maxEur: number): number =>
      getDisplayedCenter(minEur, maxEur);
    const formatDelta = (delta: number) => Math.round(delta);

    const surface = parseInt(state.surfaceM2) || 60;
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return null;

    const selectedFormule = state.formule as PricingFormuleType;
    const baselineFormule: PricingFormuleType = "STANDARD";

    // Première estimation figée (Step 2): distance baseline + hypothèses fixes
    // pour éviter un panier qui "bouge" pendant la saisie libre des adresses.
    const baseDistanceKm =
      state.rewardBaselineDistanceKm != null && Number.isFinite(state.rewardBaselineDistanceKm)
        ? state.rewardBaselineDistanceKm
        : getBaselineDistanceKm(cityOsrmDistanceKm);
    if (baseDistanceKm == null) return null;

    // Baseline fixe = STANDARD (source de vérité du "Budget initial")
    const baselineInput: Parameters<typeof calculatePricing>[0] = {
      surfaceM2: surface,
      housingType: "t2" as const,
      density: "dense" as const,
      distanceKm: baseDistanceKm,
      seasonFactor: 1,
      originFloor: 0,
      originElevator: "yes" as const,
      destinationFloor: 0,
      destinationElevator: "yes" as const,
      services: { monteMeuble: false, piano: null as null, debarras: false },
      formule: baselineFormule,
      extraVolumeM3: 3 * 0.6, // cuisine = 3 équipements
    };

    const s0 = computeBaselineEstimate({
      surfaceM2: surface,
      distanceKm: baseDistanceKm,
      formule: baselineFormule,
    });
    const firstEstimateCenterEur = centerEur(s0.prixMin, s0.prixMax);

    const minMovingDate = getMinMovingDateIso();
    const isMovingDateValid = !!state.movingDate && state.movingDate >= minMovingDate;

    // Distance disponible via OSRM (si adresses validées)
    const isRouteDistanceValid =
      routeDistanceKm != null &&
      Number.isFinite(routeDistanceKm) &&
      routeDistanceKm > 0 &&
      routeDistanceProvider === "osrm";
    const addressesFilled =
      !state.destinationUnknown &&
      (state.originAddress || "").trim().length >= 5 &&
      (state.destinationAddress || "").trim().length >= 5;
    const canUseOsrmDistance = addressesFilled && isRouteDistanceValid;

    // Distance utilisée dans le montant final:
    // - baseline tant que les adresses ne sont pas validées OSRM,
    // - OSRM dès que disponible (cohérence avec la ligne "Distance").
    const refinedDistanceKm = canUseOsrmDistance ? routeDistanceKm! : baseDistanceKm;

    // 1) Distance:
    // - détail distance (info utilisateur) basé sur OSRM si disponible
    // - montant global reste basé sur la baseline figée
    const inputDistance = { ...baselineInput, distanceKm: refinedDistanceKm };
    const sDist = calculatePricing(inputDistance);
    const deltaDistanceEur = canUseOsrmDistance
      ? formatDelta(centerEur(sDist.prixMin, sDist.prixMax) - firstEstimateCenterEur)
      : 0;

    // 2) Densité (delta vs "Très meublé")
    const densityTouched = state.density !== "";
    const effectiveDensity = (state.density || "dense") as "light" | "normal" | "dense";
    const inputDensity: Parameters<typeof calculatePricing>[0] = {
      ...inputDistance,
      density: effectiveDensity,
    };
    const sDensity = calculatePricing(inputDensity);
    const deltaDensityEur = densityTouched
      ? formatDelta(
          centerEur(sDensity.prixMin, sDensity.prixMax) -
            centerEur(sDist.prixMin, sDist.prixMax)
        )
      : 0;

    // 3) Cuisine (delta vs "3 équipements")
    const kitchenApplianceCount =
      Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;
    const kitchenTouched =
      state.kitchenIncluded !== "" || (state.kitchenApplianceCount || "").trim().length > 0;
    const baselineKitchenExtraVolumeM3 = 3 * 0.6;
    const kitchenExtraVolumeM3 = (() => {
      // UI: pas de pré-sélection. Calcul: hypothèse par défaut = 3 équipements.
      if (!kitchenTouched) return baselineKitchenExtraVolumeM3;

      if (state.kitchenIncluded === "full") return 6;
      if (state.kitchenIncluded === "appliances") return Math.max(0, kitchenApplianceCount) * 0.6;
      // "none" ou invalide => 0
      return 0;
    })();
    const inputKitchen = { ...inputDensity, extraVolumeM3: kitchenExtraVolumeM3 };
    const sKitchen = calculatePricing(inputKitchen);
    const deltaKitchenEur = kitchenTouched
      ? formatDelta(
          centerEur(sKitchen.prixMin, sKitchen.prixMax) -
            centerEur(sDensity.prixMin, sDensity.prixMax)
        )
      : 0;

    // 4) Date (saison/urgence) — appliqué uniquement sur la valeur de base (avant accès)
    const seasonFactor = isMovingDateValid
      ? getSeasonFactor(state.movingDate) * getUrgencyFactor(state.movingDate)
      : 1;
    const inputDate = { ...inputKitchen, seasonFactor };
    const sDate = calculatePricing(inputDate);
    const deltaDateEur = formatDelta(
      centerEur(sDate.prixMin, sDate.prixMax) - centerEur(sKitchen.prixMin, sKitchen.prixMax)
    );

    // 5) Accès (2 groupes): logement/étage ET contraintes d'accès
    const originIsHouse = isHouseType(state.originHousingType);
    const destIsHouse = isHouseType(state.destinationHousingType);
    const originHousingComplete = (state.originHousingType || "").trim().length > 0;
    const destinationHousingComplete = state.destinationUnknown
      ? true
      : (state.destinationHousingType || "").trim().length > 0;
    const originFloorComplete = originIsHouse ? true : (state.originFloor || "").trim().length > 0;
    const destinationFloorComplete = state.destinationUnknown
      ? true
      : destIsHouse
      ? true
      : (state.destinationFloor || "").trim().length > 0;
    const accessHousingConfirmed =
      originHousingComplete &&
      destinationHousingComplete &&
      originFloorComplete &&
      destinationFloorComplete;

    const accessConstraintsConfirmed =
      !!state.narrow_access ||
      !!state.long_carry ||
      !!state.difficult_parking ||
      !!state.lift_required;

    const accessMeta = (() => {
      const originFloor = originIsHouse ? 0 : parseInt(state.originFloor || "0", 10) || 0;
      const destinationFloor = state.destinationUnknown
        ? 0
        : destIsHouse
        ? 0
        : parseInt(state.destinationFloor || "0", 10) || 0;
      const originElevator = toPricingElevator(state.originElevator);
      const destinationElevator = toPricingElevator(state.destinationElevator);
      const inferredMonteMeuble =
        (originElevator === "no" && originFloor >= 4) ||
        (destinationElevator === "no" && destinationFloor >= 4);
      const needsMonteMeuble = inferredMonteMeuble || !!state.lift_required;
      return {
        originFloor,
        destinationFloor,
        originElevator,
        destinationElevator,
        inferredMonteMeuble,
        needsMonteMeuble,
      };
    })();

    const inputAccessHousing = (() => {
      if (!accessHousingConfirmed) return inputDate;
      return {
        ...inputDate,
        originFloor: accessMeta.originFloor,
        originElevator: accessMeta.originElevator,
        destinationFloor: accessMeta.destinationFloor,
        destinationElevator: accessMeta.destinationElevator,
        services: {
          ...inputDate.services,
          // Monte-meuble implicite lié aux étages/ascenseurs
          monteMeuble: accessMeta.inferredMonteMeuble,
        },
      };
    })();
    const sAccessHousing = calculatePricing(inputAccessHousing);
    const deltaAccessHousingEur = accessHousingConfirmed
      ? formatDelta(
          centerEur(sAccessHousing.prixMin, sAccessHousing.prixMax) -
            centerEur(sDate.prixMin, sDate.prixMax)
        )
      : 0;

    const inputAccessConstraints = (() => {
      if (!accessConstraintsConfirmed) return inputAccessHousing;
      return {
        ...inputAccessHousing,
        longCarry: !!state.long_carry,
        tightAccess: !!state.narrow_access,
        difficultParking: !!state.difficult_parking,
        services: {
          ...inputAccessHousing.services,
          // Monte-meuble explicite via la question contraintes
          monteMeuble: accessMeta.needsMonteMeuble,
        },
      };
    })();
    const sAccessStandard = calculatePricing(inputAccessConstraints);
    const deltaAccessConstraintsEur = accessConstraintsConfirmed
      ? formatDelta(
          centerEur(sAccessStandard.prixMin, sAccessStandard.prixMax) -
            centerEur(sAccessHousing.prixMin, sAccessHousing.prixMax)
        )
      : 0;

    const inputSelectedFormule = {
      ...inputAccessConstraints,
      formule: selectedFormule,
    };
    const sFinal =
      selectedFormule === baselineFormule
        ? sAccessStandard
        : calculatePricing(inputSelectedFormule);
    const deltaFormuleEur =
      selectedFormule === baselineFormule
        ? 0
        : formatDelta(
            centerEur(sFinal.prixMin, sFinal.prixMax) -
              centerEur(sAccessStandard.prixMin, sAccessStandard.prixMax)
          );

    const refinedCenterEur = centerEur(sFinal.prixMin, sFinal.prixMax);

    const densityLabel =
      !densityTouched
        ? "par défaut (très meublé)"
        : effectiveDensity === "light"
        ? "peu meublé"
        : effectiveDensity === "dense"
        ? "très meublé"
        : "normal";
    const kitchenLabel =
      !kitchenTouched
        ? "par défaut (3 équipements)"
        : state.kitchenIncluded === "full"
        ? "cuisine complète"
        : state.kitchenIncluded === "appliances"
        ? `${Math.max(0, kitchenApplianceCount)} équipement(s)`
        : "rien";
    const accessHousingLabel = `${originIsHouse ? "maison" : `étage ${accessMeta.originFloor}`} → ${
      state.destinationUnknown
        ? "destination inconnue"
        : destIsHouse
        ? "maison"
        : `étage ${accessMeta.destinationFloor}`
    }`;
    const accessConstraintsLabel = accessMeta.needsMonteMeuble
      ? "≥4 sans ascenseur (monte-meuble)"
      : "confirmées";

    const formuleLabel =
      selectedFormule === "ECONOMIQUE"
        ? "Éco"
        : selectedFormule === "PREMIUM"
        ? "Premium"
        : "Standard";

    const lines: Array<{
      key:
        | "distance"
        | "density"
        | "kitchen"
        | "date"
        | "access_housing"
        | "access_constraints"
        | "formule";
      label: string;
      status: string;
      amountEur: number;
      confirmed: boolean;
    }> = [];

    if (canUseOsrmDistance) {
      lines.push({
        key: "distance",
        label: "Distance",
        status: "adresses validées",
        amountEur: deltaDistanceEur,
        confirmed: true,
      });
    }
    if (accessHousingConfirmed) {
      lines.push({
        key: "access_housing",
        label: "Acces - étages",
        status: accessHousingLabel,
        amountEur: deltaAccessHousingEur,
        confirmed: true,
      });
    }
    if (accessConstraintsConfirmed) {
      lines.push({
        key: "access_constraints",
        label: "Accès · Contraintes",
        status: accessConstraintsLabel,
        amountEur: deltaAccessConstraintsEur,
        confirmed: true,
      });
    }
    if (isMovingDateValid) {
      lines.push({
        key: "date",
        label: "Date",
        status: "confirmée",
        amountEur: deltaDateEur,
        confirmed: true,
      });
    }
    if (densityTouched) {
      lines.push({
        key: "density",
        label: "Densité",
        status: densityLabel,
        amountEur: deltaDensityEur,
        confirmed: true,
      });
    }
    if (kitchenTouched) {
      lines.push({
        key: "kitchen",
        label: "Cuisine",
        status: kitchenLabel,
        amountEur: deltaKitchenEur,
        confirmed: true,
      });
    }
    lines.push({
      key: "formule",
      label: "Formule",
      status: formuleLabel,
      amountEur: deltaFormuleEur,
      confirmed: true,
    });

    return {
      firstEstimateMinEur: s0.prixMin,
      firstEstimateMaxEur: s0.prixMax,
      firstEstimateCenterEur,
      refinedMinEur: sFinal.prixMin,
      refinedMaxEur: sFinal.prixMax,
      refinedCenterEur,
      lines,
      formuleLabel,
    };
  }, [
    cityOsrmDistanceKm,
    routeDistanceKm,
    routeDistanceProvider,
    state.rewardBaselineDistanceKm,
    state.originAddress,
    state.destinationAddress,
    state.surfaceM2,
    state.formule,
    state.density,
    state.kitchenIncluded,
    state.kitchenApplianceCount,
    state.movingDate,
    state.originHousingType,
    state.destinationHousingType,
    state.originFloor,
    state.destinationFloor,
    state.originElevator,
    state.destinationElevator,
    state.originHousingTypeTouched,
    state.destinationHousingTypeTouched,
    state.originFloorTouched,
    state.destinationFloorTouched,
    state.originElevatorTouched,
    state.destinationElevatorTouched,
    state.destinationUnknown,
    state.narrow_access,
    state.long_carry,
    state.difficult_parking,
    state.lift_required,
  ]);

  const estimateRange = useMemo(() => {
    if (!pricingByFormule) return null;
    const values = Object.values(pricingByFormule) as Array<ReturnType<typeof calculatePricing>>;
    const min = Math.min(...values.map((v) => v.prixMin));
    const max = Math.max(...values.map((v) => v.prixMax));
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { minEur: min, maxEur: max };
  }, [pricingByFormule]);

  const estimateIsIndicative = useMemo(() => {
    const hasHousing = !!(state.originHousingType || state.destinationHousingType);
    const hasDate = !!state.movingDate;
    const hasOriginZip = !!state.originPostalCode;
    const hasDestZip = state.destinationUnknown ? true : !!state.destinationPostalCode;
    return !(hasHousing && hasDate && hasOriginZip && hasDestZip);
  }, [
    state.originHousingType,
    state.destinationHousingType,
    state.movingDate,
    state.originPostalCode,
    state.destinationPostalCode,
    state.destinationUnknown,
  ]);

  const step3Progress = useMemo(() => {
    const isOriginAddrValid = state.originAddress.trim().length >= 5;
    const isDestinationAddrValid = state.destinationAddress.trim().length >= 5;
    const isOriginMetaValid =
      state.originCity.trim().length >= 2 &&
      state.originPostalCode.trim().length >= 2 &&
      state.originCountryCode.trim().length >= 2;
    const isDestMetaValid =
      state.destinationCity.trim().length >= 2 &&
      state.destinationPostalCode.trim().length >= 2 &&
      state.destinationCountryCode.trim().length >= 2;
    const isRouteDistanceValid = routeDistanceKm != null && routeDistanceProvider === "osrm";
    const blocTrajet = isOriginAddrValid && isDestinationAddrValid && isOriginMetaValid && isDestMetaValid && isRouteDistanceValid;

    const minMovingDateV2 = getMinMovingDateIso();
    const blocDate = typeof state.movingDate === "string" && state.movingDate.length > 0 && state.movingDate >= minMovingDateV2;

    const blocVolume =
      (state.density === "light" || state.density === "normal" || state.density === "dense") &&
      (state.kitchenIncluded === "none" ||
        state.kitchenIncluded === "appliances" ||
        state.kitchenIncluded === "full") &&
      (state.kitchenIncluded !== "appliances" ||
        (Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0) >= 1);

    const blocFormule = !!state.formule;
    const blocContact =
      state.firstName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim());

    const completed = [blocTrajet, blocDate, blocVolume, blocFormule, blocContact].filter(Boolean).length;
    const total = 5;
    return { completed, total, score: Math.round((completed / total) * 100) };
  }, [
    state.originAddress,
    state.destinationAddress,
    state.originCity,
    state.destinationCity,
    state.originPostalCode,
    state.destinationPostalCode,
    state.originCountryCode,
    state.destinationCountryCode,
    state.movingDate,
    state.density,
    state.kitchenIncluded,
    state.kitchenApplianceCount,
    state.formule,
    state.firstName,
    state.email,
    routeDistanceKm,
    routeDistanceProvider,
  ]);

  const activePricingDetails = useMemo(() => {
    if (!activePricing) return null;

    const surface = parseInt(state.surfaceM2) || 60;
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return null;

    const housingType = "t2" as const;
    const typeCoefficient = TYPE_COEFFICIENTS[housingType];
    const effectiveDensity = (state.density || "dense") as "light" | "normal" | "dense";
    const densityCoefficient = DENSITY_COEFFICIENTS[effectiveDensity];

    if (state.destinationUnknown) return null;
    if (routeDistanceKm == null) return null;
    const distanceKm = routeDistanceKm;
    const distanceSource: "osrm" | "fallback" | null = "osrm";

    const seasonFactor = getSeasonFactor(state.movingDate) * getUrgencyFactor(state.movingDate);

    const originIsHouse = isHouseType(state.originHousingType);
    const destIsHouse = isHouseType(state.destinationHousingType);

    const originFloor = originIsHouse ? 0 : parseInt(state.originFloor || "0", 10) || 0;
    const destinationFloor = state.destinationUnknown
      ? 0
      : destIsHouse
      ? 0
      : parseInt(state.destinationFloor || "0", 10) || 0;

    const originElevator = toPricingElevator(state.originElevator);
    const destinationElevator = state.destinationUnknown
      ? "yes"
      : toPricingElevator(state.destinationElevator);

    const monteMeuble = !!state.lift_required;

    const piano =
      state.servicePiano === "droit"
        ? ("droit" as const)
        : state.servicePiano === "quart"
        ? ("quart" as const)
        : null;

    const formule = state.formule as PricingFormuleType;
    // Formule déjà incluse dans le tarif La Poste (€/m³). On neutralise ici pour refléter calculatePricing.
    const formuleMultiplier = 1;

    const baseVolume = surface * typeCoefficient;
    const adjustedVolume = baseVolume * densityCoefficient;
    const volumeM3 = Math.round(adjustedVolume * 10) / 10;

    const band = getDistanceBand(distanceKm);
    // Décote globale (Option A): appliquée à rate €/m³ + coef distance uniquement (pas au socle, ni aux services)
    const DECOTE_FACTOR = 1 + DECOTE;
    const rateEurPerM3 = LA_POSTE_RATES_EUR_PER_M3[band][formule] * DECOTE_FACTOR;
    const volumeScale = getVolumeEconomyScale(volumeM3);
    const volumeCost = volumeM3 * rateEurPerM3 * volumeScale;
    const distanceCost = Math.max(0, distanceKm) * COEF_DISTANCE * DECOTE_FACTOR;
    const baseNoSeasonEur = Math.max(volumeCost, PRIX_MIN_SOCLE) + distanceCost;

    const coeffOrigin = getEtageCoefficient(originFloor, originElevator);
    const coeffDest = getEtageCoefficient(destinationFloor, destinationElevator);
    const coeffEtage = Math.max(coeffOrigin, coeffDest);

    // Recomposition (miroir calculatePricing)
    const centreNoSeasonSansServices = baseNoSeasonEur * formuleMultiplier * coeffEtage;
    const centreSeasonedSansServices =
      baseNoSeasonEur * seasonFactor * formuleMultiplier * coeffEtage;

    const longCarry = !!state.long_carry;
    const difficultParking = !!state.difficult_parking;
    const tightAccess = !!state.narrow_access;
    const hasTightAccess = tightAccess || originElevator === "partial" || destinationElevator === "partial";
    const coeffAccess =
      (longCarry ? 1.05 : 1) *
      (hasTightAccess ? 1.05 : 1) *
      (difficultParking ? 1.03 : 1);

    const servicesTotalEur = activePricing.servicesTotal;
    const centreNoSeasonEur = centreNoSeasonSansServices * coeffAccess + servicesTotalEur;
    const centreSeasonedEur = centreSeasonedSansServices * coeffAccess + servicesTotalEur;

    return {
      surfaceM2: surface,
      housingType,
      density: effectiveDensity,
      distanceKm,
      distanceSource,
      seasonFactor,
      originFloor,
      originElevator,
      destinationFloor,
      destinationElevator,
      services: {
        monteMeuble,
        piano,
        debarras: state.serviceDebarras,
      },
      constants: {
        typeCoefficient,
        densityCoefficient,
        PRIX_MIN_SOCLE,
        distanceBand: band,
        rateEurPerM3,
        volumeScale,
      },
      intermediate: {
        baseVolumeM3: Math.round(baseVolume * 10) / 10,
        adjustedVolumeM3: volumeM3,
        baseNoSeasonEur: Math.round(baseNoSeasonEur),
        coeffEtage,
        servicesTotalEur,
        centreNoSeasonEur: Math.round(centreNoSeasonEur),
        centreSeasonedEur: Math.round(centreSeasonedEur),
      },
    };
  }, [
    activePricing,
    state.surfaceM2,
    state.originHousingType,
    state.destinationHousingType,
    state.density,
    state.destinationUnknown,
    state.originPostalCode,
    state.destinationPostalCode,
    routeDistanceKm,
    state.movingDate,
    state.originFloor,
    state.destinationFloor,
    state.originElevator,
    state.destinationElevator,
    state.originFurnitureLift,
    state.destinationFurnitureLift,
    state.servicePiano,
    state.serviceDebarras,
  ]);

  const handleSubmitQualificationV2 = (e: FormEvent) => {
    e.preventDefault();
    const isOriginValid =
      state.originCity.trim().length >= 2 &&
      state.originPostalCode.trim().length >= 2 &&
      state.originLat != null &&
      state.originLon != null;
    const isDestinationValid =
      state.destinationCity.trim().length >= 2 &&
      state.destinationPostalCode.trim().length >= 2 &&
      state.destinationLat != null &&
      state.destinationLon != null;
    const isSurfaceValid = (() => {
      const n = Number.parseInt(String(state.surfaceM2 || "").trim(), 10);
      return Number.isFinite(n) && n >= 10 && n <= 500;
    })();

    if (!isOriginValid || !isDestinationValid || !isSurfaceValid) {
      setShowValidationStep1(true);
      requestAnimationFrame(() => {
        const focusId = !isOriginValid
          ? "v4-origin-city"
          : !isDestinationValid
          ? "v4-destination-city"
          : "v4-surface-m2";
        document
          .getElementById(focusId)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById(focusId) as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Missing required fields", 1, "PROJECT", "qualification_v2");
      return;
    }

    setShowValidationStep1(false);
    trackStepChange(1, 2, "PROJECT", "RECAP", "estimation_v2", "forward");
    goToStep(2);
  };

  const handleSubmitEstimationV2 = (e: FormEvent) => {
    e.preventDefault();
    // Reward: figer la valeur Step 2 (avec buffers) au passage vers Step 3
    if (v2PricingByFormuleStep2 && activePricingStep2) {
      const baselineDistanceKm = getBaselineDistanceKm(cityOsrmDistanceKm);
      updateFields({
        rewardBaselineMinEur: activePricingStep2.prixMin ?? null,
        rewardBaselineMaxEur: activePricingStep2.prixMax ?? null,
        rewardBaselineDistanceKm: baselineDistanceKm,
        rewardBaselineFormule: state.formule,
      });
    }
    trackStepChange(2, 3, "RECAP", "PROJECT", "acces_v2", "forward");
    goToStep(3);
  };

  const mapStep3FieldToImpactId = (
    field: string
  ):
    | "distance"
    | "date"
    | "density"
    | "kitchen"
    | "access_housing"
    | "access_constraints"
    | null => {
    if (
      field === "originAddress" ||
      field === "destinationAddress" ||
      field === "originPostalCode" ||
      field === "destinationPostalCode" ||
      field === "originCity" ||
      field === "destinationCity" ||
      field === "originCountryCode" ||
      field === "destinationCountryCode" ||
      field === "originLat" ||
      field === "originLon" ||
      field === "destinationLat" ||
      field === "destinationLon"
    ) {
      return "distance";
    }
    if (field === "movingDate" || field === "dateFlexible") return "date";
    if (field === "density") return "density";
    if (field === "kitchenIncluded" || field === "kitchenApplianceCount") return "kitchen";
    if (
      field === "originHousingType" ||
      field === "originFloor" ||
      field === "originElevator" ||
      field === "destinationHousingType" ||
      field === "destinationFloor" ||
      field === "destinationElevator" ||
      field === "destinationUnknown"
    ) {
      return "access_housing";
    }
    if (
      field === "narrow_access" ||
      field === "long_carry" ||
      field === "difficult_parking" ||
      field === "lift_required" ||
      field === "access_type" ||
      field === "access_details"
    ) {
      return "access_constraints";
    }
    return null;
  };

  const handleStep3FieldChange = (field: string, value: any) => {
    updateField(field as any, value);
    const mapped = mapStep3FieldToImpactId(field);
    if (mapped) setLastImpactDetailId(mapped);
  };

  const handleSubmitAccessV2 = async () => {
    // Validation adresses (requis) + complétude ville/CP/pays
    const isOriginAddrValid = state.originAddress.trim().length >= 5;
    const isDestinationAddrValid = state.destinationAddress.trim().length >= 5;
    const isOriginMetaValid =
      state.originCity.trim().length >= 2 &&
      state.originPostalCode.trim().length >= 2 &&
      state.originCountryCode.trim().length >= 2;
    const isDestMetaValid =
      state.destinationCity.trim().length >= 2 &&
      state.destinationPostalCode.trim().length >= 2 &&
      state.destinationCountryCode.trim().length >= 2;

    const isRouteDistanceValid = routeDistanceKm != null && routeDistanceProvider === "osrm";

    if (!isOriginAddrValid || !isDestinationAddrValid || !isOriginMetaValid || !isDestMetaValid || !isRouteDistanceValid) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        const focusId = !isOriginAddrValid ? "v4-origin-address" : "v4-destination-address";
        document.getElementById(focusId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById(focusId) as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Missing required address", 3, "PROJECT", "acces_v2");
      return;
    }

    // Validation date: bloquer historique + 15 prochains jours
    const minMovingDateV2 = getMinMovingDateIso();
    const isMovingDateValid =
      typeof state.movingDate === "string" &&
      state.movingDate.length > 0 &&
      state.movingDate >= minMovingDateV2;
    if (!isMovingDateValid) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        document.getElementById("v4-moving-date")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        (document.getElementById("v4-moving-date") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid moving date", 3, "PROJECT", "acces_v2");
      return;
    }

    // Validation champs Step 3 obligatoires (hors exceptions explicites)
    const isDensityValid = state.density === "light" || state.density === "normal" || state.density === "dense";
    const isKitchenSelectionValid =
      state.kitchenIncluded === "none" ||
      state.kitchenIncluded === "appliances" ||
      state.kitchenIncluded === "full";
    if (!isDensityValid || !isKitchenSelectionValid) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        const focusId = !isDensityValid ? "v4-density-section" : "v4-kitchen-section";
        document.getElementById(focusId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      trackError(
        "VALIDATION_ERROR",
        !isDensityValid ? "Missing density" : "Missing kitchen selection",
        3,
        "PROJECT",
        "acces_v2"
      );
      return;
    }

    // Validation contact (prénom + email obligatoires) — déplacé en fin de Step 3
    const isFirstNameValid = state.firstName.trim().length >= 2;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim());
    if (!isFirstNameValid || !isEmailValid) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        const focusId = !isFirstNameValid ? "v4-firstName" : "v4-email";
        document.getElementById(focusId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        (document.getElementById(focusId) as any)?.focus?.();
      });
      trackError(
        "VALIDATION_ERROR",
        !isFirstNameValid ? "Missing first name" : "Invalid email",
        3,
        "PROJECT",
        "acces_v2"
      );
      return;
    }

    // Validation cuisine (si électroménager uniquement)
    const kitchenAppliancesCount =
      Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;
    const isKitchenValid =
      state.kitchenIncluded !== "appliances" || kitchenAppliancesCount >= 1;
    if (!isKitchenValid) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        const focusId = "v4-kitchen-count";
        document.getElementById(focusId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById(focusId) as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid kitchen appliances count", 3, "PROJECT", "acces_v2");
      return;
    }

    // Normalise accès simple
    if (state.access_type === "simple") {
      updateFields({
        narrow_access: false,
        long_carry: false,
        difficult_parking: false,
        lift_required: false,
        access_details: "",
      });
    }

    // Création / MAJ lead Back Office à la fin de Step 3 (avant les photos)
    try {
      const kitchenExtraVolumeM3 = (() => {
        // UI: pas de pré-sélection. Calcul: hypothèse par défaut = 3 équipements.
        const kitchenTouched =
          state.kitchenIncluded !== "" || (state.kitchenApplianceCount || "").trim().length > 0;
        if (!kitchenTouched) return 3 * 0.6;

        if (state.kitchenIncluded === "full") return 6;
        if (state.kitchenIncluded === "appliances") return Math.max(0, kitchenAppliancesCount) * 0.6;
        return 0;
      })();
      const kitchenIncludedForBo = state.kitchenIncluded || "appliances";
      const kitchenApplianceCountForBo =
        state.kitchenIncluded === ""
          ? 3
          : kitchenIncludedForBo === "appliances"
          ? kitchenAppliancesCount
          : undefined;
      // --- Mappings tunnel → Back Office ---
      const densityToBO = (d: string): "LIGHT" | "MEDIUM" | "HEAVY" | undefined => {
        if (d === "light") return "LIGHT";
        if (d === "normal") return "MEDIUM";
        if (d === "dense") return "HEAVY";
        return undefined;
      };
      const elevatorToBO = (e: string): "OUI" | "NON" | "PARTIEL" => {
        const p = toPricingElevator(e);
        if (p === "yes") return "OUI";
        if (p === "partial") return "PARTIEL";
        return "NON";
      };

      const originIsHouse = isHouseType(state.originHousingType);
      const destIsHouse = isHouseType(state.destinationHousingType);

      const frozenStep2CenterEur =
        state.rewardBaselineMinEur != null && state.rewardBaselineMaxEur != null
          ? getDisplayedCenter(state.rewardBaselineMinEur, state.rewardBaselineMaxEur)
          : null;
      const moverzFeeProvisionFromStep2Eur =
        frozenStep2CenterEur != null
          ? computeMoverzFeeProvision(frozenStep2CenterEur)
          : undefined;

      // Snapshot complet du panier ("Votre panier") pour archivage BO
      const pricingSnapshot = (() => {
        if (!v2PricingCart || !pricingByFormule || !activePricing) return undefined;
        return {
          capturedAt: new Date().toISOString(),
          formule: state.formule,
          // Résultat final pour la formule sélectionnée
          refinedMinEur: v2PricingCart.refinedMinEur,
          refinedMaxEur: v2PricingCart.refinedMaxEur,
          refinedCenterEur: v2PricingCart.refinedCenterEur,
          step2CenterBeforeProvisionEur: frozenStep2CenterEur ?? undefined,
          moverzFeeProvisionEur: moverzFeeProvisionFromStep2Eur,
          moverzFeeProvisionRule: "MAX(100;10% du montant estimé)",
          // Première estimation (baseline)
          firstEstimateMinEur: v2PricingCart.firstEstimateMinEur,
          firstEstimateMaxEur: v2PricingCart.firstEstimateMaxEur,
          firstEstimateCenterEur: v2PricingCart.firstEstimateCenterEur,
          // Lignes d'ajustement du panier
          lines: v2PricingCart.lines,
          // Prix par formule (les 3 formules)
          byFormule: (Object.entries(pricingByFormule) as [string, ReturnType<typeof calculatePricing>][]).reduce(
            (acc, [key, val]) => {
              acc[key] = { prixMin: val.prixMin, prixMax: val.prixMax, prixFinal: val.prixFinal, volumeM3: val.volumeM3 };
              return acc;
            },
            {} as Record<string, { prixMin: number; prixMax: number; prixFinal: number; volumeM3: number }>
          ),
        };
      })();

      const payload = {
        // Contact
        firstName: state.firstName.trim(),
        email: state.email.trim().toLowerCase(),
        phone: state.phone.trim() || undefined,
        source,
        estimationMethod: "FORM" as const,

        // Adresses
        originAddress: state.originAddress || undefined,
        originCity: state.originCity || undefined,
        originPostalCode: state.originPostalCode || undefined,
        originCountryCode: state.originCountryCode || undefined,
        destAddress: state.destinationAddress || undefined,
        destCity: state.destinationCity || undefined,
        destPostalCode: state.destinationPostalCode || undefined,
        destCountryCode: state.destinationCountryCode || undefined,

        // Volume & Surface
        surfaceM2: parseInt(state.surfaceM2) || undefined,
        estimatedVolume: activePricing?.volumeM3 ?? undefined,
        density: densityToBO(state.density || "dense"),

        // Formule & Prix
        formule: state.formule,
        estimatedPriceMin: activePricing?.prixMin ?? undefined,
        estimatedPriceAvg: activePricing?.prixFinal ?? undefined,
        estimatedPriceMax: activePricing?.prixMax ?? undefined,

        // Logement origine
        originHousingType: state.originHousingType || undefined,
        originFloor: originIsHouse
          ? undefined
          : Math.max(0, parseInt(state.originFloor || "0", 10) || 0),
        originElevator: state.originElevator ? elevatorToBO(state.originElevator) : undefined,
        originFurnitureLift: state.originFurnitureLift || undefined,
        originCarryDistance: state.originCarryDistance || undefined,
        originParkingAuth: state.originParkingAuth || undefined,

        // Logement destination
        destHousingType: state.destinationHousingType || undefined,
        destFloor: destIsHouse
          ? undefined
          : Math.max(0, parseInt(state.destinationFloor || "0", 10) || 0),
        destElevator: state.destinationElevator ? elevatorToBO(state.destinationElevator) : undefined,
        destFurnitureLift: state.destinationFurnitureLift || undefined,
        destCarryDistance: state.destinationCarryDistance || undefined,
        destParkingAuth: state.destinationParkingAuth || undefined,

        // Dates
        movingDate: toIsoDate(state.movingDate),
        dateFlexible: state.dateFlexible,

        // Options tunnel (JSON structuré — source de vérité pour toutes les données détaillées)
        tunnelOptions: {
          pricing: {
            distanceKm: routeDistanceKm ?? undefined,
            distanceProvider: routeDistanceProvider ?? undefined,
            step2CenterBeforeProvisionEur: frozenStep2CenterEur ?? undefined,
            moverzFeeProvisionEur: moverzFeeProvisionFromStep2Eur,
          },
          accessV2: {
            access_type: state.access_type ?? "simple",
            narrow_access: !!state.narrow_access,
            long_carry: !!state.long_carry,
            difficult_parking: !!state.difficult_parking,
            lift_required: !!state.lift_required,
            access_details: state.access_details || undefined,
          },
          volumeAdjustments: {
            kitchenIncluded: kitchenIncludedForBo,
            kitchenApplianceCount: kitchenApplianceCountForBo,
            extraVolumeM3: kitchenExtraVolumeM3,
          },
          services: {
            furnitureStorage: state.serviceFurnitureStorage,
            cleaning: state.serviceCleaning,
            fullPacking: state.serviceFullPacking,
            furnitureAssembly: state.serviceFurnitureAssembly,
            insurance: state.serviceInsurance,
            wasteRemoval: state.serviceWasteRemoval,
            helpWithoutTruck: state.serviceHelpWithoutTruck,
            specificSchedule: state.serviceSpecificSchedule,
            debarras: state.serviceDebarras,
            dismantling: state.serviceDismantling,
            piano: state.servicePiano !== "none" ? state.servicePiano : undefined,
          },
          notes: (() => {
            const userNotes = (state.specificNotes || "").trim();
            const aiNotes = aiPhotoInsights
              .filter((v) => typeof v === "string" && v.trim().length > 0)
              .map((v) => `- ${v.trim()}`);
            const aiBlock = aiNotes.length > 0 ? `[Analyse IA photos]\n${aiNotes.join("\n")}` : "";
            const densityBlock = densityAiNote.trim().length > 0 ? `[Analyse IA densité]\n${densityAiNote.trim()}` : "";
            const merged = [userNotes, aiBlock, densityBlock].filter((v) => v.length > 0).join("\n\n");
            return merged || undefined;
          })(),
          pricingSnapshot: pricingSnapshot,
        },
      };

      if (state.leadId) {
        try {
          await updateBackofficeLead(state.leadId, payload);
        } catch (err: any) {
          if (err instanceof Error && err.message === "LEAD_NOT_FOUND") {
            const { id: backofficeLeadId } = await createBackofficeLead(payload);
            updateFields({ leadId: backofficeLeadId, linkingCode: null });
          } else {
            throw err;
          }
        }
      } else {
        const { id: backofficeLeadId } = await createBackofficeLead(payload);
        updateFields({ leadId: backofficeLeadId, linkingCode: null });
      }

      setShowValidationStep3(false);
      // Step 4 : confirmation (plus de photos)
      trackStepChange(3, 4, "PROJECT", "THANK_YOU", "confirmation_v2", "forward");
      trackCompletion({ leadId: state.leadId, screenId: "confirmation_v2" });
      goToStep(4);
    } catch (err: any) {
      console.error("Error creating/updating lead (V2 Step 3):", err);
      trackError("API_ERROR", err.message || "Failed to create/update lead", 3, "PROJECT", "acces_v2");
    }
  };

  async function handleSubmitContactV2(e: FormEvent) {
    e.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      setShowValidationStep1(true);
      requestAnimationFrame(() => {
        document.getElementById("contact-email")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("contact-email") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid email", 4, "THANK_YOU", "contact_v2");
      return;
    }

    try {
      const payload = {
        // `firstName` optionnel côté UX mais le contrat BO attend une string.
        // On envoie une chaîne vide si l'utilisateur ne renseigne rien.
        firstName: state.firstName.trim(),
        email: state.email.trim().toLowerCase(),
        phone: state.phone.trim() || undefined,
        source,
        estimationMethod: "FORM" as const,
        tunnelOptions: {
          accessV2: {
            access_type: state.access_type ?? "simple",
            narrow_access: !!state.narrow_access,
            long_carry: !!state.long_carry,
            difficult_parking: !!state.difficult_parking,
            lift_required: !!state.lift_required,
            access_details: state.access_details || undefined,
          },
          notes: (() => {
            const userNotes = (state.specificNotes || "").trim();
            const aiNotes = aiPhotoInsights
              .filter((v) => typeof v === "string" && v.trim().length > 0)
              .map((v) => `- ${v.trim()}`);
            const aiBlock = aiNotes.length > 0 ? `[Analyse IA photos]\n${aiNotes.join("\n")}` : "";
            const densityBlock = densityAiNote.trim().length > 0 ? `[Analyse IA densité]\n${densityAiNote.trim()}` : "";
            const merged = [userNotes, aiBlock, densityBlock].filter((v) => v.length > 0).join("\n\n");
            return merged || undefined;
          })(),
        },
      };

      if (state.leadId) {
        await updateBackofficeLead(state.leadId, payload);
      } else {
        const { id: backofficeLeadId } = await createBackofficeLead(payload);
        updateFields({ leadId: backofficeLeadId, linkingCode: null });
      }

      trackStepChange(4, 4, "THANK_YOU", "THANK_YOU", "contact_v2", "forward");
      trackCompletion({ leadId: state.leadId, screenId: "confirmation_v2" });
    } catch (err: any) {
      console.error("Error creating/updating lead:", err);
      trackError("API_ERROR", err.message || "Failed to finalize lead", 4, "THANK_YOU", "contact_v2");
    }
  }

  return (
      <main className="tunnel-v3-force-light min-h-screen bg-bg-secondary text-text-primary">
        <div className={containerClassName}>
          {/* Top back/edit */}
          {state.currentStep > 1 && (
            <button
              onClick={() => {
                if (state.currentStep === 4) {
                  setCollapseStep3OnEnterToken((v) => v + 1);
                }
                goToStep((state.currentStep - 1) as 1 | 2 | 3 | 4);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-fast"
            >
              ← Modifier
            </button>
          )}

          <V2ProgressBar step={state.currentStep} onReset={reset} />

          {state.currentStep === 1 && (
            <div className="rounded-xl bg-surface-primary border border-border-neutral shadow-md p-6 sm:p-10">
              <StepQualificationV4
                originCity={state.originCity}
                originPostalCode={state.originPostalCode}
                originLat={state.originLat}
                originLon={state.originLon}
                destinationCity={state.destinationCity}
                destinationPostalCode={state.destinationPostalCode}
                destinationLat={state.destinationLat}
                destinationLon={state.destinationLon}
                surfaceM2={state.surfaceM2}
                onFieldChange={handleStep3FieldChange}
                onSubmit={handleSubmitQualificationV2}
                isSubmitting={false}
                showValidation={showValidationStep1}
              />
            </div>
          )}

          {state.currentStep === 2 && (
            <div className="rounded-xl bg-surface-primary border border-border-neutral shadow-md p-6 sm:p-10 relative">
              <StepEstimationV4
                volume={activePricingStep2?.volumeM3 ?? activePricing?.volumeM3 ?? null}
                routeDistanceKm={v2FirstEstimateDistanceKm}
                displayDistanceKm={v2FirstEstimateDistanceKm}
                priceMin={activePricingStep2?.prixMin ?? activePricing?.prixMin ?? null}
                priceMax={activePricingStep2?.prixMax ?? activePricing?.prixMax ?? null}
                formuleLabel={state.formule === "ECONOMIQUE" ? "Éco" : state.formule === "PREMIUM" ? "Premium" : "Standard"}
                originCity={state.originCity}
                destinationCity={state.destinationCity}
                surfaceM2={state.surfaceM2}
                onSubmit={handleSubmitEstimationV2}
                isSubmitting={false}
                debug={debugMode}
                debugRows={v2DebugRowsStep2 ?? undefined}
              />
            </div>
          )}

          {state.currentStep === 3 && (
            <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 lg:items-start">
              {/* Formulaire (colonne gauche) */}
              <div>
                <StepAccessLogisticsV4
                leadId={state.leadId}
                originAddress={state.originAddress}
                originCity={state.originCity}
                originPostalCode={state.originPostalCode}
                originCountryCode={state.originCountryCode}
                originLat={state.originLat}
                originLon={state.originLon}
                destinationAddress={state.destinationAddress}
                destinationCity={state.destinationCity}
                destinationPostalCode={state.destinationPostalCode}
                destinationCountryCode={state.destinationCountryCode}
                destinationLat={state.destinationLat}
                destinationLon={state.destinationLon}
                destinationUnknown={state.destinationUnknown}
                originHousingType={state.originHousingType}
                originFloor={state.originFloor}
                originFloorTouched={state.originFloorTouched}
                destinationHousingType={state.destinationHousingType}
                destinationFloor={state.destinationFloor}
                destinationFloorTouched={state.destinationFloorTouched}
                density={state.density}
                kitchenIncluded={state.kitchenIncluded}
                kitchenApplianceCount={state.kitchenApplianceCount}
                movingDate={state.movingDate}
                dateFlexible={state.dateFlexible}
                onFieldChange={(field, value) => updateField(field as any, value)}
                onAiInsightsChange={setAiPhotoInsights}
                onDensityAiNoteChange={setDensityAiNote}
                onSubmit={handleSubmitAccessV2}
                isSubmitting={false}
                showValidation={showValidationStep3}
                routeDistanceKm={routeDistanceKm}
                routeDistanceProvider={routeDistanceProvider}
                access_type={state.access_type ?? "simple"}
                narrow_access={!!state.narrow_access}
                long_carry={!!state.long_carry}
                difficult_parking={!!state.difficult_parking}
                lift_required={!!state.lift_required}
                access_details={state.access_details ?? ""}
                selectedFormule={state.formule as "ECONOMIQUE" | "STANDARD" | "PREMIUM"}
                onFormuleChange={(v) => {
                  updateField("formule", v);
                  setLastImpactDetailId("formule");
                }}
                pricingByFormule={
                  pricingByFormule
                    ? {
                        ECONOMIQUE: {
                          priceMin: pricingByFormule.ECONOMIQUE.prixMin,
                          priceMax: pricingByFormule.ECONOMIQUE.prixMax,
                        },
                        STANDARD: {
                          priceMin: pricingByFormule.STANDARD.prixMin,
                          priceMax: pricingByFormule.STANDARD.prixMax,
                        },
                        PREMIUM: {
                          priceMin: pricingByFormule.PREMIUM.prixMin,
                          priceMax: pricingByFormule.PREMIUM.prixMax,
                        },
                      }
                    : null
                }
                firstName={state.firstName}
                email={state.email}
                phone={state.phone}
                specificNotes={state.specificNotes}
                collapseAllOnEnterToken={collapseStep3OnEnterToken}
              />
              </div>

              {/* SmartCart V4 (desktop sticky + mobile FAB + drawer) */}
              {v2PricingCart && typeof v2PricingCart.refinedCenterEur === "number" && (
                <SmartCart
                  currentPrice={v2PricingCart.refinedCenterEur}
                  minPrice={v2PricingCart.refinedMinEur ?? 0}
                  maxPrice={v2PricingCart.refinedMaxEur ?? 0}
                  initialPrice={v2PricingCart.firstEstimateCenterEur ?? undefined}
                  items={(v2PricingCart.lines ?? []).map((line) => ({
                      id: line.key,
                      label: line.label,
                      amountEur: line.amountEur,
                      explanation: line.status,
                    }))}
                  projectInfo={{
                    origin: state.originCity || undefined,
                    destination: state.destinationCity || undefined,
                    surface: parseInt(state.surfaceM2) || undefined,
                    volume: activePricing?.volumeM3 || undefined,
                  }}
                  ctaLabel="Lancer ma demande de devis"
                  onSubmit={handleSubmitAccessV2}
                  progressCompleted={step3Progress.completed}
                  progressTotal={step3Progress.total}
                  precisionScore={step3Progress.score}
                  preferredImpactId={lastImpactDetailId}
                />
              )}
            </div>
          )}

          {state.currentStep === 4 && (
            <div className="rounded-xl bg-surface-primary border border-border-neutral shadow-md p-6 sm:p-10 relative">
              <StepContactPhotosV4
                leadId={state.leadId}
                linkingCode={state.linkingCode}
                estimateMinEur={activePricing?.prixMin ?? null}
                estimateMaxEur={activePricing?.prixMax ?? null}
                estimateIsIndicative={estimateIsIndicative}
                email={state.email}
              />
            </div>
          )}
      </div>
    </main>
  );
}

export default function DevisGratuitsV3Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#F8F9FA] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent"></div>
          <p className="mt-4 text-[#1E293B]/70">Chargement...</p>
        </div>
      </div>
    }>
      <DevisGratuitsV3Content />
    </Suspense>
  );
}
