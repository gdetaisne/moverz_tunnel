"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DashboardData, JournalResult, JournalEvent, AbTestData, AbTestVariantData, FunnelCrossRow, SessionRow, SessionsResult } from "@/lib/analytics/neon";

// ============================================================
// Helpers
// ============================================================

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remainder = s % 60;
  return `${m}m ${remainder}s`;
}

function formatPct(n: number): string {
  return `${(n || 0).toFixed(1)}%`;
}

const STEP_ORDER = ["CONTACT", "PROJECT", "RECAP", "THANK_YOU"];

type PricingSimulatorHypotheses = {
  displayCenterBias: number;
  baselineDistanceBufferKm: number;
  step2Defaults: {
    density: string;
    kitchenIncluded: string;
    kitchenApplianceCount: number;
    extraVolumeM3: number;
    seasonFactor: number;
    originFloor: number;
    destinationFloor: number;
    originElevator: string;
    destinationElevator: string;
    longCarry: boolean;
    tightAccess: boolean;
    difficultParking: boolean;
    liftRequired: boolean;
  };
  decote: number;
  prixMinSocle: number;
  densityCoefficients: Record<string, number>;
  housingCoefficients: Record<string, number>;
  formuleMultipliersReference: Record<string, number>;
  servicesPricesEur: Record<string, number>;
  moverzFeeProvisionRule: string;
  accessRules: Record<string, unknown>;
};

type PricingSimulatorResponse = {
  input: {
    surfaceM2: number;
    distanceKm: number;
    formule: string;
    density: string;
    seasonFactor: number;
    originFloor: number;
    originElevator: string;
    destinationFloor: number;
    destinationElevator: string;
    longCarry: boolean;
    tightAccess: boolean;
    difficultParking: boolean;
    extraVolumeM3: number;
    services: {
      monteMeuble: boolean;
      piano: "droit" | "quart" | null;
      debarras: boolean;
    };
  };
  effectiveInput?: {
    surfaceM2: number;
    density: string;
    extraVolumeM3: number;
  };
  detailed: {
    raw: {
      volumeM3: number;
      distanceKm: number;
      prixBase: number;
      coeffEtage: number;
      prixAvecFormule: number;
      servicesTotal: number;
      prixMin: number;
      prixFinal: number;
      prixMax: number;
    };
    withProvision: {
      provisionEur: number;
      centerBeforeProvisionEur: number;
      centerAfterProvisionEur: number;
      prixMin: number;
      prixFinal: number;
      prixMax: number;
    };
    withProvisionAndAddons: {
      provisionEur: number;
      centerBeforeProvisionEur: number;
      centerAfterProvisionEur: number;
      prixMin: number;
      prixFinal: number;
      prixMax: number;
    };
    addons: {
      accessFixedAddonEur: number;
      objectsFixedAddonEur: number;
      totalFixedAddonsEur: number;
      accessSideCounts: {
        narrow_access: number;
        long_carry: number;
        difficult_parking: number;
        lift_required: number;
      };
      objects: {
        piano: boolean;
        coffreFort: boolean;
        aquarium: boolean;
        objetsFragilesVolumineux: boolean;
        meublesTresLourdsCount: number;
      };
      box: {
        originIsBox: boolean;
        destinationIsBox: boolean;
        originBoxVolumeM3: number | null;
        accessHousingRawDeltaEur: number;
        accessHousingBoxDiscountEur: number;
      };
    };
  };
  baseline: {
    prixMin: number;
    prixFinal: number;
    prixMax: number;
    moverzFeeProvisionEur: number;
    step2CenterBeforeProvisionEur: number;
    step2CenterAfterProvisionEur: number;
  };
};

// Block-level funnel order (V3a tunnel flow)
const BLOCK_ORDER = [
  "contact_info",
  "origin_address",
  "destination_address",
  "moving_date",
  "surface_volume",
  "formule",
  "options",
  "confirmation",
];

const BLOCK_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  contact_info:          { emoji: "📞", label: "Coordonnées",           color: "bg-blue-500" },
  origin_address:        { emoji: "🏠", label: "Adresse départ",        color: "bg-blue-600" },
  destination_address:   { emoji: "📍", label: "Adresse arrivée",       color: "bg-indigo-500" },
  moving_date:           { emoji: "📅", label: "Date déménagement",     color: "bg-indigo-600" },
  surface_volume:        { emoji: "📐", label: "Surface & volume",      color: "bg-purple-500" },
  formule:               { emoji: "⭐", label: "Formule",               color: "bg-purple-600" },
  options:               { emoji: "📝", label: "Options (services)",    color: "bg-pink-500" },
  confirmation:          { emoji: "🎉", label: "Confirmation",          color: "bg-green-600" },
};

const STEP_LABELS_EARLY: Record<string, string> = {
  CONTACT:  "📞 Coordonnées",
  PROJECT:  "🚛 Votre projet",
  RECAP:    "⭐ Formule & budget",
  THANK_YOU:"🎉 Dossier envoyé",
};

function sortFunnel(rows: { logical_step: string; sessions: number }[]) {
  return [...rows].sort(
    (a, b) =>
      STEP_ORDER.indexOf(a.logical_step) - STEP_ORDER.indexOf(b.logical_step)
  );
}

// ============================================================
// Auth gate (simple password)
// ============================================================

function PasswordGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  // Try saved password from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("analytics_pw");
    if (saved) onAuth(saved);
  }, [onAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-white text-center">🔒 Analytics</h1>
        <p className="text-gray-400 text-sm text-center">Mot de passe requis</p>
        <input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") onAuth(pw); }}
          className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:outline-none"
          placeholder="Mot de passe"
          autoFocus
        />
        {error && <p className="text-red-400 text-xs">Mot de passe incorrect</p>}
        <button
          onClick={() => onAuth(pw)}
          className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
        >
          Accéder
        </button>
      </div>
    </div>
  );
}

// ============================================================
// KPI Card
// ============================================================

function KpiCard({ label, value, sub, prev }: { label: string; value: string | number; sub?: string; prev?: string | number | null }) {
  const delta = (() => {
    if (prev == null) return null;
    const cur = typeof value === "string" ? parseFloat(value) : value;
    const prv = typeof prev === "string" ? parseFloat(prev) : prev;
    if (isNaN(cur) || isNaN(prv)) return null;
    if (prv === 0) return cur > 0 ? { pct: "+∞", positive: true } : { pct: "—", positive: null };
    const pctChange = ((cur - prv) / Math.abs(prv)) * 100;
    const sign = pctChange >= 0 ? "+" : "";
    return { pct: `${sign}${pctChange.toFixed(1)}%`, positive: pctChange >= 0 };
  })();

  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-white">{value}</p>
        {delta && (
          <span className={`text-xs font-semibold pb-0.5 ${delta.positive === true ? "text-green-400" : delta.positive === false ? "text-red-400" : "text-gray-500"}`}>
            {delta.pct}
          </span>
        )}
      </div>
      {prev != null && (
        <p className="text-gray-600 text-[10px] mt-1">Période préc. : {prev}</p>
      )}
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ============================================================
// Funnel bar
// ============================================================

function FunnelBar({ step, sessions, maxSessions, prevSessions }: { step: string; sessions: number; maxSessions: number; prevSessions?: number }) {
  const pct = maxSessions > 0 ? (sessions / maxSessions) * 100 : 0;
  const colors: Record<string, string> = {
    ENTRY: "bg-blue-500",
    PROJECT: "bg-purple-500",
    RECAP: "bg-indigo-500",
    CONTACT: "bg-pink-500",
    THANK_YOU: "bg-green-500",
  };

  const delta = prevSessions != null && prevSessions > 0
    ? ((sessions - prevSessions) / prevSessions * 100).toFixed(1)
    : null;
  const deltaPositive = delta != null ? Number(delta) >= 0 : null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-xs w-32 text-right">{STEP_LABELS_EARLY[step] || step}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
        <div
          className={`h-full ${colors[step] || "bg-gray-500"} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          <span className="text-white text-xs font-semibold">{sessions}</span>
        </div>
      </div>
      {delta != null && (
        <span className={`text-[11px] font-semibold w-16 text-right flex-shrink-0 ${deltaPositive ? "text-green-400" : "text-red-400"}`}>
          {deltaPositive ? "+" : ""}{delta}%
        </span>
      )}
    </div>
  );
}

// ============================================================
// Table component
// ============================================================

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {headers.map((h) => (
              <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium text-xs uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              {row.map((cell, j) => (
                <td key={j} className="py-2 px-3 text-gray-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Mini bar chart (daily)
// ============================================================

function DailyChart({ data }: { data: { day: string; sessions: number; completions: number; conversion_rate: number }[] }) {
  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => {
        const h = (d.sessions / maxSessions) * 100;
        const hComp = (d.completions / maxSessions) * 100;
        const dayLabel = d.day ? new Date(d.day).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "?";
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="w-full flex flex-col items-center justify-end" style={{ height: "100px" }}>
              <div
                className="w-full bg-purple-500/30 rounded-t relative"
                style={{ height: `${Math.max(h, 2)}%` }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t"
                  style={{ height: `${hComp > 0 ? Math.max((hComp / h) * 100, 5) : 0}%` }}
                />
              </div>
            </div>
            <span className="text-[9px] text-gray-500 rotate-[-45deg] origin-center">{dayLabel}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded-lg shadow-lg whitespace-nowrap z-10">
              <p>{dayLabel}: {d.sessions} sessions</p>
              <p>{d.completions} conversions ({d.conversion_rate}%)</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Device/Country pie-like display
// ============================================================

function BreakdownBars({ items, colorClass }: { items: { label: string; pct: number; count: number }[]; colorClass: string }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-gray-400 text-xs w-20 text-right truncate">{item.label}</span>
          <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded-full`}
              style={{ width: `${Math.max(item.pct, 1)}%` }}
            />
          </div>
          <span className="text-gray-400 text-xs w-16 text-right">{item.count} ({item.pct}%)</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Versions (localStorage)
// ============================================================

interface AnalyticsVersion {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
}

const VERSIONS_STORAGE_KEY = "analytics_versions";

function loadVersions(): AnalyticsVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VERSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v: any) => v && typeof v.id === "string" && typeof v.name === "string" && typeof v.startDate === "string"
    );
  } catch {
    return [];
  }
}

function saveVersions(versions: AnalyticsVersion[]) {
  localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(versions));
}

function getVersionDateRange(
  versionId: string,
  versions: AnalyticsVersion[]
): { from: string; to: string } | null {
  const sorted = [...versions].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const idx = sorted.findIndex((v) => v.id === versionId);
  if (idx === -1) return null;
  const from = sorted[idx].startDate + "T00:00:00+01:00";
  const to =
    idx < sorted.length - 1
      ? sorted[idx + 1].startDate + "T00:00:00+01:00"
      : new Date().toISOString();
  return { from, to };
}

// ============================================================
// Main Dashboard
// ============================================================

type DatePreset = "today" | "yesterday" | "3days" | "15days" | "custom" | `version:${string}`;

function getDateRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
  versions?: AnalyticsVersion[]
): { from: string; to: string } {
  if (preset.startsWith("version:") && versions) {
    const vId = preset.slice("version:".length);
    const range = getVersionDateRange(vId, versions);
    if (range) return range;
  }

  const nowParis = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const todayStr = `${nowParis.getFullYear()}-${String(nowParis.getMonth() + 1).padStart(2, "0")}-${String(nowParis.getDate()).padStart(2, "0")}`;

  const addDays = (dateStr: string, d: number) => {
    const dt = new Date(dateStr + "T00:00:00+01:00");
    dt.setDate(dt.getDate() + d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };

  switch (preset) {
    case "today":
      return { from: todayStr + "T00:00:00+01:00", to: new Date().toISOString() };
    case "yesterday": {
      const y = addDays(todayStr, -1);
      return { from: y + "T00:00:00+01:00", to: todayStr + "T00:00:00+01:00" };
    }
    case "3days": {
      const d = addDays(todayStr, -2);
      return { from: d + "T00:00:00+01:00", to: new Date().toISOString() };
    }
    case "15days": {
      const d = addDays(todayStr, -14);
      return { from: d + "T00:00:00+01:00", to: new Date().toISOString() };
    }
    case "custom":
      return {
        from: customFrom ? customFrom + "T00:00:00+01:00" : new Date().toISOString(),
        to: customTo ? customTo + "T23:59:59+01:00" : new Date().toISOString(),
      };
    default:
      return { from: new Date().toISOString(), to: new Date().toISOString() };
  }
}

function getComparisonRange(
  preset: DatePreset,
  analysisFrom: string,
  analysisTo: string,
  compareCustomFrom: string,
  compareCustomTo: string,
): { from: string; to: string } {
  if (preset === "custom") {
    return {
      from: compareCustomFrom ? compareCustomFrom + "T00:00:00+01:00" : analysisFrom,
      to: compareCustomTo ? compareCustomTo + "T23:59:59+01:00" : analysisTo,
    };
  }
  const fromMs = new Date(analysisFrom).getTime();
  const toMs = new Date(analysisTo).getTime();
  const durationMs = toMs - fromMs;
  const compTo = new Date(fromMs).toISOString();
  const compFrom = new Date(fromMs - durationMs).toISOString();
  return { from: compFrom, to: compTo };
}

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  "3days": "3 derniers jours",
  "15days": "15 derniers jours",
  custom: "Personnalisé",
};

