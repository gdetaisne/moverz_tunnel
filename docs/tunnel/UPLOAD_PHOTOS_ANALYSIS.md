# Upload photos & analyse IA (Tunnel)

## Objectif
Quand un client ajoute des photos via `/upload-photos`, on peut :
- **confirmer l’envoi** pour obtenir des devis,
- ou **analyser le dossier** pour afficher un résumé (pièces, volume, cartons, valorisation).

## Parcours utilisateur
- **CTA principal** : “Confirmer et obtenir mes devis”
  - Envoie les photos au Back Office.
- **CTA secondaire** : “Analyser mon dossier”
  - Upload local (tunnel) → analyse IA → affichage du résumé
  - Puis synchronisation Back Office en arrière-plan.

## Endpoints (tunnel)
### Upload local (pour analyse)
- `POST /api/uploads/photos`
  - Normalise via `sharp` (JPEG ~400×300, q~80)
  - Stockage local dans `uploads/`
  - Retourne `{ id, storageKey, originalFilename }` par fichier

### Analyse IA (Process 2 labo)
- `POST /api/ai/lab-process2`
  - **Classification** par photo + passe “same-room”
  - **Inventaire** par pièce (objets + volumes + valeur si disponible)
  - Retourne `rooms[]` avec `items[]` (dont `volumeM3`, parfois `valueEstimateEur`)

### Back Office (upload)
- `POST /public/leads/:id/photos` (appelé via `uploadBackofficePhotos`)

## Résumé affiché (règles de calcul)
Le résumé vise à **reproduire le comportement V2** pour le **volume total emballé**.

### 1) Règles métier (V2)
On applique d’abord :
- `enrichItemsWithBusinessRules`
  - **Lit** → dérivés (matelas / sommier / parure)
  - **Armoire** → dérivé “contenu” (CHAMBRE: vêtements, SALON: fragile)

### 2) Emballage (V2)
Puis :
- `applyPackagingRules`
  - calcule `volumeM3Nu` et `volumeM3Emballé`
  - met à jour `volumeM3Final` (volume emballé)

### 3) Volume total emballé
On calcule ensuite le volume par pièce, puis total :
- **gros items** : somme des volumes **emballés**
- **règles spéciales** (V2) :
  - **LIT** : volume = **composants** uniquement
  - **ARMOIRE** : volume = meuble + **contenu**
- **petits objets** : convertis en cartons “objets divers”

### 4) Cartons à prévoir
- Base “objets divers” : conversion du **volume nu** en cartons (0.08 m³ / carton)
- “contenu rangements” : dérivé `armoire_contenu` converti en cartons (compteur)
  - sans ré-ajouter de volume, pour éviter le double-compte (le volume du contenu est déjà inclus dans l’armoire)
- Affichage : **arrondi à la dizaine supérieure**

### 5) Valorisation pour assurance
Montant total indicatif :
- somme de `valueEstimateEur × quantité` sur les items **racine** (pas les dérivés)
- affiché si l’IA a renvoyé des valeurs, sinon `—`

## UX “analyse en cours”
Pendant l’analyse :
- overlay de progression (spinner + barre)
- **temps estimé** : `max(20s, ~4.5s × nbPhotos)`
- l’overlay disparaît **dès que le résumé IA est prêt**
  - la synchronisation Back Office continue en arrière-plan

## Limites & robustesse (prod)
Pour éviter les 502/timeouts :
- cap photos global (par défaut 12 en prod)
- cap photos par pièce (par défaut 6 en prod)
- concurrence réduite (par défaut 3 en prod)
- timeouts par appel Claude + budget global

Variables d’env possibles :
- `AI_MAX_PHOTOS_TOTAL`
- `AI_MAX_PHOTOS_PER_ROOM`
- `AI_LAB_CLASSIFY_CONCURRENCY`
- `AI_LAB_TIMEOUT_MS`
- `AI_CLAUDE_TIMEOUT_MS`

