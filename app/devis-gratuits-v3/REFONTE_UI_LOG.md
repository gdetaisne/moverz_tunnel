# Refonte UI "Unicorn-Grade" — Log de progression

> **Objectif** : Rendre le tunnel aussi premium que la home (cohérent, fun mais élégant, micro-animations, hiérarchie parfaite, friction minimale)  
> **Contrainte** : 100% UI-only, aucun breaking change backoffice

---

## ✅ Phase 1 : Design System & Documentation (TERMINÉ)

### Livrables créés
1. **BACKOFFICE_CONTRACT.md**
   - Documentation complète de tous les contrats intouchables
   - Mapping tunnel → Back Office
   - Events GA4 et tracking
   - Checklist QA exhaustive
   - Règles d'interdiction et d'autorisation

2. **Design System Local (_ui/)**
   - `Button.tsx` — CTA premium avec variants (primary, secondary, ghost)
   - `Card.tsx` — Cards avec variants (default, gradient, glass) + hoverable
   - `Field.tsx` — Input fields avec validation visuelle, icons, helper text
   - `Badge.tsx` — Badges avec variants (success, warning, info, premium)
   - `Tooltip.tsx` — Tooltips animés avec icon optional
   - `Skeleton.tsx` — Skeletons pour loading states (text, rect, circle)
   - `Stepper.tsx` — Progress stepper (horizontal/vertical)
   - `Toast.tsx` — Toast notifications + hook useToast
   - `CountUp.tsx` — Counter animé pour les prix (easing easeOutExpo)
   - `index.ts` — Exports centralisés

