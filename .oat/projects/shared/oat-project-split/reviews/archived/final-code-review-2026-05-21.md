---
oat_generated: true
oat_generated_at: 2026-05-21
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/oat-project-split
---

# Code Review: final

**Reviewed:** 2026-05-21
**Scope:** Final code review for completed project `.oat/projects/shared/oat-project-split`, all implementation phases p01-p05 at `db1de3fa`
**Files reviewed:** 156 changed files in `471e74b1ba2826ff2714bbb2468effd82bbc4d08..db1de3fa`, with focused inspection of split CLI/helpers, state validation, discover/brainstorm hooks, list/status/dashboard handling, dogfood artifacts, skill versions, and public package versions
**Commits:** 62 commits (`471e74b1ba2826ff2714bbb2468effd82bbc4d08..db1de3fa`)

## Summary

The final implementation ships the core split flow: a standalone `oat-project-split` skill, `oat project split` CLI orchestration, coordination-parent/child artifact writes, detected active-parent conversion, child quick routing, resume support, list/status/dashboard handling, dogfood evidence, and the required skill/package version bumps. Targeted verification passed during this review.

Verdict: **Fail for merge readiness** until the Important findings below are addressed. The remaining issues are not happy-path breakages, but they are design/plan acceptance gaps in validation and hook test coverage.

## Findings

### Critical

None

### Important

- **Coordination-parent state validation omits required design invariants** (`packages/cli/src/validation/project-state.ts:290`)
  - Issue: The design says `oat_children` must be non-empty whenever `oat_phase: decomposition`, and a coordination project must not contain `spec.md`, `design.md`, `plan.md`, or `implementation.md`. The shared state validator currently only enforces `decomposition` requires `oat_kind: coordination`; it never rejects decomposition parents with empty/missing `oat_children`, and the filesystem-aware validator does not check executable artifact absence. The split writer removes those files in the main path, but lifecycle validation will not catch drift or manual/project-state mutations that violate the coordination-parent model.
  - Fix: Extend `validateProjectState` to reject `oat_phase: decomposition` with empty `oat_children`. Extend `assertValidProjectStateFilesystemContent` or a dedicated filesystem invariant helper to reject coordination projects containing executable phase files, and call it at relevant coordination-parent write/transition boundaries. Add regression tests in `project-state.test.ts` and a write-boundary test for a drifted coordination parent.
  - Requirement: Design Model 1 validation rules; p01-t01/p02-t02

- **Hook tests still do not exercise the planned transcript/AskUserQuestion flow** (`packages/cli/src/__tests__/skills/discover-detection.test.ts:20`)
  - Issue: The p04 plan asks for maintained skill-simulation tests that feed transcripts through split detection with stubbed AskUserQuestion responses and assert resulting `SplitPayload`s. The current tests use local helper functions and SKILL.md string assertions; they cover wording and some normalization, but they do not execute a transcript fixture, user-choice branch, or real prompt-response harness for discover convergence, declared brainstorm, or brainstorm-picker selection.
  - Fix: Add fixture-driven tests for discover high/soft/below transcripts, non-interactive mid-stream and convergence cases, declared brainstorm handoff, and brainstorm-picker selection with stubbed user responses. Assert the final payload origin, child list, and handoff target rather than only checking helper outcomes and skill prose.
  - Requirement: p04-t04

### Minor

- **Duplicate fired signals can falsely cross the split threshold** (`packages/cli/src/projects/split/signals.ts:18`)
  - Issue: `evaluateSignals` counts raw array length, and `evaluate-signals` preserves duplicate CLI inputs. `--fired independently-shippable,independently-shippable` returns `triggered: true` and `confidence: "high"` even though only one unique signal fired.
  - Suggestion: Dedupe fired signals before evaluation or reject duplicate signals in the CLI parser. Add unit and CLI tests for duplicate input.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `dogfood/declared.md`, `dogfood/detected.md`, `dogfood/resume.md`, latest phase reviews `p01-v3`, `p02-v3`, `p03`, `p04-v2`, `p05-v4`, and commit range `471e74b1ba2826ff2714bbb2468effd82bbc4d08..db1de3fa`. This is a quick-mode project; `spec.md` is not present and is optional for quick mode.

### Requirements Coverage

