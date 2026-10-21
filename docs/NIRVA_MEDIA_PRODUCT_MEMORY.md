---
title: Nirva Media Product Memory
project: Nirva Media
owner: Nirvacore
updated: 2026-10-21
status: active-development
tags:
  - nirva
  - nirva-media
  - product-memory
  - global-content
---

# Nirva Media Product Memory

This is the durable handoff for future Codex and human work. Read this file
before planning or changing Nirva Media so the user does not need to repeat the
project history.

## One-sentence product definition

Nirva Media is an AI Content Operating System that turns one campaign idea into
localized, channel-ready content and coordinates publishing and learning across
global platforms from one workspace.

## Repository and source boundaries

- Product repository: `https://github.com/Nirvacore/NirvaMedia`
- Active product branch: `codex/nirvamedia-web`
- Local product root: `/Users/machd/Documents/Codex/NirvaMedia-site`
- Live private site: `https://nirva-media.jidlada-w.chatgpt.site`
- Campaign Studio: `https://nirva-media.jidlada-w.chatgpt.site/studio`
- Connection Center source route: `/connections` (hosting rollout pending)
- Original Claude repository: `https://github.com/Nirvacore/nirva-AI`
- Complete Claude checkout: `../nirva-media-source` at commit `12b7034`
- Preserved Claude snapshot: `upstream/nirva-ai/`
- Upstream source branch: `claude/nirva-media-nle-vision-h0v1z0`
- Upstream handoff commit: `12b7034`

The Nirva Media product now has its own GitHub repository. The Claude snapshot
is preserved as upstream reference and must not be rewritten. New product work
belongs in the active application, with explicit adapters when upstream code is
reused.

## Mahāśūnyatā reference customer and meaning ownership

Mahāśūnyatā is **Reference Customer 001** for the universal Nirva platform.
NirvaMedia consumes and presents its canonical concepts; it does not own or
redefine their meaning. Canonical Thai/English names, meaning, non-meaning,
safeguards, versions, and source provenance remain owned by `Nirvacore/nirva-docs`
and its designated stewards outside NirvaMedia.

The active read-only adapter in `lib/mahasunyata/` consumes exact vendored
`concepts.json` and `concepts.schema.json` bytes from docs commit
`cc54c720c2160aec3228d656e4495651a67a5efb`, branch
`codex/mahasunyata-universal-os`. Repository, branch, commit, artifact paths,
and SHA-256 hashes live separately in `vendor/source-provenance.json`.
`GET /api/mahasunyata/concepts` returns the canonical envelope; optional
`concept_id` and exact `version` query parameters select a record. Unknown
IDs or versions return 404. The adapter validates the pinned schema and export
metadata, rejects duplicate IDs, and freezes every nested runtime value.

This ingestion does not establish translation approval or publication approval.
The active localization guard preserves exact concept/version association,
safeguards and provenance through identity, provider and Translation Memory
paths. Optional `canonical` envelopes are persisted on memory and campaign
post records. Real post approval, scheduling and publish-job creation fail
closed for canonical content with `configured-human-review-unavailable`.
Structural preservation is not semantic approval. No trusted human review
service is configured; manual memory status and client approval/reviewer flags
cannot unlock canonical publishing. This conservative rule covers all canonical
content, including policy and governance. Generic content retains its existing
workflow. The next canonical-content priority is a trusted review process bound
to the precise localized content, source version and reviewer authority.
The preserved Claude source under both `upstream/` directories stays unchanged.

## What is real today

- Public product website and Global Connection Atlas
- Campaign Studio route with persistent campaign and post records
- D1 schema and migrations for campaigns and generated channel drafts
- Recent campaign history and persistent scheduling status
- Draft generation coverage for 18 platforms
- Priority map covering 21 launch markets across five regions
- Six connector families and a recommended global integration order
- Product Fabric solution builder with five bundles, seven selectable modules,
  six connector families, and persistent saved configurations
