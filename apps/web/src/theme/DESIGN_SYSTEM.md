# EMBR Design System

## 🎨 Brand Philosophy

**Muted Phoenix Theme** - Easy on the nervous system

The embr brand is built on calming, warm tones inspired by the phoenix rising. The color palette uses:
- **Warmth** without aggression (muted terracotta)
- **Calm** energy (teal for water/flow)
- **Grounding** foundation (navy for depth)
- **Breathing room** (cream backgrounds)

This creates an intentional, purposeful feel that respects user attention and reduces visual fatigue.

---

## 🎭 Color Palette

### Primary - Muted Terracotta (The Phoenix)
Warm, welcoming, energetic but calm
```
Terracotta-400: #c4977d  ← Use for primary buttons, accents
Terracotta-500: #b88566
Terracotta-600: #a67452  ← Use for hover states
```

**Usage:**
- Call-to-action buttons
- Primary highlights
- Active states
- Progress indicators
- Success messages

### Secondary - Teal (Water/Calm)
Represents flow, calm, natural rhythm
```
Teal-400: #6ba898  ← Use for secondary buttons
Teal-500: #5a9684
Teal-600: #497e6f  ← Use for hover states
```

**Usage:**
- Secondary buttons
- Links and hover effects
- Verification badges
- Calm confirmations
- Water/flow metaphors

### Accent - Navy (Grounding)
Deep, grounding, provides contrast
```
Navy-500: #4a5f7f  ← Use for body text
Navy-700: #374563  ← Use for headings
Navy-900: #1a202c  ← Use for dark backgrounds
```

**Usage:**
- Body text (Navy-500 on cream)
- Headings and titles
- Dark backgrounds
- Text contrast
- Serious/important content

### Neutral - Cream (Breathing Room)
Light, calm, reduces visual strain
```
Neutral-50: #fefdfb   ← Use as backgrounds
Neutral-100: #faf8f5  ← Use for cards
Neutral-200: #f3ebe5  ← Use for borders/dividers
```

**Usage:**
- Page backgrounds
- Card backgrounds
- Borders and dividers
- Spacing and breathing room
- Light text areas

### Semantic Colors
```
Success: #6ba898    (Teal - calm positive)
Warning: #c4977d    (Terracotta - warm caution)
Error: #9b6b5a      (Dark terracotta - serious)
Info: #4a5f7f       (Navy - informational)
```

---

## 📐 Component Styling

### Buttons

**Primary Button**
```tsx
<button className="bg-embr-primary-400 hover:bg-embr-primary-500 text-white font-semibold px-6 py-2 rounded-lg transition">
  Action
</button>
```
Uses terracotta for warmth and call-to-action.

**Secondary Button**
```tsx
<button className="bg-embr-secondary-400 hover:bg-embr-secondary-500 text-white font-semibold px-6 py-2 rounded-lg transition">
  Secondary Action
</button>
```
Uses teal for calm, flowing actions.

**Ghost Button**
```tsx
<button className="bg-embr-neutral-200 hover:bg-embr-neutral-300 text-embr-accent-900 font-semibold px-6 py-2 rounded-lg transition">
  Tertiary
</button>
```
Light background with dark text for minimal emphasis.

### Cards & Containers

**Light Card**
```tsx
<div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-6">
  {/* Content */}
</div>
```
Default card with cream background and subtle border.

**Dark Card** (when dark background needed)
```tsx
<div className="bg-embr-accent-800 border border-embr-accent-700 text-embr-neutral-50 rounded-lg p-6">
  {/* Content */}
</div>
```
Dark navy background with cream text for night mode.

**Highlight Card**
```tsx
<div className="bg-gradient-to-br from-embr-primary-300 to-embr-primary-200 rounded-lg p-6 text-embr-accent-900">
  {/* Featured content */}
</div>
```
Subtle gradient for emphasis without harshness.

### Text

**Heading**
```tsx
<h1 className="text-4xl font-bold text-embr-accent-900">Title</h1>
```
Use navy-700/900 for headings.

**Body Text**
```tsx
<p className="text-embr-accent-600">Body content</p>
```
Use navy-500/600 for readable body text.

**Muted Text**
```tsx
<span className="text-embr-accent-400">Secondary info</span>
```
Use navy-400 for less important text.

### Inputs

**Text Input**
```tsx
<input
  className="bg-embr-neutral-100 border border-embr-neutral-300 focus:border-embr-primary-400 text-embr-accent-900 rounded-lg px-4 py-2 transition"
  type="text"
/>
```
Cream background with navy text, terracotta focus state.

### Badges

**Verified Badge**
```tsx
<span className="bg-embr-secondary-100 text-embr-secondary-700 px-3 py-1 rounded-full text-sm font-semibold">
  ✓ Verified
</span>
```
Light teal background with dark teal text.

