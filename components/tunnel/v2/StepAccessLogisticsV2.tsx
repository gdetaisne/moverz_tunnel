"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Home } from "lucide-react";
import { AddressAutocomplete } from "@/components/tunnel/AddressAutocomplete";

type QuestionKey = "narrow_access" | "long_carry" | "difficult_parking" | "lift_required";

interface StepAccessLogisticsV2Props {
  // addresses / logement
  originAddress: string;
  originPostalCode: string;
  originCity: string;
  destinationAddress: string;
  destinationPostalCode: string;
  destinationCity: string;
  originHousingType: string;
  destinationHousingType: string;
  movingDate: string;
  dateFlexible: boolean;
  onFieldChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  access_type: "simple" | "constrained";
  narrow_access: boolean;
  long_carry: boolean;
  difficult_parking: boolean;
  lift_required: boolean;
  access_details: string;
}

const questions: Array<{ key: QuestionKey; label: string }> = [
  { key: "narrow_access", label: "Petit ascenseur / passages étroits ?" },
  { key: "long_carry", label: "Portage > 10 m ?" },
  { key: "difficult_parking", label: "Stationnement compliqué ?" },
  { key: "lift_required", label: "Besoin d’un monte-meuble ?" },
];

export function StepAccessLogisticsV2(props: StepAccessLogisticsV2Props) {
  const [revealedCount, setRevealedCount] = useState(1);
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

  const anyYes =
    props.narrow_access || props.long_carry || props.difficult_parking || props.lift_required;

  const YesNo = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          !value
            ? "bg-white border-2 border-[#E3E5E8] text-[#0F172A]/70"
            : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]/70"
        }`}
      >
        Non
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          value ? "bg-[#0F172A] text-white" : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]"
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
          label="Adresse de départ"
          placeholder="10 rue de la Paix, Paris"
          inputId="v2-origin-address"
          initialValue={props.originAddress || [props.originPostalCode, props.originCity].join(" ")}
          onInputChange={(raw) => {
            props.onFieldChange("originAddress", raw);
          }}
          onSelect={(s) => {
            props.onFieldChange("originAddress", s.addressLine ?? s.label ?? "");
            props.onFieldChange("originCity", s.city ?? "");
            props.onFieldChange("originPostalCode", s.postalCode ?? "");
          }}
        />
        <AddressAutocomplete
          label="Adresse d’arrivée"
          placeholder="20 place Bellecour, Lyon"
          inputId="v2-destination-address"
          initialValue={
            props.destinationAddress || [props.destinationPostalCode, props.destinationCity].join(" ")
          }
          onInputChange={(raw) => {
            props.onFieldChange("destinationAddress", raw);
          }}
          onSelect={(s) => {
            props.onFieldChange("destinationAddress", s.addressLine ?? s.label ?? "");
            props.onFieldChange("destinationCity", s.city ?? "");
            props.onFieldChange("destinationPostalCode", s.postalCode ?? "");
          }}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#6BCFCF]" />
          <p className="text-sm font-semibold text-[#0F172A]">Date souhaitée</p>
        </div>
        <input
          type="date"
          value={props.movingDate}
          onChange={(e) => props.onFieldChange("movingDate", e.target.value)}
          className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-base"
        />
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
          <p className="text-sm font-semibold text-[#0F172A]">Accès</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-[#E3E5E8] p-4 bg-white">
          <p className="text-base font-semibold text-[#0F172A]">L’accès est-il simple ?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleAccessType("simple")}
              className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                props.access_type === "simple"
                  ? "bg-[#0F172A] text-white"
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
                  ? "bg-[#0F172A] text-white"
                  : "bg-white border-2 border-[#E3E5E8] text-[#0F172A]"
              }`}
            >
              Non, accès contraint
            </button>
          </div>
          <p className="text-sm text-[#1E293B]/70">
            Par défaut, l’accès est considéré comme simple.
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

        {props.access_type === "constrained" && anyYes && (
          <div>
            <textarea
              value={props.access_details ?? ""}
              onChange={(e) => props.onFieldChange("access_details", e.target.value)}
              placeholder="Ex : rue étroite, pas de place pour camion…"
              className="w-full rounded-xl border-2 border-[#E3E5E8] px-4 py-3 text-sm"
              rows={3}
            />
          </div>
        )}
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