- Workspace runtime entitlements that activate a saved Product Fabric and gate
  Studio modules, language controls, publishing actions, and channel visibility
- Connection Center with six entitlement-aware connector families, persistent
  account setup records, a publish queue, and connector audit events
- Campaign Studio scheduling atomically saves the post schedule, one publish
  job per post and its audit event, and truthfully blocks the job for
  authorization until a matching external account is connected; an internal
  job can be cancelled before any external attempt starts
- Active NLE adapter with the upstream 21-language registry, 12 writing
  systems, deterministic script detection, `Intl` localization, curated Studio
  draft copy for all 21 languages, and RTL layout for Arabic and Hebrew
- Machine-readable upstream audit at `docs/upstream-source-inventory.json` and
  `/api/upstream-status`, explicitly separating executable references,
  roadmaps, active adapters, and missing source
- D1 Translation Memory with workspace-scoped exact matching, hit tracking,
  provider-result persistence, and reviewed manual entries
- Nirva Character Universe reference implementation: Nirva Media owns the
  rainbow Creator mascot, the founding eight-character lineup is design-ready,
  and a 16-product registry separates demo-active assets from registered concepts
- Source Continuity registry and `/continuity` page connecting the complete
  Claude checkout, preserved snapshot, active adapters, user references, and
  Codex-generated assets with commit and SHA-256 provenance
- Complete 437-file Claude source preservation under
  `upstream/nirva-ai-complete`, with a searchable K-Hub structure explorer and
  per-file SHA-256 records in `docs/complete-source-manifest.json`
- Claude `shared/media.ts` now runs through `lib/upstream-media-adapter.ts` in
  the active Campaign API and post approval/scheduling workflow
- Selected original media modules, tests, Studio OS, mobile shell, SDKs, and
  roadmaps preserved under the upstream snapshot

## Important truth boundary

The website, persistent Campaign Studio, market map, 21-language registry,
curated multilingual draft generation, RTL layout, D1 Translation Memory,
scheduling records, connector account registry, publishing queue, and connector
audit events are implemented. Provider-backed translation is active only when
a server-side credential is configured; without one the API truthfully returns
`unavailable`. Live third-party account authorization and publishing are not
yet connected. Platform OAuth, credential vault, app review, tokens, webhooks,
publishing calls, retries, and analytics ingestion remain implementation work.

The upstream NLE documentation describes 21 languages. A nearby count of 10 is
the language test count, not the supported-language count. Do not market the
current product as having 100+ active languages. Treat 100+ as a future target
until the language registry, provider integrations, and quality checks prove it.

Roadmap documents for ML, multi-region infrastructure, Kubernetes, and several
enterprise capabilities are plans, not proof that production infrastructure is
already operating.

## Sell separately or together

The product catalog, modular packaging UI, bundle definitions, custom solution
builder, saved configurations, and workspace-level runtime entitlements are
implemented. Billing, checkout, contracts, customer identity, multi-workspace
administration, and payment-linked entitlement lifecycle are not implemented.

### Standalone modules

1. **AI Content Studio** — campaign briefs and channel-ready text, image, video,
   audio, and subtitle workflows.
2. **Language Engine** — translation, transcreation, tone, cultural context,
   terminology, and market localization.
3. **Smart Publisher** — account connections, approvals, scheduling, publishing,
   retries, and delivery status.
4. **Global Market Intelligence** — country priority maps, platform selection,
   local format guidance, and recommended launch mix.
5. **Performance Intelligence** — cross-channel analytics, attribution,
   recommendations, and feedback to content generation.
6. **Enterprise Control** — SSO, RBAC, audit, compliance, teams, budgets, and
   governance.
7. **Mobile Workspace** — iOS and Android review, approval, notification, and
   lightweight creation experiences.

### Recommended bundles

