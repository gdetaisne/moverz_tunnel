## Contrat API – Tunnel ⇄ Back Office

Ce fichier décrit le **contrat HTTP** entre le tunnel Next.js et le Back Office (`Back_Office-1`), basé sur `backend/src/routes/publicLeads.routes.ts`.

### Base URL & principe général

- **Base URL**: `NEXT_PUBLIC_API_URL` (toujours égale à l’instance hébergée du Back Office, prod).
- **Routes publiques utilisées par le tunnel**:
  - `POST /public/leads`
  - `PATCH /public/leads/:id`
  - `POST /public/leads/:id/request-confirmation`
- **Règles**:
  - Aucun accès direct à la DB du Back Office.
  - Aucun autre endpoint ne doit être utilisé par le tunnel sans mise à jour de ce fichier.

---

### 1. Création de lead – `POST /public/leads`

- **URL**: `POST ${NEXT_PUBLIC_API_URL}/public/leads`
- **Objectif**: créer un lead minimal dès la fin de l’étape 1 (Contact).
- **Schéma Back Office (simplifié, d’après `createLeadSchema`)**:

Champs acceptés:
- **Requis**:
  - `firstName: string` (min 1)
  - `email: string` (email valide)
- **Optionnels**:
  - `lastName?: string` (default `""`)
  - `phone?: string`
  - `source?: string`
  - `estimationMethod?: 'AI_PHOTO' | 'FORM' | 'MANUAL_ADMIN'`
  - `status?: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'ABANDONED'` (default `NEW`)

**Décision tunnel**:
- Étape 1 envoie **un payload minimal**:
  - `firstName` = valeur de `contactName` (trim).
  - `email` = email normalisé en lowercase (trim).
  - `source` = valeur explicite de `src` (ou fallback `getSource(hostname)` si `src` absent).
  - `estimationMethod` = `'FORM'`.
  - (`status` laissé par défaut).

**Réponse attendue**:
- Format Back Office:
  - `{ success: true, data: { id: string, ... } }`
- Le client tunnel doit:
  - extraire l’`id` du lead,
  - le stocker dans `formState.leadId` (ou équivalent),
  - logguer les erreurs en cas d’échec avec le message renvoyé par le Back Office.

---

### 2. Mise à jour de lead – `PATCH /public/leads/:id`

- **URL**: `PATCH ${NEXT_PUBLIC_API_URL}/public/leads/:id`
- **Objectif**: enrichir progressivement le lead au fil des étapes 2, 3 (et future étape photos).
- **Schéma Back Office** (simplifié, d’après `updateLeadSchema`):

Catégories de champs (tous optionnels):
- **Contact**:
  - `firstName`, `lastName`, `email`, `phone`
- **Source & statut**:
  - `source`, `estimationMethod`, `status`
- **Adresses**:
  - `originAddress`, `originCity`, `originPostalCode`
  - `destAddress`, `destCity`, `destPostalCode`
  - `destCountryCode`
- **Dates**:
  - `movingDate: Date`, `movingDateEnd?: Date`, `dateFlexible?: boolean`
- **Volume & surface**:
  - `surfaceM2: number`, `estimatedVolume: number`, `density: string` (`LIGHT/MEDIUM/HEAVY`)
- **Formule & prix**:
  - `formule: string` (`ECONOMIQUE/STANDARD/PREMIUM`)
  - `estimatedPriceMin`, `estimatedPriceAvg`, `estimatedPriceMax`
- **Logement origine**:
  - `originHousingType`, `originFloor: number`
  - `originElevator: string` (`OUI/NON/PARTIEL`)
  - `originFurnitureLift: string`
  - `originCarryDistance: string`
  - `originParkingAuth: boolean`
- **Logement destination**:
  - `destHousingType`, `destFloor: number`
  - `destElevator: string` (`OUI/NON/PARTIEL`)
  - `destFurnitureLift: string`
  - `destCarryDistance: string`
  - `destParkingAuth: boolean`
- **Photos / IA (future étape)**:
  - `photosUrls?: string`
  - `aiEstimationConfidence?: number` (0–100)

**Règles de mapping côté tunnel** (à respecter dans le code):
- Les noms des champs **doivent suivre ceux du schéma Prisma/Back Office**:
  - `destinationAddress` (front) → `destAddress` (backend)
  - `destinationCity` → `destCity`
  - `destinationPostalCode` → `destPostalCode`
- Les valeurs catégorielles doivent être **mappées**:
  - `density` (front: `'light' | 'normal' | 'dense'`) → backend: `'LIGHT' | 'MEDIUM' | 'HEAVY'`.
  - `originElevator` / `destinationElevator` (front: `'none' | 'small' | 'medium' | 'large'`) → backend: `'OUI' | 'NON' | 'PARTIEL'`.
  - `formule` (front) = `'ECONOMIQUE' | 'STANDARD' | 'PREMIUM'` (identique backend).

**Comportement en cas d’erreur**:
- Si `404 Lead not found`: log clair + message utilisateur doux (“session expirée, merci de recommencer”), et **pas de retry infini**.
- Si `400 Validation error`: afficher un message générique + loguer les `details` pour debug (ne pas exposer les détails bruts à l’utilisateur final).

---

### 3. Demande d’email de confirmation – `POST /public/leads/:id/request-confirmation`

- **URL**: `POST ${NEXT_PUBLIC_API_URL}/public/leads/:id/request-confirmation`
- **Objectif**: déclencher l’envoi de l’email de confirmation au lead.
- **Payload**: `{}` (aucun champ requis; tout est dérivé côté Back Office à partir du Lead).

**Comportement attendu**:
- Backend:
  - vérifie que le lead existe et a un email,
  - génère un token signé,
  - envoie un email **LEAD_CONFIRMATION** (template dynamique ou fallback par défaut),
  - inclut un lien du type: `${API_PUBLIC_URL}/public/leads/confirm?token=...`.
- Tunnel:
  - appelle ce endpoint à la fin de l’étape 3 (avant l’écran de validation),
  - affiche un message expliquant:
    - qu’un email vient d’être envoyé,
    - que la demande ne sera traitée que si l’email est confirmé.
  - propose un mécanisme pour:
    - corriger l’email,
    - renvoyer une confirmation (updateLead + request-confirmation).

**Erreurs à gérer**:
- `404 Lead not found` → message utilisateur propre, proposition de recommencer.
- `400 Lead email is missing` → inviter l’utilisateur à vérifier/corriger son email dans le tunnel.
- Autres (5xx) → message générique (“problème temporaire”), log détaillé côté front.

---

### 4. Extension future – Photos / WhatsApp

Sans implémentation complète pour l’instant, ce contrat réserve:

- Champ `photosUrls: string` sur le lead:
  - contiendra plus tard, par exemple, une liste de URLs (stockage externe) ou un identifiant de conversation WhatsApp associée.
- Champ `aiEstimationConfidence: number`:
  - pourra être utilisé pour stocker un niveau de confiance si une IA estime un volume ou un inventaire à partir des photos.

**Règle**:
- Toute utilisation de ces champs devra passer par **`PATCH /public/leads/:id`**, et être documentée ici avant implémentation.


