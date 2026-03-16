import { NextRequest, NextResponse } from "next/server";

// Route IA désactivée — analyse photo non utilisée en production.
// L'appel Claude a été supprimé suite à l'incident malware VPS (mars 2026).
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Service d'analyse IA temporairement désactivé." },
    { status: 503 }
  );
}
