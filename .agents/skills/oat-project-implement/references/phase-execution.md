# Phase Execution

Load this reference only while executing implementation phases.

### Step 5: Per-Phase Execution

For each phase `pNN`, or each phase in a plan-declared parallel worktree group,
resolve and dispatch exactly one phase implementer. The phase implementer reads
the phase once, directly executes every task in dependency order, creates one
verified commit per planned task, runs inline between-task self-checks and
phase-wide verification, and returns a compact Phase Implementation Report.

Ordinary tasks do not require per-task workers. A phase implementer may use an
optional bounded child for beneficial recon, isolated fanout, or specialist
work under the shared dispatch contract. The phase implementer remains
responsible for file boundaries, verification, and task commits.

#### Resolve and Dispatch the Phase Implementer

Before each phase:

1. Resolve the project dispatch policy and optional narrower phase maximum from
   the plan's `## Dispatch Profile`. Classify the complete phase scope and
   record the classification source and rationale. For Codex, also classify
   the preferred task effort. Separately resolve
   `oat_phase_recovery_policy`: use the phase-specific
   `phase_attempt_limits.<pNN>` value when present, otherwise
   `default_attempt_limit`, which defaults to `10`. Both project-default and
   phase-specific limits must be integers from `0` through `20`; fail closed on
   malformed values. Read `phase_recovery_attempts_used` only from the
   authoritative
   `oat_phase_recovery_policy.phase_attempt_usage.<pNN>.used_attempts` ledger in
   `state.md`, never from a report summary or a reset local counter. Reconcile
   any `pending_attempt` before launch.
2. Resolve one exact phase implementer target with
   `--role implementer --ceiling-tier <project-or-phase-named-tier> --task-class <task-class> [--task-effort <codex-preferred-effort>] --report-scope <pNN> --report-action implementation`.
   Use the phase scope, not each task ID. Omit `--ceiling-tier` only for
   uncapped or inherit/default policy.
3. Require the completed Dispatch Report, surface its structured notices, and
   render the report before launch. Build the provider invocation before
   recording target, model/effort axes, selection reason, candidates, and
   formal dispatch stamp. Runtime disclosure comes from the effective resolved
   target, never `recommendationVersion`.
4. Record `PHASE_BASE_HEAD=$(git rev-parse HEAD)` and require a clean worktree.
5. Send one self-contained Phase Scope:

   ```yaml
   project: {PROJECT_PATH}
   phase: {pNN}
   mode: implement
   artifact_paths:
     plan: {PROJECT_PATH}/plan.md
     design: {PROJECT_PATH}/design.md
     spec: {PROJECT_PATH}/spec.md
     implementation: {PROJECT_PATH}/implementation.md
     discovery: {PROJECT_PATH}/discovery.md
   workflow_mode: {spec-driven|quick|import}
   active_provider: {codex|claude|cursor|other}
   phase_base_head: {PHASE_BASE_HEAD}
   worktree: {assigned checkout}
   parallel_group: {group or null}
   expected_base_sha: {group base or PHASE_BASE_HEAD}
   commit_convention: {from plan.md}
   request_id: {generic dispatch request ID}
   phase_recovery_limit: {resolved 0-20 limit}
   phase_recovery_attempts_used: {durable prior usage, initially 0}
   attempt_usage_ledger: {state.md oat_phase_recovery_policy.phase_attempt_usage.<pNN>}
   pending_attempt: {reconciled pending entry or null}
   original_request_id: {same generic phase dispatch request ID}
   phase_recovery_authorization: {phase-standing|operator-extension}
   dispatch_policy: {resolver policy}
   dispatch_ceiling: {resolved project/phase maximum or none}
   dispatch_target: {resolver exact target}
   dispatch_args: {complete provider invocation payload}
   model_axis: {resolver value}
   effort_axis: {resolver value}
   task_class: {mechanical-recon|intelligent-recon|default-implementation|hard-reasoning|consequential}
   preferred_effort: {codex low|medium|high|xhigh|max; null for other providers}
   classification_source: {plan dispatch profile|phase scope analysis|other explicit source}
   classification_rationale: {short rationale grounded in the complete phase scope}
   selection_reason: {stable shared reason}
   candidates_considered: {ordered exact candidates}
   dispatch_stamp: {formal Dispatch: line}
   ```

