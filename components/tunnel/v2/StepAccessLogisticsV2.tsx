"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Home, Mail, User, Phone } from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";

type QuestionKey = "narrow_access" | "long_carry" | "difficult_parking" | "lift_required";

interface StepAccessLogisticsV2Props {
  // addresses / logement
  originAddress: string;
  originPostalCode: string;
  originCity: string;
  originCountryCode?: string;
  originLat?: number | null;
  originLon?: number | null;
  destinationAddress: string;
  destinationPostalCode: string;
  destinationCity: string;
  destinationCountryCode?: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  originHousingType: string;
  destinationHousingType: string;
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
  // Contact (déplacé en fin de step 3, email obligatoire)
  firstName: string;
  email: string;
  phone: string;
  // Services en plus (mappés sur les mêmes champs que V1)
  serviceFurnitureStorage: boolean;
  serviceCleaning: boolean;
  serviceFullPacking: boolean;
  serviceFurnitureAssembly: boolean;
  serviceInsurance: boolean;
  serviceWasteRemoval: boolean;
  serviceHelpWithoutTruck: boolean;
  serviceSpecificSchedule: boolean;
  specificNotes: string;
}

const questions: Array<{ key: QuestionKey; label: string }> = [
  { key: "narrow_access", label: "Petit ascenseur / passages étroits ?" },
  { key: "long_carry", label: "Portage > 10 m ?" },
  { key: "difficult_parking", label: "Stationnement compliqué ?" },
  { key: "lift_required", label: "Besoin d’un monte-meuble ?" },
];

const SERVICE_LABELS: Array<{ key: keyof StepAccessLogisticsV2Props; label: string }> = [
  { key: "serviceFurnitureStorage", label: "Garde-meuble" },
  { key: "serviceCleaning", label: "Nettoyage / débarras" },
  { key: "serviceFullPacking", label: "Emballage complet" },
  { key: "serviceFurnitureAssembly", label: "Montage meubles neufs" },
  { key: "serviceInsurance", label: "Assurance renforcée" },
  { key: "serviceWasteRemoval", label: "Évacuation déchets" },
  { key: "serviceHelpWithoutTruck", label: "Aide sans camion" },
  { key: "serviceSpecificSchedule", label: "Horaires spécifiques" },
];

