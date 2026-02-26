'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ga4Event } from "@/lib/analytics/ga4";
import {
  createBackofficeLead,
  getBackofficeLead,
  requestBackofficeConfirmation,
  updateBackofficeLead,
} from "@/lib/api/client";
import {
  calculatePricing,
  type FormuleType as PricingFormuleType,
  type HousingType,
  getEtageCoefficient,
  getVolumeEconomyScale,
} from "@/lib/pricing/calculate";
import {
  DENSITY_COEFFICIENTS,
  FORMULE_MULTIPLIERS,
  PRIX_MIN_SOCLE,
  TYPE_COEFFICIENTS,
  getDistanceBand,
  LA_POSTE_RATES_EUR_PER_M3,
} from "@/lib/pricing/constants";
import {
  computeMoverzFeeProvision,
  getDisplayedCenter,
} from "@/lib/pricing/scenarios";
import { useTunnelState } from "@/hooks/useTunnelState";
import { useTunnelTracking } from "@/hooks/useTunnelTracking";
import TunnelHero from "@/components/tunnel/TunnelHero";
import Step1Contact from "@/components/tunnel/Step1Contact";
import Step2ProjectComplete from "@/components/tunnel/Step2ProjectComplete";
import Step3VolumeServices from "@/components/tunnel/Step3VolumeServices";
import ConfirmationPage from "@/components/tunnel/ConfirmationPage";
import TrustSignals from "@/components/tunnel/TrustSignals";

const STEPS = [
  { id: 1, label: "Coordonnées" },
  { id: 2, label: "Votre projet" },
  { id: 3, label: "Formule & budget" },
  { id: 4, label: "Dossier envoyé" },
] as const;

