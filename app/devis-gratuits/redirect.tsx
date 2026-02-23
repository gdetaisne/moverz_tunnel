"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PremiumShell from "@/components/tunnel/PremiumShell";

const AB_COOKIE_NAME = "moverz_ab_variant";
const AB_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours

function getVariantFromCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${AB_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setVariantCookie(variant: string) {
  document.cookie = `${AB_COOKIE_NAME}=${variant}; path=/; max-age=${AB_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function pickVariant(): "A" | "B" {
  return Math.random() < 0.5 ? "A" : "B";
}

export default function RedirectToV3() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let variant = getVariantFromCookie();
    if (variant !== "A" && variant !== "B") {
      variant = pickVariant();
      setVariantCookie(variant);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("ab", variant);

    const target = variant === "A"
      ? `/devis-gratuits-v3a?${params.toString()}`
      : `/devis-gratuits-v3?${params.toString()}`;

    window.location.href = target;
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
