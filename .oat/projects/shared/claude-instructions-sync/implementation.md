---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-13
oat_current_task_id: null
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

| Phase    | Status    | Tasks | Completed |
| -------- | --------- | ----- | --------- |
| Phase 1  | completed | 2     | 2/2       |
| Phase 2  | completed | 2     | 2/2       |
| Phase 3  | completed | 2     | 2/2       |
| Phase 4  | completed | 11    | 11/11     |
| Phase 5  | completed | 2     | 2/2       |
| Phase 6  | completed | 2     | 2/2       |
| Phase 7  | completed | 1     | 1/1       |
| Phase 8  | completed | 1     | 1/1       |
| Phase 9  | completed | 1     | 1/1       |
| Phase 10 | completed | 1     | 1/1       |

**Total:** 25/25 tasks completed

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

**Status:** completed
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

- Completed all 11 review-fix tasks added from the manual final code review.
- Tightened instruction sync/apply behavior around cleanup, adoption, diagnostics, and symlink validation.
- Updated the provider-sync docs and command help text to reflect strategy-aware instruction repair behavior.

**Key files touched:**

- `packages/cli/src/commands/instructions/*`
- `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- `.oat/projects/shared/claude-instructions-sync/{plan,implementation,state}.md`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass

**Notes / Decisions:**

- Converted all accepted Medium and Minor findings from `final-review-2026-04-11-v2.md` into fix tasks and completed them in Phase 4.
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

### Task p04-t11: (review) Detect broken Claude symlinks during instruction scans

**Status:** completed
**Commit:** dd650ccc

**Outcome (required when completed):**

- Preserved broken instruction symlinks during discovery when the target stat fails with `ENOENT`.
- Ensured later classification can report broken `CLAUDE.md` links as actionable entries instead of dropping the directory entirely.
- Added regression coverage for a Claude-only broken symlink directory and verified the utility test suite.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.utils.ts` - preserved broken instruction symlink candidates during directory scanning
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - added coverage for broken Claude symlinks surfacing as stray entries

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass

**Notes / Decisions:**

- Limited the scan-time preservation to `ENOENT` so broken symlinks are retained without changing how other symlink stat failures are logged and skipped.

---

## Phase 5: Review Fixes From Independent Final Re-Review

**Status:** completed
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

- Completed both review-fix tasks added from the independent final re-review.
- Restored validation visibility for unreadable `CLAUDE.md` files in pointer/copy mode.
- Corrected the troubleshooting docs so preview guidance uses `--dry-run` instead of the mutating default command.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/instructions.utils.test.ts`
- `apps/oat-docs/docs/reference/troubleshooting.md`
- `.oat/projects/shared/claude-instructions-sync/{plan,implementation,state}.md`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass
- Run: `pnpm build:docs`
- Result: pass

**Notes / Decisions:**

- Converted both Important findings from `final-review-2026-04-13-v2.md` into Phase 5 fix tasks and completed them in this phase.
- Review cycle count exceeds the normal cap; continued because the user explicitly requested processing this review artifact.
- A clean final re-review is required after Phase 5 completes.

### Task p05-t01: (review) Surface unreadable Claude files during validation

**Status:** completed
**Commit:** f1083d06

**Outcome (required when completed):**

- Changed pointer/copy validation so non-`ENOENT` `CLAUDE.md` read failures produce `content_mismatch` entries instead of disappearing from scan results.
- Added regression coverage for an unreadable Claude file that throws `EACCES` during validation.
- Verified the instruction utility test suite after the scanner fix.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.utils.ts` - records unreadable Claude file errors as explicit validation mismatches
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - adds unreadable-Claude regression coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass

**Notes / Decisions:**

- Kept `ENOENT` mapped to `missing` and only widened the non-`ENOENT` branch so unreadable files remain visible without changing missing-file semantics.

### Task p05-t02: (review) Correct troubleshooting preview guidance

**Status:** completed
**Commit:** 90b46e2b

**Outcome (required when completed):**

- Updated the troubleshooting docs so preview guidance uses `oat instructions sync --dry-run`.
- Clarified that apply and force flows are separate from preview and can be combined with `--strategy` as needed.
- Verified the docs build after the content change.

**Files changed:**

- `apps/oat-docs/docs/reference/troubleshooting.md` - corrected preview/apply guidance for instruction sync troubleshooting

**Verification:**

- Run: `pnpm build:docs`
- Result: pass

**Notes / Decisions:**

- Kept the fix narrowly scoped to the misleading preview instructions so the troubleshooting flow stays consistent with the existing command surface.

---

## Phase 6: Review Fixes From Final Re-Review V3

**Status:** completed
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