Codex first uses the resolver-returned materialized implementer variant as
native `agent_type`; only explicit pre-start role rejection permits the exact
pinned fresh-child route. Claude passes the exact resolver model argument.
Cursor launches the exact `providers.cursor.dispatchArgs.variant` native agent
type first; only explicit pre-start native role-selection rejection permits
another target-preserving route. After acceptance, missing telemetry, timeout,
`BLOCKED`, or any other terminal outcome cannot trigger fallback or
replacement.

The phase recovery limit is not a route retry limit. Implementation recovery
must not use route escalation, route-level advancement, model/provider
replacement, or `oat_orchestration_retry_limit`. It remains pinned to the exact
accepted implementation target.

Tier 2 inline execution is allowed only under the existing verified-equivalent
controls or documented inherit/default exception. Inline mode executes the
phase-implementer contract directly; it does not reintroduce mandatory
task-worker dispatch.

Optional third-tier readiness is not a preflight blocker. Codex depth two may be
provisioned as capability, but default phase execution requires only the root →
phase-agent depth.

#### Dedicated Phase Recovery Contract

This contract covers only a post-commit defect discovered by declared task,
transition, or phase verification. The default `10` attempt limit and a
phase-specific `0`–`20` override are independent of review-fix and gate retry
configuration.

```yaml
oat_phase_recovery_policy:
  default_attempt_limit: 10
  phase_attempt_limits: {} # optional pNN: 0-20 overrides
  phase_attempt_usage:
    pNN:
      used_attempts: 0
      pending_attempt: null
```

A phase's `phase_attempt_usage.<pNN>` entry in `state.md` is the authoritative
durable usage ledger. The count is monotonic and survives process, handle, and
session interruption. Reports and canonical events corroborate the ledger; they
never replace it.

For a new attempt, the phase implementer that owns the worktree atomically
increments `used_attempts` and writes `pending_attempt` before edit. The pending
entry records attempt number, event ID, original request, original task/commit,
discovering check, exact dispatch target, reservation HEAD, and status. The
agent's narrow ledger write is the only project-state write allowed while it
owns the worktree; no root writer may race it.

On return or resume, reconcile the ledger against the original commit, current
HEAD, bounded diff, report, and canonical event:

- a settled ledger has `pending_attempt: null` and a nondecreasing
  `used_attempts`;
- a pending attempt continues, after every recorded identity and bounded diff
  reconcile, as the same attempt without consuming another;
- a nonzero `used_attempts` count with a matching pending attempt continues only
  after complete reconciliation and does not consume another attempt;
- an interruption preserves the consumed reservation in the working tree, even
  if no recovery commit exists yet;
- an unreconciled pending attempt, regressed count, missing reservation, or
  unexplained dirty file rejects and blocks resume before editing; and
- when `used_attempts` is equal to or greater than `phase_recovery_limit`, no
  new attempt may be reserved because the phase recovery budget is exhausted.
  An already-pending attempt may only finish or fail.

After verification, the agent atomically marks the pending entry `completed` or
`failed`. A successful recovery commit includes that ledger transition. Root
bookkeeping clears `pending_attempt` only after validating the matching report
and event, and always preserves `used_attempts`. Failed edit, commit, or
re-verification paths retain the consumed count. No retry, fresh launch,
extension, or nonzero resume resets usage.

A project default limit of `0` stops automatic recovery for direction without
edit, commit, attempt consumption, or fallback. A phase-specific override of
`0` has the same effect: stop for direction without edit, commit, attempt
consumption, or fallback. Still append the direction-required recovery event.

Automatic recovery is eligible only when every condition is true:

- the correction is mechanically bounded and unambiguous;
- it remains within declared phase intent and public requirements;
- any file-boundary expansion is mechanically derived and remains in-phase;
- architecture, security, product scope, requirements, and public behavior are
  unchanged;
- the work is non-destructive, reversible, and outside protected-branch,
  credential, or other consequential boundaries;
- the exact target remains unchanged and bindable regardless of handle state;
- handle continuity follows one of the authorized alternatives below;
- attempt accounting follows one of the authorized alternatives below; and
- focused plus relevant phase verification can establish correctness.