- **Starter** — Content Studio plus a limited set of channels.
- **Growth** — Content Studio, Language Engine, Global Core connectors, calendar,
  and basic analytics.
- **Asia Expansion** — Growth plus LINE, Kakao, Naver, and regional localization.
- **China Market** — dedicated WeChat, Douyin, Weibo, Xiaohongshu, mainland
  account setup, storage, and compliance workflow.
- **Enterprise Global** — all modules, global connectors, advanced analytics,
  SSO, RBAC, audit, governance, and service commitments.

Avoid presenting China as the same connector as global TikTok. Douyin and the
mainland platform stack require dedicated accounts, APIs, operational rules,
and compliance.

## Connector family strategy

Build shared connector infrastructure once, then implement platform adapters:

1. **Meta Network** — Facebook, Instagram, WhatsApp Business, Threads.
2. **Google Video** — YouTube and Shorts.
3. **ByteDance Global** — TikTok.
4. **LINE Ecosystem** — LINE Official Account, Messaging, and Broadcast.
5. **China Dedicated** — WeChat, Douyin, Weibo, Xiaohongshu.
6. **Regional Plus** — KakaoTalk, Naver Blog, Telegram, Snapchat, Pinterest, X,
   and LinkedIn.

Shared infrastructure should cover OAuth/token vault, account registry, media
normalization, publishing jobs, retries, webhooks, rate limits, audit events,
and normalized analytics. Platform-specific adapters own scopes, review rules,
formats, limits, and errors.

## Recommended delivery order

1. Complete the connector foundation: account registry, job queue, entitlement
   enforcement, and audit trail are implemented; encrypted credentials, OAuth,
   webhooks, rate limits, and retries are next.
2. Meta Network, YouTube, and TikTok as Global Core.
3. LINE for Thailand, Japan, and Taiwan.
4. Regional adapters: Kakao/Naver, Telegram, Snapchat, X, LinkedIn, Pinterest.
5. Dedicated China stack.
6. Unified analytics and recommendation feedback loop.
7. Billing/contract workflow, customer identity, multi-workspace administration,
   and customer-facing connection onboarding.

## Recent implementation

- 2026-10-19: Repaired publish-queue integrity on branch
  `kiro/media-queue-integrity-20261019`. `POST /api/publish-jobs` is the only
  scheduling path: it requires a saved approved post, that post's channel and
  a valid `scheduledAt`, then writes the post schedule, publish job and audit
  event in one D1 batch whose job insert re-checks the post inside the
  transaction. Migration `0006_publish_job_post_guard.sql` adds a unique
  `publish_jobs.post_id` index after detaching (not deleting) duplicates from
  earlier retries, failing pending ones and auditing each; apply it with the
  application rollout. Same-schedule retries return the existing job
  (`replayed: true`); other times return 409 until re-timing exists.
  `PATCH /api/posts/:id` can no longer set `scheduled` or `published` or
  change a post that has a job. The route now also requires the
  `smart-publisher` module server-side (403 `MODULE_NOT_ENTITLED`), alongside
  the unchanged connector, account and canonical checks. Studio sends one
  request, shows a post as scheduled only after the server confirms, and keeps
  the same time for retries until a confirmed job or a definitive no-write
  answer (400/403/404/409 with an error); 5xx and unreadable replies keep it.
  `GET /api/campaigns` reports each post's internal `publishJob` (or `null`),
  so Studio labels legacy scheduled posts without a job as not queued and not
  sent externally, and offers queueing at the stored time (or a return to
  approved when no time was stored). Not deployed.