- Closed the broken-`AGENTS.md` symlink validation gap and preserved non-default strategy guidance in `validate`.
- A clean final re-review is required after Phase 6 completes.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/instructions.utils.test.ts`
- `packages/cli/src/commands/instructions/validate/validate.ts`
- `packages/cli/src/commands/instructions/validate/validate.test.ts`
- `.oat/projects/shared/claude-instructions-sync/{plan,implementation,state}.md`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/validate/validate.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- Received the independent final review artifact and converted both findings directly into Phase 6 tasks.
- Continuing automatically because the project is still in the implementation phase and no HiLL stop condition was reached.

### Task p06-t01: (review) Reject broken AGENTS symlinks as healthy canonical instructions

**Status:** completed
**Commit:** 9a22b47d

**Outcome (required when completed):**

- Stopped preserving dangling `AGENTS.md` symlinks as canonical scan entries during traversal.
- Added regression coverage for a broken canonical `AGENTS.md` symlink paired with pointer `CLAUDE.md`.
- Verified the instruction utility suite after the scanner change.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.utils.ts` - only preserves broken `CLAUDE.md` symlinks for scan visibility
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - adds a dangling-`AGENTS.md` regression case

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass

**Notes / Decisions:**

- Classified the broken canonical symlink by omission from the canonical scan set, which causes the existing `stray` path to surface the bad state without inventing a new status.

### Task p06-t02: (review) Preserve selected strategy in validate fix guidance

**Status:** completed
**Commit:** ea6e13c3

**Outcome (required when completed):**

- `oat instructions validate` now preserves the selected non-default strategy in its drift fix guidance.
- Added command coverage for strategy-aware repair guidance when validation reports drift.
- Verified the validate command tests plus direct CLI lint/type-check/build after the fix.

**Files changed:**

- `packages/cli/src/commands/instructions/validate/validate.ts` - derives the strategy once and includes it in non-default repair guidance
- `packages/cli/src/commands/instructions/validate/validate.test.ts` - adds drift guidance coverage for `--strategy symlink`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/validate/validate.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass

**Notes / Decisions:**

- Kept default pointer guidance unchanged and only appended `--strategy <value>` for non-default modes, so the plain fix command remains concise for the common case.

---

## Phase 7: Review Fix From Final Re-Review V4

**Status:** completed
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

- Fixed the final remaining review-fix task from `final-review-2026-04-13-v4.md`.
- Dangling canonical `AGENTS.md` symlinks now surface as drift even when no `CLAUDE.md` sibling exists.
- A clean final re-review is required after Phase 7 completes.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/instructions.utils.test.ts`
- `packages/cli/src/commands/instructions/sync/sync.ts`
- `packages/cli/src/commands/instructions/sync/sync.test.ts`
- `.oat/projects/shared/claude-instructions-sync/{plan,implementation,state}.md`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- Received the v4 re-review artifact and converted the remaining Important finding into a single Phase 7 task.
- Continuing automatically because implementation is still active and the finding is a bounded correctness gap.

### Task p07-t01: (review) Surface dangling canonical AGENTS symlinks without sibling Claude files

**Status:** completed
**Commit:** c233b153

**Outcome (required when completed):**

- Scanner state now preserves dangling canonical `AGENTS.md` symlinks as explicit drift entries even without sibling `CLAUDE.md`.
- Sync dry-run/apply now reports unreadable canonical `AGENTS.md` files as manual-repair skips instead of silently doing nothing.
- Verified the utility/sync suites, direct CLI lint/type-check/build, and release validation after the change.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.utils.ts` - records broken canonical `AGENTS.md` symlinks in the scan model
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - adds broken-canonical coverage with and without sibling `CLAUDE.md`
- `packages/cli/src/commands/instructions/sync/sync.ts` - skips unreadable canonical `AGENTS.md` entries with manual-repair guidance
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - adds dry-run coverage for the manual-repair skip path

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- Represented dangling canonical links as `content_mismatch` drift rather than a new status so reporting and JSON payloads remain compatible with the existing command surface.

---

## Phase 8: Review Fix From Final Re-Review V5

**Status:** completed
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

