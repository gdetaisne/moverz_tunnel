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

### 2026-01-21 — Préparation V2 (state accès simplifié)

- **Date**: 2026-01-21
- **Auteur**: (prep-v2)
- **Décision**: ajouter les champs d’état pour le futur flow V2 (accès simple/contraint + sous-questions) sans impacter le flow actuel.
- **Changements UI**:
  - Aucun (préparation interne uniquement).
- **Tracking**:
  - Aucun changement (les events V2 seront ajoutés avec le flag).
- **Champs / Inputs**:
  - ajoutés (state uniquement, pas de suppression) : `access_type`, `narrow_access`, `long_carry`, `difficult_parking`, `lift_required`, `access_details` (défaut: accès simple, booléens à false).
- **Back Office payload**:
  - changements: **AUCUN** (les champs ne sont pas encore envoyés).
- **Risques / points à vérifier sur staging**:
  - Aucun impact attendu; c’est un changement interne de state.

### 2026-01-21 — Implémentation V2 (flow mobile-first sous flag)

- **Date**: 2026-01-21
- **Auteur**: (v2-flag)
- **Décision**: activer un flow V2 (4 étapes réordonnées, mobile-first) derrière `NEXT_PUBLIC_FUNNEL_V2=true`, sans toucher au flow V1 si flag absent.
- **Changements UI** (flag ON uniquement):
  - Step 1: qualification ultra-light (villes + type logement), CTA “Voir les options disponibles”, pas de hero mobile.
  - Step 2: estimation immédiate (budget + volume, mention “Basé sur des déménagements similaires”), CTA “Affiner mon devis”.
  - Step 3: détails pratiques avec accès progressif (question unique “L’accès est-il simple ?”, sous-questions révélées une par une, champ détails si ≥1 Oui), CTA “Finaliser mon estimation”, micro-copy temps restant.
  - Step 4: contact + photos, titre “Où souhaitez-vous recevoir vos devis ?”, message “Dernière étape…”, phrase humaine “Un conseiller Moverz vérifie…”, WhatsApp prioritaire + upload desktop.
  - Plus de label “Étape X/4”; barre de progression + temps seulement; bouton “← Modifier” en haut; sticky CTA mobile sur steps 2 & 3; hero supprimé dès step 2 mobile.
- **Tracking**:
  - Nouveaux screenId V2: `qualification_v2`, `estimation_v2`, `acces_v2`, `contact_v2`.
  - Pas encore d’envoi des nouveaux events custom; à compléter si besoin (funnel_step_viewed/completed variant v2, access_type_selected, etc.).
- **Champs / Inputs**:
  - Ajout state accès V2 déjà noté (access_type, narrow_access, long_carry, difficult_parking, lift_required, access_details). Aucun champ supprimé.
- **Back Office payload**:
  - Contact envoyé en Step 4 via lead BO; tunnelOptions inclut accessV2 (ne casse pas le schéma).
- **Risques / points à vérifier sur staging**:
  - Vérifier affichage mobile (sticky CTA, suppression hero step 2+).
  - Vérifier tracking (screenId v2) et absence de régression V1 lorsque le flag est off.
  - `firstName` est optionnel côté UI V2 mais toujours envoyé comme string (éventuellement vide) pour respecter le contrat BO.

### 2026-01-21 — Wiring flag NEXT_PUBLIC_FUNNEL_V2 dans Dockerfile

- **Date**: 2026-01-21
- **Auteur**: (v2-flag-docker)
- **Décision**: exposer `NEXT_PUBLIC_FUNNEL_V2` au build Next via le Dockerfile pour que le flag soit réellement pris en compte sur staging.
- **Changements UI**:
  - Aucun direct; permet simplement d’activer le flow V2 lorsqu’on passe le flag dans CapRover.
- **Tracking**:
  - Aucun changement supplémentaire.
- **Champs / Inputs**:
  - Aucun changement.
- **Back Office payload**:
  - Aucun changement.
- **Notes techniques**:
  - `Dockerfile`: ajout de `ARG NEXT_PUBLIC_FUNNEL_V2` + `ENV NEXT_PUBLIC_FUNNEL_V2=$NEXT_PUBLIC_FUNNEL_V2` dans le stage builder.
  - CapRover doit fournir `NEXT_PUBLIC_FUNNEL_V2` comme build-arg pour que `process.env.NEXT_PUBLIC_FUNNEL_V2` soit inliné côté Next.
