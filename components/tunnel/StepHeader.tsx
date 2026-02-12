/**
 * StepHeader Component — Design System V1 Premium
 * Top navigation with logo, back button, progress indicator
 * Height: 64px (--height-header)
 * 
 * Back-office safe: presentational only
 */

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface StepHeaderProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showBack?: boolean;
  logoHref?: string;
  className?: string;
}

export function StepHeader({
  currentStep,
  totalSteps,
  onBack,
  showBack = true,
  logoHref = "/",
  className = "",
}: StepHeaderProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <header
      className={`
        sticky top-0 z-sticky
        bg-surface-primary/95 backdrop-blur-sm
        border-b border-border-neutral
        ${className}
      `}
    >
      <div className="max-w-container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-header">
          {/* Left: Back button or spacer */}
          <div className="w-24">
            {showBack && onBack && currentStep > 1 && (
              <button
                onClick={onBack}
                className="
                  inline-flex items-center gap-2
                  text-sm font-medium text-text-secondary
                  hover:text-text-primary
                  transition-colors duration-fast
                "
                aria-label="Retour à l'étape précédente"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}
          </div>

          {/* Center: Logo */}
          <div className="flex-shrink-0">
            <Link
              href={logoHref}
              className="
                text-xl font-bold text-text-primary
                hover:opacity-80 transition-opacity duration-fast
              "
            >
              Moverz
            </Link>
          </div>

          {/* Right: Step indicator */}
          <div className="w-24 flex justify-end">
            <div className="text-sm font-medium text-text-muted tabular-nums">
              {currentStep}/{totalSteps}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-bg-tertiary">
          <div
            className="h-full bg-brand-primary transition-all duration-slow"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Étape ${currentStep} sur ${totalSteps}`}
          />
        </div>
      </div>
    </header>
  );
}
