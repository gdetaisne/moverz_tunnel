import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Rediriger toute arrivée sur la racine vers le tunnel, avec src=landing par défaut.
  if (url.pathname === "/") {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/devis-gratuits";

    // Si aucun paramètre src n'est déjà présent, on force src=landing
    if (!redirectUrl.searchParams.has("src")) {
      redirectUrl.searchParams.set("src", "landing");
    }

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};


