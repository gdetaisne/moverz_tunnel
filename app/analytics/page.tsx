"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DashboardData, JournalResult, JournalEvent } from "@/lib/analytics/neon";

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

const STEP_ORDER = ["ENTRY", "PROJECT", "RECAP", "CONTACT", "THANK_YOU"];

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

// Block-level funnel order (detailed tunnel flow)
const BLOCK_ORDER = [
  "cities_surface",
  "validate_step1",
  "estimation_recap",
  "validate_step2",
  "route_housing",
  "moving_date",
  "volume_density",
  "formule",
  "contact_info",
  "optional_details",
  "validate_step3",
  "confirmation",
];

const BLOCK_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  cities_surface:    { emoji: "🏙️", label: "Villes & m²",          color: "bg-blue-500" },
  validate_step1:    { emoji: "✅", label: "Validation étape 1",    color: "bg-blue-600" },
  estimation_recap:  { emoji: "💰", label: "Estimation budget",     color: "bg-indigo-500" },
  validate_step2:    { emoji: "✅", label: "Validation étape 2",    color: "bg-indigo-600" },
  route_housing:     { emoji: "🚛", label: "Trajet & logements",    color: "bg-purple-500" },
  moving_date:       { emoji: "📅", label: "Date de déménagement",  color: "bg-purple-600" },
  volume_density:    { emoji: "📦", label: "Volume & densité",      color: "bg-violet-500" },
  formule:           { emoji: "⭐", label: "Formule",               color: "bg-pink-500" },
  contact_info:      { emoji: "📞", label: "Coordonnées",           color: "bg-pink-600" },
  optional_details:  { emoji: "📝", label: "Précisions (facultatif)", color: "bg-rose-500" },
  validate_step3:    { emoji: "✅", label: "Validation étape 3",    color: "bg-green-500" },
  confirmation:      { emoji: "🎉", label: "Confirmation",          color: "bg-green-600" },
};