| Requirement | Status                         | Notes                                                                                                                                                                                                                               |
| ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01-t01     | partial                        | `oat_kind` and `decomposition` are recognized and core cross-field validation exists, but required coordination-parent invariants for non-empty `oat_children` and executable artifact absence are not enforced.                    |
| p01-t02     | implemented                    | Parent/sibling/dependency fields and inherited-context revalidation gate are implemented and covered by targeted tests.                                                                                                             |
| p01-t03     | implemented                    | Signal evaluator exists; duplicate-input edge remains Minor.                                                                                                                                                                        |
| p01-t04     | implemented                    | `SplitPayload`, `ChildPlan`, and `SplitPlanDocument` normalization are present.                                                                                                                                                     |
| p01-t05     | implemented                    | Child-plan slug collision and DAG validation are present.                                                                                                                                                                           |
| p01-t06     | implemented                    | `evaluate-signals` and `validate-plan` subcommands are registered.                                                                                                                                                                  |
| p02-t01     | implemented                    | New `oat-project-split` skill exists and is included in provider/bundled skill surfaces.                                                                                                                                            |
| p02-t02     | partial                        | Main-path coordination parent writer removes executable artifacts and persists `references/split-plan.json`; shared validation does not enforce the no-executable-artifact invariant after drift.                                   |
| p02-t03     | implemented                    | Child seeding writes quick child state, parent/sibling/dependency links, seven sections, and `oat_inherited_context_revalidated: false`.                                                                                            |
| p02-t04     | implemented                    | Finalization marks parent terminal and activates the initial child by repo-relative project path.                                                                                                                                   |
| p02-t05     | implemented                    | Resume reads persisted split-plan data and requires confirmation before writes.                                                                                                                                                     |
| p02-t06     | implemented with residual risk | Integration coverage exists for core split flows, non-interactive behavior, resume, detected/brainstorm origin persistence, and mutation validation; earlier broader matrix concern is mostly covered by p04/p05 tests and dogfood. |
| p02-t07     | implemented                    | `oat project split run` orchestrates validation, parent write, child seeding, finalization, resume, detected fail-fast, and active detected-parent conversion.                                                                      |
| p03-t01     | implemented                    | Default list hides terminal coordination parents; `--include-coordination` reveals them.                                                                                                                                            |
| p03-t02     | implemented                    | Dashboard renders terminal coordination parents under `## Decompositions`.                                                                                                                                                          |
| p03-t03     | implemented                    | List/dashboard end-to-end coverage exists.                                                                                                                                                                                          |
| p04-t01     | implemented                    | Discover hook includes signal evaluation, high/soft/below guidance, convergence prompt, pnpm fallback, and non-interactive fail-fast prose.                                                                                         |
| p04-t02     | implemented                    | Brainstorm declared-mode branch and boundary question are documented.                                                                                                                                                               |
| p04-t03     | implemented                    | Brainstorm picker conditionally offers `Promote to N projects`.                                                                                                                                                                     |
| p04-t04     | partial                        | Tests pass but do not meet the planned transcript/AskUserQuestion fixture depth.                                                                                                                                                    |
| p05-t01     | implemented                    | `bl-3a4a` backlog item is reconciled to the settled split design.                                                                                                                                                                   |
| p05-t02     | implemented                    | Declared dogfood evidence is present.                                                                                                                                                                                               |
| p05-t03     | implemented                    | Detected mid-stream and convergence dogfood evidence is present, including active-parent conversion.                                                                                                                                |
| p05-t04     | implemented                    | Resume dogfood evidence is present.                                                                                                                                                                                                 |
| p05-t05     | implemented                    | Touched skills are versioned and five public packages are bumped to `0.0.71`.                                                                                                                                                       |

### Extra Work (not in declared requirements)

No significant scope creep found. The quick-start skill change is related to split-child quick routing through the new discovery-completion validation boundary.

## Verification Commands

Run these to verify the implementation and the findings:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/project-state.test.ts src/commands/project/split/__tests__/run.test.ts src/commands/project/list.test.ts src/commands/project/status.test.ts src/__tests__/skills/discover-detection.test.ts src/__tests__/skills/brainstorm-handoff.test.ts
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts project split evaluate-signals --fired independently-shippable,independently-shippable --json
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts project status --project-path .oat/projects/shared/live-dogfood-convergence-workflow-friction --json
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts project list --include-coordination
pnpm release:validate
```

Observed during this review:

```text
Targeted vitest command: passed, 6 files / 57 tests.
Duplicate signal command: returned triggered=true, confidence="high" for one unique signal duplicated.
Convergence dogfood status: phase "decomposition", phaseStatus "complete", recommendation.skill "none".
project list --include-coordination: terminal coordination parents shown as "decomposition (complete)" with recommendation "none".
Version spot-check: skills bumped; five public packages at 0.0.71.
```

Recent final verification already reported passed before this review: `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`, and `pnpm release:validate`.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
