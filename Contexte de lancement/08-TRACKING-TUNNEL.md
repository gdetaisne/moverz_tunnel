## Tracking plan – Tunnel web Moverz

### 1. Objectifs business

- **Mesurer l’acquisition tunnel**
  - Sessions qui entrent dans le tunnel, par `source` (ex: `dd-marseille`) et device.
- **Mesurer la performance du funnel**
  - Passage entre les étapes logiques: arrivée → contact → projet → récap → merci.
  - Temps passé par étape, allers-retours, abandon.
- **Comparer les versions d’écrans**
  - Impact des variantes UI (`screenId`) sur la conversion et le temps passé.
- **Exclure les comptes de test**
  - Ne pas compter dans les stats les users internes / tests manuels.

Le tunnel va évoluer souvent. Le tracking est donc conçu pour:
- séparer les **étapes logiques stables** (`logicalStep`) de l’**implémentation UI** (`screenId`),
- garder un **schéma d’events minimal et extensible** (payload `extra` en `jsonb` côté Neon).

---

### 2. Vocabulaire & conventions

- **sessionId**: identifiant technique de session tunnel (UUID généré côté front, stocké en cookie ou localStorage).
- **leadTunnelId**: identifiant de la ligne `LeadTunnel` (SQLite), si disponible.
- **source**: canal / site d’origine dérivé du paramètre `src` (ex: `dd-marseille`, `dd-lyon`…).
- **logicalStep** (stable dans le temps):
  - `ENTRY`      – arrivée dans le tunnel (landing tunnel).
  - `CONTACT`    – step où l’utilisateur saisit ses infos de contact.
  - `PROJECT`    – step où il décrit le projet (adresses, logement, date…).
  - `RECAP`      – récapitulatif avant validation.
  - `THANK_YOU`  – écran de confirmation après validation.
  - (Futur) `PHOTOS` – flow d’envoi de photos, si intégré au tunnel.
- **screenId** (lié à l’UI, évolutif):
  - exemple: `contact_v1`, `contact_split_name_phone_v2`, `recap_with_price_v3`.
  - Sert pour analyser l’impact des refontes UI et A/B tests, sans casser les stats historiques.

Convention: chaque event inclut **au minimum** `eventType`, `sessionId`, `source`, `urlPath`, `timestamp`.  
Les champs plus riches sont soit des colonnes, soit mis dans `extra` (json).

---

### 3. Liste des events (v1)

#### 3.1. `TUNNEL_SESSION_STARTED`

- **Quand**:
  - Première arrivée dans le tunnel pour une `sessionId` donnée (ex: première vue de `/devis-gratuits`).
- **Usage**:
  - Compter les sessions tunnel par jour, par `source`, par device.

**Payload recommandé**:

- Champs communs (voir section 4):
  - `eventType = "TUNNEL_SESSION_STARTED"`
  - `sessionId`
  - `leadTunnelId` (si déjà créé, sinon `null`)
  - `source`
  - `urlPath`
  - `timestamp`
  - `logicalStep = "ENTRY"`
  - `screenId` (ex: `entry_v1`)
- `extra` (exemples):
  - `device`: `mobile` / `desktop` / `tablet`
  - `userAgent`: string brut
  - `tunnelVersion`: ex: `v1`, `v2`

---

#### 3.2. `TUNNEL_STEP_VIEWED`

- **Quand**:
  - À chaque fois qu’un utilisateur arrive sur une **étape logique** du tunnel (écran correspondant à une `logicalStep`).
  - Ex: affichage de la page de contact, de la page projet, du récap, etc.
- **Usage**:
  - Compter le nombre de vues par step logique.
  - Analyser l’impact des variations d’UI (`screenId`) sur le comportement (temps, complétion…).

**Payload recommandé**:

