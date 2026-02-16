/**
 * GET /api/analytics/journal?password=xxx&sessionId=...&email=...&eventType=...&days=30&limit=100&offset=0&includeTests=false
 *
 * Returns raw event journal from Neon, paginated, with filters.
 */

import { NextRequest, NextResponse } from "next/server";
import { getJournalEvents } from "@/lib/analytics/neon";

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password") || "";
  const expectedPassword = process.env.ANALYTICS_PASSWORD || "";

  if (!expectedPassword) {
    return NextResponse.json(
      { error: "ANALYTICS_PASSWORD not configured" },
      { status: 500 }
    );
  }

  if (password !== expectedPassword) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const data = await getJournalEvents({
      sessionId: req.nextUrl.searchParams.get("sessionId") || undefined,
      email: req.nextUrl.searchParams.get("email") || undefined,
      eventType: req.nextUrl.searchParams.get("eventType") || undefined,
      excludeTests: req.nextUrl.searchParams.get("includeTests") !== "true",
      excludeBots: req.nextUrl.searchParams.get("includeBots") !== "true",
      daysBack: Number(req.nextUrl.searchParams.get("days")) || 30,
      limit: Number(req.nextUrl.searchParams.get("limit")) || 100,
      offset: Number(req.nextUrl.searchParams.get("offset")) || 0,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[analytics/journal] Error:", error);
    return NextResponse.json(
      { error: "Failed to load journal data" },
      { status: 500 }
    );
  }
}
