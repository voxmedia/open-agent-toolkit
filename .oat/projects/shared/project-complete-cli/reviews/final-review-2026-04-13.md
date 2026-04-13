---
oat_generated: true
oat_generated_at: 2026-04-13
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/project-complete-cli
---

# Code Review: final (project-complete-cli)

**Reviewed:** 2026-04-13
**Scope:** final code review (all 5 feature tasks: p01-t01, p01-t02, p02-t01, p02-t02, p03-t01)
**Files reviewed:** 8 source/test files + 1 skill + 1 backlog note (tracking artifacts excluded from code review)
**Commits:** `1b38852b..HEAD` (5 feature commits + 11 bookkeeping commits)
**Workflow mode:** quick
**Artifacts used:** `discovery.md`, `plan.md`, `implementation.md`, `state.md`, `.agents/skills/oat-project-complete/SKILL.md`

## Summary

The project delivers on its narrow Discovery scope cleanly. A pure `renderCompletedProjectState()` mutator now owns the canonical `state.md` completion contract, a thin `oat project complete-state` CLI command exposes it for shell callers, and `oat-project-complete` Step 5 delegates to that command — replacing the prior inline `sed`/`awk` lifecycle block. Tests cover baseline, archived, lifecycle-upsert, and progress-normalization behaviors, plus command-level error paths, plus a skill-contract guard against regression. Focused verification passes locally (`27/27` tests across the four targeted suites). No Critical or Important findings; a handful of Minor polish observations are captured below.

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **Non-`CliError` throws from the mutator fall through to exit code 1 with generic plumbing** (`packages/cli/src/commands/project/complete-state/index.ts:89-97`)
  - Issue: `renderCompletedProjectState()` throws plain `Error` for invariants like `state.md is missing frontmatter` and `Failed to set oat_lifecycle: complete`. The command's catch block only honors `CliError.exitCode`; other errors default to `1`. That is acceptable, but the message surfaces as an uncategorized error even though it is a well-understood user-facing invariant.
  - Suggestion: Consider wrapping the pure mutator's invariant failures as `CliError` at the command boundary (or converting them inside the mutator) so exit semantics stay explicit: 0 success, 1 user/actionable, 2 system/runtime. Not blocking — current behavior is correct, just slightly less self-documenting.

- **`findSectionBounds` silently skips a section if the `## Heading` line is not followed by a blank line** (`packages/cli/src/commands/project/complete-state/state-utils.ts:24-41`)
  - Issue: The marker is `\`## ${heading}\\n\\n\``. A `state.md` written with a single newline between heading and body would be skipped silently, leaving the old body intact on disk while the CLI reports success.
  - Fix: The OAT `state.md` template (`.oat/templates/state.md`) always uses the blank-line pattern, so this is defensive only. Consider (a) relaxing the marker to `\`## ${heading}\\n\``and deriving`bodyStart` after optional leading whitespace, or (b) emitting a warning when a known-required section (`Current Phase`, `Progress`, `Next Milestone`) is missing so silent no-ops become visible. Not blocking — low likelihood in practice.

- **`getFrontmatterField` sanity-check reads `nextBlock` (the updated frontmatter) rather than the on-disk state** (`packages/cli/src/commands/project/complete-state/state-utils.ts:141-144`)
  - Issue: The guard `if (currentLifecycle !== 'complete') throw ...` reads from the in-memory `nextBlock` we just upserted, so it can only fire if `upsertFrontmatterField` itself misbehaves on the string level. It will not catch scenarios like the value being double-quoted or containing a trailing comment that `getFrontmatterField` strips.
  - Suggestion: Either drop the guard (the upsert is deterministic) or re-derive it from `nextContent` after `replaceFrontmatter` so it actually validates the rendered output. Not blocking.

