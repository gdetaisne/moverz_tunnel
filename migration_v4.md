# Migration V4 — journal de refonte UX/UI

## 2026-02-13 — Fix scroll Step 3 (itération 2): interdiction des auto-scrolls vers le bas

**Retour utilisateur** :
- Malgré le premier correctif, la validation de bloc pouvait encore renvoyer trop bas dans le formulaire.

**Ajustement** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Durcissement de la logique d'auto-scroll post-validation:
  - l'auto-scroll est désormais autorisé uniquement si la cible est au-dessus du viewport,
  - aucun auto-scroll n'est effectué si la cible est plus bas (`no-scroll-down`).

**Impact** :
- Suppression des descentes automatiques non souhaitées.
- L'utilisateur garde le contrôle de la progression vers le bas.

---

## 2026-02-13 — Step 3: formule non pré-remplie côté UI (calcul inchangé)

**Retour UX** :
- Des champs paraissaient encore pré-sélectionnés visuellement alors qu'ils servent seulement de base de calcul.

**Correction ciblée** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Découplage explicite pour la formule:
  - le calcul panier peut rester basé sur `STANDARD` par défaut,
  - mais côté UI la formule n'est plus considérée `validée` tant qu'il n'y a pas de choix explicite utilisateur.
- Résumé du bloc formule ajusté:
  - avant choix explicite: `À choisir` (au lieu de `Standard (par défaut)`).

**Impact** :
- Plus de pré-saisie perçue côté UI.
- Cohérence avec la règle: défauts de calcul invisibles tant que non confirmés par l'utilisateur.

---

## 2026-02-13 — Fix scroll auto Step 3: suppression des sauts trop bas

**Retour utilisateur** :
- Après validation d'un champ/bloc, le viewport descendait trop bas dans le formulaire.

**Analyse** :
- Le scroll auto post-validation utilisait un centrage (`block: "center"`), trop agressif sur mobile après collapse des cards.
- Des déclenchements rapprochés pouvaient amplifier l'effet de saut.

**Correction** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Remplacement du `scrollIntoView(..., block: "center")` par un `window.scrollTo` contrôlé:
  - alignement sur le haut du header cible (offset ~16px),
  - skip si la cible est déjà bien positionnée dans le viewport.
- Ajout d'une garde anti-scroll répété (anti double-trigger court) pour éviter les enchaînements de sauts.
- Skip des micro-déplacements (<24px) pour éviter les animations inutiles.

**Impact** :
- Navigation plus stable à la validation.
- Réduction nette des "descendes trop basses" sur mobile.

---

## 2026-02-13 — Fix build prod: ternaire JSX invalide dans Step 3

**Incident** :
- Le build prod échouait sur `components/tunnel/v2/StepAccessLogisticsV4.tsx` avec erreur de parse Turbopack:
  - `Expected '</', got ':'` autour de la ligne du résumé de header de bloc.

**Cause** :
- Expression JSX invalide (`: !isOpen && (...) : null`) introduite dans un ternaire.

**Correction** :
- Remplacement par un ternaire valide:
  - `: !isOpen ? (...) : null`

**Impact** :
- Compilation TypeScript/Next débloquée.
- Aucun impact fonctionnel hors correction de syntaxe.

---

## 2026-02-13 — Step 3: statut validé affiché en icône uniquement

**Demande UI** :
- Remplacer le texte vert `Validé` par le petit symbole de validation déjà utilisé.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Headers de blocs: quand un bloc est validé, le libellé texte est masqué et seule l'icône `check` est affichée.
- Bloc `Ajouter des précisions`: même logique (icône seule quand validé).

**Impact** :
- Interface plus compacte et plus homogène visuellement.

---

## 2026-02-13 — Step 3 mobile: blocs validés resserrés + bloc précisions aligné au même format

**Demande UX** :
- Resserer visuellement les blocs terminés pour alléger l'écran final.
- Mettre `Ajouter des précisions` au même format que les autres blocs.

**Modifications** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Headers des blocs validés/repliés compacts (`py` réduit) pour diminuer la hauteur totale.
- Refonte du bloc `Ajouter des précisions` :
  - header de même pattern que les autres blocs (titre + sous-texte + statut à droite),
  - statuts harmonisés (`Verrouillé`, `Facultatif`, `En cours`, `Validé`),
  - contenu affiché dans une card dédiée uniquement quand le bloc est ouvert.

**Impact** :
- Écran final plus lisible, plus compact.
- Cohérence visuelle des blocs Step 3 renforcée.
- Aucun impact BO/Prisma/tracking/payload.

---

## 2026-02-13 — Step 3 mobile: mode soft de déverrouillage séquentiel des blocs

**Décision UX** :
- Activer un mode "soft" : les blocs suivants sont visibles mais compressés/verrouillés tant que le bloc précédent n'est pas validé.

**Implémentation** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Ajout d'une logique `sectionLocked` basée sur la complétude séquentielle:
  - `Date` verrouillé tant que `Trajet` n'est pas validé,
  - `Volume` verrouillé tant que `Date` n'est pas validé,
  - `Formule` verrouillé tant que `Volume` n'est pas validé,
  - `Coordonnées` verrouillé tant que `Formule` n'est pas validé.
- Les en-têtes verrouillés:
  - apparaissent grisés,
  - affichent `Verrouillé`,
  - montrent le message `Terminez le bloc précédent pour débloquer`,
  - ne sont pas cliquables.
- Le bloc `Ajouter des précisions (facultatif)` est verrouillé tant que `Volume & densité` n'est pas validé.
- Auto-collapse des sections verrouillées pour garder une page compacte.

**Impact** :
- Parcours plus guidé, charge cognitive réduite.
- Le client voit la suite mais reste focalisé sur l'étape en cours.
- Aucun changement backoffice/tracking/payload.

---

## 2026-02-13 — Bloc "Ajouter des précisions": ajout bouton de validation explicite

**Retour UX** :
- Le bloc `Ajouter des précisions` restait en `En cours` et n'avait pas de mécanisme explicite pour passer en `Validé`.

**Correction** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Ajout d'un bouton bas de bloc: `Valider ces précisions`.
- Clic sur ce bouton:
  - marque le bloc en `Validé`,
  - referme le dépliant.
- Header du bloc enrichi avec un statut visible:
  - `Facultatif` (au repos),
  - `En cours` (panneau ouvert),
  - `Validé` (après confirmation).
- Si l'utilisateur modifie ensuite contraintes/notes/photos, le statut repasse automatiquement à non-validé.

**Impact** :
- Feedback de complétude clair et actionnable pour ce bloc.
- Aucun impact BO/Prisma/tracking.

---

## 2026-02-13 — Step 3: appartement non validable sans choix explicite d'étage

**Retour UX** :
- Le bloc trajet pouvait passer `Validé` juste après clic `Appartement`, même sans choix explicite d'étage (RDC implicite).

**Corrections** :

`components/tunnel/v2/StepAccessLogisticsV4.tsx`
- Ajout des props `originFloorTouched` / `destinationFloorTouched`.
- Validation étage durcie pour un appartement:
  - valide seulement si étage renseigné **et** choix explicite utilisateur,
  - exception conservée pour reprises avec étage non-RDC déjà présent.
- Clic sur `Appartement`:
  - reset de l'étage (`""`),
  - reset du flag touched étage (`false`) pour forcer un choix explicite (RDC inclus).

`app/devis-gratuits-v3/page.tsx`
- Passage des flags `originFloorTouched` et `destinationFloorTouched` au composant Step 3.

**Impact** :
- Le statut `Validé` n'arrive plus trop tôt sur logement appartement.
- L'utilisateur doit explicitement confirmer l'étage, comme attendu.

---

## 2026-02-13 — Dock reward: "dernier impact" aligné avec la ligne détail réellement modifiée

**Retour UX** :
- Le libellé `Dernier impact` pouvait afficher `Formule` alors qu'une autre ligne (ex: `Date`) était la vraie variation perçue.

**Correction** (`components/tunnel-v4/SmartCart.tsx`) :
- Recalcul du dernier impact basé sur les deltas entre ancien et nouveau panier.
- En cas de plusieurs lignes modifiées simultanément:
  - priorité aux lignes non-`formule`,
  - puis sélection de la ligne avec le delta absolu le plus fort.
- Libellé dock harmonisé: `Impact {ligne}` (ex: `Impact date`).

**Impact** :
- Le dock reflète mieux la ligne détail responsable de la variation de prix.

---

## 2026-02-13 — Step 3 mobile: dock reward ancré bas + marge formulaire augmentée

**Retour UI** :
- Le dock (`progression + budget affiné + dernier impact`) apparaissait trop haut.
- Il pouvait masquer des éléments de fin de formulaire (email / CTA) en mobile.

**Corrections** :

`components/tunnel-v4/SmartCart.tsx`
- Dock mobile repositionné tout en bas:
  - base `bottom` abaissée (`8px`),
  - prise en compte de la safe-area iOS via `env(safe-area-inset-bottom)`.
- Conservation d'un léger rehaussement uniquement quand le clavier est ouvert.

`components/tunnel/v2/StepAccessLogisticsV4.tsx`
- Ajout de marge basse structurelle au formulaire (`pb-44`, `sm:pb-24`) pour éviter le masquage des champs/CTA finaux.

**Impact** :
- Dock visuellement collé en bas comme attendu.
- Email et CTA restent accessibles/visibles en fin de parcours mobile.

---

## 2026-02-13 — Step 3 mobile: auto-scroll bloc ajusté + formule standard non surlignée par défaut

**Retours terrain** :
1. À la validation d'un bloc, le scroll automatique descendait parfois trop bas.
2. La formule `STANDARD` était visuellement affichée comme sélectionnée par défaut, alors qu'elle doit rester une base de calcul sans surlignage initial.

**Corrections** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Auto-scroll bloc:
  - ciblage du header de section (`v4-header-*`) au lieu d'un conteneur plus large,
  - scroll différé après stabilisation du layout,
  - scroll exécuté uniquement si la section suivante n'est pas déjà confortablement visible.
- Formule:
  - introduction d'un état `formuleExplicitChoice`,
  - tant que l'utilisateur n'a pas explicitement choisi, `STANDARD` n'est pas visuellement surlignée,
  - le calcul budget reste basé sur `STANDARD` par défaut (inchangé).

**Impact** :
- Navigation entre blocs plus naturelle, sans "saut" excessif.
- UX formule alignée avec l'intention produit (default métier sans pré-sélection visuelle).
- Aucun changement BO/Prisma/tracking/payload.

---

## 2026-02-13 — Step 1 villes: retry API BAN + CP requis

**Incident** :
- Échecs intermittents `504 (Gateway Timeout)` sur `api-adresse.data.gouv.fr` en Step 1.
- Dans certains cas, la ville pouvait être sélectionnée sans CP exploitable.

**Corrections** :

`components/tunnel/AddressAutocomplete.tsx`
- Ajout d'un `fetchWithRetry` avec backoff exponentiel léger pour les erreurs réseau/`429`/`5xx` côté BAN.
- Fallback d'extraction du code postal (`\d{5}`) depuis le libellé/résultat/requête si le provider n'en renvoie pas explicitement.

`components/tunnel/v2/StepQualificationV4.tsx`
- Validation renforcée: ville **et code postal** requis (en plus des coords).
- Message d'erreur explicite: `code postal requis`.

`app/devis-gratuits-v3/page.tsx`
- `handleSubmitQualificationV2` exige maintenant aussi `originPostalCode` et `destinationPostalCode`.
- Correction des IDs de focus (V4): `v4-origin-city`, `v4-destination-city`, `v4-surface-m2`.

**Impact** :
- Meilleure résilience aux timeouts BAN.
- Le tunnel ne laisse plus passer une étape 1 sans code postal.
- Aucun changement BO/Prisma/tracking.

---

## 2026-02-13 — Step 3 mobile: B + D (blocs auto-réductibles + dock reward fixe)

**Contexte UX** :
- La Step 3 est volontairement riche (champs majoritairement non facultatifs, ordre métier conservé).
- Objectif: réduire la perception de longueur, renforcer le sentiment d'avancement et matérialiser le système reward.

**Implémentation B (structure premium)** :

`components/tunnel/v2/StepAccessLogisticsV4.tsx`
- Ajout d'états de section (`trajet`, `date`, `volume`, `formule`, `contact`) avec statut:
  - `Validé`
  - `En cours`
  - `À compléter`
- Ajout d'en-têtes de sections cliquables avec résumé compact quand section fermée.
- Auto-réduction des sections validées + ouverture automatique de la prochaine section incomplète.
- Scroll guidé vers la section suivante lors d'une validation de bloc.
- Aucun champ supprimé, aucun ordre métier modifié.

**Implémentation D (dock reward fixe mobile)** :

`components/tunnel-v4/SmartCart.tsx`
- Remplacement du FAB mobile par un dock fixe bas d'écran contenant:
  - progression dossier (`X/Y`)
  - score de précision (`%`)
  - budget affiné live
  - dernier impact (ligne et montant)
- Tap dock => ouverture du drawer.
- Drawer enrichi avec mini synthèse:
  - progression
  - barre de précision
  - historique des 3 derniers impacts.
- Gestion viewport mobile conservée (position dynamique et clavier).

`app/devis-gratuits-v3/page.tsx`
- Calcul d'un `step3Progress` métier (5 blocs) et passage au `SmartCart`:
  - `progressCompleted`
  - `progressTotal`
  - `precisionScore`

**Impact** :
- Perception de tunnel plus courte sans retirer d'information.
- Sensation d'avancement continue et explicite.
- Reward rendu concret: chaque clarification alimente un feedback lisible.
- Tracking/payload/backoffice inchangés.

---

## 2026-02-13 — Step 3 mobile: retrait du bandeau "Progression Step 3"

**Demande** :
- Retirer le bandeau de progression mobile ajouté en haut de la Step 3.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Suppression complète du bloc UI `Progression Step 3` (pills Trajet/Date/Volume/Formule/Contact).

**Impact** :
- Interface Step 3 mobile allégée, sans ce bandeau.
- Le reste des améliorations récentes est conservé (validation progressive, ergonomie panier mobile, bouton photo densité).

---

## 2026-02-13 — Step 3 mobile: bouton photo densité visible

**Demande** :
- Ajouter le bouton photo densité aussi en mobile dans le bloc `Volume & densité`.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Le bouton qui ouvrait le flux photo densité (caché en mobile avec `hidden sm:flex`) est désormais visible sur tous les écrans.
- En mobile: bouton sur une ligne dédiée (`col-span-3`) avec libellé `Photo densité`.
- En desktop: conserve un rendu compact sur une colonne (`sm:col-span-1`) avec icône.

**Impact** :
- Le flux photo densité est accessible immédiatement sur mobile, sans détour.
- Aucun changement logique backoffice/tracking/payload.

---

## 2026-02-13 — Step 3 mobile: charge cognitive réduite + validation progressive + ergonomie FAB sécurisée

**Objectif** :
- Appliquer 3 priorités UX mobile Step 3 sans changer la logique métier ni le tracking.

**Modifications** :

1) **Réduction charge cognitive (P0)** — `components/tunnel/v2/StepAccessLogisticsV4.tsx`
- Ajout d'un bandeau mobile `Progression Step 3` avec 5 repères (`Trajet`, `Date`, `Volume`, `Formule`, `Contact`).
- Chaque repère indique l'état (`✓`) selon la complétude du bloc.
- Tap sur un repère => scroll vers la section concernée.
- Ajout d'ancres de section: `v4-section-trajet`, `v4-section-date`, `v4-section-volume`, `v4-section-formule`, `v4-section-contact`.

2) **Validation progressive au fil de l'eau (P0)** — `components/tunnel/v2/StepAccessLogisticsV4.tsx`
- Ajout d'un état `touched` par champ critique (adresses, date, densité, cuisine, électroménager, prénom, email).
- Les erreurs n'attendent plus uniquement le submit global:
  - affichage si `showValidation` (comportement existant),
  - ou si le champ a été touché (`touched`).
- Intégration de `markTouched(...)` sur les interactions clés (input/blur/click).

3) **Ergonomie fixe bas d'écran sécurisée (P1)** — `components/tunnel-v4/SmartCart.tsx`
- Ajout d'une gestion mobile via `visualViewport`:
  - détection clavier ouvert,
  - adaptation offset bas du FAB panier.
- Quand le CTA principal Step 3 est visible (`#v4-primary-submit-cta`), le FAB panier est masqué (un seul CTA prioritaire).
- Le FAB reste visible hors zone CTA, avec comportement drawer inchangé.

**Correctif UX associé** — `app/devis-gratuits-v3/page.tsx`
- Focus de validation cuisine corrigé: `v2-kitchen-appliance-count` -> `v4-kitchen-count`.

**Impact** :
- Parcours mobile plus lisible et orienté action.
- Feedback erreur plus précoce, moins brutal au submit.
- Moins de collisions visuelles CTA/FAB/clavier en bas d'écran.
- Aucun changement payload BO, endpoints, `logicalStep`, `screenId` ou GA4.

---

## 2026-02-13 — Renommage libellé bloc retour IA

**Demande** :
- Le bloc ne doit pas s'appeler "densité de meubles", mais "contraintes particulières".

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Libellé du bloc uniformisé en `Retour IA (contraintes particulières)`.

**Impact** :
- Intitulé aligné avec le wording métier demandé.

---

## 2026-02-13 — Hotfix build: correction `lines` avant déclaration (Step 3 panier)

**Incident** :
- Build KO en prod (`Block-scoped variable 'lines' used before its declaration`) dans `app/devis-gratuits-v3/page.tsx`.

**Cause** :
- La réintroduction de la ligne "Distance" avait été injectée avant la déclaration du tableau `lines`.

**Correction** :
- Suppression du `lines.push(distance)` dans la zone amont.
- Réinsertion du push distance juste après la déclaration de `lines` (ordre logique des détails conservé).

**Impact** :
- Build rétabli.
- Détail distance conservé sans casser la compilation.

---

## 2026-02-13 — Panier Step 3: rétablissement du détail Distance sans refaire bouger le montant

**Constat** :
- Après le gel anti-refresh de l'estimation, la ligne de détail distance n'apparaissait plus après saisie des adresses.

**Correction** (`app/devis-gratuits-v3/page.tsx`) :
- Le montant global reste figé sur la distance baseline (pas de refresh sur chaque lettre).
- La ligne `Distance` est de nouveau calculée à partir de l'OSRM quand les adresses sont valides.
- Cette ligne redevient visible dans les détails, sans réintroduire l'instabilité du prix principal.

**Impact** :
- UX stable sur le prix.
- Détails cohérents dès que les adresses sont correctement renseignées.

---

## 2026-02-13 — Fix: upload photo densité sans ouverture du bloc "Ajouter des précisions"

**Bug constaté** :
- En ajoutant une photo via le bouton densité, le bloc "Ajouter des précisions" s'ouvrait encore.

**Cause racine** :
- `openDensityPhotoFlow()` forçait `setShowMissingInfoPanel(true)` + tab `photos`.

**Correction** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Suppression de l'ouverture forcée du panneau pour le flux densité.
- Ajout d'un input file caché dédié au flux densité (monté hors du bloc).
- Le bouton densité déclenche directement ce picker caché.

**Impact** :
- Ajouter une photo pour la densité n'ouvre plus le bloc "Ajouter des précisions".
- Le client reste dans le parcours principal sans rupture visuelle.

---

## 2026-02-13 — Ne plus ouvrir automatiquement "Ajouter des précisions" en Step 3

**Demande** :
- Ne pas ouvrir automatiquement le bloc "Ajouter des précisions" sur cette étape, même après analyse photo contraintes, pour éviter de perdre le client.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- État initial `showMissingInfoPanel` remis à `false` (bloc fermé par défaut).

**Impact** :
- Le bloc ne s'ouvre plus automatiquement à l'arrivée sur l'étape.
- Il reste accessible uniquement par action explicite utilisateur.

---

## 2026-02-13 — Chaînage densité -> contraintes (prompts dédiés, non mélangés)

**Demande** :
- Si photo ajoutée en partie contraintes: utiliser le prompt contraintes dédié.
- En flux densité: après retour densité (sélection + justification), lancer aussi l'analyse contraintes dédiée.
- Ne jamais mélanger les retours densité et contraintes.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- `analyzePhotosLive` accepte désormais un contexte forcé (`density` ou `specific_constraints`).
- Upload en contexte contraintes => appel du prompt contraintes uniquement.
- Upload en contexte densité => appel densité, puis second appel automatique contraintes sur les mêmes photos.
- Suppression photo en contexte densité => même chaînage (densité puis contraintes) pour garder les 2 retours synchronisés.

**Impact** :
- Séparation claire des retours:
  - densité -> commentaire densité,
  - contraintes -> retour IA contraintes.
- Plus de confusion entre les deux analyses.

---

## 2026-02-13 — Panier Step 3: stop refresh pendant saisie adresse

**Demande** :
- L'estimation ne doit pas se rafraîchir à chaque lettre dans les adresses.
- L'estimation doit bouger uniquement quand une valeur "Détails" change.

**Modification** (`app/devis-gratuits-v3/page.tsx`) :
- Dans `v2PricingCart`, suppression de l'usage de la distance OSRM live en Step 3.
- Le calcul est désormais figé sur `rewardBaselineDistanceKm` (distance baseline capturée).
- Le recalcul reste actif pour les champs Détails: date, densité, cuisine, accès, formule.

**Impact** :
- Plus de variation visuelle du montant pendant la frappe d'adresse.
- Comportement aligné avec la logique métier demandée.

---

## 2026-02-13 — Densité photo: symbole dynamique, auto-sélection et note justifiée

**Demande** :
- Sur densité, symbole dynamique pendant l'analyse photo.
- À la fin, sélection auto de `Léger/Normal/Dense`.
- Afficher une note au-dessus du champ: `Analyse photo : ...` avec justification IA.
- Séparer densité de la partie contraintes et ajouter l'info dans le champ DB.

**Modifications** :
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
  - Flux IA séparés: `specific_constraints` vs `density`.
  - Bouton caméra densité avec état visuel dynamique (`camera` -> `loader` -> `check`).
  - Auto-sélection du champ densité selon la réponse IA.
  - Affichage de la note `Analyse photo : ...` au-dessus de "Densité de meubles".
  - Le textarea `Retour IA` est géré par contexte (densité/contraintes) pour éviter les mélanges.
- `app/api/ai/analyze-photos/route.ts`
  - Réponse enrichie pour la densité: `densitySuggestion` + `densityRationale`.
  - Prompt densité structuré pour imposer choix + justification.
  - Prompt contraintes renforcé pour exclure explicitement le sujet densité.
- `app/devis-gratuits-v3/page.tsx`
  - Nouveau flux de persistance `densityAiNote`.
  - `densityAiNote` ajouté dans `tunnelOptions.notes` sous bloc `[Analyse IA densité]`.

**Impact** :
- La densité est traitée dans son module dédié, sans pollution de la section contraintes.
- Le BO reçoit désormais la note de justification densité dans le champ notes.

---

## 2026-02-13 — Réorganisation onglets "Ajouter des précisions"

**Demande** :
- Mettre `photo + IA` à gauche et ouvert par défaut, puis `Contraintes Usuelles`, puis `champs libre`.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Ordre des onglets changé en : `photo + IA` → `Contraintes Usuelles` → `champs libre`.
- Onglet actif par défaut changé vers `photo + IA`.
- Panneau "Ajouter des précisions (facultatif)" ouvert par défaut.

**Impact** :
- Le parcours photo+IA devient l’entrée principale visible immédiatement.

---

## 2026-02-13 — Densité: bouton photo desktop + prompt IA dédié

**Demande** :
- Ajouter, sur "Densité de meubles", un 4e bouton desktop avec icône photo.
- Utiliser un prompt IA spécifique à la question densité.

**Modifications** :
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
  - Grille densité passée en `3 colonnes mobile / 4 colonnes desktop`.
  - Ajout d'un bouton caméra (desktop only) qui ouvre directement le flux photo.
  - Envoi d'un contexte d'analyse (`analysisContext: "density"`) vers l'API.
  - Libellé du bloc retour IA adapté selon le contexte (`densité` vs `contraintes spécifiques`).
- `app/api/ai/analyze-photos/route.ts`
  - Support du champ `analysisContext` dans la requête.
  - Prompt dédié densité activé quand `analysisContext === "density"`.
  - Propagation du contexte sur le process principal et le process chunké.

**Impact** :
- Le parcours photo+IA devient réutilisable par question.
- Première extension faite sur la densité avec un prompt métier ciblé.

---

## 2026-02-13 — Icône photo dans l’entête "Ajouter des précisions"

**Demande** :
- Ajouter une petite icône photo à droite du bouton de section pour indiquer qu'on peut compléter avec des photos.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Ajout d'une icône `Camera` dans la zone droite de l'entête, à côté du chevron d'ouverture.

**Impact** :
- Signal visuel immédiat de la capacité "photo + IA" dès l’état replié.

---

## 2026-02-13 — Retour IA éditable par le client

**Demande** :
- Le champ `Retour IA` doit être modifiable par le client.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Remplacement de la liste en lecture seule par un `textarea` éditable.
- Le texte est prérempli avec la synthèse IA.
- Les modifications client sont immédiatement propagées au parent (`onAiInsightsChange`) pour stockage dans les notes BO.

**Impact** :
- Le client peut ajuster le retour IA avant soumission.
- Même emplacement de persistance DB qu'avant (`tunnelOptions.notes`).

---

## 2026-02-13 — Retrait du mini-bloc "Upload des photos..." dans Retour IA

**Demande** :
- Supprimer le petit bloc d'état "Upload des photos..." dans la zone `Retour IA`.

**Modification** :
- Suppression du bloc visuel intermédiaire.
- Le pipeline d'étapes reste l'indicateur unique de progression.

**Fichier** : `components/tunnel/v2/StepAccessLogisticsV4.tsx`

---

## 2026-02-13 — Fix ré-analyse cumulée: inclure toutes les photos actives (pas seulement les nouvelles)

**Problème observé** :
- L'ajout d'une nouvelle photo pouvait écraser le retour IA précédent.

**Cause** :
- Construction du lot d'analyse basée sur un état `activePhotoKeys` potentiellement stale au moment de l'upload/suppression.

**Correction** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- À l'upload: lot d'analyse construit avec `activeUploadedPhotos + result.success` (dédupliqué).
- À la suppression: ré-analyse basée sur `activeUploadedPhotos` courant (moins la photo supprimée).

**Impact** :
- L'analyse IA cumule correctement toutes les photos actives visibles.

---

## 2026-02-13 — Prompt IA recentré: note opérationnelle uniquement (sans pièces/inventaire)

**Demande explicite** :
- Refaire le prompt à partir des instructions du jour uniquement.
- Ne pas parler de regroupement par pièces ni d'inventaire.
- Produire uniquement une note opérationnelle.

**Modification** (`app/api/ai/analyze-photos/route.ts`) :
- Prompt simplifié et recadré :
  - sortie attendue: `moverInsights` uniquement,
  - focus sur signaux inhabituels et impact opérationnel,
  - pas de structure imposée de catégories.
- Parsing assoupli :
  - `rooms` optionnel (toléré si présent),
  - priorité à `moverInsights` renvoyé par l'IA.
- Fallback post-traitement :
  - points atypiques issus des objets détectés,
  - sinon message neutre "aucune contrainte inhabituelle".

**Impact** :
- Réponse IA alignée sur le besoin métier actuel (note opérationnelle pure).

---

## 2026-02-13 — IA contraintes: suppression des catégories forcées, focus "hors norme"

**Correction demandée** :
- Les 3 catégories précédentes étaient des exemples, pas un format imposé.
- Le retour IA ne doit remonter que les points qui sortent de l'ordinaire.

**Modification** (`app/api/ai/analyze-photos/route.ts`) :
- Prompt revu :
  - synthèse uniquement sur signaux inhabituels,
  - typologies pertinentes si utile, sans forcer des catégories vides,
  - cohérence métier et dimensions seulement quand nécessaires.
- Post-traitement revu :
  - plus de structure figée `fragiles/encombrants/accès`,
  - déduplication stricte conservée,
  - fallback neutre si aucun signal inhabituel.

**Impact** :
- Retour IA plus naturel, moins "template", centré sur les vraies contraintes.

---

## 2026-02-13 — Ajustement UX pipeline + prompt IA métier "contraintes spécifiques"

