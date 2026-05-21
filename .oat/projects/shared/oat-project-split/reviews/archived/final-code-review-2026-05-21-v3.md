---
oat_generated: true
oat_generated_at: 2026-05-21
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/oat-project-split
---

# Code Review: final (independent re-evaluation)

**Reviewed:** 2026-05-21
**Scope:** Final independent code review of `.oat/projects/shared/oat-project-split` over commit range `471e74b1..HEAD` (71 commits, 159 changed files)
**Files reviewed:** 159 changed files; focused inspection of split CLI/orchestration, helper modules, state validation, integration hooks in discover/brainstorm, list/dashboard, dogfood evidence, and skill/package versions
**Commits:** `471e74b1..HEAD` (HEAD `0562549c`)

## Summary

The project ships the standalone `oat-project-split` skill, the supporting `oat project split` CLI surface (`evaluate-signals`, `validate-plan`, `run`), the coordination-parent / child-seeder / finalize / resume helpers, the listing and dashboard changes, and the integration hooks in `oat-project-discover` and `oat-brainstorm`. Coordination-parent file invariants are enforced at both the state validator and the filesystem boundary, three trigger surfaces are wired, the durable `references/split-plan.json` is persisted, repo-relative active-project activation works, and the lockstep public package versions plus all three touched OAT skills are bumped.

Independent verification reproduces the earlier v2 reviewer's findings: targeted vitest suites pass (16 files / 104 tests for split + validation + skill hooks; 4 files / 42 tests for list/dashboard/status; 9 files / 43 tests in control-plane), `pnpm run cli -- project list` correctly hides terminal coordination parents and `--include-coordination` reveals them as `decomposition (complete)` with recommendation `none`, `oat project split evaluate-signals --fired independently-shippable,independently-shippable` returns `triggered: false, confidence: "below"`, and the dashboard `## Decompositions` section is populated.

Verdict: **Pass for merge readiness.** Findings are limited to Minor items the user already disposition'd as deferred (release-tracked) follow-ups, plus a small inconsistency between the live dogfood notes and the current shipped behavior that is documentation-only.

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

- **`oat project split validate-plan` rejects a persisted `references/split-plan.json` after the split has run** (`packages/cli/src/commands/project/split/validate-plan.ts:92`)
  - Issue: `validate-plan` always computes existing-slug collisions against `existingSlugs` from the live project tree. After a split runs, the persisted parent and children exist on disk, so re-validating the same `references/split-plan.json` yields `slug-collision-existing` errors for the parent and every child. This is the friction explicitly recorded in `state.md` and `dogfood/declared.md:225`; the `run` subcommand has an internal `allowExistingParent` path for the active-detected-parent conversion case but `validate-plan` does not have a matching flag.
  - Suggestion: Add a `--for-resume` (or `--allow-existing` / `--allow-existing-parent`) flag to `validate-plan` that mirrors `run.runFreshSplit({ allowExistingParent: true })`, and reuse it from any post-run / resume tooling. Document the intended usage of `validate-plan` (pre-run only) in the SKILL.md so operators do not get confused after the fact. Acceptable to defer if backlog `bl-074b` already tracks this; current behavior is not a release blocker.
  - Requirement: Implementation note `state.md` "dogfood friction, not a release blocker" and `dogfood/declared.md` Live Entry Dogfood limitations.

- **`dogfood/declared.md` "Evidence Notes" claim about `--include-coordination` display is stale** (`.oat/projects/shared/oat-project-split/dogfood/declared.md:218`)
  - Issue: The dogfood note says `--include-coordination` displays the parent as `discovery (complete)` with recommendation `oat-project-plan`. Independent verification (`pnpm run cli -- project list --include-coordination`) shows the parent now correctly displays as `decomposition (complete)` with recommendation `none`. The note was captured before the p05 fixes for coordination status/list rendering landed (commits `601fda7a`, `3f3b94f0`) and is now misleading.
  - Suggestion: Add a follow-up note or annotation to `dogfood/declared.md` clarifying that the parent now renders correctly as `decomposition (complete)` post-fix, so a future reader does not interpret the limitation as still applying. Not a code change.

- **Live `dogfood/detected.md` describes a non-trivial setup path for the active-detected-parent conversion** (`packages/cli/src/commands/project/split/run.ts:294-332`)
  - Issue: The detected mid-stream live dogfood exercised the active-detected-parent conversion path via `runFreshSplit(..., { allowExistingParent: true })` (which is the right product behavior — converting an in-progress quick implementation into a coordination parent). However, the dogfood notes that the non-TTY path failed with `Split resume requires a coordination parent` and required `/tmp/oat-live-dogfood-backups/` preservation + a TTY rerun. The conversion path itself is correct, but the operator UX is fragile: an in-progress quick parent that did not yet have `oat_kind: coordination` will surface as "resume required" in detect-and-throw flow rather than offering a conversion confirmation.
  - Suggestion: Consider surfacing the conversion intent explicitly when `isActiveDetectedParentProject` is true (e.g., log a one-line "Converting active discovery project into coordination parent..." before calling `runFreshSplit`). Defer if covered by `bl-074b`; this is UX polish, not correctness.