- `eventType = "TUNNEL_STEP_VIEWED"`
- `sessionId`
- `leadTunnelId`
- `source`
- `urlPath`
- `timestamp`
- `logicalStep`: une valeur parmi `ENTRY` | `CONTACT` | `PROJECT` | `RECAP` | `THANK_YOU` | `PHOTOS` (futur).
- `screenId`: identifiant précis de l’écran (ex: `contact_split_name_phone_v2`).
- `extra` (exemples):
  - `tunnelVersion`
  - `experimentKey`: identifiant d’un test A/B (ex: `hero_variant_b`)

---

#### 3.3. `TUNNEL_STEP_CHANGED`

- **Quand**:
  - Quand l’utilisateur change d’étape (bouton “Suivant”, “Précédent”, navigation interne équivalente).
- **Usage**:
  - Calculer le temps passé sur chaque étape.
  - Comprendre les allers-retours (back/forward) et les potentiels points de friction.

**Payload recommandé**:

- `eventType = "TUNNEL_STEP_CHANGED"`
- `sessionId`
- `leadTunnelId`
- `source`
- `urlPath`
- `timestamp` (moment où le changement est déclenché).
- `logicalStep`: généralement la nouvelle step atteinte (même valeur que la `toStep` ci-dessous).
- `screenId`: écran sur lequel l’utilisateur arrive après le changement.
- `extra`:
  - `fromStep`: step logique de départ (`ENTRY` | `CONTACT` | `PROJECT` | `RECAP` | `THANK_YOU` | `PHOTOS`).
  - `toStep`: step logique d’arrivée (même enum).
  - `direction`: `"forward"` ou `"back"` (ou autre si navigation non linéaire).
  - `durationMs`: temps passé sur la step de départ avant ce changement.
  - `errorsCount`: nombre d’erreurs de validation rencontrées sur la step (optionnel).

**Calcul du `durationMs` côté front**:
- Enregistrer un timestamp à l’arrivée sur une step (via `TUNNEL_STEP_VIEWED` ou dans un state local),
- à la navigation suivante, calculer `now - lastStepEnterTime` et l’envoyer dans `durationMs`.

---

#### 3.4. `TUNNEL_COMPLETED`

- **Quand**:
  - Quand l’utilisateur termine le tunnel et atteint l’écran de remerciement (lead créé et formulaire validé).
- **Usage**:
  - Mesurer le taux de conversion global tunnel.
  - Relier les stats de funnel aux leads effectivement créés (via `leadTunnelId`).

**Payload recommandé**:

- `eventType = "TUNNEL_COMPLETED"`
- `sessionId`
- `leadTunnelId` (devrait être non nul à ce stade).
- `source`
- `urlPath`
- `timestamp`
- `logicalStep = "THANK_YOU"`
- `screenId`: identifiant de l’écran final (ex: `thank_you_v1`).
- `extra` (exemples):
  - `totalDurationMs`: temps écoulé entre `TUNNEL_SESSION_STARTED` et `TUNNEL_COMPLETED` pour cette `sessionId`.
  - `stepsCount`: nombre de steps logiques parcourues.
  - `photosFlowStarted`: booléen (si, plus tard, un flow photos est déclenché depuis cet écran).

---

#### 3.5. `TUNNEL_ERROR` (optionnel mais recommandé)

- **Quand**:
  - Lorsqu’une erreur bloquante survient dans le tunnel (ex: échec d’un `POST /api/leads`, erreur réseau, 500, etc.).
- **Usage**:
  - Corréler les erreurs techniques avec les abandons.

**Payload recommandé**:

- `eventType = "TUNNEL_ERROR"`
- `sessionId`
- `leadTunnelId`
- `source`
- `urlPath`
- `timestamp`
- `logicalStep` / `screenId`: contexte courant au moment de l’erreur.
- `extra`:
  - `errorType`: ex: `NETWORK_ERROR`, `API_4XX`, `API_5XX`, `VALIDATION_ERROR`.
  - `errorMessage`: message résumé (pas de stack frontend complète pour éviter les payloads géants).
  - `apiEndpoint`: si l’erreur vient d’un call backend.

---

