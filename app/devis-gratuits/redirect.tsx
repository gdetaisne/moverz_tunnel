"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

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
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent mb-4"></div>
        <p className="text-white/70">Redirection...</p>
      </div>
    </div>
  );
}

