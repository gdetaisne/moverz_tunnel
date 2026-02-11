# Migration V4 — journal de refonte UX/UI

## 2026-02-11 (9ème itération) — Panier ultra-moderne 2026 : Gradient turquoise→violet + Glassmorphism premium

**Problème** : Le panier était trop turquoise classique (100% cyan), pas assez moderne ni sophistiqué pour 2026.

**Solution** : Gradient turquoise→violet sophistiqué + glassmorphism renforcé + overlay lumineux.

### 🎨 Background gradient premium turquoise→violet

**Avant** : `bg-gradient-to-br from-[#6BCFCF] via-[#5AB8B8] to-[#4AA8A5]` (100% turquoise)  
**Après** :
```tsx
bg-gradient-to-br from-[#6BCFCF] via-[#7BC4CC] to-[#A78BFA]
```
- **From** : Turquoise signature `#6BCFCF`
- **Via** : Blend turquoise-violet `#7BC4CC` (transition douce)
- **To** : Violet premium `#A78BFA`

### ✨ Overlay glow moderne 2026

**Nouveauté** : Layer overlay subtil pour effet depth
```tsx
<div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-[#A78BFA]/10 pointer-events-none" />
```
- **Direction** : `to-tr` (top-right) pour effet diagonal moderne
- **Via white/5** : Subtle glow blanc
- **To violet/10** : Accent violet en haut à droite
- **pointer-events-none** : Ne bloque pas les interactions

### 💎 Shadow violette (au lieu de turquoise)

**Avant** : `shadow-[#6BCFCF]/20`  
**Après** : `shadow-[#A78BFA]/25`

### 🪟 Glassmorphism renforcé sur les cards

**Cards budget/ajustements** :
- **Avant** : `bg-white/95 backdrop-blur-sm shadow-sm border border-white/40`
- **Après** : `bg-white/98 backdrop-blur-xl shadow-lg sm:shadow-2xl shadow-white/20 border border-white/40`

**Pills ajustements** :
- **Avant** : `bg-white/95 backdrop-blur-sm border border-white/40`
- **Après** : `bg-white/98 backdrop-blur-md border border-white/50`

**Collapsible première estimation** :
- **Avant** : `bg-white/10 backdrop-blur-sm border border-white/20`
- **Après** : `bg-white/15 backdrop-blur-md border border-white/30`

### 🏷️ Badge "Live" ultra-premium

**Avant** : `from-[#6BCFCF]/20 to-[#A78BFA]/20 border border-[#A78BFA]/30`  
**Après** :
```tsx
bg-gradient-to-r from-white/10 via-[#A78BFA]/20 to-[#A78BFA]/30 
border border-white/30 
backdrop-blur-md 
shadow-[0_4px_16px_rgba(167,139,250,0.3)]
```

### 📐 Z-index layering

Toutes les sections ont `relative z-10` pour être au-dessus de l'overlay :
- Titre + badge
- Budget affiné card
- Ajustements
- Première estimation

### 🎨 Résultat couleurs 2026

| Zone | Couleur | Effet |
|------|---------|-------|
| **Background gradient** | Turquoise `#6BCFCF` → Blend `#7BC4CC` → Violet `#A78BFA` | Sophistication premium |
| **Overlay** | White/5 → Violet/10 | Depth moderne |
| **Shadow** | Violet `#A78BFA/25` | Cohérence violet |
| **Cards** | White/98 + blur-xl | Glassmorphism ultra |
| **Pills** | White/98 + blur-md | Clarté parfaite |
| **Badge Live** | White/10 → Violet/20 → Violet/30 | Premium accent |

### 📊 Impact

- **Modernité** : Gradient turquoise→violet = 2026 ultra-premium ✅
- **Depth** : Overlay + z-index = effet layered sophistiqué ✅
- **Glassmorphism** : Blur renforcé + opacité 98% = clarté + style ✅
- **Cohérence** : Violet partout (background, shadow, badge, hover) ✅
- **Lisibilité** : White/98 au lieu de /95 = meilleur contraste ✅

**Message visuel** : "Innovation technologique premium" grâce au gradient turquoise→violet sophistiqué ! 🚀💎

---

## 2026-02-11 (8ème itération) — Panier premium : Tooltips + Touches violet signature 💎

**Problème** : Le panier Step 3 manquait de tooltips explicatifs sur les ajustements et n'exploitait pas assez le violet accent (couleur "Innovation & Premium").

**Améliorations** :
- ✅ **Tooltips explicatifs** sur chaque ligne d'ajustement (Distance, Densité, Cuisine, Accès, Date) avec icône `HelpCircle`
- ✅ **Badge "Live" violet** avec dot animé violet et gradient turquoise→violet
- ✅ **Titre "BUDGET AFFINÉ"** avec gradient text turquoise→violet (`bg-clip-text`)
- ✅ **Border glow hero** avec gradient turquoise→violet au top
- ✅ **Séparateurs "AJUSTEMENTS"** avec gradient violet aux extrémités
- ✅ **Hover violet** sur pills ajustements (`border-[#A78BFA]/30`, `shadow violet`)

### 1️⃣ Badge "Live" avec violet premium

**Avant** : Simple dot blanc animé  
**Après** :
```tsx
<span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#6BCFCF]/20 to-[#A78BFA]/20 border border-[#A78BFA]/30 backdrop-blur-sm">
  <span className="relative inline-flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A78BFA] opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A78BFA] shadow-[0_0_12px_rgba(167,139,250,0.8)]" />
  </span>
  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">Live</span>
</span>
```

### 2️⃣ Titre "BUDGET AFFINÉ" avec gradient premium

**Avant** : `text-[#6BCFCF]` uni  
**Après** :
```tsx
<p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] bg-gradient-to-r from-[#6BCFCF] to-[#A78BFA] bg-clip-text text-transparent">
  Budget affiné
</p>
```

### 3️⃣ Border glow avec gradient turquoise→violet

**Avant** : `via-[#6BCFCF]/30` uniquement  
**Après** :
```tsx
<div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6BCFCF]/30 via-[#A78BFA]/20 to-transparent" />
```

### 4️⃣ Séparateurs "AJUSTEMENTS" avec violet

**Avant** : `to-white/40` uniquement  
**Après** :
```tsx
<div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/40 to-[#A78BFA]/30" />
```

### 5️⃣ Tooltips explicatifs avec `HelpCircle`

**Nouveauté** : Import `HelpCircle` de `lucide-react` + tooltips pour chaque type d'ajustement :

```tsx
const tooltips: Record<string, string> = {
  distance: "La distance est recalculée à partir des adresses exactes quand elles sont renseignées",
  density: "Le niveau de mobilier impacte le volume et donc le tarif final",
  kitchen: "Chaque équipement de cuisine compte (four, frigo, lave-vaisselle...)",
  access: "Les étages sans ascenseur et les accès contraints augmentent le temps de manutention",
  date: "Les périodes de forte demande (été, fin de mois) impactent les tarifs",
};

// Dans le label
{tooltips[l.key] && (
  <span
    className="inline-flex items-center opacity-60 hover:opacity-100 transition-opacity cursor-help"
    title={tooltips[l.key]}
  >
    <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
  </span>
)}
```

### 6️⃣ Hover violet sur pills ajustements

**Avant** : `hover:border-white/60`, `shadow-[0_4px_16px_rgba(255,255,255,0.3)]`  
**Après** :
```tsx
hover:border-[#A78BFA]/30 
sm:hover:shadow-[0_4px_16px_rgba(167,139,250,0.25)]
```

### 🎨 Ratio couleurs Moverz 2.0 respecté

| Zone panier | Couleur | Usage |
|-------------|---------|-------|
| **Background gradient** | Turquoise `#6BCFCF` → `#5AB8B8` → `#4AA8A5` | 80% (primaire) |
| **Budget affiné titre** | Gradient Turquoise→Violet | Accent premium |
| **Badge "Live"** | Dot violet `#A78BFA` + gradient turquoise→violet | Innovation |
| **Séparateurs** | Gradient white→violet | Accent subtil |
| **Hover pills** | Border + shadow violet | Interactivité premium |
| **Tooltips icon** | Blanc (contraste sur fond turquoise) | Accessibilité |

### 📊 Impact

- **UX** : Tooltips explicatifs réduisent les questions utilisateurs ✅
- **Premium** : Violet apporte sophistication et innovation ✅
- **Cohérence** : Ratio 80/20 turquoise/violet respecté ✅
- **Accessibilité** : `cursor-help` + `title` natif pour tooltips ✅
- **Mobile/Desktop** : Icon `w-3 h-3 sm:w-3.5 sm:h-3.5` responsive ✅

---

## 2026-02-11 (7ème itération) — Mobile-First : Design sobre et clean

**Problème** : Le design premium 2026 était trop chargé sur mobile (glassmorphism, shadows complexes, effets shine, padding généreux, pills massives). Principe **Mobile-First** non respecté.

**Solution** : Design sobre mobile + design premium desktop uniquement.

### 🎯 Règles Mobile-First

| Élément | Mobile (sobre) | Desktop (premium) |
|---------|----------------|-------------------|
| **Cards principales** | `bg-white` opaque, `shadow-sm`, `p-6`, `rounded-xl`, `border-gray-100` | `bg-white/80 backdrop-blur-xl`, `shadow-[0_8px_32px_rgba(107,207,207,0.12)]`, `p-10`, `rounded-2xl`, `border-white/20` |
| **CTA buttons** | `bg-[#6BCFCF]` solid, `shadow-sm`, `py-4`, `text-base`, hover `bg-[#5AB8B8]` | `bg-gradient-to-r from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8]`, `shadow-[0_8px_30px_rgba(107,207,207,0.4)]`, `py-5`, `text-lg`, shine effect |
| **Pills sélection** | `px-5 py-3`, `rounded-xl`, `shadow-sm`, scale `1.0` | `px-8 py-5`, `rounded-2xl`, `shadow-[0_8px_30px_rgba(107,207,207,0.3)]`, `hover:scale-[1.02]` |
| **Sub-cards** | `bg-white`, `shadow-sm`, `p-6`, `border-gray-100` | `bg-white/70 backdrop-blur-xl`, `shadow-[0_8px_32px_rgba(0,0,0,0.08)]`, `p-8`, `border-white/30` |
| **Espacements** | `space-y-6`, `gap-3` | `space-y-8`, `gap-4` |
| **Sidebar** | En bas (mobile), `p-5`, `space-y-5`, `rounded-xl`, `shadow-md` | Sticky droite, `p-10`, `space-y-8`, `rounded-3xl`, `shadow-2xl` |
| **Textes badges** | `text-xs`, `px-3 py-1.5` | `text-sm`, `px-4 py-2` |
| **Icons** | `w-3 h-3` | `w-4 h-4` |
| **Budget hero** | Montant `text-5xl`, min/max `text-lg` | Montant `text-7xl`, min/max `text-2xl` |

### ✅ Modifications appliquées

**1. Cards principales (Steps 1-4)**
```tsx
// Mobile sobre → Desktop premium
className="rounded-xl sm:rounded-2xl bg-white sm:bg-white/80 sm:backdrop-blur-xl border border-gray-100 sm:border-white/20 shadow-sm sm:shadow-[0_8px_32px_rgba(107,207,207,0.12)] p-6 sm:p-10"
```

**2. CTA Buttons (tous les steps)**
```tsx
// Mobile solid cyan → Desktop gradient + shine
className="bg-[#6BCFCF] sm:bg-gradient-to-r sm:from-[#A8E6D8] sm:via-[#6BCFCF] sm:to-[#5AB8B8] py-4 sm:py-5 text-base sm:text-lg shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.4)]"

// Shine effect desktop only
<div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
```

**3. Pills (densité, cuisine, formules, accès)**
```tsx
// Mobile compactes → Desktop généreuses
className="px-5 py-3 sm:px-8 sm:py-5 rounded-xl sm:rounded-2xl shadow-sm sm:shadow-[0_8px_30px_rgba(107,207,207,0.3)]"
```

**4. Sub-cards (Step 2 budget, Step 3 adresses, Step 4 recap)**
```tsx
// Mobile opaques → Desktop glassmorphism
className="rounded-xl sm:rounded-2xl bg-white sm:bg-white/70 sm:backdrop-blur-xl border border-gray-100 sm:border-white/30 shadow-sm sm:shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 sm:p-8"
```

**5. Sidebar mobile (Step 3)**
- **Ordre** : `order-last lg:order-none` (sidebar en bas mobile, droite desktop)
- **Sticky** : désactivé mobile, `lg:sticky lg:top-20` desktop
- **Padding** : `p-5 sm:p-10`, `space-y-5 sm:space-y-8`
- **Border radius** : `rounded-xl sm:rounded-3xl`
- **Shadow** : `shadow-md sm:shadow-2xl`
- **Pills ajustements** : `px-4 py-3 sm:px-5 sm:py-4`, `rounded-xl sm:rounded-2xl`
- **Dots** : `w-2 h-2 sm:w-2.5 sm:h-2.5`
- **Textes** : `text-xs sm:text-sm`, `text-base sm:text-lg`

**6. Budget hero (sidebar)**
- **Titre** : `text-lg sm:text-xl`
- **Montant principal** : `text-5xl sm:text-7xl`
- **Min/Max** : `text-lg sm:text-2xl`
- **Padding** : `p-5 sm:p-8`, `mb-4 sm:mb-6`

**7. Espacements globaux**
```tsx
// Mobile compact → Desktop aéré
space-y-6 sm:space-y-8
gap-3 sm:gap-4
p-6 sm:p-10
```

**8. Badges (Step 4 "Dossier créé")**
```tsx
px-3 py-1.5 sm:px-4 sm:py-2
text-xs sm:text-sm
<Check className="w-3 h-3 sm:w-4 sm:h-4" />
```

### 📊 Impact

| Métrique | Mobile avant | Mobile après | Desktop |
|----------|--------------|--------------|---------|
| **Lisibilité** | ❌ Glassmorphism difficile à lire | ✅ Opaque, contraste max | ✅ Glassmorphism subtil |
| **Performance** | ❌ Backdrop-blur coûteux | ✅ Pas de blur | ✅ Blur si GPU OK |
| **UX tactile** | ❌ Pills petites, CTA fins | ✅ Zones tactiles généreuses | ✅ Hover states riches |
| **Cohérence** | ❌ Même design mobile/desktop | ✅ Sobre mobile, premium desktop | ✅ Premium assumé |
| **Load time** | ❌ Effets lourds mobile | ✅ Minimal CSS mobile | ✅ Premium CSS chargé |

### 🎨 Philosophie Mobile-First

**Mobile = SOBRE ET EFFICACE**  
- Opacité totale (meilleure lisibilité)
- Shadows simples (`shadow-sm`)
- Pas d'effets shine/blur/glow
- Padding réduit (`p-5`, `p-6`)
- CTA solid avec hover simple
- Textes compacts mais lisibles

**Desktop = PREMIUM ET IMMERSIF**  
- Glassmorphism subtil (`backdrop-blur-xl`, `bg-white/80`)
- Shadows colorées complexes (`shadow-[0_8px_32px_rgba(107,207,207,0.12)]`)
- Effets shine, hover scale, glow
- Padding généreux (`p-8`, `p-10`)
- CTA gradient avec multi-layers
- Typographie massive et aérée

**Breakpoint** : `sm` (640px) pour tout (cohérence absolue)

### ✅ Résultat

- **Mobile** : Design sobre, rapide, tactile optimal, lisibilité maximale
- **Desktop** : Design premium 2026 conservé, immersif, moderne
- **Responsive** : Cohérent sur toutes tailles d'écran
- **Performance** : Optimisé mobile (pas de blur/glow/shine), premium assumé desktop

---

## 2026-02-11 (6ème itération) — Sidebar Step 3 ultra-premium : détails visuels + micro-interactions

**Problème** : La sidebar Step 3 avait le design premium mais manquait de détails visuels (pills plates, dots invisibles, titres sans décoration, couleurs ternes).

**Améliorations micro-détails** :
- ✅ Pills ajustements glassmorphism avec border glow
- ✅ Dots colorés plus gros avec shadow glow coloré
- ✅ Titre "AJUSTEMENTS" avec séparateurs gradient stylés
- ✅ Budget hero avec subtle glow top turquoise
- ✅ Montants ajustements plus gros et couleurs vives
- ✅ Première estimation plus visible avec glassmorphism
- ✅ Cohérence couleurs rose-400/emerald-400 partout

### 1️⃣ Pills Ajustements Glassmorphism Premium

