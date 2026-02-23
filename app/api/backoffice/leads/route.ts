import { NextRequest, NextResponse } from "next/server";

function getBackofficeBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  let normalized = baseUrl.trim().replace(/\/+$/, "");
  normalized = normalized.replace(/\/(api|public)$/i, "");
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    const API_BASE_URL = getBackofficeBaseUrl();
    const body = await req.text();

    const upstream = await fetch(`${API_BASE_URL}/public/leads`, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        Accept: "application/json",
      },
      body,
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();

    if (contentType.includes("application/json")) {
      try {
        const data = JSON.parse(text);
        return NextResponse.json(data, { status: upstream.status });
      } catch {
        return NextResponse.json(
          { error: "UPSTREAM_INVALID_JSON", raw: text },
          { status: upstream.status }
        );
      }
    }

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": contentType || "text/plain" },
    });
  } catch (err: unknown) {
    console.error("Proxy POST /api/backoffice/leads failed:", err);
    return NextResponse.json(
      { error: "PROXY_ERROR", message: "Unable to reach backoffice" },
      { status: 502 }
    );
  }
}
