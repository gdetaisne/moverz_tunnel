# Moverz — Règles métier & formules (doc pour RAG / embeddings)

Objectif: fournir au bot Moverz une **référence unique** des règles métier et formules présentes dans le code (tunnel).

Dernière mise à jour: 2026-01-19  
Portée: tunnel Next.js (analyse IA photos + estimation pricing).

### Changelog (pricing)

- **2026-01-19 — Ajustement estimation pricing (distance + volume)**
  - **Pourquoi**: la formule précédente sur-estimait fréquemment le prix dès que la distance dépassait 100 km (saut de 40 → 95 €/m³), ce qui créait un “prix choc” et un risque de drop-off au moment de l’affichage des formules.
  - **Ce qui change**:
    - tranches distance plus fines (7 bands au lieu de 3),
    - ajout d’une économie d’échelle volumique \(f(V)\) appliquée au coût volumique (sans toucher au socle).
  - **Sources de calibration** (bench public + extraction HTML):
    - [AlloDemenageur — Petit déménagement : prix et solutions économiques en 2026](https://www.allodemenageur.fr/devis-demenagement/petit-demenagement/)
    - [Demenagement24 — Prix déménagement](https://www.demenagement24.com/demenagement-prix/)
    - [Nextories — Déménagement Paris Munich](https://www.nextories.com/le-demenagement-international/demenagement-france-allemagne/demenagement-paris-munich)

## Sources (code)

- Inventaire & règles: `lib/inventory/businessRules.ts`
- Table de volumes standard: `app/ai-lab/standardVolumes.ts`
- Calcul résumé IA (volume total, cartons, valorisation): `lib/api/client.ts`
- Affichage “upload photos” (arrondi cartons): `app/upload-photos/page.tsx`
- Pricing: `lib/pricing/constants.ts`, `lib/pricing/calculate.ts`
- Miroir/détails pricing côté UI: `app/devis-gratuits-v3/page.tsx`
- Doc produit (résumé): `docs/tunnel/UPLOAD_PHOTOS_ANALYSIS.md`, `Contexte de lancement/04-DECISIONS.md`

---

## 1) Pipeline “Analyse IA photos” → résumé

### 1.1 Données d’entrée (résultat IA)

Chaque pièce (room) contient une liste d’items (objets) avec typiquement:

- `label`: libellé (ex: "Canapé 3 places")
- `category`: catégorie (ex: "CANAPE", "ARMOIRE", "LIT", etc.)
- `quantity`: quantité
- mesures optionnelles: `widthCm`, `depthCm`, `heightCm`
- `volumeM3` (IA): volume **par unité** (quand fourni)
- `valueEstimateEur` (IA): estimation de valeur (quand fourni)

### 1.2 Étapes de calcul (ordre réel)

1) **Normalisation** des items (mapping IA → champs pivot)  
2) **Règles métier** (dérivés lit, contenu armoire)  
3) **Règles d’emballage** (coefficients de sur-volume)  
4) **Résumé**:
   - volume total emballé (m³)
   - cartons (objets divers + contenu rangements)
   - valorisation assurance (EUR)

---

## 2) Table de volumes standard (m³)

### 2.1 Principe

`getStandardVolumeForLabel(label)`:

- Normalise les libellés (minuscules, suppression accents, non-alphanum → espaces)
- Fait un matching flou très simple: `normalized.includes(keyNorm) || keyNorm.includes(normalized)`

### 2.2 Entrées (V1)

Liste issue de `app/ai-lab/standardVolumes.ts` (clé normalisée → volume en m³).

#### Chambres

- lit une place complet: 1
- lit 1 place complet: 1
- lit 2 places complet 140: 1.5
- lit 2 places complet 160: 1.8
- lit 2 places complet 180: 2
- lit 2 places complet 180 ou: 2
- lit double: 1.8
- sommier seul: 0.5
- matelas seul: 0.5
- parure de lit: 0.15
- table de chevet: 0.25
- clic clac: 1.4
- commode 3 tiroirs: 0.5
- commode 4 tiroirs: 0.6
- commode 5 tiroirs: 0.7
- armoire 1 porte type ikea: 1
- armoire 1 porte type normande: 1.5
- armoire 2 portes type ikea: 1.5
- armoire 2 portes coulissantes: 2
- armoire 3 portes coulissantes: 3
- armoire 3 portes: 2
- armoire 4 portes coulissantes: 4
- armoire 4 portes: 3
- meuble tv petit: 0.5
- meuble tv petit / bas: 0.5
- meuble tv complet: 1
- meuble tv grand/complet: 1
- bureau petit: 0.5
- bureau grand: 1
- fauteuil bureau: 0.35
- fauteuil relax: 1
- televiseur: 0.25
- miroir psychée: 0.25

