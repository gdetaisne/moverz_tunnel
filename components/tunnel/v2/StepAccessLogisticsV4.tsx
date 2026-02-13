"use client";

/**
 * StepAccessLogisticsV4 — Moverz V4 Design System (Simplified — moverz.fr style)
 * Step 3: Logistics, Access, Contact, Formule
 * 
 * ✅ Back-office safe
 * ✅ Tracking safe
 * ❌ Services additionnels facultatifs RETIRÉS
 */

import { useMemo, useState } from "react";
import { MapPin, Calendar, Home, Mail, User, Phone, ChevronDown } from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";
import { DatePickerFr } from "@/components/tunnel/DatePickerFr";
import { CardV4 } from "@/components/tunnel-v4";

type QuestionKey = "narrow_access" | "long_carry" | "difficult_parking" | "lift_required";

interface StepAccessLogisticsV4Props {
  // Addresses
  originAddress: string;
  originPostalCode: string;
  originCity: string;
  originCountryCode?: string;
  originLat?: number | null;
  originLon?: number | null;
  originHousingType: string;
  originFloor: string;
  destinationAddress: string;
  destinationPostalCode: string;
  destinationCity: string;
  destinationCountryCode?: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  destinationUnknown?: boolean;
  destinationHousingType: string;
  destinationFloor: string;
  // Volume
  density: "" | "light" | "normal" | "dense";
  kitchenIncluded: "" | "none" | "appliances" | "full";
  kitchenApplianceCount: string;
  movingDate: string;
  dateFlexible: boolean;
  routeDistanceKm?: number | null;
  routeDistanceProvider?: "osrm" | "fallback" | null;
  onFieldChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  showValidation?: boolean;
  access_type: "simple" | "constrained";
  narrow_access: boolean;
  long_carry: boolean;
  difficult_parking: boolean;
  lift_required: boolean;
  access_details: string;
  // Contact
  firstName: string;
  email: string;
  phone: string;
  specificNotes: string;
  // Formule
  selectedFormule: "ECONOMIQUE" | "STANDARD" | "PREMIUM";
  onFormuleChange: (v: "ECONOMIQUE" | "STANDARD" | "PREMIUM") => void;
  pricingByFormule?: {
    ECONOMIQUE: { priceMin: number; priceMax: number };
    STANDARD: { priceMin: number; priceMax: number };
    PREMIUM: { priceMin: number; priceMax: number };
  } | null;
}

const questions: Array<{ key: QuestionKey; label: string }> = [
  { key: "narrow_access", label: "Petit ascenseur / passages étroits ?" },
  { key: "long_carry", label: "Portage > 10 m ?" },
  { key: "difficult_parking", label: "Stationnement compliqué ?" },
  { key: "lift_required", label: "Besoin d'un monte-meuble ?" },
];

const FLOOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "RDC" },
  { value: "1", label: "1er" },
  { value: "2", label: "2e" },
  { value: "3", label: "3e" },
  { value: "4", label: "4e ou +" },
];