export function StepAccessLogisticsV2(props: StepAccessLogisticsV2Props) {
  const [revealedCount, setRevealedCount] = useState(1);
  const [showOptions, setShowOptions] = useState(false);
  const minMovingDate = useMemo(() => {
    // Bloquer historique + 15 prochains jours (min = aujourd'hui + 15 jours)
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0]!;
  }, []);
  const showValidation = !!props.showValidation;
  const isOriginAddressValid = (props.originAddress || "").trim().length >= 5;
  const isDestinationAddressValid = (props.destinationAddress || "").trim().length >= 5;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((props.email || "").trim());
  const isMovingDateValid = !!props.movingDate && props.movingDate >= minMovingDate;
  const isRouteDistanceValid =
    typeof props.routeDistanceKm === "number" &&
    Number.isFinite(props.routeDistanceKm) &&
    props.routeDistanceKm > 0 &&
    props.routeDistanceProvider === "osrm";
  const answered = useMemo(
    () => ({
      narrow_access: props.narrow_access,
      long_carry: props.long_carry,
      difficult_parking: props.difficult_parking,
      lift_required: props.lift_required,
    }),
    [props.narrow_access, props.long_carry, props.difficult_parking, props.lift_required]
  );

  useEffect(() => {
    if (props.access_type === "simple") {
      setRevealedCount(1);
    }
  }, [props.access_type]);

  const handleAccessType = (value: "simple" | "constrained") => {
    props.onFieldChange("access_type", value);
    if (value === "simple") {
      props.onFieldChange("narrow_access", false);
      props.onFieldChange("long_carry", false);
      props.onFieldChange("difficult_parking", false);
      props.onFieldChange("lift_required", false);
      props.onFieldChange("access_details", "");
    } else {
      setRevealedCount(1);
    }
  };

  const handleAnswer = (key: QuestionKey, value: boolean) => {
    props.onFieldChange(key, value);
    const idx = questions.findIndex((q) => q.key === key);
    if (idx >= 0) {
      setRevealedCount(Math.max(revealedCount, idx + 2));
    }
  };

  const YesNo = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          !value
            ? "bg-[#6BCFCF] text-white"
            : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]"
        }`}
      >
        Non
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          value ? "bg-[#6BCFCF] text-white" : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]"
        }`}
      >
        Oui
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Addresses + date minimal */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#6BCFCF]" />
          <p className="text-sm font-semibold text-[#0F172A]">Votre trajet</p>
        </div>
        <AddressAutocomplete
          label={
            props.originCity
              ? `Votre adresse à ${props.originCity}${props.originPostalCode ? ` (${props.originPostalCode})` : ""}`
              : "Votre adresse de départ"
          }
          placeholder="10 rue de la Paix, Paris"
          inputId="v2-origin-address"
          initialValue={props.originAddress || ""}
          required
          contextPostalCode={props.originPostalCode || undefined}
          contextCity={props.originCity || undefined}
          contextCountryCode={(props.originCountryCode || "").trim() || undefined}
          validated={props.originLat != null && props.originLon != null}
          errorMessage={
            showValidation && !isOriginAddressValid ? "Adresse de départ requise" : null
          }
          onInputChange={(raw) => {
            props.onFieldChange("originAddress", raw);
          }}
          onSelect={(s) => {
            props.onFieldChange("originAddress", s.addressLine ?? s.label ?? "");
            props.onFieldChange("originCity", s.city ?? "");
            props.onFieldChange("originPostalCode", s.postalCode ?? "");
            props.onFieldChange("originCountryCode", (s.countryCode ?? "fr").toLowerCase());
            props.onFieldChange("originLat", s.lat ?? null);
            props.onFieldChange("originLon", s.lon ?? null);
          }}
        />
        <AddressAutocomplete
          label={
            props.destinationCity
              ? `Votre adresse à ${props.destinationCity}${
                  props.destinationPostalCode ? ` (${props.destinationPostalCode})` : ""
                }`
              : "Votre adresse d’arrivée"
          }
          placeholder="20 place Bellecour, Lyon"
          inputId="v2-destination-address"
          initialValue={
            props.destinationAddress || ""
          }
          required
          contextPostalCode={props.destinationPostalCode || undefined}
          contextCity={props.destinationCity || undefined}
          contextCountryCode={(props.destinationCountryCode || "").trim() || undefined}
          validated={props.destinationLat != null && props.destinationLon != null}
          errorMessage={
            showValidation && !isDestinationAddressValid ? "Adresse d’arrivée requise" : null
          }
          onInputChange={(raw) => {
            props.onFieldChange("destinationAddress", raw);
          }}
          onSelect={(s) => {
            props.onFieldChange("destinationAddress", s.addressLine ?? s.label ?? "");
            props.onFieldChange("destinationCity", s.city ?? "");
            props.onFieldChange("destinationPostalCode", s.postalCode ?? "");
            props.onFieldChange("destinationCountryCode", (s.countryCode ?? "fr").toLowerCase());
            props.onFieldChange("destinationLat", s.lat ?? null);
            props.onFieldChange("destinationLon", s.lon ?? null);
          }}
        />
        <div className="text-xs text-[#1E293B]/60">
          <span className="font-semibold">Distance route:</span>{" "}
          {isRouteDistanceValid ? (
            <>
              {Math.round(props.routeDistanceKm!)} km (OSRM)
            </>
          ) : (
            <>calcul en cours…</>
          )}
        </div>
        {showValidation && !isRouteDistanceValid && (
          <p className="text-sm font-medium text-[#EF4444]">
            Distance route requise (merci de sélectionner des adresses valides)
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#6BCFCF]" />
          <p className="text-sm font-semibold text-[#0F172A]">Date souhaitée</p>
        </div>
        <input
          id="v2-moving-date"
          type="date"
          value={props.movingDate}
          onChange={(e) => props.onFieldChange("movingDate", e.target.value)}
          min={minMovingDate}
          className={[
            "w-full rounded-xl border-2 px-4 py-3 text-base transition-all",
            showValidation && !isMovingDateValid
              ? "border-[#EF4444] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/15"
              : "border-[#E3E5E8] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20",
          ].join(" ")}
        />
        {showValidation && !isMovingDateValid && (
          <p className="text-sm font-medium text-[#EF4444]">
            Date requise (au moins J+15)
          </p>
        )}
        <label className="flex items-center gap-2 text-sm text-[#0F172A]">
          <input
            type="checkbox"
            checked={props.dateFlexible}
            onChange={(e) => props.onFieldChange("dateFlexible", e.target.checked)}
          />
          Je suis flexible (±1 semaine)
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-[#6BCFCF]" />
          <p className="text-sm font-semibold text-[#0F172A]">Accès départ & arrivée</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-[#E3E5E8] p-4 bg-white">
          <p className="text-base font-semibold text-[#0F172A]">
            Les accès départ & arrivée sont-ils simples ?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleAccessType("simple")}
              className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                props.access_type === "simple"
                  ? "bg-[#6BCFCF] text-white"
                  : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]"
              }`}
            >
              Oui, accès simple
            </button>
            <button
              type="button"
              onClick={() => handleAccessType("constrained")}
              className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                props.access_type === "constrained"
                  ? "bg-[#6BCFCF] text-white"
                  : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]"
              }`}
            >
              Non, accès contraint
            </button>
          </div>
          <p className="text-sm text-[#1E293B]/70">
            Par défaut, l’accès est considéré comme simple.
            <br />
            Départ et arrivée peuvent être différents : si l’un des deux est contraint, choisissez “accès contraint”.
            <br />
            Nous vous posons des questions uniquement si ce n’est pas le cas.
          </p>
        </div>

        {props.access_type === "constrained" && (
          <div className="space-y-3">
            {questions.map((q, idx) => {
              if (idx + 1 > revealedCount) return null;
              const value = answered[q.key];
              return (
                <div key={q.key} className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E5E8] bg-white p-3">
                  <p className="text-sm text-[#0F172A]">{q.label}</p>
                  <YesNo
                    value={!!value}
                    onChange={(v) => handleAnswer(q.key, v)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {props.access_type === "constrained" && (
          <div>
            <textarea
              value={props.access_details ?? ""}
              onChange={(e) => props.onFieldChange("access_details", e.target.value)}
              placeholder="Ex : arrivée uniquement (rue étroite), départ simple…"
              className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-sm"
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Options facultatives (services en plus) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="w-full flex items-center justify-between rounded-2xl border border-[#E3E5E8] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A]"
        >
          <span>Options supplémentaires (facultatif)</span>
          <span className="text-xs text-[#1E293B]/60">{showOptions ? "Masquer" : "Personnaliser"}</span>
        </button>

        {showOptions && (
          <div className="space-y-4 rounded-2xl border border-[#E3E5E8] bg-white p-4">
            <div className="space-y-3">
              {SERVICE_LABELS.map(({ key, label }) => {
                const value = props[key] as boolean;
                return (
                  <div key={String(key)} className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-[#0F172A]">{label}</p>
                    <YesNo
                      value={!!value}
                      onChange={(v) => props.onFieldChange(key as string, v)}
                    />
                  </div>
                );
              })}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">Précisions</p>
              <textarea
                value={props.specificNotes}
                onChange={(e) => props.onFieldChange("specificNotes", e.target.value)}
                placeholder="Ex : besoin d'emballage complet, objets fragiles, contraintes particulières..."
                rows={3}
                className="mt-2 w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-sm text-[#0F172A]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Contact (email obligatoire) */}
      <div className="space-y-3">
        <div className="rounded-2xl border border-[#E3E5E8] bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-[#0F172A]">Où recevoir vos devis ?</p>
          <p className="text-sm text-[#1E293B]/70">
            Dernière étape ensuite : vous envoyez vos photos pour recevoir vos devis.
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
                <User className="w-4 h-4 text-[#6BCFCF]" />
                Prénom (optionnel)
              </label>
              <input
                type="text"
                value={props.firstName}
                onChange={(e) => props.onFieldChange("firstName", e.target.value)}
                className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-base"
                placeholder="Votre prénom"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
                <Mail className="w-4 h-4 text-[#6BCFCF]" />
                Email (obligatoire)
              </label>
              <input
                id="v2-contact-email"
                type="email"
                value={props.email}
                onChange={(e) => props.onFieldChange("email", e.target.value)}
                className={[
                  "w-full rounded-xl border-2 px-4 py-3 text-base transition-all",
                  showValidation && !isEmailValid
                    ? "border-[#EF4444] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/15"
                    : "border-[#E3E5E8] focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20",
                ].join(" ")}
                placeholder="vous@email.fr"
                required
              />
              {showValidation && !isEmailValid && (
                <p className="text-sm font-medium text-[#EF4444]">Email requis</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
                <Phone className="w-4 h-4 text-[#6BCFCF]" />
                Téléphone (optionnel)
              </label>
              <input
                type="tel"
                value={props.phone}
                onChange={(e) => props.onFieldChange("phone", e.target.value)}
                className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-base"
                placeholder="+33 6..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pb-24 md:pb-0" />

      <div className="md:static fixed left-0 right-0 bottom-0 bg-white/95 backdrop-blur px-4 py-4 md:px-0 md:py-0">
        <button
          type="button"
          disabled={props.isSubmitting}
          onClick={props.onSubmit}
          className="w-full rounded-full bg-[#0F172A] text-white font-semibold py-4 text-base hover:bg-[#1E293B] transition-all"
        >
          {props.isSubmitting ? "Enregistrement..." : "Finaliser mon estimation"}
        </button>
        <p className="text-center text-sm text-[#1E293B]/70 mt-1">~30 sec restantes</p>
      </div>
    </div>
  );
}
