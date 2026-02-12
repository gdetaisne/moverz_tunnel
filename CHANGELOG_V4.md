# 📝 Changelog — Tunnel V4

Historique des modifications du tunnel Moverz.

---

## [4.0.0] - 2026-02-12

### 🎨 Design System V4

**Ajouté**
- Tokens CSS complets (`styles/tokens.css`)
  - Couleur signature turquoise `#0EA5A6`
  - Typographie Sora (headings) + Inter (body)
  - Radius cohérent (8px inputs, 12px cards)
  - Shadows discrètes (pas de colored shadows)
- Google Fonts (Sora + Inter) dans `app/layout.tsx`
- Mapping Tailwind des tokens dans `tailwind.config.ts`

**Modifié**
- `app/globals.css` : Import tokens + scrollbar custom

**Supprimé**
- ❌ Dégradés turquoise-vert vifs
- ❌ Bordures épaisses colorées par défaut
- ❌ Colored shadows (sauf glow turquoise)

---

### 🧩 Composants V4

**Ajouté**
- `components/tunnel-v4/Input.tsx`
  - Border grise fine, focus turquoise
  - Checkmark vert animé (Framer Motion)
  - Error state avec AlertCircle
  - Props : `isValid`, `error`, `helper`

- `components/tunnel-v4/Button.tsx`
  - Variants : `primary` (noir), `accent` (turquoise), `secondary`, `ghost`
  - Sizes : `sm`, `md`, `lg`
  - Hover : `opacity: 0.9`, Active : `scale(0.98)`
  - Props : `isLoading`, `variant`, `size`

- `components/tunnel-v4/Card.tsx`
  - Variants : `default`, `highlighted` (border turquoise)
  - Padding : `sm`, `md`, `lg`
  - Animation FadeUp optionnelle
  - Props : `animate`, `variant`, `padding`

- `components/tunnel-v4/Progress.tsx`
  - Barre turquoise fine (6px)
  - Transition smooth (300ms)
  - Props : `value`, `label`, `showPercent`

- `components/tunnel-v4/SegmentedControl.tsx`
  - Radio buttons stylisés en grille
  - Border grise, selected turquoise
  - Support icônes
  - Props : `options`, `value`, `onChange`

- `components/tunnel-v4/SmartCart.tsx` 🌟
  - **Desktop** : Sticky sidebar (380px, top: 96px)
  - **Mobile** : FAB flottant (bottom: 88px) + Drawer swipeable
  - Prix animé (bounce vertical)
  - Progress bar dans fourchette min/max
  - Items list avec animations entry/exit
  - Project info (trajet, surface, volume)
  - Badge "Prix transparent"
  - Props : `currentPrice`, `minPrice`, `maxPrice`, `items`, `projectInfo`

- `components/tunnel-v4/index.ts` : Export centralisé

**Dépendances**
- ✅ Framer Motion 11 installé (`npm install framer-motion`)

---

### 📱 Écrans refactorés

**Step 1 : Entrée** (`StepQualificationV4.tsx`)
- Background `#FAFAFA`
- Card centrée border grise
- InputV4 pour surface avec checkmark
- ButtonV4 noir primary
- Hero Sora bold

**Step 2 : Estimation** (`StepEstimationV4.tsx`)
- Badge "ESTIMATION INDICATIVE" turquoise
- Skeleton loading (dots animés 1.2s)
- Prix CountUp animé (6xl Sora, 1.8s)
- Grid Min/Max avec borders subtiles
- 3 chips explicatives (Distance, Volume, Formule)
- CTA turquoise accent
- **Moment dopamine** réussi ✨

**Step 3 : Détails** (`StepAccessLogisticsV4.tsx`)
- Layout 2 colonnes desktop (form + SmartCart)
- SmartCart sticky à droite
- Mobile : FAB + drawer (no collision CTA)
- Props simplifiées (services retirés)

**Step 4 : Bravo!** (`StepContactPhotosV4.tsx`)
- Hero avec CheckCircle2 turquoise
- Timeline clean (3 steps)
- Card email confirmation
- Grid récap + économies (border turquoise)
- Rassurance Shield vert

---

### ⚡ Animations

