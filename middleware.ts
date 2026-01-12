import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const isTunnelHost = hostname === "devis.moverz.fr";

  // Rediriger toute arrivée sur la racine vers le tunnel, avec src=landing par défaut.
  if (url.pathname === "/") {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/devis-gratuits";

    // Si aucun paramètre src n'est déjà présent, on force src=landing
    if (!redirectUrl.searchParams.has("src")) {
      redirectUrl.searchParams.set("src", "landing");
    }

    const res = NextResponse.redirect(redirectUrl);
    if (isTunnelHost) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return res;
  }

  const res = NextResponse.next();
  if (isTunnelHost) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/:path*"],
};


