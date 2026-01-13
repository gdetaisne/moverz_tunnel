## Journal des décisions clés

> Objectif: garder une trace **courte** des décisions structurantes (tech / produit) pour le tunnel.

Format recommandé:
- Date (YYYY-MM-DD)
- Décision (1 phrase)
- Détail (2–3 phrases max si nécessaire)

---

### 2025-12-03 – Architecture du tunnel

- **Décision**: le tunnel sera une **app Next.js/React dédiée** (`moverz_tunnel`) indépendante des sites villes.
- **Détail**: pas de monorepo ni de package partagé pour commencer; on accepte une duplication limitée. Le code des sites (ex. Marseille) sert de référence fonctionnelle, mais sera ré-implémenté proprement.

### 2025-12-03 – Intégration Back Office

- **Décision**: le tunnel communiquera **uniquement via les endpoints HTTP publics** du Back Office (`/public/leads`, `PATCH /public/leads/:id`, `POST /public/leads/:id/request-confirmation`).
- **Détail**: aucun accès direct à la DB; toute évolution de contrat doit passer par une mise à jour de `02-CONTRAT-API-BACKOFFICE.md`.

### 2025-12-03 – Source du lead

- **Décision**: la source principale sera un paramètre explicite `?src=...` transmis dans l’URL du tunnel, recopié dans `lead.source` côté Back Office.
- **Détail**: l’ancienne logique basée sur le domaine (`getSource(hostname)`) devient un **fallback** uniquement si `src` est absent.

### 2025-12-03 – Base URL API Back Office

- **Décision**: `NEXT_PUBLIC_API_URL` du tunnel pointera **toujours** vers l’instance Back Office hébergée (prod), y compris en développement tunnel.
- **Détail**: cela garantit que le comportement métier du tunnel en local est identique à celui en prod, en s’appuyant sur le même Back Office.

### 2025-12-03 – Design du tunnel (mobile first)

- **Décision**: tout le tunnel doit être conçu **mobile first** (UX pensée d’abord pour smartphone).
- **Détail**: les composants, layouts et interactions sont d’abord optimisés pour petits écrans; le desktop est géré ensuite par élargissement progressif (breakpoints) sans casser l’expérience mobile.

### 2025-12-03 – Recherche de best practices avant implémentation

- **Décision**: avant d’implémenter une nouvelle brique significative (pattern d’UI, gestion de formulaire, appel API, persistance, etc.), Cursor doit **chercher les best practices “state of the art”**.
- **Détail**: la recherche commence dans le code existant (sites villes + Back Office), puis au besoin dans la doc officielle / ressources modernes; le choix final doit s’aligner sur ces pratiques ou expliquer pourquoi on s’en écarte.

### 2025-12-03 – Étape 4 Photos & inventaire (Process 2 IA)

- **Décision**: l’étape 4 du tunnel est dédiée aux **photos & à l’inventaire automatisé** avec 3 parcours: upload immédiat, WhatsApp plus tard, ou pas d’inventaire.
- **Détail**: les photos sont **obligatoirement des images**, limited à ~25 Mo, normalisées en JPEG ~400×300 avant stockage local; l’IA “Process 2” fait une passe de classification par photo puis une passe d’inventaire par pièce via Claude. L’UI affiche les regroupements par pièce, un tableau synthétique “Pièce / Article / Qté” et un chrono (≈3 s/photo).

### 2025-12-03 – Persistance IA prudente (LeadRoom / LeadRoomItem)

- **Décision**: les modèles Prisma `LeadRoom`, `LeadRoomItem` et les champs de classification avancée sur `LeadPhoto` existent, mais leur écriture peut être **désactivée côté route IA** si le schéma DB réel diverge (prod) afin d’éviter des 500.
- **Détail**: dans ce mode, l’API IA renvoie quand même les résultats structurés au front (rooms + inventory), en ne persistant systématiquement que `LeadAnalysisRun` et le `photosStatus` du `LeadTunnel`. Cela garantit une UX stable même pendant les phases d’ajustement de schema/migrations.

### 2025-12-03 – Sauvegarde locale & navigation dans le stepper

- **Décision**: l’état du formulaire (`FormState`, `currentStep`, `leadId`, `maxReachedStep`) est **sauvegardé dans `localStorage`** sous la clé `moverz_tunnel_form_state`, et le stepper autorise le retour à toute étape déjà atteinte.
- **Détail**: cela répond à la contrainte “ne jamais perdre des données sans validation formelle” et permet à l’utilisateur de corriger librement les étapes précédentes (notamment Projet et Volume) sans recréer de lead.

### 2025-12-04 – Logique de pricing (volume, distance, saison)

- **Décision**: le calcul de prix du tunnel reste **inspiré de La Poste / grands déménageurs**, avec une base `max(volume, distance, socle)` et un coefficient de saison.
- **Détail**:
  - Volume estimé à partir de la surface et de la densité via `calculateVolume` (logique V2/V3): coefficient **par type de logement** (ex: `0,35` pour T1/T2/T3, `0,30` pour le reste) × coefficient **densité** (`0,9` / `1,0` / `1,1`), arrondi à 1 décimale.
  - Le prix de base n’additionne plus `volumeM3 * COEF_VOLUME` et `distanceKm * COEF_DISTANCE`, mais prend le **maximum** entre ces deux composantes et un socle mini (`PRIX_MIN_SOCLE`), pour éviter de sur‑facturer les cas extrêmes (petit volume très long trajet / gros volume très court trajet).
  - Un facteur de **saison** est appliqué sur ce prix de base : `~0,85` en basse saison (janv/févr/nov.), `1,3` en haute saison (été + décembre), `1,0` sinon, conformément aux hausses de 20–40 % observées chez les déménageurs.
  - Les multiplicateurs de formule (ÉCO / STANDARD / PREMIUM) restent ceux définis dans `FORMULE_MULTIPLIERS`, appliqués après la saison et le coefficient d’accès (étages/ascenseur).



