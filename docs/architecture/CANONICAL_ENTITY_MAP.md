---
title: Canonical Entity Map
repository: Nirvacore/NirvaMedia
audited_at: 2026-08-19
audited_commit: c7c6b31425821a03e08199417fb5660a23dd27c7
status: phase-0-review
---

# Canonical Entity Map — NirvaMedia

| Concept | Current representation | Canonical owner | Decision |
|---|---|---|---|
| Campaign/post/publish job | D1/Drizzle schema | media product | Keep product-owned workflow records. |
| Workspace entitlement | D1 schema | platform integration | Reconcile billing/identity lifecycle with platform. |
| Translation memory | D1 schema and lib/nle | intelligence/product projection | Keep source, locale, review, and provider provenance. |
| Agent/model/prompt | upstream references | intelligence | Consume through explicit adapters/APIs; do not fork central governance. |
| Connector credential | not implemented | infrastructure/security | Use an approved encrypted vault and service registry. |

## Cross-cutting rule

Platform owns deterministic business truth. Intelligence owns derived knowledge, model/prompt configuration, agent/tool governance, citations, evaluations, and AI-run evidence. Infrastructure owns runtime services and operational controls. Product repositories may own experience-specific aggregates but should reference canonical identity, tenant, business, and audit records.