function DevisGratuitsV3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { state, updateField, updateFields, goToStep } = useTunnelState();
  const source = searchParams.get("source") || searchParams.get("src") || "direct";
  const from = searchParams.get("from") || "/devis-gratuits-v3";
  const urlLeadId = (searchParams.get("leadId") || "").trim();
  const hydratedLeadRef = useRef<string | null>(null);

  const [confirmationRequested, setConfirmationRequested] = useState(false);
  const [showValidationStep1, setShowValidationStep1] = useState(false);
  const [showValidationStep2, setShowValidationStep2] = useState(false);
  const [showValidationStep3, setShowValidationStep3] = useState(false);

  const toInputDate = (raw: string | null | undefined): string | undefined => {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return undefined;
    return d.toISOString().split("T")[0];
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

    // V2 rule: on n’écrase que si surface vide ou égale à l’ancien défaut.
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
  }, [state.originHousingType]);
  
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
      1: { logical: "CONTACT" as const, screen: "contact_v3" },
      2: { logical: "PROJECT" as const, screen: "project_v3" },
      3: { logical: "RECAP" as const, screen: "formules_v3" },
      4: { logical: "THANK_YOU" as const, screen: "confirmation_v3" },
    };
    
    const current = stepMap[state.currentStep];
    if (current) {
      trackStep(state.currentStep, current.logical, current.screen);
    }
  }, [state.currentStep]);

  const mapDensity = (d: string): "LIGHT" | "MEDIUM" | "HEAVY" =>
    d === "light" ? "LIGHT" : d === "dense" ? "HEAVY" : "MEDIUM";

  const mapElevator = (e: string): "OUI" | "NON" | "PARTIEL" => {
    // UI values: "", "none", "no", "yes" (et potentiellement "small" / "partial")
    if (!e || e === "none" || e === "no") return "NON";
    if (e === "small" || e === "partial") return "PARTIEL";
    return "OUI";
  };

  const toIsoDate = (raw: string | null | undefined): string | undefined => {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return undefined;
    return d.toISOString();
  };

  // S'assure qu'un lead existe bien dans le Back Office et retourne son id.
  // Utile quand l'utilisateur reprend une session locale avec un lead supprimé/expiré (404).
  const ensureBackofficeLeadId = async (options?: { forceNew?: boolean }) => {
    if (state.leadId && !options?.forceNew) return state.leadId;

    const trimmedFirstName = state.firstName.trim();
    const trimmedEmail = state.email.trim().toLowerCase();
    if (!trimmedFirstName || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      return null;
    }

    try {
      const payload = {
        firstName: trimmedFirstName,
        email: trimmedEmail,
        lastName: state.lastName.trim() || undefined,
        phone: state.phone.trim() || undefined,
        source,
        estimationMethod: "FORM" as const,
      };
      const { id } = await createBackofficeLead(payload);
      updateFields({ leadId: id });
      return id;
    } catch (err) {
      console.warn("⚠️ ensureBackofficeLeadId failed:", err);
      return null;
    }
  };

  const isHouseType = (t: string | null | undefined) =>
    !!t && (t === "house" || t.startsWith("house_"));
  const isBoxType = (t: string | null | undefined) => !!t && t === "box";
  const getBoxVolumeM3 = (raw: string | null | undefined): number | null => {
    const n = Number.parseFloat(String(raw || "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  // --- Live sync: debounced update vers le BO à chaque changement ---
  const liveSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveSyncSkipRef = useRef(false);

  useEffect(() => {
    if (!state.leadId || state.currentStep < 2) return;
    if (liveSyncSkipRef.current) { liveSyncSkipRef.current = false; return; }

    if (liveSyncTimerRef.current) clearTimeout(liveSyncTimerRef.current);
    liveSyncTimerRef.current = setTimeout(async () => {
      try {
        const originIsHouse = isHouseType(state.originHousingType);
        const destIsHouse = isHouseType(state.destinationHousingType);
        const originIsBox = isBoxType(state.originHousingType);
        const destIsBox = isBoxType(state.destinationHousingType);
        const originBoxVol = originIsBox ? getBoxVolumeM3(state.originBoxVolumeM3) : null;

        const distanceKm = routeDistanceKm ?? estimateDistanceKm(
          state.originPostalCode, state.destinationPostalCode,
          state.originLat, state.originLon, state.destinationLat, state.destinationLon
        );

        const kitchenTouched = state.kitchenIncluded !== "" || (state.kitchenApplianceCount || "").trim().length > 0;
        const kitchenAppliancesCount = Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;
        const extraVolumeM3 = kitchenTouched
          ? (state.kitchenIncluded === "full" ? 6 : state.kitchenIncluded === "appliances" ? Math.max(0, kitchenAppliancesCount) * 0.6 : 0)
          : 0;

        const payload: any = {
          firstName: state.firstName.trim() || undefined,
          lastName: state.lastName.trim() || undefined,
          email: state.email.trim().toLowerCase() || undefined,
          phone: state.phone.trim() || undefined,
          source,
          estimationMethod: "FORM",
          originAddress: state.originAddress || undefined,
          originCity: state.originCity || undefined,
          originPostalCode: state.originPostalCode || undefined,
          originCountryCode: state.originCountryCode || undefined,
          destAddress: state.destinationUnknown ? undefined : state.destinationAddress || undefined,
          destCity: state.destinationUnknown ? undefined : state.destinationCity || undefined,
          destPostalCode: state.destinationUnknown ? undefined : state.destinationPostalCode || undefined,
          destCountryCode: state.destinationUnknown ? undefined : state.destinationCountryCode || undefined,
          movingDate: toIsoDate(state.movingDate),
          dateFlexible: state.dateFlexible,
          originHousingType: state.originHousingType || undefined,
          originFloor: originIsHouse || originIsBox ? undefined : (state.originFloor ? Math.max(0, parseInt(state.originFloor, 10)) : undefined),
          originElevator: originIsHouse || originIsBox ? undefined : (state.originElevator && state.originElevator !== "none" ? mapElevator(state.originElevator) : undefined),
          originFurnitureLift: state.originFurnitureLift || undefined,
          originCarryDistance: state.originCarryDistance || undefined,
          originParkingAuth: state.originParkingAuth,
          destHousingType: state.destinationUnknown ? undefined : state.destinationHousingType || undefined,
          destFloor: state.destinationUnknown ? undefined : (destIsHouse || destIsBox ? undefined : (state.destinationFloor ? Math.max(0, parseInt(state.destinationFloor, 10)) : undefined)),
          destElevator: state.destinationUnknown ? undefined : (destIsHouse || destIsBox ? undefined : (state.destinationElevator && state.destinationElevator !== "none" ? mapElevator(state.destinationElevator) : undefined)),
          destFurnitureLift: state.destinationUnknown ? undefined : state.destinationFurnitureLift || undefined,
          destCarryDistance: state.destinationUnknown ? undefined : state.destinationCarryDistance || undefined,
          destParkingAuth: state.destinationUnknown ? undefined : state.destinationParkingAuth,
          surfaceM2: parseInt(state.surfaceM2) || undefined,
          density: state.density ? mapDensity(state.density) : undefined,
          formule: state.formule || undefined,
          tunnelOptions: {
            pricing: {
              distanceKm: distanceKm ?? undefined,
              distanceProvider: routeDistanceProvider ?? undefined,
            },
            accessV2: {
              access_type: state.access_type ?? "simple",
              narrow_access: !!state.narrow_access,
              long_carry: !!state.long_carry,
              difficult_parking: !!state.difficult_parking,
              lift_required: !!state.lift_required,
              access_details: [state.originAccessDetails, state.destinationAccessDetails].filter(Boolean).join(" | ") || undefined,
              originAccessDetails: state.originAccessDetails || undefined,
              destinationAccessDetails: state.destinationAccessDetails || undefined,
            },
            volumeAdjustments: (() => {
              const obj: any = {};
              if (kitchenTouched) {
                obj.kitchenIncluded = state.kitchenIncluded || "appliances";
                obj.kitchenApplianceCount = state.kitchenIncluded === "" ? 3 : state.kitchenIncluded === "appliances" ? kitchenAppliancesCount : undefined;
                obj.extraVolumeM3 = extraVolumeM3;
              }
              if (originIsBox && originBoxVol != null) obj.boxExactVolumeM3 = originBoxVol;
              return Object.keys(obj).length > 0 ? obj : undefined;
            })(),
            services: {
              furnitureStorage: state.serviceFurnitureStorage || undefined,
              cleaning: state.serviceCleaning || undefined,
              fullPacking: state.serviceFullPacking || undefined,
              furnitureAssembly: state.serviceFurnitureAssembly || undefined,
              insurance: state.serviceInsurance || undefined,
              wasteRemoval: state.serviceWasteRemoval || undefined,
              helpWithoutTruck: state.serviceHelpWithoutTruck || undefined,
              specificSchedule: state.serviceSpecificSchedule || undefined,
              piano: state.servicePiano && state.servicePiano !== "none" ? state.servicePiano : undefined,
              debarras: state.serviceDebarras || undefined,
              dismantling: state.serviceDismantling || undefined,
            },
            heavyFurniture: {
              americanFridge: state.furnitureAmericanFridge || undefined,
              safe: state.furnitureSafe || undefined,
              billiard: state.furnitureBilliard || undefined,
              aquarium: state.furnitureAquarium || undefined,
              over25kg: state.furnitureOver25kg || undefined,
            },
            notes: state.specificNotes || undefined,
            hasFragileItems: state.hasFragileItems || undefined,
            coordinates: {
              originLat: state.originLat, originLon: state.originLon,
              destinationLat: state.destinationLat, destinationLon: state.destinationLon,
            },
          },
        };
        if (state.leadId) await updateBackofficeLead(state.leadId, payload);
      } catch (err) {
        console.warn("⚠️ Live sync failed:", err);
      }
    }, 3000);

    return () => { if (liveSyncTimerRef.current) clearTimeout(liveSyncTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.leadId, state.currentStep,
    state.firstName, state.lastName, state.email, state.phone,
    state.originAddress, state.originCity, state.originPostalCode,
    state.originHousingType, state.originFloor, state.originElevator,
    state.originAccess, state.originAccessDetails, state.originBoxVolumeM3,
    state.destinationAddress, state.destinationCity, state.destinationPostalCode,
    state.destinationHousingType, state.destinationFloor, state.destinationElevator,
    state.destinationAccess, state.destinationAccessDetails, state.destinationUnknown,
    state.movingDate, state.dateFlexible,
    state.surfaceM2, state.density, state.formule,
    state.serviceFurnitureStorage, state.serviceCleaning, state.serviceFullPacking,
    state.serviceFurnitureAssembly, state.serviceInsurance, state.serviceWasteRemoval,
    state.serviceHelpWithoutTruck, state.serviceSpecificSchedule, state.serviceDebarras,
    state.servicePiano, state.serviceDismantling,
    state.hasPiano, state.hasFragileItems, state.specificNotes,
    state.kitchenIncluded, state.kitchenApplianceCount,
    state.originFurnitureLift, state.destinationFurnitureLift,
    state.originCarryDistance, state.destinationCarryDistance,
    state.originParkingAuth, state.destinationParkingAuth,
    state.access_type, state.narrow_access, state.long_carry, state.difficult_parking, state.lift_required,
    state.furnitureAmericanFridge, state.furnitureSafe, state.furnitureBilliard, state.furnitureAquarium, state.furnitureOver25kg,
  ]);

  // --- helpers pricing (copiés de la V2, puis ajustés pour la V3) ---
  const estimateDistanceKm = (
    originPostalCode: string,
    destinationPostalCode: string,
    originLat: number | null,
    originLon: number | null,
    destinationLat: number | null,
    destinationLon: number | null
  ) => {
    // Si on dispose de coordonnées précises (BAN), on calcule une distance Haversine.
    if (
      originLat != null &&
      originLon != null &&
      destinationLat != null &&
      destinationLon != null
    ) {
      const R = 6371;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(destinationLat - originLat);
      const dLon = toRad(destinationLon - originLon);
      const la1 = toRad(originLat);
      const la2 = toRad(destinationLat);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(la1) *
          Math.cos(la2) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      if (Number.isFinite(dist) && dist > 0) {
        return Math.min(1200, Math.round(dist));
      }
    }

    if (!originPostalCode || !destinationPostalCode) return 50;
    if (originPostalCode === destinationPostalCode) return 10;
    const o = parseInt(originPostalCode.slice(0, 2), 10);
    const d = parseInt(destinationPostalCode.slice(0, 2), 10);
    if (Number.isNaN(o) || Number.isNaN(d)) return 50;
    const diff = Math.abs(o - d);
    return Math.min(1000, 40 + diff * 40);
  };

  // Distance “trajet” (route) via OSRM / OpenStreetMap
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
    }, 250);

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

  const getSeasonFactor = (dateStr: string | null | undefined): number => {
    if (!dateStr) return 1;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 1;
    const month = d.getMonth() + 1;
    if ((month >= 6 && month <= 9) || month === 12) return 1.3;
    if (month === 1 || month === 2 || month === 11) return 0.85;
    return 1.0;
  };

  const getUrgencyFactor = (dateStr: string | null | undefined): number => {
    if (!dateStr) return 1;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 1;

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 0 || diffDays > 365) return 1;
    if (diffDays <= 30) return 1.15;
    return 1;
  };

  const toPricingElevator = (e: string): "yes" | "no" | "partial" => {
    if (!e || e === "none" || e === "no") return "no";
    if (e === "small" || e === "partial") return "partial";
    if (e === "other") return "partial";
    return "yes";
  };
  const getEffectiveSurfaceForPricing = (): number => {
    const boxVolume = getBoxVolumeM3(state.originBoxVolumeM3);
    const originIsBox = isBoxType(state.originHousingType);
    if (originIsBox && boxVolume != null) {
      const divisor = TYPE_COEFFICIENTS.t2 * DENSITY_COEFFICIENTS.normal;
      const derivedSurface = boxVolume / divisor;
      return Math.max(10, Math.min(500, Math.round(derivedSurface)));
    }
    return parseInt(state.surfaceM2) || 60;
  };

  const coerceHousingType = (t: string | null | undefined): HousingType => {
    const v = (t || "").trim();
    if (
      v === "studio" ||
      v === "t1" ||
      v === "t2" ||
      v === "t3" ||
      v === "t4" ||
      v === "t5" ||
      v === "house" ||
      v === "house_1floor" ||
      v === "house_2floors" ||
      v === "house_3floors"
    ) {
      return v;
    }
    return "t2";
  };

  const pricingByFormule = useMemo(() => {
    const surface = getEffectiveSurfaceForPricing();
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return null;

    const originIsHouse = isHouseType(state.originHousingType);
    const destIsHouse = isHouseType(state.destinationHousingType);
    const originIsBox = isBoxType(state.originHousingType);

    const housingType = coerceHousingType(state.originHousingType);
    const density = (state.density || "normal") as "light" | "normal" | "dense";

    const distanceKm =
      state.destinationUnknown
        ? 50
        : routeDistanceKm ??
          estimateDistanceKm(
            state.originPostalCode,
            state.destinationPostalCode,
            state.originLat,
            state.originLon,
            state.destinationLat,
            state.destinationLon
          );
    const seasonFactor = getSeasonFactor(state.movingDate) * getUrgencyFactor(state.movingDate);
    const destIsBox = isBoxType(state.destinationHousingType);

    const originFloor =
      originIsHouse || originIsBox ? 0 : parseInt(state.originFloor || "0", 10) || 0;
    const destinationFloor = state.destinationUnknown
      ? 0
      : destIsHouse
      ? 0
      : destIsBox
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

    const kitchenAppliancesCount =
      Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;
    const kitchenTouched =
      state.kitchenIncluded !== "" || (state.kitchenApplianceCount || "").trim().length > 0;
    const baselineKitchenExtraVolumeM3 = originIsBox ? 0 : 3 * 0.6;
    const kitchenExtraVolumeM3 = originIsBox
      ? 0
      : (() => {
          if (!kitchenTouched) return baselineKitchenExtraVolumeM3;
          if (state.kitchenIncluded === "full") return 6;
          if (state.kitchenIncluded === "appliances")
            return Math.max(0, kitchenAppliancesCount) * 0.6;
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
    return formules.reduce<Record<PricingFormuleType, ReturnType<typeof calculatePricing> & { moverzFeeEur: number }>>(
      (acc, formule) => {
        const raw = calculatePricing({ ...baseInput, formule });
        const centerBeforeFee = getDisplayedCenter(raw.prixMin, raw.prixMax);
        const fee = computeMoverzFeeProvision(centerBeforeFee);
        acc[formule] = {
          ...raw,
          prixMin: raw.prixMin + fee,
          prixFinal: raw.prixFinal + fee,
          prixMax: raw.prixMax + fee,
          moverzFeeEur: fee,
        };
        return acc;
      },
      {} as any
    );
  }, [
    state.surfaceM2,
    state.originHousingType,
    state.originBoxVolumeM3,
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
    state.long_carry,
    state.narrow_access,
    state.difficult_parking,
    state.lift_required,
    state.servicePiano,
    state.serviceDebarras,
  ]);

  const activePricing = useMemo(() => {
    if (!pricingByFormule) return null;
    const key = (state.formule || "STANDARD") as PricingFormuleType;
    return pricingByFormule[key] ?? null;
  }, [pricingByFormule, state.formule]);

  // Sync pricing vers le BO dès qu'il change (volume, prix, pricingSnapshot simplifié)
  useEffect(() => {
    if (!state.leadId || state.currentStep < 3 || !activePricing) return;
    const timer = setTimeout(async () => {
      try {
        if (!state.leadId) return;
        const fee = (activePricing as any).moverzFeeEur ?? 0;
        await updateBackofficeLead(state.leadId, {
          estimatedVolume: activePricing.volumeM3,
          estimatedPriceMin: activePricing.prixMin,
          estimatedPriceAvg: Math.round((activePricing.prixMin + activePricing.prixMax) / 2),
          estimatedPriceMax: activePricing.prixMax,
          formule: (state.formule || undefined) as any,
          tunnelOptions: {
            pricingSnapshot: {
              capturedAt: new Date().toISOString(),
              formule: state.formule || "STANDARD",
              refinedMinEur: activePricing.prixMin,
              refinedMaxEur: activePricing.prixMax,
              refinedCenterEur: Math.round((activePricing.prixMin + activePricing.prixMax) / 2),
              moverzFeeEur: fee,
              volumeM3: activePricing.volumeM3,
              isLiveSync: true,
            },
          },
        });
      } catch (err) {
        console.warn("⚠️ Pricing sync failed:", err);
      }
    }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.leadId, state.currentStep, activePricing, state.formule]);

  // Auto-select options liées à la formule
  const prevFormuleRef = useRef(state.formule);
  useEffect(() => {
    const prev = prevFormuleRef.current;
    prevFormuleRef.current = state.formule;
    if (!state.formule || state.formule === prev) return;

    const FORMULE_OPTIONS: Record<string, Record<string, boolean>> = {
      ECONOMIQUE: {
        serviceFullPacking: false,
        serviceCleaning: false,
        serviceInsurance: false,
        serviceWasteRemoval: false,
      },
      STANDARD: {
        serviceFullPacking: false,
        serviceCleaning: false,
        serviceInsurance: false,
        serviceWasteRemoval: false,
      },
      PREMIUM: {
        serviceFullPacking: true,
        serviceCleaning: true,
        serviceInsurance: true,
        serviceWasteRemoval: true,
      },
    };

    const opts = FORMULE_OPTIONS[state.formule];
    if (opts) updateFields(opts as any);
  }, [state.formule]);

  // Auto-select "Aide sans camion" si même adresse départ/arrivée
  const sameAddress = useMemo(() => {
    const o = (state.originAddress || "").trim().toLowerCase();
    const d = (state.destinationAddress || "").trim().toLowerCase();
    return o.length >= 5 && d.length >= 5 && o === d;
  }, [state.originAddress, state.destinationAddress]);

  useEffect(() => {
    if (sameAddress && !state.serviceHelpWithoutTruck) {
      updateField("serviceHelpWithoutTruck", true);
    }
  }, [sameAddress]);

  const estimateRange = useMemo(() => {
    if (!pricingByFormule) return null;
    const values = Object.values(pricingByFormule);
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

  const activePricingDetails = useMemo(() => {
    if (!activePricing) return null;

    const surface = getEffectiveSurfaceForPricing();
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return null;

    const originIsHouse = isHouseType(state.originHousingType);
    const destIsHouse = isHouseType(state.destinationHousingType);
    const originIsBox = isBoxType(state.originHousingType);
    const destIsBox = isBoxType(state.destinationHousingType);

    const housingType = coerceHousingType(state.originHousingType);
    const typeCoefficient = TYPE_COEFFICIENTS[housingType];
    const densityCoefficient = DENSITY_COEFFICIENTS[(state.density || "normal") as keyof typeof DENSITY_COEFFICIENTS];

    const distanceKm =
      state.destinationUnknown
        ? 50
        : routeDistanceKm ??
          estimateDistanceKm(
            state.originPostalCode,
            state.destinationPostalCode,
            state.originLat,
            state.originLon,
            state.destinationLat,
            state.destinationLon
          );
    const distanceSource: "osrm" | "fallback" | null =
      state.destinationUnknown ? null : routeDistanceKm != null ? "osrm" : "fallback";

    const seasonFactor = getSeasonFactor(state.movingDate) * getUrgencyFactor(state.movingDate);

    const originFloor =
      originIsHouse || originIsBox ? 0 : parseInt(state.originFloor || "0", 10) || 0;
    const destinationFloor = state.destinationUnknown
      ? 0
      : destIsHouse
      ? 0
      : destIsBox
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

    const kitchenAppliancesCount =
      Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;
    const kitchenTouched =
      state.kitchenIncluded !== "" || (state.kitchenApplianceCount || "").trim().length > 0;
    const baselineKitchenExtraVolumeM3 = originIsBox ? 0 : 3 * 0.6;
    const extraVolumeM3 = originIsBox
      ? 0
      : (() => {
          if (!kitchenTouched) return baselineKitchenExtraVolumeM3;
          if (state.kitchenIncluded === "full") return 6;
          if (state.kitchenIncluded === "appliances")
            return Math.max(0, kitchenAppliancesCount) * 0.6;
          return 0;
        })();

    const baseVolume = surface * typeCoefficient;
    const adjustedVolume = baseVolume * densityCoefficient;
    const volumeM3 = Math.round((adjustedVolume + extraVolumeM3) * 10) / 10;

    const band = getDistanceBand(distanceKm);
    const rateEurPerM3 = LA_POSTE_RATES_EUR_PER_M3[band][formule];
    const volumeScale = getVolumeEconomyScale(volumeM3);
    const baseNoSeasonEur = Math.max(
      volumeM3 * rateEurPerM3 * volumeScale,
      PRIX_MIN_SOCLE
    );

    const coeffOrigin = getEtageCoefficient(originFloor, originElevator);
    const coeffDest = getEtageCoefficient(destinationFloor, destinationElevator);
    const coeffEtage = Math.max(coeffOrigin, coeffDest);

    // Recomposition (miroir calculatePricing)
    const centreNoSeasonSansServices = baseNoSeasonEur * formuleMultiplier * coeffEtage;
    const centreSeasonedSansServices =
      baseNoSeasonEur * seasonFactor * formuleMultiplier * coeffEtage;

    // On ne ré-expose pas le détail des services depuis constants ici,
    // mais on a déjà servicesTotal dans activePricing (issu de calculatePricing).
    const servicesTotalEur = activePricing.servicesTotal;
    const centreNoSeasonEur = centreNoSeasonSansServices + servicesTotalEur;
    const centreSeasonedEur = centreSeasonedSansServices + servicesTotalEur;

    return {
      surfaceM2: surface,
      housingType,
      density: state.density,
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
        adjustedVolumeM3: Math.round(adjustedVolume * 10) / 10,
        extraVolumeM3,
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
    state.originBoxVolumeM3,
    state.destinationHousingType,
    state.density,
    state.kitchenIncluded,
    state.kitchenApplianceCount,
    state.destinationUnknown,
    state.originPostalCode,
    state.destinationPostalCode,
    routeDistanceKm,
    state.movingDate,
    state.originFloor,
    state.destinationFloor,
    state.originElevator,
    state.destinationElevator,
    state.lift_required,
    state.servicePiano,
    state.serviceDebarras,
  ]);

  async function handleSubmitStep1(e: FormEvent) {
    e.preventDefault();

    if (!state.firstName.trim() || state.firstName.trim().length < 2) {
      setShowValidationStep1(true);
      requestAnimationFrame(() => {
        document.getElementById("contact-firstName")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("contact-firstName") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid firstName", 1, "CONTACT", "contact_v3");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      setShowValidationStep1(true);
      requestAnimationFrame(() => {
        document.getElementById("contact-email")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("contact-email") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid email", 1, "CONTACT", "contact_v3");
      return;
    }

    if (!state.phone.trim()) {
      setShowValidationStep1(true);
      requestAnimationFrame(() => {
        document.getElementById("contact-phone")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("contact-phone") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Missing phone", 1, "CONTACT", "contact_v3");
      return;
    }

    try {
      const payload = {
        firstName: state.firstName.trim(),
        email: state.email.trim().toLowerCase(),
        lastName: state.lastName.trim() || undefined,
        phone: state.phone.trim() || undefined,
        source,
        estimationMethod: "FORM" as const,
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
        // V3: on utilise maintenant l'id Back Office (Neon) comme `leadId` dans le state.
        // `linkingCode` (anciennement via SQLite /api/leads) n'est pas requis pour créer le lead BO;
        // WhatsApp CTA a un fallback sans code.
        updateFields({ leadId: backofficeLeadId, linkingCode: null });
      }

      setConfirmationRequested(false);
      setShowValidationStep1(false);
      trackStepChange(1, 2, "CONTACT", "PROJECT", "project_v3", "forward");
      goToStep(2);
    } catch (err: any) {
      console.error("Error creating/updating lead:", err);
      trackError("API_ERROR", err.message || "Failed to create/update lead", 1, "CONTACT", "contact_v3");
    }
  }

  async function handleSubmitStep2(e: FormEvent) {
    e.preventDefault();

    const isOriginValid =
      state.originAddress.trim().length >= 5 && state.originHousingType.trim().length > 0;
    const isDestinationValid =
      state.destinationUnknown ||
      (state.destinationAddress.trim().length >= 5 &&
        state.destinationHousingType.trim().length > 0);
    const MIN_DAYS_AHEAD = 14;
    const minMovingDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + MIN_DAYS_AHEAD);
      return d.toISOString().split("T")[0]!;
    })();
    const isMovingDateTooSoon =
      Boolean(state.movingDate) && state.movingDate < minMovingDate;
    const isDateValid = state.movingDate.length > 0 && !isMovingDateTooSoon;

    if (!isOriginValid || !isDestinationValid || !isDateValid) {
      setShowValidationStep2(true);
      requestAnimationFrame(() => {
        const ids = [
          state.originAddress.trim().length >= 5 ? null : "origin-address",
          state.originHousingType.trim().length > 0 ? null : "origin-housingType",
          state.destinationUnknown
            ? null
            : state.destinationAddress.trim().length >= 5
            ? null
            : "destination-address",
          state.destinationUnknown
            ? null
            : state.destinationHousingType.trim().length > 0
            ? null
            : "destination-housingType",
          state.movingDate.length > 0 && !isMovingDateTooSoon ? null : "movingDate",
        ].filter(Boolean) as string[];
        const firstId = ids[0];
        if (!firstId) return;
        const el = document.getElementById(firstId);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable =
          (el as any).focus
            ? el
            : (el.querySelector?.(
                "input,textarea,select,button,[tabindex]:not([tabindex='-1'])"
              ) as HTMLElement | null);
        focusable?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid project fields", 2, "PROJECT", "project_v3");
      return;
    }

    try {
      const effectiveLeadId = await ensureBackofficeLeadId();
      if (effectiveLeadId) {
        const originIsHouse = isHouseType(state.originHousingType);
        const destIsHouse = isHouseType(state.destinationHousingType);

        const tunnelOptions = {
          pricing: {
            distanceKm:
              state.destinationUnknown
                ? 50
                : routeDistanceKm ??
                  estimateDistanceKm(
                    state.originPostalCode,
                    state.destinationPostalCode,
                    state.originLat,
                    state.originLon,
                    state.destinationLat,
                    state.destinationLon
                  ),
            distanceProvider: routeDistanceProvider ?? undefined,
          },
          accessV2: {
            access_type: state.access_type ?? "simple",
            narrow_access: !!state.narrow_access,
            long_carry: !!state.long_carry,
            difficult_parking: !!state.difficult_parking,
            lift_required: !!state.lift_required,
            access_details: [state.originAccessDetails, state.destinationAccessDetails].filter(Boolean).join(" | ") || undefined,
          },
          volumeAdjustments: (() => {
            const originIsBox = isBoxType(state.originHousingType);
            const originBoxVolumeM3 = originIsBox ? getBoxVolumeM3(state.originBoxVolumeM3) : null;

            const kitchenTouched =
              state.kitchenIncluded !== "" || (state.kitchenApplianceCount || "").trim().length > 0;
            const obj: any = {};

            if (kitchenTouched) {
              const kitchenAppliancesCount =
                Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;
              const extraVolumeM3 = (() => {
                if (state.kitchenIncluded === "full") return 6;
                if (state.kitchenIncluded === "appliances")
                  return Math.max(0, kitchenAppliancesCount) * 0.6;
                return 0;
              })();
              const kitchenIncludedForBo = state.kitchenIncluded || "appliances";
              const kitchenApplianceCountForBo =
                state.kitchenIncluded === ""
                  ? 3
                  : kitchenIncludedForBo === "appliances"
                  ? kitchenAppliancesCount
                  : undefined;
              obj.kitchenIncluded = kitchenIncludedForBo;
              obj.kitchenApplianceCount = kitchenApplianceCountForBo;
              obj.extraVolumeM3 = extraVolumeM3;
            }

            if (originIsBox && originBoxVolumeM3 != null) {
              obj.boxExactVolumeM3 = originBoxVolumeM3;
            }

            return Object.keys(obj).length > 0 ? obj : undefined;
          })(),
        };

        const payload = {
          // Adresses (schéma BO)
          originAddress: state.originAddress || undefined,
          originCity: state.originCity || undefined,
          originPostalCode: state.originPostalCode || undefined,
          destAddress: state.destinationUnknown ? undefined : state.destinationAddress || undefined,
          destCity: state.destinationUnknown ? undefined : state.destinationCity || undefined,
          destPostalCode:
            state.destinationUnknown ? undefined : state.destinationPostalCode || undefined,

          // Date
          movingDate: toIsoDate(state.movingDate),
          dateFlexible: state.dateFlexible,

          // Logement / accès
          originHousingType: state.originHousingType || undefined,
          originFloor: originIsHouse
            ? undefined
            : state.originFloorTouched
            ? Math.max(0, parseInt(state.originFloor, 10))
            : undefined,
          originElevator: originIsHouse
            ? undefined
            : state.originElevatorTouched && state.originElevator && state.originElevator !== "none"
            ? mapElevator(state.originElevator)
            : undefined,
          originFurnitureLift: state.originFurnitureLift || undefined,
          originCarryDistance: state.originCarryDistance || undefined,
          originParkingAuth: state.originParkingAuth,

          destHousingType: state.destinationUnknown
            ? undefined
            : state.destinationHousingType || undefined,
          destFloor: state.destinationUnknown
            ? undefined
            : destIsHouse
            ? undefined
            : state.destinationFloorTouched
            ? Math.max(0, parseInt(state.destinationFloor, 10))
            : undefined,
          destElevator: state.destinationUnknown
            ? undefined
            : destIsHouse
            ? undefined
            : state.destinationElevatorTouched &&
              state.destinationElevator &&
              state.destinationElevator !== "none"
            ? mapElevator(state.destinationElevator)
            : undefined,
          destFurnitureLift: state.destinationUnknown
            ? undefined
            : state.destinationFurnitureLift || undefined,
          destCarryDistance: state.destinationUnknown
            ? undefined
            : state.destinationCarryDistance || undefined,
          destParkingAuth: state.destinationUnknown ? undefined : state.destinationParkingAuth,

          // Archivage (options non strictement mappées)
          tunnelOptions,
        };

        try {
          await updateBackofficeLead(effectiveLeadId, payload);
        } catch (err: any) {
          if (err instanceof Error && err.message === "LEAD_NOT_FOUND") {
            const newId = await ensureBackofficeLeadId({ forceNew: true });
            if (newId) {
              await updateBackofficeLead(newId, payload);
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }

      trackStepChange(2, 3, "PROJECT", "RECAP", "formules_v3", "forward");
      setShowValidationStep2(false);
      goToStep(3);
      window.scrollTo({ top: 0, behavior: "instant" });
      requestAnimationFrame(() => {
        (document.getElementById("surfaceM2") as HTMLInputElement | null)?.focus();
      });
    } catch (err: any) {
      console.error("Error updating lead:", err);
      trackError("API_ERROR", err.message || "Failed to update lead", 2, "PROJECT", "project_v3");
    }
  }

  async function handleSubmitStep3(e: FormEvent) {
    e.preventDefault();

    const originIsBoxStep3 = isBoxType(state.originHousingType);
    const originBoxVolumeM3 = getBoxVolumeM3(state.originBoxVolumeM3);
    if (originIsBoxStep3 && originBoxVolumeM3 == null) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        document.getElementById("origin-box-volume")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("origin-box-volume") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Missing exact box volume", 3, "RECAP", "formules_v3");
      return;
    }

    const surface = getEffectiveSurfaceForPricing();
    if (surface < 10 || surface > 500) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        document.getElementById("surfaceM2")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("surfaceM2") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid surface", 3, "RECAP", "formules_v3");
      return;
    }

    if (!state.formule) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        document.getElementById("formule-select")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      trackError("VALIDATION_ERROR", "No formule selected", 3, "RECAP", "formules_v3");
      return;
    }

    try {
      const effectiveLeadId = await ensureBackofficeLeadId();
      if (effectiveLeadId && state.leadId !== effectiveLeadId) {
        updateFields({ leadId: effectiveLeadId });
      }
      if (effectiveLeadId) {
        const pricingForSubmit =
          (pricingByFormule
            ? pricingByFormule[state.formule as PricingFormuleType]
            : null) ?? activePricing;

        if (!pricingForSubmit) {
          throw new Error("PRICING_NOT_READY");
        }

        const distanceKm =
          state.destinationUnknown
            ? 50
            : routeDistanceKm ??
              estimateDistanceKm(
                state.originPostalCode,
                state.destinationPostalCode,
                state.originLat,
                state.originLon,
                state.destinationLat,
                state.destinationLon
              );
        const seasonFactor = getSeasonFactor(state.movingDate) * getUrgencyFactor(state.movingDate);
        const originIsHouse = isHouseType(state.originHousingType);
        const destIsHouse = isHouseType(state.destinationHousingType);
        const originIsBox = isBoxType(state.originHousingType);
        const housingType = coerceHousingType(state.originHousingType);
        const densityEffective = (state.density || "normal") as "light" | "normal" | "dense";
        const destIsBox = isBoxType(state.destinationHousingType);
        const originFloor =
          originIsHouse || originIsBox ? 0 : parseInt(state.originFloor || "0", 10) || 0;
        const destinationFloor = state.destinationUnknown
          ? 0
          : destIsHouse
          ? 0
          : destIsBox
          ? 0
          : parseInt(state.destinationFloor || "0", 10) || 0;
        const originElevator = toPricingElevator(state.originElevator);
        const destinationElevator = state.destinationUnknown ? "yes" : toPricingElevator(state.destinationElevator);
        const monteMeuble = !!state.lift_required;
        const piano =
          state.servicePiano === "droit"
            ? ("droit" as const)
            : state.servicePiano === "quart"
            ? ("quart" as const)
            : null;

        const kitchenAppliancesCount =
          Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;
        const kitchenTouched =
          state.kitchenIncluded !== "" || (state.kitchenApplianceCount || "").trim().length > 0;
        const baselineKitchenExtraVolumeM3 = originIsBox ? 0 : 3 * 0.6;
        const kitchenExtraVolumeM3 = originIsBox
          ? 0
          : (() => {
              if (!kitchenTouched) return baselineKitchenExtraVolumeM3;
              if (state.kitchenIncluded === "full") return 6;
              if (state.kitchenIncluded === "appliances")
                return Math.max(0, kitchenAppliancesCount) * 0.6;
              return 0;
            })();

        const longCarry = !!state.long_carry;
        const difficultParking = !!state.difficult_parking;
        const tightAccess = !!state.narrow_access;

        const center = (p: { prixMin: number; prixMax: number }) => getDisplayedCenter(p.prixMin, p.prixMax);

        // Pipeline "mover" simplifié (v3a) : base neutre puis deltas détaillés.
        const baseNeutralInput = {
          surfaceM2: surface,
          housingType,
          density: "normal" as const,
          distanceKm,
          seasonFactor: 1,
          originFloor: 0,
          originElevator: "yes" as const,
          destinationFloor: 0,
          destinationElevator: "yes" as const,
          formule: "STANDARD" as const,
          services: { monteMeuble: false, piano: null, debarras: false },
          longCarry: false,
          difficultParking: false,
          tightAccess: false,
          extraVolumeM3: baselineKitchenExtraVolumeM3,
        };
        const sBase = calculatePricing(baseNeutralInput);
        const sDensity = calculatePricing({ ...baseNeutralInput, density: densityEffective });
        const sDate = calculatePricing({ ...baseNeutralInput, density: densityEffective, seasonFactor });
        const sAccess = calculatePricing({
          ...baseNeutralInput,
          density: densityEffective,
          seasonFactor,
          originFloor,
          originElevator,
          destinationFloor,
          destinationElevator,
          longCarry,
          difficultParking,
          tightAccess,
        });
        const sKitchen = calculatePricing({
          ...baseNeutralInput,
          density: densityEffective,
          seasonFactor,
          originFloor,
          originElevator,
          destinationFloor,
          destinationElevator,
          longCarry,
          difficultParking,
          tightAccess,
          extraVolumeM3: kitchenExtraVolumeM3,
        });
        const sServices = calculatePricing({
          ...baseNeutralInput,
          density: densityEffective,
          seasonFactor,
          originFloor,
          originElevator,
          destinationFloor,
          destinationElevator,
          longCarry,
          difficultParking,
          tightAccess,
          extraVolumeM3: kitchenExtraVolumeM3,
          services: { monteMeuble, piano, debarras: Boolean(state.serviceDebarras) },
        });
        const sFormule = calculatePricing({
          ...baseNeutralInput,
          density: densityEffective,
          seasonFactor,
          originFloor,
          originElevator,
          destinationFloor,
          destinationElevator,
          longCarry,
          difficultParking,
          tightAccess,
          extraVolumeM3: kitchenExtraVolumeM3,
          services: { monteMeuble, piano, debarras: Boolean(state.serviceDebarras) },
          formule: state.formule as PricingFormuleType,
        });

        const moverBasePriceEur = center(sBase);
        const deltaDensityEur = center(sDensity) - center(sBase);
        const deltaDateEur = center(sDate) - center(sDensity);
        const deltaAccessEur = center(sAccess) - center(sDate);
        const deltaKitchenEur = center(sKitchen) - center(sAccess);
        const deltaServicesEur = center(sServices) - center(sKitchen);
        const deltaFormuleEur = center(sFormule) - center(sServices);

        const centerMoverPrice = center(sFormule);
        const moverzFeeProvisionEur = pricingForSubmit.moverzFeeEur;
        const refinedCenterEur = centerMoverPrice + moverzFeeProvisionEur;

        const pricingSnapshot = {
          capturedAt: new Date().toISOString(),
          formule: state.formule,
          calculationDetails: {
            surfaceM2: surface,
            volumeM3: pricingForSubmit.volumeM3,
            housingType,
            density: densityEffective,
            distanceKm,
            distanceBand: getDistanceBand(distanceKm),
            seasonFactor,
            originFloor,
            originElevator,
            originEtageCoefficient: getEtageCoefficient(originFloor, originElevator),
            destinationFloor,
            destinationElevator,
            destinationEtageCoefficient: getEtageCoefficient(destinationFloor, destinationElevator),
            densityCoefficient: DENSITY_COEFFICIENTS[densityEffective],
            typeCoefficient: TYPE_COEFFICIENTS[housingType],
            formuleMultiplier: FORMULE_MULTIPLIERS[(state.formule || "STANDARD") as PricingFormuleType],
            extraVolumeM3: kitchenExtraVolumeM3,
            services: { monteMeuble, piano, debarras: Boolean(state.serviceDebarras) },
            longCarry,
            difficultParking,
            tightAccess,
            accessFlags: {
              narrow_access: !!state.narrow_access,
              long_carry: !!state.long_carry,
              difficult_parking: !!state.difficult_parking,
              lift_required: !!state.lift_required,
            },
          },
          refinedMinEur: pricingForSubmit.prixMin,
          refinedMaxEur: pricingForSubmit.prixMax,
          refinedCenterEur,
          moverBasePriceEur,
          moverzFeeProvisionEur,
          moverzFeeProvisionRule: "MAX(100;10% du centre formule choisie)",
          firstEstimateMinEur: pricingForSubmit.prixMin,
          firstEstimateMaxEur: pricingForSubmit.prixMax,
          firstEstimateCenterEur: refinedCenterEur,
          lines: [
            {
              key: "density",
              label: "Densité",
              status: state.density || "normal",
              amountEur: deltaDensityEur,
              moverAmountEur: deltaDensityEur,
              confirmed: true,
            },
            {
              key: "date",
              label: "Date",
              status: state.movingDate ? "confirmée" : "à confirmer",
              amountEur: deltaDateEur,
              moverAmountEur: deltaDateEur,
              confirmed: Boolean(state.movingDate),
            },
            {
              key: "access_housing",
              label: "Accès (étages / ascenseur)",
              status: "déclarés",
              amountEur: deltaAccessEur,
              moverAmountEur: deltaAccessEur,
              confirmed: true,
            },
            ...(originIsBoxStep3
              ? [
                  {
                    key: "box",
                    label: "Box",
                    status: originBoxVolumeM3 != null ? `${originBoxVolumeM3} m³` : "sélectionné",
                    amountEur: 0,
                    moverAmountEur: 0,
                    confirmed: true,
                  },
                ]
              : []),
            ...(!originIsBoxStep3
              ? [
                  {
                    key: "kitchen",
                    label: "Cuisine",
                    status: !kitchenTouched
                      ? "par défaut (3 équipements)"
                      : state.kitchenIncluded === "full"
                      ? "cuisine complète"
                      : state.kitchenIncluded === "appliances"
                      ? `${Math.max(0, kitchenAppliancesCount)} équipement(s)`
                      : "rien",
                    amountEur: deltaKitchenEur,
                    moverAmountEur: deltaKitchenEur,
                    confirmed: true,
                  },
                ]
              : []),
            {
              key: "services",
              label: "Services",
              status: monteMeuble || piano || state.serviceDebarras ? "sélectionnés" : "aucun",
              amountEur: deltaServicesEur,
              moverAmountEur: deltaServicesEur,
              confirmed: true,
            },
            {
              key: "formule",
              label: "Formule",
              status: state.formule,
              amountEur: deltaFormuleEur,
              moverAmountEur: deltaFormuleEur,
              confirmed: true,
            },
          ],
          byFormule: pricingByFormule
            ? {
                ECONOMIQUE: {
                  prixMin: pricingByFormule.ECONOMIQUE.prixMin,
                  prixMax: pricingByFormule.ECONOMIQUE.prixMax,
                  prixFinal: getDisplayedCenter(
                    pricingByFormule.ECONOMIQUE.prixMin,
                    pricingByFormule.ECONOMIQUE.prixMax
                  ),
                  volumeM3: pricingForSubmit.volumeM3,
                },
                STANDARD: {
                  prixMin: pricingByFormule.STANDARD.prixMin,
                  prixMax: pricingByFormule.STANDARD.prixMax,
                  prixFinal: getDisplayedCenter(
                    pricingByFormule.STANDARD.prixMin,
                    pricingByFormule.STANDARD.prixMax
                  ),
                  volumeM3: pricingForSubmit.volumeM3,
                },
                PREMIUM: {
                  prixMin: pricingByFormule.PREMIUM.prixMin,
                  prixMax: pricingByFormule.PREMIUM.prixMax,
                  prixFinal: getDisplayedCenter(
                    pricingByFormule.PREMIUM.prixMin,
                    pricingByFormule.PREMIUM.prixMax
                  ),
                  volumeM3: pricingForSubmit.volumeM3,
                },
              }
            : {
                [state.formule]: {
                  prixMin: pricingForSubmit.prixMin,
                  prixMax: pricingForSubmit.prixMax,
                  prixFinal: refinedCenterEur,
                  volumeM3: pricingForSubmit.volumeM3,
                },
              },
        };

        const tunnelOptions = {
          pricing: {
            // Stockage indicatif pour debug/analytics (Neon via JSON).
            distanceKm,
            distanceProvider: routeDistanceProvider ?? undefined,
          },
          accessV2: {
            access_type: state.access_type ?? "simple",
            narrow_access: !!state.narrow_access,
            long_carry: !!state.long_carry,
            difficult_parking: !!state.difficult_parking,
            lift_required: !!state.lift_required,
            access_details: [state.originAccessDetails, state.destinationAccessDetails].filter(Boolean).join(" | ") || undefined,
          },
          volumeAdjustments: (() => {
            const originIsBox = isBoxType(state.originHousingType);
            const originBoxVolumeM3 = originIsBox ? getBoxVolumeM3(state.originBoxVolumeM3) : null;

            const kitchenTouched =
              state.kitchenIncluded !== "" || (state.kitchenApplianceCount || "").trim().length > 0;
            const obj: any = {};

            if (kitchenTouched) {
              const kitchenAppliancesCount =
                Number.parseInt(String(state.kitchenApplianceCount || "").trim(), 10) || 0;
              const extraVolumeM3 = (() => {
                if (state.kitchenIncluded === "full") return 6;
                if (state.kitchenIncluded === "appliances")
                  return Math.max(0, kitchenAppliancesCount) * 0.6;
                return 0;
              })();
              const kitchenIncludedForBo = state.kitchenIncluded || "appliances";
              const kitchenApplianceCountForBo =
                state.kitchenIncluded === ""
                  ? 3
                  : kitchenIncludedForBo === "appliances"
                  ? kitchenAppliancesCount
                  : undefined;
              obj.kitchenIncluded = kitchenIncludedForBo;
              obj.kitchenApplianceCount = kitchenApplianceCountForBo;
              obj.extraVolumeM3 = extraVolumeM3;
            }

            if (originIsBox && originBoxVolumeM3 != null) {
              obj.boxExactVolumeM3 = originBoxVolumeM3;
            }

            return Object.keys(obj).length > 0 ? obj : undefined;
          })(),
          services: {
            furnitureStorage: state.serviceFurnitureStorage || undefined,
            cleaning: state.serviceCleaning || undefined,
            fullPacking: state.serviceFullPacking || undefined,
            furnitureAssembly: state.serviceFurnitureAssembly || undefined,
            insurance: state.serviceInsurance || undefined,
            wasteRemoval: state.serviceWasteRemoval || undefined,
            helpWithoutTruck: state.serviceHelpWithoutTruck || undefined,
            specificSchedule: state.serviceSpecificSchedule || undefined,
            debarras: state.serviceDebarras || undefined,
            dismantling: state.serviceDismantling || undefined,
            piano: state.servicePiano || undefined,
          },
          heavyFurniture: {
            americanFridge: state.furnitureAmericanFridge || undefined,
            safe: state.furnitureSafe || undefined,
            billiard: state.furnitureBilliard || undefined,
            aquarium: state.furnitureAquarium || undefined,
            over25kg: state.furnitureOver25kg || undefined,
          },
          notes: state.specificNotes || undefined,
          pricingSnapshot,
        };

        const payload = {
          surfaceM2: surface,
          estimatedVolume: pricingForSubmit.volumeM3,
          density: mapDensity(state.density),
          formule: state.formule,
          estimatedPriceMin: pricingForSubmit.prixMin,
          estimatedPriceAvg: Math.round((pricingForSubmit.prixMin + pricingForSubmit.prixMax) / 2),
          estimatedPriceMax: pricingForSubmit.prixMax,
          tunnelOptions,
        };

        try {
          await updateBackofficeLead(effectiveLeadId, payload);
        } catch (err: any) {
          if (err instanceof Error && err.message === "LEAD_NOT_FOUND") {
            const newId = await ensureBackofficeLeadId({ forceNew: true });
            if (newId) {
              await updateBackofficeLead(newId, payload);
              // On bascule l'id utilisé pour la confirmation ci-dessous.
              updateFields({ leadId: newId });
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }

        // Email de confirmation envoyé sur l'écran final (Step 4).
      }

      trackStepChange(3, 4, "RECAP", "THANK_YOU", "confirmation_v3", "forward");
      trackCompletion({ leadId: effectiveLeadId ?? null });
      setShowValidationStep3(false);
      goToStep(4);
    } catch (err: any) {
      console.error("Error finalizing lead:", err);
      trackError("API_ERROR", err.message || "Failed to finalize lead", 3, "RECAP", "formules_v3");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F8F9FA] to-white">
      {/* Hero with progress */}
      <TunnelHero currentStep={state.currentStep} totalSteps={STEPS.length} />

      {/* Main content */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Trust signals */}
        {state.currentStep < 4 && (
          <div className="mb-12 hidden md:block">
            <TrustSignals />
          </div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-md md:shadow-lg p-4 sm:p-6 md:p-12">
          {state.currentStep === 1 && (
            <Step1Contact
              firstName={state.firstName}
              email={state.email}
              phone={state.phone}
              onFirstNameChange={(value) => updateField("firstName", value)}
              onEmailChange={(value) => updateField("email", value)}
              onPhoneChange={(value) => updateField("phone", value)}
              onSubmit={handleSubmitStep1}
              isSubmitting={false}
              error={null}
              showValidation={showValidationStep1}
            />
          )}

          {state.currentStep === 2 && (
            <Step2ProjectComplete
              originPostalCode={state.originPostalCode}
              originCity={state.originCity}
              originAddress={state.originAddress}
              originLat={state.originLat}
              originLon={state.originLon}
              originHousingType={state.originHousingType}
              originBoxVolumeM3={state.originBoxVolumeM3}
              originFloor={state.originFloor}
              originElevator={state.originElevator}
              originAccess={state.originAccess}
              originFurnitureLift={state.originFurnitureLift}
              originCarryDistance={state.originCarryDistance}
              originParkingAuth={state.originParkingAuth}
              originTightAccess={state.originTightAccess}
              destinationPostalCode={state.destinationPostalCode}
              destinationCity={state.destinationCity}
              destinationAddress={state.destinationAddress}
              destinationLat={state.destinationLat}
              destinationLon={state.destinationLon}
              destinationHousingType={state.destinationHousingType}
              destinationFloor={state.destinationFloor}
              destinationElevator={state.destinationElevator}
              destinationAccess={state.destinationAccess}
              destinationFurnitureLift={state.destinationFurnitureLift}
              destinationCarryDistance={state.destinationCarryDistance}
              destinationParkingAuth={state.destinationParkingAuth}
              destinationTightAccess={state.destinationTightAccess}
              destinationUnknown={state.destinationUnknown}
              movingDate={state.movingDate}
              dateFlexible={state.dateFlexible}
              originAccessDetails={state.originAccessDetails || ""}
              destinationAccessDetails={state.destinationAccessDetails || ""}
              onFieldChange={(field, value) => updateField(field as any, value)}
              onSubmit={handleSubmitStep2}
              isSubmitting={false}
              error={null}
              showValidation={showValidationStep2}
            />
          )}

          {state.currentStep === 3 && (
            <Step3VolumeServices
              surfaceM2={state.surfaceM2}
              formule={state.formule}
              pricing={
                activePricing
                  ? {
                      volumeM3: activePricing.volumeM3,
                      priceMin: activePricing.prixMin,
                      priceMax: activePricing.prixMax,
                    }
                  : null
              }
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
              pricingDetails={activePricingDetails}
              serviceFurnitureStorage={state.serviceFurnitureStorage}
              serviceCleaning={state.serviceCleaning}
              serviceFullPacking={state.serviceFullPacking}
              serviceFurnitureAssembly={state.serviceFurnitureAssembly}
              serviceInsurance={state.serviceInsurance}
              serviceWasteRemoval={state.serviceWasteRemoval}
              serviceHelpWithoutTruck={state.serviceHelpWithoutTruck}
              serviceSpecificSchedule={state.serviceSpecificSchedule}
              hasPiano={state.hasPiano}
              hasFragileItems={state.hasFragileItems}
              hasSpecificFurniture={state.hasSpecificFurniture}
              specificNotes={state.specificNotes}
              onFieldChange={(field, value) => {
                // V2 behavior: si l'utilisateur modifie la surface, on marque surfaceTouched=true
                if (field === "surfaceM2") {
                  updateFields({ surfaceM2: String(value), surfaceTouched: true });
                  return;
                }
                updateField(field as any, value);
              }}
              onSubmit={handleSubmitStep3}
              isSubmitting={false}
              error={null}
              showValidation={showValidationStep3}
            />
          )}

          {state.currentStep === 4 && (
            <ConfirmationPage
              firstName={state.firstName}
              email={state.email}
              linkingCode={state.linkingCode || undefined}
              confirmationRequested={confirmationRequested}
              leadId={state.leadId || undefined}
              estimateMinEur={estimateRange?.minEur ?? null}
              estimateMaxEur={estimateRange?.maxEur ?? null}
              estimateIsIndicative={estimateIsIndicative}
              onEmailChange={(v) => updateField("email", v)}
              onGoToStep={(target) => {
                const stepMap = {
                  1: "CONTACT",
                  2: "PROJECT",
                  3: "RECAP",
                  4: "THANK_YOU",
                } as const;
                const screenMap = {
                  1: "contact_v3",
                  2: "project_v3",
                  3: "formules_v3",
                  4: "confirmation_v3",
                } as const;
                trackStepChange(
                  state.currentStep,
                  target,
                  stepMap[state.currentStep as 1 | 2 | 3 | 4],
                  stepMap[target],
                  screenMap[target],
                  "back"
                );
                goToStep(target);
              }}
            />
          )}
        </div>

        {/* Navigation helpers */}
        {state.currentStep > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => {
                const prevStep = (state.currentStep - 1) as 1 | 2 | 3 | 4;
                const stepMap = {
                  1: "CONTACT",
                  2: "PROJECT",
                  3: "RECAP",
                  4: "THANK_YOU",
                } as const;
                const screenMap = {
                  1: "contact_v3",
                  2: "project_v3",
                  3: "formules_v3",
                  4: "confirmation_v3",
                } as const;
                trackStepChange(
                  state.currentStep,
                  prevStep,
                  stepMap[state.currentStep as 1 | 2 | 3 | 4],
                  stepMap[prevStep],
                  screenMap[prevStep],
                  "back"
                );
                goToStep(prevStep);
              }}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#E3E5E8] bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] hover:border-[#6BCFCF] hover:bg-[#F8F9FA] transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Retour</span>
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step) => (
                <button
                  key={step}
                  onClick={() => {
                    if (step < state.currentStep) {
                      goToStep(step as 1 | 2 | 3 | 4);
                    }
                  }}
                  disabled={step >= state.currentStep && state.currentStep < 4}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === state.currentStep
                      ? "bg-[#6BCFCF] w-8"
                      : step < state.currentStep || state.currentStep === 4
                      ? "bg-[#6BCFCF]/50 cursor-pointer hover:bg-[#6BCFCF]/70"
                      : "bg-[#E3E5E8]"
                  }`}
                  aria-label={`Étape ${step}`}
                />
              ))}
            </div>
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent"></div>
          <p className="mt-4 text-[#1E293B]/70">Chargement...</p>
        </div>
      </div>
    }>
      <DevisGratuitsV3Content />
    </Suspense>
  );
}
