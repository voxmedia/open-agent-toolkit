---
id: BL-260909-give-packages-control-plane
title: Give packages/control-plane a check script so its formatting is CI-gated
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - ci
  - formatting
  - lockstep
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:44.852Z
updated: 2026-09-09T11:54:23.000Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p18 (`2026-09-08-run-skill-asset-checks-in-the-gates-ci.md`) found that `packages/control-plane` defines `format` but no `check`, so `turbo run check` (the CI gate) skips its formatting entirely; `AGENTS.md` now states this gap. Add a `check` script mirroring the other packages (`oxlint` + `oxfmt --check`), then update the `AGENTS.md` sentence that names the gap. `package.json` under `packages/` is a lockstep file, so this ships as its own change with the version bump.

## Acceptance Criteria

- `pnpm check` fails on a formatting violation inside `packages/control-plane` (red-then-green control).
- `AGENTS.md` no longer names `packages/control-plane` as ungated.
- Lockstep versions bumped together.

## Notes

- 2026-09-09 (wave-7 Phase 21, lane p21c): control-plane's `lint` script IS exercised in CI today, but only by accident — `tools/smoke/verification/lint-enrollment.test.mjs:41` shells out to the whole `pnpm lint` under `pnpm test:smoke`, and a seeded `prefer-const` under `packages/control-plane/src` fails that test (exit 1) through the `turbo run lint` short-circuit. Nothing pins that the package keeps a `lint` script: deleting it would silence the coverage without a red test. When this item adds the `check` script, also pin the enrollment (a test that asserts every package under `packages/` with a `lint` script is reached by `turbo run lint`).
