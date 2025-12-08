# Suivi AI-Lab & inventaire photos

Ce document sert de **mémo long terme** pour faire évoluer le système d’analyse de photos (AI-Lab + tunnel).  
Objectif : quand on revient plus tard avec “ok, je veux améliorer l’IA”, on sait **par où repartir**.

---

## 1. État actuel (déc 2025)

- **AI-Lab**
  - 3 sets de test (`set_1`, `set_2`, `set_3`) chargés depuis le dossier local, sans upload manuel.
  - **Process 1** : analyse “simple” (groupement par noms de fichiers) enrichie avec :
    - mesures IA (width/depth/height),
    - volumes IA + volumes standards + volume final,
    - estimation de valeur,
    - règles métier (lit → matelas/sommier/parure, armoires → contenu).
  - **Process 2 (labo)** : pipeline 2 temps dédié labo :
    1. Classification 1 photo = 1 appel (même prompt que la prod `process2-classify`) avec primary + confidence + alternatives.
    2. Seconde passe “same room ?” pour les photos à faible confiance, comparées à une photo de référence très confiante.
    3. Inventaire par pièce avec mesures/volumes/valeur + règles métier (lit, armoire).
  - Vue synthétique :
    - tableaux par process (Pièce / Description / Mesures / Volume / Valeur),
    - détail inventaire Process 2 (Pièce / Article / Qté),
    - **affectation des pièces par photo** (nom de fichier, pièce IA finale, confiance),
    - historique des runs (process, set, temps).
  - Doublons explicites (`… (2).jpg`) ignorés automatiquement dans les analyses.

- **Prod (tunnel étape 4)**
  - `process2-classify` :
    - classification par photo (primary + confidence + alternatives) stockée en base,
    - inventaire par pièce,
    - pas encore de seconde passe “same room”.

- **Usage OK dans l’état**
  - 1) Upgrade de l’étape 4 front (meilleure présentation des résultats d’inventaire).
  - 2) Création d’un widget “démonstrateur” avant le tunnel pour montrer la valeur de la solution aux prospects.

---

## 2. Axes d’amélioration futurs

### 2.1. Robustesse de la classification par pièce

- **A1 – Continuer à fiabiliser la pièce primaire**
  - Garder prompts prod comme source de vérité.
  - Logger systématiquement les cas :
    - `AUTRE` / `INCONNU`,
    - changements de pièce après “same room”.
  - Ajouter un petit badge “corrigé → Salon (sameRoom 0.82)” dans la vue AI-Lab pour comprendre les corrections.

- **A2 – Exploiter mieux les alternatives**
  - Heuristique plus riche sur `roomGuessAlternatives` (ex : pondérer par confiance, prendre top‑2 / top‑3).
  - Stratégie de fallback si une pièce est **massivement dominante** (ex. 10 photos “Salon” vs 1 “Autre” faible confiance).

### 2.2. Latence & coût

- **B1 – Paramétrage fin**
  - Ajuster :
    - `CLASSIFY_CONCURRENCY` (nb de photos classifiées en parallèle),
    - `MAX_PHOTOS_PER_ROOM` (photos max par pièce pour l’inventaire),
    - `max_tokens` des prompts d’inventaire.
  - Objectif cible : **Process 2 set_3 < ~20 s** sans trop dégrader la qualité.

- **B2 – Expérimenter d’autres modèles**
  - Ajouter un **Process 3** expérimental dans AI-Lab :
    - même pipeline que Process 2, mais branché sur un modèle type GPT‑4o‑mini ou open‑source VLM.
  - Comparer : temps total, qualité d’inventaire, stabilité de la classification.

### 2.3. Qualité de l’inventaire & règles métier

- **C1 – Étendre les règles métier**
  - Déjà en place : lit (matelas/sommier/parure), armoires (contenu selon pièce).
  - Prochaines cibles à fort impact :
    - canapés (angle vs 2/3 places),
    - gros électroménager (frigo US vs petit frigo, machine à laver, etc.),
    - meubles TV / buffets / bibliothèques volumineux.

- **C2 – Précision des volumes & valeurs**
  - Enrichir la table de volumes standards à partir du fichier `Default m3`.
  - Introduire un barème simple de **valeurs typiques par catégorie** (pour combler les trous quand l’IA ne renvoie pas de valeur).

### 2.4. UX / Outillage IA-Lab

- **D1 – Vue “par pièce”**  
  - Pour chaque process : Pièce → liste des photos utilisées → inventaire associé (pour vérifier visuellement qu’on n’a pas mélangé deux pièces).

- **D2 – Comparaison avec la prod**
  - Ajouter une mini‑section “Diff vs prod” :
    - nombre de pièces,
    - nombre d’items,
    - volume total m³,
    - nombre d’objets > 500 €.
  - Permet de valider rapidement que les nouvelles versions ne dégradent pas la prod.

---

## 3. Prochaines étapes recommandées (quand on reprend)

1. **Mesurer** systématiquement sur les sets 1/2/3 :
   - temps Process 1 & 2,
   - nombre de photos `À classer / incertain`,
   - nb de corrections “same room”.
