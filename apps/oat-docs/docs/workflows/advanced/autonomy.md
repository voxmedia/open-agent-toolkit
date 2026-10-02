---
title: Autonomous Project Execution
description: 'Session-scoped autonomy signals, gate boundaries, review requirements, and execution-learnings behavior for OAT projects.'
---

# Autonomous Project Execution

OAT autonomy is an explicit session policy for driving a project through its
lifecycle without waiting at ordinary interactive gates. It does not bypass the
gate-owning skills: each skill still applies its own checks, records provenance,
and either resolves the gate or reports a boundary.

The provider-agnostic entry point is `oat-project-autonomous`. Invoke it
deliberately with a goal, project slug, ticket reference, or active project. A
restart does not silently resume autonomy; invoke the skill again and it resumes
from the persisted project state.

Terms used on this page:

- **Active project:** the project your checkout currently points to. The
  pointer is the `activeProject` value in `.oat/config.local.json`.
- **Synced project:** a project whose artifacts live on a separate Git ref
  (`refs/oat/projects/<project>`) instead of on your feature branch. Skills
  publish its artifact changes with `oat project push`.
- **HiLL checkpoint:** a human-in-the-loop stop after a plan phase. In an
  interactive run, the agent waits there for your approval.
- **Dispatch policy:** the project's rule for which models its worker and
  reviewer subagents may use. See [Dispatch Policy](dispatch-ceiling.md).
- **Boundary:** a point where an autonomous run stops on purpose and reports
  what a person must decide or provide before it can continue.

## Activation contract

An autonomous session uses both signals:

```bash
export OAT_AUTONOMOUS=1
export OAT_NON_INTERACTIVE=1
```

`OAT_AUTONOMOUS=1` implies and sets `OAT_NON_INTERACTIVE=1` for the current
run. The distinction is intentional:

- `OAT_NON_INTERACTIVE=1` selects existing safe no-prompt paths for one
  workflow.
- `OAT_AUTONOMOUS=1` additionally enables lifecycle chaining, defined gate
  resolutions, boundary stops, and provenance requirements.

Both signals are session-scoped. Never write them to `state.md`, `plan.md`,
repository config, user config, or any other durable artifact. A later
interactive session therefore needs no autonomy cleanup and behaves
interactively around the state the autonomous run left behind.

## Gate outcomes

Every interactive lifecycle gate has one of two autonomous outcomes:

1. **Auto-resolve** using an existing safe path, then record the decision and
   evidence.
2. **Boundary stop** with a structured blocker and a resumable next step.

The main boundary classes are:

- **Product judgment** — repository evidence cannot resolve material scope or
  requirements ambiguity.
- **Destructive-change risk** — an action could discard work, delete data,
  rewrite history, or broadly restructure an unapproved surface.
- **Unresolved Critical findings** — a blocking review has not passed.
- **Repository-policy approval** — protected operations require authority the
  session does not have.
- **Missing credentials** — a required external action has no authenticated
  route or offline equivalent.

A boundary is a successful fail-closed outcome, not permission to continue with
a guessed answer. The run reports what stopped, the evidence, and the operator
action needed to resume.

The canonical autonomy contract and exhaustive gate inventory
(`.agents/docs/autonomy-contract.md`, vendored into each consuming skill at
`references/docs/autonomy-contract.md`) map each prompt to its autonomous
resolution and provenance.

### Dispatch-ladder scope selection

An incomplete reusable dispatch ladder is auto-resolvable when an authorized
adoption-compatible config scope is available. Autonomous planning checks
config-file existence in this fixed order without prompting or reordering from
effective value or matrix-cell provenance:

1. user config (`~/.oat/config.json`);
2. repo-local config (`.oat/config.local.json`);
3. shared config (`.oat/config.json`), only when repository policy already
   authorizes that write.

Before writing, planning rejects a candidate that would preserve a
provider-level scalar in that scope or remain shadowed by one at higher
precedence. It always tries the next authorized compatible candidate and stops
without mutation only when none remains.

The planner runs exactly one matching `oat config adopt dispatch-matrix --keep-existing`
command, records file-existence and compatibility evidence plus the selected
scope, and re-runs dispatch preflight. Existing explicit cells remain unchanged;
their provenance does not select the persistence scope. No authorized
compatible scope, or a ladder that remains incomplete after adoption, is still
a repository-policy boundary. `OAT_NON_INTERACTIVE=1` without
`OAT_AUTONOMOUS=1` does not select a scope and continues to fail closed.

## Review contract

Autonomous execution preserves independent review:

- Discovery, design, and plan artifacts run their configured exit gates.
  Quick-start reviews the discovery, optional lightweight design, and plan as
  one bundle when those artifacts exist.
- Review routing is selected before launch through the dispatch substrate.
  A configured gate target is preferred when available; otherwise policy may
  choose a target-preserving subagent route. Any reduced independence is
  explicit in the dispatch record.
