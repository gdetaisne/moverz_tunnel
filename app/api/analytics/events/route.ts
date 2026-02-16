/**
 * POST /api/analytics/events
 * 
 * Receives tunnel events from the frontend, enriches with server-side geo data,
 * and writes to Neon Postgres. Never blocks the tunnel — returns 200 fast.
 */

import { NextRequest, NextResponse } from "next/server";
import { insertAnalyticsEvent, isBotUserAgent, type AnalyticsEventInput } from "@/lib/analytics/neon";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.sessionId || !body.eventType) {
      return NextResponse.json(
        { error: "sessionId and eventType are required" },
        { status: 400 }
      );
    }

    // ---- Bot detection: drop events from bots silently ----
    const userAgent = body.userAgent || req.headers.get("user-agent") || null;
    if (isBotUserAgent(userAgent)) {
      return NextResponse.json({ ok: true, dropped: "bot" }, { status: 200 });
    }

    // ---- Server-side geo enrichment via Vercel/Cloudflare headers ----
    const country =
      body.country ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      null;
    const region =
      body.region ||
      req.headers.get("x-vercel-ip-country-region") ||
      null;
    const cityGeo =
      body.cityGeo ||
      req.headers.get("x-vercel-ip-city") ||
      null;

    const input: AnalyticsEventInput = {
      // Identifiers
      sessionId: body.sessionId,
      leadTunnelId: body.leadTunnelId || null,
      backofficeLeadId: body.backofficeLeadId || null,

      // Event
      eventType: body.eventType,
      logicalStep: body.logicalStep || null,
      screenId: body.screenId || null,

      // Acquisition
      source: body.source || null,
      utmSource: body.utmSource || null,
      utmMedium: body.utmMedium || null,
      utmCampaign: body.utmCampaign || null,
      utmContent: body.utmContent || null,
      utmTerm: body.utmTerm || null,
      gclid: body.gclid || null,
      fbclid: body.fbclid || null,
      referrer: body.referrer || null,
      landingUrl: body.landingUrl || null,

      // Geo (server enriched)
      country,
      region,
      cityGeo,

      // Device
      device: body.device || null,
      userAgent: body.userAgent || req.headers.get("user-agent") || null,
      screenWidth: body.screenWidth ? Number(body.screenWidth) : null,
      screenHeight: body.screenHeight ? Number(body.screenHeight) : null,
      language: body.language || null,
      timezone: body.timezone || null,
      connectionType: body.connectionType || null,

      // Context
      urlPath: body.urlPath || "/",
      email: body.email || null,

      // Snapshots
      formSnapshot: body.formSnapshot || null,
      pricingSnapshot: body.pricingSnapshot || null,

      // Extra
      extra: body.extra || null,

      // Timing
      clientTimestamp: body.clientTimestamp || null,
    };

    // Write to Neon — fire-and-forget in background but we wait for the response
    // to return a meaningful status
    await insertAnalyticsEvent(input);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // Log server-side but don't break the client
    console.error("[analytics/events] Error:", error);

    // If ANALYTICS_DATABASE_URL is not set, return 200 silently
    // so the tunnel never breaks because of analytics
    if (
      error instanceof Error &&
      error.message.includes("ANALYTICS_DATABASE_URL")
    ) {
      return NextResponse.json({ ok: false, reason: "analytics_not_configured" }, { status: 200 });
    }

    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
