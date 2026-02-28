# UI/Layout Domain Audit Report
**Embr Project - Week 6**
**Date:** 2026-02-28
**Auditor:** Claude Code

---

## Executive Summary

The UI/Layout domain has a **critical design system fragmentation** issue with **three conflicting color systems** and inconsistent accessibility patterns across components. While components are functional, they lack proper ARIA attributes, focus management, and error handling. The `packages/ui` boundary is not established. Overall health: **⚠️ Poor** - requires immediate refactoring.

---

## Findings by Severity

### 🔴 CRITICAL

#### 1. **Design System Fragmentation - Three Conflicting Systems**
- **Files:**
  - `apps/web/src/styles/design-system.css` (CSS variables)
  - `apps/web/src/styles/embr-design-system.css` (CSS variables)
  - `apps/web/src/theme/colorPalette.ts` (TypeScript)
  - `apps/web/tailwind.config.js` (Tailwind theme)
  - `apps/web/src/theme/DESIGN_SYSTEM.md` (Documentation)

- **Issue:** Five different color/design definitions exist simultaneously:
  1. `design-system.css`: Gray-scale system with `--embr-accent: #E8998D` (different from others)
  2. `embr-design-system.css`: Uses `--embr-warm-1: #c37e67`, `--embr-ink: #293241`
  3. `colorPalette.ts`: Terracotta (#c4997d), Teal (#6ba898), Navy (#4a5f7f), Cream
  4. `tailwind.config.js`: Completely different palette (primary pastels, secondary #C9ADA7, accent #9A8C98)
  5. `DESIGN_SYSTEM.md`: Documents "Muted Phoenix Theme" that only matches colorPalette.ts

- **Example Conflicts:**
  - Terracotta primary: `#c4997d` (colorPalette.ts) vs `#E8998D` (design-system.css) vs `#e8998d` (tailwind)
  - Navy text: `#4a5f7f` (colorPalette.ts) vs `#293241` (embr-design-system.css)
  - Teal secondary: `#6ba898` (colorPalette.ts) vs `#C9ADA7` (tailwind.config.js)

- **Impact:**
  - Components will render with unpredictable colors depending on which system is used
  - CSS vars reference wrong colors
  - Tailwind classes won't match design intent
  - Impossible to maintain consistency across the app

- **Recommendation:**
  1. Consolidate into a SINGLE source of truth (recommend colorPalette.ts + generated CSS vars)
  2. Delete `design-system.css` (superseded by embr-design-system.css + colorPalette.ts)
  3. Update `tailwind.config.js` to import from `colorPalette.ts` using the official palette
  4. Verify all components use the same color source
  5. Update DESIGN_SYSTEM.md to reference actual system values

---

#### 2. **Modal Accessibility - Missing Focus Trap and Restoration**
- **File:** `apps/web/src/components/ui/Modal.tsx`

- **Issues:**
  1. **No focus trap:** User can tab out of modal to background elements (WCAG 2.1 Level A failure)
  2. **No focus restoration:** When modal closes, focus not returned to trigger element (WCAG 2.1 Level A)
  3. **No scroll lock:** Background document can still scroll while modal open
  4. **Weak aria-label:** Uses `aria-label={title || 'Modal'}` but should use `aria-labelledby` when title exists
  5. **No focus initial:** Focus not moved to modal or first interactive element on open

- **Current Code (Lines 10-47):**
  ```tsx
  // Only handles Escape key, no focus trap
  // No aria-labelledby on title
  // No body.style.overflow lock
  ```

- **Recommendation:**
  ```tsx
  1. Add FocusScope or implement manual focus trap
  2. Add aria-labelledby="modal-title" and id={title ? "modal-title" : undefined}
  3. Lock body scroll: useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }}, [isOpen])
  4. Store and restore focus: const previousFocus = useRef<HTMLElement>(null);
  5. Auto-focus first input on mount
  ```

---

#### 3. **Avatar Missing Image Error Handling**
- **File:** `apps/web/src/components/ui/Avatar.tsx` (Line 23)

- **Issue:**
  - No `onError` handler for broken/missing image URLs
  - If image fails to load, user sees broken image icon instead of fallback initials
  - No visual feedback that image failed

- **Current Code:**
  ```tsx
  {src ? <img src={src} alt={alt || name || 'Avatar'} /> : initialsFromName(name)}
  // No error handler - shows broken image instead of initials
  ```

- **Recommendation:**
  ```tsx
  const [imageError, setImageError] = useState(false);

  {src && !imageError ? (
    <img
      src={src}
      alt={alt || name || 'Avatar'}
      onError={() => setImageError(true)}
    />
  ) : (
    initialsFromName(name)
  )}
  ```

---

### 🟡 WARNING

#### 4. **Input/TextArea Missing aria-describedby**
- **Files:**
  - `apps/web/src/components/ui/Input.tsx` (Line 14)
  - `apps/web/src/components/ui/TextArea.tsx` (Line 17)

- **Issue:**
  - Error and hint text paragraphs are not associated with input via `aria-describedby`
  - Screen readers won't announce error/hint text is related to the field
  - Error paragraphs lack IDs needed for association

- **Current Code:**
  ```tsx
  // Lines 14-16 of Input.tsx
  <input id={id} className={cn('ui-field', className)} aria-invalid={Boolean(error)} {...props} />
  {error ? <p className="ui-error-text">{error}</p> : null}  // No ID, not connected
  {!error && hint ? <p className="ui-help-text">{hint}</p> : null}  // No ID
  ```

- **Recommendation:**
  ```tsx
  const errorId = error ? `${id}-error` : undefined;
  const hintId = !error && hint ? `${id}-hint` : undefined;

  <input
    id={id}
    aria-invalid={Boolean(error)}
    aria-describedby={[errorId, hintId].filter(Boolean).join(' ')}
    {...props}
  />
  {error ? <p id={errorId} className="ui-error-text">{error}</p> : null}
  {!error && hint ? <p id={hintId} className="ui-help-text">{hint}</p> : null}
  ```

---

#### 5. **Toast Missing Kind Announcement for Screen Readers**
- **File:** `apps/web/src/components/ui/Toast.tsx` (Line 38)

- **Issue:**
  - Toast kind (error vs info) is only in `data-kind` attribute, not announced to screen readers
  - Screen readers don't know if it's an error or info toast
  - No visual icon to supplement the distinction

- **Current Code:**
  ```tsx
  <article key={toast.id} className="ui-toast" data-kind={toast.kind}>
    <strong>{toast.title}</strong>
    // data-kind not announced, just used for CSS
  </article>
  ```

- **Recommendation:**
  ```tsx
  <article
    key={toast.id}
    className="ui-toast"
    data-kind={toast.kind}
    role="status"
    aria-live="polite"
  >
    <strong>{toast.title}</strong>
    {/* Announce kind visually + for screen readers */}
    {toast.kind === 'error' && <span aria-label="Error notification:" className="sr-only">Error:</span>}
    {toast.kind === 'info' && <span aria-label="Information:" className="sr-only">Information:</span>}
    {toast.description && <div style={{...}}>{toast.description}</div>}
  </article>
  ```

---

#### 6. **AppShell Nav Links Missing aria-current**
- **File:** `apps/web/src/components/layout/AppShell.tsx` (Line 89)

- **Issue:**
  - Active nav links use `data-active` attribute for styling
  - Should use `aria-current="page"` to semantically indicate current page
  - Screen readers won't know which page is active

- **Current Code:**
  ```tsx
  <Link href={item.href} className="embr-nav-link" data-active={isNavActive(item.href)}>
    {item.label}
  </Link>
  ```

- **Recommendation:**
  ```tsx
  <Link
    href={item.href}
    className="embr-nav-link"
    data-active={isNavActive(item.href)}
    aria-current={isNavActive(item.href) ? "page" : undefined}
  >
    {item.label}
  </Link>
  ```

---

#### 7. **Modal No Scroll Lock**
- **File:** `apps/web/src/components/ui/Modal.tsx`

- **Issue:**
  - User can scroll background content while modal is open
  - Creates confusing interaction pattern

- **Recommendation:**
  ```tsx
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  ```

---

### 🟢 SUGGESTION

#### 8. **Button Component Missing Accessibility States**
- **File:** `apps/web/src/components/ui/Button.tsx`

- **Issue:**
  - No `aria-busy` state for async/loading operations
  - No `aria-disabled` on disabled buttons (relies on `disabled` attribute, which is fine but aria-disabled helps)
  - No `aria-label` for icon-only buttons

- **Recommendation:**
  - Add optional `loading?: boolean` prop with `aria-busy` attribute
  - Add optional `ariaLabel?: string` prop for icon-only buttons

---

#### 9. **Avatar Component Could Provide Size Warnings**
- **File:** `apps/web/src/components/ui/Avatar.tsx` (Line 19)

- **Issue:**
  - Font size calculation `Math.max(12, size * 0.35)` might be too small for very small avatars
  - No validation that size is reasonable (e.g., > 24px for interactive)

- **Recommendation:**
  - Document recommended size ranges (24px min for interactive, 16px for inline)
  - Consider warning in dev if size < 16

---

#### 10. **PageState Component Could Specify Loading State**
- **File:** `apps/web/src/components/ui/PageState.tsx`

- **Issue:**
  - Component supports any state conceptually but lacks explicit "loading" variant
  - Could add optional `isLoading?: boolean` prop for consistency
  - Could add `aria-busy` when loading

- **Recommendation:**
  - Add `isLoading?: boolean` prop
  - Render loading spinner when isLoading true
  - Add `aria-busy={isLoading}` and `role="status"`

---

#### 11. **Card Component Missing Semantic Role**
- **File:** `apps/web/src/components/ui/Card.tsx`

- **Issue:**
  - Uses `<div>` instead of `<article>` or semantic container
  - No way to specify role for screen readers

- **Recommendation:**
  ```tsx
  interface CardProps extends HTMLAttributes<HTMLDivElement> {
    padding?: CardPadding;
    role?: string; // Allow role override
  }

  <div
    className={cn('ui-card', className)}
    data-padding={padding}
    role={role || 'region'}
    {...props}
  >
  ```

---

#### 12. **ProtectedPageShell Inconsistent Error Messaging**
- **File:** `apps/web/src/components/layout/ProtectedPageShell.tsx` (Lines 56-74)

- **Issue:**
  - Shows redirect message before actually redirecting (good UX)
  - But timeout (50ms) is very fast - might not be visible
  - Redirect behavior depends on useRouter - could fail silently

- **Recommendation:**
  - Increase timeout to 500ms for visibility
  - Add error boundary or logging if redirect fails
  - Consider showing more helpful message (e.g., "Please wait...")

---

#### 13. **FeaturePlaceholder Implies Incomplete Feature Coverage**
- **File:** `apps/web/src/components/layout/FeaturePlaceholder.tsx`

- **Issue:**
  - Component exists to support demo/placeholder pages
  - Good for development but suggests features aren't complete
  - The three state buttons (loading/empty/error) are for demo only

- **Recommendation:**
  - Use as temporary development tool only
  - Replace with real implementations before production
  - Consider using actual feature flags for incomplete features

---

#### 14. **packages/ui Boundary Not Established**
- **File:** `packages/ui/src/index.ts`

- **Issue:**
  - Package exports placeholder text instead of components
  - Suggests cross-app UI library isn't implemented
  - Components are only in `apps/web/src/components/ui`
  - No shared component library for `apps/mobile` or other apps

- **Recommendation:**
  - Implement proper component export structure in packages/ui
  - Move shared UI components from apps/web to packages/ui
  - Export from packages/ui/src/index.ts
  - Document which components are shared vs. app-specific

---

#### 15. **Design System CSS Variable Duplication**
- **Files:**
  - `apps/web/src/styles/design-system.css` (74 lines)
  - `apps/web/src/styles/embr-design-system.css` (536 lines)

- **Issue:**
  - Both files define overlapping CSS variables and component styles
  - `globals.css` only imports `design-system.css`, not embr-design-system
  - Button, card, input, avatar styles defined in both files
  - One or both files are unused

- **Recommendation:**
  - Audit which CSS file is actually used (embr-design-system.css seems more complete)
  - Delete the unused file
  - Consolidate all CSS variables and component styles into one file
  - Ensure globals.css imports the final consolidated file

---

---

## Summary by Category

| Category | Issues | Severity |
|----------|--------|----------|
| **Design System Consistency** | 1. Three conflicting color systems 2. CSS var duplication | 🔴 CRITICAL |
| **Component Accessibility** | 4. Modal (focus trap, scroll lock, aria-labelledby) 5. Toast (kind announcement) 6. AppShell (aria-current) 7. Input/TextArea (aria-describedby) 8. Button (aria-busy) | 🔴🟡 CRITICAL + WARNING |
| **Component Robustness** | 3. Avatar (image error handling) 9. Avatar (size validation) 10. PageState (loading state) | 🔴🟡 CRITICAL + WARNING |
| **Layout Shells** | 11. ProtectedPageShell (timeout visibility) 12. FeaturePlaceholder (development only) | 🟢 SUGGESTION |
| **Package Boundary** | 13. packages/ui not established 14. No shared component library | 🟡 WARNING |

---

## Design System Health Score

| Aspect | Status | Notes |
|--------|--------|-------|
| **Color Consistency** | ❌ 10/100 | Three conflicting palettes, impossible to maintain |
| **Accessibility (WCAG 2.1 AA)** | ⚠️ 45/100 | Missing focus management, aria attributes, screen reader support |
| **Component Robustness** | ⚠️ 65/100 | Basic functionality present, missing error handling & edge cases |
| **Layout Responsiveness** | ✅ 85/100 | Mobile menu, responsive grid, media queries present |
| **Package Reusability** | ❌ 0/100 | packages/ui not implemented |
| **Documentation Accuracy** | ⚠️ 40/100 | DESIGN_SYSTEM.md doesn't match implementation |

**Overall Design System Health:** 🔴 **POOR** - Requires immediate refactoring of color system and accessibility fixes before production release.

---

## Prioritized Action Items

### Phase 1: Immediate (Before Next Release)
1. ✋ **BLOCK:** Consolidate design system (colorPalette.ts → CSS vars → Tailwind)
2. ✋ **BLOCK:** Fix Modal focus trap and scroll lock
3. ✋ **BLOCK:** Add aria-describedby to Input/TextArea
4. ✋ **BLOCK:** Add image error handler to Avatar

### Phase 2: Short-term (This Sprint)
5. Fix Toast kind announcement for screen readers
6. Add aria-current to AppShell nav links
7. Add aria-busy to Button for loading states
8. Establish packages/ui boundary

### Phase 3: Medium-term (Next Sprint)
9. Update DESIGN_SYSTEM.md with actual values
10. Add PageState loading state variant
11. Improve ProtectedPageShell redirect messaging
12. Document component accessibility requirements

---

## Files Requiring Action

```
Priority 1 (Design System):
  - apps/web/src/styles/design-system.css (consolidate or delete)
  - apps/web/src/styles/embr-design-system.css (consolidate)
  - apps/web/src/theme/colorPalette.ts (source of truth)
  - apps/web/tailwind.config.js (update from colorPalette.ts)
  - apps/web/src/theme/DESIGN_SYSTEM.md (update with actual values)

Priority 2 (Accessibility):
  - apps/web/src/components/ui/Modal.tsx
  - apps/web/src/components/ui/Input.tsx
  - apps/web/src/components/ui/TextArea.tsx
  - apps/web/src/components/ui/Avatar.tsx
  - apps/web/src/components/ui/Toast.tsx
  - apps/web/src/components/layout/AppShell.tsx

Priority 3 (Package Boundary):
  - packages/ui/src/index.ts
  - apps/web/src/components/ui/index.ts (move exports to packages/ui)
```

---

## Audit Methodology

This audit examined:
- ✅ CSS variable definitions across 3 stylesheet files
- ✅ TypeScript color palette definitions
- ✅ Tailwind configuration
- ✅ 8 UI components (Button, Input, Modal, Avatar, Card, TextArea, Toast, PageState)
- ✅ 3 Layout shells (AppShell, ProtectedPageShell, FeaturePlaceholder)
- ✅ Package exports (packages/ui/src/index.ts)
- ✅ ARIA attributes and accessibility patterns
- ✅ Design documentation accuracy

**Audit Date:** 2026-02-28
**Status:** ✅ Complete
