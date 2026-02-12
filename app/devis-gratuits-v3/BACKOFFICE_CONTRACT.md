# Backoffice Contract — Tunnel Devis Gratuits V3

> **CONTRAT NON NÉGOCIABLE** : Ce document liste tous les éléments du tunnel qui **NE DOIVENT JAMAIS ÊTRE MODIFIÉS** car ils sont intégrés au Back Office.  
> Toute modification de ces éléments casse l'intégration backoffice et la data historique.

---

## 📋 Endpoints API (lib/api/client.ts)

### Routes internes (Next.js)
| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `/api/backoffice/leads/:id` | `GET` | Récupère un lead existant |
| `/api/backoffice/leads/:id` | `PATCH` | Met à jour un lead existant |
| `/api/distance` | `POST` | Calcul distance OSRM (route) |
| `/api/geocode` | `GET` | Géocodage adresses |
| `/api/uploads/photos` | `POST` | Upload photos lead |

### Routes Back Office (via NEXT_PUBLIC_API_URL)
| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `${NEXT_PUBLIC_API_URL}/public/leads` | `POST` | Création lead |
| `${NEXT_PUBLIC_API_URL}/public/leads/:id` | `PATCH` | Mise à jour lead |
| `${NEXT_PUBLIC_API_URL}/public/leads/:id` | `GET` | Récupération lead |
| `${NEXT_PUBLIC_API_URL}/public/tunnel-events` | `POST` | Tracking events |
| `${NEXT_PUBLIC_API_URL}/public/leads/:id/inventory` | `POST` | Sauvegarde inventaire |

---

## 🔐 Champs de formulaire intouchables

### Contact (TunnelFormState)
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `firstName` | string | Oui (Step 3) | Prénom obligatoire |
| `lastName` | string | Non | Nom optionnel |
| `email` | string | Oui (Step 3) | Email obligatoire, format validé |
| `phone` | string | Non | Téléphone optionnel |

### Adresses
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `originAddress` | string | Oui (Step 3) | Adresse complète départ |
| `originCity` | string | Oui (Step 1) | Ville départ |
| `originPostalCode` | string | Oui (Step 1) | CP départ |
| `originCountryCode` | string | Oui | ISO2 (ex: "fr") |
| `originLat` | number\|null | Oui | Latitude (API Adresse) |
| `originLon` | number\|null | Oui | Longitude (API Adresse) |
| `destinationAddress` | string | Oui (Step 3) | Adresse complète arrivée |
| `destinationCity` | string | Oui (Step 1) | Ville arrivée |
| `destinationPostalCode` | string | Oui (Step 1) | CP arrivée |
| `destinationCountryCode` | string | Oui | ISO2 (ex: "fr") |
| `destinationLat` | number\|null | Oui | Latitude (API Adresse) |
| `destinationLon` | number\|null | Oui | Longitude (API Adresse) |
| `destinationUnknown` | boolean | Non | Destination inconnue (non utilisé actuellement) |

### Volume & Logement
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `surfaceM2` | string | Oui (Step 1) | Surface 10-500 m² |
| `surfaceTouched` | boolean | Non | Meta: surface modifiée manuellement |
| `density` | ""\|"light"\|"normal"\|"dense" | Non | "" = défaut "dense" (Step 3) |
| `kitchenIncluded` | ""\|"none"\|"appliances"\|"full" | Non | "" = défaut "appliances" (Step 3) |
| `kitchenApplianceCount` | string | Non | Nombre équipements si "appliances" |
| `originHousingType` | string | Oui (Step 3) | Type logement départ (house, t2, etc.) |
| `originFloor` | string | Non | Étage départ (si appartement) |
| `originElevator` | string | Non | Ascenseur départ (none, yes, partial) |
| `originFurnitureLift` | string | Non | Monte-meuble départ |
| `originCarryDistance` | string | Non | Distance portage départ |
| `originParkingAuth` | boolean | Non | Autorisation stationnement départ |
| `destinationHousingType` | string | Oui (Step 3) | Type logement arrivée |
| `destinationFloor` | string | Non | Étage arrivée (si appartement) |
| `destinationElevator` | string | Non | Ascenseur arrivée |
| `destinationFurnitureLift` | string | Non | Monte-meuble arrivée |
| `destinationCarryDistance` | string | Non | Distance portage arrivée |
| `destinationParkingAuth` | boolean | Non | Autorisation stationnement arrivée |