- Once a launch is accepted, it is terminal for route selection. Failures use
  bounded recovery with the same payload; they do not silently fall through to
  a cheaper or less independent reviewer.
- Eligible review artifacts are received immediately. Fix tasks use the normal
  bounded implement-and-re-review loop.
- Critical findings and failed blocking reviews stop progression. High
  findings follow the configured gate policy.
- A normal phase or final lifecycle review cannot satisfy a configured
  implementation exit gate. Only gate invocation provenance with the matching
  run ID can authorize that boundary.

Project review artifacts and review rows reference launcher-owned dispatch
records. The configured invocation is authoritative evidence; child
self-reporting is optional corroboration. See [Evidence
Layers](evidence-layers.md) and [Reviews](../projects/reviews/index.md).

## HiLL and lifecycle closeout

Autonomous runs ignore the configured `workflow.hillCheckpointDefault` and
`workflow.autoReviewAtHillCheckpoints` settings. When an autonomous run starts
implementation, it chooses checkpoints this way:

- If the plan already stores a valid checkpoint list in
  `oat_plan_hill_phases`, the run keeps it unchanged. A stored `[]` means every
  phase, never no phases.
- If the plan stores no list yet on the first implementation run, the run sets
  a checkpoint at the final phase only.
- In both cases, the run turns on review at checkpoints, even if an earlier
  interactive setup turned it off.

For a plan with no stored list, the run writes:

```yaml
oat_plan_hill_phases: ['<final-phase-id>']
oat_auto_review_at_hill_checkpoints: true
```

At each checkpoint, the run reviews the phase and processes that review
instead of waiting for you. An invalid stored value is not replaced; the run
stops at a boundary instead.

At final closeout, autonomy follows the same authoritative order as an
interactive run: final verification, mandatory final lifecycle review,
configured implementation exit gate, pre-approval sequence, final HiLL
approval, post-approval sequence, then implementation completion and success
output. A `not_configured` resolution persists an explicit no-gate allowance
before the sequence starts; a null, missing, or unrecognized resolver result
fails closed as unresolved. A gate this project disabled persists an
`allowed/configured` result with `disposition: project_disabled` and never
launches the configured command.

Autonomy does not turn an ordinary independent review into configured-gate
provenance. A configured review must produce a gate-originated artifact with
the matching run ID, and eligible receive must be durably reconciled. Blocked,
ambiguous, malformed, or stale gate state is a boundary stop: the run remains
resumable through `oat-project-implement` and cannot continue to approval,
completion, or output.

The default autonomous tail is summary, documentation, and final PR when no
post-implementation sequence is configured; stored legacy or structured
sequences retain their documented meaning.

## Execution-learnings loop

Autonomous runs keep an append-only project-local
`oat-execution-learnings.md`. Dated entries record an observation, impact, and
recommendation under the source taxonomy: `gotcha`, `efficiency`,
`documentation-gap`, `candidate-skill-content`, `decision`, or
`environment-limited`.

When the file exists, `oat-project-summary` synthesizes actionable
recommendations into `## Autonomous Execution Learnings`, grouped as:

- agent-instruction updates;
- cloud-environment improvements;
- code follow-ups;
- workflow issues.

Each recommendation links back to its source entry. Projects without the
learnings file render normal summaries with no autonomous-learnings section.
The summary export keeps the synthesized recommendations after project
archival.

## Taking over interactively

After an autonomous session ends:

1. Start a normal session without the autonomy environment signals.
2. Open the same project from its repository-local `.oat` directory.
3. Resume the owning lifecycle skill.

Persisted review rows, task state, explicit HiLL checkpoints, and dispatch
provenance remain valid. Interactive prompts and checkpoint pauses return
normally because autonomy itself was never persisted.

## Related

- [HiLL Checkpoints](../projects/planning/hill-checkpoints.md) — checkpoint field semantics and
  interactive behavior.
- [Implementation Execution](../projects/execution/implementation-execution.md) — phase execution,
  review, fixes, and closeout.
- [Cursor Cloud](cursor-cloud.md) — project-home and environment-readiness
  guidance for cloud runs.

## oat-project-autonomous

Use this entry only after an explicit request for end-to-end autonomous project
execution. It chains the existing lifecycle owners rather than replacing their
gates or creating another implementation coordinator.

