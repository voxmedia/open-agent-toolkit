---
title: Implementation Execution
description: 'Phase coordination, exact task-worker dispatch, named maximum ceilings, reviews, bounded fixes, plan-declared parallel worktrees, and resumption in oat-project-implement.'
---

# Implementation Execution

This page describes how `oat-project-implement` executes a plan after planning
has established a complete ordered candidate ladder and a project named
ceiling.

## Quick Look

- **Phase boundary:** one phase coordinator owns dependency order, integration,
  and the phase summary.
- **Task boundary:** the coordinator dispatches one exact task worker per task.
  Each worker receives one bounded Task Scope and creates one verified commit.
- **Named maximum:** a project or narrower phase named ceiling is a maximum over
  configured candidates, not an exact model-family preference.
- **Serial worktree rule:** task workers run serially in the same worktree.
  Parallelism is limited to plan-declared phase worktrees.
- **Fail closed:** a missing, above-ceiling, or uninvokable managed candidate
  blocks. OAT does not substitute the coordinator target, a base role, or a
  provider default.

## Execution Layers

### Reusable dispatch boundary

OAT ships two internal contracts for lifecycle skills that need subagents:

- `oat-project-dispatch-subagents` translates resolved project, phase/task,
  gate, write-boundary, commit, and worktree policy into a generic dispatch
  request.
- `oat-dispatch-subagents` performs provider-neutral capability and
  authorization checks, catalog-aware selection, launch evidence, and
  recovery.

The project adapter composes with the general engine; the engine never reads
project state. Lifecycle callers remain responsible for phase scheduling,
task boundaries, review and fix-loop policy, project artifacts, commits, and
worktree fan-in. This is the extension contract for lifecycle dispatch—not a
license for the general engine to mutate project bookkeeping or reinterpret
worker results. Individual lifecycle skills may adopt the contract
incrementally; their own reviewed process contracts remain authoritative until
that wiring is explicit.

### Orchestrator

The root `oat-project-implement` workflow resolves project state, chooses Tier
1 or Tier 2 mechanics, builds the phase schedule, dispatches coordinators and
reviewers, owns the review/fix loop, updates artifacts, and performs worktree
fan-in.

### Phase coordinator

A Phase Scope selects coordinator mode in `oat-phase-implementer`. The
coordinator reads the phase artifacts once, retains task dependency order,
selects one exact configured target for each task, waits for and verifies every
worker result and commit, then performs phase-wide integration verification and
self-review.

The coordinator must not implement ordinary plan tasks itself. Its execution
target is not a task target and cannot be reused as a fallback.

### Task worker

A Task Scope selects worker mode in the same canonical agent instructions. The
worker implements exactly one task, runs that task's verification, creates one
commit, returns a compact result, and stops. It does not dispatch another worker
or coordinate the phase.

This dual-mode contract lets every materialized Codex
`oat-phase-implementer-<model>-<effort>` role act as either the coordinator or
the exact bounded worker without recursive coordinator dispatch.

## Tier Selection

At skill start, OAT detects whether the host can run the coordinator,
task-worker, and reviewer routes:

- **Tier 1:** native provider subagent dispatch.
- **Tier 2:** guarded sequential coordinator mechanics when native role
  selection is unavailable.

Tier 2 does not authorize inline task implementation by the coordinator. A
managed task still requires an exact registered role, an exact provider model
argument, or a fresh Codex child pinned to the resolver-returned model and
effort. If the current context cannot dispatch that worker, implementation
blocks.

Codex may require one explicit authorization prompt for multi-agent dispatch.
That approval covers coordinators, task workers, and reviewers for the run. Tier
mechanics remain locked after selection; they never change the target contract.

## Dispatch Readiness

Planning through spec-driven, quick-start, import-plan, or provider-plan-via-
import performs the same readiness setup:

1. Inspect the effective ordered candidate ladders.
2. If incomplete, show the complete bundled recommendation and ask whether
   `--shared`, `--local`, or `--user` should own adoption.
3. Recheck after non-destructive adoption. Remaining gaps block readiness.
4. Record the active project named maximum in project `state.md`, not user
   config.
5. Optionally record a narrower phase named maximum in plan Dispatch Profile.

