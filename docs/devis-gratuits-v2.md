# Tunnel `/devis-gratuits-v2` — doc V1 (itérations rapides)

## Objectif produit

**Maximiser le nombre de dossiers avec au moins quelques photos** en rendant la prise de photos:
- **par défaut** (chemin principal)
- **mobile-first**
- **ludique et guidée** (mission + feedback immédiat)

Cette V2 est une copie/modif du tunnel existant pour itérer vite et pouvoir **supprimer** ou **remplacer** l’ancienne version si besoin.

## Routes concernées

- **UI**: `app/devis-gratuits-v2/page.tsx` → route `/devis-gratuits-v2`
- **Upload photos**: `POST /api/uploads/photos` (normalisation `sharp`, stockage local)
- **IA rapide (gamification)**: `POST /api/ai/quick-items` → `app/api/ai/quick-items/route.ts`
  - détecte des objets “macro” dans chaque photo et renvoie un JSON léger
  - sert uniquement à la **validation immédiate** et au **score**

## Principes UX clés (V1)

### 1) “Mission” pièce par pièce

- On affiche **une seule pièce à la fois** (ex: `Chambre 1/3`, puis `Chambre 2/3`, etc.)
- Chaque pièce a **2 items max** (ex: chambre → Lit + Armoire/Dressing) pour limiter la charge cognitive.
- La mission indique:
  - **quoi photographier** (liste courte)
  - **objectif**: “2–3 photos”
  - validation visuelle **✓ Pièce validée** quand tous les items sont détectés

### 2) Caméra “dans l’app” (mobile)

Sur mobile (pointeur `coarse`), la caméra est intégrée en **plein écran (overlay)**:
- top: “Caméra · {pièce}” + consigne courte
- bloc guidage: “1) Prenez une photo de : {prochain objet}”
- checklist: les items passent en **vert** quand détectés
- feedback “validé”: **animation** + **petit son “pling”**

Fallback:
- bouton “Importer depuis la galerie”
- si caméra indisponible → retour au mode upload.

Implémentation:
- composant: `app/components/CameraCapture.tsx`
  - props ajoutées pour l’overlay: `autoStart`, `showChrome`, `showThumbnails`, styles du wrapper vidéo

### 3) “Something missing ?” (avant la pièce suivante)

Quand une pièce est validée, on affiche un bloc “Something missing ?”:
- suggestions optionnelles (ex: lampe, chaises, petits meubles)
- l’utilisateur peut:
  - **ajouter 1 photo**
  - **skip** via “Pièce suivante”

## Validation IA (quick-items)

### Types détectés

Le modèle renvoie une liste de `detectedTypes` parmi:
- `BED`, `WARDROBE`, `SOFA`, `FRIDGE`, `WASHER`, `TABLE`, `TV`, `MIRROR`, `PIANO`

### Comment on valide un item

- Chaque photo uploadée est associée à une `roomIndex` (pièce courante au moment de la capture/import).
- On compte les types détectés **par pièce** (via `roomIndex`) et on “coche” l’item si le type est détecté au moins 1 fois dans cette pièce.

Pourquoi “par pièce”:
- On veut que la gamification **simplifie** (pas besoin de 2 lits détectés globalement pour “chambre 2”).
- On incite à photographier l’objet dans la bonne pièce (logique utilisateur).

## Score de précision (V2)

- Le score est un indicateur **simple** basé sur:
  - progression des étapes
  - items de mission validés via quick-items
- **Option A** retenue: le dock “Précision du devis” est affiché **uniquement à l’étape Photos** (`currentStep === 4`).

## Persistance / état local

`localStorage` (clé unique):
- `moverz_tunnel_form_state` contient notamment:
  - `form`, `currentStep`
  - `leadId`, `backofficeLeadId`
  - `inventoryExclusions`

## Debug / dev

Sur `/devis-gratuits-v2` en dev:
- bouton **Reset (debug)**: purge l’état local + recharge
- bouton **Aller step 4 (debug)**: crée un lead minimal si besoin puis saute à l’étape Photos

## Points d’attention

- Audio: certains navigateurs mobiles peuvent **bloquer** l’audio si pas assez d’interaction utilisateur.
  - fallback prévu: uniquement visuel (pulse + vert) si l’audio ne passe pas.
- L’IA “quick-items” doit rester:
  - rapide
  - tolérante (zéro crash si clé API absente → résultats vides)
- Le tunnel V2 est conçu pour être **facilement supprimable**:
  - supprimer `app/devis-gratuits-v2/page.tsx`
  - supprimer `app/api/ai/quick-items/route.ts`
  - supprimer `docs/devis-gratuits-v2.md`


