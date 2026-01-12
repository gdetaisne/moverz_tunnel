import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Behind proxies/CDNs, x-forwarded-host can be a comma-separated list.
  const hostHeader =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const firstHost = hostHeader.split(",")[0]?.trim() ?? "";
  const hostname = firstHost.split(":")[0]?.trim().toLowerCase() ?? "";
  const isTunnelHost = hostname === "devis.moverz.fr";

  const withNoIndex = (res: NextResponse) => {
    if (isTunnelHost) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return res;
  };

  // Rediriger toute arrivée sur la racine vers le tunnel, avec src=landing par défaut.
  if (url.pathname === "/") {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/devis-gratuits";

    // Si aucun paramètre src n'est déjà présent, on force src=landing
    if (!redirectUrl.searchParams.has("src")) {
      redirectUrl.searchParams.set("src", "landing");
    }

    return withNoIndex(NextResponse.redirect(redirectUrl));
  }

  return withNoIndex(NextResponse.next());
}

export const config = {
  matcher: ["/:path*"],
};


