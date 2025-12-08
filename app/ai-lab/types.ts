'use client';

// Types pivot pour les résultats normalisés d'analyse IA dans le labo.
// V1 : on couvre surtout les besoins d'affichage (pièce / description / mesures / volume / valeur),
// tout en préparant le terrain pour les futures couches métier (volumes standardisés, user inputs, etc.).

export type SizeClass = "VOLUMINEUX" | "PETIT";

export interface NormalizedRoom {
  roomId: string;
  roomType: string;
  roomLabel: string;
  photoIds: string[];
}

export interface NormalizedItem {
  // Identité & rattachement
  id: string;
  roomId: string;
  roomLabel: string;

  // Optionnel : rattachement à un item parent (pour les dérivés)
  parentId?: string | null;
  derivedKind?: string | null;

  // Description IA
  label: string;
  category: string;
  quantity: number;
  confidence: number;

  // Typologie (sera utilisée plus tard pour les règles et les cartons)
  sizeClass?: SizeClass;

  // Mesures/volume issus de l'IA (optionnels)
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  volumeM3Ai?: number | null;

  // Volume standard & final (remplis par le moteur métier / table m3)
  volumeM3Standard?: number | null;
  volumeM3Final?: number | null;
  volumeSource?: "ai" | "standard_table" | "ai_or_standard_max" | "manual";

  // Valeur IA : fourchette + valeur typique
  valueEurMinAi?: number | null;
  valueEurMaxAi?: number | null;
  valueEurTypicalAi?: number | null;
  valueJustification?: string | null;
  valueSource?: "ai" | "manual" | "none";
}

export interface NormalizedProcessResult {
  processId: string;
  model: string;
  rooms: NormalizedRoom[];
  items: NormalizedItem[];
}