**Demandes** :
- Pipeline: remplacer `v validé` par un vrai symbole check.
- Masquer le pipeline une fois le traitement terminé (visible uniquement pendant l'attente).
- Revoir le prompt IA selon logique métier:
  - note déménageur par typologie de contraintes,
  - cohérence métier (pas de rideaux classés fragiles),
  - dimensions uniquement si utiles à la manutention.

**Modifications** :
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
  - statut `done` affiché avec icône check,
  - pipeline affiché uniquement pendant upload/analyse.
- `app/api/ai/analyze-photos/route.ts`
  - prompt renforcé sur la logique métier "contraintes spécifiques",
  - typologies demandées explicitement :
    - `Objets fragiles`
    - `Objets encombrants`
    - `Spécificités accès`
  - priorité aux lignes typologiques renvoyées par l'IA,
  - garde-fou de cohérence côté fallback (exclusion rideaux/voilages/coussins) + déduplication.

**Impact** :
- Attente plus lisible en UI.
- Retour IA plus métier, plus cohérent, moins de doublons.

---

## 2026-02-13 — Retour IA restructuré par typologie (fragiles / encombrants / accès) + anti-doublons

**Demande** :
- La synthèse doit être orientée enjeux métier (pas liste de meubles).
- Typologie attendue :
  - `Objets fragiles`
  - `Objets encombrants`
  - `Accès`
- Suppression impérative des doublons.

**Modification** (`app/api/ai/analyze-photos/route.ts`) :
- Post-traitement serveur refondu :
  - regroupement par typologie,
  - dimensions/format estimé affiché par objet (`~LxPxH` ou `~m³`),
  - déduplication stricte (normalisation accents/casse/espaces),
  - sortie compacte (max 3 objets par typologie).
- La synthèse finale privilégie désormais les 3 lignes de typologie.

**Impact** :
- Retour IA plus actionnable pour un déménageur.
- Moins de bruit, suppression des répétitions.

---

## 2026-02-13 — Pipeline de traitement photo visible étape par étape

**Demande** :
- Afficher explicitement les étapes de traitement, dans l'ordre :
  1. Normalisation de l'image
  2. Compression
  3. Sauvegarde temporaire
  4. Analyse IA
- Chaque étape apparaît à son tour.
- Quand une étape est terminée, elle passe en `v validé`.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Ajout d'un pipeline UI séquentiel dans `Retour IA` avec statuts :
  - `en cours`,
  - `v validé`,
  - `erreur` (si incident).
- Ordre strict respecté et rendu progressif par étape.

**Impact** : UI/feedback utilisateur uniquement.

---

## 2026-02-13 — Soft delete photo: analyse IA limitée aux photos actives à l'écran

**Problème** :
- perception de doublons / photos historiques prises en compte dans l'analyse IA.

**Règle métier appliquée** :
1. Toutes les photos envoyées restent enregistrées (historique conservé).
2. Seules les photos non supprimées à l'écran (soft delete) sont analysées par l'IA.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- séparation explicite :
  - `uploadedPhotos` = historique uploadé (conservé),
  - `activePhotoKeys` = photos actives affichées/analyzées.
- suppression d'une miniature = retrait de `activePhotoKeys` uniquement (soft delete UI).
- analyse IA recalculée uniquement sur `activeUploadedPhotos`.
- ajout d'un indicateur UX :
  - nombre de photos actives,
  - nombre de photos masquées (historique conservé).

**Impact** :
- plus de prise en compte IA des photos masquées.
- conservation complète des uploads côté stockage.

---

## 2026-02-13 — Indicateur d'analyse IA en cours (retour IA)

**Demande** :
- Afficher clairement que l'analyse IA est en cours, avec un signe dynamique sobre/stylisé.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Ajout d'un état visuel dédié dans le bloc `Retour IA (contraintes spécifiques)` :
  - icône animée (`Loader2` spin) pendant l'analyse,
  - micro-indicateur de progression (3 points pulsés),
  - style discret (`surface + border`) pour rester sobre.

**Impact** : UX uniquement.

---

## 2026-02-13 — Fix miniatures: passage de `blob:` à `data:` (ERR_FILE_NOT_FOUND)

**Symptôme** :
- miniatures cassées de manière intermittente (`net::ERR_FILE_NOT_FOUND` sur URLs de preview).

**Correction** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- génération de previews en `data:` via `FileReader.readAsDataURL` au lieu de `URL.createObjectURL`.
- suppression de la logique de `revokeObjectURL` devenue inutile.

**Impact** :
- miniatures stables dans le bloc import (plus de cassure liée au cycle de vie des `blob:`).

---

## 2026-02-13 — Retour IA orienté "objets à attention" (contraintes spécifiques)

**Demande** :
- Le retour IA doit identifier clairement les objets qui méritent l'attention du déménageur.
- Contexte: zone "contraintes spécifiques".

**Modifications** :
- `app/api/ai/analyze-photos/route.ts`
  - prompt renforcé: points obligatoirement concrets (`objet/contrainte + raison`), ton factuel.
  - post-traitement serveur: génération/priorisation de lignes orientées objets à partir des `rooms.items` :
    - fragile,
    - valeur à protéger,
    - démontage/remontage,
    - volume élevé,
    - gabarit large.
  - déduplication + limite de points pour conserver une synthèse courte.
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
  - titre du bloc ajusté : `Retour IA (contraintes spécifiques)`.

**Impact** :
- Retour plus actionnable pour le déménageur et plus adapté au client final.
- Aucun impact DB/schema.

---

## 2026-02-13 — Fix miniatures photo Step 3 (`blob` invalidé)

**Symptôme** :
- Miniatures en erreur (`ERR_FILE_NOT_FOUND` sur URL `blob:`) après import.

**Cause** :
- Attribution de previews basée sur le nom de fichier + nettoyage anticipé de certaines URLs `blob`.

**Correction** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Attribution des previews par **queue ordonnée** des fichiers sélectionnés (ordre stable upload → miniature).
- Révocation uniquement des URLs `blob` **non utilisées** (restes de queue).

**Impact** : miniatures stables dans la zone drag&drop.

---

## 2026-02-13 — Photo+IA: miniatures persistantes + suppression liée + retour IA centralisé

**Demandes** :
- Les informations de traitement photo doivent être visibles dans `Retour IA`.
- Les photos doivent rester en miniatures dans la zone drag&drop.
- Si une photo est supprimée, le retour IA lié doit disparaître.
- Contraintes IA: ton factuel, synthétique, sans jugement de valeur.

**Modifications** :
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
  - miniatures conservées dans la zone import (gauche),
  - bouton suppression par miniature,
  - à la suppression: re-analyse automatique sur les photos restantes (donc retour IA recalculé),
  - déplacement des statuts/errors upload/analyse dans le bloc `Retour IA`.
- `app/api/ai/analyze-photos/route.ts`
  - prompt renforcé:
    - jamais de jugement,
    - formulation neutre (ex: `densité élevée d'objets`),
    - réponse courte et factuelle.

**Impact** :
- UX plus lisible et plus cohérente entre photos et synthèse IA.
- Aucun changement de schéma DB.

---

## 2026-02-13 — Onglet `photo + IA` : layout gauche→droite (drag&drop/import → IA → retour)

**Demande** :
- Ajouter un champ drag and drop / import à gauche.
- Ajouter une flèche IA vers le champ retour IA.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Refonte de l'onglet `photo + IA` en 3 zones :
  - gauche : bloc `Import / Drag and drop` (dropzone + bouton import),
  - centre : indicateur IA avec flèche (`ArrowRight` desktop, `ArrowDown` mobile),
  - droite : bloc `Retour IA`.
- Ajout gestion drag&drop native (`onDragOver/onDrop`) + input file caché.

**Impact** : UI/UX uniquement (analyse IA et stockage inchangés).

---

## 2026-02-13 — Onglet photo+IA : icône + texte + stockage analyse IA dans `notes`

**Demandes** :
- Ajouter un signe appareil photo sur l'onglet `photo + IA`.
- Ajouter le texte :
  - `Ajouter des photos pour une estimation plus precise. Nous analysons vos photos pour enrichir votre dossier.`
- Stocker l'analyse IA au même endroit DB que le champ libre.

**Modifications** :
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
  - icône `Camera` affichée sur l'onglet `photo + IA`,
  - texte explicatif ajouté dans l'onglet photo,
  - remontée des insights IA via callback `onAiInsightsChange`.
- `app/devis-gratuits-v3/page.tsx`
  - état `aiPhotoInsights`,
  - fusion `specificNotes + [Analyse IA photos]` dans `tunnelOptions.notes` (Step 3 et Step 4).

**Impact** :
- L'analyse IA est persistée dans le même champ BO que le champ libre (`tunnelOptions.notes`).
- Aucun changement de schéma DB/Prisma.

---

## 2026-02-13 — Renommage libellé dépliant Step 3

**Demande** :
- Renommer le bloc `Il nous manque des informations ?` en `Ajouter des précisions (facultatif)`.

**Modification** :
- Libellé du bouton dépliant mis à jour dans `components/tunnel/v2/StepAccessLogisticsV4.tsx`.

**Impact** : wording UI uniquement.

---

## 2026-02-13 — Fix upload Step 3 quand `leadId` est absent

**Problème** :
- En onglet `photo + IA`, message bloquant `Lead manquant: impossible d'uploader les photos pour l'instant`.

**Correction** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Si `leadId` n'est pas encore disponible, génération d'un identifiant local stable :
  - clé localStorage : `moverz_photo_upload_lead_id`
  - format : `session-...`
- Upload autorisé avec ce fallback, donc plus de blocage utilisateur.

**Impact** :
- UX corrigée sur Step 3 (upload possible immédiatement).
- Aucun impact sur tracking métier.

---

## 2026-02-13 — Dépliant infos manquantes: 3 onglets + upload Cloudflare + IA live

**Demande validée** :
- Remplacer le bloc dépliant par un panneau à 3 onglets :
  - `Contraintes Usuelles`
  - `champs libre`
  - `photo + IA`
- En `photo + IA` :
  - upload des photos sur Cloudflare (R2),
  - lancement automatique d'une analyse IA dès ajout de photos.

**Modifications** :
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
  - ajout des 3 onglets dans `Il nous manque des informations ?`,
  - upload live via `uploadLeadPhotos(...)`,
  - auto-analyse live via `POST /api/ai/analyze-photos`,
  - affichage d'un bloc `Analyse IA (vue déménageur)` avec synthèse.
- `app/devis-gratuits-v3/page.tsx`
  - passage de `leadId` vers `StepAccessLogisticsV4` pour permettre l'upload dès Step 3.
- `app/api/uploads/photos/route.ts`
  - ajout upload Cloudflare R2 (si variables `R2_*` présentes),
  - conservation du fallback local (`uploads/`) pour robustesse.
- `app/api/ai/analyze-photos/route.ts`
  - prompt IA orienté déménageur,
  - retour `moverInsights` (synthèse textuelle),
  - fallback de synthèse si l'IA ne renvoie pas de points exploitables.
- `package.json` / `package-lock.json`
  - ajout dépendance `@aws-sdk/client-s3` (R2 S3-compatible).

**Impact** :
- UX enrichie en Step 3 avec feedback IA immédiat après upload.
- Tracking/payload métier inchangés.
- Upload Cloudflare activé dès que les variables R2 sont configurées.

---

## 2026-02-13 — Ajout UI "Ajouter des photos" dans le dépliant d'infos manquantes

**Demande** : ajouter un champ `Ajouter des photos` (facultatif) dans `Il nous manque des informations ?`.

**Implémentation** :
- Ajout d'un input `type="file"` multi-fichiers dans `components/tunnel/v2/StepAccessLogisticsV4.tsx`.
- Affichage du nombre de photos sélectionnées côté UI.

**Important (règle repo)** :
- Champ explicitement marqué **prototype non connecté**.
- Les fichiers ne sont **pas envoyés** au Back Office / API.

**Impact** : UI uniquement, aucun impact tracking/API/payload.

---

## 2026-02-13 — "Il nous manque des informations ?" rendu non obligatoire

**Demande** : les champs dans le dépliant ne doivent pas être obligatoires.

**Modification** :
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
  - suppression de la logique d'erreur sur `specificNotes`,
  - suppression du style d'erreur associé,
  - texte d'aide passé à `Champ optionnel`,
  - ouverture du dépliant uniquement via clic utilisateur.
- `app/devis-gratuits-v3/page.tsx`
  - suppression du bloc de validation bloquante `specificNotes` dans `handleSubmitAccessV2`.

**Impact** : UX plus fluide, aucun blocage de soumission sur ce panneau, aucun impact API/tracking/payload.

---

## 2026-02-13 — Step 3: fusion "Contraintes + champ libre" dans un dépliant unique

**Demande** :
- Fusionner les 2 blocs en un seul.
- Afficher une ligne dépliante : `Il nous manque des informations ?`
- Afficher le contenu seulement après ouverture :
  - `Contraintes usuelles. à préciser`
  - champ libre renommé en `D'autre spécificitées à prendre en compte`
  - placeholder avec les 2 exemples fournis.

**Modification** (`components/tunnel/v2/StepAccessLogisticsV4.tsx`) :
- Ajout d'un état local `showMissingInfoPanel` + ouverture conditionnelle.
- Déplacement des contraintes et du textarea dans le contenu du dépliant.
- Ouverture automatique si validation active et champ libre invalide.
- Renommage des libellés et nouveau placeholder multi-lignes.

**Impact** :
- UX plus compacte et moins chargée visuellement.
- Aucun impact tracking/API/payload.

---

## 2026-02-13 — Stabilisation visuelle du haut de panier pendant saisie d'adresse

**Demande** : le haut du panier bouge trop pendant la frappe dans les adresses, même quand les détails affichés ne changent pas.

**Cause identifiée** :
- Le calcul Step 3 repartait de `cityOsrmDistanceKm + 15` en live, valeur qui peut fluctuer pendant la saisie/normalisation d'adresse.

**Correction** (`app/devis-gratuits-v3/page.tsx`) :
- Baseline distance du panier priorisée sur la valeur figée de fin Step 2 :
  - `state.rewardBaselineDistanceKm` (si disponible),
  - fallback `cityOsrmDistanceKm + 15` sinon.
- Ajout de `state.rewardBaselineDistanceKm` dans les dépendances du `useMemo` panier.

**Impact** :
- Panier visuellement plus stable pendant la saisie.
- Aucun impact API/tracking/payload.

---

## 2026-02-13 — Hotfix build TS (Step 3 panier)

**Contexte** : échec de build prod sur `app/devis-gratuits-v3/page.tsx` avec `Cannot find name 'baselineFormule'`.

**Correction** :
- Déclaration explicite des constantes dans `v2PricingCart` :
  - `selectedFormule = state.formule as PricingFormuleType`
  - `baselineFormule = "STANDARD"`
- Alignement commentaire "Première estimation" (sans ambiguïté sur la formule).

**Impact** : correction compilation TypeScript uniquement, pas de changement fonctionnel métier.

---

## 2026-02-12 — SmartCart détails: symbole visuel devant montants

**Demande** : remplacer les signes textuels devant les montants de détails par des symboles visuels.

**Modification** :
- Dans `components/tunnel-v4/SmartCart.tsx`, affichage du montant avec icône inline :
  - hausse de prix : `TrendingUp` rouge,
  - baisse de prix : `TrendingDown` verte.
- Suppression des préfixes textuels (`+`/absence de signe) dans la colonne montant.

**Impact** : UI uniquement (lisibilité des deltas), aucun impact tracking/API/payload.

---

## 2026-02-12 — Fix build TS (debug Step 2)

**Contexte** : échec de build prod sur `page.tsx` (`TS`), variable `formule` non définie dans `v2DebugRowsStep2`.

**Correction** :
- Remplacement des références `formule` par `selectedFormule` dans le bloc debug Step 2 :
  - indexation `LA_POSTE_RATES_EUR_PER_M3[band][selectedFormule]`
  - payload `calculatePricing({ formule: selectedFormule, ... })`

**Fichier** : `app/devis-gratuits-v3/page.tsx`

**Impact** : correction compilation uniquement (debug), aucun impact logique tunnel en runtime hors mode debug.

---

## 2026-02-12 — Panier Step 3: ajout du détail `Formule` (delta vs STANDARD)

**Demande** :
- Le calcul de base doit être en formule `STANDARD`.
- Le bloc `DÉTAILS` doit inclure une ligne `Formule` avec le delta si la formule choisie n'est pas STANDARD.

**Modification** (`app/devis-gratuits-v3/page.tsx`) :
- Baseline du panier fixée sur `STANDARD` pour `firstEstimate*`.
- Calcul final séparé :
  - `sAccessStandard` (sans effet formule explicite),
  - `sFinal` (formule sélectionnée).
- Nouvelle ligne `Formule` ajoutée dans les détails avec `amountEur = sFinal - sAccessStandard`.
- La ligne est ensuite automatiquement masquée si delta à 0€ (règle déjà en place).

**Impact** :
- Détails plus cohérents métier (base STANDARD + delta formule explicite).
- Aucun impact tracking/API/payload.

---

## 2026-02-12 — SmartCart: masquer les lignes de détails à 0 €

**Demande** : ne pas afficher les lignes de détail dont l'impact prix est nul (ex: `Date` à 0 €).

**Modification** :
- Filtre UI ajouté au passage des `items` vers `SmartCart` :
  - `line.amountEur !== 0`

**Fichier** : `app/devis-gratuits-v3/page.tsx`

**Impact** : affichage panier plus lisible (pas de lignes neutres), aucun impact tracking/API/payload.

---

## 2026-02-12 — Step 3: `ÉTAGE` affiché uniquement après clic sur `Appartement`

**Demande** : au chargement Step 3, ne pas afficher `ÉTAGE`. L'afficher seulement si l'utilisateur choisit `Appartement`.

**Cause** :
- La logique UI traitait implicitement les valeurs vides comme "appartement", ce qui affichait `ÉTAGE` dès l'arrivée.

**Correction** :
- `isApartment()` ne renvoie `true` que pour des types explicites (`t1..t5`).
- La sélection visuelle du bouton `Maison` est désormais explicite (`housingType === "house"`).
- Résultat : pas de bloc `ÉTAGE` au chargement; il apparaît après clic sur `Appartement`.

**Fichier** : `components/tunnel/v2/StepAccessLogisticsV4.tsx`

**Impact** : UI uniquement, aucun impact tracking/API/payload.

---

## 2026-02-12 — SmartCart détails: sans sous-texte + ordre stable + info au survol

**Demandes** :
- Retirer les sous-descriptions affichées sous chaque ligne de détail (ex: `adresses (OSRM)`).
- Conserver un ordre d'apparition métier stable des lignes.
- Afficher une explication au survol desktop.

**Modifications** :
- `components/tunnel-v4/SmartCart.tsx`
  - suppression de l'affichage de `item.category` sous le label,
  - ajout d'un `title` sur chaque ligne détail en desktop (tooltip natif navigateur).
- `app/devis-gratuits-v3/page.tsx`
  - ordre des lignes ajusté pour refléter l'ordre des sections du formulaire :
    `Distance` → `Date` → `Densité` → `Cuisine` → `Accès · Logement` → `Accès · Contraintes`,
  - passage de l'explication via `explanation: line.status`.

**Impact** : UI uniquement (présentation + lisibilité), aucun impact tracking/API/payload.

---

## 2026-02-12 — Step 3: ordre des blocs (Formule avant Coordonnées)

**Demande** : afficher le bloc `Votre formule` au-dessus du bloc `Vos coordonnées`.

**Modification** :
- Réordonnancement des sections dans `StepAccessLogisticsV4.tsx` :
  - avant : `Vos coordonnées` puis `Votre formule`
  - après : `Votre formule` puis `Vos coordonnées`

**Impact** : UI uniquement (ordre de lecture), aucun impact tracking/API/payload.

---

## 2026-02-12 — CTA Step 3 renommé

**Demande** : remplacer le libellé du CTA bas par `Lancer ma demande de devis`.

**Modifications** :
- CTA principal Step 3 :
  - avant : `Finaliser mon estimation`
  - après : `Lancer ma demande de devis`
- CTA du SmartCart (drawer mobile) aligné :
  - avant : `Valider mon devis`
  - après : `Lancer ma demande de devis`

**Fichiers** :
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`
- `app/devis-gratuits-v3/page.tsx`

**Impact** : wording UI uniquement, aucun impact tracking/API/payload.

---

## 2026-02-12 — Wording badge transparence (SmartCart)

**Demande** : préciser que l'estimation peut évoluer après visite.

**Modification** :
- Texte mis à jour dans le badge "Prix transparent" :
  - avant : "…inclut tous les ajustements selon vos critères."
  - après : "…inclut tous les ajustements selon vos critères, ajustable après visite si nécessaire."

**Fichier** : `components/tunnel-v4/SmartCart.tsx`

**Impact** : UI copy uniquement, aucun impact tracking/API/payload.

---

## 2026-02-12 — Panier Step 3: détails progressifs + split accès

**Demande** :
- Les lignes du bloc "DÉTAILS" (SmartCart) ne doivent apparaître qu'au fur et à mesure que les données associées sont complétées.
- Le poste "Accès" doit être séparé en 2 sous-détails :
  1) `Accès · Logement` (maison/appartement + étages),
  2) `Accès · Contraintes` (portage, passages étroits, stationnement, monte-meuble).

**Implémentation** :
- Dans `app/devis-gratuits-v3/page.tsx`, génération des lignes du panier rendue conditionnelle :
  - `Distance` affichée seulement si adresses OSRM confirmées,
  - `Densité` seulement si choix fait,
  - `Cuisine` seulement si choix fait,
  - `Date` seulement si date valide confirmée,
  - `Accès · Logement` seulement si données logement/étages complètes,
  - `Accès · Contraintes` seulement si au moins une contrainte est activée.
- Split du calcul accès en 2 étapes pour des deltas distincts :
  - delta logement d'abord,
  - delta contraintes ensuite.

**Impact** :
- UX panier plus progressive et lisible.
- Aucun changement tracking/API/payload.

---

## 2026-02-12 — Step 3: validation obligatoire + retour champ libre

**Objectif** : aligner la validation Step 3 avec la règle métier "tout obligatoire", sauf :
- `Mes dates sont flexibles`
- `Contraintes d'accès`
- `Téléphone`

**Modifications appliquées** :
- Validation bloquante ajoutée sur :
  - `density` (Densité de meubles)
  - `kitchenIncluded` (Cuisine équipée ?)
  - `specificNotes` (champ libre, min 5 caractères)
- Correction des IDs de focus de validation côté page :
  - `v4-origin-address`, `v4-destination-address`, `v4-moving-date`, `v4-firstName`, `v4-email`
- Réintroduction d'un champ libre en UI Step 3 :
  - section "Précisions complémentaires"
  - connectée à `specificNotes` (déjà présent dans state/payload)

**Fichiers** :
- `app/devis-gratuits-v3/page.tsx`
- `components/tunnel/v2/StepAccessLogisticsV4.tsx`

**Impact** :
- Aucun changement DB/API.
- Validation front renforcée, cohérente avec le besoin métier.

---

## 2026-02-12 — Force palette light sur le tunnel live

**Contexte** : Après le fix des aliases tokens, certains devices restaient en rendu sombre (OS/browser en dark mode), alors que la direction UX du tunnel V4 est light.

**Cause** :
- `styles/tokens.css` applique un override global via `@media (prefers-color-scheme: dark)`.
- Le tunnel live héritait de ces variables dark selon l'environnement client.

**Correction appliquée** :
- Scope local sur la page live `app/devis-gratuits-v3/page.tsx` avec la classe `tunnel-v3-force-light`.
- Override des variables de couleur dans `app/globals.css` sous `.tunnel-v3-force-light` (palette light + aliases).

**Impact** :
- Couleurs stabilisées en light sur Step 1 à 4, quel que soit le mode dark de l'appareil.
- Aucun impact tracking/API/payload.

---

## 2026-02-12 — Fix rendu délavé intermittent (toutes steps)

**Symptôme prod** : rendu parfois "grisé/délavé" sur certains devices (Step 1→4), alors que d'autres devices affichent correctement.

**Cause racine** :
- Les composants V4 utilisent encore des variables CSS legacy `--color-bg`, `--color-surface`, `--color-text`.
- Les tokens avaient été renommés en `--color-bg-primary`, `--color-surface-primary`, `--color-text-primary`.
- Sans alias de compatibilité, `var(--color-...)` devenait invalide sur certains clients (selon cache/device), d'où rendu incohérent.

**Correction appliquée** :
- Ajout d'aliases de compatibilité dans `styles/tokens.css` :
  - `--color-bg: var(--color-bg-primary);`
  - `--color-surface: var(--color-surface-primary);`
  - `--color-text: var(--color-text-primary);`

**Impact** :
- Fix UI global (Step 1, 2, 3, 4).
- Aucun impact tracking/API/payload.

---

## 2026-02-12 — Refonte page confirmation (Step 4)

**Contexte** : La page de confirmation manquait de hiérarchie claire et contenait du contenu marketing superflu.

**Modifications apportées** :

1. **Section "Vos avantages Moverz" supprimée** ❌
   - Marketing inutile à ce stade (l'utilisateur a déjà converti)
   - Allège la page
   - Focus sur l'essentiel : récap + prochaines étapes

2. **Réorganisation logique** 🔄
   - **Avant** : Hero → Timeline → Email → Récap → Avantages
   - **Après** : Hero → **Récap** → Timeline → Email
   - L'utilisateur voit d'abord CE QU'IL A DEMANDÉ, puis ce qui va se passer

3. **Hiérarchie narrative améliorée** 📖
   - "Bravo!" (célébration)
   - "Voici ce que vous avez demandé" (récap + estimation)
   - "Voici ce qui se passe maintenant" (timeline)
   - "Confirmez votre email" (action)

**Fichier** : `components/tunnel/v2/StepContactPhotosV4.tsx`

**Impact** : UI uniquement (meilleure UX de confirmation), aucun changement fonctionnel ou de tracking

---

### 💡 Suggestions d'améliorations supplémentaires (non implémentées)

Si tu veux aller plus loin, voici ce qu'on pourrait ajouter :

1. **CTA secondaire "Télécharger le récap PDF"** 
   - Permet à l'utilisateur de garder une trace
   - Rassurance supplémentaire

2. **Section "En attendant, préparez votre déménagement"**
   - Checklist interactive
   - Conseils pratiques
   - Garde l'engagement pendant les 24-48h d'attente

3. **Partage social** (facultatif)
   - "Partagez cette estimation avec votre conjoint/famille"
   - Link copy-to-clipboard

4. **Timeline plus interactive**
   - Progress bar animée
   - Notifications push opt-in

5. **Email confirmation plus actionnable**
   - Bouton "Je confirme" au lieu de juste un badge statique
   - Permettrait de tracker qui a bien reçu l'email

Dis-moi si tu veux implémenter l'une de ces améliorations !

---

## 2026-02-12 — Badge "Top" sans émoji (Step 3 formules)

**Contexte** : Badge "✨ Top" contenait un émoji (violation de la règle "no emojis")

**Modification** :
- Avant : `✨ Top`
- Après : `+ Top`

**Fichier** : `components/tunnel/v2/StepAccessLogisticsV4.tsx` (ligne 802)

**Impact** : UI uniquement (texte sobre), aucun changement fonctionnel

**Note technique** : Les prix affichés dans les cartes de formules (priceMin - priceMax) proviennent directement de `calculatePricing()` avec tous les paramètres réels (distance OSRM, étages, densité, accès, etc.). Ce ne sont pas des valeurs hardcodées ou arrondies approximatives. Le moteur de pricing calcule dynamiquement les vraies fourchettes pour chaque formule (ECONOMIQUE, STANDARD, PREMIUM).

---

## 2026-02-12 — Flèches économies + Rappel budget initial (SmartCart)

**Contexte** : Le drawer d'estimation manquait de contexte visuel pour comprendre les ajustements de prix.

**Modifications apportées** :

1. **Flèches visuelles sur les ajustements** :
   - Items avec delta positif (coût supplémentaire) : 🔴 `TrendingUp` rouge
   - Items avec delta négatif (économie) : 🟢 `TrendingDown` vert
   - Items sans delta (confirmé) : ✅ `CheckCircle2` turquoise
   - Avant : check turquoise pour tout le monde (pas de distinction visuelle)
   - Après : icône qui reflète l'impact sur le prix

2. **Section "Budget initial (Step 2)"** :
   - Affiche le prix de la première estimation (Step 2 baseline)
   - Montre le delta par rapport au prix actuel affiné
   - Badge avec fond turquoise léger + bordure pointillée
   - Flèche TrendingUp/Down + montant de la différence
   - Ex: "Budget initial (Step 2) : 1 274 € → 🟢 ↓ -50 €" (économies)
   - Ex: "Budget initial (Step 2) : 1 274 € → 🔴 ↑ +100 €" (augmentation)

3. **Props SmartCart** :
   - Nouvelle prop `initialPrice?: number` (facultative)
   - Passée depuis `page.tsx` via `v2PricingCart.firstEstimateCenterEur`

**Fichiers modifiés** :
- `components/tunnel-v4/SmartCart.tsx` (interface + logique + UI)
- `app/devis-gratuits-v3/page.tsx` (passage de la prop)

**Impact** : UI uniquement (meilleure compréhension des ajustements), aucun changement fonctionnel ou de tracking

**Principe** : Transparence visuelle — l'utilisateur voit clairement ce qui augmente ou réduit le prix par rapport à l'estimation initiale.

---

## 2026-02-12 — Labels "Logement" clarifiés (Step 3)

**Problème** : Les deux sections "Logement" (origine et destination) n'étaient pas clairement distinguées.

**Solution** : Ajout des labels "Départ" et "Arrivée"
- Avant : `Logement` (× 2, impossible de savoir laquelle est laquelle)
- Après : `Logement · Départ` et `Logement · Arrivée`

**Fichier** : `components/tunnel/v2/StepAccessLogisticsV4.tsx` (ligne 157)

**Impact** : UI uniquement (clarté améliorée), aucun changement fonctionnel

---

## 2026-02-12 — Optimisation drawer d'estimation mobile (Step 3)

**Contexte** : Sur mobile, quand on clique sur le FAB "Budget" pour voir l'estimation, le drawer qui s'ouvre manquait d'aération et de lisibilité.

**Modifications apportées** :

1. **Typographie et espacement améliorés** :
   - Titre "Votre estimation" : `text-xs` → `text-sm` sur mobile drawer
   - Prix principal : `text-4xl` → `text-5xl` sur mobile drawer (plus impactant)
   - Progress bar : `h-2` → `h-2.5` sur mobile drawer
   - Labels min/max : `text-xs` → `text-sm` sur mobile drawer

2. **Section Projet Info agrandie** :
   - Padding : `p-3` → `p-4` sur mobile drawer
   - Spacing interne : `space-y-1.5` → `space-y-2.5` sur mobile drawer
   - Texte : `text-xs` → `text-sm` sur mobile drawer
   - Font-weight labels : `font-medium` → `font-semibold` (meilleure hiérarchie)

3. **Liste des détails plus lisible** :
   - Items padding : `p-2.5` → `p-3` (plus d'espace tactile)
   - Icons : `w-3.5 h-3.5` → `w-4 h-4`
   - Label texte : `text-xs` → `text-sm`
   - Category texte : `text-[10px]` → `text-xs`
   - Amounts : `text-xs` → `text-sm`
   - Max height : `240px` → `280px` (plus d'items visibles)
   - Spacing section : `space-y-2` → `space-y-3` sur mobile drawer

4. **Badge transparence amélioré** :
   - Padding : `p-3` → `p-3.5`
   - Texte : `text-xs` → `text-sm`

5. **CTA plus visible** :
   - Padding : `py-3.5` → `py-4`
   - Border-radius : `rounded-lg` → `rounded-xl`
   - Font : `text-sm font-semibold` → `text-base font-bold`
   - Ajout shadow-md
   - Comportement : ferme le drawer avant de scroller (UX plus fluide)

6. **Drawer lui-même** :
   - Max height : `85vh` → `90vh` (plus d'espace)
   - Drag handle : `w-10 h-1` → `w-12 h-1.5` (plus visible)
   - Close button : `w-8 h-8` + `w-4 h-4` icon → `w-9 h-9` + `w-5 h-5` icon
   - Padding handle : `py-3` → `py-4`
   - Content padding : `pb-8` → `pb-6` (optimisé)

**Fichier** : `components/tunnel-v4/SmartCart.tsx`

**Impact** : UI uniquement (mobile plus confortable et lisible), aucun changement fonctionnel ou de tracking

**Principe** : Respecte le principe "mobile-first" — tout est plus grand, plus espacé, plus facile à lire sur petit écran.

---

## 2026-02-12 — Ajustements Step 2 (mobile UX)

**Modifications** :
1. Ajout "m²" après la surface dans le sous-titre
   - Avant : `Paris → Lyon · 33`
   - Après : `Paris → Lyon · 33 m²`

2. Section "Pourquoi affiner" masquée sur mobile
   - Raison : Alléger l'écran mobile, focus sur le prix et le CTA
   - Desktop : section visible (rassurance)
   - Mobile : section masquée (`hidden md:block`)

**Fichier** : `components/tunnel/v2/StepEstimationV4.tsx`

**Impact** : UI uniquement (mobile plus épuré), aucun changement fonctionnel

---

## 2026-02-12 — Suppression des emojis (remplacés par texte simple)

**Demande** : Retirer les emojis du tunnel (émoticônes textuelles OK)

**Fichiers modifiés** :
1. `components/tunnel/v2/StepQualificationV4.tsx` (lignes 204-210)
   - Avant : `⚡ 2 minutes • 🔒 Gratuit • 🎯 Sans engagement`
   - Après : `2 minutes • Gratuit • Sans engagement`

2. `components/tunnel/v2/StepContactPhotosV4.tsx` (ligne 122)
   - Avant : `🎉 Bravo !`
   - Après : `Bravo !`

**Impact** : UI uniquement (texte plus sobre), aucun changement fonctionnel

---

## 2026-02-12 (14ème itération) — Refonte "Unicorn-Grade" complète du tunnel

### 🔧 Fix déploiement CapRover (v419-420)
**Problème** : Build échouait avec erreur TypeScript dans `StepContactPhotosV4.tsx` ligne 356
**Cause** : Prop `style` invalide sur `CardV4` (non définie dans `CardV4Props`)
**Solution** : Retrait de la prop `style` — la border turquoise est déjà gérée par `variant="highlighted"`
**Commit** : `c7c1888` — `fix: remove invalid style prop on CardV4 in StepContactPhotosV4`
**Status** : ✅ Build passe, push vers prod

---

## 2026-02-12 (14ème itération) — Refonte "Unicorn-Grade" complète du tunnel

**Objectif** : Transformer le tunnel en expérience premium type Ramp (micro-interactions, clarté, confiance), sans casser l'intégration backoffice.

**Contrainte NON NÉGOCIABLE** : 100% UI-only. Aucun endpoint, aucun payload, aucun event GA4, aucun champ ne doit être modifié.

### 📦 Livrables Phase 1 : Design System & Documentation

#### Design System Local (app/devis-gratuits-v3/_ui/)
Création de 9 composants réutilisables, Tailwind uniquement, mobile-first :

1. **Button.tsx** — 3 variants (primary avec gradient + shine effect, secondary, ghost), 3 sizes
2. **Card.tsx** — 3 variants (default glass, gradient turquoise→violet, glass), hoverable option
3. **Field.tsx** — Input fields avec validation visuelle (check vert), icons lucide, helper text/error
4. **Badge.tsx** — 5 variants (default, success, warning, info, premium gradient), 2 sizes
5. **Tooltip.tsx** — Tooltip animé avec icon HelpCircle optional, fade-in smooth
6. **Skeleton.tsx** — 3 variants (text, rect, circle) avec shimmer animation gradient
7. **Stepper.tsx** — Progress stepper horizontal/vertical avec states (completed, current, upcoming)
8. **Toast.tsx** — Toast notifications 4 types + hook useToast pour faciliter l'usage
9. **CountUp.tsx** — Counter animé easeOutExpo pour révéler les prix (effet dopamine)

**Exports** : `app/devis-gratuits-v3/_ui/index.ts` — exports centralisés

#### Documentation Backoffice Contract
Fichier **BACKOFFICE_CONTRACT.md** exhaustif :
- Tous les endpoints API (routes internes Next.js + Back Office)
- Tous les champs de formulaire intouchables (TunnelFormState)
- Mapping complet tunnel → Back Office (transformations, types)
- Events GA4 et tracking (form_start, tunnel_step_viewed, lead_submit)
- Mapping steps → logicalStep → screenId (source de vérité métier)
- Checklist QA complète (payload integrity, events, champs, endpoints, fonctionnel, mobile/desktop, régression)
- Interdictions absolues (10 règles)
- Ce qui est autorisé (UI-only : styles, animations, wrappers, hiérarchie, accessibilité)

#### Documentation Refonte UI Log
Fichier **REFONTE_UI_LOG.md** — journal de progression :
- Phase 1 (design system + doc) — TERMINÉ ✅
- Phase 2 (STEP 2 premium) — TERMINÉ ✅
- Phase 3 (steps restants) — EN COURS 🚧
- Méthodologie de refactor step-by-step
- Guidelines visuelles (couleurs, spacing, border-radius, shadows, animations)
- Checklist finale avant merge

### 🚀 Phase 2 : STEP 2 (Budget estimé) — Moment Dopamine

**Nouveau composant** : `components/tunnel/v2/StepEstimationV2Premium.tsx`

#### Innovations UX/UI

**1. Skeleton → Reveal (1.2s)**
```tsx
// Loading state
<div className="flex items-center justify-center gap-2">
  <div className="w-2 h-2 bg-[#6BCFCF] rounded-full animate-bounce [animation-delay:-0.3s]" />
  <div className="w-2 h-2 bg-[#6BCFCF] rounded-full animate-bounce [animation-delay:-0.15s]" />
  <div className="w-2 h-2 bg-[#6BCFCF] rounded-full animate-bounce" />
</div>
<Skeleton variant="text" width="60%" height="2rem" />
<Skeleton variant="text" width="80%" height="4rem" />
```
- Bouncing dots turquoise (effet attente playful)
- Skeletons avec shimmer gradient
- Transition fade-in après 1.2s

**2. Count-up prix central (1.8s, easeOutExpo)**
```tsx
<CountUp
  end={centerPrice}
  duration={1800}
  suffix=" €"
  className="text-6xl sm:text-7xl font-black bg-gradient-to-r from-[#6BCFCF] via-[#0F172A] to-[#A78BFA] bg-clip-text text-transparent"
/>
```
- Effet "compteur casino" sur le budget (effet dopamine ✨)
- Gradient texte turquoise → noir → violet
- Typo massive : 6xl mobile, 7xl desktop
- Easing easeOutExpo pour accélération naturelle

**3. Fourchette min/max premium**
```tsx
// Card minimum (vert emerald)
<div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 p-4">
  <p className="text-xs uppercase text-emerald-700 flex items-center gap-1.5">
    <TrendingDown className="w-3.5 h-3.5" />
    Minimum
  </p>
  <p className="text-2xl font-black text-emerald-600 tabular-nums">{fmtEur(priceMin)}</p>
</div>

// Card maximum (rose)
<div className="rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200/50 p-4">
  <p className="text-xs uppercase text-rose-700 flex items-center gap-1.5">
    <Sparkles className="w-3.5 h-3.5" />
    Maximum
  </p>
  <p className="text-2xl font-black text-rose-600 tabular-nums">{fmtEur(priceMax)}</p>
</div>
```
- Cards avec gradients pastels subtils
- Icons lucide contextuels
- Typo 2xl font-black, tabular-nums pour alignement

**4. Chips explicatives (apparaissent après count-up, +1.5s delay)**
3 chips : Distance, Volume, Formule
```tsx
<div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E3E5E8] hover:border-[#6BCFCF] hover:shadow-md transition-all">
  <div className="w-10 h-10 rounded-lg bg-[#6BCFCF]/10 flex items-center justify-center">
    <Truck className="w-5 h-5 text-[#6BCFCF]" />
  </div>
  <div className="flex-1">
    <div className="flex items-center gap-2">
      <p className="text-xs font-bold uppercase text-[#1E293B]/60">Distance</p>
      <Tooltip content="Distance calculée via OSRM..." iconOnly />
    </div>
    <p className="text-lg font-black text-[#0F172A]">{distanceText}</p>
    <p className="text-xs text-[#1E293B]/50">{originCity} → {destinationCity}</p>
  </div>
</div>
```
- Hover states élégants (border turquoise, shadow)
- Tooltips explicatifs (HelpCircle icon)
- Sous-texte contextuel (villes, surface déclarée)

**5. Bloc rassurance "Pourquoi affiner en 60 sec ?"**
```tsx
<div className="rounded-xl bg-gradient-to-r from-[#F0F9FF] to-[#F8FAFB] border border-[#E3E5E8] p-4 sm:p-6">
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-full bg-[#6BCFCF]/10 flex items-center justify-center">
      <svg><!-- Check icon --></svg>
    </div>
    <div>
      <p className="font-bold">🎯 Pourquoi affiner en 60 secondes ?</p>
      <ul className="space-y-1.5 text-sm">
        <li>• <strong>Budget ultra-précis</strong> : accès, date, densité</li>
        <li>• <strong>Devis sur-mesure</strong> : les pros voient vos besoins exacts</li>
        <li>• <strong>Zéro mauvaise surprise</strong> : prix final = prix estimé</li>
      </ul>
    </div>
  </div>
</div>
```
- Gradient background subtil bleu clair
- 3 bénéfices clairs (gras + détail)
- Icon check vert pour confiance

**6. CTA optimisé**
```tsx
<Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="w-full">
  Affiner mon estimation en 60 sec 🚀
</Button>
<p className="text-center text-sm text-[#1E293B]/70">
  ~1 minute • Gratuit • Sans engagement
</p>
```
- Copy action-oriented avec emoji fusée
- Gradient desktop avec shine effect (via Button component)
- Sous-texte rassurance (durée + gratuit + sans engagement)

#### 🔒 Backoffice Safe (Garanties)
- ✅ Props interface identique (volume, priceMin, priceMax, formuleLabel, etc.)
- ✅ onSubmit handler inchangé (handleSubmitEstimationV2)
- ✅ Aucun nouveau field / state ajouté
- ✅ Aucune modification de payload
- ✅ Debug mode préservé (debugRows)
- ✅ Aucun event GA4 ajouté/supprimé/modifié

### ✅ Phase 3 : Steps restants (TERMINÉ)

#### STEP 1 (Trajet) — Status: COMPLETED ✅
**Nouveau composant** : `StepQualificationV2Premium.tsx`

**Innovations UX/UI** :
- Hero section avec badge premium + gradient icon
- Cards pour trajet et surface avec hover states
- Labels A/B colorés (turquoise/violet) pour départ/arrivée
- Flèche de direction animée entre les villes
- Validation visuelle avec check vert + message de confirmation animé
- Input surface avec validation inline (check vert à droite)
- Helper text avec icon info turquoise
- Bloc rassurance "100% gratuit et sans engagement" avec 3 bullets
- CTA "Voir mon estimation gratuite" avec emojis
- Sous-texte "⚡ 2 minutes • 🎁 Gratuit • 🔒 Sans engagement"

**Backoffice Safe** :
- ✅ AddressAutocomplete préservé (pas de modification)
- ✅ Props interface identique
- ✅ Validation coords inchangée
- ✅ Handler onSubmit préservé

#### STEP 3 (Affinage) — Status: COMPLETED ✅
**Nouveau composant** : `components/tunnel/v2/LiveEstimatePanel.tsx`

**Décision** : Extraction du sidebar d'estimation en composant réutilisable premium avec desktop sticky + mobile bottom bar/sheet.

**Innovations UX/UI** :

**1. Desktop : Panneau sticky premium**
```tsx
<aside className="hidden lg:block">
  <div className="rounded-3xl bg-gradient-to-br from-[#A8E6D8] via-[#6BCFCF] to-[#A78BFA]/60">
    {/* Header avec badge LIVE pulsé */}
    {/* Budget principal avec CountUp (150-250ms) */}
    {/* Min/Max cards */}
    {/* Ajustements (max 5 drivers) avec micro-animations highlight */}
    {/* CTA "Voir détail" → Drawer/Modal */}
    {/* Trust line (3 garanties) */}
    {/* Première estimation collapsible */}
  </div>
</aside>
```
- Badge "LIVE" avec pulse animation (ping effect)
- CountUp animé sur changement de prix (refinedCenterEur)
- Micro-animation highlight sur la ligne d'ajustement modifiée (200ms scale + ring turquoise)
- Drawer/Modal détail avec 5 bullets max (TrendingUp/Down icons)
- Trust line : Entreprises vérifiées, Numéro masqué, 0 démarchage (CheckCircle, PhoneOff, Shield)

**2. Mobile : Bottom bar + Bottom sheet**
```tsx
{/* Bottom bar fixed (z-20, bottom-20px) */}
<div className="lg:hidden fixed bottom-20 left-0 right-0">
  <button onClick={openSheet}>
    <Badge>LIVE</Badge>
    <p>Budget affiné</p>
    <p>{fmtEur(refinedCenterEur)}</p>
  </button>
</div>

{/* Bottom sheet (slide-in-from-bottom, max-h-90vh) */}
{showMobileSheet && (
  <div className="fixed inset-0 z-50">
    <div className="backdrop" />
    <div className="sheet rounded-t-3xl">
      {/* Handle drag indicator */}
      {/* Contenu identique desktop */}
    </div>
  </div>
)}
```
- Bottom bar collapsée avec badge LIVE + prix principal
- Tap → Bottom sheet avec animation slide-in (300ms)
- Handle drag indicator blanc/50
- Backdrop blur + close on tap outside
- Attention au chevauchement avec CTA principal (z-index 20 vs 10)

**3. Props & Data Flow**
```tsx
interface LiveEstimatePanelProps {
  refinedMinEur: number | null;
  refinedMaxEur: number | null;
  refinedCenterEur: number | null;
  firstEstimateMinEur?: number | null;
  firstEstimateMaxEur?: number | null;
  firstEstimateCenterEur?: number | null;
  lines?: PricingLine[]; // max 5 drivers
  formuleLabel?: string;
  className?: string;
}

interface PricingLine {
  key: "distance" | "density" | "kitchen" | "date" | "access";
  label: string;
  status: string;
  amountEur: number;
  confirmed?: boolean;
}
```
- Data source : `v2PricingCart` (useMemo dans page.tsx)
- Aucune logique métier dans le composant (100% présentation)
- Lines limited to 5 drivers max (specs)

**4. Micro-interactions**
```tsx
// Highlight animation sur changement de ligne
useEffect(() => {
  if (refinedCenterEur !== previousCenterRef.current) {
    const lastConfirmedLine = lines.findLast(l => l.confirmed && l.amountEur !== 0);
    if (lastConfirmedLine) {
      setHighlightedLine(lastConfirmedLine.key);
      setTimeout(() => setHighlightedLine(null), 500);
    }
  }
}, [refinedCenterEur, lines]);
```
- Ring turquoise + scale 1.02 sur la ligne modifiée (500ms)
- Fade/slide du montant (150ms)
- Respect prefers-reduced-motion

**5. Drawer "Détail du calcul"**
- Desktop : Modal centered (zoom-in-95, max-w-lg)
- Mobile : Réutilise le bottom sheet
- 5 bullets max avec icons TrendingUp/Down
- Format : Numéro + Label + Status + Montant
- Footer : "Formule {formuleLabel} • Calcul basé sur vos données déclarées"

**Backoffice Safe** :
- ✅ Composant 100% présentation (no logic)
- ✅ Data source inchangée (v2PricingCart)
- ✅ Aucun nouveau field ajouté
- ✅ Aucun event GA4 ajouté
- ✅ StepAccessLogisticsV2 formulaire préservé (colonne gauche)
- ✅ Layout grid préservé (lg:grid-cols-[1fr_420px])

**Intégration dans page.tsx** :
```tsx
{state.currentStep === 3 && (
  <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-8">
    {/* Formulaire (gauche) */}
    <div><StepAccessLogisticsV2 ... /></div>
    
    {/* Panneau estimation (droite) */}
    <LiveEstimatePanel
      refinedMinEur={v2PricingCart?.refinedMinEur ?? null}
      refinedMaxEur={v2PricingCart?.refinedMaxEur ?? null}
      refinedCenterEur={v2PricingCart?.refinedCenterEur ?? null}
      firstEstimateMinEur={v2PricingCart?.firstEstimateMinEur ?? null}
      firstEstimateMaxEur={v2PricingCart?.firstEstimateMaxEur ?? null}
      firstEstimateCenterEur={v2PricingCart?.firstEstimateCenterEur ?? null}
      lines={v2PricingCart?.lines ?? []}
      formuleLabel={v2PricingCart?.formuleLabel ?? "Standard"}
      className="lg:sticky lg:top-28"
    />
  </div>
)}
```
- Import HelpCircle retiré de page.tsx (déplacé dans LiveEstimatePanel)
- ~150 lignes de code inline remplacées par 1 appel de composant
- Meilleure maintenabilité + réutilisabilité

#### STEP 4 (Bravo) — Status: COMPLETED ✅
**Nouveau composant** : `StepContactPhotosV2Premium.tsx`

**Innovations UX/UI** :
- Hero avec confetti CSS (4 dots animés bounce)
- Badge "Dossier créé avec succès" avec check vert
- Titre "🎉 Bravo !" en 5xl/6xl
- Timeline verticale premium via Stepper component (3 étapes : completed, current, upcoming)
- Card email confirmation avec badge success
- Grid 2 colonnes (desktop) : Récap dossier + Économies potentielles
- Card récap avec emojis par ligne (📍 Départ, 🎯 Arrivée, etc.)
- Card gradient "Économies potentielles" avec calcul ~15% du budget
- Bloc rassurance anti-démarchage avec icon Shield et 3 garanties
- Toutes les cards avec animations fade-in + slide-in échelonnées (delay 200-500ms)

**Backoffice Safe** :
- ✅ Props interface identique
- ✅ Email confirmation logic préservée
- ✅ Recap rows inchangés

### ✅ Phase 4 : QA finale (TERMINÉ)

#### Vérifications techniques
- ✅ **Linting** : Aucune erreur TypeScript/ESLint
- ✅ **Fix build CapRover** : ajout de la prop requise `label` sur `AddressAutocomplete` (Step 1 Premium)
- ✅ **Imports** : Tous les imports résolus
- ✅ **Props** : Toutes les interfaces matchent
- ✅ **Handlers** : Tous les handlers préservés (handleSubmitQualificationV2, handleSubmitEstimationV2, handleSubmitAccessV2)
- ✅ **State** : TunnelFormState inchangé
- ✅ **Payload** : Aucune modification (createBackofficeLead, updateBackofficeLead)
- ✅ **Events GA4** : Aucune modification (form_start, tunnel_step_viewed, lead_submit)
- ✅ **Tracking** : useTunnelTracking préservé

#### Composants créés/modifiés
**Nouveaux composants** :
- `app/devis-gratuits-v3/_ui/` (9 composants design system)
- `components/tunnel/v2/StepQualificationV2Premium.tsx`
- `components/tunnel/v2/StepEstimationV2Premium.tsx`
- `components/tunnel/v2/LiveEstimatePanel.tsx`
- `components/tunnel/v2/StepContactPhotosV2Premium.tsx`

**Composants préservés** :
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` (inchangé)
- `components/tunnel/AddressAutocomplete.tsx` (inchangé)
- `components/tunnel/DatePickerFr.tsx` (inchangé)
- `components/tunnel/PriceRangeInline.tsx` (inchangé)
- `components/tunnel/v2/V2ProgressBar.tsx` (inchangé)

**Fichiers modifiés** :
- `app/devis-gratuits-v3/page.tsx` — Imports mis à jour (3 composants Premium)
- `migration_v4.md` — Documentation complète

**Fichiers créés (documentation)** :
- `app/devis-gratuits-v3/BACKOFFICE_CONTRACT.md`
- `app/devis-gratuits-v3/REFONTE_UI_LOG.md`

#### Tests à effectuer en prod
- [ ] Navigation Step 1 → 2 → 3 → 4 complète
- [ ] Validation bloque bien les champs requis (ville, surface, email)
- [ ] Coords récupérées via API Adresse
- [ ] Distance OSRM calculée correctement
- [ ] Pricing affiché correctement (min/max, count-up Step 2)
- [ ] Lead créé dans Back Office (DB Postgres)
- [ ] Email de confirmation envoyé
- [ ] Animations smooth (pas de lag, 60fps)
- [ ] Mobile iOS Safari OK
- [ ] Mobile Android Chrome OK
- [ ] Desktop Chrome/Firefox/Safari OK
- [ ] Entry avec ?leadId=xxx fonctionne (reprise dossier)
- [ ] Entry avec ?step=3&originPostalCode=... fonctionne (depuis moverz.fr)
- [ ] Debug mode ?debug=1 fonctionne

### 🎨 Guidelines visuelles adoptées

**Couleurs principales** :
- Primary gradient : `from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8]`
- Accent purple : `[#A78BFA]`
- Text dark : `[#0F172A]`
- Text subtle : `[#1E293B]/70`
- Success : `[#10B981]`
- Error : `[#EF4444]`
- Warning : `[#F59E0B]`
- Border : `[#E3E5E8]`

**Spacing** :
- Section gap : `space-y-6` mobile → `space-y-8` desktop
- Card padding : `p-6` mobile → `p-8` ou `p-10` desktop

**Border radius** :
- Small : `rounded-lg` (8px)
- Medium : `rounded-xl` (12px)
- Large : `rounded-2xl` (16px)
- Extra : `rounded-3xl` (24px)

**Shadows** :
- Subtle : `shadow-sm`
- Medium : `shadow-[0_8px_32px_rgba(107,207,207,0.12)]`
- Hover : `shadow-[0_12px_48px_rgba(107,207,207,0.15)]`
- Premium : `shadow-xl shadow-[#6BCFCF]/20`

**Animations** :
- Transition : `transition-all duration-200` ou `duration-300`
- Hover scale : `sm:hover:scale-[1.01]` ou `[1.02]`
- Active scale : `active:scale-[0.98]`
- Fade in : `animate-in fade-in duration-500`
- Slide in : `animate-in slide-in-from-bottom-4 duration-700`

### 📊 Impact attendu

**UX** :
- ⬆️ Engagement Step 2 : effet dopamine (count-up) + rassurance (chips + bloc "Pourquoi")
- ⬇️ Abandon Step 2 → Step 3 : CTA action-oriented + bénéfices clairs
- ⬆️ Conversion finale : expérience premium cohérente du début à la fin

**Tech** :
- ✅ Aucun breaking change backoffice
- ✅ Performance identique (animations CSS pures, pas de lib lourde)
- ✅ Maintenabilité améliorée (design system local réutilisable)
- ✅ Accessibilité préservée (aria-labels, focus states, keyboard navigation)

---

**Migration_v4 à jour.** ✅

## 2026-02-11 (13ème itération) — Panier light mode gradient turquoise→violet premium

**Problème** : Le dark mode était trop sombre, manquait de clarté. Besoin d'un light mode avec gradient turquoise→violet élégant.

**Solution** : Retour à un gradient light sophistiqué avec glassmorphism blanc, texte sombre, couleurs vives pour prix.

### 🎨 Background : Gradient turquoise→violet léger et lumineux

**Dark mode (avant)** :
```tsx
bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#0F172A]
shadow-2xl shadow-black/20
border border-white/10
```

**Light mode gradient (après)** :
```tsx
bg-gradient-to-br from-[#A8E6D8] via-[#6BCFCF] to-[#A78BFA]/60
shadow-xl shadow-[#6BCFCF]/20
border border-white/20
```

**Gradient détails** :
- `from-[#A8E6D8]` — Turquoise pastel clair (top-left)
- `via-[#6BCFCF]` — Turquoise signature Moverz (centre)
- `to-[#A78BFA]/60` — Violet dilué à 60% (bottom-right)
- Shadow turquoise colorée pour cohérence

**Overlay lumineux** :
```tsx
<div className="absolute top-0 left-0 w-full h-32 
  bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
```
- White glow en haut pour effet lumineux
- Gradient vertical to-b pour naturel

### 💎 Badge "Live" : Dot blanc sur fond glassmorphism

**Dark (avant)** :
```tsx
bg-white/10 border-white/20
<span bg-emerald-400>Live</span>
text-white/70
```

**Light (après)** :
```tsx
bg-white/30 backdrop-blur-xl border-white/40
<span bg-white animate-ping>Live</span>
text-white font-semibold
```

- Dot blanc éclatant (plus premium)
- Ping blanc pour dynamisme
- Texte blanc pur pour contraste

### 🪟 Card budget : Blanc glassmorphism

**Dark (avant)** :
```tsx
bg-white/5 border-white/10
text-white
```

**Light (après)** :
```tsx
bg-white/90 backdrop-blur-xl border-white/50
shadow-lg shadow-white/30
text-[#0F172A]  // Noir pour lisibilité
```

**Prix** :
```tsx
// Principal
text-[#0F172A] font-bold

// Min
text-emerald-600  // Vert foncé

// Max
text-rose-500  // Rose vif
```

### 📝 Section "Ajustements" : Texte blanc sur gradient

**Dark (avant)** : `text-white/40`  
**Light (après)** : `text-white/90` (contraste sur gradient)

### 💊 Pills ajustements : Blanc glassmorphism avec couleurs

**Dark (avant)** :
```tsx
bg-white/5 border-white/10
text-white/90
```

**Light (après)** :
```tsx
bg-white/80 backdrop-blur-xl border-white/60
hover:bg-white hover:border-white
shadow-sm hover:shadow-md
text-[#0F172A]  // Noir pour lisibilité
```

**Dots et montants** :
```tsx
// Positif (supplément)
w-2 h-2 bg-rose-500
text-rose-500

// Négatif (réduction)
bg-emerald-500
text-emerald-500

// Neutre
bg-gray-300
text-gray-400
```

### 🔍 Tooltip icon : Gradient turquoise→violet

**Dark (avant)** :
```tsx
bg-white/10 hover:bg-white/20
<HelpCircle text-white/50 />
```

**Light (après)** :
```tsx
bg-gradient-to-br from-[#6BCFCF] to-[#A78BFA]
hover:from-[#A78BFA] hover:to-[#6BCFCF]
<HelpCircle text-white />
```

- Retour au cercle gradient premium
- Hover inversé pour interactivité
- Icon blanche pour contraste

### 📂 Collapsible "Première estimation" : Blanc translucide

**Dark (avant)** :
```tsx
bg-white/5 border-white/10
text-white/40
```

**Light (après)** :
```tsx
bg-white/60 backdrop-blur-xl border-white/60
hover:bg-white/80 hover:shadow-md
text-[#0F172A]/50  // Labels sombres
text-[#0F172A]/80  // Valeurs sombres
```

**Sub-cards min/max** :
```tsx
text-emerald-600  // Min vert
text-rose-500     // Max rose
```

### 📊 Palette light mode gradient

| Élément | Couleur | Usage |
|---------|---------|-------|
| **Background** | `from-[#A8E6D8] via-[#6BCFCF] to-[#A78BFA]/60` | Gradient principal |
| **Overlay** | `white/20 to-transparent` | Glow lumineux top |
| **Cards blanches** | `white/90` | Glassmorphism opaque |
| **Pills blanches** | `white/80` | Glassmorphism translucide |
| **Collapsible** | `white/60` | Translucide |
| **Texte principal** | `#0F172A` (noir) | Lisibilité max |
| **Labels** | `#0F172A/50` | Secondaire |
| **Prix min** | `emerald-600` | Vert foncé |
| **Prix max** | `rose-500` | Rose vif |
| **Positif** | `rose-500` | Suppléments |
| **Négatif** | `emerald-500` | Réductions |
| **Badge Live** | `white` | Dot + texte |
| **Tooltip** | Gradient `#6BCFCF→#A78BFA` | Premium |

### ✅ Résultat vs dark mode

| Aspect | Dark mode | Light mode gradient |
|--------|-----------|---------------------|
| **Lisibilité** | Blanc/gris difficile | Noir sur blanc = parfait |
| **Luminosité** | Trop sombre | Lumineux et accueillant |
| **Gradient** | Noir/gris terne | Turquoise→violet vibrant |
| **Premium** | Élégant mais sombre | Coloré et sophistiqué |
| **Contraste** | Moyen (blanc/40-70) | Maximal (noir sur blanc) |
| **Couleurs** | Monochromes | Vert/rose pour prix |
| **Glassmorphism** | white/5 invisible | white/80-90 élégant |

### 🎯 Design final

**Premium moderne** : Gradient turquoise→violet + glassmorphism blanc  
**Lisibilité optimale** : Noir sur blanc, vert/rose pour prix  
**Sophistication** : Shadows colorées, borders subtiles, overlay lumineux  
**Cohérence Moverz** : Turquoise signature + violet accent (80/20)  

---

## 2026-02-11 (12ème itération) — Panier dark mode pro : Stripe/Linear style 2026

**Problème** : Le gradient turquoise→violet était trop chargé, pas assez pro/sleek/tech. Trop "jouet", manquait de sophistication.

**Solution** : Redesign complet en **dark mode ultra-clean** style Stripe/Linear/Vercel — minimal, élégant, accents subtils.

### 🎨 Philosophie design 2026

**Fini** : Gradients forts, couleurs vives, effets chargés  
**Nouveau** : Dark mode élégant, accents subtils, typographie raffinée

### 🌑 Background container : Noir profond avec gradient léger

**Avant** :
```tsx
bg-gradient-to-br from-[#6BCFCF] via-[#7BC4CC] to-[#A78BFA]
shadow-xl shadow-[#A78BFA]/30
border border-white/20
lg:top-20  // Trop proche de la progress bar
```

**Après** :
```tsx
bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#0F172A]  // Gradient léger pour éclaircir
shadow-2xl shadow-black/20  // Shadow noire élégante
border border-white/10  // Border ultra-subtile
lg:top-28  // Plus d'espace avec la progress bar
```

**Gradient léger** :
- `from-[#1E293B]` (slate-800, plus clair en haut-gauche)
- `via-[#0F172A]` (slate-900, milieu)
- `to-[#0F172A]` (slate-900, bas-droite)
- Direction `to-br` (bottom-right) pour effet naturel

**Accent overlay** :
```tsx
<div className="absolute top-0 right-0 w-64 h-64 
  bg-gradient-to-br from-[#6BCFCF]/10 to-[#A78BFA]/10 
  blur-3xl pointer-events-none" />
```
- Gradient turquoise→violet très dilué (opacity 10%)
- Blur énorme (blur-3xl) pour effet ambient
- Top-right corner pour subtilité

### 💎 Badge "Live" : Minimal et discret

**Avant** :
```tsx
bg-gradient-to-r from-white/15 via-[#A78BFA]/25 to-[#A78BFA]/35
border border-white/40
shadow-lg shadow-[#A78BFA]/40
<span h-2.5 w-2.5 bg-white />
<span text-xs font-black>Live</span>
```

**Après** :
```tsx
bg-white/10 backdrop-blur-xl border border-white/20
<span h-2 w-2 bg-emerald-400 />  // Dot vert = status live
<span text-[10px] font-semibold text-white/70>Live</span>
```

**Changements** :
- Background simple white/10
- Dot **vert emerald-400** (statut "live" standard)
- Dot plus petit (h-2)
- Texte plus discret (text-[10px], white/70)
- Pas de shadow colorée

### 🏷️ Titre "Votre estimation" : Sobre

**Avant** : `text-xl font-black drop-shadow-sm`  
**Après** : `text-xl sm:text-2xl font-bold text-white/90`

- font-black → font-bold (moins agressif)
- Pas de drop-shadow
- white/90 pour subtilité

### 🪟 Card budget : Dark glassmorphism subtil

**Avant** :
```tsx
bg-white/98 backdrop-blur-xl
border border-white/50
shadow-xl shadow-white/30
```

**Après** :
```tsx
bg-white/5 backdrop-blur-xl
border border-white/10
hover:border-white/20
```

**Changements** :
- Background très transparent (white/5 sur fond noir)
- Border ultra-subtile (white/10)
- Hover state pour interactivité
- **Pas de shadow** (clean total)

**Top accent line** :
```tsx
<div className="absolute top-0 inset-x-0 h-[2px] 
  bg-gradient-to-r from-transparent via-[#6BCFCF] to-transparent 
  opacity-50" />
```
- Ligne fine 2px au lieu de grosse barre
- Gradient turquoise subtil (opacity 50%)

### 💰 Prix : Typographie élégante monochrome

**Avant** :
```tsx
// Prix center
text-5xl sm:text-7xl font-black text-[#0F172A]

// Min/Max
text-lg sm:text-2xl font-black
text-emerald-400 / text-rose-400  // Couleurs vives
```

**Après** :
```tsx
// Prix center
text-5xl sm:text-7xl font-bold text-white tabular-nums

// Min/Max
text-base sm:text-lg font-semibold text-white/70 tabular-nums
// Labels
text-[10px] font-medium text-white/40
```

**Changements** :
- Tout en blanc (white, white/70, white/40)
- **Pas de couleurs vives** (plus de vert/rose)
- `tabular-nums` pour alignement parfait
- Alignement left/right au lieu de center (plus pro)
- Border top : `border-white/10` (ultra-subtile)

### 📝 Section "Ajustements" : Titre simple

**Avant** :
```tsx
<div className="flex items-center gap-3">
  <div className="h-[1px] bg-gradient-to-r from-transparent via-white/50 to-[#A78BFA]/40" />
  <p className="text-xs font-black drop-shadow-sm">Ajustements</p>
  <div className="h-[1px] bg-gradient-to-l..." />
</div>
```

**Après** :
```tsx
<p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-white/40">
  Ajustements
</p>
```

- **Suppression des séparateurs** (trop chargé)
- Titre simple et discret
- white/40 pour subtilité

### 💊 Pills ajustements : Dark minimal

**Avant** :
```tsx
px-4 py-3.5 rounded-xl
bg-white/98 backdrop-blur-md border border-white/60
shadow-sm
hover:shadow-lg hover:shadow-[#A78BFA]/25
active:scale-[0.98]

// Dot
w-2.5 h-2.5 bg-rose-400/emerald-400 shadow-[0_0_8px_...]

// Texte
text-sm font-semibold text-[#0F172A]

// Montant
text-lg font-black text-rose-400/emerald-400
```

**Après** :
```tsx
px-4 py-3 rounded-xl
bg-white/5 backdrop-blur-xl border border-white/10
hover:bg-white/10 hover:border-white/20

// Dot
w-1.5 h-1.5 bg-red-400/emerald-400  // Pas de glow

// Texte
text-sm font-medium text-white/90

// Montant
text-sm font-semibold text-red-400/emerald-400
```

**Changements** :
- Background dark transparent (white/5)
- Dot plus petit (w-1.5) sans glow
- Textes plus petits et discrets
- **Pas de scale**, **pas de shadow colorée**
- Hover simple (white/10 → white/20)
- Rouge au lieu de rose (red-400 plus neutre)

### 🔍 Tooltip icon : Ultra-simple

**Avant** :
```tsx
bg-gradient-to-br from-[#6BCFCF] to-[#A78BFA]
hover:from-[#A78BFA] hover:to-[#6BCFCF]
<HelpCircle className="w-3 h-3 text-white" strokeWidth={2.5} />
```

**Après** :
```tsx
bg-white/10 hover:bg-white/20
<HelpCircle className="w-3 h-3 text-white/50" strokeWidth={2} />
```

- Background simple white/10
- Pas de gradient
- Icon plus transparent (white/50)
- strokeWidth normal (2)

### 📂 Collapsible "Première estimation" : Clean

**Avant** :
```tsx
bg-white/20 border border-white/40
hover:shadow-lg hover:shadow-white/20
active:scale-[0.98]
```

**Après** :
```tsx
bg-white/5 border border-white/10
hover:bg-white/10 hover:border-white/20
```

- Même style que pills (cohérence)
- Pas de shadow
- Pas de scale

**Contenu** :
```tsx
// Labels
text-[10px] font-medium text-white/40

// Valeurs
text-base sm:text-lg font-semibold text-white/70 tabular-nums

// Sub-cards min/max : pas de cards, juste texte left/right
text-left / text-right
```

### 📊 Palette couleurs dark mode

| Élément | Couleur | Opacité | Usage |
|---------|---------|---------|-------|
| **Background** | `#0F172A` | 100% | Container principal |
| **Accent ambient** | `#6BCFCF→#A78BFA` | 10% blur-3xl | Subtil top-right |
| **Cards** | `white` | 5% | Glassmorphism |
| **Borders** | `white` | 10% | Ultra-subtiles |
| **Borders hover** | `white` | 20% | Interactivité |
| **Labels** | `white` | 40% | Textes secondaires |
| **Textes** | `white` | 70-90% | Textes principaux |
| **Prix principal** | `white` | 100% | Maximum contrast |
| **Status dot** | `emerald-400` | 100% | Live indicator |
| **Positif** | `emerald-400` | 100% | Réductions |
| **Négatif** | `red-400` | 100% | Suppléments |

### ✅ Résultats vs design précédent

| Aspect | Avant (gradient chargé) | Après (dark minimal) |
|--------|-------------------------|----------------------|
| **Background** | Gradient turquoise→violet éclatant | Noir #0F172A + accent subtil 10% |
| **Lisibilité** | Couleurs vives difficiles à lire | Blanc sur noir = contraste max |
| **Professionnalisme** | "Jouet", trop coloré | Stripe/Linear style |
| **Sophistication** | Gradients partout = chargé | Accents subtils = élégant |
| **Hiérarchie** | Couleurs concurrentes | Opacités claires (100% → 70% → 40%) |
| **Modernité** | 2020s gradient trend | 2026 dark minimal trend |
| **Shadows** | Colorées violettes partout | Noires élégantes ou absentes |
| **Interactions** | Scale + shadows colorées | Opacité simple |

### 🎯 Inspiration

**Stripe Dashboard** : Dark mode élégant, borders subtiles, typographie raffinée  
**Linear App** : Minimal, accents discrets, hiérarchie claire  
**Vercel Dashboard** : Clean, monochrome avec touches de couleur

### 💡 Règles dark mode 2026

1. **Background noir profond** (#0F172A, pas gris)
2. **Accents très dilués** (opacity 5-10%)
3. **Borders ultra-subtiles** (white/10)
4. **Typographie hiérarchisée** par opacité (100% → 70% → 40%)
5. **Couleurs fonctionnelles uniquement** (vert = réduction, rouge = supplément)
6. **Pas de gradients forts** (ambient blur-3xl OK)
7. **Hover states simples** (pas de scale/shadow)
8. **Tabular-nums** pour prix
9. **Alignment pro** (left/right au lieu de center)
10. **Moins c'est plus** (suppression séparateurs, simplification badges)

---

## 2026-02-11 (11ème itération) — Panier mobile premium 2026 : Glassmorphism + Micro-animations

**Problème** : Le panier mobile était trop plat et basique, manquait de sophistication 2026 (shadows faibles, corners basiques, badge Live petit).

**Solution** : Glassmorphism renforcé, shadows colorées XL, corners plus arrondis, badge Live premium, micro-animations tactiles.

### 📱 Container panier mobile amélioré

**Avant** :
```tsx
rounded-xl shadow-md p-5 space-y-5
```

**Après** :
```tsx
rounded-2xl shadow-xl shadow-[#A78BFA]/30 p-6 space-y-6 border border-white/20
```

**Changements** :
- `rounded-xl` → `rounded-2xl` (corners plus modernes)
- `shadow-md` → `shadow-xl` (shadow plus prononcée)
- `shadow-[#A78BFA]/25` → `shadow-[#A78BFA]/30` (violet plus visible)
- `p-5` → `p-6` (padding plus généreux)
- `space-y-5` → `space-y-6` (plus d'air entre sections)
- **Nouveauté** : `border border-white/20` pour définition des bords

### 💎 Badge "Live" ultra-premium mobile

**Avant** :
```tsx
<span className="... gap-2 px-3 py-1.5">
  <span className="h-2 w-2 bg-[#A78BFA]" />
  <span className="text-[10px]">Live</span>
</span>
```

**Après** :
```tsx
<span className="... gap-2 px-3 py-1.5 sm:py-2 
  bg-gradient-to-r from-white/15 via-[#A78BFA]/25 to-[#A78BFA]/35 
  border-white/40 
  shadow-lg shadow-[#A78BFA]/40">
  <span className="h-2.5 w-2.5">
    <span className="animate-ping ... bg-white" />
    <span className="... bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)]" />
  </span>
  <span className="text-xs font-black drop-shadow-sm">Live</span>
</span>
```

**Changements** :
- Dot : `h-2 w-2` → `h-2.5 w-2.5` (plus visible)
- Dot couleur : violet → **blanc** (contraste maximal)
- Dot glow : `shadow-[0_0_12px_rgba(167,139,250,0.8)]` → `shadow-[0_0_16px_rgba(255,255,255,0.9)]` (blanc éclatant)
- Ping : violet → **blanc** (`bg-white opacity-60`)
- Background : gradient plus opaque (`from-white/15 via-[#A78BFA]/25 to-[#A78BFA]/35`)
- Shadow badge : `shadow-[0_4px_16px_rgba(167,139,250,0.3)]` → `shadow-lg shadow-[#A78BFA]/40`
- Texte : `text-[10px]` → `text-xs font-black drop-shadow-sm` (plus gros et gras)

### 🏷️ Titre "Votre estimation" amélioré

**Avant** : `text-lg font-bold`  
**Après** : `text-xl font-black drop-shadow-sm`

- Plus gros, plus gras, avec drop-shadow pour contraste sur gradient

### 🪟 Card budget principale mobile

**Avant** :
```tsx
rounded-xl p-5 shadow-lg border-white/40
```

**Après** :
```tsx
rounded-2xl p-6 shadow-xl shadow-white/30 border-white/50
```

**Changements** :
- `rounded-xl` → `rounded-2xl` (plus moderne)
- `p-5` → `p-6` (plus généreux)
- `shadow-lg` → `shadow-xl` (plus prononcée)
- `shadow-white/20` → `shadow-white/30` (plus visible)
- `border-white/40` → `border-white/50` (border plus définie)

### ✨ Séparateurs "AJUSTEMENTS" plus visibles

**Avant** :
```tsx
<div className="gap-3 mb-4">
  <div className="h-[1px] bg-gradient-to-r from-transparent via-white/40 to-[#A78BFA]/30" />
  <p className="text-xs font-bold text-white/90">Ajustements</p>
</div>
```

**Après** :
```tsx
<div className="gap-3 mb-5">
  <div className="h-[1px] bg-gradient-to-r from-transparent via-white/50 to-[#A78BFA]/40" />
  <p className="text-xs sm:text-sm font-black drop-shadow-sm">Ajustements</p>
</div>
```

**Changements** :
- Séparateurs : `via-white/40 to-[#A78BFA]/30` → `via-white/50 to-[#A78BFA]/40` (plus opaques)
- Texte : `font-bold text-white/90` → `font-black drop-shadow-sm` (plus gras + shadow)
- Margin : `mb-4` → `mb-5` (plus d'air)

### 💊 Pills ajustements mobile interactives

**Avant** :
```tsx
px-4 py-3 rounded-xl border-white/50 
hover:shadow-[0_4px_16px_rgba(167,139,250,0.35)]
```

**Après** :
```tsx
px-4 py-3.5 rounded-xl border-white/60 shadow-sm
hover:shadow-lg hover:shadow-[#A78BFA]/25 
active:scale-[0.98]
```

**Changements** :
- `py-3` → `py-3.5` (plus de hauteur)
- `border-white/50` → `border-white/60` (border plus visible)
- **Nouveauté** : `shadow-sm` de base (depth même sans hover)
- Hover shadow : plus prononcée (`shadow-lg`) et colorée
- **Nouveauté** : `active:scale-[0.98]` (feedback tactile mobile)
- Transition : `duration-200` → `duration-300` (plus smooth)

### 📂 Collapsible "Première estimation" mobile

**Avant** :
```tsx
rounded-xl bg-white/15 border-white/30 p-3
hover:shadow-[0_4px_16px_rgba(255,255,255,0.2)]
```

**Après** :
```tsx
rounded-xl bg-white/20 border-white/40 p-3.5
hover:shadow-lg hover:shadow-white/20
active:scale-[0.98]
```

**Changements** :
- Background : `bg-white/15` → `bg-white/20` (plus opaque)
- Border : `border-white/30` → `border-white/40` (plus visible)
- Padding : `p-3` → `p-3.5` (plus généreux)
- Hover shadow : nommée (`shadow-lg`) au lieu de custom
- **Nouveauté** : `active:scale-[0.98]` (feedback tactile)

### 🎯 Sub-cards min/max dans collapsible

**Avant** :
```tsx
rounded-lg sm:rounded-xl p-2 sm:p-3 border-white/50
```

**Après** :
```tsx
rounded-xl p-2.5 sm:p-3 border-white/60 shadow-sm
```

**Changements** :
- `rounded-lg` → `rounded-xl` même en mobile
- `p-2` → `p-2.5` (padding mobile plus généreux)
- `border-white/50` → `border-white/60` (border plus définie)
- **Nouveauté** : `shadow-sm` pour depth

### 📊 Résumé des améliorations mobile

| Élément | Avant | Après | Gain |
|---------|-------|-------|------|
| **Container** | rounded-xl shadow-md | rounded-2xl shadow-xl + border | +modernité +depth |
| **Badge Live dot** | h-2 w-2 violet | h-2.5 w-2.5 blanc glow | +visible +premium |
| **Badge Live texte** | text-[10px] | text-xs font-black | +lisible |
| **Card budget** | rounded-xl p-5 shadow-lg | rounded-2xl p-6 shadow-xl | +moderne +généreux |
| **Pills** | py-3 border-white/50 | py-3.5 border-white/60 shadow-sm | +tactile +visible |
| **Collapsible** | bg-white/15 p-3 | bg-white/20 p-3.5 active:scale | +opaque +feedback |
| **Titre** | text-lg font-bold | text-xl font-black | +impact |

### 🎨 Philosophie 2026 mobile

**Glassmorphism renforcé** :
- Borders plus opaques (`white/50` → `white/60`)
- Backgrounds plus opaques (`white/15` → `white/20`)
- Shadows de base ajoutées partout (`shadow-sm`)

**Micro-animations tactiles** :
- `active:scale-[0.98]` sur pills et collapsible
- `duration-300` au lieu de `200` (plus smooth)
- Feedback visuel instantané au touch

**Shadows colorées** :
- Container : `shadow-xl shadow-[#A78BFA]/30` (violet)
- Badge : `shadow-lg shadow-[#A78BFA]/40` (violet éclatant)
- Pills hover : `shadow-lg shadow-[#A78BFA]/25` (violet subtil)

**Spacing généreux** :
- Padding global : `p-5` → `p-6`
- Spacing sections : `space-y-5` → `space-y-6`
- Padding pills : `py-3` → `py-3.5`

### ✅ Résultat

- **Premium assumé** : glassmorphism + shadows XL même en mobile ✅
- **Visibilité** : badge Live blanc éclatant, borders renforcés ✅
- **Tactile** : feedback `active:scale` sur tous les éléments interactifs ✅
- **Modernité 2026** : rounded-2xl, shadows colorées, spacing généreux ✅
- **Cohérence** : desktop/mobile harmonieux ✅

---

## 2026-02-11 (10ème itération) — Cards formules mobile : Design premium moderne

**Problème** : Les cards de sélection formule (Éco, Standard, Premium) étaient moches en mobile : trop petites, badges illisibles, textes minuscules, ombres plates.

**Solution** : Cards plus larges, gradient subtil sur sélection, badge simplifié, textes agrandis, ombres colorées.

### 📱 Cards formules améliorées (mobile-first)

#### 1️⃣ Taille et espacement

**Avant** :
- Width: `w-[260px]` (trop petite)
- Padding: `p-5`
- Gap: `gap-3`
- Border radius: `rounded-xl`

**Après** :
- Width: `w-[280px]` (plus large, meilleure lisibilité)
- Padding: `p-6` (plus généreux)
- Gap: `gap-4` (plus d'air)
- Border radius: `rounded-2xl` (plus moderne)
- Negative margin trick: `-mx-6 px-6` pour full-bleed sur mobile

#### 2️⃣ État sélectionné avec gradient

**Avant** : `bg-[#6BCFCF]/10 shadow-sm`  
**Après** :
```tsx
bg-gradient-to-br from-[#6BCFCF]/10 via-white/50 to-[#A78BFA]/5
shadow-lg shadow-[#6BCFCF]/20
```
- Gradient turquoise→violet subtil
- Shadow colorée turquoise
- Plus de depth

#### 3️⃣ État non-sélectionné

**Avant** : `bg-white shadow-sm`  
**Après** :
```tsx
bg-white shadow-md
hover:shadow-lg hover:shadow-[#6BCFCF]/15
```
- Shadow de base plus prononcée (`shadow-md` vs `shadow-sm`)
- Hover avec shadow colorée turquoise

#### 4️⃣ Badge "Recommandé" → "Top"

**Avant** :
```tsx
<span className="... px-3 py-1">
  <span className="bg-gradient-to-r from-[#6BCFCF] to-[#A78BFA] bg-clip-text text-transparent text-[10px]">
    ✨ Recommandé
  </span>
</span>
```
**Problème** : Gradient text illisible, texte trop long

**Après** :
```tsx
<span className="... px-2.5 py-1">
  <span className="text-[#A78BFA] text-[10px] font-bold uppercase">
    ✨ Top
  </span>
</span>
```
- Texte violet uni (lisible)
- "Top" au lieu de "Recommandé" (plus court)
- Badge plus compact

#### 5️⃣ Titre formule agrandi

**Avant** : `text-lg font-black`  
**Après** : `text-xl sm:text-2xl font-black`

- Hiérarchie visuelle claire
- Meilleure lisibilité mobile

#### 6️⃣ Prix plus visible (PriceRangeInline)

**Avant** (variant compact) :
- Center: `text-base`
- Side (min/max): `text-[11px]`
- Colors: vert foncé `#14532D` / rouge foncé `#7F1D1D`

**Après** (variant compact) :
```tsx
center: "text-xl"  // agrandi
side: "text-xs"    // agrandi
// Couleurs modernes
min: text-emerald-500  // vert vif
max: text-rose-400     // rose moderne
```

#### 7️⃣ Bullets agrandis et stylés

**Avant** :
```tsx
<ul className="mt-2 space-y-1 text-xs text-[#1E293B]/70">
  <li>• {b}</li>
</ul>
```

**Après** :
```tsx
<ul className="space-y-2 text-sm text-[#1E293B]/80">
  <li className="flex items-start gap-2">
    <span className="text-[#6BCFCF] font-bold mt-0.5">•</span>
    <span>{b}</span>
  </li>
</ul>
```
- Texte `text-sm` (vs `text-xs`)
- Bullets turquoise (vs noirs)
- Layout flex pour alignement parfait

#### 8️⃣ Titre section "Votre formule"

**Avant** : `text-sm font-semibold`  
**Après** : `text-base font-bold`

### 📊 Comparaison avant/après

| Élément | Avant (moche) | Après (premium) |
|---------|---------------|-----------------|
| **Card width** | 260px | 280px |
| **Padding** | p-5 | p-6 |
| **Border radius** | rounded-xl | rounded-2xl |
| **Shadow sélection** | shadow-sm | shadow-lg + colorée |
| **Background sélection** | flat turquoise/10 | gradient turquoise→violet |
| **Badge** | "Recommandé" gradient text | "Top" violet uni |
| **Titre formule** | text-lg | text-xl sm:text-2xl |
| **Prix center** | text-base | text-xl |
| **Prix min/max** | text-[11px] | text-xs |
| **Bullets** | text-xs noirs | text-sm turquoise |

### 🎯 Résultat

- **Lisibilité** : Textes agrandis (`text-xl`, `text-sm`) ✅
- **Hiérarchie** : Titre/Prix/Bullets bien distincts ✅
- **Modernité** : Gradient sélection + shadows colorées ✅
- **Premium** : Cards plus larges, padding généreux ✅
- **UX** : Badge "Top" court et lisible ✅
- **Color scheme** : Turquoise→Violet cohérent ✅

---

## 2026-02-11 (9ème itération) — Panier ultra-moderne 2026 : Gradient turquoise→violet + Glassmorphism premium

**Problème** : Le panier était trop turquoise classique (100% cyan), pas assez moderne ni sophistiqué pour 2026.

**Solution** : Gradient turquoise→violet sophistiqué + glassmorphism renforcé + overlay lumineux.

### 🎨 Background gradient premium turquoise→violet

**Avant** : `bg-gradient-to-br from-[#6BCFCF] via-[#5AB8B8] to-[#4AA8A5]` (100% turquoise)  
**Après** :
```tsx
bg-gradient-to-br from-[#6BCFCF] via-[#7BC4CC] to-[#A78BFA]
```
- **From** : Turquoise signature `#6BCFCF`
- **Via** : Blend turquoise-violet `#7BC4CC` (transition douce)
- **To** : Violet premium `#A78BFA`

### ✨ Overlay glow moderne 2026

**Nouveauté** : Layer overlay subtil pour effet depth
```tsx
<div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-[#A78BFA]/10 pointer-events-none" />
```
- **Direction** : `to-tr` (top-right) pour effet diagonal moderne
- **Via white/5** : Subtle glow blanc
- **To violet/10** : Accent violet en haut à droite
- **pointer-events-none** : Ne bloque pas les interactions

### 💎 Shadow violette (au lieu de turquoise)

**Avant** : `shadow-[#6BCFCF]/20`  
**Après** : `shadow-[#A78BFA]/25`

### 🪟 Glassmorphism renforcé sur les cards

**Cards budget/ajustements** :
- **Avant** : `bg-white/95 backdrop-blur-sm shadow-sm border border-white/40`
- **Après** : `bg-white/98 backdrop-blur-xl shadow-lg sm:shadow-2xl shadow-white/20 border border-white/40`

**Pills ajustements** :
- **Avant** : `bg-white/95 backdrop-blur-sm border border-white/40`
- **Après** : `bg-white/98 backdrop-blur-md border border-white/50`

**Collapsible première estimation** :
- **Avant** : `bg-white/10 backdrop-blur-sm border border-white/20`
- **Après** : `bg-white/15 backdrop-blur-md border border-white/30`

### 🏷️ Badge "Live" ultra-premium

**Avant** : `from-[#6BCFCF]/20 to-[#A78BFA]/20 border border-[#A78BFA]/30`  
**Après** :
```tsx
bg-gradient-to-r from-white/10 via-[#A78BFA]/20 to-[#A78BFA]/30 
border border-white/30 
backdrop-blur-md 
shadow-[0_4px_16px_rgba(167,139,250,0.3)]
```

### 📐 Z-index layering

Toutes les sections ont `relative z-10` pour être au-dessus de l'overlay :
- Titre + badge
- Budget affiné card
- Ajustements
- Première estimation

### 🎨 Résultat couleurs 2026

| Zone | Couleur | Effet |
|------|---------|-------|
| **Background gradient** | Turquoise `#6BCFCF` → Blend `#7BC4CC` → Violet `#A78BFA` | Sophistication premium |
| **Overlay** | White/5 → Violet/10 | Depth moderne |
| **Shadow** | Violet `#A78BFA/25` | Cohérence violet |
| **Cards** | White/98 + blur-xl | Glassmorphism ultra |
| **Pills** | White/98 + blur-md | Clarté parfaite |
| **Badge Live** | White/10 → Violet/20 → Violet/30 | Premium accent |

### 📊 Impact

- **Modernité** : Gradient turquoise→violet = 2026 ultra-premium ✅
- **Depth** : Overlay + z-index = effet layered sophistiqué ✅
- **Glassmorphism** : Blur renforcé + opacité 98% = clarté + style ✅
- **Cohérence** : Violet partout (background, shadow, badge, hover) ✅
- **Lisibilité** : White/98 au lieu de /95 = meilleur contraste ✅

**Message visuel** : "Innovation technologique premium" grâce au gradient turquoise→violet sophistiqué ! 🚀💎

---

## 2026-02-11 (8ème itération) — Panier premium : Tooltips + Touches violet signature 💎

**Problème** : Le panier Step 3 manquait de tooltips explicatifs sur les ajustements et n'exploitait pas assez le violet accent (couleur "Innovation & Premium").

**Améliorations** :
- ✅ **Tooltips explicatifs** sur chaque ligne d'ajustement (Distance, Densité, Cuisine, Accès, Date) avec icône `HelpCircle`
- ✅ **Badge "Live" violet** avec dot animé violet et gradient turquoise→violet
- ✅ **Titre "BUDGET AFFINÉ"** avec gradient text turquoise→violet (`bg-clip-text`)
- ✅ **Border glow hero** avec gradient turquoise→violet au top
- ✅ **Séparateurs "AJUSTEMENTS"** avec gradient violet aux extrémités
- ✅ **Hover violet** sur pills ajustements (`border-[#A78BFA]/30`, `shadow violet`)

### 1️⃣ Badge "Live" avec violet premium

**Avant** : Simple dot blanc animé  
**Après** :
```tsx
<span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#6BCFCF]/20 to-[#A78BFA]/20 border border-[#A78BFA]/30 backdrop-blur-sm">
  <span className="relative inline-flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A78BFA] opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A78BFA] shadow-[0_0_12px_rgba(167,139,250,0.8)]" />
  </span>
  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">Live</span>
</span>
```

### 2️⃣ Titre "BUDGET AFFINÉ" avec gradient premium

**Avant** : `text-[#6BCFCF]` uni  
**Après** :
```tsx
<p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] bg-gradient-to-r from-[#6BCFCF] to-[#A78BFA] bg-clip-text text-transparent">
  Budget affiné
</p>
```

### 3️⃣ Border glow avec gradient turquoise→violet

**Avant** : `via-[#6BCFCF]/30` uniquement  
**Après** :
```tsx
<div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6BCFCF]/30 via-[#A78BFA]/20 to-transparent" />
```

### 4️⃣ Séparateurs "AJUSTEMENTS" avec violet

**Avant** : `to-white/40` uniquement  
**Après** :
```tsx
<div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/40 to-[#A78BFA]/30" />
```

### 5️⃣ Tooltips explicatifs avec `HelpCircle` en cercle gradient

**Nouveauté** : Import `HelpCircle` de `lucide-react` + tooltips pour chaque type d'ajustement :

```tsx
const tooltips: Record<string, string> = {
  distance: "La distance est recalculée à partir des adresses exactes quand elles sont renseignées",
  density: "Le niveau de mobilier impacte le volume et donc le tarif final",
  kitchen: "Chaque équipement de cuisine compte (four, frigo, lave-vaisselle...)",
  access: "Les étages sans ascenseur et les accès contraints augmentent le temps de manutention",
  date: "Les périodes de forte demande (été, fin de mois) impactent les tarifs",
};

// Dans le label avec cercle gradient premium
{tooltips[l.key] && (
  <span
    className="inline-flex items-center justify-center w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full bg-gradient-to-br from-[#6BCFCF] to-[#A78BFA] hover:from-[#A78BFA] hover:to-[#6BCFCF] transition-all duration-300 cursor-help"
    title={tooltips[l.key]}
  >
    <HelpCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={2.5} />
  </span>
)}
```

**Style** :
- **Cercle gradient** turquoise→violet (`from-[#6BCFCF] to-[#A78BFA]`)
- **Hover inversé** : gradient s'inverse pour effet interactif
- **Icône blanche** : `text-white` + `strokeWidth={2.5}` pour épaisseur visible
- **Taille responsive** : `w-4 h-4` mobile, `w-[18px] h-[18px]` desktop
- **Icône interne** : `w-2.5 h-2.5` mobile, `w-3 h-3` desktop

### 6️⃣ Hover violet sur pills ajustements

**Avant** : `hover:border-white/60`, `shadow-[0_4px_16px_rgba(255,255,255,0.3)]`  
**Après** :
```tsx
hover:border-[#A78BFA]/30 
sm:hover:shadow-[0_4px_16px_rgba(167,139,250,0.25)]
```

### 🎨 Ratio couleurs Moverz 2.0 respecté

| Zone panier | Couleur | Usage |
|-------------|---------|-------|
| **Background gradient** | Turquoise `#6BCFCF` → `#5AB8B8` → `#4AA8A5` | 80% (primaire) |
| **Budget affiné titre** | Gradient Turquoise→Violet | Accent premium |
| **Badge "Live"** | Dot violet `#A78BFA` + gradient turquoise→violet | Innovation |
| **Séparateurs** | Gradient white→violet | Accent subtil |
| **Hover pills** | Border + shadow violet | Interactivité premium |
| **Tooltips icon** | Blanc (contraste sur fond turquoise) | Accessibilité |

### 📊 Impact

- **UX** : Tooltips explicatifs réduisent les questions utilisateurs ✅
- **Premium** : Violet apporte sophistication et innovation ✅
- **Cohérence** : Ratio 80/20 turquoise/violet respecté ✅
- **Accessibilité** : `cursor-help` + `title` natif pour tooltips ✅
- **Mobile/Desktop** : Icon `w-3 h-3 sm:w-3.5 sm:h-3.5` responsive ✅

---

## 2026-02-11 (7ème itération) — Mobile-First : Design sobre et clean

**Problème** : Le design premium 2026 était trop chargé sur mobile (glassmorphism, shadows complexes, effets shine, padding généreux, pills massives). Principe **Mobile-First** non respecté.

**Solution** : Design sobre mobile + design premium desktop uniquement.

### 🎯 Règles Mobile-First

| Élément | Mobile (sobre) | Desktop (premium) |
|---------|----------------|-------------------|
| **Cards principales** | `bg-white` opaque, `shadow-sm`, `p-6`, `rounded-xl`, `border-gray-100` | `bg-white/80 backdrop-blur-xl`, `shadow-[0_8px_32px_rgba(107,207,207,0.12)]`, `p-10`, `rounded-2xl`, `border-white/20` |
| **CTA buttons** | `bg-[#6BCFCF]` solid, `shadow-sm`, `py-4`, `text-base`, hover `bg-[#5AB8B8]` | `bg-gradient-to-r from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8]`, `shadow-[0_8px_30px_rgba(107,207,207,0.4)]`, `py-5`, `text-lg`, shine effect |
| **Pills sélection** | `px-5 py-3`, `rounded-xl`, `shadow-sm`, scale `1.0` | `px-8 py-5`, `rounded-2xl`, `shadow-[0_8px_30px_rgba(107,207,207,0.3)]`, `hover:scale-[1.02]` |
| **Sub-cards** | `bg-white`, `shadow-sm`, `p-6`, `border-gray-100` | `bg-white/70 backdrop-blur-xl`, `shadow-[0_8px_32px_rgba(0,0,0,0.08)]`, `p-8`, `border-white/30` |
| **Espacements** | `space-y-6`, `gap-3` | `space-y-8`, `gap-4` |
| **Sidebar** | En bas (mobile), `p-5`, `space-y-5`, `rounded-xl`, `shadow-md` | Sticky droite, `p-10`, `space-y-8`, `rounded-3xl`, `shadow-2xl` |
| **Textes badges** | `text-xs`, `px-3 py-1.5` | `text-sm`, `px-4 py-2` |
| **Icons** | `w-3 h-3` | `w-4 h-4` |
| **Budget hero** | Montant `text-5xl`, min/max `text-lg` | Montant `text-7xl`, min/max `text-2xl` |

### ✅ Modifications appliquées

**1. Cards principales (Steps 1-4)**
```tsx
// Mobile sobre → Desktop premium
className="rounded-xl sm:rounded-2xl bg-white sm:bg-white/80 sm:backdrop-blur-xl border border-gray-100 sm:border-white/20 shadow-sm sm:shadow-[0_8px_32px_rgba(107,207,207,0.12)] p-6 sm:p-10"
```

**2. CTA Buttons (tous les steps)**
```tsx
// Mobile solid cyan → Desktop gradient + shine
className="bg-[#6BCFCF] sm:bg-gradient-to-r sm:from-[#A8E6D8] sm:via-[#6BCFCF] sm:to-[#5AB8B8] py-4 sm:py-5 text-base sm:text-lg shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.4)]"

// Shine effect desktop only
<div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
```

**3. Pills (densité, cuisine, formules, accès)**
```tsx
// Mobile compactes → Desktop généreuses
className="px-5 py-3 sm:px-8 sm:py-5 rounded-xl sm:rounded-2xl shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)]"
```

**4. Sub-cards (Step 2 budget, Step 3 adresses, Step 4 recap)**
```tsx
// Mobile opaques → Desktop glassmorphism
className="rounded-xl sm:rounded-2xl bg-white sm:bg-white/70 sm:backdrop-blur-xl border border-gray-100 sm:border-white/30 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 sm:p-8"
```

**5. Sidebar mobile (Step 3)**
- **Ordre** : `order-last lg:order-none` (sidebar en bas mobile, droite desktop)
- **Sticky** : désactivé mobile, `lg:sticky lg:top-20` desktop
- **Padding** : `p-5 sm:p-10`, `space-y-5 sm:space-y-8`
- **Border radius** : `rounded-xl sm:rounded-3xl`
- **Shadow** : `shadow-md sm:shadow-2xl`
- **Pills ajustements** : `px-4 py-3 sm:px-5 sm:py-4`, `rounded-xl sm:rounded-2xl`
- **Dots** : `w-2 h-2 sm:w-2.5 sm:h-2.5`
- **Textes** : `text-xs sm:text-sm`, `text-base sm:text-lg`

**6. Budget hero (sidebar)**
- **Titre** : `text-lg sm:text-xl`
- **Montant principal** : `text-5xl sm:text-7xl`
- **Min/Max** : `text-lg sm:text-2xl`
- **Padding** : `p-5 sm:p-8`, `mb-4 sm:mb-6`

**7. Espacements globaux**
```tsx
// Mobile compact → Desktop aéré
space-y-6 sm:space-y-8
gap-3 sm:gap-4
p-6 sm:p-10
```

**8. Badges (Step 4 "Dossier créé")**
```tsx
px-3 py-1.5 sm:px-4 sm:py-2
text-xs sm:text-sm
<Check className="w-3 h-3 sm:w-4 sm:h-4" />
```

### 📊 Impact

| Métrique | Mobile avant | Mobile après | Desktop |
|----------|--------------|--------------|---------|
| **Lisibilité** | ❌ Glassmorphism difficile à lire | ✅ Opaque, contraste max | ✅ Glassmorphism subtil |
| **Performance** | ❌ Backdrop-blur coûteux | ✅ Pas de blur | ✅ Blur si GPU OK |
| **UX tactile** | ❌ Pills petites, CTA fins | ✅ Zones tactiles généreuses | ✅ Hover states riches |
| **Cohérence** | ❌ Même design mobile/desktop | ✅ Sobre mobile, premium desktop | ✅ Premium assumé |
| **Load time** | ❌ Effets lourds mobile | ✅ Minimal CSS mobile | ✅ Premium CSS chargé |

### 🎨 Philosophie Mobile-First

**Mobile = SOBRE ET EFFICACE**  
- Opacité totale (meilleure lisibilité)
- Shadows simples (`shadow-sm`)
- Pas d'effets shine/blur/glow
- Padding réduit (`p-5`, `p-6`)
- CTA solid avec hover simple
- Textes compacts mais lisibles

**Desktop = PREMIUM ET IMMERSIF**  
- Glassmorphism subtil (`backdrop-blur-xl`, `bg-white/80`)
- Shadows colorées complexes (`shadow-[0_8px_32px_rgba(107,207,207,0.12)]`)
- Effets shine, hover scale, glow
- Padding généreux (`p-8`, `p-10`)
- CTA gradient avec multi-layers
- Typographie massive et aérée

**Breakpoint** : `sm` (640px) pour tout (cohérence absolue)

### ✅ Résultat

- **Mobile** : Design sobre, rapide, tactile optimal, lisibilité maximale
- **Desktop** : Design premium 2026 conservé, immersif, moderne
- **Responsive** : Cohérent sur toutes tailles d'écran
- **Performance** : Optimisé mobile (pas de blur/glow/shine), premium assumé desktop

---

## 2026-02-11 (6ème itération) — Sidebar Step 3 ultra-premium : détails visuels + micro-interactions

**Problème** : La sidebar Step 3 avait le design premium mais manquait de détails visuels (pills plates, dots invisibles, titres sans décoration, couleurs ternes).

**Améliorations micro-détails** :
- ✅ Pills ajustements glassmorphism avec border glow
- ✅ Dots colorés plus gros avec shadow glow coloré
- ✅ Titre "AJUSTEMENTS" avec séparateurs gradient stylés
- ✅ Budget hero avec subtle glow top turquoise
- ✅ Montants ajustements plus gros et couleurs vives
- ✅ Première estimation plus visible avec glassmorphism
- ✅ Cohérence couleurs rose-400/emerald-400 partout

### 1️⃣ Pills Ajustements Glassmorphism Premium

**Avant** : `bg-white/90` simple  
**Après** :
```tsx
bg-white/95 backdrop-blur-sm
border border-white/40
hover:bg-white 
hover:border-white/60 
hover:shadow-[0_4px_16px_rgba(255,255,255,0.3)]
```

### 2️⃣ Dots Colorés avec Shadow Glow

**Avant** : `w-2 h-2` sans glow  
**Après** :
```tsx
w-2.5 h-2.5 rounded-full

// Rose (positif)
bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]

// Emerald (négatif)
bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]

// Gray (neutre)
bg-gray-400
```

### 3️⃣ Titre "AJUSTEMENTS" avec Séparateurs

**Avant** : texte simple  
**Après** :
```tsx
<div className="flex items-center gap-3">
  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/40" />
  <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/90">
    Ajustements
  </p>
  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/40" />
</div>
```

### 4️⃣ Budget Hero avec Subtle Glow Top

**Ajout** :
```tsx
<div className="rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-lg relative overflow-hidden">
  {/* Subtle glow top */}
  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6BCFCF]/30 to-transparent" />
  
  {/* Contenu */}
</div>
```

### 5️⃣ Montants Ajustements Plus Gros

**Avant** : `text-base` + couleurs foncées (600)  
**Après** :
```tsx
// Typographie
text-lg font-black (au lieu de text-base)

// Couleurs vives
text-rose-400 (au lieu de rose-600)
text-emerald-400 (au lieu de emerald-600)
```

### 6️⃣ Première Estimation Plus Visible

**Avant** : `bg-white/10` invisible  
**Après** :
```tsx
bg-white/10 backdrop-blur-sm
border border-white/20
hover:bg-white/15 
hover:border-white/30
shadow-sm
```

### 7️⃣ Cohérence Couleurs Partout

**Changement global** :
- Min/Max budget hero : `emerald-600` → `emerald-400`
- Min/Max budget hero : `rose-600` → `rose-400`
- Min/Max première estimation : `emerald-600` → `emerald-400`
- Min/Max première estimation : `rose-600` → `rose-400`
- Montants ajustements : `rose-600` → `rose-400`, `emerald-600` → `emerald-400`

**Résultat** : couleurs vives cohérentes `rose-400` et `emerald-400` dans toute la sidebar.

### ⚠️ Aucun changement fonctionnel
- Tracking inchangé
- Champs inchangés
- Payload inchangé
- Textes et liens inchangés

---

## 2026-02-11 (5ème itération) — Design System Premium 2026 Moverz : glassmorphism + effets ultra-modernes

**Problème** : La 4ème itération respectait la charte couleurs mais manquait tous les effets visuels premium 2026 (glassmorphism, shadows colorées, gradients sophistiqués, micro-animations, shine effects).

**Objectif** : Appliquer **TOUT le Design System Premium 2026 Moverz** :
- ✅ Glassmorphism nouvelle génération sur toutes les cards
- ✅ Shadows colorées turquoise avec glow premium
- ✅ CTA gradient turquoise + shine effect + overlay au hover
- ✅ Dots animés double glow + ping animation
- ✅ Badge "Recommandé" gradient turquoise→violet premium
- ✅ Focus states ring-4 premium avec shadow colorée
- ✅ Pills hover glow turquoise + scale premium

### 1️⃣ Glassmorphism Nouvelle Génération (Cards)

**Toutes les cards principales** :
```tsx
// Cards Steps 1/2/3/4
rounded-2xl
bg-white/80              // transparence 80%
backdrop-blur-xl         // blur effet verre
border border-white/20   // border subtile
shadow-[0_8px_32px_rgba(107,207,207,0.12)]
hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)]
transition-all duration-500
```

**Sous-cards Step 3** :
```tsx
// Densité, cuisine, etc.
rounded-2xl
bg-white/70              // plus transparent
backdrop-blur-xl
border border-white/30
shadow-[0_8px_32px_rgba(0,0,0,0.08)]
hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)]
```

### 2️⃣ CTA Ultra-Premium (Gradient + Shine + Overlay)

**Boutons principaux avec effets multiples** :
```tsx
// Container
group relative w-full
rounded-xl
bg-gradient-to-r from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8]
border border-white/20
py-5 text-lg font-bold text-white
shadow-[0_8px_30px_rgba(107,207,207,0.4)]
hover:shadow-[0_12px_50px_rgba(107,207,207,0.6)]
hover:scale-[1.02] active:scale-[0.98]
overflow-hidden

// Texte avec z-index
<span className="relative z-10">Texte</span>

// Gradient hover overlay
<div className="
  absolute inset-0 
  bg-gradient-to-r from-[#A8E6D8] to-[#6BCFCF] 
  opacity-0 group-hover:opacity-100 
  transition-opacity duration-300
" />

// Shine effect
<div className="
  absolute inset-0 
  bg-gradient-to-r from-transparent via-white/30 to-transparent 
  translate-x-[-100%] group-hover:translate-x-[100%] 
  transition-transform duration-700
" />
```

### 3️⃣ Dots Animés Double Glow

**Sidebar header** :
```tsx
<span className="relative inline-flex h-3 w-3">
  {/* Ping animation outer */}
  <span className="
    animate-ping absolute inline-flex h-full w-full 
    rounded-full bg-white opacity-75
  " />
  
  {/* Static inner dot avec glow */}
  <span className="
    relative inline-flex rounded-full h-3 w-3 
    bg-white 
    shadow-[0_0_12px_rgba(255,255,255,0.8)]
  " />
</span>
```

### 4️⃣ Badge "Recommandé" Gradient Premium

**Badge turquoise→violet avec texte gradient** :
```tsx
<span className="
  inline-flex items-center gap-1.5 
  rounded-full 
  bg-gradient-to-r from-[#6BCFCF]/20 to-[#A78BFA]/20 
  border border-[#A78BFA]/50 
  px-3 py-1 
  shadow-[0_4px_16px_rgba(167,139,250,0.25)]
">
  <span className="
    bg-gradient-to-r from-[#6BCFCF] to-[#A78BFA] 
    bg-clip-text text-transparent 
    text-[10px] font-bold tracking-wider
  ">
    ✨ Recommandé
  </span>
</span>
```

### 5️⃣ Focus States Premium (Ring-4)

**Inputs avec ring-4 + shadow colorée** :
```tsx
border-gray-200 
bg-white/90
py-4 text-base
focus:border-[#6BCFCF] 
focus:outline-none 
focus:ring-4 focus:ring-[#6BCFCF]/20 
focus:bg-white 
focus:shadow-[0_0_0_4px_rgba(107,207,207,0.1)]
```

### 6️⃣ Pills Premium (Glow Turquoise)

**Pills sélectionnées** :
```tsx
// Sélectionnée
border-[#6BCFCF] 
bg-[#6BCFCF]/10 
shadow-[0_8px_30px_rgba(107,207,207,0.3)]  // shadow colorée turquoise
ring-2 ring-[#6BCFCF]/30

// Hover
hover:border-[#6BCFCF] 
hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)]  // glow turquoise
hover:scale-[1.02]
```

### 🎨 Palette Premium 2026 Complète

| Effet | Valeur | Usage |
|-------|--------|-------|
| Glassmorphism cards | `bg-white/80 backdrop-blur-xl` | Toutes cards principales |
| Glassmorphism sous-cards | `bg-white/70 backdrop-blur-xl` | Densité, cuisine, etc. |
| Shadow card turquoise | `shadow-[0_8px_32px_rgba(107,207,207,0.12)]` | Cards au repos |
| Shadow card hover | `shadow-[0_12px_48px_rgba(107,207,207,0.15)]` | Cards hover |
| Gradient CTA | `from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8]` | Boutons principaux |
| Shadow CTA | `shadow-[0_8px_30px_rgba(107,207,207,0.4)]` | CTA repos |
| Shadow CTA hover | `shadow-[0_12px_50px_rgba(107,207,207,0.6)]` | CTA hover avec glow |
| Shadow pills | `shadow-[0_8px_30px_rgba(107,207,207,0.3)]` | Pills sélectionnées |
| Shadow pills hover | `shadow-[0_8px_24px_rgba(107,207,207,0.25)]` | Pills hover glow |
| Badge gradient bg | `from-[#6BCFCF]/20 to-[#A78BFA]/20` | Badge "Recommandé" |
| Badge gradient text | `from-[#6BCFCF] to-[#A78BFA]` | Texte badge gradient |
| Shadow badge | `shadow-[0_4px_16px_rgba(167,139,250,0.25)]` | Badge violet glow |
| Dot glow | `shadow-[0_0_12px_rgba(255,255,255,0.8)]` | Sidebar dot |
| Focus ring | `ring-4 ring-[#6BCFCF]/20` | Inputs focus |
| Focus shadow | `shadow-[0_0_0_4px_rgba(107,207,207,0.1)]` | Inputs focus glow |

### 📦 Fichiers modifiés
- `app/devis-gratuits-v3/page.tsx` : glassmorphism cards + dot animé sidebar
- `components/tunnel/v2/StepQualificationV2.tsx` : CTA gradient + shine effect
- `components/tunnel/v2/StepEstimationV2.tsx` : CTA gradient + shine effect
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` : CTA gradient + badge premium + pills glow + focus ring-4 + sous-cards glassmorphism

### ⚠️ Aucun changement fonctionnel
- Tracking inchangé
- Champs inchangés
- Payload inchangé
- Textes et liens inchangés

---

## 2026-02-11 (4ème itération) — Correction charte couleurs Moverz 2.0 : turquoise primaire + violet accent

**Problème** : La 3ème itération utilisait `#7DD3C0` (cyan trop clair) et gradient cyan→violet sur les CTA. Cela ne respectait pas la charte couleurs Moverz 2.0.

**Charte Moverz 2.0 (respect strict)** :
- **🏡 Turquoise #6BCFCF (80% - PRIMAIRE)** : tous les CTA, navigation, liens, points animés, icônes principales. Message : "Confiance, déménagement rassurant"
- **💎 Violet #A78BFA (20% - ACCENT)** : badges "Nouveau"/"Premium"/"Recommandé", highlights, icônes secondaires, éléments décoratifs. Message : "Innovation, valeur ajoutée"

**Corrections appliquées** :
- ✅ CTA principaux : `bg-[#6BCFCF]` (turquoise pur, plus de gradient violet)
- ✅ Sidebar gradient : `from-[#6BCFCF] via-[#5AB8B8] to-[#4AA8A5]` (turquoise uniquement)
- ✅ Pills sélectionnées : `border-[#6BCFCF] bg-[#6BCFCF]/10` (turquoise)
- ✅ Focus states : `ring-[#6BCFCF]/30` (turquoise)
- ✅ Icônes principales : `text-[#6BCFCF]` (turquoise)
- ✅ Dots animés : `bg-white` (sur fond turquoise)
- ✅ Badge "Recommandé" : `bg-[#A78BFA]/20 border-[#A78BFA] text-[#A78BFA]` (violet accent - premium)

### Palette finale respectant Moverz 2.0

| Élément | Couleur | Rôle |
|---------|---------|------|
| CTA principaux | `#6BCFCF` | Turquoise primaire (80%) |
| Sidebar gradient | `from-[#6BCFCF] via-[#5AB8B8] to-[#4AA8A5]` | Turquoise uniquement |
| Pills sélectionnées | `#6BCFCF` | Turquoise primaire |
| Focus states | `#6BCFCF` | Turquoise primaire |
| Icônes principales | `#6BCFCF` | Turquoise primaire |
| Badge "Recommandé" | `#A78BFA` | Violet accent (20% - premium) |
| Hover CTA | `#5AB8B8` | Turquoise medium |
| Shadows CTA | `shadow-[#6BCFCF]/30` | Turquoise primaire |

### ⚠️ Aucun changement fonctionnel
- Tracking inchangé
- Champs inchangés
- Payload inchangé
- Textes et liens inchangés

---

## 2026-02-11 (3ème itération) — Refonte moderne tech 2026 : gradient, typographie massive, espacement généreux

**Problème** : La 2ème itération était trop sobre/minimale. Manquait de profondeur, d'impact visuel, et d'espacement. Sidebar cyan solid trop plate, typographie trop petite, pills trop serrées, boutons sans gradient, pas assez moderne 2026.

**Objectif** : Refonte moderne tech 2026 inspirée de la home moverz.fr (gradient subtil, typographie massive, espacement généreux, profondeur visuelle) :
- ✅ Sidebar gradient : `from-[#7DD3C0] via-[#6BCFCF] to-[#5AB8B8]` + shadow colorée
- ✅ Budget hero massif : `text-7xl` (au lieu de 5xl)
- ✅ Boutons gradient cyan→violet : `from-[#7DD3C0] to-[#A78BFA]`
- ✅ Pills spacieuses : `px-8 py-5` + `rounded-2xl` + hover scale
- ✅ Cards aérées : `p-10` (au lieu de p-8) + `shadow-lg`
- ✅ Inputs hauts : `py-4` + `text-base`
- ✅ Espacement généreux : `space-y-8` partout
- ✅ Badges avec dots animés : `animate-pulse`
- ✅ Palette cyan plus doux : `#7DD3C0` (au lieu de `#6BCFCF`)

### 1️⃣ Sidebar gradient moderne (GAME CHANGER business)

**Design avec profondeur** :
```tsx
// Container gradient 3 stops
rounded-3xl
bg-gradient-to-br from-[#7DD3C0] via-[#6BCFCF] to-[#5AB8B8]
p-10 (au lieu de p-8)
shadow-2xl shadow-[#6BCFCF]/20

// Dot animé header
w-2 h-2 rounded-full bg-white animate-pulse

// Budget hero MASSIF
bg-white/95 backdrop-blur-sm
rounded-2xl p-8 shadow-lg

text-7xl font-black  // au lieu de text-5xl
tracking-[0.3em]     // espacement lettres augmenté

// Min/Max plus gros
text-2xl font-black  // au lieu de text-lg

// Ajustements avec meilleur contraste
bg-white/90 backdrop-blur-sm
hover:bg-white
px-5 py-4
shadow-sm

// Dots colorés plus visibles
w-2 h-2 (au lieu de w-1.5 h-1.5)
bg-rose-500 / bg-emerald-500 (au lieu de 300)
```

### 2️⃣ Boutons gradient cyan→violet

**Moderne avec shadow colorée** :
```tsx
w-full
rounded-xl
bg-gradient-to-r from-[#7DD3C0] to-[#A78BFA]
hover:from-[#6BCFCF] hover:to-[#9F7AEA]
py-5 (au lieu de py-4)
text-lg font-bold (au lieu de text-base)
shadow-lg shadow-[#7DD3C0]/30
hover:shadow-xl hover:shadow-[#7DD3C0]/40
transition-all duration-300
```

### 3️⃣ Pills spacieuses avec hover scale

**Plus gros et plus d'impact** :
```tsx
// Container
rounded-2xl (au lieu de rounded-xl)
border-2
px-8 py-5 (au lieu de px-5 py-4)
transition-all duration-300

// Sélectionné
border-[#7DD3C0]
bg-gradient-to-br from-[#7DD3C0]/10 to-[#6BCFCF]/5
shadow-lg
ring-2 ring-[#7DD3C0]/30

// Normal
hover:border-[#7DD3C0]
hover:shadow-md
hover:scale-[1.02]

// Texte plus gros
text-base font-bold (au lieu de text-sm)
text-sm (descriptions, au lieu de text-xs)
```

### 4️⃣ Cards aérées avec shadows

**Plus de padding et profondeur** :
```tsx
// Cards principales (Steps 1/2/3/4)
rounded-2xl
bg-white
border border-gray-100
p-10 (au lieu de p-8)
shadow-lg (au lieu de shadow-sm)

// Sous-cards (Step 3)
rounded-2xl
p-8 (au lieu de p-6)
shadow-lg

// Espacement global
space-y-8 (au lieu de space-y-6)
```

### 5️⃣ Inputs plus hauts et modernes

**Meilleur confort** :
```tsx
py-4 (au lieu de py-3)
text-base (explicite)
focus:border-[#7DD3C0]
focus:ring-2 focus:ring-[#7DD3C0]/30
focus:ring-offset-2
```

### 6️⃣ Badges avec dots animés

**Micro-animations modernes** :
```tsx
// Badge "Dossier créé"
inline-flex items-center gap-2
rounded-full
bg-emerald-100
border border-emerald-300
px-4 py-2 (au lieu de px-3 py-1)
text-sm font-bold (au lieu de text-xs)

// Dot animé
w-2 h-2 rounded-full bg-emerald-500 animate-pulse
```

### 7️⃣ Typographie augmentée

**Plus d'impact visuel** :
```tsx
// Budget hero sidebar
text-7xl font-black (au lieu de text-5xl)

// Titre "Bravo" Step 4
text-5xl sm:text-6xl (au lieu de text-4xl sm:text-5xl)

// Boutons CTA
text-lg font-bold (au lieu de text-base)

// Pills labels
text-base font-bold (au lieu de text-sm)

// Step 2 "Budget estimé"
text-xl font-bold (au lieu de text-lg)
```

### 8️⃣ Espacement généreux

**Respire mieux** :
```tsx
// Forms
space-y-8 (au lieu de space-y-6)

// Sidebar
space-y-8 p-10

// Page remerciement
space-y-10 (au lieu de space-y-8)
max-w-3xl (au lieu de max-w-2xl)

// Cards recap
mt-6 gap-3 (au lieu de mt-4 gap-2)
```

### 🎨 Palette moderne tech 2026

| Élément | Valeur |
|---------|--------|
| Cyan principal | `#7DD3C0` (plus doux) |
| Cyan hover | `#6BCFCF` |
| Gradient sidebar | `from-[#7DD3C0] via-[#6BCFCF] to-[#5AB8B8]` |
| Gradient boutons | `from-[#7DD3C0] to-[#A78BFA]` (cyan→violet) |
| Pills sélectionnées | `from-[#7DD3C0]/10 to-[#6BCFCF]/5` |
| Shadows colorées | `shadow-[#7DD3C0]/30` |
| Focus states | `ring-[#7DD3C0]/30` |

### 📦 Fichiers modifiés
- `app/devis-gratuits-v3/page.tsx` : cards p-10 + sidebar gradient
- `components/tunnel/v2/StepQualificationV2.tsx` : bouton gradient + espacement
- `components/tunnel/v2/StepEstimationV2.tsx` : typo + cards + bouton gradient
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` : pills spacieuses + inputs hauts + bouton gradient
- `components/tunnel/v2/StepContactPhotosV2.tsx` : badge dots + cards aérées

### ⚠️ Aucun changement fonctionnel
- Tracking inchangé
- Champs inchangés
- Payload Back Office identique
- **Textes et liens : 0 modification**

---

## 2026-02-11 (2ème itération) — Refonte sobre style moverz.fr : blanc pur + cyan accent uniquement

**Problème** : La première refonte "Vercel 2026" était trop flashy/agressive (gradients cyan→blue partout, glassmorphism excessif, shadows cyan trop fortes). Pas alignée avec la home moverz.fr (sobre, élégante, blanc/cyan accent).

**Objectif** : Refonte sobre inspirée de la home moverz.fr (blanc pur + cyan #6BCFCF en accent uniquement) :
- ✅ Fond page : `#F8FAFB` (cyan très pâle, presque blanc)
- ✅ Cards principales : `bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]`
- ✅ Cyan accent uniquement : `#6BCFCF` (pas de gradient flashy)
- ✅ Boutons CTA : `bg-[#6BCFCF] hover:bg-[#5AB8B8]` (cyan simple, pas gradient)
- ✅ Pills : blanc avec border gray, sélectionné cyan solid
- ✅ Inputs : `border-gray-200 focus:border-[#6BCFCF] focus:ring-2 focus:ring-[#6BCFCF]/20`
- ✅ Shadows grises douces (pas cyan)
- ✅ Typographie : noir `#0F172A` + gris `#64748B`

### 1️⃣ Sidebar Step 3 (GAME CHANGER business)

**Design sobre et premium** :
```tsx
// Container sidebar
bg-[#6BCFCF]  // cyan solid (pas gradient)
rounded-2xl
shadow-lg
p-8

// Budget affiné hero
bg-white
rounded-2xl
p-6
shadow-sm

// Montant principal
text-5xl font-black text-[#0F172A]

// Min/Max
text-lg font-bold
text-emerald-600 / text-rose-600
border-t border-gray-100

// Ajustements
bg-white/10
rounded-xl
hover:bg-white/20
transition-all duration-200

// Dots colorés
w-1.5 h-1.5 rounded-full
bg-rose-300 (positif) / bg-emerald-300 (négatif)
```

### 2️⃣ Cards principales (Steps 1/2/3/4)

**Design blanc pur sobre** :
```tsx
rounded-2xl
bg-white
border border-gray-100
shadow-[0_2px_8px_rgba(0,0,0,0.08)]
p-8
```

### 3️⃣ Sous-cards (Step 3 : densité, cuisine, etc.)

**Design sobre** :
```tsx
rounded-xl
bg-white
border border-gray-100
p-6
shadow-sm
```

### 4️⃣ Boutons CTA

**Cyan simple (pas gradient)** :
```tsx
w-full
rounded-xl
bg-[#6BCFCF]
hover:bg-[#5AB8B8]
py-4
text-base font-bold text-white
shadow-[0_2px_8px_rgba(107,207,207,0.3)]
hover:shadow-[0_4px_12px_rgba(107,207,207,0.4)]
transition-all duration-200
disabled:opacity-40
```

### 5️⃣ Pills sélecteurs (densité, cuisine, formules, accès)

**Blanc sobre, sélectionné cyan** :
```tsx
// Normal
rounded-xl
border-2 border-gray-200
bg-white
hover:border-[#6BCFCF]
hover:shadow-sm

// Sélectionné
border-[#6BCFCF]
bg-[#6BCFCF]
text-white
shadow-sm
```

### 6️⃣ Inputs focus states

**Focus cyan subtil** :
```tsx
border-gray-200
bg-white
focus:border-[#6BCFCF]
focus:outline-none
focus:ring-2
focus:ring-[#6BCFCF]/20
focus:ring-offset-1
```

### 7️⃣ Cards formules (Éco/Standard/Premium)

**Sobre avec badge recommandé** :
```tsx
// Container
rounded-xl
border-2 border-gray-200
bg-white
hover:border-[#6BCFCF]
hover:shadow-sm

// Sélectionné
border-[#6BCFCF]
bg-[#6BCFCF]/5
shadow-sm

// Badge "Recommandé"
rounded-full
bg-[#6BCFCF]/10
border border-[#6BCFCF]/40
text-[10px] font-bold text-[#6BCFCF]
```

### 8️⃣ Page remerciement (Step 4)

**Sobre et cohérente** :
```tsx
// Badge "Dossier créé"
bg-emerald-100
border border-emerald-300
text-emerald-700

// Cards
rounded-xl
bg-white
border border-gray-100
shadow-sm

// Icônes
bg-[#6BCFCF]/10
text-[#6BCFCF]

// Recap card
bg-[#F8FAFB]
border border-gray-100
```

### 🎯 Palette complète

| Élément | Valeur |
|---------|--------|
| Fond page | `#F8FAFB` |
| Cards | `#FFFFFF` (blanc pur) |
| Cyan accent | `#6BCFCF` |
| Cyan hover | `#5AB8B8` |
| Texte principal | `#0F172A` |
| Texte secondaire | `#64748B` |
| Borders | `#E2E8F0` (gray-200) |
| Shadows | `rgba(0,0,0,0.08)` |

### 📦 Fichiers modifiés
- `app/devis-gratuits-v3/page.tsx` : fond page, cards principales, sidebar Step 3 sobre
- `components/tunnel/v2/StepQualificationV2.tsx` : icône sobre, bouton cyan
- `components/tunnel/v2/StepEstimationV2.tsx` : cards sobres, bouton cyan
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` : sous-cards, pills, boutons, inputs focus
- `components/tunnel/v2/StepContactPhotosV2.tsx` : badge, cards, icônes sobres

### ⚠️ Tracking inchangé
- `logicalStep` : stable
- `screenId` : inchangé
- Payload Back Office : aucun changement

---

## 2026-02-11 (1ère itération) — Refonte design complète "Vercel 2026" : glassmorphism + gradients cyan + layout grille

**Problème** : Le design était trop plat et daté. La sidebar Step 3 se superposait au formulaire (layout fixed bancal). Les couleurs turquoise/noir n'étaient pas assez premium. Pas de micro-animations, shadows ternes, buttons rectangulaires.

**Objectif** : Refonte design complète inspirée de moverz.fr + Vercel/Linear 2026 :
- ✅ Glassmorphism partout : `backdrop-blur-xl`, transparence, borders subtils
- ✅ Gradients cyan/blue : `from-cyan-600 via-cyan-700 to-blue-700` (remplace turquoise/noir)
- ✅ Micro-animations : `scale`, `translate`, `glow effects`, `pulse`
- ✅ Shadows cyan modernes : `shadow-[0_12px_40px_rgba(6,182,212,0.35)]`
- ✅ Pills : `rounded-full` avec `border` gradients
- ✅ Focus states : `ring-4` avec `ring-cyan-500/30`
- ✅ Layout grille propre : plus de superposition

### 1️⃣ Layout grille (fini la superposition)

**Avant** : sidebar `position: fixed right-8` qui se superposait au formulaire desktop.

**Après** : grille CSS propre `grid-cols-[1fr_420px] gap-8` :
- Formulaire : colonne gauche (width fluide)
- Sidebar : colonne droite (sticky top-8, 420px fixed)
- Plus de superposition, layout équilibré style Vercel

**Container adaptatif** :
- Mobile : stack vertical (formulaire → sidebar mobile en bas)
- Desktop (≥ lg / 1024px) : grille 2 colonnes côte à côte
- Max-width : `1400px` au lieu de `3xl` (768px)

### 2️⃣ Sidebar gradient hero (Step 3)

**Nouveau design** :
```tsx
bg-gradient-to-br from-cyan-600 via-cyan-700 to-blue-700
backdrop-blur-xl
shadow-[0_20px_60px_rgba(6,182,212,0.5)]
```

**Budget affiné** :
- Glow animé : `bg-gradient-to-br from-cyan-300/30 to-blue-300/30 rounded-full blur-3xl animate-pulse`
- Montant : `text-6xl font-black text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.4)]`
- Min/Max : cards glassmorphism `bg-white/10 backdrop-blur-sm` avec couleurs emerald/rose

**Ajustements** :
- Pills glassmorphism : `bg-white/10 backdrop-blur-md border border-white/20`
- Hover effect : `hover:bg-white/20 hover:scale-[1.02]`
- Dots colorés : `bg-rose-300` (positif) / `bg-emerald-300` (négatif)

### 3️⃣ Cards glassmorphism (formulaire)

**Avant** : `bg-white/95 backdrop-blur-sm border border-[#E3E5E8]`

**Après** :
```tsx
rounded-3xl 
bg-white/80 backdrop-blur-xl 
border border-cyan-100/50 
shadow-[0_8px_32px_rgba(6,182,212,0.2)]
hover:shadow-[0_12px_48px_rgba(6,182,212,0.3)]
transition-all duration-300
```

**Appliqué sur** :
- Cards principales (Steps 1/2/4)
- Card formulaire Step 3
- Toutes les sous-cards (adresses, densité, cuisine, accès, contact)

### 4️⃣ Buttons gradient cyan + pills

**CTA principal** (ex: "Finaliser mon estimation") :
```tsx
rounded-full
bg-gradient-to-r from-cyan-600 via-cyan-700 to-blue-700
py-5 font-bold text-white
shadow-[0_12px_40px_rgba(6,182,212,0.5)]
hover:shadow-[0_16px_56px_rgba(6,182,212,0.65)]
hover:scale-[1.02] active:scale-[0.98]
transition-all duration-300
```

**Pills sélecteurs** (Densité, Cuisine, Accès) :

**État sélectionné** :
```tsx
rounded-2xl
border-cyan-500
bg-gradient-to-br from-cyan-600 to-blue-600
text-white
shadow-[0_8px_32px_rgba(6,182,212,0.5)]
ring-4 ring-cyan-500/20
scale-[1.03]
```

**État normal** :
```tsx
rounded-2xl
border-2 border-cyan-500/30
bg-gradient-to-br from-white/90 to-cyan-50/50
backdrop-blur-lg
shadow-[0_4px_16px_rgba(6,182,212,0.15)]
hover:border-cyan-500
hover:shadow-[0_8px_24px_rgba(6,182,212,0.3)]
hover:scale-[1.03]
```

**Boutons Oui/Non** (accès simple/contraint) : même style `rounded-full` avec gradient cyan.

### 5️⃣ Inputs focus ring-4 cyan

**Avant** : `focus:ring-2 focus:ring-[#6BCFCF]/40`

**Après** :
```tsx
border-cyan-200
bg-white/90 backdrop-blur-sm
focus:border-cyan-500
focus:ring-4 focus:ring-cyan-500/30
focus:ring-offset-2
```

**Appliqué sur** : tous les inputs texte, number, date, email, tel.

### 6️⃣ Micro-animations & effects

- **Glow animé** : `animate-pulse` sur gradient blur (sidebar hero)
- **Dots pulsants** : `animate-pulse` sur les indicateurs (sidebar header, lignes ajustements)
- **Scale hover** : `hover:scale-[1.02]` / `hover:scale-[1.03]` partout
- **Active state** : `active:scale-[0.98]` sur CTA principal
- **Transitions** : `transition-all duration-300` (au lieu de 200ms)
- **Drop shadow** : `drop-shadow-[0_4px_24px_rgba(255,255,255,0.4)]` sur montant principal

### Fichiers modifiés

- `app/devis-gratuits-v3/page.tsx` : layout grille + sidebar déplacée + cards principales
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` : sidebar cachée (déplacée dans page.tsx) + cards + buttons + inputs
- `migration_v4.md` : documentation complète

### Palette couleurs (mise à jour)

**Avant** : turquoise `#6BCFCF` / `#A8E8E8` + noir `#0F172A` / `#1E293B`

**Après (Cyan/Blue)** :
```tsx
// Gradients primaires
from-cyan-600 via-cyan-700 to-blue-700  // Sidebar hero + CTA
from-cyan-600 to-blue-600               // Pills sélectionnées

// Borders
border-cyan-100/50   // Cards principales
border-cyan-200      // Inputs normaux
border-cyan-500/30   // Pills normales
border-cyan-500      // Pills hover / inputs focus

// Shadows
rgba(6,182,212,0.25) - rgba(6,182,212,0.5)  // Cards & buttons
rgba(255,255,255,0.15) - rgba(255,255,255,0.4)  // Sidebar (sur fond gradient)

// Rings
ring-cyan-500/20    // Pills sélectionnées
ring-cyan-500/30    // Focus states
```

### Breakpoints & responsive

- Grille activée à **`lg:` (1024px)** (sidebar + formulaire côte à côte)
- Mobile (< 1024px) : stack vertical, sidebar masquée (budget bar sticky en bas)
- Tous les hover effects désactivés sur mobile via `:hover` natif

### Tracking

**Aucun changement** : zéro impact sur events GA4 / logicalStep / screenId.

### Champs / Inputs

- **supprimés** : AUCUN
- **ajoutés** : AUCUN
- **modifiés** : style visuel uniquement (glassmorphism + gradients cyan)

### Back Office payload

**Aucun changement** : les données envoyées restent identiques.

### Fix build (CapRover)
- Correction TypeScript : `fmtEur` défini au scope du composant (utilisable dans le JSX Step 3) pour éviter `Cannot find name 'fmtEur'` en build.

---

## 2026-02-11 — Centrage desktop corrigé + layout Step 3 "premium 2026" (v2)

**Problème** : Le conteneur principal du tunnel avait des marges desktop qui décalaient tout vers la droite, même sans sidebar. En Step 3 :
1. L'approche "réserver l'espace" créait un trou moche au milieu (formulaire centré + sidebar collée au bord droit).
2. **Breakpoints désalignés** : sidebar visible à `lg:` (1024px) mais formulaire décalé à `xl:` (1280px) → **superposition** entre 1024-1280px.
3. `max-w-3xl` (768px) + marge 420px sur écran 1024px → formulaire coupé (604px disponibles seulement).

**Solution** : layout conditionnel selon l'étape + breakpoints alignés.
- **Steps 1/2/4** : conteneur **centré classique** (`max-w-3xl mx-auto`).
- **Step 3 desktop (≥ lg / 1024px)** : 
  - `max-w-none` (plus de contrainte max-width)
  - `ml-8 mr-[420px]` (formulaire occupe l'espace disponible entre marges)
  - Sidebar `fixed right-8 w-[360px]` (visible à `lg:` aussi)
  - → équilibre visuel propre, pas de superposition, layout "premium 2026"

**Fichiers modifiés** : `app/devis-gratuits-v3/page.tsx`

**Tracking** : aucun changement.

**Champs / Inputs** : aucun ajout/suppression.

**Back Office payload** : aucun changement.

---

## 2026-02-11 — Panier desktop premium "Vercel-level" (Step 3)

**Problème** : Le panier desktop (sidebar Step 3) manquait d'impact visuel et de hiérarchie. L'affichage était plat, sans différenciation claire entre le budget affiné (le plus important) et les autres éléments.

**Solution** : Refonte complète du panier desktop pour un rendu **premium / Vercel-level** avec hiérarchie visuelle forte, animations fluides et micro-interactions.

### Changements visuels

#### Container principal
- **Avant** : `rounded-2xl`, padding `p-6`, shadow générique
- **Après** :
  ```tsx
  rounded-3xl bg-white/90 backdrop-blur-xl
  border border-white/40
  shadow-[0_20px_60px_rgba(0,0,0,0.12)]
  p-8 space-y-6
  right-8 (au lieu de right-0)
  w-[360px] (au lieu de [300px])
  ```
- **Impact** : effet glassmorphism renforcé, spacing généreux, shadow premium

#### Header
- **Nouveau** : titre "Votre estimation" + dot animé turquoise (`animate-pulse`)
- **Impact** : dynamisme et attention visuelle

#### Budget affiné (section principale)
- **Avant** : simple card avec `bg-[#6BCFCF]/5`, texte 3xl
- **Après** :
  ```tsx
  // Container avec gradient + glow effect
  bg-gradient-to-br from-[#6BCFCF]/10 via-[#A8E8E8]/5 to-transparent
  border-2 border-[#6BCFCF]/30
  shadow-[0_8px_32px_rgba(107,207,207,0.15)]
  
  // Glow bubble décoratif
  absolute top-0 right-0 w-32 h-32 bg-[#6BCFCF]/10 rounded-full blur-3xl
  
  // Montant principal
  text-5xl font-black (au lieu de 3xl)
  tracking-tight transition-all duration-300 drop-shadow-sm
  
  // Min/Max
  text-lg font-black (au lieu de sm font-semibold)
  couleurs: #10B981 (vert) / #EF4444 (rouge)
  border-t separator entre montant et min/max
  ```
- **Impact** : effet "héro" sur le budget principal, hierarchy ultra-claire, animations fluides

#### Ajustements (lignes)
- **Avant** : simple liste avec `space-y-2`
- **Après** :
  ```tsx
  // Separator élégant avec gradient
  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E3E5E8] to-transparent" />
  
  // Chaque ligne
  group flex items-center justify-between gap-3
  p-3 rounded-xl
  bg-white/50 border border-[#E3E5E8]/50
  hover:border-[#6BCFCF]/30 hover:bg-white/80
  transition-all duration-200
  
  // Dot coloré par type
  w-1 h-1 rounded-full (rouge si +, vert si -, gris si neutre)
  
  // Icon help au hover
  opacity-0 group-hover:opacity-100 transition-opacity
  
  // Montants
  text-base font-black (au lieu de sm semibold)
  couleurs: #EF4444 (rouge) / #10B981 (vert)
  ```
- **Impact** : feedback hover premium, micro-interactions, couleurs expressives

#### Première estimation (collapsible)
- **Nouveau** : élément `<details>` avec design subtil
- **Avant** : affichage plein écran
- **Après** :
  ```tsx
  // Summary (fermé)
  bg-[#F8F9FA] hover:bg-[#F1F2F4]
  text-2xl font-black text-[#1E293B]/60 (montant désaccentué)
  icône chevron rotate-180 au clic
  
  // Contenu (ouvert)
  grid 2 colonnes (min/max)
  bg-green-50/50 / bg-red-50/50
  text petit + note hypothèses
  ```
- **Impact** : hiérarchie claire (budget affiné > ajustements > première estimation), économie d'espace, design "archive"

### Fichiers modifiés
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` (lignes 1061-1220)

### Tracking
- **Aucun changement** : design uniquement

### Champs / Inputs
- **supprimés** : AUCUN
- **ajoutés** : AUCUN
- **modifiés** : apparence visuelle uniquement

### Back Office payload
- **changements** : AUCUN

---

## 2026-02-11 — Application Design System Moverz 2026 (cohérence visuelle complète)

**Problème** : Le tunnel avait un style propre mais n'était pas aligné avec le guide de Design System du site principal Moverz. Il manquait de cohérence sur : glassmorphism, gradients, shadows, hover effects, spacing, etc.

**Solution** : Application **complète** du guide de Design System Moverz 2026 sur tous les composants du tunnel pour une expérience visuelle cohérente et premium.

### Changements (8 catégories)

#### 1️⃣ **CTAs (Gradients + Shadows + Hover Effects)**
- **Avant** : `bg-[#0F172A]`, `rounded-full`, `hover:bg-[#1E293B]`, `transition-all`
- **Après** : 
  ```tsx
  bg-gradient-to-r from-[#0F172A] to-[#1E293B]
  rounded-xl (au lieu de rounded-full)
  shadow-[0_4px_16px_rgba(15,23,42,0.3)]
  hover:shadow-[0_8px_24px_rgba(15,23,42,0.4)]
  hover:scale-[1.02]
  transition-all duration-200
  disabled:opacity-40 disabled:hover:scale-100
  ```
- **Impact** : tous les boutons principaux (Step 1, 2, 3) ont maintenant un look premium avec micro-animations

#### 2️⃣ **Cards Principales (Glassmorphism)**
- **Avant** : `bg-white`, `rounded-3xl`, `p-5`, `shadow-sm`
- **Après** :
  ```tsx
  bg-white/90 backdrop-blur-xl
  shadow-[0_8px_32px_rgba(0,0,0,0.08)]
  border border-white/40
  p-8 (au lieu de p-5)
  ```
- **Impact** : effet verre givré moderne sur toutes les cards conteneurs principales (Steps 1-4)

#### 3️⃣ **Cards Secondaires (Shadows + Backdrop-blur)**
- **Avant** : `bg-white`, `border border-[#E3E5E8]`, `p-4`, sans shadow custom
- **Après** :
  ```tsx
  bg-white/95 backdrop-blur-sm
  shadow-[0_4px_16px_rgba(0,0,0,0.04)]
  p-6 (au lieu de p-4)
  ```
- **Impact** : amélioration subtile des shadows et profondeur visuelle sur toutes les cards internes (adresses, densité, cuisine, formules, contact, sidebar desktop, récap Step 4)

#### 4️⃣ **Inputs (Ring Offset + Opacity)**
- **Avant** : `focus:ring-2 focus:ring-[#6BCFCF]/20`
- **Après** :
  ```tsx
  focus:ring-2 focus:ring-[#6BCFCF]/40 focus:ring-offset-2
  ```
- **Impact** : ring focus plus visible et mieux séparé du champ (tous les inputs : surface, adresses, équipements, prénom, email)

#### 5️⃣ **Badges (Gradients + Borders)**
- **Avant** : `bg-green-50`, border simple
- **Après** :
  ```tsx
  bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10
  border border-[#10B981]/30
  shadow-sm
  ```
- **Impact** : badges "Dossier créé" (Step 4) et "Recommandé" (formules) plus élégants

#### 6️⃣ **Hover Effects sur Cards Cliquables**
- **Avant** : `transition-all`, hover subtil
- **Après** :
  ```tsx
  transition-all duration-300
  hover:scale-[1.02]
  hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]
  ```
- **Impact** : feedback tactile sur toutes les cards interactives (densité, cuisine, formules)

#### 7️⃣ **Icons (Backgrounds en Gradient)**
- **Avant** : icons seuls (MapPin, Calendar, Home, User, Mail, Phone, FileText)
- **Après** : icons enveloppés dans des containers avec gradients
  ```tsx
  // Système 3 couleurs progressives
  // Turquoise (Step 1 + contact)
  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm">
    <Icon className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
  </div>
  // Violet (estimation Step 2)
  from-[#8B5CF6]/10 to-[#A78BFA]/10, text-[#8B5CF6]
  // Vert (accès Step 3)
  from-[#10B981]/10 to-[#34D399]/10, text-[#10B981]
  ```
- **Impact** : hiérarchie visuelle colorée et cohérente à travers tout le tunnel

#### 8️⃣ **Spacing & Transitions**
- **Spacing** : padding des cards principales augmenté (`p-5` → `p-8`)
- **Transitions** : ajout de `duration-200` ou `duration-300` partout où il manquait

### Fichiers modifiés
- `app/devis-gratuits-v3/page.tsx` (cards principales Steps 1-4)
- `components/tunnel/v2/StepQualificationV2.tsx` (CTA + icon)
- `components/tunnel/v2/StepEstimationV2.tsx` (CTA + cards)
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` (CTA + cards + inputs + badges + hover + icons)
- `components/tunnel/v2/StepContactPhotosV2.tsx` (cards + badges + icons)
- `components/tunnel/AddressAutocomplete.tsx` (input focus ring)

### Palette couleurs utilisée
```tsx
// Primaires
#0F172A (slate-900) - Texte principal, fonds dark
#1E293B (slate-800) - Variation gradients
#6BCFCF - Turquoise principal (brand)
#A8E8E8 - Turquoise clair

// Progressives (étapes/features)
#6BCFCF - Turquoise (Step 1, contact)
#8B5CF6 - Violet (Step 2, récap)
#10B981 - Vert émeraude (Step 3, validation)
#A78BFA - Violet clair (gradients)
#34D399 - Vert clair (gradients)
```

### Breakpoints & responsive
- Aucun changement responsive
- Tous les changements sont mobile-first
- Desktop/mobile cohérents

### Tracking
- **Aucun impact** : zéro changement sur les events GA4 / logicalStep / screenId

### Champs / Inputs
- **supprimés** : AUCUN
- **ajoutés** : AUCUN
- **modifiés** : apparence visuelle uniquement (Design System)

### Back Office payload
- **changements** : AUCUN

---

## 2026-02-11 — Navigation retour simplifiée (rollback)

**Décision** : retour au comportement simple et prévisible pour le bouton "← Modifier".

**Comportement actuel** :
- Step 2 → Step 1
- Step 3 → Step 2
- Step 4 → Step 3

**Code** : `onClick={() => goToStep((state.currentStep - 1) as 1 | 2 | 3 | 4)}`

**Note** : Le champ `enteredAtStep` a été ajouté dans `TunnelFormState` mais n'est pas utilisé actuellement (réservé pour usage futur si besoin).

**Fichiers modifiés** :
- `app/devis-gratuits-v3/page.tsx` : bouton "← Modifier" simplifié
- `migration_v4.md` : documentation mise à jour

---

## 2026-02-11 — Distance unifiée OSRM partout (API + Step 2 + Step 3)

**Problème** : les montants "Première estimation" (Step 2, Step 3 sidebar, moverz.fr)
ne correspondaient pas entre eux. Cause racine : 3 méthodes de calcul de distance différentes :
- API `/api/estimate` : heuristique CP (ex. Paris→Marseille = 1005 km, réalité ≈ 779 km)
- Step 2 / Step 3 baseline : Haversine vol d'oiseau (≈ 660 km)
- Step 3 "Budget affiné" : OSRM route réelle (≈ 779 km)

**Solution** : tout unifier sur **OSRM (route réelle)** + buffer de +15 km pour les estimations
(le client a une "bonne surprise" quand il entre ses vraies adresses).

### Changements

| Endroit | Avant | Après |
|---|---|---|
| API `/api/estimate` | Heuristique CP (serveur) | BAN géocodage → OSRM (serveur) + 15 km |
| Step 2 | `estimateCityDistanceKm()` (Haversine/CP) | `cityOsrmDistanceKm + 5` |
| Step 3 "1ère estimation" | `estimateCityDistanceKm()` (Haversine/CP) | `cityOsrmDistanceKm + 5` |
| Step 3 "Budget affiné" | `routeDistanceKm` (OSRM adresses) | inchangé |

### `cityOsrmDistanceKm` (nouveau state)
- Capturé depuis `routeDistanceKm` tant que `currentStep < 3` (coords = ville)
- Figé une fois en Step 3 (ne bouge plus quand les adresses exactes arrivent)
- Si arrivée directe en Step 3 (moverz.fr), capture la 1ère valeur OSRM puis fige

### API `/api/estimate` — OSRM côté serveur
- Accepte désormais `originLat/originLon/destinationLat/destinationLon` (optionnel)
- Si pas de coords : géocode via BAN (`api-adresse.data.gouv.fr`)
- Appelle OSRM (`router.project-osrm.org`) pour distance route
- Fallback heuristique CP si BAN/OSRM échouent
- Retourne `distanceProvider: "osrm" | "heuristic"` pour debug

### Code supprimé
- `estimateDistanceKm()` (Haversine + heuristique CP)
- `v2CityCoordsRef` (capture coords ville pour Haversine)
- `estimateCityDistanceKm()` (wrapper)

---

## 2026-02-11 — Responsive "best-in-class" (mobile / desktop)

**Objectif** : rendre le code responsive clair, cohérent et facilement modifiable.

### Breakpoints harmonisés
Avant : mélange de `sm`, `md`, `xl` sans logique. Maintenant **2 breakpoints seulement** :
| Breakpoint | Tailwind | Usage |
|---|---|---|
| `sm:` | ≥ 640px | Grilles 2-3 colonnes (densité, cuisine, formules, adresses) |
| `lg:` | ≥ 1024px | Sidebar panier visible, CTA statique, container décalé |

**Règle** : ne jamais utiliser `md:` ni `xl:` dans les composants tunnel.

### Tableau contraintes d'accès responsive
- **Desktop (≥ sm)** : tableau classique `grid-cols-[1fr,120px,120px]`
- **Mobile (< sm)** : cards verticales par contrainte, layout `flex` avec séparateur → **plus d'overflow horizontal**

### Sidebar panier abaissée (xl → lg)
- Sidebar visible à `lg:` (1024px) au lieu de `xl:` (1280px) → plus de "trou" entre md et xl.
- Container (`app/devis-gratuits-v3/page.tsx`) : **centré** par défaut, et en **Step 3 uniquement** on réserve l’espace de la sidebar desktop (fixed) via :
  - `lg:max-w-[calc(48rem+392px)]` (48rem = `max-w-3xl`)
  - `lg:pr-[392px]` (392 = `w-[360px]` + `right-8`)
  → évite le chevauchement **sans** décentrer les Steps 1/2/4 sur desktop.
- Budget bar sticky : masquée à `lg:` (quand sidebar desktop visible).

### CTA sticky + safe-area
- `pb-[env(safe-area-inset-bottom,8rem)]` remplace le hack `pb-32` → fonctionne sur iPhone avec barre Home.
- `pb-[max(1rem,env(safe-area-inset-bottom))]` sur le CTA lui-même.

### Design tokens tunnel
Ajout dans `tailwind.config.ts` sous `colors.tunnel` :
```
tunnel-navy, tunnel-slate, tunnel-teal, tunnel-teal-dk,
tunnel-teal-bg, tunnel-teal-bg2, tunnel-border, tunnel-bg,
tunnel-error, tunnel-price-lo, tunnel-price-hi
```
Migration progressive : les hex inline seront remplacés par ces tokens au fil des itérations.

**Fichiers modifiés** : `StepAccessLogisticsV2.tsx`, `StepContactPhotosV2.tsx`, `page.tsx`, `tailwind.config.ts`.

---

## 2026-02-11 — Formule unifiée Step 2 / Step 3 / API

**Problème** : le prix affiché en Step 2 (toujours STANDARD) ne correspondait pas au prix en Step 3 quand l'utilisateur avait choisi une autre formule.

**Solution** : `state.formule` est maintenant utilisé partout :
- **Step 2** (`activePricingStep2`) : utilise `state.formule` (STANDARD par défaut, mais si l'utilisateur revient de Step 3 après avoir changé, le prix reflète le choix).
- **Step 3 panier** : le baseline "Première estimation" utilise `state.formule` au lieu de forcer STANDARD. La ligne "Formule" séparée dans les ajustements est supprimée (la formule est intégrée au baseline).
- **API `/api/estimate`** : accepte un param optionnel `formule` (défaut STANDARD) → `GET /api/estimate?...&formule=PREMIUM`.

**Fichiers modifiés** : `page.tsx`, `StepEstimationV2.tsx`, `StepAccessLogisticsV2.tsx`, `app/api/estimate/route.ts`.

---

## 2026-02-11 — Nouveau sélecteur de date (mois → jour + indicateur saisonnalité)

**Fichier modifié** : `components/tunnel/DatePickerFr.tsx`

**UX** :
1. L'utilisateur clique sur le champ date → une popup s'ouvre en **phase "mois"** : 12 mois affichés en grille 3×4.
2. Chaque mois est coloré selon la saisonnalité prix :
   - 🟢 **Vert clair** (basse saison `×0.85`) : janvier, février, novembre → tarifs réduits
   - 🔴 **Rouge clair** (haute saison `×1.3`) : juin, juillet, août, septembre, décembre → tarifs majorés
   - ⚪ **Neutre** : mars, avril, mai, octobre
3. L'utilisateur sélectionne un mois → **phase "jours"** : grille classique des jours du mois choisi. Un badge contextuel ("📈 Haute saison" / "📉 Basse saison") s'affiche en haut.
4. Bouton "← Mois" pour revenir à la sélection du mois.
5. Le composant garde la même interface (`id`, `value`, `onChange`, `min`, `error`) → **aucun changement** dans `StepAccessLogisticsV2.tsx`.

**Données saisonnalité** : alignées sur `getSeasonFactor()` dans `page.tsx` (mêmes mois, mêmes coefficients).

---

## 2026-02-11 — Intégration moverz.fr ↔ Tunnel (API estimate + deep link Step 3)

**Objectif** : permettre à la homepage `moverz.fr` d'afficher une estimation budget à partir de 3 champs (origine, destination, surface), puis de rediriger vers le tunnel Step 3 avec les champs pré-remplis.

### 1) Endpoint `GET /api/estimate`
- **Route** : `app/api/estimate/route.ts`
- **Params** : `originPostalCode`, `destinationPostalCode`, `surface` (m²)
- **Retour** : `{ prixMin, prixMax, prixCentre, volumeM3, distanceKm, formule: "STANDARD" }`
- **Hypothèses** : mêmes que Step 2 du tunnel (dense, cuisine 3 appareils, pas de saison, accès RAS, formule STANDARD).
- **Distance** : heuristique départementale (pas de GPS côté home).
- **CORS** : à configurer dans `next.config.ts` si moverz.fr est sur un domaine différent.

### 2) Deep link vers Step 3
- **URL type** : `/devis-gratuits-v3?step=3&originPostalCode=75011&originCity=Paris&destinationPostalCode=13001&destinationCity=Marseille&surfaceM2=60&movingDate=2026-06-15`
- **Comportement** : si `?step=3` est présent, le tunnel hydrate son state depuis les query params et démarre directement en Step 3.
- **Params supportés** : `originPostalCode`, `originCity`, `destinationPostalCode`, `destinationCity`, `surfaceM2`, `movingDate`.
- **Fichier modifié** : `app/devis-gratuits-v3/page.tsx` (useEffect d'hydratation).

### 3) Côté moverz.fr (repo séparé)
- Ajouter un mini formulaire (3 champs : villes départ/arrivée + surface).
- Appeler `GET /api/estimate?…` pour afficher le budget.
- CTA "Affiner mon budget" → redirige vers le deep link Step 3.

### Fichiers ajoutés/modifiés
- **Ajouté** : `app/api/estimate/route.ts`
- **Modifié** : `app/devis-gratuits-v3/page.tsx`

---

## 2026-02-11 — Choix formule déplacé de Step 2 vers Step 3

- **Décision** : déplacer le sélecteur de formule (Éco/Standard/Premium) de l'écran estimation (Step 2) vers l'écran accès/logistique (Step 3), entre "Options supplémentaires" et "Où recevoir vos devis".
- **Step 2** : affiche désormais uniquement le prix basé sur la formule **Standard** (par défaut), avec mention "Estimation basée sur la formule Standard — vous pourrez changer à l'étape suivante."
- **Step 3** : le bloc formule est affiché avec les 3 cartes (Éco / Standard recommandé / Premium) et leurs fourchettes de prix respectives.
- **Panier (desktop + mobile)** : la première estimation est calculée sur STANDARD. Une nouvelle ligne **"Formule"** affiche le delta quand l'utilisateur change de formule. La ligne est toujours "confirmée" (STANDARD par défaut = delta 0).
- **Changements UI** :
  - `StepEstimationV2` : bloc sélection formule supprimé, props `pricingByFormule`/`selectedFormule`/`onFormuleChange` retirées.
  - `StepAccessLogisticsV2` : nouvelles props `selectedFormule`, `onFormuleChange`, `pricingByFormule` + bloc formule inséré + ligne panier "Formule" avec tooltip.
- **Tracking** : aucun changement.
- **Champs / Inputs** : aucun champ supprimé, aucun champ ajouté.
- **Back Office payload** : aucun changement (la formule est toujours envoyée).
- **Fichiers modifiés** :
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

---

## 2026-02-11 — Grand nettoyage du repo

**Contexte** : staging promu en main, le tunnel V2 (feature flag `NEXT_PUBLIC_FUNNEL_V2`) est devenu la seule version live. Nettoyage du code zombie.

### Supprimé
- **Feature flag `NEXT_PUBLIC_FUNNEL_V2`** : supprimé du code, du Dockerfile, et de `next.config.ts`. Le parcours V2 est désormais le seul chemin.
- **Pages mortes** : `devis-gratuits-v2/`, `devis-gratuits-experiments/`, `widget-test/`, `upload-photos/`, `CameraCapture.tsx`
- **Composants morts** : `Step1Contact`, `Step2Project`, `Step2ProjectComplete`, `Step3VolumeServices`, `ConfirmationPage`, `TunnelHero`, `TrustSignals`, `PricingRibbon`, `WhatsAppCTA`
- **Code conditionnel** dans `devis-gratuits-v3/page.tsx` : tous les `if (isFunnelV2)` / ternaires simplifiés → uniquement le chemin V2.
- **Ancien flow handlers** : `handleSubmitStep1`, `handleSubmitStep2`, `handleSubmitStep3` (remplacés par `handleSubmitQualificationV2`, `handleSubmitEstimationV2`, `handleSubmitAccessV2`, `handleSubmitContactV2`).

### Impact
- **~11 000 lignes supprimées** au total.
- Composants vivants : `PremiumShell`, `DatePickerFr`, `PriceRangeInline`, `AddressAutocomplete`, `v2/StepQualificationV2`, `v2/StepEstimationV2`, `v2/StepAccessLogisticsV2`, `v2/StepContactPhotosV2`, `v2/V2ProgressBar`.

---

## Flux données Tunnel → Back Office (synthèse)

> Le tunnel live est **`app/devis-gratuits-v3/page.tsx`** (seul tunnel dans le repo).
> Les appels HTTP vers le Back Office sont centralisés dans **`lib/api/client.ts`**.

| Étape | Endpoint BO (public) | Méthode | Données clés |
|-------|----------------------|---------|--------------|
| Création lead | `/public/leads` | POST | `firstName` (requis), `email` (requis), `lastName`, `phone`, `source` |
| MAJ progressive (chaque step) | `/public/leads/:id` | PATCH (via proxy `/api/backoffice/leads/:id`) | Adresses (origin/dest), date, volume, surface, formule, prix min/avg/max, accès (étage, ascenseur, portage…), `tunnelOptions` (JSON structuré) |
| Inventaire AI (photos) | `/public/leads/:id/inventory` | POST | `items[]`, `excludedInventoryIds[]`, `photosByRoom[]` |
| Upload photos | `/public/leads/:id/photos` | POST (multipart) | Fichiers photos |
| Confirmation email | `/public/leads/:id/request-confirmation` | POST | — (retry auto si DOCS_NOT_READY) |
| Relance photos | `/public/leads/:id/send-photo-reminder` | POST | — |
| Tracking analytics | `/public/tunnel-events` | POST | `sessionId`, `leadTunnelId`, `leadId`, `eventType`, `logicalStep`, `screenId`, `email`, `extra` |

### Champs envoyés au PATCH (`UpdateBackofficeLeadPayload`)

- **Contact** : `firstName`, `lastName`, `email`, `phone`
- **Adresses** : `originAddress/City/PostalCode/CountryCode`, `destAddress/City/PostalCode/CountryCode`
- **Dates** : `movingDate` (ISO), `dateFlexible`
- **Volume** : `surfaceM2`, `estimatedVolume`, `density` (LIGHT/MEDIUM/HEAVY)
- **Formule & Prix** : `formule` (ECONOMIQUE/STANDARD/PREMIUM), `estimatedPriceMin/Avg/Max`, `estimatedSavingsEur`
- **Logement origine** : `originHousingType`, `originFloor`, `originElevator`, `originFurnitureLift`, `originCarryDistance`, `originParkingAuth`
- **Logement destination** : `destHousingType`, `destFloor`, `destElevator`, `destFurnitureLift`, `destCarryDistance`, `destParkingAuth`
- **Photos / AI** : `photosUrls`, `aiEstimationConfidence`
- **Options tunnel** : `tunnelOptions` (JSON libre — pricing, access, services, notes…)

### Variables d'environnement côté tunnel

- `NEXT_PUBLIC_API_URL` — URL de base du Back Office (ex: `https://moverz-backoffice.gslv.cloud`). Normalisée automatiquement (retrait `/api` ou `/public` si présent).

---

*(journal historique ci-dessous)*

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

> **⚠️ Clarification nommage** : le tunnel live est dans **`app/devis-gratuits-v3/page.tsx`**.
> Il n'existe **aucun** dossier `devis-gratuits-v4`. Le nom "V4" dans ce fichier (`migration_v4.md`)
> désigne la **4e itération UX/UI** du tunnel, implémentée directement dans le code "v3".
> C'est le seul tunnel actif dans le repo. Toutes les anciennes versions (v2, experiments, etc.)
> ont été supprimées le 2026-02-11.

- **Route live** : `/devis-gratuits-v3` → `app/devis-gratuits-v3/page.tsx`
- **Redirect** : `/devis-gratuits` redirige vers `/devis-gratuits-v3`
- **Branche**: `staging` (promu en `main`)
- **Déploiement**: CapRover — tests uniquement en conditions réelles
- **Objectif**: refonte UX/UI **sans** changer les champs / formules (sauf prototype explicitement non connecté)

---

## 1) Changelog (ordre chronologique)

### 2026-02-09 — Dernière étape (V2/V3) : suppression complète des photos + écran Félicitations

- **Date**: 2026-02-09
- **Statut**: implémenté (front)
- **Décision**: retirer **totalement** la notion de photos (WhatsApp + upload) sur la dernière étape et la remplacer par un écran simple :
  - (1) **Bravo**
  - (2) **Merci de confirmer votre adresse email** (affiche l’email saisi) + message “Vous avez reçu un mail de confirmation”
  - (3) **Récapitulatif du dossier**
- **Tracking**:
  - V2 : Step 4 passe de `logicalStep=PHOTOS / screenId=photos_v2` à `logicalStep=THANK_YOU / screenId=confirmation_v2` (screenId explicite lié à l’écran).
  - V3 : conserve `logicalStep=THANK_YOU / screenId=confirmation_v3` (écran confirmation).
- **Tracking (complétion)**: `TUNNEL_COMPLETED` utilise désormais `screenId=confirmation_v2` en V2 (au lieu de `confirmation_v3`).
- **Back Office payload**:
  - suppression de l’envoi de `estimatedSavingsEur` (on retire aussi toute “économie générée” côté UI).
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepContactPhotosV2.tsx`
  - `components/tunnel/ConfirmationPage.tsx`
  - `app/devis-gratuits-v3/page.tsx`
- **Notes impl**: `ConfirmationPage` (V3) affiche le même contenu “Bravo / email / récap” que la V2 et ne propose plus aucun envoi de photos.
- **Tech**: correction typage index `stepMap` (TS) dans `app/devis-gratuits-v3/page.tsx` (pas d’impact UX).

### 2026-02-06 — Refonte étape photos : vraiment optionnelle, sans discount/culpabilisation

- **Date**: 2026-02-06
- **Auteur**: (UX stratégique)
- **Décision**: rendre l'étape photos vraiment optionnelle sans culpabilisation. Problème actuel : personne ne prend de photos, et le message "Vous économisez X€" fait penser aux clients que sans photos ce n'est pas ok. Solution : retirer discount, ajouter bouton clair "Terminer sans photos".
- **Changements UI**:
  - Titre modifié : "Envoyez des photos (optionnel)" au lieu de "Photographiez toutes vos pièces"
  - **Suppression totale** du bloc "Vous économisez X€ en envoyant vos photos"
  - **Suppression du mockup iPhone WhatsApp** (trop visuel, trop poussé)
  - Layout simplifié : centré, max-w-3xl (au lieu de grid 2 colonnes avec iPhone)
  - **CTA principal** : "Terminer et recevoir mes devis" (bouton noir, primaire)
  - Photos reléguées après séparateur "Ou envoyer des photos maintenant"
  - **WhatsApp complètement retiré** : aucun usage de WhatsAppCTA sur cette page
  - Un seul bouton upload simple (desktop + mobile)
  - Copy adapté : valorise les photos ("devis plus précis, moins de surprises") tout en restant rassurant ("vous recevrez vos devis dans tous les cas")
  - Section "Prochaines étapes" mise à jour pour refléter le caractère optionnel
  - Affichage simple de l'estimation actuelle (sans pression)
- **Tracking**:
  - Aucun changement de tracking (même logicalStep: THANK_YOU, même screenId: confirmation_v3)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés (UX only): copy et structure visuelle de ConfirmationPage
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Clarté du message "optionnel" sur mobile
  - Égalité visuelle entre "Envoyer photos" et "Terminer sans photos" (pas de hiérarchie culpabilisante)
  - Taux de conversion/skip : observer si plus d'utilisateurs terminent le tunnel
  - Lien "Terminer sans photos" redirige vers moverz.fr (à valider si besoin d'une autre page)

### 2026-02-06 — Clarification label superficie (garages et dépendances inclus)

- **Date**: 2026-02-06
- **Auteur**: (UX copy)
- **Décision**: ajouter la mention "garages et dépendances inclus" au label de superficie pour clarifier l'attente.
- **Changements UI**:
  - Label modifié de "Surface approximative (m²)" vers "Surface approximative (m²) - garages et dépendances inclus"
  - Impacté dans : Step3VolumeServices.tsx (V3) et devis-gratuits-v2/page.tsx (V2)
- **Tracking**:
  - Aucun changement
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés (UX only): label `surfaceM2` uniquement (texte affiché)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Lisibilité mobile du label plus long
  - Clarté du message pour l'utilisateur

### 2026-02-06 — Step 1 (V2) : autocomplete villes fiabilisé (tri FR + blur/Enter + affichage CP)

- **Date**: 2026-02-06
- **Auteur**: (audit UX)
- **Problème**:
  - Autocomplete “Ville d’arrivée / départ” perçu comme dysfonctionnel: entrées courtes (ex: *Lyon*) non résolues en blur, sélection à l’aveugle en cas d’homonymes (ex: *Mérignac*), et résultats FR parfois masqués par le tri.
- **Décisions / Correctifs**:
  - `AddressAutocomplete`:
    - tri des résultats: **France prioritaire** (bug de tri inversé)
    - blur: en mode `kind="city"`, accepter dès **3 caractères** (au lieu de 5)
    - blur: ne pas auto-sélectionner une ville **ambiguë** (plusieurs résultats) sans indice (ex: CP)
    - clavier: `Enter` sélectionne la **première suggestion** si aucune n’est surlignée
  - `StepQualificationV2`: afficher l’input sous forme **“Ville (CP)”** quand le CP est connu (meilleure lisibilité, moins d’erreurs silencieuses).
  - Copy Step 1: libellé surface → **“Surface approximative, garages et dépendances inclues (m2)”**.
  - Copy Step 1: baseline → **“Gratuit • Sans engagement • 2 minutes”**.
  - Step 3 (V2): ajout du choix **densité** (light/normal/dense) après la sélection logement (impacte l’estimation via `state.density`).
  - Step 3 (V2): ajout **Cuisine / électroménager** (connecté) :
    - choix: none / appliances / full
    - appliances: quantité × **0,6 m³**
    - full: **+6 m³**
    - impacte le volume/prix via `extraVolumeM3` et est **archivé côté Back Office** dans `tunnelOptions.volumeAdjustments` (JSON) **sans migration DB**.
  - UI: Densité + Cuisine sont rattachés visuellement au **logement de départ** et affichés **l’un au-dessus de l’autre** (pile), avec des choix internes en grille sur desktop.
  - Panier (Step 3 V2) refondu:
    - En haut: **Première estimation** (villes +20 km, densité=très meublé, cuisine=3 équipements, pas de saison, accès RAS)
    - Lignes (deltas): **Distance** (adresses OSRM vs villes), **Densité**, **Cuisine**, **Date** (coef sur base), **Accès**
    - En bas: **Budget affiné**
    - Règle: le delta **Distance** ne s’applique que quand **les 2 adresses** sont renseignées (sinon on reste sur “villes +20 km” et delta=0).
  - Alignement: l’estimation **Step 2 (V2)** utilise désormais les **mêmes hypothèses** que “Première estimation” en Step 3.
  - Fix: en Step 1 (V2), la saisie de surface marque `surfaceTouched=true` pour éviter que changer “Maison/Appartement” en Step 3 écrase la surface via les defaults.
  - **Règle “champs à zéro tant que non touchés” (Step 3 V2)**:
    - UI: **aucune pré-sélection** sur **Densité** et **Cuisine** en arrivant en Step 3.
    - Calcul (hypothèses par défaut): tant que non touché, on suppose **Densité=très meublé** et **Cuisine=3 équipements**.
    - Panier: les lignes **Densité** / **Cuisine** restent à **0€** tant que l’utilisateur n’a pas fait un choix (status “par défaut …”).
    - Accès: tant que non touché, on reste sur l’hypothèse “RAS” (pas d’impact prix).
  - **Règles accès — Étages sans ascenseur (Step 3 V2 / pricing engine)**:
    - RDC: 0
    - 1er: +5%
    - 2e: +10%
    - 3e: +15%
    - ≥4: **flag monte-meuble** (ajouté automatiquement au pricing si pas déjà inclus)
  - **Règles accès — surcoûts “accès difficile”** (pricing engine):
    - **Portage > 10 m**: +5% sur le total (hors services)
    - **Petit ascenseur / passages étroits**: +5% sur le total (hors services)
    - **Stationnement compliqué**: +3% sur le total (hors services)
    - **Besoin d’un monte-meuble**: +200€ (et auto si ≥4 sans ascenseur)
- **Tracking**:
  - Aucun changement (pas de modification de `logicalStep` / `screenId`).
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `hooks/useTunnelState.ts`
  - `lib/pricing/calculate.ts`
  - `app/devis-gratuits-v3/page.tsx`
  - `components/tunnel/Step2ProjectComplete.tsx`

### 2026-02-06 — Step 2 (V3) : contraintes d’accès en tableau “Départ / Arrivée” (boutons “Oui” uniquement)

- **Décision**: simplifier l’UI des contraintes: remplacer les toggles Oui/Non par une grille à 2 colonnes (**Départ** / **Arrivée**) avec uniquement des boutons **“Oui”** (toggle).
- **Règles**:
  - Cliquer “Oui” sur une colonne force l’accès correspondant à **Contraint** si ce n’est pas déjà le cas.
  - “Arrivée” est désactivé si `destinationUnknown=true`.
- **Champs**: aucun champ supprimé (réutilise `origin/destination*CarryDistance`, `*TightAccess`, `*FurnitureLift`, `*ParkingAuth`).
- **Fichier**: `components/tunnel/Step2ProjectComplete.tsx`

### 2026-02-06 — Step 3 (V2) : adresses regroupées (départ + arrivée)

- **Décision**: regrouper les 2 champs d’adresse (départ/arrivée) dans un seul bloc “Adresses”.
- **UI**:
  - Mobile: 1 colonne (Départ puis Arrivée)
  - Desktop: 2 colonnes (Départ / Arrivée)
- **Fichier**: `components/tunnel/v2/StepAccessLogisticsV2.tsx`

### 2026-02-06 — Step 3 (V2) : contraintes en tableau “Départ / Arrivée” (boutons “Oui” uniquement)

- **Décision**: remplacer les toggles Oui/Non (question par question) par un tableau **Départ / Arrivée** avec uniquement des boutons **“Oui”** (toggle).
- **Donnée**: pas de nouveaux champs — le côté (départ/arrivée) est sérialisé dans `access_details` (`__accessSidesV1=...`) et les bools existants restent la source envoyée/pricing (OR des deux côtés).
- **Fichier**: `components/tunnel/v2/StepAccessLogisticsV2.tsx`
- **Fix build staging**: ajout du prop `destinationUnknown` dans `StepAccessLogisticsV2Props` + passage depuis `app/devis-gratuits-v3/page.tsx` (sinon erreur TS en build).

### 2026-02-06 — Debug pricing (V2) : détail du calcul en Step 2 + distance OSRM visible en Step 3

- **Activation**: ajouter `?debug=1` à l’URL.
- **Step 2 (V2)**: affiche un bloc “Debug — détail du calcul” (distance baseline, band, rate, décote, volumeCost, distanceCost, socle, base, prixMin/Max…).
- **Step 3 (V2)**: affiche la **distance entre les deux adresses** directement sous le bloc “Adresses” (OSRM).
- **Fichiers**:
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-02-06 — Pricing : ajout d’une décote globale (Option A)

- **Décision**: ajouter une variable unique `DECOTE = -20%` (factor 0.8) pour baisser “le forfait de base” sans retoucher toutes les règles.
- **Application (Option A)**:
  - appliquée à `rateEurPerM3` (composante volume)
  - appliquée à `COEF_DISTANCE` (composante distance)
  - **non** appliquée à `PRIX_MIN_SOCLE` (socle)
  - **non** appliquée aux **services** (monte‑meuble, piano, etc.)
- **Fichiers**:
  - `lib/pricing/constants.ts`
  - `lib/pricing/calculate.ts`
  - `app/devis-gratuits-v3/page.tsx` (miroir détail)

### 2026-02-06 — Step 3 (V2) : baseline “villes +20km” stabilisée (distance)

- **Problème**: la baseline “villes” utilisait `estimateDistanceKm` qui bascule sur une distance Haversine dès que des coordonnées d’adresse existent → la baseline change quand on sélectionne une adresse, et le delta OSRM peut apparaître positif même si la distance “ressentie” baisse.
- **Fix**: nouvelle helper `estimateCityDistanceKm()` qui **ignore les coords** et se base uniquement sur les codes postaux. Utilisée pour:
  - Step 2 V2 (reward baseline)
  - Première estimation Step 3 V2 (“villes +20km”)
  - baseline figée au passage Step 2 → Step 3
- **Fichier**: `app/devis-gratuits-v3/page.tsx`

### 2026-02-06 — Step 3 (V2) : buffer baseline distance réduit (+15 km au lieu de +20 km)

- **Décision**: remplacer le buffer "villes +20 km" par **"villes +15 km"** dans les baselines Step 2/3 (V2).
- **Pourquoi**: éviter qu’entrer des adresses “réduise” la distance mais “augmente” le prix (baseline trop gonflée).
- **Fichier**: `app/devis-gratuits-v3/page.tsx`

### 2026-02-06 — Distance route (OSRM) : retry possible sur même paire de coords

- **Problème**: un échec OSRM pouvait bloquer définitivement la même paire de coords (guard `lastRouteKeyRef`), empêchant la ligne Distance de basculer en “adresses (OSRM)”.
- **Fix**: suppression du guard `lastRouteKeyRef` (le cache + deps du `useEffect` suffisent, et on peut retenter).
- **Fichier**: `app/devis-gratuits-v3/page.tsx`

### 2026-02-06 — Step 3 (V2) : distance “villes” plus réaliste (coords ville figées)

- **Problème**: l’heuristique CP (diff de départements) peut sur-estimer très fortement certaines routes (ex: 33 → 17) et créer des deltas Distance énormes.
- **Fix**: mémoriser les coords “ville” (Step 1/2) dans un `useRef` et utiliser ces coords (Haversine) pour la baseline “villes”, sans dépendre des coords d’adresse.
- **Garde-fou**: si aucune coord “ville” n’a été capturée (ex: saisie manuelle sans sélection), on fige une baseline à partir des **premières coords d’adresse** (Step 3) pour éviter l’heuristique CP trop grossière et les deltas Distance énormes.
- **Fichier**: `app/devis-gratuits-v3/page.tsx`

### 2026-02-03 — Ajout d'un CTA PayPal (lien de paiement) en fin de tunnel

- **Date**: 2026-02-03
- **Auteur**: (tunnel)
- **Décision**:
  - Ajouter un bouton PayPal **optionnel** sur l’écran de confirmation, pour permettre un test rapide via lien de paiement (sans intégration Checkout).
  - **Suite** (paiement robuste): privilégier un flux **Webhook PayPal → Back Office** (Option B) afin que la création/MAJ des enregistrements `Payment` se fasse côté Back Office (Postgres) et non côté tunnel.
- **Changements UI**:
  - Ajout d’un bouton **“Payer via PayPal”** sur `ConfirmationPage`, affiché uniquement si `NEXT_PUBLIC_PAYPAL_PAYMENT_URL` est défini.
- **Tracking**:
  - Aucun changement (pas de modification de `logicalStep` / `screenId`).
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Config CapRover: ajouter `NEXT_PUBLIC_PAYPAL_PAYMENT_URL` (build arg / env) et vérifier que le bouton apparaît.
  - Mobile-first: vérifier que les CTA restent visibles et cliquables sur mobile.

### 2026-01-28 — Audit V3 (prod) vs staging : DB renseignée + calculs (prix/distance)

- **Date**: 2026-01-28
- **Auteur**: (audit data)
- **Objectif**: permettre d’utiliser **uniquement `staging`** en garantissant que la **DB Back Office** est renseignée **comme en V3 prod** (mêmes champs + mêmes règles de calcul).
- **Périmètre analysé**:
  - Écritures Back Office: `createBackofficeLead` / `updateBackofficeLead` (tunnel V3) dans `app/devis-gratuits-v3/page.tsx`
  - Calculs prix/volume/distance: `lib/pricing/calculate.ts`, `lib/pricing/constants.ts` + logique distance dans `app/devis-gratuits-v3/page.tsx`
  - Note: la DB locale Prisma (SQLite `LeadTunnel`) existe via `/api/leads` mais **n’est pas utilisée** par le tunnel V3 (V3 écrit directement dans le Back Office).
- **DB Back Office — champs renseignés (V3)**:
  - **Step 1 (Contact)**: création/MAJ lead (prénom/email requis côté création) via `/public/leads`
  - **Step 2 (Projet)**: adresses + date + logement/accès (étages, ascenseur, etc.) + `tunnelOptions.access` (JSON)
  - **Step 3 (Estimation)**: `surfaceM2`, `estimatedVolume`, `density`, `formule`, `estimatedPriceMin/Avg/Max`, `estimatedSavingsEur` + `tunnelOptions` (pricing/access/services/notes…)
- **Constat clé (écarts staging vs V3 prod)**:
  - **Distance route (OSRM)**: en staging, l’appel `/api/distance` est **désactivé** (hotfix), donc `distanceProvider=fallback` et la distance passe par un **fallback heuristique** si pas de coords fiables (risque “placeholder”).
  - **Volume**: en staging, `TYPE_COEFFICIENTS` a été modifié **0.3 → 0.4** pour `studio`, `t4`, `t5`, `house*` ⇒ **volume estimé + prix** (et donc champs Back Office) **différents** de la prod.
- **Décisions à prendre (pour alignement strict sur V3 prod)**:
  - Revenir aux coefficients V3 prod (0.3) **ou** assumer la rupture et l’annoncer comme évolution (non alignée V3).
  - Réactiver OSRM (et corriger la cause de la boucle) **ou** documenter explicitement le fallback distance (et accepter la variance sur les prix).

### 2026-01-28 — Step 3 (V2) : adresse non pré-remplie + suggestions filtrées par CP

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: éviter de pré-remplir le champ “adresse” avec la ville/CP (source de confusion) et améliorer la pertinence des suggestions en filtrant par **code postal** quand disponible.
- **Changements UI**:
  - **StepAccessLogisticsV2**: labels dynamiques :
    - “Adresse de départ” → **“Votre adresse à {Ville} ({CP})”**
    - “Adresse d’arrivée” → **“Votre adresse à {Ville} ({CP})”**
  - Les inputs `originAddress` / `destinationAddress` ne sont plus initialisés par défaut à `"{CP} {Ville}"`.
- **Autocomplete**:
  - `AddressAutocomplete` accepte un contexte (`contextPostalCode`, `contextCity`, `contextCountryCode`)
  - Provider FR (BAN): ajout paramètre `postcode=` pour filtrer les résultats.
  - Provider World (Nominatim): ajout de `countrycodes=` (si fourni) + injection du CP dans la query pour prioriser.
  - **Filtre ville (Step 3)**: quand la ville est déjà connue, elle est injectée dans la requête (BAN+Nominatim) pour éviter des résultats hors ville.
  - **International (Step 3)**: si le pays sélectionné ≠ FR, on **bypass BAN** et on utilise Nominatim filtré par `countryCode` (évite des résultats USA pour une ville EU).
- **Tracking**:
  - Aucun impact.
- **Back Office payload**:
  - Aucun changement de champs; amélioration de la qualité des adresses saisies.
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`

### 2026-01-28 — Distance “route” réactivée (OSRM) pour éviter les distances placeholder

- **Date**: 2026-01-28
- **Auteur**: (data)
- **Décision**: réactiver le calcul de distance **par route** via `/api/distance` (OSRM) au lieu de dépendre du fallback heuristique (risque de prix faux).
- **Changements**:
  - `app/devis-gratuits-v3/page.tsx`: le `useEffect` distance route relance l’appel `/api/distance` (debounce ~300ms) et mémorise la dernière paire de coords (`lastRouteKeyRef`) pour éviter les relances inutiles.
- **Impact**:
  - `distanceKm` dans `tunnelOptions.pricing` (Back Office) reflète une distance **route** quand possible.
  - Le fallback reste uniquement en cas d’échec provider / coords manquantes.
- **Tracking**:
  - Aucun impact.

### 2026-01-28 — Champs obligatoires: adresses complètes + pays + distance route (bloquant)

- **Date**: 2026-01-28
- **Auteur**: (data)
- **Décision**: garantir que les champs suivants sont **toujours** renseignés avant envoi au Back Office :
  - Départ: **adresse + ville + CP + pays**
  - Arrivée: **adresse + ville + CP + pays**
  - **Distance par route (OSRM)** (pas de fallback heuristique)
- **Changements**:
  - Ajout `originCountryCode` / `destinationCountryCode` dans l’état (`useTunnelState`) et remplissage depuis l’autocomplete.
  - V2 (StepAccessLogisticsV2): affichage de la **distance route** et validation bloquante si non calculée.
  - V3: suppression du fallback `estimateDistanceKm` pour l’estimation finale; blocage si distance route non prête.
  - Back Office payload: envoi `originCountryCode` + `destCountryCode` quand disponible.
- **Fichiers modifiés**:
  - `hooks/useTunnelState.ts`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `components/tunnel/Step2ProjectComplete.tsx`
  - `app/devis-gratuits-v3/page.tsx`
  - `lib/api/client.ts`

### 2026-01-28 — Indicateur discret “validé” (coords OK) sur les inputs Ville/Adresse

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: afficher un indicateur discret à droite des inputs quand les coordonnées (lat/lon) sont présentes, pour confirmer que l’info est exploitable.
- **Implémentation**:
  - `AddressAutocomplete`: option `validated` + fallback interne (dernière sélection) pour afficher un check “Coordonnées OK”.
  - Ajout `invalidated` pour afficher un indicateur **rouge** quand l’utilisateur tente de continuer mais que l’input n’est pas exploitable (coords manquantes).
  - `StepQualificationV2` (villes) + `StepAccessLogisticsV2` (adresses): passent `validated` basé sur `originLat/Lon` et `destinationLat/Lon`.
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Libellé estimation: “Pour” + affichage Volume + Distance route

- **Décision**: remplacer “Volume estimé” par “Pour” et afficher `"{volume} m³ - {distance} km"` (distance route, arrondie) sur l’écran d’estimation.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Affichage des fourchettes: min / montant calculé / max + arrondi à la centaine supérieure

- **Décision**: pour toutes les fourchettes, afficher en 1 ligne:
  - **min** + montant min (petit, vert sombre)
  - **montant calculé** (gras, valeur à retenir)
  - **max** + montant max (petit, rouge sombre)
- **Règle**: tous les montants sont **arrondis à la centaine supérieure**.
- **Implémentation**: composant `PriceRangeInline` réutilisé sur les écrans concernés (estimation, formules, ribbon, photos).
- **Ajustement UI**: resserrage des espacements + montant central (“à retenir”) légèrement plus grand.
- **Ajustement métier UX**: le montant central (“à retenir”) est **légèrement biaisé vers le max** (au lieu du milieu strict) pour coller à l’ancrage client.
- **Fichiers modifiés/ajoutés**:
  - `components/tunnel/PriceRangeInline.tsx` (nouveau)
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `components/tunnel/Step3VolumeServices.tsx`
  - `components/tunnel/PricingRibbon.tsx`
  - `components/tunnel/v2/StepContactPhotosV2.tsx`

### 2026-01-28 — Formules (étape estimation): 3 cartes sans scroll horizontal (desktop)

- **Décision**: afficher les 3 formules **sans barre de scroll droite/gauche** sur desktop (grid 3 colonnes). Sur mobile on conserve le scroll horizontal.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepEstimationV2.tsx`

### 2026-01-28 — Datepicker: suppression de l’UI navigateur (anglais) → sélecteur FR

- **Problème**: l’`<input type="date">` natif affiche des libellés en **anglais** (“Today”, “Clear”, mois…) selon le navigateur/OS.
- **Décision**: utiliser un sélecteur **100% français** (mois/jours + “Aujourd’hui/Effacer”), tout en conservant le stockage en `YYYY-MM-DD`.
- **Fichiers modifiés/ajoutés**:
  - `components/tunnel/DatePickerFr.tsx` (nouveau)
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `components/tunnel/Step2ProjectComplete.tsx`
  - (fix build) `components/tunnel/DatePickerFr.tsx` : correction type TS (iso non-null)

### 2026-01-28 — Type de logement déplacé: Step 1 → Step 3 (+ étage si appartement)

- **Problème**: en Step 1, “Type de logement” est ambigu (départ ou arrivée ?).
- **Décision**:
  - Retirer “Type de logement” de la **Step 1 (V2)**.
  - En **Step 3**, afficher l’info logement **immédiatement sous chaque adresse concernée** (départ puis arrivée).
  - **Par défaut**: *Maison* est sélectionné (simple, non ambigu).
  - Si *Appartement* → afficher **sur la même ligne** la sélection **Étage** avec boutons: **RDV, 1er, 2e, 3e, 4e ou +**.
- **Champs**: aucun champ supprimé, uniquement déplacement/clarification UI (réutilise `originHousingType`, `destinationHousingType`, `originFloor`, `destinationFloor`).
- **Mobile-first**: affichage compact et lisible (pas de chevauchement), avec retour à la ligne propre sur mobile.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Step 3 (V2): prénom obligatoire + validation au clic “Finaliser mon estimation”

- **Décision**: `Prénom` devient **obligatoire** (comme l’email).
- **UX**: au clic sur “Finaliser mon estimation”, on met en évidence (rouge) et on scroll/focus le premier champ obligatoire manquant.
- **Back Office**: le payload V2 inclut aussi les infos logement (type + étage) maintenant que le choix est en Step 3.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Reward (desktop only): panneau “Budget & hypothèses” en Step 3 (V2)

- **Décision**: implémenter **desktop uniquement** (pas mobile pour l’instant) un panneau sticky qui affiche:
  - **Budget actuel**
  - **Budget initial (hypothèses)**: `distance +15 km`, `appart 2e`, `ascenseur`, `sans services`, **sans buffer saison**
  - Statuts “confirmé/en cours” pour distance/date/accès/services
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Reward: Step 2 (V2) calcule le budget avec hypothèses (distance +15 km, accès/services)

- **Décision**: l’estimation Step 2 (V2) utilise les hypothèses “reward”:
  - distance \(OSRM\ ville\to ville\) + **15 km**
  - **appartement 2e**, **ascenseur**
  - **aucun service**
  - **pas de buffer saison** (`seasonFactor=1`)
- **UI**: l’affichage “km” Step 2 est aligné sur le **+15 km**.
- **Fichiers modifiés**:
  - `app/devis-gratuits-v3/page.tsx`
  - `components/tunnel/v2/StepEstimationV2.tsx`

- **Fix build**: passage `pricingPanel` en `undefined` (pas `null`) pour respecter le typage TS.

### 2026-01-28 — Reward: budget initial figé (Step 2) en Step 3

- **Pourquoi**: le “Budget initial (hypothèses)” ne doit pas se recalculer quand l’utilisateur précise ses infos en Step 3.
- **Changement**: on capture un snapshot (`rewardBaseline*`) au submit de la Step 2, puis le panneau desktop réutilise ce baseline figé.
- **UX**: en cas de refresh direct en Step 3, on hydrate une fois le baseline (mêmes hypothèses Step 2) pour éviter l’affichage “—”.
- **Fichiers modifiés**:
  - `hooks/useTunnelState.ts`
  - `app/devis-gratuits-v3/page.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`

### 2026-01-28 — UX: panneau budget Step 3 en mode “panier” (initial → ajustements → affiné)

- **Changement**: refonte du panneau desktop “Votre budget” pour afficher un panier:
  - Budget initial (hypothèses)
  - lignes d’ajustement (Distance / Date / Accès / Services)
  - Budget affiné (résultat)
- **Note**: les montants par ligne sont des deltas séquentiels (même hypothèses/moteur `calculatePricing`) pour rester explicables.
- **Fichiers modifiés**:
  - `app/devis-gratuits-v3/page.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `hooks/useTunnelState.ts`

- **Ajout**: ligne “Photos (malus)” = **+15%** du budget “avant photos”, avec aide `(?)`.
- **Fix build**: correction typage TS (`lines` mutable) pour `pricingCart`.
- **Fix build**: suppression d’une référence résiduelle à `pricingPanel` dans `StepAccessLogisticsV2`.
- **Fix build**: suppression d’une double déclaration de `cart` dans `StepAccessLogisticsV2`.
- **Correction calculs (panier)**:
  - **Accès**: les defaults “Maison” en Step 3 ne sont plus considérés comme “confirmés” (flags `touched`).
  - **Date**: l’“urgence” ne s’applique plus que sur ≤ 15 jours (cohérent avec le min J+15).
  - **Distance**: ajout d’une composante distance continue dans `calculatePricing` (le buffer +15 km a toujours un impact).
- **UI**: suppression de “Ce qui peut faire varier le prix” (doublon avec le panier).
- **Fix build**: import manquant `COEF_DISTANCE` dans `app/devis-gratuits-v3/page.tsx`.
- **UI**: panneau “Votre panier” allégé et plus étroit (desktop) pour laisser plus de place au formulaire.
- **UI**: panneau “Votre panier” en **flottant** desktop (position fixe) collé au bord droit du viewport.
- **UI**: panier flottant activé à partir de **XL** (≥ 1280px) et le formulaire ne “réserve” plus de place (pas de padding) → largeur inchangée.
- **Panier**: le montant “Budget affiné” (centre) n’est plus arrondi à la centaine et correspond **exactement** à la somme (Budget initial centre + lignes).
- **Pricing (V2)**: le choix **Maison/Appartement** en Step 3 n’impacte plus le volume/prix (la **surface m² de Step 1** reste la source de vérité).

### 2026-01-28 — Photos: un seul montant “économisé” = 15% du montant moyen (formule sélectionnée)

- **Décision**: remplacer l’affichage en fourchette par **un seul montant**:  
  \( économies = 15\% \times \frac{min + max}{2} \) de la **formule sélectionnée**.
- **Affichage**: ce montant **n’est pas arrondi à la centaine** (arrondi à l’euro uniquement).
- **Changement**: on base l’écran photos sur la **fourchette de la formule sélectionnée** (pas la fourchette globale).
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepContactPhotosV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Photos: suppression carte “+50%” + nouveau titre

- **Décision**:
  - Retirer le bloc **“+50%”** (taux de réponse) sur l’écran photos.
  - Remplacer le titre par **“Envoyez nous des photos pour compléter”**.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepContactPhotosV2.tsx`

### 2026-01-28 — Photos: icônes cohérentes + copy “jusqu’à”

- **Décision**:
  - Icône économies: `PiggyBank`
  - Icône vitesse/rapidité: `Timer`
  - Copy économies: “Avec des photos vous économiserez jusqu&apos;à {montant}”
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepContactPhotosV2.tsx`

### 2026-01-28 — Recherche “Ville” : résultats ville (pas rues) + Europe via Nominatim

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: l’input “Ville” doit retourner des **villes**, pas des rues. On priorise la France mais on supporte aussi l’Europe.
- **Changements**:
  - `AddressAutocomplete` ajoute `kind="city"`:
    - BAN: ajoute `type=municipality` pour éviter les rues.
    - Nominatim: ajoute `featuretype=city` pour éviter les rues + formatage label.
    - Mode `auto` (city): fusion BAN + Nominatim + tri (match exact / prefix) pour éviter que des villes FR proches (ex: **Berling**) masquent la ville recherchée (ex: **Berlin**).
  - `StepQualificationV2`: les champs `Ville de départ` / `Ville d’arrivée` utilisent `kind="city"`.
  - **Coords**: la sélection d’une ville renseigne aussi `originLat/Lon` et `destinationLat/Lon` pour permettre le calcul de **distance route** dès l’écran estimation.
- **Affichage**:
  - FR: `Ville (CP)`
  - Hors FR: `Ville (CP si dispo) — Pays`
- **Scope**:
  - Recherche “Ville” côté Nominatim limitée à l’**Europe** par défaut (évite de proposer des villes homonymes hors Europe).
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `app/api/geocode/route.ts` (proxy Nominatim côté serveur pour éviter CORS/UA)

### 2026-01-26 — Titre punchy "Vos photos = meilleur prix garanti" (V2)

- **Date**: 2026-01-26
- **Auteur**: (copywriting conversion)
- **Décision**: remplacer le titre générique "Ajoutez vos photos" par un titre bénéfice-centré ultra-punchy dans l'esprit Moverz.
- **Changements UI**:
  - **Titre H1** : "Ajoutez vos photos" → **"Vos photos = meilleur prix garanti"**
  - **Sous-titre** : "3-8 photos par pièce • angles larges • bonne lumière" → **"60-170€ économisés en 2 min chrono"**
  - Desktop et mobile
- **Objectif**:
  - Maximiser la conversion upload photos
  - Bénéfice immédiat et chiffré
  - Ton direct et impactant (esprit Moverz)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: copywriting uniquement (titre + sous-titre)
- **Back Office payload**:
  - changements: **AUCUN**
- **Copywriting rationale**:
  - Équation visuelle simple : "Vos photos = meilleur prix"
  - Bénéfice chiffré : "60-170€ économisés"
  - Friction minimisée : "en 2 min chrono"
  - "Garanti" = confiance et engagement
- **Risques / points à vérifier sur staging**:
  - Vérifier la longueur du titre sur mobile (pas de wrap bizarre)
  - Vérifier que le ton reste cohérent avec le reste du tunnel

### 2026-01-26 — Précision copy "avec photos" sur carte économies (V2)

- **Date**: 2026-01-26
- **Auteur**: (copywriting)
- **Décision**: préciser que les économies sont obtenues "avec photos" pour clarifier le bénéfice.
- **Changements UI**:
  - Texte carte 1 : "économisés en moyenne" → "économisés en moyenne **avec photos**"
  - Desktop et mobile
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: copywriting uniquement
- **Back Office payload**:
  - changements: **AUCUN**

### 2026-01-26 — Style sobre et premium pour grid incentives (V2)

- **Date**: 2026-01-26
- **Auteur**: (UX refinement)
- **Décision**: rendre le grid des 3 cartes incentives plus sobre, cohérent et premium pour mieux s'aligner avec le reste du tunnel.
- **Changements UI**:
  - **Cartes incentives** : 
    - Toutes les bordures **uniformisées en gris clair** (`border` au lieu de `border-2 border-[#6BCFCF]`)
    - Toutes les icônes en **turquoise #6BCFCF** (au lieu de vert/orange différenciés)
    - Fonds d'icônes uniformisés : `bg-[#6BCFCF]/10` pour toutes
    - Icônes plus petites et discrètes : `w-10 h-10` au lieu de `w-12 h-12`
    - Typographie plus sobre : `font-bold` au lieu de `font-black`, `text-2xl/3xl` au lieu de `3xl/4xl`
    - Labels plus discrets : `text-[#1E293B]/60` au lieu de `/70`
  - **Dropzone (upload desktop)** :
    - Bordure **solide** au lieu de pointillés (`border-[#E3E5E8]` au lieu de `border-dashed`)
    - Border radius réduit : `rounded-2xl` au lieu de `rounded-3xl`
    - Hover effect plus subtil : fond turquoise très léger (`bg-[#F0FAFA]/30`)
    - Suppression de l'effet `scale-[1.01]` lors du drag
    - Icône uniformisée : `bg-[#6BCFCF]/10` avec `text-[#6BCFCF]`
    - Lien "choisissez des fichiers" en turquoise cohérent
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: style visuel uniquement (design plus sobre et cohérent)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que le nouveau style est cohérent avec le reste du tunnel
  - Vérifier la lisibilité sur desktop et mobile
  - Vérifier que les bordures grises se distinguent bien du fond
  - Vérifier le hover effect de la dropzone

### 2026-01-26 — Fix couleur boutons Non/Oui dans StepAccessLogisticsV2

- **Date**: 2026-01-26
- **Auteur**: (UX fix)
- **Décision**: corriger les boutons Non/Oui pour qu'ils aient la couleur turquoise (#6BCFCF) quand sélectionnés, au lieu de rester gris.
- **Changements UI**:
  - Boutons "Oui, accès simple" / "Non, accès contraint" : couleur #6BCFCF (au lieu de #0F172A noir)
  - Boutons "Non" / "Oui" dans les sous-questions d'accès : couleur #6BCFCF quand sélectionnés
  - Boutons "Non" / "Oui" dans les services en plus : couleur #6BCFCF quand sélectionnés
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: style visuel uniquement (couleur des boutons actifs)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que les boutons ont bien la couleur turquoise quand on clique dessus
  - Vérifier la lisibilité du texte blanc sur fond turquoise

### 2026-01-26 — Application des améliorations UX sur tunnel V2 (NEXT_PUBLIC_FUNNEL_V2=true)

- **Date**: 2026-01-26
- **Auteur**: (UX consistency)
- **Décision**: appliquer les mêmes améliorations UX que sur le tunnel principal aux composants V2 pour assurer une expérience cohérente quelle que soit la version active.
- **Changements UI**:
  - **StepAccessLogisticsV2**: Champ téléphone **visible par défaut** (suppression du toggle "+ Ajouter téléphone")
  - **StepAccessLogisticsV2**: Accès déjà initialisé à **"simple" par défaut** dans `useTunnelState` (pas de changement code, déjà présent)
  - **StepContactPhotosV2 (Desktop)**: Grid de 3 cartes incentives avec stats impactantes :
    1. 💰 "60-170€ économisés en moyenne" (ou montant dynamique) - bordure turquoise
    2. 👥 "+50% de taux de réponse avec photos" - bordure grise
    3. ⚡ "2x plus de devis reçus sous 48-72h" - bordure grise
  - **StepContactPhotosV2 (Desktop)**: Ordre CTA **inversé** :
    - **EN PREMIER**: Drag & drop upload (depuis cet ordinateur)
    - **EN SECOND**: WhatsApp CTA (variant="secondary")
    - Séparateur "ou" entre les deux
  - **StepContactPhotosV2 (Mobile)**: Grid incentives en version verticale (stack 3 cartes) + WhatsApp reste principal
- **Tracking**:
  - Aucun impact (mêmes events GA4)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: présentation visuelle uniquement (champ téléphone toujours visible, grid incentives, ordre CTAs)
- **Back Office payload**:
  - changements: **AUCUN**
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx` (téléphone visible)
  - `components/tunnel/v2/StepContactPhotosV2.tsx` (grid incentives + ordre CTA)
  - Imports ajoutés: `TrendingUp`, `Users`, `Zap` from lucide-react
- **Risques / points à vérifier sur staging**:
  - Vérifier avec `NEXT_PUBLIC_FUNNEL_V2=true` sur CapRover
  - Vérifier l'affichage du grid 3 colonnes desktop / stack vertical mobile
  - Vérifier ordre CTA desktop (drag&drop puis WhatsApp)
  - Vérifier que le champ téléphone est bien visible d'office
  - Vérifier les montants dynamiques dans le grid si estimate disponible
  - Vérifier que WhatsApp reste principal sur mobile

### 2026-01-26 — Hotfix validation téléphone (Step 1)

- **Date**: 2026-01-26
- **Auteur**: (hotfix)
- **Décision**: corriger un bug de validation sur le champ téléphone qui empêchait la soumission du formulaire Step 1 quand `phone` était `undefined` au lieu d'une string vide.
- **Changements UI**:
  - Aucun changement visuel
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: logique de validation du champ `phone` (gestion `undefined`)
- **Back Office payload**:
  - changements: **AUCUN**
- **Bug corrigé**:
  - Validation `isPhoneValid` plantait si `phone` était `undefined`
  - Ajout de checks `!phone ||` avant `phone.trim()` et dans les conditions d'affichage d'erreur
- **Risques / points à vérifier sur staging**:
  - Vérifier que le formulaire Step 1 se soumet correctement avec ou sans téléphone
  - Vérifier que la validation du téléphone fonctionne si on en saisit un

### 2026-01-26 — Incentives clairs pour upload photos (Step 4)

- **Date**: 2026-01-26
- **Auteur**: (conversion optimisation)
- **Décision**: remplacer la section "économies" simple par un grid de 3 bénéfices visuels ultra-clairs pour maximiser la conversion sur l'upload de photos.
- **Changements UI**:
  - **Grid de 3 cartes** avec stats impactantes :
    1. 💰 "60-170€ économisés en moyenne" (ou montant dynamique si estimate disponible) - bordure turquoise
    2. 👥 "+50% de taux de réponse avec photos" - bordure grise
    3. ⚡ "2x plus de devis reçus sous 48-72h" - bordure grise
  - Icons colorés (TrendingUp, Users, Zap)
  - Chiffres gros et visibles (3xl/4xl font-black)
  - Responsive : grid 3 colonnes desktop, stack vertical mobile
  - Ancienne section "économies seule" désactivée (remplacée par le grid)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: présentation visuelle des bénéfices uniquement
- **Back Office payload**:
  - changements: **AUCUN**
- **Copywriting**:
  - "économisés en moyenne" (au lieu de "en envoyant vos photos maintenant")
  - "+50% de taux de réponse avec photos" (preuve sociale)
  - "2x plus de devis reçus sous 48-72h" (urgence + quantité)
- **Risques / points à vérifier sur staging**:
  - Vérifier l'affichage des 3 cartes sur desktop (grid 3 colonnes)
  - Vérifier le stack vertical sur mobile
  - Vérifier que les montants dynamiques s'affichent correctement quand estimate disponible
  - Vérifier la hiérarchie visuelle : la carte "économies" doit se démarquer (bordure turquoise)

### 2026-01-26 — Inversion drag & drop / WhatsApp (Step 4 - Desktop)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: sur desktop, afficher d'abord l'option "Glissez-déposez vos photos ici" (upload direct) en style primaire, puis WhatsApp en style secondaire. Sur mobile, WhatsApp reste en premier (car c'est l'option principale).
- **Changements UI**:
  - **Desktop** : 
    1. Bouton "Glissez-déposez vos photos ici" en premier (style dark primaire)
    2. Séparateur "ou"
    3. Bouton WhatsApp en second (style blanc secondaire)
  - **Mobile** : WhatsApp reste en premier (style vert primaire) - pas de changement
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: ordre d'affichage des CTA sur desktop uniquement
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier l'ordre des boutons sur desktop (drag & drop → WhatsApp)
  - Vérifier que sur mobile, WhatsApp reste en premier
  - Vérifier que les deux options fonctionnent correctement

### 2026-01-26 — Champ téléphone affiché par défaut (Step 1)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: retirer le bouton "+ Ajouter un téléphone (optionnel)" et afficher directement le champ téléphone dans Step1Contact. Le champ reste optionnel mais est toujours visible.
- **Changements UI**:
  - Champ téléphone toujours visible dans le formulaire de contact (Step 1)
  - Label "Téléphone (optionnel)" pour clarifier que ce n'est pas obligatoire
  - Validation : si rempli, doit contenir au moins 10 chiffres (optionnel sinon)
  - Icône téléphone + feedback visuel (check/croix) comme pour les autres champs
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN** (le champ phone existait déjà dans le state)
  - ajoutés: **AUCUN** (simplement rendu visible par défaut)
  - modifiés: champ `phone` maintenant toujours affiché (pas de toggle)
- **Back Office payload**:
  - changements: **AUCUN** (le champ phone était déjà envoyé au BO)
- **Risques / points à vérifier sur staging**:
  - Vérifier que le champ téléphone s'affiche correctement sur mobile et desktop
  - Vérifier que la validation fonctionne (optionnel, mais si rempli => au moins 10 chiffres)
  - Vérifier que le formulaire se soumet correctement avec ou sans téléphone

### 2026-01-26 — Force accès "Facile" par défaut (UX)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: s'assurer que les champs d'accès (originAccess, destinationAccess) sont toujours initialisés à "easy" (= Facile), même si une ancienne session localStorage les avait laissés vides.
- **Changements UI**:
  - Par défaut, les boutons "Facile" sont maintenant toujours pré-sélectionnés et colorés (#6BCFCF)
  - Les deux boutons (Facile / Contraint) ont la même couleur turquoise quand sélectionnés (déjà le cas)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: valeur par défaut forcée pour `originAccess` et `destinationAccess` à "easy" (rétrocompatibilité localStorage)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier qu'au premier chargement du tunnel, "Facile" est bien pré-sélectionné pour départ ET arrivée
  - Vérifier que les anciennes sessions localStorage avec accès vides sont bien complétées avec "easy"

### 2026-01-26 — Ajustement ratio m3/m2 (0.3 → 0.4)

- **Date**: 2026-01-26
- **Auteur**: (ajustement métier)
- **Décision**: modifier le ratio m3/m2 de 0.3 à 0.4 pour les types de logements concernés (studio, T4, T5, maisons) afin d'améliorer la précision du calcul de volume.
- **Changements UI**:
  - Aucun changement UI visible
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN** (seul le calcul interne de volume change)
- **Formules métier**:
  - `TYPE_COEFFICIENTS` dans `lib/pricing/constants.ts` : ratio m3/m2 passé de 0.3 à 0.4 pour studio, t4, t5, house, house_1floor, house_2floors, house_3floors
  - Les coefficients T1/T2/T3 restent à 0.35
- **Risques / points à vérifier sur staging**:
  - Vérifier que les estimations de volume sont cohérentes avec la réalité terrain
  - Vérifier que les prix estimés restent compétitifs

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

### 2026-02-02 — Désamorçage "sticker shock" sur écran estimation (Step 3)

- **Date**: 2026-02-02
- **Auteur**: (UX/conversion)
- **Décision**: réduire le "sticker shock" (choc du prix) en ajoutant du **contexte avant le montant** et en clarifiant la nature **provisoire** de l'estimation.
- **Changements UI**:
  - **Bloc "Budget estimé"** (Step3VolumeServices):
    - Ajout d'une ligne de contexte **avant** le prix : "Pour {volume} m³ · {distance} km" (ou "Basé sur volume et distance estimés" si données non dispo)
    - Disclaimer modifié : "Estimation basée sur distance + volume estimé. **Prix final après infos + photos.**" (mise en gras du prix final)
  - **Cartes formules** (Éco/Standard/Premium):
    - Ajout d'un label "À PARTIR DE" (uppercase, petit, discret, 10px) sur ligne dédiée **au-dessus** de chaque fourchette de prix
    - Fix layout : le label est maintenant sur sa propre ligne (`<p>` block) pour éviter conflit avec le grid de `PriceRangeInline`
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: copywriting et ordre d'affichage uniquement
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que le contexte (volume + distance) s'affiche correctement avant le prix
  - Vérifier la lisibilité du disclaimer sur mobile (pas de wrap bizarre)
  - Vérifier que le label "À partir de" s'affiche bien sur chaque carte formule (nouvelle ligne dédiée)
  - Vérifier que le montant reste lisible et impactant malgré le contexte ajouté

### 2026-02-02 — Amélioration panier Step 3 (confiance + clarté + momentum)

- **Date**: 2026-02-02
- **Auteur**: (UX/conversion)
- **Décision**: améliorer le panier (desktop sidebar + mobile sticky) pour maximiser confiance, clarté et sentiment de progression.
- **Changements UI**:
  - **Placeholders adresse cohérents**:
    - Les placeholders des champs adresse sont maintenant génériques ("Ex: 10 rue de la République") au lieu de hardcodés ("Lyon" alors que label dit "Marseille")
    - Fix dans StepAccessLogisticsV2 et Step2ProjectComplete
  - **Reframe ligne Photos** (moins punitif):
    - Ancien: "Photos (malus) +660€"
    - Nouveau: "Sans photos : marge de sécurité +660€"
    - Renommage variable: `photoMalusEur` → `photoMarginEur`
  - **Progress bar** (momentum):
    - Affichage "X/5 confirmées" en haut du panier
    - Barre de progression visuelle (turquoise) qui se remplit à mesure que l'utilisateur confirme les infos
  - **Ordre lignes par impact** (guide l'attention):
    - Nouveau: Photos → Accès → Services → Date → Distance
    - Ancien: Distance → Date → Accès → Services → Photos
    - Ajout champ `confirmed: boolean` sur chaque ligne pour calculer le progress
  - **Hiérarchie budget améliorée** (clarté visuelle):
    - Budget actuel: en premier, gros (3xl), fond turquoise léger, label "Votre budget actuel"
    - Fourchette min/max: en grid 2 colonnes sous le montant principal
    - Budget initial: en bas, petit, barré, grisé, label "Budget initial (hypothèses)"
  - **Tooltips explicatifs** (confiance):
    - Photos: "Les photos permettent d'estimer le volume exact et d'éviter les marges de sécurité"
    - Accès: "Un accès difficile nécessite plus de temps et de manutention"
    - Date: "Les périodes de forte demande (été, fin de mois) impactent les tarifs"
    - Icône HelpCircle au survol
  - **Sticky mobile bar** (visibilité budget):
    - Affichage du budget actuel + progress (X/5) dans une card sticky en bas sur mobile (< xl)
    - Positionné au-dessus du bouton CTA
    - Gradient fade-in pour transition douce
  - **Animation montant** (feedback visuel):
    - Transition CSS (300ms) sur le montant du budget actuel quand il change
  - **Badge "Optimisé"** (gratification):
    - Affichage badge vert "Optimisé" quand toutes les lignes sont confirmées
    - Positionné à côté du titre "Votre budget actuel"
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: champ `confirmed` (booléen) sur chaque ligne du panier (frontend only, pas envoyé au BO)
  - modifiés: ordre d'affichage des lignes, copywriting, hiérarchie visuelle
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier placeholders adresse cohérents avec ville sélectionnée
  - Vérifier progress bar et calcul correct du nombre de lignes confirmées
  - Vérifier sticky mobile bar positionnement (doit être au-dessus du bouton CTA)
  - Vérifier hiérarchie visuelle budget (actuel gros et visible, initial discret)
  - Vérifier tooltips au survol (desktop) et au tap (mobile)
  - Vérifier badge "Optimisé" quand toutes infos confirmées
  - Vérifier animation du montant lors des changements
  - Vérifier mobile: sticky bar ne cache pas le contenu important

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
  - ajoutés: (si oui => marqués "non connectés" + justification)
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


---

### 2026-02-11 — Fix RDC + auto-surface Step 3

- **Décision** : L'auto-surface (`HOUSING_SURFACE_DEFAULTS`) ne doit s'appliquer qu'en Step 1.
  En Step 3, le changement Maison/Appartement concerne l'accès (étage, ascenseur),
  **pas** la surface. Sans ce garde-fou, passer de Maison (110 m²) à Appart (40 m²)
  écrasait la surface et faisait chuter la "Première estimation" de ~50 %.
- **Changements UI** :
  - "RDV" → "RDC" (Rez-de-chaussée) dans le sélecteur d'étage.
  - Guard `if (state.currentStep > 1) return;` dans l'effet `HOUSING_SURFACE_DEFAULTS`.
- **Tracking** : aucun impact.
- **Champs / Inputs** : aucun ajout/suppression.
- **Back Office payload** : aucun changement.

---

## 2026-02-12 — Fix build CapRover : export SmartCart manquant

- **Problème** : Le build CapRover échouait avec erreur Turbopack : `Export SmartCart doesn't exist in target module [project]/components/tunnel-v4/index.ts`.
- **Root cause** : Le fichier `SmartCart.tsx` était bien commité (commit `50e8608`), mais l'export dans `components/tunnel-v4/index.ts` n'avait jamais été ajouté au repo. Le fichier local contenait la ligne, mais elle n'avait jamais été commitée.
- **Solution** :
  - Ajout de `export { SmartCart, type SmartCartProps, type CartItem } from "./SmartCart";` dans `components/tunnel-v4/index.ts`
  - Commit `69428fa` : `fix: export SmartCart from tunnel-v4 index`
- **Tracking** : aucun impact.
- **Champs / Inputs** : aucun changement.
- **Back Office payload** : aucun changement.
- **Lesson learned** : Toujours vérifier que les nouveaux composants sont correctement exportés dans les fichiers `index.ts` avant le commit.

---

## 2026-02-12 — Step 1 simplifié : style homepage moverz.fr

- **Objectif** : Simplifier Step 1 pour qu'il ressemble au formulaire clean de la homepage moverz.fr, tout en gardant le Design System V4.
- **Changements UI** :
  - Formulaire ultra-épuré dans une seule `CardV4`
  - 3 champs uniquement : Ville de départ, Ville d'arrivée, Surface (m²)
  - Header centré avec titre "Obtenez votre estimation en 2 minutes"
  - CTA simple "Voir mon estimation →"
  - Trust badges en bas : "⚡ 2 minutes • 🔒 Gratuit • 🎯 Sans engagement"
  - Mobile-first, design propre et moderne
- **Fichier** : `components/tunnel/v2/StepQualificationV4.tsx` (réécriture complète)
- **Tracking** : aucun impact (step reste `PROJECT`, screenId `project_v4`).
- **Champs / Inputs** : aucun ajout/suppression, mêmes champs envoyés au Back Office.
- **Back Office payload** : aucun changement.
- **Stats** : -195 lignes, +85 lignes (simplification nette).

---

## 2026-02-12 — Step 2 simplifié : design clean moverz.fr (HeroBudgetCard)

- **Objectif** : Aligner Step 2 sur le design actuel de moverz.fr (`HeroBudgetCard`), supprimer les animations complexes et les fioritures.
- **Changements UI** :
  - Suppression des animations complexes (skeleton loading, count-up, chips animés)
  - Suppression des 3 cards détails (Distance, Volume, Formule)
  - Design ultra-simplifié : CardV4 unique avec prix fourchette au centre
  - Prix format : `1 113 € – 1 670 €` (fourchette min-max en une ligne)
  - Details en grid 2 colonnes : Distance + Volume
  - Rassurance simplifiée : 3 bullets simples
  - CTA clean style moverz.fr : "Affiner mon estimation →"
  - Trust line : "Gratuit · Sans engagement · Sans appel"
- **Fichier** : `components/tunnel/v2/StepEstimationV4.tsx` (réécriture complète)
- **Supprimé** :
  - Imports `CountUp`, `motion`, `AnimatePresence`
  - Composants `Truck`, `Calendar`, `TrendingDown`, `Sparkles`, `Shield`, `HelpCircle`
  - States `showContent`, `showDetails`
  - Animations skeleton → reveal → chips
  - Grid 3 colonnes avec cards détails
- **Tracking** : aucun impact.
- **Champs / Inputs** : aucun changement.
- **Back Office payload** : aucun changement.
- **Stats** : -359 lignes, +149 lignes (simplification majeure de 210 lignes).

---

## 2026-02-12 — Step 3 simplifié : design clean + retrait services facultatifs

- **Objectif** : Simplifier Step 3 style moverz.fr, retirer les services additionnels facultatifs (demande utilisateur).
- **Changements UI** :
  - Nouveau fichier `StepAccessLogisticsV4.tsx` (remplacement de `StepAccessLogisticsV2.tsx`)
  - Design ultra-clean : CardV4 partout, sections bien séparées
  - Sections : Adresses + Logements, Date, Volume (densité + cuisine), Contraintes d'accès, Contact, Formule
  - Suppression complète de la section "Options supplémentaires (facultatif)"
  - Layout mobile-first avec grid responsive
  - Toggle switches style moverz.fr pour contraintes d'accès
  - CTA simple : "Finaliser mon estimation →"
- **Fichier** : `components/tunnel/v2/StepAccessLogisticsV4.tsx` (création)
- **Supprimé** :
  - Section "Options supplémentaires" avec 8 services facultatifs :
    - `serviceFurnitureStorage` (Garde-meuble)
    - `serviceCleaning` (Nettoyage / débarras)
    - `serviceFullPacking` (Emballage complet)
    - `serviceFurnitureAssembly` (Montage meubles neufs)
    - `serviceInsurance` (Assurance renforcée)
    - `serviceWasteRemoval` (Évacuation déchets)
    - `serviceHelpWithoutTruck` (Aide sans camion)
    - `serviceSpecificSchedule` (Horaires spécifiques)
  - Textarea "Précisions" (specificNotes)
  - State `showOptions`
  - Composant `YesNo` pour services
  - Sidebar desktop désactivée (panier géré dans page.tsx)
  - Effets visuels complexes (glassmorphism, shadows multiples, gradients)
- **Tracking** : aucun impact.
- **Champs / Inputs** : 8 services + 1 textarea retirés (ne sont plus envoyés au Back Office).
- **Back Office payload** : Les champs services ne sont plus envoyés (simplification).
- **Stats** : Fichier V2 = 1228 lignes, Fichier V4 = 821 lignes (simplification de 407 lignes).

---

## 2026-02-12 — Step 4 simplifié : design clean confirmation

- **Objectif** : Simplifier Step 4 (Bravo!) style moverz.fr, retirer les fioritures.
- **Changements UI** :
  - Design ultra-simplifié : CardV4 partout
  - Hero centré : Badge succès + "🎉 Bravo !" + message
  - Timeline simple : 3 étapes avec icônes
  - Email confirmation : Card avec icône Mail
  - Récap : Liste simple avec bordures
  - Avantages : 3 bullets simples
  - Suppression des animations motion complexes
  - Suppression de la section "Économies potentielles"
  - Suppression des cards "Premium confirmations"
- **Fichier** : `components/tunnel/v2/StepContactPhotosV4.tsx` (réécriture complète)
- **Supprimé** :
  - Animations `motion` complexes (fade-in, slide-up)
  - Section "Économies potentielles" avec calcul 15%
  - Grid 2 colonnes (Récap + Économies)
  - Icons multiples (`TrendingDown`, `Shield`, `FileText`)
  - Effets visuels premium
- **Tracking** : aucun impact.
- **Champs / Inputs** : aucun changement.
- **Back Office payload** : aucun changement.
- **Stats** : -448 lignes, +285 lignes (simplification de 163 lignes).

---

## 📊 Bilan total simplification V4 (Steps 1-4)

- **Step 1** : -110 lignes (195 → 85)
- **Step 2** : -210 lignes (359 → 149)
- **Step 3** : -407 lignes (1228 → 821)
- **Step 4** : -163 lignes (448 → 285)

**Total** : **-890 lignes** de simplification ! 🎉

**Design** : Alignement complet sur le style moverz.fr (clean, moderne, mobile-first, CardV4 partout).

---

## 2026-02-13 — Step 2 UX mobile : montants sur une seule ligne

- **Objectif** : garder la fourchette de prix lisible sur mobile en une ligne (`min – max`), sans retour à la ligne.
- **Fichier** : `components/tunnel/v2/StepEstimationV4.tsx`
- **Changements UI** :
  - Ajustement typo prix mobile : `text-4xl` sur mobile (conserve `sm:text-6xl` sur écrans plus larges).
  - Ajout `whitespace-nowrap` pour empêcher le retour à la ligne entre les deux montants.
  - Ajout `leading-none` pour compacter la hauteur de ligne et garder le bloc stable.
- **Tracking** : aucun impact.
- **Champs / Inputs** : aucun changement.
- **Back Office payload** : aucun changement.

---

## 2026-02-13 — Step 2 UX : affichage d'un montant unique (médian)

- **Objectif** : remplacer la fourchette (`min – max`) par un seul montant plus simple à lire.
- **Fichier** : `components/tunnel/v2/StepEstimationV4.tsx`
- **Changements UI** :
  - Calcul d'un `singleEstimate` : moyenne arrondie de `priceMin` et `priceMax`.
  - Affichage d'un seul prix formaté (`fmtEur(singleEstimate)`).
  - Fallback robuste : si une seule borne existe, elle est affichée; sinon `—`.
- **Tracking** : aucun impact.
- **Champs / Inputs** : aucun changement.
- **Back Office payload** : aucun changement.

---

## 2026-02-13 — IA photos : prompts densité + contraintes spécifiques renforcés

- **Objectif** : fiabiliser la qualité métier des retours IA avec un format JSON plus structuré, sans casser l'affichage actuel.
- **Fichier** : `app/api/ai/analyze-photos/route.ts`
- **Changements** :
  - Prompt `density` remplacé par une version orientée "densité opérationnelle" (niveau dominant, homogénéité, confiance, impact logistique).
  - Prompt `specific_constraints` remplacé par une version catégorisée (fragile, volumineux, lourd, demontage, acces, protection, autre) + niveau d'impact.
  - Compatibilité UI conservée : exigence explicite de renvoyer `moverInsights` dans les deux prompts.
- **Tracking** : aucun impact.
- **Champs / Inputs tunnel** : aucun changement.
- **Back Office payload** : aucun changement.

---

## 2026-02-13 — Step 1 : cohérence du temps restant (copy)

- **Objectif** : supprimer l'incohérence entre la barre de progression (`~30 sec`) et le texte marketing affiché sur l'écran.
- **Fichier** : `components/tunnel/v2/StepQualificationV4.tsx`
- **Changements UI copy** :
  - Titre : `en 2 minutes` → `en ~30 sec`.
  - Badge de réassurance : `2 minutes` → `~30 sec`.
- **Tracking** : aucun impact.
- **Champs / Inputs** : aucun changement.
- **Back Office payload** : aucun changement.
