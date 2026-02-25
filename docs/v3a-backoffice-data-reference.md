# V3A Tunnel → Back Office — Référence données & calculs

> Document de référence pour le back office. Décrit les données envoyées par le tunnel V3A, leur temporalité, et les modalités de calcul du prix.

---

## 1. Temporalité des appels

| Moment | Action | Endpoint |
|---|---|---|
| Submit Step 1 (email validé) | **Création** du lead | `POST /api/backoffice/leads` |
| Chaque changement de champ (debounced 3s, dès Step 2) | **Mise à jour** live | `PATCH /api/backoffice/leads/:id` |
| Submit Step 2 | Mise à jour complète projet | `PATCH /api/backoffice/leads/:id` |
| Submit Step 3 | Mise à jour finale (formule + prix + `pricingSnapshot`) | `PATCH /api/backoffice/leads/:id` |

Le live sync envoie un payload complet à chaque modification. Si l'utilisateur abandonne en cours de Step 2, les données déjà saisies sont dans le BO.

---

## 2. Payload — Champs de premier niveau

Ces champs sont envoyés directement dans le body du `PATCH`.

### Contact

| Champ | Type | Exemple |
|---|---|---|
| `firstName` | string | `"Jean"` |
| `lastName` | string? | `"Dupont"` |
| `email` | string | `"jean@example.com"` |
| `phone` | string? | `"+33612345678"` |

### Adresses

| Champ | Type | Exemple |
|---|---|---|
| `originAddress` | string? | `"5 Rue Lecourbe 75015 Paris"` |
| `originCity` | string? | `"Paris"` |
| `originPostalCode` | string? | `"75015"` |
| `destAddress` | string? | `"20 place Bellecour 69002 Lyon"` |
| `destCity` | string? | `"Lyon"` |
| `destPostalCode` | string? | `"69002"` |

### Date

| Champ | Type | Exemple |
|---|---|---|
| `movingDate` | string? (ISO) | `"2026-06-15T00:00:00.000Z"` |
| `dateFlexible` | boolean? | `true` |

### Logement origine

| Champ | Type | Valeurs possibles |
|---|---|---|
| `originHousingType` | string? | `"studio"`, `"t1"`, `"t2"`, `"t3"`, `"t4"`, `"t5"`, `"house"`, `"box"` |
| `originFloor` | number? | `0` (RDC) à `6` |
| `originElevator` | enum? | `"OUI"`, `"NON"`, `"PARTIEL"` |
| `originFurnitureLift` | string? | `"yes"`, `"no"` |
| `originCarryDistance` | string? | `""`, `"10-20"` |
| `originParkingAuth` | boolean? | |

### Logement destination

Mêmes champs préfixés `dest` : `destHousingType`, `destFloor`, `destElevator`, `destFurnitureLift`, `destCarryDistance`, `destParkingAuth`.

### Volume & Prix (envoyé au Step 3)

| Champ | Type | Exemple |
|---|---|---|
| `surfaceM2` | number? | `60` |
| `estimatedVolume` | number? | `25.3` (m³) |
| `density` | enum? | `"LIGHT"`, `"MEDIUM"`, `"HEAVY"` |
| `formule` | enum? | `"ECONOMIQUE"`, `"STANDARD"`, `"PREMIUM"` |
| `estimatedPriceMin` | number? | `1475` (€) |
| `estimatedPriceAvg` | number? | `1844` (€) |
| `estimatedPriceMax` | number? | `2213` (€) |

---

## 3. Payload — `tunnelOptions` (JSON structuré)

Le champ `tunnelOptions` est un objet JSON libre. Voici sa structure complète.

### `tunnelOptions.pricing`

```json
{
  "distanceKm": 580,
  "distanceProvider": "route"
}
```

- `distanceKm` : distance estimée (Haversine sur coords GPS, ou heuristique sur CP)
- `distanceProvider` : `"route"` (API distance) ou `undefined` (estimation)

### `tunnelOptions.accessV2`

```json
{
  "access_type": "simple",
  "narrow_access": false,
  "long_carry": true,
  "difficult_parking": false,
  "lift_required": false,
  "access_details": "portail < 2,5 m, portage > 10 m | rue étroite",
  "originAccessDetails": "portail < 2,5 m, portage > 10 m",
  "destinationAccessDetails": "rue étroite"
}
```

| Flag | Signification | Impact pricing |
|---|---|---|
| `narrow_access` | Passages étroits / petit ascenseur | +5% |
| `long_carry` | Portage > 10 m | +5% |
| `difficult_parking` | Stationnement compliqué | +3% |
| `lift_required` | Monte-meuble requis (étage ≥ 4 sans ascenseur) | +200€ |
| `access_details` | Texte libre fusionné (départ + arrivée séparés par ` \| `) | Informatif |
| `originAccessDetails` | Texte libre contraintes départ | Informatif |
| `destinationAccessDetails` | Texte libre contraintes arrivée | Informatif |

