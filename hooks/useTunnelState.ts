"use client";

import { useState, useCallback } from "react";

export interface TunnelFormState {
  // Contact (Step 1)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Project (Step 2)
  originPostalCode: string;
  originCity: string;
  originAddress: string;
  originHousingType: string;
  originFloor: string;
  originElevator: string;
  
  destinationPostalCode: string;
  destinationCity: string;
  destinationAddress: string;
  destinationHousingType: string;
  destinationFloor: string;
  destinationElevator: string;
  destinationUnknown: boolean;
  
  movingDate: string;
  movingDateEnd: string;
  dateFlexible: boolean;
  
  // Formules (Step 3)
  surfaceM2: string;
  density: "light" | "normal" | "dense";
  formule: "ECONOMIQUE" | "STANDARD" | "PREMIUM";
  
  // Meta
  leadId: string | null;
  currentStep: 1 | 2 | 3 | 4;
  linkingCode: string | null;
}

const INITIAL_STATE: TunnelFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  
  originPostalCode: "",
  originCity: "",
  originAddress: "",
  originHousingType: "",
  originFloor: "0",
  originElevator: "none",
  
  destinationPostalCode: "",
  destinationCity: "",
  destinationAddress: "",
  destinationHousingType: "",
  destinationFloor: "0",
  destinationElevator: "none",
  destinationUnknown: false,
  
  movingDate: "",
  movingDateEnd: "",
  dateFlexible: false,
  
  surfaceM2: "60",
  density: "normal",
  formule: "STANDARD",
  
  leadId: null,
  currentStep: 1,
  linkingCode: null,
};

export function useTunnelState() {
  const [state, setState] = useState<TunnelFormState>(() => {
    // Try to restore from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moverz_tunnel_state");
      if (saved) {
        try {
          return { ...INITIAL_STATE, ...JSON.parse(saved) };
        } catch (e) {
          console.error("Failed to parse saved state:", e);
        }
      }
    }
    return INITIAL_STATE;
  });

  const updateField = useCallback(<K extends keyof TunnelFormState>(
    field: K,
    value: TunnelFormState[K]
  ) => {
    setState((prev) => {
      const next = { ...prev, [field]: value };
      
      // Auto-save to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("moverz_tunnel_state", JSON.stringify(next));
        } catch (e) {
          console.error("Failed to save state:", e);
        }
      }
      
      return next;
    });
  }, []);

  const updateFields = useCallback((updates: Partial<TunnelFormState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      
      // Auto-save to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("moverz_tunnel_state", JSON.stringify(next));
        } catch (e) {
          console.error("Failed to save state:", e);
        }
      }
      
      return next;
    });
  }, []);

  const goToStep = useCallback((step: 1 | 2 | 3 | 4) => {
    updateField("currentStep", step);
  }, [updateField]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    if (typeof window !== "undefined") {
      localStorage.removeItem("moverz_tunnel_state");
    }
  }, []);

  return {
    state,
    updateField,
    updateFields,
    goToStep,
    reset,
  };
}