See [Dispatch Policy](dispatch-ceiling.md) for ladder shapes and ownership.

### Validating plan metadata

Before building the phase schedule, implementation validates plan parallelism:

```bash
oat project validate-plan --project-path .oat/projects/shared/example
```

The command rejects malformed groups, unknown phase IDs, duplicate membership,
and singleton groups. Invalid metadata blocks execution rather than silently
falling back to a different schedule.

Before phase work, implementation runs provider preflight:

```bash
oat project dispatch-ceiling resolve \
  --provider <active-provider> \
  --preflight \
  --json
```

An unresolved non-interactive preflight blocks. Managed `Uncapped` and
`Inherit Host Defaults` are explicit modes; omitted policy state is not an
implicit fallback.

For a managed Codex implementer, preflight also resolves the effective
`agents.max_depth`. Native `root (0) → phase coordinator (1) → task worker (2)`
execution requires a depth of at least `2`. Missing, invalid, or lower values
block before dispatch and identify the owning scope:

- Project scope: run `oat sync --scope project`
- User scope: run `oat sync --scope user`
- Single-role repair: rerun `oat providers codex materialize` with the required
  agent name, model, effort, and matching scope

Project preflight may inherit a valid higher user depth, but remediation never
writes across the project/user boundary.

## Resolve the Effective Named Maximum

For each phase, the orchestrator determines the task maximum:

1. Read project `state.md:oat_dispatch_policy.policy`.
2. Read the phase's optional Dispatch Profile row.
3. An explicit `economy`, `balanced`, `high`, or `frontier` phase value narrows
   the project maximum and records `task_ceiling_source: phase`.
4. Blank, absent, or `auto` uses the project maximum and records
   `task_ceiling_source: project`.
5. Reject an unknown phase tier or one above the project maximum.

Under a High maximum, configured Economy, Balanced, and High candidates remain
eligible. Different tasks in the same phase can therefore use different lower
candidates without changing project state.

## Phase Scope

The orchestrator sends one coordinator a Phase Scope:

```yaml
project: .oat/projects/shared/example
phase: p02
mode: implement
artifact_paths:
  plan: .oat/projects/shared/example/plan.md
  design: .oat/projects/shared/example/design.md
  implementation: .oat/projects/shared/example/implementation.md
workflow_mode: quick
active_provider: codex
project_ceiling_tier: high
phase_ceiling_tier: balanced
task_ceiling_tier: balanced
task_ceiling_source: phase
commit_convention: 'feat({scope}): {description}'
coordinator_target: oat-phase-implementer-gpt-5-6-terra-high
```

The coordinator target starts the coordinator only. It is never inherited by a
task.

## Per-Task Selection

For every task in dependency order, the coordinator classifies only that
bounded task, chooses one exact candidate at or below the named maximum, and
calls the resolver with invocation-only `--ceiling-tier`.

```bash
# Codex
oat project dispatch-ceiling resolve \
  --provider codex \
  --role implementer \
  --ceiling-tier balanced \
  --candidate-model gpt-5.6-terra \
  --candidate-effort medium \
  --project-path .oat/projects/shared/example \
  --json

# Claude
oat project dispatch-ceiling resolve \
  --provider claude \
  --role implementer \
  --ceiling-tier balanced \
  --candidate-model sonnet \
  --json

# Cursor
oat project dispatch-ceiling resolve \
  --provider cursor \
  --role implementer \
  --ceiling-tier balanced \
  --candidate-model 'opaque:model/balanced [v2]' \
  --json
```

The override accepts `economy`, `balanced`, `high`, or `frontier`. It applies
only to that resolver call and never writes config or project state. JSON
reports `source: invocation` while `providers.<provider>.cellSource` identifies
the config layer that owns the candidate.

The coordinator requires the requested candidate, `selection.candidateTier`,
`selection.ceilingTier`, exact target, and dispatch arguments to agree. A
candidate above the maximum or absent from the configured ladder blocks.

## Exact Provider Invocation

Build the complete host payload before writing dispatch logs:

