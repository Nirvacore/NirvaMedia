# Upstream handoff and continuation

## What was preserved

A selective snapshot of the original Nirva Media source from Claude is stored
under `upstream/nirva-ai/` at source commit `12b7034`. It is not a complete
checkout of `Nirvacore/nirva-AI`. The snapshot separates selected code from
roadmaps so project status is not inferred from documentation alone.

### Executable implementation

- Media service modules and the NMD API gateway
- Media/NMD tests
- Original Nirva Studio OS application
- Mobile API and authentication shell
- SDK implementations

### Architecture roadmaps

- Advanced ML integration
- Multi-region deployment
- Kubernetes and autoscaling
- Enterprise SSO, RBAC, audit, and compliance

### Confirmed omissions from the local snapshot

- `server/language/index.ts`
- `shared/language.ts`
- `docs/NLE_LANGUAGE_ENGINE_ARCHITECTURE.md`

These files exist on the upstream branch
`claude/nirva-media-nle-vision-h0v1z0`. The language implementation defines 21
languages; the number 10 in its architecture document refers to tests. The
local media service imports the omitted language service, so the snapshot alone
could not run that NLE path end to end.

## What Codex added afterward

- A focused Nirva Media public website
- A new `/studio` product route built on the preserved product model
- A modular `/solutions` Product Fabric with workspace entitlements
- A `/connections` control center with persistent connector setup, publishing
  queue, and audit records; live OAuth and platform adapters remain next work
- An explicit `lib/nle` adapter that activates the verified 21-language
  registry and reviewed multilingual Studio starter copy without rewriting the
  preserved snapshot
- `/api/languages` capability reporting, including honest `integration_required`
  states for provider translation and translation memory
- Clear repository boundaries and deployment configuration

All future extraction from the upstream snapshot should happen through an
explicit adapter or package so the preserved source remains unchanged.
