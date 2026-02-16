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

  // Block-level funnel
  blockFunnel: BlockFunnelRow[];
  blockDurations: BlockDurationRow[];

  // Period
  periodStart: string;
  periodEnd: string;
}

// ============================================================
// Read: Block-level funnel + durations
// ============================================================

export interface BlockFunnelRow {
  block_id: string;
  sessions: number;
}

export interface BlockDurationRow {
  block_id: string;
  median_duration_ms: number;
  avg_duration_ms: number;
  p90_duration_ms: number;
}

export async function getBlockFunnel(
  daysBack: number = 30,
  excludeTests: boolean = true
): Promise<{ funnel: BlockFunnelRow[]; durations: BlockDurationRow[] }> {
  const sql = getSQL();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - daysBack);
  const periodStartIso = periodStart.toISOString();

  // Block funnel: distinct sessions per block
  const funnelRows = await sql`
    SELECT
      extra->>'blockId' as block_id,
      COUNT(DISTINCT session_id) as sessions
    FROM tunnel_events
    WHERE created_at >= ${periodStartIso}
      AND event_type = 'BLOCK_ENTERED'
      AND extra->>'blockId' IS NOT NULL
      AND (${!excludeTests} OR is_test_user = false)
    GROUP BY extra->>'blockId'
    ORDER BY sessions DESC
  ` as unknown as any[];

  // Block durations: from prevDurationMs in extra
  const durationRows = await sql`
    SELECT
      extra->>'prevBlock' as block_id,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (extra->>'prevDurationMs')::numeric) as median_duration_ms,
      ROUND(AVG((extra->>'prevDurationMs')::numeric)) as avg_duration_ms,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY (extra->>'prevDurationMs')::numeric) as p90_duration_ms
    FROM tunnel_events
    WHERE created_at >= ${periodStartIso}
      AND event_type = 'BLOCK_ENTERED'
      AND extra->>'prevDurationMs' IS NOT NULL
      AND (extra->>'prevDurationMs')::numeric > 0
      AND extra->>'prevBlock' IS NOT NULL
      AND (${!excludeTests} OR is_test_user = false)
    GROUP BY extra->>'prevBlock'
    ORDER BY median_duration_ms ASC
  ` as unknown as any[];

  return {
    funnel: funnelRows.map((r: any) => ({
      block_id: r.block_id,
      sessions: Number(r.sessions),
    })),
    durations: durationRows.map((r: any) => ({
      block_id: r.block_id,
      median_duration_ms: Number(r.median_duration_ms),
      avg_duration_ms: Number(r.avg_duration_ms),
      p90_duration_ms: Number(r.p90_duration_ms),
    })),
  };
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

  // Block-level funnel + durations
  const blockData = await getBlockFunnel(daysBack, excludeTests);

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

    // Block-level funnel
    blockFunnel: blockData.funnel,
    blockDurations: blockData.durations,

    periodStart: periodStartIso,
    periodEnd: new Date().toISOString(),
  };
}

// ============================================================
// Read: Journal — raw events list (paginated, filterable)
// ============================================================

export interface JournalEvent {
  id: string;
  created_at: string;
  session_id: string;
  event_type: string;
  logical_step: string | null;
  screen_id: string | null;
  source: string | null;
  country: string | null;
  device: string | null;
  email: string | null;
  url_path: string;
  is_test_user: boolean;
  extra: Record<string, unknown> | null;
  form_snapshot: Record<string, unknown> | null;
  pricing_snapshot: Record<string, unknown> | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  user_agent: string | null;
  screen_width: number | null;
  screen_height: number | null;
  language: string | null;
  timezone: string | null;
  region: string | null;
  city_geo: string | null;
}

export interface JournalFilters {
  sessionId?: string;
  email?: string;
  eventType?: string;
  excludeTests?: boolean;
  daysBack?: number;
  limit?: number;
  offset?: number;
}

export interface JournalResult {
  events: JournalEvent[];
  total: number;
  limit: number;
  offset: number;
  /** Distinct sessions found (for sidebar) */
  sessions?: {
    session_id: string;
    email: string | null;
    events_count: number;
    first_seen: string;
    last_step: string | null;
    device: string | null;
    country: string | null;
    completed: boolean;
    source: string | null;
    landing_url: string | null;
    max_step_index: number | null;
    user_agent: string | null;
    referrer: string | null;
    utm_source: string | null;
    language: string | null;
    is_bot: boolean;
  }[];
}

