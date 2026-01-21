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

### 2026-01-21 — Phase 1 UX: micro-bar + valeur perçue (staging)

- **Date**: 2026-01-21
- **Auteur**: (ux-phase1)
- **Décision**: rapprocher la V3 de la vision V4 sans changer l’ordre technique des steps ni le tracking, en mettant davantage la valeur en avant et en réduisant la friction perçue.
- **Changements UI**:
  - `Step1Contact`:
    - Remplacement du badge "Étape 1/4" par une micro-bar de rassurance (`🔒 Données protégées • Gratuit • ~2 min restantes`).
    - Titre changé en "Où souhaitez-vous recevoir vos devis ?" pour cadrer le step comme point de contact, pas comme simple formulaire.
    - Copy renforcée sur la protection des données, sans supprimer le champ email existant.
    - CTA renommé en "Voir les options disponibles".
  - `Step3VolumeServices`:
    - Remplacement du badge "Étape 3/4" par micro-bar de progression (`🔒 Données protégées • Gratuit • ~1 min restante`).
    - Bloc estimation restructuré en deux zones scannables mobile: "Budget estimé" (fourchette en €) et "Volume estimé" (m³) avec rappel "Basé sur des déménagements similaires".
    - CTA renommé en "Finaliser mon estimation" (au lieu de "Continuer vers les photos").
  - `ConfirmationPage`:
    - Ajout d’un mini-en-tête "Dernière étape" + phrase "Envoyez quelques photos pour transformer cette estimation en devis concrets." au-dessus du CTA WhatsApp.
- **Tracking**:
  - logicalStep impactés: CONTACT, RECAP, THANK_YOU (semantique inchangée).
  - screenId impactés: `contact_v3`, `formules_v3`, `confirmation_v3` (structure UI et wording mis à jour, ids inchangés).
  - notes: pas de modification du mapping logicalStep/screenId, uniquement de la présentation et des CTA.
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés (UX only): textes et libellés des CTA / micro-copy, email toujours obligatoire à la step contact.
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Lisibilité mobile de la micro-bar (pas de collision avec le hero / header).
  - Compréhension des nouveaux CTA ("Voir les options disponibles", "Finaliser mon estimation").
  - Vérifier que les conversions GA4 / tunnel-events ne sont pas impactées (mêmes logicalStep et screenId).

### 2026-01-21 — Retrait badge “TEST” (staging)

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

