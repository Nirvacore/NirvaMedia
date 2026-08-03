# Nirva Media

One idea. Every channel. Every language.

Nirva Media is the focused web home for Nirvacore's AI content operating
system. The current release introduces the product, demonstrates the unified
campaign workflow, and explains how Nirva Language Engine localizes content
for global audiences.

## Repository map

- `app/` — website and Campaign Studio product routes
- `public/` — production media assets and social preview
- `docs/` — architecture decisions and source handoff notes
- `upstream/nirva-ai/` — unchanged snapshot of the original Nirva Media code
- `.openai/` — deployment configuration

See [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) for the boundary
between this product repository and the shared `nirva-AI` platform.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```
