# Subagent Orchestration Learnings

This reference captures orchestration findings from the
`codex-subagent-max-depth` project and the work required to execute the project
itself. It also incorporates relevant provenance decisions from the archived
`gate-review-provenance-target-safety` project.

The classifications are evidence-based:

- **Confirmed resolution** means the approach worked in this project or is
  already supported by repository tests and artifacts.
- **Potential resolution** means the approach is promising but was not fully
  validated here.
- **Confirmed non-resolution** means the approach was attempted or analyzed and
  did not solve the underlying problem.

## Issues Encountered

### Confirmed Resolutions

#### Codex's default nesting depth is too shallow for OAT

OAT's implementation topology is:

```text
root (depth 0)
└── phase coordinator (depth 1)
    └── exact task worker (depth 2)
```

Codex defaults `agents.max_depth` to `1`. Native coordinator-to-worker
delegation therefore requires the effective configuration to set
`agents.max_depth >= 2`.

The confirmed solution is to enforce the floor in the shared Codex
configuration merge used by both `oat sync` and
`oat providers codex materialize`. The merge must:

- write `2` when the value is missing, invalid, or lower;
- preserve equal or higher values;
- preserve unrelated configuration and custom roles;
- preserve a higher inherited user value when writing project configuration;
- write only the requested project or user scope; and
- remain byte-stable on a converged second run.

Doctor and managed implementation preflight should report insufficient
effective depth before dispatch and explain the required topology.

#### Native nested spawning works under `workspace-write`

The initial failure was attributed to native nesting under `workspace-write`.
Controlled diagnostics disproved that diagnosis. With `agents.max_depth = 2`,
a workspace-write root could spawn a coordinator at depth 1, and that
coordinator could spawn an exact materialized worker at depth 2.

The failure belonged to nested `codex exec`, not native `spawn_agent`.
Consequently, OAT does not need a full-access coordinator merely to support
native depth-2 delegation.

#### Exact native roles can be selected without model self-report

Codex accepted exact materialized roles through native `agent_type`, including
`oat-phase-implementer-gpt-5-6-sol-high` and
`oat-phase-implementer-gpt-5-6-terra-medium`.

The launcher already knows the requested target, model, and reasoning effort
from resolver output and the constructed payload. Spawn acceptance is
authoritative evidence of the configured invocation. A child does not need to
self-report those values, and self-report cannot replace or overwrite the
launcher-owned record.

This retains useful provenance without treating unavailable runtime telemetry
as role-selection failure.

#### Worker write failures can be solved with scoped writable roots

Two native workers initially failed after successful role selection:

- A p01 worker could edit and test code but could not create the shared Git
  metadata `index.lock`, because the repository Git directory was outside its
  writable sandbox.
- A p02 worker could start but could not modify `.agents`, because that managed
  path was read-only.

Relaunching with narrowly scoped writable roots for the shared Git directory
and, only where required, the worktree's `.agents` directory allowed native
workers to complete and commit. The coordinator remained `workspace-write`;
`danger-full-access` was unnecessary.

This confirms that worktree content permissions and shared Git metadata
permissions are separate orchestration concerns.

#### Accepted children returning `BLOCKED` must remain terminal outcomes

An accepted child that later reports `BLOCKED` was successfully selected and
started. Its result is a task or review outcome, not evidence that native role
selection failed.

OAT must preserve the result, stop or enter the review-fix path as appropriate,
and must not launch a second pinned child. This prevents duplicate work and
avoids silently changing execution provenance after a real child ran.

#### Flat phase branch names avoid Git ref collisions

Creating phase branches such as `codex-subagent-max-depth/p01` failed because
the branch `codex-subagent-max-depth` already occupied the conflicting Git ref
namespace. Flat names such as `codex-subagent-max-depth-p01` and
`codex-subagent-max-depth-p02` worked.

Parallel-worktree orchestration should account for Git ref-prefix collisions
when deriving branch names.

#### Package-local commands avoid false test failures

Running the CLI package's Vitest binary from the repository root caused import
alias failures and collected zero tests. Running the same binary from
`packages/cli` loaded the package configuration and passed.