Handle and exact-target continuity use these mutually compatible branches:

1. When the accepted handle is available or resumable, use same-handle
   continuation.
2. When the accepted handle is unavailable or unresumable, an unchanged,
   bindable exact target plus a lifecycle-authorized recover scope, a reconciled
   pending attempt, and continuation linkage authorizes fresh `mode: recover`.
3. A lost or unbindable exact target requires a direction-required stop with no
   fallback.

Handle unavailability alone does not make automatic recovery ineligible or
stop it. It selects the second branch only when all its conditions hold.

Attempt accounting uses exactly one of these alternatives:

1. **Pending completion:** a matching `pending_attempt` may continue only after
   complete reconciliation of the authoritative ledger, original request,
   immutable original commit at the same history position, bounded worktree
   diff, and unchanged exact target. Continue and settle that same reserved
   attempt without incrementing `used_attempts` or creating another
   reservation, even when the existing count equals the limit.
2. **New reservation:** when no `pending_attempt` exists,
   `phase_recovery_attempts_used < phase_recovery_limit` is mandatory. Atomically
   increment usage and write the new reservation before editing.

For the final-attempt boundary, `limit=1`, `used=1`, and a fully reconciled
matching `pending_attempt` continue and settle the same reserved attempt
without incrementing usage. With `limit=1`, `used=1`, and no `pending_attempt`,
stop direction-required before edit with no new reservation and no fallback.

The implementer records eligibility before editing. A new reservation consumes
one attempt before editing begins. A failed edit, commit, or re-verification
leaves that attempt consumed and records no successful recovery commit.
Continuing a reconciled pending attempt does not consume another. Successful
recovery creates one append-only recovery commit per successful attempt, reruns
the failing focused command and relevant phase verification, and continues
without a prompt. At three recovery events, require an elevated recovery-volume
warning and continue if all eligibility conditions still hold.

One no-edit rerun is permitted for evidence-backed infrastructure or flake
failure without attempt consumption. A repeated unexplained failure is
ambiguous: stop without edit and record direction-required rather than
speculating.

The accepted task commit remains immutable at the same history position.
Amend, reset, rebase, squash, replacement task IDs, or concealed rewriting
invalidates the report. Mechanically related failures from the same
verification command may be handled in one atomic attempt and commit.
Independent failures require separate attempts and commits.

Stop with `DONE_WITH_CONCERNS` or `BLOCKED` for ambiguous or contradictory
evidence; architecture, security, product, requirements, or public-behavior
change; non-mechanical file-boundary widening; destructive, irreversible,
credential-bearing, protected-branch, or out-of-scope work; retry exhaustion;
dirty worktree or dirty history; inability to establish correctness; missing
original-request or missing exact-target provenance; unverifiable commit range;
malformed recovery event; exact-target loss; or an independent governance cap.
No stop boundary authorizes a fallback model, provider, route, or worker.
If the exact target is lost or cannot continue, stop before editing.
Architecture, security, product, or requirements changes stop for direction.
Non-mechanical widening or destructive work stops before editing. Retry
exhaustion and every governance cap stop automatic recovery. A dirty worktree
or dirty history blocks continuation. Inability to establish correctness,
missing original-request provenance, missing exact-target provenance, an
unverifiable commit range, or a malformed recovery event stops for direction.
If focused and phase verification cannot establish correctness, stop for
direction.

When the accepted handle can continue, use only that handle. If it cannot be
resumed, a fresh same-target recovery launch is allowed only under this
already-resolved lifecycle authority. Preserve the exact target and link the
fresh record to the original request through the generic dispatch record's
existing `continuation_events`. Missing or changed provenance stops; it never
creates route eligibility.

Before that fresh launch, reconcile or create exactly one authoritative pending
attempt reservation. Launch the exact original phase-agent target in
`mode: recover` with this isolated scope:

