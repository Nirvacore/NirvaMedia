# Upstream handoff and continuation

## What was preserved

The original Nirva Media source from Claude is stored under
`upstream/nirva-ai/` at source commit `12b7034`. The snapshot separates code
from roadmaps so project status is not inferred from documentation alone.

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

## What Codex added afterward

- A focused Nirva Media public website
- A new `/studio` product route built on the preserved product model
- Clear repository boundaries and deployment configuration

All future extraction from the upstream snapshot should happen through an
explicit adapter or package so the preserved source remains unchanged.
