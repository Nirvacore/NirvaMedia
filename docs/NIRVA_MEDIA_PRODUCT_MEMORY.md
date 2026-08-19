---
title: Nirva Media Product Memory
project: Nirva Media
owner: Nirvacore
updated: 2026-08-19
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
- Campaign Studio scheduling now creates a publish job and truthfully blocks it
  for authorization until a matching external account is connected
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

- 2026-08-19: Corrected the source boundary after finding the complete Claude
  checkout at `../nirva-media-source`. Added a machine-readable provenance
  registry, copied the original PWA icons/screenshots byte-for-byte, and exposed
  `/continuity` plus `/api/source-provenance`.
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