2. **Tuner les paramètres IA** (A1/B1) jusqu’à obtenir une classification quasi identique à la prod + temps acceptable.
3. **Étendre les règles métier** sur quelques catégories supplémentaires (C1) et observer l’impact sur le m³ total.
4. **Ajouter un Process 3 expérimental** (B2) pour comparer Claude vs autre modèle en conditions réelles.

---

## 4. Règles métier et heuristiques actuelles (détail)

### 4.1. Classification des photos (Process 2 labo)

- **Prompt de base (identique à la prod)**  
  - `roomGuessPrimary` ∈ {SALON, CUISINE, CHAMBRE, …, AUTRE}.  
  - `roomGuessConfidence` ∈ [0,1].  
  - `roomGuessAlternatives[]` : liste {roomType, confidence}.

- **Seuils utilisés**
  - `HIGH_CONF_THRESHOLD = 0.9` : photos utilisées comme **benchmarks** pour une pièce donnée.
  - `LOW_CONF_THRESHOLD = 0.6` : en‑dessous, la photo est considérée comme **douteuse**.

- **Seconde passe “same room ?”**
  - Candidats considérés pour une photo douteuse :
    - son `roomGuessPrimary` (si pas AUTRE/INCONNU),
    - + toutes les alternatives `roomGuessAlternatives` avec `confidence ≥ 0.3` et type ≠ AUTRE/INCONNU.
  - Pour chaque candidat ayant au moins une photo benchmark :
    - on choisit 1 photo de référence (benchmark) de cette pièce,
    - appel `callClaudeSameRoom(roomType, refImage, candidateImage)` → JSON `{ sameRoom: boolean, confidence: number }`.
    - si `sameRoom = true` et `confidence ≥ 0.6` :
      - on force `roomGuessPrimary = roomType`,
      - on met à jour `roomGuessConfidence` avec `confidence` (ou l’ancienne valeur si plus haute).

### 4.2. Filtrage des photos en entrée

- **Doublons explicites**
  - Toute photo dont le nom matche `/(\\(\\d+\\)\\.[^.]+$/i` (ex: `PHOTO… (2).jpg`, `PHOTO… (3).jpg`) est **ignorée** pour :
    - Process 1 (`/api/ai/analyze-photos`),
    - Process 2 labo (`/api/ai/lab-process2`).
  - Ces fichiers ne partent pas aux IA, mais peuvent rester stockés si besoin.

### 4.3. Règles métier sur les items (Process 1 & 2)

- **Lits**
  - Détection : catégorie `LIT` ou label contenant `"lit "` (insensible à la casse / accents).
  - Dérivés ajoutés pour chaque lit détecté :
    - **Matelas** :
      - même largeur/longueur que le lit,
      - hauteur fixée à **30 cm**,
      - volume IA calculé si possible, sinon volume standard “Matelas seul”.
    - **Sommier** :
      - même longueur et hauteur que le lit,
      - largeur = largeur du lit / **5** (on considère un sommier démonté),
      - volume IA ou standard “Sommier seul”.
    - **Parure de lit (couette + coussins)** :
      - utilise uniquement le volume standard associé.
  - Volume final du lit :
    - pour la ligne “lit” : volume = **somme des dérivés** (meuble utilisé comme “porte‑contenu”),
    - les dérivés apparaissent en “dont…” dans la description.

- **Armoires / buffets**
  - Détection : catégorie `ARMOIRE`.
  - On calcule un volume par unité pour le meuble :
    - priorité au volume standard (table `standardVolumes`),
    - fallback sur un éventuel `volumeM3` IA.
  - Facteurs de contenu appliqués selon la pièce :
    - en `CHAMBRE` : contenu vêtements, facteur **0.75 × volume meuble**,
    - en `SALON` : contenu fragile (vaisselle, verres, etc.), facteur **1.25 × volume meuble**.
  - Pour chaque armoire :
    - `volumeM3Final` du meuble seul = volume standard ou IA,
    - on ajoute un item dérivé “Contenu armoire …” avec `volumeM3Final = volume_meuble × facteur`,
    - la ligne principale affiche la décomposition en “dont meuble … / dont contenu …”.

### 4.4. Volumes standards & volumes finaux

- **Table `standardVolumes`**
  - Normalisation des labels (minuscules, sans accents, espaces normalisés).
  - Match si :
    - label normalisé contient la clé normalisée, ou
    - la clé contient le label normalisé (pour gérer les synonymes).
  - Exemples codés :
    - “lit une place complet”, “lit 2 places complet 140/160/180”, “lit double”,
    - “sommier seul”, “matelas seul”, “parure de lit couette coussins”,
    - armoires 2/3/4 portes, canapés 2/3 places, canapé d’angle, etc.

- **Choix du volume final**
  - `volumeM3Ai` : volume proposé par l’IA (si disponible).
  - `volumeM3Standard` : volume issu de la table standard.
  - `volumeM3Final` par défaut :
    - si les deux existent → `max(volumeM3Ai, volumeM3Standard)` (stratégie “ai_or_standard_max”),
    - sinon on prend ce qui est disponible,
    - les règles métier (lit / armoire) peuvent ensuite ajuster ce volume (en ajoutant des dérivés).


