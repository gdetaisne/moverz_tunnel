export type FormuleId = "ECONOMIQUE" | "STANDARD" | "PREMIUM";

export interface FormuleDetail {
  label: string;
  summary: [string, string];
  details: string[];
  /** Services inclus dans les formules précédentes (affiché en plus) */
  includes?: FormuleId;
}

export const FORMULE_DETAILS: Record<FormuleId, FormuleDetail> = {
  ECONOMIQUE: {
    label: "Éco",
    summary: ["Transport & manutention", "Vous emballez tout"],
    details: [
      "Demandes de stationnement (si nécessaire)",
      "Chargement, transport, livraison & mise en place du mobilier",
      "Fournitures livrées à domicile après signature",
      "Protection du mobilier sous couvertures",
      "Protection de la literie sous housses",
      "Protection HI-FI & électronique",
    ],
  },
  STANDARD: {
    label: "Standard",
    summary: ["Fragiles emballés par les pros", "Démontage/remontage inclus"],
    details: [
      "Emballage des vêtements sur cintres en penderies",
      "Démontage et remontage des meubles non fixés",
      "Emballage & déballage des objets fragiles",
      "Emballage & déballage de la vaisselle fragile",
      "Protection des éléments fragiles",
      "Décrochage mural (hors électricité et vissé)",
    ],
    includes: "ECONOMIQUE",
  },
  PREMIUM: {
    label: "Premium",
    summary: ["Service clé en mains", "Emballage & évacuation inclus"],
    details: [
      "Emballage des objets non fragiles",
      "Emballage des vêtements non sur cintres",
      "Assurance renforcée",
      "Évacuation des déchets",
    ],
    includes: "STANDARD",
  },
};

/** Retourne la liste complète des prestations (héritage compris) pour une formule. */
export function getAllDetails(id: FormuleId): string[] {
  const f = FORMULE_DETAILS[id];
  const parent = f.includes ? getAllDetails(f.includes) : [];
  return [...parent, ...f.details];
}
