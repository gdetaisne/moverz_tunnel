# Tunnel Design System V1 Premium

> Design System V1 Premium Applied  
> Back-office safe  
> Tracking safe

Premium component library for Moverz tunnel, inspired by Ramp.com product design.

---

## 🎨 Design Tokens

All tokens are defined in `styles/tokens.css` and mapped to Tailwind in `tailwind.config.ts`.

### Color System

**Brand**
- `brand-primary` (#0EA5E9) - Primary CTA color
- `brand-primary-hover` (#0284C7) - Hover state
- `brand-primary-light` (#E0F2FE) - Light background

**Neutrals** (Premium gray scale)
- `neutral-50` to `neutral-900` - Complete neutral palette

**Semantic Colors**
- `text-primary`, `text-secondary`, `text-muted`, `text-disabled`
- `bg-primary`, `bg-secondary`, `bg-tertiary`
- `border-neutral`, `border-strong`, `border-focus`
- `surface-primary`, `surface-secondary`, `surface-hover`

**Feedback**
- `success` / `success-light` - Green
- `error` / `error-light` - Red
- `warning` / `warning-light` - Orange
- `info` / `info-light` - Blue

### Spacing Scale

Base 8px scale:
- `space-compact` (8px) - Tight spacing
- `space-inline` (12px) - Inline elements
- `space-block` (16px) - Between blocks
- `space-section` (24px) - Between sections

### Typography

**Font Families**
- `font-sans` - System font stack
- `font-mono` - Monospace font stack

**Font Sizes**
- `text-xs` (12px) → `text-5xl` (48px)
- All with appropriate line heights

**Font Weights**
- `font-normal` (400)
- `font-medium` (500)
- `font-semibold` (600)
- `font-bold` (700)

### Component Sizes

**Form Elements**
- `height-input` (48px) - Standard input height
- `height-input-sm` (40px) - Compact input
- `height-input-lg` (56px) - Large input

**Layout**
- `height-header` (64px) - Page header
- `width-sidebar` (416px) - Desktop sidebar
- `width-container` (1152px) - Max content width

### Border Radius

- `rounded-sm` (6px)
- `rounded-md` (8px)
- `rounded-lg` (12px)
- `rounded-xl` (16px)
- `rounded-2xl` (24px)
- `rounded-full` (9999px)

### Shadows

Subtle, refined elevation:
- `shadow-xs` → `shadow-2xl` - Progressive elevation
- `shadow-focus` - Focus ring shadow

### Transitions

- `transition-fast` (150ms)
- `transition-base` (200ms)
- `transition-slow` (300ms)

---

## 📦 Components

### Field

Premium input field with label, helper text, and validation states.

```tsx
import { Field } from "@/components/tunnel";

<Field
  id="email"
  label="Email"
  helper="Nous ne partagerons jamais votre email"
  type="email"
  required
  isValid={isEmailValid}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

**Props**:
- Standard input props
- `label` - Optional label
- `helper` - Optional helper text
- `error` - Error message (shows AlertCircle icon)
- `isValid` - Shows CheckCircle2 icon when true
- `leftIcon` / `rightIcon` - Optional icons

**Design**:
- Height: 48px (`height-input`)
- Focus: Border focus color + shadow
- Valid: Green border + check icon
- Error: Red border + alert icon

---

### Section

Section wrapper with title, description, and consistent spacing.

```tsx
import { Section } from "@/components/tunnel";

<Section
  title="Informations de contact"
  description="Vos coordonnées pour recevoir votre estimation"
  separator
>
  {/* Section content */}
</Section>
```

**Props**:
- `title` - Optional section title
- `description` - Optional description
- `separator` - Show horizontal line after section
- `children` - Section content

**Design**:
- Spacing: 24px between sections (`space-section`)
- Title: `text-xl font-semibold`
- Description: `text-sm text-secondary`

---

### SegmentedControl

Radio button group with premium styling (iOS-style segmented control).

```tsx
import { SegmentedControl } from "@/components/tunnel";

<SegmentedControl
  name="housing-type"
  value={housingType}
  onChange={setHousingType}
  label="Type de logement"
  options={[
    { value: "house", label: "Maison", icon: <Home className="w-4 h-4" /> },
    { value: "apartment", label: "Appartement", icon: <Building className="w-4 h-4" /> },
  ]}
/>
```

**Props**:
- `name` - Input name (required for radio group)
- `value` - Current value
- `onChange` - Change handler
- `options` - Array of `{ value, label, icon?, disabled? }`
- `label` / `helper` / `error` - Optional text
- `size` - "sm" | "md" | "lg"

**Design**:
- Container: Light gray background (`bg-tertiary`)
- Selected: White background + shadow
- Hover: Subtle background change
- Size "md": 48px height

---

### InlineHint

Small reassurance hint (e.g., "Numéro masqué", "0 démarchage").

```tsx
import { InlineHint } from "@/components/tunnel";
import { Shield } from "lucide-react";

<InlineHint icon={<Shield className="w-4 h-4" />} variant="success">
  0 démarchage
</InlineHint>
```

**Props**:
- `icon` - Optional icon (ReactNode)
- `variant` - "default" | "success" | "info"
- `children` - Hint text

**Design**:
- Text: `text-sm`
- Flex layout with icon
- Muted colors by default

---

### DeltaRow

Pricing adjustment row with +/- indicator and animation.

```tsx
import { DeltaRow } from "@/components/tunnel";

<DeltaRow
  label="Distance"
  amount={-50}
  highlighted={false}
/>
```

**Props**:
- `label` - Driver label
- `amount` - Delta amount (positive = increase, negative = decrease)
- `showIcon` - Show TrendingUp/Down icon (default: true)
- `highlighted` - Highlight this row (animation)

**Design**:
- Icon: TrendingUp (red) for positive, TrendingDown (green) for negative
- Amount: Color-coded (red/green)
- Animation: Scale on change
- Hover: Subtle background

---

### StepHeader

Top navigation with logo, back button, and progress bar.

```tsx
import { StepHeader } from "@/components/tunnel";

<StepHeader
  currentStep={2}
  totalSteps={4}
  onBack={() => goToStep(1)}
  showBack
  logoHref="/"
/>
```

**Props**:
- `currentStep` - Current step number
- `totalSteps` - Total number of steps
- `onBack` - Back button handler
- `showBack` - Show back button
- `logoHref` - Logo link destination

**Design**:
- Height: 64px (`height-header`)
- Sticky: `top-0 z-sticky`
- Progress bar: Full-width, animated
- Layout: Back | Logo | Step indicator

---

### StickySummary

Desktop sticky pricing summary (cart) with live pricing.

```tsx
import { StickySummary } from "@/components/tunnel";

<StickySummary
  priceCenter={2500}
  priceMin={2200}
  priceMax={2800}
  drivers={[
    { key: "distance", label: "Distance", amount: -100 },
    { key: "density", label: "Densité", amount: 200 },
  ]}
  formule="Standard"
  showDetail
  onDetailClick={() => openDetailModal()}
/>
```

**Props**:
- `priceCenter` - Main price
- `priceMin` / `priceMax` - Price range
- `drivers` - Array of pricing drivers (max 5)
- `formule` - Formula label
- `showDetail` - Show "Voir le détail" button
- `onDetailClick` - Detail button handler

**Design**:
- Width: 416px (`width-sidebar`)
- Sticky: `top-28`
- Clean white card with borders
- Live badge with pulse animation
- Trust hints at bottom

---

### SummaryDrawer

Mobile pricing summary (bottom bar + drawer).

```tsx
import { SummaryDrawer } from "@/components/tunnel";

<SummaryDrawer
  priceCenter={2500}
  priceMin={2200}
  priceMax={2800}
  drivers={[
    { key: "distance", label: "Distance", amount: -100 },
    { key: "density", label: "Densité", amount: 200 },
  ]}
  formule="Standard"
/>
```

**Props**:
- Same as `StickySummary` (except `showDetail` / `onDetailClick`)
- Automatically manages open/close state

**Design**:
- Bottom bar: Fixed at bottom, tap to open
- Drawer: Slides in from bottom
- Handle: Drag indicator
- Backdrop: Semi-transparent overlay
- Max height: 90vh

---

## 🚦 Usage Guidelines

### Do's ✅

- Use design tokens (e.g., `text-primary`, `space-section`)
- Maintain 48px input height (`height-input`)
- Use 16-24px spacing between sections
- Keep borders subtle (`border-neutral`)
- Use semantic colors (`success`, `error`, etc.)
- Respect `prefers-reduced-motion`
- Follow accessibility best practices

### Don'ts ❌

- Don't use pastel gradients on dominant surfaces
- Don't create custom spacing values
- Don't use hardcoded colors
- Don't exceed 5 drivers in pricing summary
- Don't modify existing API calls / tracking
- Don't change form field names or IDs

---

## 🔒 Back-office Safety

All components are **100% presentational wrappers**. They:

✅ Do NOT modify API payloads  
✅ Do NOT change tracking calls  
✅ Do NOT alter form field names/IDs  
✅ Do NOT change validation logic  
✅ Do NOT add new endpoints  

They simply wrap existing inputs/logic with premium styling.

---

## 📱 Responsive Behavior

### Breakpoints

- Mobile: `< 1024px` (Tailwind default)
- Desktop: `≥ 1024px` (`lg:` prefix)

### Components

- **StickySummary**: `hidden lg:block` (desktop only)
- **SummaryDrawer**: `lg:hidden` (mobile only)
- **Field**: Full width by default, stackable in grid
- **SegmentedControl**: Scrollable on mobile if needed

---

## 🎯 Next Steps

1. Refactor `app/devis-gratuits-v3/page.tsx` to use these components
2. Replace inline styling with design tokens
3. Test all steps (1-4) on mobile and desktop
4. Verify no regression on tracking / API calls
5. Deploy to production (CapRover)

---

## 📚 References

- Design inspiration: [Ramp.com](https://ramp.com)
- Tokens: `styles/tokens.css`
- Tailwind config: `tailwind.config.ts`
- Icons: [Lucide React](https://lucide.dev)