- **Codex:** use `providers.codex.dispatchArgs.variant` as the actual
  `agent_type`. An accepted launch with that exact materialized role is
  authoritative evidence of the configured invocation for coordinators and
  task workers. A fresh Codex child pinned to `selection.target.model` and
  `selection.target.effort` is permitted only after an actual native
  role-selection rejection; missing self-reporting or model/effort telemetry
  does not justify the fallback. An accepted child, including one that later
  returns `BLOCKED`, is a task outcome and never triggers another pinned-child
  fallback.
- **Claude:** pass `providers.claude.dispatchArgs.model` as the actual Task
  `model`. Its separate effort axis is `not-applicable`.
- **Cursor:** pass `providers.cursor.dispatchArgs.model` byte-for-byte as the
  actual invocation model. The string is opaque; do not normalize it or infer
  family, effort, cost, or capability from its spelling. That opaque value is
  the enforced model argument.

If exact controls cannot be applied, fail closed. A transient retry reuses the
same complete provider payload. Substantive escalation re-resolves another
configured candidate within the same named maximum and bounded retry budget.

## Dispatch Reports During Execution

Every implementation, fix, and review resolver call supplies explicit report
context:

```text
--report-scope <phase-or-task> --report-action <implementation|fix|review>
```

The completed JSON must contain `dispatchReport.schemaVersion: 1` before the
provider invocation begins. The coordinator reads the requested candidate,
candidate tier, ceiling, exact selected target, requested controls, configured
defaults, and runtime identity from that report as distinct fields. It does not
infer any of them from a materialized role name or opaque Cursor string.

The human dispatch block is rendered from the report. The formal `Dispatch:`
line is a compatibility view derived from the same report through the dispatch
stamp adapter. It is not a second schema and must not be assembled by hand.
Configured defaults and configured gate invocation remain distinct from runtime
identity; when runtime identity is not observed, the report says so without
weakening exact requested model or effort controls.

After constructing the complete payload, the launcher records the selected
target and requested model/effort controls in the report. Those configured
invocation fields are launcher-owned and derive from resolver output plus the
actual payload; worker output cannot populate or overwrite them. Optional
coordinator or worker self-report remains non-authoritative runtime evidence.
Runtime attestation, when available, is separate host-generated metadata rather
than an agent claim.

## Task Scope and Commit Verification

Each worker receives only one task:

```yaml
mode: task-worker
task_id: p02-t03
task_name: Add correlation validation
task_plan: |
  Implement only p02-t03 using its RED/GREEN steps.
file_boundary:
  - packages/cli/src/commands/gate/index.ts
  - packages/cli/src/commands/gate/index.test.ts
verification:
  - pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
commit_convention: 'feat(gate): validate correlation'
ceiling_tier: balanced
ceiling_source: phase
dispatch_target: oat-phase-implementer-gpt-5-6-terra-medium
dispatch_args:
  agent_type: oat-phase-implementer-gpt-5-6-terra-medium
```

The Task Scope never contains the whole phase task list. Before dispatch, the
coordinator records `PRE_TASK_HEAD`. After the worker returns, it verifies:

- returned task ID and terminal result
- verification status
- reported commit equals current `HEAD`
- exactly one new commit follows `PRE_TASK_HEAD`
- changed paths stay inside `file_boundary`
- the worktree is clean

Only then does it select the next candidate. Workers run one at a time,
serially in the same worktree.

## Phase Integration and Review

After all task commits are verified, the coordinator runs phase-wide
verification and integration self-review without editing ordinary task files.
Its summary records each task's exact target, result, commit, and verification.

The root orchestrator then dispatches the phase reviewer:

- A capped managed reviewer uses the final candidate at its configured review
  ceiling.
- Codex uses the exact materialized reviewer role or a fresh pinned child.
- Claude and Cursor bind the exact resolver-returned model argument.
- Managed `Uncapped` and explicit inherit/default retain their documented base
  reviewer behavior.
- Timeout retries preserve the exact role or complete model payload.

Inline review is allowed only with verified equivalent current-host model and
effort controls. That exception is limited to explicit inherit or
managed-uncapped base-role behavior; capped managed review never downgrades
inline. If a review timeout occurs, retry once with the same exact role or
pinned model payload. If exact dispatch still cannot conclude, fail closed and
block.