- **Command tests mutate shared `process.exitCode`** (`packages/cli/src/commands/project/complete-state/index.test.ts:107-120`)
  - Issue: `beforeEach` saves and `afterEach` restores `process.exitCode`, which is fine, but since the command sets `process.exitCode` globally, parallel suites that share the process (unlikely under vitest's isolate default, possible under `--no-isolate`) could observe cross-test leakage.
  - Suggestion: Long-term, prefer returning an exit result from the command for testability. Current pattern matches `set-mode` and `pause`, so consistency trumps — not blocking.

- **`--archived` flag is silently passed for non-shared projects if the skill env ever drifts** (`.agents/skills/oat-project-complete/SKILL.md:261-265`)
  - Issue: The skill gates `--archived` on both `SHOULD_ARCHIVE=true` AND `IS_SHARED_PROJECT=true`. The CLI, however, accepts `--archived` for any project path. That's fine today, but if a future caller passes `--archived` for a non-shared project, the `## Current Phase` will read `Lifecycle complete; archived locally` even if no archive occurred.
  - Suggestion: Not a problem inside this project — the skill correctly gates on shared status. Consider documenting the flag as "caller asserts the project will be archived locally" in the command description for future readers. Not blocking.

- **Skill-contract regression test uses substring `not.toContain` to assert the old `sed` block is gone** (`packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:90-93`)
  - Issue: The assertion `expect(content).not.toContain('sed \'s/^oat_lifecycle:.*/oat_lifecycle: complete/\' "$STATE_FILE" > "$STATE_FILE.tmp"')` pins one exact shell line. A future rewrite that reintroduces a semantically equivalent but differently-worded `sed`/`awk` mutation would pass the test.
  - Suggestion: Strengthen by asserting the skill does not contain `sed` / `awk` inside the Step 5 block at all, or check for the presence of the delegation line while asserting only one Step 5 block exists. Not blocking — the delegation line assertion (lines 84-87) already locks in the positive contract.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` (quick-mode primary source), `plan.md` (task sequencing), `implementation.md` (verification claims), `.agents/skills/oat-project-complete/SKILL.md` (delegation end state).

### Requirements Coverage (from Discovery Success Criteria)

| Requirement                                                                               | Status      | Notes                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI-owned helper updates completion state in canonical shape (frontmatter + body)         | implemented | `state-utils.ts:renderCompletedProjectState()` sets `oat_lifecycle: complete`, `oat_project_completed`, `oat_project_state_updated`, `**Status:** Complete`, `**Last Updated:**`, and rewrites the three canonical body sections. |
| `oat-project-complete` delegates state mutation to the CLI instead of hardcoding contract | implemented | `.agents/skills/oat-project-complete/SKILL.md` Step 5 now invokes `oat project complete-state` with positional project path and optional `--archived`. No inline `sed`/`awk` lifecycle mutation remains.                          |
| Focused tests cover completion-state format and guard against drift                       | implemented | `state-utils.test.ts` (4 cases), `index.test.ts` (4 cases), `review-skill-contracts.test.ts` (delegates-to-CLI case). Plus `help-snapshots.test.ts` pins the new command surface in inline snapshots.                             |

### Constraints Verification

- Archive/S3/summary side effects: **respected.** `archive-utils.ts` was not touched. SKILL.md Step 8 still references the canonical archive-utils behavior.
- Scope not expanded into `bl-fb3f` or `bl-af93`: **respected.** No config-unset or autonomous-follow-through work present in the diff.
- Skill delegates to CLI at end state: **verified** (`.agents/skills/oat-project-complete/SKILL.md` lines 255-269).

### Out-of-Scope Verification

- Backlog status cleanup: the backlog-item note change is a narrow documentation update recording the landed command/helper shape, not a status/bookkeeping rework. In scope as described by Phase 3.
- `bl-af93` (config-unset): not touched.
- `bl-fb3f` (autonomous follow-through): not touched.
- Archive/S3 rework: not touched.

### Extra Work (not in declared requirements)

None material. The backlog-note `updated` timestamp refresh and the appended helper-shape paragraph are within the Phase 3 artifact-alignment task scope described in `plan.md`.

## Code Quality Notes

- **Command implementation is thin and consistent with the package's conventions.** Dependency-injection shape (`DEFAULT_DEPENDENCIES` + `overrides`), `buildCommandContext`, and `readGlobalOptions` all match `set-mode/index.ts`. Good.
- **Import policy compliance.** The CLI files use `@commands/...` and `@fs/...` aliases (no parent-relative or `src/...` imports). Matches `packages/cli/AGENTS.md`.
- **Test scaffolding is clear.** `buildStateInput` and `buildStateContent` produce representative state.md fixtures that match `.oat/templates/state.md`. Temp-dir cleanup is correct.
- **Help snapshot is pinned.** New `complete-state` entry appears in both `project --help` and `project complete-state --help` inline snapshots, so any future signature drift is caught.
- **Section rewrite strategy.** The index-based slicing choice over regex (as noted in `implementation.md`) is sound: it avoids greedy-match leakage between adjacent headings. The tradeoff is the silent no-op when the marker doesn't match (see Minor finding above).
- **YAML value quoting.** Timestamp fields are rendered as `"...ISO string..."` while `oat_lifecycle: complete` is unquoted — matches the existing `state.md` style in the repo (checked against `.oat/templates/state.md` and `.oat/projects/shared/project-complete-cli/state.md`).
- **No destructive filesystem operations.** The command reads and writes a single `state.md`; no recursive mutations, no filesystem renames.
- **Exit semantics.** Command returns 0 on success and 1 for the two user-actionable errors (missing project, missing state.md). Consistent with CLI conventions.
- **No `console.*` calls.** Output routes through `context.logger`.

## Deferred Findings Disposition

This is the first code review for this project. The pre-review ledger was empty (0 Medium, 0 Minor carry-forward). No new deferrals are being created by this review. Ledger disposition: **empty → closed**.

## Verification Commands Run

Executed locally from `/Users/thomas.stang/.codex/worktrees/5b27/open-agent-toolkit`:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/complete-state/index.test.ts \
  src/commands/project/complete-state/state-utils.test.ts \
  src/commands/cleanup/project/project.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts
```

Result: **PASS** — 4 test files, 27 tests, all green (review-skill-contracts: 6, state-utils: 4, complete-state index: 4, cleanup/project: 13).

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts
```

Result: **FAIL** — reproduces the pre-existing `@open-agent-toolkit/control-plane` package-resolution error in `packages/cli/src/commands/project/list.ts:14` (Vite import-analysis). This project did not touch `project/list.ts` or `project/status.ts`; the failure matches what `implementation.md` declares as pre-existing. **Not a regression introduced by this scope.**

```bash
pnpm --filter @open-agent-toolkit/cli lint
```

Result: **PASS** — 0 warnings, 0 errors across 363 files.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert this review into plan tasks (expected: no-op for Critical/Important, optional small polish tasks for the Minor items if the team wants to address them before merge).
