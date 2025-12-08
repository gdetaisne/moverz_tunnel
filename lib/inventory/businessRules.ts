import { getStandardVolumeForLabel } from "@/app/ai-lab/standardVolumes";

export interface RoomLike {
  roomId: string;
  roomType: string;
  roomLabel: string;
}

export interface ItemLike {
  id: string;
  roomId: string;
  roomLabel: string;
  label: string;
  category: string;
  quantity: number;
  confidence: number;
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  volumeM3Ai?: number | null;
  volumeM3Standard?: number | null;
  volumeM3Final?: number | null;
  volumeSource?: "ai" | "standard_table" | "ai_or_standard_max" | "manual";
  valueEurTypicalAi?: number | null;
  valueSource?: "ai" | "manual" | "none";
  parentId?: string | null;
  derivedKind?: string | null;
  // Optionnel : flags et infos pour l'emballage
  flags?: {
    fragile?: boolean;
    highValue?: boolean;
    requiresDisassembly?: boolean;
  };
  materials?: string[] | null;
  // Volumes nu / emballé
  volumeM3Nu?: number | null;
  volumeM3Emballé?: number | null;
  packagingFactor?: number | null;
  packagingReason?: string | null;
}

/**
 * Applique les règles métier V1 aux items normalisés :
 * - Lit => matelas / sommier / parure de lit dérivés
 * - Armoire => volume de contenu invisible selon la pièce
 *
 * La fonction renvoie un nouveau tableau (les items d'origine sont clonés).
 */
export function enrichItemsWithBusinessRules<T extends ItemLike, R extends RoomLike>(
  items: T[],
  rooms: R[]
): T[] {
  const result: T[] = [...items];

  const roomById = new Map<string, R>();
  rooms.forEach((r) => roomById.set(r.roomId, r));

  for (const item of items) {
    const room = roomById.get(item.roomId);
    const roomType = room?.roomType ?? room?.roomLabel ?? "";
    const labelLower = item.label.toLowerCase();
    const categoryUpper = item.category.toUpperCase();

    // 1) Lit : ajouter composants dérivés (matelas, sommier, parure)
    const isBed = categoryUpper === "LIT" || labelLower.includes("lit ");
    if (isBed) {
      const derivedBaseId = item.id;
      const quantity = item.quantity || 1;
      const bedWidth = item.widthCm ?? null;
      const bedDepth = item.depthCm ?? null;
      const bedHeight = item.heightCm ?? null;

      const addDerived = (
        suffix: string,
        standardLabel: string,
        measures?: { widthCm?: number | null; depthCm?: number | null; heightCm?: number | null }
      ) => {
        const stdVol = getStandardVolumeForLabel(standardLabel);
        if (typeof stdVol !== "number") return;
        const dWidth = measures?.widthCm ?? null;
        const dDepth = measures?.depthCm ?? null;
        const dHeight = measures?.heightCm ?? null;

        let volumeAi: number | null = null;
        if (
          typeof dWidth === "number" &&
          typeof dDepth === "number" &&
          typeof dHeight === "number"
        ) {
          volumeAi = (dWidth * dDepth * dHeight) / 1_000_000; // cm^3 -> m^3
        }

        const basePerUnit = typeof volumeAi === "number" ? volumeAi : stdVol;
        const finalPerUnit = Math.max(basePerUnit, stdVol);
        const finalVolume = finalPerUnit * quantity;

        const derived: T = {
          ...(item as T),
          id: `${derivedBaseId}-derived-${suffix}`,
          parentId: item.id,
          derivedKind: suffix,
          label: `${standardLabel} (dérivé lit)`,
          quantity,
          widthCm: dWidth ?? undefined,
          depthCm: dDepth ?? undefined,
          heightCm: dHeight ?? undefined,
          volumeM3Ai: volumeAi,
          volumeM3Standard: stdVol,
          volumeM3Final: finalVolume,
          volumeSource:
            typeof volumeAi === "number" ? "ai_or_standard_max" : "standard_table",
          valueSource: "none",
        };
        result.push(derived);
      };

      // Matelas : même largeur/longueur que le lit, 30 cm d'épaisseur
      addDerived("matelas", "Matelas seul", {
        widthCm: bedWidth,
        depthCm: bedDepth,
        heightCm: 30,
      });

      // Sommier : démontable, même longueur et hauteur, largeur divisée par 5
      addDerived("sommier", "Sommier seul", {
        widthCm: typeof bedWidth === "number" ? bedWidth / 5 : bedWidth,
        depthCm: bedDepth,
        heightCm: bedHeight,
      });

      // Parure de lit : on garde pour l'instant seulement le volume standard
      addDerived("parure", "Parure de lit(couette + coussins)");
    }

    // 2) Armoires : ajouter volume de contenu invisible
    if (categoryUpper === "ARMOIRE") {
      let factor = 0;
      let contentLabel: string | null = null;
      if (roomType === "CHAMBRE") {
        // Chambre : contenu vêtements non fragiles
        factor = 0.75;
        contentLabel = "Contenu armoire (vêtements)";
      } else if (roomType === "SALON") {
        // Salon : contenu fragile (verres, etc.)
        factor = 1.25;
        contentLabel = "Contenu armoire/buffet (fragile)";
      }
      const containerPerUnit =
        item.volumeM3Standard ?? item.volumeM3Ai ?? null;
      if (factor > 0 && contentLabel && containerPerUnit != null) {
        const quantity = item.quantity || 1;
        const containerVol = containerPerUnit * quantity;
        const contentVol = containerPerUnit * factor * quantity;

        // On enregistre le volume du meuble lui‑même
        item.volumeM3Final = containerVol;
        item.volumeSource =
          item.volumeM3Standard != null ? "standard_table" : "ai";

        // Et on crée un dérivé pour le contenu invisible
        const derived: T = {
          ...(item as T),
          id: `${item.id}-derived-contenu`,
          parentId: item.id,
          derivedKind: "armoire_contenu",
          label: contentLabel,
          quantity,
          volumeM3Final: contentVol,
          volumeSource:
            item.volumeM3Standard != null ? "standard_table" : "ai",
          valueSource: "none",
        };
        result.push(derived);
      }
    }
  }

  return result;
}

