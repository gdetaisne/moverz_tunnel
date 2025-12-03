'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createLead, updateLead, uploadLeadPhotos } from "@/lib/api/client";
import {
  calculatePricing,
  type DensityType,
  type FormuleType,
  type HousingType,
} from "@/lib/pricing/calculate";

const STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Projet" },
  { id: 3, label: "Volume & formules" },
  { id: 4, label: "Photos & inventaire" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const HOUSING_SURFACE_DEFAULTS: Record<HousingType, string> = {
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

const HOUSING_LABELS: Record<HousingType, string> = {
  studio: "Studio",
  t1: "T1",
  t2: "T2",
  t3: "T3",
  t4: "T4",
  t5: "T5+",
  house: "Maison plain-pied",
  house_1floor: "Maison 1 étage",
  house_2floors: "Maison 2 étages",
  house_3floors: "Maison 3+ étages",
};

const COMFORT_FORMULAS: FormuleType[] = ["ECONOMIQUE", "STANDARD", "PREMIUM"];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  originPostalCode: string;
  originCity: string;
  originAddress: string;
  originHousingType: HousingType;
  destinationPostalCode: string;
  destinationCity: string;
  destinationAddress: string;
  movingDate: string;
  movingDateEnd: string;
  dateFlexible: boolean;
  housingType: HousingType;
  surfaceM2: string;
  originFloor: string;
  originElevator: string;
  originFurnitureLift: "unknown" | "no" | "yes";
  originCarryDistance:
    | "0-10"
    | "10-20"
    | "20-30"
    | "30-40"
    | "40-50"
    | "50-60"
    | "60-70"
    | "70-80"
    | "80-90"
    | "90-100";
  originParkingAuth: boolean;
  destinationHousingType: HousingType;
  destinationFloor: string;
  destinationElevator: string;
  destinationFurnitureLift: "unknown" | "no" | "yes";
  destinationCarryDistance:
    | "0-10"
    | "10-20"
    | "20-30"
    | "30-40"
    | "40-50"
    | "50-60"
    | "60-70"
    | "70-80"
    | "80-90"
    | "90-100";
  destinationParkingAuth: boolean;
  destinationUnknown: boolean;
  density: DensityType;
  formule: FormuleType;
  serviceMonteMeuble: boolean;
  servicePiano: "none" | "droit" | "quart";
  serviceDebarras: boolean;
  optionStorage: boolean;
  optionCleaning: boolean;
  optionPackingMaterials: boolean;
  optionDismantlingFull: boolean;
  optionDifficultAccess: boolean;
  notes: string;
}

type UploadStatus = "pending" | "uploading" | "uploaded" | "error";

interface LocalUploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
}

const INITIAL_FORM_STATE: FormState = {
  firstName: "Guillaume",
  lastName: "Test",
  email: "test@moverz.dev",
  phone: "0612345678",
  originPostalCode: "33000",
  originCity: "Bordeaux",
  originAddress: "10 rue de la Paix, 3e étage",
  originHousingType: "t3",
  destinationPostalCode: "75001",
  destinationCity: "Paris",
  destinationAddress: "20 avenue des Champs, 2e étage",
  movingDate: new Date().toISOString().slice(0, 10),
  movingDateEnd: new Date().toISOString().slice(0, 10),
  dateFlexible: true,
  housingType: "t3",
  surfaceM2: "65",
  originFloor: "3",
  originElevator: "none",
  originFurnitureLift: "unknown",
  originCarryDistance: "0-10",
  originParkingAuth: false,
  destinationHousingType: "t3",
  destinationFloor: "2",
  destinationElevator: "medium",
  destinationFurnitureLift: "unknown",
  destinationCarryDistance: "0-10",
  destinationParkingAuth: false,
  destinationUnknown: false,
  density: "normal",
  formule: "STANDARD",
  serviceMonteMeuble: false,
  servicePiano: "none",
  serviceDebarras: false,
  optionStorage: false,
  optionCleaning: false,
  optionPackingMaterials: false,
  optionDismantlingFull: false,
  optionDifficultAccess: false,
  notes: "Test local – veuillez ignorer ce dossier.",
};

function estimateDistanceKm(originPostalCode: string, destinationPostalCode: string) {
  if (!originPostalCode || !destinationPostalCode) return 50;
  if (originPostalCode === destinationPostalCode) return 10;
  const o = parseInt(originPostalCode.slice(0, 2), 10);
  const d = parseInt(destinationPostalCode.slice(0, 2), 10);
  if (Number.isNaN(o) || Number.isNaN(d)) return 50;
  const diff = Math.abs(o - d);
  return Math.min(800, 30 + diff * 70); // heuristique simple, bornée
}

