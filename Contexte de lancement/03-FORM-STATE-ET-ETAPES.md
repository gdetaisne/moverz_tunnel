## Form State & étapes du tunnel

Ce fichier décrit la **structure logique** du formulaire du tunnel et son découpage par étapes.  
Il ne fige pas tous les types TypeScript, mais sert de référence fonctionnelle.

---

### Vue d’ensemble du `FormState` tunnel

Regroupé par étapes (1→4) + future étape Photos.

#### Étape 1 – Contact

- `contactName: string`  
  - Nom/prénom ou pseudo que l’on utilisera dans les échanges.
- `email: string`  
  - Adresse email de contact (validation stricte, min format `x@y.tld`).
- `leadId: string | null`  
  - Renseigné **après** le `POST /public/leads`.
- `currentStep: number`  
  - Step courante (1 à 4).

#### Étape 2 – Projet (adresses, logement, date)

- Départ:
  - `originPostalCode: string` (5 chiffres)
  - `originCity: string`
  - `originAddress: string` (champ libre, facultatif)
  - `originHousingType: 'studio' | 't1' | 't2' | 't3' | 't4' | 't5' | 'house' | 'house_1floor' | 'house_2floors' | 'house_3floors'`
  - `originFloor: number`
  - `originElevator: 'none' | 'small' | 'medium' | 'large'`
  - `originFurnitureLift: 'unknown' | 'no' | 'yes'`
  - `originCarryDistance: bande de distance ('0-10', '10-20', …, '90-100')`
  - `originParkingAuth: boolean`

- Arrivée:
  - `destinationPostalCode: string`
  - `destinationCity: string`
  - `destinationAddress: string`
  - `destinationHousingType: mêmes valeurs que originHousingType`
  - `destinationFloor: number`
  - `destinationElevator: 'none' | 'small' | 'medium' | 'large'`
  - `destinationFurnitureLift: 'unknown' | 'no' | 'yes'`
  - `destinationCarryDistance: même ensemble que originCarryDistance`
  - `destinationParkingAuth: boolean`
  - `destinationUnknown: boolean` (cas futurs si l’adresse n’est pas encore connue)

- Date:
  - `movingDate: string` (ISO date `YYYY-MM-DD`)
  - `movingDateEnd: string` (ISO date pour la fin de plage, ou vide)
  - `dateFlexible: boolean`

Ces champs sont envoyés progressivement via `PATCH /public/leads/:id` (voir `02-CONTRAT-API-BACKOFFICE.md`).

#### Étape 3 – Volume & Formule (pricing)

- `housingType: même type que originHousingType`  
  - Sert de base au calcul de volume.
- `surfaceM2: number`  
  - Superficie; peut être pré-remplie depuis `originHousingType` puis modifiable.
- `density: 'light' | 'normal' | 'dense'`  
  - Sert à ajuster le volume (LIGHT/MEDIUM/HEAVY côté backend).
- `formule: 'ECONOMIQUE' | 'STANDARD' | 'PREMIUM'`

Champs dérivés (non forcément stockés tels quels dans le FormState, mais calculés côté front):
- `volumeM3: number` (résultat du calcul `surfaceM2 * ratio * densité`)
- `distanceKm: number` (distance estimée entre villes)
- `prixMin/prixAvg/prixMax: number` (par formule)

Les valeurs importantes remontées vers le Back Office:
- `surfaceM2`, `estimatedVolume`, `density` (mappé en LIGHT/MEDIUM/HEAVY),
- `formule`,
- `estimatedPriceMin/Avg/Max`.

#### Étape 4 – Validation email

- Réutilise surtout:
  - `email`,
  - `leadId`,
  - éventuellement un champ interne pour suivre l’état de la demande de confirmation (`confirmationRequested`, `lastConfirmationError`, etc. – interne UI, pas forcément envoyé).

Actions:
- `POST /public/leads/:id/request-confirmation`
- Éventuellement `PATCH /public/leads/:id` si l’email est corrigé avant renvoi.

---

### Étape future – Photos / WhatsApp (hook réservé)

Cette étape sera insérée **entre 3 et 4**.

Champs prévus côté FormState (sans figer l’implémentation):

- `photosChannel: 'WHATSAPP' | 'UPLOAD' | null`  
  - Mode choisi par l’utilisateur (simple pour commencer: uniquement `'WHATSAPP'`).
- `photosNote: string`  
  - Champ libre pour que le client précise ce qu’il envoie.
- Éventuellement plus tard:
  - `photosUrls: string[]` (liste de URLs ou identifiants de ressources).

Projection côté Back Office (via `PATCH /public/leads/:id`):
- `photosUrls: string`  
  - Représentation sérialisée (JSON ou autre) des URLs/id de photos.
- `aiEstimationConfidence: number` (0–100)  
  - Facultatif; utilisé seulement si une IA a produit une estimation à partir des photos.

**Règle**: tant que la feature n’est pas implémentée, le tunnel peut:
- exposer une étape UI “Photos / WhatsApp” **avec simple CTA & explications**,
- sans envoyer encore `photosUrls` / `aiEstimationConfidence` au Back Office.


