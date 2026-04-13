---
oat_generated: true
oat_generated_at: 2026-04-13
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/project-complete-cli
---

# Artifact Review: plan

**Reviewed:** 2026-04-13
**Scope:** plan.md (quick workflow mode)
**Files reviewed:** 1 (`plan.md`), with `discovery.md` and `state.md` consulted as upstream context
**Commits:** N/A (artifact review)

## Summary

The plan is concise, well-structured, and stays disciplined within the `bl-0ace` scope (CLI-owned `state.md` completion-state mutation and skill delegation). Phases map cleanly to discovery's Success Criteria and Key Decisions, and TDD cycles (RED/GREEN/Refactor/Verify/Commit) are present for every task. However, there are a handful of readiness gaps that will slow an implementer or leak ambiguity — notably an inverted test/implementation order in Phase 1, inconsistent path conventions across tasks, a conditional task in Phase 3 that is not fully implementer-ready, and a Reviews table that still carries unused `spec`/`design` rows in a quick-mode project. HiLL checkpoint configuration is also still in a half-confirmed state.

## Findings

### Critical

None

### Important

- **Inverted file creation order in Phase 1 (TDD cycle does not match declared files)** (`plan.md:39-78`)
  - Issue: `p01-t01` says "Create: `state-utils.test.ts`" and the Step 5 commit adds both `state-utils.ts` and `state-utils.test.ts`. But `state-utils.ts` is declared as a "Create" file in `p01-t02` (`plan.md:86`). The RED step in `p01-t01` requires the test to fail because the module does not yet exist, yet Step 2 GREEN asks the implementer to "Create a pure completion-state mutation utility" — which contradicts `p01-t02` owning that file's creation. As written, an implementer either (a) creates `state-utils.ts` in `p01-t01` (making `p01-t02`'s "Create" stale), or (b) has no implementation module for GREEN to pass against.
  - Fix: Either (1) scope `p01-t01` to test-only (leave GREEN to `p01-t02` and accept that `p01-t01` commits a skipped/xfail test referencing the not-yet-existent module), or (2) merge the two tasks, or (3) move `state-utils.ts` from `p01-t02`'s "Create" list into `p01-t01`'s "Create" list and reframe `p01-t02` as pure edge-case expansion. Option 3 is simplest and keeps the commit in `p01-t01`'s Step 5 honest.
  - Requirement: Success Criteria bullets 1 and 3 (CLI-owned helper + focused tests)

- **Phase 3 task is implementer-ambiguous ("only if" conditions without a decision rule)** (`plan.md:207-242`)
  - Issue: `p03-t01` has all three of its file modifications gated by "only if" conditions ("only if the new command is user-facing", "only if a small implementation note update is warranted"). The Step 1 RED guidance says "Test fails only if the command surface changed help output." Without a clear decision rule, an implementer cannot tell whether this task has real work, a skip, or a no-op commit. There is no guidance on what to do when none of the conditions trigger (is the task skipped? does it still produce a commit?).
  - Fix: Resolve the "internal-only vs narrow public subcommand" Open Question (`discovery.md:114`) before implementation so `p03-t01` becomes deterministic. Alternatively, restate `p03-t01` as two conditional sub-tasks with explicit "if public → do X; if internal → skip commit and record in implementation.md" rules. Minimum bar: specify what the empty-condition commit looks like, or declare the task skippable with no commit.
  - Requirement: Readiness for `oat-project-implement`

