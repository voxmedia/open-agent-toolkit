---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-22
oat_generated: true
oat_summary_last_task: p02-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: oat-init-scope-selection

## Overview

This quick-mode project fixed an onboarding gap in `oat init --setup`: guided setup installed tool packs without exposing the additive per-pack scope selector that `oat tools install` already provided. The goal was to let users opt into per-pack scope control during guided setup while keeping first-run onboarding short and non-interactive runs prompt-safe.

## What Was Implemented

- `oat init --setup` now asks whether to customize per-pack scope in interactive guided setup.
- The scope-customization gate now runs after pack selection, only when at least one selected pack is user-eligible.
- Choosing to customize routes guided setup through the existing per-pack `project / user / both` selector for user-eligible packs.
- Choosing the recommended defaults applies additive per-pack defaults without forcing every pack to project scope.
- If no selected pack has user-scope choices, guided setup skips the scope gate entirely.
- Non-interactive guided setup skips prompts and applies safe defaults without reaching local-path or scope prompts.
- The tools-install resolver now accepts a `scopeSelection` mode on `CommandContext`, including a deferred `gate` mode for guided setup, without changing the regular `oat tools install` behavior.
- Public package versions were bumped in lockstep to `0.1.30`.
- Local OAT docs index generation now uses the source-only `cli:source` runner during docs app `predev`/`prebuild`, avoiding shared CLI asset rebundling during concurrent verification.
- Documentation was updated to reflect guided setup scope behavior and the shared additive resolver.

## Key Decisions

- Guided setup uses a single opt-in gate instead of always showing per-pack scope prompts. This preserves low-friction onboarding while still exposing full control when requested.
- The gate is deferred into the tools flow so it can run after pack selection and skip itself when no selected pack has user-scope choices.
- The default path preserves existing placement or pack defaults additively; it does not remove packs from another scope.
- The normal root `cli` script still bundles assets for product/developer CLI use. The new `cli:source` script is reserved for local OAT-repo docs index generation where asset rebundling creates test races.
- The original final-review Medium about gate ordering was first accepted as non-blocking, then an independent v2 final review converted it into `p02-t01`. The fix landed in `817a600e`, re-review passed, and backlog item `bl-1b29` was closed.

## Design Deltas

- The original p01 implementation prompted before `runToolPacks`, so users could see the scope question before knowing which packs they selected. Independent final review v2 converted that into `p02-t01`; the current implementation now prompts after pack selection and skips the gate when no selected pack has user-scope choices.
- The plan listed only `index.ts` and `index.test.ts` for guided setup test changes. Implementation also updated `guided-setup.test.ts`, which is the existing integration harness for the changed prompt sequence.
- Post-phase verification exposed that root `pnpm test` could race docs prebuild asset bundling with CLI tests. The implementation added `cli:source` and routed OAT-repo docs index generation through it to keep verification deterministic.

## Notable Challenges

- The first p01 review found non-interactive `--setup` could still reach an interactive local-path prompt and that concrete `--scope project|user` could bypass the guided scope gate. Both were fixed before final review.
- Independent final review v2 found the gate-ordering UX gap and a stale comment. Both were folded into `p02-t01`, fixed, and re-reviewed as passing.
- The default full CLI suite exposed a timeout in the bundle consistency test under suite load. That test received a focused timeout, and the full CLI suite passed afterward.
- Default root `pnpm test` initially failed because docs app prebuild rebundled shared CLI assets while CLI tests read from the same asset directory. Moving local docs index generation to `cli:source` resolved the race.

## Integration Notes

- `CommandContext.scopeSelection` is the shared signal for guided setup scope behavior. `scopeSelection: gate` defers the prompt until selected user-eligible packs are known; `defaults` resolves additive per-pack defaults; `interactive` preserves the per-pack selector path.
- Regular `oat tools install` keeps its existing additive behavior. This project wires guided setup into that resolver rather than creating a separate scope-selection implementation.
- OAT-repo docs app scripts should use `pnpm -w run cli:source -- docs generate-index ...`; generated docs apps for OAT repos now emit the same command.
