# Nirva AI Core Dashboard — Design Brainstorm (v2)

## Redesign Direction

Previous design (Cybernetic Command Center) was too masculine/aggressive. New direction: **Minimal, Elegant, Approachable** — a dashboard that anyone can use comfortably, with switchable themes.

---

## Chosen Approach: Minimal Garden

### Design Movement
Scandinavian Minimalism meets Japanese Ma (間) — the beauty of empty space. Inspired by Notion, Linear, and Apple's design language but with a warm, approachable personality.

### Core Principles
1. **Breathing Space** — generous whitespace, nothing feels cramped
2. **Soft Power** — rounded corners, gentle shadows, pastel accents
3. **Clarity First** — information hierarchy through typography weight, not color noise
4. **Warmth** — never cold or sterile; always inviting and human

### Color Philosophy
Three switchable themes that share the same layout but shift mood:

**Theme 1: Light Minimal (Default)**
- Background: warm white (#FAFAF8)
- Text: soft charcoal (#2D2D2D)
- Accent: sage green (#7C9A82)
- Cards: pure white with subtle shadow

**Theme 2: Soft Pastel**
- Background: lavender mist (#F5F0FF)
- Text: deep purple-gray (#3D3352)
- Accent: soft rose (#D4A0A0)
- Cards: frosted white with pink tint

**Theme 3: Dark Elegant**
- Background: deep navy (#1A1B2E)
- Text: cream (#F0EDE8)
- Accent: gold (#C9A96E)
- Cards: dark slate with subtle glow

### Layout Paradigm
- **Left sidebar** — slim, icon-based navigation with labels on hover
- **Main content** — card-based grid with generous gaps
- **No visual clutter** — one action per card, clear CTAs
- **Mobile-first** — works beautifully on phone too

### Signature Elements
1. **Pill-shaped tags** — soft rounded badges for agent status/tier
2. **Subtle gradient borders** — thin gradient outlines on active cards
3. **Floating action dots** — small colored dots indicating status (green=ready, amber=hybrid, gray=cloud)

### Interaction Philosophy
- Micro-interactions: cards lift gently on hover (2px translate + shadow increase)
- Smooth page transitions (fade + slight slide)
- No aggressive animations — everything feels calm and intentional

### Animation
- Duration: 200-300ms max
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Hover: translateY(-2px) + shadow expansion
- Page transitions: opacity 0→1 + translateY(8px→0)
- Stagger: 50ms between card entrances

### Typography System
- **Display/Headings:** Plus Jakarta Sans (700, 600)
- **Body:** Inter (400, 500)
- **Mono/Code:** JetBrains Mono (for agent IDs, technical labels)
- Scale: 14px body, 20px h3, 28px h2, 40px h1

### Brand Essence
"Your calm command center for 109 AI agents — organized, beautiful, powerful."
Personality: Calm, Elegant, Empowering

### Brand Voice
- Headlines: "Your AI Team, Organized" / "109 Agents. One Dashboard."
- CTAs: "Explore Agents" / "View Details" / "Customize"
- Ban: "Welcome to..." / "Get started today" / generic tech jargon

### Wordmark & Logo
- Nirva mark: a minimalist lotus/leaf symbol — single stroke, geometric
- Displayed at comfortable size in sidebar header
- Color adapts to current theme accent

### Signature Brand Color
- Sage Green (#7C9A82) — calm, natural, gender-neutral-leaning-feminine

---

## Style Decisions
- Theme switcher in sidebar footer (3 dot buttons)
- Agent cards show: name, role, status dot, tier badge
- Search/filter bar at top of Agent Directory
- Categories collapsible with smooth accordion
- Dashboard overview shows: total agents, ready count, sprint progress
- Every route must include a persistent slim Nirva brand rail with the geometric lotus/leaf mark, adaptive accent color, and three-dot theme switcher; pages should never appear as unbranded standalone admin screens.
- The Agent Directory should read as calm grouped "garden beds" rather than a spreadsheet: category groups need generous whitespace, soft card containment, and hierarchy through type scale/weight.
- Status color rules are fixed: ready uses sage green, hybrid uses warm amber, and cloud uses neutral gray; blue is not part of the Minimal Garden status language.
