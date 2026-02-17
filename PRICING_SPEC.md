# PRICING_SPEC — Source de verite calcul tunnel (Step 2 / Step 3)

Objectif: donner au Back Office une specification unique pour comprendre, auditer et recalculer le prix affiche au client.

Cette spec decrit le comportement actuel du code (main), pas une intention theorique.

## 1) Sources de verite code

- Moteur principal: `lib/pricing/calculate.ts`
- Constantes/calibrage: `lib/pricing/constants.ts`
- Baseline Step 2 + provision Moverz: `lib/pricing/scenarios.ts`
- Orchestration tunnel Step 2/Step 3: `app/devis-gratuits-v3/page.tsx`
- Estimation home (API): `app/api/estimate/route.ts`

## 2) Definition metier des deux montants

- Step 2 = estimation baseline figee (home + step 2 + point de depart step 3)
- Step 3 = budget affine (meme base, puis ajustements successifs)

Le montant central affiche est toujours:

`centre = min + (max - min) * DISPLAY_CENTER_BIAS`

Avec `DISPLAY_CENTER_BIAS = 0.5`.

## 3) Step 2 (baseline)

### 3.1 Inputs Step 2

- `surfaceM2` (ou surface derivee si box depart)
- `distanceKmBaseline = distanceVilleOSRM + 15`
- `formule` (`ECONOMIQUE` | `STANDARD` | `PREMIUM`)
- Hypotheses fixes:
  - `housingType = "t2"`
  - `density = "dense"`
  - `seasonFactor = 1`
  - `originFloor = 0`, `destinationFloor = 0`
  - `originElevator = "yes"`, `destinationElevator = "yes"`
  - `extraVolumeM3 = 3 * 0.6` (cuisine baseline)
  - services = none

### 3.2 Calcul brut (`calculatePricing`)

1) `baseVolumeM3 = surfaceM2 * TYPE_COEFFICIENTS[housingType] * DENSITY_COEFFICIENTS[density]`
2) `volumeM3 = round1(baseVolumeM3 + extraVolumeM3)`
3) `band = getDistanceBand(distanceKm)`
4) `rate = LA_POSTE_RATES_EUR_PER_M3[band][formule] * (1 + DECOTE)`
5) `volumeScale = clamp((volumeM3/10)^(-0.15), 0.75, 1.05)`
6) `volumeCost = volumeM3 * rate * volumeScale`
7) `distanceCost = distanceKm * COEF_DISTANCE * (1 + DECOTE)`
8) `baseNoSeason = max(volumeCost, PRIX_MIN_SOCLE) + distanceCost`
9) `baseSeasoned = baseNoSeason * seasonFactor`
10) `coeffEtage = max(getEtageCoefficient(orig), getEtageCoefficient(dest))`
11) `coeffAccess = (longCarry?1.05:1)*(tightAccess?1.05:1)*(difficultParking?1.03:1)` (ici = 1)
12) centres:
   - `centreNoSeasonSansServices = baseNoSeason * coeffEtage * coeffAccess`
   - `centreSeasonedSansServices = baseSeasoned * coeffEtage * coeffAccess`
13) services (ici 0)
14) `prixFinal = round(centreSeasoned)`
15) `prixMin = round(centreNoSeason * 0.8)`
16) `prixMax = round(centreSeasoned * 1.2)`

### 3.3 Provision Moverz Step 2

Regle:

`moverzFeeProvisionEur = max(100, round(0.1 * centreAvantProvision))`

Ou:

`centreAvantProvision = getDisplayedCenter(prixMinBrut, prixMaxBrut)`

Puis:

- `prixMinStep2 = prixMinBrut + provision`
- `prixFinalStep2 = prixFinalBrut + provision`
- `prixMaxStep2 = prixMaxBrut + provision`

Le centre Step 2 est ensuite fige pour Step 3.

## 4) Step 3 (budget affine)

Step 3 part du baseline fige Step 2 puis applique des deltas dans cet ordre:

1. Distance
2. Densite
3. Cuisine
4. Date
5. Acces - etages
6. Acces - contraintes (addons fixes)
7. Formule
8. Objets specifiques (addons fixes)

Tous les calculs Step 3 reutilisent la provision figee issue du Step 2.

## 5) Regles speciales Box

Si `originHousingType = "box"`:

- m3 exact box requis (`originBoxVolumeM3`)
- surface effective derivee:
  - `surfaceEffective = clamp(round(boxM3 / (TYPE_COEFFICIENTS.t2 * DENSITY_COEFFICIENTS.normal)), 10, 500)`
- densite forcee `normal`
- cuisine neutralisee (`kitchenIncluded = none`, `extraVolumeM3 = 0`)
- remise sur composante `Acces - etages`:
  - `discount = 20%` de ce delta, uniquement si ce delta est positif

Si box depart ou arrivee:

- le bloc contraintes correspondant est masque en UI.

## 6) Add-ons fixes Step 3

### 6.1 Contraintes (par cote)

Comptees via `access_details`:

- `narrow_access`: 70 EUR par cote
- `long_carry`: 80 EUR par cote
- `difficult_parking`: 100 EUR par cote
- `lift_required`: 250 EUR par cote

### 6.2 Objets specifiques

Actuellement:

- `piano`: 150 EUR
- `coffreFort`: 150 EUR
- `aquarium`: 100 EUR
- `objetsFragilesVolumineux`: 80 EUR
- `meublesTresLourdsCount`: 100 EUR / unite

## 7) Donnees requises cote BO pour recalcul

A minima (depuis payload lead + `tunnelOptions`):

- `surfaceM2`, `density`, `formule`
- `originFloor`, `originElevator`, `destFloor`, `destElevator`
- `movingDate` (pour saison + urgence)
- `distanceKm` + `distanceProvider`
- `accessV2.access_details` + flags contraintes
- `volumeAdjustments` (`kitchenIncluded`, `kitchenApplianceCount`, `extraVolumeM3`, `boxExactVolumeM3`)
- `pricing.step2CenterBeforeProvisionEur` ou provision figee
- `pricingSnapshot.lines` (trace deltas)
- `notes` (contient bloc objets specifiques structure)

## 8) Tableau d'explication a presenter au demenageur

Format recommande (comme la capture):

- Colonnes: `Libelle | Input | m3 | Euros`
- Lignes:
  - `Base`
  - `Densite`
  - `Cuisine`
  - `Date`
  - `Contraintes (etages, acces)`
  - `Formule`
  - `Objets specifiques` (si present)
  - `Commission Moverz` (ligne explicite interne)
  - `Total`
  - `Fourchette presentee au client`

Regles d'affichage:

- `Euros` de chaque ligne = delta applique a l'etape correspondante.
- `Total` = somme des deltas + base.
- `Fourchette` = `refinedMinEur` / `refinedMaxEur`.

## 9) Arrondi / conventions

- Volumes: 1 decimale (`round1`)
- Prix: arrondi entier EUR (`Math.round`)
- Fourchette:
  - min = `round(centreNoSeason * 0.8)`
  - max = `round(centreSeasoned * 1.2)`

## 10) Verification operationnelle

Pour auditer un lead:

1) Recharger payload + `tunnelOptions`.
2) Recalculer Step 2 baseline.
3) Rejouer pipeline Step 3 dans l'ordre ci-dessus.
4) Comparer aux valeurs archivees:
   - `tunnelOptions.pricingSnapshot`
   - `estimatedPriceMin/Avg/Max`
5) Expliquer le detail ligne par ligne via le tableau section 8.
