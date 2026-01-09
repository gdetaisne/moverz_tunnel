'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ga4Event } from "@/lib/analytics/ga4";
import {
  createBackofficeLead,
  requestBackofficeConfirmation,
  updateBackofficeLead,
} from "@/lib/api/client";
import {
  calculatePricing,
  type FormuleType as PricingFormuleType,
  type HousingType,
  getEtageCoefficient,
} from "@/lib/pricing/calculate";
import {
  COEF_DISTANCE,
  COEF_VOLUME,
  DENSITY_COEFFICIENTS,
  FORMULE_MULTIPLIERS,
  PRIX_MIN_SOCLE,
  TYPE_COEFFICIENTS,
} from "@/lib/pricing/constants";
import { useTunnelState } from "@/hooks/useTunnelState";
import { useTunnelTracking } from "@/hooks/useTunnelTracking";
import TunnelHero from "@/components/tunnel/TunnelHero";
import Step1Contact from "@/components/tunnel/Step1Contact";
import Step2ProjectComplete from "@/components/tunnel/Step2ProjectComplete";
import Step3VolumeServices from "@/components/tunnel/Step3VolumeServices";
import ConfirmationPage from "@/components/tunnel/ConfirmationPage";
import TrustSignals from "@/components/tunnel/TrustSignals";

const STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Projet" },
  { id: 3, label: "Formules" },
  { id: 4, label: "Photos" },
] as const;