function Dashboard({ password }: { password: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [compareData, setCompareData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>("yesterday");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [comparing, setComparing] = useState(false);
  const [compareCustomFrom, setCompareCustomFrom] = useState("");
  const [compareCustomTo, setCompareCustomTo] = useState("");
  const [blockDeviceSplit, setBlockDeviceSplit] = useState(false);
  const [blockAbSplit, setBlockAbSplit] = useState(false);
  const [blockEntryFilter, setBlockEntryFilter] = useState<string>("all");
  const [funnelDeviceSplit, setFunnelDeviceSplit] = useState(false);
  const [funnelAbSplit, setFunnelAbSplit] = useState(false);
  const [versions, setVersions] = useState<AnalyticsVersion[]>([]);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDate, setNewVersionDate] = useState("");

  useEffect(() => {
    setVersions(loadVersions());
  }, []);

  const fetchDashboard = useCallback(async (from: string, to: string): Promise<DashboardData | null> => {
    const res = await fetch(
      `/api/analytics/dashboard?password=${encodeURIComponent(password)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&includeTests=false`
    );
    if (res.status === 401) {
      setError("Mot de passe incorrect");
      sessionStorage.removeItem("analytics_pw");
      return null;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Erreur serveur");
      return null;
    }
    sessionStorage.setItem("analytics_pw", password);
    return res.json();
  }, [password]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getDateRange(preset, customFrom, customTo, versions);
      const mainData = await fetchDashboard(from, to);
      if (!mainData) return;
      setData(mainData);

      if (comparing) {
        const compRange = getComparisonRange(preset, from, to, compareCustomFrom, compareCustomTo);
        if (preset === "custom" && (!compareCustomFrom || !compareCustomTo)) {
          setCompareData(null);
        } else {
          const compData = await fetchDashboard(compRange.from, compRange.to);
          setCompareData(compData);
        }
      } else {
        setCompareData(null);
      }
    } catch (e) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [password, preset, customFrom, customTo, comparing, compareCustomFrom, compareCustomTo, fetchDashboard, versions]);

  useEffect(() => {
    if (preset === "custom" && (!customFrom || !customTo)) return;
    fetchData();
  }, [fetchData, preset, customFrom, customTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400 text-lg animate-pulse">Chargement analytics…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-red-900/30 text-red-300 p-6 rounded-xl">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const funnel = sortFunnel(data.funnel);
  const maxFunnel = Math.max(...funnel.map((f) => f.sessions), 1);

  // Funnel cross helpers (step × device)
  const getFunnelByDevice = (device?: string): { logical_step: string; sessions: number }[] => {
    const cross: FunnelCrossRow[] = data.funnelCross || [];
    const filtered = device ? cross.filter(r => r.device === device) : cross;
    const agg = new Map<string, number>();
    for (const r of filtered) agg.set(r.logical_step, (agg.get(r.logical_step) ?? 0) + r.sessions);
    return sortFunnel(STEP_ORDER.map(step => ({ logical_step: step, sessions: agg.get(step) ?? 0 })));
  };
  const funnelMobile = getFunnelByDevice('mobile');
  const funnelDesktop = getFunnelByDevice('desktop');
  const funnelSplitMax = Math.max(
    ...funnelMobile.map(f => f.sessions),
    ...funnelDesktop.map(f => f.sessions),
    1
  );
  const funnelDeviceCounts = { mobile: 0, desktop: 0 };
  for (const r of (data.funnelCross || [])) {
    if (r.logical_step === STEP_ORDER[0]) {
      if (r.device === 'mobile') funnelDeviceCounts.mobile += r.sessions;
      else if (r.device === 'desktop') funnelDeviceCounts.desktop += r.sessions;
    }
  }

  // Funnel split A/B helpers
  const getFunnelByVariant = (variant: string): { logical_step: string; sessions: number }[] => {
    const rows = (data.funnelVariant || []).filter(r => r.variant === variant);
    const agg = new Map<string, number>();
    for (const r of rows) agg.set(r.logical_step, (agg.get(r.logical_step) ?? 0) + r.sessions);
    return sortFunnel(STEP_ORDER.map(step => ({ logical_step: step, sessions: agg.get(step) ?? 0 })));
  };
  const funnelA = getFunnelByVariant('A');
  const funnelB = getFunnelByVariant('B');
  const funnelAbSplitMax = Math.max(
    ...funnelA.map(f => f.sessions),
    ...funnelB.map(f => f.sessions),
    1
  );
  const funnelAbCounts = { A: 0, B: 0 };
  for (const r of (data.funnelVariant || [])) {
    if (r.logical_step === STEP_ORDER[0]) {
      if (r.variant === 'A') funnelAbCounts.A += r.sessions;
      else if (r.variant === 'B') funnelAbCounts.B += r.sessions;
    }
  }

  const compareFunnelMap: Record<string, number> = {};
  if (compareData) {
    for (const f of compareData.funnel) compareFunnelMap[f.logical_step] = f.sessions;
  }

  const compareBlockMap: Record<string, number> = {};
  if (compareData?.blockFunnel) {
    for (const b of compareData.blockFunnel) compareBlockMap[b.block_id] = b.sessions;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">📊 Tunnel Analytics</h1>
              <p className="text-gray-400 text-sm">
                {new Date(data.periodStart).toLocaleDateString("fr-FR")} → {new Date(data.periodEnd).toLocaleDateString("fr-FR")}
                {comparing && compareData && (
                  <span className="text-gray-600 ml-2">
                    vs {new Date(compareData.periodStart).toLocaleDateString("fr-FR")} → {new Date(compareData.periodEnd).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as DatePreset)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {(Object.keys(PRESET_LABELS) as (keyof typeof PRESET_LABELS)[]).map((k) => (
                  <option key={k} value={k}>{PRESET_LABELS[k]}</option>
                ))}
                {versions.length > 0 && (
                  <optgroup label="Versions">
                    {[...versions]
                      .sort((a, b) => b.startDate.localeCompare(a.startDate))
                      .map((v) => (
                        <option key={v.id} value={`version:${v.id}`}>
                          {v.name} ({v.startDate.slice(5).replace("-", "/")})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              {preset === "custom" && (
                <>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  />
                  <span className="text-gray-500 text-sm">→</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  />
                </>
              )}
              <button
                onClick={() => setComparing((v) => !v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  comparing
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {comparing ? "✕ Comparaison" : "⇄ Comparer"}
              </button>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setNewVersionDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
                  setNewVersionName("");
                  setShowVersionForm(true);
                }}
                className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 hover:text-white transition"
                title="Nouvelle version"
              >
                + Version
              </button>
              {versions.length > 0 && (
                <button
                  onClick={() => setShowVersionManager((v) => !v)}
                  className="px-2 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 hover:text-white transition"
                  title="Gérer les versions"
                >
                  ✎
                </button>
              )}
            </div>
          </div>

          {comparing && preset === "custom" && (
            <div className="flex items-center gap-3 flex-wrap pl-0 sm:pl-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Comparaison :</span>
              <input
                type="date"
                value={compareCustomFrom}
                onChange={(e) => setCompareCustomFrom(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-500 text-sm">→</span>
              <input
                type="date"
                value={compareCustomTo}
                onChange={(e) => setCompareCustomTo(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {showVersionForm && (
            <div className="flex items-center gap-3 flex-wrap pl-0 sm:pl-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Nouvelle version :</span>
              <input
                type="text"
                placeholder="Nom (ex: v4.3 — Cart redesign)"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm w-64"
                autoFocus
              />
              <input
                type="date"
                value={newVersionDate}
                onChange={(e) => setNewVersionDate(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  if (!newVersionName.trim() || !newVersionDate) return;
                  const v: AnalyticsVersion = {
                    id: crypto.randomUUID(),
                    name: newVersionName.trim(),
                    startDate: newVersionDate,
                  };
                  const updated = [...versions, v];
                  setVersions(updated);
                  saveVersions(updated);
                  setShowVersionForm(false);
                  setPreset(`version:${v.id}`);
                }}
                disabled={!newVersionName.trim() || !newVersionDate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowVersionForm(false)}
                className="px-3 py-2 text-gray-400 hover:text-white text-sm transition"
              >
                ✕
              </button>
            </div>
          )}

          {showVersionManager && versions.length > 0 && (
            <div className="border border-gray-700 rounded-lg p-3 space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Gérer les versions</div>
              {[...versions]
                .sort((a, b) => b.startDate.localeCompare(a.startDate))
                .map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-300">
                      <span className="font-medium text-white">{v.name}</span>
                      <span className="text-gray-500 ml-2">depuis {v.startDate}</span>
                    </span>
                    <button
                      onClick={() => {
                        const updated = versions.filter((x) => x.id !== v.id);
                        setVersions(updated);
                        saveVersions(updated);
                        if (preset === `version:${v.id}`) setPreset("yesterday");
                      }}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-gray-800 transition"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              <button
                onClick={() => setShowVersionManager(false)}
                className="text-gray-500 hover:text-gray-300 text-xs mt-1 transition"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Sessions" value={data.totalSessions} prev={compareData?.totalSessions ?? undefined} />
          <KpiCard label="Conversions" value={data.totalCompletions} prev={compareData?.totalCompletions ?? undefined} />
          <KpiCard label="Taux conversion" value={formatPct(data.conversionRate)} prev={compareData ? formatPct(compareData.conversionRate) : undefined} />
          <KpiCard label="Durée moyenne" value={formatDuration(data.avgDurationMs)} prev={compareData ? formatDuration(compareData.avgDurationMs) : undefined} />
        </div>

        {/* Daily trend */}
        {data.daily.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">📈 Tendance quotidienne</h2>
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500/30 rounded" /> Sessions</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Conversions</span>
            </div>
            <DailyChart data={data.daily} />
          </div>
        )}

        {/* Funnel */}
        {funnel.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-300">🔻 Funnel par étape</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setFunnelDeviceSplit(false); setFunnelAbSplit(false); }}
                  className={`px-2.5 py-1 text-[11px] rounded-lg transition ${
                    !funnelDeviceSplit && !funnelAbSplit ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => { setFunnelDeviceSplit(true); setFunnelAbSplit(false); }}
                  className={`px-2.5 py-1 text-[11px] rounded-lg transition ${
                    funnelDeviceSplit ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Split mobile / desktop
                </button>
                <button
                  onClick={() => { setFunnelAbSplit(true); setFunnelDeviceSplit(false); }}
                  className={`px-2.5 py-1 text-[11px] rounded-lg transition ${
                    funnelAbSplit ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Split A/B
                </button>
              </div>
            </div>

            {!funnelDeviceSplit && !funnelAbSplit ? (
              /* Vue agrégée */
              <div className="space-y-3">
                {funnel.map((f) => (
                  <FunnelBar
                    key={f.logical_step}
                    step={f.logical_step}
                    sessions={f.sessions}
                    maxSessions={maxFunnel}
                    prevSessions={compareFunnelMap[f.logical_step]}
                  />
                ))}
              </div>
            ) : funnelDeviceSplit ? (
              /* Vue split mobile / desktop */
              <div className="flex gap-4">
                {/* Labels */}
                <div className="flex-shrink-0 space-y-3 pt-0">
                  {funnel.map(f => (
                    <div key={f.logical_step} className="h-6 flex items-center justify-end">
                      <span className="text-gray-400 text-xs text-right w-28 truncate">
                        {STEP_LABELS_EARLY[f.logical_step] || f.logical_step}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Mobile */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-blue-400 font-semibold mb-1.5">
                    📱 Mobile{funnelDeviceCounts.mobile ? ` (${funnelDeviceCounts.mobile})` : ''}
                  </p>
                  <div className="space-y-3">
                    {funnelMobile.map((f, i) => {
                      const prev = funnelMobile[i - 1];
                      const pct = funnelSplitMax > 0 ? (f.sessions / funnelSplitMax) * 100 : 0;
                      const dropoff = prev && prev.sessions > 0
                        ? ((prev.sessions - f.sessions) / prev.sessions * 100).toFixed(1)
                        : null;
                      const colors: Record<string, string> = {
                        CONTACT: "bg-pink-500", PROJECT: "bg-purple-500",
                        RECAP: "bg-indigo-500", THANK_YOU: "bg-green-500",
                      };
                      return (
                        <div key={f.logical_step} className="flex items-center gap-1.5">
                          {dropoff && <span className="text-red-400 text-[10px] w-10 text-right flex-shrink-0">-{dropoff}%</span>}
                          {!dropoff && <span className="w-10 flex-shrink-0" />}
                          <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full ${colors[f.logical_step] || 'bg-gray-500'} rounded-full transition-all duration-500 flex items-center justify-end pr-1.5`}
                              style={{ width: `${Math.max(pct, f.sessions > 0 ? 8 : 2)}%` }}
                            >
                              <span className="text-white text-[10px] font-semibold">{f.sessions}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Desktop */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-orange-400 font-semibold mb-1.5">
                    🖥️ Desktop{funnelDeviceCounts.desktop ? ` (${funnelDeviceCounts.desktop})` : ''}
                  </p>
                  <div className="space-y-3">
                    {funnelDesktop.map((f, i) => {
                      const prev = funnelDesktop[i - 1];
                      const pct = funnelSplitMax > 0 ? (f.sessions / funnelSplitMax) * 100 : 0;
                      const dropoff = prev && prev.sessions > 0
                        ? ((prev.sessions - f.sessions) / prev.sessions * 100).toFixed(1)
                        : null;
                      const colors: Record<string, string> = {
                        CONTACT: "bg-pink-500", PROJECT: "bg-purple-500",
                        RECAP: "bg-indigo-500", THANK_YOU: "bg-green-500",
                      };
                      return (
                        <div key={f.logical_step} className="flex items-center gap-1.5">
                          {dropoff && <span className="text-red-400 text-[10px] w-10 text-right flex-shrink-0">-{dropoff}%</span>}
                          {!dropoff && <span className="w-10 flex-shrink-0" />}
                          <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full ${colors[f.logical_step] || 'bg-gray-500'} rounded-full transition-all duration-500 flex items-center justify-end pr-1.5`}
                              style={{ width: `${Math.max(pct, f.sessions > 0 ? 8 : 2)}%` }}
                            >
                              <span className="text-white text-[10px] font-semibold">{f.sessions}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Vue split A/B */
              <div className="flex gap-4">
                {/* Labels */}
                <div className="flex-shrink-0 space-y-3 pt-0">
                  {funnel.map(f => (
                    <div key={f.logical_step} className="h-6 flex items-center justify-end">
                      <span className="text-gray-400 text-xs text-right w-28 truncate">
                        {STEP_LABELS_EARLY[f.logical_step] || f.logical_step}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Variante A */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-blue-400 font-semibold mb-1.5">
                    🅰 Variante A{funnelAbCounts.A ? ` (${funnelAbCounts.A})` : ''}
                  </p>
                  <div className="space-y-3">
                    {funnelA.map((f, i) => {
                      const prev = funnelA[i - 1];
                      const pct = funnelAbSplitMax > 0 ? (f.sessions / funnelAbSplitMax) * 100 : 0;
                      const dropoff = prev && prev.sessions > 0
                        ? ((prev.sessions - f.sessions) / prev.sessions * 100).toFixed(1)
                        : null;
                      const colors: Record<string, string> = {
                        CONTACT: "bg-pink-500", PROJECT: "bg-purple-500",
                        RECAP: "bg-indigo-500", THANK_YOU: "bg-green-500",
                      };
                      return (
                        <div key={f.logical_step} className="flex items-center gap-1.5">
                          {dropoff && <span className="text-red-400 text-[10px] w-10 text-right flex-shrink-0">-{dropoff}%</span>}
                          {!dropoff && <span className="w-10 flex-shrink-0" />}
                          <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full ${colors[f.logical_step] || 'bg-gray-500'} rounded-full transition-all duration-500 flex items-center justify-end pr-1.5`}
                              style={{ width: `${Math.max(pct, f.sessions > 0 ? 8 : 2)}%` }}
                            >
                              <span className="text-white text-[10px] font-semibold">{f.sessions}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Variante B */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-purple-400 font-semibold mb-1.5">
                    🅱 Variante B{funnelAbCounts.B ? ` (${funnelAbCounts.B})` : ''}
                  </p>
                  <div className="space-y-3">
                    {funnelB.map((f, i) => {
                      const prev = funnelB[i - 1];
                      const pct = funnelAbSplitMax > 0 ? (f.sessions / funnelAbSplitMax) * 100 : 0;
                      const dropoff = prev && prev.sessions > 0
                        ? ((prev.sessions - f.sessions) / prev.sessions * 100).toFixed(1)
                        : null;
                      const colors: Record<string, string> = {
                        CONTACT: "bg-pink-500", PROJECT: "bg-purple-500",
                        RECAP: "bg-indigo-500", THANK_YOU: "bg-green-500",
                      };
                      return (
                        <div key={f.logical_step} className="flex items-center gap-1.5">
                          {dropoff && <span className="text-red-400 text-[10px] w-10 text-right flex-shrink-0">-{dropoff}%</span>}
                          {!dropoff && <span className="w-10 flex-shrink-0" />}
                          <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full ${colors[f.logical_step] || 'bg-gray-500'} rounded-full transition-all duration-500 flex items-center justify-end pr-1.5`}
                              style={{ width: `${Math.max(pct, f.sessions > 0 ? 8 : 2)}%` }}
                            >
                              <span className="text-white text-[10px] font-semibold">{f.sessions}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Drop-off rates */}
            {funnel.length >= 2 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Drop-off entre étapes :</p>
                <div className="flex flex-wrap gap-2">
                  {funnel.slice(1).map((f, i) => {
                    const prev = funnel[i].sessions;
                    const dropoff = prev > 0 ? ((prev - f.sessions) / prev * 100).toFixed(1) : "—";
                    return (
                      <span key={f.logical_step} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                        {STEP_LABELS_EARLY[funnel[i].logical_step] || funnel[i].logical_step} → {STEP_LABELS_EARLY[f.logical_step] || f.logical_step}: <span className="text-red-400">-{dropoff}%</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Block-level funnel (detailed) */}
        {data.blockFunnel && data.blockFunnel.length > 0 && (() => {
          // Helper: build sorted blocks array from raw funnel data
          const buildBlocks = (raw: { block_id: string; sessions: number }[]) => {
            const map = new Map(raw.map(b => [b.block_id, b.sessions]));
            return BLOCK_ORDER.map(id => ({ block_id: id, sessions: map.get(id) ?? 0 }));
          };

          // Helper: aggregate cross data with filters
          const aggCross = (deviceFilter?: string) => {
            if (!data.blockFunnelCross?.length) return data.blockFunnel;
            let filtered = data.blockFunnelCross;
            if (deviceFilter) filtered = filtered.filter(r => r.device === deviceFilter);
            if (blockEntryFilter !== 'all') filtered = filtered.filter(r => r.entry_type === blockEntryFilter);
            const agg = new Map<string, number>();
            for (const r of filtered) agg.set(r.block_id, (agg.get(r.block_id) ?? 0) + r.sessions);
            return Array.from(agg.entries()).map(([block_id, sessions]) => ({ block_id, sessions }));
          };

          // Entry counts for filter labels
          let directCount = 0, homeCount = 0;
          const deviceCounts: Record<string, number> = {};
          if (data.blockFunnelCross?.length) {
            const entryBlocks = new Map<string, number>();
            const devBlocks = new Map<string, number>();
            for (const r of data.blockFunnelCross) {
              const ek = `${r.entry_type}|${r.block_id}`;
              entryBlocks.set(ek, (entryBlocks.get(ek) ?? 0) + r.sessions);
              const dk = `${r.device}|${r.block_id}`;
              devBlocks.set(dk, (devBlocks.get(dk) ?? 0) + r.sessions);
            }
            for (const [key, s] of entryBlocks) {
              const et = key.split('|')[0];
              if (et === 'direct') directCount = Math.max(directCount, s);
              else homeCount = Math.max(homeCount, s);
            }
            for (const [key, s] of devBlocks) {
              const dev = key.split('|')[0];
              deviceCounts[dev] = Math.max(deviceCounts[dev] ?? 0, s);
            }
          }

          // Build duration map
          const durationMap: Record<string, { median: number; avg: number; p90: number }> = {};
          (data.blockDurations || []).forEach((d) => {
            durationMap[d.block_id] = { median: d.median_duration_ms, avg: d.avg_duration_ms, p90: d.p90_duration_ms };
          });

          // Prepare data for each view mode
          const allBlocks = buildBlocks(blockEntryFilter !== 'all' ? aggCross() : data.blockFunnel);
          const mobileBlocks = buildBlocks(aggCross('mobile'));
          const desktopBlocks = buildBlocks(aggCross('desktop'));

          // A/B split blocks
          const aggVariant = (variant: string) => {
            if (!data.blockFunnelVariant?.length) return data.blockFunnel;
            const filtered = data.blockFunnelVariant.filter(r => r.variant === variant);
            const agg = new Map<string, number>();
            for (const r of filtered) agg.set(r.block_id, (agg.get(r.block_id) ?? 0) + r.sessions);
            return Array.from(agg.entries()).map(([block_id, sessions]) => ({ block_id, sessions }));
          };
          const aBlocks = buildBlocks(aggVariant('A'));
          const bBlocks = buildBlocks(aggVariant('B'));
          const abVariantCounts: Record<string, number> = {};
          for (const r of (data.blockFunnelVariant || [])) {
            if (r.block_id === 'contact_info') abVariantCounts[r.variant] = (abVariantCounts[r.variant] ?? 0) + r.sessions;
          }
          const abSplitMax = Math.max(...aBlocks.map(b => b.sessions), ...bBlocks.map(b => b.sessions), 1);

          // Render a single funnel column
          const renderFunnel = (blocks: { block_id: string; sessions: number }[], maxSess: number, compact?: boolean) => (
            <div className="space-y-1.5">
              {blocks.map((b, i) => {
                const info = BLOCK_LABELS[b.block_id] || { emoji: "•", label: b.block_id, color: "bg-gray-500" };
                const pct = maxSess > 0 ? (b.sessions / maxSess) * 100 : 0;
                const dur = durationMap[b.block_id];
                const prev = blocks[i - 1];
                const dropoff = prev && prev.sessions > 0
                  ? ((prev.sessions - b.sessions) / prev.sessions * 100).toFixed(1)
                  : null;
                const compSessions = compareBlockMap[b.block_id];
                const compDelta = compSessions != null && compSessions > 0
                  ? ((b.sessions - compSessions) / compSessions * 100).toFixed(1)
                  : null;
                const compPositive = compDelta != null ? Number(compDelta) >= 0 : null;

                return (
                  <div key={b.block_id} className="flex items-center gap-2">
                    {!compact && (
                      <span className="text-gray-400 text-[11px] w-44 text-right truncate flex-shrink-0">
                        {info.emoji} {info.label}
                      </span>
                    )}
                    <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden relative min-w-0">
                      <div
                        className={`h-full ${info.color} rounded-full transition-all duration-500 flex items-center justify-end pr-1.5`}
                        style={{ width: `${Math.max(pct, b.sessions > 0 ? 8 : 2)}%` }}
                      >
                        <span className="text-white text-[10px] font-semibold">{b.sessions}</span>
                      </div>
                    </div>
                    {!compact && dur ? (
                      <span className="text-[10px] text-gray-400 w-16 text-right flex-shrink-0" title={`Méd: ${formatDuration(dur.median)} | Moy: ${formatDuration(dur.avg)} | P90: ${formatDuration(dur.p90)}`}>
                        ⏱ {formatDuration(dur.median)}
                      </span>
                    ) : !compact ? (
                      <span className="text-[10px] text-gray-600 w-16 text-right flex-shrink-0">—</span>
                    ) : null}
                    <span className={`text-[10px] w-12 text-right flex-shrink-0 ${dropoff && Number(dropoff) > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                      {dropoff && Number(dropoff) > 0 ? `-${dropoff}%` : '—'}
                    </span>
                    {!compact && compDelta != null && (
                      <span className={`text-[10px] font-semibold w-14 text-right flex-shrink-0 ${compPositive ? "text-green-400" : "text-red-400"}`}>
                        {compPositive ? "+" : ""}{compDelta}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );

          const allMax = Math.max(...allBlocks.map(b => b.sessions), 1);
          const splitMax = Math.max(...mobileBlocks.map(b => b.sessions), ...desktopBlocks.map(b => b.sessions), 1);

          return (
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-1">🔍 Funnel détaillé par bloc</h2>
              <p className="text-xs text-gray-500 mb-4">Chaque section du tunnel, avec drop-off et temps médian.</p>

              {/* Segmentation filters */}
              <div className="flex flex-wrap gap-4 mb-4 pb-3 border-b border-gray-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Device:</span>
                  <button
                    onClick={() => { setBlockDeviceSplit(false); setBlockAbSplit(false); }}
                    className={`px-2.5 py-1 text-[11px] rounded-lg transition ${
                      !blockDeviceSplit && !blockAbSplit ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => { setBlockDeviceSplit(true); setBlockAbSplit(false); }}
                    className={`px-2.5 py-1 text-[11px] rounded-lg transition ${
                      blockDeviceSplit ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Split mobile / desktop
                  </button>
                  <button
                    onClick={() => { setBlockAbSplit(true); setBlockDeviceSplit(false); }}
                    className={`px-2.5 py-1 text-[11px] rounded-lg transition ${
                      blockAbSplit ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Split A/B
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Entrée tunnel:</span>
                  {[
                    { id: 'all', label: 'Tous' },
                    { id: 'direct', label: `Directe${directCount ? ` (${directCount})` : ''}` },
                  ].map(e => (
                    <button
                      key={e.id}
                      onClick={() => setBlockEntryFilter(e.id)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg transition ${
                        blockEntryFilter === e.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {!blockDeviceSplit && !blockAbSplit ? (
                /* Single funnel — Tous */
                renderFunnel(allBlocks, allMax)
              ) : blockDeviceSplit ? (
                /* Split: Mobile | Desktop side by side */
                <div className="flex gap-4">
                  {/* Labels column */}
                  <div className="flex-shrink-0 space-y-1.5 pt-7">
                    {BLOCK_ORDER.map(id => {
                      const info = BLOCK_LABELS[id] || { emoji: "•", label: id };
                      return (
                        <div key={id} className="h-6 flex items-center justify-end">
                          <span className="text-gray-400 text-[10px] text-right truncate w-36">{info.emoji} {info.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Mobile column */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-blue-400 font-semibold mb-1.5">📱 Mobile{deviceCounts.mobile ? ` (${deviceCounts.mobile})` : ''}</p>
                    {renderFunnel(mobileBlocks, splitMax, true)}
                  </div>
                  {/* Desktop column */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-indigo-400 font-semibold mb-1.5">🖥 Desktop{deviceCounts.desktop ? ` (${deviceCounts.desktop})` : ''}</p>
                    {renderFunnel(desktopBlocks, splitMax, true)}
                  </div>
                </div>
              ) : (
                /* Split: A | B side by side */
                <div className="flex gap-4">
                  {/* Labels column */}
                  <div className="flex-shrink-0 space-y-1.5 pt-7">
                    {BLOCK_ORDER.map(id => {
                      const info = BLOCK_LABELS[id] || { emoji: "•", label: id };
                      return (
                        <div key={id} className="h-6 flex items-center justify-end">
                          <span className="text-gray-400 text-[10px] text-right truncate w-36">{info.emoji} {info.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Variante A */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-blue-400 font-semibold mb-1.5">🅰 Variante A{abVariantCounts['A'] ? ` (${abVariantCounts['A']})` : ''}</p>
                    {renderFunnel(aBlocks, abSplitMax, true)}
                  </div>
                  {/* Variante B */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-purple-400 font-semibold mb-1.5">🅱 Variante B{abVariantCounts['B'] ? ` (${abVariantCounts['B']})` : ''}</p>
                    {renderFunnel(bBlocks, abSplitMax, true)}
                  </div>
                </div>
              )}

              {/* Block durations table */}
              {data.blockDurations && data.blockDurations.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <h3 className="text-xs font-semibold text-gray-400 mb-3">⏱️ Temps par bloc (détail)</h3>
                  <DataTable
                    headers={["Bloc", "Médiane", "Moyenne", "P90"]}
                    rows={[...data.blockDurations]
                      .sort((a, b) => BLOCK_ORDER.indexOf(a.block_id) - BLOCK_ORDER.indexOf(b.block_id))
                      .map((d) => {
                        const info = BLOCK_LABELS[d.block_id] || { emoji: "•", label: d.block_id };
                        return [
                          `${info.emoji} ${info.label}`,
                          formatDuration(d.median_duration_ms),
                          formatDuration(d.avg_duration_ms),
                          formatDuration(d.p90_duration_ms),
                        ];
                      })}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sources */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">🎯 Sources d'acquisition</h2>
            <DataTable
              headers={["Source", "Sessions", "Conv.", "Taux"]}
              rows={data.sources.map((s) => [
                s.source,
                s.sessions,
                s.completions,
                formatPct(s.conversion_rate),
              ])}
            />
          </div>

          {/* Step durations */}
          {data.stepDurations.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">⏱️ Temps par étape</h2>
              <DataTable
                headers={["Étape", "Médiane", "Moyenne", "P90"]}
                rows={data.stepDurations.map((s) => [
                  STEP_LABELS_EARLY[s.logical_step] || s.logical_step,
                  formatDuration(s.median_duration_ms),
                  formatDuration(s.avg_duration_ms),
                  formatDuration(s.p90_duration_ms),
                ])}
              />
            </div>
          )}
        </div>

        {/* Device / Country */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.devices.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">📱 Devices</h2>
              <BreakdownBars
                items={data.devices.map((d) => ({ label: d.device, pct: d.pct, count: d.sessions }))}
                colorClass="bg-blue-500"
              />
            </div>
          )}

          {data.countries.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">🌍 Pays</h2>
              <BreakdownBars
                items={data.countries.map((c) => ({ label: c.country, pct: c.pct, count: c.sessions }))}
                colorClass="bg-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Sessions table */}
        <SessionsTable password={password} periodStart={data.periodStart} periodEnd={data.periodEnd} />

        {/* Footer */}
        <div className="text-center text-gray-600 text-xs pb-8">
          Moverz Tunnel Analytics — Données Neon Postgres
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sessions table — one row per session
// ============================================================

const BLOCK_ORDER_SHORT = ["contact_info","origin_address","destination_address","moving_date","surface_volume","formule","options","confirmation"];
const BLOCK_SHORT: Record<string, string> = {
  contact_info: "Coord", origin_address: "Départ", destination_address: "Arrivée",
  moving_date: "Date", surface_volume: "Surface", formule: "Formule",
  options: "Options", confirmation: "Confirm",
};

function BlockPills({ blocks }: { blocks: string[] }) {
  const set = new Set(blocks);
  return (
    <div className="flex gap-0.5 flex-wrap">
      {BLOCK_ORDER_SHORT.map(id => (
        <span
          key={id}
          className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
            set.has(id) ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-600"
          }`}
        >
          {BLOCK_SHORT[id] ?? id}
        </span>
      ))}
    </div>
  );
}

function SessionsTable({ password, periodStart, periodEnd }: { password: string; periodStart: string; periodEnd: string }) {
  const [data, setData] = useState<SessionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [variantFilter, setVariantFilter] = useState<'all' | 'A' | 'B'>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [completedFilter, setCompletedFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        password,
        from: periodStart,
        to: periodEnd,
        limit: String(LIMIT),
        offset: String(offset),
      });
      if (variantFilter !== 'all') params.set('variant', variantFilter);
      if (deviceFilter !== 'all') params.set('device', deviceFilter);
      if (completedFilter !== 'all') params.set('completed', completedFilter);
      const res = await fetch(`/api/analytics/sessions?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [password, periodStart, periodEnd, variantFilter, deviceFilter, completedFilter, offset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-300">👤 Sessions individuelles</h2>
        <div className="flex items-center gap-3 flex-wrap text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Variante:</span>
            {(['all','A','B'] as const).map(v => (
              <button key={v} onClick={() => { setVariantFilter(v); setOffset(0); }}
                className={`px-2 py-1 rounded-lg transition ${variantFilter === v ? (v === 'B' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white') : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {v === 'all' ? 'Toutes' : v === 'A' ? '🅰 A' : '🅱 B'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Device:</span>
            {['all','mobile','desktop'].map(d => (
              <button key={d} onClick={() => { setDeviceFilter(d); setOffset(0); }}
                className={`px-2 py-1 rounded-lg transition ${deviceFilter === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {d === 'all' ? 'Tous' : d === 'mobile' ? '📱 Mobile' : '🖥 Desktop'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Statut:</span>
            {[{v:'all',l:'Tous'},{v:'true',l:'✅ Converti'},{v:'false',l:'❌ Abandonné'}].map(({v,l}) => (
              <button key={v} onClick={() => { setCompletedFilter(v); setOffset(0); }}
                className={`px-2 py-1 rounded-lg transition ${completedFilter === v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
          {data && <span className="text-gray-500">{data.total} sessions</span>}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Chargement…</div>
      ) : !data || data.sessions.length === 0 ? (
        <div className="p-8 text-center text-gray-600 text-sm">Aucune session</div>
      ) : (
        <div className="flex">
          {/* Table */}
          <div className="flex-1 min-w-0 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Var.</th>
                  <th className="px-3 py-2 text-left">Device</th>
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-left">Durée</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Parcours blocs</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map(s => (
                  <tr
                    key={s.session_id}
                    onClick={() => setSelected(selected?.session_id === s.session_id ? null : s)}
                    className={`border-b border-gray-800/50 cursor-pointer transition hover:bg-gray-800/40 ${selected?.session_id === s.session_id ? 'bg-gray-800/60' : ''}`}
                  >
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' })}
                      <span className="text-gray-600 ml-1">{new Date(s.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.variant === 'A' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>
                        {s.variant}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{s.device === 'mobile' ? '📱' : s.device === 'desktop' ? '🖥' : s.device ?? '?'}</td>
                    <td className="px-3 py-2 text-gray-400 truncate max-w-[80px]">{s.source ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {s.completed
                        ? <span className="text-green-400 font-semibold">✅ Converti</span>
                        : <span className="text-gray-500">❌ {STEP_LABELS_EARLY[s.last_step ?? ''] || s.last_step || '—'}</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{s.total_duration_ms ? formatDuration(s.total_duration_ms) : '—'}</td>
                    <td className="px-3 py-2 text-gray-400 truncate max-w-[120px]">{s.email ?? '—'}</td>
                    <td className="px-3 py-2"><BlockPills blocks={s.blocks_visited} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.total > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <span className="text-gray-500 text-[11px]">{offset + 1}–{Math.min(offset + LIMIT, data.total)} sur {data.total}</span>
                <div className="flex gap-2">
                  <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                    className="px-3 py-1 text-[11px] bg-gray-800 text-gray-400 rounded-lg disabled:opacity-30 hover:bg-gray-700">← Préc.</button>
                  <button disabled={offset + LIMIT >= data.total} onClick={() => setOffset(offset + LIMIT)}
                    className="px-3 py-1 text-[11px] bg-gray-800 text-gray-400 rounded-lg disabled:opacity-30 hover:bg-gray-700">Suiv. →</button>
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-72 flex-shrink-0 border-l border-gray-800 p-4 space-y-4 text-[11px] overflow-y-auto max-h-[600px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-300">Détail session</span>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
              </div>
              <div className="space-y-1.5 text-gray-400">
                <div><span className="text-gray-500">ID :</span> <span className="font-mono text-[10px] break-all">{selected.session_id.slice(-12)}</span></div>
                <div><span className="text-gray-500">Variante :</span> <span className={`font-bold ml-1 ${selected.variant === 'A' ? 'text-blue-400' : 'text-purple-400'}`}>{selected.variant}</span></div>
                <div><span className="text-gray-500">Device :</span> <span className="ml-1">{selected.device ?? '?'}</span></div>
                <div><span className="text-gray-500">Pays :</span> <span className="ml-1">{selected.country ?? '?'}</span></div>
                <div><span className="text-gray-500">Source :</span> <span className="ml-1">{selected.source ?? '—'}</span></div>
                {selected.utm_source && <div><span className="text-gray-500">UTM :</span> <span className="ml-1">{selected.utm_source}</span></div>}
                {selected.referrer && <div><span className="text-gray-500">Referrer :</span> <span className="ml-1 break-all text-[10px]">{selected.referrer}</span></div>}
                {selected.landing_url && <div><span className="text-gray-500">Landing :</span> <span className="ml-1 break-all text-[10px]">{selected.landing_url}</span></div>}
                <div><span className="text-gray-500">Email :</span> <span className="ml-1">{selected.email ?? '—'}</span></div>
                <div><span className="text-gray-500">Durée :</span> <span className="ml-1">{selected.total_duration_ms ? formatDuration(selected.total_duration_ms) : '—'}</span></div>
                <div><span className="text-gray-500">Statut :</span> <span className="ml-1">{selected.completed ? <span className="text-green-400">✅ Converti</span> : <span className="text-gray-400">❌ Abandonné à {STEP_LABELS_EARLY[selected.last_step ?? ''] || selected.last_step || '—'}</span>}</span></div>
              </div>

              <div>
                <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-2">Parcours blocs</p>
                <div className="space-y-1">
                  {BLOCK_ORDER_SHORT.map((id, i) => {
                    const visited = selected.blocks_visited.includes(id);
                    return (
                      <div key={id} className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] ${visited ? 'bg-blue-900/40 text-blue-200' : 'text-gray-700'}`}>
                        <span className="text-gray-600 w-4">{i + 1}</span>
                        <span className="flex-1">{BLOCK_SHORT[id] ?? id}</span>
                        {visited && <span className="text-green-400 text-[10px]">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selected.last_form_snapshot && Object.keys(selected.last_form_snapshot).length > 0 && (
                <div>
                  <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-2">Champs remplis</p>
                  <div className="space-y-1">
                    {Object.entries(selected.last_form_snapshot).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-gray-500 w-24 truncate flex-shrink-0">{k}</span>
                        <span className="text-gray-300 truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.last_pricing_snapshot && (
                <div>
                  <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-2">Pricing snapshot</p>
                  <pre className="text-[10px] text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                    {JSON.stringify(selected.last_pricing_snapshot, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Journal — raw events timeline + session filter
// ============================================================

function TimeAgo({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return <span>à l&apos;instant</span>;
  if (diffMin < 60) return <span>il y a {diffMin}min</span>;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return <span>il y a {diffH}h</span>;
  const diffD = Math.floor(diffH / 24);
  return <span>il y a {diffD}j</span>;
}

// ── Human-readable labels ──

const EVENT_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  TUNNEL_STEP_VIEWED:  { emoji: "👁", label: "Vue étape",      color: "bg-purple-500" },
  TUNNEL_STEP_CHANGED: { emoji: "➡️", label: "Changement",     color: "bg-blue-500" },
  TUNNEL_COMPLETED:    { emoji: "🎉", label: "Complété",       color: "bg-green-500" },
  BLOCK_ENTERED:       { emoji: "🔹", label: "Bloc entré",     color: "bg-indigo-500" },
  form_start:          { emoji: "🚀", label: "Début tunnel",   color: "bg-cyan-500" },
  field_interaction:   { emoji: "✏️", label: "Saisie champ",   color: "bg-gray-500" },
  field_completion:    { emoji: "✅", label: "Champ rempli",   color: "bg-teal-500" },
  validation_error:    { emoji: "⚠️", label: "Erreur valid.",  color: "bg-red-500" },
  pricing_viewed:      { emoji: "💰", label: "Prix affiché",   color: "bg-yellow-500" },
  cta_clicked:         { emoji: "👆", label: "CTA cliqué",     color: "bg-orange-500" },
  scroll_depth:        { emoji: "📜", label: "Scroll",         color: "bg-gray-600" },
  tab_visibility:      { emoji: "👀", label: "Visibilité tab", color: "bg-gray-700" },
};

const STEP_LABELS: Record<string, string> = {
  CONTACT:  "📞 Coordonnées",
  PROJECT:  "🚛 Votre projet",
  RECAP:    "⭐ Formule & budget",
  THANK_YOU:"🎉 Dossier envoyé",
};

const SCREEN_LABELS: Record<string, string> = {
  contact_v3:      "Coordonnées",
  project_v3:      "Votre projet",
  formules_v3:     "Formule & budget",
  confirmation_v3: "Confirmation",
};

const BLOCK_LABELS_SIMPLE: Record<string, string> = {
  contact_info:        "Coordonnées",
  origin_address:      "Adresse départ",
  destination_address: "Adresse arrivée",
  moving_date:         "Date déménagement",
  surface_volume:      "Surface & volume",
  formule:             "Choix formule",
  options:             "Options services",
  confirmation:        "Page confirmation",
};

function getEventInfo(type: string) {
  return EVENT_LABELS[type] || { emoji: "•", label: type, color: "bg-gray-600" };
}

function getStepLabel(step: string | null) {
  if (!step) return null;
  return STEP_LABELS[step] || step;
}

function getScreenLabel(screen: string | null) {
  if (!screen) return null;
  return SCREEN_LABELS[screen] || screen;
}

function EventBadge({ type }: { type: string }) {
  const info = getEventInfo(type);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-white ${info.color}`}>
      <span>{info.emoji}</span>
      <span>{info.label}</span>
    </span>
  );
}

function JsonPreview({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-gray-500 hover:text-gray-300 underline"
      >
        {open ? "▼" : "▶"} {label}
      </button>
      {open && (
        <pre className="mt-1 text-[10px] text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/** Parse user agent to a short readable browser/OS summary */
function shortUA(ua: string | null): string {
  if (!ua) return "?";
  const lower = ua.toLowerCase();
  // Bots
  if (/bot|crawl|spider|slurp|lighthouse|headless|phantom|selenium|puppeteer|playwright/i.test(lower)) return "🤖 Bot";
  if (/facebook|facebookexternalhit/i.test(lower)) return "🤖 Facebook";
  if (/twitter|twitterbot/i.test(lower)) return "🤖 Twitter";
  if (/whatsapp/i.test(lower)) return "🤖 WhatsApp";
  if (/telegram/i.test(lower)) return "🤖 Telegram";
  // Browsers
  let browser = "?";
  if (/edg/i.test(lower)) browser = "Edge";
  else if (/chrome/i.test(lower) && !/chromium/i.test(lower)) browser = "Chrome";
  else if (/safari/i.test(lower) && !/chrome/i.test(lower)) browser = "Safari";
  else if (/firefox/i.test(lower)) browser = "Firefox";
  else if (/opera|opr/i.test(lower)) browser = "Opera";
  // OS
  let os = "";
  if (/iphone|ipad/i.test(lower)) os = "iOS";
  else if (/android/i.test(lower)) os = "Android";
  else if (/mac/i.test(lower)) os = "Mac";
  else if (/windows/i.test(lower)) os = "Win";
  else if (/linux/i.test(lower)) os = "Linux";
  return os ? `${browser}/${os}` : browser;
}

function SessionCard({
  session,
  isActive,
  onClick,
}: {
  session: {
    session_id: string;
    email: string | null;
    events_count: number;
    first_seen: string;
    last_step: string | null;
    device: string | null;
    country: string | null;
    completed: boolean;
    source: string | null;
    user_agent: string | null;
    max_step_index: number | null;
    utm_source: string | null;
    language: string | null;
  };
  isActive: boolean;
  onClick: () => void;
}) {
  const time = new Date(session.first_seen).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(session.first_seen).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isActive
          ? "border-purple-500 bg-purple-500/10"
          : "border-gray-800 bg-gray-900 hover:border-gray-700"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-gray-300 truncate max-w-[140px]">
          {session.email || session.session_id.slice(-8)}
        </span>
        <div className="flex items-center gap-1">
          {session.completed && (
            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">✓</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-wrap">
        <span className="font-medium">{session.events_count} evt</span>
        <span>•</span>
        <span>{shortUA(session.user_agent)}</span>
        {session.country && session.country !== "?" && <><span>•</span><span>{session.country}</span></>}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5 flex-wrap">
        {session.last_step && <span>→ {STEP_LABELS[session.last_step] || session.last_step}</span>}
        <span>•</span>
        <span>{date} {time}</span>
      </div>
      {session.source && session.source !== "direct" && (
        <div className="text-[9px] text-gray-600 mt-0.5 truncate">
          via {session.utm_source || session.source}
        </div>
      )}
    </button>
  );
}

function Journal({ password }: { password: string }) {
  const [journal, setJournal] = useState<JournalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionRow | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(0);
  const LIMIT = 100;

  // Expanded event details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchJournal = useCallback(async (opts?: { sessionId?: string; resetPage?: boolean }) => {
    setLoading(true);
    setError(null);
    const currentPage = opts?.resetPage ? 0 : page;
    if (opts?.resetPage) setPage(0);

    const sessionId = opts?.sessionId ?? activeSessionId;

    const params = new URLSearchParams({
      password,
      days: String(days),
      limit: String(LIMIT),
      offset: String(currentPage * LIMIT),
      includeTests: "false",
      includeBots: "false",
    });

    if (sessionId) params.set("sessionId", sessionId);
    if (!sessionId && searchQuery.trim()) {
      // Could be email or sessionId — try email first
      if (searchQuery.includes("@")) {
        params.set("email", searchQuery.trim());
      } else {
        params.set("sessionId", searchQuery.trim());
      }
    }
    if (eventTypeFilter) params.set("eventType", eventTypeFilter);

    try {
      const res = await fetch(`/api/analytics/journal?${params.toString()}`);
      if (res.status === 401) {
        setError("Mot de passe incorrect");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Erreur serveur");
        return;
      }
      const data: JournalResult = await res.json();
      setJournal(data);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [password, days, activeSessionId, searchQuery, eventTypeFilter, page]);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setActiveSessionId(null);
      fetchJournal({ resetPage: true });
    }, 500);
  };

  const handleSessionClick = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setSearchQuery("");
    fetchJournal({ sessionId, resetPage: true });
    // Fetch session detail (parcours reconstitué)
    const daysBack = days;
    const from = new Date(Date.now() - daysBack * 86400000).toISOString();
    const to = new Date().toISOString();
    fetch(`/api/analytics/sessions?password=${encodeURIComponent(password)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=500`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { sessions?: SessionRow[] } | null) => {
        if (!d?.sessions) return;
        const found = d.sessions.find((s: SessionRow) => s.session_id === sessionId);
        setSessionDetail(found ?? null);
      })
      .catch(() => {});
  };

  const clearFilters = () => {
    setActiveSessionId(null);
    setSessionDetail(null);
    setSearchQuery("");
    setEventTypeFilter("");
    setPage(0);
    fetchJournal({ resetPage: true });
  };

  // Unique event types for filter dropdown
  const eventTypes = journal
    ? [...new Set(journal.events.map((e) => e.event_type))].sort()
    : [];

  const totalPages = journal ? Math.ceil(journal.total / LIMIT) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">📋 Journal des événements</h1>
            <p className="text-gray-400 text-sm">
              {journal ? `${journal.total} événements` : "Chargement…"}
              {journal?.sessions && (() => {
                const total = journal.sessions.length;
                const bounces = journal.sessions.filter((s) => s.events_count <= 1).length;
                return (
                  <span className="ml-2 text-gray-500">
                    ({total} sessions · {bounces} bounces · {total - bounces} engagés)
                  </span>
                );
              })()}
              {activeSessionId && (
                <span className="ml-2 text-purple-400">
                  Filtré : session …{activeSessionId.slice(-8)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar: Sessions */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-6 space-y-3">
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Chercher email ou session ID…"
                className="w-full px-3 py-2 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
              />

              {activeSessionId && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                  ✕ Voir toutes les sessions
                </button>
              )}

              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Sessions récentes</p>
              <p className="text-[10px] text-gray-600">Bots & tests exclus</p>

              <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {journal?.sessions
                  ?.map((s) => (
                  <SessionCard
                    key={s.session_id}
                    session={s}
                    isActive={activeSessionId === s.session_id}
                    onClick={() => handleSessionClick(s.session_id)}
                  />
                ))}
                {(!journal?.sessions || journal.sessions.length === 0) && !loading && (
                  <p className="text-gray-600 text-xs">Aucune session trouvée</p>
                )}
              </div>

              {/* Session detail panel */}
              {sessionDetail && activeSessionId && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-3 text-[11px]">
                  <p className="text-gray-500 uppercase tracking-wider text-[10px]">Parcours reconstitué</p>
                  <div className="space-y-1">
                    {BLOCK_ORDER_SHORT.map((id, i) => {
                      const visited = sessionDetail.blocks_visited.includes(id);
                      return (
                        <div key={id} className={`flex items-center gap-2 px-2 py-1 rounded ${visited ? 'bg-blue-900/40 text-blue-200' : 'text-gray-700'}`}>
                          <span className="text-gray-600 text-[10px] w-4">{i + 1}</span>
                          <span className="flex-1">{BLOCK_SHORT[id] ?? id}</span>
                          {visited && <span className="text-green-400 text-[10px]">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                  {sessionDetail.last_form_snapshot && Object.keys(sessionDetail.last_form_snapshot).length > 0 && (
                    <div>
                      <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-1.5">Champs remplis</p>
                      <div className="space-y-1">
                        {Object.entries(sessionDetail.last_form_snapshot).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-gray-500 w-20 truncate flex-shrink-0 text-[10px]">{k}</span>
                            <span className="text-gray-300 truncate text-[10px]">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!sessionDetail.last_form_snapshot && (
                    <p className="text-gray-600 text-[10px]">Aucun champ rempli tracké</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main: Events timeline */}
          <div className="flex-1 min-w-0">
            {/* Mobile search */}
            <div className="lg:hidden mb-4 space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Chercher email ou session ID…"
                className="w-full px-3 py-2 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
              />
              {activeSessionId && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                  ✕ Voir tout
                </button>
              )}
            </div>

            {/* Event type filter */}
            <div className="flex items-center gap-3 mb-4">
              <select
                value={eventTypeFilter}
                onChange={(e) => { setEventTypeFilter(e.target.value); setPage(0); }}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tous les types</option>
                {eventTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">
                {journal?.total ?? 0} résultats
              </span>
            </div>

            {loading && (
              <div className="text-gray-400 text-center py-12 animate-pulse">Chargement…</div>
            )}

            {error && (
              <div className="bg-red-900/30 text-red-300 p-4 rounded-xl mb-4">{error}</div>
            )}

            {!loading && !error && journal && (
              <>
                {/* Events list */}
                <div className="space-y-1">
                  {journal.events.map((ev) => {
                    const isExpanded = expandedId === ev.id;
                    const time = new Date(ev.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    const date = new Date(ev.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

                    return (
                      <div
                        key={ev.id}
                        className={`border rounded-xl p-3 transition-all cursor-pointer ${
                          isExpanded
                            ? "border-gray-600 bg-gray-900"
                            : "border-gray-800/50 bg-gray-900/50 hover:border-gray-700"
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Timestamp */}
                          <div className="text-[10px] text-gray-500 font-mono w-20 flex-shrink-0 text-right">
                            <div>{date}</div>
                            <div>{time}</div>
                          </div>

                          {/* Dot */}
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getEventInfo(ev.event_type).color} ring-2 ring-gray-950`} />

                          {/* Event info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <EventBadge type={ev.event_type} />
                              {ev.event_type === "BLOCK_ENTERED" && ev.extra?.blockId ? (
                                <span className="text-sm text-gray-200 font-medium">
                                  {BLOCK_LABELS[ev.extra.blockId as string]?.label || (ev.extra.blockId as string)}
                                </span>
                              ) : ev.logical_step ? (
                                <span className="text-sm text-gray-200 font-medium">{getStepLabel(ev.logical_step)}</span>
                              ) : null}
                              {ev.screen_id && (
                                <span className="text-xs text-gray-500 bg-gray-800/80 px-1.5 py-0.5 rounded">{getScreenLabel(ev.screen_id)}</span>
                              )}
                            </div>
                            {!activeSessionId && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSessionClick(ev.session_id); }}
                                className="text-[10px] text-purple-400 hover:text-purple-300 font-mono mt-0.5"
                              >
                                {ev.email || ev.session_id.slice(0, 16)}
                              </button>
                            )}
                          </div>

                          {/* Device/Country badges */}
                          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                            {ev.device && (
                              <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                                {ev.device}
                              </span>
                            )}
                            {ev.country && (
                              <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                                {ev.country}
                              </span>
                            )}
                            {ev.source && (
                              <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                                {ev.source}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                              <div><span className="text-gray-500">Session:</span> <span className="text-gray-300 font-mono">{ev.session_id}</span></div>
                              <div><span className="text-gray-500">Email:</span> <span className="text-gray-300">{ev.email || "—"}</span></div>
                              <div><span className="text-gray-500">Device:</span> <span className="text-gray-300">{ev.device || "—"}</span></div>
                              <div><span className="text-gray-500">Country:</span> <span className="text-gray-300">{ev.country || "—"} {ev.region ? `/ ${ev.region}` : ""} {ev.city_geo ? `/ ${ev.city_geo}` : ""}</span></div>
                              <div><span className="text-gray-500">Source:</span> <span className="text-gray-300">{ev.source || "—"}</span></div>
                              <div><span className="text-gray-500">Referrer:</span> <span className="text-gray-300 truncate">{ev.referrer || "—"}</span></div>
                              <div><span className="text-gray-500">UTM:</span> <span className="text-gray-300">{[ev.utm_source, ev.utm_medium, ev.utm_campaign, ev.utm_content].filter(Boolean).join(" / ") || "—"}</span></div>
                              <div><span className="text-gray-500">Screen:</span> <span className="text-gray-300">{ev.screen_width && ev.screen_height ? `${ev.screen_width}×${ev.screen_height}` : "—"}</span></div>
                              <div><span className="text-gray-500">Lang:</span> <span className="text-gray-300">{ev.language || "—"} · {ev.timezone || "—"}</span></div>
                              <div><span className="text-gray-500">Test:</span> <span className={ev.is_test_user ? "text-yellow-400" : "text-gray-300"}>{ev.is_test_user ? "Oui" : "Non"}</span></div>
                              <div><span className="text-gray-500">Path:</span> <span className="text-gray-300 font-mono">{ev.url_path}</span></div>
                            </div>

                            <JsonPreview data={ev.extra} label="Extra data" />
                            <JsonPreview data={ev.form_snapshot} label="Form snapshot" />
                            <JsonPreview data={ev.pricing_snapshot} label="Pricing snapshot" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {journal.events.length === 0 && (
                    <div className="text-center text-gray-600 py-12">
                      Aucun événement trouvé
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 text-sm text-gray-300 disabled:opacity-30 hover:bg-gray-700 transition"
                    >
                      ← Précédent
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {page + 1} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 text-sm text-gray-300 disabled:opacity-30 hover:bg-gray-700 transition"
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingLab({ password }: { password: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hypotheses, setHypotheses] = useState<PricingSimulatorHypotheses | null>(null);
  const [simulatingStep2, setSimulatingStep2] = useState(false);
  const [simulatingStep3, setSimulatingStep3] = useState(false);
  const [step2Simulation, setStep2Simulation] = useState<PricingSimulatorResponse | null>(null);
  const [step3Simulation, setStep3Simulation] = useState<PricingSimulatorResponse | null>(null);
  const [step2Form, setStep2Form] = useState({
    surfaceM2: 60,
    cityDistanceKm: 120,
    bufferKm: 15,
    formule: "STANDARD",
    density: "dense",
    kitchenApplianceCount: 3,
  });
  const [step3Form, setStep3Form] = useState({
    distanceKm: 135,
    formule: "STANDARD",
    density: "dense",
    seasonFactor: 1,
    originFloor: 0,
    originElevator: "yes",
    destinationFloor: 0,
    destinationElevator: "yes",
    longCarry: false,
    tightAccess: false,
    difficultParking: false,
    extraVolumeM3: 1.8,
    monteMeuble: false,
    piano: "none",
    debarras: false,
    narrowAccessSides: 0,
    longCarrySides: 0,
    difficultParkingSides: 0,
    liftRequiredSides: 0,
    objectPiano: false,
    objectCoffreFort: false,
    objectAquarium: false,
    objectFragile: false,
    objectHeavyCount: 0,
    originIsBox: false,
    destinationIsBox: false,
    originBoxVolumeM3: "",
  });

  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n || 0);

  const fmtPct = (n: number) => `${Math.round((n || 0) * 100)}%`;

  const fetchHypotheses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/pricing-simulator?password=${encodeURIComponent(password)}`
      );
      if (res.status === 401) {
        setError("Mot de passe incorrect");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Erreur serveur");
        return;
      }
      const json = await res.json();
      setHypotheses(json.hypotheses ?? null);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [password]);

  const postSimulation = useCallback(
    async (payload: Record<string, unknown>): Promise<PricingSimulatorResponse | null> => {
      const res = await fetch(
        `/api/analytics/pricing-simulator?password=${encodeURIComponent(password)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Simulation impossible");
        return null;
      }
      return (await res.json()) as PricingSimulatorResponse;
    },
    [password]
  );

  const runStep2Simulation = useCallback(async () => {
    setSimulatingStep2(true);
    setError(null);
    try {
      const payload = {
        surfaceM2: step2Form.surfaceM2,
        distanceKm: Math.max(0, step2Form.cityDistanceKm + step2Form.bufferKm),
        formule: step2Form.formule,
        density: step2Form.density,
        seasonFactor: 1,
        originFloor: 0,
        originElevator: "yes",
        destinationFloor: 0,
        destinationElevator: "yes",
        longCarry: false,
        tightAccess: false,
        difficultParking: false,
        extraVolumeM3: Math.max(0, step2Form.kitchenApplianceCount) * 0.6,
        services: {
          monteMeuble: false,
          piano: null,
          debarras: false,
        },
      };
      const json = await postSimulation(payload);
      if (json) {
        setStep2Simulation(json);
        setStep3Form((prev) => ({
          ...prev,
          distanceKm: payload.distanceKm,
          formule: payload.formule,
          density: payload.density,
          extraVolumeM3: payload.extraVolumeM3,
        }));
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSimulatingStep2(false);
    }
  }, [step2Form, postSimulation]);

  const runStep3Simulation = useCallback(async () => {
    setSimulatingStep3(true);
    setError(null);
    try {
      const payload = {
        surfaceM2: step2Form.surfaceM2,
        distanceKm: step3Form.distanceKm,
        formule: step3Form.formule,
        density: step3Form.density,
        seasonFactor: step3Form.seasonFactor,
        originFloor: step3Form.originFloor,
        originElevator: step3Form.originElevator,
        destinationFloor: step3Form.destinationFloor,
        destinationElevator: step3Form.destinationElevator,
        longCarry: step3Form.longCarry,
        tightAccess: step3Form.tightAccess,
        difficultParking: step3Form.difficultParking,
        extraVolumeM3: step3Form.extraVolumeM3,
        services: {
          monteMeuble: step3Form.monteMeuble,
          piano: step3Form.piano === "none" ? null : step3Form.piano,
          debarras: step3Form.debarras,
        },
        step3Addons: {
          accessSideCounts: {
            narrow_access: step3Form.narrowAccessSides,
            long_carry: step3Form.longCarrySides,
            difficult_parking: step3Form.difficultParkingSides,
            lift_required: step3Form.liftRequiredSides,
          },
          objects: {
            piano: step3Form.objectPiano,
            coffreFort: step3Form.objectCoffreFort,
            aquarium: step3Form.objectAquarium,
            objetsFragilesVolumineux: step3Form.objectFragile,
            meublesTresLourdsCount: step3Form.objectHeavyCount,
          },
        },
        step3Box: {
          originIsBox: step3Form.originIsBox,
          destinationIsBox: step3Form.destinationIsBox,
          originBoxVolumeM3: Number.parseFloat(String(step3Form.originBoxVolumeM3).replace(",", ".")),
        },
      };
      const json = await postSimulation(payload);
      if (json) setStep3Simulation(json);
    } catch {
      setError("Erreur réseau");
    } finally {
      setSimulatingStep3(false);
    }
  }, [step2Form.surfaceM2, step3Form, postSimulation]);

  useEffect(() => {
    fetchHypotheses();
  }, [fetchHypotheses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Chargement des hypothèses…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">🧠 Hypothèses & Simulation</h1>
            <p className="text-gray-400 text-sm">Vue claire des règles pricing + test de scénarios</p>
          </div>
          <button
            onClick={fetchHypotheses}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {error && <div className="bg-red-900/30 text-red-300 p-4 rounded-xl">{error}</div>}

        {hypotheses && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
            <h2 className="text-base font-semibold text-white">1) Calculs Step 2 — hypothèses + simulation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-400 uppercase tracking-wide">
              <div>Hypothèse</div>
              <div>Règle</div>
              <div>Simulation</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm border-t border-gray-800 pt-3">
              <div>Surface</div>
              <div className="text-gray-400">Volume base = 0,4 × m² (profil T2 baseline)</div>
              <input type="number" value={step2Form.surfaceM2} onChange={(e) => setStep2Form((p) => ({ ...p, surfaceM2: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
              <div>Distance villes</div>
              <div className="text-gray-400">Distance OSRM ville-à-ville</div>
              <input type="number" value={step2Form.cityDistanceKm} onChange={(e) => setStep2Form((p) => ({ ...p, cityDistanceKm: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
              <div>Buffer distance</div>
              <div className="text-gray-400">Par défaut: +{hypotheses.baselineDistanceBufferKm} km</div>
              <input type="number" value={step2Form.bufferKm} onChange={(e) => setStep2Form((p) => ({ ...p, bufferKm: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
              <div>Décote</div>
              <div className="text-gray-400">Appliquée au calcul base (constante pricing)</div>
              <input
                type="text"
                value={fmtPct(hypotheses.decote)}
                readOnly
                className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
              <div>Provision commission Moverz</div>
              <div className="text-gray-400">{hypotheses.moverzFeeProvisionRule}</div>
              <input
                type="text"
                value={step2Simulation ? fmtEur(step2Simulation.baseline.moverzFeeProvisionEur) : "Simuler Step 2"}
                readOnly
                className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
              <div>Formule</div>
              <div className="text-gray-400">Impacte la conversion €/m³</div>
              <select value={step2Form.formule} onChange={(e) => setStep2Form((p) => ({ ...p, formule: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <option value="ECONOMIQUE">Économique</option>
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
              <div>Densité (préselection)</div>
              <div className="text-gray-400">Défaut Step 2: {hypotheses.step2Defaults.density}</div>
              <select value={step2Form.density} onChange={(e) => setStep2Form((p) => ({ ...p, density: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <option value="light">Peu meublé</option>
                <option value="normal">Normal</option>
                <option value="dense">Très meublé</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
              <div>Cuisine (préselection)</div>
              <div className="text-gray-400">Défaut: {hypotheses.step2Defaults.kitchenApplianceCount} équipements</div>
              <input type="number" min={0} value={step2Form.kitchenApplianceCount} onChange={(e) => setStep2Form((p) => ({ ...p, kitchenApplianceCount: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">Décote: {fmtPct(hypotheses.decote)} · Socle min: {fmtEur(hypotheses.prixMinSocle)} · Centre: {fmtPct(hypotheses.displayCenterBias)}</p>
              <button onClick={runStep2Simulation} disabled={simulatingStep2} className="rounded-lg px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold">
                {simulatingStep2 ? "Simulation..." : "Simuler Step 2"}
              </button>
            </div>

            {step2Simulation && (
              <div className="mt-2 rounded-xl border border-gray-800 bg-gray-950/50 p-4 text-sm space-y-1">
                <p><span className="text-gray-500">Distance calculée:</span> {step2Simulation.input.distanceKm} km</p>
                <p><span className="text-gray-500">Centre avant provision:</span> {fmtEur(step2Simulation.baseline.step2CenterBeforeProvisionEur)}</p>
                <p><span className="text-gray-500">Provision:</span> {fmtEur(step2Simulation.baseline.moverzFeeProvisionEur)}</p>
                <p><span className="text-gray-500">Centre après provision:</span> {fmtEur(step2Simulation.baseline.step2CenterAfterProvisionEur)}</p>
                <p><span className="text-gray-500">Fourchette Step 2:</span> {fmtEur(step2Simulation.baseline.prixMin)} → {fmtEur(step2Simulation.baseline.prixMax)}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          <h2 className="text-base font-semibold text-white">2) Calculs Step 3 — majorations + date + affinage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-400 uppercase tracking-wide">
            <div>Champ</div>
            <div>Règle</div>
            <div>Input simulation</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm border-t border-gray-800 pt-3">
            <div>Distance réelle</div>
            <div className="text-gray-400">Distance utilisée en Step 3</div>
            <input type="number" value={step3Form.distanceKm} onChange={(e) => setStep3Form((p) => ({ ...p, distanceKm: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Option Box</div>
            <div className="text-gray-400">Box départ/arrivée ; départ box =&gt; m³ exact + densité normal + cuisine neutre ; réduction accès-étages -20%</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label><input type="checkbox" checked={step3Form.originIsBox} onChange={(e) => setStep3Form((p) => ({ ...p, originIsBox: e.target.checked }))} /> Box départ</label>
              <label><input type="checkbox" checked={step3Form.destinationIsBox} onChange={(e) => setStep3Form((p) => ({ ...p, destinationIsBox: e.target.checked }))} /> Box arrivée</label>
              <input type="text" value={step3Form.originBoxVolumeM3} onChange={(e) => setStep3Form((p) => ({ ...p, originBoxVolumeM3: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5" placeholder="m³ box départ" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Date / saison</div>
            <div className="text-gray-400">Facteur saison/urgence</div>
            <input type="number" step="0.01" value={step3Form.seasonFactor} onChange={(e) => setStep3Form((p) => ({ ...p, seasonFactor: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Densité</div>
            <div className="text-gray-400">Light/normal/dense</div>
            <select value={step3Form.density} onChange={(e) => setStep3Form((p) => ({ ...p, density: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <option value="light">Peu meublé</option>
              <option value="normal">Normal</option>
              <option value="dense">Très meublé</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Cuisine / volume extra</div>
            <div className="text-gray-400">Ajout m³</div>
            <input type="number" step="0.1" value={step3Form.extraVolumeM3} onChange={(e) => setStep3Form((p) => ({ ...p, extraVolumeM3: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Étage / ascenseur départ</div>
            <div className="text-gray-400">Majoration accès départ</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={step3Form.originFloor} onChange={(e) => setStep3Form((p) => ({ ...p, originFloor: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <select value={step3Form.originElevator} onChange={(e) => setStep3Form((p) => ({ ...p, originElevator: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <option value="yes">oui</option>
                <option value="partial">petit</option>
                <option value="no">non</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Étage / ascenseur arrivée</div>
            <div className="text-gray-400">Majoration accès arrivée</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={step3Form.destinationFloor} onChange={(e) => setStep3Form((p) => ({ ...p, destinationFloor: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <select value={step3Form.destinationElevator} onChange={(e) => setStep3Form((p) => ({ ...p, destinationElevator: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <option value="yes">oui</option>
                <option value="partial">petit</option>
                <option value="no">non</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Majos accès</div>
            <div className="text-gray-400">Portage +5% · Étroit +5% · Parking +3%</div>
            <div className="flex flex-wrap gap-3 text-xs">
              <label><input type="checkbox" checked={step3Form.longCarry} onChange={(e) => setStep3Form((p) => ({ ...p, longCarry: e.target.checked }))} /> Portage</label>
              <label><input type="checkbox" checked={step3Form.tightAccess} onChange={(e) => setStep3Form((p) => ({ ...p, tightAccess: e.target.checked }))} /> Étroit</label>
              <label><input type="checkbox" checked={step3Form.difficultParking} onChange={(e) => setStep3Form((p) => ({ ...p, difficultParking: e.target.checked }))} /> Parking</label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Contraintes fixes par côté</div>
            <div className="text-gray-400">Étroit 70€ · Portage 80€ · Parking 100€ · Monte-meuble 250€</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <input type="number" min={0} max={2} value={step3Form.narrowAccessSides} onChange={(e) => setStep3Form((p) => ({ ...p, narrowAccessSides: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" placeholder="Étroit côtés" />
              <input type="number" min={0} max={2} value={step3Form.longCarrySides} onChange={(e) => setStep3Form((p) => ({ ...p, longCarrySides: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" placeholder="Portage côtés" />
              <input type="number" min={0} max={2} value={step3Form.difficultParkingSides} onChange={(e) => setStep3Form((p) => ({ ...p, difficultParkingSides: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" placeholder="Parking côtés" />
              <input type="number" min={0} max={2} value={step3Form.liftRequiredSides} onChange={(e) => setStep3Form((p) => ({ ...p, liftRequiredSides: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs" placeholder="Monte côtés" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Services</div>
            <div className="text-gray-400">Monte-meuble / Piano / Débarras</div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs"><input type="checkbox" checked={step3Form.monteMeuble} onChange={(e) => setStep3Form((p) => ({ ...p, monteMeuble: e.target.checked }))} /> Monte</label>
              <select value={step3Form.piano} onChange={(e) => setStep3Form((p) => ({ ...p, piano: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs">
                <option value="none">Piano: non</option>
                <option value="droit">droit</option>
                <option value="quart">quart</option>
              </select>
              <label className="text-xs"><input type="checkbox" checked={step3Form.debarras} onChange={(e) => setStep3Form((p) => ({ ...p, debarras: e.target.checked }))} /> Débarras</label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Objets spécifiques (coûts fixes)</div>
            <div className="text-gray-400">Piano 150€ · Coffre 150€ · Aquarium 100€ · Fragile 80€ · Meuble lourd 100€/u</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label><input type="checkbox" checked={step3Form.objectPiano} onChange={(e) => setStep3Form((p) => ({ ...p, objectPiano: e.target.checked }))} /> Piano</label>
              <label><input type="checkbox" checked={step3Form.objectCoffreFort} onChange={(e) => setStep3Form((p) => ({ ...p, objectCoffreFort: e.target.checked }))} /> Coffre</label>
              <label><input type="checkbox" checked={step3Form.objectAquarium} onChange={(e) => setStep3Form((p) => ({ ...p, objectAquarium: e.target.checked }))} /> Aquarium</label>
              <label><input type="checkbox" checked={step3Form.objectFragile} onChange={(e) => setStep3Form((p) => ({ ...p, objectFragile: e.target.checked }))} /> Fragile vol.</label>
              <input type="number" min={0} value={step3Form.objectHeavyCount} onChange={(e) => setStep3Form((p) => ({ ...p, objectHeavyCount: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs col-span-2" placeholder="Meubles très lourds (u)" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-sm">
            <div>Formule Step 3</div>
            <div className="text-gray-400">Delta de formule</div>
            <select value={step3Form.formule} onChange={(e) => setStep3Form((p) => ({ ...p, formule: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <option value="ECONOMIQUE">Économique</option>
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={runStep3Simulation} disabled={simulatingStep3} className="rounded-lg px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold">
              {simulatingStep3 ? "Simulation..." : "Simuler Step 3"}
            </button>
          </div>

          {step3Simulation && (
            <div className="mt-2 rounded-xl border border-gray-800 bg-gray-950/50 p-4 text-sm space-y-1">
              {step3Simulation.effectiveInput && (
                <p><span className="text-gray-500">Input effectif (après règles Box):</span> surface {step3Simulation.effectiveInput.surfaceM2} m² · densité {step3Simulation.effectiveInput.density} · extra {step3Simulation.effectiveInput.extraVolumeM3} m³</p>
              )}
              <p><span className="text-gray-500">Prix brut (centre):</span> {fmtEur(step3Simulation.detailed.raw.prixFinal)}</p>
              <p><span className="text-gray-500">Provision:</span> {fmtEur(step3Simulation.detailed.withProvision.provisionEur)}</p>
              <p><span className="text-gray-500">Réduction Box (Accès - étages):</span> -{fmtEur(step3Simulation.detailed.addons.box.accessHousingBoxDiscountEur)}</p>
              <p><span className="text-gray-500">Add-ons fixes accès:</span> {fmtEur(step3Simulation.detailed.addons.accessFixedAddonEur)}</p>
              <p><span className="text-gray-500">Add-ons fixes objets:</span> {fmtEur(step3Simulation.detailed.addons.objectsFixedAddonEur)}</p>
              <p><span className="text-gray-500">Centre final Step 3:</span> {fmtEur(step3Simulation.detailed.withProvisionAndAddons.centerAfterProvisionEur)}</p>
              <p><span className="text-gray-500">Fourchette Step 3:</span> {fmtEur(step3Simulation.detailed.withProvisionAndAddons.prixMin)} → {fmtEur(step3Simulation.detailed.withProvisionAndAddons.prixMax)}</p>
              <p><span className="text-gray-500">Comparatif baseline Step 2:</span> {fmtEur(step3Simulation.baseline.step2CenterAfterProvisionEur)}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          <h2 className="text-base font-semibold text-white">3) Audit tableur exhaustif</h2>
          <p className="text-xs text-gray-500">Colonnes fixes: Facteur · Source code · Formule · Input simulation · Valeur appliquée · Impact €</p>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-emerald-300">Step 2</p>
            <div className="hidden lg:grid lg:grid-cols-6 gap-2 text-[11px] uppercase tracking-wide text-gray-500">
              <div>Facteur</div><div>Source code</div><div>Formule</div><div>Input simulation</div><div>Valeur appliquée</div><div>Impact €</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs border-t border-gray-800 pt-2">
              <div>Surface m²</div>
              <div className="text-gray-400">`lib/pricing/calculate.ts`</div>
              <div className="text-gray-400">Volume base = coeff logement × surface</div>
              <input type="number" value={step2Form.surfaceM2} onChange={(e) => setStep2Form((p) => ({ ...p, surfaceM2: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5" />
              <div>{step2Form.surfaceM2} m²</div>
              <div>—</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Distance + buffer</div>
              <div className="text-gray-400">`lib/pricing/scenarios.ts`</div>
              <div className="text-gray-400">distanceStep2 = distanceVille + buffer</div>
              <div className="grid grid-cols-2 gap-1">
                <input type="number" value={step2Form.cityDistanceKm} onChange={(e) => setStep2Form((p) => ({ ...p, cityDistanceKm: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5" placeholder="km ville" />
                <input type="number" value={step2Form.bufferKm} onChange={(e) => setStep2Form((p) => ({ ...p, bufferKm: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5" placeholder="buffer" />
              </div>
              <div>{Math.max(0, step2Form.cityDistanceKm + step2Form.bufferKm)} km</div>
              <div>—</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Densité préset</div>
              <div className="text-gray-400">`lib/pricing/scenarios.ts`</div>
              <div className="text-gray-400">Step2 default: dense</div>
              <select value={step2Form.density} onChange={(e) => setStep2Form((p) => ({ ...p, density: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                <option value="light">light</option><option value="normal">normal</option><option value="dense">dense</option>
              </select>
              <div>{step2Form.density}</div>
              <div>—</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Décote</div>
              <div className="text-gray-400">`lib/pricing/constants.ts`</div>
              <div className="text-gray-400">DECOTE factor sur rate/m³ + distance</div>
              <input readOnly value={fmtPct(hypotheses?.decote ?? -0.2)} className="bg-gray-800/60 border border-gray-700 rounded px-2 py-1.5 text-gray-300" />
              <div>{fmtPct(hypotheses?.decote ?? -0.2)}</div>
              <div>—</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Provision Moverz</div>
              <div className="text-gray-400">`lib/pricing/scenarios.ts`</div>
              <div className="text-gray-400">MAX(100€; 10% du centre)</div>
              <input readOnly value={step2Simulation ? fmtEur(step2Simulation.baseline.moverzFeeProvisionEur) : "Simuler Step 2"} className="bg-gray-800/60 border border-gray-700 rounded px-2 py-1.5 text-gray-300" />
              <div>{step2Simulation ? fmtEur(step2Simulation.baseline.moverzFeeProvisionEur) : "—"}</div>
              <div>{step2Simulation ? fmtEur(step2Simulation.baseline.moverzFeeProvisionEur) : "—"}</div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-800">
            <p className="text-sm font-semibold text-purple-300">Step 3</p>
            <div className="hidden lg:grid lg:grid-cols-6 gap-2 text-[11px] uppercase tracking-wide text-gray-500">
              <div>Facteur</div><div>Source code</div><div>Formule</div><div>Input simulation</div><div>Valeur appliquée</div><div>Impact €</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs border-t border-gray-800 pt-2">
              <div>Date/saison</div>
              <div className="text-gray-400">`app/devis-gratuits-v3/page.tsx`</div>
              <div className="text-gray-400">seasonFactor = saison × urgence</div>
              <input type="number" step="0.01" value={step3Form.seasonFactor} onChange={(e) => setStep3Form((p) => ({ ...p, seasonFactor: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5" />
              <div>×{step3Form.seasonFactor}</div>
              <div>—</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Majos accès (%)</div>
              <div className="text-gray-400">`lib/pricing/calculate.ts`</div>
              <div className="text-gray-400">(portage ?1.05)×(étroit ?1.05)×(parking ?1.03)</div>
              <div className="flex gap-2">
                <label><input type="checkbox" checked={step3Form.longCarry} onChange={(e) => setStep3Form((p) => ({ ...p, longCarry: e.target.checked }))} /> P</label>
                <label><input type="checkbox" checked={step3Form.tightAccess} onChange={(e) => setStep3Form((p) => ({ ...p, tightAccess: e.target.checked }))} /> E</label>
                <label><input type="checkbox" checked={step3Form.difficultParking} onChange={(e) => setStep3Form((p) => ({ ...p, difficultParking: e.target.checked }))} /> S</label>
              </div>
              <div>{step3Form.longCarry || step3Form.tightAccess || step3Form.difficultParking ? "actif" : "off"}</div>
              <div>inclu centre brut</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Add-ons contraintes fixes</div>
              <div className="text-gray-400">`app/devis-gratuits-v3/page.tsx`</div>
              <div className="text-gray-400">70/80/100/250€ par côté</div>
              <div className="grid grid-cols-4 gap-1">
                <input type="number" min={0} max={2} value={step3Form.narrowAccessSides} onChange={(e) => setStep3Form((p) => ({ ...p, narrowAccessSides: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1" />
                <input type="number" min={0} max={2} value={step3Form.longCarrySides} onChange={(e) => setStep3Form((p) => ({ ...p, longCarrySides: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1" />
                <input type="number" min={0} max={2} value={step3Form.difficultParkingSides} onChange={(e) => setStep3Form((p) => ({ ...p, difficultParkingSides: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1" />
                <input type="number" min={0} max={2} value={step3Form.liftRequiredSides} onChange={(e) => setStep3Form((p) => ({ ...p, liftRequiredSides: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1" />
              </div>
              <div>{step3Simulation ? fmtEur(step3Simulation.detailed.addons.accessFixedAddonEur) : "—"}</div>
              <div>{step3Simulation ? fmtEur(step3Simulation.detailed.addons.accessFixedAddonEur) : "—"}</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Add-ons objets fixes</div>
              <div className="text-gray-400">`app/devis-gratuits-v3/page.tsx`</div>
              <div className="text-gray-400">150/150/100/80€ + 100€/u</div>
              <div className="grid grid-cols-2 gap-1">
                <label><input type="checkbox" checked={step3Form.objectPiano} onChange={(e) => setStep3Form((p) => ({ ...p, objectPiano: e.target.checked }))} /> Piano</label>
                <label><input type="checkbox" checked={step3Form.objectCoffreFort} onChange={(e) => setStep3Form((p) => ({ ...p, objectCoffreFort: e.target.checked }))} /> Coffre</label>
                <label><input type="checkbox" checked={step3Form.objectAquarium} onChange={(e) => setStep3Form((p) => ({ ...p, objectAquarium: e.target.checked }))} /> Aquarium</label>
                <label><input type="checkbox" checked={step3Form.objectFragile} onChange={(e) => setStep3Form((p) => ({ ...p, objectFragile: e.target.checked }))} /> Fragile</label>
                <input type="number" min={0} value={step3Form.objectHeavyCount} onChange={(e) => setStep3Form((p) => ({ ...p, objectHeavyCount: Number(e.target.value) }))} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 col-span-2" placeholder="lourds u" />
              </div>
              <div>{step3Simulation ? fmtEur(step3Simulation.detailed.addons.objectsFixedAddonEur) : "—"}</div>
              <div>{step3Simulation ? fmtEur(step3Simulation.detailed.addons.objectsFixedAddonEur) : "—"}</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Option Box</div>
              <div className="text-gray-400">`app/devis-gratuits-v3/page.tsx`</div>
              <div className="text-gray-400">Départ box: m³ exact -&gt; surface dérivée, densité=normal, cuisine=0 + remise accès -20%</div>
              <div className="grid grid-cols-3 gap-1">
                <label><input type="checkbox" checked={step3Form.originIsBox} onChange={(e) => setStep3Form((p) => ({ ...p, originIsBox: e.target.checked }))} /> dép.</label>
                <label><input type="checkbox" checked={step3Form.destinationIsBox} onChange={(e) => setStep3Form((p) => ({ ...p, destinationIsBox: e.target.checked }))} /> arr.</label>
                <input type="text" value={step3Form.originBoxVolumeM3} onChange={(e) => setStep3Form((p) => ({ ...p, originBoxVolumeM3: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1" placeholder="m³" />
              </div>
              <div>{step3Simulation?.effectiveInput ? `surface=${step3Simulation.effectiveInput.surfaceM2} · densité=${step3Simulation.effectiveInput.density}` : "—"}</div>
              <div>{step3Simulation ? `-${fmtEur(step3Simulation.detailed.addons.box.accessHousingBoxDiscountEur)}` : "—"}</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center text-xs">
              <div>Provision Moverz</div>
              <div className="text-gray-400">`lib/pricing/scenarios.ts`</div>
              <div className="text-gray-400">MAX(100€; 10% du centre)</div>
              <input readOnly value={step3Simulation ? fmtEur(step3Simulation.detailed.withProvision.provisionEur) : "Simuler Step 3"} className="bg-gray-800/60 border border-gray-700 rounded px-2 py-1.5 text-gray-300" />
              <div>{step3Simulation ? fmtEur(step3Simulation.detailed.withProvision.provisionEur) : "—"}</div>
              <div>{step3Simulation ? fmtEur(step3Simulation.detailed.withProvision.provisionEur) : "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AB Test comparison tab
// ============================================================

const STEP_ORDER_AB = ["CONTACT", "PROJECT", "RECAP", "THANK_YOU"];

function AbTestTab({ password }: { password: string }) {
  const [data, setData] = useState<AbTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const to = new Date().toISOString();
      const from = new Date(Date.now() - days * 86400000).toISOString();
      const res = await fetch(
        `/api/analytics/ab-test?password=${encodeURIComponent(password)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&includeTests=false`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Erreur serveur");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [password, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Chargement AB test…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">{error}</div>
      </div>
    );
  }
  if (!data) return null;

  const variantA = data.variants.find(v => v.variant === "A");
  const variantB = data.variants.find(v => v.variant === "B");

  const totalSessions = (variantA?.sessions ?? 0) + (variantB?.sessions ?? 0);

  const sortedFunnel = (funnel: AbTestVariantData["funnel"]) => {
    return [...funnel].sort((a, b) => {
      const ia = STEP_ORDER_AB.indexOf(a.logical_step);
      const ib = STEP_ORDER_AB.indexOf(b.logical_step);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">AB Test — UX 9-fev (A) vs Actuel (B)</h2>
        <div className="flex gap-2">
          {[1, 3, 7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                days === d
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {d}j
            </button>
          ))}
        </div>
      </div>

      {totalSessions === 0 ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-lg">Aucune donnée AB test sur cette période.</p>
          <p className="text-gray-500 text-sm mt-2">Les données apparaîtront une fois le test en production.</p>
        </div>
      ) : (
        <>
          {/* KPI comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[variantA, variantB].map(v => {
              if (!v) return null;
              const label = v.variant === "A" ? "Variante A — UX 9 fév" : "Variante B — Actuel";
              const color = v.variant === "A" ? "from-blue-600/20 to-blue-800/10 border-blue-700/40" : "from-green-600/20 to-green-800/10 border-green-700/40";
              const accentColor = v.variant === "A" ? "text-blue-400" : "text-green-400";
              return (
                <div key={v.variant} className={`bg-gradient-to-br ${color} border rounded-xl p-6 space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-bold text-lg ${accentColor}`}>{label}</h3>
                    <span className="text-xs text-gray-500 bg-gray-800/60 px-2 py-1 rounded">
                      {Math.round((v.sessions / totalSessions) * 100)}% du trafic
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-white">{v.sessions}</div>
                      <div className="text-xs text-gray-400">Sessions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{v.completions}</div>
                      <div className="text-xs text-gray-400">Completions</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${accentColor}`}>{v.conversionRate}%</div>
                      <div className="text-xs text-gray-400">Conversion</div>
                    </div>
                  </div>
                  {v.avgDurationMs > 0 && (
                    <div className="text-sm text-gray-400">
                      Durée moy. : {formatDuration(v.avgDurationMs)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Winner indicator */}
          {variantA && variantB && variantA.sessions >= 10 && variantB.sessions >= 10 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
              {(() => {
                const diff = variantA.conversionRate - variantB.conversionRate;
                if (Math.abs(diff) < 0.5) {
                  return <span className="text-gray-400">Pas de différence significative pour l'instant ({Math.abs(diff).toFixed(1)}pp)</span>;
                }
                const winner = diff > 0 ? "A" : "B";
                const winnerLabel = winner === "A" ? "UX 9 fév" : "Actuel";
                const winnerColor = winner === "A" ? "text-blue-400" : "text-green-400";
                return (
                  <span className="text-gray-300">
                    Tendance : <span className={`font-bold ${winnerColor}`}>{winnerLabel} ({winner})</span> +{Math.abs(diff).toFixed(1)}pp
                    <span className="text-gray-500 ml-2">
                      ({totalSessions} sessions — {totalSessions < 100 ? "pas encore significatif" : totalSessions < 500 ? "tendance à confirmer" : "signal fort"})
                    </span>
                  </span>
                );
              })()}
            </div>
          )}

          {/* Funnel comparison */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-bold mb-4">Funnel par étape</h3>
            <div className="space-y-3">
              {STEP_ORDER_AB.map(step => {
                const aVal = variantA?.funnel.find(f => f.logical_step === step)?.sessions ?? 0;
                const bVal = variantB?.funnel.find(f => f.logical_step === step)?.sessions ?? 0;
                const maxVal = Math.max(aVal, bVal, 1);
                return (
                  <div key={step} className="space-y-1">
                    <div className="text-sm text-gray-400 font-medium">{step}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-blue-400 w-6 text-right">A</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-blue-600/70 h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${(aVal / maxVal) * 100}%`, minWidth: aVal > 0 ? "2rem" : 0 }}
                        >
                          <span className="text-xs text-white font-medium">{aVal}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-green-400 w-6 text-right">B</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-green-600/70 h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${(bVal / maxVal) * 100}%`, minWidth: bVal > 0 ? "2rem" : 0 }}
                        >
                          <span className="text-xs text-white font-medium">{bVal}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily trend */}
          {(variantA?.daily.length || variantB?.daily.length) ? (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Sessions / jour</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left py-2 pr-4">Jour</th>
                      <th className="text-right py-2 px-3 text-blue-400">A sess.</th>
                      <th className="text-right py-2 px-3 text-blue-400">A conv.</th>
                      <th className="text-right py-2 px-3 text-green-400">B sess.</th>
                      <th className="text-right py-2 px-3 text-green-400">B conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allDays = new Set<string>();
                      variantA?.daily.forEach(d => allDays.add(d.day));
                      variantB?.daily.forEach(d => allDays.add(d.day));
                      return Array.from(allDays).sort().map(day => {
                        const aDay = variantA?.daily.find(d => d.day === day);
                        const bDay = variantB?.daily.find(d => d.day === day);
                        return (
                          <tr key={day} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="py-2 pr-4 text-gray-300">{new Date(day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</td>
                            <td className="text-right px-3 text-gray-300">{aDay?.sessions ?? 0}</td>
                            <td className="text-right px-3 text-blue-400">{aDay?.conversion_rate ?? 0}%</td>
                            <td className="text-right px-3 text-gray-300">{bDay?.sessions ?? 0}</td>
                            <td className="text-right px-3 text-green-400">{bDay?.conversion_rate ?? 0}%</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// ============================================================
// Page wrapper with tabs
// ============================================================

export default function AnalyticsPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "journal" | "pricing" | "abtest">("dashboard");

  if (!password) {
    return <PasswordGate onAuth={setPassword} />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Tab bar */}
      <div className="border-b border-gray-800 bg-gray-950 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex gap-1">
          <button
            onClick={() => setTab("dashboard")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === "dashboard"
                ? "border-purple-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setTab("journal")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === "journal"
                ? "border-purple-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            📋 Journal
          </button>
          <button
            onClick={() => setTab("pricing")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === "pricing"
                ? "border-purple-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            🧠 Hypothèses & Simulation
          </button>
          <button
            onClick={() => setTab("abtest")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === "abtest"
                ? "border-purple-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            🔬 AB Test
          </button>
        </div>
      </div>

      {tab === "dashboard" && <Dashboard password={password} />}
      {tab === "journal" && <Journal password={password} />}
      {tab === "pricing" && <PricingLab password={password} />}
      {tab === "abtest" && <AbTestTab password={password} />}
    </div>
  );
}