**Avant** : `bg-white/90` simple  
**Après** :
```tsx
bg-white/95 backdrop-blur-sm
border border-white/40
hover:bg-white 
hover:border-white/60 
hover:shadow-[0_4px_16px_rgba(255,255,255,0.3)]
```

### 2️⃣ Dots Colorés avec Shadow Glow

**Avant** : `w-2 h-2` sans glow  
**Après** :
```tsx
w-2.5 h-2.5 rounded-full

// Rose (positif)
bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]

// Emerald (négatif)
bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]

// Gray (neutre)
bg-gray-400
```

### 3️⃣ Titre "AJUSTEMENTS" avec Séparateurs

**Avant** : texte simple  
**Après** :
```tsx
<div className="flex items-center gap-3">
  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/40" />
  <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/90">
    Ajustements
  </p>
  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/40" />
</div>
```

### 4️⃣ Budget Hero avec Subtle Glow Top

**Ajout** :
```tsx
<div className="rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-lg relative overflow-hidden">
  {/* Subtle glow top */}
  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6BCFCF]/30 to-transparent" />
  
  {/* Contenu */}
</div>
```

### 5️⃣ Montants Ajustements Plus Gros

**Avant** : `text-base` + couleurs foncées (600)  
**Après** :
```tsx
// Typographie
text-lg font-black (au lieu de text-base)

// Couleurs vives
text-rose-400 (au lieu de rose-600)
text-emerald-400 (au lieu de emerald-600)
```

### 6️⃣ Première Estimation Plus Visible

**Avant** : `bg-white/10` invisible  
**Après** :
```tsx
bg-white/10 backdrop-blur-sm
border border-white/20
hover:bg-white/15 
hover:border-white/30
shadow-sm
```

### 7️⃣ Cohérence Couleurs Partout

**Changement global** :
- Min/Max budget hero : `emerald-600` → `emerald-400`
- Min/Max budget hero : `rose-600` → `rose-400`
- Min/Max première estimation : `emerald-600` → `emerald-400`
- Min/Max première estimation : `rose-600` → `rose-400`
- Montants ajustements : `rose-600` → `rose-400`, `emerald-600` → `emerald-400`

**Résultat** : couleurs vives cohérentes `rose-400` et `emerald-400` dans toute la sidebar.

### ⚠️ Aucun changement fonctionnel
- Tracking inchangé
- Champs inchangés
- Payload inchangé
- Textes et liens inchangés

---

## 2026-02-11 (5ème itération) — Design System Premium 2026 Moverz : glassmorphism + effets ultra-modernes

**Problème** : La 4ème itération respectait la charte couleurs mais manquait tous les effets visuels premium 2026 (glassmorphism, shadows colorées, gradients sophistiqués, micro-animations, shine effects).

**Objectif** : Appliquer **TOUT le Design System Premium 2026 Moverz** :
- ✅ Glassmorphism nouvelle génération sur toutes les cards
- ✅ Shadows colorées turquoise avec glow premium
- ✅ CTA gradient turquoise + shine effect + overlay au hover
- ✅ Dots animés double glow + ping animation
- ✅ Badge "Recommandé" gradient turquoise→violet premium
- ✅ Focus states ring-4 premium avec shadow colorée
- ✅ Pills hover glow turquoise + scale premium

### 1️⃣ Glassmorphism Nouvelle Génération (Cards)

**Toutes les cards principales** :
```tsx
// Cards Steps 1/2/3/4
rounded-2xl
bg-white/80              // transparence 80%
backdrop-blur-xl         // blur effet verre
border border-white/20   // border subtile
shadow-[0_8px_32px_rgba(107,207,207,0.12)]
hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)]
transition-all duration-500
```

**Sous-cards Step 3** :
```tsx
// Densité, cuisine, etc.
rounded-2xl
bg-white/70              // plus transparent
backdrop-blur-xl
border border-white/30
shadow-[0_8px_32px_rgba(0,0,0,0.08)]
hover:shadow-[0_12px_48px_rgba(107,207,207,0.15)]
```

### 2️⃣ CTA Ultra-Premium (Gradient + Shine + Overlay)

**Boutons principaux avec effets multiples** :
```tsx
// Container
group relative w-full
rounded-xl
bg-gradient-to-r from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8]
border border-white/20
py-5 text-lg font-bold text-white
shadow-[0_8px_30px_rgba(107,207,207,0.4)]
hover:shadow-[0_12px_50px_rgba(107,207,207,0.6)]
hover:scale-[1.02] active:scale-[0.98]
overflow-hidden

// Texte avec z-index
<span className="relative z-10">Texte</span>

// Gradient hover overlay
<div className="
  absolute inset-0 
  bg-gradient-to-r from-[#A8E6D8] to-[#6BCFCF] 
  opacity-0 group-hover:opacity-100 
  transition-opacity duration-300
" />

// Shine effect
<div className="
  absolute inset-0 
  bg-gradient-to-r from-transparent via-white/30 to-transparent 
  translate-x-[-100%] group-hover:translate-x-[100%] 
  transition-transform duration-700
" />
```

### 3️⃣ Dots Animés Double Glow

**Sidebar header** :
```tsx
<span className="relative inline-flex h-3 w-3">
  {/* Ping animation outer */}
  <span className="
    animate-ping absolute inline-flex h-full w-full 
    rounded-full bg-white opacity-75
  " />
  
  {/* Static inner dot avec glow */}
  <span className="
    relative inline-flex rounded-full h-3 w-3 
    bg-white 
    shadow-[0_0_12px_rgba(255,255,255,0.8)]
  " />
</span>
```

### 4️⃣ Badge "Recommandé" Gradient Premium

**Badge turquoise→violet avec texte gradient** :
```tsx
<span className="
  inline-flex items-center gap-1.5 
  rounded-full 
  bg-gradient-to-r from-[#6BCFCF]/20 to-[#A78BFA]/20 
  border border-[#A78BFA]/50 
  px-3 py-1 
  shadow-[0_4px_16px_rgba(167,139,250,0.25)]
">
  <span className="
    bg-gradient-to-r from-[#6BCFCF] to-[#A78BFA] 
    bg-clip-text text-transparent 
    text-[10px] font-bold tracking-wider
  ">
    ✨ Recommandé
  </span>
</span>
```

### 5️⃣ Focus States Premium (Ring-4)

**Inputs avec ring-4 + shadow colorée** :
```tsx
border-gray-200 
bg-white/90
py-4 text-base
focus:border-[#6BCFCF] 
focus:outline-none 
focus:ring-4 focus:ring-[#6BCFCF]/20 
focus:bg-white 
focus:shadow-[0_0_0_4px_rgba(107,207,207,0.1)]
```

### 6️⃣ Pills Premium (Glow Turquoise)

**Pills sélectionnées** :
```tsx
// Sélectionnée
border-[#6BCFCF] 
bg-[#6BCFCF]/10 
shadow-[0_8px_30px_rgba(107,207,207,0.3)]  // shadow colorée turquoise
ring-2 ring-[#6BCFCF]/30

// Hover
hover:border-[#6BCFCF] 
hover:shadow-[0_8px_24px_rgba(107,207,207,0.25)]  // glow turquoise
hover:scale-[1.02]
```

### 🎨 Palette Premium 2026 Complète

| Effet | Valeur | Usage |
|-------|--------|-------|
| Glassmorphism cards | `bg-white/80 backdrop-blur-xl` | Toutes cards principales |
| Glassmorphism sous-cards | `bg-white/70 backdrop-blur-xl` | Densité, cuisine, etc. |
| Shadow card turquoise | `shadow-[0_8px_32px_rgba(107,207,207,0.12)]` | Cards au repos |
| Shadow card hover | `shadow-[0_12px_48px_rgba(107,207,207,0.15)]` | Cards hover |
| Gradient CTA | `from-[#A8E6D8] via-[#6BCFCF] to-[#5AB8B8]` | Boutons principaux |
| Shadow CTA | `shadow-[0_8px_30px_rgba(107,207,207,0.4)]` | CTA repos |
| Shadow CTA hover | `shadow-[0_12px_50px_rgba(107,207,207,0.6)]` | CTA hover avec glow |
| Shadow pills | `shadow-[0_8px_30px_rgba(107,207,207,0.3)]` | Pills sélectionnées |
| Shadow pills hover | `shadow-[0_8px_24px_rgba(107,207,207,0.25)]` | Pills hover glow |
| Badge gradient bg | `from-[#6BCFCF]/20 to-[#A78BFA]/20` | Badge "Recommandé" |
| Badge gradient text | `from-[#6BCFCF] to-[#A78BFA]` | Texte badge gradient |
| Shadow badge | `shadow-[0_4px_16px_rgba(167,139,250,0.25)]` | Badge violet glow |
| Dot glow | `shadow-[0_0_12px_rgba(255,255,255,0.8)]` | Sidebar dot |
| Focus ring | `ring-4 ring-[#6BCFCF]/20` | Inputs focus |
| Focus shadow | `shadow-[0_0_0_4px_rgba(107,207,207,0.1)]` | Inputs focus glow |

### 📦 Fichiers modifiés
- `app/devis-gratuits-v3/page.tsx` : glassmorphism cards + dot animé sidebar
- `components/tunnel/v2/StepQualificationV2.tsx` : CTA gradient + shine effect
- `components/tunnel/v2/StepEstimationV2.tsx` : CTA gradient + shine effect
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` : CTA gradient + badge premium + pills glow + focus ring-4 + sous-cards glassmorphism

### ⚠️ Aucun changement fonctionnel
- Tracking inchangé
- Champs inchangés
- Payload inchangé
- Textes et liens inchangés

---

## 2026-02-11 (4ème itération) — Correction charte couleurs Moverz 2.0 : turquoise primaire + violet accent

**Problème** : La 3ème itération utilisait `#7DD3C0` (cyan trop clair) et gradient cyan→violet sur les CTA. Cela ne respectait pas la charte couleurs Moverz 2.0.

**Charte Moverz 2.0 (respect strict)** :
- **🏡 Turquoise #6BCFCF (80% - PRIMAIRE)** : tous les CTA, navigation, liens, points animés, icônes principales. Message : "Confiance, déménagement rassurant"
- **💎 Violet #A78BFA (20% - ACCENT)** : badges "Nouveau"/"Premium"/"Recommandé", highlights, icônes secondaires, éléments décoratifs. Message : "Innovation, valeur ajoutée"

**Corrections appliquées** :
- ✅ CTA principaux : `bg-[#6BCFCF]` (turquoise pur, plus de gradient violet)
- ✅ Sidebar gradient : `from-[#6BCFCF] via-[#5AB8B8] to-[#4AA8A5]` (turquoise uniquement)
- ✅ Pills sélectionnées : `border-[#6BCFCF] bg-[#6BCFCF]/10` (turquoise)
- ✅ Focus states : `ring-[#6BCFCF]/30` (turquoise)
- ✅ Icônes principales : `text-[#6BCFCF]` (turquoise)
- ✅ Dots animés : `bg-white` (sur fond turquoise)
- ✅ Badge "Recommandé" : `bg-[#A78BFA]/20 border-[#A78BFA] text-[#A78BFA]` (violet accent - premium)

### Palette finale respectant Moverz 2.0

| Élément | Couleur | Rôle |
|---------|---------|------|
| CTA principaux | `#6BCFCF` | Turquoise primaire (80%) |
| Sidebar gradient | `from-[#6BCFCF] via-[#5AB8B8] to-[#4AA8A5]` | Turquoise uniquement |
| Pills sélectionnées | `#6BCFCF` | Turquoise primaire |
| Focus states | `#6BCFCF` | Turquoise primaire |
| Icônes principales | `#6BCFCF` | Turquoise primaire |
| Badge "Recommandé" | `#A78BFA` | Violet accent (20% - premium) |
| Hover CTA | `#5AB8B8` | Turquoise medium |
| Shadows CTA | `shadow-[#6BCFCF]/30` | Turquoise primaire |

### ⚠️ Aucun changement fonctionnel
- Tracking inchangé
- Champs inchangés
- Payload inchangé
- Textes et liens inchangés

---

## 2026-02-11 (3ème itération) — Refonte moderne tech 2026 : gradient, typographie massive, espacement généreux

**Problème** : La 2ème itération était trop sobre/minimale. Manquait de profondeur, d'impact visuel, et d'espacement. Sidebar cyan solid trop plate, typographie trop petite, pills trop serrées, boutons sans gradient, pas assez moderne 2026.

**Objectif** : Refonte moderne tech 2026 inspirée de la home moverz.fr (gradient subtil, typographie massive, espacement généreux, profondeur visuelle) :
- ✅ Sidebar gradient : `from-[#7DD3C0] via-[#6BCFCF] to-[#5AB8B8]` + shadow colorée
- ✅ Budget hero massif : `text-7xl` (au lieu de 5xl)
- ✅ Boutons gradient cyan→violet : `from-[#7DD3C0] to-[#A78BFA]`
- ✅ Pills spacieuses : `px-8 py-5` + `rounded-2xl` + hover scale
- ✅ Cards aérées : `p-10` (au lieu de p-8) + `shadow-lg`
- ✅ Inputs hauts : `py-4` + `text-base`
- ✅ Espacement généreux : `space-y-8` partout
- ✅ Badges avec dots animés : `animate-pulse`
- ✅ Palette cyan plus doux : `#7DD3C0` (au lieu de `#6BCFCF`)

### 1️⃣ Sidebar gradient moderne (GAME CHANGER business)

**Design avec profondeur** :
```tsx
// Container gradient 3 stops
rounded-3xl
bg-gradient-to-br from-[#7DD3C0] via-[#6BCFCF] to-[#5AB8B8]
p-10 (au lieu de p-8)
shadow-2xl shadow-[#6BCFCF]/20

// Dot animé header
w-2 h-2 rounded-full bg-white animate-pulse

// Budget hero MASSIF
bg-white/95 backdrop-blur-sm
rounded-2xl p-8 shadow-lg

text-7xl font-black  // au lieu de text-5xl
tracking-[0.3em]     // espacement lettres augmenté

// Min/Max plus gros
text-2xl font-black  // au lieu de text-lg

// Ajustements avec meilleur contraste
bg-white/90 backdrop-blur-sm
hover:bg-white
px-5 py-4
shadow-sm

// Dots colorés plus visibles
w-2 h-2 (au lieu de w-1.5 h-1.5)
bg-rose-500 / bg-emerald-500 (au lieu de 300)
```

### 2️⃣ Boutons gradient cyan→violet

**Moderne avec shadow colorée** :
```tsx
w-full
rounded-xl
bg-gradient-to-r from-[#7DD3C0] to-[#A78BFA]
hover:from-[#6BCFCF] hover:to-[#9F7AEA]
py-5 (au lieu de py-4)
text-lg font-bold (au lieu de text-base)
shadow-lg shadow-[#7DD3C0]/30
hover:shadow-xl hover:shadow-[#7DD3C0]/40
transition-all duration-300
```

### 3️⃣ Pills spacieuses avec hover scale

**Plus gros et plus d'impact** :
```tsx
// Container
rounded-2xl (au lieu de rounded-xl)
border-2
px-8 py-5 (au lieu de px-5 py-4)
transition-all duration-300

// Sélectionné
border-[#7DD3C0]
bg-gradient-to-br from-[#7DD3C0]/10 to-[#6BCFCF]/5
shadow-lg
ring-2 ring-[#7DD3C0]/30

// Normal
hover:border-[#7DD3C0]
hover:shadow-md
hover:scale-[1.02]

// Texte plus gros
text-base font-bold (au lieu de text-sm)
text-sm (descriptions, au lieu de text-xs)
```

### 4️⃣ Cards aérées avec shadows

**Plus de padding et profondeur** :
```tsx
// Cards principales (Steps 1/2/3/4)
rounded-2xl
bg-white
border border-gray-100
p-10 (au lieu de p-8)
shadow-lg (au lieu de shadow-sm)

// Sous-cards (Step 3)
rounded-2xl
p-8 (au lieu de p-6)
shadow-lg

// Espacement global
space-y-8 (au lieu de space-y-6)
```

### 5️⃣ Inputs plus hauts et modernes

**Meilleur confort** :
```tsx
py-4 (au lieu de py-3)
text-base (explicite)
focus:border-[#7DD3C0]
focus:ring-2 focus:ring-[#7DD3C0]/30
focus:ring-offset-2
```

### 6️⃣ Badges avec dots animés

**Micro-animations modernes** :
```tsx
// Badge "Dossier créé"
inline-flex items-center gap-2
rounded-full
bg-emerald-100
border border-emerald-300
px-4 py-2 (au lieu de px-3 py-1)
text-sm font-bold (au lieu de text-xs)

// Dot animé
w-2 h-2 rounded-full bg-emerald-500 animate-pulse
```