- **Coordination parent state body documents the file invariant in prose but `dogfood/declared.md:54` still flags an earlier stale-body symptom** (`packages/cli/src/projects/split/write-parent.ts:122-165`)
  - Issue: Reviewing the current `write-parent.ts:130-165` output (and the live coordination parent `state.md` body) confirms the body now correctly says `**Plan:** N/A (coordination parent)` and `**Implementation:** N/A (coordination parent)`. The dogfood-declared rough edge "Parent `state.md` body still says the parent has scaffolded `plan.md` and `implementation.md` artifacts even though the file invariant correctly removes them" was fixed in `3f3b94f0` but the dogfood note was not updated to reflect the fix.
  - Suggestion: Same as the stale-display item above — annotate `dogfood/declared.md` so the original limitation is not confused with current behavior. Not a code change.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `dogfood/declared.md`, `dogfood/detected.md`, `dogfood/resume.md`, prior phase reviews (`p01-v3`, `p02-v3`, `p03`, `p04-v2`, `p05-v4`), and prior final reviews (`final-code-review-2026-05-21.md`, `final-code-review-2026-05-21-v2.md`), plus primary source code at HEAD `0562549c`. This is a quick-mode project; `spec.md` is not present and is optional for quick mode.

### Requirements Coverage

| Requirement                                                                                            | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standalone `oat-project-split` skill exists and is invoked from discover + brainstorm                  | implemented | `.agents/skills/oat-project-split/SKILL.md:1` declares the skill; `oat-project-discover/SKILL.md:300` invokes split for `detected-mid-stream`; `oat-brainstorm/SKILL.md:45` invokes split for `declared` and `:619` for `brainstorm-picker`. Provider views are present at `.claude/skills/oat-project-split/SKILL.md` and `.cursor/skills/oat-project-split/SKILL.md`. Skill is registered in `packages/cli/src/commands/init/tools/shared/skill-manifest.ts:66`.                      |
| Coordination parent contract: `oat_kind: coordination` projects MUST NOT contain spec/design/plan/impl | implemented | Enforced both at state validation (`packages/cli/src/validation/project-state.ts:417-442` — `assertValidProjectStateFilesystemContent` walks the project directory and rejects executable artifacts) and at the parent writer (`packages/cli/src/projects/split/write-parent.ts:227-238` — removes the four files and then re-validates). Regression tests at `packages/cli/src/validation/project-state.test.ts` and `packages/cli/src/projects/split/__tests__/write-parent.test.ts`. |
| Three trigger surfaces (declared / detected mid-stream / detected at convergence)                      | implemented | Declared: `oat-brainstorm/SKILL.md:32-45` (umbrella framing + boundary question + handoff). Detected mid-stream: `oat-project-discover/SKILL.md:265-316` (silent signal eval + threshold prompt). Detected convergence: `oat-project-discover/SKILL.md:367-380` (always-visible scope check). Brainstorm picker option: `oat-brainstorm/SKILL.md:294-308` + `:613-621`. The `evaluateSignals` confidence tiers (`signals.ts:18`) back all four entry points.                            |
| Codified signals threshold ≥2 with two load-bearing signals                                            | implemented | `packages/cli/src/projects/split/signals.ts:18-35` enforces threshold ≥2 on the deduplicated fired set, and `confidence == "high"` only when both `independently-shippable` and `no-shared-design-surface` fire.                                                                                                                                                                                                                                                                        |
| Non-interactive asymmetry: declared proceeds, detected fails fast                                      | implemented | `packages/cli/src/commands/project/split/run.ts:271-286` — non-interactive + detected origin appends `## Detected Split Recommendation` to the active discovery and sets `process.exitCode = 1`; declared origin proceeds. The same fail-fast path is documented in both discover prose (`oat-project-discover/SKILL.md:302-316`) and the convergence branch (`:371-374`).                                                                                                              |
| Parent never relocated; marked `oat_phase: decomposition` + `oat_phase_status: complete` in place      | implemented | `packages/cli/src/projects/split/finalize.ts:31-54` updates the parent state in place, never moves it. Coordination parents persist at `.oat/projects/shared/...` (confirmed in 4 live dogfood parents). Listing tests assert the same.                                                                                                                                                                                                                                                 |
| Children: 7 seeded discovery sections + `oat_inherited_context_revalidated: false`                     | implemented | `packages/cli/src/projects/split/seed-children.ts:12-20` (SEEDED_SECTIONS) and `:66-102` (renderSeededDiscovery) emit all 7 sections in order with the revalidation flag in frontmatter. The discovery template is **not** modified, so ordinary discoveries are untouched. Live evidence in `.oat/projects/shared/live-dogfood-detected-config-unset/discovery.md`.                                                                                                                    |
| Revalidation gate blocks `oat_status: complete` while flag is false                                    | implemented | `packages/cli/src/validation/project-state.ts:219-238` (`validateInheritedContextGate`). The gate only activates when `oat_parent` is set; ordinary discoveries pass through unchanged. The completion boundary `oat project complete-discovery` invokes this validation.                                                                                                                                                                                                               |
| `oat project list` hides coordination parents in terminal state; `--include-coordination` reveals      | implemented | `packages/cli/src/commands/project/list.ts:66-92` filters by `isTerminalCoordinationProject`. Verified live: default `oat project list` omits all 4 coordination parents; `--include-coordination` shows them with `decomposition (complete)` and recommendation `none` (control-plane router behavior at `packages/control-plane/src/recommender/router.ts:118-133`).                                                                                                                  |
| `oat state refresh` renders `## Decompositions` section                                                | implemented | `packages/cli/src/commands/state/generate.ts:467-501` groups terminal coordination parents into the decompositions section; `:609-611` emits the heading. Live `.oat/state.md` contains the section with 4 parents.                                                                                                                                                                                                                                                                     |
| `SplitPlanDocument` persisted at `references/split-plan.json` as the durable resume source             | implemented | `packages/cli/src/projects/split/write-parent.ts:214-219` writes the document before any child writes. `resume.ts:96-141` reads and shape-validates the file; refuses to resume if missing or invalid. `seed-children.ts` accepts an `onlySlugs` set so resume only seeds missing children.                                                                                                                                                                                             |
| `foundationChild?: string` is a singular slug; `initialActiveChild` is a slug                          | implemented | `packages/cli/src/projects/split/child-plan.ts:34-46` declares both as singular slug strings; `buildSplitPlanDocument` resolves `initialActiveChild` to `payload.initialActiveChild ?? foundationChild ?? firstChild`.                                                                                                                                                                                                                                                                  |
| Skill versions bumped + lockstep public package versions bumped                                        | implemented | All five publishable packages at `0.0.71` (up from `0.0.70`). Skills: `oat-project-split` at `1.0.0` (new), `oat-project-discover` at `2.0.2` (from `2.0.0`), `oat-brainstorm` at `1.0.4` (from `1.0.2`), `oat-project-quick-start` at `2.0.3` (from `2.0.2`).                                                                                                                                                                                                                          |
| Resume mode + confirmation gate                                                                        | implemented | `packages/cli/src/projects/split/resume.ts:143-155` (`resumeSplit` requires `options.confirmed === true`); `packages/cli/src/commands/project/split/run.ts:340-361` surfaces the recovered plan via `formatResumePreview`, prompts via `confirmAction`, and refuses non-interactive resume without `--resume`.                                                                                                                                                                          |
| Dogfood evidence for declared / detected (mid-stream + convergence) / resume                           | implemented | `dogfood/declared.md` (command-boundary + live entry), `dogfood/detected.md` (mid-stream + convergence live runs), `dogfood/resume.md` (command-boundary, persisted-plan resume). Live entry-path follow-up is tracked as `bl-074b` per the dogfood notes.                                                                                                                                                                                                                              |
| `bl-3a4a` backlog item reconciled                                                                      | implemented | `.oat/repo/reference/backlog/items/sub-project-split-escape-hatch.md` now reflects the coordination-parent design, mark-in-place archival, three trigger surfaces, and durable `references/split-plan.json`. Backlog status is `closed`.                                                                                                                                                                                                                                                |

