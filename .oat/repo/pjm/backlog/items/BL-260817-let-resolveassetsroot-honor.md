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
updated: 2026-08-20T02:37:32Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-19-hermetic-cli-assets-root.md
---

## Description

`packages/cli/scripts/bundle-assets.sh` honors `OAT_ASSETS_DIR`, but the runtime reader `resolveAssetsRoot` (`packages/cli/src/fs/assets.ts`) hardcodes `<cliRoot>/assets` with no override. That asymmetry is the root cause of the intermittent smoke failure in `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs` ('Bundled asset metadata not found'): the test imports built CLI code that always reads the shared assets directory, while something in the 10-way-parallel smoke run rebuilds that directory mid-suite.

Commit `c6a01adbd` narrowed the window by publishing the bundle via staged renames instead of an in-place `rm -rf` + repopulate (measured: 3/3 failing runs before, 1/3 after), but a reader can still land between the two renames.

The completing fix: mirror `OAT_ASSETS_DIR` in `resolveAssetsRoot`, then have `package-coverage-consumers.test.mjs` bundle once into its own temp directory and point the CLI at it, removing the shared-mutable-state dependency entirely. Decide whether the override should be unconditional or gated to non-production use — it adds a runtime env knob to production CLI surface, which is why this was parked rather than done in the explainer-improvements-v2 PR.

Note: the concurrent writer that rebuilds `packages/cli/assets` mid-suite was never identified; `packaged-layout.test.mjs` redirects its bundling to a temp dir and looks innocent. The fix above works regardless of the writer's identity.

## Acceptance Criteria

- `resolveAssetsRoot` honors a non-empty `OAT_ASSETS_DIR` and applies the same
  directory and bundle-integrity validation used for the packaged default.
- An explicit missing, malformed, or version-mismatched override fails closed;
  an unset or blank override preserves the packaged default.
- `packages/cli/src/fs/assets.test.ts` covers override, fallback, and invalid
  bundle behavior without mutating process-global environment.
- `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs` bundles once
  into a private temporary directory, reads built CLI assets from that root,
  restores environment state, and removes the directory on every path.
- Required lockstep public-package versions and release validation are updated
  for the shipped CLI behavior change.
