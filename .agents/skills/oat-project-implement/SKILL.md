---
name: oat-project-implement
version: 2.3.4
description: Use when plan.md is ready for execution. Dispatches one phase implementer per phase, owns independent phase review and bounded fix routing, and supports plan-declared worktree-isolated parallel phases.
oat_gateable: true
argument-hint: '[--retry-limit <N>] [--dry-run]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(oat:*), Bash(oat project log:*), Glob, Grep, AskUserQuestion, Task
---

# Implementation Phase

Execute the implementation plan task-by-task with full state tracking.

## Prerequisites

**Required:** Complete implementation plan. If missing, run the `oat-project-plan` skill first.

## Shared Subagent Dispatch Contract

Before launch, independently probe each required `<name>/SKILL.md` in order:
`${SKILL_DIR}/..` from this loaded skill, `${HOME}/.agents/skills`, then
`<repo-root>/.agents/skills`. Bind each first match to its own root:
`${PROJECT_DISPATCH_SKILLS_ROOT}` for `oat-project-dispatch-subagents`,
`${DISPATCH_SKILLS_ROOT}` for `oat-dispatch-subagents`, and
`${ORCHESTRATION_SKILLS_ROOT}` for `subagent-orchestration`; never ambient
discovery. On a miss, name it, stop every implementation, fix, or reviewer
dispatch, and give its intended-scope recovery command:

- `oat-project-dispatch-subagents`: `oat tools install workflows --scope <user|project>` or `oat tools update --pack workflows --scope <user|project>`.
- `oat-dispatch-subagents` or `subagent-orchestration`: `oat tools install utility --scope <user|project>` or `oat tools update --pack utility --scope <user|project>`.

Read `${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`, then `${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`; both are mandatory in order. Display structured resolver notices before every implementation, fix, or reviewer launch. Runtime disclosure uses the effective resolved target, never the bundled recommendation version. Correctness must not require restart or hot reload.
Read `${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md`.
After resolving `ACTIVE_PROVIDER`, read exactly one active-provider selection
reference there: the named `provider-cursor.md`, `provider-codex.md`, or
`provider-claude.md` match. Then read the matching mechanics reference from
`${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/references/`. Do not merge them.

## Project Log Append Points

Defer entry flags to `oat project log append --help`; never pre-check config:
the helper no-ops when the feature is off.

**Never append while a dispatched child owns the worktree.** The tracked log
dirties the tree that the child's preflight and per-task commit checks require
to be clean; each append is committed by the bookkeeping that owns it.

- After every accepted subagent dispatch, record the acceptance in the generic
  dispatch record at `$PROJECT_PATH/implementation.md#<run-anchor>`;
  never mirror that record. Do not write the project log at acceptance; append
  it with the phase-outcome entry after the child's report returns.
- Implementing a phase in the root during a Tier 1 run is a deviation, never a
  silent default: record the phase ID, reason, and root model under a sibling
  `Root-inline phase` heading at that run anchor. Sanctioned Tier 2 needs none.
- Before validating the review artifact or updating project bookkeeping, consume
  exactly one brief artifact-mode confirmation of reconnaissance:
- `**Reconnaissance:** attempted`
- `**Reconnaissance:** not-attempted`
  Missing, duplicate, or invalid signals are incomplete-artifact errors: stop
  and fail closed before validation, bookkeeping, or logging.
- For `attempted`, require complete `## Review Orchestration` evidence. After
  validation, append exactly once through `oat project log append`, referencing
  the artifact without copying records. Defer that append to the terminal phase
  outcome; appending when the reviewer returns dirties the tree before a fix
  child is dispatched into it.
- For `not-attempted`, the artifact must not contain `## Review Orchestration`;
  do not invoke `oat project log append` or create a log entry.
- Before every STOP or park return, invoke `oat project log append` for a
  structural entry naming the triggering condition.
- After every phase outcome, invoke `oat project log append` for a structural
  entry with the verdict and fix-loop count.
- After every parallel-group merge attempt, invoke `oat project log append` for
  a structural entry with the merge result.

## Autonomy Policy

When `OAT_AUTONOMOUS=1`, read
`references/docs/autonomy-contract.md` and keep `OAT_NON_INTERACTIVE=1` set for
this run. Autonomy-specific behavior is routed with the rest of the workflow:

- delegation authorization: `references/dispatch-and-dry-run.md`;
- HiLL/checkpoint review: `references/plan-and-resume.md`;
- manual/visual proof: `IMPLEMENT-20` in `references/phase-execution.md`;
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

1. Complete pre-commit prevention before writing history.
2. For post-commit defects, follow `oat_phase_recovery_policy` in
   `references/phase-execution.md`, preserving history and the exact target.
3. Record every recovery disposition in `implementation.md`.

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
if [ -n "$PROJECT_PATH" ]; then
  PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing project arrival" >&2; exit 1; }
  if [ "$PROJECT_SCOPE" = "synced" ]; then
    PROJECT_SLUG=$(basename "$PROJECT_PATH")
    if [ -f "$PROJECT_PATH.json" ] || git ls-remote --exit-code origin "refs/oat/projects/$PROJECT_SLUG" >/dev/null 2>&1; then
      oat project pull "$PROJECT_PATH" || { echo "oat: project pull failed for $PROJECT_PATH; resolve the reported state before continuing" >&2; exit 1; }
    fi
  fi
fi
```

The pull runs before directory and `state.md` validation. This materializes an
absent synced checkout when its discovery record or remote ref exists, adopting
the remote ref when the current branch does not yet have a record.

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
- The configured implementation exit gate has an allowed and fresh disposition
  before approval-aware sequencing, completion state, or success output
- No unresolved blockers
