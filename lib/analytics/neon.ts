/**
 * Analytics Neon client — singleton pool + write/read helpers.
 * Uses @neondatabase/serverless for edge/serverless compatibility.
 * 
 * Env: ANALYTICS_DATABASE_URL (Neon Postgres connection string)
 */

import { neon, neonConfig } from "@neondatabase/serverless";

// Cache the SQL function (stateless, no pool needed for serverless)
let _sql: ReturnType<typeof neon> | null = null;

function getSQL() {
  if (_sql) return _sql;

  const url = process.env.ANALYTICS_DATABASE_URL;
  if (!url) {
    throw new Error(
      "ANALYTICS_DATABASE_URL is not set. Configure it to point to your Neon Postgres database."
    );
  }

  // fetchConnectionCache enables HTTP connection caching (better perf in serverless)
  neonConfig.fetchConnectionCache = true;

  _sql = neon(url);
  return _sql;
}

// ============================================================
// Types
// ============================================================

export interface AnalyticsEventInput {
  // Identifiers
  sessionId: string;
  leadTunnelId?: string | null;
  backofficeLeadId?: string | null;

  // Event
  eventType: string;
  logicalStep?: string | null;
  screenId?: string | null;

  // Acquisition
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer?: string | null;
  landingUrl?: string | null;

  // Geo (server-side enrichment)
  country?: string | null;
  region?: string | null;
  cityGeo?: string | null;

  // Device
  device?: string | null;
  userAgent?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  language?: string | null;
  timezone?: string | null;
  connectionType?: string | null;

  // Context
  urlPath: string;
  email?: string | null;
  isTestUser?: boolean;

  // Snapshots
  formSnapshot?: Record<string, unknown> | null;
  pricingSnapshot?: Record<string, unknown> | null;

  // Extra
  extra?: Record<string, unknown> | null;

  // Client timestamp
  clientTimestamp?: string | null;
}

// ============================================================
// Test user detection
// ============================================================

const TEST_EMAILS = new Set([
  "gdetaisne@gmail.com",
  "veltzlucie@gmail.com",
]);

function isGmailAlias(email: string, base: string): boolean {
  const [local, domain] = email.toLowerCase().split("@");
  if (domain !== "gmail.com") return false;
  const localWithoutPlus = local.split("+")[0];
  return localWithoutPlus === base;
}

export function isTestUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (TEST_EMAILS.has(e)) return true;
  if (isGmailAlias(e, "gdetaisne")) return true;
  if (e.endsWith("@moverz.fr")) return true;
  return false;
}

// ============================================================
// Write: Insert event + Upsert session
// ============================================================

export async function insertAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  const sql = getSQL();
  const isTest = input.isTestUser ?? isTestUserEmail(input.email);

  // 1. Insert event
  await sql`
    INSERT INTO tunnel_events (
      session_id, lead_tunnel_id, backoffice_lead_id,
      event_type, logical_step, screen_id,
      source, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      gclid, fbclid, referrer, landing_url,
      country, region, city_geo,
      device, user_agent, screen_width, screen_height,
      language, timezone, connection_type,
      url_path, email, is_test_user,
      form_snapshot, pricing_snapshot, extra,
      client_timestamp
    ) VALUES (
      ${input.sessionId},
      ${input.leadTunnelId ?? null},
      ${input.backofficeLeadId ?? null},
      ${input.eventType},
      ${input.logicalStep ?? null},
      ${input.screenId ?? null},
      ${input.source ?? null},
      ${input.utmSource ?? null},
      ${input.utmMedium ?? null},
      ${input.utmCampaign ?? null},
      ${input.utmContent ?? null},
      ${input.utmTerm ?? null},
      ${input.gclid ?? null},
      ${input.fbclid ?? null},
      ${input.referrer ?? null},
      ${input.landingUrl ?? null},
      ${input.country ?? null},
      ${input.region ?? null},
      ${input.cityGeo ?? null},
      ${input.device ?? null},
      ${input.userAgent ?? null},
      ${input.screenWidth ?? null},
      ${input.screenHeight ?? null},
      ${input.language ?? null},
      ${input.timezone ?? null},
      ${input.connectionType ?? null},
      ${input.urlPath},
      ${input.email ?? null},
      ${isTest},
      ${input.formSnapshot ? JSON.stringify(input.formSnapshot) : null},
      ${input.pricingSnapshot ? JSON.stringify(input.pricingSnapshot) : null},
      ${input.extra ? JSON.stringify(input.extra) : null},
      ${input.clientTimestamp ?? null}
    )
  `;

  // 2. Upsert session
  const stepIndex = (input.extra as any)?.stepIndex ?? 0;
  const isCompleted = input.eventType === "TUNNEL_COMPLETED";
  const totalDurationMs = isCompleted ? ((input.extra as any)?.totalDurationMs ?? null) : null;

  await sql`
    INSERT INTO tunnel_sessions (
      session_id, source, utm_source, utm_medium, utm_campaign,
      referrer, country, device, landing_url,
      backoffice_lead_id, completed, last_step, max_step_index,
      total_duration_ms, events_count, is_test_user, email
    ) VALUES (
      ${input.sessionId},
      ${input.source ?? null},
      ${input.utmSource ?? null},
      ${input.utmMedium ?? null},
      ${input.utmCampaign ?? null},
      ${input.referrer ?? null},
      ${input.country ?? null},
      ${input.device ?? null},
      ${input.landingUrl ?? null},
      ${input.backofficeLeadId ?? null},
      ${isCompleted},
      ${input.logicalStep ?? null},
      ${stepIndex},
      ${totalDurationMs},
      1,
      ${isTest},
      ${input.email ?? null}
    )
    ON CONFLICT (session_id) DO UPDATE SET
      updated_at = now(),
      backoffice_lead_id = COALESCE(EXCLUDED.backoffice_lead_id, tunnel_sessions.backoffice_lead_id),
      completed = tunnel_sessions.completed OR EXCLUDED.completed,
      last_step = EXCLUDED.last_step,
      max_step_index = GREATEST(tunnel_sessions.max_step_index, EXCLUDED.max_step_index),
      total_duration_ms = COALESCE(EXCLUDED.total_duration_ms, tunnel_sessions.total_duration_ms),
      events_count = tunnel_sessions.events_count + 1,
      is_test_user = tunnel_sessions.is_test_user OR EXCLUDED.is_test_user,
      email = COALESCE(EXCLUDED.email, tunnel_sessions.email)
  `;
}

