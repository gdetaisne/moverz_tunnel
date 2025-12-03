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