function DevisGratuitsV3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { state, updateField, updateFields, goToStep } = useTunnelState();
  const source = searchParams.get("source") || searchParams.get("src") || "direct";
  const from = searchParams.get("from") || "/devis-gratuits-v3";

  const [confirmationRequested, setConfirmationRequested] = useState(false);
  const [showValidationStep1, setShowValidationStep1] = useState(false);
  const [showValidationStep2, setShowValidationStep2] = useState(false);
  const [showValidationStep3, setShowValidationStep3] = useState(false);
  
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

  const isHouseType = (t: string | null | undefined) =>
    !!t && (t === "house" || t.startsWith("house_"));

  const toPricingElevator = (e: string): "yes" | "no" | "partial" => {
    if (!e || e === "none" || e === "no") return "no";
    if (e === "small" || e === "partial") return "partial";
    return "yes";
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
    const surface = parseInt(state.surfaceM2) || 60;
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return null;

    const housingType = coerceHousingType(state.originHousingType || state.destinationHousingType);
    const density = state.density;

    const distanceKm = state.destinationUnknown
      ? 50
      : estimateDistanceKm(
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

    const monteMeuble =
      state.originFurnitureLift === "yes" || state.destinationFurnitureLift === "yes";

    const piano =
      state.servicePiano === "droit"
        ? ("droit" as const)
        : state.servicePiano === "quart"
        ? ("quart" as const)
        : null;

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
    state.originPostalCode,
    state.destinationPostalCode,
    state.destinationUnknown,
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

  const activePricingDetails = useMemo(() => {
    if (!activePricing) return null;

    const surface = parseInt(state.surfaceM2) || 60;
    if (!Number.isFinite(surface) || surface < 10 || surface > 500) return null;

    const housingType = coerceHousingType(state.originHousingType || state.destinationHousingType);
    const typeCoefficient = TYPE_COEFFICIENTS[housingType];
    const densityCoefficient = DENSITY_COEFFICIENTS[state.density];

    const distanceKm = state.destinationUnknown
      ? 50
      : estimateDistanceKm(
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

    const monteMeuble =
      state.originFurnitureLift === "yes" || state.destinationFurnitureLift === "yes";

    const piano =
      state.servicePiano === "droit"
        ? ("droit" as const)
        : state.servicePiano === "quart"
        ? ("quart" as const)
        : null;

    const formule = state.formule as PricingFormuleType;
    const formuleMultiplier = FORMULE_MULTIPLIERS[formule];

    const baseVolume = surface * typeCoefficient;
    const adjustedVolume = baseVolume * densityCoefficient;
    const volumeM3 = Math.round(adjustedVolume * 10) / 10;

    const volumePartEur = volumeM3 * COEF_VOLUME;
    const distancePartEur = distanceKm * COEF_DISTANCE;
    const baseNoSeasonEur = Math.max(volumePartEur, distancePartEur, PRIX_MIN_SOCLE);

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
        COEF_VOLUME,
        COEF_DISTANCE,
        PRIX_MIN_SOCLE,
      },
      intermediate: {
        baseVolumeM3: Math.round(baseVolume * 10) / 10,
        adjustedVolumeM3: volumeM3,
        volumePartEur: Math.round(volumePartEur),
        distancePartEur: Math.round(distancePartEur),
        baseNoSeasonEur: Math.round(baseNoSeasonEur),
        coeffEtage,
        formuleMultiplier,
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

  async function handleSubmitStep1(e: FormEvent) {
    e.preventDefault();

    if (!state.firstName.trim() || state.firstName.trim().length < 2) {
      setShowValidationStep1(true);
      requestAnimationFrame(() => {
        document.getElementById("contact-firstName")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("contact-firstName") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid firstName", 1, "CONTACT");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      setShowValidationStep1(true);
      requestAnimationFrame(() => {
        document.getElementById("contact-email")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("contact-email") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid email", 1, "CONTACT");
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

      const { id: backofficeLeadId } = await createBackofficeLead(payload);
      // V3: on utilise maintenant l'id Back Office (Neon) comme `leadId` dans le state.
      // `linkingCode` (anciennement via SQLite /api/leads) n'est pas requis pour créer le lead BO;
      // WhatsApp CTA a un fallback sans code.
      updateFields({ leadId: backofficeLeadId, linkingCode: null });
      setConfirmationRequested(false);
      setShowValidationStep1(false);

      trackStepChange(1, 2, "CONTACT", "PROJECT", "forward");
      goToStep(2);
    } catch (err: any) {
      console.error("Error creating lead:", err);
      trackError("API_ERROR", err.message || "Failed to create lead", 1, "CONTACT");
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
    const isDateValid = state.movingDate.length > 0;

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
          state.movingDate.length > 0 ? null : "movingDate",
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
      trackError("VALIDATION_ERROR", "Invalid project fields", 2, "PROJECT");
      return;
    }

    try {
      const effectiveLeadId = await ensureBackofficeLeadId();
      if (effectiveLeadId) {
        const originIsHouse = isHouseType(state.originHousingType);
        const destIsHouse = isHouseType(state.destinationHousingType);

        const tunnelOptions = {
          access: {
            origin: {
              accessKind: state.originAccess || undefined,
              furnitureLift: state.originFurnitureLift || undefined,
              carryDistance: state.originCarryDistance || undefined,
            },
            destination: state.destinationUnknown
              ? undefined
              : {
                  accessKind: state.destinationAccess || undefined,
                  furnitureLift: state.destinationFurnitureLift || undefined,
                  carryDistance: state.destinationCarryDistance || undefined,
                },
          },
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
            ? null
            : state.originFloor
            ? Math.max(0, parseInt(state.originFloor, 10))
            : null,
          originElevator: originIsHouse
            ? null
            : state.originElevator
            ? mapElevator(state.originElevator)
            : null,
          originFurnitureLift: state.originFurnitureLift || undefined,
          originCarryDistance: state.originCarryDistance || undefined,
          originParkingAuth: state.originParkingAuth,

          destHousingType: state.destinationUnknown
            ? undefined
            : state.destinationHousingType || undefined,
          destFloor: state.destinationUnknown
            ? undefined
            : destIsHouse
            ? null
            : state.destinationFloor
            ? Math.max(0, parseInt(state.destinationFloor, 10))
            : null,
          destElevator: state.destinationUnknown
            ? undefined
            : destIsHouse
            ? null
            : state.destinationElevator
            ? mapElevator(state.destinationElevator)
            : null,
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

      trackStepChange(2, 3, "PROJECT", "RECAP", "forward");
      setShowValidationStep2(false);
      goToStep(3);
    } catch (err: any) {
      console.error("Error updating lead:", err);
      trackError("API_ERROR", err.message || "Failed to update lead", 2, "PROJECT");
    }
  }

  async function handleSubmitStep3(e: FormEvent) {
    e.preventDefault();

    const surface = parseInt(state.surfaceM2) || 60;
    if (surface < 10 || surface > 500) {
      setShowValidationStep3(true);
      requestAnimationFrame(() => {
        document.getElementById("surfaceM2")?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("surfaceM2") as any)?.focus?.();
      });
      trackError("VALIDATION_ERROR", "Invalid surface", 3, "RECAP");
      return;
    }

    try {
      const effectiveLeadId = await ensureBackofficeLeadId();
      if (effectiveLeadId) {
        if (!activePricing) {
          throw new Error("PRICING_NOT_READY");
        }

        const tunnelOptions = {
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
          accessDetails: {
            noElevator: state.accessNoElevator || undefined,
            smallElevator: state.accessSmallElevator || undefined,
            truckDifficult: state.accessTruckDifficult || undefined,
          },
          heavyFurniture: {
            americanFridge: state.furnitureAmericanFridge || undefined,
            safe: state.furnitureSafe || undefined,
            billiard: state.furnitureBilliard || undefined,
            aquarium: state.furnitureAquarium || undefined,
            over25kg: state.furnitureOver25kg || undefined,
          },
          notes: state.specificNotes || undefined,
        };

        const payload = {
          surfaceM2: surface,
          estimatedVolume: activePricing.volumeM3,
          density: mapDensity(state.density),
          formule: state.formule,
          estimatedPriceMin: activePricing.prixMin,
          estimatedPriceAvg: Math.round((activePricing.prixMin + activePricing.prixMax) / 2),
          estimatedPriceMax: activePricing.prixMax,
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

        // Email de confirmation (évite de mentir sur l'écran final)
        try {
          const idForConfirmation = (await ensureBackofficeLeadId()) ?? effectiveLeadId;
          await requestBackofficeConfirmation(idForConfirmation);
          setConfirmationRequested(true);
        } catch (confirmErr) {
          console.warn("Backoffice confirmation request failed:", confirmErr);
          setConfirmationRequested(false);
        }
      }

      trackStepChange(3, 4, "RECAP", "THANK_YOU", "forward");
      trackCompletion();
      setShowValidationStep3(false);
      goToStep(4);
    } catch (err: any) {
      console.error("Error finalizing lead:", err);
      trackError("API_ERROR", err.message || "Failed to finalize lead", 3, "RECAP");
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
              onFirstNameChange={(value) => updateField("firstName", value)}
              onEmailChange={(value) => updateField("email", value)}
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
              originFloor={state.originFloor}
              originElevator={state.originElevator}
              originAccess={state.originAccess}
              destinationPostalCode={state.destinationPostalCode}
              destinationCity={state.destinationCity}
              destinationAddress={state.destinationAddress}
              destinationLat={state.destinationLat}
              destinationLon={state.destinationLon}
              destinationHousingType={state.destinationHousingType}
              destinationFloor={state.destinationFloor}
              destinationElevator={state.destinationElevator}
              destinationAccess={state.destinationAccess}
              destinationUnknown={state.destinationUnknown}
              movingDate={state.movingDate}
              dateFlexible={state.dateFlexible}
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
              onFieldChange={(field, value) => updateField(field as any, value)}
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
                trackStepChange(
                  state.currentStep,
                  prevStep,
                  stepMap[state.currentStep as 1 | 2 | 3 | 4],
                  stepMap[prevStep],
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
