import type { ReactNode } from "react";

export default function PremiumShell({
  children,
  containerClassName = "",
}: {
  children: ReactNode;
  containerClassName?: string;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F8F9FA] to-white text-[#0F172A]">
      {/* Soft brand glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[#6BCFCF]/20 blur-3xl" />
        <div className="absolute top-40 -left-28 h-72 w-72 rounded-full bg-[#2B7A78]/10 blur-3xl" />
        <div className="absolute bottom-0 right-[-120px] h-80 w-80 rounded-full bg-[#6BCFCF]/10 blur-3xl" />
      </div>

      <div
        className={`relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 lg:px-12 ${containerClassName}`}
      >
        {children}
      </div>
    </main>
  );
}


