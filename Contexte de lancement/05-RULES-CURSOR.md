## Règles Cursor – Tunnel Moverz

> Objectif: encadrer le travail de Cursor pour ce projet tunnel, en gardant le cadre **léger**, clair, et adapté à un seul humain pilote.

---

### 1. LOAD obligatoire en début de session

Avant **toute écriture de code** sur le tunnel, Cursor doit:

1. Lire `Contexte de lancement/00-INDEX.md`.
2. Lire `Contexte de lancement/02-CONTRAT-API-BACKOFFICE.md`.
3. Lire `Contexte de lancement/03-FORM-STATE-ET-ETAPES.md`.
4. Relire rapidement les dernières entrées de `04-DECISIONS.md` si des décisions récentes existent.

Si une tâche touche directement aux appels HTTP vers le Back Office:
- relire au besoin `Back_Office-1/backend/API.md` et `backend/src/routes/publicLeads.routes.ts` **en lecture seule**.

---

### 1.1 Recherche “best practices” avant implémentation

Avant d’implémenter une **nouvelle brique significative** (pattern d’UI, gestion de formulaire, stratégie de persistance, façon d’appeler une API, etc.), Cursor doit:

1. **Chercher d’abord dans le code existant**:
   - `moverz_main-4` (ex: sites Marseille/Bordeaux) pour les patterns tunnel/UX,
   - `Back_Office-1` pour les conventions côté backend (Zod, structure d’API, erreurs).
2. **Si besoin**, consulter des ressources externes “state of the art”:
   - documentation officielle (Next.js, React, React Hook Form, Zod, etc.),
   - articles de référence récents pour le pattern concerné.
3. **Aligner l’implémentation**:
   - soit sur les best practices identifiées,
   - soit expliquer en 1–2 phrases pourquoi on s’en écarte (contrainte projet).

---

### 2. Périmètre & architecture

- **Périmètre code**:
  - Le tunnel se limite au repo/dossier dédié (`moverz_tunnel` dans ce workspace).
  - Le code de `Back_Office-1` est **lecture seule** (référence), aucune modification.
- **Architecture**:
  - App Next.js/React dédiée pour le tunnel.
  - Intégration Back Office **exclusivement via HTTP**:
    - `POST /public/leads`
    - `PATCH /public/leads/:id`
    - `POST /public/leads/:id/request-confirmation`
  - Interdiction d’ajouter d’autres endpoints côté Back Office sans mise à jour de `02-CONTRAT-API-BACKOFFICE.md` + validation explicite de l’utilisateur.

- **Design**:
  - Tout développement UI doit être pensé **mobile first**:
    - privilégier la lisibilité et l’ergonomie sur petits écrans,
    - n’ajouter les adaptations desktop qu’ensuite (grilles, marges, colonnes) sans compromettre l’expérience mobile.

---

### 3. Règles d’API & ENV

- **Base URL**:
  - Utiliser **uniquement** `NEXT_PUBLIC_API_URL` pour construire les URLs vers le Back Office.
  - `NEXT_PUBLIC_API_URL` pointe vers l’instance Back Office hébergée (prod).
  - Interdiction d’écrire des URLs en dur (`http://localhost:3001`, `https://moverz-backoffice...`) dans le code; elles doivent passer par la config/env.

- **Contrat**:
  - Toute évolution de payload ou de champ côté tunnel qui touche les appels `/public/leads` doit:
    - être d’abord décrite dans `02-CONTRAT-API-BACKOFFICE.md`,
    - ensuite seulement être implémentée dans le code.

---

### 4. Gestion explicite de la source (`src`)

- Le tunnel doit:
  - lire un paramètre de query `src` sur les URLs d’entrée (ex: `/devis-gratuits?src=dd-marseille`),
  - l’utiliser comme **source principale** pour `lead.source` dans `POST /public/leads`.
- Fallback:
  - utiliser une fonction `getSource(hostname)` **uniquement** si `src` est absent.
  - ne jamais inverser la priorité (`src` > fallback).

Si la convention de nommage de `src` / `source` change, la décision doit être enregistrée dans `04-DECISIONS.md` avant modification du code.

---

### 5. Workflow de développement (petites étapes)

- **Avant un batch de modifications**:
  - annoncer brièvement dans le message ce qui va être fait (2–3 phrases max).
- **Après un batch**:
  - décrire rapidement ce qui a été modifié,
  - montrer les diffs des fichiers touchés si la tâche est significative (ou expliquer dans quels fichiers se trouvent les changements).

- **Périmètre strict**:
  - Ne pas “profiter” d’une feature pour refactorer massivement d’autres parties.
  - Si un problème hors périmètre est détecté:
    - le signaler à l’utilisateur,
    - l’ajouter dans `06-BACKLOG.md` (ou l’enrichir) au lieu de le corriger immédiatement, sauf demande explicite.

---

## 5.1 Règles V4 (staging) — garde-fous (NON NÉGOCIABLE)

