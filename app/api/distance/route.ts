import { NextResponse } from "next/server";
import { z } from "zod";

const DistanceRequestSchema = z.object({
  origin: z.object({
    lat: z.number().finite().min(-90).max(90),
    lon: z.number().finite().min(-180).max(180),
  }),
  destination: z.object({
    lat: z.number().finite().min(-90).max(90),
    lon: z.number().finite().min(-180).max(180),
  }),
  // Pour extension future (cycling/walking). Pour l’instant on force driving.
  profile: z.enum(["driving"]).optional(),
});

type CacheValue = {
  distanceKm: number;
  durationMin: number | null;
  provider: "osrm";
};

// Cache mémoire best-effort (dev + petites charges).
const cache = new Map<string, CacheValue>();

function cacheKey(input: z.infer<typeof DistanceRequestSchema>): string {
  // Arrondir pour éviter un cache key différent à cause de micro-variations de coords.
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return [
    "driving",
    round(input.origin.lat),
    round(input.origin.lon),
    round(input.destination.lat),
    round(input.destination.lon),
  ].join(":");
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = DistanceRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const key = cacheKey(input);
    const cached = cache.get(key);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const { origin, destination } = input;
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false&alternatives=false&steps=false`;

    const res = await fetch(url, {
      headers: {
        // OSRM public : on s’identifie gentiment.
        "User-Agent": "moverz-tunnel (distance)",
      },
      // Next: éviter un cache HTTP persistant non maîtrisé ici.
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          message: "Distance provider error",
          provider: "osrm",
          status: res.status,
          body: text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{ distance?: number; duration?: number }>;
      message?: string;
    };

    const route = data?.routes?.[0];
    const distanceM = typeof route?.distance === "number" ? route.distance : null;
    const durationS = typeof route?.duration === "number" ? route.duration : null;

    if (!distanceM || distanceM <= 0) {
      return NextResponse.json(
        { message: "No route found", provider: "osrm", raw: data?.message ?? data?.code },
        { status: 404 }
      );
    }

    const distanceKm = Math.max(1, Math.round(distanceM / 1000));
    const durationMin =
      durationS && durationS > 0 ? Math.max(1, Math.round(durationS / 60)) : null;

    const payload: CacheValue = {
      distanceKm,
      durationMin,
      provider: "osrm",
    };
    cache.set(key, payload);

    return NextResponse.json({ ...payload, cached: false });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("❌ POST /api/distance error:", err);
    }
    return NextResponse.json(
      { message: "Internal error" },
      { status: 500 }
    );
  }
}

