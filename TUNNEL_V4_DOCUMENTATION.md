# 🎨 Tunnel Moverz V4 — Documentation Complète

**Version** : V4 Premium  
**Date** : 12 février 2026  
**Status** : ✅ PRODUCTION READY

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Design System V4](#design-system-v4)
4. [Composants](#composants)
5. [Écrans du tunnel](#écrans-du-tunnel)
6. [SmartCart](#smartcart)
7. [Animations](#animations)
8. [Responsive](#responsive)
9. [Back-office Safety](#back-office-safety)
10. [Maintenance](#maintenance)

---

## Vue d'ensemble

Le tunnel de devis Moverz a été entièrement refondu avec le **Design System V4 Premium** pour offrir une expérience utilisateur cohérente avec la homepage (moverz.fr).

### Objectifs atteints

✅ **Cohérence visuelle** : Turquoise signature `#0EA5A6` partout  
✅ **Premium feel** : Typographie Sora/Inter, micro-animations, shadows discrètes  
✅ **UX fintech-grade** : SmartCart live, moments "dopamine", feedbacks visuels  
✅ **Mobile-first** : FAB flottant, drawer swipeable, touch targets optimisés  
✅ **Back-office safe** : Aucune régression, tracking stable, payloads identiques

---

## Architecture

### Stack technique

```
Next.js 16 (App Router)
React 19.2
TypeScript 5.6
Tailwind CSS 3.4
Framer Motion 11
Lucide React (icons)
```

### Structure des fichiers

```
moverz_tunnel-5/
├── app/
│   ├── devis-gratuits-v3/
│   │   └── page.tsx                    # Point d'entrée tunnel
│   ├── layout.tsx                      # Google Fonts (Sora + Inter)
│   └── globals.css                     # Import tokens + scrollbar
├── components/
│   ├── tunnel-v4/                      # 🆕 Design System V4
│   │   ├── Input.tsx                   # Champ avec checkmark animé
│   │   ├── Button.tsx                  # Noir/Turquoise avec hover
│   │   ├── Card.tsx                    # Border grise + highlighted
│   │   ├── Progress.tsx                # Barre turquoise fine
│   │   ├── SegmentedControl.tsx        # Radio buttons V4
│   │   ├── SmartCart.tsx               # 🌟 Panier live
│   │   └── index.ts                    # Exports centralisés
│   └── tunnel/v2/                      # Écrans refactorés
│       ├── StepQualificationV4.tsx     # Step 1 (Entrée)
│       ├── StepEstimationV4.tsx        # Step 2 (Estimation)
│       ├── StepAccessLogisticsV4.tsx   # Step 3 (Détails)
│       └── StepContactPhotosV4.tsx     # Step 4 (Bravo!)
├── styles/
│   └── tokens.css                      # 🎨 Tokens CSS V4
├── lib/
│   ├── pricing/                        # Calculs inchangés
│   ├── analytics/                      # GA4 inchangé
│   └── api/                            # Client back-office inchangé
└── hooks/
    ├── useTunnelState.ts               # State management inchangé
    └── useTunnelTracking.ts            # Tracking inchangé
```

---

## Design System V4

### Tokens CSS (`styles/tokens.css`)

#### Couleurs

```css
/* Backgrounds */
--color-bg: #FAFAFA;           /* Fond principal (gris très clair) */
--color-bg-dark: #0B0F14;      /* Fond sections dark */
--color-surface: #FFFFFF;      /* Cartes/surfaces */

/* Text */
--color-text: #0B0F19;         /* Texte principal (noir profond) */
--color-text-secondary: #6B7280; /* Texte secondaire (gris foncé) */
--color-text-muted: #9CA3AF;   /* Texte désactivé/placeholders */

/* Accent (Turquoise Moverz) ⭐ SIGNATURE */
--color-accent: #0EA5A6;       /* À utiliser pour focus, CTA accent, badges */
--color-accent-hover: #0D9495; /* 10% darker */
--color-accent-light: #E0F7F7; /* Background léger */

/* Bordures */
--color-border: #E5E7EB;       /* Bordure principale (gris fin) */
--color-border-light: #F3F4F6; /* Bordure très légère */

/* Semantic */
--color-success: #16A34A;      /* Vert validations */
--color-danger: #DC2626;       /* Rouge erreurs */
--color-warning: #F59E0B;      /* Orange warnings */
```

#### Typographie

```css
/* Fonts */
--font-sora: 'Sora', system-ui, sans-serif;   /* Headings (500, 600, 700) */
--font-inter: 'Inter', system-ui, sans-serif; /* Body/UI (400, 500, 600) */
```

**Règles d'usage** :
- **Headings (h1, h2, h3)** → Sora, font-bold (700)
- **Body, paragraphes** → Inter, font-normal (400)
- **Labels, buttons** → Inter, font-medium (500) ou font-semibold (600)

#### Radius

```css
--radius-sm: 8px;   /* Inputs, petits boutons */
--radius-md: 12px;  /* Cartes, modales */
--radius-btn: 8px;  /* Boutons */
--radius-input: 8px; /* Champs */
--radius-card: 12px; /* Cards */
```

#### Shadows (DISCRÈTES)

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
--shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
--shadow-md: 0 4px 16px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
```

**⚠️ Interdictions** :
- ❌ Plus de dégradés turquoise-vert vifs
- ❌ Plus de bordures épaisses colorées par défaut
- ❌ Plus de colored shadows (sauf glow turquoise sur hover si besoin)

---

## Composants

### InputV4 (`components/tunnel-v4/Input.tsx`)

Champ de formulaire avec validation visuelle.

**Features** :
- Border grise fine par défaut (`var(--color-border)`)
- Focus : border turquoise + ring subtil (`box-shadow: 0 0 0 3px rgba(14,165,166,0.08)`)
- Valid : border turquoise + checkmark vert animé (Framer Motion)
- Error : border rouge + icône AlertCircle
- Label + helper text + error message
- Support disabled state

**Usage** :

```tsx
import { InputV4 } from "@/components/tunnel-v4";

<InputV4
  id="surface"
  type="number"
  label="Surface (m²)"
  helper="Une estimation approximative suffit"
  placeholder="60"
  value={surface}
  isValid={isSurfaceValid}
  error={showValidation && !isSurfaceValid ? "Entre 10 et 500 m²" : undefined}
  onChange={(e) => setSurface(e.target.value)}
  required
/>
```

---

### ButtonV4 (`components/tunnel-v4/Button.tsx`)

Bouton avec variants noir/turquoise.

**Variants** :
- `primary` : Noir mat (`var(--color-text)`)
- `accent` : Turquoise (`var(--color-accent)`)
- `secondary` : Surface avec border
- `ghost` : Transparent

**Sizes** : `sm`, `md`, `lg`

**Features** :
- Hover : `opacity: 0.9`
- Active : `scale(0.98)`
- Loading state avec spinner
- Disabled state

**Usage** :

```tsx
import { ButtonV4 } from "@/components/tunnel-v4";

<ButtonV4
  type="submit"
  variant="accent"
  size="lg"
  isLoading={isSubmitting}
>
  Affiner mon estimation 🚀
</ButtonV4>
```

---

### CardV4 (`components/tunnel-v4/Card.tsx`)

Card premium avec variants.

**Variants** :
- `default` : Border grise, shadow discrète
- `highlighted` : Border turquoise + tint ultra-léger

**Padding** : `sm`, `md`, `lg`

**Features** :
- Animation FadeUp optionnelle (Framer Motion)
- Border radius 12px
- Shadow discrète

**Usage** :

```tsx
import { CardV4 } from "@/components/tunnel-v4";

<CardV4 padding="lg" animate>
  <h2>Votre trajet</h2>
  <p>Contenu de la card...</p>
</CardV4>

<CardV4 variant="highlighted" padding="md">
  <p>Card avec accent turquoise</p>
</CardV4>
```

---

### ProgressV4 (`components/tunnel-v4/Progress.tsx`)

Barre de progression fine et moderne.

**Features** :
- Hauteur 6px (fine)
- Background gris clair
- Fill turquoise
- Transition smooth 300ms
- Label + pourcentage optionnels

**Usage** :

```tsx
import { ProgressV4 } from "@/components/tunnel-v4";

<ProgressV4
  value={75}
  label="Progression"
  showPercent
/>
```

---

### SegmentedControlV4 (`components/tunnel-v4/SegmentedControl.tsx`)

Radio buttons stylisés en grille.

**Features** :
- Grid 2 colonnes (responsive)
- Border grise, selected turquoise
- Icônes optionnelles
- Point indicateur quand selected
- Disabled state

**Usage** :

```tsx
import { SegmentedControlV4 } from "@/components/tunnel-v4";
import { Home, Building } from "lucide-react";

<SegmentedControlV4
  name="housing-type"
  label="Type de logement"
  value={housingType}
  onChange={setHousingType}
  options={[
    { value: "house", label: "Maison", icon: <Home className="w-4 h-4" /> },
    { value: "apartment", label: "Appartement", icon: <Building className="w-4 h-4" /> },
  ]}
/>
```

---

### SmartCart (`components/tunnel-v4/SmartCart.tsx`)

🌟 **LE composant star** : Panier live avec desktop sticky + mobile FAB + drawer.

**Features** :

#### Desktop (>= 1024px)
- Sticky sidebar à droite (380px max-width)
- Top offset : 96px (sous header)
- Scroll personnalisé (scrollbar turquoise)

#### Mobile (< 1024px)
- **FAB** (Floating Action Button) en bas à droite
- Position : `bottom: 88px` (offset pour éviter collision CTA principal) ⚠️
- Badge compteur rouge (nombre d'items)
- **Drawer** : Bottom sheet swipeable
- Drag down pour fermer
- CTA principal dans le drawer

#### Contenu
- **Prix principal** : Animé (bounce vertical) quand change
- **Progress bar** : Position dans fourchette min/max
- **Project info** : Trajet, Surface, Volume
- **Items list** : Avec animations entry/exit (slide)
- **Badge transparence** : "Prix transparent" avec border turquoise

**Usage** :

```tsx
import { SmartCart, type CartItem } from "@/components/tunnel-v4";

const items: CartItem[] = [
  { id: "distance", label: "Distance 450 km", amountEur: 0, category: "Base" },
  { id: "density", label: "Densité normale", amountEur: 120, category: "Volume" },
  { id: "date", label: "Date flexible", amountEur: -80, category: "Timing" },
];

<SmartCart
  currentPrice={2150}
  minPrice={1950}
  maxPrice={2350}
  items={items}
  projectInfo={{
    origin: "Paris",
    destination: "Lyon",
    surface: 60,
    volume: 45,
  }}
  ctaLabel="Valider mon devis"
  onSubmit={handleSubmit}
  isLoading={isSubmitting}
/>
```

**Props** :

```typescript
interface SmartCartProps {
  // Prix
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  
  // Items
  items: CartItem[];
  
  // Info projet
  projectInfo?: {
    origin?: string;
    destination?: string;
    surface?: number;
    volume?: number;
  };
  
  // State
  isLoading?: boolean;
  
  // Mobile
  ctaLabel?: string;
  onSubmit?: () => void;
}

interface CartItem {
  id: string;
  label: string;
  amountEur: number;
  category?: string;
}
```

---

## Écrans du tunnel

### Step 1 : Entrée (`StepQualificationV4.tsx`)

**Écran** : Ville de départ + arrivée + surface

**Design V4** :
- Background `#FAFAFA`
- Card centrée avec border grise
- InputV4 pour la surface (avec checkmark animé)
- AddressAutocomplete conservé (critical pour géoloc)
- ButtonV4 noir primary
- Hero section avec titre Sora bold

**Props conservées** :
- Tous les handlers `onFieldChange`
- IDs des inputs (`v2-origin-city`, `v2-destination-city`, `v2-surface-m2`)
- Validation logic identique

**CTA** : "Voir mon estimation gratuite" (noir)

---

### Step 2 : Estimation (`StepEstimationV4.tsx`)

**Écran** : Affichage du budget estimé avec moment "dopamine" 🎉

**Design V4** :

#### Phase 1 : Skeleton loading (1.2s)
- 3 dots turquoise animés (bounce)
- Placeholders gris clair

#### Phase 2 : Révélation budget
- **Badge** "ESTIMATION INDICATIVE" (turquoise, uppercase)
- **Prix central** : 6xl bold, Sora, avec **CountUp animé** (1.8s)
- **Grid Min/Max** : 2 colonnes avec borders subtiles
  - Min : fond vert léger, border vert
  - Max : fond rouge léger, border rouge

#### Phase 3 : Détails (après 1.5s)
- 3 cards explicatives (Distance, Volume, Formule)
- Hover effect : `shadow-md`
- Icônes Lucide

**CTA** : "Affiner mon estimation en 60 sec 🚀" (turquoise accent)

**Props conservées** :
- Même payload que V2
- Tracking events identiques

---

### Step 3 : Détails (`StepAccessLogisticsV4.tsx`)

**Écran** : Formulaire long (adresses, date, densité, accès, contact, options)

**Layout desktop** :

```
┌──────────────────────┬──────────┐
│  FORMULAIRE          │  SMART   │
│  (gauche)            │  CART    │
│                      │  STICKY  │
│  □ Adresses          │          │
│  □ Date              │  2150 €  │
│  □ Densité           │  LIVE    │
│  □ Accès             │          │
│  □ Contact           │  [Items] │
│  □ Options           │          │
│                      │          │
│  [CTA Principal]     │          │
└──────────────────────┴──────────┘
```

**Layout mobile** :
- Formulaire pleine largeur
- **SmartCart** : FAB flottant (`bottom: 88px`) ⚠️
- CTA principal en bas du form (pas de collision)
- Tap FAB → drawer slide up

**Design V4** :
- Sections groupées visuellement
- Inputs V4 partout
- SegmentedControl pour radio buttons
- Cards pour les blocs

**Props conservées** :
- **TOUS** les champs existants conservés
- Handlers `onFieldChange`, `onSubmit` identiques
- Validation logic intacte

---

### Step 4 : Bravo! (`StepContactPhotosV4.tsx`)

**Écran** : Confirmation succès

**Design V4** :

#### Hero
- Badge success (vert)
- Icône CheckCircle2 turquoise dans rond
- Titre "🎉 Bravo !" (Sora, 6xl bold)
- Sous-titre sobre

#### Timeline (ce qui se passe maintenant)
- 3 steps verticaux
- Step 1 : CheckCircle2 turquoise (completed)
- Step 2 : Dot turquoise avec border (current)
- Step 3 : Dot gris (upcoming)

#### Email confirmation
- Card avec icône Mail turquoise
- Badge "Email envoyé" (vert)

#### Récap + Économies (grid 2 cols)
- **Récap** : Liste items (trajet, date, formule, estimation)
- **Économies** : Card highlighted turquoise border
  - Montant ~15% en vert success
  - 2 bullets explicatifs

#### Rassurance
- Shield icon (vert)
- 3 bullets anti-démarchage

**Props conservées** :
- Tous les champs recap
- Estimation min/max
- Email confirmation state

---

## SmartCart

### Architecture

Le SmartCart détecte automatiquement desktop/mobile via `window.innerWidth`.

```typescript
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 1024);
  checkMobile();
  window.addEventListener("resize", checkMobile);
  return () => window.removeEventListener("resize", checkMobile);
}, []);
```

### Rendu conditionnel

```typescript
if (!isMobile) {
  return <StickySidebar />;
}

return (
  <>
    <FAB />
    <Drawer />
  </>
);
```

### Prix animé

Track les changements de prix pour déclencher l'animation :

```typescript
const [prevPrice, setPrevPrice] = useState(currentPrice);

useEffect(() => {
  if (currentPrice !== prevPrice) {
    setPrevPrice(currentPrice);
  }
}, [currentPrice, prevPrice]);
```

Animation Framer Motion :

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={currentPrice}
    initial={{ y: 10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: -10, opacity: 0 }}
    transition={{ duration: 0.25 }}
  >
    {fmtEur(currentPrice)}
  </motion.div>
</AnimatePresence>
```

### Progress bar dans fourchette

Calcul du pourcentage :

```typescript
const priceInRange = Math.max(minPrice, Math.min(maxPrice, currentPrice));
const rangePercent = maxPrice > minPrice
  ? ((priceInRange - minPrice) / (maxPrice - minPrice)) * 100
  : 50;
```

Animation smooth :

```tsx
<motion.div
  className="h-full rounded-full"
  style={{ background: "var(--color-accent)" }}
  initial={{ width: 0 }}
  animate={{ width: `${rangePercent}%` }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>
```

### Items avec animations

Entry/exit animations :

```tsx
<AnimatePresence>
  {items.map((item) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Item content */}
    </motion.div>
  ))}
</AnimatePresence>
```

### FAB mobile avec badge

```tsx
<motion.button
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
  style={{
    right: "16px",
    bottom: "88px", // ⚠️ OFFSET CRITICAL
  }}
>
  <ShoppingCart />
  {itemsCount > 0 && (
    <div className="badge">{itemsCount}</div>
  )}
</motion.button>
```

### Drawer swipeable

```tsx
<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={{ top: 0, bottom: 0.5 }}
  onDragEnd={(e, { offset, velocity }) => {
    if (offset.y > 100 || velocity.y > 500) {
      setDrawerOpen(false);
    }
  }}
>
  {/* Drawer content */}
</motion.div>
```

---

## Animations

### Principes V4

- **Durée** : 150-300ms max
- **Ease** : `[0.16, 1, 0.3, 1]` (custom ease out)
- **Respect** : `prefers-reduced-motion`

### Patterns Framer Motion

#### FadeUp (sections)

```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
>
  {content}
</motion.div>
```

#### Checkmark validation

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.2 }}
>
  <CheckCircle2 style={{ color: "var(--color-accent)" }} />
</motion.div>
```

#### Prix change (bounce)

```tsx
<AnimatePresence mode="wait">
  <motion.p
    key={price}
    initial={{ y: 10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: -10, opacity: 0 }}
    transition={{ duration: 0.25 }}
  >
    {price} €
  </motion.p>
</AnimatePresence>
```

#### Button active

```css
.btn:active {
  transform: scale(0.98);
}
```

#### Progress bar

```css
.progress-fill {
  transition: width 300ms ease-out;
}
```

---

## Responsive

### Breakpoints

```css
/* Mobile */
@media (max-width: 640px) { }

/* Tablet */
@media (min-width: 641px) and (max-width: 1023px) { }

/* Desktop */
@media (min-width: 1024px) { }
```

### Adaptations mobile critiques

#### SmartCart
- ❌ Pas de sticky sidebar
- ✅ FAB flottant : `bottom: 88px` (offset CTA)
- ✅ Drawer swipeable

#### Grids
- Desktop : `grid-cols-2`
- Mobile : Stack vertical automatique

#### Padding
- Desktop : `p-6` ou `p-8`
- Mobile : `p-4`

#### Font-sizes
- Desktop : `text-base` (16px)
- Mobile : `text-sm` (14px) pour body

#### Touch targets
- Minimum : **44x44px** (WCAG)
- Buttons : `py-3` minimum

#### Safe areas iOS
```css
padding-bottom: env(safe-area-inset-bottom);
```

---

## Back-office Safety

### ✅ Garanties

**Endpoints** : Aucun changement
- `lib/api/client.ts` intact
- Routes conservées
- Méthodes HTTP identiques

**Payloads** : Structure identique
- Champs JSON identiques
- Types TypeScript identiques
- Validation Zod intacte

**IDs/Names** : Conservés
- Input IDs : `v2-origin-city`, `v2-destination-city`, etc.
- Form field names identiques
- Query params identiques

**Tracking** : Stable
- Events GA4 identiques (keys/props)
- Timing identique
- `lib/analytics/ga4.ts` intact

**Calculs** : Inchangés
- `lib/pricing/calculate.ts` intact
- Coefficients identiques
- Formules identiques

**Redirections** : Fonctionnelles
- Routes identiques
- Navigation identique
- `router.push()` conservé

### 🔍 Tests de non-régression

Avant chaque déploiement :

```bash
# 1. Vérifier qu'aucun endpoint n'a changé
grep -r "api/client" lib/api/

# 2. Vérifier les IDs des inputs
grep -r 'id="v2-' components/tunnel/

# 3. Vérifier les events GA4
grep -r "ga4Event" components/tunnel/

# 4. Build OK
npm run build

# 5. Tests E2E (si disponibles)
npm run test:e2e
```

---

## Maintenance

### Ajout d'un nouveau composant V4

1. Créer dans `components/tunnel-v4/NewComponent.tsx`
2. Utiliser les tokens CSS (`var(--color-accent)`, etc.)
3. TypeScript strict
4. Props interface exportée
5. Ajouter à `components/tunnel-v4/index.ts`

Exemple :

```tsx
/**
 * NewComponent V4 — Moverz Design System
 * Description brève
 */

"use client";

import { motion } from "framer-motion";

export interface NewComponentProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function NewComponent({ label, value, onChange }: NewComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {/* Component content */}
    </motion.div>
  );
}
```

### Modifier un token CSS

1. Éditer `styles/tokens.css`
2. Vérifier que le token est mappé dans `tailwind.config.ts`
3. Rebuild : `npm run build`
4. Tester tous les écrans

### Ajout d'une animation

1. Utiliser Framer Motion
2. Durée max 300ms
3. Ease : `[0.16, 1, 0.3, 1]`
4. Respecter `prefers-reduced-motion`

```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.4,
    ease: [0.16, 1, 0.3, 1],
  }}
>
  {content}
</motion.div>
```

### Debugging SmartCart

**Desktop pas sticky** :
- Vérifier `position: sticky` et `top: 96px`
- Parent doit avoir `height: fit-content`

**Mobile FAB caché** :
- Vérifier `z-index: 90`
- Vérifier `position: fixed`

**Collision CTA** :
- Ajuster `bottom: XXpx` du FAB
- Tester sur vrais devices

**Drawer pas swipeable** :
- Vérifier `drag="y"` Framer Motion
- Vérifier `dragConstraints`

**Prix pas animé** :
- Vérifier `key={currentPrice}` dans AnimatePresence
- Vérifier que `currentPrice` change vraiment

---

## Checklist finale

### Design System
- [x] Tokens CSS V4 appliqués (`styles/tokens.css`)
- [x] Fonts Sora (headings) + Inter (body)
- [x] Accent turquoise `#0EA5A6` partout
- [x] Borders grises fines par défaut
- [x] Shadows discrètes (pas de colored shadows)
- [x] Radius cohérent (8px inputs, 12px cards)

### Composants
- [x] InputV4 avec checkmark animé
- [x] ButtonV4 noir/turquoise avec hover
- [x] CardV4 avec variant highlighted
- [x] ProgressV4 barre fine moderne
- [x] SegmentedControlV4 radio buttons
- [x] SmartCart desktop + mobile

### Écrans
- [x] Step 1 : Entrée (StepQualificationV4)
- [x] Step 2 : Estimation (StepEstimationV4)
- [x] Step 3 : Détails (StepAccessLogisticsV4)
- [x] Step 4 : Bravo! (StepContactPhotosV4)

### Animations
- [x] FadeUp sur sections (400ms)
- [x] Checkmarks animés (200ms)
- [x] Prix bounce (250ms)
- [x] Progress bar smooth (300ms)
- [x] Hover states subtils (150ms)

### Responsive
- [x] Mobile < 640px testé
- [x] Tablet 641-1023px testé
- [x] Desktop >= 1024px testé
- [x] Touch targets >= 44px
- [x] FAB offset pour éviter collision CTA
- [x] Drawer swipeable

### Back-office
- [x] Endpoints API conservés
- [x] Routes inchangées
- [x] Logique validation conservée
- [x] Calculs pricing intacts
- [x] Tracking GA4 stable
- [x] IDs/names des champs identiques

---

## Commits livrés

```bash
1. feat: create Moverz V4 Design System components
   - Input, Button, Card, Progress, SegmentedControl
   - Framer Motion install

2. feat: refactor Step 1 avec Design System V4
   - StepQualificationV4
   - InputV4 + ButtonV4

3. feat: refactor Step 2 avec Design System V4 - moment dopamine turquoise
   - StepEstimationV4
   - CountUp animation
   - Badge + chips

4. feat: refactor Step 4 avec Design System V4 - timeline + confirmations premium
   - StepContactPhotosV4
   - Timeline clean
   - Cards économies

5. feat: add SmartCart V4 to Step 3 - sticky desktop + FAB mobile with safe spacing
   - SmartCart.tsx
   - FAB bottom: 88px (no collision)
   - Drawer swipeable

6. feat: integrate StepAccessLogisticsV4 with simplified props and SmartCart V4
   - StepAccessLogisticsV4
   - Integration SmartCart dans Step 3
```

---

## Support & Questions

Pour toute question ou modification :

1. **Vérifier cette doc** : 90% des réponses sont ici
2. **Lire le code** : Commentaires détaillés dans chaque composant
3. **Tester en local** : `npm run dev`
4. **Tester en prod** : Push sur `main` → déploiement automatique Coolify sur `devis.moverz.fr`

**Règle d'or** : Si tu modifies le design, **ne casse pas le back-office** ! 🔒

---

**Migration_v4 à jour** ✅  
**Documentation complète** ✅  
**Production ready** ✅

🎉 **Le tunnel Moverz V4 est PREMIUM !** 🚀
