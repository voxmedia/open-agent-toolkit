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
   the plan's `## Dispatch Profile`.
2. Resolve one exact phase implementer target with
   `--role implementer --ceiling-tier <project-or-phase-named-tier> --report-scope <pNN> --report-action implementation`.
   Use the phase scope, not each task ID. Omit `--ceiling-tier` only for
   uncapped or inherit/default policy.
3. Build the provider invocation before recording target, model/effort axes,
   selection reason, candidates, and formal dispatch stamp.
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
   dispatch_policy: {resolver policy}
   dispatch_ceiling: {resolved project/phase maximum or none}
   dispatch_target: {resolver exact target}
   dispatch_args: {complete provider invocation payload}
   model_axis: {resolver value}
   effort_axis: {resolver value}
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

Tier 2 inline execution is allowed only under the existing verified-equivalent
controls or documented inherit/default exception. Inline mode executes the
phase-implementer contract directly; it does not reintroduce mandatory
task-worker dispatch.

Optional third-tier readiness is not a preflight blocker. Codex depth two may be
provisioned as capability, but default phase execution requires only the root →
phase-agent depth.

#### Verify the Phase Report

On return:

- require `DONE` or `DONE_WITH_CONCERNS`;
- verify phase ID, request ID, phase base, task count, and phase verification;
- for each task, verify its commit is exactly one append-only commit in plan
  order, changes only declared files, and has passing task verification;
- verify the reported commit range equals the worktree's range from
  `PHASE_BASE_HEAD` to HEAD;
- require a clean worktree; and
- validate every optional child record without requiring any child.

`NEEDS_CONTEXT` may receive only missing artifact context through the original
handle. `BLOCKED` is terminal for the attempt. `INVALID_RUN_ABORT` terminates
every accepted handle owned by the run, preserves invalidating evidence, and
never authorizes fallback, replacement, or sequential degradation. Sequential
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
  incomplete-artifact error. After successful validation, append exactly once
  through `oat project log append`, creating one concise structural entry that
  references the review artifact path.
- For `not-attempted`, the artifact must not contain
  `## Review Orchestration`; treat a present section as an inconsistent,
  incomplete artifact. Do not append a log entry and do not invoke
  `oat project log append`.

For the attempted branch, do not mirror individual worker records. Defer flags
and entry format to `oat project log append --help`; never pre-check project-log
configuration because the helper no-ops when logging is disabled. The reviewer
and workers never write `project-log.md` or append this entry.

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
- update `state.md` current task, last commit, and timestamp;
- remove legacy `oat_execution_mode: subagent-driven`; and
- preserve any configured retry override.

Bookkeeping is mandatory:

```bash
oat state refresh
git add {PROJECT_PATH}/implementation.md {PROJECT_PATH}/state.md {PROJECT_PATH}/plan.md
git commit -m "chore(oat): bookkeeping after {pNN} {pass|fail}"
```

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
three tracking artifacts. Do not use `git add -A`.

### Step 9: Repeat Until Complete

Continue Steps 5–8 until every implementation phase is complete or a configured
checkpoint, terminal review failure, invalid run, or real blocker stops the
run.