### Extra Work (not in declared requirements)

The `oat-project-quick-start` skill change to route discovery completion through `oat project complete-discovery "$PROJECT_PATH" --ready-for ...` is technically outside the strict project scope, but it is load-bearing for child quick routing through the new validation boundary introduced in `p01-t02`. Without it, split-created child discoveries could complete without revalidating inherited context. Acceptable as in-scope per the p05 dogfood-driven fix.

The seed-children writer setting `oat_plan_source: quick` on child `plan.md` files (`packages/cli/src/projects/split/seed-children.ts:144`) is a small extra mutation beyond the design's "state.md frontmatter additions" description; it normalizes child plan routing so split children resume in quick mode rather than falling into a routing edge case. Consistent with design intent and confirmed by the p05 child routing fix.

## Deferred Findings Disposition

I scanned `implementation.md`, the active phase reviews (`p01-v3` / `p02-v3` / `p03` / `p04-v2` / `p05-v4`), and prior final review artifacts for deferred Medium items. Disposition:

| Source                               | Deferred item                                                                                                                                 | Disposition this final review                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `final-code-review-2026-05-21.md` I1 | Coordination-parent state validation invariants (`oat_children` non-empty, no executable artifacts)                                           | Resolved by fix `ada5af55`. Verified at `packages/cli/src/validation/project-state.ts:240-254` and `:394-442`. Regression tests pass.                                                                                                                                                                             |
| `final-code-review-2026-05-21.md` I2 | Hook tests do not exercise transcript / `AskUserQuestion` fixtures                                                                            | Resolved by fix `ada5af55`. `split-flow-fixtures.ts` introduces a transcript helper and `AskUserQuestionStub`; `discover-detection.test.ts` and `brainstorm-handoff.test.ts` consume them. Verified by re-running the suite (104 tests pass).                                                                     |
| `final-code-review-2026-05-21.md` M1 | Duplicate fired signals can falsely cross the threshold                                                                                       | Resolved by fix `ada5af55`. `signals.ts:18` deduplicates before threshold; CLI test verifies. Verified live: `--fired x,x` returns `triggered: false`.                                                                                                                                                            |
| `p02-r2` Medium                      | p02-t06 integration matrix not fully mirrored                                                                                                 | Accept-defer. p04 transcript fixtures and p05 dogfood evidence cover the residual cases (high/soft wording, picker option, declared-mode handoff). Not a release blocker.                                                                                                                                         |
| `p04-r1` Medium                      | Hook tests used helper / SKILL-string assertions rather than full transcripts                                                                 | Resolved by fix `ada5af55` (same as final-r1 I2). Now uses transcript fixtures with stubbed responses.                                                                                                                                                                                                            |
| `p05-r2` Deferred (live entry paths) | Live `oat-brainstorm` declared and live `oat-project-discover` detected/convergence entry-path dogfood                                        | Accept-defer to `bl-074b`. The convergence and declared entry-path dogfoods were ultimately exercised live during p05 fix iterations and are now captured under `dogfood/declared.md` and `dogfood/detected.md` "Live Entry Dogfood" sections. The remaining residual UX rough edges are tracked under `bl-074b`. |
| Implementation `state.md` follow-up  | `project split validate-plan` reports collisions for already-created parents/children when invoked on the persisted plan after `run` succeeds | Accept-defer. Surfaced as Minor in this review (see `validate-plan.ts:92` finding above). The product currently relies on operator discipline ("validate-plan is pre-run only"); a `--for-resume` flag is a reasonable v2 improvement but is not a release blocker.                                               |
| Implementation `state.md` follow-up  | Installed `oat` command lagged the local CLI during live dogfood; bundle-assets.sh race                                                       | Accept-defer. Tooling/environment issue, not a product issue with the split feature. Tracked separately under workflow-friction backlog if needed.                                                                                                                                                                |

