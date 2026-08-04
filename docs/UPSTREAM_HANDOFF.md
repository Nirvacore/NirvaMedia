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

The 2026-08-04 source audit compared commit
`12b703434d724b1aff04675602d52356ee9c2198` directly with the local snapshot.
The source branch contains 437 non-Git files; the snapshot contains 94. Of
those, 88 match at the same path and byte content, five roadmap files match
byte-for-byte at their documented relocated paths, and the snapshot README is
intentionally different. The remaining 343 upstream files are not preserved
locally. The machine-readable record is `docs/upstream-source-inventory.json`
and is exposed by `GET /api/upstream-status`.

## What Codex added afterward

- A focused Nirva Media public website
- A new `/studio` product route built on the preserved product model
- A modular `/solutions` Product Fabric with workspace entitlements
- A `/connections` control center with persistent connector setup, publishing
  queue, and audit records; live OAuth and platform adapters remain next work
- An explicit `lib/nle` adapter that activates the verified 21-language
  registry and reviewed multilingual Studio starter copy without rewriting the
  preserved snapshot
- A provider-free NLE localization adapter for deterministic script detection
  and `Intl` number, currency, date, timezone, and RTL formatting
- `/api/languages` capability reporting and provider-free detect/localize
  actions, including honest `integration_required` states for provider
  translation, translation memory, and speech-to-text
- `/api/upstream-status` backed by a machine-readable executable, roadmap, and
  missing-source inventory
- Clear repository boundaries and deployment configuration

All future extraction from the upstream snapshot should happen through an
explicit adapter or package so the preserved source remains unchanged.