- Fixed the final remaining review-fix task from `final-review-2026-04-13-v5.md`.
- Unreadable Claude-only files now surface as explicit drift instead of adoptable strays.
- A clean final re-review is required after Phase 8 completes.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/instructions.utils.test.ts`
- `packages/cli/src/commands/instructions/sync/sync.ts`
- `packages/cli/src/commands/instructions/sync/sync.test.ts`
- `.oat/projects/shared/claude-instructions-sync/{plan,implementation,state}.md`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- Received the v5 re-review artifact and converted the remaining Medium finding into a single Phase 8 task.
- Continuing automatically because the project is still active and the fix stays within the existing instruction drift model.

### Task p08-t01: (review) Treat unreadable Claude-only files as non-adoptable drift

**Status:** completed
**Commit:** e74164c3

**Outcome (required when completed):**

- Unreadable Claude-only files and broken Claude-only symlinks are now classified as drift instead of adoptable strays.
- Sync dry-run/apply now reports unreadable Claude-only sources as manual-repair skips instead of planning impossible adoption work.
- Verified the utility/sync suites, direct CLI lint/type-check/build, and release validation after the fix.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.utils.ts` - differentiates readable Claude-only adoption candidates from unreadable Claude-only drift
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - adds broken/unreadable Claude-only coverage
- `packages/cli/src/commands/instructions/sync/sync.ts` - skips unreadable Claude-only entries with manual-repair guidance
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - adds dry-run coverage for unreadable Claude-only skip behavior

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- Kept readable Claude-only files on the existing `stray` adoption path and only diverted unreadable cases into `content_mismatch` drift so normal adoption behavior stays unchanged.

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Phase 9: Review Fix From Final Re-Review V6

**Status:** completed
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

- Fixed the final remaining review-fix task from `final-review-2026-04-13-v6.md`.
- Non-`ENOENT` instruction symlink target failures now remain visible as drift instead of silently disappearing.
- A clean final re-review is required after Phase 9 completes.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/instructions.utils.test.ts`
- `packages/cli/src/commands/instructions/sync/sync.ts`
- `packages/cli/src/commands/instructions/sync/sync.test.ts`
- `.oat/projects/shared/claude-instructions-sync/{plan,implementation,state}.md`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- Preserved error-code-specific drift detail so operators can distinguish missing targets from other unreadable symlink target failures.
- Kept sync in manual-repair mode for unreadable instruction sources rather than attempting unsafe automatic repair.

### Task p09-t01: (review) Preserve non-ENOENT instruction symlink target failures as drift

**Status:** completed
**Commit:** 5b91da2c

**Outcome (required when completed):**

- Scan state now preserves non-`ENOENT` target failures for instruction symlinks and reports them as explicit drift.
- Sync dry-run/apply now keeps manual-repair guidance aligned for unreadable instruction source paths.
- Verified the utility/sync suites, direct CLI lint/type-check/build, and release validation after the change.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.utils.ts` - preserves non-`ENOENT` instruction symlink target failures in scan state
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - adds unreadable instruction symlink target coverage
- `packages/cli/src/commands/instructions/sync/sync.ts` - keeps manual-repair guidance aligned for unreadable instruction sources
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - adds sync coverage for unreadable instruction symlink targets

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- Kept the fix additive by preserving existing `ENOENT` handling while extending the same drift path to other target-access failures such as `EACCES`.

---

## Phase 10: Review Fix From Final Re-Review V7

**Status:** completed
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

- Fixed the remaining paired-`CLAUDE.md` symlink gap from `final-review-2026-04-13-v7.md`.
- Paired unreadable `CLAUDE.md` symlink targets now surface as drift instead of validating as healthy under `--strategy symlink`.
- A clean final re-review is required after Phase 10 completes.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/instructions.utils.test.ts`
- `.oat/projects/shared/claude-instructions-sync/{plan,implementation,state}.md`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass

**Notes / Decisions:**

- Kept the fix localized to scan classification so the existing symlink-repair path can still rewrite drifted `CLAUDE.md` files from canonical `AGENTS.md`.

### Task p10-t01: (review) Preserve paired unreadable `CLAUDE.md` symlink targets as drift

**Status:** completed
**Commit:** 6b8cc03e

**Outcome (required when completed):**

- Paired unreadable `CLAUDE.md` symlink targets now short-circuit to explicit drift before normal paired symlink validation runs.
- Added regression coverage for a sibling `AGENTS.md` plus unreadable `CLAUDE.md` symlink target under `--strategy symlink`.
- Verified the focused utility/sync tests plus direct CLI type-check/build after the fix.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.utils.ts` - handles paired unreadable `CLAUDE.md` symlink targets before normal validation
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - adds paired unreadable `CLAUDE.md` symlink regression coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass

**Notes / Decisions:**

- Left sync behavior unchanged because once the state is correctly classified as drift, existing force-repair behavior can already replace the bad symlink from canonical content.

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

**Next:** Phase 5 review fixes are complete. Re-run final code review and process it via `oat-project-review-receive`.

### Review Received: final

**Date:** 2026-04-13
**Review artifact:** `reviews/archived/final-review-2026-04-13-v2.md`
**Review cycle:** 4 of 3

**Findings:**

- Critical: 0
- Important: 2
- Medium: 0
- Minor: 0

**New tasks added:** `p05-t01`, `p05-t02`

**Disposition summary:**

- Converted both Important findings to fix tasks
- Deferred findings: none
- Continued past the nominal review-cycle cap because the user explicitly requested processing this review artifact