// ============================================================
// Read: Dashboard queries
// ============================================================

export interface FunnelRow {
  logical_step: string;
  sessions: number;
}

export interface SourceRow {
  source: string;
  sessions: number;
  completions: number;
  conversion_rate: number;
}

export interface DeviceRow {
  device: string;
  sessions: number;
  pct: number;
}

export interface CountryRow {
  country: string;
  sessions: number;
  pct: number;
}

export interface DailyRow {
  day: string;
  sessions: number;
  completions: number;
  conversion_rate: number;
}

export interface StepDurationRow {
  logical_step: string;
  median_duration_ms: number;
  avg_duration_ms: number;
  p90_duration_ms: number;
}

export interface DashboardData {
  // KPIs
  totalSessions: number;
  totalCompletions: number;
  conversionRate: number;
  avgDurationMs: number;

  // Breakdowns
  funnel: FunnelRow[];
  sources: SourceRow[];
  devices: DeviceRow[];
  countries: CountryRow[];
  daily: DailyRow[];
  stepDurations: StepDurationRow[];

  // Period
  periodStart: string;
  periodEnd: string;
}

export async function getDashboardData(
  daysBack: number = 30,
  excludeTests: boolean = true
): Promise<DashboardData> {
  const sql = getSQL();
  const testFilter = excludeTests ? true : false;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - daysBack);
  const periodStartIso = periodStart.toISOString();

  // KPIs from sessions
  const kpiRows = await sql`
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE completed = true) as total_completions,
      ROUND(
        COUNT(*) FILTER (WHERE completed = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1
      ) as conversion_rate,
      ROUND(AVG(total_duration_ms) FILTER (WHERE total_duration_ms IS NOT NULL)) as avg_duration_ms
    FROM tunnel_sessions
    WHERE created_at >= ${periodStartIso}
      AND (${!excludeTests} OR is_test_user = false)
  `;

  // Funnel: count distinct sessions per logical step
  const funnelRows = await sql`
    SELECT 
      logical_step,
      COUNT(DISTINCT session_id) as sessions
    FROM tunnel_events
    WHERE created_at >= ${periodStartIso}
      AND event_type = 'TUNNEL_STEP_VIEWED'
      AND logical_step IS NOT NULL
      AND (${!excludeTests} OR is_test_user = false)
    GROUP BY logical_step
    ORDER BY sessions DESC
  `;

  // Top sources
  const sourceRows = await sql`
    SELECT 
      COALESCE(source, 'direct') as source,
      COUNT(*) as sessions,
      COUNT(*) FILTER (WHERE completed = true) as completions,
      ROUND(
        COUNT(*) FILTER (WHERE completed = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1
      ) as conversion_rate
    FROM tunnel_sessions
    WHERE created_at >= ${periodStartIso}
      AND (${!excludeTests} OR is_test_user = false)
    GROUP BY source
    ORDER BY sessions DESC
    LIMIT 20
  `;

  // Device breakdown
  const deviceRows = await sql`
    SELECT 
      COALESCE(device, 'unknown') as device,
      COUNT(*) as sessions,
      ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0) * 100, 1) as pct
    FROM tunnel_sessions
    WHERE created_at >= ${periodStartIso}
      AND (${!excludeTests} OR is_test_user = false)
    GROUP BY device
    ORDER BY sessions DESC
  `;

  // Country breakdown
  const countryRows = await sql`
    SELECT 
      COALESCE(country, 'unknown') as country,
      COUNT(*) as sessions,
      ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0) * 100, 1) as pct
    FROM tunnel_sessions
    WHERE created_at >= ${periodStartIso}
      AND (${!excludeTests} OR is_test_user = false)
    GROUP BY country
    ORDER BY sessions DESC
    LIMIT 15
  `;

  // Daily trend
  const dailyRows = await sql`
    SELECT 
      DATE(created_at AT TIME ZONE 'Europe/Paris') as day,
      COUNT(*) as sessions,
      COUNT(*) FILTER (WHERE completed = true) as completions,
      ROUND(
        COUNT(*) FILTER (WHERE completed = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1
      ) as conversion_rate
    FROM tunnel_sessions
    WHERE created_at >= ${periodStartIso}
      AND (${!excludeTests} OR is_test_user = false)
    GROUP BY DATE(created_at AT TIME ZONE 'Europe/Paris')
    ORDER BY day ASC
  `;

  // Step durations (from TUNNEL_STEP_CHANGED events)
  const stepDurationRows = await sql`
    SELECT
      extra->>'fromStep' as logical_step,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (extra->>'durationMs')::numeric) as median_duration_ms,
      ROUND(AVG((extra->>'durationMs')::numeric)) as avg_duration_ms,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY (extra->>'durationMs')::numeric) as p90_duration_ms
    FROM tunnel_events
    WHERE created_at >= ${periodStartIso}
      AND event_type = 'TUNNEL_STEP_CHANGED'
      AND extra->>'durationMs' IS NOT NULL
      AND (${!excludeTests} OR is_test_user = false)
    GROUP BY extra->>'fromStep'
    ORDER BY median_duration_ms ASC
  `;

  // Cast results to any[] for type safety (neon returns FullQueryResults)
  const kpiArr = kpiRows as unknown as any[];
  const funnelArr = funnelRows as unknown as any[];
  const sourceArr = sourceRows as unknown as any[];
  const deviceArr = deviceRows as unknown as any[];
  const countryArr = countryRows as unknown as any[];
  const dailyArr = dailyRows as unknown as any[];
  const stepDurationArr = stepDurationRows as unknown as any[];

  const kpi = kpiArr[0] || { total_sessions: 0, total_completions: 0, conversion_rate: 0, avg_duration_ms: 0 };

  return {
    totalSessions: Number(kpi.total_sessions) || 0,
    totalCompletions: Number(kpi.total_completions) || 0,
    conversionRate: Number(kpi.conversion_rate) || 0,
    avgDurationMs: Number(kpi.avg_duration_ms) || 0,

    funnel: funnelArr.map((r: any) => ({
      logical_step: r.logical_step,
      sessions: Number(r.sessions),
    })),
    sources: sourceArr.map((r: any) => ({
      source: r.source,
      sessions: Number(r.sessions),
      completions: Number(r.completions),
      conversion_rate: Number(r.conversion_rate),
    })),
    devices: deviceArr.map((r: any) => ({
      device: r.device,
      sessions: Number(r.sessions),
      pct: Number(r.pct),
    })),
    countries: countryArr.map((r: any) => ({
      country: r.country,
      sessions: Number(r.sessions),
      pct: Number(r.pct),
    })),
    daily: dailyArr.map((r: any) => ({
      day: r.day,
      sessions: Number(r.sessions),
      completions: Number(r.completions),
      conversion_rate: Number(r.conversion_rate),
    })),
    stepDurations: stepDurationArr.map((r: any) => ({
      logical_step: r.logical_step,
      median_duration_ms: Number(r.median_duration_ms),
      avg_duration_ms: Number(r.avg_duration_ms),
      p90_duration_ms: Number(r.p90_duration_ms),
    })),

    periodStart: periodStartIso,
    periodEnd: new Date().toISOString(),
  };
}
