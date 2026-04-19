---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-17
oat_generated: true
oat_summary_last_task: p07-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: subagent-implement-refactor

## Overview

Evolve `oat-project-implement` from a sequential per-task orchestrator into a phase-subagent dispatcher, absorb the capabilities of the separate `oat-project-subagent-implement` skill, and express parallelism as plan metadata rather than a separate skill. Two user-reported pains motivated the work: context pressure on large plans (main orchestrator was running out of context before finishing) and merge-conflict overhead in the task-granularity subagent skill (too fine a unit of dispatch). The phase was identified as the right intermediate granularity — cohesive enough that one subagent can execute it end-to-end with a single artifact read, coarse enough that phase-level parallelism rarely conflicts when plans are authored correctly.

## What Was Implemented

**New agent.** `.agents/agents/oat-phase-implementer.md` (v1.0.0) carries the phase-execution behavior — read plan[phase] + design + spec once, execute tasks sequentially, commit per task with the plan's commit convention, self-review between tasks, return a structured summary (`DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`), handle fix feedback on re-dispatch. Provider views synced to `.codex/agents/oat-phase-implementer.toml` and symlinks for Claude/Cursor.

**Evolved skill.** `.agents/skills/oat-project-implement/SKILL.md` bumped v1.3.0 → v2.0.0. New sections: capability detection and tier selection (Step 0.5), plan metadata validation via CLI (Step 2.1), execution schedule build (Step 2.2), resumption detection (Step 1.5), per-phase subagent dispatch replacing inline task loop (Step 5), per-phase reviewer dispatch with bounded fix loop, parallel group orchestration with worktree-per-phase and ordered fan-in, unified phase-level artifact updates (Step 7), and dry-run mode. Frontmatter adds `Task` to allowed-tools and `--retry-limit`/`--dry-run` to argument-hint.

**New CLI command.** `oat project validate-plan --project-path <path>` validates `oat_plan_parallel_groups` metadata (nested-array shape, phase existence, uniqueness, no singleton groups, clean YAML frontmatter). Pure validator in `validate-plan.ts`, Commander wrapper in `index.ts`, 16 unit tests, shell-based integration test against four fixture projects.

**Template updates.** `.oat/templates/plan.md` gains the `oat_plan_parallel_groups: []` frontmatter field plus a Parallelism documentation section and two new Planning Checklist items. `.oat/templates/implementation.md` replaces the old orchestration-runs block with a simpler phase-granularity version. `.oat/templates/state.md` removes `oat_execution_mode`.

**Sibling skill update.** `oat-project-plan` v1.2.0 → v1.3.0 adds Step 14.5 "Propose Parallel Groups (Optional)" — proposes parallelism when phases have file-disjoint task sets and never silently infers.

**Runtime cleanup.** `packages/control-plane/src/recommender/router.ts` drops the conditional redirect that sent users to the old skill when `executionMode === 'subagent-driven'`. `packages/cli/scripts/bundle-assets.sh` and `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` drop entries for the deprecated skill. `packages/cli/src/commands/project/set-mode/index.ts` is replaced with a deprecation no-op that prints a warning, preserves the `--json` contract (emits `{status: "deprecated", command, message, noop: true}`), and exits 0 without modifying state.md.

**Deletion.** `.agents/skills/oat-project-subagent-implement/` (skill directory, scripts, tests, examples) and all references in AGENTS.md, `.oat/templates/plan.md`, docs pages, and six sibling skills.

