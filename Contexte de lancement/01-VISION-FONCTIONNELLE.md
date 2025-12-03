## Vision fonctionnelle du tunnel Moverz

### Rôle du tunnel

- **But**: transformer des visiteurs des sites villes (devis-demenageur-*.fr) en **leads structurés** dans le Back Office Moverz.
- **Forme**: un **tunnel en plusieurs étapes** sous Next.js (ex: `/devis-gratuits`), avec une UX premium, alignée visuellement sur les sites existants.
- **Back Office**: le tunnel ne gère ni matching déménageurs ni paiements; il crée un **Lead** riche, que le Back Office convertira ensuite en **Folder** puis en devis/réservations.

### Étapes actuelles (clone fonctionnel de `/devis-gratuits` Marseille)

- **Étape 1 – Contact**
  - Champs principaux: nom à utiliser, email.
  - Action backend: `POST /public/leads` (lead minimal: `firstName`, `email`, `source` explicite).
  - Objectif: créer rapidement un lead et obtenir un canal de contact fiable.

- **Étape 2 – Projet (adresses + logement + date)**
  - Informations sur **adresse de départ**, **adresse d’arrivée**, type de logement, étages, ascenseur, distance de portage, date ou plage de dates, flexibilité.
  - Action backend: `PATCH /public/leads/:id` pour enrichir le lead.
  - Objectif: décrire le **contexte logistique** du déménagement.

- **Étape 3 – Volume & formules (pricing La Poste)**
  - Saisie/suggestion de la **surface**, choix de la **densité** (sobre / normal / dense).
  - Calcul du **volume m³** et d’une **fourchette de prix** par formule (Économique / Standard / Premium) via un algorithme de pricing à base de ratios m²→m³ et €/m³ (inspiré de La Poste / sites existants).
  - Action backend: `PATCH /public/leads/:id` avec `surfaceM2`, `estimatedVolume`, `density`, `formule`, `estimatedPriceMin/Avg/Max`.
  - Objectif: donner au client un **ordre de grandeur compréhensible** et un choix de positionnement (budget vs confort).

- **Étape 4 – Validation email**
  - Le tunnel demande au Back Office d’envoyer un **email de confirmation** au lead (`POST /public/leads/:id/request-confirmation`).
  - UI: écran explicatif (“Veuillez confirmer votre demande en cliquant sur le lien reçu par email”), aide en cas de non-réception (vérifier/corriger l’email, renvoyer).
  - Objectif: sécuriser la **qualité des leads** et rassurer le client (“partenaire de {site}”).

### Étape future – Photos / WhatsApp (hook prévu)

- **Position**: entre l’étape 3 (Volume & formules) et l’étape 4 (Validation email).
- **Idée**:
  - Proposer au client d’**envoyer des photos** de son logement (ou de pièces clés) via:
    - un flux WhatsApp guidé,
    - ou un autre canal simple.
  - À court terme: peut se limiter à un CTA + instructions (sans traitement backend complexe).
  - À moyen terme: remplir des champs comme `photosUrls` et éventuellement `aiEstimationConfidence` sur le Lead.
- **Objectif**: préparer le terrain pour un **inventaire plus précis** (et potentiellement assisté par IA) sans bloquer le MVP.

### Multi-sites & branding

- Les sites villes (Marseille, Bordeaux, etc.) **redirigent** vers le tunnel central (ex: `https://devis.moverz.fr/devis-gratuits?src=dd-marseille`).
- Le tunnel doit:
  - respecter la **charte visuelle** actuelle (typo, couleurs, ton) pour ne pas “casser” l’expérience.
  - utiliser `src` pour:
    - renseigner `lead.source`,
    - adapter éventuellement quelques textes (mention du site partenaire dans les emails).

### Mobile first

- Le tunnel est conçu en **mobile first**:
  - les maquettes mentales et composants sont d’abord optimisés pour un usage smartphone (une main, champs bien espacés, textes lisibles),
  - les versions tablette/desktop sont obtenues par élargissement progressif (breakpoints Tailwind / CSS) sans dégrader l’expérience mobile.


