/**
 * GET /api/analytics/dashboard?days=30&includeTests=false&password=xxx
 * 
 * Returns aggregated dashboard data from Neon.
 * Protected by a simple password (ANALYTICS_PASSWORD env var).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/analytics/neon";

export async function GET(req: NextRequest) {
  // Simple password protection
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
    const includeTests = req.nextUrl.searchParams.get("includeTests") === "true";
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");

    let periodStartIso: string;
    let periodEndIso: string;

    if (fromParam && toParam) {
      periodStartIso = new Date(fromParam).toISOString();
      periodEndIso = new Date(toParam).toISOString();
    } else {
      const daysBack = Number(req.nextUrl.searchParams.get("days")) || 30;
      const start = new Date();
      start.setDate(start.getDate() - daysBack);
      periodStartIso = start.toISOString();
      periodEndIso = new Date().toISOString();
    }

    const data = await getDashboardData(periodStartIso, periodEndIso, !includeTests);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[analytics/dashboard] Error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
