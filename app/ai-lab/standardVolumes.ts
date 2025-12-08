// Table simplifiée de volumes standardisés (en m3) pour les objets volumineux.
// V1 : on couvre les principaux objets rencontrés dans les sets de test (chambres + salon),
// dérivés de `public/Default m3.csv`. Cette table pourra être enrichie au fur et à mesure.

type VolumeEntry = {
  key: string; // libellé normalisé (sans accents, en minuscules)
  volumeM3: number;
};

const STANDARD_VOLUME_ENTRIES: VolumeEntry[] = [
  // --- CHAMBRES ---
  { key: "lit une place complet", volumeM3: 1 },
  { key: "lit 1 place complet", volumeM3: 1 },
  { key: "lit 2 places complet 140", volumeM3: 1.5 },
  { key: "lit 2 places complet 160", volumeM3: 1.8 },
  { key: "lit 2 places complet 180", volumeM3: 2 },
  { key: "lit 2 places complet 180 ou", volumeM3: 2 },
  // Synonymes fréquents renvoyés par l'IA
  { key: "lit double", volumeM3: 1.8 },
  { key: "sommier seul", volumeM3: 0.5 },
  { key: "matelas seul", volumeM3: 0.5 },
  { key: "parure de lit", volumeM3: 0.15 },
  { key: "table de chevet", volumeM3: 0.25 },
  { key: "clic clac", volumeM3: 1.4 },
  { key: "commode 3 tiroirs", volumeM3: 0.5 },
  { key: "commode 4 tiroirs", volumeM3: 0.6 },
  { key: "commode 5 tiroirs", volumeM3: 0.7 },
  { key: "armoire 1 porte type ikea", volumeM3: 1 },
  { key: "armoire 1 porte type normande", volumeM3: 1.5 },
  { key: "armoire 2 portes type ikea", volumeM3: 1.5 },
  { key: "armoire 2 portes coulissantes", volumeM3: 2 },
  { key: "armoire 3 portes coulissantes", volumeM3: 3 },
  { key: "armoire 3 portes", volumeM3: 2 },
  { key: "armoire 4 portes coulissantes", volumeM3: 4 },
  { key: "armoire 4 portes", volumeM3: 3 },
  { key: "meuble tv petit", volumeM3: 0.5 },
  { key: "meuble tv petit / bas", volumeM3: 0.5 },
  { key: "meuble tv complet", volumeM3: 1 },
  { key: "meuble tv grand/complet", volumeM3: 1 },
  { key: "bureau petit", volumeM3: 0.5 },
  { key: "bureau grand", volumeM3: 1 },
  { key: "fauteuil bureau", volumeM3: 0.35 },
  { key: "fauteuil relax", volumeM3: 1 },
  { key: "televiseur", volumeM3: 0.25 },
  { key: "miroir psychée", volumeM3: 0.25 },

  // --- SALON / SALLE A MANGER / ENTREE ---
  { key: "canape 2 pl", volumeM3: 2 },
  { key: "canape 2 places", volumeM3: 2 },
  { key: "canape 3 pl", volumeM3: 2.5 },
  { key: "canape 3 places", volumeM3: 2.5 },
  { key: "canape d angle", volumeM3: 2.5 },
  { key: "clic clac - bz", volumeM3: 1.35 },
  { key: "fauteuil", volumeM3: 1 },
  { key: "meuble living", volumeM3: 2.5 },
  { key: "buffet bas 2 portes", volumeM3: 0.6 },
  { key: "buffet bas 3 portes", volumeM3: 1.2 },
  { key: "buffet bas 4 portes", volumeM3: 1.75 },
  { key: "buffet 2 portes bas + haut", volumeM3: 1.5 },
  { key: "buffet 3 portes bas + haut", volumeM3: 2 },
  { key: "buffet 4 portes bas + haut", volumeM3: 2 },
  { key: "vitrine - une porte", volumeM3: 1 },
  { key: "vitrine - deux portes", volumeM3: 1.5 },
  { key: "bibliotheque ouverte 40cm", volumeM3: 0.5 },
  { key: "bibliotheque ouverte 80cm", volumeM3: 1 },
  { key: "bibliotheque 4 portes", volumeM3: 1.5 },
  { key: "table a manger 8 pers", volumeM3: 1.5 },
  { key: "table a manger 6 pers", volumeM3: 1 },
  { key: "table a manger 4 pers", volumeM3: 0.5 },
  { key: "table basse", volumeM3: 0.5 },
  { key: "chaise pliante", volumeM3: 0.1 },
  { key: "chaise", volumeM3: 0.25 },
  { key: "tabouret", volumeM3: 0.1 },
  { key: "gueridon", volumeM3: 0.25 },
  { key: "etagere colonne 80cm", volumeM3: 1 },
  { key: "etagere colonne 40cm", volumeM3: 0.5 },
  { key: "commode 3 tiroirs salon", volumeM3: 0.5 },
  { key: "commode 4 tiroirs salon", volumeM3: 0.6 },
  { key: "commode 5 tiroirs salon", volumeM3: 0.7 },
  { key: "horloge comtoise", volumeM3: 0.3 },
  { key: "meuble chaussures", volumeM3: 0.5 },
  { key: "tv plasma", volumeM3: 0.25 },
  { key: "tapis", volumeM3: 0.1 },
  { key: "lampadaire", volumeM3: 0.2 },
];

function normalizeLabel(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Retourne un volume standard (en m3) pour un libellé d'objet donné,
 * en se basant sur une correspondance floue avec les entrées de la table.
 * V1 : on fait un simple "includes" sur les libellés normalisés.
 */
export function getStandardVolumeForLabel(label: string): number | null {
  const normalized = normalizeLabel(label);
  for (const entry of STANDARD_VOLUME_ENTRIES) {
    const keyNorm = normalizeLabel(entry.key);
    if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) {
      return entry.volumeM3;
    }
  }
  return null;
}


