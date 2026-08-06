---
oat_retro_project: oat-project-retro
oat_retro_generated: '2026-08-06T06:21:34Z'
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-reviews
    status: used
  - source: session-transcript
    status: used
  - source: github-pr-192
    status: used
oat_retro_promotions: none
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: oat-project-retro

## Executive Summary

The project delivered the first-class OAT retrospective workflow it set out to
build: evidence-grounded generation, independently consented application and
filing, machine-scannable registers, post-approval lifecycle integration,
completion fallback, documentation, and release packaging.

The run also demonstrated why the feature is needed. Planning and implementation
reviews repeatedly found gaps between prose intent and executable contracts.
Most were repaired before release, but the configured closeout sequence itself
was skipped: no durable sequence snapshot was persisted, and summary,
documentation, and PR generation had to be recovered manually after final
approval. The missing snapshot is confirmed; the internal branch that allowed
the terminal transition remains inconclusive.

Self-retrospection then found and repaired a separate Bugbot consent issue in
the snapshot example and the resulting autonomy-inventory CI drift. At
generation time, PR #192 was clean, with CI, release dry-run, and Bugbot
passing. One actionable upstream item was proposed at generation time: make
configured-but-absent closeout snapshots fail closed and cover the terminal
transition with executable regression evidence.

## Evidence and Review Method

This retrospective reconciles:

- [project-log.md](../project-log.md), read first as the append-only workflow
  record;
- [implementation.md](../implementation.md), [state.md](../state.md),
  [plan.md](../plan.md), [design.md](../design.md),
  [discovery.md](../discovery.md), and [summary.md](../summary.md);
- archived phase, plan, and final review artifacts;
- the local session transcript through three bounded read-only lanes covering
  durable lifecycle evidence, transcript chronology, and dual-lane
  classification; and
- PR #192 review comments and final check state.

No `oat-execution-learnings.md` exists for this project. The local transcript
omits terminal tool-result bodies in places, so committed artifacts, GitHub
check results, and archived reviews are authoritative for runtime outcomes.
The missing closeout snapshot is confirmed by durable state and the project
log. Whether it resulted from a missing router transition, premature terminal
return, or another control-flow branch is inconclusive.

The imported WordPress retrospective and handoff were treated as design
exemplars, not evidence of this run.

## Outcome Snapshot

| Area             | Outcome                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Planned delivery | 12 of 12 tasks across five phases completed                                                                   |
| Product surface  | Retro template, generate/apply skill, filing skill, config, lifecycle integration, completion offer, and docs |
| Dogfood          | Generated and applied one explicitly approved promotion on `explainer-improvements`; no external filing       |
| Reviews          | Plan gate passed after four rounds; all phase reviews and narrowed final review passed                        |
| Release          | Five public packages advanced to `0.2.30` after a collision with `main`                                       |
| PR               | At generation time, #192 was open, mergeable, and passing CI, release dry-run, and Bugbot                     |
| Recovered defect | Consent-bearing snapshot example and autonomy prompt-site mappings fixed before retro generation              |
| Remaining defect | Configured closeout can reach terminal state without a durable sequence snapshot                              |

## Current State

- **Promotions:** `none`; no RP apply-items exist.
- **Filing:** `complete`; UP-01 is filed to
  `.oat/repo/pjm/backlog/items/BL-260806-fail-closed-when-configured.md`.
- **Unsettled items:** None.

## What Went Well

### Reviews changed the product, not just the wording

The review loop found material contract defects before release: pre-approval
retro timing, disposition routing, config command coverage, rendered template
provenance, interrupted-side-effect recovery, tool grants, derived fixture
updates, and release ordering. Bounded continuations returned fixes to the
accepted phase owners, and each affected scope was re-reviewed.

### Consent boundaries remained explicit

The final architecture separates authorization to generate, apply, and file.
An explicitly configured post-approval step can authorize generation, but
promotion application and tracker filing have their own gates. Dogfood honored
that model: one item was applied only after explicit approval, and no external
filing occurred.

### Fail-closed behavior protected recovery

Smoke cleanup refused to delete unjournaled descendants until root verified the
exact disposable worktrees and branches. Release validation rejected a package
version that no longer advanced `main`. The PR checks caught autonomy inventory
drift introduced by the Bugbot fix. Each failure was concrete, bounded, and
recoverable without weakening the underlying guardrail.

### Evidence survived a long, parallel implementation

The implementation artifact records accepted phase and review dispatches,
bounded fix continuations, task commits, verification, and deviations. That
durable chronology made it possible to distinguish resolved review findings
from the one unresolved lifecycle defect.

