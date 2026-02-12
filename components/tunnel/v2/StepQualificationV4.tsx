/**
 * StepQualificationV4 — Moverz V4 Design System
 * Écran 1: Ville de départ + arrivée + surface
 * 
 * ✅ Back-office safe: tous les champs conservent leurs IDs/names/handlers
 * ✅ Tracking safe: pas de changement de tracking
 */

"use client";

import { FormEvent } from "react";
import { MapPin, Home, ArrowRight, Shield } from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";
import { CardV4, InputV4, ButtonV4 } from "@/components/tunnel-v4";

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
  const isOriginValid = originCity.trim().length >= 2 && isOriginCoordsOk;
  const isDestinationValid = destinationCity.trim().length >= 2 && isDestinationCoordsOk;
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
    <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8">
      {/* Hero section */}
      <div className="text-center space-y-3 sm:space-y-4">
        <h1
          className="text-3xl sm:text-4xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
        >
          Obtenez votre estimation<br />en 2 minutes
        </h1>
        <p
          className="text-base sm:text-lg max-w-xl mx-auto"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Comparez jusqu'à 3 devis gratuits de déménageurs professionnels
        </p>
      </div>

      {/* Trajet section */}
      <CardV4 padding="lg" animate>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{
                background: "var(--color-accent-light)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <MapPin className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
              >
                Votre trajet
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                D'où à où déménagez-vous ?
              </p>
            </div>
          </div>

          {/* Origine */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium flex items-center gap-2"
                style={{ color: "var(--color-text)" }}
              >
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  A
                </span>
                Ville de départ
              </label>
            </div>
            
            <AddressAutocomplete
              label="Ville de départ"
              placeholder="Ex: Paris, Lyon, Marseille..."
              inputId="v2-origin-city"
              initialValue={originInitialValue}
              kind="city"
              validated={isOriginCoordsOk}
              invalidated={showValidation && !isOriginCoordsOk}
              required
              errorMessage={
                showValidation && !isOriginValid
                  ? "Sélectionnez une ville dans la liste"
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
          </div>

          {/* Flèche de direction */}
          <div className="flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "var(--color-accent-light)",
              }}
            >
              <ArrowRight className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium flex items-center gap-2"
                style={{ color: "var(--color-text)" }}
              >
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  B
                </span>
                Ville d'arrivée
              </label>
            </div>
            
            <AddressAutocomplete
              label="Ville d'arrivée"
              placeholder="Ex: Bordeaux, Toulouse, Nice..."
              inputId="v2-destination-city"
              initialValue={destinationInitialValue}
              kind="city"
              validated={isDestinationCoordsOk}
              invalidated={showValidation && !isDestinationCoordsOk}
              required
              errorMessage={
                showValidation && !isDestinationValid
                  ? "Sélectionnez une ville dans la liste"
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
          </div>
        </div>
      </CardV4>

      {/* Surface section */}
      <CardV4 padding="lg" animate>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{
                background: "var(--color-accent-light)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Home className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
              >
                Votre logement
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Surface totale (garages et dépendances inclus)
              </p>
            </div>
          </div>

          {/* Input surface */}
          <InputV4
            id="v2-surface-m2"
            type="number"
            label="Surface approximative (m²)"
            helper="Une estimation approximative suffit, vous pourrez affiner ensuite"
            placeholder="60"
            min={10}
            max={500}
            value={surfaceM2}
            isValid={isSurfaceValid}
            error={
              showValidation && !isSurfaceValid
                ? "Veuillez indiquer une surface entre 10 et 500 m²"
                : undefined
            }
            onChange={(e) => {
              onFieldChange("surfaceM2", e.target.value);
              onFieldChange("surfaceTouched", true);
            }}
            required
          />
        </div>
      </CardV4>

      {/* Rassurance */}
      <CardV4 padding="md" className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "var(--color-accent-light)",
          }}
        >
          <Shield className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
        </div>
        <div className="flex-1">
          <p
            className="text-sm font-semibold mb-2"
            style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
          >
            100% gratuit et sans engagement
          </p>
          <ul className="space-y-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-accent)" }}>•</span>
              <span>Comparez jusqu'à 3 devis de déménageurs pros</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-accent)" }}>•</span>
              <span>Aucune donnée bancaire requise</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "var(--color-accent)" }}>•</span>
              <span>Vous choisissez la meilleure offre, ou aucune</span>
            </li>
          </ul>
        </div>
      </CardV4>

      {/* CTA */}
      <div className="space-y-3">
        <ButtonV4
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full"
        >
          Voir mon estimation gratuite
        </ButtonV4>
        <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          ⚡ 2 minutes • 🎁 Gratuit • 🔒 Sans engagement
        </p>
      </div>
    </form>
  );
}