- **Risques / points à vérifier sur staging**:
  - Vérifier que `NEXT_PUBLIC_FUNNEL_V2` disparaît bien de la liste des build-args “not consumed” dans les logs.
  - Vérifier que `/devis-gratuits-v3` affiche bien la V2 lorsque le flag est à `true`.

### 2026-01-21 — V2: m² en étape 1 + options en fin d'étape 3

- **Date**: 2026-01-21
- **Auteur**: (v2-ux-iterate)
- **Décision**: rapprocher encore le flow V2 de la vision produit en rendant la surface explicite dès l'étape 1 et en réintégrant les services optionnels en fin d'étape 3, sans alourdir la charge cognitive.
- **Changements UI** (flag V2 uniquement):
  - Step 1 (Qualification): ajout d'un champ `Surface approximative (m²)` sous "Type de logement", lié à `surfaceM2` (déjà utilisé par le moteur de pricing).
  - Step 3 (Accès & logistique): question accès mise au pluriel ("accès départ & arrivée"), même logique simple/contraint + sous-questions progressives; ajout en bas d'un accordéon "Options supplémentaires (facultatif)" contenant les mêmes toggles services qu'en V1 (garde-meuble, nettoyage/débarras, etc.) + textarea "Précisions".
- **Tracking**:
  - Pas de nouveau screenId; comportement inchangé côté events (toujours `acces_v2` pour la step).
- **Champs / Inputs**:
  - `surfaceM2` déjà existant, simplement éditable dès l'étape 1 V2.
  - Services optionnels V1 réutilisent les mêmes champs booléens (`serviceFurnitureStorage`, `serviceCleaning`, etc.) et `specificNotes`.
- **Back Office payload**:
  - Les options restent envoyées via `tunnelOptions.services` comme avant; aucun changement de schéma.
- **Risques / points à vérifier sur staging**:
  - Vérifier que la complétion de l'étape 1 reste rapide (<30s) malgré le champ m².
  - Vérifier que les services cochés en V2 sont bien visibles dans le Back Office comme aujourd'hui en V1.

### 2026-01-21 — V2 Step 4: intégration design ConfirmationPage (hero + euros économisés + mock iPhone)