### Formule & Prix
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `formule` | "ECONOMIQUE"\|"STANDARD"\|"PREMIUM" | Oui | Formule sélectionnée (défaut: STANDARD) |

### Date
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `movingDate` | string | Oui (Step 3) | Date déménagement ISO (YYYY-MM-DD) |
| `dateFlexible` | boolean | Non | Flexibilité ±1 semaine |

### Accès V2 (Step 3)
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `access_type` | "simple"\|"constrained" | Non | Type d'accès (défaut: simple) |
| `narrow_access` | boolean | Non | Passages étroits / petit ascenseur |
| `long_carry` | boolean | Non | Portage > 10m |
| `difficult_parking` | boolean | Non | Stationnement difficile |
| `lift_required` | boolean | Non | Monte-meuble requis |
| `access_details` | string | Non | Précisions accès (+ JSON caché pour départ/arrivée) |

### Services additionnels
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `serviceFurnitureStorage` | boolean | Non | Garde-meuble |
| `serviceCleaning` | boolean | Non | Nettoyage |
| `serviceFullPacking` | boolean | Non | Emballage complet |
| `serviceFurnitureAssembly` | boolean | Non | Montage meubles |
| `serviceInsurance` | boolean | Non | Assurance renforcée |
| `serviceWasteRemoval` | boolean | Non | Évacuation déchets |
| `serviceHelpWithoutTruck` | boolean | Non | Aide sans camion |
| `serviceSpecificSchedule` | boolean | Non | Horaires spécifiques |
| `serviceDebarras` | boolean | Non | Débarras |
| `serviceDismantling` | boolean | Non | Démontage |
| `servicePiano` | string | Non | Piano ("none", "droit", "quart") |

### Notes
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `specificNotes` | string | Non | Précisions utilisateur |

### Meta
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `leadId` | string\|null | Non | ID Back Office (Postgres) |
| `currentStep` | 1\|2\|3\|4 | Oui | Étape actuelle |
| `linkingCode` | string\|null | Non | Code de liaison (legacy) |
| `enteredAtStep` | number\|null | Non | Étape d'entrée initiale |

### Reward (baseline figé Step 2)
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| `rewardBaselineMinEur` | number\|null | Non | Min baseline figé en Step 2 |
| `rewardBaselineMaxEur` | number\|null | Non | Max baseline figé en Step 2 |
| `rewardBaselineDistanceKm` | number\|null | Non | Distance baseline (ville +15km) |
| `rewardBaselineFormule` | string\|null | Non | Formule baseline |

---

## 📊 Payload Back Office (createBackofficeLead / updateBackofficeLead)

### Mapping tunnel → Back Office

#### Contact
| Tunnel | Back Office | Type | Requis |
|--------|-------------|------|--------|
| `firstName` | `firstName` | string | Oui |
| `lastName` | `lastName` | string | Non |
| `email` | `email` | string | Oui |
| `phone` | `phone` | string | Non |

#### Source
| Tunnel | Back Office | Type | Requis |
|--------|-------------|------|--------|
| `source` (query param) | `source` | string | Oui |
| - | `estimationMethod` | "FORM" | Oui |

#### Adresses
| Tunnel | Back Office | Type | Requis |
|--------|-------------|------|--------|
| `originAddress` | `originAddress` | string | Non |
| `originCity` | `originCity` | string | Non |
| `originPostalCode` | `originPostalCode` | string | Non |
| `originCountryCode` | `originCountryCode` | string | Non |
| `destinationAddress` | `destAddress` | string | Non |
| `destinationCity` | `destCity` | string | Non |
| `destinationPostalCode` | `destPostalCode` | string | Non |
| `destinationCountryCode` | `destCountryCode` | string | Non |

