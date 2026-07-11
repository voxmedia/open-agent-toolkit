---
id: BL-260711-add-root-owned-dispatch-broker
title: 'Add root-owned dispatch broker for exact OAT subagent launches'
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - orchestration
  - subagents
  - codex
  - dispatch
  - provenance
  - sandboxing
assignee: null
created: '2026-07-11T00:25:15Z'
updated: '2026-07-11T00:25:15Z'
associated_issues: []
oat_template: false
oat_template_name: backlog-item
---

## Description

Add a root-owned dispatch broker so an OAT phase coordinator can request an
exact task-worker launch without starting a nested provider process inside the
coordinator's sandbox. The root orchestrator should remain the sole owner of
provider invocation, exact target materialization, sandbox selection, and
launch provenance. The phase coordinator should retain responsibility for
task classification, bounded scope construction, result validation, phase-wide
verification, and phase aggregation.

This item was discovered while implementing
`dispatch-schema-matrix-infrastructure` on 2026-07-10/11. The intended Codex
topology was:

```text
root
└── exact phase coordinator
    └── exact task worker
```

The root successfully launched the exact phase coordinator
(`gpt-5.6-sol`/`high`) as a fresh `codex exec` process under
`workspace-write`. The coordinator then attempted to launch an exact pinned
task worker under `workspace-write`. Both nested launches failed before model
sampling with:

```text
could not create PATH aliases: Operation not permitted
failed to initialize in-process app-server client: Operation not permitted
```

The comparison worktree `post-implementation-sequencing` had appeared to prove
the same topology worked, but transcript inspection showed that it did not use
a separate phase-coordinator process. Its root Codex TUI ran with
`danger-full-access` and directly launched exact CLI-pinned task workers with
`--sandbox workspace-write`, `--ignore-user-config`, `--ignore-rules`, and
`--ephemeral`. This explains why the task workers initialized there: the
process performing the launch was not itself confined to `workspace-write`.

Two native delegation smoke tests narrowed the remaining capability boundary:

1. After setting `agents.max_depth = 2`, native root → coordinator → leaf
   delegation succeeded and returned `DEPTH_TWO_OK`. Recursive delegation is
   therefore available and the depth setting is active.
2. A no-write exact-role smoke test requested
   `oat-phase-implementer-gpt-5-6-sol-high`. The exposed orchestration spawn
   interface did not provide an explicit agent-role/type argument, and the
   isolated run returned a semantic failure rather than spawning the requested
   custom role. Current Codex documentation says Codex supports named custom
   agents and identifies them by name, so this should be treated as a host/tool
   integration and deterministic-selection gap, not as proof that Codex lacks
   custom-agent support.

The discussion evaluated four approaches:

- **Root-owned dispatch broker (recommended):** the coordinator sends a
  structured dispatch request to the root; the root resolves and launches the
  exact restricted worker and returns a launch receipt plus terminal result.
- **Launcher-owned provenance (required companion):** workers report task
  outcomes, not their own authoritative model/effort identity. Requested
  target, actual provider arguments, sandbox, session/thread identity, and
  exit status come from the trusted launcher. Worker self-report remains
  advisory runtime-observed identity only.
- **Eliminate the separate coordinator (fallback):** the root performs phase
  coordination and launches exact restricted workers directly. This is proven
  and simple, but loses the coordinator's context-isolation benefit.
- **Broaden coordinator permissions (last resort):** run the coordinator with
  `danger-full-access` so nested exact CLI workers can initialize. This
  preserves the process topology but gives the coordinator unnecessarily broad
  access and remains dependent on brittle process-inside-process behavior.

For the blocked `dispatch-schema-matrix-infrastructure` project, the user
explicitly authorized an immediate execution deviation: skip the separate
phase coordinator and task workers, and let the current root session implement
the planned tasks directly. That project-local unblock must not be mistaken for
resolution of this backlog item or silently generalized into the OAT workflow.

## Acceptance Criteria

- OAT defines a structured coordinator-to-root dispatch request containing the
  phase/task ID, bounded task scope, exact resolver-returned target, complete
  provider invocation arguments, file boundary, verification commands, retry
  identity, and requested sandbox.
- The root dispatch broker validates the request against the active project,
  named maximum, resolver output, and task boundary before launching anything.
- For managed Codex dispatch, the broker selects the exact registered custom
  agent when the host exposes deterministic named-role selection; otherwise it
  uses the existing exact model/effort pinned fresh-child route without running
  that child from inside a restricted coordinator.
- Claude and Cursor broker adapters preserve their exact model arguments;
  Cursor candidate strings remain opaque and byte-preserved.
- The broker returns a machine-readable launch receipt with requested target,
  actual provider arguments, sandbox/approval mode, session or thread identity,
  timestamps, exit status, and terminal result correlation.
- Dispatch provenance is launcher-owned. Task-worker reports cannot overwrite
  requested invocation provenance, configured policy/defaults, gate invocation
  metadata, or the launch receipt. Worker-observed/self-reported producer
  identity is stored separately with explicit provenance.
- Phase coordinators retain task classification, scope construction, serial
  task ordering within a worktree, result/file-boundary/commit verification,
  phase-wide verification, and phase aggregation, but do not require broad
  filesystem permissions or directly initialize nested provider app servers.
- Capability preflight distinguishes at least: recursive depth unavailable,
  deterministic named-role selection available, exact CLI broker fallback
  available, and no target-preserving route available. It fails before task
  edits when no safe exact route exists.
- A documented root-direct fallback preserves exact dispatch and phase
  bookkeeping when the broker protocol is unavailable; it is recorded as an
  execution deviation rather than presented as the normal topology.
- `danger-full-access` for a coordinator is not the default fallback. If a
  narrow writable-root configuration can support nested initialization, it is
  separately investigated and documented, but nested provider processes are
  not required for workflow correctness.
- Reproducible tests cover root → coordinator → worker depth, exact named-role
  selection, brokered exact CLI fallback, sandbox inheritance/override
  behavior, launch failure before sampling, retry correlation, forged worker
  identity, and provider-specific argument preservation.
- Implementation and troubleshooting documentation includes the observed
  `Operation not permitted` failure, the successful unrestricted-root →
  restricted-worker comparison, `agents.max_depth` semantics, and a decision
  table for native selection, broker fallback, root-direct fallback, and
  terminal blocking.