No release-blocking deferred items remain unresolved.

## Verification Commands

Independent verification commands run during this review (all passed):

```bash
# Split + validation + hook tests (16 files / 104 tests)
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/projects/split/ \
  src/commands/project/split/ \
  src/validation/ \
  src/__tests__/skills/

# List + dashboard + status tests (4 files / 42 tests)
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/list.test.ts \
  src/commands/project/list.integration.test.ts \
  src/commands/state/generate.test.ts \
  src/commands/project/status.test.ts

# Control plane tests (9 files / 43 tests)
pnpm --filter @open-agent-toolkit/control-plane exec vitest run

# Live CLI behavior
pnpm run cli -- project list                       # coordination parents hidden
pnpm run cli -- project list --include-coordination # parents shown as 'decomposition (complete)' / 'none'
pnpm run cli -- project split evaluate-signals \
  --fired "independently-shippable,independently-shippable"   # triggered: false (dedupe)
pnpm run cli -- project split validate-plan \
  --plan-file .oat/projects/shared/live-dogfood-detected-workflow-friction/references/split-plan.json
  # Reproduces the documented post-run validate-plan friction (Minor finding above)

# Skill + package version spot-check
grep "version:" .agents/skills/oat-project-split/SKILL.md           # 1.0.0
grep "version:" .agents/skills/oat-project-discover/SKILL.md        # 2.0.2 (was 2.0.0)
grep "version:" .agents/skills/oat-brainstorm/SKILL.md              # 1.0.4 (was 1.0.2)
grep "version" packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json
  # all five: 0.0.71 (was 0.0.70)
```

Suggested final pre-merge checks (already reported as passed by prior reviewers):

```bash
pnpm lint && pnpm type-check && pnpm test
pnpm release:validate
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to record this pass and continue project closeout (summary → PR). The Minor findings above are documentation / UX polish; none block merge. Treat them as optional cleanup or as inputs to the existing `bl-074b` follow-up.
