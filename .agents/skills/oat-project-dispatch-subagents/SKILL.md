---
name: oat-project-dispatch-subagents
version: 1.1.0
description: Use when an OAT project lifecycle skill needs to translate project state, phase or task scope, gates, and write authority into a provider-neutral subagent dispatch.
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Bash
---

# Dispatching OAT Project Subagents

Use this internal adapter for OAT project lifecycle delegation. It resolves
project policy and lifecycle authority, then invokes `oat-dispatch-subagents`
for provider selection, launch, recovery, and generic evidence.

## Progress Indicators (User-Facing)

This skill is an internal dependency; the calling project lifecycle skill owns
progress indicators and decides whether a sub-banner is useful. When surfacing
a distinct project dispatch wave, use:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ PROJECT SUBAGENT DISPATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not repeat the banner for every task. Return a compact project-scope and
dispatch summary for the caller to incorporate.

## Required Loading

Resolve and read `oat-dispatch-subagents` from the active skill catalog before
every lifecycle dispatch. Follow its provider-reference loading rule and
request/record contract. Do not copy provider mechanics into this adapter.

If the engine skill is unavailable, stop before project mutation or child
launch and tell the user to install the utility pack at the matching scope:

```bash
oat tools install utility --scope project
```

Use `--scope user` when workflows are intentionally user-scoped. Do not fall
back to duplicated inline dispatch logic.

## Ownership Boundary

This adapter owns:

- active project, workflow mode, phase, and task scope resolution;
- project and phase dispatch policy and named ceiling resolution;
- lifecycle role policy, gates, task IDs, write roots, commits, and worktrees;
- translation into a generic dispatch request;
- project-specific outcome bookkeeping layered on the generic record.

The general dispatch skill owns capability, authorization, catalogs,
candidate intersection, route selection, launch acceptance, continuation, and
recovery. Calling lifecycle skills still own sequencing, plan mutation,
cross-task synthesis, user checkpoints, and final artifact writes.

## Resolve Project Context

Resolve a user-supplied project path first. Otherwise use the active project.
Read state through the OAT CLI source of truth rather than ad-hoc YAML parsing:

```bash
oat project status --project-path "$PROJECT_PATH" --json
```

Before dispatch, establish:

- project path, workflow mode, current phase, and phase status;
- lifecycle scope such as phase ID or `pNN-tNN` task ID;
- declared dependencies and parallel group, when applicable;
- task file boundary, required verification, and write authority;
- worktree and commit expectations;
- configured HiLL, phase-review, and lifecycle-gate requirements;
- effective dispatch policy and named ceiling.

If project state cannot be resolved or conflicts with the requested lifecycle
scope, block before invoking the general engine.

## Resolve Dispatch Policy

Use the current OAT CLI resolver contract for the active provider and
lifecycle role. Do not duplicate dispatch matrices or parse configuration
layers directly. Preserve the resolver's exact candidate selectors and
provider arguments.

Project policy may cap or select a target. Translate the resolved policy and
ceiling into the generic request; do not ask the general engine to read
`state.md` or infer project configuration.

Configured project policy is standing, scope-bound route authorization. When
the resolver selects a CLI/programmatic or cross-runtime route, pass it to the
general engine with `selection_source: policy-resolved` and evidence of the
owning project, phase/task, provider, lifecycle role, policy/ceiling, and exact
route. Do not ask the user to re-authorize that route for each task.

Prefer native dispatch when it satisfies the resolved contract, but do not
replace a required policy-resolved route merely because a weaker native surface
exists. Cursor task subagents are a representative case: project policy may
route through the Cursor CLI/programmatic surface when native model
availability cannot satisfy the selected target. Configured cross-family gates
use the same policy-resolved tier. Ambient CLI availability and stale
conversational approval are never project policy.

## Lifecycle Roles

Map each lifecycle role to a generic baseline class and add project policy:

