---
name: oat-project-autonomous
version: 1.0.3
description: Use when a user explicitly asks to run an OAT project autonomously end-to-end. Activates session-only autonomy, resumes the correct lifecycle phase, and drives the existing OAT skills through final PR or a reported boundary.
argument-hint: '<goal | project-slug | ticket-ref>'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Task
---

# Autonomous OAT Project

Run an OAT project from its persisted entry state to final PR by chaining the
existing lifecycle skills. This skill supplies policy and sequencing; each
lifecycle skill continues to own its artifacts, gates, reviews, and state.

## When to Use

Use this skill only when the user explicitly requests autonomous end-to-end OAT
execution, including:

- a bare goal that should become a complete OAT project;
- a project, ticket, or approved plan that should resume and run to final PR;
- a deliberate restart of an interrupted autonomous run.

Do not auto-invoke this skill merely because a project is ready for its next
phase. For one interactive lifecycle phase, invoke that phase's skill instead.

## Arguments

Parse `$ARGUMENTS` as one of:

- a substantive goal;
- an existing project slug or path;
- a ticket or external reference with enough context to resolve the goal;
- empty only when `.oat/config.local.json` points to a valid active project.

## Prerequisites

- `oat` is available on `PATH`. If it is missing, stop with the installation
  action; never approximate OAT artifacts, state, or CLI transitions manually.
- The current repository permits the requested work on the current branch.
- Read `references/gate-inventory.md` before resolving any autonomous gate.

## Mode Assertion

**OAT MODE: Autonomous Project Orchestration**

**Purpose:** Activate the session policy, detect persisted project state, and
chain the canonical lifecycle skills to final PR without unattended input
waits.

**BLOCKED Activities:**

- Bypassing, reimplementing, weakening, or silently satisfying a gate owned by
  another skill.
- Persisting `OAT_AUTONOMOUS`, `OAT_NON_INTERACTIVE`, or an active autonomy mode
  in project artifacts, config, shell profiles, or environment files.
- Approximating artifacts or state transitions when the OAT CLI is missing or
  fails.
- Continuing through destructive-change risk, unresolved Critical findings,
  required repository-policy approval, or missing credentials without an
  integrity-preserving route.
- Adding a coordinator or other orchestration layer over
  `oat-project-implement`'s phase-agent topology. That topology is owned by
  implement; an extra layer has a documented wall-clock regression.

**ALLOWED Activities:**

- Setting the two autonomy environment variables for the current process tree.
- Resolving project home and persisted entry state.
- Selecting quick or spec-driven mode from the review-density rule.
- Invoking existing OAT lifecycle and dispatch skills in their required order.
- Auto-resolving only the gates authorized by the autonomy contract.
- Committing and pushing completed phase boundaries, subject to repository
  policy, and reporting explicit boundary stops.

**Self-Correction Protocol:**

If you catch yourself:

- Re-describing a lifecycle phase instead of invoking its skill → STOP and load
  the owning skill.
- Inventing a target, artifact, state transition, or gate outcome → STOP and
  use the owning OAT CLI or skill contract.
- Waiting for mid-run input → STOP, map the prompt to the gate inventory, then
  auto-resolve it or emit a boundary blocker report.
- Launching a second review route after a launch was accepted → STOP and use
  the accepted handle's bounded recovery path.

**Recovery:**

1. Persist only safe, owned bookkeeping.
2. Record the deviation or inventory gap in the learnings log.
3. Return to the earliest incomplete canonical lifecycle step, or stop with the
   structured blocker report.

## Progress Indicators (User-Facing)

Print this banner once at invocation:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ AUTONOMOUS PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Print each indicator only when its step begins:

- `[1/9] Activating session autonomy and resolving the project…`
- `[2/9] Detecting persisted lifecycle state…`
- `[3/9] Selecting workflow review density…`
- `[4/9] Gathering external-integration evidence…`
- `[5/9] Initializing execution learnings…`
- `[6/9] Running lifecycle phases and independent reviews…`
- `[7/9] Completing implementation closeout…`
- `[8/9] Committing and pushing the phase boundary…`
- `[9/9] Producing the autonomous run report…`