Objectif: permettre une refonte UX/UI en staging **sans risque** pour prod / DB / tracking.

### Branches & déploiement

- **Interdit de toucher à `main`** (aucun commit, aucune PR, aucune modif).
- Travailler **uniquement** sur la branche `staging`.
- **Interdit de tester en local**: les tests se font **uniquement sur staging** (CapRover) après push.
- Faire des **commits fréquents** (petites étapes), pour tester en conditions réelles rapidement.

### DB / Prisma (zéro migration)

- **Interdit** de modifier:
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
- Conclusion: **aucune migration / aucun changement de schéma** en V4 staging.

### Champs / Inputs (zéro suppression)

- **Interdit** de supprimer des champs / inputs existants du tunnel (ils doivent rester disponibles pour les clients).
- En principe, ne pas créer de nouveaux inputs.
- Si un prototype de nouvel input est exceptionnellement nécessaire:
  - il doit être **clairement marqué “non connecté”** dans l’UI,
  - il ne doit pas être envoyé au Back Office,
  - et il doit être documenté dans `migration_v4.md`.

### Tracking (GA4 / Back Office)

- `logicalStep` est la source de vérité métier (stable).
- `screenId` doit être **explicite** et lié à l’écran UI (ex: `project_v4`), **jamais** dérivé d’un index d’étape.
- Si l’ordre des steps change: on conserve le mapping `logicalStep` correct (ex: PROJECT reste PROJECT).

### Journal obligatoire

- À **chaque** modification de code ou décision: mettre à jour `migration_v4.md`.
- Dans le message de fin (chat), écrire exactement: **Migration_v4 à jour**.

---

### 6. Documentation & nettoyage (code zombie)

- **Documentation**:
  - Toute décision non triviale (nouveau champ, changement de mapping, ajout d’étape, nouvelle route tunnel) doit être:
    - ajoutée ou mise à jour dans `03-FORM-STATE-ET-ETAPES.md` si c’est un changement de structure de formulaire,
    - ou consignée dans `04-DECISIONS.md` si c’est un choix d’architecture/contrat.

- **Code zombie**:
  - Ne pas laisser:
    - anciens helpers/API clients non utilisés,
    - gros blocs commentés représentant des versions précédentes,
    - console.log de debug permanents.
  - Après chaque feature terminée:
    - vérifier rapidement s’il existe des fonctions/fichiers devenus inutiles par cette feature,
    - les supprimer si la suppression est sûre.

- **Pause doc/clean**:
  - À la fin de chaque “gros chantier” du backlog (statut qui passe à `done` dans `06-BACKLOG.md`):
    - s’arrêter pour:
      - mettre à jour `04-DECISIONS.md`,
      - relire `03-FORM-STATE-ET-ETAPES.md` si la feature touche le formulaire,
      - nettoyer les morceaux de code manifestement morts créés par ce chantier.

---

### 7. Modes spéciaux: DEBUG & DEEPSEARCH

Ces modes sont inspirés de `Back_Office-1/docs/03-workflows/TASKS_RULES.md`, mais appliqués au tunnel.

#### Mode DEBUG (quand l’utilisateur dit “debug”)

- Obligations:
  - Formuler une **hypothèse** claire sur la cause du problème avant de changer le code.
  - Faire **un seul changement** ciblé à la fois.
  - Expliquer le test à faire (ou le lancer si possible) et le résultat attendu.
  - Décrire ensuite si l’hypothèse était correcte.
- Interdit:
  - faire des refactors globaux en mode “debug”.

#### Mode DEEPSEARCH (quand l’utilisateur dit “deepsearch”)

- Objectif:
  - analyser un sujet en profondeur jusqu’à une certitude **≥ 90 %**,
  - sinon lister clairement les zones d’incertitude.
- Comportement:
  - lire tous les fichiers pertinents du tunnel (et doc associée),
  - si nécessaire, lire les parties pertinentes du Back Office en lecture seule,
  - produire une réponse structurée (“Analyse exhaustive”, “Certitude”, “Recommandation”),
  - ne pas forcément écrire de code (sauf demande explicite).

---

### 8. Backlog & suivi (06-BACKLOG.md)

- `06-BACKLOG.md` sert de **backlog léger** à la place du système `.cursor/tasks` lourd du Back Office.
- Règles:
  - Chaque “chantier” significatif (feature, refactor, amélioration UX importante) doit avoir une entrée dans le backlog avec:
    - un identifiant (`T001`, `T002`, …),
    - un titre court,
    - un statut (`todo`, `in-progress`, `done`, `blocked`),
    - une priorité approximative,
    - éventuellement une date cible / note.
  - Quand Cursor commence réellement à travailler sur un chantier:
    - mettre son statut à `in-progress`,
    - le mentionner dans le message.
  - Quand un chantier est terminé:
    - passer le statut à `done`,
    - déclencher une “pause doc/clean” (voir §6).


