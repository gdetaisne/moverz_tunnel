# Bench marché (Standard) — pour calibrer le pricing

Ce document sert à **benchmark** la formule actuelle du tunnel vs une **approche plus granulaire** basée sur des chiffres publics.

## Source web utilisée

- Tableau “Prix déménagement 10 m3 selon la formule et la distance” (colonne **Standard**) : [AlloDemenageur — Petit déménagement : prix et solutions économiques en 2026](https://www.allodemenageur.fr/devis-demenagement/petit-demenagement/)

## Hypothèses de calcul (pour comparer “à iso-conditions”)

Pour éviter d’introduire des biais (étages, monte-meuble, saison), on compare un cas **Standard**, **hors services**, **hors saison**, **accès facile** :

- **Volume**: 10 m³ (comme le tableau source)
- **Saison**: `seasonFactor = 1`
- **Accès**: `originFloor = destinationFloor = 0`, `originElevator = destinationElevator = "yes"` (donc `coeffEtage = 1`)
- **Services**: aucun

### Ancienne formule (avant patch)

Implémentation précédente: `calculatePricing()` dans `lib/pricing/calculate.ts`, qui appliquait une tranche distance très large via `LA_POSTE_RATES_EUR_PER_M3` dans `lib/pricing/constants.ts`:

- `< 100 km` → **40 €/m³**
- `100–500 km` → **95 €/m³**
- `> 500 km` → **140 €/m³**

Conséquence: pour **10 m³**, tous les trajets 100–500 km donnent **950 €** (Standard) et tous les trajets >500 km donnent **1400 €**.

### Formule actuelle (Option B) — grille distance + économie d'échelle volume

Objectif: éviter l’effet “95 €/m³ dès 101 km” qui sur-estime souvent autour de 150–300 km.

Grille **Standard €/m³** (calée sur les moyennes du tableau AlloDemenageur pour 10 m³) :

- `< 100 km` → 40
- `100–369 km` → 75
- `370–499 km` → 85
- `500–699 km` → 95
- `700–849 km` → 105
- `850–999 km` → 125
- `≥ 1000 km` → 145

Économie d'échelle sur le coût volumique (pour éviter de sur-estimer les 15–40 m³) :

- \(f(V)=\mathrm{clamp}((V/10)^{-0.15}, 0.75, 1.05)\)
- appliqué uniquement sur la composante volumique \(V \times €/m³\) (le socle reste inchangé)

## Tableau comparatif — 10 cas (moyenne Standard)

> “Moyenne web” = milieu de la fourchette Standard du tableau AlloDemenageur, soit \((min+max)/2\).

| Cas (10 m³) | Ancienne formule (tunnel) | Nouvelle approche | Résultat web (moy. Standard) |
|---|---:|---:|---:|
| Paris → Marseille (775 km) | 1400 € | 1050 € | 1050 € |
| Lyon → Toulouse (535 km) | 1400 € | 950 € | 950 € |
| Paris → Lyon (465 km) | 950 € | 850 € | 850 € |
| Lyon → Marseille (315 km) | 950 € | 750 € | 750 € |
| Paris → Toulouse (680 km) | 1400 € | 950 € | 950 € |
| Nice → Nantes (1140 km) | 1400 € | 1450 € | 1450 € |
| Paris → Strasbourg (395 km) | 950 € | 850 € | 850 € |
| Paris → Montpellier (750 km) | 1400 € | 1050 € | 1050 € |
| Bordeaux → Lille (900 km) | 1400 € | 1250 € | 1250 € |
| Paris → Rennes (350 km) | 950 € | 750 € | 750 € |

---

## Bench complémentaire — volumes 15 m³ / 30 m³ + local + international (moyenne Standard)

### Sources web utilisées

- 15 m³ (trajets France) + courte distance (5/10/15 m³): [AlloDemenageur — Petit déménagement : prix et solutions économiques en 2026](https://www.allodemenageur.fr/devis-demenagement/petit-demenagement/)
- 30 m³ (table “même ville” vs “1000 km” + exemple 500 km): [Demenagement24 — Prix déménagement](https://www.demenagement24.com/demenagement-prix/)
- International (Paris → Munich, estimation par volume): [Nextories — Déménagement Paris Munich](https://www.nextories.com/le-demenagement-international/demenagement-france-allemagne/demenagement-paris-munich)

### Hypothèses (comparaison “à iso-conditions”)

Même hypothèse que plus haut: **Standard**, hors saison, accès facile, sans services additionnels.

> Note: pour “Paris → Munich”, la source Nextories ne fournit pas explicitement le kilométrage; on utilise **≈840 km** uniquement pour calculer `Ancienne/Nouvelle` (le prix web est directement celui du tableau Nextories).

### Tableau comparatif (moyenne Standard)

| Cas | Ancienne formule (tunnel) | Nouvelle approche | Résultat web (moy. Standard) |
|---|---:|---:|---:|
| 15 m³ Paris → Marseille (775 km) | 2100 € | 1482 € | 1150 € |
| 15 m³ Paris → Lyon (465 km) | 1425 € | 1200 € | 900 € |
| 15 m³ Nice → Nantes (1140 km) | 2100 € | 2047 € | 1550 € |
| 30 m³ même ville (≈20 km) | 1200 € | 1018 € | 1400 € |
| 30 m³ ≈500 km | 2850 € | 2417 € | 2050 € |
| 30 m³ ≈1000 km | 4200 € | 3689 € | 2700 € |
| 5 m³ même ville (≈20 km) | 400 € | 400 € | 325 € |
| 10 m³ même ville (≈20 km) | 400 € | 400 € | 450 € |
| 15 m³ même ville (≈20 km) | 600 € | 565 € | 625 € |
| 20 m³ Paris → Munich (≈840 km) | 2800 € | 1893 € | 2540 € |
| 30 m³ Paris → Munich (≈840 km) | 4200 € | 2671 € | 3095 € |
| 40 m³ Paris → Munich (≈840 km) | 5600 € | 3411 € | 3650 € |

