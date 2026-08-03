# Nirva Media project structure

This repository is the focused home for the Nirva Media web product.

- `app/` — public website and future product routes
- `public/` — production media assets
- `docs/` — product decisions, handoff notes, and delivery documentation
- `.openai/` — hosting configuration

## Source handoff

The original Nirva Media implementation and research remain in
[`Nirvacore/nirva-AI`](https://github.com/Nirvacore/nirva-AI), branch
`claude/nirva-media-nle-vision-h0v1z0`, latest handoff commit `12b7034`.

The earlier work contains a mix of executable modules and architecture plans:

- Executable: core TypeScript server/media modules, API gateway, studio pages,
  tests, SDKs, and the initial React Native/Expo shell.
- Roadmaps: advanced ML, multi-region deployment, Kubernetes, and most
  enterprise features.

This repository intentionally does not duplicate the whole `nirva-AI`
monorepo. New Nirva Media web work belongs here; shared AI platform services
remain in `nirva-AI` until they have a stable extraction boundary.
