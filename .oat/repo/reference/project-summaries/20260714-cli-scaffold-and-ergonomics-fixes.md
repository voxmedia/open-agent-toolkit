---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-14
oat_generated: true
oat_summary_last_task: p07-t04
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: cli-scaffold-and-ergonomics-fixes

## Overview

This quick-workflow project addressed downstream operator failures in project scaffolding, plan guidance, tool updates, backlog and decision workflows, CLI grammar migration, and noninteractive gates. The common problem was that otherwise valid CLI paths leaked placeholders, required fragile hand-authored records, or failed at a distance without actionable diagnostics.

## What Was Implemented

All 12 planned tasks shipped:

- **p01-t01:** Made project scaffolding tolerate whitespace inside OAT tokens, exercise the real templates across workflow modes, and fail closed if an OAT placeholder survives rendering.
- **p02-t01:** Clarified that RED/GREEN/Refactor is the recommended plan shape, while stable task IDs, per-task verification, and atomic commits are the actual invariants.
- **p03-t01:** Made a targetless `oat tools update` error suggest the exact nonimplicit remedy, `oat tools update --all`.
- **p04-t01:** Required a nonblank outcome summary before closing a backlog item, while retaining the no-ledger-entry `wont_do` path.
- **p05-t01:** Added `--decision` and `--consequences` to `oat decision new` and updated summary promotion to create complete decision records atomically.
- **p05-t02:** Added `oat backlog new <title>` with validation-before-write, canonical template/default handling, collision protection, rollback, YAML-safe data, and managed-index regeneration; migrated the backlog-item skill to this command.
- **p06-t01:** Added bounded project-level doctor detection for stale global `--scope` invocations and established prominent breaking-grammar release guidance.
- **p06-t02:** Closed stdin for noninteractive gate targets while preserving captured output, target selection, liveness, timeout, and diagnostics.
- **p07-t01:** Performed the initial lockstep package bump and the complete workspace and publishable-package gates.
- **p07-t02:** Limited the `--all` suggestion to true no-target calls and pinned target-specific diagnostics for invalid or conflicting requests.
- **p07-t03:** Added direct coverage that successful padded backlog summaries are normalized before entering the completion ledger.
- **p07-t04:** Reconciled PR #147's formatting and `0.1.64` release baseline, then re-bumped all five public packages and the bundled manifest to `0.1.65`.

Final verification passed 2,877 CLI tests across 246 files, all workspace tests and static checks, five production package builds, the production docs build, canonical skill validation, and `pnpm release:validate` for all five public packages at `0.1.65`. Final review round 3 independently passed 391 focused tests, CLI type checking, release validation, and both skill-version checks, with zero Critical, Important, Medium, or Minor findings.

## Key Decisions

