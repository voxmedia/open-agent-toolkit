---
oat_generated: true
oat_generated_at: 2026-09-08T22:46:20Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/wave-7-execution
oat_gate_headless: true
oat_gate_run_id: f905852e-4f03-417e-a51f-6fbd79b6db99
oat_gate_target: codex-5-6-sol-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: xhigh
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-09-08T22:46:20Z
**Scope:** Wave 7 wrapper plan readiness and alignment with discovery, repository state, the Wave 7 index, and the execution program
**Files reviewed:** 2
**Commits:** N/A (artifact review)

## Summary

The wrapper has the required quick-mode structure, maps exactly twenty unique source-plan pointers, preserves the index's dependency order after batching to the three-worktree ceiling, and passes the repository plan validator. It is not ready for implementation: p04 replaces an immutable plan's missing dirty-worktree patch with a branch that contains no p09 work, and the closeout archive batch contradicts two source contracts; the program ledger and one write-surface claim also need alignment.

Findings: 1 critical, 2 important, 1 medium, 0 minor

## Findings

### Critical

- **p04 suppresses a live STOP and points at a branch that does not contain the parked patch** (`.oat/projects/shared/wave-7-execution/plan.md:141`)
  - Issue: The wrapper says the parked Wave 5 p09 patch survives on local branch `wave-5/p09`, replaces the source plan's dirty-worktree snapshot with `git log` / `git diff origin/main...wave-5/p09`, and records `20 PASS / 0 STOP`. The immutable p04 contract says the patch's only surviving copy is the dirty worktree and explicitly makes a missing worktree a STOP unless re-derivation is authorized (`.oat/repo/reference/external-plans/2026-09-08-make-the-completion-seal-idempotent.md:465`). Repository evidence contradicts the substitution: Wave 5 recorded the patch in an orchestrator scratchpad and later removed the worktree (`.oat/projects/shared/wave-5-execution/implementation.md:337`, `.oat/projects/shared/wave-5-execution/implementation.md:415`), while `wave-5/p09` currently points to the p08 fan-in commit `956773dc6832dea1a765bfa61716e824166878fc` and has no p09-scoped commit. Reading that branch therefore cannot supply the tracked patch or the two untracked files required by p04 step 7.
  - Fix: Recover the exact scratchpad patch and two untracked files into a durable, named location that p04 can verify and apply, then update the wrapper's p04 pointer and Drift Refresh Record with reproduction-grade checks. If the bytes cannot be recovered, mark p04 STOP/parked in the wrapper and state artifacts until the operator explicitly authorizes re-derivation; do not weaken or rewrite the immutable source plan.

### Important

- **The serialized archive command includes two backlog records that must remain open** (`.oat/projects/shared/wave-7-execution/plan.md:787`)
  - Issue: The Implementation Complete checklist tells the fan-in to run `oat backlog archive` for both `BL-260906-harden-dispatch-launch` and `BL-260908-retire-the-top-level-skill`, then contradicts that instruction parenthetically. The p16 contract explicitly says the first item must remain open until issue #266 lands and must not be archived (`.oat/repo/reference/external-plans/2026-09-08-calculate-dispatch-baselines-after-journaling.md:540`). The p13 contract likewise requires the alias-retirement item to remain open with step 2 unticked (`.oat/repo/reference/external-plans/2026-09-08-tighten-the-skill-version-validators.md:859`). A single archive batch is operationally actionable and can close both records prematurely.
  - Fix: Remove both IDs from the archive set. Give each an explicit update-only closeout instruction that preserves `status: open` and its remaining acceptance criteria, and make the archived-item list unconditional and exact.

