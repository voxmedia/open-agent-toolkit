---
name: oat-project-implement
version: 2.0.38
description: Use when plan.md is ready for execution. Dispatches phase coordinators that select one exact target-pinned worker per task; supports bounded fix loops and plan-declared worktree-isolated parallel phases.
oat_gateable: true
argument-hint: '[--retry-limit <N>] [--dry-run]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion, Task
---

# Implementation Phase

Execute the implementation plan task-by-task with full state tracking.

## Prerequisites

**Required:** Complete implementation plan. If missing, run the `oat-project-plan` skill first.

## Shared Subagent Dispatch Contract

Before resolving or launching any coordinator, task worker, fix worker, or
self-reviewer, read and follow
`.agents/skills/oat-dispatch-subagents/SKILL.md`. This explicit load is
mandatory; do not rely on ambient skill discovery. The shared skill owns
catalog observation, full-information route selection, accepted-launch
terminality, and structured dispatch evidence. This implementation skill
retains lifecycle sequencing, task boundaries, verification, integration, and
approval-aware final closeout.
Correctness must not require a provider restart or hot reload.

After resolving `ACTIVE_PROVIDER`, read exactly one active-provider reference
from `.agents/skills/oat-dispatch-subagents/references/` (`cursor.md`,
`codex.md`, or `claude.md`). Do not merge provider mechanics.

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
- A coordinator receives only its Phase Scope and the coordinator role contract;
  it does not receive these root-workflow references.
- Task workers receive only one exact Task Scope and relevant repository context.
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

## Success Criteria

- One exact target-pinned worker executed each task in dependency order
- The phase coordinator did not implement ordinary task work in its own context
- Same-worktree task workers ran serially; only plan-declared phase worktrees ran in parallel
- TDD discipline followed
- Each task result and commit was verified against HEAD and its file boundary
- Implementation.md tracks all progress
- Final verification passes
- Final review passes (no Critical/Important findings)
- No unresolved blockers
