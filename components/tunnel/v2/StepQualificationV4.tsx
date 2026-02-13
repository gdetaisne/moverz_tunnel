"use client";

import { FormEvent } from "react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";
import { CardV4 } from "@/components/tunnel-v4";

interface StepQualificationV4Props {
  originCity: string;
  originPostalCode: string;
  originLat?: number | null;
  originLon?: number | null;
  destinationCity: string;
  destinationPostalCode: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  surfaceM2: string;
  onFieldChange: (field: string, value: any) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  showValidation?: boolean;
}

export function StepQualificationV4({
  originCity,
  originPostalCode,
  originLat,
  originLon,
  destinationCity,
  destinationPostalCode,
  destinationLat,
  destinationLon,
  surfaceM2,
  onFieldChange,
  onSubmit,
  isSubmitting,
  showValidation = false,
}: StepQualificationV4Props) {
  const isOriginCoordsOk = originLat != null && originLon != null;
  const isDestinationCoordsOk = destinationLat != null && destinationLon != null;
  const isOriginValid =
    originCity.trim().length >= 2 &&
    originPostalCode.trim().length >= 2 &&
    isOriginCoordsOk;
  const isDestinationValid =
    destinationCity.trim().length >= 2 &&
    destinationPostalCode.trim().length >= 2 &&
    isDestinationCoordsOk;
  const isSurfaceValid = (() => {
    const n = Number.parseInt(String(surfaceM2 || "").trim(), 10);
    return Number.isFinite(n) && n >= 10 && n <= 500;
  })();

  const originInitialValue = originCity
    ? originPostalCode
      ? `${originCity} (${originPostalCode})`
      : originCity
    : originPostalCode;

  const destinationInitialValue = destinationCity
    ? destinationPostalCode
      ? `${destinationCity} (${destinationPostalCode})`
      : destinationCity
    : destinationPostalCode;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <CardV4 padding="lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
            >
              Obtenez votre estimation
              <br />
              en 2 minutes
            </h1>
            <p className="text-sm sm:text-base" style={{ color: "var(--color-text-secondary)" }}>
              Comparez jusqu'à 3 devis gratuits de déménageurs professionnels
            </p>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <AddressAutocomplete
              label="Ville de départ"
              placeholder="Ex: Paris"
              inputId="v4-origin-city"
              initialValue={originInitialValue}
              kind="city"
              validated={isOriginCoordsOk}
              invalidated={showValidation && !isOriginCoordsOk}
              required
              errorMessage={
                showValidation && !isOriginValid
                  ? "Sélectionnez une ville dans la liste (code postal requis)"
                  : null
              }
              onInputChange={(raw) => {
                onFieldChange("originCity", raw);
                onFieldChange("originPostalCode", "");
                onFieldChange("originCountryCode", "");
                onFieldChange("originLat", null);
                onFieldChange("originLon", null);
              }}
              onSelect={(s) => {
                onFieldChange("originCity", s.city ?? s.label ?? "");
                onFieldChange("originPostalCode", s.postalCode ?? "");
                onFieldChange("originCountryCode", (s.countryCode ?? "fr").toLowerCase());
                onFieldChange("originLat", s.lat ?? null);
                onFieldChange("originLon", s.lon ?? null);
              }}
            />

            <AddressAutocomplete
              label="Ville d'arrivée"
              placeholder="Ex: Lyon"
              inputId="v4-destination-city"
              initialValue={destinationInitialValue}
              kind="city"
              validated={isDestinationCoordsOk}
              invalidated={showValidation && !isDestinationCoordsOk}
              required
              errorMessage={
                showValidation && !isDestinationValid
                  ? "Sélectionnez une ville dans la liste (code postal requis)"
                  : null
              }
              onInputChange={(raw) => {
                onFieldChange("destinationCity", raw);
                onFieldChange("destinationPostalCode", "");
                onFieldChange("destinationCountryCode", "");
                onFieldChange("destinationLat", null);
                onFieldChange("destinationLon", null);
              }}
              onSelect={(s) => {
                onFieldChange("destinationCity", s.city ?? s.label ?? "");
                onFieldChange("destinationPostalCode", s.postalCode ?? "");
                onFieldChange("destinationCountryCode", (s.countryCode ?? "fr").toLowerCase());
                onFieldChange("destinationLat", s.lat ?? null);
                onFieldChange("destinationLon", s.lon ?? null);
              }}
            />

            {/* Surface */}
            <div className="space-y-2">
              <label
                htmlFor="v4-surface-m2"
                className="block text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Surface (m²)
                {showValidation && !isSurfaceValid && (
                  <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-danger)" }}>
                    Surface requise (10–500 m²)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  id="v4-surface-m2"
                  type="number"
                  min={10}
                  max={500}
                  value={surfaceM2}
                  onChange={(e) => {
                    onFieldChange("surfaceM2", e.target.value);
                    onFieldChange("surfaceTouched", true);
                  }}
                  className="w-full rounded-xl px-4 py-3 text-base transition-all"
                  style={{
                    background: "var(--color-bg)",
                    border: `2px solid ${
                      showValidation && !isSurfaceValid
                        ? "var(--color-danger)"
                        : "var(--color-border)"
                    }`,
                    color: "var(--color-text)",
                  }}
                  placeholder="Ex: 70"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  m²
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Une estimation approximative suffit, vous pourrez affiner ensuite
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "var(--color-accent)",
              color: "#FFFFFF",
            }}
          >
            {isSubmitting ? "Chargement..." : "Voir mon estimation →"}
          </button>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <span>~2 min</span>
            <span>•</span>
            <span>Gratuit</span>
            <span>•</span>
            <span>Sans engagement</span>
          </div>
        </div>
      </CardV4>
    </form>
  );
}