#### Salon / salle à manger / entrée

- canape 2 pl: 2
- canape 2 places: 2
- canape 3 pl: 2.5
- canape 3 places: 2.5
- canape d angle: 2.5
- clic clac - bz: 1.35
- fauteuil: 1
- meuble living: 2.5
- buffet bas 2 portes: 0.6
- buffet bas 3 portes: 1.2
- buffet bas 4 portes: 1.75
- buffet 2 portes bas + haut: 1.5
- buffet 3 portes bas + haut: 2
- buffet 4 portes bas + haut: 2
- vitrine - une porte: 1
- vitrine - deux portes: 1.5
- bibliotheque ouverte 40cm: 0.5
- bibliotheque ouverte 80cm: 1
- bibliotheque 4 portes: 1.5
- table a manger 8 pers: 1.5
- table a manger 6 pers: 1
- table a manger 4 pers: 0.5
- table basse: 0.5
- chaise pliante: 0.1
- chaise: 0.25
- tabouret: 0.1
- gueridon: 0.25
- etagere colonne 80cm: 1
- etagere colonne 40cm: 0.5
- commode 3 tiroirs salon: 0.5
- commode 4 tiroirs salon: 0.6
- commode 5 tiroirs salon: 0.7
- horloge comtoise: 0.3
- meuble chaussures: 0.5
- tv plasma: 0.25
- tapis: 0.1
- lampadaire: 0.2

---

## 3) Règles métier inventaire (V1)

### 3.1 Lit → composants dérivés

Détection:

- catégorie `"LIT"` **ou** libellé contient `"lit "` (en minuscules)

Création de 3 items dérivés (mêmes `roomId`, quantité héritée):

1) **Matelas (dérivé lit)**
   - dimensions: largeur = lit, profondeur = lit, hauteur = **30 cm**
   - volume standard: via table (`"Matelas seul"`)
2) **Sommier (dérivé lit)**
   - dimensions: largeur = `bedWidth / 5`, profondeur = lit, hauteur = lit
   - volume standard: via table (`"Sommier seul"`)
3) **Parure (dérivé lit)**
   - volume standard uniquement: table (`"Parure de lit(couette + coussins)"`)

Calcul volume par dérivé (par unité):

- Si mesures disponibles: \(V_{ai} = (w \times d \times h)/1\,000\,000\) (cm³ → m³)
- \(V_{base} = V_{ai}\) si dispo, sinon \(V_{std}\)
- \(V_{final\_unitaire} = \max(V_{base}, V_{std})\)
- \(V_{final} = V_{final\_unitaire} \times quantité\)

### 3.2 Armoire → “contenu invisible” (selon pièce)

Détection: catégorie `"ARMOIRE"`.

Si la pièce est:

- **CHAMBRE**: contenu vêtements, facteur **0.75**
- **SALON**: contenu fragile, facteur **1.25**

Le volume “contenu” est dérivé du volume du meuble (par unité), multiplié par `quantity`:

- \(V_{contenu} = V_{meuble} \times facteur \times quantité\)

Un item dérivé est créé:

- `derivedKind = "armoire_contenu"`
- `label`: `"Contenu armoire (vêtements)"` ou `"Contenu armoire/buffet (fragile)"`

---

## 4) Règles d’emballage (V1)

Objectif: estimer le sur-volume lié à l’emballage/protection.

### 4.1 Définitions

- `volumeM3Nu`: volume “nu” (avant emballage)
- `volumeM3Emballé`: volume après application du facteur
- `volumeM3Final`: mis à jour avec le volume emballé

Arrondis:

- `volumeM3Nu` est arrondi à **2 décimales**
- `volumeM3Emballé` est arrondi à **2 décimales**

### 4.2 Décision du facteur (ordre appliqué)

Le premier match “gagne”.

1) **Objet très fragile** → facteur **1.5**
   - cat `"TV"` OU mots-clés (tv, écran/ecran, screen, moniteur/monitor, miroir, marbre, oeuvre/œuvre, tableau, toile)
   - ou flags `fragile && highValue`