When package aliases or tool configuration are cwd-sensitive, orchestration
must preserve the command's intended working directory. A process exit alone
is not sufficient evidence of a code failure.

#### Existing local binaries are a reliable network-failure fallback

Some coordinator runs triggered `pnpm` fetch attempts that failed in the task
environment. Already-built local CLI and Vitest binaries allowed resolver,
validation, and focused test work to continue without network access.

This fallback was valid only because dependencies and generated assets already
existed and the equivalent commands were recorded explicitly.

#### Serialize asset bundling and duplicate docs builds

Concurrent CLI invocations raced in shared asset-bundling directories and
produced errors such as `rm: Directory not empty`. Serial rebuilding removed
the transient failure.

Similarly, a redundant coordinator-level docs build collided with another
Next.js build's `.next/lock`. The bounded docs worker had already completed the
required full build successfully. Shared generated-output and build directories
must not be treated as safely parallel unless isolation is proven.

#### Gate review needed a longer child-process timeout

A gate wrapper timed out at ten minutes even though the inner reviewer
completed and wrote a valid review artifact. Increasing the default execution
timeout to fifteen minutes better matched observed reviewer duration.

The incident also showed that process timeout and artifact completion are
distinct signals: orchestration should inspect the correlated artifact before
concluding that all review work was lost.

### Potential Resolutions

#### Root-owned dispatch broker

A root broker could retain exact launch control while coordinators submit
structured dispatch requests. The root would launch and monitor a worker,
verify its commit and file boundary, then resume the coordinator with a trusted
receipt.

This would strengthen launcher-owned provenance but requires correlation IDs,
coordinator suspension and resumption, timeout and cancellation behavior, and
bidirectional context relay. It is a spec-driven redesign, not a small fallback
adjustment.

#### Explicit writable-root requirements in dispatch scopes

Task or phase scopes could declare required writable surfaces separately:

- worktree content;
- shared Git metadata;
- managed canonical paths such as `.agents`; and
- generated/build caches.

A preflight could then fail before launch or construct the narrowest sandbox
that satisfies the task. This project validated the underlying technique, but
not a general schema or cross-provider implementation.

#### Host-generated runtime attestations

Launcher-selected/config-declared provenance is sufficient for deterministic
dispatch, but it does not independently prove the runtime model that executed.
A future host-generated attestation could record runtime-confirmed identity
without trusting child self-report.

This should be additive. Absence of runtime attestation must not invalidate a
successfully accepted exact role.

#### Provider-specific Cursor dispatch validation

Codex materialized variants use `agent_type`, while Cursor exposes fixed
subagent profiles and explicit model identifiers rather than Codex's dynamic
role catalogue. The archived provenance work intentionally treats Cursor model
values as opaque configured strings.

Whether Cursor needs additional pinned profiles should be validated against
Cursor's actual launcher behavior. Codex role-materialization conclusions
should not be transferred to Cursor by analogy.

#### Artifact-aware gate completion

Gate execution could reconcile timeout state with a correlated, complete review
artifact before deciding the final outcome. This may recover reviews that
finish near the wrapper deadline, but it requires strict run, project, target,
and artifact validation to avoid accepting stale output.

#### Consolidated dispatch-contract validation

The first p02 review found that the parent implementation skill had been
updated while the canonical phase coordinator and review-provide skill still
contained older fallback language. Shared validation or a single canonical
contract could reduce this distributed-instruction drift.

The current review-fix loop is aligning those surfaces, but the broader
consolidation strategy has not yet been designed or validated.

### Confirmed Non-Resolutions

#### Giving the coordinator `danger-full-access`

Broad coordinator access could make nested CLI processes easier to start, but
it does not address why the native path was skipped. It also expands the trust
boundary and may propagate broader permissions to native children.

Because native nesting works under `workspace-write`, full access is neither
necessary nor the least-privilege solution.

#### Removing sandbox settings from materialized roles

Removing role-level sandbox restrictions and passing `workspace-write` only to
CLI workers changes the design from native delegation to nested process
delegation. It also weakens the safety of any path that still launches those
roles natively.

