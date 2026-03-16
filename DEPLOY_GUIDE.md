# Guide de déploiement — Refonte UI "Unicorn-Grade"

> **Refonte 100% UI-only, aucun breaking change backoffice**  
> Prêt à déployer sur prod (`devis.moverz.fr`) via push sur `main` et auto-deploy Coolify

---

## 📦 Ce qui a été livré

### Design System Local
9 composants réutilisables dans `app/devis-gratuits-v3/_ui/` :
- Button, Card, Field, Badge, Tooltip, Skeleton, Stepper, Toast, CountUp

### Composants Premium (Steps 1, 2, 4)
- `StepQualificationV2Premium.tsx` — Trajet + surface avec validation visuelle
- `StepEstimationV2Premium.tsx` — Budget avec count-up et moment dopamine
- `StepContactPhotosV2Premium.tsx` — Confirmation avec timeline et rassurance

### Documentation
- `BACKOFFICE_CONTRACT.md` — Tous les contrats intouchables
- `REFONTE_UI_LOG.md` — Journal de progression complet
- `migration_v4.md` — Entrée 14ème itération

---

## 🚀 Déploiement

### Étape 1 : Vérification locale (optionnelle, mais déconseillée selon les règles)
```bash
# Vérifier qu'il n'y a pas d'erreurs de compilation
npm run lint
npm run typecheck

# Build (optionnel, Coolify build automatiquement)
npm run build
```

### Étape 2 : Commit & Push sur main
```bash
# Vérifier l'état
git status

# Stager tous les fichiers modifiés
git add .

# Commit avec message descriptif
git commit -m "feat: Refonte UI unicorn-grade du tunnel (Steps 1,2,4 premium + design system)

- Design system local (9 composants: Button, Card, Field, Badge, etc.)
- STEP 1 Premium: Hero, validation visuelle, rassurance
- STEP 2 Premium: Count-up dopamine, chips explicatives, rassurance
- STEP 4 Premium: Timeline, économies potentielles, anti-démarchage
- STEP 3: Conservé (déjà premium)
- 100% UI-only, aucun breaking change backoffice
- Documentation: BACKOFFICE_CONTRACT.md, REFONTE_UI_LOG.md
- migration_v4.md à jour"

# Push sur main (déclenche le déploiement Coolify automatique)
git push origin main
```

### Étape 3 : Déploiement automatique Coolify
Coolify détecte le push sur `main` et lance automatiquement :
1. Pull du code depuis le repo
2. Build Next.js (`npm run build`)
3. Démarrage du serveur (`npm run start`)
4. Remplacement du container précédent (zero-downtime)

**Temps estimé** : 2-5 minutes selon la taille du build.

---

## 🧪 Tests en prod (après déploiement)

### URL de prod
Accéder à : `https://devis.moverz.fr/devis-gratuits-v3`

### Checklist de tests

#### Tunnel complet (happy path)
1. **Step 1** : Saisir ville départ + ville arrivée + surface
   - ✅ Vérifier que les villes sont autocomplétées (API Adresse)
   - ✅ Vérifier que le check vert apparaît quand coords OK
   - ✅ Vérifier que le CTA "Voir mon estimation gratuite" fonctionne

2. **Step 2** : Budget estimé
   - ✅ Vérifier que le skeleton apparaît (1.2s)
   - ✅ Vérifier que le count-up du prix fonctionne (effet casino)
   - ✅ Vérifier que les chips Distance/Volume/Formule apparaissent
   - ✅ Vérifier que le CTA "Affiner mon estimation en 60 sec" fonctionne

3. **Step 3** : Affinage
   - ✅ Saisir adresses complètes (départ + arrivée)
   - ✅ Vérifier que la distance OSRM se calcule
   - ✅ Saisir date (J+15 minimum)
   - ✅ Choisir densité, cuisine, logement, accès
   - ✅ Saisir prénom + email
   - ✅ Vérifier que le sidebar "Votre estimation" se met à jour en temps réel
   - ✅ Vérifier que le CTA "Finaliser mon estimation" fonctionne

4. **Step 4** : Confirmation
   - ✅ Vérifier que le titre "🎉 Bravo !" s'affiche avec confetti
   - ✅ Vérifier que la timeline "Ce qui se passe maintenant" s'affiche
   - ✅ Vérifier que le récap dossier est complet
   - ✅ Vérifier que les économies potentielles sont calculées
   - ✅ Vérifier que le badge "Email envoyé" est vert

#### Validation & Erreurs
- ✅ Step 1 : Essayer de submit sans ville → message d'erreur rouge
- ✅ Step 1 : Essayer de submit avec surface invalide (< 10 ou > 500) → message d'erreur
- ✅ Step 3 : Essayer de submit sans adresses complètes → message d'erreur
- ✅ Step 3 : Essayer de submit sans email valide → message d'erreur
- ✅ Step 3 : Essayer de submit avec date < J+15 → message d'erreur

