import { Suspense } from "react";
import RedirectToV3 from "./redirect";

export default function DevisGratuitsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent mb-4"></div>
          <p className="text-white/70">Chargement...</p>
        </div>
      </div>
    }>
      <RedirectToV3 />
    </Suspense>
  );
}