- **Date**: 2026-01-21
- **Auteur**: (v2-step4-design)
- **Décision**: réintégrer le design de l'ancienne `ConfirmationPage` (hero "Photographiez toutes vos pièces", carte "Vous économisez XX €", mock iPhone) dans `StepContactPhotosV2` pour renforcer l'engagement émotionnel et la valeur perçue, tout en conservant les champs de contact en haut.
- **Changements UI** (flag V2 uniquement):
  - Step 4 (Contact + Photos): formulaire contact conservé en haut (Prénom optionnel, Email obligatoire, Téléphone optionnel); ajout du hero "Photographiez toutes vos pièces" avec badge "Dossier créé"; carte "Vous économisez XX €" calculée depuis `estimateMaxEur` (3-8% de l'estimation max); mock iPhone réaliste avec conversation WhatsApp simulée; section "Prochaines étapes" avec checkmarks; CTA WhatsApp + upload desktop; bouton submit sticky mobile "Accéder à mes devis".
- **Tracking**:
  - Pas de changement de screenId (`contact_v2` inchangé).
- **Champs / Inputs**:
  - Aucun changement (formulaire contact inchangé).
- **Back Office payload**:
  - Aucun changement (payload identique).
- **Notes techniques**:
  - `StepContactPhotosV2` reçoit désormais `estimateMinEur`, `estimateMaxEur`, `estimateIsIndicative` depuis `page.tsx` pour calculer et afficher les économies.
  - Design responsive: hero + mock iPhone en grid lg:grid-cols sur desktop, empilés sur mobile.
- **Risques / points à vérifier sur staging**:
  - Vérifier l'affichage du hero + mock iPhone sur mobile (pas de débordement, scroll fluide).
  - Vérifier que la carte "Vous économisez" s'affiche uniquement si `hasEstimate` est vrai.
  - Vérifier que le formulaire contact reste accessible et fonctionnel avant le hero.

### 2026-01-22 — Fix Dockerfile: nettoyage cache .next avant build

- **Date**: 2026-01-22
- **Auteur**: (fix-build-cache)
- **Décision**: nettoyer le dossier `.next` avant chaque build pour éviter les conflits de hash entre builds successifs et les erreurs 404 sur les fichiers statiques.
- **Changements UI**:
  - Aucun changement UI direct.
- **Tracking**:
  - Aucun changement.
- **Champs / Inputs**:
  - Aucun changement.
- **Back Office payload**:
  - Aucun changement.
- **Notes techniques**:
  - `Dockerfile`: ajout de `rm -rf .next` avant le build Next.js pour forcer une régénération complète des assets statiques.
  - Cela évite que des fichiers avec d'anciens hash soient référencés dans le HTML alors qu'ils n'existent plus.
- **Risques / points à vérifier sur staging**:
  - Vérifier que le build génère bien tous les fichiers statiques après un rebuild complet.
  - Si les erreurs 404 persistent, vérifier la configuration nginx/CapRover pour le cache du HTML.

### 2026-01-22 — V2 Step 2: ajout des formules (sélection premium)

- **Date**: 2026-01-22
- **Auteur**: (v2-step2-formules)
- **Décision**: réintroduire le choix de formule en Step 2 pour renforcer l’engagement et permettre une sélection immédiate, sans casser le flow mobile-first.
- **Changements UI** (flag V2 uniquement):
  - Step 2: ajout d’un bloc “Choisissez votre formule” sous l’estimation, avec 3 cartes scrollables (Éco / Standard / Premium), badge “Recommandé” sur Standard, sélection visuelle premium.
  - Le budget et la sélection sont cohérents avec la formule choisie (mise à jour immédiate).
- **Tracking**:
  - Aucun changement (screenId `estimation_v2` inchangé).
- **Champs / Inputs**:
  - Aucun nouveau champ; utilisation du champ existant `formule`.
- **Back Office payload**:
  - Aucun changement (formule déjà utilisée en aval).
- **Risques / points à vérifier sur staging**:
  - Vérifier la lisibilité mobile (cards horizontales, snap).
  - Vérifier que la formule sélectionnée se répercute bien dans l’estimation et le reste du tunnel.

### 2026-01-22 — V2: contact déplacé en fin Step 3, Step 4 = photos only (anti-drop)

- **Date**: 2026-01-22
- **Auteur**: (v2-anti-drop-photos)
- **Décision**: réduire le drop sur la dernière étape en rendant la Step 4 exclusivement dédiée à l’envoi de photos. Le contact (prénom optionnel + email obligatoire) est déplacé en fin de Step 3 et le lead BO est créé/MAJ à ce moment.
- **Changements UI** (flag V2 uniquement):
  - Step 3: ajout d’un bloc “Où recevoir vos devis ?” en fin d’étape avec `Prénom (optionnel)` + `Email (obligatoire)` (+ téléphone optionnel replié).
  - Step 4: suppression du formulaire contact; écran dédié uniquement aux CTAs photo (WhatsApp + upload desktop) et au hero “Photographiez toutes vos pièces”.
- **Tracking**:
  - Step 4 devient `PHOTOS` avec `screenId=photos_v2` (explicite, non dérivé d’un index).
  - La soumission Step 3 déclenche désormais la création/MAJ du lead BO avant l’étape photos.
- **Champs / Inputs**:
  - Aucun champ supprimé: `firstName`, `email`, `phone` restent disponibles mais déplacés en Step 3 (V2).
- **Back Office payload**:
  - Lead créé/MAJ en Step 3 avec `firstName`, `email`, `phone` + `tunnelOptions.accessV2`.
- **Risques / points à vérifier sur staging**:
  - Vérifier la validation email en Step 3 (scroll/focus).
  - Vérifier que Step 4 a bien `leadId` et que les CTAs WhatsApp/upload fonctionnent.

### 2026-01-22 — V2: contrainte date (J+15 min, historique bloqué)

- **Date**: 2026-01-22
- **Auteur**: (v2-date-min)
- **Décision**: appliquer la contrainte business “pas de date passée / pas dans les 15 prochains jours” en V2 comme en V1.
- **Changements UI** (flag V2 uniquement):
  - Step 3: input date (`movingDate`) a désormais un `min = aujourd’hui + 15 jours` (ce qui bloque aussi l’historique).
- **Validation**:
  - Au submit Step 3, validation renforcée (si date < min ou vide ⇒ scroll/focus sur l’input + erreur).
- **Tracking**:
  - Ajout d’un `TUNNEL_ERROR` validation côté V2 (`acces_v2`) en cas de date invalide.
- **Champs / Inputs**:
  - Aucun changement.
- **Back Office payload**:
  - Aucun changement.

### 2026-01-22 — V2: champs requis + validation discrète + scroll 1er champ manquant

- **Date**: 2026-01-22
- **Auteur**: (v2-validation-premium)
- **Décision**: rendre les champs critiques “presque tous obligatoires” en V2, avec un feedback discret (tag “Requis”) et une navigation fluide (scroll/focus sur le premier champ manquant) lors du passage à l’étape suivante.
- **Changements UI** (flag V2 uniquement):
  - Step 1: tags “Requis” sur ville départ/arrivée, type logement, m²; affichage d’erreurs uniquement après tentative de continuer.
  - Step 3: tags “Requis” sur adresses + date + email; erreurs affichées uniquement après tentative de continuer.
- **Validation**:
  - Step 1: validation avant Step 2 + scroll/focus sur le premier champ invalide.
  - Step 3: validation adresses + date + email avant Step 4 + scroll/focus sur le premier champ invalide.
- **Notes techniques**:
  - `AddressAutocomplete` supporte désormais `required` + `errorMessage` (props optionnelles, backward compatible).

### 2026-01-22 — V2 Step 3 (Accès): clarification départ/arrivée sans alourdir l’UX

- **Date**: 2026-01-22
- **Auteur**: (v2-access-clarity)
- **Décision**: rendre explicite le cas “accès départ ≠ arrivée” **sans ajouter de nouveaux champs** et sans casser le flow progressif.
- **Changements UI** (flag V2 uniquement):
  - Step 3 (Accès & logistique): micro-copy ajoutée sous la question “Accès départ & arrivée” pour indiquer que départ/arrivée peuvent différer et qu’il faut choisir “accès contraint” si l’un des deux l’est.
  - Le champ `access_details` est désormais affiché dès que `access_type="constrained"` afin de permettre de préciser “départ seulement / arrivée seulement / les deux”.
- **Tracking**:
  - Aucun changement (screenId `acces_v2` inchangé).
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés (UX only): affichage conditionnel de `access_details` (toujours visible en mode contraint).
- **Back Office payload**:
  - Aucun changement de schéma: `tunnelOptions.accessV2` continue d’embarquer `access_type` + sous-questions + `access_details`.
- **Risques / points à vérifier sur staging**:
  - Compréhension: les users “arrivée seulement” doivent naturellement utiliser la zone précisions.
  - Friction: vérifier que l’affichage du textarea en mode contraint n’augmente pas le drop.

### 2026-01-22 — Hotfix build: texte JSX avec “<” dans StepContactPhotosV2

- **Date**: 2026-01-22
- **Auteur**: (hotfix-build-jsx)
- **Décision**: corriger un crash Turbopack dû à un texte `"<2 min"` interprété comme du JSX.
- **Changements UI**:
  - Step 4 (Photos V2): micro-copy affichée comme `&lt;2 min` au lieu de `<2 min` (corrigé sur toutes les occurrences).
- **Tracking / payload**:
  - Aucun changement.
- **Risques / points à vérifier sur staging**:
  - Aucun (pure correction de build).

### 2026-01-22 — V2 Step 4: micro-ajustements UI (copy + logo mock WhatsApp)

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-tweak)
- **Décision**: alléger encore la Step 4 (photos only) en retirant une phrase de friction et en renforçant la crédibilité visuelle dans le mock WhatsApp.
- **Changements UI** (flag V2 uniquement):
  - Step 4: suppression du texte “Un conseiller Moverz vérifie votre dossier avant l’envoi.”
  - Mock WhatsApp: remplacement du “M” par le logo Moverz (`/public/icon.png`) dans l’avatar.