```yaml
mode: recover
phase: { pNN }
original_request_id: { original phase request }
continuation_event: { generic continuation_events identifier }
recovery_base_head: { current immutable Git HEAD }
original_task_id: { originating planned task }
original_commit: { immutable task commit }
defect_class: { lint|type|test|build|composition|other }
discovered_by: { exact command or transition check }
bounded_correction_scope: { mechanical correction only }
bounded_files: { declared or mechanically derived in-phase files }
phase_recovery_limit: { resolved total limit }
phase_recovery_attempts_used: { authoritative nonzero used count }
pending_attempt: { matching authoritative ledger entry }
focused_verification: { exact failing check }
phase_verification: { relevant phase command }
dispatch_target: { exact original launcher-owned target }
dispatch_axes: { unchanged original axes }
dispatch_stamp: { original formal Dispatch line }
```

Recover mode never replays planned tasks and never consumes review findings.
Require its Phase Recovery Continuation Report, matching canonical event,
ledger reconciliation, immutable-history proof, focused/phase verification,
and recovery commit when successful. A missing field, changed target, unrelated
dirty diff, or unreconciled reservation is an accepted terminal stop, not
fallback eligibility.

Exhaustion requires operator direction with one of these durable outcomes:

1. **Add N attempts:** set the active phase's total
   to `used_attempts + N` under `phase_attempt_limits.<pNN>`, capped at `20`;
   do not reset prior usage.
2. **Authorize changed scope:** record a consequential or scope-expanding
   action outside automatic recovery.
3. **Stop:** preserve the worktree, immutable history, and evidence.

An extension preserves the exact implementation target unless the operator
explicitly authorizes a separate route action. Repeated exhaustion never resets
usage or silently lifts the cap.

Append exactly one canonical recovery event for every recovered,
direction-required, or failed-attempt disposition:

```markdown
### Recovery Event {event-id}

- Phase/task: {phase and originating task when known}
- Original request: {original_request_id}
- Original commit: {immutable task commit}
- Defect class: lint | type | test | build | composition | other
- Discovered by: {exact verification command or transition check}
- Disposition: recovered | direction-required | failed-attempt
- Authorization: phase-standing | operator-extension | operator-scope
- Attempt: {used}/{phase_recovery_limit}
- Dispatch target: {exact launcher-owned implementation target}
- Recovery commit: {sha or -}
- Verification: {focused and relevant phase result}
- Reason: {eligibility or stop-boundary evidence}
```

Exactly one event is counted even when an attempt fails before a commit. The
canonical fields make defect count, prompt count, and successful repair count
independently measurable. Root bookkeeping copies validated report facts; it
does not infer or reconstruct them.

#### Verify the Phase Report

On return, select exactly one branch from this status matrix:

| Report status        | Validation branch                                            | Root action                                                                 |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `DONE`               | accepted success                                             | Validate the complete report and continue lifecycle execution.              |
| `DONE_WITH_CONCERNS` | accepted success or accepted terminal stop, from event state | Continue only for validated success; otherwise record the stop and return.  |
| `BLOCKED`            | accepted terminal stop                                       | Validate the complete terminal evidence, record it, and stop.               |
| `NEEDS_CONTEXT`      | context-only continuation                                    | Supply only missing artifact context through the original accepted handle.  |
| `INVALID_RUN_ABORT`  | invalid-run terminal                                         | Preserve invalidating evidence and terminate every handle owned by the run. |

`INVALID_RUN_ABORT` terminates every accepted handle and never authorizes
fallback, replacement, or sequential degradation.

Both accepted success and accepted terminal-stop branches must:

- verify phase ID, request ID, phase or recovery base, and phase verification;
- for a Phase Implementation Report, verify task count; for a Phase Recovery
  Continuation Report, verify the original task and commit instead;
- for each task, verify its commit is exactly one append-only commit in plan
  order, changes only declared files, and has passing task verification;
- for each reported recovery, verify attempt accounting, the immutable original
  commit and original request, exact-target provenance, one in-scope append-only
  recovery commit when successful, focused and phase verification, and exactly
  one well-formed canonical recovery event;
- verify recovered, direction-required, and failed-attempt dispositions are all
  represented without gaps or duplicate events;
- verify the reported commit range equals the worktree's range from
  `PHASE_BASE_HEAD` to HEAD for implementation, or from `recovery_base_head` to
  HEAD for recover mode;
- verify the worktree state matches the selected branch; and
- validate every optional child record without requiring any child.

The accepted success branch requires passing phase verification, a reconciled
settled ledger, no unresolved direction-required event, a clean worktree, and
then continues.

