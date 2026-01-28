# Migration V4 (staging) — journal de refonte UX/UI

> **Règle**: ce fichier doit être mis à jour **à chaque modification de code** liée au tunnel (UI, tracking, mapping payload, copy, étapes) et **à chaque décision** (même petite).
>
> **Interdits** (staging V4):
> - **Aucune migration Prisma / aucun changement DB schema** (`prisma/schema.prisma`, `prisma/migrations/**`).
> - **Aucune suppression de champs** existants côté tunnel (les champs actuellement disponibles pour les clients doivent rester disponibles).
> - **Pas de modification directe de `main`**.
>
> **Note**: des champs UI supplémentaires peuvent être prototypés **uniquement** s’ils sont clairement marqués “non connectés” côté front **et** s’ils ne sont pas envoyés au Back Office.

---

## 0) Contexte

- **Branche**: `staging`
- **Déploiement**: staging (CapRover) — tests uniquement en conditions réelles
- **Objectif**: refonte UX/UI **sans** changer les champs / formules (sauf prototype explicitement non connecté)

---

## 1) Changelog (ordre chronologique)

### 2026-01-28 — Audit V3 (prod) vs staging : DB renseignée + calculs (prix/distance)

- **Date**: 2026-01-28
- **Auteur**: (audit data)
- **Objectif**: permettre d’utiliser **uniquement `staging`** en garantissant que la **DB Back Office** est renseignée **comme en V3 prod** (mêmes champs + mêmes règles de calcul).
- **Périmètre analysé**:
  - Écritures Back Office: `createBackofficeLead` / `updateBackofficeLead` (tunnel V3) dans `app/devis-gratuits-v3/page.tsx`
  - Calculs prix/volume/distance: `lib/pricing/calculate.ts`, `lib/pricing/constants.ts` + logique distance dans `app/devis-gratuits-v3/page.tsx`
  - Note: la DB locale Prisma (SQLite `LeadTunnel`) existe via `/api/leads` mais **n’est pas utilisée** par le tunnel V3 (V3 écrit directement dans le Back Office).
- **DB Back Office — champs renseignés (V3)**:
  - **Step 1 (Contact)**: création/MAJ lead (prénom/email requis côté création) via `/public/leads`
  - **Step 2 (Projet)**: adresses + date + logement/accès (étages, ascenseur, etc.) + `tunnelOptions.access` (JSON)
  - **Step 3 (Estimation)**: `surfaceM2`, `estimatedVolume`, `density`, `formule`, `estimatedPriceMin/Avg/Max`, `estimatedSavingsEur` + `tunnelOptions` (pricing/access/services/notes…)
- **Constat clé (écarts staging vs V3 prod)**:
  - **Distance route (OSRM)**: en staging, l’appel `/api/distance` est **désactivé** (hotfix), donc `distanceProvider=fallback` et la distance passe par un **fallback heuristique** si pas de coords fiables (risque “placeholder”).
  - **Volume**: en staging, `TYPE_COEFFICIENTS` a été modifié **0.3 → 0.4** pour `studio`, `t4`, `t5`, `house*` ⇒ **volume estimé + prix** (et donc champs Back Office) **différents** de la prod.
- **Décisions à prendre (pour alignement strict sur V3 prod)**:
  - Revenir aux coefficients V3 prod (0.3) **ou** assumer la rupture et l’annoncer comme évolution (non alignée V3).
  - Réactiver OSRM (et corriger la cause de la boucle) **ou** documenter explicitement le fallback distance (et accepter la variance sur les prix).

### 2026-01-28 — Step 3 (V2) : adresse non pré-remplie + suggestions filtrées par CP

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: éviter de pré-remplir le champ “adresse” avec la ville/CP (source de confusion) et améliorer la pertinence des suggestions en filtrant par **code postal** quand disponible.
- **Changements UI**:
  - **StepAccessLogisticsV2**: labels dynamiques :
    - “Adresse de départ” → **“Votre adresse à {Ville} ({CP})”**
    - “Adresse d’arrivée” → **“Votre adresse à {Ville} ({CP})”**
  - Les inputs `originAddress` / `destinationAddress` ne sont plus initialisés par défaut à `"{CP} {Ville}"`.