- **Tracking / payload**:
  - Aucun changement.

### 2026-01-22 — V2 Step 4: carte “gain” basée sur la fourchette + -10% (impact photos)

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-savings-range)
- **Décision**: mieux matérialiser l’impact des photos en réutilisant la fourchette d’estimation (Step 2) et en affichant un avant/après premium avec une hypothèse de réduction de ~10%.
- **Changements UI** (flag V2 uniquement):
  - Remplacement de “Vous économisez XX€” par “Gagnez X–Y€ en 5 minutes en ajoutant des photos”.
  - Affichage de l’avant/après: `Estimation (min–max)` → `Avec photos (min–max) (-10%)`.
- **Tracking / payload**:
  - Aucun changement.

### 2026-01-22 — V2 Step 4: restyle carte impact photos (look & feel premium Moverz)

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-premium-restyle)
- **Décision**: rendre la carte “gain” plus premium (moins “promo”), mieux alignée au style Moverz (badge soft, typo plus sobre, avant/après lisible).
- **Changements UI** (flag V2 uniquement):
  - Carte impact photos: suppression du gros titre “GAGNEZ” + réduction hiérarchie, ajout d’un badge “Impact des photos”, chiffres plus sobres (tabular nums), et avant/après en lignes compactes avec badge “-10%”.
  - Refonte visuelle: layout “dashboard” (gain potentiel à gauche, avant/après à droite), accent gradient discret, copy plus tech (“devis plus précis / moins de marge”).
  - Nouvelle itération “push photos”: carte plus “WOW” (bloc premium sombre avec économie potentielle), et détails avant/après + hypothèse en accordéon (“Voir le détail”) pour réduire le texte visible.