function formatPrice(price: number | null | undefined) {
  if (price == null || Number.isNaN(price)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function DevisGratuitsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const src = searchParams.get("src") ?? undefined;

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [linkingToken, setLinkingToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localUploadFiles, setLocalUploadFiles] = useState<LocalUploadFile[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isOriginOpen, setIsOriginOpen] = useState(true);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);

  const distanceKm = useMemo(
    () => estimateDistanceKm(form.originPostalCode, form.destinationPostalCode),
    [form.originPostalCode, form.destinationPostalCode]
  );

  const pricingByFormule = useMemo(() => {
    const surface = Number(form.surfaceM2.replace(",", "."));
    if (!surface || !Number.isFinite(surface)) return null;

    const baseInput = {
      surfaceM2: surface,
      housingType: form.housingType,
      density: form.density,
      distanceKm,
      originFloor: parseInt(form.originFloor || "0", 10) || 0,
      originElevator:
        form.originElevator === "none"
          ? ("no" as const)
          : form.originElevator === "small"
          ? ("partial" as const)
          : ("yes" as const),
      destinationFloor: parseInt(form.destinationFloor || "0", 10) || 0,
      destinationElevator:
        form.destinationElevator === "none"
          ? ("no" as const)
          : form.destinationElevator === "small"
          ? ("partial" as const)
          : ("yes" as const),
      services: {
        monteMeuble: form.serviceMonteMeuble,
        piano:
          form.servicePiano === "none"
            ? null
            : form.servicePiano === "droit"
            ? ("droit" as const)
            : ("quart" as const),
        debarras: form.serviceDebarras,
      },
    };

    const formules: FormuleType[] = ["ECONOMIQUE", "STANDARD", "PREMIUM"];
    return formules.reduce<Record<FormuleType, ReturnType<typeof calculatePricing>>>(
      (acc, formule) => {
        acc[formule] = calculatePricing({ ...baseInput, formule });
        return acc;
      },
      {} as any
    );
  }, [
    form.surfaceM2,
    form.housingType,
    form.density,
    form.originFloor,
    form.originElevator,
    form.destinationFloor,
    form.destinationElevator,
    distanceKm,
  ]);

  const activePricing = useMemo(
    () => (pricingByFormule ? pricingByFormule[form.formule] : null),
    [pricingByFormule, form.formule]
  );

  const comfortScrollRef = useRef<HTMLDivElement | null>(null);

  // Restauration session (évite toute perte de données en cas de refresh / fermeture onglet)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("moverz_tunnel_form_state");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        form?: Partial<FormState>;
        currentStep?: StepId;
        leadId?: string | null;
      };
      if (!parsed || typeof parsed !== "object" || !parsed.form) return;

      setForm((prev) => ({ ...prev, ...parsed.form }));
      if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 4) {
        setCurrentStep(parsed.currentStep);
      }
      if (parsed.leadId) {
        setLeadId(parsed.leadId);
      }
    } catch {
      // Si le JSON est corrompu, on ignore et on repart sur l'état par défaut
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("moverz_tunnel_form_state");
      }
    }
    // une seule fois au mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde automatique (sans perte silencieuse de données)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({
      form,
      currentStep,
      leadId,
    });
    window.localStorage.setItem("moverz_tunnel_form_state", payload);
  }, [form, currentStep, leadId]);

  // Centrer la formule active dans le swiper mobile (Standard par défaut)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = comfortScrollRef.current;
    if (!container) return;
    if (window.innerWidth >= 640) return; // desktop: pas de scroll horizontal

    const index = COMFORT_FORMULAS.indexOf(form.formule);
    if (index === -1) return;

    const cardWidth = container.clientWidth * 0.8; // min-w-[78%] ~ 80%
    const gap = 12; // approx gap-3
    const target =
      Math.max(
        0,
        index * (cardWidth + gap) - (container.clientWidth - cardWidth) / 2
      ) || 0;

    container.scrollTo({
      left: target,
      behavior: "smooth",
    });
  }, [form.formule]);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  const deepLinkWhatsapp = useMemo(() => {
    if (!whatsappNumber || !linkingToken) return null;
    const message = `Bonjour, je veux compléter mon inventaire avec des photos. Mon code dossier est : ${linkingToken}`;
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${whatsappNumber}?text=${encoded}`;
  }, [whatsappNumber, linkingToken]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next: FormState = { ...prev, [key]: value };

      // Garder housingType cohérent avec le logement de départ
      if (key === "originHousingType") {
        const housing = value as HousingType;
        next.housingType = housing;
        const suggestedSurface = HOUSING_SURFACE_DEFAULTS[housing];
        // Si on était encore sur la valeur par défaut précédente, on met à jour
        if (!prev.surfaceM2 || prev.surfaceM2 === HOUSING_SURFACE_DEFAULTS[prev.housingType]) {
          next.surfaceM2 = suggestedSurface;
        }
      }

      return next;
    });
  };

  const addLocalFiles = (files: FileList | File[]) => {
    const array = Array.from(files);
    if (array.length === 0) return;
    setLocalUploadFiles((prev) => {
      const existingKeys = new Set(
        prev.map((f) => `${f.file.name}-${f.file.size}-${f.file.type}`)
      );
      const next: LocalUploadFile[] = [...prev];
      for (const file of array) {
        const key = `${file.name}-${file.size}-${file.type}`;
        if (existingKeys.has(key)) continue;
        next.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          file,
          status: "pending",
        });
      }
      return next;
    });
  };

  const resetUploads = () => {
    setLocalUploadFiles([]);
    setIsUploadingPhotos(false);
  };

  const isOriginComplete =
    !!form.originPostalCode &&
    !!form.originCity &&
    !!form.originHousingType &&
    !!form.originCarryDistance;

  const isDestinationComplete =
    !!form.destinationPostalCode &&
    !!form.destinationCity &&
    !!form.destinationHousingType &&
    !!form.destinationCarryDistance;

  const originSummary = [
    [form.originPostalCode, form.originCity].filter(Boolean).join(" "),
    HOUSING_LABELS[form.originHousingType],
  ]
    .filter(Boolean)
    .join(" · ");

  const destinationSummary = [
    [form.destinationPostalCode, form.destinationCity].filter(Boolean).join(" "),
    HOUSING_LABELS[form.destinationHousingType],
  ]
    .filter(Boolean)
    .join(" · ");

  const handleSubmitStep1 = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedFirstName = form.firstName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedFirstName) {
      setError("Merci de renseigner un prénom.");
      return;
    }
    if (
      !trimmedEmail ||
      !trimmedEmail.includes("@") ||
      !trimmedEmail.includes(".")
    ) {
      setError("Merci de renseigner une adresse email valide.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        primaryChannel: "web" as const,
        firstName: trimmedFirstName,
        lastName: form.lastName.trim() || null,
        email: trimmedEmail,
        phone: form.phone.trim() || null,
        source: src ?? null,
      };

      const { id } = await createLead(payload);
      setLeadId(id);
      setCurrentStep(2);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors de la création de votre demande.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStep3 = async (e: FormEvent) => {
    e.preventDefault();
    if (!leadId) return;
    setError(null);

    const surface = Number(form.surfaceM2.replace(",", "."));
    const pricing =
      pricingByFormule && pricingByFormule[form.formule]
        ? pricingByFormule[form.formule]
        : null;

    const extras: string[] = [];
    if (form.serviceMonteMeuble) extras.push("Monte‑meuble à prévoir");
    if (form.servicePiano === "droit") extras.push("Piano droit");
    if (form.servicePiano === "quart") extras.push("Piano quart de queue");
    if (form.serviceDebarras) extras.push("Besoin de débarras");
    if (form.optionPackingMaterials)
      extras.push("Cartons et protections fournis par Moverz");
    if (form.optionDismantlingFull)
      extras.push("Beaucoup de meubles à démonter / remonter");
    if (form.optionStorage) extras.push("Stockage temporaire / garde‑meuble");
    if (form.optionCleaning) extras.push("Nettoyage de fin de déménagement");
    if (form.optionDifficultAccess)
      extras.push("Accès camion très contraint (rue étroite / centre‑ville)");

    const extraText =
      extras.length > 0 ? `Options : ${extras.join(", ")}` : "";

    try {
      setIsSubmitting(true);
      await updateLead(leadId, {
        formCompletionStatus: "complete",
        originPostalCode: form.originPostalCode || null,
        originCity: form.originCity || null,
        originAddress: form.originAddress || null,
        destinationPostalCode: form.destinationPostalCode || null,
        destinationCity: form.destinationCity || null,
        destinationAddress: form.destinationAddress || null,
        movingDate: form.movingDate || null,
        details:
          [form.notes, extraText].filter((part) => part && part.length > 0).join("\n\n") ||
          null,
        housingType: form.housingType,
        surfaceM2: Number.isFinite(surface) && surface > 0 ? surface : null,
        density: form.density,
        formule: form.formule,
        volumeM3: pricing ? pricing.volumeM3 : null,
        distanceKm: pricing ? pricing.distanceKm : distanceKm,
        priceMin: pricing ? pricing.prixMin : null,
        priceMax: pricing ? pricing.prixMax : null,
      });
      setCurrentStep(4);
      // token sera généré à la demande côté écran final
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors de la validation de votre demande.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* En-tête tunnel – uniquement sur l'étape 1 pour alléger les suivantes */}
      {currentStep === 1 && (
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold leading-snug text-slate-50 sm:text-3xl">
            Demande de devis déménagement
          </h1>
          <p className="max-w-prose text-sm text-slate-300 sm:text-base">
            Obtenez plusieurs devis personnalisés de déménageurs vérifiés en
            quelques minutes, sur mobile.
          </p>
        </header>
      )}

      {/* Stepper simple, mobile first */}
      <nav
        aria-label="Étapes du tunnel"
        className="rounded-2xl bg-slate-900/60 p-3 shadow-sm ring-1 ring-slate-800"
      >
        {/* Mobile : barre de progression + libellé courant */}
        <div className="space-y-2 sm:hidden">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-slate-300">
              Étape{" "}
              <span className="font-semibold text-slate-50">
                {currentStep}
              </span>{" "}
              sur {STEPS.length}
            </p>
            <p className="truncate text-xs font-semibold text-sky-300">
              {STEPS.find((s) => s.id === currentStep)?.label}
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop : timeline complète */}
        <div className="hidden items-center justify-between gap-4 sm:flex">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isLast = index === STEPS.length - 1;

            return (
              <div
                key={step.id}
                className="flex flex-1 items-center gap-3 last:flex-none"
              >
                <div className="flex flex-col items-center gap-1 text-center">
                  <div
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all",
                      isActive
                        ? "border-sky-400 bg-sky-400 text-slate-950 shadow-[0_0_0_4px_rgba(56,189,248,0.25)]"
                        : isCompleted
                        ? "border-emerald-400 bg-emerald-400 text-slate-950"
                        : "border-slate-600/70 bg-slate-900 text-slate-300",
                    ].join(" ")}
                  >
                    {isCompleted ? "✓" : step.id}
                  </div>
                  <span
                    className={[
                      "text-[11px] font-medium",
                      isActive
                        ? "text-sky-300"
                        : isCompleted
                        ? "text-slate-200"
                        : "text-slate-400",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div className="h-px flex-1 rounded-full bg-slate-700/70" />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Étape 1 – Contact */}
      {currentStep === 1 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <form className="space-y-5" onSubmit={handleSubmitStep1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-100">
                  Prénom
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Jean"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-100">
                  Nom (optionnel)
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Dupont"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-100">
                Email de contact
              </label>
              <p className="text-xs text-slate-400">
                Nous l’utilisons uniquement pour suivre votre dossier et vous
                envoyer les devis.
              </p>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="vous@email.fr"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-100">
                Téléphone (optionnel)
              </label>
              <p className="text-xs text-slate-400">
                Utile si nous devons clarifier quelques détails rapidement.
              </p>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="06 12 34 56 78"
                autoComplete="tel"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Création en cours…" : "Commencer ma demande"}
            </button>
          </form>
        </section>
      )}

      {/* Étape 2 – Projet (départ / arrivée sous forme d'accordéons) */}
      {currentStep === 2 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setCurrentStep(3);
            }}
          >
            {/* Bloc départ : accordéon avec résumé + statut de complétion */}
            <div className="overflow-hidden rounded-2xl bg-slate-950/40 ring-1 ring-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsOriginOpen(true);
                  setIsDestinationOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Départ
                  </p>
                  <p className="mt-1 truncate text-[11px] text-slate-400">
                    {originSummary || "Code postal, ville, type de logement…"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isOriginComplete
                        ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/60"
                        : "bg-slate-800/80 text-slate-200 ring-1 ring-slate-600/80",
                    ].join(" ")}
                  >
                    {isOriginComplete ? "✓ Validé" : "À compléter"}
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900 text-xs text-slate-200">
                    {isOriginOpen ? "−" : "+"}
                  </span>
                </div>
              </button>
              {isOriginOpen && (
                <div className="space-y-3 border-t border-slate-800 bg-slate-950/70 p-3">
                  <div className="grid gap-3 sm:grid-cols-[110px,minmax(0,1fr)]">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Code postal
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        value={form.originPostalCode}
                        onChange={(e) =>
                          updateField(
                            "originPostalCode",
                            e.target.value.replace(/\D/g, "").slice(0, 5)
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        placeholder="33000"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={form.originCity}
                        onChange={(e) =>
                          updateField("originCity", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        placeholder="Bordeaux"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-200">
                      Adresse complète (optionnel)
                    </label>
                    <input
                      type="text"
                      value={form.originAddress}
                      onChange={(e) =>
                        updateField("originAddress", e.target.value)
                      }
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      placeholder="N°, rue, bâtiment, étage…"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Type de logement
                      </label>
                      <select
                        value={form.originHousingType}
                        onChange={(e) =>
                          updateField(
                            "originHousingType",
                            e.target.value as HousingType
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="studio">Studio</option>
                        <option value="t1">T1</option>
                        <option value="t2">T2</option>
                        <option value="t3">T3</option>
                        <option value="t4">T4</option>
                        <option value="t5">T5</option>
                        <option value="house">Maison plain-pied</option>
                        <option value="house_1floor">Maison +1 étage</option>
                        <option value="house_2floors">Maison +2 étages</option>
                        <option value="house_3floors">
                          Maison 3 étages ou +
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Distance de portage (m)
                      </label>
                      <select
                        value={form.originCarryDistance}
                        onChange={(e) =>
                          updateField(
                            "originCarryDistance",
                            e.target.value as FormState["originCarryDistance"]
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="0-10">0–10 m</option>
                        <option value="10-20">10–20 m</option>
                        <option value="20-30">20–30 m</option>
                        <option value="30-40">30–40 m</option>
                        <option value="40-50">40–50 m</option>
                        <option value="50-60">50–60 m</option>
                        <option value="60-70">60–70 m</option>
                        <option value="70-80">70–80 m</option>
                        <option value="80-90">80–90 m</option>
                        <option value="90-100">90–100 m</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bloc arrivée : accordéon avec résumé + statut de complétion */}
            <div className="overflow-hidden rounded-2xl bg-slate-950/40 ring-1 ring-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDestinationOpen(true);
                  setIsOriginOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Arrivée
                  </p>
                  <p className="mt-1 truncate text-[11px] text-slate-400">
                    {destinationSummary || "Code postal, ville, type de logement…"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isDestinationComplete
                        ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/60"
                        : "bg-slate-800/80 text-slate-200 ring-1 ring-slate-600/80",
                    ].join(" ")}
                  >
                    {isDestinationComplete ? "✓ Validé" : "À compléter"}
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900 text-xs text-slate-200">
                    {isDestinationOpen ? "−" : "+"}
                  </span>
                </div>
              </button>
              {isDestinationOpen && (
                <div className="space-y-3 border-t border-slate-800 bg-slate-950/70 p-3">
                  <div className="grid gap-3 sm:grid-cols-[110px,minmax(0,1fr)]">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Code postal
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        value={form.destinationPostalCode}
                        onChange={(e) =>
                          updateField(
                            "destinationPostalCode",
                            e.target.value.replace(/\D/g, "").slice(0, 5)
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        placeholder="75001"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={form.destinationCity}
                        onChange={(e) =>
                          updateField("destinationCity", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        placeholder="Paris"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-200">
                      Adresse complète (optionnel)
                    </label>
                    <input
                      type="text"
                      value={form.destinationAddress}
                      onChange={(e) =>
                        updateField("destinationAddress", e.target.value)
                      }
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      placeholder="N°, rue, bâtiment, étage…"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Type de logement
                      </label>
                      <select
                        value={form.destinationHousingType}
                        onChange={(e) =>
                          updateField(
                            "destinationHousingType",
                            e.target.value as HousingType
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="studio">Studio</option>
                        <option value="t1">T1</option>
                        <option value="t2">T2</option>
                        <option value="t3">T3</option>
                        <option value="t4">T4</option>
                        <option value="t5">T5</option>
                        <option value="house">Maison plain-pied</option>
                        <option value="house_1floor">Maison +1 étage</option>
                        <option value="house_2floors">Maison +2 étages</option>
                        <option value="house_3floors">
                          Maison 3 étages ou +
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Distance de portage (m)
                      </label>
                      <select
                        value={form.destinationCarryDistance}
                        onChange={(e) =>
                          updateField(
                            "destinationCarryDistance",
                            e.target.value as FormState["destinationCarryDistance"]
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="0-10">0–10 m</option>
                        <option value="10-20">10–20 m</option>
                        <option value="20-30">20–30 m</option>
                        <option value="30-40">30–40 m</option>
                        <option value="40-50">40–50 m</option>
                        <option value="50-60">50–60 m</option>
                        <option value="60-70">60–70 m</option>
                        <option value="70-80">70–80 m</option>
                        <option value="80-90">80–90 m</option>
                        <option value="90-100">90–100 m</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr),minmax(0,1.1fr)]">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-100">
                  Date souhaitée
                </label>
                <input
                  type="date"
                  value={form.movingDate}
                  onChange={(e) => updateField("movingDate", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-100">
                  Fin de période (optionnel)
                </label>
                <input
                  type="date"
                  value={form.movingDateEnd}
                  onChange={(e) => updateField("movingDateEnd", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.dateFlexible}
                onChange={(e) => updateField("dateFlexible", e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-500/40"
              />
              <span>Je peux être flexible de quelques jours autour de cette date</span>
            </label>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-100">
                Détails utiles (optionnel)
              </label>
              <p className="text-xs text-slate-400">
                Étages, ascenseur, monte‑meuble, volume approximatif… ce qui
                vous semble important.
              </p>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="Ex: T3 au 3e sans ascenseur, monte‑meuble possible côté cour…"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-400"
              >
                Retour
              </button>
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition hover:bg-sky-300"
              >
                Étape suivante
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Étape 3 – Volume & formules */}
      {currentStep === 3 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <form className="space-y-5" onSubmit={handleSubmitStep3}>
            <h2 className="text-lg font-semibold text-slate-50">
              Volume estimé & formules
            </h2>

            {/* Bloc estimation volume + formules */}
            <div className="space-y-4 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Estimation rapide
              </p>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr),minmax(0,1.3fr)]">
                {/* Surface + densité (type de logement affiché en lecture seule depuis l'étape Projet) */}
                <div className="space-y-3">
                  <div className="space-y-1 text-xs text-slate-300">
                    <p className="font-medium text-slate-200">
                      Type de logement (départ)
                    </p>
                    <p className="text-[11px]">
                      {HOUSING_LABELS[form.originHousingType]} —{" "}
                      {HOUSING_SURFACE_DEFAULTS[form.originHousingType]} m²
                      estimés (ajustables ci‑dessous).
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-200">
                        Surface approximative (m²)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={form.surfaceM2}
                        onChange={(e) => updateField("surfaceM2", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="block text-xs font-medium text-slate-200">
                        Quantité de meubles et affaires
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Cela nous aide à estimer le volume à déménager.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => updateField("density", "light")}
                          className={[
                            "flex w-full flex-col items-center justify-between rounded-2xl border px-4 py-4 text-center text-[11px] transition",
                            form.density === "light"
                              ? "border-emerald-400 bg-emerald-500/8 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                              : "border-slate-700/80 bg-slate-950/60 hover:border-emerald-300/70",
                          ].join(" ")}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-300/60 bg-emerald-500/10">
                            <div className="grid grid-cols-3 gap-[1px]">
                              {[
                                true,
                                false,
                                false,
                                false,
                                true,
                                false,
                                false,
                                false,
                                true,
                              ].map((filled, idx) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <span
                                  key={idx}
                                  className={[
                                    "h-2 w-2 rounded-[2px]",
                                    filled
                                      ? "bg-emerald-300"
                                      : "bg-emerald-900/30",
                                  ].join(" ")}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-semibold text-slate-50">
                              Minimaliste
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Peu de meubles · cartons limités
                            </div>
                          </div>
                          <div className="mt-3 inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                            -10% volume
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateField("density", "normal")}
                          className={[
                            "flex w-full flex-col items-center justify-between rounded-2xl border px-4 py-4 text-center text-[11px] transition",
                            form.density === "normal"
                              ? "border-sky-400 bg-sky-500/8 shadow-[0_0_0_1px_rgba(56,189,248,0.45)]"
                              : "border-slate-700/80 bg-slate-950/60 hover:border-sky-300/70",
                          ].join(" ")}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-300/60 bg-sky-500/10">
                            <div className="grid grid-cols-3 gap-[1px]">
                              {[
                                true,
                                false,
                                true,
                                false,
                                true,
                                false,
                                true,
                                false,
                                true,
                              ].map((filled, idx) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <span
                                  key={idx}
                                  className={[
                                    "h-2 w-2 rounded-[2px]",
                                    filled ? "bg-sky-300" : "bg-sky-900/30",
                                  ].join(" ")}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-semibold text-slate-50">
                              Standard
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Meubles classiques · affaires normales
                            </div>
                          </div>
                          <div className="mt-3 inline-flex items-center rounded-full border border-sky-300/70 bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
                            Volume normal
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateField("density", "dense")}
                          className={[
                            "flex w-full flex-col items-center justify-between rounded-2xl border px-4 py-4 text-center text-[11px] transition",
                            form.density === "dense"
                              ? "border-amber-400 bg-amber-500/8 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]"
                              : "border-slate-700/80 bg-slate-950/60 hover:border-amber-300/70",
                          ].join(" ")}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300/60 bg-amber-500/10">
                            <div className="grid grid-cols-3 gap-[1px]">
                              {[
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                              ].map((filled, idx) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <span
                                  key={idx}
                                  className={[
                                    "h-2 w-2 rounded-[2px]",
                                    filled ? "bg-amber-300" : "bg-amber-900/30",
                                  ].join(" ")}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-semibold text-slate-50">
                              Bien rempli
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Beaucoup de meubles · déco · intérieur chargé
                            </div>
                          </div>
                          <div className="mt-3 inline-flex items-center rounded-full border border-amber-300/70 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                            +10% volume
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonne droite libre pour extensions futures (prix détaillé, etc.) */}
                <div className="hidden text-xs text-slate-300 sm:block" />
              </div>

              {/* Choix niveau de confort (swipe horizontal sur mobile) */}
              <div
                ref={comfortScrollRef}
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible"
              >
                {COMFORT_FORMULAS.map(
                  (formule) => {
                    const isActive = form.formule === formule;
                    const pricing =
                      pricingByFormule && pricingByFormule[formule]
                        ? pricingByFormule[formule]
                        : null;
                    const title =
                      formule === "ECONOMIQUE"
                        ? "Je privilégie le budget"
                        : formule === "STANDARD"
                        ? "Équilibre budget / confort"
                        : "Je veux être 100 % tranquille";
                    const label =
                      formule === "ECONOMIQUE"
                        ? "ÉCO"
                        : formule === "STANDARD"
                        ? "STANDARD"
                        : "PREMIUM";
                    const bullets =
                      formule === "ECONOMIQUE"
                        ? [
                            "Vous emballez vos cartons",
                            "Nous gérons portage + transport",
                            "Démontage limité (lit principal)",
                          ]
                        : formule === "STANDARD"
                        ? [
                            "Protection du mobilier et portage complet",
                            "Démontage/remontage des meubles principaux",
                            "Bon compromis budget / confort",
                          ]
                        : [
                            "Emballage renforcé (fragiles, penderies…)",
                            "Démontage/remontage étendu, repositionnement",
                            "Planning plus souple et équipe dédiée",
                          ];
                    return (
                      <button
                        key={formule}
                        type="button"
                        onClick={() => updateField("formule", formule)}
                        className={[
                          "flex min-w-[78%] flex-col gap-2 rounded-2xl border p-3 text-left text-xs transition snap-start sm:min-w-0",
                          isActive
                            ? "border-sky-400 bg-sky-500/15 shadow-sm shadow-sky-500/30"
                            : "border-slate-700 bg-slate-950/60 hover:border-slate-500",
                        ].join(" ")}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                          {label}
                        </span>
                        <span className="text-[12px] font-medium text-slate-50">
                          {title}
                        </span>
                        <span className="text-[12px] font-semibold text-slate-100">
                          {pricing
                            ? `${formatPrice(pricing.prixMin)} – ${formatPrice(
                                pricing.prixMax
                              )}`
                            : "Calcul…"}
                        </span>
                        <ul className="mt-1 space-y-1 text-[11px] text-slate-400">
                          {bullets.map((b) => (
                            <li key={b} className="flex gap-1">
                              <span className="mt-[2px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Autres besoins éventuels (tous les services optionnels regroupés) */}
              <div className="mt-4 space-y-2 rounded-2xl bg-slate-950/60 p-3 text-[11px] text-slate-300">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Autres besoins éventuels
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "serviceMonteMeuble",
                        !form.serviceMonteMeuble
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.serviceMonteMeuble
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Monte‑meuble à prévoir
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("serviceDebarras", !form.serviceDebarras)
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.serviceDebarras
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Besoin de débarras
                  </button>
                  {[
                    ["none", "Pas de piano"],
                    ["droit", "Piano droit"],
                    ["quart", "Piano quart de queue"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateField(
                          "servicePiano",
                          value as FormState["servicePiano"]
                        )
                      }
                      className={[
                        "rounded-full border px-3 py-1 text-left",
                        form.servicePiano === value
                          ? "border-sky-400 bg-sky-500/20 text-sky-100"
                          : "border-slate-700 bg-slate-900/60 text-slate-200",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "optionPackingMaterials",
                        !form.optionPackingMaterials
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionPackingMaterials
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Cartons / protections fournis
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "optionDismantlingFull",
                        !form.optionDismantlingFull
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionDismantlingFull
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Beaucoup de meubles à démonter / remonter
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("optionStorage", !form.optionStorage)
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionStorage
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Besoin de stockage temporaire / garde‑meuble
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("optionCleaning", !form.optionCleaning)
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionCleaning
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Nettoyage de fin de déménagement
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "optionDifficultAccess",
                        !form.optionDifficultAccess
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-left",
                      form.optionDifficultAccess
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200",
                    ].join(" ")}
                  >
                    Accès très contraint (rue étroite, centre‑ville difficile
                    pour le camion)
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-400"
              >
                Modifier
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !leadId}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Validation…" : "Valider ma demande"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Étape 4 – Photos & inventaire */}
      {currentStep === 4 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-50">
                Pourquoi ajouter des photos ?
              </h2>
              <p className="text-xs text-slate-300">
                Cela change vraiment tout pour votre déménagement :
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>
                  <span className="font-semibold text-slate-50">
                    Un volume plus précis → un prix plus juste.
                  </span>
                  <br />
                  <span className="text-slate-400">
                    Nos estimations deviennent ultra‑fiables : moins de marges
                    d’erreur, moins de suppléments.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-slate-50">
                    Un inventaire automatique, prêt pour le déménageur.
                  </span>
                  <br />
                  <span className="text-slate-400">
                    Pas besoin de tout noter pièce par pièce : on le génère pour
                    vous.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-slate-50">
                    Votre déclaration de valeur remplie automatiquement.
                  </span>
                  <br />
                  <span className="text-slate-400">
                    C’est obligatoire pour être couvert en cas de casse — on la
                    prépare pour vous.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-slate-50">
                    Moins d’échanges, plus rapide, zéro stress.
                  </span>
                  <br />
                  <span className="text-slate-400">
                    Le déménageur comprend immédiatement votre besoin, sans
                    visite ni appels.
                  </span>
                </li>
              </ul>
              <p className="text-[11px] font-medium text-emerald-300">
                → 4 photos par pièce suffisent (vue générale + deux angles +
                détails si besoin).
              </p>
            </div>

            {/* Zone d'upload */}
            <div className="space-y-3">
              <div
                className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-600/80 bg-slate-950/70 px-4 py-8 text-center transition hover:border-sky-400/70 hover:bg-slate-900/80"
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer?.files?.length) {
                    addLocalFiles(e.dataTransfer.files);
                  }
                }}
              >
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      addLocalFiles(e.target.files);
                    }
                  }}
                />
                <p className="text-sm font-medium text-slate-100">
                  Glissez vos photos ici ou cliquez pour sélectionner des
                  fichiers.
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Formats acceptés : JPG, PNG, WEBP, HEIC, HEIF, MP4, MOV.
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Idéal : 4 photos par pièce (vue générale, deux angles, détails).
                </p>
              </div>

              {localUploadFiles.length > 0 && (
                <div className="space-y-2 rounded-2xl bg-slate-950/70 p-3 text-xs text-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Fichiers sélectionnés
                  </p>
                  <ul className="space-y-1">
                    {localUploadFiles.map((item) => {
                      const isImage = item.file.type.startsWith("image/");
                      const isVideo = item.file.type.startsWith("video/");
                      const sizeMb = item.file.size / (1024 * 1024);
                      let statusLabel = "En attente";
                      if (item.status === "uploading") statusLabel = "En cours…";
                      if (item.status === "uploaded") statusLabel = "Envoyé";
                      if (item.status === "error") statusLabel = "Erreur";

                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/70 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-[11px]">
                              {isImage ? "IMG" : isVideo ? "VID" : "FILE"}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-medium">
                                {item.file.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {sizeMb.toFixed(1)} Mo · {statusLabel}
                                {item.error && ` – ${item.error}`}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-[11px] text-slate-400 hover:text-rose-400"
                            onClick={() =>
                              setLocalUploadFiles((prev) =>
                                prev.filter((f) => f.id !== item.id)
                              )
                            }
                            disabled={item.status === "uploading"}
                          >
                            Retirer
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={
                  !leadId ||
                  localUploadFiles.length === 0 ||
                  isUploadingPhotos
                }
                onClick={async () => {
                  if (!leadId || localUploadFiles.length === 0) return;
                  setError(null);
                  try {
                    setIsUploadingPhotos(true);
                    setLocalUploadFiles((prev) =>
                      prev.map((f) =>
                        f.status === "pending"
                          ? { ...f, status: "uploading", error: undefined }
                          : f
                      )
                    );

                    const pendingFiles = localUploadFiles
                      .filter((f) => f.status === "pending" || f.status === "uploading")
                      .map((f) => f.file);

                    const result = await uploadLeadPhotos(leadId, pendingFiles);

                    setLocalUploadFiles((prev) =>
                      prev.map((f) => {
                        const ok = result.success.find(
                          (s) => s.originalFilename === f.file.name
                        );
                        const ko = result.errors.find(
                          (e) => e.originalFilename === f.file.name
                        );
                        if (ok) {
                          return { ...f, status: "uploaded", error: undefined };
                        }
                        if (ko) {
                          return {
                            ...f,
                            status: "error",
                            error: ko.reason,
                          };
                        }
                        return f;
                      })
                    );

                    if (result.success.length > 0) {
                      await updateLead(leadId, { photosStatus: "UPLOADED" });
                      router.push("/devis-gratuits/merci");
                      resetUploads();
                    } else if (result.errors.length > 0) {
                      setError(
                        "Aucun fichier n’a pu être enregistré. Vous pouvez réessayer ou les envoyer plus tard."
                      );
                    }
                  } catch (err: unknown) {
                    const message =
                      err instanceof Error
                        ? err.message
                        : "Erreur lors de l’upload des photos.";
                    setError(message);
                  } finally {
                    setIsUploadingPhotos(false);
                  }
                }}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingPhotos ? "Envoi en cours…" : "Envoyer mes photos"}
              </button>

              <button
                type="button"
                disabled={!leadId || isUploadingPhotos}
                onClick={async () => {
                  if (!leadId) return;
                  setError(null);
                  try {
                    await updateLead(leadId, { photosStatus: "PENDING" });
                  } catch (err: unknown) {
                    console.error("Erreur mise à jour photosStatus:", err);
                    // On n'empêche pas la complétion du tunnel
                  } finally {
                    router.push("/devis-gratuits/merci");
                    resetUploads();
                  }
                }}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Je les enverrai plus tard
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function DevisGratuitsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-slate-300">Chargement…</div>}>
      <DevisGratuitsPageInner />
    </Suspense>
  );
}

