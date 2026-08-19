---
title: Migration Map
repository: Nirvacore/NirvaMedia
audited_at: 2026-08-19
audited_commit: c7c6b31425821a03e08199417fb5660a23dd27c7
status: phase-0-review
---

# Migration Map — NirvaMedia

**Decision:** `KEEP_PRODUCT_WITH_EXPLICIT_ADAPTERS`  
**Target role:** independent media product consuming intelligence capabilities

1. Preserve upstream/nirva-ai unchanged.
2. Continue extracting only through explicit adapters or packages.
3. Use platform for identity, billing, contracts, and organization truth.
4. Use intelligence for model routing, prompts, evaluations, citations, and shared agents.
5. Keep channel-specific campaign and publishing workflow in NirvaMedia.

## Strangler controls

- Keep current APIs and schemas stable while introducing adapters.
- Compare behavior and data before choosing a canonical path.
- Dual-read or shadow-compare before write cutover where risk warrants it.
- Reconcile counts, identifiers, totals, approvals, evidence, and audit trails.
- Archive only after consumer cutover, rollback window, and explicit approval.
