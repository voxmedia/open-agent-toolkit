---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-22
oat_generated: true
oat_summary_last_task: p01-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: oat-init-scope-selection

## Overview

This quick-mode project fixed an onboarding gap in `oat init --setup`: guided setup installed tool packs without exposing the additive per-pack scope selector that `oat tools install` already provided. The goal was to let users opt into per-pack scope control during guided setup while keeping first-run onboarding short and non-interactive runs prompt-safe.

## What Was Implemented

- `oat init --setup` now asks whether to customize per-pack scope in interactive guided setup.
- Choosing to customize routes guided setup through the existing per-pack `project / user / both` selector for user-eligible packs.
- Choosing the recommended defaults applies additive per-pack defaults without forcing every pack to project scope.
- Non-interactive guided setup skips prompts and applies safe defaults without reaching local-path or scope prompts.
- The tools-install resolver now accepts a `scopeSelection` mode on `CommandContext`, allowing guided setup to request defaults or interactive per-pack scope selection without changing the regular `oat tools install` behavior.
- Public package versions were bumped in lockstep to `0.1.30`.
- Local OAT docs index generation now uses the source-only `cli:source` runner during docs app `predev`/`prebuild`, avoiding shared CLI asset rebundling during concurrent verification.
- Documentation was updated to reflect guided setup scope behavior and the shared additive resolver.

## Key Decisions

- Guided setup uses a single opt-in gate instead of always showing per-pack scope prompts. This preserves low-friction onboarding while still exposing full control when requested.
- The default path preserves existing placement or pack defaults additively; it does not remove packs from another scope.
- The normal root `cli` script still bundles assets for product/developer CLI use. The new `cli:source` script is reserved for local OAT-repo docs index generation where asset rebundling creates test races.
- The accepted final-review Medium about gate ordering was treated as follow-up work rather than blocking this implementation, because the release gate had no Critical or Important findings.

## Design Deltas

- The original discovery success criteria said the scope-customization gate should appear after pack selection. The shipped implementation prompts before `runToolPacks`, so users can see the scope question before knowing which packs they selected. Final review accepted this as a non-blocking Medium, and follow-up item `bl-1b29` tracks moving the gate after pack selection and skipping it when no selected pack has user-scope choices.
- The plan listed only `index.ts` and `index.test.ts` for guided setup test changes. Implementation also updated `guided-setup.test.ts`, which is the existing integration harness for the changed prompt sequence.
- Post-phase verification exposed that root `pnpm test` could race docs prebuild asset bundling with CLI tests. The implementation added `cli:source` and routed OAT-repo docs index generation through it to keep verification deterministic.

## Notable Challenges

- The first p01 review found non-interactive `--setup` could still reach an interactive local-path prompt and that concrete `--scope project|user` could bypass the guided scope gate. Both were fixed before final review.
- The default full CLI suite exposed a timeout in the bundle consistency test under suite load. That test received a focused timeout, and the full CLI suite passed afterward.
- Default root `pnpm test` initially failed because docs app prebuild rebundled shared CLI assets while CLI tests read from the same asset directory. Moving local docs index generation to `cli:source` resolved the race.

## Integration Notes

- `CommandContext.scopeSelection` is the shared signal for guided setup scope behavior. `scopeSelection: defaults` takes precedence over concrete `--scope` and resolves additive per-pack defaults; `scopeSelection: interactive` preserves the per-pack selector path.
- Regular `oat tools install` keeps its existing additive behavior. This project wires guided setup into that resolver rather than creating a separate scope-selection implementation.
- OAT-repo docs app scripts should use `pnpm -w run cli:source -- docs generate-index ...`; generated docs apps for OAT repos now emit the same command.

## Follow-up Items

- `bl-1b29` — Move guided setup scope gate after pack selection and skip it when no selected pack is eligible for user-scope installation.
