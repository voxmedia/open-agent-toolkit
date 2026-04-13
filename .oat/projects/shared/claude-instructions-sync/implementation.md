---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-13
oat_current_task_id: p04-t11
oat_generated: false
oat_template: false
oat_template_name: implementation
---

# Implementation: claude-instructions-sync

**Started:** 2026-04-10
**Last Updated:** 2026-04-13

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | completed   | 2     | 2/2       |
| Phase 2 | completed   | 2     | 2/2       |
| Phase 3 | completed   | 2     | 2/2       |
| Phase 4 | in_progress | 11    | 10/11     |

**Total:** 16/17 tasks completed

---

## Phase 1: Model Discovery And Strategy State

**Status:** completed
**Started:** 2026-04-11

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Strategy selection is now surfaced consistently on `oat instructions validate` and `oat instructions sync`.
- Both commands resolve the same default strategy and pass the selected mode through the shared scan path.
- Help output and command tests now cover the new project-scoped strategy flag shape.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.types.ts`
- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/validate/validate.ts`
- `packages/cli/src/commands/instructions/validate/validate.test.ts`
- `packages/cli/src/commands/instructions/sync/sync.ts`
- `packages/cli/src/commands/instructions/sync/sync.test.ts`
- `packages/cli/src/commands/help-snapshots.test.ts`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/validate/validate.test.ts packages/cli/src/commands/help-snapshots.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Kept strategy resolution in shared instruction utilities so upcoming sync/adoption work can reuse one defaulting path.
- Limited scope to project commands only; user-level provider scanning remains out of scope for this project.

### Task p01-t01: Expand instruction scan state for paired and stray files

**Status:** completed
**Commit:** 231da372

**Outcome (required when completed):**

- Instruction scan entries now represent both canonical AGENTS/CLAUDE pairs and Claude-only stray directories.
- Summary and report formatting handle stray instruction state instead of assuming every entry has an AGENTS path.
- Utility coverage now exercises missing Claude, content mismatch, and Claude-only stray cases from the same scanner.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - widened the instruction entry/status model for stray support
- `packages/cli/src/commands/instructions/instructions.utils.ts` - switched scan discovery to per-directory instruction pairing
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - added scanner/summary/report coverage for Claude-only strays

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Kept the new scan state additive by preserving existing `missing` / `content_mismatch` semantics and introducing `stray` for Claude-only directories.
- Left sync/apply behavior unchanged for stray entries so the next task can add strategy selection without reworking scan shape again.

---

### Task p01-t02: Add project-scoped strategy selection to the instructions commands

**Status:** completed
**Commit:** e1b792bd

**Outcome (required when completed):**

- Added `pointer`, `symlink`, and `copy` as explicit instruction sync strategies for project-scoped instruction commands.
- Wired `validate` and `sync` to parse the same strategy flag and forward the resolved value to the shared scan path.
- Updated command/help coverage to lock in the new option surface and invocation shape.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - declared the shared strategy union and scan dependency option
- `packages/cli/src/commands/instructions/instructions.utils.ts` - added the shared default/resolver used by command entrypoints
- `packages/cli/src/commands/instructions/validate/validate.ts` - added `--strategy` parsing and scan forwarding
- `packages/cli/src/commands/instructions/validate/validate.test.ts` - fixed command-arg harnessing and asserted strategy forwarding
- `packages/cli/src/commands/instructions/sync/sync.ts` - added `--strategy` parsing and scan forwarding
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - asserted strategy forwarding for sync
- `packages/cli/src/commands/help-snapshots.test.ts` - updated help output snapshots for the new option formatting

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/validate/validate.test.ts packages/cli/src/commands/help-snapshots.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Used Commander `Option` instead of chained `.option().choices()` so the CLI surface stays aligned with the version in this repo.
- Left strategy behavior implementation for filesystem writes/adoption to Phase 2; this task only establishes the command contract.

---

## Phase 2: Implement Sync And Adoption Behavior

**Status:** completed
**Started:** 2026-04-11

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- `oat instructions sync` now repairs `CLAUDE.md` using pointer, symlink, or hard-copy strategies instead of a pointer-only write path.
- Claude-only stray files are now adopted into canonical `AGENTS.md` files before Claude is regenerated with the selected strategy.
- Instruction integration coverage now includes real adoption flows, including symlink-based Claude regeneration.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.types.ts`
- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/instructions.utils.test.ts`
- `packages/cli/src/commands/instructions/sync/sync.ts`
- `packages/cli/src/commands/instructions/sync/sync.test.ts`
- `packages/cli/src/commands/instructions/instructions.integration.test.ts`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.integration.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Strategy validation now checks file kind as well as content, so `copy` and `symlink` remain semantically distinct.
- Stray adoption writes canonical `AGENTS.md` first, then rewrites `CLAUDE.md`, ensuring the original Claude instructions are preserved before normalization.

