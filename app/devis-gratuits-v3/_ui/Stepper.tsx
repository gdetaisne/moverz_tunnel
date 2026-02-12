"use client";

import { Check } from "lucide-react";

interface StepperProps {
  steps: Array<{
    label: string;
    status: "completed" | "current" | "upcoming";
  }>;
  variant?: "horizontal" | "vertical";
}

export function Stepper({ steps, variant = "horizontal" }: StepperProps) {
  if (variant === "vertical") {
    return (
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";
          const isUpcoming = step.status === "upcoming";
          
          return (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div
                  className={[
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted
                      ? "bg-[#10B981] text-white shadow-md shadow-[#10B981]/30"
                      : isCurrent
                      ? "bg-[#6BCFCF] text-white shadow-md shadow-[#6BCFCF]/30"
                      : "bg-[#E3E5E8] text-[#1E293B]/40",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span className="text-sm font-bold">{idx + 1}</span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0 pt-1">
                <p
                  className={[
                    "text-sm font-semibold transition-colors duration-300",
                    isCurrent
                      ? "text-[#0F172A]"
                      : isCompleted
                      ? "text-[#10B981]"
                      : "text-[#1E293B]/40",
                  ].join(" ")}
                >
                  {step.label}
                </p>
              </div>
              
              {idx < steps.length - 1 && (
                <div className="absolute left-4 mt-10 w-0.5 h-6 bg-[#E3E5E8]" />
              )}
            </div>
          );
        })}
      </div>
    );
  }
  
  // Horizontal variant
  return (
    <div className="flex items-center justify-between gap-2">
      {steps.map((step, idx) => {
        const isCompleted = step.status === "completed";
        const isCurrent = step.status === "current";
        const isUpcoming = step.status === "upcoming";
        const isLast = idx === steps.length - 1;
        
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={[
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 mb-2",
                  isCompleted
                    ? "bg-[#10B981] text-white shadow-md shadow-[#10B981]/30"
                    : isCurrent
                    ? "bg-[#6BCFCF] text-white shadow-md shadow-[#6BCFCF]/30 ring-4 ring-[#6BCFCF]/20"
                    : "bg-[#E3E5E8] text-[#1E293B]/40",
                ].join(" ")}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <span className="text-sm font-bold">{idx + 1}</span>
                )}
              </div>
              
              <p
                className={[
                  "text-xs font-semibold text-center transition-colors duration-300",
                  isCurrent
                    ? "text-[#0F172A]"
                    : isCompleted
                    ? "text-[#10B981]"
                    : "text-[#1E293B]/40",
                ].join(" ")}
              >
                {step.label}
              </p>
            </div>
            
            {!isLast && (
              <div
                className={[
                  "h-0.5 flex-1 mx-2 transition-all duration-300",
                  isCompleted ? "bg-[#10B981]" : "bg-[#E3E5E8]",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