- **Open Questions from discovery are not explicitly deferred or resolved** (`discovery.md:112-115` vs `plan.md:28-31`)
  - Issue: Discovery leaves two Open Questions open: (a) internal-only vs narrow project subcommand, and (b) whether `cleanup/project/project.utils.ts` should reuse the new mutator directly. The plan implicitly answers (a) by using `packages/cli/src/commands/project/complete-state/index.ts` (suggesting a project subcommand) and (b) by marking the modify of `project.utils.ts` as optional "only if direct reuse is natural". Neither answer is stated in plan prose, which means an implementer has to infer intent.
  - Fix: Add a short "Decisions carried forward from discovery" subsection near the top of the plan (before Phase 1) that states explicitly: "Command surface: narrow project subcommand at `oat project complete-state` (decision for Open Question 1)" and "Reuse of `cleanup/project/project.utils.ts`: contract-aligned via tests; direct reuse only if clearly reduces duplication (decision for Open Question 2)." This closes the loop between discovery and plan and removes inference.
  - Requirement: Discovery → Plan traceability

- **Planning Checklist: HiLL checkpoints not confirmed** (`plan.md:28-31`)
  - Issue: "Confirmed HiLL checkpoints with user" is unchecked and `oat_plan_hill_phases: []` is set in the plan frontmatter (which means "every phase pauses") — but `state.md:10` shows `oat_hill_checkpoints: []` and `oat_hill_completed: []`. The two files disagree on meaning (plan frontmatter comment says empty = pause every phase; state implies no checkpoints configured). An implementer running `oat-project-implement` will either pause at every phase (surprising for a 3-phase narrow project) or skip pauses entirely, depending on which file wins.
  - Fix: Confirm HiLL with the user and check the box. If no checkpoints are desired, either (a) document "empty means no pauses" semantics explicitly in both files, or (b) set `oat_plan_hill_phases` to an explicit sentinel understood by the implementer skill. Align `state.md` and `plan.md` so both reflect the same intent before implementation starts.
  - Requirement: Execution Continuation guardrail + readiness

- **Reviews table still carries `spec` and `design` rows despite quick mode** (`plan.md:252-259`)
  - Issue: The Reviews table includes `| spec | artifact | pending |` and `| design | artifact | pending |` rows. The project is quick mode with `oat_workflow_mode: quick` and no spec/design artifacts — these rows will never be satisfied and will remain `pending` forever, contaminating final-review gating. The plan template comment (`plan.md:250`) also says "do not delete `spec`/`design`", which is incorrect guidance for quick mode.
  - Fix: Remove the `spec` and `design` rows (or mark them `N/A` with a note) for this quick-mode project. Consider also adding an `artifact / plan` row to cover this very review. The "do not delete spec/design" comment should be softened to "do not delete in spec-driven mode" or removed entirely for this project.
  - Requirement: Review-gating correctness

### Medium

- **Ambiguity about what tests in p01-t02 add vs. p01-t01 already covers** (`plan.md:91-115`)
  - Issue: `p01-t01` Step 1 already lists four canonical contract bullets (frontmatter, timestamps, status, body sections). `p01-t02` Step 1 lists three more "edge cases" (lifecycle field updated not duplicated, progress bullet added once, archived vs non-archived text). There is meaningful overlap risk (the archived/non-archived body text is arguably in-scope for `p01-t01`). An implementer who writes a thorough RED in `p01-t01` may find nothing to add in `p01-t02`.
  - Fix: Either (a) explicitly carve the contract into "mandatory for p01-t01 RED" vs "edge cases for p01-t02 RED" lists, or (b) collapse the tests into a single task and let p01-t02 only cover implementation edge cases discovered during GREEN.

- **Commit type `refactor(p02-t02)` may be misleading** (`plan.md:200`)
  - Issue: The p02-t02 commit message uses `refactor(p02-t02): delegate project completion state to cli`. However, this task changes the skill's observable contract (skill delegates to CLI instead of mutating `state.md` inline) and likely updates `review-skill-contracts.test.ts`. That is closer to a behavior change / `feat` than a `refactor` by conventional-commits semantics.
  - Fix: Use `feat(p02-t02)` or `chore(p02-t02)` (since it is a skill text update) rather than `refactor`. Matches the commit convention declared at `plan.md:26`.