#### Volume & Surface
| Tunnel | Back Office | Type | Requis | Transformation |
|--------|-------------|------|--------|----------------|
| `surfaceM2` | `surfaceM2` | number | Non | `parseInt(surfaceM2)` |
| `activePricing.volumeM3` | `estimatedVolume` | number | Non | Depuis calcul pricing |
| `density` | `density` | "LIGHT"\|"MEDIUM"\|"HEAVY" | Non | light→LIGHT, normal→MEDIUM, dense→HEAVY |

#### Formule & Prix
| Tunnel | Back Office | Type | Requis |
|--------|-------------|------|--------|
| `formule` | `formule` | "ECONOMIQUE"\|"STANDARD"\|"PREMIUM" | Non |
| `activePricing.prixMin` | `estimatedPriceMin` | number | Non |
| `activePricing.prixFinal` | `estimatedPriceAvg` | number | Non |
| `activePricing.prixMax` | `estimatedPriceMax` | number | Non |

#### Logement origine
| Tunnel | Back Office | Type | Requis | Transformation |
|--------|-------------|------|--------|----------------|
| `originHousingType` | `originHousingType` | string | Non | - |
| `originFloor` | `originFloor` | number | Non | 0 si maison, sinon `parseInt(originFloor)` |
| `originElevator` | `originElevator` | "OUI"\|"NON"\|"PARTIEL" | Non | yes→OUI, no/none→NON, partial→PARTIEL |
| `originFurnitureLift` | `originFurnitureLift` | string | Non | - |
| `originCarryDistance` | `originCarryDistance` | string | Non | - |
| `originParkingAuth` | `originParkingAuth` | boolean | Non | - |

#### Logement destination
| Tunnel | Back Office | Type | Requis | Transformation |
|--------|-------------|------|--------|----------------|
| `destinationHousingType` | `destHousingType` | string | Non | - |
| `destinationFloor` | `destFloor` | number | Non | 0 si maison, sinon `parseInt(destinationFloor)` |
| `destinationElevator` | `destElevator` | "OUI"\|"NON"\|"PARTIEL" | Non | yes→OUI, no/none→NON, partial→PARTIEL |
| `destinationFurnitureLift` | `destFurnitureLift` | string | Non | - |
| `destinationCarryDistance` | `destCarryDistance` | string | Non | - |
| `destinationParkingAuth` | `destParkingAuth` | boolean | Non | - |

#### Dates
| Tunnel | Back Office | Type | Requis | Transformation |
|--------|-------------|------|--------|----------------|
| `movingDate` | `movingDate` | string (ISO) | Non | `toIsoDate(movingDate)` |
| `dateFlexible` | `dateFlexible` | boolean | Non | - |

#### Options tunnel (JSON structuré)
| Tunnel | Back Office | Type | Requis | Notes |
|--------|-------------|------|--------|-------|
| Tous les champs ci-dessus | `tunnelOptions` | JSON | Non | Objet structuré complet archivé (pricing, accessV2, volumeAdjustments, services, notes, pricingSnapshot) |

**Important** : `tunnelOptions` contient TOUTES les données détaillées du tunnel (source de vérité). Structure :

