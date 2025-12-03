'use client';

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createLead, ensureLinkingToken, updateLead } from "@/lib/api/client";
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
  { id: 4, label: "Photos / WhatsApp" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  originPostalCode: string;
  originCity: string;
  originAddress: string;
  destinationPostalCode: string;
  destinationCity: string;
  destinationAddress: string;
  movingDate: string;
  housingType: HousingType;
  surfaceM2: string;
  originFloor: string;
  originElevator: string;
  destinationFloor: string;
  destinationElevator: string;
  density: DensityType;
  formule: FormuleType;
  notes: string;
}

const INITIAL_FORM_STATE: FormState = {
  firstName: "Guillaume",
  lastName: "Test",
  email: "test@moverz.dev",
  phone: "0612345678",
  originPostalCode: "33000",
  originCity: "Bordeaux",
  originAddress: "10 rue de la Paix, 3e étage",
  destinationPostalCode: "75001",
  destinationCity: "Paris",
  destinationAddress: "20 avenue des Champs, 2e étage",
  movingDate: new Date().toISOString().slice(0, 10),
  housingType: "t3",
  surfaceM2: "65",
  originFloor: "3",
  originElevator: "none",
  destinationFloor: "2",
  destinationElevator: "medium",
  density: "normal",
  formule: "STANDARD",
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
  const searchParams = useSearchParams();
  const src = searchParams.get("src") ?? undefined;

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [linkingToken, setLinkingToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        monteMeuble: false,
        piano: null,
        debarras: false,
      } as const,
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

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  const deepLinkWhatsapp = useMemo(() => {
    if (!whatsappNumber || !linkingToken) return null;
    const message = `Bonjour, je veux compléter mon inventaire avec des photos. Mon code dossier est : ${linkingToken}`;
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${whatsappNumber}?text=${encoded}`;
  }, [whatsappNumber, linkingToken]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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
        details: form.notes || null,
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
      {/* En-tête tunnel */}
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
          Moverz • Tunnel devis
        </p>
        <h1 className="text-2xl font-semibold leading-snug text-slate-50 sm:text-3xl">
          Demande de devis déménagement
        </h1>
        <p className="max-w-prose text-sm text-slate-300 sm:text-base">
          Obtenez plusieurs devis personnalisés de déménageurs vérifiés en
          quelques minutes, sur mobile.
        </p>
        {src && (
          <p className="text-xs text-slate-400">
            Source tunnel : <span className="font-mono text-slate-200">{src}</span>
          </p>
        )}
      </header>

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

      {/* Étape 2 – Projet (simplifiée pour le MVP) */}
      {currentStep === 2 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setCurrentStep(3);
            }}
          >
            {/* Bloc départ */}
            <div className="space-y-3 rounded-2xl bg-slate-950/40 p-3 ring-1 ring-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Départ
              </p>
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
                    onChange={(e) => updateField("originCity", e.target.value)}
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
                  onChange={(e) => updateField("originAddress", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="N°, rue, bâtiment, étage…"
                />
              </div>
            </div>

            {/* Bloc arrivée */}
            <div className="space-y-3 rounded-2xl bg-slate-950/40 p-3 ring-1 ring-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Arrivée
              </p>
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
            </div>

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

            {/* Logement & accès (MVP simplifié: étage + ascenseur) */}
            <div className="space-y-3 rounded-2xl bg-slate-950/40 p-3 ring-1 ring-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Logement & accès
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-200">
                    Étage départ
                  </label>
                  <select
                    value={form.originFloor}
                    onChange={(e) => updateField("originFloor", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    <option value="0">RDC</option>
                    <option value="1">1er</option>
                    <option value="2">2e</option>
                    <option value="3">3e</option>
                    <option value="4">4e</option>
                    <option value="5">5e</option>
                    <option value="6">6e+</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-200">
                    Ascenseur départ
                  </label>
                  <select
                    value={form.originElevator}
                    onChange={(e) =>
                      updateField("originElevator", e.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    <option value="none">Pas d&apos;ascenseur</option>
                    <option value="small">Petit (1–3 pers)</option>
                    <option value="medium">Moyen (4–6 pers)</option>
                    <option value="large">Grand (&gt; 6 pers)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-200">
                    Étage arrivée
                  </label>
                  <select
                    value={form.destinationFloor}
                    onChange={(e) =>
                      updateField("destinationFloor", e.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    <option value="0">RDC</option>
                    <option value="1">1er</option>
                    <option value="2">2e</option>
                    <option value="3">3e</option>
                    <option value="4">4e</option>
                    <option value="5">5e</option>
                    <option value="6">6e+</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-200">
                    Ascenseur arrivée
                  </label>
                  <select
                    value={form.destinationElevator}
                    onChange={(e) =>
                      updateField("destinationElevator", e.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    <option value="none">Pas d&apos;ascenseur</option>
                    <option value="small">Petit (1–3 pers)</option>
                    <option value="medium">Moyen (4–6 pers)</option>
                    <option value="large">Grand (&gt; 6 pers)</option>
                  </select>
                </div>
              </div>
            </div>

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

      {/* Étape 3 – Volume & formules + récap */}
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
                {/* Choix type logement + surface + densité */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-200">
                      Type de logement
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {(
                        [
                          ["studio", "Studio"],
                          ["t1", "T1"],
                          ["t2", "T2"],
                          ["t3", "T3"],
                          ["t4", "T4"],
                          ["t5", "T5"],
                          ["house", "Maison"],
                        ] as [HousingType, string][]
                      ).map(([value, label]) => {
                        const isActive = form.housingType === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              updateField("housingType", value);
                              // auto‐suggest surface si champ vide ou valeur par défaut
                              const defaults: Record<HousingType, string> = {
                                studio: "20",
                                t1: "25",
                                t2: "40",
                                t3: "60",
                                t4: "75",
                                t5: "90",
                                house: "110",
                              };
                              if (!form.surfaceM2 || form.surfaceM2 === "65") {
                                updateField("surfaceM2", defaults[value]);
                              }
                            }}
                            className={[
                              "rounded-xl border px-2.5 py-1.5 text-center",
                              isActive
                                ? "border-sky-400 bg-sky-500/20 text-sky-100"
                                : "border-slate-700 bg-slate-900/60 text-slate-200",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
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
                        Densité de mobilier
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        {(
                          [
                            ["light", "Sobre"],
                            ["normal", "Normal"],
                            ["dense", "Bien meublé"],
                          ] as [DensityType, string][]
                        ).map(([value, label]) => {
                          const isActive = form.density === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => updateField("density", value)}
                              className={[
                                "rounded-xl border px-2 py-1",
                                isActive
                                  ? "border-sky-400 bg-sky-500/20 text-sky-100"
                                  : "border-slate-700 bg-slate-900/60 text-slate-200",
                              ].join(" ")}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Résumé volume & distance */}
                <div className="space-y-2 rounded-xl bg-slate-950/80 p-3 text-xs text-slate-200">
                  <p className="font-medium text-slate-100">
                    Résumé estimation
                  </p>
                  <p>
                    <span className="text-slate-400">Trajet :</span>{" "}
                    {[form.originCity, form.destinationCity].filter(Boolean).join(" → ") ||
                      "À préciser"}
                  </p>
                  <p>
                    <span className="text-slate-400">Distance estimée :</span>{" "}
                    {Number.isFinite(distanceKm) ? `${Math.round(distanceKm)} km` : "—"}
                  </p>
                  <p>
                    <span className="text-slate-400">Formule sélectionnée :</span>{" "}
                    {form.formule === "ECONOMIQUE"
                      ? "Économique"
                      : form.formule === "STANDARD"
                      ? "Standard"
                      : "Premium"}
                  </p>
                  {pricingByFormule && pricingByFormule[form.formule] && (
                    <p>
                      <span className="text-slate-400">Fourchette estimée :</span>{" "}
                      {formatPrice(pricingByFormule[form.formule].prixMin)} –{" "}
                      {formatPrice(pricingByFormule[form.formule].prixMax)}
                    </p>
                  )}
                </div>
              </div>

              {/* Cartes formules */}
              <div className="grid gap-3 sm:grid-cols-3">
                {(["ECONOMIQUE", "STANDARD", "PREMIUM"] as FormuleType[]).map(
                  (formule) => {
                    const isActive = form.formule === formule;
                    const pricing =
                      pricingByFormule && pricingByFormule[formule]
                        ? pricingByFormule[formule]
                        : null;
                    const title =
                      formule === "ECONOMIQUE"
                        ? "Éco"
                        : formule === "STANDARD"
                        ? "Standard"
                        : "Premium";
                    const description =
                      formule === "ECONOMIQUE"
                        ? "Vous gérez les cartons, on s’occupe surtout du transport."
                        : formule === "STANDARD"
                        ? "Équilibre idéal : chargement, transport et manutention confort."
                        : "Service confort maxi, idéal si vous manquez de temps.";
                    return (
                      <button
                        key={formule}
                        type="button"
                        onClick={() => updateField("formule", formule)}
                        className={[
                          "flex flex-col gap-1 rounded-2xl border p-3 text-left text-xs transition",
                          isActive
                            ? "border-sky-400 bg-sky-500/15 shadow-sm shadow-sky-500/30"
                            : "border-slate-700 bg-slate-950/60 hover:border-slate-500",
                        ].join(" ")}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                          {title}
                        </span>
                        <span className="text-[13px] font-medium text-slate-50">
                          {pricing
                            ? `${formatPrice(pricing.prixMin)} – ${formatPrice(
                                pricing.prixMax
                              )}`
                            : "Calcul en cours…"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {description}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Récapitulatif synthétique */}
            <div className="space-y-3 text-sm text-slate-200">
              <div>
                <p className="font-medium text-slate-100">Contact</p>
                <p>
                  {form.firstName} {form.lastName}
                </p>
                <p>{form.email}</p>
                {form.phone && <p>{form.phone}</p>}
              </div>
              <div>
                <p className="font-medium text-slate-100">Déménagement</p>
                {form.originCity && (
                  <p>
                    <span className="text-slate-400">Départ :</span>{" "}
                    {[form.originPostalCode, form.originCity]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
                {form.destinationCity && (
                  <p>
                    <span className="text-slate-400">Arrivée :</span>{" "}
                    {[form.destinationPostalCode, form.destinationCity]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
                {form.originAddress && (
                  <p className="text-xs text-slate-300">
                    <span className="text-slate-500">Adresse départ :</span>{" "}
                    {form.originAddress}
                  </p>
                )}
                {form.destinationAddress && (
                  <p className="text-xs text-slate-300">
                    <span className="text-slate-500">Adresse arrivée :</span>{" "}
                    {form.destinationAddress}
                  </p>
                )}
                {form.movingDate && (
                  <p>
                    <span className="text-slate-400">Date :</span>{" "}
                    {new Date(form.movingDate).toLocaleDateString("fr-FR")}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-300">
                  <span className="text-slate-500">Accès départ :</span>{" "}
                  {form.originFloor === "0" ? "RDC" : `${form.originFloor}e`} ·{" "}
                  {form.originElevator === "none"
                    ? "sans ascenseur"
                    : form.originElevator === "small"
                    ? "petit ascenseur"
                    : form.originElevator === "medium"
                    ? "ascenseur moyen"
                    : "grand ascenseur"}
                </p>
                <p className="text-xs text-slate-300">
                  <span className="text-slate-500">Accès arrivée :</span>{" "}
                  {form.destinationFloor === "0"
                    ? "RDC"
                    : `${form.destinationFloor}e`}{" "}
                  ·{" "}
                  {form.destinationElevator === "none"
                    ? "sans ascenseur"
                    : form.destinationElevator === "small"
                    ? "petit ascenseur"
                    : form.destinationElevator === "medium"
                    ? "ascenseur moyen"
                    : "grand ascenseur"}
                </p>
                {form.notes && (
                  <p className="mt-1 text-slate-300">
                    <span className="text-slate-400">Détails :</span>{" "}
                    {form.notes}
                  </p>
                )}
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

      {/* Étape 4 – Photos / WhatsApp */}
      {currentStep === 4 && (
        <section className="flex-1 rounded-2xl bg-slate-900/70 p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-50">
              Merci, ton dossier est créé ✅
            </h2>
            <p className="text-sm text-slate-200">
              Tu peux maintenant nous envoyer des photos de ton logement pour
              affiner l&apos;inventaire, ou le faire plus tard avec ton code
              dossier.
            </p>

            <button
              type="button"
              onClick={async () => {
                if (!leadId) return;
                setError(null);
                try {
                  setIsSubmitting(true);
                  const res = await ensureLinkingToken(leadId);
                  setLinkingToken(res.linkingToken);
                } catch (err: unknown) {
                  const message =
                    err instanceof Error
                      ? err.message
                      : "Erreur lors de la génération du code dossier.";
                  setError(message);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-sky-400"
            >
              Générer / afficher mon code dossier
            </button>

            {linkingToken && (
              <div className="space-y-3 rounded-2xl bg-slate-950/60 p-4 ring-1 ring-slate-800">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
                  Code dossier
                </p>
                <p className="text-xl font-mono font-semibold text-slate-50">
                  {linkingToken}
                </p>
                <p className="text-xs text-slate-400">
                  Garde-le précieusement : il permet de lier ta conversation
                  WhatsApp à ton dossier.
                </p>
                {deepLinkWhatsapp ? (
                  <a
                    href={deepLinkWhatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 transition hover:bg-emerald-300"
                  >
                    Envoyer mes photos via WhatsApp
                  </a>
                ) : (
                  <p className="text-xs text-amber-400">
                    Numéro WhatsApp non configuré côté tunnel. Contacte l’équipe
                    si tu veux tester l’option WhatsApp en local.
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}
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