- **Verify step in p01-t01 does not run the new test suite** (`plan.md:68-72`)
  - Issue: `p01-t01` Step 4 Verify runs only `pnpm --filter @open-agent-toolkit/cli type-check`. It does not re-run the test suite added in Step 1/2, so regressions in the test file after refactor in Step 3 would not be caught before commit.
  - Fix: Add the test command to the Verify step (or run both tests and type-check): `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/state-utils.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`.

- **No task updates `help-snapshots.test.ts` registration concern** (`plan.md:128-162`)
  - Issue: `p02-t01` creates a new command and modifies `packages/cli/src/commands/project/index.ts`. If the command is registered publicly (which the file path and the existing pattern at `packages/cli/src/commands/project/index.ts` suggest — see `createProjectCommand` in that file which uses `addCommand` for each subcommand), the help snapshot will change. `p03-t01` treats help-snapshot updates as conditional ("only if the new command is user-facing"), but given the plan's current file layout it will almost certainly be user-facing. Making the help-snapshot update conditional in `p03-t01` rather than required in `p02-t01` could lead to a broken CI commit between the two tasks.
  - Fix: Either (a) make the help-snapshot update a required sub-step of `p02-t01` (same commit that wires the command), or (b) state explicitly in `p02-t01` that the help snapshot must pass before commit, referencing the Verify command.

### Minor

- **File-path convention inconsistency for new module** (`plan.md:40, 86, 126`)
  - Issue: The new module path `packages/cli/src/commands/project/complete-state/` is a reasonable placement, but the sibling `packages/cli/src/commands/cleanup/project/project.utils.ts` is the cited reuse target. Consider whether `complete-state` ownership should actually live under `packages/cli/src/commands/project/` (command) with a helpers module under `packages/cli/src/engine/` or similar, per the CLI AGENTS guidance ("push logic into `engine/`, `manifest/`, `drift/`, and provider modules").
  - Suggestion: Confirm with the design convention in `docs/oat/cli/design-principles.md` whether the helper belongs under `engine/` (thin command, logic in engine) or is fine colocated with the command. This is a Medium-at-most design call, not a correctness bug.

- **`implementation.md` Phase 1 task name placeholder** (`implementation.md:61`)
  - Issue: `### Task p01-t01: {Task Name}` still has `{Task Name}` placeholder; `p01-t02` has its real name. Minor cosmetic drift between plan and implementation tracker.
  - Suggestion: Replace `{Task Name}` with "Codify the canonical completed `state.md` contract in tests" to match `plan.md:37`.

- **"Reviews" template comment is slightly contradictory** (`plan.md:250-251`)
  - Issue: "Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`" — in a quick-mode plan, this instruction runs counter to Important finding above.
  - Suggestion: Adjust the inline comment to be mode-aware, or trust the review-receive skill to normalize.

- **Plan References section points to artifacts that do not exist** (`plan.md:287-292`)
  - Issue: `References` lists `design.md` and `spec.md` even though the project is quick mode and neither file exists. This is a template artifact.
  - Suggestion: Either remove those lines or annotate them with "(not generated in quick mode)".

## Requirements/Design Alignment

**Evidence sources used:**

- `discovery.md` (quick-mode primary requirements source)
- `plan.md` (artifact under review)
- `state.md` (phase/status context)
- `.oat/repo/reference/backlog/items/project-complete-cli-helper.md` (backlog `bl-0ace` acceptance criteria)
- `.agents/skills/oat-project-complete/SKILL.md` Step 5 (current skill-owned mutation contract)
- `packages/cli/src/commands/project/index.ts` and `packages/cli/src/commands/cleanup/project/project.utils.ts` (existing related code surfaces)

### Success Criteria Coverage