The accepted terminal-stop branch validates provenance, attempt accounting,
immutable history, canonical recovery event shape, commit range, and ledger
state before bookkeeping. Its worktree may retain only the reconciled pending
ledger reservation and bounded failed-attempt diff named by the report; any
other dirt is invalid. A valid `BLOCKED` report is recorded, then stops without
continuation or fallback. `DONE_WITH_CONCERNS` uses this terminal branch when it
reports an unresolved direction-required or failed-attempt disposition;
otherwise it may use the success branch only when every success invariant
passes.

A dirty worktree, unverifiable commit range, missing provenance, malformed
recovery event, rewritten original commit, or recovery commit outside the
declared/mechanically derived phase boundary blocks continuation.

`NEEDS_CONTEXT` may receive only missing artifact context through the original
handle. It cannot change target or scope. `INVALID_RUN_ABORT` terminates every
accepted handle owned by the run, preserves invalidating evidence, and never
authorizes fallback, replacement, or sequential degradation. Sequential
degradation is forbidden for the invalid run.

### Per-Phase Review

The root workflow owns implementation review. After validating the phase
report, resolve and dispatch exactly one fresh `oat-reviewer` round at the
configured review ceiling:

```bash
oat project dispatch-ceiling resolve \
  --provider "$ACTIVE_PROVIDER" \
  --role reviewer \
  --report-scope "$PHASE" \
  --report-action review \
  --project-path "$PROJECT_PATH" \
  --json
```

Do not pass a task-only `--ceiling-tier` override. Build and record the exact
review payload before launch. Send a self-contained Review Scope with the phase
commit range, task IDs and boundaries, artifacts, verification evidence,
configured axes, selection reason, and candidates. Require a timestamped review
artifact under the project's `reviews/` directory.

For a managed capped review, bind the exact provider argument to the actual
invocation: `providers.codex.dispatchArgs.variant`,
`providers.claude.dispatchArgs.model`, or
`providers.cursor.dispatchArgs.variant`. Cursor must launch that exact
resolver-selected native reviewer variant first and must not normalize its
mapped model or attach a Task-level model argument. If the root cannot apply,
pass, or bind the required model, variant, or role control, fail closed before
launch.

After acceptance, poll, nudge, or continue only through the accepted reviewer
handle. Only explicit pre-start rejection allows another route. Timeout,
interruption, `BLOCKED`, or contract refusal is the review outcome and never a
reason to replace an accepted reviewer.

Before validating the review artifact scope or commit range, or updating any
project bookkeeping, consume the reviewer's brief artifact-mode confirmation.
It must contain exactly one of these exact lines:

- `**Reconnaissance:** attempted`
- `**Reconnaissance:** not-attempted`

A missing, duplicate, or invalid reconnaissance signal is an
incomplete-artifact error: stop and fail closed without validating the review
artifact, updating bookkeeping, or appending a project-log entry.

Use the valid signal to validate the review artifact's orchestration evidence:

- For `attempted`, require a complete `## Review Orchestration` section with
  one compact account of every attempted wave: task class, classification
  rationale, selected target, acceptance/outcome, floor satisfaction, fallback,
  and primary reconciliation. Missing or incomplete evidence is an
  incomplete-artifact error. Record one concise structural entry referencing the
  review artifact path, but **do not append it here**: carry it to the terminal
  phase outcome and append it exactly once through `oat project log append` with
  the phase-outcome entry. Appending at this point dirties the tracked log
  before the bounded fix loop below dispatches a fix child, whose step 3
  requires a clean worktree.
- For `not-attempted`, the artifact must not contain
  `## Review Orchestration`; treat a present section as an inconsistent,
  incomplete artifact. Do not append a log entry and do not invoke
  `oat project log append`.

For the attempted branch, do not mirror individual worker records. Defer flags
and entry format to `oat project log append --help`; never pre-check project-log
configuration because the helper no-ops when logging is disabled. The reviewer
and workers never write `project-log.md` or append this entry.

No project-log write happens anywhere between a reviewer returning and a fix
child being dispatched. The deferred orchestration entry is appended with the
phase-outcome entry at Step 7 and committed by that step's bookkeeping.

