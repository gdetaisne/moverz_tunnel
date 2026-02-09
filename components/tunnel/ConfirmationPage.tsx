"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileText, Mail } from "lucide-react";
import { requestBackofficeConfirmation, updateBackofficeLead } from "@/lib/api/client";

interface ConfirmationPageProps {
  firstName: string;
  email: string;
  linkingCode?: string;
  // Conservé pour compat (ancien écran) — plus utilisé
  confirmationRequested?: boolean;
  leadId?: string;
  estimateMinEur?: number | null;
  estimateMaxEur?: number | null;
  estimateIsIndicative?: boolean;
  recap?: {
    // Contact
    lastName?: string | null;
    phone?: string | null;

    // Départ
    originAddress?: string | null;
    originCity?: string | null;
    originPostalCode?: string | null;
    originHousingType?: string | null;
    originFloor?: string | null;
    originElevator?: string | null;
    originFurnitureLift?: string | null;
    originCarryDistance?: string | null;
    originParkingAuth?: boolean | null;
    originTightAccess?: boolean | null;

    // Arrivée
    destinationUnknown?: boolean | null;
    destinationAddress?: string | null;
    destinationCity?: string | null;
    destinationPostalCode?: string | null;
    destinationHousingType?: string | null;
    destinationFloor?: string | null;
    destinationElevator?: string | null;
    destinationFurnitureLift?: string | null;
    destinationCarryDistance?: string | null;
    destinationParkingAuth?: boolean | null;
    destinationTightAccess?: boolean | null;

    // Date
    movingDate?: string | null;
    movingDateEnd?: string | null;
    dateFlexible?: boolean | null;

    // Volume / formule
    surfaceM2?: string | null;
    density?: string | null;
    formule?: string | null;

    // Services / besoins
    serviceFurnitureStorage?: boolean | null;
    serviceCleaning?: boolean | null;
    serviceFullPacking?: boolean | null;
    serviceFurnitureAssembly?: boolean | null;
    serviceInsurance?: boolean | null;
    serviceWasteRemoval?: boolean | null;
    serviceHelpWithoutTruck?: boolean | null;
    serviceSpecificSchedule?: boolean | null;
    serviceDebarras?: boolean | null;
    serviceDismantling?: boolean | null;
    accessNoElevator?: boolean | null;
    accessSmallElevator?: boolean | null;
    accessTruckDifficult?: boolean | null;
    servicePiano?: string | null;
    hasFragileItems?: boolean | null;
    furnitureAmericanFridge?: boolean | null;
    furnitureSafe?: boolean | null;
    furnitureBilliard?: boolean | null;
    furnitureAquarium?: boolean | null;
    furnitureOver25kg?: boolean | null;
    specificNotes?: string | null;
  };
  onGoToStep?: (step: 1 | 2 | 3) => void;
  onEmailChange?: (value: string) => void;
}

