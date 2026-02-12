"use client";

import { FormEvent } from "react";
import { MapPin, Home, Sparkles, ArrowRight } from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";
import { Card } from "@/app/devis-gratuits-v3/_ui/Card";
import { Button } from "@/app/devis-gratuits-v3/_ui/Button";
import { Badge } from "@/app/devis-gratuits-v3/_ui/Badge";

interface StepQualificationV2PremiumProps {
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

export function StepQualificationV2Premium({
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
}: StepQualificationV2PremiumProps) {
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
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6BCFCF] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[#6BCFCF]/30">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <Badge variant="premium" size="md">
            ✨ Estimation gratuite
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-tight">
          Obtenez votre estimation en 2 minutes
        </h1>
        <p className="text-base sm:text-lg text-[#1E293B]/70 max-w-xl mx-auto">
          Comparez jusqu'à 3 devis gratuits de déménageurs professionnels
        </p>
      </div>

      {/* Trajet section */}
      <Card variant="default" padding="lg" hoverable className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6BCFCF]/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0F172A]">Votre trajet</p>
            <p className="text-xs text-[#1E293B]/60">D'où à où déménagez-vous ?</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Ville de départ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6BCFCF] text-white text-xs font-bold">
                  A
                </span>
                Ville de départ
              </label>
              {isOriginCoordsOk && (
                <Badge variant="success" size="sm">
                  ✓ Validé
                </Badge>
              )}
            </div>
            
            <AddressAutocomplete
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
            
            {isOriginCoordsOk && originCity && (
              <p className="text-xs text-[#10B981] flex items-center gap-1.5 animate-in fade-in duration-300">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Ville enregistrée : {originCity}
              </p>
            )}
          </div>

          {/* Flèche de direction */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6BCFCF]/10 to-[#A78BFA]/10 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2.5} />
            </div>
          </div>

          {/* Ville d'arrivée */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#A78BFA] text-white text-xs font-bold">
                  B
                </span>
                Ville d'arrivée
              </label>
              {isDestinationCoordsOk && (
                <Badge variant="success" size="sm">
                  ✓ Validé
                </Badge>
              )}
            </div>
            
            <AddressAutocomplete
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
            
            {isDestinationCoordsOk && destinationCity && (
              <p className="text-xs text-[#10B981] flex items-center gap-1.5 animate-in fade-in duration-300">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Ville enregistrée : {destinationCity}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Surface section */}
      <Card variant="default" padding="lg" hoverable className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 flex items-center justify-center">
            <Home className="w-5 h-5 text-[#A78BFA]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0F172A]">Votre logement</p>
            <p className="text-xs text-[#1E293B]/60">Surface totale (garages et dépendances inclus)</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[#0F172A]" htmlFor="v2-surface-m2">
              Surface approximative (m²)
            </label>
            <Badge variant="info" size="sm">
              Requis
            </Badge>
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
                onFieldChange("surfaceTouched", true);
              }}
              className={[
                "w-full rounded-xl border-2 px-4 py-4 text-base text-[#0F172A] transition-all duration-200 pr-12",
                showValidation && !isSurfaceValid
                  ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/15"
                  : isSurfaceValid
                  ? "border-[#10B981] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15"
                  : "border-[#E3E5E8] focus:border-[#6BCFCF] focus:ring-4 focus:ring-[#6BCFCF]/20",
                "focus:outline-none focus:bg-white placeholder:text-[#1E293B]/40",
              ].join(" ")}
              placeholder="60"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E293B]/60 text-base font-medium pointer-events-none">
              m²
            </span>
            
            {isSurfaceValid && (
              <div className="absolute right-14 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-300">
                <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          
          {showValidation && !isSurfaceValid && (
            <p className="text-sm font-medium text-[#EF4444] flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Veuillez indiquer une surface entre 10 et 500 m²
            </p>
          )}
          
          <p className="text-xs text-[#1E293B]/60 flex items-start gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#6BCFCF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Une estimation approximative suffit, vous pourrez affiner ensuite</span>
          </p>
        </div>
      </Card>

      {/* Rassurance */}
      <div className="rounded-xl bg-gradient-to-r from-[#F0F9FF] to-[#F8FAFB] border border-[#E3E5E8] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6BCFCF]/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#6BCFCF]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0F172A] mb-2">
              🔒 100% gratuit et sans engagement
            </p>
            <ul className="space-y-1.5 text-sm text-[#1E293B]/80">
              <li className="flex items-start gap-2">
                <span className="text-[#6BCFCF] mt-0.5">•</span>
                <span>Comparez jusqu'à 3 devis de déménageurs pros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6BCFCF] mt-0.5">•</span>
                <span>Aucune donnée bancaire requise</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6BCFCF] mt-0.5">•</span>
                <span>Vous choisissez la meilleure offre, ou aucune</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full"
        >
          Voir mon estimation gratuite
        </Button>
        <p className="text-center text-sm text-[#1E293B]/70">
          ⚡ 2 minutes • 🎁 Gratuit • 🔒 Sans engagement
        </p>
      </div>
    </form>
  );
}