### 2026-01-22 — V2 Step 4: upload desktop premium (drag & drop branché)

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-dropzone)
- **Décision**: réduire la friction desktop en branchant un upload “drag & drop” directement en Step 4, avec feedback premium (préviews, état upload, erreurs).
- **Changements UI** (flag V2 uniquement):
  - Step 4: remplacement du simple bouton “Depuis cet ordinateur” par une **dropzone** (glisser-déposer + picker).
  - Prévisualisation de la dernière sélection, état “envoi en cours”, résumé upload (nb envoyées) et erreurs.
  - Accès conservé à `/upload-photos` via CTA “Ouvrir l’analyse (optionnel)”.
- **Notes techniques**:
  - Upload branché sur `uploadBackofficePhotos(backofficeLeadId, files)` (Back Office) — pas de nouveau schéma DB.

### 2026-01-22 — V2 Step 4: mock WhatsApp (avatar sans vert)

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-mock-avatar)
- **Décision**: éviter le vert “WhatsApp” trop présent dans le mock et rester aligné au style Moverz.
- **Changements UI** (flag V2 uniquement):
  - Avatar du mock WhatsApp: fond blanc + bordure soft (au lieu de vert).

### 2026-01-22 — V2 Step 4: suppression titre redondant + mock plus WhatsApp

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-whatsapp-mock)
- **Décision**: éviter la redondance de titres (un seul hero H1) et rendre le mock plus crédible WhatsApp.
- **Changements UI** (flag V2 uniquement):
  - En-tête: "Envoyez vos photos…" devient une microcopy (le hero "Photographiez…" reste le titre principal).
  - Mock: remplacement de "iMessage" par "Message", couleur bouton envoi WhatsApp, fond chat WhatsApp.
  - **Itération mockup**: ajout de **plusieurs photos réalistes** (3 envois successifs: Salon 3 photos, Cuisine 4 photos, Chambres+SdB 3 photos) pour montrer concrètement le flow d'envoi par pièce. Total ~10 photos visibles avec effets de profondeur (radial-gradient) pour rendre les vignettes plus réalistes.

