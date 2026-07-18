---
name: oat-project-implement
version: 2.1.4
description: Use when plan.md is ready for execution. Dispatches one phase implementer per phase, owns independent phase review and bounded fix routing, and supports plan-declared worktree-isolated parallel phases.
oat_gateable: true
argument-hint: '[--retry-limit <N>] [--dry-run]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(oat project log:*), Glob, Grep, AskUserQuestion, Task
---

# Implementation Phase

Execute the implementation plan task-by-task with full state tracking.

## Prerequisites

**Required:** Complete implementation plan. If missing, run the `oat-project-plan` skill first.

## Shared Subagent Dispatch Contract

Before resolving or launching any phase implementer, optional nested worker,
fix continuation, or reviewer, read and follow
`.agents/skills/oat-project-dispatch-subagents/SKILL.md`. The project adapter
resolves lifecycle scope and then requires
`.agents/skills/oat-dispatch-subagents/SKILL.md` for provider-neutral
selection, recovery, and evidence. This explicit two-skill load is mandatory;
do not rely on ambient skill discovery. This implementation skill retains
lifecycle sequencing, verification, integration, and approval-aware final
closeout.
Correctness must not require a provider restart or hot reload.

After resolving `ACTIVE_PROVIDER`, read exactly one active-provider reference
from `.agents/skills/oat-dispatch-subagents/references/`
(`provider-cursor.md`, `provider-codex.md`, or `provider-claude.md`). Do not
merge provider mechanics.

## Project Log Append Points

At each point below, invoke `oat project log append` and defer entry flags and format to `oat project log append --help`. Never pre-check project-log config: the helper no-ops when the feature is off.

- After every accepted subagent dispatch, invoke `oat project log append` for a structural stamp referencing `$PROJECT_PATH/implementation.md#<run-anchor>`; never mirror that record.
- Before every STOP or park return, invoke `oat project log append` for a structural entry naming the triggering condition.
- After every phase outcome, invoke `oat project log append` for a structural entry with the verdict and fix-loop count.
- After every parallel-group merge attempt, invoke `oat project log append` for a structural entry with the merge result.

## Autonomy Policy

When `OAT_AUTONOMOUS=1`, read
`references/docs/autonomy-contract.md` and keep `OAT_NON_INTERACTIVE=1` set for
this run. Autonomy-specific behavior is routed with the rest of the workflow:

- delegation authorization: `references/dispatch-and-dry-run.md`;
- HiLL resolution and checkpoint review/receive:
  `references/plan-and-resume.md`;
- final review, final HiLL approval, and lifecycle-tail sequencing:
  `references/completion-and-closeout.md`.

These are additive autonomous branches. When `OAT_AUTONOMOUS` is not exactly
`1`, preserve every existing interactive prompt and preference path. Never
persist either autonomy environment signal in project artifacts or config;
record only the gate decision and its review/dispatch provenance.

## Mode Assertion

**OAT MODE: Implementation**

**Purpose:** Execute plan tasks with TDD discipline, track progress, handle blockers.

**CRITICAL — Bookkeeping commits are mandatory, not optional.**
After every code commit and after every phase/review-fix completion, you MUST commit the OAT tracking files (project: `implementation.md`, `state.md`, `plan.md`) as a separate bookkeeping commit. Refresh the repo dashboard with `oat state refresh` before staging when available, but do not stage `.oat/state.md`; it is generated dashboard state and is normally gitignored. Do not defer, batch, or skip these commits under the reasoning that they "aren't related to the implementation." Skipping a bookkeeping commit is the primary cause of cross-session state drift and will cause the next implementation run to fail bookkeeping cross-checks. If bookkeeping commits feel frequent, that is the intended design — they are cheap and they prevent drift.

**CRITICAL — Review boundaries require a committed artifact baseline.**
Do not enter checkpoint review, final review, revise, or PR-final handoff with dirty core project artifacts (`discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`). If one of those boundaries is next and artifact bookkeeping is still uncommitted, stop and create the bookkeeping commit first.

**CRITICAL — Intentional artifact divergence must be recorded.**
If implementation intentionally diverges from `spec.md`, `design.md`, or `plan.md`, record the delta in `implementation.md` before the next phase/review boundary. Include what diverged, why it diverged, whether the implementation or original artifact is now source of truth, and any follow-up artifact updates or explicit deferral. Do not leave accepted design drift only in chat, a review artifact, or code comments; final summary generation depends on `implementation.md` preserving the delta.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what's happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ IMPLEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- For each task, announce a compact header before doing work:
  - `OAT ▸ IMPLEMENT {task_id}: {task_name}`
- Before multi-step "bookkeeping" work (updating artifacts/state, verification, committing, dashboard refresh), print 2–5 short step indicators, e.g.:
  - `[1/4] Updating implementation.md + state.md…`
  - `[2/4] Running verification…`
  - `[3/4] Committing…`
  - `[4/4] Refreshing dashboard…`
