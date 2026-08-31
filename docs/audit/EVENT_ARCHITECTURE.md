---
title: Event Architecture
repository: Nirvacore/NirvaMedia
audited_at: 2026-08-19
audited_commit: c7c6b31425821a03e08199417fb5660a23dd27c7
status: phase-0-review
---

# Event Architecture — NirvaMedia

## Verified current state

D1 connector_events and publish_jobs provide product-local audit/queue records, not a general event bus. Future media events should use canonical envelopes while product-owned delivery state remains local.

## Target contract

```text
Business transaction (platform)
  -> same-database transactional outbox
  -> broker operated by nirva-infrastructure
  -> idempotent platform/product/intelligence consumers
  -> trace, audit, retry, dead-letter, and replay controls
```

Every canonical event should include `event_id`, `event_type`, `schema_version`, `occurred_at`, `producer`, `tenant_id`, `organization_id`, `actor_id`, `correlation_id`, `causation_id`, `data_classification`, and a minimal payload. Events are facts, not remote commands. Sensitive payloads should use references or encrypted storage rather than broad replication.

## Phase 0 decision

Document existing transports and proposed contracts only. Do not introduce a broker, migrate state, or change production routing in this phase.