### 2026-01-22 — V2 Step 4: refonte complète carte Impact Photos (design hero premium)

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-hero-impact)
- **Décision**: transformer la carte "Impact des photos" en un élément **ultra-premium, émotionnel et tech** pour maximiser la conversion photo. Le gain potentiel devient un "hero number" géant sur fond sombre, avec des effets visuels type dashboard fintech.
- **Changements UI** (flag V2 uniquement):
  - **Fond sombre premium**: gradient `from-[#0F172A] via-[#1E293B] to-[#0F172A]` avec bordure lumineuse (effet de 2px), ombres profondes.
  - **Hero number**: gain potentiel (64-172€) en **text-8xl** centré, avec effet de glow lumineux derrière (blur-2xl + bg-[#6BCFCF]/20).
  - **Wording actionnable**: "**Gagnez XXX€**" (au lieu de "économie potentielle") + "en ajoutant vos photos maintenant" → message direct et émotionnel.
  - **Badge animé**: "-10% estimé" avec point qui pulse + bordure lumineuse Moverz.
  - **Comparaison repliable élégante**: bouton "Voir comment on calcule" avec icône rotate + accordéon smooth qui révèle l'avant/après (Estimation actuelle / Avec photos) + explication de la logique.
  - **Glassmorphism**: section détail sur fond `bg-white/5 backdrop-blur-xl border-white/10`.
  - **Micro-animations**: pulse sur le badge, glow derrière le chiffre principal, transitions fluides.
- **Objectif UX**: 
  - Créer un effet "WOW" immédiat (le chiffre en énorme).
  - Rendre la carte très premium/tech (type fintech dashboard).
  - Pousser émotionnellement à ajouter des photos via l'impact visuel du gain + wording direct ("Gagnez").
- **Tracking / payload**:
  - Aucun changement.
- **Notes design**:
  - Le design est maintenant beaucoup plus proche d'un dashboard moderne (type Stripe/Vercel) avec des effets de lumière, des gradients subtils, et une hiérarchie visuelle forte.
  - L'accordéon permet de garder la carte simple par défaut tout en offrant les détails pour les users curieux.
  - Le wording "Gagnez" est beaucoup plus actionnable et émotionnel que "économie potentielle" (moins comptable, plus motivant).

### 2026-01-22 — V2 Step 4: refonte UX seamless - CTA above fold, adapté mobile/desktop

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-seamless)
- **Décision**: rendre le CTA photo **immédiatement accessible** (above the fold) et **adapter l'UX au device** pour maximiser la conversion. Le flow doit être seamless sans scroll inutile.
- **Changements UI** (flag V2 uniquement):
  - **Layout mobile** (refonte complète):
    - Header "Dernière étape" + titre compact
    - **CTA WhatsApp principal** (above the fold, immédiat) avec microcopy "Le lien s'ouvre dans WhatsApp"
    - Carte "Gagnez XXX€" (motivation)
    - Option secondaire : "Ajouter depuis ce téléphone" (file input mobile avec `capture="environment"`)
    - Upload summary + erreurs inline
  - **Layout desktop** (refonte complète):
    - Header "Dernière étape" + titre
    - Grid 2 colonnes : carte "Gagnez XXX€" + mockup iPhone (compact)
    - **Option 1**: "Recevoir le lien WhatsApp par email" (nouveau CTA premium avec gradient border)
    - **Option 2**: Dropzone drag & drop (existant, amélioré) avec previews + upload status
    - Section "Prochaines étapes" en bas
- **Fonctionnalités**:
  - Ajout de `handleSendWhatsAppEmail()` pour envoyer le lien WhatsApp par email (desktop) → **TODO: brancher l'API réelle**
  - Mobile: `capture="environment"` sur le file input pour ouvrir directement la caméra
  - Desktop: dropzone avec drag & drop + previews + status
  - Tout reste **branché à la DB** via `leadId`, `linkingCode`, `uploadBackofficePhotos(leadId, files)`
- **Objectif UX**:
  - **Mobile**: CTA WhatsApp immédiat, pas de scroll pour atteindre l'action principale
  - **Desktop**: choix entre "recevoir par email" (pour continuer sur mobile) ou upload direct
  - Flow seamless adapté au device, réduction du drop
- **Tracking / payload**:
  - Source tracking: `tunnel-v2-mobile` pour mobile, `tunnel-v2` pour desktop WhatsApp email
  - Upload toujours via `uploadBackofficePhotos(backofficeLeadId, files)` → DB inchangée
- **Notes techniques**:
  - Composant `ImpactCard` extrait en sous-composant réutilisable
  - Conditional rendering `if (mounted && isMobile)` pour séparer mobile/desktop
  - TODO: créer l'API route pour l'envoi d'email WhatsApp (actuellement simulé avec setTimeout)

### 2026-01-22 — V2 Step 4: mockup WhatsApp animé + photos réalistes

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-mockup-animated)
- **Décision**: rendre le mockup iPhone **vivant et engageant** avec des animations progressives type chat réel + des photos plus réalistes.
- **Changements UI** (flag V2 desktop uniquement):
  - **Animation progressive du chat** (loop infini):
    1. Message initial apparaît (fadeInUp)
    2. Typing indicator (3 dots qui pulsent)
    3. Photos apparaissent en grid (fadeInUp)
    4. Check marks (✓✓)
    5. Réponse finale (fadeInUp)
    6. Reset et recommence
  - **Photos ultra-réalistes**:
    - Effets de lumière (radial-gradient pour simuler fenêtres/lampes)
    - Ombres et profondeur (zones sombres en bas/coins)
    - Highlights (points lumineux blancs)
    - 4 photos: Salon (tons chauds), Cuisine (tons bleus), Chambre (tons roses), SdB (tons verts)
  - **Timing précis**: 800ms → 1500ms → 2200ms → 3000ms → 5000ms (reset)