- **Fail-closed scaffold rendering.** Context: real state templates used whitespace-padded OAT tokens that literal replacement silently left as valid but incorrectly typed YAML. Decision: accept canonical and legacy internal whitespace during replacement, test the real templates, and reject any unresolved OAT token before writing. Consequences: all workflow modes render typed state values, and future token drift becomes an actionable scaffold failure instead of latent project corruption.
- **Flexible plan task bodies.** Context: plan validation requires structural invariants but the shipped template presented TDD staging as mandatory. Decision: retain RED/GREEN/Refactor as the recommended default while explicitly allowing other task shapes that preserve stable IDs, verification, and atomic commits. Consequences: authors can fit plans to the work without weakening lifecycle validation or duplicating the template.
- **Nonmutating targetless updates.** Context: silently treating `oat tools update` with no target as `--all` would change scripted behavior and perform a broad mutation. Decision: keep the no-target path failing safely and provide the copy-pasteable `oat tools update --all` remedy only for that exact case. Consequences: intentional bulk updates remain explicit, while invalid packs and conflicting targets retain precise diagnostics.
- **Mandatory closed-item outcomes.** Context: archiving a closed backlog item without `--summary` emitted literal `TODO: summarize outcome` ledger entries. Decision: validate and trim a nonblank summary before any closed-path mutation, while preserving summary-free `wont_do` behavior. Consequences: completed history contains real normalized outcomes, and invalid close attempts leave files and indexes untouched.
- **CLI-owned PJM record creation.** Context: agents had to combine ID generation, hand-authored templates, and index regeneration, while decision creation could leave body sections as `TODO`. Decision: make `oat decision new` accept every substantive section and add `oat backlog new` with validation, canonical rendering, collision checks, rollback, and atomic index refresh. Consequences: canonical skills use one owning command per record, generated records are complete, and failures do not leave partial item or index state.
- **Migration diagnostics without a scope shim.** Context: restoring global `--scope` would preserve stale grammar but risk making a compatibility layer permanent. Decision: keep scope command-local, detect known stale forms through bounded doctor scans, and require prominent before/after migration guidance for breaking CLI grammar. Consequences: the current grammar remains unambiguous while upgraded repositories receive actionable evidence before stale scripts fail.
- **Closed stdin for noninteractive gates.** Context: gate prompts already travel through argv, but inherited stdin could make a target wait for parent EOF. Decision: ignore stdin at the process boundary and continue piping stdout and stderr. Consequences: noninteractive targets start promptly without changing diagnostics, liveness, timeout, or target-selection behavior.
- **Shared managed-index hardening.** Context: p05 review found that backlog creation exposed user-controlled Markdown cells and marker-like content at the shared renderer boundary. Decision: encode every managed-table cell and require exact standalone managed markers in the shared index regeneration implementation. Consequences: all callers receive the safety fix, curated content remains untouched, and no separate design artifact update is required.
- **Base-relative lockstep release bump.** Context: PR #147 landed the previously reported formatting changes and advanced `origin/main` to the `0.1.64` public-package baseline during final review. Decision: accept PR #147 as the owner of those deltas and move all five public packages plus the bundled manifest to the next unused common version, `0.1.65`. Consequences: the branch contains no unrelated formatter churn, no lockfile drift, and a real release-policy-valid delta that passed packaging validation.

## Design Deltas

No design artifact exists because the operator selected quick mode straight to planning. The one implementation-level delta came from p05 review: managed-index escaping and marker validation moved into the shared backlog index renderer because that was the owning boundary exposed by atomic backlog creation; implementation and its review record are the source of truth.

## Notable Challenges

- Parallel p02-p06 verification initially raced concurrent asset bundlers; a sequential rerun and direct CLI build established clean combined results.
- p05 and p06 each required one bounded review fix: shared managed-index safety and exclusion of nested worktrees/generated lifecycle paths from stale-invocation scans. Both passed round-2 review.
- Final review found a tools-update diagnostic boundary, missing summary-trimming characterization, and then an upstream release-version collision. The diagnostic and test tasks landed, a local type-narrowing issue was repaired, and PR #147 reconciliation removed the formatter deltas before the `0.1.65` re-bump.

## Tradeoffs Made

- Actionable errors were preferred over surprising broad mutations: tools updates remain explicit, and backlog closes fail before mutation when required evidence is absent.
- The project preserved command-local `--scope` instead of adding a compatibility shim; migration support is diagnostic and documentation-driven.
- Shared primitives were hardened where they owned safety and atomicity, even when review first exposed the issue through a new command.

## Integration Notes

- PR #147's Artifact Hygiene and Autonomous Execution Learnings contracts were preserved while the canonical `oat-project-summary` skill gained complete context/decision/consequences promotion; its final version is `1.3.2`.
- `oat-pjm-add-backlog-item` now delegates creation to `oat backlog new`, passes the confirmed scope estimate, and keeps only post-create enrichment for non-index-visible fields; its final version is `1.3.1`.
- The public package set—CLI, control plane, docs config, docs theme, and docs transforms—and the bundled version manifest are lockstep at `0.1.65`.
