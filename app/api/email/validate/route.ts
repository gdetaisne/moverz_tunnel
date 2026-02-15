import { resolveMx } from "node:dns/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().trim().email(),
});

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "yopmail.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "trashmail.com",
]);

const RESERVED_DOMAINS = new Set(["example.com", "example.net", "example.org", "test.com"]);

const MAJOR_PROVIDER_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "orange.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
] as const;

const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= n; j += 1) dp[0]![j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
};

const findLikelyTypo = (domain: string): string | null => {
  let best: { target: string; distance: number } | null = null;
  for (const target of MAJOR_PROVIDER_DOMAINS) {
    const dist = levenshtein(domain, target);
    if (dist > 1) continue;
    if (!best || dist < best.distance) {
      best = { target, distance: dist };
    }
  }
  return best?.target ?? null;
};

const hasMxRoute = async (domain: string): Promise<boolean> => {
  try {
    const mx = await resolveMx(domain);
    if (mx.length > 0) return true;
  } catch {
    // ignore
  }
  return false;
};

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, verdict: "invalid", reason: "Format email invalide." },
        { status: 200 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const [local, domain] = email.split("@");
    if (!local || !domain) {
      return NextResponse.json(
        { ok: false, verdict: "invalid", reason: "Format email invalide." },
        { status: 200 }
      );
    }

    if (RESERVED_DOMAINS.has(domain)) {
      return NextResponse.json(
        { ok: false, verdict: "invalid", reason: "Domaine email de test non accepté." },
        { status: 200 }
      );
    }

    if (DISPOSABLE_DOMAINS.has(domain)) {
      return NextResponse.json(
        { ok: false, verdict: "invalid", reason: "Adresse temporaire non recommandée." },
        { status: 200 }
      );
    }

    const likelyTypo = findLikelyTypo(domain);
    if (likelyTypo && likelyTypo !== domain) {
      return NextResponse.json(
        {
          ok: false,
          verdict: "invalid",
          reason: `Domaine suspect. Voulez-vous dire ${local}@${likelyTypo} ?`,
        },
        { status: 200 }
      );
    }

    const roleLike = /^(noreply|no-reply|do-not-reply|donotreply|contact|info|admin)$/i.test(local);
    const deliverableDomain = await hasMxRoute(domain);

    if (!deliverableDomain) {
      return NextResponse.json(
        { ok: false, verdict: "invalid", reason: "Ce domaine email ne semble pas avoir de boîte mail active (MX)." },
        { status: 200 }
      );
    }

    if (roleLike) {
      return NextResponse.json(
        { ok: true, verdict: "unknown", reason: "Adresse générique détectée, vérifiez bien l'accès à la boîte." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: true, verdict: "valid", reason: "Adresse email vraisemblablement joignable." },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { ok: true, verdict: "unknown", reason: "Vérification indisponible." },
      { status: 200 }
    );
  }
}