- 2026-10-20: Added internal-only cancellation on the same branch.
  `POST /api/publish-jobs/:id/cancel` with the scheduled post's `postId`
  cancels a `queued` or `blocked_auth` job that has never started an external
  attempt (`attempts = 0`). One D1 batch writes a `publish_job.cancelled`
  audit event, returns the post to `approved` with no time, and marks the job
  `cancelled` while detaching it from the post so it can be scheduled again;
  the event insert re-checks job and post inside the transaction. Retries
  replay. The same Smart Publisher, connector and canonical gates apply. No
  publishing worker exists yet; `lib/publish-queue.ts` defines the claim a
  future worker must use (atomically move `queued` to `publishing` and add one
  attempt only while linked and at the expected count), so a second claim
  cannot reserve an in-flight job and a claim and cancel cannot both win.
  No worker, completion or retry/recovery transition exists yet. Studio offers
  "ยกเลิกงานในคิวภายใน" on scheduled posts with an internal job and shows the
  post as approved only after the server confirms; Connection Center labels
  cancelled jobs. No schema migration was needed (`status` is unconstrained
  text). Remaining queue gaps: re-timing, cancelling after an attempt started,
  legacy approved posts that still have a job, and who may cancel once
  workspace roles exist. Not deployed.
- 2026-10-20: 500 responses from `/api/campaigns`, `/api/publish-jobs`, its
  cancel route, `PATCH /api/posts/:id`, `/api/connections`,
  `/api/entitlements` and `/api/solutions` no longer echo exception text.
  Clients get a generic message, `code` (`INTERNAL_ERROR` or
  `STORAGE_NOT_READY`) and an `errorId`. The server logs one
  `api.internal_error` JSON line with allowlisted metadata only: `errorId`,
  `route`, `code` and SQLite result codes from a fixed whitelist. No error
  message, cause, SQL or parameters are logged, even redacted
  (`lib/api-errors.ts`). 4xx and canonical validation answers are unchanged.
  Committed as `3a4d508` on `kiro/media-queue-integrity-20261019` (pushed to
  the branch, not merged or deployed).
- 2026-10-20: The same redaction now covers the Translation Memory routes:
  `GET`/`POST /api/translations`, `PUT /api/translations` and
  `POST /api/translations/remember`. A failed memory write had returned SQL
  whose bound parameters include the user's source and translated text, and
  an unreadable request body had returned the JSON parser's message. 4xx,
  413, canonical 400s and the provider 502/503 answers are unchanged.
  `POST /api/languages` now answers rejected localize input with a fixed 400
  and unexpected failures with the shared generic 500. Not merged or
  deployed.
- 2026-10-21: Finished request-body handling on `POST /api/languages`, the
  three Translation Memory write routes, `POST /api/publish-jobs`, its
  cancel route and `POST /api/campaigns`. Each reads the body as text before
  parsing it. Malformed or empty JSON gets the fixed 400
  `request body must be valid JSON`; JSON that is not an object, `null`
  included, gets the route's existing required-input 400. A failure while
  reading the body is internal even when it is reported as a `SyntaxError`:
  the shared generic 500 and one allowlisted log line. `POST /api/campaigns`
  also answers a wrong-typed `brief`, `language`, `tone` or `channels` with
  a fixed 400 that never echoes the value. A `channels` value must be a list
  of strings (a string is no longer read character by character), and names
  inherited from `Object.prototype`, such as `toString`, are treated as
  unknown channels. A missing or `null` field keeps its required or default
  meaning. Rejected requests write nothing; other successful and validation
  answers are unchanged. The `PUT /api/entitlements` route now handles its
  body the same way: malformed or empty JSON gets the fixed 400
  `request body must be valid JSON`, `null` gets the route's existing
  `solutionConfigId is required` 400, and neither case writes an
  entitlement or logs. A failure while reading its body still gets the
  shared generic 500. `PATCH /api/posts/:id`, `POST /api/connections` and
  `POST /api/solutions` still answer malformed JSON with the generic 500
  and are the next candidates. Not merged or deployed.

- 2026-09-15: Preserved the dated 2026-08-19 Phase 0 audit and its pinned
  source evidence alongside the later canonical-content guardrails below.
  Its future architecture and migration sections remain proposals, not an
  approved cutover or proof of current deployment. GitHub is the founder-
  approved primary source/review host (2026-09-11); this documentation merge
  does not deploy, migrate records, change product ownership, or update the
  separate Obsidian mirror.

