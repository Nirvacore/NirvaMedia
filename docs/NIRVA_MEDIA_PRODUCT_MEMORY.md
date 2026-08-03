---
title: Nirva Media Product Memory
project: Nirva Media
owner: Nirvacore
updated: 2026-08-03
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
- Original Claude repository: `https://github.com/Nirvacore/nirva-AI`
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
- Original media modules, tests, Studio OS, mobile shell, SDKs, and roadmaps
  preserved under the upstream snapshot

## Important truth boundary

The website, persistent Campaign Studio, market map, draft generation, and
scheduling records are implemented. Live third-party account authorization and
publishing are not yet connected. Platform OAuth, app review, tokens, webhooks,
publishing calls, and analytics ingestion remain implementation work.

Roadmap documents for ML, multi-region infrastructure, Kubernetes, and several
enterprise capabilities are plans, not proof that production infrastructure is
already operating.

## Sell separately or together

The product catalog, modular packaging UI, bundle definitions, custom solution
builder, and saved configurations are implemented. Billing, checkout,
contracts, customer identity, and enforceable runtime entitlements are not
implemented yet.

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

1. Runtime feature-entitlement enforcement for organizations and workspaces.
2. Connector foundation: encrypted credentials, account registry, job queue,
   webhooks, retries, and audit trail.
3. Meta Network, YouTube, and TikTok as Global Core.
4. LINE for Thailand, Japan, and Taiwan.
5. Regional adapters: Kakao/Naver, Telegram, Snapchat, X, LinkedIn, Pinterest.
6. Dedicated China stack.
7. Unified analytics and recommendation feedback loop.
8. Billing/contract workflow and customer-facing connection onboarding.

## Recent implementation

- 2026-08-03: Added `/solutions` Product Fabric builder.
- Customers can start from Starter, Growth, Asia Expansion, China Market, or
  Enterprise Global, then add or remove modules and connector families.
- Configurations persist in D1 through `solution_configs`.
- All bundles explicitly share one Identity, Brand, Asset, Language, Workflow,
  Audit, and Analytics core.

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
