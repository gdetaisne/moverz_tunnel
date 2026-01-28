import { NextResponse } from "next/server";
import { z } from "zod";

const GeoCodeSchema = z.object({
  q: z.string().min(2),
  kind: z.enum(["address", "city"]).default("address"),
  countrycodes: z.string().optional(), // ex: "fr,de"
  limit: z.number().int().min(1).max(10).default(5),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = GeoCodeSchema.safeParse({
      q: searchParams.get("q") ?? "",
      kind: searchParams.get("kind") ?? "address",
      countrycodes: searchParams.get("countrycodes") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid query", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { q, kind, countrycodes, limit } = parsed.data;
    const base = "https://nominatim.openstreetmap.org/search";
    const params = new URLSearchParams();
    params.set("q", q);
    params.set("format", "json");
    params.set("addressdetails", "1");
    params.set("limit", String(limit));
    if (countrycodes) params.set("countrycodes", countrycodes);
    if (kind === "city") params.set("featuretype", "city");

    const upstream = await fetch(`${base}?${params.toString()}`, {
      headers: {
        // Nominatim demande un User-Agent identifiable; côté server on peut le mettre.
        "User-Agent": "moverz-tunnel (geocode)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          message: "Geocode provider error",
          provider: "nominatim",
          status: upstream.status,
          body: text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const data = (await upstream.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        hamlet?: string;
        postcode?: string;
        country_code?: string;
      };
    }>;

    const out = (data ?? []).map((item) => {
      const addr = item.address ?? {};
      const city = addr.city || addr.town || addr.village || addr.hamlet || undefined;
      return {
        label: item.display_name,
        addressLine: item.display_name,
        city,
        postalCode: addr.postcode,
        countryCode: addr.country_code,
        lat: Number.parseFloat(item.lat),
        lon: Number.parseFloat(item.lon),
      };
    });

    return NextResponse.json({ provider: "nominatim", results: out });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("❌ GET /api/geocode error:", err);
    }
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

