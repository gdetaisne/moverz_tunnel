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
      <span className="text-gray-400 text-xs w-24 text-right font-mono">{step}</span>
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
  const [includeTests, setIncludeTests] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/dashboard?password=${encodeURIComponent(password)}&days=${days}&includeTests=${includeTests}`
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
  }, [password, days, includeTests]);

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
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={includeTests}
                onChange={(e) => setIncludeTests(e.target.checked)}
                className="rounded"
              />
              Inclure tests
            </label>
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
                        {funnel[i].logical_step} → {f.logical_step}: <span className="text-red-400">-{dropoff}%</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

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
                  s.logical_step,
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

const EVENT_COLORS: Record<string, string> = {
  TUNNEL_STEP_VIEWED: "bg-purple-500",
  TUNNEL_STEP_CHANGED: "bg-blue-500",
  TUNNEL_COMPLETED: "bg-green-500",
  form_start: "bg-cyan-500",
  field_interaction: "bg-gray-500",
  field_completion: "bg-gray-400",
  validation_error: "bg-red-500",
  pricing_viewed: "bg-yellow-500",
  cta_clicked: "bg-orange-500",
  scroll_depth: "bg-gray-600",
  tab_visibility: "bg-gray-700",
};

function EventBadge({ type }: { type: string }) {
  const bg = EVENT_COLORS[type] || "bg-gray-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono text-white ${bg}`}>
      {type}
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

function SessionCard({
  session,
  isActive,
  onClick,
}: {
  session: { session_id: string; email: string | null; events_count: number; first_seen: string; last_step: string | null; device: string | null; country: string | null; completed: boolean };
  isActive: boolean;
  onClick: () => void;
}) {
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
          {session.email || session.session_id.slice(0, 12) + "…"}
        </span>
        {session.completed && (
          <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">✓</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span>{session.events_count} events</span>
        <span>•</span>
        <span>{session.device || "?"}</span>
        <span>•</span>
        <span>{session.country || "?"}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
        {session.last_step && <span>→ {session.last_step}</span>}
        <span>•</span>
        <TimeAgo date={session.first_seen} />
      </div>
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
  const [includeTests, setIncludeTests] = useState(false);
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
      includeTests: String(includeTests),
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
  }, [password, days, includeTests, activeSessionId, searchQuery, eventTypeFilter, page]);

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
              {activeSessionId && (
                <span className="ml-2 text-purple-400">
                  Filtré : session {activeSessionId.slice(0, 12)}…
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
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={includeTests}
                onChange={(e) => setIncludeTests(e.target.checked)}
                className="rounded"
              />
              Tests
            </label>
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

              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                {journal?.sessions?.map((s) => (
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
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${EVENT_COLORS[ev.event_type] || "bg-gray-600"}`} />

                          {/* Event info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <EventBadge type={ev.event_type} />
                              {ev.logical_step && (
                                <span className="text-xs text-gray-400">→ {ev.logical_step}</span>
                              )}
                              {ev.screen_id && (
                                <span className="text-[10px] text-gray-500">[{ev.screen_id}]</span>
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

// ============================================================
// Page wrapper with tabs
// ============================================================

export default function AnalyticsPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "journal">("dashboard");

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
        </div>
      </div>

      {tab === "dashboard" && <Dashboard password={password} />}
      {tab === "journal" && <Journal password={password} />}
    </div>
  );
}
