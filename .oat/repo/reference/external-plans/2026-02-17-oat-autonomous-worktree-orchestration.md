# OAT Autonomous Worktree + Subagent Orchestration Plan

## Summary
Add an autonomous, OAT-oriented subagent orchestration capability for large multi-phase projects that preserves existing human-in-the-loop (HiL) checkpoints from project configuration/frontmatter.

This extends existing worktree foundations with an orchestrator-friendly execution model: fan out parallel phase/task work in isolated worktrees, run autonomous code-review gates per unit, reconcile/merge back to a main working branch, and preserve OAT artifact discipline.

## Problem Statement
Current worktree skill guidance is intentionally manual-safe and explicit-invocation-first. That is appropriate for interactive use, but it limits unattended orchestration patterns where an orchestrator agent should be able to:
1. bootstrap worktrees without prompting,
2. dispatch parallel subagents,
3. aggregate results,
4. run autonomous review/fix loops before merge-back,
5. merge successful work back,
6. defer human approval until the next configured HiL checkpoint.

## Locked Decisions
1. Keep `oat-worktree-bootstrap` as manual-safe and explicit-invocation oriented.
2. Add a separate autonomous companion contract (skill) for orchestrator use; do not overload the manual-safe skill with conflicting behavior.
3. Autonomous path must avoid `AskUserQuestion` during normal execution.
4. If no valid active project exists, orchestration must continue with console logging only (no new fallback artifact file for now).
5. HiL behavior must use existing project HiL frontmatter/checkpoint semantics as source of truth; orchestration runs autonomously only between checkpoints.
6. Reconciliation and merge-back must be deterministic and auditable.
7. No unit branch may merge back into the orchestration branch unless it passes an autonomous review gate (or is explicitly marked failed/skipped by policy).
8. Autonomous review interactions and outcomes must be persisted in project artifacts for traceability.

## In Scope
1. Define autonomous worktree bootstrap skill contract for subagent/orchestrator execution.
2. Define subagent orchestration skill contract for parallel fan-out/fan-in.
3. Define pre-implement execution-mode selection step (`single-thread` vs `subagent-driven`) after planning.
4. Define project state/frontmatter tracking for selected execution mode.
5. Define merge-back/reconcile strategy for parallel branches/worktrees.
6. Define failure handling, retries, and conflict escalation rules.
7. Define autonomous review-before-merge gate and reviewer/implementer role contracts.
8. Define OAT artifact updates required during orchestration (plan/implementation/review linkage + review interaction traceability).
9. Update backlog and references to track this as part of subagent orchestration work.

## Out of Scope
1. Replacing existing manual-safe worktree skill behavior.
2. Implementing a full persistent orchestration state database.
3. Introducing new repo-level memory files for worktree logs in this phase.
4. Full automation of release/deploy gates beyond project review/PR flows.

## Proposed Skill Surface (Draft)

### 1) Autonomous worktree bootstrap skill (new)
Suggested name: `oat-worktree-bootstrap-auto`

Intent:
- Agent-invocable utility for orchestration flows.
- Non-interactive defaults and explicit status output.

Draft behavior:
1. Resolve root with existing precedence (`--path`, env, `.oat/config.json`, discovered roots, fallback).
2. Create/reuse worktree and target branch deterministically.
3. Run baseline checks (`worktree:init`, `status`, tests, clean git status) with policy flags:
   - strict mode: fail fast,
   - allow-failing-baseline mode: continue and emit structured warning.
4. Log baseline failure context to active project `implementation.md` when available; otherwise console-only.

### 2) Subagent orchestration skill (new)
Suggested name: `oat-subagent-orchestrate`

Intent:
- Drive parallel execution across eligible phases/tasks using autonomous worktrees.

Draft behavior:
1. Read project plan and identify parallelizable units (phase/task-level).
2. Create per-unit worktree/branch strategy.
3. Dispatch subagents with scoped objectives and file boundaries.
4. Run autonomous review gate per unit before merge-back:
   - implementer output -> code/spec reviewer pass/fail,
   - optional fix iteration loop when review fails,
   - capture reviewer verdict + rationale.
5. Collect completion status and required evidence (tests, changed files, commits, review verdicts).
6. Perform fan-in reconciliation:
   - cherry-pick or merge unit branches into orchestration branch,
   - run integration verification,
   - classify and report conflicts.
7. Update `implementation.md` with orchestration run summary.

### 3) Plan-to-implement execution selector (new)
Suggested integration point: end of planning flows (before first implement step)

Intent:
- Match superpowers-style plan handoff by asking user how to execute the plan.
- Keep default single-agent behavior while enabling subagent orchestration when chosen.

Draft behavior:
1. At plan completion, prompt:
   - `single-thread` (existing implementation flow),
   - `subagent-driven` (orchestrated worktree flow).
2. Persist choice in project state/frontmatter (for example `oat_execution_mode`).
3. Route next step based on persisted mode:
   - `single-thread` -> `oat-project-implement`
   - `subagent-driven` -> `oat-subagent-orchestrate`
4. Allow explicit override per run, but keep persisted mode as default.