### 7️⃣ Typographie augmentée

**Plus d'impact visuel** :
```tsx
// Budget hero sidebar
text-7xl font-black (au lieu de text-5xl)

// Titre "Bravo" Step 4
text-5xl sm:text-6xl (au lieu de text-4xl sm:text-5xl)

// Boutons CTA
text-lg font-bold (au lieu de text-base)

// Pills labels
text-base font-bold (au lieu de text-sm)

// Step 2 "Budget estimé"
text-xl font-bold (au lieu de text-lg)
```

### 8️⃣ Espacement généreux

**Respire mieux** :
```tsx
// Forms
space-y-8 (au lieu de space-y-6)

// Sidebar
space-y-8 p-10

// Page remerciement
space-y-10 (au lieu de space-y-8)
max-w-3xl (au lieu de max-w-2xl)

// Cards recap
mt-6 gap-3 (au lieu de mt-4 gap-2)
```

### 🎨 Palette moderne tech 2026

| Élément | Valeur |
|---------|--------|
| Cyan principal | `#7DD3C0` (plus doux) |
| Cyan hover | `#6BCFCF` |
| Gradient sidebar | `from-[#7DD3C0] via-[#6BCFCF] to-[#5AB8B8]` |
| Gradient boutons | `from-[#7DD3C0] to-[#A78BFA]` (cyan→violet) |
| Pills sélectionnées | `from-[#7DD3C0]/10 to-[#6BCFCF]/5` |
| Shadows colorées | `shadow-[#7DD3C0]/30` |
| Focus states | `ring-[#7DD3C0]/30` |

### 📦 Fichiers modifiés
- `app/devis-gratuits-v3/page.tsx` : cards p-10 + sidebar gradient
- `components/tunnel/v2/StepQualificationV2.tsx` : bouton gradient + espacement
- `components/tunnel/v2/StepEstimationV2.tsx` : typo + cards + bouton gradient
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` : pills spacieuses + inputs hauts + bouton gradient
- `components/tunnel/v2/StepContactPhotosV2.tsx` : badge dots + cards aérées

### ⚠️ Aucun changement fonctionnel
- Tracking inchangé
- Champs inchangés
- Payload Back Office identique
- **Textes et liens : 0 modification**

---

## 2026-02-11 (2ème itération) — Refonte sobre style moverz.fr : blanc pur + cyan accent uniquement

**Problème** : La première refonte "Vercel 2026" était trop flashy/agressive (gradients cyan→blue partout, glassmorphism excessif, shadows cyan trop fortes). Pas alignée avec la home moverz.fr (sobre, élégante, blanc/cyan accent).

**Objectif** : Refonte sobre inspirée de la home moverz.fr (blanc pur + cyan #6BCFCF en accent uniquement) :
- ✅ Fond page : `#F8FAFB` (cyan très pâle, presque blanc)
- ✅ Cards principales : `bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]`
- ✅ Cyan accent uniquement : `#6BCFCF` (pas de gradient flashy)
- ✅ Boutons CTA : `bg-[#6BCFCF] hover:bg-[#5AB8B8]` (cyan simple, pas gradient)
- ✅ Pills : blanc avec border gray, sélectionné cyan solid
- ✅ Inputs : `border-gray-200 focus:border-[#6BCFCF] focus:ring-2 focus:ring-[#6BCFCF]/20`
- ✅ Shadows grises douces (pas cyan)
- ✅ Typographie : noir `#0F172A` + gris `#64748B`

### 1️⃣ Sidebar Step 3 (GAME CHANGER business)

**Design sobre et premium** :
```tsx
// Container sidebar
bg-[#6BCFCF]  // cyan solid (pas gradient)
rounded-2xl
shadow-lg
p-8

// Budget affiné hero
bg-white
rounded-2xl
p-6
shadow-sm

// Montant principal
text-5xl font-black text-[#0F172A]

// Min/Max
text-lg font-bold
text-emerald-600 / text-rose-600
border-t border-gray-100

// Ajustements
bg-white/10
rounded-xl
hover:bg-white/20
transition-all duration-200

// Dots colorés
w-1.5 h-1.5 rounded-full
bg-rose-300 (positif) / bg-emerald-300 (négatif)
```

### 2️⃣ Cards principales (Steps 1/2/3/4)

**Design blanc pur sobre** :
```tsx
rounded-2xl
bg-white
border border-gray-100
shadow-[0_2px_8px_rgba(0,0,0,0.08)]
p-8
```

### 3️⃣ Sous-cards (Step 3 : densité, cuisine, etc.)

**Design sobre** :
```tsx
rounded-xl
bg-white
border border-gray-100
p-6
shadow-sm
```

### 4️⃣ Boutons CTA

**Cyan simple (pas gradient)** :
```tsx
w-full
rounded-xl
bg-[#6BCFCF]
hover:bg-[#5AB8B8]
py-4
text-base font-bold text-white
shadow-[0_2px_8px_rgba(107,207,207,0.3)]
hover:shadow-[0_4px_12px_rgba(107,207,207,0.4)]
transition-all duration-200
disabled:opacity-40
```

### 5️⃣ Pills sélecteurs (densité, cuisine, formules, accès)

**Blanc sobre, sélectionné cyan** :
```tsx
// Normal
rounded-xl
border-2 border-gray-200
bg-white
hover:border-[#6BCFCF]
hover:shadow-sm

// Sélectionné
border-[#6BCFCF]
bg-[#6BCFCF]
text-white
shadow-sm
```

### 6️⃣ Inputs focus states

**Focus cyan subtil** :
```tsx
border-gray-200
bg-white
focus:border-[#6BCFCF]
focus:outline-none
focus:ring-2
focus:ring-[#6BCFCF]/20
focus:ring-offset-1
```

### 7️⃣ Cards formules (Éco/Standard/Premium)

**Sobre avec badge recommandé** :
```tsx
// Container
rounded-xl
border-2 border-gray-200
bg-white
hover:border-[#6BCFCF]
hover:shadow-sm

// Sélectionné
border-[#6BCFCF]
bg-[#6BCFCF]/5
shadow-sm

// Badge "Recommandé"
rounded-full
bg-[#6BCFCF]/10
border border-[#6BCFCF]/40
text-[10px] font-bold text-[#6BCFCF]
```

### 8️⃣ Page remerciement (Step 4)

**Sobre et cohérente** :
```tsx
// Badge "Dossier créé"
bg-emerald-100
border border-emerald-300
text-emerald-700

// Cards
rounded-xl
bg-white
border border-gray-100
shadow-sm

// Icônes
bg-[#6BCFCF]/10
text-[#6BCFCF]

// Recap card
bg-[#F8FAFB]
border border-gray-100
```

### 🎯 Palette complète

| Élément | Valeur |
|---------|--------|
| Fond page | `#F8FAFB` |
| Cards | `#FFFFFF` (blanc pur) |
| Cyan accent | `#6BCFCF` |
| Cyan hover | `#5AB8B8` |
| Texte principal | `#0F172A` |
| Texte secondaire | `#64748B` |
| Borders | `#E2E8F0` (gray-200) |
| Shadows | `rgba(0,0,0,0.08)` |

