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

The canonical
[autonomy contract and exhaustive gate inventory](../../../../../.agents/docs/autonomy-contract.md)
maps each prompt to its autonomous resolution and provenance.

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
- Critical findings and failed blocking reviews stop progression. Important
  findings follow the configured gate policy.

Project review artifacts and review rows reference launcher-owned dispatch
records. The configured invocation is authoritative evidence; child
self-reporting is optional corroboration. See [Evidence
Layers](evidence-layers.md) and [Reviews](reviews.md).

## HiLL and lifecycle closeout

If checkpoint selection is unconfirmed when autonomy starts implementation,
OAT takes the existing `workflow.hillCheckpointDefault: final` path explicitly:

```yaml
oat_plan_hill_phases: ['<final-phase-id>']
oat_auto_review_at_hill_checkpoints: true
```

An existing valid explicit list is preserved. An existing `[]` is also
preserved and means every phase, never no phases. At each configured checkpoint,
autonomy runs and receives the review without waiting.

At final closeout, pre-approval lifecycle steps run first. After a passing final
review, autonomy records final HiLL approval and then runs post-approval steps.
A failed blocking review stops before approval. The default autonomous tail is
summary, documentation, and final PR when no post-implementation sequence is
configured; stored legacy or structured sequences retain their documented
meaning.

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

- [HiLL Checkpoints](hill-checkpoints.md) — checkpoint field semantics and
  interactive behavior.
- [Implementation Execution](implementation-execution.md) — phase execution,
  review, fixes, and closeout.
- [Cursor Cloud](cursor-cloud.md) — project-home and environment-readiness
  guidance for cloud runs.