### 4. Modèle de données côté Neon (conceptuel)

Table principale: `tunnel_events` (Postgres / Neon).

Colonnes proposées (hors détails de types précis):

- `id` (uuid, PK, `DEFAULT gen_random_uuid()`)
- `created_at` (timestamptz, `DEFAULT now()`) – timestamp serveur
- `session_id` (text, NOT NULL)
- `lead_tunnel_id` (text, nullable)
- `source` (text, nullable)
- `url_path` (text, NOT NULL)
- `event_type` (text, NOT NULL) – ex: `TUNNEL_SESSION_STARTED`, `TUNNEL_STEP_VIEWED`, etc.
- `logical_step` (text, nullable) – valeurs comme `ENTRY`, `CONTACT`, etc.
- `screen_id` (text, nullable)
- `is_test_user` (boolean, NOT NULL, `DEFAULT false`)
- `extra` (jsonb, nullable) – payload extensible contenant `durationMs`, `fromStep`, `toStep`, `device`, etc.

Index recommandés:
- `(created_at)`
- `(source, created_at)`
- `(event_type, logical_step, created_at)`
- `(is_test_user, created_at)`

---

### 5. Exclusion des comptes de test

Objectif: **ne pas inclure dans les stats** les events générés par:
- `gdetaisne@gmail.com`
- tous les `gdetaisne+XXX@gmail.com`
- `veltzlucie@gmail.com`
- tous les emails en `*@moverz.fr`

Stratégie:
- On stocke **tous** les events dans `tunnel_events`.
- On marque ceux issus de comptes de test avec `is_test_user = true`.
- L’onglet “Tunnel” filtre par défaut `WHERE is_test_user = false`.

Logique de détection (pseudo-code):

```ts
const TEST_EMAILS = new Set([
  "gdetaisne@gmail.com",
  "veltzlucie@gmail.com",
]);

function isGmailAlias(email: string, base: string) {
  const [local, domain] = email.toLowerCase().split("@");
  if (domain !== "gmail.com") return false;
  const localWithoutPlus = local.split("+")[0];
  return localWithoutPlus === base;
}

function isMoverz(email: string) {
  return email.toLowerCase().endsWith("@moverz.fr");
}

function isTestUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();

  if (TEST_EMAILS.has(e)) return true;
  if (isGmailAlias(e, "gdetaisne")) return true;
  if (isMoverz(e)) return true;

  return false;
}
```

Cette fonction serait appelée dans l’API backoffice `POST /api/tunnel-events` (une fois l’email récupéré depuis le lead ou passé dans le payload) pour calculer `is_test_user`.

---

### 6. Usage dans l’onglet “Tunnel” (exemples d’analyses)

- **KPI globaux (par période)**
  - Sessions tunnel: nombre de `TUNNEL_SESSION_STARTED` (filtré `is_test_user = false`).
  - Leads créés: nombre de `TUNNEL_COMPLETED` distincts par `lead_tunnel_id`.
  - Taux de conversion: `TUNNEL_COMPLETED / TUNNEL_SESSION_STARTED`.
- **Funnel par step logique**
  - Pour chaque `logicalStep`, nombre de sessions ayant au moins un `TUNNEL_STEP_VIEWED`.
  - Taux de passage step→step à partir des couples `fromStep` / `toStep` dans `TUNNEL_STEP_CHANGED`.
- **Temps et frictions**
  - `median(durationMs)` par `logicalStep`, par `source`, par `screenId`.
  - Nombre moyen d’allers-retours (`direction = "back"`) par session.
- **Comparaison de variantes UI**
  - Conversion globale et temps par step pour chaque `screenId`.
  - Impact des tests A/B (`experimentKey`, `tunnelVersion`) sur la progression dans le funnel.

Ce tracking plan doit rester la **source de vérité** partagée entre:
- l’équipe tunnel (implémentation front),
- le backoffice (API `tunnel-events` + onglet “Tunnel”),
- et l’analyse de données (SQL / dashboards).