- **Autocomplete**:
  - `AddressAutocomplete` accepte un contexte (`contextPostalCode`, `contextCity`, `contextCountryCode`)
  - Provider FR (BAN): ajout paramètre `postcode=` pour filtrer les résultats.
  - Provider World (Nominatim): ajout de `countrycodes=` (si fourni) + injection du CP dans la query pour prioriser.
  - **Filtre ville (Step 3)**: quand la ville est déjà connue, elle est injectée dans la requête (BAN+Nominatim) pour éviter des résultats hors ville.
  - **International (Step 3)**: si le pays sélectionné ≠ FR, on **bypass BAN** et on utilise Nominatim filtré par `countryCode` (évite des résultats USA pour une ville EU).
- **Tracking**:
  - Aucun impact.
- **Back Office payload**:
  - Aucun changement de champs; amélioration de la qualité des adresses saisies.
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`

### 2026-01-28 — Distance “route” réactivée (OSRM) pour éviter les distances placeholder

- **Date**: 2026-01-28
- **Auteur**: (data)
- **Décision**: réactiver le calcul de distance **par route** via `/api/distance` (OSRM) au lieu de dépendre du fallback heuristique (risque de prix faux).
- **Changements**:
  - `app/devis-gratuits-v3/page.tsx`: le `useEffect` distance route relance l’appel `/api/distance` (debounce ~300ms) et mémorise la dernière paire de coords (`lastRouteKeyRef`) pour éviter les relances inutiles.
- **Impact**:
  - `distanceKm` dans `tunnelOptions.pricing` (Back Office) reflète une distance **route** quand possible.
  - Le fallback reste uniquement en cas d’échec provider / coords manquantes.
- **Tracking**:
  - Aucun impact.

### 2026-01-28 — Champs obligatoires: adresses complètes + pays + distance route (bloquant)

- **Date**: 2026-01-28
- **Auteur**: (data)
- **Décision**: garantir que les champs suivants sont **toujours** renseignés avant envoi au Back Office :
  - Départ: **adresse + ville + CP + pays**
  - Arrivée: **adresse + ville + CP + pays**
  - **Distance par route (OSRM)** (pas de fallback heuristique)
- **Changements**:
  - Ajout `originCountryCode` / `destinationCountryCode` dans l’état (`useTunnelState`) et remplissage depuis l’autocomplete.
  - V2 (StepAccessLogisticsV2): affichage de la **distance route** et validation bloquante si non calculée.
  - V3: suppression du fallback `estimateDistanceKm` pour l’estimation finale; blocage si distance route non prête.
  - Back Office payload: envoi `originCountryCode` + `destCountryCode` quand disponible.
- **Fichiers modifiés**:
  - `hooks/useTunnelState.ts`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `components/tunnel/Step2ProjectComplete.tsx`
  - `app/devis-gratuits-v3/page.tsx`
  - `lib/api/client.ts`

### 2026-01-28 — Indicateur discret “validé” (coords OK) sur les inputs Ville/Adresse

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: afficher un indicateur discret à droite des inputs quand les coordonnées (lat/lon) sont présentes, pour confirmer que l’info est exploitable.
- **Implémentation**:
  - `AddressAutocomplete`: option `validated` + fallback interne (dernière sélection) pour afficher un check “Coordonnées OK”.
  - Ajout `invalidated` pour afficher un indicateur **rouge** quand l’utilisateur tente de continuer mais que l’input n’est pas exploitable (coords manquantes).
  - `StepQualificationV2` (villes) + `StepAccessLogisticsV2` (adresses): passent `validated` basé sur `originLat/Lon` et `destinationLat/Lon`.
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Libellé estimation: “Pour” + affichage Volume + Distance route

- **Décision**: remplacer “Volume estimé” par “Pour” et afficher `"{volume} m³ - {distance} km"` (distance route, arrondie) sur l’écran d’estimation.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Affichage des fourchettes: min / montant calculé / max + arrondi à la centaine supérieure

- **Décision**: pour toutes les fourchettes, afficher en 1 ligne:
  - **min** + montant min (petit, vert sombre)
  - **montant calculé** (gras, valeur à retenir)
  - **max** + montant max (petit, rouge sombre)
- **Règle**: tous les montants sont **arrondis à la centaine supérieure**.
- **Implémentation**: composant `PriceRangeInline` réutilisé sur les écrans concernés (estimation, formules, ribbon, photos).
- **Ajustement UI**: resserrage des espacements + montant central (“à retenir”) légèrement plus grand.
- **Fichiers modifiés/ajoutés**:
  - `components/tunnel/PriceRangeInline.tsx` (nouveau)
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `components/tunnel/Step3VolumeServices.tsx`
  - `components/tunnel/PricingRibbon.tsx`
  - `components/tunnel/v2/StepContactPhotosV2.tsx`

### 2026-01-28 — Recherche “Ville” : résultats ville (pas rues) + Europe via Nominatim

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: l’input “Ville” doit retourner des **villes**, pas des rues. On priorise la France mais on supporte aussi l’Europe.
- **Changements**:
  - `AddressAutocomplete` ajoute `kind="city"`:
    - BAN: ajoute `type=municipality` pour éviter les rues.
    - Nominatim: ajoute `featuretype=city` pour éviter les rues + formatage label.
    - Mode `auto` (city): fusion BAN + Nominatim + tri (match exact / prefix) pour éviter que des villes FR proches (ex: **Berling**) masquent la ville recherchée (ex: **Berlin**).
  - `StepQualificationV2`: les champs `Ville de départ` / `Ville d’arrivée` utilisent `kind="city"`.
  - **Coords**: la sélection d’une ville renseigne aussi `originLat/Lon` et `destinationLat/Lon` pour permettre le calcul de **distance route** dès l’écran estimation.
- **Affichage**:
  - FR: `Ville (CP)`
  - Hors FR: `Ville (CP si dispo) — Pays`
- **Scope**:
  - Recherche “Ville” côté Nominatim limitée à l’**Europe** par défaut (évite de proposer des villes homonymes hors Europe).
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `app/api/geocode/route.ts` (proxy Nominatim côté serveur pour éviter CORS/UA)

### 2026-01-26 — Titre punchy "Vos photos = meilleur prix garanti" (V2)

- **Date**: 2026-01-26
- **Auteur**: (copywriting conversion)
- **Décision**: remplacer le titre générique "Ajoutez vos photos" par un titre bénéfice-centré ultra-punchy dans l'esprit Moverz.
- **Changements UI**:
  - **Titre H1** : "Ajoutez vos photos" → **"Vos photos = meilleur prix garanti"**
  - **Sous-titre** : "3-8 photos par pièce • angles larges • bonne lumière" → **"60-170€ économisés en 2 min chrono"**
  - Desktop et mobile
- **Objectif**:
  - Maximiser la conversion upload photos
  - Bénéfice immédiat et chiffré
  - Ton direct et impactant (esprit Moverz)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: copywriting uniquement (titre + sous-titre)
- **Back Office payload**:
  - changements: **AUCUN**
- **Copywriting rationale**:
  - Équation visuelle simple : "Vos photos = meilleur prix"
  - Bénéfice chiffré : "60-170€ économisés"
  - Friction minimisée : "en 2 min chrono"
  - "Garanti" = confiance et engagement
- **Risques / points à vérifier sur staging**:
  - Vérifier la longueur du titre sur mobile (pas de wrap bizarre)
  - Vérifier que le ton reste cohérent avec le reste du tunnel

### 2026-01-26 — Précision copy "avec photos" sur carte économies (V2)

- **Date**: 2026-01-26
- **Auteur**: (copywriting)
- **Décision**: préciser que les économies sont obtenues "avec photos" pour clarifier le bénéfice.
- **Changements UI**:
  - Texte carte 1 : "économisés en moyenne" → "économisés en moyenne **avec photos**"
  - Desktop et mobile
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: copywriting uniquement
- **Back Office payload**:
  - changements: **AUCUN**

### 2026-01-26 — Style sobre et premium pour grid incentives (V2)

- **Date**: 2026-01-26
- **Auteur**: (UX refinement)
- **Décision**: rendre le grid des 3 cartes incentives plus sobre, cohérent et premium pour mieux s'aligner avec le reste du tunnel.
- **Changements UI**:
  - **Cartes incentives** : 
    - Toutes les bordures **uniformisées en gris clair** (`border` au lieu de `border-2 border-[#6BCFCF]`)
    - Toutes les icônes en **turquoise #6BCFCF** (au lieu de vert/orange différenciés)
    - Fonds d'icônes uniformisés : `bg-[#6BCFCF]/10` pour toutes
    - Icônes plus petites et discrètes : `w-10 h-10` au lieu de `w-12 h-12`
    - Typographie plus sobre : `font-bold` au lieu de `font-black`, `text-2xl/3xl` au lieu de `3xl/4xl`
    - Labels plus discrets : `text-[#1E293B]/60` au lieu de `/70`
  - **Dropzone (upload desktop)** :
    - Bordure **solide** au lieu de pointillés (`border-[#E3E5E8]` au lieu de `border-dashed`)
    - Border radius réduit : `rounded-2xl` au lieu de `rounded-3xl`
    - Hover effect plus subtil : fond turquoise très léger (`bg-[#F0FAFA]/30`)
    - Suppression de l'effet `scale-[1.01]` lors du drag
    - Icône uniformisée : `bg-[#6BCFCF]/10` avec `text-[#6BCFCF]`
    - Lien "choisissez des fichiers" en turquoise cohérent
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: style visuel uniquement (design plus sobre et cohérent)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que le nouveau style est cohérent avec le reste du tunnel
  - Vérifier la lisibilité sur desktop et mobile
  - Vérifier que les bordures grises se distinguent bien du fond
  - Vérifier le hover effect de la dropzone

### 2026-01-26 — Fix couleur boutons Non/Oui dans StepAccessLogisticsV2

- **Date**: 2026-01-26
- **Auteur**: (UX fix)
- **Décision**: corriger les boutons Non/Oui pour qu'ils aient la couleur turquoise (#6BCFCF) quand sélectionnés, au lieu de rester gris.
- **Changements UI**:
  - Boutons "Oui, accès simple" / "Non, accès contraint" : couleur #6BCFCF (au lieu de #0F172A noir)
  - Boutons "Non" / "Oui" dans les sous-questions d'accès : couleur #6BCFCF quand sélectionnés
  - Boutons "Non" / "Oui" dans les services en plus : couleur #6BCFCF quand sélectionnés
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: style visuel uniquement (couleur des boutons actifs)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que les boutons ont bien la couleur turquoise quand on clique dessus
  - Vérifier la lisibilité du texte blanc sur fond turquoise

### 2026-01-26 — Application des améliorations UX sur tunnel V2 (NEXT_PUBLIC_FUNNEL_V2=true)

- **Date**: 2026-01-26
- **Auteur**: (UX consistency)
- **Décision**: appliquer les mêmes améliorations UX que sur le tunnel principal aux composants V2 pour assurer une expérience cohérente quelle que soit la version active.
- **Changements UI**:
  - **StepAccessLogisticsV2**: Champ téléphone **visible par défaut** (suppression du toggle "+ Ajouter téléphone")
  - **StepAccessLogisticsV2**: Accès déjà initialisé à **"simple" par défaut** dans `useTunnelState` (pas de changement code, déjà présent)
  - **StepContactPhotosV2 (Desktop)**: Grid de 3 cartes incentives avec stats impactantes :
    1. 💰 "60-170€ économisés en moyenne" (ou montant dynamique) - bordure turquoise
    2. 👥 "+50% de taux de réponse avec photos" - bordure grise
    3. ⚡ "2x plus de devis reçus sous 48-72h" - bordure grise
  - **StepContactPhotosV2 (Desktop)**: Ordre CTA **inversé** :
    - **EN PREMIER**: Drag & drop upload (depuis cet ordinateur)
    - **EN SECOND**: WhatsApp CTA (variant="secondary")
    - Séparateur "ou" entre les deux
  - **StepContactPhotosV2 (Mobile)**: Grid incentives en version verticale (stack 3 cartes) + WhatsApp reste principal
- **Tracking**:
  - Aucun impact (mêmes events GA4)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: présentation visuelle uniquement (champ téléphone toujours visible, grid incentives, ordre CTAs)
- **Back Office payload**:
  - changements: **AUCUN**
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx` (téléphone visible)
  - `components/tunnel/v2/StepContactPhotosV2.tsx` (grid incentives + ordre CTA)
  - Imports ajoutés: `TrendingUp`, `Users`, `Zap` from lucide-react
- **Risques / points à vérifier sur staging**:
  - Vérifier avec `NEXT_PUBLIC_FUNNEL_V2=true` sur CapRover
  - Vérifier l'affichage du grid 3 colonnes desktop / stack vertical mobile
  - Vérifier ordre CTA desktop (drag&drop puis WhatsApp)
  - Vérifier que le champ téléphone est bien visible d'office
  - Vérifier les montants dynamiques dans le grid si estimate disponible
  - Vérifier que WhatsApp reste principal sur mobile

### 2026-01-26 — Hotfix validation téléphone (Step 1)

- **Date**: 2026-01-26
- **Auteur**: (hotfix)
- **Décision**: corriger un bug de validation sur le champ téléphone qui empêchait la soumission du formulaire Step 1 quand `phone` était `undefined` au lieu d'une string vide.
- **Changements UI**:
  - Aucun changement visuel
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: logique de validation du champ `phone` (gestion `undefined`)
- **Back Office payload**:
  - changements: **AUCUN**
- **Bug corrigé**:
  - Validation `isPhoneValid` plantait si `phone` était `undefined`
  - Ajout de checks `!phone ||` avant `phone.trim()` et dans les conditions d'affichage d'erreur
- **Risques / points à vérifier sur staging**:
  - Vérifier que le formulaire Step 1 se soumet correctement avec ou sans téléphone
  - Vérifier que la validation du téléphone fonctionne si on en saisit un

### 2026-01-26 — Incentives clairs pour upload photos (Step 4)

- **Date**: 2026-01-26
- **Auteur**: (conversion optimisation)
- **Décision**: remplacer la section "économies" simple par un grid de 3 bénéfices visuels ultra-clairs pour maximiser la conversion sur l'upload de photos.
- **Changements UI**:
  - **Grid de 3 cartes** avec stats impactantes :
    1. 💰 "60-170€ économisés en moyenne" (ou montant dynamique si estimate disponible) - bordure turquoise
    2. 👥 "+50% de taux de réponse avec photos" - bordure grise
    3. ⚡ "2x plus de devis reçus sous 48-72h" - bordure grise
  - Icons colorés (TrendingUp, Users, Zap)
  - Chiffres gros et visibles (3xl/4xl font-black)
  - Responsive : grid 3 colonnes desktop, stack vertical mobile
  - Ancienne section "économies seule" désactivée (remplacée par le grid)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: présentation visuelle des bénéfices uniquement
- **Back Office payload**:
  - changements: **AUCUN**
- **Copywriting**:
  - "économisés en moyenne" (au lieu de "en envoyant vos photos maintenant")
  - "+50% de taux de réponse avec photos" (preuve sociale)
  - "2x plus de devis reçus sous 48-72h" (urgence + quantité)
- **Risques / points à vérifier sur staging**:
  - Vérifier l'affichage des 3 cartes sur desktop (grid 3 colonnes)
  - Vérifier le stack vertical sur mobile
  - Vérifier que les montants dynamiques s'affichent correctement quand estimate disponible
  - Vérifier la hiérarchie visuelle : la carte "économies" doit se démarquer (bordure turquoise)

### 2026-01-26 — Inversion drag & drop / WhatsApp (Step 4 - Desktop)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: sur desktop, afficher d'abord l'option "Glissez-déposez vos photos ici" (upload direct) en style primaire, puis WhatsApp en style secondaire. Sur mobile, WhatsApp reste en premier (car c'est l'option principale).
- **Changements UI**:
  - **Desktop** : 
    1. Bouton "Glissez-déposez vos photos ici" en premier (style dark primaire)
    2. Séparateur "ou"
    3. Bouton WhatsApp en second (style blanc secondaire)
  - **Mobile** : WhatsApp reste en premier (style vert primaire) - pas de changement
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: ordre d'affichage des CTA sur desktop uniquement
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier l'ordre des boutons sur desktop (drag & drop → WhatsApp)
  - Vérifier que sur mobile, WhatsApp reste en premier
  - Vérifier que les deux options fonctionnent correctement

### 2026-01-26 — Champ téléphone affiché par défaut (Step 1)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: retirer le bouton "+ Ajouter un téléphone (optionnel)" et afficher directement le champ téléphone dans Step1Contact. Le champ reste optionnel mais est toujours visible.
- **Changements UI**:
  - Champ téléphone toujours visible dans le formulaire de contact (Step 1)
  - Label "Téléphone (optionnel)" pour clarifier que ce n'est pas obligatoire
  - Validation : si rempli, doit contenir au moins 10 chiffres (optionnel sinon)
  - Icône téléphone + feedback visuel (check/croix) comme pour les autres champs
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN** (le champ phone existait déjà dans le state)
  - ajoutés: **AUCUN** (simplement rendu visible par défaut)
  - modifiés: champ `phone` maintenant toujours affiché (pas de toggle)
- **Back Office payload**:
  - changements: **AUCUN** (le champ phone était déjà envoyé au BO)
- **Risques / points à vérifier sur staging**:
  - Vérifier que le champ téléphone s'affiche correctement sur mobile et desktop
  - Vérifier que la validation fonctionne (optionnel, mais si rempli => au moins 10 chiffres)
  - Vérifier que le formulaire se soumet correctement avec ou sans téléphone

### 2026-01-26 — Force accès "Facile" par défaut (UX)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: s'assurer que les champs d'accès (originAccess, destinationAccess) sont toujours initialisés à "easy" (= Facile), même si une ancienne session localStorage les avait laissés vides.
- **Changements UI**:
  - Par défaut, les boutons "Facile" sont maintenant toujours pré-sélectionnés et colorés (#6BCFCF)
  - Les deux boutons (Facile / Contraint) ont la même couleur turquoise quand sélectionnés (déjà le cas)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: valeur par défaut forcée pour `originAccess` et `destinationAccess` à "easy" (rétrocompatibilité localStorage)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier qu'au premier chargement du tunnel, "Facile" est bien pré-sélectionné pour départ ET arrivée
  - Vérifier que les anciennes sessions localStorage avec accès vides sont bien complétées avec "easy"

### 2026-01-26 — Ajustement ratio m3/m2 (0.3 → 0.4)

- **Date**: 2026-01-26
- **Auteur**: (ajustement métier)
- **Décision**: modifier le ratio m3/m2 de 0.3 à 0.4 pour les types de logements concernés (studio, T4, T5, maisons) afin d'améliorer la précision du calcul de volume.
- **Changements UI**:
  - Aucun changement UI visible
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN** (seul le calcul interne de volume change)
- **Formules métier**:
  - `TYPE_COEFFICIENTS` dans `lib/pricing/constants.ts` : ratio m3/m2 passé de 0.3 à 0.4 pour studio, t4, t5, house, house_1floor, house_2floors, house_3floors
  - Les coefficients T1/T2/T3 restent à 0.35
- **Risques / points à vérifier sur staging**:
  - Vérifier que les estimations de volume sont cohérentes avec la réalité terrain
  - Vérifier que les prix estimés restent compétitifs

### 2026-01-21 — Retrait badge "TEST" (staging)

- **Date**: 2026-01-21
- **Auteur**: (cleanup)
- **Décision**: retirer le badge “TEST” ajouté sur Step 1.
- **Changements UI**:
  - Suppression du badge **TEST** sur Step 1
- **Tracking**:
  - Aucun
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**

### 2026-01-21 — Fix build staging (trackError: screenId requis)

- **Date**: 2026-01-21
- **Auteur**: (fix)
- **Décision**: suite au changement de signature `trackError`, ajouter `screenId` sur tous les appels pour éviter un build Next cassé.
- **Changements UI**:
  - Aucun
- **Tracking**:
  - `TUNNEL_ERROR` inclut désormais `screenId` explicite dans les appels (ex: `contact_v3`, `project_v3`, `formules_v3`)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**

### 2026-01-21 — Badge “TEST” visible sur Step 1 (staging uniquement)

- **Date**: 2026-01-21
- **Auteur**: (setup)
- **Décision**: afficher un marqueur “TEST” très visible sur la Step 1 pour éviter toute confusion avec la prod.
- **Changements UI**:
  - Ajout d’un badge **TEST** sur Step 1
  - Affiché uniquement si hostname = `staging-v4-tunnel.gslv.cloud`
- **Tracking**:
  - Aucun
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Visibilité mobile (CTA toujours visible)

### 2026-01-21 — Guardrails + tracking ré-ordonnable

- **Date**: 2026-01-21
- **Auteur**: (setup initial)
- **Décision**: sécuriser V4 staging avec garde-fous automatiques et rendre le tracking indépendant de l’index d’étape.
- **Changements UI**:
  - Aucun changement UI (infrastructure de garde-fous uniquement)
- **Tracking**:
  - `screenId` n’est plus dérivé d’un index dans `useTunnelTracking` (on passe un `screenId` explicite)
  - mapping recommandé: `logicalStep` stable + `screenId` explicite par écran
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés (UX only): **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que les events `TUNNEL_STEP_CHANGED` et `TUNNEL_ERROR` ont un `screenId` explicite
  - Vérifier que la CI bloque bien toute modif Prisma + exige `migration_v4.md`

### Entrée template (à copier)

- **Date**: YYYY-MM-DD
- **Auteur**: (nom)
- **Décision** (si applicable): (ce qui a été décidé + pourquoi, 1–3 lignes)
- **Changements UI**:
  - (liste concise)
- **Tracking**:
  - logicalStep impactés: (CONTACT/PROJECT/RECAP/THANK_YOU/…)
  - screenId impactés: (ex: `project_v4`)
  - notes: (ex: ré-ordonnancement steps, mapping conservé)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: (si oui => marqués “non connectés” + justification)
  - modifiés (UX only): (si oui)
- **Back Office payload**:
  - changements: **AUCUN** (sauf mention explicite)
- **Risques / points à vérifier sur staging**:
  - (liste)

---

## 2) Checklist obligatoire avant “OK pour review”

- [ ] Aucun fichier Prisma modifié (`prisma/schema.prisma`, `prisma/migrations/**`)
- [ ] Aucun champ existant supprimé (FormState + UI)
- [ ] Tracking: `logicalStep` stable, `screenId` explicite (jamais dérivé d’un index)
- [ ] Mobile-first validé (iPhone/Android: lisibilité, CTA, scroll, clavier)
- [ ] Tests uniquement sur staging (URL staging + vraie navigation)