## Challenges and Struggles

### Planning required four gate rounds

The initial plan omitted several load-bearing dependencies and consent details.
Successive reviews found missing navigation, config-command exposure, register
routing, final-tree release checks, commit ownership, and template provenance.
The churn was useful, but many findings were mechanically related and could
have been surfaced by a broader first-pass contract audit.

### Prompt contracts and executable contracts diverged

The skills prescribed commands they were not allowed to run, changed
scanner-sensitive prompt sites without updating the autonomy inventory, and
required derived fixtures outside the original file boundaries. These were not
implementation-algorithm failures; they were dependency-closure failures
across instructions, grants, tests, inventories, and bundled assets.

### Parallel integration exposed cross-phase drift

Independently passing phases produced a stale sequence assertion only after
fan-in. This validated the full integrated gate, but also showed that
file-disjoint implementation does not guarantee contract-disjoint behavior.

### The lifecycle violated its own closeout contract

The configured sequence required summary, documentation, and PR work before
final approval. Implementation nevertheless completed without
`oat_post_implement_sequence`. Manual recovery recreated the outputs, but
could not restore the intended ordering or sequence provenance.

### Release freshness changed after the original review

`main` independently reached `0.2.29` after PR creation. The branch had to move
to `0.2.30`, merge current `main`, resolve six package-version conflicts, and
rerun validation. The recovery succeeded, but the final reviewed head and
release head changed late in closeout.

## Decision Register

| Decision                                       | Rationale                                                 | Consequence                                                                                              | Durable source                                             |
| ---------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Run retros only after approval                 | Approval and revision history are retro evidence          | `retro` is invalid in `preApproval`; completion provides the fallback offer                              | [discovery.md](../discovery.md), [design.md](../design.md) |
| Treat the artifact as the integration contract | Completion, apply, and filing need decoupled resumability | Stable RP/UP IDs, bounded mutable fields, and derivable rollups                                          | [design.md](../design.md)                                  |
| Separate generation, apply, and filing consent | Each action has a different side-effect boundary          | Explicit sequence config, `workflow.retro.apply`, and filing destinations authorize different operations | [summary.md](../summary.md)                                |
| Keep filing in a companion workflow            | Generation should not create tracker side effects         | Filing owns capability checks, deduplication, sanitization, and writeback                                | [design.md](../design.md)                                  |
| Keep autonomous defaults unchanged             | Retros should not appear without explicit opt-in          | Unconfigured autonomous closeout still omits retro                                                       | [discovery.md](../discovery.md)                            |

No additional decision record is warranted. These choices already have durable
homes in project artifacts and promoted repository decision records.

## Rejected or Superseded Alternatives

- A summary-time retro offer was rejected because it runs before final approval
  and revision evidence exists.
- Automatic issue creation inside retro generation was rejected in favor of a
  separately consented filing workflow.
- A single propose-only workflow was superseded by generate and apply modes
  with explicit authorization.
- Implicit non-interactive duplicate handling was rejected; configured runs
  must not silently strengthen or refile existing tracker items.
- Treating the first dogfood project as self-dogfood was rejected. The
  `explainer-improvements` run proved acceptance behavior; this artifact tests
  whether the new workflow can explain its own creation.

## Where We Changed Course

### From lifecycle offers to an approval-aware sequence

Discovery began with adjacent lifecycle offers. Operator feedback established
that the approval tail is part of the evidence, moving the primary integration
to a configured post-approval step and leaving completion as a safety net.

### From a simple promotion list to routed registers

Review showed that repo findings could require either direct application or
tracker filing. `Disposition: apply | file`, disposition-specific statuses,
and independent rollups replaced the ambiguous original register.

### From nominal success to executable recovery contracts

Phase reviews added interrupted-side-effect recovery, duplicate reconciliation,
mutable disposition notes, provenance validation, and explicit shell grants.
The implementation increasingly treated resumability as part of correctness.

### From completing the PR to self-retrospection

The self-retro was deliberately paused twice: first to repair the Bugbot
consent finding, then to repair the autonomy inventory failure caused by that
wording change. The artifact therefore describes the final passing PR rather
than a stale pre-review state.

## New Architecture Patterns and Approaches

### Artifact-mediated workflow composition

Generation, application, filing, and completion communicate through one
versionable Markdown contract instead of directly invoking one another's
internals. Stable IDs and narrow mutable fields support idempotent retries.

### Consent as separate capability layers

Consent is not one boolean. Generation, repo mutation, duplicate strengthening,
and external filing each have distinct authorizers and recovery behavior.