const STEP_LABELS_EARLY: Record<string, string> = {
  ENTRY:    "🏠 Entrée",
  PROJECT:  "📦 Projet",
  RECAP:    "📋 Récapitulatif",
  CONTACT:  "📞 Contact",
  THANK_YOU:"🎉 Merci",
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

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ============================================================
// Funnel bar
// ============================================================

function FunnelBar({ step, sessions, maxSessions }: { step: string; sessions: number; maxSessions: number }) {
  const pct = maxSessions > 0 ? (sessions / maxSessions) * 100 : 0;
  const colors: Record<string, string> = {
    ENTRY: "bg-blue-500",
    PROJECT: "bg-purple-500",
    RECAP: "bg-indigo-500",
    CONTACT: "bg-pink-500",
    THANK_YOU: "bg-green-500",
  };

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
// Main Dashboard
// ============================================================

function Dashboard({ password }: { password: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/dashboard?password=${encodeURIComponent(password)}&days=${days}&includeTests=false`
      );
      if (res.status === 401) {
        setError("Mot de passe incorrect");
        sessionStorage.removeItem("analytics_pw");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Erreur serveur");
        return;
      }
      const json = await res.json();
      setData(json);
      sessionStorage.setItem("analytics_pw", password);
    } catch (e) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [password, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">📊 Tunnel Analytics</h1>
            <p className="text-gray-400 text-sm">
              {new Date(data.periodStart).toLocaleDateString("fr-FR")} → {new Date(data.periodEnd).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Sessions" value={data.totalSessions} />
          <KpiCard label="Conversions" value={data.totalCompletions} />
          <KpiCard label="Taux conversion" value={formatPct(data.conversionRate)} />
          <KpiCard label="Durée moyenne" value={formatDuration(data.avgDurationMs)} />
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
            <h2 className="text-sm font-semibold text-gray-300 mb-4">🔻 Funnel par étape</h2>
            <div className="space-y-3">
              {funnel.map((f) => (
                <FunnelBar
                  key={f.logical_step}
                  step={f.logical_step}
                  sessions={f.sessions}
                  maxSessions={maxFunnel}
                />
              ))}
            </div>
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
          // Sort blocks by tunnel order
          const sortedBlocks = [...data.blockFunnel].sort(
            (a, b) => BLOCK_ORDER.indexOf(a.block_id) - BLOCK_ORDER.indexOf(b.block_id)
          );
          const maxBlock = Math.max(...sortedBlocks.map((b) => b.sessions), 1);

          // Build duration map
          const durationMap: Record<string, { median: number; avg: number; p90: number }> = {};
          (data.blockDurations || []).forEach((d) => {
            durationMap[d.block_id] = {
              median: d.median_duration_ms,
              avg: d.avg_duration_ms,
              p90: d.p90_duration_ms,
            };
          });

          return (
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">🔍 Funnel détaillé par bloc</h2>
              <p className="text-xs text-gray-500 mb-4">Chaque section du tunnel, avec drop-off et temps médian.</p>
              <div className="space-y-2">
                {sortedBlocks.map((b, i) => {
                  const info = BLOCK_LABELS[b.block_id] || { emoji: "•", label: b.block_id, color: "bg-gray-500" };
                  const pct = maxBlock > 0 ? (b.sessions / maxBlock) * 100 : 0;
                  const dur = durationMap[b.block_id];
                  const prevBlock = sortedBlocks[i - 1];
                  const dropoff = prevBlock && prevBlock.sessions > 0
                    ? ((prevBlock.sessions - b.sessions) / prevBlock.sessions * 100).toFixed(1)
                    : null;

                  return (
                    <div key={b.block_id} className="flex items-center gap-3">
                      <span className="text-gray-400 text-[11px] w-44 text-right truncate">
                        {info.emoji} {info.label}
                      </span>
                      <div className="flex-1 bg-gray-800 rounded-full h-7 overflow-hidden relative">
                        <div
                          className={`h-full ${info.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        >
                          <span className="text-white text-[11px] font-semibold">{b.sessions}</span>
                        </div>
                      </div>
                      <div className="w-24 text-right flex-shrink-0">
                        {dur ? (
                          <span className="text-[10px] text-gray-400" title={`Méd: ${formatDuration(dur.median)} | Moy: ${formatDuration(dur.avg)} | P90: ${formatDuration(dur.p90)}`}>
                            ⏱ {formatDuration(dur.median)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-600">—</span>
                        )}
                      </div>
                      <div className="w-16 text-right flex-shrink-0">
                        {dropoff && Number(dropoff) > 0 ? (
                          <span className="text-[10px] text-red-400">-{dropoff}%</span>
                        ) : (
                          <span className="text-[10px] text-gray-600">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

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

        {/* Footer */}
        <div className="text-center text-gray-600 text-xs pb-8">
          Moverz Tunnel Analytics — Données Neon Postgres
        </div>
      </div>
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
  ENTRY:    "🏠 Entrée",
  PROJECT:  "📦 Projet",
  RECAP:    "📋 Récapitulatif",
  CONTACT:  "📞 Contact",
  THANK_YOU:"🎉 Merci",
};

const SCREEN_LABELS: Record<string, string> = {
  acces_v2:        "Accueil",
  qualification_v2:"Qualification",
  estimation_v2:   "Estimation",
  contact_v3:      "Contact",
  confirmation_v2: "Confirmation",
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
  };

  const clearFilters = () => {
    setActiveSessionId(null);
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
                              {ev.logical_step && (
                                <span className="text-sm text-gray-200 font-medium">{getStepLabel(ev.logical_step)}</span>
                              )}
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
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<PricingSimulatorResponse | null>(null);
  const [form, setForm] = useState({
    surfaceM2: 60,
    distanceKm: 120,
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

  const runSimulation = useCallback(async () => {
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/pricing-simulator?password=${encodeURIComponent(password)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            surfaceM2: form.surfaceM2,
            distanceKm: form.distanceKm,
            formule: form.formule,
            density: form.density,
            seasonFactor: form.seasonFactor,
            originFloor: form.originFloor,
            originElevator: form.originElevator,
            destinationFloor: form.destinationFloor,
            destinationElevator: form.destinationElevator,
            longCarry: form.longCarry,
            tightAccess: form.tightAccess,
            difficultParking: form.difficultParking,
            extraVolumeM3: form.extraVolumeM3,
            services: {
              monteMeuble: form.monteMeuble,
              piano: form.piano === "none" ? null : form.piano,
              debarras: form.debarras,
            },
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Simulation impossible");
        return;
      }
      const json = (await res.json()) as PricingSimulatorResponse;
      setSimulation(json);
    } catch {
      setError("Erreur réseau");
    } finally {
      setSimulating(false);
    }
  }, [password, form]);

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Hypothèses globales</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Centre affiché :</span> <span className="font-semibold">{fmtPct(hypotheses.displayCenterBias)}</span></p>
                <p><span className="text-gray-500">Buffer distance baseline :</span> <span className="font-semibold">+{hypotheses.baselineDistanceBufferKm} km</span></p>
                <p><span className="text-gray-500">Décote :</span> <span className="font-semibold">{fmtPct(hypotheses.decote)}</span></p>
                <p><span className="text-gray-500">Socle minimum :</span> <span className="font-semibold">{fmtEur(hypotheses.prixMinSocle)}</span></p>
                <p><span className="text-gray-500">Provision Moverz :</span> <span className="font-semibold">{hypotheses.moverzFeeProvisionRule}</span></p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Majos accès</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Portage &gt; 10m :</span> <span className="font-semibold">+5%</span></p>
                <p><span className="text-gray-500">Petit ascenseur / passage étroit :</span> <span className="font-semibold">+5%</span></p>
                <p><span className="text-gray-500">Stationnement compliqué :</span> <span className="font-semibold">+3%</span></p>
                <p><span className="text-gray-500">Sans ascenseur :</span> <span className="font-semibold">1er +5% · 2e +10% · 3e+ +15%</span></p>
                <p><span className="text-gray-500">Petit ascenseur :</span> <span className="font-semibold">1er +2% · 2e +6% · 3e+ +10%</span></p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Step 2 — champs préselectionnés</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Densité (défaut) :</span> <span className="font-semibold">{hypotheses.step2Defaults.density}</span></p>
                <p><span className="text-gray-500">Cuisine (défaut) :</span> <span className="font-semibold">{hypotheses.step2Defaults.kitchenIncluded} ({hypotheses.step2Defaults.kitchenApplianceCount} équipements)</span></p>
                <p><span className="text-gray-500">Volume extra cuisine :</span> <span className="font-semibold">{hypotheses.step2Defaults.extraVolumeM3} m³</span></p>
                <p><span className="text-gray-500">Facteur saison :</span> <span className="font-semibold">×{hypotheses.step2Defaults.seasonFactor}</span></p>
                <p><span className="text-gray-500">Étages/ascenseurs :</span> <span className="font-semibold">0 / 0 · yes / yes</span></p>
                <p><span className="text-gray-500">Contraintes :</span> <span className="font-semibold">aucune par défaut</span></p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Densité</h2>
              <DataTable
                headers={["Profil", "Coefficient"]}
                rows={Object.entries(hypotheses.densityCoefficients).map(([k, v]) => [k, v])}
              />
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Services fixes</h2>
              <DataTable
                headers={["Service", "Montant"]}
                rows={Object.entries(hypotheses.servicesPricesEur).map(([k, v]) => [k, fmtEur(v)])}
              />
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-5">
          <h2 className="text-sm font-semibold text-gray-300">Simulateur Step 3 (budget affiné)</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="number"
              value={form.surfaceM2}
              onChange={(e) => setForm((prev) => ({ ...prev, surfaceM2: Number(e.target.value) }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="Surface m²"
            />
            <input
              type="number"
              value={form.distanceKm}
              onChange={(e) => setForm((prev) => ({ ...prev, distanceKm: Number(e.target.value) }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="Distance km"
            />
            <input
              type="number"
              step="0.01"
              value={form.seasonFactor}
              onChange={(e) => setForm((prev) => ({ ...prev, seasonFactor: Number(e.target.value) }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="Facteur saison"
            />
            <input
              type="number"
              step="0.1"
              value={form.extraVolumeM3}
              onChange={(e) => setForm((prev) => ({ ...prev, extraVolumeM3: Number(e.target.value) }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="Volume extra m³"
            />

            <select
              value={form.formule}
              onChange={(e) => setForm((prev) => ({ ...prev, formule: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ECONOMIQUE">Économique</option>
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
            </select>
            <select
              value={form.density}
              onChange={(e) => setForm((prev) => ({ ...prev, density: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="light">Peu meublé</option>
              <option value="normal">Normal</option>
              <option value="dense">Très meublé</option>
            </select>
            <select
              value={form.originElevator}
              onChange={(e) => setForm((prev) => ({ ...prev, originElevator: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="yes">Ascenseur départ: oui</option>
              <option value="partial">Ascenseur départ: petit</option>
              <option value="no">Ascenseur départ: non</option>
            </select>
            <select
              value={form.destinationElevator}
              onChange={(e) => setForm((prev) => ({ ...prev, destinationElevator: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="yes">Ascenseur arrivée: oui</option>
              <option value="partial">Ascenseur arrivée: petit</option>
              <option value="no">Ascenseur arrivée: non</option>
            </select>

            <input
              type="number"
              value={form.originFloor}
              onChange={(e) => setForm((prev) => ({ ...prev, originFloor: Number(e.target.value) }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="Étage départ"
            />
            <input
              type="number"
              value={form.destinationFloor}
              onChange={(e) => setForm((prev) => ({ ...prev, destinationFloor: Number(e.target.value) }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="Étage arrivée"
            />
            <select
              value={form.piano}
              onChange={(e) => setForm((prev) => ({ ...prev, piano: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="none">Piano: non</option>
              <option value="droit">Piano droit</option>
              <option value="quart">Piano quart</option>
            </select>
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="rounded-lg px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold"
            >
              {simulating ? "Simulation..." : "Lancer la simulation"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.longCarry}
                onChange={(e) => setForm((prev) => ({ ...prev, longCarry: e.target.checked }))}
              />
              Portage &gt; 10m
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.tightAccess}
                onChange={(e) => setForm((prev) => ({ ...prev, tightAccess: e.target.checked }))}
              />
              Petit ascenseur / passage étroit
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.difficultParking}
                onChange={(e) => setForm((prev) => ({ ...prev, difficultParking: e.target.checked }))}
              />
              Stationnement compliqué
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.monteMeuble}
                onChange={(e) => setForm((prev) => ({ ...prev, monteMeuble: e.target.checked }))}
              />
              Monte-meuble
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.debarras}
                onChange={(e) => setForm((prev) => ({ ...prev, debarras: e.target.checked }))}
              />
              Débarras
            </label>
          </div>
        </div>

        {simulation && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-6">
            <h3 className="text-sm font-semibold text-gray-300">Step 3 vs Step 2 — détail des calculs</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Entrées de simulation</p>
                <ul className="space-y-1.5 text-sm">
                  <li><span className="text-gray-500">Surface:</span> {simulation.input.surfaceM2} m²</li>
                  <li><span className="text-gray-500">Distance:</span> {simulation.input.distanceKm} km</li>
                  <li><span className="text-gray-500">Formule:</span> {simulation.input.formule}</li>
                  <li><span className="text-gray-500">Densité:</span> {simulation.input.density}</li>
                  <li><span className="text-gray-500">Saison:</span> ×{simulation.input.seasonFactor}</li>
                  <li><span className="text-gray-500">Étages:</span> départ {simulation.input.originFloor} / arrivée {simulation.input.destinationFloor}</li>
                  <li><span className="text-gray-500">Ascenseurs:</span> départ {simulation.input.originElevator} / arrivée {simulation.input.destinationElevator}</li>
                  <li><span className="text-gray-500">Volume extra:</span> {simulation.input.extraVolumeM3} m³</li>
                </ul>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Contraintes & services</p>
                <ul className="space-y-1.5 text-sm">
                  <li><span className="text-gray-500">Portage &gt; 10m:</span> {simulation.input.longCarry ? "oui" : "non"}</li>
                  <li><span className="text-gray-500">Passage étroit / petit asc.:</span> {simulation.input.tightAccess ? "oui" : "non"}</li>
                  <li><span className="text-gray-500">Stationnement compliqué:</span> {simulation.input.difficultParking ? "oui" : "non"}</li>
                  <li><span className="text-gray-500">Monte-meuble:</span> {simulation.input.services.monteMeuble ? "oui" : "non"}</li>
                  <li><span className="text-gray-500">Piano:</span> {simulation.input.services.piano || "non"}</li>
                  <li><span className="text-gray-500">Débarras:</span> {simulation.input.services.debarras ? "oui" : "non"}</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs uppercase tracking-wider text-purple-300 mb-2">Step 3 (affiné)</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Calcul détaillé (avant provision)</p>
              <ul className="space-y-1.5 text-sm">
                <li><span className="text-gray-500">Volume calculé:</span> {simulation.detailed.raw.volumeM3} m³</li>
                <li><span className="text-gray-500">Prix base (hors services):</span> {fmtEur(simulation.detailed.raw.prixBase)}</li>
                <li><span className="text-gray-500">Coeff étage appliqué:</span> ×{simulation.detailed.raw.coeffEtage.toFixed(2)}</li>
                <li><span className="text-gray-500">Prix avec formule/accès:</span> {fmtEur(simulation.detailed.raw.prixAvecFormule)}</li>
                <li><span className="text-gray-500">Total services:</span> {fmtEur(simulation.detailed.raw.servicesTotal)}</li>
                <li><span className="text-gray-500">Prix final centre:</span> {fmtEur(simulation.detailed.raw.prixFinal)}</li>
                <li><span className="text-gray-500">Fourchette:</span> {fmtEur(simulation.detailed.raw.prixMin)} → {fmtEur(simulation.detailed.raw.prixMax)}</li>
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Provision Moverz (interne)</p>
              <ul className="space-y-1.5 text-sm">
                <li><span className="text-gray-500">Centre avant provision:</span> {fmtEur(simulation.detailed.withProvision.centerBeforeProvisionEur)}</li>
                <li><span className="text-gray-500">Provision appliquée:</span> {fmtEur(simulation.detailed.withProvision.provisionEur)}</li>
                <li><span className="text-gray-500">Centre après provision:</span> {fmtEur(simulation.detailed.withProvision.centerAfterProvisionEur)}</li>
                <li><span className="text-gray-500">Fourchette après provision:</span> {fmtEur(simulation.detailed.withProvision.prixMin)} → {fmtEur(simulation.detailed.withProvision.prixMax)}</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs uppercase tracking-wider text-emerald-300 mb-2">Step 2 / Home (baseline figée)</p>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Baseline Step 2 / Home (référence)</p>
              <ul className="space-y-1.5 text-sm">
                <li><span className="text-gray-500">Centre avant provision:</span> {fmtEur(simulation.baseline.step2CenterBeforeProvisionEur)}</li>
                <li><span className="text-gray-500">Provision baseline:</span> {fmtEur(simulation.baseline.moverzFeeProvisionEur)}</li>
                <li><span className="text-gray-500">Centre après provision:</span> {fmtEur(simulation.baseline.step2CenterAfterProvisionEur)}</li>
                <li><span className="text-gray-500">Fourchette baseline:</span> {fmtEur(simulation.baseline.prixMin)} → {fmtEur(simulation.baseline.prixMax)}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Page wrapper with tabs
// ============================================================

export default function AnalyticsPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "journal" | "pricing">("dashboard");

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
        </div>
      </div>

      {tab === "dashboard" && <Dashboard password={password} />}
      {tab === "journal" && <Journal password={password} />}
      {tab === "pricing" && <PricingLab password={password} />}
    </div>
  );
}