**Release hygiene.** Public packages bumped 0.0.40 → 0.0.41 (five packages in lockstep). Nine canonical skills bumped for content changes (including two that had regressed during sync and were restored to origin/main's post-#55 state).

**Documentation.** New page `apps/oat-docs/docs/workflows/projects/implementation-execution.md` covers the execution model. `lifecycle.md` mermaid diagram fixed to remove stale Subagent-driven branch; Implementation modes section expanded with tier language. `artifacts.md` documents `oat_plan_parallel_groups`. `cli-reference.md` adds validate-plan and notes set-mode deprecation. Root README surfaces validate-plan in useful commands.

## Key Decisions

- **Single evolved skill, not a two-skill split.** Rejected "evolve both skills independently" and "leave implementation; only offload review" in favor of merging both into one skill and treating parallelism as plan metadata. The user-visible improvement is one entry point with no execution-mode choice at invocation time.
- **Phase is the unit of dispatch.** Flat dispatch (no nested subagents). The orchestrator accumulates only phase summaries and verdicts; design/spec/plan context is read once per phase inside the implementer, not once per task.
- **Two-tier capability model, locked for the run.** Tier 1 (native subagents) / Tier 2 (inline fallback). One authorization prompt at skill start for Codex cases; no mid-run re-evaluation or silent downgrades. The autonomous execution pattern was the deciding constraint — this skill cannot block on user-initiated fresh sessions mid-run, so the three-tier model used by `oat-project-review-provide` was compressed to two.
- **Parallelism as plan metadata, not a runtime flag.** `oat_plan_parallel_groups` in plan.md frontmatter. Plans without the field execute identically to today's sequential behavior, so the change is backward-compatible.
- **Partial merge-back, not atomic.** When a parallel group has mixed terminal verdicts, passing phases still merge in plan order; failed phases are excluded and reported in Outstanding Items. Resolved a contradiction in an earlier draft of the spec (had implied "all or nothing") caught during Codex review.
- **Conflict resolution via inline subagent dispatch, not orchestrator-direct or a dedicated agent.** Preserves the orchestrator invariant that it never reads conflicted files itself; prompt is authored inline in the skill because the call site is singular and a separate agent file would be YAGNI.
- **Plan validation delegates to the CLI, not skill prose.** `oat project validate-plan` is the single source of truth. The skill calls the command and reacts to exit code only. Validator is unit-tested (16 cases) and integration-tested via a shell script that invokes the CLI against fixture directories.
- **Executed via Superpowers, not oat-project-implement.** Deliberate choice (discovery.md decision #10). The plan modifies `oat-project-implement` itself, which creates a self-modification risk if run through that skill mid-refactor. Superpowers `subagent-driven-development` was the coherent alternative for execution while OAT artifacts (discovery, spec, design, plan, implementation) were preserved as historical record.
- **Single PR, not phased landing.** Old subagent-implement had low active-user impact; two skills coexisting with overlapping behavior would create "which do I use?" confusion.

## Design Deltas

- **Three-tier → two-tier capability model.** Initial draft inherited the three-tier pattern from `oat-project-review-provide`. Autonomous execution constraint forced compression to two tiers with a single auth prompt at start.
- **Orchestrator-driven merge resolution → inline subagent dispatch.** Initial proposal had the orchestrator read conflicted files directly. User pushback surfaced the invariant violation; alternative (dedicated agent file) was rejected as YAGNI for a single call site.
- **Hard "stop on any group failure" → partial merge-back.** Codex review caught the contradiction between the "wait for all terminal verdicts" language and the "stop if any phase fails" language. Spec was reworded to explicit partial merge-back; excluded phases are surfaced in Outstanding Items rather than rolling back the group.
- **Validator-in-skill → CLI-delegated.** Validation logic was originally inline in the skill's dispatch prose. Codex review flagged this as untestable; moved to `oat project validate-plan` with unit tests, and the skill simply invokes the command.
- **Fixtures as flat files → fixture project directories.** The validator's `--project-path` flag expects a directory. Fixtures were restructured from `*.md` files into four project directories (`sequential-project`, `parallel-project`, `invalid-unknown-phase`, `invalid-singleton-group`) each containing `plan.md`.

## Notable Challenges

- **Self-modification risk.** Running `oat-project-implement` to execute a plan that modifies `oat-project-implement` would be unstable. Addressed by choosing Superpowers for execution (user decision) while preserving full OAT project artifacts for historical record.
- **Unintentional version regressions during sync.** Two skills (`oat-project-complete` 1.4.3 → 1.4.2 and `oat-project-pr-final` 1.3.3 → 1.3.2) regressed in content and version because `oat sync` in Task 18 pulled from older bundled-asset copies. Required a revert to restore origin/main's post-#55 content.
- **Test-contract drift after skill version bumps.** `skills.test.ts` pins `oat-project-quick-start`'s version explicitly; bumping the skill required updating the test assertion. `review-skill-contracts.test.ts` had advanced past local `main` (via `7cd65bce` on origin) and needed its newer version pulled in.
- **Missing version bumps on skills touched by cascading doc cleanup.** Task 19's reference cleanup edited six sibling skills without bumping their versions. Caught in the Task 24 final review and fixed before PR.
- **`public-package-versions.json` bundled-asset copy missed from lockstep bump.** Task 21 bumped the five `package.json` files but didn't stage the bundled JSON that mirrors those versions for CLI consumers. Caught in final review and fixed.

## Tradeoffs Made

- **Context isolation vs. dispatch cost.** Phase-subagent dispatch adds per-phase subagent invocation overhead but moves artifact reads out of the main orchestrator's context, enabling larger plans to complete. The per-phase cost is small relative to the context pressure it relieves.
- **Validation flexibility vs. testability.** Keeping validation logic in skill prose would have been faster to ship but impossible to unit-test. Moving to a CLI command adds a file + wrapper but produces a stable contract with 16-case coverage.
- **Lockstep release discipline vs. change cadence.** Bumping five public packages together for any bundled-asset change adds release ceremony but keeps CLI consumers on a consistent version baseline. Accepted per AGENTS.md policy.
- **Partial merge-back vs. atomic group semantics.** Partial merge-back complicates the failure story (some phases pass, some excluded, orchestrator proceeds) but preserves useful work. Atomic (all-or-nothing) was rejected because rolling back passing phases on a single failure would throw away legitimate progress.
- **Deleting the old skill vs. deprecating in place.** Low active usage meant deletion was safer than a multi-release deprecation window. Users hitting the old redirect see a single deprecation notice from `set-mode`; the router no longer routes there.

## Integration Notes

- **HiLL checkpoints are orthogonal to parallelism.** A HiLL phase inside a parallel group fires after the whole group completes and merges back — not mid-group. Preserves existing HiLL semantics without special-casing.
- **Bookkeeping commit discipline preserved.** Each phase (or group) ends with a mandatory `chore(oat): bookkeeping after {pNN} {pass|fail}` commit. State drift across sessions is prevented by this discipline.
- **Resumption at phase granularity.** Re-invocation reads `implementation.md` orchestration runs, cross-checks against `state.md` and git log, and picks up at the next un-run phase. In-flight phases (implementer committed, reviewer didn't run) re-dispatch the reviewer for the current HEAD.
- **Tier 2 always degrades parallel groups.** Inline execution cannot run concurrent subagents, so parallel groups collapse to sequential inline when Tier 2 is selected. Plan metadata is honored as a preference, not a hard requirement.

## Follow-up Items

- **Fix-loop quality is empirical.** The design assumes fix implementers can meaningfully act on review findings when given the review artifact. Real-world quality needs observation; tuning may be required.
- **Merge-conflict auto-resolution is new territory.** First-run defaults bail readily on complex conflicts. Confidence can be built as successful resolutions accumulate.
- **Provider capability drift.** Codex's "dispatch authorization required" behavior is handled at start. If future provider changes introduce additional mid-run signals or require re-auth, the tier-locking design would need revision.
- **Final-review contract pinning on `oat-project-quick-start`.** `skills.test.ts` pins the version explicitly; a future bump to that skill will require updating both the skill and the test assertion in the same PR. Worth considering a looser contract (range check) if this becomes friction.

## References

- Project artifacts: `.oat/projects/shared/subagent-implement-refactor/`
- Superpowers sources: `.superpowers/specs/2026-04-17-oat-project-implement-phase-subagent.md`, `.superpowers/plans/2026-04-17-oat-project-implement-phase-subagent.md`
- Evolved skill: `.agents/skills/oat-project-implement/SKILL.md` (v2.0.0)
- New agent: `.agents/agents/oat-phase-implementer.md` (v1.0.0)
- New CLI: `packages/cli/src/commands/project/validate-plan/`
- Docs: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Ad-hoc review: `.oat/repo/reviews/ad-hoc-review-2026-04-17-subagent-implement-analysis.md`
