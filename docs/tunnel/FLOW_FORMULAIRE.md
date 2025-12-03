## Flow formulaire – Tunnel web Moverz

### Objectif

Décrire le parcours **web** standard de demande de devis (formulaire) dans le tunnel, côté app Next.js et côté modèle `LeadTunnel`.

---

### Étapes utilisateur

1. **Arrivée sur le tunnel**
   - URL type: `/devis-gratuits?src=dd-marseille`
   - Le paramètre `src` permet d’identifier le site/canal d’origine (ex: `dd-marseille`, `dd-lyon`…).

2. **Étape 1 – Infos de contact**
   - Champs:
     - `firstName` (ou `contactName` côté UI)
     - `lastName` (optionnel)
     - `email`
     - `phone` (optionnel dans le MVP)
   - Validation:
     - `firstName` non vide,
     - `email` au minimum conforme à un format `x@y.tld`.
   - Action:
     - `POST /api/leads` avec:
       - `primaryChannel = 'web'` (par défaut),
       - `firstName`, `lastName`, `email`, `phone`,
       - `source` dérivée de `src`.
     - En réponse: `{ id, linkingToken }` (pour l’instant `linkingToken` sera généralement `null`).

3. **Étape 2 – Infos déménagement**
   - Champs (inspirés de Marseille):
     - Adresses (départ & arrivée): code postal, ville, adresse libre.
     - Logement: type (studio/T1/T2…/maison…), étage, ascenseur, distance de portage, besoin de monte‑meuble, autorisation de stationnement.
     - Date: date unique ou plage de dates, indicateur de flexibilité.
   - Pour le MVP:
     - Ces données sont gérées dans le **state front** (React) et
       seront persistées dans `LeadTunnel` lors de la validation finale (étape 3).

4. **Étape 3 – Récapitulatif & validation**
   - Affichage:
     - résumé des infos de contact,
     - résumé des infos projet (adresses, logement, date),
     - éventuellement un ordre de grandeur de volume/prix (dans une itération suivante).
   - Action:
     - Clic sur “Valider ma demande”:
       - met à jour le `LeadTunnel` correspondant (via API, route à définir – ex: `PATCH /api/leads/:id`) avec:
         - toutes les infos de l’étape 2,
         - `formCompletionStatus = 'complete'`,
         - `photoStatus = 'none'`.
       - redirige vers l’**écran final** (option WhatsApp).

5. **Écran final – Option photos/WhatsApp**
   - Message:
     - “Merci, ton dossier est créé ✅…”
     - Propose:
       - un bouton “Envoyer mes photos via WhatsApp”,
       - le code dossier (`linkingToken`) en clair.
   - Gestion de `linkingToken`:
     - Si `LeadTunnel.linkingToken` est `null`:
       - génération d’un code de type `MZ-AB12CD` (front ou back),
       - stockage dans `LeadTunnel` (via API),
       - retour au front.
     - Si déjà présent: réutilisation telle quelle.

---

### Modèle `LeadTunnel` dans ce flow

- **À la création (POST /api/leads)**:
  - `primaryChannel = 'web'`
  - `firstName`, `lastName`, `email`, `phone`
  - `source` (dérivée de `src`)
  - `formCompletionStatus`:
    - MVP: directement `'complete'` après validation step 3,
    - futur: `'partial'` dès l’étape 1, puis `'complete'` en fin de parcours.
  - `photoStatus = 'none'`
  - `linkingToken = null`
  - `whatsappThreadId = null`

- **À la validation (fin étape 3)**:
  - mise à jour des autres champs (projet déménagement),
  - `formCompletionStatus = 'complete'`.

- **Sur l’écran final (option WhatsApp)**:
  - si besoin: mise à jour de `linkingToken`.

Ce même `LeadTunnel` sera utilisé plus tard par le futur parcours 100% WhatsApp (avec `primaryChannel = 'whatsapp'`), de sorte que les deux canaux partagent la même structure de données.


