---
title: AI Current State Audit
repository: Nirvacore/NirvaMedia
audited_at: 2026-08-19
audited_commit: 336193e7dcf60089065f6bd6592f336c021b25a2
status: phase-0-review
---

# AI Current State — NirvaMedia

NirvaMedia should consume shared intelligence capabilities through explicit adapters. Media campaign state remains product-owned; agents, prompt/model registry, evaluation, citations, and shared RAG remain intelligence-owned.

## Strategic ownership rule

| Concern | Canonical owner |
|---|---|
| Finance/Legal deterministic calculations, ledgers, records, workflows, approvals, policies, evidence, audit | nirva-platform (evolving from nirvacore-v1) |
| Finance/Legal agents, RAG, MCP tools, prompt/model registries, citations, hallucination tests, red-team tests, evaluations | nirva-intelligence (evolving from nirva-AI) |
| Model/runtime infrastructure, Qdrant, LiteLLM, telemetry, secrets, backup | nirva-infrastructure |

## Governance minimum before production AI

- Platform-issued user, organization, tenant, role, policy, and correlation context.
- Tool registry with owner, version, risk, read/write class, permission, scope, approval, rate limit, timeout, data classification, and audit level.
- Versioned prompt/model/knowledge inputs with source provenance and citations.
- Offline and release evaluations, hallucination tests, red-team tests, and promotion approval.
- Immutable AI run, tool, approval, evidence, cost, and outcome audit records.