- **Objectif UX**:
  - Montrer concrètement le flow d'envoi WhatsApp
  - Rendre le mockup **engageant et vivant** (pas statique)
  - Rassurer sur la simplicité du process
- **Notes techniques**:
  - Ajout de `mockupAnimationStep` state (0-4)
  - useEffect avec timers pour gérer la timeline d'animation
  - Keyframes CSS custom (`fadeInUp`, `fadeIn`) via style dangerouslySetInnerHTML
  - Animation loop automatique (desktop only, pas sur mobile pour économiser ressources)

### 2026-01-22 — V2 Step 4: allègement design (turquoise Moverz) + CTA desktop prioritaire

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-lighten)
- **Décision**: alléger la perception visuelle de la dernière étape (moins “lourd/marketing”), remettre le **CTA WhatsApp** comme action principale desktop (sans scroll) et basculer la carte “gain” sur un style **light premium** avec turquoise Moverz.
- **Changements UI** (flag V2 uniquement):
  - Carte “Impact des photos”:
    - Passage d’un fond dark à une carte **claire** (`bg-white`, bordure fine, ombre soft).
    - Accent turquoise subtil (barre en haut + halos très légers).
    - Badge `-10% estimé` en pill turquoise soft.
    - Accordéon conservé mais rendu plus discret/clean.
  - Desktop:
    - Ajout du CTA WhatsApp **au-dessus** du fold (QR modal via `WhatsAppCTA`).
    - L’option “email” devient un bouton secondaire qui ouvre le client mail (mailto) avec lien WhatsApp pré-rempli.
- **Wording / titre**:
  - Rétablissement du badge **“Dossier créé”** (pill turquoise) sur Step 4 (mobile + desktop).
  - Remplacement du titre par **“Photographiez toutes vos pièces”** + micro-instructions “3–8 photos par pièce…”, plus actionnable et cohérent avec l’objectif photo-only.
- **Itération conversion Step 4 (actions dominantes + charge cognitive)**:
  - **1 action dominante** : CTA WhatsApp explicite “Envoyer mes photos sur WhatsApp” (recommandé) via `WhatsAppCTA(label, sublabel)`.
  - **Réassurance** sous CTA : “🔒 0 spam • ⏱ < 2 min” + mention stop à tout moment.
  - **Gain allégé** : remplacement du gros bloc “gain” par un badge turquoise “Ajoutez des photos → gagnez jusqu’à X€” + détail repliable.
  - **Mockup** : ajout d’un mini-step visible “Envoyez vos photos → on s’occupe du reste”.
  - **Dropzone** : clarifications “Une pièce = …” + “Formats … jusqu’à 10 Mo”, et affichage des erreurs (fichiers trop lourds, etc.).
  - **Timeline** : “Prochaines étapes” devient une mini timeline 1-2-3 plus projetante, wording plus humain (“On prépare automatiquement votre dossier…”).
- **DB / Linking**:
  - Le lien WhatsApp contient toujours `LEAD:<leadId>` (rattachement BO) + `Code dossier` si présent.
  - Upload desktop/mobile toujours via `uploadBackofficePhotos(leadId, files)`.
- **Notes techniques**:
  - Fix animation mockup: boucle via `runCycle()` + timeouts, sans re-créer de timers à chaque step (évite le leak).

