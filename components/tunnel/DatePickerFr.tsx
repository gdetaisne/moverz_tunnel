"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";

// ── Helpers ISO ──────────────────────────────────────────────────────────────

function parseIsoDate(value: string): Date | null {
  if (!value || value.length !== 10) return null;
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatFr(value: string): string {
  const dt = parseIsoDate(value);
  if (!dt) return "";
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function isBeforeIso(a: string, b: string): boolean {
  return a < b;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const MONTHS_FR_SHORT = [
  "Jan", "Fév", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];

const WEEKDAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

// Saisonnalité prix (aligné sur getSeasonFactor dans page.tsx)
// haute = mois chers (+30%), basse = mois pas chers (-15%)
type SeasonType = "haute" | "basse" | "normal";

function getMonthSeason(month1: number): SeasonType {
  if ([7, 8].includes(month1)) return "haute";           // Juillet, Août
  if ([1, 2, 3, 4, 11].includes(month1)) return "basse"; // Janv, Fév, Mars, Avr, Nov
  return "normal";
}

// ── Fonctions calendrier ─────────────────────────────────────────────────────

function startOfMonthUtc(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1));
}

function daysInMonthUtc(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function weekdayIndexMonFirstUtc(d: Date): number {
  const js = d.getUTCDay();
  return (js + 6) % 7;
}

// ── Composant ────────────────────────────────────────────────────────────────

export function DatePickerFr({
  id,
  value,
  onChange,
  min,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // "months" = sélection mois, "days" = sélection jour
  const [phase, setPhase] = useState<"months" | "days">("months");
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth0, setSelectedMonth0] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const minIso = (min || "").trim() || null;
  const minDate = minIso ? parseIsoDate(minIso) : null;

  // Quand on ouvre, reset à la bonne phase
  useEffect(() => {
    if (open) {
      if (value) {
        const dt = parseIsoDate(value);
        if (dt) {
          setSelectedYear(dt.getUTCFullYear());
          setSelectedMonth0(dt.getUTCMonth());
          setPhase("days");
          return;
        }
      }
      // Pas de valeur → commencer par les mois
      const base = minDate ?? new Date();
      setSelectedYear(base.getUTCFullYear());
      setSelectedMonth0(null);
      setPhase("months");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fermeture au clic extérieur
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // ── Grille des mois (12 mois à partir du mois min) ─────────────────────

  const monthOptions = useMemo(() => {
    const now = new Date();
    const startYear = minDate ? minDate.getUTCFullYear() : now.getFullYear();
    const startMonth0 = minDate ? minDate.getUTCMonth() : now.getMonth();

    const months: Array<{
      year: number;
      month0: number;
      month1: number;
      label: string;
      shortLabel: string;
      season: SeasonType;
      disabled: boolean;
    }> = [];

    for (let i = 0; i < 12; i++) {
      let m0 = startMonth0 + i;
      let y = startYear;
      while (m0 >= 12) { m0 -= 12; y += 1; }

      const month1 = m0 + 1;
      const lastDay = daysInMonthUtc(y, m0);
      const lastDayIso = toIsoDate(new Date(Date.UTC(y, m0, lastDay)));

      // Un mois est disabled si son dernier jour est avant le min
      const disabled = minIso ? isBeforeIso(lastDayIso, minIso) : false;

      months.push({
        year: y,
        month0: m0,
        month1,
        label: `${MONTHS_FR[m0]} ${y}`,
        shortLabel: MONTHS_FR_SHORT[m0],
        season: getMonthSeason(month1),
        disabled,
      });
    }
    return months;
  }, [minDate, minIso]);

  // ── Grille des jours (pour le mois sélectionné) ────────────────────────

  const dayGrid = useMemo(() => {
    if (selectedMonth0 === null) return null;

    const y = selectedYear;
    const m0 = selectedMonth0;
    const first = startOfMonthUtc(y, m0);
    const offset = weekdayIndexMonFirstUtc(first);
    const totalDays = daysInMonthUtc(y, m0);
    const cells: Array<{ day: number | null; iso: string | null }> = [];

    for (let i = 0; i < offset; i++) cells.push({ day: null, iso: null });
    for (let d = 1; d <= totalDays; d++) {
      const iso = toIsoDate(new Date(Date.UTC(y, m0, d)));
      cells.push({ day: d, iso });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });

    return { y, m0, cells };
  }, [selectedYear, selectedMonth0]);

  const canSelectDay = (iso: string) => {
    if (!minIso) return true;
    return !isBeforeIso(iso, minIso);
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIsoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  const displayValue = value ? formatFr(value) : "";

  // Couleur du mois sélectionné (pour le bouton)
  const selectedMonthSeason = value
    ? getMonthSeason(parseIsoDate(value)?.getUTCMonth()! + 1)
    : null;

  return (
    <div ref={rootRef} className="relative">
      {/* Bouton trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full rounded-xl border-2 bg-white px-4 py-3 text-left text-base transition-all",
          error
            ? "border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/15"
            : "border-[#E3E5E8] hover:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20",
        ].join(" ")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={displayValue ? "text-[#0F172A]" : "text-[#1E293B]/40"}>
          {displayValue || "Choisir un mois puis un jour"}
        </span>
      </button>

      {/* Input natif caché (accessibilité + formulaire) */}
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {open && (
        <div
          role="dialog"
          aria-label="Sélecteur de date"
          className="absolute z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#E3E5E8] bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        >
          {/* ═══ Phase 1 : Sélection du mois ═══ */}
          {phase === "months" && (
            <div>
              <p className="mb-3 text-sm font-semibold text-[#0F172A]">
                Choisissez le mois
              </p>

              <div className="grid grid-cols-3 gap-2">
                {monthOptions.map((mo) => {
                  const isSelected =
                    value &&
                    parseIsoDate(value)?.getUTCFullYear() === mo.year &&
                    parseIsoDate(value)?.getUTCMonth() === mo.month0;

                  // Couleurs selon saison
                  let bgClass: string;
                  let textClass: string;
                  let borderClass: string;

                  if (mo.disabled) {
                    bgClass = "bg-gray-50";
                    textClass = "text-gray-300";
                    borderClass = "border-gray-100";
                  } else if (isSelected) {
                    bgClass = "bg-[#6BCFCF]";
                    textClass = "text-white";
                    borderClass = "border-[#6BCFCF]";
                  } else if (mo.season === "haute") {
                    bgClass = "bg-red-50 hover:bg-red-100";
                    textClass = "text-red-700";
                    borderClass = "border-red-200";
                  } else if (mo.season === "basse") {
                    bgClass = "bg-green-50 hover:bg-green-100";
                    textClass = "text-green-700";
                    borderClass = "border-green-200";
                  } else {
                    bgClass = "bg-white hover:bg-[#F8F9FA]";
                    textClass = "text-[#0F172A]";
                    borderClass = "border-[#E3E5E8]";
                  }

                  return (
                    <button
                      key={`${mo.year}-${mo.month0}`}
                      type="button"
                      disabled={mo.disabled}
                      onClick={() => {
                        setSelectedYear(mo.year);
                        setSelectedMonth0(mo.month0);
                        setPhase("days");
                      }}
                      className={[
                        "flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-all",
                        mo.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                        bgClass,
                        textClass,
                        borderClass,
                      ].join(" ")}
                    >
                      <span className="text-sm font-semibold">{mo.shortLabel}</span>
                      <span className="text-[11px] opacity-70">{mo.year}</span>
                    </button>
                  );
                })}
              </div>

              {/* Légende */}
              <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-[#1E293B]/60">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-200" />
                  Moins cher
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-200" />
                  Plus cher
                </span>
              </div>
            </div>
          )}

          {/* ═══ Phase 2 : Sélection du jour ═══ */}
          {phase === "days" && dayGrid && (
            <div>
              {/* Header avec retour aux mois */}
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPhase("months")}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[#6BCFCF] hover:bg-[#F0FAFA] transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Mois
                </button>
                <div className="flex-1 text-center text-sm font-semibold text-[#0F172A]">
                  {MONTHS_FR[dayGrid.m0]} {dayGrid.y}
                </div>
              </div>

              {/* Badge saison */}
              {(() => {
                const season = getMonthSeason(dayGrid.m0 + 1);
                if (season === "haute")
                  return (
                    <div className="mb-3 rounded-lg bg-red-50 px-3 py-1.5 text-center text-xs font-medium text-red-600">
                      📈 Haute saison — tarifs majorés
                    </div>
                  );
                if (season === "basse")
                  return (
                    <div className="mb-3 rounded-lg bg-green-50 px-3 py-1.5 text-center text-xs font-medium text-green-600">
                      📉 Basse saison — tarifs réduits
                    </div>
                  );
                return null;
              })()}

              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 px-1 pb-1">
                {WEEKDAYS_FR.map((w, i) => (
                  <div
                    key={`${w}-${i}`}
                    className="text-center text-[11px] font-semibold text-[#1E293B]/60"
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Grille jours */}
              <div className="grid grid-cols-7 gap-1 px-1">
                {dayGrid.cells.map((c, idx) => {
                  if (!c.day || !c.iso) return <div key={idx} className="h-9" />;
                  const iso = c.iso;
                  const disabled = !canSelectDay(iso);
                  const isSelectedDay = value && iso === value;
                  const isToday = iso === todayIso;

                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      className={[
                        "h-9 rounded-lg text-sm font-semibold transition",
                        disabled
                          ? "text-[#1E293B]/30 cursor-not-allowed"
                          : "text-[#0F172A] hover:bg-[#F0FAFA] cursor-pointer",
                        isSelectedDay ? "bg-[#6BCFCF] text-white hover:bg-[#6BCFCF]" : "",
                        !isSelectedDay && isToday ? "border border-[#6BCFCF]/40" : "",
                      ].join(" ")}
                    >
                      {c.day}
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setPhase("months");
                  }}
                  className="text-sm font-semibold text-[#0F172A]/70 hover:text-[#0F172A]"
                >
                  Effacer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