- 2026-09-10: Studio ignores late translation/manual-memory responses after
  source, language or manual-text edits, and late generation responses after
  changing inputs or opening another campaign. Already-saved campaigns remain
  in history. Existing UI and canonical approval restrictions are retained.
  Twelve deferred-response component regressions cover the repaired behavior.


- 2026-09-10: Studio regeneration now retains the loaded campaign's canonical
  concept/version. Mixed associations fail closed. Canonical posts show their
  pending semantic review and disable approval/scheduling while the trusted
  review service is unavailable; server guards remain authoritative.


- 2026-09-10: Repaired fresh local setup by adding `npm run db:local:migrate`
  with an explicit local-only Wrangler configuration for the same D1 database
  used by Vite. Verified all six migrations, repeat execution without changes,
  and campaign creation through Studio. Local records survive application
  restart in `.wrangler/state/v3/d1`. Production hosting is unchanged.


- 2026-09-09: Added canonical localization guardrails around the existing
  21-language NLE and Translation Memory. Migration `0005_sudden_skreet.sql`
  persists immutable source envelopes on memory and campaign posts; it must be
  applied with the application rollout. Canonical policy/governance drafts
  remain pending and cannot be approved, scheduled or queued through the real
  publication routes until trusted human review infrastructure is implemented.
  The Campaign API still generates curated NLE previews, not verified semantic
  translations. Canonical association never changes that capability claim.

- 2026-08-19: Added the source-backed Phase 0 audit set under `docs/audit/`
  and `docs/architecture/`. The ownership boundary remains unchanged: Nirva
  Media owns campaign and publishing workflow state, consumes shared identity
  and billing from the future platform, and consumes model, prompt, agent,
  citation, and evaluation capabilities from the future intelligence layer
  through explicit adapters. No product code, schema, deployment, or preserved
  upstream source changed as part of this audit.
- 2026-08-19: Corrected the source boundary after finding the complete Claude
  checkout at `../nirva-media-source`. Added a machine-readable provenance
  registry, copied the original PWA icons/screenshots byte-for-byte, and exposed
  `/continuity` plus `/api/source-provenance`.
- 2026-08-19: Preserved all 437 tracked Claude files in the NirvaMedia GitHub
  repository and exposed the complete searchable structure, ten original image
  records, and root integrity checksum through K-Hub.
- Replaced duplicated Campaign Studio rules with a direct adapter over Claude
  `shared/media.ts`. Platform length/hashtag adaptation and the original
  `draft → review → approved → scheduled` transition flow now execute in the
  active D1-backed product.
- 2026-08-12: Established the shared Nirva Character Universe. Added the
  canonical Nirva Media Creator asset, founding ecosystem lineup, `/characters`
  demo, typed registry, machine-readable registry, and cross-repository rollout
  contract. Only Nirva Media is marked demo active; other characters retain
  `design-ready` or `concept-registered` status until their own repositories
  consume and verify approved assets.

- 2026-08-04: Audited the original NLE source directly on
  `claude/nirva-media-nle-vision-h0v1z0`. Confirmed 21 languages, not 100+.
- The local `upstream/nirva-ai/` directory is a selective snapshot, not the
  complete Claude repository. It omitted `server/language/index.ts`,
  `shared/language.ts`, and the NLE architecture document even though the
  preserved media module imports the missing language service.
- Added an explicit active-site NLE adapter instead of modifying the preserved
  upstream snapshot. Studio now lists all 21 languages, validates language
  codes, emits reviewed starter copy in the selected language, and applies RTL
  layout for Arabic and Hebrew.
- Added `/api/languages` with explicit capability states. Provider translation
  reports runtime credential availability, while Translation Memory reports
  active only after its D1 implementation. Removed the unsupported 100+
  language claim from the product page.
