# UI Component Library Migration Guide

This guide documents the migration of UI components from `apps/web/src/components/ui` to `packages/ui` to establish a shared component library for the Embr ecosystem.

## 🎯 Migration Status

**Phase 3 Complete:** All components have been moved to `packages/ui` and are properly exported.

### Components Migrated

- ✅ Button
- ✅ Input
- ✅ TextArea
- ✅ Avatar
- ✅ Card
- ✅ Modal
- ✅ PageState
- ✅ Toast (with ToastProvider and useToast hook)

### Utilities Migrated

- ✅ `cn()` utility function

## 📦 New Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Avatar.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── PageState.tsx
│   │   ├── TextArea.tsx
│   │   ├── Toast.tsx
│   │   └── index.ts
│   ├── utils/
│   │   ├── cn.ts
│   │   └── index.ts
│   └── index.ts
├── README.md
├── MIGRATION_GUIDE.md
└── package.json
```

## 🔄 Import Changes

### Before (Old Path)

```typescript
import { Button, Input, Modal } from '@/components/ui';
```

### After (New Path)

```typescript
import { Button, Input, Modal } from '@embr/ui';
```

### Backward Compatibility

The old import path still works during the transition:

```typescript
// This still works (re-exported from @embr/ui)
import { Button } from '@/components/ui';
```

However, **new code should use the new `@embr/ui` import path**. The backward compatibility layer will be removed in a future release.

## 📋 Setup Instructions

### 1. Install Dependencies

The `@embr/ui` package is marked as `private` in `package.json` and uses monorepo structure. No additional installation needed.

### 2. Configure TypeScript Paths

Ensure your `tsconfig.json` includes the monorepo path resolution:

```json
{
  "compilerOptions": {
    "paths": {
      "@embr/ui": ["../../packages/ui/src"]
    }
  }
}
```

### 3. Import Components

```typescript
import { Button, Input, Modal, Avatar, Card, PageState } from '@embr/ui';
import { ToastProvider, useToast } from '@embr/ui';
```

### 4. Include CSS Styles

The components rely on CSS classes defined in `apps/web/src/styles/design-system.css`.

Add this import to your app root or layout component:

```typescript
import '@/styles/design-system.css';
```

Or if importing from packages/ui:

```typescript
// In your app's entry point
import '@embr/ui/styles/design-system.css'; // Future: CSS will be included in package
```

For now, **consuming applications must import the CSS from `apps/web`**.

## 🎨 Design Tokens

Access design system values programmatically:

```typescript
import { designTokens } from '@embr/ui';

const primaryColor = designTokens.colors.primary; // #c4997d
const spacing = designTokens.spacing.md; // 1rem
```

## 🔧 Development

### Making Changes to Components

1. Edit component in `packages/ui/src/components/`
2. Update `packages/ui/src/components/index.ts` if adding new exports
3. Changes automatically available to consuming apps

### Adding New Components

1. Create component in `packages/ui/src/components/`
2. Export from `packages/ui/src/components/index.ts`
3. Export from `packages/ui/src/index.ts`
4. Update `apps/web/src/components/ui/index.ts` for backward compatibility

Example:

```typescript
// packages/ui/src/components/Badge.tsx
export function Badge({ variant, children }: BadgeProps) {
  // ...
}

// packages/ui/src/components/index.ts
export { Badge } from './Badge';

// packages/ui/src/index.ts
export { Badge } from './components';

// apps/web/src/components/ui/index.ts (for backward compatibility)
export { Badge } from '@embr/ui';
```

## 🚀 Future Work

### Phase 4: Styling Consolidation

- [ ] Move CSS from `apps/web/src/styles/` to `packages/ui/src/styles/`
- [ ] Include CSS in package build
- [ ] Remove CSS dependency on apps/web

### Phase 5: Mobile Support

- [ ] Add mobile-specific components if needed
- [ ] Test components in React Native context
- [ ] Document mobile usage patterns

### Phase 6: Documentation

- [ ] Set up Storybook for component showcase
- [ ] Create component testing guide
- [ ] Document accessibility features
- [ ] Add animation/transition guidelines

## 🔗 Related Files

- **Design System**: `apps/web/src/theme/DESIGN_SYSTEM.md`
- **CSS Styles**: `apps/web/src/styles/design-system.css`
- **Color Palette**: `apps/web/src/theme/colorPalette.ts`
- **Component README**: `packages/ui/README.md`

## 📝 Migration Checklist

For developers updating imports:

- [ ] Update existing imports from `@/components/ui` to `@embr/ui`
- [ ] Verify TypeScript paths are configured
- [ ] Test component rendering
- [ ] Check accessibility attributes
- [ ] Verify styling applies correctly
- [ ] Test loading/disabled states
- [ ] Test focus management (for interactive components)
- [ ] Test on different screen sizes

## ❓ FAQ

**Q: Can I still use the old import path?**
A: Yes, but it's not recommended. Use `@embr/ui` for new code.

**Q: Where is the CSS?**
A: Currently in `apps/web/src/styles/design-system.css`. Make sure this is imported in your app.

**Q: Can I use these components in other apps?**
A: Yes! That's the whole point. Add `@embr/ui` imports to any app in the monorepo.

**Q: What if I need to customize a component?**
A: Edit the component in `packages/ui/src/components/` and the change applies everywhere.

**Q: How do I add a new component?**
A: See "Adding New Components" section above.

## 🤝 Contributing

When adding features or fixing bugs:

1. Make changes in `packages/ui`
2. Test in `apps/web`
3. Document in component's JSDoc
4. Update this guide if needed
5. Add backward compatibility re-export if necessary

---

**Last Updated:** 2026-02-28
**Status:** Phase 3 Complete ✅
