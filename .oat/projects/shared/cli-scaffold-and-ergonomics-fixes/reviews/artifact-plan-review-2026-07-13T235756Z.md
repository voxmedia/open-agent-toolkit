---
oat_generated: true
oat_generated_at: 2026-07-13T23:57:56Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/cli-scaffold-and-ergonomics-fixes
oat_gate_run_id: d40798fe-e79c-492a-97dd-0d6caacbbab0
oat_gate_target: codex-5-6-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: max
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-13T23:57:56Z
**Scope:** Revised quick-mode implementation plan after the wave-2 `p05-t02` review fixes
**Files reviewed:** 2 primary artifacts
**Commits:** Fix commit `a428a017`

## Summary

The revised plan resolves four prior findings completely and most of the prior atomicity finding, while preserving canonical structure, stable task IDs, review history, and coherent parallel write sets. It does not pass the gate because `p05-t02` still directs implementation to initialize the backlog before validating user inputs, contradicting its test requirement that invalid values fail before item or index mutation; implementation readiness remains correctly withheld and this review does not restore it.

Findings: 0 critical, 1 important, 0 medium, 0 minor

**Blocking findings exist:** Yes. The Important finding blocks this plan gate.

## Dispatch Audit

Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

## Findings

### Critical

None

### Important

- **Invalid options still initialize the backlog before failing validation** (`.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md:293`)
  - Issue: The RED test intent requires unsupported priority and scope values to be rejected before item or index mutation (`plan.md:279`), but the GREEN implementation sequence explicitly runs `initializeBacklog` first and validates priority, scope, and scope estimate later (`plan.md:293-296`). The live initializer creates `items/`, `archived/`, their placeholders, `index.md`, and `completed.md` when the scaffold is absent (`packages/cli/src/commands/backlog/init.ts:70-86`). Separate initialization and invalid-enum cases can therefore all pass while an invalid `oat backlog new` invocation on an uninitialized repository partially mutates the filesystem before returning an error. This leaves the failure/atomicity portion of prior finding I2 unresolved and makes the plan internally contradictory.
  - Fix: Reorder the planned creator so all user-controlled enum/input normalization and validation, including `--scope-estimate`, completes before `initializeBacklog` or any other write. Require one test that invokes each invalid enum against an absent backlog scaffold and asserts that no backlog directories or files are created, plus an existing-scaffold case that asserts item and index bytes remain unchanged; reflect the same ordering in Step 2 and its expected result.

### Medium

None

### Minor

None

## Requirements/Discovery Alignment

**Evidence sources used:** primary quick-mode artifacts `.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md` and `.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/discovery.md`; lifecycle context from `implementation.md` and `state.md`; all three archived plan reviews, including the latest `reviews/archived/artifact-plan-review-2026-07-13T233754Z.md`; fix commit `a428a017`; canonical plan rules from `.agents/skills/oat-project-plan-writing/SKILL.md`; the implementation entry guard from `.agents/skills/oat-project-implement/references/plan-and-resume.md`; and the live backlog template, canonical `oat-pjm-add-backlog-item` skill, initializer, ID/index sources, repository instructions, and release contracts. Spec and design artifacts are absent and optional in quick mode.

### Prior-Finding Resolution

| Prior finding                              | Status   | Evidence                                                                                                                                                                                                                                              |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1: confirmed estimate/index consistency   | resolved | Discovery exposes optional `--scope-estimate`, and `p05-t02` passes the confirmed estimate through the command before atomic index regeneration (`discovery.md:44`, `plan.md:279`, `plan.md:296-301`).                                                |
| I2: fallback/failure/atomicity coverage    | partial  | Real-template precedence/fallback, metadata removal, collision protection, rollback, and unchanged-index checks are explicit (`plan.md:273-304`), but invalid-input ordering still permits initialization writes before validation.                   |
| I3: plan readiness withheld                | resolved | Plan frontmatter is `in_progress` with `oat_ready_for: null` (`plan.md:2-7`), state records re-review pending (`state.md:53-73`), and the implementation entry contract blocks unless status is complete and readiness names `oat-project-implement`. |
| M1: YAML round-trip coverage               | resolved | Structured YAML serialization and exact YAML-significant title/label round trips are required (`plan.md:280`, `plan.md:297`, `plan.md:304`).                                                                                                          |
| M2: base-relative skill version validation | resolved | Both canonical-skill tasks run `internal validate-skill-version-bumps --base-ref origin/main` (`plan.md:247-248`, `plan.md:312-313`).                                                                                                                 |