The coordinator and task worker currently share a dual-mode canonical role, so
changing the role's default sandbox affects both modes.

#### Treating missing self-report as role unavailability

A child cannot provide strong evidence about the launch controls used to start
it. Requiring it to echo model or effort caused OAT to misclassify usable native
roles and enter an unnecessary CLI fallback.

Self-report may be retained as optional diagnostics, but it is not a dispatch
availability probe or authoritative provenance.

#### Falling back after any native child failure

Timeout, permission denial, test failure, or `BLOCKED` after spawn acceptance
does not mean `agent_type` was rejected. Starting a pinned child after those
outcomes risks duplicate execution and provenance substitution.

Fallback is justified only by an explicit pre-start native role-selection
rejection such as unsupported, unknown, or unregistered `agent_type`.

#### Inferring role unavailability before attempting the native call

One coordinator blocked based on introspection and schema narration without
attempting the exact native launch. A retry using the actual `agent_type`
payload was accepted.

The launcher should construct and attempt the native call. Capability
inference is not equivalent to a concrete tool rejection.

#### Increasing `max_depth` as a general permission fix

`agents.max_depth` controls nesting topology only. It does not grant access to
shared Git metadata, `.agents`, network resources, package stores, or generated
build directories.

Depth, role selection, sandbox policy, filesystem permissions, and process
launch are independent layers and require separate diagnostics.

#### Nested `codex exec` from a workspace-write coordinator

The nested CLI fallback failed during in-process app-server initialization with
an operating-system permission error. Attempts involving ephemeral mode and
disabling optional app/plugin behavior did not make the fallback reliable.

This does not invalidate native `spawn_agent`; it confirms that nested CLI
execution has a different and more demanding permission/runtime surface.

#### Generating roles only when dispatch begins

Provider sessions may not discover roles created after startup. The archived
provenance project therefore established a committed supported Codex role
catalogue and scope-owned materialization for custom roles.

Runtime-only role creation cannot be the correctness boundary when earlier
planning, review, or implementation steps need exact selectable roles.

#### Parallelizing commands that mutate shared generated state

Parallel `pnpm run cli` or docs/build invocations can race even when their
logical tasks appear independent. Shared bundle directories, caches, generated
assets, and framework locks make these commands operationally coupled.

#### Hiding transient state through shared Git excludes

A coordinator added `.pnpm-store/` to the parent repository's
`.git/info/exclude` to make its worktree appear clean. That changed shared local
Git state outside the authorized task scope and obscured rather than resolved
the transient directory.

The change was removed. Orchestrators should move or clean only transient state
they created, report pre-existing state, and never mutate shared ignore rules
as a cleanliness shortcut.

## Learnings

1. **Subagent orchestration is a stack of independent capabilities.** Depth,
   role discovery, exact selection, sandbox policy, filesystem roots, process
   launch, monitoring, and provenance can fail independently. Diagnose the
   failing layer before changing another.
2. **Spawn acceptance is a decisive state transition.** Before acceptance, an
   explicit role-selection rejection may justify fallback. After acceptance,
   every result belongs to that child and must be handled as an outcome.
3. **Configured invocation and observed identity are different facts.** The
   launcher owns the requested target, model axis, effort axis, sandbox, and
   launch identity. Runtime observation or self-report is separate and may be
   unavailable.
4. **Least privilege requires path-level reasoning.** `workspace-write` is not
   enough when a worktree's Git directory or managed path is outside the
   default writable root. Narrow additional roots are safer than broad sandbox
   escalation.
5. **A worktree is not a self-contained repository boundary.** Content lives in
   the worktree, while branch refs and index metadata may live in the shared
   parent repository. Commit-capable workers need access to both.
6. **Exact dispatch should be attempted, not inferred.** Tool acceptance or
   rejection is stronger evidence than capability introspection, missing
   telemetry, or assumptions about the host launcher.
7. **Provider contracts are not interchangeable.** Codex `agent_type`, Claude
   named subagents, and Cursor model/profile arguments need provider-specific
   dispatch and evidence rules.