After successful signal and orchestration validation, validate the review
artifact scope and commit range.

Zero Critical and zero Important findings passes. Medium/Minor findings are
recorded without blocking.

#### Bounded Fix and Re-Review Loop

On Critical/Important findings:

1. Read `oat_orchestration_retry_limit` from state (default `2`, range 0–5).
2. Resume the original phase implementer handle in `mode: fix` with only the
   review artifact, bounded findings, prior report, original request ID, and a
   continuation event.
3. Verify the fix report, commit, file bounds, continuation linkage, passing
   phase verification, and clean worktree.
4. Dispatch one new root-owned reviewer round against the updated range.
5. Repeat until pass or retry exhaustion.

Review-fix and gate rounds continue to use
`oat_orchestration_retry_limit`; implementation recovery does not consume or
alter that counter. The independent three-cycle review governance cap,
Critical/Important handling, and protected boundaries remain unchanged.

If the original phase handle cannot be resumed after successful phase
completion, the root may launch at most one fresh phase implementer with the
same exact target and bounded fix scope. Its generic dispatch record must
reference the original `request_id` through existing `continuation_events`.
This is a new fix scope, not replacement of the completed phase launch and not
a dispatch schema change.
On hosts that do not support resuming a completed child handle, this fresh
same-target fix launch is expected rather than an anomalous recovery.

Retry exhaustion stops a sequential run. In a parallel group, mark the phase
`excluded`, do not merge its worktree, and report the review artifact and
worktree in Outstanding Items.

### Optional External Phase Review Gate

After the root-owned per-phase reviewer passes and phase bookkeeping is clean,
run `oat_phase_review_gate` for selected phases:

```bash
oat --json gate review \
  --project "$PROJECT_PATH" \
  --review-type code \
  --review-scope "{pNN}" \
  --exit-nonzero-on "{threshold}" \
  '$oat-project-review-provide code {pNN}'
```

Do not pass `--target` in normal execution. All three receive-eligibility
conditions must hold: `status` is `ok` or `blocked`, `receiveEligible: true`,
and `handoff` is non-null.

- `ok`: consume the artifact through non-pausing judgment-sweep mode.
- `blocked`: consume blocking findings, route fixes to the original phase
  implementer under the bounded loop, then re-run root review and the gate.
- target execution, artifact validation, or missing-artifact failure: stop.

Gate retry rounds use the same orchestration retry limit. Gate independence,
configured provenance, liveness telemetry, and fail-closed behavior are
unchanged.

#### Reviews Ledger Mutation Contract

Apply this contract whenever the implementation workflow directly dispositions
a `## Reviews` event or re-points its artifact during archival or receive
reconciliation. This includes Step 7 phase/fix outcomes and every checkpoint,
final-review, gate-receive, and closeout path that mutates a Reviews row:

- Parse the table header and resolve `Scope`, `Type`, `Status`, `Date`,
  `Artifact`, `Reviewed Head`, `Invocation`, and `Gate Target` by header name;
  never address a known cell by a fixed position.
- For a legacy five-column table, append the provenance columns (`Reviewed
Head`, `Invocation`, and `Gate Target`) to the header and separator, then pad
  every existing row with `-`. For any shorter row in an already widened table,
  pad missing cells with `-` through the current header width before mutation.
- Preserve every unknown column in its original position and preserve every
  existing known value unless the current operation explicitly advances that
  cell. Never truncate a row to five, eight, or any other assumed width.
- Populate missing provenance from the event's validated review artifact:
  accept `oat_review_head_sha` only as a full 40-character hexadecimal commit
  SHA, preserve `oat_review_invocation`, and preserve `oat_gate_target` only
  for a gate invocation. Use `-` when validated provenance is unavailable;
  never infer it from the current HEAD, reviewer identity, scope, or target.
- An archive re-point changes only the bound event's `Artifact` cell (and a
  monotonic status transition when required). It must preserve existing
  provenance and unknown cells, while filling missing provenance when the
  source artifact supplies validated values.

### Parallel Group Execution

For a multi-phase schedule entry:

1. Capture `EXPECTED_HEAD=$(git rev-parse HEAD)`.
2. Bootstrap one worktree per phase through `oat-worktree-bootstrap-auto` with
   explicit base `EXPECTED_HEAD`. Never substitute host-native worktree
   isolation.
