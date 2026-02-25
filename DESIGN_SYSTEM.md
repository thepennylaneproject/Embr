# EMBR Design System
## Philosophy: Clarity Over Noise

---

## Core Principle

**Reduce cognitive load. Use typography, whitespace, and spatial hierarchy—not cards and buttons.**

We are building for creators who are tired of algorithmic chaos. The interface should feel like peace, not another notification factory.

---

## What We're NOT Doing

❌ **SaaS Startup Hell:**
- Endless card layouts
- "Primary", "Secondary", "Ghost", "Destructive" button variants
- Color-coded hierarchy (red=urgent, green=good, blue=info)
- Hamburger menus hiding primary navigation
- Nested dropdowns
- Visual density for density's sake
- Busy iconography

❌ **Social Media Overload:**
- Notifications everywhere
- Engagement metrics in your face
- Algorithmic feeds with endless scroll
- Dark patterns to keep you clicking
- Too many call-to-actions per screen

---

## What We ARE Doing

✅ **Typography as Structure**
- Large, clear headlines (H1: 48px+, bold)
- Readable body copy (18-20px)
- Visual hierarchy through size, not color
- Generous line-height (1.6+)

✅ **Whitespace as Design**
- Breathing room between sections
- Margins > 32px between major sections
- 16-24px padding within containers
- Empty space is intentional, not wasted

✅ **Lines & Boxes for Division**
- Subtle borders (1px, light gray)
- Background color blocks (off-white, very subtle)
- Indentation for relationships
- Visual hierarchy through spatial relationships

