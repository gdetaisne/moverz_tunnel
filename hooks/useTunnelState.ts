"use client";

import { useState, useCallback } from "react";

export interface TunnelFormState {
  // Contact (Step 1)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Project (Step 2 - Trajet + Logements)
  originPostalCode: string;
  originCity: string;
  originAddress: string;
  originLat: number | null;
  originLon: number | null;
  originHousingType: string;
  originFloor: string;
  originElevator: string;
  originFurnitureLift: string; // Monte-meuble (unknown/no/yes)
  originCarryDistance: string; // Distance portage (0-10, 10-20, etc.)
  originParkingAuth: boolean; // Autorisation stationnement
  originTightAccess: boolean; // Passages serrés / petit ascenseur
  originAccess: string;
  
  destinationPostalCode: string;
  destinationCity: string;
  destinationAddress: string;
  destinationLat: number | null;
  destinationLon: number | null;
  destinationHousingType: string;
  destinationFloor: string;
  destinationElevator: string;
  destinationFurnitureLift: string; // Monte-meuble
  destinationCarryDistance: string; // Distance portage
  destinationParkingAuth: boolean; // Autorisation stationnement
  destinationTightAccess: boolean; // Passages serrés / petit ascenseur
  destinationAccess: string;
  destinationUnknown: boolean;
  
  movingDate: string;
  movingDateEnd: string;
  dateFlexible: boolean;
  
  // Volume & Services (Step 3)
  surfaceM2: string;
  density: "light" | "normal" | "dense";
  formule: "ECONOMIQUE" | "STANDARD" | "PREMIUM";
  
  // Services en plus
  serviceFurnitureStorage: boolean;
  serviceCleaning: boolean;
  serviceFullPacking: boolean;
  serviceFurnitureAssembly: boolean;
  serviceInsurance: boolean;
  serviceWasteRemoval: boolean;
  serviceHelpWithoutTruck: boolean;
  serviceSpecificSchedule: boolean;
  serviceDebarras: boolean; // Débarras séparé
  serviceDismantling: boolean; // Démontage complet
  
  // Accès détaillés (NOUVEAU)
  accessNoElevator: boolean; // Escaliers sans ascenseur
  accessSmallElevator: boolean; // Petit ascenseur / passages serrés
  accessTruckDifficult: boolean; // Accès camion difficile
  
  // Piano détaillé (NOUVEAU)
  servicePiano: string; // "none" | "droit" | "quart"
  hasPiano: boolean; // Backward compat
  
  // Mobilier lourd/spécifique (NOUVEAU)
  furnitureAmericanFridge: boolean;
  furnitureSafe: boolean;
  furnitureBilliard: boolean;
  furnitureAquarium: boolean;
  furnitureOver25kg: boolean;
  hasSpecificFurniture: boolean; // Backward compat
  
  // Autres besoins
  hasFragileItems: boolean;
  specificNotes: string;
  
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
  originLat: null,
  originLon: null,
  originHousingType: "",
  originFloor: "0",
  originElevator: "none",
  originFurnitureLift: "no",
  // On ne stocke que >10m (sinon "") pour éviter du bruit inutile.
  originCarryDistance: "",
  originParkingAuth: false,
  originTightAccess: false,
  originAccess: "easy",
  
  destinationPostalCode: "",
  destinationCity: "",
  destinationAddress: "",
  destinationLat: null,
  destinationLon: null,
  destinationHousingType: "",
  destinationFloor: "0",
  destinationElevator: "none",
  destinationFurnitureLift: "no",
  // On ne stocke que >10m (sinon "") pour éviter du bruit inutile.
  destinationCarryDistance: "",
  destinationParkingAuth: false,
  destinationTightAccess: false,
  destinationAccess: "easy",
  destinationUnknown: false,
  
  movingDate: "",
  movingDateEnd: "",
  dateFlexible: false,
  
  surfaceM2: "60",
  density: "normal",
  formule: "STANDARD",
  
  serviceFurnitureStorage: false,
  serviceCleaning: false,
  serviceFullPacking: false,
  serviceFurnitureAssembly: false,
  serviceInsurance: false,
  serviceWasteRemoval: false,
  serviceHelpWithoutTruck: false,
  serviceSpecificSchedule: false,
  serviceDebarras: false,
  serviceDismantling: false,
  
  accessNoElevator: false,
  accessSmallElevator: false,
  accessTruckDifficult: false,
  
  servicePiano: "none",
  hasPiano: false,
  
  furnitureAmericanFridge: false,
  furnitureSafe: false,
  furnitureBilliard: false,
  furnitureAquarium: false,
  furnitureOver25kg: false,
  hasSpecificFurniture: false,
  
  hasFragileItems: false,
  specificNotes: "",
  
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