```typescript
{
  pricing: {
    distanceKm: number,
    distanceProvider: "osrm" | "fallback"
  },
  accessV2: {
    access_type: "simple" | "constrained",
    narrow_access: boolean,
    long_carry: boolean,
    difficult_parking: boolean,
    lift_required: boolean,
    access_details: string
  },
  volumeAdjustments: {
    kitchenIncluded: "none" | "appliances" | "full",
    kitchenApplianceCount: number,
    extraVolumeM3: number
  },
  services: {
    furnitureStorage: boolean,
    cleaning: boolean,
    fullPacking: boolean,
    furnitureAssembly: boolean,
    insurance: boolean,
    wasteRemoval: boolean,
    helpWithoutTruck: boolean,
    specificSchedule: boolean,
    debarras: boolean,
    dismantling: boolean,
    piano: "none" | "droit" | "quart"
  },
  notes: string,
  pricingSnapshot: {
    capturedAt: string (ISO),
    formule: string,
    refinedMinEur: number,
    refinedMaxEur: number,
    refinedCenterEur: number,
    firstEstimateMinEur: number,
    firstEstimateMaxEur: number,
    firstEstimateCenterEur: number,
    lines: Array<{key, label, status, amountEur, confirmed}>,
    byFormule: Record<formule, {prixMin, prixMax, prixFinal, volumeM3}>
  }
}
```

---

## 📈 Events GA4 (lib/analytics/ga4.ts)

### Events déclenchés
| Event | Params | Quand | Notes |
|-------|--------|-------|-------|
| `form_start` | `source`, `from`, `step_name`, `step_index` | Step 1 initial entry | `step_name: "CONTACT"`, `step_index: 1` |
| `tunnel_step_viewed` | `source`, `from`, `step_name`, `step_index`, `lead_id` | Chaque step | Via `useTunnelTracking.trackStep()` |
| `lead_submit` | `source`, `from`, `lead_id` | Completion tunnel | Via `useTunnelTracking.trackCompletion()` |

### Mapping steps → events (useTunnelTracking)
| currentStep | logicalStep | screenId | Notes |
|-------------|-------------|----------|-------|
| 1 | `PROJECT` | `qualification_v2` | Trajet + surface |
| 2 | `RECAP` | `estimation_v2` | Budget estimé |
| 3 | `PROJECT` | `acces_v2` | Affinage complet |
| 4 | `THANK_YOU` | `confirmation_v2` | Confirmation finale |

