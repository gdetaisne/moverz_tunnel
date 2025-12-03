## Backlog tunnel Moverz

> Backlog léger pour suivre les principaux chantiers du tunnel (présent et futur).

### Légende

- **Statut**: `todo` | `in-progress` | `done` | `blocked`
- **Prio**: `P0` (critique), `P1` (important), `P2` (amélioration)

---

### T001 – Cadre & documentation de lancement

- **Statut**: `done`
- **Prio**: `P0`
- **Description**: Mettre en place les fichiers de contexte (`00-INDEX`, vision fonctionnelle, contrat API, form state, décisions, règles Cursor, backlog).
- **Notes**:
  - Sert de socle pour tout le reste.

### T002 – Squelette app Next.js pour le tunnel

- **Statut**: `done`
- **Prio**: `P0`
- **Description**: Créer l’app tunnel (Next.js) avec:
  - route principale pour `/devis-gratuits`,
  - structure des pages/étapes (layout, page principale, page merci),
  - configuration de base (`NEXT_PUBLIC_API_URL`, etc.).

### T003 – Étape 1 Contact (UI + POST /public/leads)

- **Statut**: `in-progress`
- **Prio**: `P0`
- **Description**: Implémenter l’étape 1 (contact):
  - UI alignée visuellement sur Marseille,
  - validation front,
  - appel `POST /public/leads` avec source explicite,
  - gestion des erreurs HTTP.

### T004 – Étape 2 Projet (adresses, logement, date + PATCH)

- **Statut**: `todo`
- **Prio**: `P0`
- **Description**: Implémenter l’étape 2:
  - champs départ/arrivée/logement/date,
  - validation front,
  - `PATCH /public/leads/:id` avec mapping correct des champs.

### T005 – Étape 3 Volume & formules (pricing La Poste)

- **Statut**: `todo`
- **Prio**: `P0`
- **Description**: Reprendre l’algorithme de pricing (Marseille) et l’intégrer:
  - calcul volume, distance, fourchettes de prix par formule,
  - sélection de formule,
  - envoi des données pricing au Back Office via `PATCH`.

### T006 – Étape 4 Validation email (request-confirmation)

- **Statut**: `todo`
- **Prio**: `P0`
- **Description**: Écran de validation:
  - appel `POST /public/leads/:id/request-confirmation`,
  - UI d’explication + re-envoi possible,
  - cohérence avec les emails envoyés par le Back Office.

### T007 – Hook étape Photos / WhatsApp (sans IA pour commencer)

- **Statut**: `todo`
- **Prio**: `P1`
- **Description**: Ajouter une étape entre 3 et 4:
  - UI pour expliquer l’envoi de photos (via WhatsApp ou autre),
  - tracking minimal côté tunnel (metadata),
  - réserver le mapping pour `photosUrls` côté Back Office (implémentation progressive).

### T008 – Theming & alignement visuel multi-sites

- **Statut**: `todo`
- **Prio**: `P1`
- **Description**: S’assurer que le tunnel:
  - reprend la charte des sites (couleurs, typos, ton),
  - permet à terme de varier à la marge selon `src` (textes, logos).

### T009 – Tracking & analytics (phase 2)

- **Statut**: `todo`
- **Prio**: `P2`
- **Description**: Intégrer proprement le tracking (GA4 / autre) dans le tunnel:
  - événements d’entrée dans le tunnel,
  - abandon par étape,
  - confirmation email envoyée / non confirmée.


