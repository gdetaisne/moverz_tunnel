"use client";

import { FormEvent } from "react";
import { Home, MapPin } from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";

interface StepQualificationV2Props {
  originCity: string;
  originPostalCode: string;
  destinationCity: string;
  destinationPostalCode: string;
  housingType: string;
  surfaceM2: string;
  onFieldChange: (field: string, value: any) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
}

export function StepQualificationV2({
  originCity,
  originPostalCode,
  destinationCity,
  destinationPostalCode,
  housingType,
  surfaceM2,
  onFieldChange,
  onSubmit,
  isSubmitting,
}: StepQualificationV2Props) {
  const housingIsApartment = housingType !== "house";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#6BCFCF]" />
          <p className="text-sm font-semibold text-[#0F172A]">Trajet</p>
        </div>

        <AddressAutocomplete
          label="Ville de départ"
          placeholder="Paris"
          inputId="v2-origin-city"
          initialValue={originCity || originPostalCode}
          onInputChange={(raw) => {
            onFieldChange("originCity", raw);
            onFieldChange("originPostalCode", "");
          }}
          onSelect={(s) => {
            onFieldChange("originCity", s.city ?? s.label ?? "");
            onFieldChange("originPostalCode", s.postalCode ?? "");
          }}
        />

        <AddressAutocomplete
          label="Ville d’arrivée"
          placeholder="Lyon"
          inputId="v2-destination-city"
          initialValue={destinationCity || destinationPostalCode}
          onInputChange={(raw) => {
            onFieldChange("destinationCity", raw);
            onFieldChange("destinationPostalCode", "");
          }}
          onSelect={(s) => {
            onFieldChange("destinationCity", s.city ?? s.label ?? "");
            onFieldChange("destinationPostalCode", s.postalCode ?? "");
          }}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-[#6BCFCF]" />
          <p className="text-sm font-semibold text-[#0F172A]">Type de logement</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onFieldChange("originHousingType", "t2")}
            className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              housingIsApartment
                ? "bg-[#0F172A] text-white"
                : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
            }`}
          >
            Appartement
          </button>
          <button
            type="button"
            onClick={() => onFieldChange("originHousingType", "house")}
            className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              !housingIsApartment
                ? "bg-[#0F172A] text-white"
                : "bg-white border-2 border-[#E3E5E8] text-[#0F172A] hover:border-[#6BCFCF]"
            }`}
          >
            Maison
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#0F172A]">
            Surface approximative (m²)
          </label>
          <div className="relative">
            <input
              type="number"
              min={10}
              max={500}
              value={surfaceM2}
              onChange={(e) => onFieldChange("surfaceM2", e.target.value)}
              className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-base text-[#0F172A]"
              placeholder="60"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E293B]/60 text-sm">
              m²
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-[#0F172A] text-white font-semibold py-4 text-base hover:bg-[#1E293B] transition-all"
        >
          {isSubmitting ? "Chargement..." : "Voir les options disponibles"}
        </button>
        <p className="text-center text-sm text-[#1E293B]/70">
          Gratuit • Sans engagement • ~30 sec
        </p>
      </div>
    </form>
  );
}