**Next:** Phase 5 review fixes are complete. Re-run final code review and process it via `oat-project-review-receive`.

### Review Received: final

**Date:** 2026-04-13
**Review artifact:** `reviews/archived/final-review-2026-04-13-v3.md`
**Review cycle:** 5 of 3

**Findings:**

- Critical: 0
- Important: 1
- Medium: 1
- Minor: 0

**New tasks added:** `p06-t01`, `p06-t02`

**Disposition summary:**

- Converted the Important broken-`AGENTS.md` symlink finding into a fix task
- Converted the Medium strategy-guidance finding into a fix task
- Deferred findings: none
- Continued past the nominal review-cycle cap because implementation is still active and the review surfaced actionable correctness gaps

**Next:** Complete Phase 6 review fixes, then re-run final code review and process it via `oat-project-review-receive`.

### Review Received: final

**Date:** 2026-04-13
**Review artifact:** `reviews/archived/final-review-2026-04-13-v4.md`
**Review cycle:** 6 of 3

**Findings:**

- Critical: 0
- Important: 1
- Medium: 0
- Minor: 0

**New tasks added:** `p07-t01`

**Disposition summary:**

- Converted the dangling-canonical-`AGENTS.md` finding into a single fix task
- Deferred findings: none
- Continued past the nominal review-cycle cap because the review still surfaced an actionable correctness defect

**Next:** Complete Phase 7 review fix, then re-run final code review and process it via `oat-project-review-receive`.

### Review Received: final

**Date:** 2026-04-13
**Review artifact:** `reviews/archived/final-review-2026-04-13-v7.md`
**Review cycle:** 9 of 3

**Findings:**

- Critical: 0
- Important: 1
- Medium: 0
- Minor: 0

**New tasks added:** `p10-t01`

**Disposition summary:**

- Converted the paired unreadable `CLAUDE.md` symlink finding into a single fix task
- Deferred findings: none
- Continued past the nominal review-cycle cap because the review still surfaced an actionable correctness defect

**Next:** Complete Phase 10 review fix, then re-run final code review and process it via `oat-project-review-receive`.

---

## Deviations from Plan

Document any deviations from the original plan.

| Task                     | Planned                                 | Actual                                             | Reason                                                                                                             |
| ------------------------ | --------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| post-plan release policy | No explicit public-package version work | Bumped all public packages to `0.0.23` in lockstep | `packages/cli` changed and repo policy requires synchronized version bumps before `pnpm release:validate` can pass |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Passed | Failed | Coverage |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/validate/validate.test.ts packages/cli/src/commands/help-snapshots.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli type-check`                                                                                                                                   | yes    | 0      | n/a      |
| 2     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.utils.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.integration.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli type-check` | yes    | 0      | n/a      |
| 3     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`; `pnpm --filter @open-agent-toolkit/cli test`; `pnpm build:docs`                                                                                                                                                                                                                                                                       | yes    | 0      | n/a      |
| 4     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`                                                                                                                                                                                                                                    | yes    | 0      | n/a      |
| final | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts packages/cli/src/commands/instructions/sync/sync.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli type-check`; `pnpm --filter @open-agent-toolkit/cli build`; `pnpm release:validate`                                                                                                           | yes    | 0      | n/a      |

## Final Summary (for PR/docs)

**What shipped:**

- Instruction scan state, command contract work, strategy-aware `CLAUDE.md` repair behavior, Claude-only stray adoption, nested coverage, user-facing docs, and final review-fix hardening

**Behavioral changes (user-facing):**

- `oat instructions validate` and `oat instructions sync` now expose a `--strategy` flag with `pointer`, `symlink`, and `copy`
- `oat instructions sync` now creates or repairs `CLAUDE.md` as a pointer file, file symlink, or hard copy based on the selected strategy
- `oat instructions sync` now adopts Claude-only stray files into canonical `AGENTS.md` content before regenerating Claude
- Nested project trees are now covered end to end, including excluded directories and mixed valid/drifted/adoptable states
- Public package metadata for the shipped CLI/docs packages was bumped in lockstep to `0.0.23` to satisfy release policy

**Key files / modules:**

- `packages/cli/src/commands/instructions/*` - planned implementation surface
- `apps/oat-docs/docs/provider-sync/*` - planned docs updates

**Verification performed:**

- Phase 1 through Phase 4 targeted verification passed, including the full CLI package test suite and docs build earlier in the implementation
- Final repo verification passed: `pnpm lint`, `pnpm type-check`, `pnpm build`, `pnpm test`, and `pnpm release:validate`
- Final review receive bookkeeping completed, all Phase 4 review-fix tasks were implemented, and the project is ready for final re-review

**Design deltas (if any):**

- No design artifact created; quick workflow went straight from discovery to plan

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