### Task p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation

**Status:** completed
**Commit:** 479f2ba0

**Outcome (required when completed):**

- `oat instructions sync` now creates or repairs `CLAUDE.md` using the selected `pointer`, `symlink`, or `copy` strategy instead of always writing pointer content.
- Strategy-aware validation now distinguishes pointer files, hard copies, and file symlinks, so the scan result matches the chosen sync mode.
- Sync test coverage now locks in update behavior that replaces mismatched files only under `--force`, including symlink replacement and hard-copy generation.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - extended scan and sync dependency contracts for file-kind checks and strategy-aware repair helpers
- `packages/cli/src/commands/instructions/instructions.utils.ts` - validated pointer, symlink, and copy modes against actual file type/content
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - added strategy-aware validation coverage for symlink and copy expectations
- `packages/cli/src/commands/instructions/sync/sync.ts` - implemented strategy-aware create/update planning and application
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - added pointer, symlink, and hard-copy repair coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Treated file kind as part of validity, so `copy` rejects a symlink even when the target content matches and `pointer` rejects non-pointer copies.
- Used relative file symlinks (`AGENTS.md`) for same-directory repairs so nested project moves keep links stable.

---

### Task p02-t02: Implement Claude-only stray adoption into canonical `AGENTS.md`

**Status:** completed
**Commit:** 4c5c8023

**Outcome (required when completed):**

- Claude-only stray entries are now adopted into canonical `AGENTS.md` files and then re-synced into `CLAUDE.md` using the selected strategy.
- Sync planning now emits explicit adoption work for stray entries instead of silently ignoring them.
- Integration coverage now verifies both pointer-style and symlink-style post-adoption Claude regeneration.

**Files changed:**

- `packages/cli/src/commands/instructions/sync/sync.ts` - added stray adoption planning and apply logic
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - added unit coverage for adopt-then-resync behavior
- `packages/cli/src/commands/instructions/instructions.integration.test.ts` - added real filesystem adoption scenarios

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.integration.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Adopted stray Claude content without requiring `--force` because there is no canonical `AGENTS.md` in the stray state.
- Normalized adopted Claude files immediately after writing `AGENTS.md` so validate reports `ok` on the same strategy-specific pass.

---

## Phase 3: Finish Coverage And Documentation