export function StepAccessLogisticsV4(props: StepAccessLogisticsV4Props) {
  const minMovingDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0]!;
  }, []);

  const isApartment = (t: string) => {
    const normalized = (t || "").trim().toLowerCase();
    return normalized === "t1" || normalized === "t2" || normalized === "t3" || normalized === "t4" || normalized === "t5";
  };
  const showValidation = !!props.showValidation;
  const isOriginAddressValid = (props.originAddress || "").trim().length >= 5;
  const isDestinationAddressValid = (props.destinationAddress || "").trim().length >= 5;
  const isFirstNameValid = (props.firstName || "").trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((props.email || "").trim());
  const isMovingDateValid = !!props.movingDate && props.movingDate >= minMovingDate;
  const isDensityValid = props.density !== "";
  const isKitchenSelectionValid = props.kitchenIncluded !== "";
  const isKitchenValid =
    props.kitchenIncluded !== "appliances" ||
    (Number.parseInt(String(props.kitchenApplianceCount || "").trim(), 10) || 0) >= 1;
  const [showMissingInfoPanel, setShowMissingInfoPanel] = useState(false);
  const missingInfoPanelOpen = showMissingInfoPanel;
  const [optionalPhotoNames, setOptionalPhotoNames] = useState<string[]>([]);

  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const parseAccessSides = () => {
    const sides: Record<QuestionKey, { origin?: boolean; destination?: boolean }> = {
      narrow_access: {},
      long_carry: {},
      difficult_parking: {},
      lift_required: {},
    };

    const parts = (props.access_details || "").split("|").filter(Boolean);
    for (const p of parts) {
      const [loc, key] = p.split(":") as [string, QuestionKey];
      if (!key) continue;
      if (loc === "origin") sides[key].origin = true;
      if (loc === "destination") sides[key].destination = true;
    }
    return sides;
  };

  const toggleSide = (q: QuestionKey, loc: "origin" | "destination") => {
    const current = parseAccessSides();
    const was = current[q]?.[loc] ?? false;
    current[q][loc] = !was;

    const parts: string[] = [];
    for (const qKey of Object.keys(current) as QuestionKey[]) {
      if (current[qKey].origin) parts.push(`origin:${qKey}`);
      if (current[qKey].destination) parts.push(`destination:${qKey}`);
    }

    const newDetail = parts.join("|");
    props.onFieldChange("access_details", newDetail);

    const hasAny = parts.length > 0;
    if (hasAny !== (props.access_type === "constrained")) {
      props.onFieldChange("access_type", hasAny ? "constrained" : "simple");
    }
  };

  const renderLogementPicker = (
    prefix: "origin" | "destination",
    housingType: string,
    floor: string,
    setHousingType: (v: string) => void,
    setFloor: (v: string) => void
  ) => {
    const locationLabel = prefix === "origin" ? "Départ" : "Arrivée";
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Logement · {locationLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHousingType("house")}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: housingType === "house"
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: housingType === "house" ? "#FFFFFF" : "var(--color-text)",
                border: housingType === "house"
                  ? "none"
                  : "2px solid var(--color-border)",
              }}
            >
              Maison
            </button>
            <button
              type="button"
              onClick={() => setHousingType("t2")}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: isApartment(housingType)
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: isApartment(housingType) ? "#FFFFFF" : "var(--color-text)",
                border: isApartment(housingType)
                  ? "none"
                  : "2px solid var(--color-border)",
              }}
            >
              Appartement
            </button>
          </div>
        </div>

        {isApartment(housingType) && (
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Étage
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {FLOOR_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setFloor(o.value)}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background:
                      floor === o.value ? "var(--color-accent)" : "var(--color-surface)",
                    color: floor === o.value ? "#FFFFFF" : "var(--color-text)",
                    border:
                      floor === o.value
                        ? "none"
                        : "2px solid var(--color-border)",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ToggleYes = ({
    active,
    disabled = false,
    onToggle,
    ariaLabel,
  }: {
    active: boolean;
    disabled?: boolean;
    onToggle: () => void;
    ariaLabel: string;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-label={ariaLabel}
      className="w-14 h-8 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: active ? "var(--color-accent)" : "var(--color-border)",
      }}
    >
      <div
        className="w-6 h-6 rounded-full bg-white shadow-md transition-transform"
        style={{
          transform: active ? "translateX(28px)" : "translateX(4px)",
        }}
      />
    </button>
  );

  const destinationUnknown = !!props.destinationUnknown;

  return (
    <div className="space-y-6">
      {/* Addresses */}
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Votre trajet
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AddressAutocomplete
              label={
                props.originCity
                  ? `Départ · ${props.originCity}${
                      props.originPostalCode ? ` (${props.originPostalCode})` : ""
                    }`
                  : "Adresse de départ"
              }
              placeholder="Ex: 10 rue de la République"
              inputId="v4-origin-address"
              initialValue={props.originAddress || ""}
              required
              contextPostalCode={props.originPostalCode || undefined}
              contextCity={props.originCity || undefined}
              contextCountryCode={(props.originCountryCode || "").trim() || undefined}
              validated={props.originLat != null && props.originLon != null}
              errorMessage={
                showValidation && !isOriginAddressValid
                  ? "Adresse de départ requise"
                  : null
              }
              onInputChange={(raw) => {
                props.onFieldChange("originAddress", raw);
              }}
              onSelect={(s) => {
                props.onFieldChange("originAddress", s.addressLine ?? s.label ?? "");
                props.onFieldChange("originCity", s.city ?? "");
                props.onFieldChange("originPostalCode", s.postalCode ?? "");
                props.onFieldChange(
                  "originCountryCode",
                  (s.countryCode ?? "fr").toLowerCase()
                );
                props.onFieldChange("originLat", s.lat ?? null);
                props.onFieldChange("originLon", s.lon ?? null);
              }}
            />

            <AddressAutocomplete
              label={
                props.destinationCity
                  ? `Arrivée · ${props.destinationCity}${
                      props.destinationPostalCode
                        ? ` (${props.destinationPostalCode})`
                        : ""
                    }`
                  : "Adresse d'arrivée"
              }
              placeholder="Ex: 5 avenue Victor Hugo"
              inputId="v4-destination-address"
              initialValue={props.destinationAddress || ""}
              required
              contextPostalCode={props.destinationPostalCode || undefined}
              contextCity={props.destinationCity || undefined}
              contextCountryCode={(props.destinationCountryCode || "").trim() || undefined}
              validated={props.destinationLat != null && props.destinationLon != null}
              errorMessage={
                showValidation && !isDestinationAddressValid
                  ? "Adresse d'arrivée requise"
                  : null
              }
              onInputChange={(raw) => {
                props.onFieldChange("destinationAddress", raw);
              }}
              onSelect={(s) => {
                props.onFieldChange("destinationAddress", s.addressLine ?? s.label ?? "");
                props.onFieldChange("destinationCity", s.city ?? "");
                props.onFieldChange("destinationPostalCode", s.postalCode ?? "");
                props.onFieldChange(
                  "destinationCountryCode",
                  (s.countryCode ?? "fr").toLowerCase()
                );
                props.onFieldChange("destinationLat", s.lat ?? null);
                props.onFieldChange("destinationLon", s.lon ?? null);
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {renderLogementPicker(
              "origin",
              props.originHousingType,
              props.originFloor,
              (v) => props.onFieldChange("originHousingType", v),
              (v) => props.onFieldChange("originFloor", v)
            )}
            {renderLogementPicker(
              "destination",
              props.destinationHousingType,
              props.destinationFloor,
              (v) => props.onFieldChange("destinationHousingType", v),
              (v) => props.onFieldChange("destinationFloor", v)
            )}
          </div>
        </div>
      </CardV4>

      {/* Date */}
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Date de déménagement
            </p>
          </div>

          <DatePickerFr
            id="v4-moving-date"
            value={props.movingDate}
            onChange={(d) => props.onFieldChange("movingDate", d)}
            min={minMovingDate}
            error={showValidation && !isMovingDateValid}
          />
          {showValidation && !isMovingDateValid && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
              Date requise (minimum 15 jours)
            </p>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={props.dateFlexible}
              onChange={(e) => props.onFieldChange("dateFlexible", e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--color-accent)" }}
            />
            <span className="text-sm" style={{ color: "var(--color-text)" }}>
              Mes dates sont flexibles (±3 jours)
            </span>
          </label>
        </div>
      </CardV4>

      {/* Volume */}
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Volume & densité
            </p>
          </div>

          <div id="v4-density-section">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text)" }}
            >
              Densité de meubles
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "light", label: "Léger" },
                { id: "normal", label: "Normal" },
                { id: "dense", label: "Dense" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => props.onFieldChange("density", d.id)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background:
                      props.density === d.id ? "var(--color-accent)" : "var(--color-surface)",
                    color: props.density === d.id ? "#FFFFFF" : "var(--color-text)",
                    border:
                      props.density === d.id ? "none" : "2px solid var(--color-border)",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {showValidation && !isDensityValid && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                Densité requise
              </p>
            )}
          </div>

          <div id="v4-kitchen-section">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text)" }}
            >
              Cuisine équipée ?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "none", label: "Non" },
                { id: "appliances", label: "Oui" },
                { id: "full", label: "Complète" },
              ].map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => props.onFieldChange("kitchenIncluded", k.id)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background:
                      props.kitchenIncluded === k.id
                        ? "var(--color-accent)"
                        : "var(--color-surface)",
                    color:
                      props.kitchenIncluded === k.id ? "#FFFFFF" : "var(--color-text)",
                    border:
                      props.kitchenIncluded === k.id
                        ? "none"
                        : "2px solid var(--color-border)",
                  }}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {showValidation && !isKitchenSelectionValid && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                Sélection cuisine requise
              </p>
            )}
          </div>

          {props.kitchenIncluded === "appliances" && (
            <div>
              <label
                htmlFor="v4-kitchen-count"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Nombre d'électroménagers
              </label>
              <input
                id="v4-kitchen-count"
                type="number"
                min={1}
                max={20}
                value={props.kitchenApplianceCount}
                onChange={(e) =>
                  props.onFieldChange("kitchenApplianceCount", e.target.value)
                }
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "var(--color-bg)",
                  border: `2px solid ${
                    showValidation && !isKitchenValid
                      ? "var(--color-danger)"
                      : "var(--color-border)"
                  }`,
                  color: "var(--color-text)",
                }}
                placeholder="3"
              />
              {showValidation && !isKitchenValid && (
                <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                  Nombre requis (min 1)
                </p>
              )}
            </div>
          )}
        </div>
      </CardV4>

      {/* Informations complémentaires (dépliant) */}
      <CardV4 padding="md">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowMissingInfoPanel((v) => !v)}
            className="w-full flex items-center justify-between text-left rounded-xl px-3 py-2"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
            aria-expanded={missingInfoPanelOpen}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Il nous manque des informations ?
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${missingInfoPanelOpen ? "rotate-180" : ""}`}
              style={{ color: "var(--color-text-muted)" }}
            />
          </button>

          {missingInfoPanelOpen && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Contraintes usuelles. à préciser
                </p>

                <div className="hidden sm:block">
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
                    <div className="grid grid-cols-[1fr,120px,120px] border-b" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}>
                      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                        Contrainte
                      </div>
                      <div className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                        Départ
                      </div>
                      <div className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                        Arrivée
                      </div>
                    </div>
                    {questions.map((q) => {
                      const sides = parseAccessSides()[q.key];
                      const destDisabled = destinationUnknown;
                      return (
                        <div
                          key={q.key}
                          className="grid grid-cols-[1fr,120px,120px] items-center border-t"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <div className="px-3 py-3 text-sm font-medium" style={{ color: "var(--color-text)" }}>
                            {q.label}
                          </div>
                          <div className="px-3 py-2 flex justify-center">
                            <ToggleYes
                              active={Boolean(sides?.origin)}
                              onToggle={() => toggleSide(q.key, "origin")}
                              ariaLabel={`Départ: ${q.label}`}
                            />
                          </div>
                          <div className="px-3 py-2 flex justify-center">
                            <ToggleYes
                              active={Boolean(sides?.destination)}
                              disabled={destDisabled}
                              onToggle={() => toggleSide(q.key, "destination")}
                              ariaLabel={`Arrivée: ${q.label}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:hidden space-y-2">
                  {questions.map((q) => {
                    const sides = parseAccessSides()[q.key];
                    const destDisabled = destinationUnknown;
                    return (
                      <div
                        key={q.key}
                        className="rounded-xl border p-3 space-y-2"
                        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                      >
                        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                          {q.label}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                              Départ
                            </span>
                            <ToggleYes
                              active={Boolean(sides?.origin)}
                              onToggle={() => toggleSide(q.key, "origin")}
                              ariaLabel={`Départ: ${q.label}`}
                            />
                          </div>
                          <div className="w-px h-8" style={{ background: "var(--color-border)" }} />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                              Arrivée
                            </span>
                            <ToggleYes
                              active={Boolean(sides?.destination)}
                              disabled={destDisabled}
                              onToggle={() => toggleSide(q.key, "destination")}
                              ariaLabel={`Arrivée: ${q.label}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="v4-specific-notes"
                  className="block text-sm font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  D'autre spécificitées à prendre en compte
                </label>
                <textarea
                  id="v4-specific-notes"
                  value={props.specificNotes}
                  onChange={(e) => props.onFieldChange("specificNotes", e.target.value)}
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 text-sm resize-y"
                  style={{
                    background: "var(--color-bg)",
                    border: "2px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  placeholder={`Exemple :\nJ'ai un Piano droit, et une armoire très lourde et indémontable\nj'aimerais si possible que vous fassiez le menage dans le logement de départ :-)`}
                />
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Champ optionnel
                </p>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="v4-optional-photos"
                  className="block text-sm font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  Ajouter des photos (facultatif)
                </label>
                <input
                  id="v4-optional-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    border: "2px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setOptionalPhotoNames(files.map((f) => f.name));
                  }}
                />
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Prototype non connecté : ces photos ne sont pas encore envoyées au Back Office.
                </p>
                {optionalPhotoNames.length > 0 && (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {optionalPhotoNames.length} photo(s) sélectionnée(s)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardV4>

      {/* Formule */}
      {props.pricingByFormule && (
        <CardV4 padding="md">
          <div className="space-y-4">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Votre formule
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                {
                  id: "ECONOMIQUE" as const,
                  label: "Éco",
                  recommended: false,
                  bullets: ["Transport uniquement", "Vous emballez"],
                },
                {
                  id: "STANDARD" as const,
                  label: "Standard",
                  recommended: true,
                  bullets: ["Transport + aide", "Emballage basique"],
                },
                {
                  id: "PREMIUM" as const,
                  label: "Premium",
                  recommended: false,
                  bullets: ["Tout inclus", "Emballage complet"],
                },
              ] as const).map((f) => {
                const price = props.pricingByFormule![f.id];
                const selected = props.selectedFormule === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => props.onFormuleChange(f.id)}
                    className="relative rounded-xl p-4 text-left transition-all"
                    style={{
                      background: selected
                        ? "var(--color-accent-light)"
                        : "var(--color-surface)",
                      border: `2px solid ${
                        selected ? "var(--color-accent)" : "var(--color-border)"
                      }`,
                    }}
                  >
                    {f.recommended && (
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: "var(--color-accent)",
                          color: "#FFFFFF",
                        }}
                      >
                        + Top
                      </div>
                    )}
                    <p
                      className="text-lg font-bold mb-2"
                      style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
                    >
                      {f.label}
                    </p>
                    <p
                      className="text-sm font-bold mb-3"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {fmtEur(price?.priceMin ?? 0)} – {fmtEur(price?.priceMax ?? 0)}
                    </p>
                    <ul className="space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {f.bullets.map((b, i) => (
                        <li key={i}>• {b}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        </CardV4>
      )}

      {/* Contact */}
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Vos coordonnées
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="v4-firstName"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Prénom
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ color: "var(--color-text-muted)" }}
                />
                <input
                  id="v4-firstName"
                  type="text"
                  value={props.firstName}
                  onChange={(e) => props.onFieldChange("firstName", e.target.value)}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    border: `2px solid ${
                      showValidation && !isFirstNameValid
                        ? "var(--color-danger)"
                        : "var(--color-border)"
                    }`,
                    color: "var(--color-text)",
                  }}
                  placeholder="Jean"
                />
              </div>
              {showValidation && !isFirstNameValid && (
                <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                  Prénom requis
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="v4-phone"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Téléphone (optionnel)
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ color: "var(--color-text-muted)" }}
                />
                <input
                  id="v4-phone"
                  type="tel"
                  value={props.phone}
                  onChange={(e) => props.onFieldChange("phone", e.target.value)}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    border: "2px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="v4-email"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text)" }}
            >
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: "var(--color-text-muted)" }}
              />
              <input
                id="v4-email"
                type="email"
                value={props.email}
                onChange={(e) => props.onFieldChange("email", e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                style={{
                  background: "var(--color-bg)",
                  border: `2px solid ${
                    showValidation && !isEmailValid
                      ? "var(--color-danger)"
                      : "var(--color-border)"
                  }`,
                  color: "var(--color-text)",
                }}
                placeholder="jean@exemple.fr"
              />
            </div>
            {showValidation && !isEmailValid && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                Email valide requis
              </p>
            )}
          </div>
        </div>
      </CardV4>

      {/* CTA */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={props.isSubmitting}
          onClick={props.onSubmit}
          className="group relative w-full rounded-xl py-4 text-base font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-300 touch-manipulation overflow-hidden"
          style={{
            background: "var(--color-accent)",
            boxShadow: "0 4px 16px rgba(14,165,166,0.3)",
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {props.isSubmitting ? "Enregistrement..." : "Lancer ma demande de devis"}
            {!props.isSubmitting && (
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            )}
          </span>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            style={{ background: "var(--color-surface)" }}
          />
        </button>

        <p className="text-xs text-center font-medium" style={{ color: "var(--color-text-muted)" }}>
          ~30 sec restantes
        </p>
      </div>
    </div>
  );
}