- For long-running operations (tests/lint/type-check/build, reviews, large diffs), print a start line and a completion line (duration optional).
- Keep it concise; don't print a line for every shell command.

**BLOCKED Activities:**

- No skipping tasks
- No changing plan structure
- No scope expansion

**ALLOWED Activities:**

- Executing tasks in order
- Making minor adaptations within task scope
- Logging decisions and issues
- Marking blockers for user review

**Self-Correction Protocol:**
If you catch yourself:

- Skipping ahead in tasks → STOP (execute in order)
- Expanding scope → STOP (log as "deferred")
- Changing plan structure → STOP (update plan.md first)

**Recovery:**

1. Acknowledge the deviation
2. Return to current task
3. Document in implementation.md

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**

- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future phases:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Route Loading Contract

Do not read every implementation reference at skill start. Load exactly one
route when execution reaches it, complete that route, then return here to select
the next route. The shared dispatch skill and its one active-provider reference
remain mandatory before any launch.

| When                                                                                     | Read                                    |
| ---------------------------------------------------------------------------------------- | --------------------------------------- |
| After resolving the active project; before capability, tier, or dispatch resolution      | `references/dispatch-and-dry-run.md`    |
| After dispatch preflight succeeds; before plan validation or resume                      | `references/plan-and-resume.md`         |
| When the next incomplete phase or parallel group is ready                                | `references/phase-execution.md`         |
| Only after phase execution completes, or when handling a terminal blocker/final closeout | `references/completion-and-closeout.md` |

Rules:

- Never preload a later route "for context."
- Re-enter this router after each route reaches its terminal condition.
- A phase implementer receives only its Phase Scope and role contract; it does
  not receive these root-workflow references.
- Optional nested workers receive only their bounded scope and relevant
  repository context.
- Reviewers receive only the bounded review scope, commit range, allowed files,
  and review artifact contract. They do not read this implementation skill.
- Preserve every invariant in the routed references; progressive disclosure
  changes loading order, not behavior.

### Execution Order

1. Resolve the active project below.
2. Load `references/dispatch-and-dry-run.md`; stop there for a completed dry run.
3. Load `references/plan-and-resume.md` and resolve the next execution boundary.
4. Load `references/phase-execution.md` once per ready phase/group, returning to
   the plan/resume route until all phases complete.
5. Load `references/completion-and-closeout.md` only for blockers, completion,
   final verification/review, approval sequencing, and handoff.

### Implementation-Tail Project Recap

The final-closeout orchestrator owns one project-recap gate. Run this recap gate after the final code review has passed and configured pre-approval summary/document steps have completed, but before final HiLL approval. Preserve the stored order of all other pre-approval steps and the existing final review sequence; the recap gate does not replace or repeat either.

Before generating, inspect the active project's explainer runs. A fresh `project-recap` manifest for the current completed implementation deduplicates the lifecycle-tail run: reuse it and do not invoke the adapter again. Fresh means the manifest identifies recipe `project-recap`, belongs to this project, has a terminal outcome, and its recorded source hashes match the current approved implementation inputs. A merely present, incomplete, wrong-recipe, or stale manifest does not satisfy this check.

Resolve recap intent through `oat-explainer-kit`. When `OAT_AUTONOMOUS=1` and no fresh recap exists, attempt `project-recap` exactly once; missing or stale persisted intent cannot suppress this autonomous attempt. Interactive mode honors the adapter's resolved persisted or workflow intent.

Invoke the `oat-explainer-kit` adapter first, then run its shared tracked-run finalizer in `dedicated` mode for a successful build. Use the adapter result and finalizer result as returned; do not improvise commits, durability evidence, or reruns. Outcomes `failed` and `built-not-durable` are recorded warnings, never blockers for final HiLL approval, completion reporting, or later PR steps.
Supply the provider-neutral critic callback (or validated critic module entry point for JSON/CLI invocation) on every federated adapter run.

Always include the selected or attempted recap's outcome and run path in the
implementation completion report. If `summary.md` exists, append or refresh its
single concise `Explainer Outcome` section using the manifest and build record;
never append a second outcome section. If no recap was attempted or reused,
leave the summary unchanged.

## Success Criteria

- One exact target-pinned phase implementer directly executed each phase's
  tasks in dependency order
- Each planned task produced exactly one verified bounded commit
- Root dispatched exactly one accepted phase reviewer per review round
- Blocking findings returned to the original phase handle when resumable
- Optional nested dispatch was absent by default and fully evidenced when used
- Only plan-declared phase worktrees ran in parallel
- TDD discipline followed
- Each task result and commit was verified against HEAD and its file boundary
- Implementation.md tracks all progress
- Final verification passes
- Final review passes (no Critical/Important findings)
- No unresolved blockers