export async function getJournalEvents(filters: JournalFilters): Promise<JournalResult> {
  const sql = getSQL();
  const limit = Math.min(filters.limit || 100, 500);
  const offset = filters.offset || 0;
  const daysBack = filters.daysBack || 30;
  const excludeTests = filters.excludeTests ?? true;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - daysBack);
  const periodStartIso = periodStart.toISOString();

  // Build WHERE conditions dynamically
  // We use a single query with optional filters
  const hasSessionFilter = !!filters.sessionId;
  const hasEmailFilter = !!filters.email;
  const hasEventTypeFilter = !!filters.eventType;

  // Main events query
  const eventsRows = await sql`
    SELECT 
      id, created_at, session_id, event_type, logical_step, screen_id,
      source, country, device, email, url_path, is_test_user,
      extra, form_snapshot, pricing_snapshot,
      utm_source, utm_medium, utm_campaign, utm_content,
      referrer, user_agent, screen_width, screen_height,
      language, timezone, region, city_geo
    FROM tunnel_events
    WHERE created_at >= ${periodStartIso}
      AND (${!excludeTests} OR is_test_user = false)
      AND (${!hasSessionFilter} OR session_id = ${filters.sessionId || ''})
      AND (${!hasEmailFilter} OR email ILIKE ${'%' + (filters.email || '') + '%'})
      AND (${!hasEventTypeFilter} OR event_type = ${filters.eventType || ''})
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  ` as unknown as any[];

  // Count total
  const countRows = await sql`
    SELECT COUNT(*) as total
    FROM tunnel_events
    WHERE created_at >= ${periodStartIso}
      AND (${!excludeTests} OR is_test_user = false)
      AND (${!hasSessionFilter} OR session_id = ${filters.sessionId || ''})
      AND (${!hasEmailFilter} OR email ILIKE ${'%' + (filters.email || '') + '%'})
      AND (${!hasEventTypeFilter} OR event_type = ${filters.eventType || ''})
  ` as unknown as any[];

  const total = Number(countRows[0]?.total) || 0;

  // Sessions sidebar: recent sessions with summary + first event context
  const sessionsRows = await sql`
    SELECT 
      ts.session_id,
      ts.email,
      ts.events_count,
      ts.created_at as first_seen,
      ts.last_step,
      ts.device,
      ts.country,
      ts.completed,
      ts.source,
      ts.landing_url,
      ts.max_step_index,
      fe.user_agent as first_user_agent,
      fe.referrer as first_referrer,
      fe.utm_source as first_utm_source,
      fe.language as first_language
    FROM tunnel_sessions ts
    LEFT JOIN LATERAL (
      SELECT user_agent, referrer, utm_source, language
      FROM tunnel_events
      WHERE session_id = ts.session_id
      ORDER BY created_at ASC
      LIMIT 1
    ) fe ON true
    WHERE ts.created_at >= ${periodStartIso}
      AND (${!excludeTests} OR ts.is_test_user = false)
      AND (${!hasEmailFilter} OR ts.email ILIKE ${'%' + (filters.email || '') + '%'})
    ORDER BY ts.created_at DESC
    LIMIT 50
  ` as unknown as any[];

  return {
    events: eventsRows.map((r: any) => ({
      id: r.id,
      created_at: r.created_at,
      session_id: r.session_id,
      event_type: r.event_type,
      logical_step: r.logical_step,
      screen_id: r.screen_id,
      source: r.source,
      country: r.country,
      device: r.device,
      email: r.email,
      url_path: r.url_path,
      is_test_user: r.is_test_user,
      extra: r.extra,
      form_snapshot: r.form_snapshot,
      pricing_snapshot: r.pricing_snapshot,
      utm_source: r.utm_source,
      utm_medium: r.utm_medium,
      utm_campaign: r.utm_campaign,
      utm_content: r.utm_content,
      referrer: r.referrer,
      user_agent: r.user_agent,
      screen_width: r.screen_width,
      screen_height: r.screen_height,
      language: r.language,
      timezone: r.timezone,
      region: r.region,
      city_geo: r.city_geo,
    })),
    total,
    limit,
    offset,
    sessions: sessionsRows.map((r: any) => {
      const ua = (r.first_user_agent || "").toLowerCase();
      const isBot = /bot|crawl|spider|slurp|facebook|twitter|whatsapp|telegram|preview|lighthouse|pagespeed|pingdom|uptimerobot|headless|phantom|selenium|puppeteer|playwright/i.test(ua);
      return {
        session_id: r.session_id,
        email: r.email,
        events_count: Number(r.events_count),
        first_seen: r.first_seen,
        last_step: r.last_step,
        device: r.device,
        country: r.country,
        completed: r.completed,
        source: r.source,
        landing_url: r.landing_url,
        max_step_index: r.max_step_index != null ? Number(r.max_step_index) : null,
        user_agent: r.first_user_agent,
        referrer: r.first_referrer,
        utm_source: r.first_utm_source,
        language: r.first_language,
        is_bot: isBot,
      };
    }),
  };
}
