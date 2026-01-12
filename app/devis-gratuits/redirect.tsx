"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PremiumShell from "@/components/tunnel/PremiumShell";

export default function RedirectToV3() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve all query params
    const params = new URLSearchParams(searchParams.toString());
    const newUrl = `/devis-gratuits-v3?${params.toString()}`;
    
    // Redirect
    window.location.href = newUrl;
  }, [searchParams]);

  return (
    <PremiumShell containerClassName="flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent mb-4"></div>
        <p className="text-[#1E293B]/70">Redirection...</p>
      </div>
    </PremiumShell>
  );
}

