## Moverz Tunnel – Index de contexte

**Objectif**: Définir un cadre clair et léger pour le développement du tunnel de conversion Moverz (Next.js) connecté au Back Office (`Back_Office-1`), afin que Cursor puisse travailler en autonomie sans dériver.

### Fichiers de contexte

- **`00-INDEX.md` (ce fichier)**: point d’entrée unique.
- **`01-VISION-FONCTIONNELLE.md`**: description fonctionnelle du tunnel (étapes, UX, futur step photos/WhatsApp).
- **`02-CONTRAT-API-BACKOFFICE.md`**: contrat HTTP entre le tunnel et le Back Office (`/public/leads` & co).
- **`03-FORM-STATE-ET-ETAPES.md`**: description structurée du `FormState` tunnel, par étape.
- **`04-DECISIONS.md`**: journal ultra-court des décisions importantes (tech/produit).
- **`05-RULES-CURSOR.md`**: règles à suivre par Cursor pour ce projet.
- **`06-BACKLOG.md`**: backlog synthétique des chantiers (présent / futur) avec statut.

### Load minimal pour toute nouvelle session Cursor

Avant d’écrire du code sur le tunnel, Cursor doit **toujours**:

1. Lire **`00-INDEX.md`** (ce fichier).
2. Lire **`02-CONTRAT-API-BACKOFFICE.md`** (pour ne pas casser l’intégration Back Office).
3. Lire **`03-FORM-STATE-ET-ETAPES.md`** (pour comprendre le modèle de formulaire).
4. Lire **`05-RULES-CURSOR.md`** (workflow, périmètre, doc & nettoyage).
5. Parcourir rapidement les **dernières entrées** de `04-DECISIONS.md` pour connaître l’état des features récentes (ex: étape Photos & IA).

### Rappels clés (résumé ultra-court)

- **Stack**: Next.js / React pour le tunnel, Back Office Express+TS+Prisma+Zod déjà existant.
- **Intégration**: uniquement via **API HTTP** du Back Office, surtout `POST/PATCH /public/leads` et `POST /public/leads/:id/request-confirmation`.
- **Source lead**: `?src=...` dans l’URL → devient `lead.source` (logique principale). `getSource(hostname)` = fallback uniquement.
- **Tunnel actuel (2025‑12‑03)**: 4 étapes côté UI  
  1. **Contact** (création du lead)  
  2. **Projet** (départ / arrivée / logement & accès / dates via accordéons)  
  3. **Volume & formules** (surface + 3 cartes de densité + swiper Éco/Standard/Premium avec pricing calculé côté front)  
  4. **Photos & inventaire** (choix entre upload maintenant, WhatsApp plus tard, ou pas d’inventaire; upload local, IA “Process 2” avec regroupement par pièce + tableau inventaire, chrono et barre de progression).
- **Local = Prod**: même comportement métier en local et en prod tunnel; `NEXT_PUBLIC_API_URL` pointe vers l’instance Back Office hébergée.
- **Persistance locale**: DB SQLite via Prisma avec modèles `LeadTunnel`, `LeadPhoto`, `LeadRoom`, `LeadRoomItem`, `LeadAnalysisRun`. Les écritures IA “profondes” (rooms/items/photos) peuvent être temporairement désactivées en prod pour éviter les 500; `LeadAnalysisRun` et `photosStatus` restent la source de vérité.
- **Upload photos**: `/api/uploads/photos` accepte uniquement des **images** (JPG/PNG/WEBP/HEIC/HEIF), max ~25 Mo, converties en JPEG ~400×300 (qualité ~80) et stockées dans `uploads/`. L’API IA principale est `/api/ai/process2-classify` (une requête par photo pour la pièce, puis une requête par pièce pour l’inventaire).