| Lifecycle role             | Generic class | Project-specific contract                                                                                                                |
| -------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Phase coordinator          | `coordinator` | Own one phase dossier. Prefer an explicit suitable native target; inherit only when the root/session target is deliberately suitable.    |
| Task worker                | `worker`      | Own one task and bounded files. Use an explicit native or pre-selected alternate target; never silently inherit an expensive root model. |
| Fix worker                 | `worker`      | Own listed findings and bounded files. Preserve retry/fix-loop limits and original task context.                                         |
| Planning self-review       | `reviewer`    | Inherit the planning parent by default unless the plan-writing contract requires an exact independent reviewer.                          |
| Implementation self-review | `reviewer`    | Target the resolved reviewer ceiling; inherit only when the review-owning dispatcher is known to satisfy it.                             |
| Phase gate                 | `reviewer`    | Use the configured independent target and fail closed when unavailable.                                                                  |
| Lifecycle gate             | `reviewer`    | Stay independent of producer context and fail closed rather than substituting same-context self-review.                                  |

The calling lifecycle skill remains authoritative when its reviewed contract
is stricter than this table.

## Adapt the Request

For every lifecycle dispatch:

1. Validate project state and requested phase/task scope.
2. Resolve lifecycle role policy, provider, named ceiling, and exact
   configuration through current CLI interfaces.
3. Define objective, bounded files or read scope, expected output,
   verification evidence, escalation conditions, authority, deadline, retry
   limit, and fallback.
4. Map the lifecycle role to a generic class.
5. Add project metadata without replacing neutral request fields.
6. Add `selection_source: policy-resolved` plus owning configuration evidence
   for every configured non-native route.
7. Invoke `oat-dispatch-subagents` with the complete request.
8. Preserve its generic dispatch record unchanged.
9. Add lifecycle outcome metadata and let the calling workflow perform state,
   plan, implementation-log, commit, or review-table writes.

Example adapter input:

```yaml
project_path: .oat/projects/shared/example
project_mode: quick
project_phase: implement
scope: p01-t02
lifecycle_role: task-worker
file_boundary:
  - packages/cli/src/example.ts
verification:
  - pnpm --filter @open-agent-toolkit/cli test
commit_policy: one-commit-per-task
worktree: root
```

Example namespaced metadata added to the generic request:

```yaml
project:
  path: .oat/projects/shared/example
  mode: quick
  phase: implement
  phase_id: p01
  task_id: p01-t02
  file_boundary:
    - packages/cli/src/example.ts
  commit_policy: one-commit-per-task
  worktree: root
```

## Coordinator and Worker Topology

Use a phase coordinator only when the lifecycle workflow declares that
topology. A coordinator may dispatch task workers when nesting and authority
permit it, but it must not widen task boundaries, alter plan sequencing, or
take over user checkpoints.

For parallel groups, preserve plan-declared isolation. Each worktree receives
only its assigned phase/task boundaries and must not mutate sibling worktrees.
The root lifecycle workflow retains merge ordering and conflict resolution.

## Gates and Independence

Gate independence is project policy layered on the generic reviewer class.
Resolve the configured gate target before launch and pass it as exact selection
input. If the required independent target cannot be enforced, block the gate;
do not silently downgrade to producer-context review.

Treat gate artifacts, receive eligibility, and lifecycle disposition as caller
concerns. The dispatch engine returns evidence and output but does not mutate
review tables or project state.

## Lifecycle Record Extension

Preserve the generic record and attach project metadata separately:

```yaml
project_dispatch:
  project_path: .oat/projects/shared/example
  workflow_mode: quick
  phase: implement
  phase_id: p01
  task_id: p01-t02
  lifecycle_role: task-worker
  file_boundary:
    - packages/cli/src/example.ts
  worktree: root
  commit_policy: one-commit-per-task
  gate_requirement: none
generic_dispatch_record: dispatch-unique-id
lifecycle_outcome:
  task_status: complete
  verification_status: passed
  commit: abc1234
```

Do not rewrite generic route, selector, acceptance, outcome, or diagnostic
fields inside the lifecycle extension.

## Failure Boundaries

- Invalid or stale project state: block before generic dispatch.
- Scope outside the plan or assigned worktree: block and return to the caller.
- Incomplete resolver result: do not invent a target; surface the diagnostic.
- Generic pre-start rejection: apply caller retry policy through the general
  engine.
- Accepted child failure: return the terminal outcome to the lifecycle caller;
  do not select a replacement automatically.
- Required gate target unavailable: fail closed.
- Verification or commit failure after worker completion: lifecycle caller owns
  repair and bookkeeping; do not falsify the child outcome.