### Discovery Coverage

| Discovery requirement / constraint                       | Status  | Notes                                                                                                                       |
| -------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Scaffold placeholder repair and real-template regression | covered | `p01-t01` tests real templates, expected types/values, and unresolved-token rejection.                                      |
| Non-TDD plan-shape guidance                              | covered | `p02-t01` documents the actual stable-ID, verification, and atomic-commit invariants.                                       |
| Actionable no-args tools update behavior                 | covered | `p03-t01` selects the safe copy-pasteable error path.                                                                       |
| No placeholder backlog summaries                         | covered | `p04-t01` validates a trimmed summary before mutation and preserves `--wont-do`.                                            |
| Complete decision records and summary promotion          | covered | `p05-t01` owns CLI inputs, help, semantic skill verification, canonical versioning, and focused tests.                      |
| Wave-2 one-command backlog scaffolding                   | partial | The command and skill flow are comprehensively mapped, but invalid-input behavior remains non-atomic on an absent scaffold. |
| Stale CLI grammar detection and release-callout policy   | covered | `p06-t01` owns bounded doctor detection plus semantic release-guidance verification.                                        |
| Noninteractive gate stdin                                | covered | `p06-t02` preserves output, timeout, liveness, and diagnostics while closing inherited stdin.                               |
| Lockstep package release and shipped assets              | covered | `p07-t01` owns all five versions, the generated version manifest, workspace/docs gates, and `release:validate`.             |

### Canonical Plan Readiness

- Required frontmatter and the `Reviews`, `Implementation Complete`, and `References` sections are present; the source validator reports the plan valid.
- Task IDs remain stable and monotonic from `p01-t01` through `p07-t01`; nine task headings match the phase and total rollups.
- All existing Reviews rows remain present. The archived plan reviews at `T223614Z`, `T231038Z`, and `T233754Z` are preserved, and the plan row correctly remains `fixes_completed` pending this re-review.
- Task scopes are bounded and independently committable, with runnable verification commands and task-scoped commit messages.
- The `p02`-`p06` parallel group is coherent: phase write sets are disjoint, both p05 tasks and both p06 tasks are sequential within their phase worktrees, and p07 follows all merges.
- No `Dispatch Profile` is present; omission is normal and is not a finding.
- Implementation readiness is genuinely withheld: despite the status command's advisory recommendation label, the actual implementation entry guard rejects the current `in_progress` / `null` plan frontmatter.

### Extra Work (not in declared discovery)

None. Every task maps to discovery or to the explicitly recorded operator-approved gate-stdin addition now aligned into discovery.

## Verification Commands

Run these after revising the plan:

```bash
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts --json project validate-plan --project-path .oat/projects/shared/cli-scaffold-and-ergonomics-fixes
pnpm exec oxfmt --check .oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md .oat/projects/shared/cli-scaffold-and-ergonomics-fixes/discovery.md
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts --json project status --project-path .oat/projects/shared/cli-scaffold-and-ergonomics-fixes
sed -n '271,304p' .oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md
```

Current read-only results: the source CLI plan validator returned `{"valid":true}`, formatting passed for both primary artifacts, and project status confirmed plan `in_progress` with `readyFor: null`. The semantic ordering audit above still fails because initialization precedes validation.

## Recommended Next Step

Run the `oat-project-review-receive` skill to revise the `p05-t02` validation/initialization order and its absent-scaffold invalid-input test, then re-run the plan gate review. Do not restore implementation readiness until a subsequent review passes and the root workflow records that outcome.