// --- Règles d'emballage V1 ---

interface PackagingDecision {
  factor: number;
  reason: string;
}

function decidePackagingFactor(item: ItemLike, vNu: number): PackagingDecision | null {
  const cat = item.category.toUpperCase();
  const label = item.label.toLowerCase();
  const flags = item.flags ?? {};

  const hasMaterial = (m: string) =>
    (item.materials ?? []).some((mat) => mat.toLowerCase().includes(m));

  // 6) Objets très fragiles (œuvres, TV, écrans, miroirs, marbre)
  const veryFragileKeywords = [
    "tv",
    "écran",
    "ecran",
    "screen",
    "moniteur",
    "monitor",
    "miroir",
    "marbre",
    "oeuvre",
    "œuvre",
    "tableau",
    "toile",
  ];
  if (
    cat === "TV" ||
    veryFragileKeywords.some((k) => label.includes(k)) ||
    (flags.fragile && flags.highValue)
  ) {
    return {
      factor: 1.5,
      reason: "Objet très fragile (TV / écran / œuvre / marbre / miroir)",
    };
  }

  // 4) Gros électroménager
  const grosElecKeywords = [
    "lave-linge",
    "lave linge",
    "lave-vaisselle",
    "lave vaisselle",
    "sèche-linge",
    "seche-linge",
    "sèche linge",
    "seche linge",
    "frigo",
    "réfrigérateur",
    "refrigerateur",
    "congélateur",
    "congelateur",
    "four",
  ];
  if (
    cat === "ELECTROMENAGER" ||
    grosElecKeywords.some((k) => label.includes(k))
  ) {
    return {
      factor: 1.3,
      reason: "Gros électroménager (emballage renforcé + sanglage)",
    };
  }

  // 5) Canapés, matelas, sommiers
  if (cat === "CANAPE" || label.includes("canapé") || label.includes("canape")) {
    const isAngle =
      label.includes("angle") || label.includes("d’angle") || label.includes("d'angle") ||
      label.includes("xxl");
    return {
      factor: isAngle ? 1.35 : 1.25,
      reason: isAngle
        ? "Canapé d’angle / XXL (emballage volumineux)"
        : "Canapé standard (emballage + protection)",
    };
  }
  if (
    item.derivedKind === "matelas" ||
    item.derivedKind === "sommier" ||
    label.includes("matelas") ||
    label.includes("sommier")
  ) {
    return {
      factor: 1.1,
      reason: "Matelas / sommier sous housse (léger sur-volume)",
    };
  }

  // 3) Meubles démontables (IKEA / grands volumes) – non démontés par défaut
  const ikeaKeywords = ["ikea", "pax", "billy", "kallax", "bestå", "besta"];
  if (flags.requiresDisassembly || ikeaKeywords.some((k) => label.includes(k))) {
    return {
      factor: 1.2,
      reason: "Meuble démontable non démonté (protections + vide)",
    };
  }

  // 2) Meubles fragiles / laqués / vitrines
  const fragileKeywords = ["vitrine", "verre", "laqué", "laquee", "laque", "glace"];
  if (
    flags.fragile ||
    hasMaterial("verre") ||
    fragileKeywords.some((k) => label.includes(k))
  ) {
    return {
      factor: 1.25,
      reason: "Meuble fragile / vitré / laqué",
    };
  }

  // 7) Objets irréguliers (plantes, lampes, déco volumineuse)
  const irregularKeywords = [
    "plante",
    "plantes",
    "lampe sur pied",
    "lampe",
    "suspension",
    "lustre",
    "sculpture",
  ];
  if (
    irregularKeywords.some((k) => label.includes(k)) &&
    vNu > 0.03 // éviter de traiter des broutilles
  ) {
    return {
      factor: 1.4,
      reason: "Objet irrégulier / déco volumineuse (beaucoup de vide autour)",
    };
  }

  // 1) Meubles standards (non fragiles, non démontables)
  const standardCats = [
    "TABLE",
    "CHAISE",
    "ARMOIRE",
    "BIBLIOTHEQUE",
    "RANGEMENT",
    "MEUBLE",
    "COMMODE",
  ];
  if (standardCats.some((c) => cat.startsWith(c))) {
    return {
      factor: 1.15,
      reason: "Meuble standard (légère protection + espace perdu)",
    };
  }

  return null;
}

/**
 * Applique les coefficients d'emballage :
 * - volumeM3Nu = volume nu (avant emballage)
 * - volumeM3Emballé = volume après emballage
 * - volumeM3Final est mis à jour avec le volume emballé
 */
export function applyPackagingRules<T extends ItemLike>(items: T[]): T[] {
  return items.map((item) => {
    const vNuRaw =
      item.volumeM3Final ?? item.volumeM3Ai ?? item.volumeM3Standard ?? null;
    if (!vNuRaw || vNuRaw <= 0) {
      return item;
    }

    const vNu = Math.round(vNuRaw * 100) / 100;

    const decision = decidePackagingFactor(item, vNu);
    if (!decision) {
      return {
        ...item,
        volumeM3Nu: vNu,
        volumeM3Emballé: vNu,
        packagingFactor: null,
        packagingReason: null,
      };
    }

    const vPacked = Math.round(vNu * decision.factor * 100) / 100;

    return {
      ...item,
      volumeM3Nu: vNu,
      volumeM3Emballé: vPacked,
      volumeM3Final: vPacked,
      packagingFactor: decision.factor,
      packagingReason: decision.reason,
    };
  });
}