2) **Gros électroménager** → facteur **1.3**
   - cat `"ELECTROMENAGER"` OU mots-clés (lave-linge, lave-vaisselle, sèche-linge, frigo, réfrigérateur, congélateur, four)
3) **Canapés** → facteur **1.25** ou **1.35**
   - cat `"CANAPE"` ou libellé contient canapé/canape
   - “angle/XXL” si libellé contient angle / d’angle / d'angle / xxl → **1.35**, sinon **1.25**
4) **Matelas / sommiers** → facteur **1.1**
   - `derivedKind` matelas/sommier OU libellé contient matelas/sommier
5) **Meubles démontables** → facteur **1.2**
   - flag `requiresDisassembly` OU mots-clés ikea/pax/billy/kallax/bestå/besta
6) **Meubles fragiles / laqués / vitrines** → facteur **1.25**
   - flag `fragile` OU matériau contient “verre” OU mots-clés (vitrine, verre, laqué/laquee/laque, glace)
7) **Objets irréguliers** → facteur **1.4**
   - mots-clés (plante(s), lampe sur pied, lampe, suspension, lustre, sculpture)
   - seulement si \(V_{nu} > 0.03\) m³
8) **Meubles standards** → facteur **1.15**
   - catégories préfixées par: TABLE, CHAISE, ARMOIRE, BIBLIOTHEQUE, RANGEMENT, MEUBLE, COMMODE

---

## 5) Calcul du résumé (volume total, cartons, assurance)

Implémentation: `lib/api/client.ts` (résumé par pièce puis total).

### 5.1 Seuils & constantes

- Seuil “petit objet”: **0.15 m³** (volume emballé par item, V2/V1)
- Volume standard d’un carton: **0.08 m³ / carton**
- Les volumes de pièces et le volume total sont arrondis à **1 décimale**

### 5.2 Séparation “gros” vs “petits”

Un item racine est “toujours gros” si sa `category` est l’une de:

`LIT`, `ARMOIRE`, `ARMOIRE-PENDERIE`, `CANAPE/CANAPÉ`, `BUFFET`, `BIBLIOTHEQUE/BIBLIOTHÈQUE`, `TABLE`, `ELECTROMENAGER/ÉLECTROMÉNAGER`, `GROS_ELECTROMENAGER`, `CARTON`.

Sinon, il est “petit” si \(V_{emballé} \in (0, 0.15)\).

### 5.3 Règles spéciales de volume (alignées V2)

Pour chaque **item racine** “gros”, on récupère ses dérivés (items avec `parentId = item.id`).

- **LIT**: volume = **somme des volumes emballés des dérivés** (matelas/sommier/parure).  
  (Le volume du lit “parent” n’est pas ajouté pour éviter le double-compte.)

- **ARMOIRE**: volume = volume parent (emballé) + **somme des volumes emballés des dérivés** (dont `armoire_contenu`).  
  (Affichage possible "Armoire (avec contenu)".)

Les autres catégories: volume = volume parent (emballé) * quantité (pas de règle spéciale).

### 5.4 Cartons “objets divers”

On somme le volume **nu** des items “petits” (en tenant compte de la quantité):

- \(V_{petits,nu} = \sum (V_{nu} \times q)\)
- \(nb_{cartons} = \max(1, \lceil V_{petits,nu} / 0.08 \rceil)\)
- On ajoute au volume de la pièce: \(V_{cartons} = nb_{cartons} \times 0.08\)

Une ligne synthèse est ajoutée côté affichage:

- `"Cartons (objets divers)"`, `quantity = nb_{cartons}`, `volumeM3 = V_{cartons}`

### 5.5 Cartons “contenu rangements” (compteur uniquement)

On somme le volume **nu** des dérivés `armoire_contenu` (avec quantité):

- \(V_{rangements,nu} = \sum (V_{nu} \times q)\)
- \(nb_{cartons\_rangements} = \max(1, \lceil V_{rangements,nu} / 0.08 \rceil)\)

Ce nombre:

- **incrémente le compteur** cartons de la pièce et le total,
- mais **n’ajoute pas de volume** (le volume du contenu est déjà inclus via la règle armoire).

### 5.6 Valorisation assurance

Somme des valeurs IA des items **racine** uniquement (pas les dérivés) :