For long reviews, verification, builds, and pushes, print one starting line and
one completion line. Never print all step indicators up front.

## Process

### Step 0: Activate Policy and Resolve Active Project

Set both signals for this process and every bounded child in this run:

```bash
export OAT_AUTONOMOUS=1
export OAT_NON_INTERACTIVE=1
```

Do not persist either value.

If the current host is a cloud environment and a harness orientation skill is
discoverable, load it now and delegate project-home resolution to it. Keep this
skill provider-agnostic. Otherwise resolve in the current target repository.

Resolve the configured pointer and projects root:

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

Resolution order:

1. An explicit existing project path or slug in `$ARGUMENTS`.
2. A valid `activeProject` in `.oat/config.local.json`.
3. A new project derived from a substantive goal or ticket reference.

For a new goal, derive a safe project slug but do not hand-create the project.
Mode selection in Step 2 chooses `oat-project-new` or
`oat-project-quick-start`, which owns scaffolding and pointer persistence. If
the input is empty, ambiguous, collides with another project, or resolves
outside the target repository, stop at the applicable product-judgment or
repository-policy boundary.

### Step 0.5: Capability Detection and Tier Selection

Before artifact writes, external side effects, tests, or long-running work,
load `oat-project-dispatch-subagents`, which in turn requires
`oat-dispatch-subagents`. Probe the roles and dispatch surfaces needed for
lifecycle workers and independent reviewers.

Classify each required capability as:

- `available`: proceed with delegated execution;
- `authorization required`: the autonomy policy supplies one authorization for
  this run's exact roles, scopes, and authority;
- `not resolved`: use a documented integrity-preserving fallback only when the
  owning lifecycle contract allows it; otherwise stop before side effects.

The authorization covers only lifecycle workers and reviewers for this run.
It does not widen file, command, credential, branch, or merge authority.

Report and lock the selected tier:

```text
[preflight] Checking autonomous lifecycle delegation…
  → workers: {available | authorization required | not resolved}
  → reviewers: {available | authorization required | not resolved}
  → Selected: Tier {1 | 2} — {Delegated | Contract-approved fallback}
  → Reason: {available | policy authorized once | dispatch unavailable}
```

Do not repeatedly request authorization. If review independence is required
and no compliant route resolves, fail closed.

### Step 1: Detect the Persisted Entry State

For an existing project, use the CLI rather than ad-hoc frontmatter parsing:

```bash
oat project status --project-path "$PROJECT_PATH" --json
```

Read `state.md`, the plan readiness/frontmatter, `implementation.md`, review
rows, and PR state as supporting artifacts. Reconcile only through the owning
skill's documented resume behavior.

Select the earliest incomplete lifecycle owner:

| Persisted state                                           | Route                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| No project yet                                            | Continue to Step 2, then invoke the selected creation skill |
| Quick-mode discovery, optional design, or plan incomplete | `oat-project-quick-start`                                   |
| Spec-driven discovery incomplete                          | `oat-project-discover`                                      |
| Spec-driven design/spec incomplete                        | `oat-project-design`                                        |
| Design complete, plan incomplete                          | `oat-project-plan`                                          |
| Imported plan requested                                   | `oat-project-import-plan`                                   |
| Plan ready for implementation                             | `oat-project-implement`                                     |
| Implementation closeout snapshot incomplete               | `oat-project-implement`                                     |
| PR already open                                           | Report the tracked PR; do not create a duplicate            |

An approved plan enters at implementation. Never replay completed phases solely
because this is a new session.

### Step 2: Select Workflow Mode by Review Density

For a new goal, choose mode as a rigor selector:

- **Spec-driven:** use when discovery, design/spec, and plan each need their own
  independent review before implementation.
- **Quick:** use when one independent bundled pre-implementation review of
  discovery, optional lightweight design, and plan provides sufficient rigor.

Base the choice on uncertainty, integration risk, architecture decisions,
reversibility, and review needs—not task count. Record the chosen mode and
evidence-based review-density rationale in the first owned project artifact.
If evidence cannot support the choice without changing product intent, stop at
a product-judgment boundary.