**Status:** completed
**Started:** 2026-04-11

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Added end-to-end nested project coverage for mixed valid, missing, mismatched, stray, and excluded instruction states in one repo tree.
- Updated user-facing docs so the CLI guidance now reflects strategy-aware validation/sync and Claude-only stray adoption.
- Verified the final implementation with the full CLI package test suite and a docs production build.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.integration.test.ts`
- `apps/oat-docs/docs/provider-sync/commands.md`
- `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
- `apps/oat-docs/docs/reference/troubleshooting.md`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test`
- Result: pass
- Run: `pnpm build:docs`
- Result: pass

**Notes / Decisions:**

- Kept the final phase implementation-light: the new nested mixed-tree test passed without further CLI code changes, which confirms the Phase 1/2 behavior composes correctly at depth.
- Updated troubleshooting and command docs instead of expanding help text further, since the CLI surface already carries the concrete option contract.

### Task p03-t01: Add end-to-end coverage for nested project directories

**Status:** completed
**Commit:** 37055047

**Outcome (required when completed):**

- Added a mixed nested-tree integration case that exercises valid pairs, missing Claude files, drifted files, stray Claude files, and excluded `node_modules` in one run.
- Verified that `oat instructions sync --force` resolves every drifted nested case without touching excluded directories.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.integration.test.ts` - added end-to-end nested mixed-state coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test`
- Result: pass

**Notes / Decisions:**

- Consolidated the nesting scenarios into one integration case so exclusions, adoption, and repair behavior are proven together.

---

### Task p03-t02: Update docs and help text for strategy-aware project sync

**Status:** completed
**Commit:** f25329a9

**Outcome (required when completed):**

- Updated the provider-sync and CLI utility docs to describe strategy-aware instruction validation/sync and Claude-only stray adoption.
- Refreshed troubleshooting guidance so operators know when to use `--strategy` and how `stray` is resolved.

**Files changed:**

- `apps/oat-docs/docs/provider-sync/commands.md` - documented strategy-aware validate/sync behavior
- `apps/oat-docs/docs/cli-utilities/config-and-local-state.md` - updated the instruction command summary
- `apps/oat-docs/docs/reference/troubleshooting.md` - added `stray` and strategy-specific troubleshooting guidance

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Notes / Decisions:**

- Kept the docs changes focused on the existing provider-sync and CLI utility pages instead of creating a new instructions-specific doc leaf.

---

## Phase 4: Review Fixes From Final Review

**Status:** in_progress
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

Pending execution of review-fix tasks `p04-t01` through `p04-t11` added from the manual final code review.

**Key files touched:**

- `packages/cli/src/commands/instructions/*`
- `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- `.oat/projects/shared/claude-instructions-sync/{plan,implementation,state}.md`

**Verification:**

- Review receive bookkeeping only. No code changes executed yet.

**Notes / Decisions:**

- Converted all accepted Medium and Minor findings from `final-review-2026-04-11-v2.md` into queued plan tasks.
- A clean final re-review is required after Phase 4 completes.

### Task p04-t01: (review) Remove recursive deletion from instruction cleanup

**Status:** completed
**Commit:** 9b700e65

**Outcome (required when completed):**

- Narrowed the file-removal helper used by instruction sync so it only passes `force: true` to `rm`.
- Exposed the helper as a small unit boundary so deletion options are directly testable.
- Added targeted sync-command coverage that locks in the non-recursive delete contract.

**Files changed:**

- `packages/cli/src/commands/instructions/sync/sync.ts` - extracted `removeInstructionFile` and removed the recursive delete option
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - added a focused assertion for the helper’s delete options

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass

**Notes / Decisions:**

- Used a helper extraction instead of an indirect behavior test so the safety constraint is explicit and stable.

### Task p04-t02: (review) Add copy-strategy stray adoption integration coverage

**Status:** completed
**Commit:** a7f25b85

**Outcome (required when completed):**

- Added an end-to-end integration case for stray adoption under `--strategy copy`.
- Verified that the adopted `AGENTS.md` content and regenerated `CLAUDE.md` copy stay byte-for-byte aligned.
- Added a strategy-specific validate pass so copy-mode adoption is covered through both sync and validation.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.integration.test.ts` - added the copy-strategy stray adoption integration scenario

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
- Result: pass

**Notes / Decisions:**

- Reused the existing pointer/symlink stray fixture shape so the three strategy variants stay parallel and readable.

### Task p04-t03: (review) Separate scan diagnostics for Claude and AGENTS read failures

**Status:** completed
**Commit:** 37183b96

**Outcome (required when completed):**

- Split scan failure handling so `CLAUDE.md`, `AGENTS.md`, and symlink-target read errors produce distinct diagnostics.
- Preserved the existing `missing` behavior for missing Claude files while preventing copy-mode AGENTS failures from being misreported.
- Added regression coverage for both copy-mode AGENTS read failures and symlink target read failures.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.utils.ts` - narrowed scan error boundaries for `lstat`, `readFile`, and `readlink`
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - added explicit diagnostics regression tests

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass

**Notes / Decisions:**

- Kept `ENOENT` on `CLAUDE.md` reads mapped to `missing` so existing validate semantics stay stable.

### Task p04-t04: (review) Update instructions help text for strategy-aware drift repair

**Status:** completed
**Commit:** 8052c197

**Outcome (required when completed):**

- Refreshed the `instructions validate` and `instructions sync` descriptions so they describe strategy-aware sync integrity and repair instead of pointer-only behavior.
- Updated the help-output coverage to reflect the new command wording consistently.
- Adjusted the instructions command description test to assert the new stable wording contract.

**Files changed:**

- `packages/cli/src/commands/instructions/validate/validate.ts` - updated validate command description
- `packages/cli/src/commands/instructions/sync/sync.ts` - updated sync command description
- `packages/cli/src/commands/help-snapshots.test.ts` - refreshed help-output expectations
- `packages/cli/src/commands/instructions/index.test.ts` - updated stable description assertions

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/index.test.ts packages/cli/src/commands/help-snapshots.test.ts`
- Result: pass

**Notes / Decisions:**

- Switched the `instructions --help` assertion to an exact string expectation because the wrapped multi-line descriptions were brittle under the inline-snapshot serializer.

### Task p04-t05: (review) Refresh provider-sync scope docs for strategy-aware instructions

**Status:** completed
**Commit:** c32e27ad

**Outcome (required when completed):**

- Updated the provider-sync scope page so it describes project-scoped instruction sync integrity rather than pointer-only checks.
- Refreshed the adjacent CLI command summary to mention pointer, symlink, copy, and Claude-only adoption behavior.

**Files changed:**

- `apps/oat-docs/docs/provider-sync/scope-and-surface.md` - replaced stale pointer-only wording with current strategy-aware instruction sync language

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Notes / Decisions:**

- Kept the change narrowly scoped to the stale wording called out by review instead of revising the page more broadly.

### Task p04-t06: (review) Clarify scan dependency typing boundaries

**Status:** completed
**Commit:** 8d9c24f8

**Outcome (required when completed):**

- Introduced explicit scan options so strategy and debug logging are no longer mixed into the injected filesystem dependency contract.
- Updated scan internals to pass debug logging separately while preserving current behavior.
- Updated scan call sites and utility tests to use the new `options` plus `overrides` split.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - added `InstructionsScanOptions` and narrowed the dependency interface
- `packages/cli/src/commands/instructions/instructions.utils.ts` - split scan options from dependency injection
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - updated scan call sites to the new signature

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Kept the command entrypoints unchanged from the caller perspective by preserving `scanInstructionFiles(repoRoot, { strategy })`.

### Task p04-t07: (review) Harden symlink validation against canonical path differences

**Status:** completed
**Commit:** eb25b0e0

**Outcome (required when completed):**

- Canonicalized both symlink targets and `AGENTS.md` paths before validating symlink-mode instruction entries.
- Added a regression test that scans a repo through an alias path while `CLAUDE.md` points at the canonical absolute `AGENTS.md` target.
- Preserved existing symlink-mode behavior for normal relative links while eliminating the raw-string false negative.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - added `realpath` to the injected scan dependency contract
- `packages/cli/src/commands/instructions/instructions.utils.ts` - canonicalized symlink target comparison
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - added alias-root regression coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass

**Notes / Decisions:**

- Used `realpath(...).catch(() => originalPath)` so validation still degrades predictably if canonicalization itself fails.

### Task p04-t08: (review) Surface partial stray-adoption failures clearly

**Status:** completed
**Commit:** b419fd61

**Outcome (required when completed):**

- Wrapped post-adoption Claude regeneration failures with an explicit error that confirms `AGENTS.md` was already created.
- Limited the new error wrapping to the stray-adoption resync path so normal sync failures keep their existing behavior.
- Added regression coverage for the partial-adoption failure case and verified the command exits with an error.

**Files changed:**

- `packages/cli/src/commands/instructions/sync/sync.ts` - wrapped stray resync failures with a clearer `CliError`
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - added a partial-adoption failure regression test

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass

**Notes / Decisions:**

- Kept the message focused on the partial state rather than trying to auto-rollback the already-created `AGENTS.md`.

### Task p04-t09: (review) Guard against AGENTS races during stray adoption

**Status:** completed
**Commit:** 7fb190e1

**Outcome (required when completed):**

- Added a pre-adoption existence check so sync bails out if canonical `AGENTS.md` appears after the scan classified the directory as stray.
- Kept the guard scoped to the stray-adoption write path, so normal sync and re-sync behavior are unchanged.
- Added command coverage that asserts the race fails before any destructive write/remove operations happen.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - extended sync dependencies with `lstat`
- `packages/cli/src/commands/instructions/sync/sync.ts` - added the stray adoption race guard
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - added a race regression test

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass

**Notes / Decisions:**

- The guard intentionally tells the operator to re-run sync so the directory is reclassified from live filesystem state.

### Task p04-t10: (review) Remove redundant post-sync guard

**Status:** completed
**Commit:** f5b1d46b

**Outcome (required when completed):**

- Removed the redundant `action.type !== 'skip'` condition from post-sync entry reconciliation.
- Preserved existing sync behavior because `result === 'applied'` already excludes skipped actions.
- Verified the sync command test suite after the cleanup.

**Files changed:**

- `packages/cli/src/commands/instructions/sync/sync.ts` - simplified the applied-action guard in `getPostSyncEntries`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass

**Notes / Decisions:**

- Kept the change behavior-neutral and limited to the dead guard called out by review.

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-04-10

**Session Start:** quick-start planning

- [ ] p01-t01: Expand instruction scan state for paired and stray files - pending
- [ ] p01-t02: Add project-scoped strategy selection to the instructions commands - pending
- [ ] p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation - pending
- [ ] p02-t02: Implement Claude-only stray adoption into canonical `AGENTS.md` - pending
- [ ] p03-t01: Add end-to-end coverage for nested project directories - pending
- [ ] p03-t02: Update docs and help text for strategy-aware project sync - pending

**What changed (high level):**

- Captured quick-start discovery for project-scoped instruction sync and adoption
- Generated an execution-ready plan with six tasks across modeling, sync, adoption, and docs/test coverage
- Initialized resumable implementation tracking with `p01-t01` as the next task

**Decisions:**

- Keep V1 project-only
- Extend `oat instructions` instead of refactoring provider sync
- Support pointer, symlink, and copy strategies in the command layer

**Follow-ups / TODO:**

- Decide during implementation whether strategy defaults live only on flags or also in project config
- Decide whether adoption remains part of `sync` or is gated by a dedicated flag

**Blockers:**

- None - pending implementation

**Session End:** quick-start handoff

---

### 2026-04-11

**Session Start:** task execution

- [x] p01-t01: Expand instruction scan state for paired and stray files - 231da372
- [x] p01-t02: Add project-scoped strategy selection to the instructions commands - e1b792bd
- [x] p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation - 479f2ba0
- [x] p02-t02: Implement Claude-only stray adoption into canonical `AGENTS.md` - 4c5c8023
- [x] p03-t01: Add end-to-end coverage for nested project directories - 37055047
- [x] p03-t02: Update docs and help text for strategy-aware project sync - f25329a9

**What changed (high level):**

- Reworked instruction discovery to index directories by both `AGENTS.md` and `CLAUDE.md`
- Added `stray` scan state and summary/report support for Claude-only directories
- Implemented strategy-aware repair and stray-adoption flows for `CLAUDE.md`

**Decisions:**

- Preserve the existing `missing` state for AGENTS-only directories
- Add `stray` as the forward-compatible Claude-only state instead of overloading `content_mismatch`
- Treat the selected file strategy as part of validation semantics, not just write behavior

**Follow-ups / TODO:**

- Trigger final review and record results in `plan.md`
- Prepare final summary/PR context from the completed implementation artifacts

**Blockers:**

- None

**Session End:** phase 2 complete

---

### Review Received: final

**Date:** 2026-04-13
**Review artifact:** `reviews/archived/final-review-2026-04-11-v2.md`
**Review cycle:** 2 of 3

**Findings:**

- Critical: 0
- Important: 0
- Medium: 3
- Minor: 8

**New tasks added:** `p04-t01`, `p04-t02`, `p04-t03`, `p04-t04`, `p04-t05`, `p04-t06`, `p04-t07`, `p04-t08`, `p04-t09`, `p04-t10`, `p04-t11`

**Disposition summary:**

- Converted all Medium findings to fix tasks
- Converted all Minor findings to fix tasks per user direction
- Deferred findings: none

**Next:** Execute Phase 4 via the `oat-project-implement` skill starting at `p04-t01`, then update the review row to `fixes_completed` and re-run final code review.

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Passed | Failed | Coverage |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/validate/validate.test.ts packages/cli/src/commands/help-snapshots.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli type-check`                                                                                                                                   | yes    | 0      | n/a      |
| 2     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.utils.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.integration.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli type-check` | yes    | 0      | n/a      |
| 3     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`; `pnpm --filter @open-agent-toolkit/cli test`; `pnpm build:docs`                                                                                                                                                                                                                                                                       | yes    | 0      | n/a      |

## Final Summary (for PR/docs)

**What shipped:**

- Instruction scan state, command contract work, strategy-aware `CLAUDE.md` repair behavior, Claude-only stray adoption, nested coverage, and user-facing docs

**Behavioral changes (user-facing):**

- `oat instructions validate` and `oat instructions sync` now expose a `--strategy` flag with `pointer`, `symlink`, and `copy`
- `oat instructions sync` now creates or repairs `CLAUDE.md` as a pointer file, file symlink, or hard copy based on the selected strategy
- `oat instructions sync` now adopts Claude-only stray files into canonical `AGENTS.md` content before regenerating Claude
- Nested project trees are now covered end to end, including excluded directories and mixed valid/drifted/adoptable states

**Key files / modules:**

- `packages/cli/src/commands/instructions/*` - planned implementation surface
- `apps/oat-docs/docs/provider-sync/*` - planned docs updates

**Verification performed:**

- Phase 1 through Phase 3 verification passed, including the full CLI package test suite and docs build
- Final review receive bookkeeping completed; Phase 4 review-fix execution is now pending

**Design deltas (if any):**

- No design artifact created; quick workflow went straight from discovery to plan

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
