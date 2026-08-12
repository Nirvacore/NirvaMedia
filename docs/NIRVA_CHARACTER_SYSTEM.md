# Nirva Character Universe

## Decision

Every Nirva product owns one recognizable cartoon character. The characters
are distinct product guides but share one visual and governance system so the
ecosystem feels connected across websites, demos, onboarding, help, empty
states, launch materials, and product education.

## Shared DNA

- Premium friendly 3D chibi proportions
- Midnight navy and violet ecosystem core
- Luminous glass/neon edge material
- One unique accent palette, silhouette, tool, and role per product
- The same eye language, rendering quality, light direction, and platform base
- Character art never substitutes for a real capability, connection, or live status

## Asset levels

1. `master` — full-body canonical character approved by the product owner
2. `app-icon` — simplified head/mark readable at 32–512 pixels
3. `guide` — waist-up poses for onboarding, help, and empty states
4. `story` — full scenes for campaigns, launch pages, and learning content
5. `motion` — rigged or frame-based animation derived from the approved master

Every export needs product ID, character ID, asset level, version, owner,
approval state, alt text, and source prompt/reference provenance.

## Current rollout

- **Demo active:** Nirva Media Creator at `/characters`
- **Design ready:** the eight-character founding lineup shown on the demo page
- **Concept registered:** the next product wave in `lib/character-system.ts`
- Other local folders are not automatically marked demo-ready. A product only
  becomes demo active after its own repository consumes approved assets and
  passes visual/runtime checks.

## Implementation contract for every repository

1. Import or mirror the canonical character registry.
2. Keep original raster masters in `public/characters/` or the product asset CDN.
3. Expose a Character/DNA page or panel with role, mission, powers, and status.
4. Use the mascot in onboarding/help/empty states before decorative repetition.
5. Add visual regression and accessibility checks, including meaningful alt text.
6. Record the exact demo URL and Git commit in the registry when deployed.

## Rollout order

1. Nirva Media reference implementation
2. NirvaCore shared shell and product navigation
3. Nirva AI, Cloud, Connect, and Academy foundation characters
4. Marketplace, Finance, and Gov transaction/governance characters
5. Check, Audit, Docs, Compliance, Executive, Procure, and Voice

This order establishes a stable system before generating dozens of inconsistent
assets. Product repositories stay independently deployable while sharing the
same character contract.