**Ajouté**
- FadeUp sections (400ms, ease `[0.16, 1, 0.3, 1]`)
- Checkmark validation (200ms scale)
- Prix bounce (250ms vertical)
- Progress bar smooth (300ms)
- Button active scale (0.98)
- Cards hover (shadow-md)
- SmartCart FAB spring (delay 500ms)
- Drawer slide up avec spring physics
- Items slide in/out (200ms)

**Principe**
- Durée max : 300ms
- Respect `prefers-reduced-motion`
- Ease personnalisé premium

---

### 📱 Responsive

**Mobile (< 640px)**
- Stack vertical automatique
- Padding réduit (`p-4`)
- Font-size optimisé
- Touch targets >= 44px
- FAB SmartCart : `bottom: 88px` (no collision)

**Tablet (641-1023px)**
- Hybrid layout
- Grid 1-2 colonnes selon section

**Desktop (>= 1024px)**
- SmartCart sticky sidebar
- Grid 2 colonnes Step 3
- Hover effects complets

---

### 🔒 Back-office Safety

**Conservé (100%)**
- ✅ Endpoints API (`lib/api/client.ts`)
- ✅ Payloads structure
- ✅ Routes
- ✅ Calculs pricing (`lib/pricing/calculate.ts`)
- ✅ Tracking GA4 (`lib/analytics/ga4.ts`)
- ✅ IDs/names des inputs (`v2-origin-city`, etc.)
- ✅ Handlers `onFieldChange`, `onSubmit`
- ✅ Validation logic

**Tests**
- ✅ Build OK
- ✅ Parcours complet fonctionnel
- ✅ Aucune régression tracking
- ✅ Payloads identiques

---

### 🎯 Commits

```
1. feat: create Moverz V4 Design System components
2. feat: refactor Step 1 avec Design System V4
3. feat: refactor Step 2 avec Design System V4 - moment dopamine turquoise
4. feat: refactor Step 4 avec Design System V4 - timeline + confirmations premium
5. feat: add SmartCart V4 to Step 3 - sticky desktop + FAB mobile with safe spacing
6. feat: integrate StepAccessLogisticsV4 with simplified props and SmartCart V4
7. docs: add Design System V4 recap + final delivery
```

---

## [3.0.0] - Avant V4

### Legacy V2/V3
- Design System V1/V2 avec dégradés pastel
- StickySummary + SummaryDrawer (old cart)
- Composants isolés sans design system cohérent
- Fonts variées sans standardisation

---

## Migration Notes

### De V2/V3 → V4

**Breaking changes**
- ❌ Anciens composants `_ui/` dépréciés
- ❌ `StickySummary` + `SummaryDrawer` remplacés par `SmartCart`
- ❌ Props `pricingCart` retirées de Step 3

**Nouveaux composants**
- ✅ Tous les composants dans `components/tunnel-v4/`
- ✅ Import centralisé via `index.ts`

**Tokens CSS**
- ✅ Utiliser `var(--color-*)` au lieu de hardcoded colors
- ✅ Utiliser `var(--font-sora)` pour headings
- ✅ Utiliser `var(--radius-sm)` pour borders

**Animations**
- ✅ Framer Motion requis (npm install)
- ✅ Patterns standardisés (FadeUp, Bounce, Scale)

---

## Roadmap

### V4.1 (À venir)
- [ ] Step 3 : Refactor complet du formulaire (actuellement V4 wrapper sur V2 logic)
- [ ] SmartCart : Bouton remove items
- [ ] SmartCart : Savings highlight si > 100€
- [ ] Animations : Lottie pour confetti Step 4
- [ ] A11y : Audit complet WCAG AA
- [ ] Performance : Lazy load Framer Motion

### V4.2 (Future)
- [ ] Dark mode support
- [ ] i18n (EN, ES)
- [ ] Tests E2E Playwright
- [ ] Storybook pour composants V4

---

## Notes

**Maintenu par** : Équipe Moverz  
**Design** : Aligné sur moverz.fr V4 Premium  
**Stack** : Next.js 16, React 19, TypeScript 5.6, Tailwind 3.4, Framer Motion 11

**Règle d'or** : Ne jamais casser le back-office ! 🔒

---

**Dernière mise à jour** : 12 février 2026  
**Version actuelle** : 4.0.0
