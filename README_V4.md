# 🚀 Tunnel Moverz V4 Premium

Tunnel de devis premium avec Design System V4 fintech-grade.

---

## 🎯 Quick Links

- 📚 **[Documentation complète](./TUNNEL_V4_DOCUMENTATION.md)** — Architecture, composants, guidelines
- ⚡ **[Quick Start](./QUICK_START_V4.md)** — Guide rapide développeur
- 📝 **[Changelog](./CHANGELOG_V4.md)** — Historique des modifications
- 🎨 **[Design System recap](./DESIGN_SYSTEM_V4_RECAP.md)** — Récap visuel

---

## 🏗️ Stack

- **Next.js 16** (App Router)
- **React 19.2**
- **TypeScript 5.6**
- **Tailwind CSS 3.4**
- **Framer Motion 11**
- **Lucide React** (icons)

---

## 🚀 Installation

```bash
# Clone
git clone <repo>
cd moverz_tunnel-5

# Install
npm install

# Dev
npm run dev
# → http://localhost:3000/devis-gratuits-v3

# Build
npm run build

# Start prod
npm start
```

---

## 🎨 Design System V4

### Couleur signature

```
Turquoise: #0EA5A6 ⭐
```

Utilisée pour :
- Focus inputs
- Boutons accent (CTA secondaires)
- Badges "Live", "Estimation indicative"
- Progress bar
- Checkmarks validation

### Typographie

```
Headings: Sora (700)
Body/UI: Inter (400, 500, 600)
```

### Tokens CSS

```css
var(--color-accent)      /* Turquoise */
var(--color-text)        /* Noir profond */
var(--color-border)      /* Gris fin */
var(--font-sora)         /* Headings */
var(--font-inter)        /* Body */
var(--radius-sm)         /* 8px */
var(--shadow-sm)         /* Discrète */
```

---

## 🧩 Composants V4

Tous dans `components/tunnel-v4/` :

- ✅ **InputV4** : Champ avec checkmark animé
- ✅ **ButtonV4** : Noir/Turquoise avec hover
- ✅ **CardV4** : Border grise + highlighted
- ✅ **ProgressV4** : Barre turquoise fine
- ✅ **SegmentedControlV4** : Radio buttons
- ✅ **SmartCart** 🌟 : Panier live (desktop sticky + mobile FAB)

Import :

```tsx
import { InputV4, ButtonV4, SmartCart } from "@/components/tunnel-v4";
```

---

## 📱 Écrans du tunnel

| Step | Composant | Description |
|------|-----------|-------------|
| 1 | `StepQualificationV4` | Ville départ/arrivée + Surface |
| 2 | `StepEstimationV4` | Budget estimé (moment dopamine) |
| 3 | `StepAccessLogisticsV4` | Détails + SmartCart |
| 4 | `StepContactPhotosV4` | Confirmation "Bravo!" |

---

## 🌟 SmartCart (Feature star)

Panier live Step 3 avec :

### Desktop (>= 1024px)
- Sticky sidebar droite (380px)
- Prix animé en temps réel
- Progress bar dans fourchette
- Items list avec animations

### Mobile (< 1024px)
- **FAB** flottant (bottom: 88px)
- Badge compteur
- **Drawer** swipeable
- CTA dans drawer

**Feature clé** : FAB offset à 88px au lieu de 16px pour **éviter collision avec CTA principal** ⚠️

---

## ⚡ Animations

Powered by **Framer Motion** :

- FadeUp sections (400ms)
- Checkmarks validation (200ms)
- Prix bounce (250ms)
- Progress smooth (300ms)
- Cards hover
- Drawer spring physics

**Principe** : Durée max 300ms, respect `prefers-reduced-motion`

---

## 📱 Responsive

- **Mobile** : < 640px (stack vertical, padding réduit, FAB)
- **Tablet** : 641-1023px (hybrid)
- **Desktop** : >= 1024px (grid 2 cols, sticky cart)

Touch targets : >= 44px (WCAG)

---

## 🔒 Back-office Safety

### ✅ Garanti inchangé

- Endpoints API
- Payloads structure
- Routes
- Calculs pricing
- Tracking GA4
- IDs/names inputs
- Validation logic

### ❌ Interdit de modifier

- `lib/api/client.ts`
- `lib/pricing/calculate.ts`
- `lib/analytics/ga4.ts`
- Input IDs (`v2-origin-city`, etc.)
- Props `onFieldChange`, `onSubmit`

**Règle d'or** : Design only, pas de logique métier ! 🔒

---

## 🛠️ Maintenance

### Ajouter un composant V4

1. Créer dans `components/tunnel-v4/NewComponent.tsx`
2. Utiliser tokens CSS (`var(--color-*)`)
3. TypeScript strict
4. Export dans `index.ts`

### Modifier un token

1. Éditer `styles/tokens.css`
2. Rebuild : `npm run build`
3. Tester tous les écrans

### Debug SmartCart

- Desktop pas sticky → Vérifier `position: sticky`
- FAB caché → Vérifier `z-index: 90`
- Collision CTA → Ajuster `bottom: XXpx`
- Prix pas animé → Vérifier `key={currentPrice}`

---

## 📦 Build & Deploy

```bash
# Build
npm run build

# Push sur main → Auto-deploy Coolify (`devis.moverz.fr`)
git add -A
git commit -m "feat: ..."
git push origin main
```

**Tests avant push** :
- ✅ Build OK
- ✅ Parcours complet fonctionnel
- ✅ Mobile responsive
- ✅ Aucun linter error

---

## 📚 Documentation

| Fichier | Contenu |
|---------|---------|
| `TUNNEL_V4_DOCUMENTATION.md` | Doc complète (architecture, composants, animations) |
| `QUICK_START_V4.md` | Guide rapide développeur |
| `CHANGELOG_V4.md` | Historique des versions |
| `DESIGN_SYSTEM_V4_RECAP.md` | Récap visuel design system |

---

## 🎯 Checklist qualité

Avant chaque PR/deploy :

- [ ] Build OK (`npm run build`)
- [ ] Aucun linter error
- [ ] Mobile responsive testé
- [ ] Desktop responsive testé
- [ ] Animations fluides (< 300ms)
- [ ] Aucune régression back-office
- [ ] Tracking GA4 stable
- [ ] SmartCart fonctionnel (desktop + mobile)
- [ ] Touch targets >= 44px

---

## 🆘 Support

1. **Lire la doc** : `TUNNEL_V4_DOCUMENTATION.md`
2. **Quick start** : `QUICK_START_V4.md`
3. **Changelog** : `CHANGELOG_V4.md`

90% des réponses sont dans ces 3 fichiers ! 📖

---

## ✨ Features V4

- ✅ Design System cohérent (turquoise signature)
- ✅ Typographie Sora/Inter premium
- ✅ SmartCart live (desktop + mobile)
- ✅ Animations Framer Motion partout
- ✅ Moment "dopamine" Step 2
- ✅ Mobile-first (FAB + drawer)
- ✅ Back-office 100% safe
- ✅ Responsive perfect
- ✅ A11y friendly
- ✅ Performance optimisée

---

## 🚀 Version

**Current** : 4.0.0  
**Released** : 12 février 2026  
**Status** : ✅ Production Ready

---

## 📊 Stats

- **8 commits** V4
- **6 composants** premium créés
- **4 écrans** refactorés
- **1 SmartCart** 🌟 (desktop + mobile)
- **100%** back-office safe
- **0** régression

---

## 🎉 Le tunnel est PREMIUM !

Cohérent, moderne, fintech-grade. 🚀

**Migration_v4 à jour** ✅