| Success Criterion (discovery.md:95-98)                                                            | Status                | Notes                                                                                                  |
| ------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| CLI-owned helper/command updates project completion state in canonical shape (frontmatter + body) | implemented (in plan) | Phase 1 (`p01-t01`, `p01-t02`) + Phase 2 (`p02-t01`) cover this. Ordering issue flagged above.         |
| `oat-project-complete` delegates state mutation to CLI                                            | implemented (in plan) | `p02-t02` owns this. Commit type concern flagged.                                                      |
| Focused tests cover completion-state format and guard against drift                               | implemented (in plan) | `p01-t01`, `p01-t02`, and `p02-t01` all add tests; `p02-t02` updates `review-skill-contracts.test.ts`. |

### Constraints Respected

| Constraint (discovery.md:89-92)                                 | Status    | Notes                                                                                |
| --------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| Preserve PR #12 archive behavior                                | respected | Plan explicitly keeps archive/S3/summary in `archive-utils`; no archive-layer tasks. |
| No expansion into `bl-fb3f` lifecycle or `bl-af93` config-unset | respected | No lifecycle or config-unset tasks.                                                  |
| Skill must delegate to CLI path in end state                    | respected | `p02-t02` is the delegation task.                                                    |

### Out-of-Scope Respected

| Out of Scope (discovery.md:100-105)             | Status    | Notes                                                                      |
| ----------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| Backlog status cleanup for `bl-0ace`            | respected | No backlog status mutations in plan.                                       |
| `bl-af93` config-unset                          | respected | Not referenced.                                                            |
| `bl-fb3f` lifecycle/PR-ordering policy          | respected | Not referenced.                                                            |
| Reworking archive/S3 already in `archive-utils` | respected | No archive-utils task. `p03-t01` modifies backlog note only conditionally. |

### Open Questions Resolved?

| Open Question (discovery.md:113-115)                       | Status                                                                                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Internal-only vs narrow project subcommand                 | implicitly answered (narrow project subcommand) but not stated in plan prose                                                           |
| `cleanup/project/project.utils.ts` reuse vs test alignment | implicitly answered (test alignment first, reuse only if natural) but stated only via `plan.md:87` "(only if direct reuse is natural)" |

### Extra Work (not in declared requirements)

None identified. Plan stays tight within the `bl-0ace` scope.

## Structural Concerns

- **HiLL checkpoints:** unchecked in Planning Checklist; `oat_plan_hill_phases: []` set. Needs user confirmation before `oat-project-implement` starts (see Important finding).
- **Reviews table:** contains `spec`/`design` rows that will never resolve in quick mode (see Important finding). Consider adding an `artifact/plan` row for this current review once `oat-project-review-receive` runs.
- **Commit conventions:** Consistent `{type}({scope}): {description}` format used throughout; one misclassification at `p02-t02` (see Medium finding). Types used: `feat`, `refactor`, `chore`.
- **RED/GREEN/Refactor/Verify/Commit cycle:** all five tasks have the full cycle; `p01-t01` Verify is slightly thin (see Medium finding).
- **Planning Checklist state:** only 1 of 2 boxes checked.
- **Deferred Findings Ledger:** N/A for non-final scope — confirmed not required.

## Verification Commands

Because this is an artifact review, the primary verification is re-reading the plan against discovery. To confirm the structural findings above, run:

```bash
grep -n "^| spec\|^| design" /Users/thomas.stang/.codex/worktrees/5b27/open-agent-toolkit/.oat/projects/shared/project-complete-cli/plan.md
grep -n "state-utils.ts\|state-utils.test.ts" /Users/thomas.stang/.codex/worktrees/5b27/open-agent-toolkit/.oat/projects/shared/project-complete-cli/plan.md
grep -n "oat_plan_hill_phases\|oat_hill_checkpoints" /Users/thomas.stang/.codex/worktrees/5b27/open-agent-toolkit/.oat/projects/shared/project-complete-cli/plan.md /Users/thomas.stang/.codex/worktrees/5b27/open-agent-toolkit/.oat/projects/shared/project-complete-cli/state.md
```

Once plan edits land, re-run the review to confirm Important findings are closed.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
