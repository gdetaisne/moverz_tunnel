## Flow WhatsApp – MVP & vision V2

### Objectif

Décrire:
- le **MVP**: option WhatsApp pour envoyer des photos à la fin du tunnel web,
- la **vision V2**: parcours 100% WhatsApp + bot/IA,
en s’appuyant sur le modèle commun `LeadTunnel`.

---

## 1. MVP – Option WhatsApp pour les photos (après tunnel web)

### Contexte

À la fin du tunnel web (formulaire décaré complet), on veut:
- proposer au client d’envoyer des photos via WhatsApp,
- préparer tous les éléments nécessaires pour **lier la conversation WhatsApp** à un `LeadTunnel`,
- sans encore implémenter de webhook ni de bot.

### Données utilisées

- `LeadTunnel`:
  - `id`: identifiant interne tunnel,
  - `primaryChannel = 'web'`,
  - `formCompletionStatus = 'complete'`,
  - `photoStatus = 'none'` (au moment d’arriver sur l’écran final),
  - `linkingToken: string | null`,
  - `whatsappThreadId: string | null`.

### Étapes côté UI (écran final du tunnel)

1. **Récupération/création du `linkingToken`**
   - Si `LeadTunnel.linkingToken` est `null`:
     - Générer un code humainement lisible (ex: `MZ-AB12CD`):
       - préfixe fixe `MZ-`,
       - 4–6 caractères alphanumériques en majuscules.
     - Stocker ce code dans `LeadTunnel.linkingToken` via l’API tunnel (ex: `PATCH /api/leads/:id`).
   - Si `linkingToken` existe déjà:
     - le réutiliser tel quel.

2. **Génération du deep link WhatsApp**
   - Format:
     - `https://wa.me/<NUM_MOVERZ>?text=<MESSAGE_URL_ENCODED>`
   - Exemple de message pré-rempli:
     > "Bonjour, je veux compléter mon inventaire avec des photos.  
     > Mon code dossier est : MZ-AB12CD"
   - `NUM_MOVERZ` = numéro WhatsApp Business configuré côté Moverz (géré hors tunnel).

3. **UI côté tunnel**
   - Afficher un bloc clair:
     - Titre “Envoyer mes photos sur WhatsApp”.
     - Bouton primaire “Ouvrir WhatsApp”.
       - `onClick` = ouverture du deep link.
     - Afficher le **code dossier** (`linkingToken`) en clair:
       - pour que le client puisse le recopier,
       - proposer un bouton “Copier le code”.

4. **État `photoStatus`**
   - Pour le MVP, on peut rester sur:
     - `photoStatus = 'none'` (aucune réception connue).
   - V2: lorsqu’une intégration WhatsApp sera en place, ce champ sera mis à jour:
     - `'planned_whatsapp'`: deep link cliqué,
     - `'received_whatsapp'`: au moins une photo reçue,
     - `'received_web'`: si un futur upload web est utilisé.

### Pas de logique serveur WhatsApp (pour l’instant)

- **Pas de webhook**:
  - le tunnel ne reçoit pas (encore) les messages entrants WhatsApp.
- **Pas de bot**:
  - aucune réponse automatique côté WhatsApp,
  - les échanges sont traités manuellement par l’équipe.

La seule chose que fait le tunnel pour l’instant:
- préparer et stocker `linkingToken`,
- construire le deep link WhatsApp,
- informer le client de son code dossier.

---

## 2. Vision V2 – Parcours 100% WhatsApp & bot

> À ne pas coder maintenant, mais à garder en tête pour la conception.

### Entrée directe par WhatsApp

- Un nouveau prospect peut:
  - envoyer un message WhatsApp directement au numéro Moverz,
  - ou cliquer sur un lien WhatsApp depuis un site partenaire.

- Côté backend/bot:
  - à la réception du **premier message**:
    - créer un `LeadTunnel` avec:
      - `primaryChannel = 'whatsapp'`,
      - `phone` = numéro WhatsApp,
      - `formCompletionStatus = 'none'` ou `'partial'`,
      - éventuellement un `linkingToken` généré automatiquement,
      - `whatsappThreadId` = identifiant unique de la conversation côté Meta.

### Bot IA & remplissage progressif

- Le bot (texte + éventuellement IA) peut:
  - poser des questions simples:
    - prénom/nom,
    - date de déménagement,
    - ville de départ/arrivée,
    - type de logement, etc.
  - extraire des infos de messages libres ou de **voice notes**:
    - transcription → mapping vers les champs du `LeadTunnel`.

- À chaque nouvelle info:
  - mettre à jour `LeadTunnel` (API interne ou backend dédié),
  - faire évoluer `formCompletionStatus` (`none` → `partial` → `complete`).

### Gestion des photos

- Quand le client envoie des photos:
  - l’outil d’intégration WhatsApp (ou le bot) :
    - récupère les URLs/identifiants des médias,
    - les associe au bon `LeadTunnel` grâce à:
      - `whatsappThreadId` (cas 100% WhatsApp),
      - ou via le `linkingToken` mentionné par le client.
  - met à jour:
    - `photoStatus = 'received_whatsapp'`,
    - `photosUrls` (champ futur côté modèle Back Office / extension du modèle tunnel).

### Lien Web ↔ WhatsApp

- **Cas 1** – Formulaire web → WhatsApp:
  - déjà couvert par le MVP:
    - `LeadTunnel` créé via le web,
    - `linkingToken` communiqué au client,
    - quand l’intégration WhatsApp sera en place:
      - tout message contenant ce code permettra de retrouver le lead et d’associer la conversation.

- **Cas 2** – WhatsApp → Web:
  - plus tard, on pourra:
    - envoyer au client un lien web personnalisé:
      - ex: `https://devis.moverz.fr/devis-gratuits?linkingToken=MZ-AB12CD`,
    - pré-remplir le tunnel avec les données déjà connues depuis WhatsApp,
    - lui permettre de compléter/affiner son dossier sur le web.

---

## 3. Résumé des champs `LeadTunnel` côté WhatsApp

- `primaryChannel`:
  - `'web'` pour les parcours actuels,
  - `'whatsapp'` pour les parcours 100% WhatsApp (V2).
- `formCompletionStatus`:
  - `'none'` → début de conversation,
  - `'partial'` → quelques infos connues,
  - `'complete'` → suffisamment d’infos pour pousser vers le Back Office.
- `photoStatus`:
  - `'none'` → pas de photos connues,
  - `'planned_whatsapp'` → deep link cliqué (optionnel),
  - `'received_whatsapp'` → médias reçus,
  - `'received_web'` → (futur) upload web.
- `linkingToken`:
  - clé courte pour que le client puisse s’identifier facilement (MZ-XXXXXX),
  - utilisée pour relier manuellement/automatiquement les canaux Web et WhatsApp.
- `whatsappThreadId`:
  - identifiant unique de la conversation côté Meta,
  - utilisé surtout pour la V2 bot/IA et la gestion des historiques.