- \(assurance = \sum (valueEstimateEur \times quantité)\) sur items sans `parentId`
- Si aucune valeur: on renvoie `null` / affichage `—`

### 5.7 Affichage “cartons” (UI)

Sur la page upload photos, l’affichage est arrondi à la dizaine supérieure:

- \(cartons\_affichés = \lceil cartonsTotalCount / 10 \rceil \times 10\)

---

## 6) Pricing (estimation de prix)

### 6.1 Volume estimé à partir de la surface (m² → m³)

Formule:

- \(V = round1(surface \times coefLogement \times coefDensité)\)

`coefLogement` (TYPE_COEFFICIENTS):

- studio: 0.3
- t1/t2/t3: 0.35
- t4/t5/house + variantes maison: 0.3

`coefDensité` (DENSITY_COEFFICIENTS):

- light: 0.9
- normal: 1.0
- dense: 1.1

### 6.2 Tranches distance & tarifs €/m³ (référence “La Poste”)

DistanceBand:

- lt_100 si distance < 100 km
- d100_369 si 100–369 km
- d370_499 si 370–499 km
- d500_699 si 500–699 km
- d700_849 si 700–849 km
- d850_999 si 850–999 km
- gte_1000 si ≥ 1000 km

Tarifs (LA_POSTE_RATES_EUR_PER_M3) — grille actuelle:

- lt_100: ECO 35, STANDARD 40, PREMIUM 65
- d100_369: ECO 60, STANDARD 75, PREMIUM 110
- d370_499: ECO 65, STANDARD 85, PREMIUM 120
- d500_699: ECO 75, STANDARD 95, PREMIUM 130
- d700_849: ECO 85, STANDARD 105, PREMIUM 140
- d850_999: ECO 95, STANDARD 125, PREMIUM 155
- gte_1000: ECO 105, STANDARD 145, PREMIUM 170

### 6.3 Prix de base + saison

- Économie d’échelle volume:
  - \(f(V) = \mathrm{clamp}((V/10)^{-0.15}, 0.75, 1.05)\)
  - appliqué sur la composante volumique uniquement.
- \(prixBase = \max(V \times rate \times f(V), PRIX\_MIN\_SOCLE)\)
- `PRIX_MIN_SOCLE = 400`
- \(prixBaseSaison = prixBase \times seasonFactor\)

### 6.4 Coefficient d’accès (étages / ascenseur)

`getEtageCoefficient(floor, elevator)`:

- ascenseur `"yes"` → 1.0
- floor ≤ 0 → 1.0
- ascenseur `"no"` (sans ascenseur):
  - RDC → 1.0
  - 1er → 1.05 (+5%)
  - 2e → 1.10 (+10%)
  - 3e → 1.15 (+15%)
  - ≥4 → 1.15 (+15%) **+ monte-meuble requis** (voir `requiresMonteMeuble`)
- ascenseur `"partial"`: comportement conservateur (proche sans ascenseur, capé à 1.15)

On prend le pire des deux accès:

- \(coeffEtage = \max(coeffOrigin, coeffDest)\)

### 6.5 Services additionnels (forfaits)

`SERVICES_PRIX`:

- monteMeuble: 150
- pianoDroit: 200
- pianoQuart: 250
- debarras: 100

### 6.6 Prix final & fourchette

Note importante: `FORMULE_MULTIPLIERS` existe (ECO=0.75, STANDARD=1, PREMIUM=1.25) mais est **neutralisé à 1** dans `calculatePricing` car la formule est déjà intégrée au tarif €/m³.

Calcul:

- \(centreHorsSaison = prixBase \times coeffEtage + services\)
- \(centreSaison = prixBase \times seasonFactor \times coeffEtage + services\)
- `prixFinal = round(centreSaison)`
- `prixMin = round(centreHorsSaison × 0.8)` (−20%)
- `prixMax = round(centreSaison × 1.2)` (+20%)

---

## 7) Glossaire (termes)

- **Item racine**: objet sans `parentId` (ex: “Lit”, “Armoire”).
- **Item dérivé**: objet créé par règle métier (ex: matelas/sommier/parure/armoire_contenu).
- **Volume nu**: volume avant emballage.
- **Volume emballé**: volume après application d’un facteur d’emballage.
- **Cartons objets divers**: conversion des petits objets en équivalent cartons, ajoutés au volume total.
- **Cartons contenu rangements**: compteur cartons basé sur `armoire_contenu`, sans ajouter de volume.

