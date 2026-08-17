---
id: BL-260817-let-resolveassetsroot-honor
title: Let resolveAssetsRoot honor OAT_ASSETS_DIR and make smoke asset reads hermetic
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - cli
  - testing
  - flake
assignee: null
created: 2026-08-17T09:21:32.316Z
updated: 2026-08-17T09:21:32.316Z
associated_issues: []
external_plans: []
---

## Description

`packages/cli/scripts/bundle-assets.sh` honors `OAT_ASSETS_DIR`, but the runtime reader `resolveAssetsRoot` (`packages/cli/src/fs/assets.ts`) hardcodes `<cliRoot>/assets` with no override. That asymmetry is the root cause of the intermittent smoke failure in `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs` ('Bundled asset metadata not found'): the test imports built CLI code that always reads the shared assets directory, while something in the 10-way-parallel smoke run rebuilds that directory mid-suite.

Commit `c6a01adbd` narrowed the window by publishing the bundle via staged renames instead of an in-place `rm -rf` + repopulate (measured: 3/3 failing runs before, 1/3 after), but a reader can still land between the two renames.

The completing fix: mirror `OAT_ASSETS_DIR` in `resolveAssetsRoot`, then have `package-coverage-consumers.test.mjs` bundle once into its own temp directory and point the CLI at it, removing the shared-mutable-state dependency entirely. Decide whether the override should be unconditional or gated to non-production use — it adds a runtime env knob to production CLI surface, which is why this was parked rather than done in the explainer-improvements-v2 PR.

Note: the concurrent writer that rebuilds `packages/cli/assets` mid-suite was never identified; `packaged-layout.test.mjs` redirects its bundling to a temp dir and looks innocent. The fix above works regardless of the writer's identity.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
