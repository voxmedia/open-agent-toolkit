---
oat_generated: true
oat_generated_at: 2026-07-15T21:58:28Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/gate-execution-hardening
oat_gate_run_id: 68782551-93ed-4526-8c80-a6d65c4122d2
oat_gate_target: codex-5-6-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: max
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-15T21:58:28Z
**Scope:** `plan.md` readiness and alignment for the quick-mode `gate-execution-hardening` project
**Files reviewed:** 5
**Commits:** N/A (artifact review)

## Summary

The plan is structurally canonical, has stable task IDs, and makes a well-supported sequential-phase choice, but it is not ready for implementation. Three Important findings leave core discovery outcomes or a required planning decision incomplete, and two Medium findings make verification or Cursor liveness coverage unreliable.

Findings: 0 critical, 3 important, 2 medium, 0 minor

**Blocking findings:** Yes. Resolve the Important and Medium findings before treating the plan artifact as passed or starting implementation.

## Findings

### Critical

None

### Important

- **The budget policy is review-type-aware but not scope-aware** (`.oat/projects/shared/gate-execution-hardening/plan.md:140`)
  - Issue: The plan resolves defaults from `reviewType` only (`code` versus `artifact`) and gives every code review the same 30-minute default. Discovery requires defaults by review type **and scope**, specifically distinguishing implementation/final reviews from bounded reviews (`discovery.md:24`, `discovery.md:92`). The plan never passes `reviewScope` into the resolver or tests task/phase/final scope behavior, so one of the three headline outcomes is narrowed without an explicit decision. `design.md:19` and `design.md:94` contain the same drift rather than supplying contrary approved intent.
  - Fix: Add `reviewScope` to the budget resolver inputs and define/test the intended scope buckets (at minimum bounded task/phase versus implementation/final, plus artifact behavior), including precedence interactions. If type-only defaults are intentional, obtain the operator's approval and align discovery/design before implementation rather than silently narrowing the requirement.
  - Requirement: Discovery requirement 2, configurable scope/target-aware budgets.

- **The plan is marked complete while the required phase-gate decision is explicitly pending** (`.oat/projects/shared/gate-execution-hardening/plan.md:36`)
  - Issue: Frontmatter declares the plan complete and ready for implementation, but its checklist leaves the phase gate review choice pending. The repository's shared planning contract requires this setup after phase IDs stabilize and before plan artifact review (`.agents/skills/oat-project-plan-writing/SKILL.md:206`), with either an explicit enabled selection or a recorded disabled outcome. This is a workflow-readiness contradiction, not an optional cosmetic checkbox.
  - Fix: Run the shared Phase Gate Review Setup Contract. Persist a valid `oat_phase_review_gate` selection when enabled, or record the appropriate disabled outcome when declined, unavailable, or non-interactive; then mark the checklist item complete and revalidate the plan.

- **The completion-safety regression matrix stops at artifact creation and does not verify bookkeeping commit completion** (`.oat/projects/shared/gate-execution-hardening/plan.md:429`)
  - Issue: Discovery explicitly requires a `headless → inline → artifact → commit` fixture path (`discovery.md:94`), and the design names the same end-to-end case (`design.md:231`). The plan's fake runtime only writes an artifact, while its own note says the matrix exercises the gate side rather than the child-side review workflow (`plan.md:446`). The manual Claude/Cursor check says only "inline completion" (`plan.md:482`) and supplies neither runnable commands nor assertions for matching run ID, review-row update, or atomic artifact/bookkeeping commit. The original failure occurred in the review-provide execution lifecycle, so route-unit tests and prose pins alone do not close this acceptance criterion.
  - Fix: Add an explicit real-runtime or subprocess verification lane that invokes the actual headless review-provide path and records assertions for a run-correlated artifact, the matching Reviews event, and the atomic bookkeeping commit before the parent exits. Give exact commands/fixture paths for both Claude and Cursor manual runs if this cannot be fully automated.
  - Requirement: Discovery requirement 1 and the adopted fixture matrix.

