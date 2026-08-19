# Design System — Minimal Garden

> Scandinavian Minimalism meets Japanese *Ma* (間) — the beauty of empty space.

Full design brainstorm: [ideas.md](ideas.md)

---

## Brand Essence

**Tagline:** "Your calm command center for 109 AI agents — organized, beautiful, powerful."

**Personality:** Calm · Elegant · Empowering

**Signature color:** Sage Green `#7C9A82`

**Logo:** Minimalist lotus/leaf mark (Lucide `Leaf` icon) — single stroke, geometric, adapts to theme accent.

---

## Core Principles

1. **Breathing Space** — generous whitespace, nothing feels cramped
2. **Soft Power** — rounded corners, gentle shadows, pastel accents
3. **Clarity First** — information hierarchy through typography weight, not color noise
4. **Warmth** — never cold or sterile; always inviting and human

---

## Themes

Three switchable themes share the same layout but shift mood. Controlled by `ThemeContext` → `document.documentElement.classList`.

### Theme 1: Light Minimal (Default)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FAFAF8` | Page background (warm white) |
| `--foreground` | `#2D2D2D` | Primary text (soft charcoal) |
| `--primary` | `#7C9A82` | Accent, buttons, active nav (sage green) |
| `--card` | `#FFFFFF` | Card surfaces |
| `--border` | `#E8E8E4` | Borders, dividers |
| `--muted-foreground` | `#737373` | Secondary text |

### Theme 2: Soft Pastel

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#F5F0FF` | Lavender mist |
| `--foreground` | `#3D3352` | Deep purple-gray |
| `--primary` | `#D4A0A0` | Soft rose accent |
| `--card` | `#FFFFFF` | Frosted white |
| `--border` | `#E8DFF0` | Pink-tinted borders |

### Theme 3: Dark Elegant

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#1A1B2E` | Deep navy |
| `--foreground` | `#F0EDE8` | Cream text |
| `--primary` | `#C9A96E` | Gold accent |
| `--card` | `#242540` | Dark slate cards |
| `--border` | `#3A3B55` | Subtle borders |

CSS source: `client/src/index.css`

---

## Typography

| Role | Font | Weights |
|------|------|---------|
| Display / Headings | Plus Jakarta Sans | 700, 600 |
| Body | Inter | 400, 500 |
| Mono / Code | JetBrains Mono | 400 |

### Scale

| Element | Size | Weight |
|---------|------|--------|
| Body | 14px (`text-sm`) | 400 |
| H3 | 20px (`text-xl`) | 600 |
| H2 | 28px (`text-2xl`) | 700 |
| H1 | 40px (`text-4xl`) | 700 |

---

## Layout

### Sidebar

- Fixed left, `72px` collapsed → `224px` on hover
- Icon-based navigation with labels revealed on hover
- Brand mark (leaf icon) at top
- Theme switcher (3 dots) and language picker at bottom
- Every page must include the sidebar — no unbranded standalone screens

### Content Area

- `ml-[72px]` offset for sidebar
- `max-w-6xl` on dashboard, flexible on other pages
- Card-based grid with `gap-5` to `gap-6`
- Mobile-first: single column → 2-col → 4-col grids

### Container

Custom `.container` utility in `index.css`:
- Mobile: 16px padding
- Tablet (640px+): 24px padding
- Desktop (1024px+): 32px padding, max-width 1280px

---

## Components

### Cards

```html
<div class="bg-card rounded-2xl border border-border p-6
            transition-all duration-200
            hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
```

- `rounded-2xl` (16px) corners
- Subtle border, white/dark card background
- Hover: 2px lift + shadow expansion

### Status Dots

Fixed color rules — blue is **not** part of the status language:

| Status | Color | Tailwind |
|--------|-------|----------|
| Ready / Self-Hosted | Sage green | `bg-primary` |
| Hybrid | Warm amber | `bg-amber-500` |
| Cloud | Neutral gray | `bg-gray-400` |

### Badges / Tags

- Pill-shaped (`rounded-full`)
- Soft background with matching text color
- Used for agent tier, sprint status, task status

### Buttons

shadcn/ui `Button` with variants: `default`, `outline`, `ghost`, `destructive`
Primary buttons use `--primary` (theme-adaptive).

---

## Animation

| Property | Value |
|----------|-------|
| Duration | 200–300ms max |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Hover lift | `translateY(-2px)` + shadow expansion |
| Page transition | opacity 0→1 + `translateY(8px→0)` |
| Stagger | 50ms between card entrances |
| Sidebar expand | 300ms width transition |

**Rule:** No aggressive animations — everything feels calm and intentional.

---

## Agent Directory Layout

The Agent Directory reads as calm grouped **"garden beds"** rather than a spreadsheet:

- Categories as collapsible accordion sections
- Generous whitespace between groups
- Soft card containment per agent
- Hierarchy through type scale and weight, not color noise
- Search/filter bar at top

---

## Brand Voice

### Do

- "Your AI Team, Organized"
- "109 Agents. One Dashboard."
- "Explore Agents" / "View Details" / "Customize"

### Don't

- "Welcome to..."
- "Get started today"
- Generic tech jargon
- Cold, corporate tone

---

## Iconography

- **Library:** Lucide React
- **Size:** 18px in sidebar, 20px in cards, 24px in headers
- **Style:** Outlined, 1.5–2px stroke, no fill

Common icons:
- `Leaf` — Brand mark
- `Bot` — Agents
- `LayoutDashboard` — Dashboard
- `Mic` — Voice
- `GitBranch` — Mind Map
- `MessageSquare` — Chat

---

## Spacing Scale

Follows Tailwind defaults with emphasis on generous gaps:

| Context | Gap |
|---------|-----|
| Card grid | `gap-5` (20px) |
| Section spacing | `mb-10` to `mb-12` (40–48px) |
| Card padding | `p-6` to `p-7` (24–28px) |
| Sidebar items | `gap-1` (4px) between nav items |

---

## Accessibility (Target)

- All interactive elements have visible focus rings (`--ring`)
- Color contrast meets WCAG AA on all themes
- Voice page supports hands-free navigation
- Screen reader labels on icon-only sidebar buttons (planned)
- Keyboard navigation for all routes (planned: Cmd+K palette)

---

## Implementation Checklist

- [x] 3 themes with CSS custom properties
- [x] Sidebar brand rail on all pages
- [x] Status dot color rules
- [x] Card hover micro-interactions
- [x] Typography fonts declared in CSS
- [ ] Google Fonts loaded in `index.html` (commented out — needs activation)
- [ ] Full i18n for all page labels
- [ ] Storybook component documentation
- [ ] OG meta tags and favicon