- Added the provider-free portion of upstream `shared/language.ts` through the
  active `lib/nle/localization.ts` adapter. Script detection and `Intl` number,
  currency, date, timezone, and RTL formatting are active; the Node/Express
  provider, translation-memory, and speech stack was deliberately not copied.
- Reimplemented the Translation Memory boundary for the active Cloudflare/D1
  product rather than copying the upstream Node/Express/SQLite runtime.
  `POST /api/translations` checks exact memory first, calls the provider only
  when configured, and persists verified provider output. Reviewed translations
  can be stored through `PUT /api/translations` or the explicit
  `POST /api/translations/remember` alias; recent entries are listed by
  `GET /api/translations`. No cache miss produces mock output.
- Added a reproducible upstream inventory after comparing all 437 source files
  with the 94-file selective snapshot at commit `12b7034`. Ninety-three files
  are exact source equivalents (including five relocated roadmaps), one is the
  intentional snapshot README, and 343 upstream files remain outside the
  product repository. `GET /api/upstream-status` exposes this truth boundary.
- A direct upstream test audit on 2026-08-04 reported 862 tests: 547 passed,
  259 failed, and 56 skipped. The language suite passed 10/10, while the
  publishing suite failed 37/37 and the ROI suite failed 36/36 because their
  schema/runtime implementations are missing. Treat the older "360+ tests,
  96% coverage, all passing" and "production-ready" statements as disproven;
  Phases 13-17 are primarily roadmap documentation, with only a partial mobile
  shell and selected executable components.
- 2026-08-04: Added `/connections` Connection Center.
- Added D1 tables for `connector_accounts`, `publish_jobs`, and
  `connector_events`, with workspace and scheduling indexes.
- Connector setup records never accept tokens or secrets. The current setup
  state stops at `setup_required` and clearly labels OAuth as the next step.
- Studio scheduling adds entitlement-checked publish jobs. Jobs remain
  `blocked_auth` until a matching account reaches `connected`.
- Sites version 11 was saved after removing the now-default compatibility flag
  from both source and the packaged artifact. The provider still returned the
  same duplicate-flag error, indicating a hosting-side injection issue. GitHub
  and the local Studio have the complete 21-language source; the live URL
  remains on the prior version until the provider issue is resolved.
- 2026-08-03: Added `/solutions` Product Fabric builder.
- Customers can start from Starter, Growth, Asia Expansion, China Market, or
  Enterprise Global, then add or remove modules and connector families.
- Configurations persist in D1 through `solution_configs`.
- All bundles explicitly share one Identity, Brand, Asset, Language, Workflow,
  Audit, and Analytics core.
- 2026-08-03: Added `workspace_entitlements` and `/api/entitlements`.
- Saving a Product Fabric now activates it for Nirva Workspace. Campaign Studio
  reads that entitlement and enforces module and connector access at runtime.

## Product decisions to preserve

- Build on the Claude work; do not recreate it blindly.
- Keep Nirva Media separate from the broad `nirva-AI` repository.
- Sell modules independently and offer bundles from the same product core.
- Show global coverage honestly: distinguish draft-ready, connector-ready,
  account-connected, and live-publishing states.
- Market rankings are strategic priority recommendations, not pure user-count
  league tables.
- Keep platform data dated and refresh it periodically.
- Prefer one shared integration foundation with explicit regional adapters.
- Keep the Obsidian copy synchronized when major decisions change.

## Source-of-truth reading order

1. This product memory
2. `docs/UPSTREAM_HANDOFF.md`
3. Current Git history and working tree
4. Active application code and migrations
5. Preserved upstream code
6. Roadmap documents, clearly labeled as plans

## Obsidian mirror

The human-readable mirror is stored at:

`/Users/machd/Documents/Obsidian Vault/Nirva Strategy/NIRVA_MEDIA_PRODUCT_MEMORY.md`
