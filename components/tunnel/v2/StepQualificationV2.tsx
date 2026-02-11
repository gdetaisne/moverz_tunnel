"use client";

import { FormEvent } from "react";
import { MapPin } from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";

interface StepQualificationV2Props {
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

export function StepQualificationV2({
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
}: StepQualificationV2Props) {
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
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#0F172A]">Trajet</p>
        </div>

        <AddressAutocomplete
          label="Ville de départ"
          placeholder="Paris"
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

        <AddressAutocomplete
          label="Ville d’arrivée"
          placeholder="Lyon"
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

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-[#0F172A]" htmlFor="v2-surface-m2">
              Surface approximative, garages et dépendances inclues (m2)
            </label>
            <span className="text-[11px] font-semibold text-[#1E293B]/50">Requis</span>
          </div>
          <div className="relative">
            <input
              id="v2-surface-m2"
              type="number"
              min={10}
              max={500}
              value={surfaceM2}
              onChange={(e) => {
                onFieldChange("surfaceM2", e.target.value);
                // Important: en V2, la surface est déclarée en Step 1.
                // On la marque comme "touchée" pour éviter qu'un changement de logement en Step 3
                // écrase la surface via les defaults par type de logement.
                onFieldChange("surfaceTouched", true);
              }}
              className={[
                "w-full rounded-xl border-2 px-4 py-3 text-base text-[#0F172A] transition-all",
                showValidation && !isSurfaceValid
                  ? "border-[#EF4444] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/15 focus:ring-offset-2"
                  : "border-[#E3E5E8] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/40 focus:ring-offset-2",
              ].join(" ")}
              placeholder="60"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E293B]/60 text-sm">
              m²
            </span>
          </div>
          {showValidation && !isSurfaceValid && (
            <p className="text-sm font-medium text-[#EF4444]">Surface requise (10–500 m²)</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-[#0F172A] to-[#1E293B] py-4 text-base font-semibold text-white shadow-[0_4px_16px_rgba(15,23,42,0.3)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.4)] hover:scale-[1.02] transition-all duration-200 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-[0_4px_16px_rgba(15,23,42,0.3)]"
        >
          {isSubmitting ? "Chargement..." : "Voir les options disponibles"}
        </button>
        <p className="text-center text-sm text-[#1E293B]/70">
          Gratuit • Sans engagement • 2 minutes
        </p>
      </div>
    </form>
  );
}