### Bounded same-owner repair

Review fixes return to the accepted phase implementer with a constrained file
set and then receive independent re-review. This preserves context without
turning findings into an unbounded root rewrite.

## Domain Learnings

### Prompt-driven lifecycle code needs transition-level tests

Static text assertions proved that required sentences existed, but they did not
prevent the observed configured sequence from being skipped. Lifecycle
correctness needs evidence at the state-transition boundary: configured input,
snapshot persistence, ordered child completion, approval transition, and
terminal mutation.

### Derived maintenance surfaces are dependencies

Skill wording can change allowed-tool contracts, provider bundles, version
fixtures, scanner inventories, and autonomy prompt-site hashes. These are part
of the change graph even when the implementation files are disjoint.

### A later green run does not prove an earlier mechanism

Manual summary/document/PR recovery and green PR checks prove the final outputs,
not why the automatic sequence failed. The retro preserves that distinction.

## Gotchas for Humans

1. Confirm discovery choices before allowing them to mutate project artifacts;
   exploratory assistant suggestions are not user decisions.
2. Run the branch-local CLI when dogfooding unreleased config keys. A globally
   installed CLI may reject valid branch-only keys.
3. Treat a package bump as relative to current `main`, not as a permanent
   property of the branch.
4. Review the actual persisted snapshot, not only the configured preference,
   before approving final closeout.
5. A neutral Bugbot check does not guarantee there are no unresolved inline
   comments; inspect review threads before declaring the PR review-complete.

## Gotchas for Autonomous Agents

1. Do not mark implementation complete when a configured sequence has no
   snapshot. Configured-plus-absent is an error state, not an unset preference.
2. Do not infer authorization from an illustrative YAML value. Persist only the
   exact normalized configuration.
3. When a skill instruction changes, run scanner, grant, version, bundle, and
   generated-contract checks—not only the nearest focused test.
4. After parallel fan-in, rerun integrated contracts even when every child
   phase passed independently.
5. Treat no-edit flaky-test reruns as evidence about that test only; do not use
   them to waive unrelated failures.
6. Keep monitoring PR checks until CI, release validation, and review automation
   all reach terminal states.

## Repo Improvements (Promotion Register)

At generation time, no unresolved repo-local promotion was proposed. The
consent-bearing snapshot example and its autonomy-inventory mappings were
repaired before this artifact was generated. Because the host repository is
OAT itself, the remaining general lifecycle defect was recorded once in the
upstream register rather than duplicated as a repo filing item.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Fail closed when a configured closeout snapshot is absent

- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260806-fail-closed-when-configured.md`
- **Sanitized:** yes
- **Disposition-note:** Filed as a dedicated item after classifying the
  mandatory-skill-load candidate as related rather than an exact duplicate.

`workflow.postImplementSequence` configured pre-approval summary,
documentation, and PR steps, but the run reached implementation completion
without persisting `oat_post_implement_sequence` or dispatching those children.
Manual recovery restored outputs but not ordering or provenance. Existing
contracts detect an incomplete snapshot when one exists; they do not
reliably prevent configured-plus-absent state from reaching terminal
completion.

Strengthen the lifecycle invariant so configured or autonomous closeout cannot
complete unless a matching durable snapshot exists and is complete. Route
configured-plus-absent state back to `oat-project-implement`, add
transition-level or smoke coverage for snapshot creation and ordered child
dispatch, and deduplicate against the existing mandatory-skill-load backlog
item before filing.

## Remaining Boundaries and Follow-Ups

- At generation time, PR #192 was open and awaiting human review/merge.
- Current register and filing status is reported only in `Current State`.
- The precise internal mechanism that skipped snapshot creation remains
  inconclusive; the follow-up should reproduce the terminal transition rather
  than assume a cause.
- At generation time, the project-log end-of-run synthesis was pending until
  project completion/archive.

## Reflections

This project succeeded twice: first by shipping a structured retrospective
workflow, and then by giving that workflow a real failure worth explaining.
The strongest result is not the number of sections in the template. It is the
discipline encoded around evidence, consent, and resumability.

The run also exposed the limit of prose-heavy safety. The closeout instructions
already said the right things, yet the configured sequence was skipped. Future
work should preserve the guidance while moving the invariant closer to
executable state transitions and terminal checks.

The self-retro improved the branch before merely describing it. Pausing for the
Bugbot consent finding and the subsequent CI inventory failure kept the final
artifact honest: the recorded outcome is the passing, reviewed head, while the
generation-time proposal is narrow, evidenced, and explicitly unresolved.
