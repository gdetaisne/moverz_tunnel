/**
 * SmartCart V4 — Moverz Design System
 * Panier live Step 3 : Desktop sticky + Mobile FAB + Drawer
 * 
 * ✅ Desktop : Sticky sidebar droite
 * ✅ Mobile : FAB flottant + Bottom sheet drawer
 * ✅ Prix animé en temps réel
 * ✅ Anti-collision CTA mobile (offset bottom)
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  X,
  CheckCircle2,
  Info,
} from "lucide-react";
import { CardV4 } from "./Card";

export interface CartItem {
  id: string;
  label: string;
  amountEur: number;
  category?: string;
  explanation?: string;
}

export interface SmartCartProps {
  // Prix
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  
  // Budget initial (Step 2 baseline)
  initialPrice?: number;
  
  // Items
  items: CartItem[];
  
  // Info projet
  projectInfo?: {
    origin?: string;
    destination?: string;
    surface?: number;
    volume?: number;
  };
  
  // State
  isLoading?: boolean;
  
  // Mobile
  ctaLabel?: string;
  onSubmit?: () => void;
}

export function SmartCart({
  currentPrice,
  minPrice,
  maxPrice,
  initialPrice,
  items = [],
  projectInfo,
  isLoading = false,
  ctaLabel = "Valider mon devis",
  onSubmit,
}: SmartCartProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prevPrice, setPrevPrice] = useState(currentPrice);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Track price changes for animation
  useEffect(() => {
    if (currentPrice !== prevPrice) {
      setPrevPrice(currentPrice);
    }
  }, [currentPrice, prevPrice]);

  const fmtEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const priceInRange = Math.max(minPrice, Math.min(maxPrice, currentPrice));
  const rangePercent = maxPrice > minPrice
    ? ((priceInRange - minPrice) / (maxPrice - minPrice)) * 100
    : 50;

  const itemsCount = items.length;

  // Cart content (réutilisé desktop + drawer)
  const CartContent = () => (
    <div className={isMobile && drawerOpen ? "space-y-6" : "space-y-5"}>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p
            className={`font-bold uppercase tracking-wide ${isMobile && drawerOpen ? "text-sm" : "text-xs"}`}
            style={{ color: "var(--color-text-muted)" }}
          >
            Votre estimation
          </p>
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
            style={{
              background: "var(--color-accent-light)",
              color: "var(--color-accent)",
            }}
          >
            Live
          </div>
        </div>

        {/* Prix principal animé */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPrice}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={isMobile && drawerOpen ? "text-5xl font-bold tabular-nums" : "text-4xl font-bold tabular-nums"}
            style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
          >
            {fmtEur(currentPrice)}
          </motion.div>
        </AnimatePresence>

        {/* Progress bar dans fourchette */}
        <div className="mt-5 space-y-2.5">
          <div
            className={isMobile && drawerOpen ? "h-2.5 rounded-full overflow-hidden" : "h-2 rounded-full overflow-hidden"}
            style={{ background: "var(--color-border-light)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--color-accent)" }}
              initial={{ width: 0 }}
              animate={{ width: `${rangePercent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <div className={`flex items-center justify-between ${isMobile && drawerOpen ? "text-sm" : "text-xs"}`}>
            <span style={{ color: "var(--color-text-muted)" }}>
              Min {fmtEur(minPrice)}
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>
              Max {fmtEur(maxPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Project info (si fourni) */}
      {projectInfo && (
        <div
          className={`rounded-lg ${isMobile && drawerOpen ? "p-4 space-y-2.5 text-sm" : "p-3 space-y-1.5 text-xs"}`}
          style={{
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
        >
          {projectInfo.origin && projectInfo.destination && (
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--color-text-muted)" }}>Trajet</span>
              <span style={{ color: "var(--color-text)" }} className="font-semibold">
                {projectInfo.origin} → {projectInfo.destination}
              </span>
            </div>
          )}
          {projectInfo.surface && (
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--color-text-muted)" }}>Surface</span>
              <span style={{ color: "var(--color-text)" }} className="font-semibold">
                {projectInfo.surface} m²
              </span>
            </div>
          )}
          {projectInfo.volume && (
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--color-text-muted)" }}>Volume</span>
              <span style={{ color: "var(--color-text)" }} className="font-semibold">
                {projectInfo.volume} m³
              </span>
            </div>
          )}
        </div>
      )}

      {/* Budget initial (si fourni) */}
      {initialPrice && typeof initialPrice === "number" && (
        <div
          className={`rounded-lg ${isMobile && drawerOpen ? "p-4" : "p-3"}`}
          style={{
            background: "rgba(14,165,166,0.06)",
            border: "1px dashed var(--color-accent)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
              <span
                className={isMobile && drawerOpen ? "text-sm font-medium" : "text-xs font-medium"}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Budget initial (Step 2)
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={`font-bold tabular-nums ${isMobile && drawerOpen ? "text-sm" : "text-xs"}`}
                style={{ color: "var(--color-text)" }}
              >
                {fmtEur(initialPrice)}
              </span>
              {initialPrice !== currentPrice && (
                <div className="flex items-center gap-1 mt-0.5">
                  {currentPrice > initialPrice ? (
                    <TrendingUp className="w-3 h-3" style={{ color: "var(--color-danger)" }} />
                  ) : (
                    <TrendingDown className="w-3 h-3" style={{ color: "var(--color-success)" }} />
                  )}
                  <span
                    className="text-[10px] font-bold tabular-nums"
                    style={{
                      color: currentPrice > initialPrice ? "var(--color-danger)" : "var(--color-success)",
                    }}
                  >
                    {currentPrice > initialPrice ? "+" : ""}
                    {fmtEur(currentPrice - initialPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {itemsCount > 0 && (
        <div className={isMobile && drawerOpen ? "space-y-3" : "space-y-2"}>
          <p
            className={`font-bold uppercase tracking-wide ${isMobile && drawerOpen ? "text-sm" : "text-xs"}`}
            style={{ color: "var(--color-text-muted)" }}
          >
            Détails ({itemsCount})
          </p>
          <div className="space-y-2 max-h-[280px] overflow-y-auto smart-cart-scrollbar">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  title={!isMobile ? item.explanation ?? item.category ?? "" : undefined}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {item.amountEur > 0 ? (
                      <TrendingUp
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: "var(--color-danger)" }}
                      />
                    ) : item.amountEur < 0 ? (
                      <TrendingDown
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: "var(--color-success)" }}
                      />
                    ) : (
                      <CheckCircle2
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: "var(--color-accent)" }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium leading-tight"
                        style={{ color: "var(--color-text)" }}
                      >
                        {item.label}
                      </p>
                    </div>
                  </div>
                  {item.amountEur !== 0 && (
                    <span
                      className="text-sm font-bold tabular-nums flex-shrink-0"
                      style={{
                        color:
                          item.amountEur > 0
                            ? "var(--color-danger)"
                            : "var(--color-success)",
                      }}
                    >
                      {item.amountEur > 0 ? "+" : ""}
                      {fmtEur(Math.abs(item.amountEur))}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Badge transparence */}
      <div
        className="flex items-start gap-2 p-3.5 rounded-lg"
        style={{
          background: "rgba(14,165,166,0.04)",
          border: "1px solid var(--color-accent)",
        }}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }} />
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          <strong style={{ color: "var(--color-text)" }}>Prix transparent</strong> : cette
          estimation inclut tous les ajustements selon vos critères, ajustable après visite si
          nécessaire.
        </p>
      </div>

      {/* CTA (mobile uniquement dans drawer) */}
      {isMobile && drawerOpen && onSubmit && (
        <button
          onClick={() => {
            setDrawerOpen(false);
            // Petit délai pour que le drawer se ferme avant le scroll
            setTimeout(() => {
              onSubmit();
            }, 300);
          }}
          disabled={isLoading}
          className="w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] shadow-md"
          style={{
            background: "var(--color-accent)",
            color: "#FFFFFF",
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {isLoading ? "Chargement..." : ctaLabel}
        </button>
      )}
    </div>
  );

  // Desktop : Sticky sidebar
  if (!isMobile) {
    return (
      <div
        className="sticky top-24 h-fit"
        style={{
          maxWidth: "380px",
        }}
      >
        <CardV4 padding="md">
          <CartContent />
        </CardV4>
      </div>
    );
  }

  // Mobile : FAB + Drawer
  return (
    <>
      {/* FAB (Floating Action Button) */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setDrawerOpen(true)}
        className="fixed z-[90] rounded-full shadow-lg flex items-center gap-2 px-4 py-3"
        style={{
          right: "16px",
          bottom: "88px", // ← OFFSET pour éviter collision avec CTA principal
          background: "var(--color-accent)",
          color: "#FFFFFF",
          boxShadow: "0 4px 16px rgba(14,165,166,0.3)",
        }}
        aria-label="Voir le panier"
      >
        <ShoppingCart className="w-5 h-5" />
        <div className="flex flex-col items-start">
          <span className="text-xs font-medium opacity-90">Budget</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentPrice}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-bold tabular-nums"
            >
              {fmtEur(currentPrice)}
            </motion.span>
          </AnimatePresence>
        </div>
        {itemsCount > 0 && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background: "var(--color-danger)",
              color: "#FFFFFF",
            }}
          >
            {itemsCount}
          </div>
        )}
      </motion.button>

      {/* Drawer (Bottom Sheet) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[95]"
            />

            {/* Drawer content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) {
                  setDrawerOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[100] rounded-t-3xl overflow-hidden"
              style={{
                background: "var(--color-surface)",
                maxHeight: "90vh",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {/* Drag handle */}
              <div className="flex items-center justify-center py-4">
                <div
                  className="w-12 h-1.5 rounded-full"
                  style={{ background: "var(--color-border)" }}
                />
              </div>

              {/* Close button */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "var(--color-border-light)",
                  color: "var(--color-text-muted)",
                }}
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
                <CartContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