### Principes de design
- **Tailwind uniquement** (pas de nouvelle lib CSS)
- **Animations légères** (transition 150-300ms, respecte prefers-reduced-motion)
- **Mobile-first** (design pensé mobile, amélioré desktop)
- **Micro-interactions** (hover states, focus rings, smooth transitions)
- **Gradients subtils** (de [#6BCFCF] à [#A78BFA])
- **Shadows élégantes** (blur avec opacité 10-20%)

---

## 🚀 Phase 2 : STEP 2 (Budget estimé) — MOMENT DOPAMINE (TERMINÉ)

### Nouveau composant : StepEstimationV2Premium.tsx

#### ✨ Innovations UI/UX
1. **Skeleton → Reveal** (1.2s)
   - Skeleton animé avec bouncing dots
   - Transition smooth vers le contenu

2. **Count-up prix central** (1.8s, easeOutExpo)
   - Effet "compteur casino" sur le budget
   - Gradient texte [#6BCFCF] → [#0F172A] → [#A78BFA]
   - Typo massive : 6xl mobile, 7xl desktop

3. **Fourchette min/max premium**
   - Cards avec gradients emerald (min) / rose (max)
   - Icons TrendingDown / Sparkles
   - Typo 2xl, tabular-nums

4. **Chips explicatives** (apparaissent après count-up)
   - Distance (avec tooltip OSRM)
   - Volume (avec tooltip affinage)
   - Formule (avec badge "Modifiable")
   - Hover states élégants

5. **Rassurance bloc "Pourquoi affiner ?"**
   - 3 bénéfices clairs avec bullets
   - Gradient background subtil
   - Icon check vert

6. **CTA optimisé**
   - Copy "Affiner mon estimation en 60 sec 🚀"
   - Gradient desktop avec shine effect
   - Sous-texte "~1 minute • Gratuit • Sans engagement"

#### 🔒 Backoffice Safe
- ✅ Props identiques (volume, priceMin, priceMax, formuleLabel, etc.)
- ✅ onSubmit inchangé (même handler)
- ✅ Aucun nouveau field / state
- ✅ Payload 100% identique
- ✅ Debug mode préservé

---

## 📋 TODO Phase 3 : Steps restants

### STEP 1 (Trajet) — Status: PENDING
**Objectifs** :
- Encapsuler AddressAutocomplete dans des Field premium
- Ajouter validation visuelle (check vert quand coords OK)
- Améliorer la hierarchie (icons, spacing, focus states)
- Ajouter helper text explicatif
- CTA avec gradient + shine effect

**Composants existants à préserver** :
- AddressAutocomplete (ne pas toucher)
- Validation coords (originLat/originLon)
- Handler onSubmit (handleSubmitQualificationV2)

---

### STEP 3 (Affinage) — Status: COMPLETED ✅

**Nouveau composant** : `components/tunnel/v2/LiveEstimatePanel.tsx`

**Décision** : Extraction du sidebar d'estimation inline (~150 lignes) en composant réutilisable premium. Formulaire `StepAccessLogisticsV2` préservé intégralement.

#### ✨ Innovations UI/UX

**1. Architecture responsive**
- **Desktop** : Panneau sticky colonne droite (lg:sticky lg:top-28)
- **Mobile** : Bottom bar collapsée + Bottom sheet on tap

**2. Desktop : Panneau sticky premium**
```tsx
<aside className="hidden lg:block">
  <div className="rounded-3xl bg-gradient-to-br from-[#A8E6D8] via-[#6BCFCF] to-[#A78BFA]/60">
    {/* Header "Votre estimation" + Badge LIVE pulsé */}
    {/* Prix principal avec CountUp (150-250ms) */}
    {/* Min/Max cards emerald/rose */}
    {/* Ajustements (5 drivers max) avec highlight animations */}
    {/* CTA "Voir détail" → Drawer desktop */}
    {/* Trust line (3 garanties) */}
    {/* Première estimation collapsible */}
  </div>
</aside>
```
- Badge "LIVE" avec pulse animation (animate-ping)
- CountUp animé sur changement de `refinedCenterEur` (200ms)
- Micro-animation highlight sur ligne modifiée (ring turquoise + scale 1.02, 500ms)
- Gradient white glow overlay (top fade)
- Accent line turquoise (2px) sur card prix principal

**3. Mobile : Bottom bar + Bottom sheet**
```tsx
{/* Bottom bar fixed z-20 */}
<div className="lg:hidden fixed bottom-20">
  <button onClick={openSheet}>
    <Badge>LIVE</Badge>
    <p>Budget affiné</p>
    <p>{fmtEur(refinedCenterEur)}</p>
  </button>
</div>

{/* Bottom sheet slide-in */}
{showMobileSheet && (
  <div className="fixed inset-0 z-50">
    <div className="backdrop blur" />
    <div className="sheet rounded-t-3xl max-h-90vh">
      {/* Handle drag indicator */}
      {/* Contenu identique desktop */}
    </div>
  </div>
)}
```
- Bottom bar à 20px du bas (évite chevauchement CTA principal)
- Sheet animation slide-in-from-bottom (300ms)
- Tap outside → fermeture
- Handle drag indicator blanc/50

**4. Drawer "Détail du calcul"**
- Desktop : Modal centered (zoom-in-95, max-w-lg)
- Mobile : Réutilise bottom sheet
- 5 bullets max avec TrendingUp/Down icons
- Format : Badge numéro + Label + Status + Montant
- Footer : "Formule {formuleLabel} • Calcul basé sur vos données"

**5. Trust line (3 garanties)**
```tsx
<div className="trust-line">
  <CheckCircle /> Entreprises vérifiées
  <PhoneOff /> Numéro masqué
  <Shield /> 0 démarchage
</div>
```
- Icons Lucide (CheckCircle, PhoneOff, Shield)
- Text xs white/90
- Border-top white/20

**6. Props & Data Flow**
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
```
- Data source : `v2PricingCart` (useMemo dans page.tsx)
- 100% présentation (aucune logique métier)
- Lines limited to 5 drivers (Distance, Densité, Cuisine, Date, Accès)

**7. Micro-interactions**
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
- Ring 2px turquoise + scale 1.02 sur ligne modifiée (500ms)
- Fade/slide du montant (150ms)
- Respect prefers-reduced-motion

#### 🔒 Backoffice Safe
- ✅ Composant 100% présentation (no logic)
- ✅ Data source inchangée (`v2PricingCart`)
- ✅ Aucun nouveau field ajouté à `TunnelFormState`
- ✅ Aucun event GA4 ajouté/modifié
- ✅ `StepAccessLogisticsV2` formulaire préservé intégralement (colonne gauche)
- ✅ Layout grid préservé (`lg:grid-cols-[1fr_420px]`)
- ✅ Handler `handleSubmitAccessV2` inchangé
- ✅ Payload `tunnelOptions` et `pricingSnapshot` intacts

#### Intégration dans page.tsx
```tsx
{state.currentStep === 3 && (
  <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-8">
    {/* Formulaire (gauche) — inchangé */}
    <div><StepAccessLogisticsV2 ... /></div>
    
    {/* Panneau estimation (droite) — nouveau */}
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
- ~150 lignes inline → 1 composant (meilleure maintenabilité)

#### Décisions UX
- **Pas d'accordions** : Le formulaire `StepAccessLogisticsV2` existant est déjà bien structuré avec des sections claires. Ajouter des accordions créerait de la friction et compliquerait la validation. Décision : préserver le formulaire actuel.
- **Focus sur le panneau estimation** : Le vrai gain UX est dans la présentation live de l'estimation avec micro-animations, trust line, et drawer détail. C'est là qu'on crée l'effet "wow" sans toucher à la logique.

---

### STEP 4 (Bravo) — Status: PENDING
**Objectifs** :
- Titre célébration avec confetti CSS
- Timeline "Ce qui se passe maintenant" :
  1. ✅ Votre estimation reçue
  2. ⏳ Sélection des meilleurs pros (24h)
  3. 📧 Vous recevez jusqu'à 3 devis gratuits
- Card récap (trajet, date, formule, budget)
- Badge "Économies potentielles" (vs marché)
- Copy anti-démarchage rassurante
- Section photos (déjà existante, améliorer visuellement)

**Composants existants à préserver** :
- StepContactPhotosV2 (wrapper)
- Upload photos (ne pas toucher la logique)
- Email recap (ne pas toucher)

---

## 📊 Méthodologie de refactor

### Workflow par step
1. **Créer nouveau composant** (ex: StepEstimationV2Premium.tsx)
   - Copier props interface existante
   - Wrapper UI premium autour de la logique existante
   - Préserver tous les handlers / callbacks
   - Tester en isolation

2. **Intégrer dans page.tsx**
   - Remplacer import ancien composant
   - Vérifier que props matchent
   - Tester navigation step → step
   - Vérifier console (pas d'erreurs)

3. **QA Backoffice**
   - Vérifier payload envoyé (Network tab)
   - Vérifier events GA4 (Console gtag)
   - Tester sur mobile + desktop
   - Vérifier aucun champ manquant

4. **Update migration_v4.md**
   - Documenter changements UI
   - Lister nouveaux composants
   - Note décisions UX

---

## 🎨 Guidelines visuelles

### Couleurs
- **Primary gradient** : from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8]
- **Accent purple** : [#A78BFA]
- **Text dark** : [#0F172A]
- **Text subtle** : [#1E293B]/70
- **Success** : [#10B981]
- **Error** : [#EF4444]
- **Warning** : [#F59E0B]
- **Border** : [#E3E5E8]

### Spacing
- **Section gap** : space-y-6 (mobile) → space-y-8 (desktop)
- **Card padding** : p-6 (mobile) → p-8 ou p-10 (desktop)
- **Button padding** : py-4 (mobile) → py-5 (desktop)

### Border radius
- **Small** : rounded-lg (8px)
- **Medium** : rounded-xl (12px)
- **Large** : rounded-2xl (16px)
- **Extra** : rounded-3xl (24px) pour cards hero

### Shadows
- **Subtle** : shadow-sm
- **Medium** : shadow-[0_8px_32px_rgba(107,207,207,0.12)]
- **Hover** : shadow-[0_12px_48px_rgba(107,207,207,0.15)]
- **Premium** : shadow-xl shadow-[#6BCFCF]/20

### Animations
- **Transition** : transition-all duration-200 ou duration-300
- **Hover scale** : sm:hover:scale-[1.01] ou [1.02]
- **Active scale** : active:scale-[0.98]
- **Fade in** : animate-in fade-in duration-500
- **Slide in** : animate-in slide-in-from-bottom-4 duration-700

---

## ✅ Checklist finale (avant merge)

### Code quality
- [ ] Aucun console.error / warning
- [ ] TypeScript compile sans erreurs
- [ ] Tous les imports résolus
- [ ] Aucun unused import
- [ ] Prettier/ESLint OK

### Backoffice integrity
- [ ] Payload identique (avant/après)
- [ ] Events GA4 identiques
- [ ] Aucun champ supprimé
- [ ] Aucune valeur renommée
- [ ] Validation identique

### Fonctionnel
- [ ] Navigation Step 1 → 2 → 3 → 4 OK
- [ ] Lead créé dans BO (DB check)
- [ ] Coords récupérées (API Adresse)
- [ ] Distance OSRM calculée
- [ ] Pricing correct (formules, min/max)
- [ ] Validation bloque champs requis
- [ ] Erreurs API gérées (fallback 404)

### Mobile / Desktop
- [ ] Mobile iOS Safari OK
- [ ] Mobile Android Chrome OK
- [ ] Desktop Chrome OK
- [ ] Desktop Firefox OK
- [ ] Desktop Safari OK
- [ ] Aucun layout cassé
- [ ] CTAs visibles et accessibles
- [ ] Animations 60fps

### Régression
- [ ] Anciennes sessions (localStorage) OK
- [ ] Entry avec ?leadId=xxx OK
- [ ] Entry avec ?step=3&originPostalCode=... OK
- [ ] Debug mode ?debug=1 OK

---

## 📝 Notes de développement

### Décisions clés
1. **Pas de nouvelle lib** : Tailwind uniquement (pas de Framer Motion, pas de React Spring)
2. **Composants locaux** : Design system dans _ui/ (pas dans /components global)
3. **Backward compatible** : Ancien StepEstimationV2 reste disponible si rollback nécessaire
4. **Mobile-first** : Tous les breakpoints en `sm:` ou `lg:`
5. **Performance** : Animations CSS pures (pas de JS sauf CountUp)

### Améliorations futures (hors scope)
- [ ] Ajouter tests unitaires (Vitest + Testing Library)
- [ ] Ajouter Storybook pour le design system
- [ ] Internationalisation (i18n)
- [ ] A/B testing (split entre v2 et v3)
- [ ] Analytics avancés (heatmaps, session replay)

---

## 🎯 Objectif final

**Transformer le tunnel en expérience "unicorn-grade"** :
- ✅ Moment dopamine Step 2 (budget reveal)
- 🔜 Clarté absolue (hiérarchie, spacing, typographie)
- 🔜 Micro-interactions premium (hover, focus, validation)
- 🔜 Confiance renforcée (rassurance, timeline, anti-démarchage)
- 🔜 Friction minimale (validation inline, helper text, tooltips)
- 🔜 Cohérence totale avec la home (couleurs, gradients, animations)

**Sans rien casser côté backoffice** 💯
