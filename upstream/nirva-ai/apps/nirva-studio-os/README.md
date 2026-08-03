# Nirva Studio OS — Clickable Prototype

> Premium dark-mode prototype of a unified creator & marketing operating system.
> **Prototype only** — mock data, no backend, no real AI, no social APIs. See the in-app Roadmap page.

## Run

```bash
cd apps/nirva-studio-os
pnpm install
pnpm dev        # http://localhost:3100
```

## Pages

| Route | Purpose |
|-------|---------|
| `/command-center` | Founder dashboard — focus, projects, captures, pipeline, AI suggestions |
| `/infinite-board` | Spatial canvas with zoom controls (mock layout) |
| `/capture` | Voice/text capture with mock AI classification flow |
| `/content-studio` | Pipeline board (Idea→Published) + draft preview + format selector |
| `/marketing-calendar` | July 2026 month grid + scheduled posts + campaigns |
| `/relationship-canvas` | React Flow graph — BEST Investigation map, filters, detail panel |
| `/ai-assistant` | Mock chat with suggested prompts + source cards |
| `/roadmap` | Future modules (disabled) with reasons + dependencies |

## Stack

Next.js 15 · TypeScript · TailwindCSS · shadcn-style components · lucide-react · @xyflow/react · Framer Motion

## Optional live bridge (NLE)

The prototype is mock-first, but if the Nirva AI Core backend is running (`pnpm dev` at repo root → port 3000), the Capture page's "Detect language" button uses the real NLE Language Engine through a Next.js rewrite (`/nirva-api/*` → `localhost:3000/api/*`, override with `NIRVA_API_URL`). The sidebar shows the bridge status (live/offline); everything still works when it's offline.

## Structure

```
src/
  app/(dashboard)/<8 pages>
  components/{layout,navigation,cards,canvas,chat,ui}
  lib/mock-data/   lib/utils.ts
  types/
```