✅ **Limited Color Palette**
- Primary: Warm accent (#E8998D) - used sparingly
- Neutrals: Black, white, 2-3 grays
- Status only: Green (success), Red (error), Amber (warning)
- No more than 3 accent colors per page

✅ **One Primary Action Per Screen**
- What's the user supposed to do here?
- Make it obvious through size, position, color
- Secondary actions are less visually prominent

✅ **Scannable, Not Skimmable**
- Users understand the page in 3 seconds
- Clear sections with clear purposes
- No "hidden" content unless necessary
- Progressive disclosure (details revealed, not dumped)

---

## Typography System

```
H1: 48px | 700 (bold) | Black | +24px margin top
  → Page titles, major announcements

H2: 32px | 600 (semibold) | Black | +20px margin top
  → Section headers, key information

H3: 24px | 600 (semibold) | Black | +16px margin top
  → Subsection headers

Body: 18px | 400 | #333 | Line height 1.6
  → Main content, descriptions

Label: 14px | 500 | #666 | Uppercase 0.1em tracking
  → Field labels, captions

Small: 14px | 400 | #999
  → Metadata, timestamps, help text
```

**Why this matters:**
- 18px body is readable, not cramped
- Generous line-height prevents fatigue
- Clear size differences = clear hierarchy
- No need for color to distinguish importance

---

## Layout System

### Page Structure

```
[Header/Navigation]
    (minimal, always visible)

[Page Title]
    H1, 48px, centered or left-aligned
    Clear purpose statement

[Main Content]
    Max width: 900px (narrow)
    or Full width for dashboard

[Sections]
    Separated by whitespace (48px+)
    Not by cards or borders (unless needed)

[Footer]
    (if applicable, minimal)
```

### Section Spacing

```
Major sections:     64px gap
Related subsections: 32px gap
Related items:      16px gap
Inline elements:    8px gap
```

### Container Patterns

**Pattern 1: Whitespace Division (Preferred)**
```
[Header]
                    ↓ 48px whitespace
[Content Section 1]
                    ↓ 48px whitespace
[Content Section 2]
```

**Pattern 2: Subtle Border**
```
[Content Section 1]
━━━━━━━━━━━━━━━━━━━ (1px, #E0E0E0)
[Content Section 2]
```

**Pattern 3: Subtle Background**
```
┌─────────────────────┐
│ [Background: #F9F9F9] (only if needed for clarity)
│ [Content]
└─────────────────────┘
```

**Avoid:**
```
┏━━━━━━━━━━━━━━━━━━━┓
┃ [Card with shadow] ┃
┗━━━━━━━━━━━━━━━━━━━┛
```

---

## Color Usage

### Palette
```
Black:        #000000 (text, headers)
Dark Gray:    #333333 (body text)
Medium Gray:  #666666 (secondary text)
Light Gray:   #999999 (disabled, captions)
Very Light:   #F5F5F5 (background)
White:        #FFFFFF (backgrounds)

Accent:       #E8998D (Embr warm, used sparingly)
Success:      #22C55E (only for confirmations)
Error:        #EF4444 (only for errors)
Warning:      #F59E0B (only for warnings)
```

### Color Usage Rules

✅ Use warm accent (#E8998D) for:
- Primary action buttons
- Important links
- Key metrics or highlights
- One accent per page maximum

✅ Use gray for:
- Body text (#333)
- Secondary information (#666)
- Disabled states (#999)
- Backgrounds (#F5F5F5)

❌ Don't use:
- Blue (overused, corporate)
- Purple, pink, etc. (visual noise)
- Gradients (distracting)
- Color-coded status (use icons or labels instead)

---

## Button & Interactive System

### Button Hierarchy

**Primary Action (One per context)**
```
[Publish]        ← Bold, warm accent, 16px text, 12px padding
                   Obvious, can't miss it
```

**Secondary Action (Multiple allowed)**
```
[Save Draft]     ← Gray text, subtle border, minimal styling
                   Clearly secondary
```

**Tertiary Action (Multiple allowed)**
```
[More options]   ← Gray text, no border, small
                   Least important
```

### Interactive Principles

- Minimum touch target: 44px
- Hover state: Subtle opacity change or background shift
- No color change on hover (inconsistent with rest of page)
- Loading state: Simple spinner, no flashing
- Focus state: Clear outline for keyboard users

---

## Information Density

### DO:
- Show what's important
- Hide what's not (for now)
- Use progressive disclosure
- Group related information
- Breathe

### DON'T:
- Show everything at once
- Use tables unless necessary
- Nest information 3+ levels deep
- Use small text for important info
- Crowd things together

---

## Examples

### Example 1: Earnings Dashboard (Good Design)

```
EARNINGS                    ← H1, large, simple

This Month: $4,850          ← Key metric, huge, prominent
                            ↓ generous whitespace

By Source                   ← H2, smaller than title
Subscriptions     $2,100    ← Simple list, right-aligned numbers
Gigs              $1,200
Tips              $280
Sales             $270

                            ↓ whitespace divider

Available to Withdraw       ← Label
$4,695                      ← Large, clear number
(Minus 3% payment processor)  ← Small text explanation
                            ↓ whitespace

[Withdraw to Bank]          ← Primary action, warm accent
```

**NOT:**
```
╔═════════════════════════════╗
║ EARNINGS THIS MONTH         ║
╠═════════════════════════════╣
║ 📊 $4,850.00               ║
║ ├─ Subscriptions: $2,100   ║
║ ├─ Gigs: $1,200            ║
║ ├─ Tips: $280              ║
║ └─ Sales: $270             ║
║                             ║
║ [View Details] [Export]    ║
║ [Withdraw] [Share]         ║
╚═════════════════════════════╝
```

### Example 2: Creator Profile (Good Design)

```
SARAH CHEN                           ← H1
Historian & Educator

Bio: I teach the history corporations
want you to forget. Based in Portland.
                                      ↓ whitespace + subtle border

SUPPORT SARAH

Subscribe: $60/year                   ← Options, clear, scannable
Tip: [Enter amount]
Book a Gig: $150/hour

                                      ↓ whitespace

RECENT POSTS

[Post 1]
[Post 2]
[Post 3]
```

**NOT:**
```
┌──────────────────────────────────┐
│ ☑ SARAH CHEN                    │
│ 👤 Historian                     │
│ 📍 Portland, OR                  │
│ 📊 4,200 followers               │
│ ❤️ 340 supporters                │
├──────────────────────────────────┤
│ [Follow] [Message] [Support]    │
├──────────────────────────────────┤
│ Bio: Lorem ipsum...              │
├──────────────────────────────────┤
│ Tags: #history #education        │
├──────────────────────────────────┤
│ RECENT POSTS                     │
│ ┌────────────────────────────┐  │
│ │ Post with engagement stats │  │
│ │ ❤️ 340 💬 42 🔄 18         │  │
│ └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## Navigation Design

### Top Navigation (Global)

```
[EMBR Logo]     [Feed] [Create] [Music] [Gigs] [Earnings] [Messages] [Profile]

← Visible always
← Clean, simple text links
← No icons (text is clearer)
← Active state: Underline or color, nothing more
```

**NOT:**
```
[☰]  [Embr]  [🔔] [⚙️]
      |
      ├─ Feed
      ├─ Create
      ├─ Music
      └─ More...
```

---

## Data Visualization

When showing data (earnings, followers, etc.):

✅ **Clean numbers**
```
$4,850          ← Large, readable
```

❌ **Noisy charts**
```
[Line chart with gridlines and 3 data series]
```

✅ **Simple lists**
```
Subscriptions    $2,100
Gigs            $1,200
Tips              $280
```

❌ **Pie charts**
```
[Pie chart with 6 colors and legend]
```

---

## Mobile Design

- Same philosophy, not a different design
- Vertical layout
- Navigation as tabs at bottom (thumb-friendly)
- Full-width containers
- Typography scaled down (H1: 32px, H2: 24px, Body: 16px)
- Touch targets: 48px minimum

---

## Summary: The Embr Design Feel

**It should feel like:**
- A well-designed magazine or newspaper
- Apple's website (clean, intentional)
- Stripe's website (professional, clear)
- Not like: Facebook, Instagram, Twitter, TikTok, any SaaS dashboard

**Users should feel:**
- Calm, not bombarded
- Clear about what to do next
- Respected (not manipulated)
- In control, not controlled

**The visual language says:**
- "We respect your attention"
- "This is for creators"
- "No algorithmic games here"
- "Quality over engagement metrics"

---

## Next Steps

This design system informs every page we build:
1. Earnings Dashboard
2. Creator Profiles
3. Discovery/Browse
4. Groups/Collectives
5. Subscribe/Tip flows
6. Collective voting/decisions

When building these, ask: "Does this follow the design philosophy? Is there unnecessary UI? Can we remove a button? Can whitespace do the work instead?"
