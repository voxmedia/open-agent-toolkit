---
id: BL-261002-make-the-copy-sync-strategy
title: Make the copy sync strategy checkout-independent and settable from the CLI
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - sync
  - provider-sync
  - config
  - cli
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:56.336Z
updated: 2026-10-02T18:40:56.336Z
associated_issues: []
external_plans: []
---

## Description

Two problems make the `copy` sync strategy, the documented choice for teams
whose tools or platforms drop symlinks, hard to use:

- **B6.** Each copied skill gets a banner and a `.oat-generated` sentinel that
  contain the absolute path of the checkout that ran sync. In any other
  checkout (another developer, a worktree, CI) committed copies report
  `drifted:modified`, and `oat sync` rewrites them, so the copies churn on
  every machine. Reproduced.
- **B7.** No command sets the strategy. `oat config get/set sync.defaultStrategy`
  (also `defaultStrategy`, `providers.claude.strategy`) reports
  `Unknown config key`; `oat providers set` accepts only `--scope`, `--enabled`
  and `--disabled`. Users must hand-edit `.oat/sync/config.json`, and a
  hand-written file without `"version": 1` or `"defaultStrategy"` fails
  validation and stops sync and status. `oat config describe` nonetheless
  names `oat providers set` as the owner (see the config-describe item).
  Reproduced.

G4 (untested): fresh-clone behavior on Windows with committed symlinks has not
been tested; it is the main reason a team would pick `copy`.

Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/C-provider-sync.verify.md` (blocking
finding on "Which should I pick", finding (d)). Related, not a duplicate:
BL-260909-restamp-a-stale-copy-strategy (contentHash restamp on skip).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry B6, B7 and G4.

## Acceptance Criteria

- Copies written by the `copy` strategy contain no machine-specific absolute
  path; a copy synced in one checkout reads `in_sync` in a second checkout of
  the same commit, and `oat sync` there is a no-op. A test uses two checkout
  paths to prove it.
- A supported CLI command sets the default strategy (and per-provider strategy
  if supported), writing a valid `.oat/sync/config.json` with `version`.
- A hand-written `.oat/sync/config.json` missing `defaultStrategy` is either
  accepted with the default or rejected with a message naming the missing key.
- Windows fresh-clone behavior with committed symlinks is tested once and the
  result recorded, or explicitly left out of scope.
- The warnings on the docs branch `docs-overhaul-readme-visual` (`provider-sync/config.md:177` and `:195`,
  `provider-sync/pilot-with-a-team.md:207`, and the copy-strategy note in
  `provider-sync/manifest-and-drift.md`) are removed once fixed.