export default function ConfirmationPage({
  firstName,
  email,
  linkingCode,
  leadId,
  estimateMinEur = null,
  estimateMaxEur = null,
  estimateIsIndicative = false,
  recap,
  onGoToStep,
  onEmailChange,
}: ConfirmationPageProps) {
  const [mounted, setMounted] = useState(false);
  const requestOnceRef = useRef(false);
  const [confirmationState, setConfirmationState] = useState<
    | { status: "idle" | "sending" | "sent"; message?: string }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(email);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!leadId) return;
    if (requestOnceRef.current) return;
    requestOnceRef.current = true;

    const storageKey = `moverz_confirmation_requested_${leadId}`;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (stored && stored === (email || "").trim().toLowerCase()) {
      setConfirmationState({ status: "sent", message: "Email de confirmation envoyé" });
      return;
    }

    setConfirmationState({ status: "sending" });
    (async () => {
      try {
        const res = await requestBackofficeConfirmation(leadId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, (email || "").trim().toLowerCase());
        }
        setConfirmationState({ status: "sent", message: res.message });
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible d'envoyer l'email de confirmation.";
        setConfirmationState({ status: "error", message: msg });
      }
    })();
  }, [mounted, leadId, email]);

  const normalizedEmail = (email || "").trim().toLowerCase();

  const hasEstimate =
    typeof estimateMinEur === "number" &&
    typeof estimateMaxEur === "number" &&
    Number.isFinite(estimateMinEur) &&
    Number.isFinite(estimateMaxEur) &&
    estimateMaxEur > 0;

  const euro = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  const formatValue = (v: unknown): string => {
    if (typeof v === "string") {
      const s = v.trim();
      return s.length ? s : "Non renseigné";
    }
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (typeof v === "boolean") return v ? "Oui" : "Non";
    if (v == null) return "Non renseigné";
    return String(v);
  };

  const saveEmail = async () => {
    if (!leadId) {
      setConfirmationState({ status: "error", message: "Identifiant dossier manquant." });
      return;
    }
    const next = (emailDraft || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      setConfirmationState({ status: "error", message: "Merci de saisir un email valide." });
      return;
    }

    try {
      setConfirmationState({ status: "sending" });
      await updateBackofficeLead(leadId, { email: next });
      onEmailChange?.(next);
      setIsEditingEmail(false);

      const storageKey = `moverz_confirmation_requested_${leadId}`;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }

      const res = await requestBackofficeConfirmation(leadId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next);
      }
      setConfirmationState({ status: "sent", message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de mettre à jour l'email.";
      setConfirmationState({ status: "error", message: msg });
    }
  };

  const recapRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [];

    // Contact
    rows.push({ label: "Prénom", value: formatValue(firstName) });
    rows.push({ label: "Nom", value: formatValue(recap?.lastName) });
    rows.push({ label: "Email", value: formatValue(normalizedEmail) });
    rows.push({ label: "Téléphone", value: formatValue(recap?.phone) });

    // Départ
    rows.push({ label: "Départ — Adresse", value: formatValue(recap?.originAddress) });
    rows.push({ label: "Départ — Ville", value: formatValue(recap?.originCity) });
    rows.push({ label: "Départ — Code postal", value: formatValue(recap?.originPostalCode) });
    rows.push({ label: "Départ — Logement", value: formatValue(recap?.originHousingType) });
    rows.push({ label: "Départ — Étage", value: formatValue(recap?.originFloor) });
    rows.push({ label: "Départ — Ascenseur", value: formatValue(recap?.originElevator) });
    rows.push({ label: "Départ — Monte-meuble", value: formatValue(recap?.originFurnitureLift) });
    rows.push({ label: "Départ — Portage", value: formatValue(recap?.originCarryDistance) });
    rows.push({ label: "Départ — Autorisation stationnement", value: formatValue(recap?.originParkingAuth) });
    rows.push({ label: "Départ — Accès serré", value: formatValue(recap?.originTightAccess) });

    // Arrivée
    rows.push({ label: "Arrivée inconnue", value: formatValue(recap?.destinationUnknown) });
    rows.push({ label: "Arrivée — Adresse", value: formatValue(recap?.destinationAddress) });
    rows.push({ label: "Arrivée — Ville", value: formatValue(recap?.destinationCity) });
    rows.push({ label: "Arrivée — Code postal", value: formatValue(recap?.destinationPostalCode) });
    rows.push({ label: "Arrivée — Logement", value: formatValue(recap?.destinationHousingType) });
    rows.push({ label: "Arrivée — Étage", value: formatValue(recap?.destinationFloor) });
    rows.push({ label: "Arrivée — Ascenseur", value: formatValue(recap?.destinationElevator) });
    rows.push({ label: "Arrivée — Monte-meuble", value: formatValue(recap?.destinationFurnitureLift) });
    rows.push({ label: "Arrivée — Portage", value: formatValue(recap?.destinationCarryDistance) });
    rows.push({ label: "Arrivée — Autorisation stationnement", value: formatValue(recap?.destinationParkingAuth) });
    rows.push({ label: "Arrivée — Accès serré", value: formatValue(recap?.destinationTightAccess) });

    // Date
    rows.push({ label: "Date", value: formatValue(recap?.movingDate) });
    rows.push({ label: "Date fin", value: formatValue(recap?.movingDateEnd) });
    rows.push({ label: "Date flexible", value: formatValue(recap?.dateFlexible) });

    // Volume / formule
    rows.push({ label: "Surface", value: recap?.surfaceM2 ? `${recap.surfaceM2} m²` : "Non renseigné" });
    rows.push({ label: "Densité", value: formatValue(recap?.density) });
    rows.push({ label: "Formule", value: formatValue(recap?.formule) });
    rows.push({
      label: "Estimation",
      value: hasEstimate ? `${euro(estimateMinEur!)} – ${euro(estimateMaxEur!)}` : "Non renseigné",
    });

    // Services
    rows.push({ label: "Garde-meubles", value: formatValue(recap?.serviceFurnitureStorage) });
    rows.push({ label: "Ménage", value: formatValue(recap?.serviceCleaning) });
    rows.push({ label: "Emballage complet", value: formatValue(recap?.serviceFullPacking) });
    rows.push({ label: "Montage / démontage", value: formatValue(recap?.serviceFurnitureAssembly) });
    rows.push({ label: "Assurance", value: formatValue(recap?.serviceInsurance) });
    rows.push({ label: "Déchets", value: formatValue(recap?.serviceWasteRemoval) });
    rows.push({ label: "Aide sans camion", value: formatValue(recap?.serviceHelpWithoutTruck) });
    rows.push({ label: "Planning spécifique", value: formatValue(recap?.serviceSpecificSchedule) });
    rows.push({ label: "Débarras", value: formatValue(recap?.serviceDebarras) });
    rows.push({ label: "Démontage complet", value: formatValue(recap?.serviceDismantling) });
    rows.push({ label: "Escaliers sans ascenseur", value: formatValue(recap?.accessNoElevator) });
    rows.push({ label: "Petit ascenseur / passages serrés", value: formatValue(recap?.accessSmallElevator) });
    rows.push({ label: "Accès camion difficile", value: formatValue(recap?.accessTruckDifficult) });
    rows.push({ label: "Piano", value: formatValue(recap?.servicePiano) });
    rows.push({ label: "Objets fragiles", value: formatValue(recap?.hasFragileItems) });
    rows.push({ label: "Frigo américain", value: formatValue(recap?.furnitureAmericanFridge) });
    rows.push({ label: "Coffre-fort", value: formatValue(recap?.furnitureSafe) });
    rows.push({ label: "Billard", value: formatValue(recap?.furnitureBilliard) });
    rows.push({ label: "Aquarium", value: formatValue(recap?.furnitureAquarium) });
    rows.push({ label: "Objets > 25kg", value: formatValue(recap?.furnitureOver25kg) });
    rows.push({ label: "Notes", value: formatValue(recap?.specificNotes) });

    if (linkingCode) rows.push({ label: "Code dossier", value: linkingCode });

    return rows;
  }, [
    firstName,
    recap,
    hasEstimate,
    estimateMinEur,
    estimateMaxEur,
    linkingCode,
    normalizedEmail,
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          Dossier créé
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] leading-[1.1]">
          Bravo
        </h2>
      </div>

      <div className="rounded-2xl border border-[#E3E5E8] bg-white p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#6BCFCF]/10">
            <Mail className="h-5 w-5 text-[#2B7A78]" />
          </div>
          <div className="flex-1">
            {!isEditingEmail ? (
              <>
                <p className="text-sm font-semibold text-[#0F172A]">
                  Merci de confirmer votre adresse email{" "}
                  <span className="font-mono">{normalizedEmail}</span>
                </p>
                <p className="mt-1 text-sm text-[#1E293B]/70">
                  Vous avez reçu un mail de confirmation sur {normalizedEmail}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEmailDraft(email);
                    setIsEditingEmail(true);
                  }}
                  className="mt-3 text-xs font-semibold text-[#2B7A78] hover:underline"
                >
                  Modifier mon email
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#0F172A]">Modifier votre email</p>
                <input
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className="w-full rounded-xl border border-[#E3E5E8] px-4 py-2 text-sm"
                  placeholder="vous@email.fr"
                  inputMode="email"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingEmail(false);
                      setEmailDraft(email);
                    }}
                    className="rounded-xl border border-[#E3E5E8] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveEmail()}
                    className="rounded-xl bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Enregistrer & renvoyer
                  </button>
                </div>
              </div>
            )}

            {confirmationState.status === "sending" && (
              <p className="mt-3 text-xs text-[#1E293B]/60">Envoi de l'email de confirmation…</p>
            )}
            {confirmationState.status === "sent" && (
              <p className="mt-3 text-xs text-green-700">
                {confirmationState.message || "Email de confirmation envoyé"}
              </p>
            )}
            {confirmationState.status === "error" && (
              <p className="mt-3 text-xs text-amber-700">
                {confirmationState.message} (pensez à vérifier vos spams)
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-[#F8F9FA] p-5 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0F172A]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E293B]/60">
              Récapitulatif de votre dossier
            </p>
          </div>
          {onGoToStep ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onGoToStep(1)}
                className="text-xs font-semibold text-[#2B7A78] hover:underline"
              >
                Modifier contact
              </button>
              <button
                type="button"
                onClick={() => onGoToStep(2)}
                className="text-xs font-semibold text-[#2B7A78] hover:underline"
              >
                Modifier projet
              </button>
              <button
                type="button"
                onClick={() => onGoToStep(3)}
                className="text-xs font-semibold text-[#2B7A78] hover:underline"
              >
                Modifier formules
              </button>
            </div>
          ) : null}
        </div>

        {recapRows.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {recapRows.map((r) => (
              <div
                key={r.label}
                className="flex items-start justify-between gap-4 rounded-xl bg-white px-4 py-3 border border-[#E3E5E8]"
              >
                <p className="text-sm font-medium text-[#1E293B]/70">{r.label}</p>
                <p className="text-sm font-semibold text-[#0F172A] text-right">{r.value}</p>
              </div>
            ))}
            {estimateIsIndicative && hasEstimate && (
              <p className="text-xs text-[#1E293B]/60">
                Estimation indicative (elle peut évoluer selon les détails du dossier).
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#1E293B]/70">
            Votre dossier est bien enregistré. Vous recevrez vos devis sous 48–72h.
          </p>
        )}
      </div>
    </div>
  );
}