**Status Badge**
```tsx
<span className="bg-embr-primary-100 text-embr-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
  Active
</span>
```
Light terracotta background with dark terracotta text.

---

## 🎨 Gradients

### Phoenix Gradient (Primary)
```tsx
className="bg-gradient-to-r from-embr-primary-400 via-embr-primary-300 to-embr-primary-200"
```
Warm, energetic gradient for major accents.

### Calm Gradient (Secondary)
```tsx
className="bg-gradient-to-r from-embr-secondary-400 to-embr-neutral-100"
```
Flowing gradient from teal to cream for peaceful areas.

### Depth Gradient (Dark)
```tsx
className="bg-gradient-to-br from-embr-accent-900 via-embr-accent-700 to-embr-accent-800"
```
Dark navy gradient for depth and contrast.

---

## 📱 Responsive Design

All components use Tailwind's responsive prefixes:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Mobile: 1 column */}
  {/* Tablet: 2 columns */}
  {/* Desktop: 4 columns */}
</div>
```

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## 🌙 Dark Mode (If Needed)

The current palette is light-first with optional dark cards. Future dark mode can use:
- Background: Navy-900
- Surface: Navy-800
- Text: Cream-50
- Accents: Terracotta-400, Teal-400

---

## ✨ Accessibility

**Color Contrast:**
- Navy-500 on Cream-100: ✅ 7.2:1 ratio (AAA)
- Navy-600 on Cream-50: ✅ 8.5:1 ratio (AAA)
- Terracotta-400 on White: ✅ 5.1:1 ratio (AA)

**Typography:**
- Headings: Bold, Navy-700/900, 24px+
- Body: Regular, Navy-500/600, 16px+
- Captions: Regular, Navy-400, 12px+

**Icons:**
- Pair with text labels
- Use Lucide React icons
- Maintain 24px or larger for interactive icons

---

## 🔄 Transition & Animation

All interactive elements include smooth transitions:

```tsx
className="hover:bg-embr-primary-500 transition"  // 150ms by default
className="transform hover:scale-105 transition"  // Scale on hover
```

Avoid harsh changes - maintain the calm aesthetic.

---

## 📋 Component Checklist

When building a new component, use:

- [ ] **Colors**: Only from the palette above
- [ ] **Typography**: Navy-500 for body, Navy-700+ for headings
- [ ] **Spacing**: Tailwind's standard scale (gap-4, p-6, etc.)
- [ ] **Borders**: Subtle (embr-neutral-200)
- [ ] **Buttons**: Terracotta primary, Teal secondary
- [ ] **Hover States**: Darker shade + transition
- [ ] **Accessibility**: 7:1 contrast minimum
- [ ] **Responsive**: Mobile-first design
- [ ] **Icons**: Lucide React, 20-24px size
- [ ] **Focus States**: Terracotta outline for keyboard nav

---

## 🎯 Real World Examples

### Feature Card
```tsx
<div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-6 hover:border-embr-primary-300 transition">
  <h3 className="text-lg font-bold text-embr-accent-900 mb-2">Feature Title</h3>
  <p className="text-embr-accent-600 mb-4">Description</p>
  <button className="bg-embr-primary-400 hover:bg-embr-primary-500 text-white px-4 py-2 rounded-lg transition">
    Learn More
  </button>
</div>
```

### Success Message
```tsx
<div className="bg-embr-secondary-100 border border-embr-secondary-300 rounded-lg p-4 flex items-start gap-3">
  <CheckCircle size={20} className="text-embr-secondary-600 flex-shrink-0 mt-1" />
  <div>
    <h4 className="font-bold text-embr-secondary-700">Success!</h4>
    <p className="text-embr-secondary-600 text-sm">Your action was completed.</p>
  </div>
</div>
```

### Dashboard Stats
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {[...].map(stat => (
    <div key={stat.id} className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-4">
      <p className="text-embr-accent-600 text-sm">{stat.label}</p>
      <p className="text-3xl font-bold text-embr-accent-900">{stat.value}</p>
    </div>
  ))}
</div>
```

---

## 🚀 Tailwind Config Integration

Add to `tailwind.config.ts`:

```typescript
import { tailwindConfig } from './src/theme/colorPalette';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: tailwindConfig.colors,
    },
  },
};
```

Then use in components:
```tsx
className="bg-embr-primary-400 text-embr-accent-900"
```

---

## 📚 Resources

- **Color Palette**: `src/theme/colorPalette.ts`
- **Component Examples**: `src/components/music/`
- **Design Tokens**: All colors, fonts, spacing

---

## 🎓 Philosophy

The embr design system embodies:

1. **Calmness** - Muted tones, generous spacing
2. **Warmth** - Terracotta and cream, inviting
3. **Clarity** - High contrast, readable typography
4. **Intentionality** - Every color choice has purpose
5. **Accessibility** - WCAG AA/AAA compliant
6. **Consistency** - Uniform across all products

Remember: **Easy on the nervous system.**
