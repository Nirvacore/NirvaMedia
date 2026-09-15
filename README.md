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
npm ci
npm run db:local:migrate
npm run dev -- --host 127.0.0.1
```

Create a production build with:

```bash
npm run build
```

Open http://localhost:3000/studio after startup. The local migration command
uses only `.wrangler/state/v3/d1` and is safe to repeat; it never contacts the
hosted database. Keep that directory to retain local campaigns and Translation
Memory. Run the migration command before starting an updated checkout.

`wrangler.local.json` is only for local database preparation. Production
hosting continues to use `.openai/hosting.json` and the Vite binding configuration.
The Studio produces curated starter drafts, not a live generative provider.
Canonical content remains pending trusted review; external publishing and
provider translation still require their separate integrations.
