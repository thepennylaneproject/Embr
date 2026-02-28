# @embr/ui Styles

This directory contains all design system CSS and component styling for the `@embr/ui` package.

## Files

- **design-system.css** - Complete design system including:
  - CSS custom properties (design tokens)
  - Color palettes (Primary, Secondary, Accent, Neutral)
  - Semantic colors (Success, Warning, Error, Info)
  - Component-specific styles (.ui-button, .ui-card, .ui-input, etc.)
  - Layout utilities (.embr-* classes)
  - Responsive breakpoints

- **index.css** - Main entry point that imports all styles

## Importing Styles

### Method 1: Import index.css (Recommended)

In your application's root component or entry point:

```typescript
// apps/web/src/styles/globals.css
@import '@embr/ui/src/styles/index.css';
```

Or in JavaScript:

```typescript
// src/_app.tsx or src/main.tsx
import '@embr/ui/src/styles/index.css';
```

### Method 2: Import design-system.css directly

```css
@import '@embr/ui/src/styles/design-system.css';
```

## CSS Custom Properties

All design tokens are exposed as CSS custom properties on `:root`:

```css
/* Colors */
--embr-primary-400: #c4997d;
--embr-secondary-400: #6ba898;
--embr-accent-500: #4a5f7f;
--embr-neutral-50: #fefdfb;

/* Semantic Colors */
--embr-success: #6ba898;
--embr-warning: #c4997d;
--embr-error: #9b6b5a;
--embr-info: #4a5f7f;

/* Spacing */
--embr-radius-sm: 8px;
--embr-radius-md: 12px;
--embr-radius-lg: 16px;
--embr-radius-xl: 24px;

/* Shadow */
--embr-shadow: 0 16px 40px rgba(41, 50, 65, 0.08);
```

## Component Styles

Component styling is automatically included. Styles are defined for:

### Form Components
- `.ui-button` - Button component styles
- `.ui-field` - Input component styles
- `.ui-textarea` - TextArea component styles
- `.ui-label` - Form label styles
- `.ui-help-text` - Helper/hint text styles
- `.ui-error-text` - Error text styles

### Display Components
- `.ui-card` - Card component styles with padding variants
- `.ui-avatar` - Avatar component styles
- `.ui-page-state` - Page state component styles

### Dialog Components
- `.ui-modal-overlay` - Modal overlay styling
- `.ui-modal` - Modal dialog styling

### Notification Components
- `.ui-toast-stack` - Toast notification container
- `.ui-toast` - Individual toast styling with kind variants

### Layout Utilities
- `.embr-page` - Page wrapper
- `.embr-container` - Content container with max-width
- `.embr-shell` - Shell layout with header and content
- `.embr-header` - Sticky header
- `.embr-main-nav` - Navigation menu
- `.embr-breadcrumbs` - Breadcrumb navigation

## Color Palette

### Muted Phoenix Theme

**Primary - Terracotta**
```
50: #faf6f4
100: #f5eee9
200: #ebd7cc
300: #d9baa8
400: #c4997d (Primary)
500: #b88566
600: #a67452
700: #886043
800: #6d4a37
900: #523729
```

**Secondary - Teal**
```
50: #f0f7f6
100: #dceee8
200: #b8d9d3
300: #8dbfb0
400: #6ba898 (Secondary)
500: #5a9684
600: #497e6f
700: #3a6659
800: #2d5246
900: #213c35
```

**Accent - Navy**
```
50: #f5f7fa
100: #e8ecf2
200: #cbd5e3
300: #a1b3c8
400: #6a7f9e
500: #4a5f7f (Accent)
600: #374563
700: #2c3847
800: #232d39
900: #1a202c
```

**Neutral - Cream**
```
50: #fefdfb (Background)
100: #faf8f5
200: #f3ebe5
300: #e8ddd2
400: #d4ccc0
500: #c0b8ac
600: #a89d91
700: #8f8478
800: #76695e
900: #5d5248
```

## Responsive Breakpoints

The styles include responsive behavior at:

- **Mobile**: `max-width: 900px`
  - Navigation becomes mobile menu
  - Header layout adjusts
  - Component spacing optimized

## Accessibility

- Focus visible states: `outline: 3px solid var(--embr-focus)`
- Outlined at 2px offset for visibility
- High contrast text colors (WCAG AAA)
- Semantic color usage (success, warning, error)

## Future Enhancements

- [ ] Extract CSS variables to separate file
- [ ] Add dark mode support
- [ ] Create CSS modules for each component
- [ ] Add animation/transition library
- [ ] Generate CSS from design tokens

---

**Last Updated:** 2026-02-28
**Stable:** Yes ✅