**IMPORTANT** : 
- `logicalStep` = source de vérité métier (ne change JAMAIS, même si ordre des steps change)
- `screenId` = identifiant UI explicite (JAMAIS dérivé d'un index, toujours hardcodé)
- Les events `TUNNEL_STEP_VIEWED`, `TUNNEL_STEP_CHANGED`, `TUNNEL_COMPLETED`, `TUNNEL_ERROR` sont envoyés au Back Office via `/public/tunnel-events`

---

## 🧪 Checklist QA (à vérifier avant merge)

### ✅ Payload integrity
- [ ] Le payload envoyé par `createBackofficeLead` / `updateBackofficeLead` est strictement identique (avant/après refonte)
- [ ] Tous les champs requis sont présents
- [ ] Les transformations (light→LIGHT, yes→OUI, parseInt, toIsoDate) sont appliquées correctement
- [ ] `tunnelOptions` contient toutes les données structurées attendues
- [ ] `pricingSnapshot` est correctement capturé en Step 3 (avant soumission)

### ✅ Events GA4 / Tracking
- [ ] Les events `form_start`, `tunnel_step_viewed`, `lead_submit` sont toujours déclenchés
- [ ] Les event names n'ont pas changé
- [ ] Les props (source, from, step_name, step_index, lead_id) sont identiques
- [ ] `logicalStep` reste stable (PROJECT, RECAP, THANK_YOU)
- [ ] `screenId` est explicite et ne dépend pas d'un index

### ✅ Champs formulaire
- [ ] Aucun champ n'a été supprimé du state (TunnelFormState)
- [ ] Aucun `name` ou `id` d'input n'a été renommé
- [ ] Les valeurs attendues sont identiques (ex: "light", "ECONOMIQUE", "house")
- [ ] La validation reste identique (ex: email regex, surface 10-500, date J+15)

### ✅ Endpoints / Routes
- [ ] Aucun endpoint n'a été modifié
- [ ] Aucun param / query n'a été ajouté ou supprimé
- [ ] Les URLs des routes internes et Back Office sont identiques
- [ ] Les headers HTTP sont identiques

### ✅ Fonctionnel
- [ ] Le tunnel se termine sans erreur (Step 1 → Step 4)
- [ ] Le lead est créé dans le Back Office (vérifier dans la DB Postgres)
- [ ] Les coordonnées (lat/lon) sont bien récupérées via API Adresse
- [ ] La distance OSRM est calculée correctement
- [ ] Le pricing est calculé correctement (formules, min/max)
- [ ] La validation bloque bien les champs requis
- [ ] Les erreurs API sont gérées proprement (fallback 404 → recréation)

### ✅ Mobile / Desktop
- [ ] Le tunnel fonctionne sur mobile (iOS Safari, Android Chrome)
- [ ] Le tunnel fonctionne sur desktop (Chrome, Firefox, Safari)
- [ ] Aucun layout cassé, aucun overflow, aucun texte illisible
- [ ] Les CTAs sont accessibles et visibles
- [ ] Les animations sont smooth (60fps)

### ✅ Régression
- [ ] Aucun breaking change sur les anciennes sessions (localStorage)
- [ ] Le tunnel fonctionne avec `?leadId=xxx` (reprise dossier)
- [ ] Le tunnel fonctionne avec `?step=3&originPostalCode=...` (entry Step 3 depuis moverz.fr)
- [ ] Le debug mode fonctionne (`?debug=1`)

---

## 🚨 Interdictions absolues

1. **NE JAMAIS** modifier un endpoint, une route, un param d'URL
2. **NE JAMAIS** renommer un champ de `TunnelFormState`
3. **NE JAMAIS** changer les valeurs attendues (ex: "light" → "léger" ❌)
4. **NE JAMAIS** supprimer ou renommer un event GA4
5. **NE JAMAIS** modifier les props d'un event GA4 (ex: `step_name` → `stepName` ❌)
6. **NE JAMAIS** modifier le payload envoyé au Back Office (ajout/suppression/renommage de champs)
7. **NE JAMAIS** modifier les transformations existantes (ex: light→LIGHT, yes→OUI)
8. **NE JAMAIS** modifier les validations existantes (regex email, min/max surface, etc.)
9. **NE JAMAIS** modifier les calculs de pricing (lib/pricing/calculate.ts) sans validation métier
10. **NE JAMAIS** modifier les hooks existants (useTunnelState, useTunnelTracking, useDeviceDetection) sans vérifier tous les usages

---

## ✅ Ce qui est autorisé (UI-only)

1. ✅ Modifier les styles CSS/Tailwind (couleurs, spacing, border-radius, shadows, etc.)
2. ✅ Ajouter des animations CSS/Framer Motion (transitions, hover, micro-interactions)
3. ✅ Créer des composants wrappers (ex: `<Button>`, `<Card>`, `<Field>`) qui encapsulent les inputs existants
4. ✅ Réorganiser la hiérarchie visuelle (grille, flex, order, z-index)
5. ✅ Ajouter des éléments décoratifs (icons, illustrations, gradients, blur)
6. ✅ Améliorer la typographie (font-size, font-weight, line-height, letter-spacing)
7. ✅ Ajouter des tooltips, modals, popovers (UI state uniquement, pas de data)
8. ✅ Ajouter des skeletons, loaders, spinners (UI feedback)
9. ✅ Ajouter des count-ups, progress bars, gauges (UI animations)
10. ✅ Améliorer l'accessibilité (aria-labels, focus states, keyboard navigation)

---

## 📝 Notes finales

- **Ce document est la source de vérité** pour la refonte UI du tunnel.
- **Toute modification de ce contrat doit être validée par le product owner + backend team**.
- **En cas de doute, toujours privilégier la stabilité backoffice sur l'UX**.
- **La refonte est 100% UI-only : on encapsule, on ne modifie pas**.
