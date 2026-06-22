---
id: bl-1b29
title: 'Move guided setup scope gate after pack selection'
status: done
priority: medium
scope: task
scope_estimate: S
labels: [cli, init, tool-packs, ux]
assignee: null
created: '2026-06-22T18:42:34Z'
updated: '2026-06-22T19:30:00Z'
associated_issues: []
oat_template: false
---

## Resolution

Resolved by the `oat-init-scope-selection` p02-t01 fix (PR #116, commit `817a600e`).
The guided-setup scope gate was relocated out of `runGuidedSetupImpl` into the
tools flow: `ScopeSelectionMode` gained a `'gate'` value, and `resolveDeferredGate`
inside `resolvePackScopes` presents `Customize per-pack scope? (y/N)` only after
pack selection and only when at least one user-eligible pack is selected (after the
`eligiblePacks.length === 0` early return). All acceptance criteria met; the
independent final review (v2) re-review passed with the fix.

## Description

`oat init --setup` now asks whether to customize per-pack scope and routes the answer through the same additive scope resolver used by `oat tools install`. The current prompt is still shown before the user has selected packs, because guided setup computes `scopeSelection` in `runGuidedSetupImpl` before calling `runToolPacks`.

This follow-up should move the guided-only scope-customization gate into the tools flow after `selectedPacks` is known and before scope resolution. That preserves the shipped yes/no/default semantics while letting the prompt mention only the packs that can actually be installed at user scope.

Origin: accepted Medium finding in `.oat/projects/shared/oat-init-scope-selection/reviews/final-review-2026-06-22.md`.

## Acceptance Criteria

- `oat init --setup` asks the scope-customization question only after pack selection is known.
- The gate is skipped when no selected pack is eligible for user-scope installation.
- A "yes" answer still runs the per-pack `project / user / both` selector for user-eligible packs.
- A "no" answer still applies additive per-pack defaults without forcing every pack to project scope.
- Non-interactive `--setup` remains prompt-safe and applies additive defaults.
- Tests cover pack-selection-before-gate ordering and the no-user-eligible-pack skip path.
