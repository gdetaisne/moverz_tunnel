import { Suspense } from "react";
import RedirectToV3 from "./redirect";
import PremiumShell from "@/components/tunnel/PremiumShell";

export default function DevisGratuitsPage() {
  return (
    <Suspense fallback={
      <PremiumShell containerClassName="flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent mb-4"></div>
          <p className="text-[#1E293B]/70">Chargement...</p>
        </div>
      </PremiumShell>
    }>
      <RedirectToV3 />
    </Suspense>
  );
}
