# 🚀 Quick Start — Tunnel V4

Guide rapide pour travailler sur le tunnel.

---

## Installation

```bash
npm install
npm run dev
# → http://localhost:3000/devis-gratuits-v3
```

---

## Composants V4 disponibles

```tsx
import {
  InputV4,
  ButtonV4,
  CardV4,
  ProgressV4,
  SegmentedControlV4,
  SmartCart,
} from "@/components/tunnel-v4";
```

### Input simple

```tsx
<InputV4
  id="email"
  type="email"
  label="Email"
  placeholder="john@example.com"
  value={email}
  isValid={isEmailValid}
  onChange={(e) => setEmail(e.target.value)}
  required
/>
```

### Button

```tsx
<ButtonV4 variant="accent" size="lg" onClick={handleClick}>
  Continuer
</ButtonV4>
```

### Card

```tsx
<CardV4 padding="lg" animate>
  <h2>Mon titre</h2>
  <p>Contenu...</p>
</CardV4>
```

### SmartCart (Step 3 uniquement)

```tsx
<SmartCart
  currentPrice={2150}
  minPrice={1950}
  maxPrice={2350}
  items={[
    { id: "1", label: "Distance 450 km", amountEur: 0 },
    { id: "2", label: "Densité normale", amountEur: 120 },
  ]}
  onSubmit={handleSubmit}
/>
```

---

## Tokens CSS rapides

```css
/* Couleurs */
var(--color-accent)         /* Turquoise #0EA5A6 */
var(--color-text)           /* Noir #0B0F19 */
var(--color-border)         /* Gris border #E5E7EB */
var(--color-surface)        /* Blanc #FFFFFF */

/* Fonts */
var(--font-sora)            /* Headings */
var(--font-inter)           /* Body/UI */

/* Radius */
var(--radius-sm)            /* 8px */
var(--radius-md)            /* 12px */

/* Shadows */
var(--shadow-sm)            /* Discrète */
var(--shadow-md)            /* Moyenne */
```

---

## Animations (Framer Motion)

### FadeUp

```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
  {content}
</motion.div>
```

### Prix animé

```tsx
<AnimatePresence mode="wait">
  <motion.p
    key={price}
    initial={{ y: 10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: -10, opacity: 0 }}
  >
    {price} €
  </motion.p>
</AnimatePresence>
```

---

## Structure du tunnel

```
Step 1: StepQualificationV4     → Ville + Surface
Step 2: StepEstimationV4         → Budget estimé (dopamine!)
Step 3: StepAccessLogisticsV4    → Détails + SmartCart
Step 4: StepContactPhotosV4      → Bravo!
```

---

## ⚠️ INTERDICTIONS

❌ Ne **JAMAIS** modifier :
- `lib/api/client.ts` (endpoints)
- `lib/pricing/calculate.ts` (calculs)
- `lib/analytics/ga4.ts` (tracking)
- IDs des inputs (`v2-origin-city`, etc.)
- Props `onFieldChange`, `onSubmit`

✅ Modifier **uniquement** :
- Design (colors, spacing, animations)
- Layout (responsive, grids)
- Composants visuels (pas de logique métier)

---

## Responsive

```tsx
/* Mobile-first */
className="p-4 lg:p-8"

/* Grids auto-responsive */
className="grid grid-cols-1 lg:grid-cols-2 gap-4"
```

---

## SmartCart mobile

**FAB position** : `bottom: 88px` (évite collision CTA)

Si collision :
1. Ajuster `bottom` dans `SmartCart.tsx`
2. Tester sur vrai device

---

## Build & Deploy

```bash
# Build local
npm run build

# Start prod
npm start

# Push sur main → Auto-deploy CapRover
git push origin main
```

---

## Debug courants

**Composant pas stylé** :
→ Vérifier import des tokens CSS dans `globals.css`

**Animation pas fluide** :
→ Vérifier durée < 300ms et ease correct

**Mobile layout cassé** :
→ Vérifier breakpoints Tailwind (`lg:`, `sm:`)

**SmartCart pas visible mobile** :
→ Vérifier `z-index: 90` du FAB

---

## Docs complètes

Voir `TUNNEL_V4_DOCUMENTATION.md` pour :
- Architecture détaillée
- Tous les composants avec props
- Guidelines animations
- Checklist complète
- Troubleshooting

---

**Questions ?** → Lire d'abord `TUNNEL_V4_DOCUMENTATION.md` 📚