### Medium

- **The generated-assets verification is guaranteed to fail before staging intended changes** (`.oat/projects/shared/gate-execution-hardening/plan.md:479`)
  - Issue: The task changes canonical skills, docs, and package versions, all of which are copied into `packages/cli/assets/` by `bundle-assets.sh` (the script removes and regenerates that directory). The verification then runs `git diff --quiet -- packages/cli/assets/` before the task's staging step, so correct regenerated assets necessarily produce a nonzero exit. Its expected result, "no unstaged regenerated assets," cannot be established at that point in the task.
  - Fix: Regenerate assets with the repository source workflow, stage the intended asset changes, rerun the generator, and only then use `git diff --quiet -- packages/cli/assets/` as an idempotence/no-unstaged-delta check. Alternatively use a deterministic generated-output comparison that does not confuse intended changes with stale output. Name the exact local CLI commands rather than relying on an installed `oat` binary for branch-sensitive verification.

- **Cursor's nested transcript layout is not pinned by the probe tests** (`.oat/projects/shared/gate-execution-hardening/plan.md:355`)
  - Issue: The plan names Cursor's observed root as `agent-transcripts/`, but discovery records actual files one level deeper at `<session-id>/<session-id>.jsonl` (`discovery.md:60`). The tests require mtime/size changes without specifying bounded recursive traversal or an append inside an existing nested session directory. An implementation that sums only immediate directory entries can pass a shallow fixture yet miss the real Cursor transcript growth this project must report.
  - Fix: State the bounded traversal rule for nested runtime paths and add a Cursor-realistic fixture that appends to an existing `<session-id>/<session-id>.jsonl` while the parent directory entry remains unchanged. Assert that size-only nested growth updates `changedSinceBaseline`, while traversal errors still fail soft.
  - Requirement: Discovery requirement 3, liveness adapters.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`, `implementation.md`, `state.md`, the canonical plan-writing contract, repository development commands, and current gate/config source layout. `spec.md` is absent and optional in quick mode; its absence is not a finding.

### Requirements Coverage

| Requirement / decision                                | Status  | Notes                                                                                               |
| ----------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| Headless completion-safety contract                   | partial | Route/helper, refusal, and skill tasks exist; actual artifact-plus-commit completion is unverified. |
| Configurable scope/target-aware budgets               | partial | Target and type surfaces exist; scope-sensitive defaults are omitted.                               |
| Liveness adapters and trustworthy activity evidence   | partial | Probe/envelope work is planned; Cursor's nested-file growth case is not pinned.                     |
| Correlated run marker                                 | planned | Lifecycle, fail-soft behavior, and out-of-repo placement have explicit tasks/tests.                 |
| Resolver policy/ladder distinction and completeness   | planned | Resolver, config-get, adoption-contract, and regression coverage are mapped to p01-t01.             |
| Pre-plan artifact-review inheritance                  | planned | Skill rule and contract tests are mapped to p02-t05 with the required guards.                       |
| Canonical plan structure, stable IDs, and parallelism | met     | Required sections exist, IDs are monotonic, and sequential execution matches shared file scope.     |

### Extra Work (not in declared requirements)

None significant. The executable route helper and whole-ladder completeness field are reasonable design refinements supporting declared reviewer-resolution and completion-safety outcomes.

## Verification Commands

Run these after updating the artifacts:

```bash
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts --json project validate-plan --project-path .oat/projects/shared/gate-execution-hardening
pnpm exec oxfmt --check .oat/projects/shared/gate-execution-hardening/plan.md .oat/projects/shared/gate-execution-hardening/discovery.md .oat/projects/shared/gate-execution-hardening/design.md
rg -n "oat_phase_review_gate|reviewScope|artifact.*commit|agent-transcripts" .oat/projects/shared/gate-execution-hardening/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan tasks, resolve the pending phase-gate choice, and re-review the updated plan before implementation.