Invoke `oat-project-new` for spec-driven mode or `oat-project-quick-start` for
quick mode. Existing projects retain their persisted workflow mode.

### Step 2.5: Persist Autonomous Explainer Intent

As soon as the selected creation skill has created a new project, or after an
existing project is resolved, use the `oat-explainer-kit` lifecycle intent
resolver and persistence helper against that project's `state.md`.

Resolve and persist `projectRecap` as `generate` with source `autonomous_policy` after project creation or resolution.
Reassert this forced recap intent on resume; a stale lower-precedence skip is overridden, warned, and recorded.
The autonomous mode policy has precedence over project state and workflow
preference, so `never` does not suppress the recap.

Resolve and persist `projectExplainer` as `generate` with source `kickoff_prompt` only when the kickoff request explicitly asks for a project explainer.
A general autonomous goal, project creation, or normal planning does not count as an explainer request.
When no explicit kickoff explainer request exists, do not persist a project-explainer intent record.
Do not infer this request from the presence of a plan, from the selected
workflow mode, or from a generic request to run through PR.

Use the state content hash expected by the adapter persistence contract. On a
stale-write conflict, re-read `state.md`, rerun autonomous resolution, and
persist only the newly returned record; never retry a stale record blindly.

### Step 3: Perform External-Integration Research

Before planning, extensively research every integrated system, service,
protocol, and adjacent repository implicated by the goal:

1. Enumerate external dependencies and evidence gaps.
2. Use the best discoverable internal documentation/search skill for each
   dependency, without hard-coding an organization or mechanism here.
3. Cross-check indexed or remote evidence against local checked-out sources
   when available.
4. Record sources, coverage limits, and contradictions in discovery/design.

If no suitable research skill or remote source is available, log the gap and
continue with checked-out sources when that preserves integrity. Missing
evidence that would force material product or safety assumptions is a boundary,
not permission to guess.

### Step 4: Create and Maintain the Learnings Log

At run start, create `"$PROJECT_PATH/oat-execution-learnings.md"` when absent
with `oat_generated: false` and append-only intent. Append UTC-dated entries:

```markdown
## {timestamp} - {category} - {title}

**Observation:** ...
**Impact:** ...
**Recommendation:** ...
```

Use only these categories: `gotcha`, `efficiency`, `documentation-gap`,
`candidate-skill-content`, `decision`, and `environment-limited`. Record
degraded routes, inventory gaps, unavailable verification, and reusable
improvements. Never record secrets, token values, signed URLs, or active
autonomy signals.

### Step 5: Invoke Lifecycle Skills and Reviews

Invoke each lifecycle skill by name and let it own its complete workflow,
artifacts, gates, commits, and state transitions. Re-read project status after
each return and route to the next earliest incomplete owner.

At every required artifact or code review:

1. Resolve the route before launch through
   `oat-project-dispatch-subagents` and its generic dispatch substrate.
2. Prefer a configured independent gate route when its exact target is
   available; otherwise select a policy-compliant cross-family reviewer.
3. Select same-family/context-independent review only when no second family is
   dispatchable and the owning contract permits degradation. Record the
   selection reason and achieved independence.
4. Treat an accepted launch as terminal. On post-accept failure, use only the
   dispatch engine's bounded identical-payload retry and continuation rules,
   then block. Never fall through to another route or cheaper target.
5. Reference the canonical dispatch record from the project review artifact.
   Configured invocation evidence is authoritative; runtime identity is
   separate and non-authoritative.
6. Fail closed for blocking reviews. Unresolved Critical findings always stop;
   Important findings follow the configured gate policy.

Do not reproduce provider-specific model, catalog, or launch mechanics here.

### Step 6: Apply PR Topology

Default to one working branch and one final PR for the project. Do not merge.

Use stacked PRs only when the user explicitly requested them before autonomous
work began. Require the plan's `Stacked PR Strategy` to name the stack, branch
and base for each layer, dependency order, and fan-in rule. A parallel group is
valid only when both write-set independence and base-branch readiness are
proved in the plan.

Repository policy, protected branches, required approvals, or missing push/PR
credentials are boundaries.