3. Verify each worktree HEAD equals or descends from `EXPECTED_HEAD` before
   dispatch.
4. Dispatch one phase implementer per worktree concurrently. Each agent
   directly executes its phase tasks serially.
5. After every phase report, the root dispatches and owns that phase's review
   and bounded fix loop.
6. Wait for terminal verdicts, then merge passing phases in plan order using
   `git merge --no-ff`.
7. On conflict, abort merge and try phase-commit cherry-pick. If unresolved,
   dispatch a bounded conflict-resolution child; do not reinterpret phase work
   in the root context.
8. Run integration verification after each fan-in.
9. Clean merged worktrees; preserve excluded worktrees with recorded paths.
10. Create one bookkeeping commit after the group, then run selected external
    phase gates in plan order.

Smoke containment, ownership registration, base verification, or fixture
readiness failure invokes known-invalid run abort immediately. Outside smoke
mode, a bootstrap failure may degrade the whole group to sequential
target-preserving execution and must be recorded.

### Step 7: Artifact Updates After Each Phase (or Group)

After each phase or parallel group:

- append an Orchestration Run with phase outcomes, task commits, phase/root
  review result, fix iterations, dispatch stamps, selection reasons,
  candidates, optional nested dispatches, worktrees, and outstanding items;
- update only the plan review event whose Scope + Type + artifact filename
  identifies the review being dispositioned, through `fixes_added` /
  `fixes_completed` / `passed` as appropriate;
- never select review bookkeeping by scope alone, replace an earlier event, or
  move an event status backward;
- apply the Reviews Ledger Mutation Contract above before every disposition or
  archive re-point;
- update `state.md` current task, last commit, and timestamp;
- remove legacy `oat_execution_mode: subagent-driven`; and
- preserve any configured retry override.

Bookkeeping is mandatory:

```bash
oat state refresh
git add {PROJECT_PATH}/implementation.md {PROJECT_PATH}/state.md {PROJECT_PATH}/plan.md
[ -f {PROJECT_PATH}/project-log.md ] && git add {PROJECT_PATH}/project-log.md
git commit -m "chore(oat): bookkeeping after {pNN} {pass|fail}"
```

`project-log.md` is tracked, so leaving it unstaged carries the log's dirt into
the next dispatch and fails the child's clean-worktree preflight. Stage it only
when it exists; logging can be disabled.

### Step 8: Check Plan Phase Completion

At every phase boundary, verify `implementation.md`, task pointers, phase
summary, and design/plan deviations. `oat_plan_hill_phases` lists phases after
which execution pauses; an empty list means every phase.

Before a configured non-final HiLL pause, run auto-review when enabled. Scope
starts after the last passed whole-phase review and ends at the current phase.
Count only whole-phase scopes: `pNN` or `pNN-pMM`.

- Example: prior passed row `p01`, current checkpoint `p03` → review `p02-p03`.
- Example: no prior passed whole-phase review, current checkpoint `p03` → review `p01-p03`.

For the final implementation phase use `oat-project-review-provide code final`
and do not duplicate the already completed root-owned per-phase review.

Example: `["p01", "p04"]` → pause after p01 completes and after p04 completes;
skip p02, p03.

If this is the final implementation phase checkpoint, run
`oat-project-review-provide code final` and do not run a duplicate final
phase-only lifecycle review.

Defer only a checkpoint on the final implementation phase; non-final checkpoint
behavior remains unchanged. The final checkpoint continues through final
verification, final review, and stored pre-approval work before asking for
approval.

After phase summary and task pointer advancement, refresh state and commit the
three tracking artifacts, plus `project-log.md` when it exists. Do not use
`git add -A`.

**Any step that appends to the project log owns committing it** before it
returns, parks, or stops — not just the success path. STOP and park returns,
validation failure, invalid-run aborts, and retry exhaustion all bypass this
phase boundary, and each leaves the tracked log dirty for whatever runs next.
Commit the log on those paths too, once no child owns the head.

### Step 9: Repeat Until Complete

Continue Steps 5–8 until every implementation phase is complete or a configured
checkpoint, terminal review failure, invalid run, or real blocker stops the
run.