The review commit range is authoritative. Zero Critical and zero Important
findings pass; otherwise the bounded fix loop begins.

## Bounded Fix Loop

`oat_orchestration_retry_limit` defaults to `2` and accepts `0` through `5`.
For each retry:

1. Group findings into bounded one-task fix scopes.
2. Reuse the phase coordinator in fix mode.
3. Resolve one exact candidate per fix under the same named maximum.
4. Dispatch and verify one fix worker at a time.
5. Re-dispatch the reviewer over the updated range.

The coordinator does not apply fixes itself. Retry exhaustion stops sequential
execution; in a parallel phase group, the failed phase is excluded and its
worktree is preserved for diagnosis.

## Plan-Declared Parallelism

Parallelism applies across independent phases, not tasks in one worktree:

```yaml
oat_plan_parallel_groups: [['p02', 'p03'], ['p04', 'p05']]
```

- One worktree and one coordinator are created per phase.
- Coordinators in separate declared worktrees may run concurrently.
- Every coordinator still dispatches its task workers serially.
- Phases outside groups run sequentially in plan order.
- Groups themselves fan in before the next group starts.

### Parallel group flow

1. Bootstrap each worktree with `oat-worktree-bootstrap-auto` from the current
   orchestration HEAD.
2. Verify every worktree HEAD before dispatch. Any bootstrap/base mismatch
   degrades the whole group to sequential target-preserving execution.
3. Dispatch one phase coordinator per worktree.
4. Wait for terminal phase results.
5. Merge passing phases back in plan order with integration verification after
   each merge.
6. Preserve excluded worktrees and record them in Outstanding Items.
7. Clean merged worktrees, commit bookkeeping, then evaluate HiLL checkpoints.

If merge and cherry-pick both conflict, the orchestrator dispatches a bounded
conflict-resolution subagent. It does not resolve the conflict in the root
context. An unresolved or verification-failing conflict stops fan-in.

## Phase Review Gate and HiLL

Phase gate review is independent from HiLL: a configured passing gate continues
automatically, while a HiLL checkpoint pauses for human approval. For the final
phase, approval-aware post-implementation sequences run pre-approval work only
after final review and post-approval work only after the recorded approval.

After standard review passes and bookkeeping is committed, an enabled
`oat_phase_review_gate` may run a target-neutral external review for the phase.
Passing artifacts are still received for durable disposition; blocking
findings return through the bounded fix loop. Reusable lifecycle gate commands
declare the project but do not pin a provider target.

HiLL pauses remain phase boundaries. They run only after the phase or parallel
group is integrated, reviewed, and tracked.

## Dry Run

```bash
oat-project-implement --dry-run
```

Dry-run performs preflight and plan validation, resolves the phase schedule and
named maxima, and prints planned coordinator/worktree routing. It does not
dispatch coordinators or workers, create worktrees, or modify files.

## Resumption

On re-invocation:

1. Read `implementation.md`, `plan.md`, and `state.md`.
2. Advance a stale pointer to the first incomplete task.
3. Cross-check the latest bookkeeping commit with Git.
4. Resume an incomplete coordinator at the next unverified task commit.
5. Re-dispatch a missing phase reviewer for the current committed phase range.
6. Report leftover parallel worktrees before resuming or cleaning them.

The one-task commit boundary lets resumption distinguish completed work from an
unverified worker return without rerunning the whole phase.

## State and Artifact Updates

After a phase or parallel group completes, `oat-project-implement` updates:

- `implementation.md`: task outcomes, exact targets, commits, verification,
  phase summary, review results, and deviations
- `plan.md`: task status and review lifecycle
- `state.md`: current task, last commit, phase status, and timestamp

It creates a separate bookkeeping commit after implementation commits. Legacy
`oat_execution_mode: subagent-driven` is ignored and removed on the next write.

## Related

- [Dispatch Policy](dispatch-ceiling.md) - candidate ladders, named maxima, and
  exact provider resolution.
- [Lifecycle](lifecycle.md) - implementation in the full project flow.
- [Artifacts](artifacts.md) - plan/state shapes and parallel groups.
- [Reviews](reviews.md) - standard and external phase reviews.
- [HiLL Checkpoints](hill-checkpoints.md) - phase pause semantics.
