import { NextRequest, NextResponse } from "next/server";
import { getSessionsData } from "@/lib/analytics/neon";

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password") || "";
  const expectedPassword = process.env.ANALYTICS_PASSWORD || "";

  if (!expectedPassword) {
    return NextResponse.json({ error: "ANALYTICS_PASSWORD not configured" }, { status: 500 });
  }
  if (password !== expectedPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");
    const daysBack = Number(req.nextUrl.searchParams.get("days")) || 7;

    let periodStartIso: string;
    let periodEndIso: string;

    if (fromParam && toParam) {
      periodStartIso = new Date(fromParam).toISOString();
      periodEndIso = new Date(toParam).toISOString();
    } else {
      const start = new Date();
      start.setDate(start.getDate() - daysBack);
      periodStartIso = start.toISOString();
      periodEndIso = new Date().toISOString();
    }

    const variant = req.nextUrl.searchParams.get("variant") as 'A' | 'B' | 'all' | null;
    const device = req.nextUrl.searchParams.get("device") || undefined;
    const completedParam = req.nextUrl.searchParams.get("completed");
    const completed = completedParam === "true" ? true : completedParam === "false" ? false : undefined;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 100;
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const includeTests = req.nextUrl.searchParams.get("includeTests") === "true";

    const data = await getSessionsData({
      periodStartIso,
      periodEndIso,
      excludeTests: !includeTests,
      variant: variant ?? 'all',
      device,
      completed,
      limit,
      offset,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[analytics/sessions] Error:", error);
    return NextResponse.json({ error: "Failed to load sessions data" }, { status: 500 });
  }
}