### 📦 Fichiers modifiés
- `app/devis-gratuits-v3/page.tsx` : fond page, cards principales, sidebar Step 3 sobre
- `components/tunnel/v2/StepQualificationV2.tsx` : icône sobre, bouton cyan
- `components/tunnel/v2/StepEstimationV2.tsx` : cards sobres, bouton cyan
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` : sous-cards, pills, boutons, inputs focus
- `components/tunnel/v2/StepContactPhotosV2.tsx` : badge, cards, icônes sobres

### ⚠️ Tracking inchangé
- `logicalStep` : stable
- `screenId` : inchangé
- Payload Back Office : aucun changement

---

## 2026-02-11 (1ère itération) — Refonte design complète "Vercel 2026" : glassmorphism + gradients cyan + layout grille

**Problème** : Le design était trop plat et daté. La sidebar Step 3 se superposait au formulaire (layout fixed bancal). Les couleurs turquoise/noir n'étaient pas assez premium. Pas de micro-animations, shadows ternes, buttons rectangulaires.

**Objectif** : Refonte design complète inspirée de moverz.fr + Vercel/Linear 2026 :
- ✅ Glassmorphism partout : `backdrop-blur-xl`, transparence, borders subtils
- ✅ Gradients cyan/blue : `from-cyan-600 via-cyan-700 to-blue-700` (remplace turquoise/noir)
- ✅ Micro-animations : `scale`, `translate`, `glow effects`, `pulse`
- ✅ Shadows cyan modernes : `shadow-[0_12px_40px_rgba(6,182,212,0.35)]`
- ✅ Pills : `rounded-full` avec `border` gradients
- ✅ Focus states : `ring-4` avec `ring-cyan-500/30`
- ✅ Layout grille propre : plus de superposition

### 1️⃣ Layout grille (fini la superposition)

**Avant** : sidebar `position: fixed right-8` qui se superposait au formulaire desktop.

**Après** : grille CSS propre `grid-cols-[1fr_420px] gap-8` :
- Formulaire : colonne gauche (width fluide)
- Sidebar : colonne droite (sticky top-8, 420px fixed)
- Plus de superposition, layout équilibré style Vercel

**Container adaptatif** :
- Mobile : stack vertical (formulaire → sidebar mobile en bas)
- Desktop (≥ lg / 1024px) : grille 2 colonnes côte à côte
- Max-width : `1400px` au lieu de `3xl` (768px)

### 2️⃣ Sidebar gradient hero (Step 3)

**Nouveau design** :
```tsx
bg-gradient-to-br from-cyan-600 via-cyan-700 to-blue-700
backdrop-blur-xl
shadow-[0_20px_60px_rgba(6,182,212,0.5)]
```

**Budget affiné** :
- Glow animé : `bg-gradient-to-br from-cyan-300/30 to-blue-300/30 rounded-full blur-3xl animate-pulse`
- Montant : `text-6xl font-black text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.4)]`
- Min/Max : cards glassmorphism `bg-white/10 backdrop-blur-sm` avec couleurs emerald/rose

**Ajustements** :
- Pills glassmorphism : `bg-white/10 backdrop-blur-md border border-white/20`
- Hover effect : `hover:bg-white/20 hover:scale-[1.02]`
- Dots colorés : `bg-rose-300` (positif) / `bg-emerald-300` (négatif)

### 3️⃣ Cards glassmorphism (formulaire)

**Avant** : `bg-white/95 backdrop-blur-sm border border-[#E3E5E8]`

**Après** :
```tsx
rounded-3xl 
bg-white/80 backdrop-blur-xl 
border border-cyan-100/50 
shadow-[0_8px_32px_rgba(6,182,212,0.2)]
hover:shadow-[0_12px_48px_rgba(6,182,212,0.3)]
transition-all duration-300
```

**Appliqué sur** :
- Cards principales (Steps 1/2/4)
- Card formulaire Step 3
- Toutes les sous-cards (adresses, densité, cuisine, accès, contact)

### 4️⃣ Buttons gradient cyan + pills

**CTA principal** (ex: "Finaliser mon estimation") :
```tsx
rounded-full
bg-gradient-to-r from-cyan-600 via-cyan-700 to-blue-700
py-5 font-bold text-white
shadow-[0_12px_40px_rgba(6,182,212,0.5)]
hover:shadow-[0_16px_56px_rgba(6,182,212,0.65)]
hover:scale-[1.02] active:scale-[0.98]
transition-all duration-300
```

**Pills sélecteurs** (Densité, Cuisine, Accès) :

**État sélectionné** :
```tsx
rounded-2xl
border-cyan-500
bg-gradient-to-br from-cyan-600 to-blue-600
text-white
shadow-[0_8px_32px_rgba(6,182,212,0.5)]
ring-4 ring-cyan-500/20
scale-[1.03]
```

**État normal** :
```tsx
rounded-2xl
border-2 border-cyan-500/30
bg-gradient-to-br from-white/90 to-cyan-50/50
backdrop-blur-lg
shadow-[0_4px_16px_rgba(6,182,212,0.15)]
hover:border-cyan-500
hover:shadow-[0_8px_24px_rgba(6,182,212,0.3)]
hover:scale-[1.03]
```

**Boutons Oui/Non** (accès simple/contraint) : même style `rounded-full` avec gradient cyan.

### 5️⃣ Inputs focus ring-4 cyan

**Avant** : `focus:ring-2 focus:ring-[#6BCFCF]/40`

**Après** :
```tsx
border-cyan-200
bg-white/90 backdrop-blur-sm
focus:border-cyan-500
focus:ring-4 focus:ring-cyan-500/30
focus:ring-offset-2
```

**Appliqué sur** : tous les inputs texte, number, date, email, tel.

### 6️⃣ Micro-animations & effects

- **Glow animé** : `animate-pulse` sur gradient blur (sidebar hero)
- **Dots pulsants** : `animate-pulse` sur les indicateurs (sidebar header, lignes ajustements)
- **Scale hover** : `hover:scale-[1.02]` / `hover:scale-[1.03]` partout
- **Active state** : `active:scale-[0.98]` sur CTA principal
- **Transitions** : `transition-all duration-300` (au lieu de 200ms)
- **Drop shadow** : `drop-shadow-[0_4px_24px_rgba(255,255,255,0.4)]` sur montant principal

### Fichiers modifiés

- `app/devis-gratuits-v3/page.tsx` : layout grille + sidebar déplacée + cards principales
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` : sidebar cachée (déplacée dans page.tsx) + cards + buttons + inputs
- `migration_v4.md` : documentation complète

### Palette couleurs (mise à jour)

**Avant** : turquoise `#6BCFCF` / `#A8E8E8` + noir `#0F172A` / `#1E293B`

**Après (Cyan/Blue)** :
```tsx
// Gradients primaires
from-cyan-600 via-cyan-700 to-blue-700  // Sidebar hero + CTA
from-cyan-600 to-blue-600               // Pills sélectionnées

// Borders
border-cyan-100/50   // Cards principales
border-cyan-200      // Inputs normaux
border-cyan-500/30   // Pills normales
border-cyan-500      // Pills hover / inputs focus

// Shadows
rgba(6,182,212,0.25) - rgba(6,182,212,0.5)  // Cards & buttons
rgba(255,255,255,0.15) - rgba(255,255,255,0.4)  // Sidebar (sur fond gradient)

// Rings
ring-cyan-500/20    // Pills sélectionnées
ring-cyan-500/30    // Focus states
```

### Breakpoints & responsive

- Grille activée à **`lg:` (1024px)** (sidebar + formulaire côte à côte)
- Mobile (< 1024px) : stack vertical, sidebar masquée (budget bar sticky en bas)
- Tous les hover effects désactivés sur mobile via `:hover` natif

### Tracking

**Aucun changement** : zéro impact sur events GA4 / logicalStep / screenId.

### Champs / Inputs

- **supprimés** : AUCUN
- **ajoutés** : AUCUN
- **modifiés** : style visuel uniquement (glassmorphism + gradients cyan)

### Back Office payload

**Aucun changement** : les données envoyées restent identiques.

### Fix build (CapRover)
- Correction TypeScript : `fmtEur` défini au scope du composant (utilisable dans le JSX Step 3) pour éviter `Cannot find name 'fmtEur'` en build.

---

## 2026-02-11 — Centrage desktop corrigé + layout Step 3 "premium 2026" (v2)

**Problème** : Le conteneur principal du tunnel avait des marges desktop qui décalaient tout vers la droite, même sans sidebar. En Step 3 :
1. L'approche "réserver l'espace" créait un trou moche au milieu (formulaire centré + sidebar collée au bord droit).
2. **Breakpoints désalignés** : sidebar visible à `lg:` (1024px) mais formulaire décalé à `xl:` (1280px) → **superposition** entre 1024-1280px.
3. `max-w-3xl` (768px) + marge 420px sur écran 1024px → formulaire coupé (604px disponibles seulement).

**Solution** : layout conditionnel selon l'étape + breakpoints alignés.
- **Steps 1/2/4** : conteneur **centré classique** (`max-w-3xl mx-auto`).
- **Step 3 desktop (≥ lg / 1024px)** : 
  - `max-w-none` (plus de contrainte max-width)
  - `ml-8 mr-[420px]` (formulaire occupe l'espace disponible entre marges)
  - Sidebar `fixed right-8 w-[360px]` (visible à `lg:` aussi)
  - → équilibre visuel propre, pas de superposition, layout "premium 2026"

**Fichiers modifiés** : `app/devis-gratuits-v3/page.tsx`

**Tracking** : aucun changement.

**Champs / Inputs** : aucun ajout/suppression.

**Back Office payload** : aucun changement.

---

## 2026-02-11 — Panier desktop premium "Vercel-level" (Step 3)

**Problème** : Le panier desktop (sidebar Step 3) manquait d'impact visuel et de hiérarchie. L'affichage était plat, sans différenciation claire entre le budget affiné (le plus important) et les autres éléments.

**Solution** : Refonte complète du panier desktop pour un rendu **premium / Vercel-level** avec hiérarchie visuelle forte, animations fluides et micro-interactions.

### Changements visuels

#### Container principal
- **Avant** : `rounded-2xl`, padding `p-6`, shadow générique
- **Après** :
  ```tsx
  rounded-3xl bg-white/90 backdrop-blur-xl
  border border-white/40
  shadow-[0_20px_60px_rgba(0,0,0,0.12)]
  p-8 space-y-6
  right-8 (au lieu de right-0)
  w-[360px] (au lieu de [300px])
  ```
- **Impact** : effet glassmorphism renforcé, spacing généreux, shadow premium

#### Header
- **Nouveau** : titre "Votre estimation" + dot animé turquoise (`animate-pulse`)
- **Impact** : dynamisme et attention visuelle

#### Budget affiné (section principale)
- **Avant** : simple card avec `bg-[#6BCFCF]/5`, texte 3xl
- **Après** :
  ```tsx
  // Container avec gradient + glow effect
  bg-gradient-to-br from-[#6BCFCF]/10 via-[#A8E8E8]/5 to-transparent
  border-2 border-[#6BCFCF]/30
  shadow-[0_8px_32px_rgba(107,207,207,0.15)]
  
  // Glow bubble décoratif
  absolute top-0 right-0 w-32 h-32 bg-[#6BCFCF]/10 rounded-full blur-3xl
  
  // Montant principal
  text-5xl font-black (au lieu de 3xl)
  tracking-tight transition-all duration-300 drop-shadow-sm
  
  // Min/Max
  text-lg font-black (au lieu de sm font-semibold)
  couleurs: #10B981 (vert) / #EF4444 (rouge)
  border-t separator entre montant et min/max
  ```
- **Impact** : effet "héro" sur le budget principal, hierarchy ultra-claire, animations fluides

#### Ajustements (lignes)
- **Avant** : simple liste avec `space-y-2`
- **Après** :
  ```tsx
  // Separator élégant avec gradient
  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E3E5E8] to-transparent" />
  
  // Chaque ligne
  group flex items-center justify-between gap-3
  p-3 rounded-xl
  bg-white/50 border border-[#E3E5E8]/50
  hover:border-[#6BCFCF]/30 hover:bg-white/80
  transition-all duration-200
  
  // Dot coloré par type
  w-1 h-1 rounded-full (rouge si +, vert si -, gris si neutre)
  
  // Icon help au hover
  opacity-0 group-hover:opacity-100 transition-opacity
  
  // Montants
  text-base font-black (au lieu de sm semibold)
  couleurs: #EF4444 (rouge) / #10B981 (vert)
  ```
- **Impact** : feedback hover premium, micro-interactions, couleurs expressives

#### Première estimation (collapsible)
- **Nouveau** : élément `<details>` avec design subtil
- **Avant** : affichage plein écran
- **Après** :
  ```tsx
  // Summary (fermé)
  bg-[#F8F9FA] hover:bg-[#F1F2F4]
  text-2xl font-black text-[#1E293B]/60 (montant désaccentué)
  icône chevron rotate-180 au clic
  
  // Contenu (ouvert)
  grid 2 colonnes (min/max)
  bg-green-50/50 / bg-red-50/50
  text petit + note hypothèses
  ```
- **Impact** : hiérarchie claire (budget affiné > ajustements > première estimation), économie d'espace, design "archive"

### Fichiers modifiés
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` (lignes 1061-1220)

### Tracking
- **Aucun changement** : design uniquement

### Champs / Inputs
- **supprimés** : AUCUN
- **ajoutés** : AUCUN
- **modifiés** : apparence visuelle uniquement

### Back Office payload
- **changements** : AUCUN

---

## 2026-02-11 — Application Design System Moverz 2026 (cohérence visuelle complète)

**Problème** : Le tunnel avait un style propre mais n'était pas aligné avec le guide de Design System du site principal Moverz. Il manquait de cohérence sur : glassmorphism, gradients, shadows, hover effects, spacing, etc.

**Solution** : Application **complète** du guide de Design System Moverz 2026 sur tous les composants du tunnel pour une expérience visuelle cohérente et premium.

### Changements (8 catégories)

#### 1️⃣ **CTAs (Gradients + Shadows + Hover Effects)**
- **Avant** : `bg-[#0F172A]`, `rounded-full`, `hover:bg-[#1E293B]`, `transition-all`
- **Après** : 
  ```tsx
  bg-gradient-to-r from-[#0F172A] to-[#1E293B]
  rounded-xl (au lieu de rounded-full)
  shadow-[0_4px_16px_rgba(15,23,42,0.3)]
  hover:shadow-[0_8px_24px_rgba(15,23,42,0.4)]
  hover:scale-[1.02]
  transition-all duration-200
  disabled:opacity-40 disabled:hover:scale-100
  ```
- **Impact** : tous les boutons principaux (Step 1, 2, 3) ont maintenant un look premium avec micro-animations

#### 2️⃣ **Cards Principales (Glassmorphism)**
- **Avant** : `bg-white`, `rounded-3xl`, `p-5`, `shadow-sm`
- **Après** :
  ```tsx
  bg-white/90 backdrop-blur-xl
  shadow-[0_8px_32px_rgba(0,0,0,0.08)]
  border border-white/40
  p-8 (au lieu de p-5)
  ```
- **Impact** : effet verre givré moderne sur toutes les cards conteneurs principales (Steps 1-4)

#### 3️⃣ **Cards Secondaires (Shadows + Backdrop-blur)**
- **Avant** : `bg-white`, `border border-[#E3E5E8]`, `p-4`, sans shadow custom
- **Après** :
  ```tsx
  bg-white/95 backdrop-blur-sm
  shadow-[0_4px_16px_rgba(0,0,0,0.04)]
  p-6 (au lieu de p-4)
  ```
- **Impact** : amélioration subtile des shadows et profondeur visuelle sur toutes les cards internes (adresses, densité, cuisine, formules, contact, sidebar desktop, récap Step 4)

#### 4️⃣ **Inputs (Ring Offset + Opacity)**
- **Avant** : `focus:ring-2 focus:ring-[#6BCFCF]/20`
- **Après** :
  ```tsx
  focus:ring-2 focus:ring-[#6BCFCF]/40 focus:ring-offset-2
  ```
- **Impact** : ring focus plus visible et mieux séparé du champ (tous les inputs : surface, adresses, équipements, prénom, email)

#### 5️⃣ **Badges (Gradients + Borders)**
- **Avant** : `bg-green-50`, border simple
- **Après** :
  ```tsx
  bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10
  border border-[#10B981]/30
  shadow-sm
  ```
- **Impact** : badges "Dossier créé" (Step 4) et "Recommandé" (formules) plus élégants

#### 6️⃣ **Hover Effects sur Cards Cliquables**
- **Avant** : `transition-all`, hover subtil
- **Après** :
  ```tsx
  transition-all duration-300
  hover:scale-[1.02]
  hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]
  ```
- **Impact** : feedback tactile sur toutes les cards interactives (densité, cuisine, formules)

#### 7️⃣ **Icons (Backgrounds en Gradient)**
- **Avant** : icons seuls (MapPin, Calendar, Home, User, Mail, Phone, FileText)
- **Après** : icons enveloppés dans des containers avec gradients
  ```tsx
  // Système 3 couleurs progressives
  // Turquoise (Step 1 + contact)
  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6BCFCF]/10 to-[#A8E8E8]/10 shadow-sm">
    <Icon className="w-5 h-5 text-[#6BCFCF]" strokeWidth={2} />
  </div>
  // Violet (estimation Step 2)
  from-[#8B5CF6]/10 to-[#A78BFA]/10, text-[#8B5CF6]
  // Vert (accès Step 3)
  from-[#10B981]/10 to-[#34D399]/10, text-[#10B981]
  ```
- **Impact** : hiérarchie visuelle colorée et cohérente à travers tout le tunnel

#### 8️⃣ **Spacing & Transitions**
- **Spacing** : padding des cards principales augmenté (`p-5` → `p-8`)
- **Transitions** : ajout de `duration-200` ou `duration-300` partout où il manquait

### Fichiers modifiés
- `app/devis-gratuits-v3/page.tsx` (cards principales Steps 1-4)
- `components/tunnel/v2/StepQualificationV2.tsx` (CTA + icon)
- `components/tunnel/v2/StepEstimationV2.tsx` (CTA + cards)
- `components/tunnel/v2/StepAccessLogisticsV2.tsx` (CTA + cards + inputs + badges + hover + icons)
- `components/tunnel/v2/StepContactPhotosV2.tsx` (cards + badges + icons)
- `components/tunnel/AddressAutocomplete.tsx` (input focus ring)

### Palette couleurs utilisée
```tsx
// Primaires
#0F172A (slate-900) - Texte principal, fonds dark
#1E293B (slate-800) - Variation gradients
#6BCFCF - Turquoise principal (brand)
#A8E8E8 - Turquoise clair

// Progressives (étapes/features)
#6BCFCF - Turquoise (Step 1, contact)
#8B5CF6 - Violet (Step 2, récap)
#10B981 - Vert émeraude (Step 3, validation)
#A78BFA - Violet clair (gradients)
#34D399 - Vert clair (gradients)
```

### Breakpoints & responsive
- Aucun changement responsive
- Tous les changements sont mobile-first
- Desktop/mobile cohérents

### Tracking
- **Aucun impact** : zéro changement sur les events GA4 / logicalStep / screenId

### Champs / Inputs
- **supprimés** : AUCUN
- **ajoutés** : AUCUN
- **modifiés** : apparence visuelle uniquement (Design System)

### Back Office payload
- **changements** : AUCUN

---

## 2026-02-11 — Navigation retour simplifiée (rollback)

**Décision** : retour au comportement simple et prévisible pour le bouton "← Modifier".

**Comportement actuel** :
- Step 2 → Step 1
- Step 3 → Step 2
- Step 4 → Step 3

**Code** : `onClick={() => goToStep((state.currentStep - 1) as 1 | 2 | 3 | 4)}`

**Note** : Le champ `enteredAtStep` a été ajouté dans `TunnelFormState` mais n'est pas utilisé actuellement (réservé pour usage futur si besoin).

**Fichiers modifiés** :
- `app/devis-gratuits-v3/page.tsx` : bouton "← Modifier" simplifié
- `migration_v4.md` : documentation mise à jour

---

## 2026-02-11 — Distance unifiée OSRM partout (API + Step 2 + Step 3)

**Problème** : les montants "Première estimation" (Step 2, Step 3 sidebar, moverz.fr)
ne correspondaient pas entre eux. Cause racine : 3 méthodes de calcul de distance différentes :
- API `/api/estimate` : heuristique CP (ex. Paris→Marseille = 1005 km, réalité ≈ 779 km)
- Step 2 / Step 3 baseline : Haversine vol d'oiseau (≈ 660 km)
- Step 3 "Budget affiné" : OSRM route réelle (≈ 779 km)

**Solution** : tout unifier sur **OSRM (route réelle)** + buffer de +15 km pour les estimations
(le client a une "bonne surprise" quand il entre ses vraies adresses).

### Changements

| Endroit | Avant | Après |
|---|---|---|
| API `/api/estimate` | Heuristique CP (serveur) | BAN géocodage → OSRM (serveur) + 15 km |
| Step 2 | `estimateCityDistanceKm()` (Haversine/CP) | `cityOsrmDistanceKm + 5` |
| Step 3 "1ère estimation" | `estimateCityDistanceKm()` (Haversine/CP) | `cityOsrmDistanceKm + 5` |
| Step 3 "Budget affiné" | `routeDistanceKm` (OSRM adresses) | inchangé |

### `cityOsrmDistanceKm` (nouveau state)
- Capturé depuis `routeDistanceKm` tant que `currentStep < 3` (coords = ville)
- Figé une fois en Step 3 (ne bouge plus quand les adresses exactes arrivent)
- Si arrivée directe en Step 3 (moverz.fr), capture la 1ère valeur OSRM puis fige

### API `/api/estimate` — OSRM côté serveur
- Accepte désormais `originLat/originLon/destinationLat/destinationLon` (optionnel)
- Si pas de coords : géocode via BAN (`api-adresse.data.gouv.fr`)
- Appelle OSRM (`router.project-osrm.org`) pour distance route
- Fallback heuristique CP si BAN/OSRM échouent
- Retourne `distanceProvider: "osrm" | "heuristic"` pour debug

### Code supprimé
- `estimateDistanceKm()` (Haversine + heuristique CP)
- `v2CityCoordsRef` (capture coords ville pour Haversine)
- `estimateCityDistanceKm()` (wrapper)

---

## 2026-02-11 — Responsive "best-in-class" (mobile / desktop)

**Objectif** : rendre le code responsive clair, cohérent et facilement modifiable.

### Breakpoints harmonisés
Avant : mélange de `sm`, `md`, `xl` sans logique. Maintenant **2 breakpoints seulement** :
| Breakpoint | Tailwind | Usage |
|---|---|---|
| `sm:` | ≥ 640px | Grilles 2-3 colonnes (densité, cuisine, formules, adresses) |
| `lg:` | ≥ 1024px | Sidebar panier visible, CTA statique, container décalé |

**Règle** : ne jamais utiliser `md:` ni `xl:` dans les composants tunnel.

### Tableau contraintes d'accès responsive
- **Desktop (≥ sm)** : tableau classique `grid-cols-[1fr,120px,120px]`
- **Mobile (< sm)** : cards verticales par contrainte, layout `flex` avec séparateur → **plus d'overflow horizontal**

### Sidebar panier abaissée (xl → lg)
- Sidebar visible à `lg:` (1024px) au lieu de `xl:` (1280px) → plus de "trou" entre md et xl.
- Container (`app/devis-gratuits-v3/page.tsx`) : **centré** par défaut, et en **Step 3 uniquement** on réserve l’espace de la sidebar desktop (fixed) via :
  - `lg:max-w-[calc(48rem+392px)]` (48rem = `max-w-3xl`)
  - `lg:pr-[392px]` (392 = `w-[360px]` + `right-8`)
  → évite le chevauchement **sans** décentrer les Steps 1/2/4 sur desktop.
- Budget bar sticky : masquée à `lg:` (quand sidebar desktop visible).

### CTA sticky + safe-area
- `pb-[env(safe-area-inset-bottom,8rem)]` remplace le hack `pb-32` → fonctionne sur iPhone avec barre Home.
- `pb-[max(1rem,env(safe-area-inset-bottom))]` sur le CTA lui-même.

### Design tokens tunnel
Ajout dans `tailwind.config.ts` sous `colors.tunnel` :
```
tunnel-navy, tunnel-slate, tunnel-teal, tunnel-teal-dk,
tunnel-teal-bg, tunnel-teal-bg2, tunnel-border, tunnel-bg,
tunnel-error, tunnel-price-lo, tunnel-price-hi
```
Migration progressive : les hex inline seront remplacés par ces tokens au fil des itérations.

**Fichiers modifiés** : `StepAccessLogisticsV2.tsx`, `StepContactPhotosV2.tsx`, `page.tsx`, `tailwind.config.ts`.

---

## 2026-02-11 — Formule unifiée Step 2 / Step 3 / API

**Problème** : le prix affiché en Step 2 (toujours STANDARD) ne correspondait pas au prix en Step 3 quand l'utilisateur avait choisi une autre formule.

**Solution** : `state.formule` est maintenant utilisé partout :
- **Step 2** (`activePricingStep2`) : utilise `state.formule` (STANDARD par défaut, mais si l'utilisateur revient de Step 3 après avoir changé, le prix reflète le choix).
- **Step 3 panier** : le baseline "Première estimation" utilise `state.formule` au lieu de forcer STANDARD. La ligne "Formule" séparée dans les ajustements est supprimée (la formule est intégrée au baseline).
- **API `/api/estimate`** : accepte un param optionnel `formule` (défaut STANDARD) → `GET /api/estimate?...&formule=PREMIUM`.

**Fichiers modifiés** : `page.tsx`, `StepEstimationV2.tsx`, `StepAccessLogisticsV2.tsx`, `app/api/estimate/route.ts`.

---

## 2026-02-11 — Nouveau sélecteur de date (mois → jour + indicateur saisonnalité)

**Fichier modifié** : `components/tunnel/DatePickerFr.tsx`

**UX** :
1. L'utilisateur clique sur le champ date → une popup s'ouvre en **phase "mois"** : 12 mois affichés en grille 3×4.
2. Chaque mois est coloré selon la saisonnalité prix :
   - 🟢 **Vert clair** (basse saison `×0.85`) : janvier, février, novembre → tarifs réduits
   - 🔴 **Rouge clair** (haute saison `×1.3`) : juin, juillet, août, septembre, décembre → tarifs majorés
   - ⚪ **Neutre** : mars, avril, mai, octobre
3. L'utilisateur sélectionne un mois → **phase "jours"** : grille classique des jours du mois choisi. Un badge contextuel ("📈 Haute saison" / "📉 Basse saison") s'affiche en haut.
4. Bouton "← Mois" pour revenir à la sélection du mois.
5. Le composant garde la même interface (`id`, `value`, `onChange`, `min`, `error`) → **aucun changement** dans `StepAccessLogisticsV2.tsx`.

**Données saisonnalité** : alignées sur `getSeasonFactor()` dans `page.tsx` (mêmes mois, mêmes coefficients).

---

## 2026-02-11 — Intégration moverz.fr ↔ Tunnel (API estimate + deep link Step 3)

**Objectif** : permettre à la homepage `moverz.fr` d'afficher une estimation budget à partir de 3 champs (origine, destination, surface), puis de rediriger vers le tunnel Step 3 avec les champs pré-remplis.

### 1) Endpoint `GET /api/estimate`
- **Route** : `app/api/estimate/route.ts`
- **Params** : `originPostalCode`, `destinationPostalCode`, `surface` (m²)
- **Retour** : `{ prixMin, prixMax, prixCentre, volumeM3, distanceKm, formule: "STANDARD" }`
- **Hypothèses** : mêmes que Step 2 du tunnel (dense, cuisine 3 appareils, pas de saison, accès RAS, formule STANDARD).
- **Distance** : heuristique départementale (pas de GPS côté home).
- **CORS** : à configurer dans `next.config.ts` si moverz.fr est sur un domaine différent.

### 2) Deep link vers Step 3
- **URL type** : `/devis-gratuits-v3?step=3&originPostalCode=75011&originCity=Paris&destinationPostalCode=13001&destinationCity=Marseille&surfaceM2=60&movingDate=2026-06-15`
- **Comportement** : si `?step=3` est présent, le tunnel hydrate son state depuis les query params et démarre directement en Step 3.
- **Params supportés** : `originPostalCode`, `originCity`, `destinationPostalCode`, `destinationCity`, `surfaceM2`, `movingDate`.
- **Fichier modifié** : `app/devis-gratuits-v3/page.tsx` (useEffect d'hydratation).

### 3) Côté moverz.fr (repo séparé)
- Ajouter un mini formulaire (3 champs : villes départ/arrivée + surface).
- Appeler `GET /api/estimate?…` pour afficher le budget.
- CTA "Affiner mon budget" → redirige vers le deep link Step 3.

### Fichiers ajoutés/modifiés
- **Ajouté** : `app/api/estimate/route.ts`
- **Modifié** : `app/devis-gratuits-v3/page.tsx`

---

## 2026-02-11 — Choix formule déplacé de Step 2 vers Step 3

- **Décision** : déplacer le sélecteur de formule (Éco/Standard/Premium) de l'écran estimation (Step 2) vers l'écran accès/logistique (Step 3), entre "Options supplémentaires" et "Où recevoir vos devis".
- **Step 2** : affiche désormais uniquement le prix basé sur la formule **Standard** (par défaut), avec mention "Estimation basée sur la formule Standard — vous pourrez changer à l'étape suivante."
- **Step 3** : le bloc formule est affiché avec les 3 cartes (Éco / Standard recommandé / Premium) et leurs fourchettes de prix respectives.
- **Panier (desktop + mobile)** : la première estimation est calculée sur STANDARD. Une nouvelle ligne **"Formule"** affiche le delta quand l'utilisateur change de formule. La ligne est toujours "confirmée" (STANDARD par défaut = delta 0).
- **Changements UI** :
  - `StepEstimationV2` : bloc sélection formule supprimé, props `pricingByFormule`/`selectedFormule`/`onFormuleChange` retirées.
  - `StepAccessLogisticsV2` : nouvelles props `selectedFormule`, `onFormuleChange`, `pricingByFormule` + bloc formule inséré + ligne panier "Formule" avec tooltip.
- **Tracking** : aucun changement.
- **Champs / Inputs** : aucun champ supprimé, aucun champ ajouté.
- **Back Office payload** : aucun changement (la formule est toujours envoyée).
- **Fichiers modifiés** :
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

---

## 2026-02-11 — Grand nettoyage du repo

**Contexte** : staging promu en main, le tunnel V2 (feature flag `NEXT_PUBLIC_FUNNEL_V2`) est devenu la seule version live. Nettoyage du code zombie.

### Supprimé
- **Feature flag `NEXT_PUBLIC_FUNNEL_V2`** : supprimé du code, du Dockerfile, et de `next.config.ts`. Le parcours V2 est désormais le seul chemin.
- **Pages mortes** : `devis-gratuits-v2/`, `devis-gratuits-experiments/`, `widget-test/`, `upload-photos/`, `CameraCapture.tsx`
- **Composants morts** : `Step1Contact`, `Step2Project`, `Step2ProjectComplete`, `Step3VolumeServices`, `ConfirmationPage`, `TunnelHero`, `TrustSignals`, `PricingRibbon`, `WhatsAppCTA`
- **Code conditionnel** dans `devis-gratuits-v3/page.tsx` : tous les `if (isFunnelV2)` / ternaires simplifiés → uniquement le chemin V2.
- **Ancien flow handlers** : `handleSubmitStep1`, `handleSubmitStep2`, `handleSubmitStep3` (remplacés par `handleSubmitQualificationV2`, `handleSubmitEstimationV2`, `handleSubmitAccessV2`, `handleSubmitContactV2`).

### Impact
- **~11 000 lignes supprimées** au total.
- Composants vivants : `PremiumShell`, `DatePickerFr`, `PriceRangeInline`, `AddressAutocomplete`, `v2/StepQualificationV2`, `v2/StepEstimationV2`, `v2/StepAccessLogisticsV2`, `v2/StepContactPhotosV2`, `v2/V2ProgressBar`.

---

## Flux données Tunnel → Back Office (synthèse)

> Le tunnel live est **`app/devis-gratuits-v3/page.tsx`** (seul tunnel dans le repo).
> Les appels HTTP vers le Back Office sont centralisés dans **`lib/api/client.ts`**.

| Étape | Endpoint BO (public) | Méthode | Données clés |
|-------|----------------------|---------|--------------|
| Création lead | `/public/leads` | POST | `firstName` (requis), `email` (requis), `lastName`, `phone`, `source` |
| MAJ progressive (chaque step) | `/public/leads/:id` | PATCH (via proxy `/api/backoffice/leads/:id`) | Adresses (origin/dest), date, volume, surface, formule, prix min/avg/max, accès (étage, ascenseur, portage…), `tunnelOptions` (JSON structuré) |
| Inventaire AI (photos) | `/public/leads/:id/inventory` | POST | `items[]`, `excludedInventoryIds[]`, `photosByRoom[]` |
| Upload photos | `/public/leads/:id/photos` | POST (multipart) | Fichiers photos |
| Confirmation email | `/public/leads/:id/request-confirmation` | POST | — (retry auto si DOCS_NOT_READY) |
| Relance photos | `/public/leads/:id/send-photo-reminder` | POST | — |
| Tracking analytics | `/public/tunnel-events` | POST | `sessionId`, `leadTunnelId`, `leadId`, `eventType`, `logicalStep`, `screenId`, `email`, `extra` |

### Champs envoyés au PATCH (`UpdateBackofficeLeadPayload`)

- **Contact** : `firstName`, `lastName`, `email`, `phone`
- **Adresses** : `originAddress/City/PostalCode/CountryCode`, `destAddress/City/PostalCode/CountryCode`
- **Dates** : `movingDate` (ISO), `dateFlexible`
- **Volume** : `surfaceM2`, `estimatedVolume`, `density` (LIGHT/MEDIUM/HEAVY)
- **Formule & Prix** : `formule` (ECONOMIQUE/STANDARD/PREMIUM), `estimatedPriceMin/Avg/Max`, `estimatedSavingsEur`
- **Logement origine** : `originHousingType`, `originFloor`, `originElevator`, `originFurnitureLift`, `originCarryDistance`, `originParkingAuth`
- **Logement destination** : `destHousingType`, `destFloor`, `destElevator`, `destFurnitureLift`, `destCarryDistance`, `destParkingAuth`
- **Photos / AI** : `photosUrls`, `aiEstimationConfidence`
- **Options tunnel** : `tunnelOptions` (JSON libre — pricing, access, services, notes…)

### Variables d'environnement côté tunnel

- `NEXT_PUBLIC_API_URL` — URL de base du Back Office (ex: `https://moverz-backoffice.gslv.cloud`). Normalisée automatiquement (retrait `/api` ou `/public` si présent).

---

*(journal historique ci-dessous)*

> **Règle**: ce fichier doit être mis à jour **à chaque modification de code** liée au tunnel (UI, tracking, mapping payload, copy, étapes) et **à chaque décision** (même petite).
>
> **Interdits** (staging V4):
> - **Aucune migration Prisma / aucun changement DB schema** (`prisma/schema.prisma`, `prisma/migrations/**`).
> - **Aucune suppression de champs** existants côté tunnel (les champs actuellement disponibles pour les clients doivent rester disponibles).
> - **Pas de modification directe de `main`**.
>
> **Note**: des champs UI supplémentaires peuvent être prototypés **uniquement** s’ils sont clairement marqués “non connectés” côté front **et** s’ils ne sont pas envoyés au Back Office.

---

## 0) Contexte

> **⚠️ Clarification nommage** : le tunnel live est dans **`app/devis-gratuits-v3/page.tsx`**.
> Il n'existe **aucun** dossier `devis-gratuits-v4`. Le nom "V4" dans ce fichier (`migration_v4.md`)
> désigne la **4e itération UX/UI** du tunnel, implémentée directement dans le code "v3".
> C'est le seul tunnel actif dans le repo. Toutes les anciennes versions (v2, experiments, etc.)
> ont été supprimées le 2026-02-11.

- **Route live** : `/devis-gratuits-v3` → `app/devis-gratuits-v3/page.tsx`
- **Redirect** : `/devis-gratuits` redirige vers `/devis-gratuits-v3`
- **Branche**: `staging` (promu en `main`)
- **Déploiement**: CapRover — tests uniquement en conditions réelles
- **Objectif**: refonte UX/UI **sans** changer les champs / formules (sauf prototype explicitement non connecté)

---

## 1) Changelog (ordre chronologique)

### 2026-02-09 — Dernière étape (V2/V3) : suppression complète des photos + écran Félicitations

- **Date**: 2026-02-09
- **Statut**: implémenté (front)
- **Décision**: retirer **totalement** la notion de photos (WhatsApp + upload) sur la dernière étape et la remplacer par un écran simple :
  - (1) **Bravo**
  - (2) **Merci de confirmer votre adresse email** (affiche l’email saisi) + message “Vous avez reçu un mail de confirmation”
  - (3) **Récapitulatif du dossier**
- **Tracking**:
  - V2 : Step 4 passe de `logicalStep=PHOTOS / screenId=photos_v2` à `logicalStep=THANK_YOU / screenId=confirmation_v2` (screenId explicite lié à l’écran).
  - V3 : conserve `logicalStep=THANK_YOU / screenId=confirmation_v3` (écran confirmation).
- **Tracking (complétion)**: `TUNNEL_COMPLETED` utilise désormais `screenId=confirmation_v2` en V2 (au lieu de `confirmation_v3`).
- **Back Office payload**:
  - suppression de l’envoi de `estimatedSavingsEur` (on retire aussi toute “économie générée” côté UI).
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepContactPhotosV2.tsx`
  - `components/tunnel/ConfirmationPage.tsx`
  - `app/devis-gratuits-v3/page.tsx`
- **Notes impl**: `ConfirmationPage` (V3) affiche le même contenu “Bravo / email / récap” que la V2 et ne propose plus aucun envoi de photos.
- **Tech**: correction typage index `stepMap` (TS) dans `app/devis-gratuits-v3/page.tsx` (pas d’impact UX).

### 2026-02-06 — Refonte étape photos : vraiment optionnelle, sans discount/culpabilisation

- **Date**: 2026-02-06
- **Auteur**: (UX stratégique)
- **Décision**: rendre l'étape photos vraiment optionnelle sans culpabilisation. Problème actuel : personne ne prend de photos, et le message "Vous économisez X€" fait penser aux clients que sans photos ce n'est pas ok. Solution : retirer discount, ajouter bouton clair "Terminer sans photos".
- **Changements UI**:
  - Titre modifié : "Envoyez des photos (optionnel)" au lieu de "Photographiez toutes vos pièces"
  - **Suppression totale** du bloc "Vous économisez X€ en envoyant vos photos"
  - **Suppression du mockup iPhone WhatsApp** (trop visuel, trop poussé)
  - Layout simplifié : centré, max-w-3xl (au lieu de grid 2 colonnes avec iPhone)
  - **CTA principal** : "Terminer et recevoir mes devis" (bouton noir, primaire)
  - Photos reléguées après séparateur "Ou envoyer des photos maintenant"
  - **WhatsApp complètement retiré** : aucun usage de WhatsAppCTA sur cette page
  - Un seul bouton upload simple (desktop + mobile)
  - Copy adapté : valorise les photos ("devis plus précis, moins de surprises") tout en restant rassurant ("vous recevrez vos devis dans tous les cas")
  - Section "Prochaines étapes" mise à jour pour refléter le caractère optionnel
  - Affichage simple de l'estimation actuelle (sans pression)
- **Tracking**:
  - Aucun changement de tracking (même logicalStep: THANK_YOU, même screenId: confirmation_v3)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés (UX only): copy et structure visuelle de ConfirmationPage
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Clarté du message "optionnel" sur mobile
  - Égalité visuelle entre "Envoyer photos" et "Terminer sans photos" (pas de hiérarchie culpabilisante)
  - Taux de conversion/skip : observer si plus d'utilisateurs terminent le tunnel
  - Lien "Terminer sans photos" redirige vers moverz.fr (à valider si besoin d'une autre page)

### 2026-02-06 — Clarification label superficie (garages et dépendances inclus)

- **Date**: 2026-02-06
- **Auteur**: (UX copy)
- **Décision**: ajouter la mention "garages et dépendances inclus" au label de superficie pour clarifier l'attente.
- **Changements UI**:
  - Label modifié de "Surface approximative (m²)" vers "Surface approximative (m²) - garages et dépendances inclus"
  - Impacté dans : Step3VolumeServices.tsx (V3) et devis-gratuits-v2/page.tsx (V2)
- **Tracking**:
  - Aucun changement
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés (UX only): label `surfaceM2` uniquement (texte affiché)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Lisibilité mobile du label plus long
  - Clarté du message pour l'utilisateur

### 2026-02-06 — Step 1 (V2) : autocomplete villes fiabilisé (tri FR + blur/Enter + affichage CP)

- **Date**: 2026-02-06
- **Auteur**: (audit UX)
- **Problème**:
  - Autocomplete “Ville d’arrivée / départ” perçu comme dysfonctionnel: entrées courtes (ex: *Lyon*) non résolues en blur, sélection à l’aveugle en cas d’homonymes (ex: *Mérignac*), et résultats FR parfois masqués par le tri.
- **Décisions / Correctifs**:
  - `AddressAutocomplete`:
    - tri des résultats: **France prioritaire** (bug de tri inversé)
    - blur: en mode `kind="city"`, accepter dès **3 caractères** (au lieu de 5)
    - blur: ne pas auto-sélectionner une ville **ambiguë** (plusieurs résultats) sans indice (ex: CP)
    - clavier: `Enter` sélectionne la **première suggestion** si aucune n’est surlignée
  - `StepQualificationV2`: afficher l’input sous forme **“Ville (CP)”** quand le CP est connu (meilleure lisibilité, moins d’erreurs silencieuses).
  - Copy Step 1: libellé surface → **“Surface approximative, garages et dépendances inclues (m2)”**.
  - Copy Step 1: baseline → **“Gratuit • Sans engagement • 2 minutes”**.
  - Step 3 (V2): ajout du choix **densité** (light/normal/dense) après la sélection logement (impacte l’estimation via `state.density`).
  - Step 3 (V2): ajout **Cuisine / électroménager** (connecté) :
    - choix: none / appliances / full
    - appliances: quantité × **0,6 m³**
    - full: **+6 m³**
    - impacte le volume/prix via `extraVolumeM3` et est **archivé côté Back Office** dans `tunnelOptions.volumeAdjustments` (JSON) **sans migration DB**.
  - UI: Densité + Cuisine sont rattachés visuellement au **logement de départ** et affichés **l’un au-dessus de l’autre** (pile), avec des choix internes en grille sur desktop.
  - Panier (Step 3 V2) refondu:
    - En haut: **Première estimation** (villes +20 km, densité=très meublé, cuisine=3 équipements, pas de saison, accès RAS)
    - Lignes (deltas): **Distance** (adresses OSRM vs villes), **Densité**, **Cuisine**, **Date** (coef sur base), **Accès**
    - En bas: **Budget affiné**
    - Règle: le delta **Distance** ne s’applique que quand **les 2 adresses** sont renseignées (sinon on reste sur “villes +20 km” et delta=0).
  - Alignement: l’estimation **Step 2 (V2)** utilise désormais les **mêmes hypothèses** que “Première estimation” en Step 3.
  - Fix: en Step 1 (V2), la saisie de surface marque `surfaceTouched=true` pour éviter que changer “Maison/Appartement” en Step 3 écrase la surface via les defaults.
  - **Règle “champs à zéro tant que non touchés” (Step 3 V2)**:
    - UI: **aucune pré-sélection** sur **Densité** et **Cuisine** en arrivant en Step 3.
    - Calcul (hypothèses par défaut): tant que non touché, on suppose **Densité=très meublé** et **Cuisine=3 équipements**.
    - Panier: les lignes **Densité** / **Cuisine** restent à **0€** tant que l’utilisateur n’a pas fait un choix (status “par défaut …”).
    - Accès: tant que non touché, on reste sur l’hypothèse “RAS” (pas d’impact prix).
  - **Règles accès — Étages sans ascenseur (Step 3 V2 / pricing engine)**:
    - RDC: 0
    - 1er: +5%
    - 2e: +10%
    - 3e: +15%
    - ≥4: **flag monte-meuble** (ajouté automatiquement au pricing si pas déjà inclus)
  - **Règles accès — surcoûts “accès difficile”** (pricing engine):
    - **Portage > 10 m**: +5% sur le total (hors services)
    - **Petit ascenseur / passages étroits**: +5% sur le total (hors services)
    - **Stationnement compliqué**: +3% sur le total (hors services)
    - **Besoin d’un monte-meuble**: +200€ (et auto si ≥4 sans ascenseur)
- **Tracking**:
  - Aucun changement (pas de modification de `logicalStep` / `screenId`).
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `hooks/useTunnelState.ts`
  - `lib/pricing/calculate.ts`
  - `app/devis-gratuits-v3/page.tsx`
  - `components/tunnel/Step2ProjectComplete.tsx`

### 2026-02-06 — Step 2 (V3) : contraintes d’accès en tableau “Départ / Arrivée” (boutons “Oui” uniquement)

- **Décision**: simplifier l’UI des contraintes: remplacer les toggles Oui/Non par une grille à 2 colonnes (**Départ** / **Arrivée**) avec uniquement des boutons **“Oui”** (toggle).
- **Règles**:
  - Cliquer “Oui” sur une colonne force l’accès correspondant à **Contraint** si ce n’est pas déjà le cas.
  - “Arrivée” est désactivé si `destinationUnknown=true`.
- **Champs**: aucun champ supprimé (réutilise `origin/destination*CarryDistance`, `*TightAccess`, `*FurnitureLift`, `*ParkingAuth`).
- **Fichier**: `components/tunnel/Step2ProjectComplete.tsx`

### 2026-02-06 — Step 3 (V2) : adresses regroupées (départ + arrivée)

- **Décision**: regrouper les 2 champs d’adresse (départ/arrivée) dans un seul bloc “Adresses”.
- **UI**:
  - Mobile: 1 colonne (Départ puis Arrivée)
  - Desktop: 2 colonnes (Départ / Arrivée)
- **Fichier**: `components/tunnel/v2/StepAccessLogisticsV2.tsx`

### 2026-02-06 — Step 3 (V2) : contraintes en tableau “Départ / Arrivée” (boutons “Oui” uniquement)

- **Décision**: remplacer les toggles Oui/Non (question par question) par un tableau **Départ / Arrivée** avec uniquement des boutons **“Oui”** (toggle).
- **Donnée**: pas de nouveaux champs — le côté (départ/arrivée) est sérialisé dans `access_details` (`__accessSidesV1=...`) et les bools existants restent la source envoyée/pricing (OR des deux côtés).
- **Fichier**: `components/tunnel/v2/StepAccessLogisticsV2.tsx`
- **Fix build staging**: ajout du prop `destinationUnknown` dans `StepAccessLogisticsV2Props` + passage depuis `app/devis-gratuits-v3/page.tsx` (sinon erreur TS en build).

### 2026-02-06 — Debug pricing (V2) : détail du calcul en Step 2 + distance OSRM visible en Step 3

- **Activation**: ajouter `?debug=1` à l’URL.
- **Step 2 (V2)**: affiche un bloc “Debug — détail du calcul” (distance baseline, band, rate, décote, volumeCost, distanceCost, socle, base, prixMin/Max…).
- **Step 3 (V2)**: affiche la **distance entre les deux adresses** directement sous le bloc “Adresses” (OSRM).
- **Fichiers**:
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-02-06 — Pricing : ajout d’une décote globale (Option A)

- **Décision**: ajouter une variable unique `DECOTE = -20%` (factor 0.8) pour baisser “le forfait de base” sans retoucher toutes les règles.
- **Application (Option A)**:
  - appliquée à `rateEurPerM3` (composante volume)
  - appliquée à `COEF_DISTANCE` (composante distance)
  - **non** appliquée à `PRIX_MIN_SOCLE` (socle)
  - **non** appliquée aux **services** (monte‑meuble, piano, etc.)
- **Fichiers**:
  - `lib/pricing/constants.ts`
  - `lib/pricing/calculate.ts`
  - `app/devis-gratuits-v3/page.tsx` (miroir détail)

### 2026-02-06 — Step 3 (V2) : baseline “villes +20km” stabilisée (distance)

- **Problème**: la baseline “villes” utilisait `estimateDistanceKm` qui bascule sur une distance Haversine dès que des coordonnées d’adresse existent → la baseline change quand on sélectionne une adresse, et le delta OSRM peut apparaître positif même si la distance “ressentie” baisse.
- **Fix**: nouvelle helper `estimateCityDistanceKm()` qui **ignore les coords** et se base uniquement sur les codes postaux. Utilisée pour:
  - Step 2 V2 (reward baseline)
  - Première estimation Step 3 V2 (“villes +20km”)
  - baseline figée au passage Step 2 → Step 3
- **Fichier**: `app/devis-gratuits-v3/page.tsx`

### 2026-02-06 — Step 3 (V2) : buffer baseline distance réduit (+15 km au lieu de +20 km)

- **Décision**: remplacer le buffer "villes +20 km" par **"villes +15 km"** dans les baselines Step 2/3 (V2).
- **Pourquoi**: éviter qu’entrer des adresses “réduise” la distance mais “augmente” le prix (baseline trop gonflée).
- **Fichier**: `app/devis-gratuits-v3/page.tsx`

### 2026-02-06 — Distance route (OSRM) : retry possible sur même paire de coords

- **Problème**: un échec OSRM pouvait bloquer définitivement la même paire de coords (guard `lastRouteKeyRef`), empêchant la ligne Distance de basculer en “adresses (OSRM)”.
- **Fix**: suppression du guard `lastRouteKeyRef` (le cache + deps du `useEffect` suffisent, et on peut retenter).
- **Fichier**: `app/devis-gratuits-v3/page.tsx`

### 2026-02-06 — Step 3 (V2) : distance “villes” plus réaliste (coords ville figées)

- **Problème**: l’heuristique CP (diff de départements) peut sur-estimer très fortement certaines routes (ex: 33 → 17) et créer des deltas Distance énormes.
- **Fix**: mémoriser les coords “ville” (Step 1/2) dans un `useRef` et utiliser ces coords (Haversine) pour la baseline “villes”, sans dépendre des coords d’adresse.
- **Garde-fou**: si aucune coord “ville” n’a été capturée (ex: saisie manuelle sans sélection), on fige une baseline à partir des **premières coords d’adresse** (Step 3) pour éviter l’heuristique CP trop grossière et les deltas Distance énormes.
- **Fichier**: `app/devis-gratuits-v3/page.tsx`

### 2026-02-03 — Ajout d'un CTA PayPal (lien de paiement) en fin de tunnel

- **Date**: 2026-02-03
- **Auteur**: (tunnel)
- **Décision**:
  - Ajouter un bouton PayPal **optionnel** sur l’écran de confirmation, pour permettre un test rapide via lien de paiement (sans intégration Checkout).
  - **Suite** (paiement robuste): privilégier un flux **Webhook PayPal → Back Office** (Option B) afin que la création/MAJ des enregistrements `Payment` se fasse côté Back Office (Postgres) et non côté tunnel.
- **Changements UI**:
  - Ajout d’un bouton **“Payer via PayPal”** sur `ConfirmationPage`, affiché uniquement si `NEXT_PUBLIC_PAYPAL_PAYMENT_URL` est défini.
- **Tracking**:
  - Aucun changement (pas de modification de `logicalStep` / `screenId`).
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Config CapRover: ajouter `NEXT_PUBLIC_PAYPAL_PAYMENT_URL` (build arg / env) et vérifier que le bouton apparaît.
  - Mobile-first: vérifier que les CTA restent visibles et cliquables sur mobile.

### 2026-01-28 — Audit V3 (prod) vs staging : DB renseignée + calculs (prix/distance)

- **Date**: 2026-01-28
- **Auteur**: (audit data)
- **Objectif**: permettre d’utiliser **uniquement `staging`** en garantissant que la **DB Back Office** est renseignée **comme en V3 prod** (mêmes champs + mêmes règles de calcul).
- **Périmètre analysé**:
  - Écritures Back Office: `createBackofficeLead` / `updateBackofficeLead` (tunnel V3) dans `app/devis-gratuits-v3/page.tsx`
  - Calculs prix/volume/distance: `lib/pricing/calculate.ts`, `lib/pricing/constants.ts` + logique distance dans `app/devis-gratuits-v3/page.tsx`
  - Note: la DB locale Prisma (SQLite `LeadTunnel`) existe via `/api/leads` mais **n’est pas utilisée** par le tunnel V3 (V3 écrit directement dans le Back Office).
- **DB Back Office — champs renseignés (V3)**:
  - **Step 1 (Contact)**: création/MAJ lead (prénom/email requis côté création) via `/public/leads`
  - **Step 2 (Projet)**: adresses + date + logement/accès (étages, ascenseur, etc.) + `tunnelOptions.access` (JSON)
  - **Step 3 (Estimation)**: `surfaceM2`, `estimatedVolume`, `density`, `formule`, `estimatedPriceMin/Avg/Max`, `estimatedSavingsEur` + `tunnelOptions` (pricing/access/services/notes…)
- **Constat clé (écarts staging vs V3 prod)**:
  - **Distance route (OSRM)**: en staging, l’appel `/api/distance` est **désactivé** (hotfix), donc `distanceProvider=fallback` et la distance passe par un **fallback heuristique** si pas de coords fiables (risque “placeholder”).
  - **Volume**: en staging, `TYPE_COEFFICIENTS` a été modifié **0.3 → 0.4** pour `studio`, `t4`, `t5`, `house*` ⇒ **volume estimé + prix** (et donc champs Back Office) **différents** de la prod.
- **Décisions à prendre (pour alignement strict sur V3 prod)**:
  - Revenir aux coefficients V3 prod (0.3) **ou** assumer la rupture et l’annoncer comme évolution (non alignée V3).
  - Réactiver OSRM (et corriger la cause de la boucle) **ou** documenter explicitement le fallback distance (et accepter la variance sur les prix).

### 2026-01-28 — Step 3 (V2) : adresse non pré-remplie + suggestions filtrées par CP

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: éviter de pré-remplir le champ “adresse” avec la ville/CP (source de confusion) et améliorer la pertinence des suggestions en filtrant par **code postal** quand disponible.
- **Changements UI**:
  - **StepAccessLogisticsV2**: labels dynamiques :
    - “Adresse de départ” → **“Votre adresse à {Ville} ({CP})”**
    - “Adresse d’arrivée” → **“Votre adresse à {Ville} ({CP})”**
  - Les inputs `originAddress` / `destinationAddress` ne sont plus initialisés par défaut à `"{CP} {Ville}"`.
- **Autocomplete**:
  - `AddressAutocomplete` accepte un contexte (`contextPostalCode`, `contextCity`, `contextCountryCode`)
  - Provider FR (BAN): ajout paramètre `postcode=` pour filtrer les résultats.
  - Provider World (Nominatim): ajout de `countrycodes=` (si fourni) + injection du CP dans la query pour prioriser.
  - **Filtre ville (Step 3)**: quand la ville est déjà connue, elle est injectée dans la requête (BAN+Nominatim) pour éviter des résultats hors ville.
  - **International (Step 3)**: si le pays sélectionné ≠ FR, on **bypass BAN** et on utilise Nominatim filtré par `countryCode` (évite des résultats USA pour une ville EU).
- **Tracking**:
  - Aucun impact.
- **Back Office payload**:
  - Aucun changement de champs; amélioration de la qualité des adresses saisies.
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`

### 2026-01-28 — Distance “route” réactivée (OSRM) pour éviter les distances placeholder

- **Date**: 2026-01-28
- **Auteur**: (data)
- **Décision**: réactiver le calcul de distance **par route** via `/api/distance` (OSRM) au lieu de dépendre du fallback heuristique (risque de prix faux).
- **Changements**:
  - `app/devis-gratuits-v3/page.tsx`: le `useEffect` distance route relance l’appel `/api/distance` (debounce ~300ms) et mémorise la dernière paire de coords (`lastRouteKeyRef`) pour éviter les relances inutiles.
- **Impact**:
  - `distanceKm` dans `tunnelOptions.pricing` (Back Office) reflète une distance **route** quand possible.
  - Le fallback reste uniquement en cas d’échec provider / coords manquantes.
- **Tracking**:
  - Aucun impact.

### 2026-01-28 — Champs obligatoires: adresses complètes + pays + distance route (bloquant)

- **Date**: 2026-01-28
- **Auteur**: (data)
- **Décision**: garantir que les champs suivants sont **toujours** renseignés avant envoi au Back Office :
  - Départ: **adresse + ville + CP + pays**
  - Arrivée: **adresse + ville + CP + pays**
  - **Distance par route (OSRM)** (pas de fallback heuristique)
- **Changements**:
  - Ajout `originCountryCode` / `destinationCountryCode` dans l’état (`useTunnelState`) et remplissage depuis l’autocomplete.
  - V2 (StepAccessLogisticsV2): affichage de la **distance route** et validation bloquante si non calculée.
  - V3: suppression du fallback `estimateDistanceKm` pour l’estimation finale; blocage si distance route non prête.
  - Back Office payload: envoi `originCountryCode` + `destCountryCode` quand disponible.
- **Fichiers modifiés**:
  - `hooks/useTunnelState.ts`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `components/tunnel/Step2ProjectComplete.tsx`
  - `app/devis-gratuits-v3/page.tsx`
  - `lib/api/client.ts`

### 2026-01-28 — Indicateur discret “validé” (coords OK) sur les inputs Ville/Adresse

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: afficher un indicateur discret à droite des inputs quand les coordonnées (lat/lon) sont présentes, pour confirmer que l’info est exploitable.
- **Implémentation**:
  - `AddressAutocomplete`: option `validated` + fallback interne (dernière sélection) pour afficher un check “Coordonnées OK”.
  - Ajout `invalidated` pour afficher un indicateur **rouge** quand l’utilisateur tente de continuer mais que l’input n’est pas exploitable (coords manquantes).
  - `StepQualificationV2` (villes) + `StepAccessLogisticsV2` (adresses): passent `validated` basé sur `originLat/Lon` et `destinationLat/Lon`.
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Libellé estimation: “Pour” + affichage Volume + Distance route

- **Décision**: remplacer “Volume estimé” par “Pour” et afficher `"{volume} m³ - {distance} km"` (distance route, arrondie) sur l’écran d’estimation.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Affichage des fourchettes: min / montant calculé / max + arrondi à la centaine supérieure

- **Décision**: pour toutes les fourchettes, afficher en 1 ligne:
  - **min** + montant min (petit, vert sombre)
  - **montant calculé** (gras, valeur à retenir)
  - **max** + montant max (petit, rouge sombre)
- **Règle**: tous les montants sont **arrondis à la centaine supérieure**.
- **Implémentation**: composant `PriceRangeInline` réutilisé sur les écrans concernés (estimation, formules, ribbon, photos).
- **Ajustement UI**: resserrage des espacements + montant central (“à retenir”) légèrement plus grand.
- **Ajustement métier UX**: le montant central (“à retenir”) est **légèrement biaisé vers le max** (au lieu du milieu strict) pour coller à l’ancrage client.
- **Fichiers modifiés/ajoutés**:
  - `components/tunnel/PriceRangeInline.tsx` (nouveau)
  - `components/tunnel/v2/StepEstimationV2.tsx`
  - `components/tunnel/Step3VolumeServices.tsx`
  - `components/tunnel/PricingRibbon.tsx`
  - `components/tunnel/v2/StepContactPhotosV2.tsx`

### 2026-01-28 — Formules (étape estimation): 3 cartes sans scroll horizontal (desktop)

- **Décision**: afficher les 3 formules **sans barre de scroll droite/gauche** sur desktop (grid 3 colonnes). Sur mobile on conserve le scroll horizontal.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepEstimationV2.tsx`

### 2026-01-28 — Datepicker: suppression de l’UI navigateur (anglais) → sélecteur FR

- **Problème**: l’`<input type="date">` natif affiche des libellés en **anglais** (“Today”, “Clear”, mois…) selon le navigateur/OS.
- **Décision**: utiliser un sélecteur **100% français** (mois/jours + “Aujourd’hui/Effacer”), tout en conservant le stockage en `YYYY-MM-DD`.
- **Fichiers modifiés/ajoutés**:
  - `components/tunnel/DatePickerFr.tsx` (nouveau)
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `components/tunnel/Step2ProjectComplete.tsx`
  - (fix build) `components/tunnel/DatePickerFr.tsx` : correction type TS (iso non-null)

### 2026-01-28 — Type de logement déplacé: Step 1 → Step 3 (+ étage si appartement)

- **Problème**: en Step 1, “Type de logement” est ambigu (départ ou arrivée ?).
- **Décision**:
  - Retirer “Type de logement” de la **Step 1 (V2)**.
  - En **Step 3**, afficher l’info logement **immédiatement sous chaque adresse concernée** (départ puis arrivée).
  - **Par défaut**: *Maison* est sélectionné (simple, non ambigu).
  - Si *Appartement* → afficher **sur la même ligne** la sélection **Étage** avec boutons: **RDV, 1er, 2e, 3e, 4e ou +**.
- **Champs**: aucun champ supprimé, uniquement déplacement/clarification UI (réutilise `originHousingType`, `destinationHousingType`, `originFloor`, `destinationFloor`).
- **Mobile-first**: affichage compact et lisible (pas de chevauchement), avec retour à la ligne propre sur mobile.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Step 3 (V2): prénom obligatoire + validation au clic “Finaliser mon estimation”

- **Décision**: `Prénom` devient **obligatoire** (comme l’email).
- **UX**: au clic sur “Finaliser mon estimation”, on met en évidence (rouge) et on scroll/focus le premier champ obligatoire manquant.
- **Back Office**: le payload V2 inclut aussi les infos logement (type + étage) maintenant que le choix est en Step 3.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Reward (desktop only): panneau “Budget & hypothèses” en Step 3 (V2)

- **Décision**: implémenter **desktop uniquement** (pas mobile pour l’instant) un panneau sticky qui affiche:
  - **Budget actuel**
  - **Budget initial (hypothèses)**: `distance +15 km`, `appart 2e`, `ascenseur`, `sans services`, **sans buffer saison**
  - Statuts “confirmé/en cours” pour distance/date/accès/services
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Reward: Step 2 (V2) calcule le budget avec hypothèses (distance +15 km, accès/services)

- **Décision**: l’estimation Step 2 (V2) utilise les hypothèses “reward”:
  - distance \(OSRM\ ville\to ville\) + **15 km**
  - **appartement 2e**, **ascenseur**
  - **aucun service**
  - **pas de buffer saison** (`seasonFactor=1`)
- **UI**: l’affichage “km” Step 2 est aligné sur le **+15 km**.
- **Fichiers modifiés**:
  - `app/devis-gratuits-v3/page.tsx`
  - `components/tunnel/v2/StepEstimationV2.tsx`

- **Fix build**: passage `pricingPanel` en `undefined` (pas `null`) pour respecter le typage TS.

### 2026-01-28 — Reward: budget initial figé (Step 2) en Step 3

- **Pourquoi**: le “Budget initial (hypothèses)” ne doit pas se recalculer quand l’utilisateur précise ses infos en Step 3.
- **Changement**: on capture un snapshot (`rewardBaseline*`) au submit de la Step 2, puis le panneau desktop réutilise ce baseline figé.
- **UX**: en cas de refresh direct en Step 3, on hydrate une fois le baseline (mêmes hypothèses Step 2) pour éviter l’affichage “—”.
- **Fichiers modifiés**:
  - `hooks/useTunnelState.ts`
  - `app/devis-gratuits-v3/page.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`

### 2026-01-28 — UX: panneau budget Step 3 en mode “panier” (initial → ajustements → affiné)

- **Changement**: refonte du panneau desktop “Votre budget” pour afficher un panier:
  - Budget initial (hypothèses)
  - lignes d’ajustement (Distance / Date / Accès / Services)
  - Budget affiné (résultat)
- **Note**: les montants par ligne sont des deltas séquentiels (même hypothèses/moteur `calculatePricing`) pour rester explicables.
- **Fichiers modifiés**:
  - `app/devis-gratuits-v3/page.tsx`
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx`
  - `hooks/useTunnelState.ts`

- **Ajout**: ligne “Photos (malus)” = **+15%** du budget “avant photos”, avec aide `(?)`.
- **Fix build**: correction typage TS (`lines` mutable) pour `pricingCart`.
- **Fix build**: suppression d’une référence résiduelle à `pricingPanel` dans `StepAccessLogisticsV2`.
- **Fix build**: suppression d’une double déclaration de `cart` dans `StepAccessLogisticsV2`.
- **Correction calculs (panier)**:
  - **Accès**: les defaults “Maison” en Step 3 ne sont plus considérés comme “confirmés” (flags `touched`).
  - **Date**: l’“urgence” ne s’applique plus que sur ≤ 15 jours (cohérent avec le min J+15).
  - **Distance**: ajout d’une composante distance continue dans `calculatePricing` (le buffer +15 km a toujours un impact).
- **UI**: suppression de “Ce qui peut faire varier le prix” (doublon avec le panier).
- **Fix build**: import manquant `COEF_DISTANCE` dans `app/devis-gratuits-v3/page.tsx`.
- **UI**: panneau “Votre panier” allégé et plus étroit (desktop) pour laisser plus de place au formulaire.
- **UI**: panneau “Votre panier” en **flottant** desktop (position fixe) collé au bord droit du viewport.
- **UI**: panier flottant activé à partir de **XL** (≥ 1280px) et le formulaire ne “réserve” plus de place (pas de padding) → largeur inchangée.
- **Panier**: le montant “Budget affiné” (centre) n’est plus arrondi à la centaine et correspond **exactement** à la somme (Budget initial centre + lignes).
- **Pricing (V2)**: le choix **Maison/Appartement** en Step 3 n’impacte plus le volume/prix (la **surface m² de Step 1** reste la source de vérité).

### 2026-01-28 — Photos: un seul montant “économisé” = 15% du montant moyen (formule sélectionnée)

- **Décision**: remplacer l’affichage en fourchette par **un seul montant**:  
  \( économies = 15\% \times \frac{min + max}{2} \) de la **formule sélectionnée**.
- **Affichage**: ce montant **n’est pas arrondi à la centaine** (arrondi à l’euro uniquement).
- **Changement**: on base l’écran photos sur la **fourchette de la formule sélectionnée** (pas la fourchette globale).
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepContactPhotosV2.tsx`
  - `app/devis-gratuits-v3/page.tsx`

### 2026-01-28 — Photos: suppression carte “+50%” + nouveau titre

- **Décision**:
  - Retirer le bloc **“+50%”** (taux de réponse) sur l’écran photos.
  - Remplacer le titre par **“Envoyez nous des photos pour compléter”**.
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepContactPhotosV2.tsx`

### 2026-01-28 — Photos: icônes cohérentes + copy “jusqu’à”

- **Décision**:
  - Icône économies: `PiggyBank`
  - Icône vitesse/rapidité: `Timer`
  - Copy économies: “Avec des photos vous économiserez jusqu&apos;à {montant}”
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepContactPhotosV2.tsx`

### 2026-01-28 — Recherche “Ville” : résultats ville (pas rues) + Europe via Nominatim

- **Date**: 2026-01-28
- **Auteur**: (UX/data)
- **Décision**: l’input “Ville” doit retourner des **villes**, pas des rues. On priorise la France mais on supporte aussi l’Europe.
- **Changements**:
  - `AddressAutocomplete` ajoute `kind="city"`:
    - BAN: ajoute `type=municipality` pour éviter les rues.
    - Nominatim: ajoute `featuretype=city` pour éviter les rues + formatage label.
    - Mode `auto` (city): fusion BAN + Nominatim + tri (match exact / prefix) pour éviter que des villes FR proches (ex: **Berling**) masquent la ville recherchée (ex: **Berlin**).
  - `StepQualificationV2`: les champs `Ville de départ` / `Ville d’arrivée` utilisent `kind="city"`.
  - **Coords**: la sélection d’une ville renseigne aussi `originLat/Lon` et `destinationLat/Lon` pour permettre le calcul de **distance route** dès l’écran estimation.
- **Affichage**:
  - FR: `Ville (CP)`
  - Hors FR: `Ville (CP si dispo) — Pays`
- **Scope**:
  - Recherche “Ville” côté Nominatim limitée à l’**Europe** par défaut (évite de proposer des villes homonymes hors Europe).
- **Fichiers modifiés**:
  - `components/tunnel/AddressAutocomplete.tsx`
  - `components/tunnel/v2/StepQualificationV2.tsx`
  - `app/api/geocode/route.ts` (proxy Nominatim côté serveur pour éviter CORS/UA)

### 2026-01-26 — Titre punchy "Vos photos = meilleur prix garanti" (V2)

- **Date**: 2026-01-26
- **Auteur**: (copywriting conversion)
- **Décision**: remplacer le titre générique "Ajoutez vos photos" par un titre bénéfice-centré ultra-punchy dans l'esprit Moverz.
- **Changements UI**:
  - **Titre H1** : "Ajoutez vos photos" → **"Vos photos = meilleur prix garanti"**
  - **Sous-titre** : "3-8 photos par pièce • angles larges • bonne lumière" → **"60-170€ économisés en 2 min chrono"**
  - Desktop et mobile
- **Objectif**:
  - Maximiser la conversion upload photos
  - Bénéfice immédiat et chiffré
  - Ton direct et impactant (esprit Moverz)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: copywriting uniquement (titre + sous-titre)
- **Back Office payload**:
  - changements: **AUCUN**
- **Copywriting rationale**:
  - Équation visuelle simple : "Vos photos = meilleur prix"
  - Bénéfice chiffré : "60-170€ économisés"
  - Friction minimisée : "en 2 min chrono"
  - "Garanti" = confiance et engagement
- **Risques / points à vérifier sur staging**:
  - Vérifier la longueur du titre sur mobile (pas de wrap bizarre)
  - Vérifier que le ton reste cohérent avec le reste du tunnel

### 2026-01-26 — Précision copy "avec photos" sur carte économies (V2)

- **Date**: 2026-01-26
- **Auteur**: (copywriting)
- **Décision**: préciser que les économies sont obtenues "avec photos" pour clarifier le bénéfice.
- **Changements UI**:
  - Texte carte 1 : "économisés en moyenne" → "économisés en moyenne **avec photos**"
  - Desktop et mobile
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: copywriting uniquement
- **Back Office payload**:
  - changements: **AUCUN**

### 2026-01-26 — Style sobre et premium pour grid incentives (V2)

- **Date**: 2026-01-26
- **Auteur**: (UX refinement)
- **Décision**: rendre le grid des 3 cartes incentives plus sobre, cohérent et premium pour mieux s'aligner avec le reste du tunnel.
- **Changements UI**:
  - **Cartes incentives** : 
    - Toutes les bordures **uniformisées en gris clair** (`border` au lieu de `border-2 border-[#6BCFCF]`)
    - Toutes les icônes en **turquoise #6BCFCF** (au lieu de vert/orange différenciés)
    - Fonds d'icônes uniformisés : `bg-[#6BCFCF]/10` pour toutes
    - Icônes plus petites et discrètes : `w-10 h-10` au lieu de `w-12 h-12`
    - Typographie plus sobre : `font-bold` au lieu de `font-black`, `text-2xl/3xl` au lieu de `3xl/4xl`
    - Labels plus discrets : `text-[#1E293B]/60` au lieu de `/70`
  - **Dropzone (upload desktop)** :
    - Bordure **solide** au lieu de pointillés (`border-[#E3E5E8]` au lieu de `border-dashed`)
    - Border radius réduit : `rounded-2xl` au lieu de `rounded-3xl`
    - Hover effect plus subtil : fond turquoise très léger (`bg-[#F0FAFA]/30`)
    - Suppression de l'effet `scale-[1.01]` lors du drag
    - Icône uniformisée : `bg-[#6BCFCF]/10` avec `text-[#6BCFCF]`
    - Lien "choisissez des fichiers" en turquoise cohérent
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: style visuel uniquement (design plus sobre et cohérent)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que le nouveau style est cohérent avec le reste du tunnel
  - Vérifier la lisibilité sur desktop et mobile
  - Vérifier que les bordures grises se distinguent bien du fond
  - Vérifier le hover effect de la dropzone

### 2026-01-26 — Fix couleur boutons Non/Oui dans StepAccessLogisticsV2

- **Date**: 2026-01-26
- **Auteur**: (UX fix)
- **Décision**: corriger les boutons Non/Oui pour qu'ils aient la couleur turquoise (#6BCFCF) quand sélectionnés, au lieu de rester gris.
- **Changements UI**:
  - Boutons "Oui, accès simple" / "Non, accès contraint" : couleur #6BCFCF (au lieu de #0F172A noir)
  - Boutons "Non" / "Oui" dans les sous-questions d'accès : couleur #6BCFCF quand sélectionnés
  - Boutons "Non" / "Oui" dans les services en plus : couleur #6BCFCF quand sélectionnés
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: style visuel uniquement (couleur des boutons actifs)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que les boutons ont bien la couleur turquoise quand on clique dessus
  - Vérifier la lisibilité du texte blanc sur fond turquoise

### 2026-01-26 — Application des améliorations UX sur tunnel V2 (NEXT_PUBLIC_FUNNEL_V2=true)

- **Date**: 2026-01-26
- **Auteur**: (UX consistency)
- **Décision**: appliquer les mêmes améliorations UX que sur le tunnel principal aux composants V2 pour assurer une expérience cohérente quelle que soit la version active.
- **Changements UI**:
  - **StepAccessLogisticsV2**: Champ téléphone **visible par défaut** (suppression du toggle "+ Ajouter téléphone")
  - **StepAccessLogisticsV2**: Accès déjà initialisé à **"simple" par défaut** dans `useTunnelState` (pas de changement code, déjà présent)
  - **StepContactPhotosV2 (Desktop)**: Grid de 3 cartes incentives avec stats impactantes :
    1. 💰 "60-170€ économisés en moyenne" (ou montant dynamique) - bordure turquoise
    2. 👥 "+50% de taux de réponse avec photos" - bordure grise
    3. ⚡ "2x plus de devis reçus sous 48-72h" - bordure grise
  - **StepContactPhotosV2 (Desktop)**: Ordre CTA **inversé** :
    - **EN PREMIER**: Drag & drop upload (depuis cet ordinateur)
    - **EN SECOND**: WhatsApp CTA (variant="secondary")
    - Séparateur "ou" entre les deux
  - **StepContactPhotosV2 (Mobile)**: Grid incentives en version verticale (stack 3 cartes) + WhatsApp reste principal
- **Tracking**:
  - Aucun impact (mêmes events GA4)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: présentation visuelle uniquement (champ téléphone toujours visible, grid incentives, ordre CTAs)
- **Back Office payload**:
  - changements: **AUCUN**
- **Fichiers modifiés**:
  - `components/tunnel/v2/StepAccessLogisticsV2.tsx` (téléphone visible)
  - `components/tunnel/v2/StepContactPhotosV2.tsx` (grid incentives + ordre CTA)
  - Imports ajoutés: `TrendingUp`, `Users`, `Zap` from lucide-react
- **Risques / points à vérifier sur staging**:
  - Vérifier avec `NEXT_PUBLIC_FUNNEL_V2=true` sur CapRover
  - Vérifier l'affichage du grid 3 colonnes desktop / stack vertical mobile
  - Vérifier ordre CTA desktop (drag&drop puis WhatsApp)
  - Vérifier que le champ téléphone est bien visible d'office
  - Vérifier les montants dynamiques dans le grid si estimate disponible
  - Vérifier que WhatsApp reste principal sur mobile

### 2026-01-26 — Hotfix validation téléphone (Step 1)

- **Date**: 2026-01-26
- **Auteur**: (hotfix)
- **Décision**: corriger un bug de validation sur le champ téléphone qui empêchait la soumission du formulaire Step 1 quand `phone` était `undefined` au lieu d'une string vide.
- **Changements UI**:
  - Aucun changement visuel
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: logique de validation du champ `phone` (gestion `undefined`)
- **Back Office payload**:
  - changements: **AUCUN**
- **Bug corrigé**:
  - Validation `isPhoneValid` plantait si `phone` était `undefined`
  - Ajout de checks `!phone ||` avant `phone.trim()` et dans les conditions d'affichage d'erreur
- **Risques / points à vérifier sur staging**:
  - Vérifier que le formulaire Step 1 se soumet correctement avec ou sans téléphone
  - Vérifier que la validation du téléphone fonctionne si on en saisit un

### 2026-01-26 — Incentives clairs pour upload photos (Step 4)

- **Date**: 2026-01-26
- **Auteur**: (conversion optimisation)
- **Décision**: remplacer la section "économies" simple par un grid de 3 bénéfices visuels ultra-clairs pour maximiser la conversion sur l'upload de photos.
- **Changements UI**:
  - **Grid de 3 cartes** avec stats impactantes :
    1. 💰 "60-170€ économisés en moyenne" (ou montant dynamique si estimate disponible) - bordure turquoise
    2. 👥 "+50% de taux de réponse avec photos" - bordure grise
    3. ⚡ "2x plus de devis reçus sous 48-72h" - bordure grise
  - Icons colorés (TrendingUp, Users, Zap)
  - Chiffres gros et visibles (3xl/4xl font-black)
  - Responsive : grid 3 colonnes desktop, stack vertical mobile
  - Ancienne section "économies seule" désactivée (remplacée par le grid)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: présentation visuelle des bénéfices uniquement
- **Back Office payload**:
  - changements: **AUCUN**
- **Copywriting**:
  - "économisés en moyenne" (au lieu de "en envoyant vos photos maintenant")
  - "+50% de taux de réponse avec photos" (preuve sociale)
  - "2x plus de devis reçus sous 48-72h" (urgence + quantité)
- **Risques / points à vérifier sur staging**:
  - Vérifier l'affichage des 3 cartes sur desktop (grid 3 colonnes)
  - Vérifier le stack vertical sur mobile
  - Vérifier que les montants dynamiques s'affichent correctement quand estimate disponible
  - Vérifier la hiérarchie visuelle : la carte "économies" doit se démarquer (bordure turquoise)

### 2026-01-26 — Inversion drag & drop / WhatsApp (Step 4 - Desktop)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: sur desktop, afficher d'abord l'option "Glissez-déposez vos photos ici" (upload direct) en style primaire, puis WhatsApp en style secondaire. Sur mobile, WhatsApp reste en premier (car c'est l'option principale).
- **Changements UI**:
  - **Desktop** : 
    1. Bouton "Glissez-déposez vos photos ici" en premier (style dark primaire)
    2. Séparateur "ou"
    3. Bouton WhatsApp en second (style blanc secondaire)
  - **Mobile** : WhatsApp reste en premier (style vert primaire) - pas de changement
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: ordre d'affichage des CTA sur desktop uniquement
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier l'ordre des boutons sur desktop (drag & drop → WhatsApp)
  - Vérifier que sur mobile, WhatsApp reste en premier
  - Vérifier que les deux options fonctionnent correctement

### 2026-01-26 — Champ téléphone affiché par défaut (Step 1)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: retirer le bouton "+ Ajouter un téléphone (optionnel)" et afficher directement le champ téléphone dans Step1Contact. Le champ reste optionnel mais est toujours visible.
- **Changements UI**:
  - Champ téléphone toujours visible dans le formulaire de contact (Step 1)
  - Label "Téléphone (optionnel)" pour clarifier que ce n'est pas obligatoire
  - Validation : si rempli, doit contenir au moins 10 chiffres (optionnel sinon)
  - Icône téléphone + feedback visuel (check/croix) comme pour les autres champs
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN** (le champ phone existait déjà dans le state)
  - ajoutés: **AUCUN** (simplement rendu visible par défaut)
  - modifiés: champ `phone` maintenant toujours affiché (pas de toggle)
- **Back Office payload**:
  - changements: **AUCUN** (le champ phone était déjà envoyé au BO)
- **Risques / points à vérifier sur staging**:
  - Vérifier que le champ téléphone s'affiche correctement sur mobile et desktop
  - Vérifier que la validation fonctionne (optionnel, mais si rempli => au moins 10 chiffres)
  - Vérifier que le formulaire se soumet correctement avec ou sans téléphone

### 2026-01-26 — Force accès "Facile" par défaut (UX)

- **Date**: 2026-01-26
- **Auteur**: (UX amélioration)
- **Décision**: s'assurer que les champs d'accès (originAccess, destinationAccess) sont toujours initialisés à "easy" (= Facile), même si une ancienne session localStorage les avait laissés vides.
- **Changements UI**:
  - Par défaut, les boutons "Facile" sont maintenant toujours pré-sélectionnés et colorés (#6BCFCF)
  - Les deux boutons (Facile / Contraint) ont la même couleur turquoise quand sélectionnés (déjà le cas)
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: valeur par défaut forcée pour `originAccess` et `destinationAccess` à "easy" (rétrocompatibilité localStorage)
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier qu'au premier chargement du tunnel, "Facile" est bien pré-sélectionné pour départ ET arrivée
  - Vérifier que les anciennes sessions localStorage avec accès vides sont bien complétées avec "easy"

### 2026-01-26 — Ajustement ratio m3/m2 (0.3 → 0.4)

- **Date**: 2026-01-26
- **Auteur**: (ajustement métier)
- **Décision**: modifier le ratio m3/m2 de 0.3 à 0.4 pour les types de logements concernés (studio, T4, T5, maisons) afin d'améliorer la précision du calcul de volume.
- **Changements UI**:
  - Aucun changement UI visible
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN** (seul le calcul interne de volume change)
- **Formules métier**:
  - `TYPE_COEFFICIENTS` dans `lib/pricing/constants.ts` : ratio m3/m2 passé de 0.3 à 0.4 pour studio, t4, t5, house, house_1floor, house_2floors, house_3floors
  - Les coefficients T1/T2/T3 restent à 0.35
- **Risques / points à vérifier sur staging**:
  - Vérifier que les estimations de volume sont cohérentes avec la réalité terrain
  - Vérifier que les prix estimés restent compétitifs

### 2026-01-21 — Retrait badge "TEST" (staging)

- **Date**: 2026-01-21
- **Auteur**: (cleanup)
- **Décision**: retirer le badge “TEST” ajouté sur Step 1.
- **Changements UI**:
  - Suppression du badge **TEST** sur Step 1
- **Tracking**:
  - Aucun
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**

### 2026-01-21 — Fix build staging (trackError: screenId requis)

- **Date**: 2026-01-21
- **Auteur**: (fix)
- **Décision**: suite au changement de signature `trackError`, ajouter `screenId` sur tous les appels pour éviter un build Next cassé.
- **Changements UI**:
  - Aucun
- **Tracking**:
  - `TUNNEL_ERROR` inclut désormais `screenId` explicite dans les appels (ex: `contact_v3`, `project_v3`, `formules_v3`)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**

### 2026-01-21 — Badge “TEST” visible sur Step 1 (staging uniquement)

- **Date**: 2026-01-21
- **Auteur**: (setup)
- **Décision**: afficher un marqueur “TEST” très visible sur la Step 1 pour éviter toute confusion avec la prod.
- **Changements UI**:
  - Ajout d’un badge **TEST** sur Step 1
  - Affiché uniquement si hostname = `staging-v4-tunnel.gslv.cloud`
- **Tracking**:
  - Aucun
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Visibilité mobile (CTA toujours visible)

### 2026-01-21 — Guardrails + tracking ré-ordonnable

- **Date**: 2026-01-21
- **Auteur**: (setup initial)
- **Décision**: sécuriser V4 staging avec garde-fous automatiques et rendre le tracking indépendant de l’index d’étape.
- **Changements UI**:
  - Aucun changement UI (infrastructure de garde-fous uniquement)
- **Tracking**:
  - `screenId` n’est plus dérivé d’un index dans `useTunnelTracking` (on passe un `screenId` explicite)
  - mapping recommandé: `logicalStep` stable + `screenId` explicite par écran
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés (UX only): **AUCUN**
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que les events `TUNNEL_STEP_CHANGED` et `TUNNEL_ERROR` ont un `screenId` explicite
  - Vérifier que la CI bloque bien toute modif Prisma + exige `migration_v4.md`

### 2026-02-02 — Désamorçage "sticker shock" sur écran estimation (Step 3)

- **Date**: 2026-02-02
- **Auteur**: (UX/conversion)
- **Décision**: réduire le "sticker shock" (choc du prix) en ajoutant du **contexte avant le montant** et en clarifiant la nature **provisoire** de l'estimation.
- **Changements UI**:
  - **Bloc "Budget estimé"** (Step3VolumeServices):
    - Ajout d'une ligne de contexte **avant** le prix : "Pour {volume} m³ · {distance} km" (ou "Basé sur volume et distance estimés" si données non dispo)
    - Disclaimer modifié : "Estimation basée sur distance + volume estimé. **Prix final après infos + photos.**" (mise en gras du prix final)
  - **Cartes formules** (Éco/Standard/Premium):
    - Ajout d'un label "À PARTIR DE" (uppercase, petit, discret, 10px) sur ligne dédiée **au-dessus** de chaque fourchette de prix
    - Fix layout : le label est maintenant sur sa propre ligne (`<p>` block) pour éviter conflit avec le grid de `PriceRangeInline`
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: **AUCUN**
  - modifiés: copywriting et ordre d'affichage uniquement
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier que le contexte (volume + distance) s'affiche correctement avant le prix
  - Vérifier la lisibilité du disclaimer sur mobile (pas de wrap bizarre)
  - Vérifier que le label "À partir de" s'affiche bien sur chaque carte formule (nouvelle ligne dédiée)
  - Vérifier que le montant reste lisible et impactant malgré le contexte ajouté

### 2026-02-02 — Amélioration panier Step 3 (confiance + clarté + momentum)

- **Date**: 2026-02-02
- **Auteur**: (UX/conversion)
- **Décision**: améliorer le panier (desktop sidebar + mobile sticky) pour maximiser confiance, clarté et sentiment de progression.
- **Changements UI**:
  - **Placeholders adresse cohérents**:
    - Les placeholders des champs adresse sont maintenant génériques ("Ex: 10 rue de la République") au lieu de hardcodés ("Lyon" alors que label dit "Marseille")
    - Fix dans StepAccessLogisticsV2 et Step2ProjectComplete
  - **Reframe ligne Photos** (moins punitif):
    - Ancien: "Photos (malus) +660€"
    - Nouveau: "Sans photos : marge de sécurité +660€"
    - Renommage variable: `photoMalusEur` → `photoMarginEur`
  - **Progress bar** (momentum):
    - Affichage "X/5 confirmées" en haut du panier
    - Barre de progression visuelle (turquoise) qui se remplit à mesure que l'utilisateur confirme les infos
  - **Ordre lignes par impact** (guide l'attention):
    - Nouveau: Photos → Accès → Services → Date → Distance
    - Ancien: Distance → Date → Accès → Services → Photos
    - Ajout champ `confirmed: boolean` sur chaque ligne pour calculer le progress
  - **Hiérarchie budget améliorée** (clarté visuelle):
    - Budget actuel: en premier, gros (3xl), fond turquoise léger, label "Votre budget actuel"
    - Fourchette min/max: en grid 2 colonnes sous le montant principal
    - Budget initial: en bas, petit, barré, grisé, label "Budget initial (hypothèses)"
  - **Tooltips explicatifs** (confiance):
    - Photos: "Les photos permettent d'estimer le volume exact et d'éviter les marges de sécurité"
    - Accès: "Un accès difficile nécessite plus de temps et de manutention"
    - Date: "Les périodes de forte demande (été, fin de mois) impactent les tarifs"
    - Icône HelpCircle au survol
  - **Sticky mobile bar** (visibilité budget):
    - Affichage du budget actuel + progress (X/5) dans une card sticky en bas sur mobile (< xl)
    - Positionné au-dessus du bouton CTA
    - Gradient fade-in pour transition douce
  - **Animation montant** (feedback visuel):
    - Transition CSS (300ms) sur le montant du budget actuel quand il change
  - **Badge "Optimisé"** (gratification):
    - Affichage badge vert "Optimisé" quand toutes les lignes sont confirmées
    - Positionné à côté du titre "Votre budget actuel"
- **Tracking**:
  - Aucun impact
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: champ `confirmed` (booléen) sur chaque ligne du panier (frontend only, pas envoyé au BO)
  - modifiés: ordre d'affichage des lignes, copywriting, hiérarchie visuelle
- **Back Office payload**:
  - changements: **AUCUN**
- **Risques / points à vérifier sur staging**:
  - Vérifier placeholders adresse cohérents avec ville sélectionnée
  - Vérifier progress bar et calcul correct du nombre de lignes confirmées
  - Vérifier sticky mobile bar positionnement (doit être au-dessus du bouton CTA)
  - Vérifier hiérarchie visuelle budget (actuel gros et visible, initial discret)
  - Vérifier tooltips au survol (desktop) et au tap (mobile)
  - Vérifier badge "Optimisé" quand toutes infos confirmées
  - Vérifier animation du montant lors des changements
  - Vérifier mobile: sticky bar ne cache pas le contenu important

### Entrée template (à copier)

- **Date**: YYYY-MM-DD
- **Auteur**: (nom)
- **Décision** (si applicable): (ce qui a été décidé + pourquoi, 1–3 lignes)
- **Changements UI**:
  - (liste concise)
- **Tracking**:
  - logicalStep impactés: (CONTACT/PROJECT/RECAP/THANK_YOU/…)
  - screenId impactés: (ex: `project_v4`)
  - notes: (ex: ré-ordonnancement steps, mapping conservé)
- **Champs / Inputs**:
  - supprimés: **AUCUN**
  - ajoutés: (si oui => marqués "non connectés" + justification)
  - modifiés (UX only): (si oui)
- **Back Office payload**:
  - changements: **AUCUN** (sauf mention explicite)
- **Risques / points à vérifier sur staging**:
  - (liste)

---

## 2) Checklist obligatoire avant “OK pour review”

- [ ] Aucun fichier Prisma modifié (`prisma/schema.prisma`, `prisma/migrations/**`)
- [ ] Aucun champ existant supprimé (FormState + UI)
- [ ] Tracking: `logicalStep` stable, `screenId` explicite (jamais dérivé d’un index)
- [ ] Mobile-first validé (iPhone/Android: lisibilité, CTA, scroll, clavier)
- [ ] Tests uniquement sur staging (URL staging + vraie navigation)


---

### 2026-02-11 — Fix RDC + auto-surface Step 3

- **Décision** : L'auto-surface (`HOUSING_SURFACE_DEFAULTS`) ne doit s'appliquer qu'en Step 1.
  En Step 3, le changement Maison/Appartement concerne l'accès (étage, ascenseur),
  **pas** la surface. Sans ce garde-fou, passer de Maison (110 m²) à Appart (40 m²)
  écrasait la surface et faisait chuter la "Première estimation" de ~50 %.
- **Changements UI** :
  - "RDV" → "RDC" (Rez-de-chaussée) dans le sélecteur d'étage.
  - Guard `if (state.currentStep > 1) return;` dans l'effet `HOUSING_SURFACE_DEFAULTS`.
- **Tracking** : aucun impact.
- **Champs / Inputs** : aucun ajout/suppression.
- **Back Office payload** : aucun changement.