### 2026-01-22 — V2 Step 4: refonte ultra-minimaliste (suppression UI surchargée)

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-radical-simplify)
- **Décision**: après feedback "c'est ultra moche, y'a rien qui va", **supprimer 80% des éléments** pour créer une version **ultra-simple, aérée et premium**. Exit: box "1 action", mockup iPhone, preuve sociale fake, badge gain en double, micro-copy partout.
- **Changements UI** (flag V2 uniquement):
  - **Supprimé** (trop lourd):
    - Grid 2 colonnes (impact card dark + mockup iPhone)
    - Box "1 action, et c'est fait" (redondante avec le reste)
    - Mockup iPhone animé (prend trop de place pour rien)
    - Preuve sociale "12 483 dossiers envoyés • ⭐ 4,8/5" (fait fake)
    - Badge gain affiché 2× (dédoublonnage)
    - Carte impact dark (fond noir/gradient) → trop lourd visuellement
    - Micro-copy "Recommandé" / "< 2 min" au-dessus du CTA (redondant)
    - Toutes les animations mockup + timers (inutiles maintenant)
  - **Conservé** (essentiel uniquement):
    - Badge "Dossier créé" (pill turquoise, rassure)
    - Titre "Ajoutez vos photos" (clair, actionnable)
    - Sous-titre "3–8 photos par pièce • angles larges • bonne lumière"
    - **1 badge gain** (turquoise) : "💰 Gagnez jusqu'à XXX€" (1 seule fois, pas de double)
    - **1 CTA WhatsApp** (principal, vert, gros, via `WhatsAppCTA`)
    - Micro-copy sous CTA : "🔒 0 spam • < 2 min"
    - Alternatives secondaires (email / dropzone) très discrètes (séparateur "ou", pas de gros blocs)
    - Timeline "Ensuite" (3 steps : envoi → préparation auto → devis 48-72h)
  - **Layout**:
    - Desktop: centré `max-w-2xl mx-auto`, espacement généreux (`space-y-10`)
    - Mobile: idem, layout vertical simple
    - Beaucoup d'**espace blanc** (breathing room)
  - **Palette**: turquoise Moverz partout (badge, gain, dropzone hover), vert WhatsApp uniquement sur le bouton WhatsApp (cohérence)
- **Objectif UX**:
  - **1 action dominante** (WhatsApp) sans concurrence visuelle
  - **Hiérarchie ultra-nette** (badge → titre → gain → CTA → alternatives → timeline)
  - **Premium/aéré** (typographie respirable, shadows subtiles, **pas de gros blocs sombres**)
  - **Conversion** (moins de friction cognitive, clarté immédiate, scroll minimal)
- **Tracking / payload**:
  - Source tracking: `tunnel-v2-desktop` / `tunnel-v2-mobile`
  - Upload toujours via `uploadBackofficePhotos(leadId, files)` → DB inchangée
  - WhatsApp garde `LEAD:<leadId>` + code dossier → rattachement BO OK
- **Notes techniques**:
  - Code réduit de ~400 lignes (suppression mockup + animations + grid + box "1 action")
  - Email WhatsApp: `mailto:` avec lien WhatsApp pré-rempli (pas de backend, pas de "simulé")
  - Dropzone: validation fichiers > 10 Mo + affichage erreur inline

### 2026-01-22 — V2 Step 4: réintégration mockup iPhone pédagogique (3-4 photos salon)

- **Date**: 2026-01-22
- **Auteur**: (v2-step4-mockup-pedagogy)
- **Décision**: réintégrer le mockup iPhone de manière **discrète et pédagogique** pour montrer concrètement comment envoyer **3-4 photos d'une même pièce** (exemple: salon), avec animation progressive.
- **Changements UI** (flag V2 desktop uniquement):
  - Ajout du mockup iPhone **en bas** (après les CTAs, avant la timeline).
  - Titre au-dessus : "Exemple : 3-4 photos de votre salon" (contexte clair).
  - **Animation progressive** (loop) :
    1. Message "Envoyez 3-4 photos de votre salon 📸"
    2. Photo 1 (salon vue large) apparaît
    3. Photos 2 & 3 (salon angles différents) apparaissent en grid 2×1
    4. Photo 4 (salon détail) apparaît
    5. Check marks ✓✓
    6. Réponse "Parfait! 🎉 Faites pareil pour chaque pièce"
    7. Reset et loop
  - **Photos réalistes** (salon uniquement, via Unsplash):
    - Photo 1: vue large salon moderne (canapé, déco)
    - Photos 2 & 3: angles différents (zoom meubles, vue diagonale)
    - Photo 4: détail salon (table basse, plantes)
    - URLs Unsplash optimisées (`w=400&h=400&fit=crop&q=80`)
  - Mockup plus compact (`max-w-[300px]`) et discret (pas de grid, juste centré).
- **Objectif UX**:
  - **Pédagogie**: montrer concrètement "3-4 photos **par pièce**" (pas juste "envoyer des photos")
  - **Projection**: l'utilisateur voit exactement ce qu'il doit faire
  - **Réassurance**: le flow WhatsApp est simple et rapide
- **Notes techniques**:
  - Timeline animation : 600ms → 1200ms → 1800ms → 2400ms → 3200ms → reset 5500ms
  - Animation desktop only (économise ressources mobile)

### 2026-01-21 — Retrait badge "TEST" (staging)

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