- **The referenced program still records an unmet approval checkpoint while the wrapper declares itself unblocked** (`.oat/projects/shared/wave-7-execution/plan.md:2`)
  - Issue: Discovery records operator approval after PR #284 (`.oat/projects/shared/wave-7-execution/discovery.md:33`), but the live execution program still says W7 is `composed`, awaits its own operator approval, has not started, and must not execute before that approval (`.oat/repo/reference/external-plans/2026-08-31-execution-program.md:33`, `.oat/repo/reference/external-plans/2026-08-31-execution-program.md:43`, `.oat/repo/reference/external-plans/2026-08-31-execution-program.md:649`). The wrapper meanwhile has `oat_blockers: []` and `oat_ready_for: oat-project-implement`. These are conflicting durable sources at an authorization boundary.
  - Fix: Reconcile the program ledger before implementation by recording the verified approval and current wrapper project as the W7 in-progress state. If that approval cannot be tied to durable evidence, keep the program at `composed` and add a wrapper blocker instead.

### Medium

- **The write-surface evidence invents an `AGENTS.md` write for p19** (`.oat/projects/shared/wave-7-execution/plan.md:100`)
  - Issue: The wrapper includes p19 in the root `AGENTS.md` dependency chain and final-review brief (`.oat/projects/shared/wave-7-execution/plan.md:50`, `.oat/projects/shared/wave-7-execution/plan.md:57`), following the same stale claim in the Wave 7 index. The immutable p19 plan's complete In scope list does not include root `AGENTS.md` (`.oat/repo/reference/external-plans/2026-09-08-correct-skill-authoring-facts.md:194`); it edits references to `AGENTS.md` inside two skills, not the root file. Because p19 is already ungrouped, this does not create an unsafe parallel group, but it makes the claimed mechanical intersection and final dependency audit inaccurate.
  - Fix: Remove p19 from the root-`AGENTS.md` writer chain and final-review dependency row, correct the corresponding index/program note through their owning workflow, and rerun the write-surface intersection from the immutable `### In scope` sections.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `state.md`, `implementation.md`, `orchestration-log.md`, the Wave 7 index, the 2026-08-31 execution program, live Git/GitHub/version state, the Wave 5 p09 records, and only the contract snippets needed from the immutable p04, p13, p16, and p19 source plans. The twenty external plans were treated as immutable inputs, not review targets.

### Requirements Coverage

| Requirement                                            | Status    | Notes                                                                                                                                                                             |
| ------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quick-mode canonical plan structure                    | satisfied | Required frontmatter, stable `p01-t01` through `p20-t01` IDs, Reviews, Implementation Complete, and References are present; `oat project validate-plan` returns `{"valid":true}`. |
| Exact Wave 7 source-plan coverage                      | satisfied | The plan and index each name twenty unique source plans; their sets match and all referenced files exist.                                                                         |
| Dependency-safe batching at concurrency 3              | partial   | The six three-lane groups plus p19/p20 preserve the material program dependencies and have no declared within-group write collision, but the p19 `AGENTS.md` evidence is false.   |
| Immutable-plan and STOP preservation                   | missing   | p04's required STOP is replaced by a branch-based workaround that cannot reproduce the parked patch.                                                                              |
| Actionable per-task verification and commit boundaries | satisfied | Every task contains drift, execute, wrapper verification, review, and commit steps without restating its source implementation contract.                                          |
| Safe serialized backlog closeout                       | partial   | The archive batch includes two records whose source contracts require them to stay open.                                                                                          |
| Program authorization/status alignment                 | partial   | Discovery records approval, but the referenced program still records an unmet approval checkpoint and `composed` state.                                                           |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run these after revising the wrapper artifacts:

```bash
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/wave-7-execution --json
test -f <durable-p09-patch-path> && git apply --check <durable-p09-patch-path>
git log --format='%H %s' wave-5/p09 --grep='p09-t01' --regexp-ignore-case
rg -n 'BL-260906-harden-dispatch-launch|BL-260908-retire-the-top-level-skill' .oat/projects/shared/wave-7-execution/plan.md
rg -n '^\| W7|Wave 7 composition|operator approval' .oat/repo/reference/external-plans/2026-08-31-execution-program.md
pnpm exec oxfmt --check .oat/projects/shared/wave-7-execution/plan.md .oat/projects/shared/wave-7-execution/reviews/artifact-plan-review-2026-09-08T224620Z.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill. Convert the Critical and Important findings into blocking plan-alignment tasks before implementation; preserve the twenty external plan files unchanged.
