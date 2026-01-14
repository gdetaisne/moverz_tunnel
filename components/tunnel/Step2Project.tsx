"use client";

import { useState, FormEvent } from "react";
import { MapPin, Home, Calendar, ArrowRight, Check, AlertCircle } from "lucide-react";

interface Step2ProjectProps {
  originPostalCode: string;
  originCity: string;
  destinationPostalCode: string;
  destinationCity: string;
  destinationUnknown: boolean;
  movingDate: string;
  dateFlexible: boolean;
  onFieldChange: (field: string, value: any) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  error: string | null;
}

export default function Step2Project({
  originPostalCode,
  originCity,
  destinationPostalCode,
  destinationCity,
  destinationUnknown,
  movingDate,
  dateFlexible,
  onFieldChange,
  onSubmit,
  isSubmitting,
  error,
}: Step2ProjectProps) {
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  function markTouched(field: string) {
    setTouchedFields((prev) => new Set(prev).add(field));
  }

  const MIN_DAYS_AHEAD = 14;
  const minMovingDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + MIN_DAYS_AHEAD);
    return d.toISOString().split("T")[0]!;
  })();
  const isMovingDateTooSoon = Boolean(movingDate) && movingDate < minMovingDate;

  const isOriginValid = originPostalCode.length === 5 && originCity.trim().length > 0;
  const isDestinationValid = destinationUnknown || (destinationPostalCode.length === 5 && destinationCity.trim().length > 0);
  const isDateValid = movingDate.length > 0 && !isMovingDateTooSoon;

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-start">
      {/* Left: Form */}
      <div className="order-2 lg:order-1">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#6BCFCF]/10 px-4 py-1.5 text-sm font-semibold text-[#0F172A] mb-6">
            <span className="h-2 w-2 rounded-full bg-[#6BCFCF]" />
            Étape 2/4
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4 leading-tight">
            Votre projet de déménagement
          </h2>
          
          <p className="text-lg text-[#1E293B]/70 leading-relaxed">
            Quelques infos sur votre départ, arrivée et date souhaitée.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Départ */}
          <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8]">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-[#6BCFCF]" />
              <h3 className="text-lg font-bold text-[#0F172A]">Départ</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={originPostalCode}
                    onChange={(e) => {
                      markTouched("originPostalCode");
                      onFieldChange("originPostalCode", e.target.value);
                    }}
                    maxLength={5}
                    className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                    placeholder="75001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={originCity}
                    onChange={(e) => {
                      markTouched("originCity");
                      onFieldChange("originCity", e.target.value);
                    }}
                    className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                    placeholder="Paris"
                  />
                </div>
              </div>

              {touchedFields.has("originPostalCode") && !isOriginValid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Code postal et ville obligatoires
                </p>
              )}
            </div>
          </div>

          {/* Arrivée */}
          <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8]">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-[#6BCFCF]" />
              <h3 className="text-lg font-bold text-[#0F172A]">Arrivée</h3>
            </div>

            {/* Checkbox: destination inconnue */}
            <label className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white border border-[#E3E5E8] cursor-pointer hover:border-[#6BCFCF] transition-colors">
              <input
                type="checkbox"
                checked={destinationUnknown}
                onChange={(e) => onFieldChange("destinationUnknown", e.target.checked)}
                className="w-5 h-5 rounded border-[#E3E5E8] text-[#6BCFCF] focus:ring-2 focus:ring-[#6BCFCF]/20"
              />
              <span className="text-sm text-[#0F172A]">
                Je ne connais pas encore mon adresse d'arrivée
              </span>
            </label>

            {!destinationUnknown && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Code postal
                    </label>
                    <input
                      type="text"
                      value={destinationPostalCode}
                      onChange={(e) => {
                        markTouched("destinationPostalCode");
                        onFieldChange("destinationPostalCode", e.target.value);
                      }}
                      maxLength={5}
                      className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                      placeholder="69001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={destinationCity}
                      onChange={(e) => {
                        markTouched("destinationCity");
                        onFieldChange("destinationCity", e.target.value);
                      }}
                      className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                      placeholder="Lyon"
                    />
                  </div>
                </div>

                {touchedFields.has("destinationPostalCode") && !isDestinationValid && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Code postal et ville obligatoires
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#E3E5E8]">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[#6BCFCF]" />
              <h3 className="text-lg font-bold text-[#0F172A]">Date souhaitée</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Date de déménagement
                </label>
                <input
                  type="date"
                  value={movingDate}
                  onChange={(e) => {
                    markTouched("movingDate");
                    onFieldChange("movingDate", e.target.value);
                  }}
                  min={minMovingDate}
                  className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E3E5E8] cursor-pointer hover:border-[#6BCFCF] transition-colors">
                <input
                  type="checkbox"
                  checked={dateFlexible}
                  onChange={(e) => onFieldChange("dateFlexible", e.target.checked)}
                  className="w-5 h-5 rounded border-[#E3E5E8] text-[#6BCFCF] focus:ring-2 focus:ring-[#6BCFCF]/20"
                />
                <span className="text-sm text-[#0F172A]">
                  Je suis flexible sur la date (±1 semaine)
                </span>
              </label>

              {touchedFields.has("movingDate") && !isDateValid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {isMovingDateTooSoon
                    ? `Date trop proche — minimum ${MIN_DAYS_AHEAD} jours (à partir du ${minMovingDate})`
                    : "Date obligatoire"}
                </p>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !isOriginValid || !isDestinationValid || !isDateValid}
            className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#1E293B] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <span>{isSubmitting ? "Enregistrement..." : "Continuer"}</span>
            {!isSubmitting && (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </form>
      </div>

      {/* Right: Benefits mockup */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-8">
        <div className="relative w-full max-w-[400px] mx-auto">
          <div className="relative bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-8 border border-[#E3E5E8]">
            <div className="space-y-6">
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6BCFCF] to-[#A8E8E8] mx-auto">
                <MapPin className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                  Pourquoi ces infos ?
                </h3>
                <p className="text-sm text-[#1E293B]/70">
                  Pour vous mettre en relation avec des déménageurs locaux
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F9FA]">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] mb-1">
                      Distance précise
                    </p>
                    <p className="text-xs text-[#1E293B]/70">
                      Calcul exact du km pour un prix juste
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F9FA]">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] mb-1">
                      Déménageurs locaux
                    </p>
                    <p className="text-xs text-[#1E293B]/70">
                      Pros qui connaissent votre ville
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F9FA]">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] mb-1">
                      Disponibilité
                    </p>
                    <p className="text-xs text-[#1E293B]/70">
                      Vérification selon votre date
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[#E3E5E8] text-center">
                <p className="text-xs text-[#1E293B]/60">
                  ⏱️ Encore ~2 min pour terminer votre demande
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
