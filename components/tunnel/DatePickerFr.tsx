"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function parseIsoDate(value: string): Date | null {
  // value attendu: YYYY-MM-DD
  if (!value || value.length !== 10) return null;
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  // validation basique
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
  // dd/mm/yyyy
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function isBeforeIso(a: string, b: string): boolean {
  // ISO lexicographique OK
  return a < b;
}

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const WEEKDAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

function startOfMonthUtc(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1));
}

function addMonthsUtc(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

function daysInMonthUtc(year: number, month0: number): number {
  // dernier jour du mois: day 0 du mois suivant
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function weekdayIndexMonFirstUtc(d: Date): number {
  // JS: 0=Sun..6=Sat => convertir en 0=Mon..6=Sun
  const js = d.getUTCDay();
  return (js + 6) % 7;
}

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
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = parseIsoDate(value);
  const minIso = (min || "").trim() || null;

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = selected ?? (minIso ? parseIsoDate(minIso) : null) ?? new Date();
    return startOfMonthUtc(base.getUTCFullYear(), base.getUTCMonth());
  });

  // Sync view month when a valid date is set externally
  useEffect(() => {
    if (!selected) return;
    setViewMonth(startOfMonthUtc(selected.getUTCFullYear(), selected.getUTCMonth()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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

  const grid = useMemo(() => {
    const y = viewMonth.getUTCFullYear();
    const m0 = viewMonth.getUTCMonth();
    const first = startOfMonthUtc(y, m0);
    const offset = weekdayIndexMonFirstUtc(first);
    const totalDays = daysInMonthUtc(y, m0);
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, iso: null });
    for (let d = 1; d <= totalDays; d++) {
      const iso = toIsoDate(new Date(Date.UTC(y, m0, d)));
      cells.push({ day: d, iso });
    }
    // pad to full weeks (6 rows max)
    while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });
    return { y, m0, cells };
  }, [viewMonth]);

  const canSelect = (iso: string) => {
    if (!minIso) return true;
    return !isBeforeIso(iso, minIso);
  };

  const todayIso = toIsoDate(
    (() => {
      const now = new Date();
      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    })()
  );

  const displayValue = value ? formatFr(value) : "";

  return (
    <div ref={rootRef} className="relative">
      {/* Input visible (français) */}
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
          {displayValue || "JJ/MM/AAAA"}
        </span>
      </button>

      {/* Input natif conservé (pour compat + formulaire) */}
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
          className="absolute z-50 mt-2 w-[320px] max-w-full rounded-2xl border border-[#E3E5E8] bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center justify-between px-1 pb-2">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm font-semibold text-[#0F172A] hover:bg-[#F8F9FA]"
              onClick={() => setViewMonth((d) => addMonthsUtc(d, -1))}
              aria-label="Mois précédent"
            >
              ←
            </button>
            <div className="text-sm font-semibold text-[#0F172A]">
              {MONTHS_FR[grid.m0]} {grid.y}
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm font-semibold text-[#0F172A] hover:bg-[#F8F9FA]"
              onClick={() => setViewMonth((d) => addMonthsUtc(d, +1))}
              aria-label="Mois suivant"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-1 pb-1">
            {WEEKDAYS_FR.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-semibold text-[#1E293B]/60"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-1">
            {grid.cells.map((c, idx) => {
              if (!c.day || !c.iso) return <div key={idx} className="h-9" />;
              const disabled = !canSelect(c.iso);
              const selectedIso = value && c.iso === value;
              const isToday = c.iso === todayIso;
              return (
                <button
                  key={c.iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(c.iso);
                    setOpen(false);
                  }}
                  className={[
                    "h-9 rounded-lg text-sm font-semibold transition",
                    disabled ? "text-[#1E293B]/30" : "text-[#0F172A] hover:bg-[#F0FAFA]",
                    selectedIso ? "bg-[#6BCFCF] text-white hover:bg-[#6BCFCF]" : "",
                    !selectedIso && isToday ? "border border-[#6BCFCF]/40" : "",
                  ].join(" ")}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-sm font-semibold text-[#0F172A]/70 hover:text-[#0F172A]"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => {
                const iso = todayIso;
                if (minIso && isBeforeIso(iso, minIso)) {
                  onChange(minIso);
                } else {
                  onChange(iso);
                }
                setOpen(false);
              }}
              className="rounded-full bg-[#F8F9FA] px-3 py-1 text-sm font-semibold text-[#0F172A] hover:bg-[#F0FAFA]"
            >
              Aujourd’hui
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

