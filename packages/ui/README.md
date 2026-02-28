# @embr/ui

Shared React UI components for the Embr ecosystem.

This package provides a consistent set of UI components designed to be used across Embr applications (web, mobile, etc.) to maintain visual and behavioral consistency.

## 🎨 Design System

Built on the **Muted Phoenix Theme** — a calm, warm, intentional design system that respects user attention.

### Color Palette

- **Primary (Terracotta)**: `#c4997d` - Warm, welcoming, energetic
- **Secondary (Teal)**: `#6ba898` - Flow, calm, natural rhythm
- **Accent (Navy)**: `#4a5f7f` - Grounding, provides contrast
- **Neutral (Cream)**: `#fefdfb` - Background, breathing room

### Components

#### Form Components

##### `Button`
Primary interactive element with support for variants and loading states.

```typescript
<Button variant="primary" loading={isSubmitting} ariaLabel="Submit form">
  Submit
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost'
- `loading`: boolean (disables button, shows aria-busy)
- `fullWidth`: boolean
- `ariaLabel`: string (for icon-only buttons)

**Accessibility:**
- Semantic `<button>` element
- `aria-busy` on loading state
- `aria-label` for icon-only buttons
- Disabled state properly handled

##### `Input`
Text input with integrated label, error, and hint text.

```typescript
<Input
  id="email"
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  error={errors.email}
  hint="We'll never share your email"
/>
```

**Props:**
- `label`: string
- `error`: string (shows error message)
- `hint`: string (shows help text)

**Accessibility:**
- `aria-describedby` connects error/hint text
- `aria-invalid` on error state
- Proper label association via `htmlFor`

##### `TextArea`
Multi-line text input with same accessibility as Input.

```typescript
<TextArea
  id="message"
  label="Message"
  error={errors.message}
/>
```

#### Display Components

##### `Avatar`
User profile image with initials fallback.

```typescript
<Avatar src={imageUrl} name="John Doe" size={40} />
```

**Props:**
- `src`: string | null
- `name`: string | null
- `alt`: string
- `size`: number (default: 36)

**Accessibility:**
- `aria-label` with user name or fallback
- Graceful degradation if image fails to load
- Shows initials as fallback

##### `Card`
Container component for grouping related content.

```typescript
<Card padding="lg">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>
```

**Props:**
- `padding`: 'none' | 'sm' | 'md' | 'lg'

##### `PageState`
Component for displaying loading, empty, or error states.

```typescript
<PageState
  title="No items found"
  description="Try adjusting your search filters"
  isLoading={loading}
  actionLabel="Try again"
  onAction={handleRetry}
/>
```

**Props:**
- `title`: string (required)
- `description`: string
- `actionLabel`: string
- `onAction`: () => void
- `isLoading`: boolean
- `icon`: ReactNode

**Accessibility:**
- `role="status"` and `aria-busy` on loading
- Semantic `<section>` element
- Action button properly disabled during loading

#### Dialog Components

##### `Modal`
Accessible dialog component with focus trap and scroll lock.

```typescript
<Modal isOpen={isOpen} onClose={handleClose} title="Confirm Action">
  Are you sure you want to proceed?
</Modal>
```

**Props:**
- `isOpen`: boolean (required)
- `onClose`: () => void (required)
- `title`: string

**Accessibility:**
- Focus trap (Tab stays within modal)
- Body scroll lock while open
- Focus restoration on close
- `aria-labelledby` for title association
- `aria-modal="true"`
- Escape key closes modal

#### Notification Components

##### `Toast` (via `useToast()` hook)
Non-modal notification system for alerts and status updates.

```typescript
const { showToast } = useToast();

showToast({
  title: 'Success!',
  description: 'Your changes have been saved',
  kind: 'info'
});
```

**Accessibility:**
- `aria-live="polite"` for screen reader announcements
- Kind announcement (error vs info)
- Non-blocking, allows continued interaction

## 🔧 Usage

### Installation

```bash
npm install @embr/ui
```

### Import Components

```typescript
import { Button, Input, Modal } from '@embr/ui';
```

### TypeScript Support

All components include full TypeScript definitions:

```typescript
import type { ButtonProps, InputProps } from '@embr/ui';
```

## ♿ Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- Proper semantic HTML (`<button>`, `<input>`, `<section>`, etc.)
- ARIA labels and descriptions where needed
- Focus management and keyboard navigation
- Color contrast compliance (7:1 AAA ratio)
- Screen reader friendly announcements

## 📏 Design Tokens

Access design system values:

```typescript
import { designTokens } from '@embr/ui';

const primaryColor = designTokens.colors.primary; // #c4997d
const spacing = designTokens.spacing.md; // 1rem
```

## 🚀 Future Work

- Move component implementations from `apps/web` to `packages/ui/src/components`
- Add Storybook for component documentation
- Add comprehensive tests
- Establish component extension patterns
- Document styling customization

## 📝 Contributing

When adding new components:

1. **Accessibility first**: Include ARIA attributes, semantic HTML, keyboard support
2. **TypeScript**: Export component props interfaces
3. **Responsive**: Design for mobile-first
4. **Tests**: Test component behavior and accessibility
5. **Documentation**: Document props and usage examples

## 📚 Resources

- **Design System**: See `apps/web/src/theme/DESIGN_SYSTEM.md`
- **Color Palette**: See `apps/web/src/theme/colorPalette.ts`
- **Styles**: See `apps/web/src/styles/design-system.css`
