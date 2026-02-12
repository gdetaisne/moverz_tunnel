/**
 * Section Component — Design System V1 Premium
 * Section with title, description, and consistent spacing
 * Spacing: 24px between sections (--space-section)
 * 
 * Back-office safe: presentational wrapper
 */

import type { ReactNode } from "react";

export interface SectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  separator?: boolean;
}

export function Section({
  title,
  description,
  children,
  className = "",
  separator = false,
}: SectionProps) {
  return (
    <section className={`space-y-block ${className}`}>
      {/* Section header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-xl font-semibold text-text-primary">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-text-secondary leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Section content */}
      <div>{children}</div>

      {/* Optional separator */}
      {separator && (
        <hr className="border-t border-border-neutral mt-section" />
      )}
    </section>
  );
}