### `tunnelOptions.volumeAdjustments`

```json
{
  "kitchenIncluded": "appliances",
  "kitchenApplianceCount": 5,
  "extraVolumeM3": 3.0,
  "boxExactVolumeM3": 12
}
```

| Champ | Signification |
|---|---|
| `kitchenIncluded` | `"none"`, `"appliances"`, `"full"` |
| `kitchenApplianceCount` | Nombre d'appareils électroménager |
| `extraVolumeM3` | Volume supplémentaire ajouté (0.6 m³/appareil, 6 m³ si cuisine complète) |
| `boxExactVolumeM3` | Volume exact du box (si logement = "box") |

### `tunnelOptions.services`

```json
{
  "furnitureStorage": true,
  "cleaning": true,
  "fullPacking": true,
  "furnitureAssembly": false,
  "insurance": true,
  "wasteRemoval": true,
  "helpWithoutTruck": false,
  "specificSchedule": false,
  "piano": "droit",
  "debarras": true
}
```

### `tunnelOptions.notes`

Texte libre saisi par l'utilisateur (champ "Précisions").

### `tunnelOptions.hasFragileItems`

Boolean — objets fragiles signalés.

### `tunnelOptions.coordinates`

```json
{
  "originLat": 48.8566,
  "originLon": 2.3522,
  "destinationLat": 45.7578,
  "destinationLon": 4.8320
}
```

---

## 4. `pricingSnapshot` (envoyé au submit Step 3)

Le `pricingSnapshot` est dans `tunnelOptions.pricingSnapshot`. C'est le **figé du calcul au moment de la soumission**.

### Structure

```json
{
  "capturedAt": "2026-02-25T12:00:00.000Z",
  "formule": "STANDARD",
  "calculationDetails": { ... },
  "refinedMinEur": 1819,
  "refinedMaxEur": 2729,
  "refinedCenterEur": 2456,
  "moverBasePriceEur": 1800,
  "moverzFeeProvisionEur": 227,
  "moverzFeeProvisionRule": "MAX(100;10% du montant estimé)",
  "firstEstimateMinEur": 1819,
  "firstEstimateMaxEur": 2729,
  "firstEstimateCenterEur": 2456,
  "lines": [ ... ],
  "byFormule": { ... }
}
```

### `pricingSnapshot.calculationDetails`

Toutes les modalités de calcul, transparentes pour le déménageur :

```json
{
  "surfaceM2": 60,
  "volumeM3": 25.3,
  "housingType": "t2",
  "density": "normal",
  "distanceKm": 580,
  "distanceBand": "d500_699",
  "seasonFactor": 1.0,
  "originFloor": 3,
  "originElevator": "no",
  "originEtageCoefficient": 1.15,
  "destinationFloor": 0,
  "destinationElevator": "yes",
  "destinationEtageCoefficient": 1.0,
  "densityCoefficient": 1.0,
  "typeCoefficient": 0.4025,
  "formuleMultiplier": 1.0,
  "extraVolumeM3": 1.8,
  "services": {
    "monteMeuble": true,
    "piano": null,
    "debarras": false
  },
  "longCarry": false,
  "difficultParking": false,
  "tightAccess": false,
  "accessFlags": {
    "narrow_access": false,
    "long_carry": false,
    "difficult_parking": false,
    "lift_required": true
  }
}
```

### `pricingSnapshot.lines`

Détail des deltas par catégorie (chaque ligne = impact vs le scenario précédent) :

| `key` | `label` | `amountEur` | Description |
|---|---|---|---|
| `density` | Densité | delta € | Impact léger/normal/dense |
| `date` | Date | delta € | Impact saisonnalité |
| `access_housing` | Accès (étages / ascenseur) | delta € | Impact étages + ascenseur |
| `box` | Box | 0 | Si logement = box |
| `kitchen` | Cuisine | delta € | Impact cuisine (extra volume) |
| `services` | Services | delta € | Monte-meuble, piano, débarras |
| `formule` | Formule | delta € | Impact formule choisie |

### `pricingSnapshot.byFormule`

Prix pour les 3 formules, pour comparaison :

```json
{
  "ECONOMIQUE": { "prixMin": 1475, "prixMax": 2213, "prixFinal": 1844, "volumeM3": 25.3 },
  "STANDARD":   { "prixMin": 1819, "prixMax": 2729, "prixFinal": 2274, "volumeM3": 25.3 },
  "PREMIUM":    { "prixMin": 2421, "prixMax": 3632, "prixFinal": 3026, "volumeM3": 25.3 }
}
```

---

## 5. Formule de calcul du prix

### Pipeline