> [!WARNING]
> **What it does without asking:** after every lifecycle phase, an autonomous
> run commits its work and pushes the current branch to its remote (never with
> force). It also commits its own state and learnings-log updates, dispatches
> worker and reviewer subagents under one authorization for the whole run,
> generates a project recap, and opens the final pull request. None of these
> steps asks for confirmation. It never merges the pull request.
>
> - **Start it on a feature branch, never on `main`.** It pushes whichever
>   branch you are on.
> - **Set a dispatch policy first.** The run never chooses a dispatch policy
>   for you. If the project has none, the run stops at a repository-policy
>   boundary.
> - **Clear the active project if you want a new one.** If a valid active
>   project is set, the run resumes that project even when you pass a new goal.
>   Run `oat-project-clear-active` before you pass a new goal.
>
> The run stops and reports instead of guessing when it reaches any of these
> boundaries: a product decision the repository evidence cannot settle
> (`product-judgment`); an action that could delete data, overwrite work, or
> rewrite history (`destructive-change-risk`); an unresolved Critical review
> finding or a blocking review that cannot pass
> (`unresolved-critical-findings`); a protected branch, required approval, or
> unresolved dispatch policy (`repository-policy-approval`); a missing
> credential (`missing-credentials`); or a prompt that has no autonomous rule
> in the gate inventory (`inventory-gap`). A configured gate that fails with
> `onFailure: prompt`, or that cannot run or return a valid result, also stops
> the run.

**Invocation:** Provide a substantive goal for new work, or an existing project
slug or path to resume. These are agent requests, not terminal commands.
Providers with `$` syntax use `$oat-project-autonomous`.

```text
/oat-project-autonomous "Add resumable exports and open the final PR."
```

```text
/oat-project-autonomous export-filter
```

**Prerequisites:** Needs an active OAT project: no. A new goal can create a
project through the entry skill the run selects. An explicit existing project
or a valid active project supports resume, and empty input requires a valid
active project. The skill resolves an explicit project first, then a valid
active project, then a new goal. Because of that order, a goal you pass while
a valid active project is set resumes the active project instead of creating a
new one. Use the first example only when no project is active, or clear the
active project with `oat-project-clear-active` first.

`oat` must be on `PATH`, and repository policy must permit the work on the
current branch. A dispatch policy must already be configured or recorded in
the project: autonomy never picks one, and an unresolved policy stops the run
at a repository-policy boundary. Required worker and reviewer capabilities
must resolve before the run makes any change.

**Example scenario:** You are on a new feature branch, no project is active,
and a dispatch policy is already configured. You authorize the bounded
resumable-export goal through a final PR without ordinary mid-run approval
pauses. Autonomous entry chooses
lite, quick, or spec-driven review density from the actual uncertainty and
invokes its owning creation skill. If an export-filter project is already
active, the second example explicitly resumes its earliest incomplete step
instead of replaying finished phases.

**Expected output:** Session-only autonomy signals, persisted lifecycle
progress, reviewed task commits, and project-local execution learnings. Existing
projects retain their mode. A successful run reports the actual final PR and
review evidence. A blocked run names the boundary, durable completed work,
operator action, and resumable project.

The default topology is one working branch and one final PR. The skill pushes
that branch after every phase, but it does not merge or force-push. Missing
credentials, protected operations, destructive work, unresolved blocking
review, and material product ambiguity are boundaries, as are an unresolved
dispatch policy and any prompt the gate inventory does not cover
(`inventory-gap`). Autonomy does not let an ordinary review impersonate a
configured exit gate.

**Next step:** Inspect the final report and PR, or resolve the named boundary.
After a restart, deliberately invoke the skill again. Persisted project state
supports resume, but does not silently reactivate autonomy.

## Choosing how unattended to run

| Mode                  | Choose when                                     | Tradeoff                                                        |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Interactive (default) | You want to steer approvals                     | Requires a person at prompts                                    |
| Non-interactive       | A scripted step needs documented defaults       | Unresolved choices stop; no continuous autonomous consent       |
| Explicit autonomous   | A clear goal can run within declared boundaries | Less live steering; review outputs and publication consequences |

A restarted session is interactive. If you want autonomy to continue after a
restart, invoke `oat-project-autonomous` again. Autonomy never chooses a
dispatch policy for you, and it never merges a pull request. An autonomous run
stops when it reaches a product decision, a destructive or protected action, a
missing credential, an unresolved blocking review, or a required check it
cannot perform.

- If this is your first trial of OAT, choose interactive, because you see
  every approval and can steer the work as you learn the lifecycle.
- If you need one scripted or CI step, choose non-interactive
  (`OAT_NON_INTERACTIVE=1`), because each skill takes its documented default
  and stops on any choice without one. It does not chain skills or approve
  anything on your behalf.
- If you have a well-specified change you trust to run unattended, choose
  autonomous, because it carries the work through to a final pull request. Set
  the dispatch policy, the candidate-ladder config, and each gate's
  `onFailure` behavior first, start on a feature branch, and review the pull
  request yourself.
- If the change is high-risk, choose interactive, because a person then
  approves each checkpoint. If you still run it autonomously, set
  `oat_plan_hill_phases: []` in the plan first, because that adds a checkpoint
  review after every phase.

Running without prompts does not authorize any action outside these
boundaries.