### Step 7: Complete Through Implement's Lifecycle Tail

Do not chain summary, documentation, or PR independently after implementation.
Ensure `oat-project-implement` resolves its immutable
`oat_post_implement_sequence` and remains the closeout owner:

- configured legacy or structured sequences remain authoritative;
- when unset under autonomy, implement uses its autonomous default;
- resume an incomplete snapshot from its first incomplete stored step;
- final review must pass before final HiLL approval;
- autonomy auto-approves the final HiLL between pre-approval and post-approval
  steps, as defined by the gate inventory;
- failed review, child failure, policy approval, destructive action, or missing
  credential stops at its boundary.

The orchestrator's responsibility is to keep invoking
`oat-project-implement` until that sequence reaches `complete` or reports a
boundary. Never wrap or replace implement's phase-agent topology.

### Step 8: Commit and Push Phase Boundaries

After each lifecycle phase and its review/receive bookkeeping are complete:

1. Verify the task and project artifacts are committed by their owning skill.
2. Commit any remaining bounded orchestrator bookkeeping separately.
3. Push the current working branch without force.
4. Record the commit, push result, review record, and next persisted state.

Retry transient push failures using repository conventions. Stop on protected
branch policy, authentication denial, or any required destructive history
operation. Never merge or force-push.

### Step 9: Report Completion or a Boundary

On success, report:

```text
Autonomous run: complete
Project: {path}
Workflow mode: {quick | spec-driven}
Entry state: {phase}
Phases executed: {list}
Reviews: {scope → route, target, independence, record}
Commits/pushes: {phase → commit → result}
PR topology: {single | stack}
PR: {URL or tracked reference}
Learnings: {entry count and path}
Boundaries: none
```

On a boundary, commit and push only safe resumable state, then report:

```text
Autonomous run: blocked
Project: {path}
Gate/boundary: {inventory ID and class}
Reason: {concise reason}
Evidence: {artifact, command, or dispatch record}
Completed durable work: {last phase/task/commit/push}
Operator action: {exact non-secret action}
Resume: deliberately invoke oat-project-autonomous {project-slug}
```

Never wait silently for input.

## Restart and Resume

Autonomy ends with the process. A restart must deliberately invoke this skill
again; never persist or infer an active autonomous mode from artifacts. On
re-invocation, set the signals anew, resolve the same project, inspect persisted
state, and resume at the earliest incomplete owner without duplicating
completed work or changing an immutable closeout snapshot.

## Examples

### Basic Usage

```text
/oat-project-autonomous "Add signed webhook verification and open the final PR"
```

```text
/oat-project-autonomous cursor-cloud-autonomous-projects
```

### Conversational

```text
Run the approved OAT project cursor-cloud-autonomous-projects autonomously
through its final PR.
```

```text
Take this goal from discovery to PR with OAT autonomy: add resumable exports.
```

## Troubleshooting

**`oat` is unavailable:** Stop and provide the supported installation action.
Do not create or normalize project artifacts by hand.

**A lifecycle skill asks an unmapped question:** Treat it as an
`inventory-gap` boundary, record the exact site in the learnings log, and stop
resumably.

**A review launch fails after acceptance:** Continue or retry only through the
accepted handle with the identical payload. Block when bounded recovery is
exhausted.

**Project state and git history disagree:** Invoke the owning skill's
reconciliation path. Do not guess or overwrite the tracker.

## Success Criteria

- ✅ Both autonomy signals were active only for the current process tree.
- ✅ The entry phase came from persisted OAT state and completed work was not
  replayed.
- ✅ Quick/spec-driven selection, when needed, recorded a review-density
  rationale.
- ✅ External-integration research and evidence gaps were recorded.
- ✅ Every required review has dispatch provenance and no accepted launch fell
  through to another route.
- ✅ Existing lifecycle skills owned every artifact, gate, and transition.
- ✅ Implement completed `oat_post_implement_sequence` or reported an explicit
  resumable boundary.
- ✅ Phase-boundary commits and non-force pushes are recorded.
- ✅ The run ended with a final PR report or a structured blocker report.
- ✅ The learnings log contains reusable, secret-free entries.