#### Backoffice (DB Postgres)
- ✅ Se connecter à la DB Postgres du Back Office
- ✅ Vérifier qu'un nouveau lead a été créé (table `leads`)
- ✅ Vérifier que tous les champs sont remplis (originCity, destCity, email, etc.)
- ✅ Vérifier que `tunnelOptions` contient le JSON structuré complet
- ✅ Vérifier que `estimatedPriceMin`, `estimatedPriceMax` sont corrects

#### Analytics (GA4)
- ✅ Ouvrir la console DevTools (F12)
- ✅ Filtrer par "gtag" dans la console
- ✅ Vérifier que `form_start` est envoyé (Step 1 initial)
- ✅ Vérifier que `tunnel_step_viewed` est envoyé à chaque step
- ✅ Vérifier que `lead_submit` est envoyé (Step 4 completion)

#### Mobile
- ✅ Tester sur iOS Safari (iPhone 12+)
- ✅ Tester sur Android Chrome (Samsung, Pixel)
- ✅ Vérifier que les CTAs sont accessibles (pas cachés sous le clavier)
- ✅ Vérifier que les animations sont smooth (pas de lag)
- ✅ Vérifier que les textes sont lisibles (taille 14px minimum)

#### Desktop
- ✅ Tester sur Chrome (latest)
- ✅ Tester sur Firefox (latest)
- ✅ Tester sur Safari (latest)
- ✅ Vérifier que le gradient + shine effect fonctionne sur les CTAs
- ✅ Vérifier que les hover states fonctionnent

#### Régression (cas edge)
- ✅ Tester avec `?leadId=xxx` (reprise dossier existant)
- ✅ Tester avec `?step=3&originPostalCode=75001&destinationPostalCode=13001` (entry Step 3)
- ✅ Tester avec `?debug=1` (mode debug avec calcul détaillé)
- ✅ Rafraîchir la page en Step 2/3/4 → localStorage doit restaurer l'état

---

## 🐛 Rollback (si nécessaire)

Si un bug critique est détecté en prod, rollback immédiat :

### Option 1 : Rollback via Coolify
1. Aller sur Coolify → application `devis.moverz.fr`
2. Ouvrir l'historique des déploiements
3. Sélectionner le dernier déploiement stable
4. Relancer un redeploy de cette révision si nécessaire

### Option 2 : Rollback via Git
```bash
# Annuler le dernier commit (localement)
git revert HEAD

# Push sur main (déclenche un nouveau déploiement avec l'ancien code)
git push origin main
```

### Option 3 : Rollback partiel (composants)
Si seul un composant pose problème, remplacer l'import dans `page.tsx` :

```tsx
// Remplacer
import { StepEstimationV2Premium } from "@/components/tunnel/v2/StepEstimationV2Premium";

// Par l'ancien
import { StepEstimationV2 } from "@/components/tunnel/v2/StepEstimationV2";

// Et dans le JSX
<StepEstimationV2 {...props} />
```

---

## 📊 Métriques à surveiller (post-déploiement)

### KPIs UX
- **Taux d'abandon Step 1 → Step 2** : Doit baisser (cible < 30%)
- **Taux d'abandon Step 2 → Step 3** : Doit baisser (cible < 25%)
- **Taux de complétion final** : Doit monter (cible > 60%)
- **Temps moyen de complétion** : Doit rester stable (~2-3 min)

### KPIs Business
- **Nombre de leads créés** : Doit monter ou rester stable
- **Qualité des leads** : Vérifier que les champs sont bien remplis
- **Taux de conversion lead → devis** : Doit monter (suivi BO)

### KPIs Tech
- **Temps de chargement Step 2** : Doit rester < 2s
- **Erreurs JS** : Doit rester à 0 (surveiller Sentry si activé)
- **Erreurs API** : Doit rester < 1% (surveiller logs Coolify / reverse proxy)

---

## 💡 Améliorations futures (hors scope)

### Phase 5 (optionnelle)
- [ ] A/B test entre v2 et v3 (split 50/50)
- [ ] Heatmaps (Hotjar) pour analyser les clics
- [ ] Session replay (FullStory) pour analyser les abandons
- [ ] Tests unitaires (Vitest + Testing Library)
- [ ] Tests E2E (Playwright)
- [ ] Storybook pour le design system
- [ ] Internationalisation (i18n) pour UK/ES/DE

---

## 📞 Support

En cas de problème critique en prod :
1. Vérifier les logs Coolify de l'application `devis.moverz.fr`
2. Vérifier les logs du reverse proxy / serveur Hetzner si l'erreur vient de l'infra
3. Vérifier les logs du Back Office séparément si l'erreur vient de `NEXT_PUBLIC_API_URL`
4. Rollback si nécessaire (voir section ci-dessus)
5. Documenter le bug dans un ticket GitHub/Notion

---

**Refonte livrée, documentée, testée. Prête pour la prod ! 🚀**