```
Surface (m²) × TypeCoefficient × DensityCoefficient + ExtraVolumeM3
= Volume (m³)

Volume × TarifLaPoste(distanceBand, formule) × Décote(0.8) × VolumeEconomyScale
= VolumeCost

max(VolumeCost, SocleMini=400€) + DistanceKm × 1.2 × Décote(0.8)
= BaseNoSeason

BaseNoSeason × SeasonFactor
= BaseSeasoned

BaseSeasoned × CoeffEtage × CoeffAccess + ServicesTotal
= PrixFinal (centre)

PrixMin = PrixFinal × 0.8
PrixMax = PrixFinal × 1.2

MoverzFee = max(100, PrixFinal × 10%)
PrixAffiché = PrixFinal + MoverzFee
```

### Constantes

| Constante | Valeur | Description |
|---|---|---|
| **DECOTE** | -20% (×0.8) | Décote globale sur tarif + distance |
| **PRIX_MIN_SOCLE** | 400 € | Prix plancher |
| **COEF_DISTANCE** | 1.2 €/km | Surcoût distance continue |

### TypeCoefficients (m³/m²)

| Type | Coefficient |
|---|---|
| studio | 0.46 |
| t1, t2, t3 | 0.4025 |
| t4, t5, house | 0.46 |

### DensityCoefficients

| Densité | Coefficient |
|---|---|
| light (peu meublé) | 0.85 |
| normal | 1.0 |
| dense (très meublé) | 1.25 |

### Tarifs €/m³ par distance et formule (après décote ×0.8)

| Distance | Éco | Standard | Premium |
|---|---|---|---|
| < 100 km | 28 | 32 | 52 |
| 100–369 km | 48 | 60 | 88 |
| 370–499 km | 52 | 68 | 96 |
| 500–699 km | 60 | 76 | 104 |
| 700–849 km | 68 | 84 | 112 |
| 850–999 km | 76 | 100 | 124 |
| ≥ 1000 km | 84 | 116 | 136 |

### Coefficient étage

| Étage | Avec ascenseur | Petit ascenseur | Sans ascenseur |
|---|---|---|---|
| RDC | 1.0 | 1.0 | 1.0 |
| 1er | 1.0 | 1.02 | 1.05 |
| 2e | 1.0 | 1.06 | 1.10 |
| 3e+ | 1.0 | 1.10 | 1.15 |

À partir du **4e étage sans ascenseur** → monte-meuble requis (+200€).

### Majorations accès

| Condition | Majoration |
|---|---|
| Portage > 10 m (`longCarry`) | +5% |
| Passages étroits (`tightAccess`) | +5% |
| Parking compliqué (`difficultParking`) | +3% |

Ces majorations sont **multiplicatives** entre elles.

### Services additionnels (prix fixes)

| Service | Prix |
|---|---|
| Monte-meuble | 200 € |
| Piano droit | 200 € |
| Piano ¼ queue | 250 € |
| Débarras | 100 € |

### Saisonnalité (`seasonFactor`)

Le `seasonFactor` final = `getSeasonFactor(date)` × `getUrgencyFactor(date)`.

**Facteur saison (mois)** :

| Mois | Factor |
|---|---|
| Juin, Juillet, Août, Septembre, Décembre | 1.30 (haute saison) |
| Mars, Avril, Mai, Octobre | 1.00 (normal) |
| Janvier, Février, Novembre | 0.85 (basse saison) |

**Facteur urgence** :

| Délai | Factor |
|---|---|
| ≤ 30 jours | 1.15 |
| > 30 jours | 1.00 |

### Économie d'échelle volume

```
scale = clamp((V/10)^(-0.15), 0.75, 1.05)
```

Les gros volumes bénéficient d'un €/m³ légèrement plus bas.

### Provision Moverz

```
fee = max(100€, 10% du prix centre)
```

Le prix affiché au client inclut la provision Moverz. Le `moverBasePriceEur` dans le snapshot est le prix **hors** provision.

---

## 6. Mapping UI → BO

| Champ UI (state) | Champ BO | Transformation |
|---|---|---|
| `originFloor` | `originFloor` | `parseInt()` |
| `originElevator` | `originElevator` | `"yes"→"OUI"`, `"no"/"none"→"NON"`, `"small"/"partial"→"PARTIEL"` |
| `density` | `density` | `"light"→"LIGHT"`, `"normal"→"MEDIUM"`, `"dense"→"HEAVY"` |
| `formule` | `formule` | Identique (`"ECONOMIQUE"`, `"STANDARD"`, `"PREMIUM"`) |
| `originAccess`/`originElevator` = `"other"` | `accessV2.originAccessDetails` | Texte libre (min 10 car.) |

---

## 7. Formules et options auto-liées

Quand l'utilisateur sélectionne une formule, certaines options sont auto-activées :

| Formule | Options auto-activées |
|---|---|
| Éco | Aucune |
| Standard | Aucune (emballage basique inclus de base) |
| Premium | Emballage complet, Nettoyage, Assurance renforcée, Évacuation déchets |

"Aide sans camion" est auto-activé si adresse départ = adresse arrivée.
