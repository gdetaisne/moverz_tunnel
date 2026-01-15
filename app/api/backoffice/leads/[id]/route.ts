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

function getBasicAuthHeader(): string | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !pass) return null;
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${token}`;
}

function getUpstreamHeaders(baseHeaders?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    ...(baseHeaders || {}),
    "x-user-id": "public-form",
  };
  const auth = getBasicAuthHeader();
  if (auth) {
    headers.Authorization = auth;
  }
  return headers;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const API_BASE_URL = getBackofficeBaseUrl();

    const upstream = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: "GET",
      headers: getUpstreamHeaders({
        Accept: "application/json",
      }),
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
    console.error("❌ Proxy GET /api/backoffice/leads/[id] failed:", err);
    return NextResponse.json(
      { error: "PROXY_ERROR", message: "Unable to reach backoffice" },
      { status: 502 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const API_BASE_URL = getBackofficeBaseUrl();
    const body = await req.text(); // forward raw body

    const upstream = await fetch(`${API_BASE_URL}/public/leads/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        Accept: req.headers.get("accept") || "application/json",
      },
      body,
      // server-to-server: no credentials/cookies needed for /public
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();

    // Mirror status; keep JSON when possible
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
    console.error("❌ Proxy PATCH /api/backoffice/leads/[id] failed:", err);
    return NextResponse.json(
      { error: "PROXY_ERROR", message: "Unable to reach backoffice" },
      { status: 502 }
    );
  }
}

// Proxy GET /api/backoffice/leads/:id -> GET ${API_PUBLIC_URL}/public/leads/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const API_BASE_URL = getBackofficeBaseUrl();

    const upstream = await fetch(`${API_BASE_URL}/public/leads/${id}`, {
      method: "GET",
      headers: {
        Accept: req.headers.get("accept") || "application/json",
      },
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();

    // Si le Back Office ne supporte pas ce GET (ou lead introuvable),
    // renvoyer 200 + payload neutre pour éviter des erreurs réseau visibles.
    if (upstream.status === 404) {
      return NextResponse.json(
        {
          success: false,
          warning: "UPSTREAM_404",
          data: null,
          upstream: {
            status: upstream.status,
            contentType,
            message: text.slice(0, 300),
          },
        },
        { status: 200 }
      );
    }

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
    console.error("❌ Proxy GET /api/backoffice/leads/[id] failed:", err);
    return NextResponse.json(
      { error: "PROXY_ERROR", message: "Unable to reach backoffice" },
      { status: 502 }
    );
  }
}


