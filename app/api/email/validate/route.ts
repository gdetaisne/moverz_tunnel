import { resolve4, resolve6, resolveMx } from "node:dns/promises";
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

const hasDnsRoute = async (domain: string): Promise<boolean> => {
  try {
    const mx = await resolveMx(domain);
    if (mx.length > 0) return true;
  } catch {
    // ignore
  }
  try {
    const a = await resolve4(domain);
    if (a.length > 0) return true;
  } catch {
    // ignore
  }
  try {
    const aaaa = await resolve6(domain);
    if (aaaa.length > 0) return true;
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

    const roleLike = /^(noreply|no-reply|do-not-reply|donotreply|contact|info|admin)$/i.test(local);
    const deliverableDomain = await hasDnsRoute(domain);

    if (!deliverableDomain) {
      return NextResponse.json(
        { ok: false, verdict: "invalid", reason: "Ce domaine email ne semble pas recevoir de mails." },
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