8. **Canonical instructions are executable configuration.** Updating only the
   parent skill can leave the actual coordinator or reviewer with contradictory
   behavior. Contract tests must cover every component that owns dispatch.
9. **Independent review is valuable for orchestration code.** The p01/p02
   reviews found executable-command and distributed-contract gaps despite
   passing focused tests.
10. **Execution environment failures need classification.** Import alias
    failures, package fetch failures, sandbox `EPERM`, build locks, and code
    assertion failures require different recovery paths.
11. **Parallelism must include operational write sets.** Two tasks with
    disjoint source files can still conflict through Git refs, generated
    assets, package stores, caches, or framework locks.
12. **Timeouts should reflect agent workloads and artifact semantics.** A slow
    reviewer can complete meaningful work near a wrapper deadline. Monitoring
    should correlate process state with validated artifacts.
13. **Lifecycle artifacts lag parallel worktrees until fan-in.** Phase branches
    can contain completed, verified commits while root project state still
    reports earlier blockers. Reconciliation must happen deliberately after
    all parallel phases reach terminal outcomes.

## Recommendations

1. Implement one explicit Codex dispatch state machine:
   - resolve the exact managed variant;
   - construct and log the launcher payload;
   - attempt native `spawn_agent` with that `agent_type`;
   - use a fresh pinned child only after explicit pre-start role-selection
     rejection; and
   - treat every accepted child result, including `BLOCKED`, as terminal for
     that launch.
2. Record launcher-owned receipts for every coordinator, worker, fix, and
   reviewer launch. Include target, model axis, effort axis, sandbox, scope,
   launch/thread identity, acceptance state, and final outcome.
3. Label provenance precisely as launcher-selected, config-declared,
   host-observed, or child-reported. Never collapse those categories.
4. Enforce `agents.max_depth >= 2` through the shared materialization merge and
   diagnose the effective scoped value before managed implementation starts.
5. Add a write-surface preflight for commit-capable workers. Check the worktree,
   shared Git metadata, managed canonical paths, and generated-output paths
   before dispatch.
6. Prefer scoped writable roots over `danger-full-access`. Escalate broadly
   only when a task genuinely requires it and after explicit authorization.
7. Use flat, collision-resistant phase branch names and validate proposed refs
   before creating parallel worktrees.
8. Run package-local tools from their package directory. Record any equivalent
   local-binary fallback so verification provenance remains auditable.
9. Serialize commands that bundle assets, regenerate provider views, or build
   the same docs application unless each process has isolated output paths.
10. Do not mutate `.git/info/exclude` or global ignore configuration to hide
    orchestration artifacts. Preserve or relocate transient state explicitly.
11. Keep supported exact Codex roles discoverable before workflow execution.
    Materialize custom roles in their configuration owner's scope and do not
    depend on provider hot reload.
12. Centralize native-first and fallback semantics, or enforce identical
    contract assertions across the implementation skill, phase coordinator,
    reviewer, and review-provide workflow.
13. Make review `BLOCKED` behavior explicit: it blocks the relevant phase or
    final review, cannot be parsed as a pass, and cannot trigger fallback after
    spawn acceptance.
14. Use validated artifact correlation alongside process monitoring for long
    review gates. Keep run, project, target, and invocation provenance checks
    fail-closed.
15. Reconcile `plan.md`, `implementation.md`, and `state.md` immediately after
    parallel fan-in so resumed sessions do not act on stale blocker state.
16. Preserve the repository's release discipline: bump every changed canonical
    skill once per PR, regenerate managed views through normal tooling, bump the
    lockstep public packages for shipped assets, and run
    `pnpm release:validate`.

## Evidence Sources

- `../discovery.md`
- `../design.md`
- `../plan.md`
- `../implementation.md`
- `../state.md`
- `../../../archived/gate-review-provenance-target-safety/discovery.md`
- `../../../archived/gate-review-provenance-target-safety/implementation.md`
- `../../../archived/gate-review-provenance-target-safety/summary.md`
- Session diagnostics and phase coordinator/reviewer reports from
  2026-07-10 through 2026-07-11