## Orchestration Policies
1. Eligibility: only tasks/phases explicitly marked parallel-safe are fanned out.
2. Merge strategy:
   - default: merge unit branches into orchestration branch in deterministic order,
   - fallback: cherry-pick for conflict isolation when merge fails.
3. Failure handling:
   - unit failure does not abort all units by default,
   - failed units are reported and excluded from merge unless policy says otherwise.
4. HiL checkpoint policy:
   - Source of truth: existing project HiL frontmatter/checkpoint configuration.
   - Orchestrator may fan out/fan in only for units before the next HiL checkpoint.
   - Example: if `p04` is a HiL checkpoint, `p02` and `p03` can run in parallel and reconcile before pausing at `p04`.
5. Autonomous review gate policy:
   - Each unit must pass reviewer gate before merge-back to orchestration branch.
   - Reviewer gate uses deterministic pass/fail criteria (tests + contract checks + scoped code review findings).
   - Failed reviews route to automated fix iteration up to configured retry limit, then mark unit failed/skipped.
6. Execution mode policy:
   - Source of truth: project state/frontmatter execution mode value.
   - If unset, default to `single-thread` for backward compatibility.
   - Orchestrator entrypoints must respect persisted mode unless explicit override is provided.

## OAT Artifact Contract
During orchestration runs, append structured sections in project `implementation.md`:
1. run metadata (timestamp, branch/worktree map, policy mode),
2. per-unit outcomes (success/failure, commit refs, tests),
3. review interaction records (reviewer role, verdict, key findings, retry count),
4. merge/reconcile outcomes,
5. outstanding conflicts or manual follow-ups.

Project state contract additions:
- Store execution mode in project state/frontmatter (for example `oat_execution_mode: single-thread|subagent-driven`).
- Optionally track orchestration policy options (for example merge strategy/retry policy) when subagent-driven mode is selected.

Plan linkage requirements:
- review rows/status transitions remain canonical in `plan.md`.
- orchestration notes must not bypass existing review-receive/final-pass semantics.

## Implementation Plan

### Phase 1: Contract design
1. Draft `oat-worktree-bootstrap-auto` skill contract.
2. Draft `oat-subagent-orchestrate` skill contract.
3. Define plan-to-implement execution-mode selector contract.
4. Define policy flags (baseline strictness, merge strategy) and map existing HiL frontmatter into orchestration pause/resume behavior.

### Phase 2: Core flow
1. Implement autonomous worktree bootstrap logic and status outputs.
2. Implement fan-out subagent dispatch and per-unit result collection.
3. Implement autonomous unit review gate and fix-loop retry behavior.
4. Implement fan-in merge/reconcile logic with deterministic ordering.

### Phase 3: OAT integration
1. Integrate `implementation.md` orchestration logging.
2. Integrate execution-mode persistence in project state/frontmatter.
3. Ensure compatibility with existing review skills and final gate semantics.
4. Document usage patterns for large multi-phase projects.

### Phase 4: Validation
1. Dry-run orchestration on sample multi-phase plan.
2. Execute parallel-safe phases in worktrees and reconcile.
3. Validate autonomous review gate blocks failed units from merge-back.
4. Validate checkpoint behavior against existing HiL frontmatter (including mid-plan checkpoints).
5. Validate plan handoff selector persists execution mode and routes correctly.

## Test Scenarios
1. Happy path: two parallel units succeed and merge cleanly.
2. Mixed result: one unit fails, one succeeds; successful unit still merges.
3. Review gate fail path: unit fails review, fix loop retries, unit excluded if still failing.
4. Merge conflict path: conflict detected, escalation output generated.
5. No active project path: orchestration continues with console fallback logging.
6. Mid-plan HiL checkpoint path: parallel units run before checkpoint, orchestrator pauses at configured checkpoint.
7. Plan handoff path: user selects `subagent-driven`, mode is persisted, and subsequent execution routes to orchestrator by default.

## Acceptance Criteria
1. Orchestrator can run parallel worktree-based execution without interactive prompts between configured HiL checkpoints.
2. Merge-back process is deterministic and auditable.
3. Unit branches cannot merge back without passing autonomous review gate (or explicit policy skip/fail disposition).
4. Failures/conflicts are surfaced with actionable next steps, without silent loss of work.
5. OAT artifacts capture review interaction history and remain consistent with existing lifecycle/review contracts.
6. Manual-safe and autonomous skill contracts remain clearly separated.
7. Plan-to-implement handoff supports explicit execution-mode selection and persists it in project state/frontmatter.

## References
1. Existing worktree foundation:
   - `.oat/repo/reference/external-plans/2026-02-17-oat-worktree-bootstrap-and-config-consolidation.md`
2. Superpowers inspiration:
   - https://github.com/obra/superpowers/blob/main/skills/using-git-worktrees/SKILL.md
   - https://github.com/obra/superpowers/blob/e16d611eee14ac4c3253b4bf4c55a98d905c2e64/skills/writing-plans/SKILL.md#L103
   - https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md
   - https://github.com/obra/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md
   - https://github.com/obra/superpowers/blob/main/skills/finishing-a-development-branch/SKILL.md
   - https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/code-quality-reviewer-prompt.md
   - https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/implementer-prompt.md
   - https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/spec-reviewer-prompt.md
