---
title: 'OAT Skill Handoff: Project Retrospective (oat-project-retro)'
date: 2026-08-05
source_project: reliable-local-e2e-tests
source_repository: voxmedia/wp-platform
source_branch: cursor/reliable-local-e2e-tests-3163
source_run: bc-d6ece9f8-6ea8-42a2-8ac5-18ecf9633163
recommended_skill_name: oat-project-retro
recommended_pack: workflows
recommended_artifact: references/project-retro.md
status: ready-for-skill-authoring
---

# OAT Skill Handoff: Project Retrospective

## Mission

Build a first-class OAT skill — recommended name `oat-project-retro` — that
turns the successful ad-hoc retrospective from the
`reliable-local-e2e-tests` project into a reusable lifecycle workflow.

This handoff packages:

1. the operator's intent for the skill;
2. the methodology that produced a high-quality retro;
3. the results and dual-feedback outcomes from that retro;
4. the original user request (verbatim);
5. the full generated `project-retro.md`; and
6. the companion decision record created during the retro.

Copy this document into an Open Agent Toolkit authoring agent and implement the
skill in the workflows pack (alongside `oat-project-summary` /
`oat-project-complete`). Do not re-derive the method from scratch — use this as
grounded input, then generalize for any OAT project.

## Operator Intent (Skill Concept)

> Review the project log. If there is an OAT execution log, review that. If you
> are in a cloud agent environment with access to tooling, review the session
> log, session history, or whatever you did. If you are running locally on a
> machine, review the session log for this agent session. Construct that retro,
> identifying things that need to be fixed or improved in this repo, and
> feedback or upstream fixes for the open agent toolkit based on the run
> experience.

In short: the skill is an evidence-grounded project retrospective with **two
feedback lanes**:

| Lane                        | Audience                  | Typical destinations                                                                   |
| --------------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| Repo / product improvements | The repository under work | Docs, AGENTS, rules, code follow-ups, decision records                                 |
| OAT upstream feedback       | Open Agent Toolkit        | Skill gaps, orchestration bugs, provisioning, dispatch matrix, terminal-event handling |

## Why This Should Be First-Class

`oat-project-summary` captures institutional memory of _what was built_.
`oat-project-retro` captures _how the run felt_: blockers, course changes,
orchestration friction, agent gotchas, and upstream toolkit feedback.

The ad-hoc retro for `reliable-local-e2e-tests` was unusually valuable because
it:

- reconciled durable project artifacts with session/transcript evidence;
- refused to invent root causes when mechanisms were inconclusive;
- produced both repo promotions and OAT upstream recommendations;
- created one missing decision record
  (`001-long-running-verification-observability.md`);
- ended with concrete gotchas for humans and autonomous agents.

That value should not depend on a long free-form prompt.

## Recommended Skill Contract

### Suggested identity

```yaml
name: oat-project-retro
description: >
  Use when the user requests or confirms a project retrospective — e.g.
  "run the project retro", "write project-retro.md", "retrospective this
  project", or confirms a previously offered retro. Do NOT auto-invoke merely
  because implementation or summary completed. Produces
  references/project-retro.md from project logs, execution learnings, and
  session/transcript evidence, with repo improvements and OAT upstream feedback.
```

### When to use

- User explicitly asks for a project retro / retrospective.
- User confirms a previously offered retro step (for example after summary or
  before complete/archive).
- Optional offer point: after `oat-project-summary` or before
  `oat-project-complete`, but **never auto-run**.

### When not to use

- Mid-implementation progress updates (`oat-project-progress`).
- Ordinary summary generation (`oat-project-summary`).
- Generic weekly wrap-ups across many projects (`oat-wrap-up`).
- Spec/design review (`oat-project-review-*`).

### Primary output

Write:

```text
{PROJECT_PATH}/references/project-retro.md
```

Optional companions when justified:

- `{PROJECT_PATH}/references/decisions/NNN-*.md` for decisions not already
  recorded;
- a short `references/oat-upstream-feedback.md` **only if** upstream items are
  numerous enough to clutter the retro (default: keep them in the retro);
- durable repo promotions (docs/AGENTS/rules) only after the retro identifies
  them and the skill's promotion step is approved or clearly in-scope.

### Dual deliverable requirement

Every retro must explicitly separate:

1. **Repo / product improvements** — fixes, docs, instruction gaps, follow-ups
   for the current repository.
2. **OAT upstream feedback** — toolkit skill, orchestration, provisioning,
   dispatch, monitoring, or cloud-environment improvements suggested by the run.

### Evidence sources (required reading order)

1. **Project log** — `project-log.md` (always).
2. **OAT execution learnings** — `oat-execution-learnings.md` when present.
3. **Lifecycle artifacts** — at least `implementation.md`, `state.md`,
   `plan.md`; also `design.md` / `spec.md` / `discovery.md` / reviews /
   evidence ledgers when they exist and are load-bearing.
4. **Session / run evidence** (environment-aware):
   - **Cursor Cloud:** use cloud tooling (`cursor-cloud` MCP —
     `run-info`, `get-events`, `batch-fetch-details`) to obtain the session
     transcript and run events. Prefer subagent reconnaissance over loading
     giant transcripts into the root context. First-class Task child
     `cloudAgentBcId` values should be fetched when relevant.
   - **Local agent session:** review the current agent session transcript /
     history available to the host (e.g. local agent transcripts under the
     Cursor project, conversation export, or host-provided session log).
   - **No session access:** say so explicitly and continue from durable
     artifacts only; do not invent session-only claims.

### Quality bar (from the successful run)

- Evidence-first. Cite project paths and log entry themes.
- Distinguish confirmed cause vs hypothesis vs inconclusive.
- Prefer classification over blame.
- Record rejected alternatives when they shaped the outcome.
- Include agent gotchas and human-operator gotchas when applicable.
- End with reflections that are specific to this run, not generic praise.
- After writing the retro, evaluate durable promotions; do not create nested
  instruction files for discoverability alone.

## Methodology That Worked

This is the method used for `reliable-local-e2e-tests`. Preserve the shape;
generalize domain-specific lane names.

### Phase A — Orient

1. Resolve the active OAT project.
2. Confirm artifact inventory (`project-log.md`,
   `oat-execution-learnings.md`, `implementation.md`, reviews, evidence).
3. Detect environment:
   - Cloud → fetch run identity + transcript/events via `cursor-cloud`.
   - Local → locate this session's agent transcript/history.
4. Print an OAT-style progress banner and step indicators.

### Phase B — Parallel reconnaissance (recommended)

Dispatch bounded read-only subagents (Composer 2.5 / equivalent intelligent-recon
class worked well) in parallel lanes. For the reference run, five lanes were
used:

| Lane                        | Focus                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| 1. Transcript chronology    | Blockers, course changes, operator corrections, silence/orphaned-work incidents  |
| 2. Implementation decisions | Decision points in `implementation.md` / reviews not yet decision-recorded       |
| 3. Orchestration & liveness | Heartbeats, leases, terminal events, tmux/process ownership, bookkeeping cadence |
| 4. Failure taxonomy         | Domain failure classes (in the reference: flaky-test classes)                    |
| 5. Guidance gaps            | What should become durable docs/AGENTS/rules vs stay project-local               |

Lane count may shrink for smaller projects, but keep at least:

- durable artifacts lane;
- session/transcript lane (when available);
- dual-feedback lane (repo vs OAT upstream).

**Important transcript caveat from the reference run:** cloud transcript exports
often omit terminal tool-result bodies. When that happens, treat committed
evidence ledgers, reviews, and project-log entries as authoritative for runtime
detail. Say when a mechanism remains inconclusive.

### Phase C — Root synthesis

The root agent (not a subagent) reconciles lane dossiers against committed
artifacts and writes `references/project-retro.md`.

Recommended section set (extend when useful):

1. Executive Summary
2. Evidence and Review Method
3. Outcome Snapshot
4. What Went Well
5. Challenges and Struggles
6. Decision Register (+ new decision records if needed)
7. Rejected or Superseded Alternatives
8. Where We Changed Course
9. New Architecture Patterns and Approaches
10. Domain learnings (project-specific; e.g. flaky tests, long-running verification)
11. Gotchas for humans working in the domain
12. Gotchas for autonomous agents
13. Repo / product improvements and durable guidance promotions
14. OAT upstream feedback / toolkit follow-ups
15. Remaining Boundaries and Follow-Ups
16. Reflections

The reference retro folded OAT upstream items into Remaining Boundaries and
Challenges (dispatch matrix seeding, terminal-event wakeups, bookkeeping
cadence). The skill should make the **OAT upstream** lane explicit even if the
prose lives in those sections.

### Phase D — Decision records and promotions

1. Create missing decision records only when a load-bearing choice lacks a
   durable home.
2. Propose or apply durable repo promotions when justified (docs, AGENTS,
   rules, cloud runbooks).
3. Reject nested instruction files that would duplicate an intentional
   layering model.
4. Append a project-log entry that the retro was produced.

### Phase E — Commit hygiene

Format only the files touched, commit the retro (+ any decision records /
approved promotions), and leave implementation code untouched unless a
promotion requires a narrowly scoped docs/instruction edit.

## Results of the Reference Retro

### Project

- Repository: `voxmedia/wp-platform`
- Project: `.oat/projects/shared/reliable-local-e2e-tests/`
- Artifact: `references/project-retro.md` (complete, 2026-08-03)
- Companion decision:
  `references/decisions/001-long-running-verification-observability.md`

### Headline outcomes captured

- 29/29 tasks complete; final review passed.
- Six common-root cohorts passed 20 consecutive first attempts.
- Final acceptance: three consecutive complete runs (~111 minutes each) with
  exact identity accounting, zero retries, and byte-identical baselines.
- Core lesson: failures were rarely solved by waiting longer; "flaky" hid
  deterministic contracts, bootstrap failures, eventual consistency,
  cross-test contamination, runner defects, environment interruptions, and
  product contract bugs.

### Repo / product improvements identified and largely promoted

1. Fumadocs recovery / browser-auth / asset-permission guidance.
2. Package AGENTS: reset/VM recreation → `test:e2e:login`; heartbeat ≠ terminal
   evidence.
3. Root Cloud instructions: route Playwright reliability work to reserved
   `wp-platform-e2e` stack.
4. Cloud environment skill/runbook: reserved stack constraint + bounded
   terminal reconciliation.
5. Explicit rejection of nested E2E `AGENTS.md` files (layering already
   sufficient).
6. Remaining repo follow-up: local CI credential provenance for
   `WP_PLATFORM_API_TOKEN_QA`.

### OAT upstream feedback surfaced by the run

These are toolkit/orchestration improvements the skill should systematically
collect:

1. **Complete dispatch-matrix seeding** — Cloud user-config seed was
   Cursor-only (4 cells) while planning completeness required 12 cells across
   Cursor/Codex/Claude; readiness passed despite missing cells.
2. **Terminal-event notification** — runner heartbeats ≠ root wakeup; need
   first-class awaited terminal-event notification or stronger polling
   contract in orchestration skills.
3. **Handle vs process liveness** — terminal subagent `BLOCKED` can still leave
   detached tmux/Playwright work; skills must require process-tree
   reconciliation.
4. **Bookkeeping cadence after BLOCKED/NEEDS_CONTEXT** — immediate
   project-log + state push without staging dirty implementation files.
5. **Idle vs running reporting** — unfinished projects were misreported as
   actively running after children returned terminal states.
6. **Long-running verification observability** — four-signal model (handle,
   process, heartbeat/lease, terminal evidence) should inform implement /
   progress skills.
7. **Target-repo vs run-metadata anchoring** — multi-repo cloud mounts can
   disagree with run metadata; lifecycle commands must honor the explicit
   target repo.
8. **Evidence-audit automation** — optional future skill only if the exact
   identity/baseline/residue reconciliation recurs across projects.

### Decision record created during the retro

`001-long-running-verification-observability.md` — accept the four-signal
reconciliation model for long-running verification. Full text is appended
below.

## Suggested Skill Skeleton (for the authoring agent)

Implement with OAT skill conventions (`create-agnostic-skill` / create-oat-skill
patterns): progress banners, active-project resolution, artifact hygiene,
AskUserQuestion confirmation before expensive transcript fetches if needed,
and no auto-invocation on lifecycle completion.

Minimum workflow steps:

1. Resolve active project / confirm target.
2. Inventory evidence sources; report which session source will be used.
3. Read project log + execution learnings + implementation/state.
4. Fetch/review session transcript or local session history when available.
5. Optional parallel recon lanes for large runs.
6. Draft `references/project-retro.md` with dual feedback lanes.
7. Create missing decision records if justified.
8. Offer durable promotions; apply only when in scope / approved.
9. Append project-log entry; format; commit.

Distinguish from `oat-project-summary`:

|                       | summary                       | retro                                            |
| --------------------- | ----------------------------- | ------------------------------------------------ |
| Primary question      | What did we build and decide? | How did the run go, and what should change next? |
| Session transcript    | Optional                      | Required when available                          |
| OAT upstream feedback | Rare                          | Required section/lane                            |
| Tone                  | Institutional memory          | Reflective + operational                         |
| Default path          | `summary.md`                  | `references/project-retro.md`                    |

## Provenance

- Original operator request date: during the
  `reliable-local-e2e-tests` Cursor Cloud run after documentation sync.
- Retro authored into:
  `.oat/projects/shared/reliable-local-e2e-tests/references/project-retro.md`
- Producer run id: `bc-d6ece9f8-6ea8-42a2-8ac5-18ecf9633163`
- Handoff assembled: 2026-08-05 for Open Agent Toolkit skill authoring.

---

## Appendix A — Original Retro Request (Verbatim)

The following is the operator's original free-form request that produced the
reference retro. The skill should cover this shape without requiring the user
to restate it.

```text
Once you’re done with that I’d like you to review the implementation.md, project log, and the oat orchestration logs, dispatch composer 2.5 subagents to go through the session transcript/history for all evidence of various blockers that were run into, changes that had to be made, changes in direction, findings and learnings, etc. I’d like you to generate a project-retro.md within the project references directory. This should cover:

- what went well
- what were the challenges and struggles
- what were the decisions made (consider if anything should be recorded as a decision record that wasnt already, if so record it)
- where did we have to change course
- what were new architecture patterns that were introduced, or new approaches
- for another autonomous agent, what are the big gotchas
- what did we learn about flaky tests
- what did we learn about long running test verification, heartbeats, etc
- what should anyone working on e2e tests be aware of
- what should agents working with this code be aware of

Any other sections you think would support a meaningful retro.

Once you have completed that, consider if anything in there should be promoted to durable project documentation, or agent instruction files. Are there any new nested agent instruction files within the e2e application directory for more specific areas that could benefit from dedicated instruction files. If so, then go ahead and make those changes and additions.

At the end of the retro, provide a thoughtful summary with your reflections from this project. Take a moment to appreciate what you have accomplished here, your work will truly support the success of the team. Well done!
```

---

## Appendix B — Full Reference Retro (`project-retro.md`)

The complete markdown generated for the reference project follows unchanged.

---

title: Reliable Vox-Local E2E Tests Project Retrospective
project: reliable-local-e2e-tests
status: complete
date: 2026-08-03

---

# Reliable Vox-Local E2E Tests Project Retrospective

## Executive Summary

This project began as an effort to make the Vox-local Playwright suite pass
reliably with one worker and zero retries. It finished with a broader and more
valuable result: an ownership-safe local test environment, a manifest-bound
evidence harness, explicit state restoration contracts, repaired test and
product behavior, and an operational model that future humans and autonomous
agents can inspect and recover.

The final implementation completed all 29 planned tasks. Six repaired
common-root cohorts passed 20 consecutive first attempts. The final acceptance
invocation passed three consecutive complete runs with:

- one login identity;
- fixture shard 1: 26 passes and one expected skip;
- fixture shard 2: 25 passes and two expected skips;
- sequential: 113 passes and two expected skips;
- zero retries, failures, unexpected skips, non-runs, missing identities,
  duplicate identities, or marker-owned residue; and
- byte-identical canonical baselines before and after every run.

Each final run required roughly 111 minutes. The final three-run acceptance
therefore represented more than five and a half hours of uninterrupted,
identity-checked execution, after many earlier attempts correctly reset
consecutive accounting to zero.

The most important retrospective conclusion is that the failures were rarely
solved by waiting longer. The project exposed deterministic test assumptions,
editor bootstrap failures, eventual-consistency boundaries, cross-test state
contamination, runner measurement defects, environment interruptions, and two
small product contract defects. Treating all of those as generic "flakiness"
would have hidden the actual work.

## Evidence and Review Method

This retrospective reconciles:

- [implementation.md](../implementation.md);
- [project-log.md](../project-log.md);
- [oat-execution-learnings.md](../oat-execution-learnings.md);
- [design.md](../design.md), [spec.md](../spec.md),
  [plan.md](../plan.md), and [state.md](../state.md);
- the phase and final files under [reviews](../reviews/);
- [full-reliability.md](../evidence/full-reliability.md),
  [targeted-reliability.md](../evidence/targeted-reliability.md),
  [fixture-ledger.md](../evidence/fixture-ledger.md), and
  [ci-confirmation.md](../evidence/ci-confirmation.md);
- [durable-guidance-analysis.md](../evidence/durable-guidance-analysis.md);
- the complete Cursor Cloud session transcript and run-event export, reviewed
  through five read-only Composer 2.5 reconnaissance lanes covering transcript
  chronology, implementation decisions, orchestration and liveness, flaky-test
  causes, and durable-guidance coverage.

The transcript export omitted many terminal tool-result bodies. Claims that
require runtime detail therefore use the committed evidence ledgers and review
files as the authoritative source. Where the mechanism remained inconclusive,
this retrospective says so rather than converting a hypothesis into a root
cause.

## Outcome Snapshot

| Area                    | Outcome                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| Project lifecycle       | 29 of 29 tasks complete; final review passed                               |
| Manifest                | Login `1`; fixtures `27/27`; sequential `115`                              |
| Targeted stability      | Six common-root cohorts passed `20/20`                                     |
| Complete acceptance     | Three consecutive complete fresh-baseline runs                             |
| Final outcomes per run  | `1` login; `26 + 1`; `25 + 2`; `113 + 2`                                   |
| Reliability constraints | One worker, headless Chromium, zero retries                                |
| State integrity         | Zero marker-owned residue and exact canonical baseline                     |
| Product changes         | Thumbnail GraphQL fallback; Atom stale-entitlement guard                   |
| Quarantines             | Three named fixture identities with retained core evidence                 |
| CI                      | Not triggered because local-only credential provenance is unproven         |
| Documentation           | Package, Fumadocs, Cloud runbook, rules, and project evidence synchronized |

## What Went Well

### Safety became part of correctness

The project did not accept a green browser report while cleanup, ownership, or
baseline state was ambiguous. The dedicated `wp-platform-e2e` Compose project,
static environment ownership, renewable mutation lease, exact resource
markers, and compare-and-swap restoration turned destructive local setup into a
guarded operation.

This mattered during review. Early Phase 1 versions still had unsafe reset and
lease edges. Multiple review-fix iterations were needed, but the project did
not bypass those findings. The resulting controller fails closed, preserves
unknown data, and retains recovery evidence.

### Runtime evidence drove the important fixes

Traces and retained reports separated superficially similar failures:

- a valid HTTP `200` editor document with failed WordPress scripts;
- a valid document whose `core/editor` store never appeared;
- a present editor store with missing package or Advanced Custom Fields UI;
- a successful Select2 request whose exact option was still disabled;
- a successful stream save whose snackbar was not a durable persistence
  signal; and
- a successful cohort whose canonical baseline still contained auto-drafts,
  a lazy flag term, or changed preferences.

The fixes matched those boundaries. The project added a single
condition-gated reload instead of a test retry, route-specific readiness
instead of a global editor predicate, and business-condition polling instead
of fixed sleeps.

### The manifest made evidence reviewable

The committed manifest binds cohort commands, exact test identities, expected
statuses, and counts. The reliability runner retains the actual command,
report, baseline, residue, and progress evidence for each cohort. This
prevented a matching total or a green exit code from hiding a missing,
duplicated, unexpectedly skipped, or non-run test.

The final reviews independently reconciled all 12 cohort executions across the
three acceptance runs. That independent review was more meaningful than
accepting the runner's summary at face value.

### Common-root repair reduced repeated diagnosis

The project eventually shifted from running 20 repetitions after many
individual tasks to running a focused smoke per task and grouped 20-pass gates
after related prerequisites stabilized. This preserved the statistical
evidence while avoiding repeated measurement of known downstream failures.

The grouped gates also produced clearer causal evidence. Feeds, media,
packages, streams, categories, editor readiness, and homepage projection could
be repaired and measured as coherent roots rather than as one undifferentiated
115-test failure set.

### Human feedback materially improved the process

Operator feedback corrected several execution behaviors:

- an unfinished project was incorrectly described as actively running after a
  child had returned `BLOCKED`;
- a terminal child had also left detached Playwright work alive;
- repeated 20-pass gates were being run at the wrong cadence;
- progress and bookkeeping were not being published promptly;
- a proposed reduction from ten complete runs had to remain a proposal until
  explicitly approved; and
- long-running acceptance required active heartbeat and terminal follow-up.

Those corrections were not treated as conversational details. They became
project instructions, package guidance, progress events, and durable evidence
practices.

### Documentation was treated as part of delivery

The final project did not leave its operational knowledge only in a transcript.
The package instructions, Fumadocs, Cloud runbook, authoring rule, and evidence
ledgers now explain the state model, runner, recovery process, expected skips,
product fallbacks, and CI limitation.

## Challenges and Struggles

### Planning and dispatch were initially blocked

The OAT planning preflight found a partial user dispatch matrix: Cursor cells
existed, while the Codex and Claude cells required by the planning completeness
contract did not. The operator selected a managed High ceiling and adopted the
complete matrix at user scope before implementation could begin.

This was an environment configuration blocker, not an E2E defect. The run also
had to stay anchored in `wp-platform` even though Cursor Cloud metadata named
the sibling `voxmedia-bruno` repository.

Context7 reached its monthly quota during the initial documentation lookup.
The project continued through repository-pinned types, source, and runtime
evidence, with the degraded route recorded explicitly.

### Phase 3 had the widest coupling surface

Sequential homepage tests crossed editor navigation, homepage storage,
WordPress revisions, Elasticsearch, GraphQL projection, package behavior,
Select2, and shared teardown. A failure near the end of one file could change
the starting state of many later files.

The early full sequential runs improved from roughly 60 to 78 to 95 passes,
but each stage revealed a different common root. Examples included:

- a stale back-button selector;
- invalid Spotlight taxonomy setup;
- substring post-title matching;
- assignment order that disabled exclusion controls;
- unpadded schedule values;
- a cap interpreted as a required count;
- stale ElasticPress documents;
- a homepage revision ID treated as a valid Hero post;
- a closed WordPress sidebar tab;
- package-dashboard routes that bypassed shared recovery; and
- critical editor dependencies that failed after the editor store existed.

The struggle was not a lack of activity. It was that cross-file state and
downstream prerequisites made repeated full gates expensive before the common
roots were stable.

### Environment recovery introduced its own failures

A Cursor VM recreation removed tmux sessions, Docker runtime state, generated
browser auth, and temporary lease/snapshot files. Recovery then exposed fresh
database and shell behavior that the warm environment had hidden:

- a WordPress evaluation probe was invalid before database installation;
- detached commands could inherit terminal input and stop under tmux;
- a recovery lease's restrictive `umask 077` leaked into theme asset creation,
  producing files Apache could not read; and
- `playwright/.auth/user.json` had to be regenerated after reset or VM loss.

These failures looked like application or Playwright failures until process,
filesystem, and environment evidence was inspected.

### Long-running commands were initially under-instrumented

The first aggregate sequential deadline was a fixed ten minutes, even though a
representative file could require more than six minutes by itself. A later
`Channel closed` event produced no valid reporter JSON because the old runner
discarded malformed output.

The runner gained manifest-derived budgets, redacted stdout/stderr retention,
per-cohort reports, and 30-second progress heartbeats. Those changes made
measurement failures diagnosable, but they also exposed a separate
orchestration problem: the root agent could still miss a terminal event even
while heartbeats were healthy.

### Phase 5 correctly rejected many almost-green runs

Acceptance restarted repeatedly because each run had to satisfy the complete
transaction, not only Playwright outcomes. Rejected attempts included:

- a Spotlight Packages readiness failure;
- a `Channel closed` reporter termination;
- a blank editor shell;
- partial package editor initialization;
- successful cohorts followed by 24 auto-drafts, a flag term, and changed
  preferences;
- a transiently disabled Select2 option;
- a stream-status snackbar that did not represent persistence;
- missing attempt-wide lease coverage; and
- incorrect attribution of incidental browser-created resources.

This was costly, but accepting any of those runs would have produced a weaker
claim than the project specification required.

### Product defects required explicit scope decisions

Two fixture failures were not test-harness defects:

- the GraphQL schema declared `ThumbnailType.aspectRatio` non-null while the
  PHP resolver could omit the value; and
- stale entitlement term IDs could construct an Atom exclusion clause that
  emptied an otherwise valid feed.

Both production changes required operator approval. The project preserved the
non-null GraphQL contract with an empty-string fallback and ignored only
entitlement IDs that no longer resolve to a current term.

### CI confirmation remains intentionally incomplete

The repository does not contain reviewable proof that
`WP_PLATFORM_API_TOKEN_QA` is authorized for local-only use and supplied to
both the job-local WordPress stack and Playwright. The existing workflow also
does not enforce the same manifest, canonical baseline, residue, and exact
identity contract as the local reliability runner.

The project therefore did not trigger local CI merely to produce a green
workflow conclusion. This remains a documented credential and workflow-owner
boundary, not a hidden acceptance failure.

## Decision Register

| Decision                                                                | Why                                                                                                                 | Consequence                                                                         | Durable record                                                                                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use a dedicated `wp-platform-e2e` Compose project and owned volume      | Shared developer state could not be overwritten safely                                                              | More setup machinery; deterministic destructive reset                               | [design.md](../design.md), [local environment docs](../../../../../apps/wp-platform-docs/docs/wp-platform-e2e/local-environment-and-state.md)                    |
| Separate static environment ownership from a renewable invocation lease | One checkout may own the stack while only one run may mutate it                                                     | Concurrent writers fail closed; stale holders require recovery                      | [design.md](../design.md), [implementation.md](../implementation.md)                                                                                             |
| Restore homepage content through `wp_update_post()`                     | The candidate REST write returned `401`                                                                             | Restoration must poll storage, cache, index, and GraphQL convergence                | [implementation.md](../implementation.md)                                                                                                                        |
| Keep fixture and sequential lifecycles distinct                         | Ordered suites need browser continuity; fixture tests need per-test isolation                                       | Import changes alone are unsafe migrations                                          | [package AGENTS.md](../../../../../apps/wp-platform-e2e/AGENTS.md)                                                                                               |
| Keep GraphQL verification                                               | Removing it would hide the consumer-visible contract                                                                | Storage and GraphQL projection must converge separately                             | [implementation.md](../implementation.md)                                                                                                                        |
| Permit one evidence-gated editor reload                                 | Exact transport/bootstrap failures occurred on valid same-origin documents                                          | No blanket retries; ambiguous cases still fail                                      | [patterns and conventions](../../../../../apps/wp-platform-docs/docs/wp-platform-e2e/patterns-and-conventions.md)                                                |
| Run one task smoke, then grouped 20-pass gates                          | Per-task 20-pass runs repeatedly hit unstable downstream prerequisites                                              | Statistical proof moved to common-root boundaries                                   | [project AGENTS.md](../AGENTS.md), [oat-execution-learnings.md](../oat-execution-learnings.md)                                                                   |
| Reduce complete acceptance from ten runs to three                       | The first measured attempt required roughly 101 minutes; repetition adds confidence rather than functional coverage | Less repeated statistical evidence; all per-run requirements unchanged              | [discovery.md](../discovery.md), [implementation.md](../implementation.md), [project AGENTS.md](../AGENTS.md)                                                    |
| Allow three exact fixture quarantines                                   | Three local asset/readiness failures were non-core and retained independent core evidence                           | Expected skips are manifest-bound and require restoration criteria                  | [fixture-ledger.md](../evidence/fixture-ledger.md), [reliability harness docs](../../../../../apps/wp-platform-docs/docs/wp-platform-e2e/reliability-harness.md) |
| Preserve the non-null Thumbnail GraphQL field with `""`                 | Consumers already depend on a non-null schema                                                                       | Missing legacy source data is explicit but does not fail the field                  | [implementation.md](../implementation.md), [media docs](../../../../../apps/wp-platform-docs/docs/media-library/overview.md)                                     |
| Ignore only unresolved Atom entitlement IDs                             | Stale term relationships must not empty valid feeds                                                                 | Valid entitlement terms still exclude content                                       | [implementation.md](../implementation.md), [RSS docs](../../../../../apps/wp-platform-docs/docs/editorial/content-syndication/rss-feeds.md)                      |
| Do not trigger local CI without credential provenance                   | Secret naming does not prove authorization or two-sided provisioning                                                | Local acceptance stands; CI confirmation remains owner-gated                        | [ci-confirmation.md](../evidence/ci-confirmation.md), [CI docs](../../../../../apps/wp-platform-docs/docs/ci-cd/e2e-testing-workflows.md)                        |
| Reconcile four signals for long-running verification                    | Heartbeats did not prevent idle-handle confusion, orphaned tmux, or missed terminal events                          | Monitoring must distinguish handle, process, heartbeat/lease, and terminal evidence | [decision record](decisions/001-long-running-verification-observability.md)                                                                                      |

No separate decision record was added for the three-run threshold, quarantine
policy, product fixes, or CI blocker because those decisions already have
explicit operator approval and durable records in the project artifacts and
canonical documentation.

### Rejected or Superseded Alternatives

| Alternative                                                              | Disposition                                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reuse the ordinary development stack or suffix a shared volume           | Rejected because destructive reset could overwrite unknown developer state; the dedicated `wp-platform-e2e` project owns a fixed volume and database identity.                                                           |
| Restore homepage state through the REST write candidate                  | Rejected after the exact write returned `401`; restoration uses `wp_update_post()` and verifies downstream convergence.                                                                                                  |
| Remove GraphQL checks to unblock sequential progress                     | Rejected because GraphQL is the consumer-visible contract; storage and projection must both converge.                                                                                                                    |
| Add retries, unconditional reloads, sleeps, or blanket timeout increases | Rejected because they hide independent causes; recovery is single-shot and evidence-gated, while waits target named business conditions.                                                                                 |
| Run 20 repetitions after every task                                      | Superseded by one task smoke plus grouped common-root gates after operator feedback showed the original cadence repeatedly measured unstable downstream prerequisites.                                                   |
| Preserve the original ten complete acceptance runs                       | Superseded by the explicitly approved three-run threshold after the first measured attempt took roughly 101 minutes; all per-run requirements remained unchanged. The final accepted runs took roughly 111 minutes each. |
| Silently skip non-core local failures                                    | Rejected; the three quarantines require exact manifest identities, approval, retained core evidence, and restoration criteria.                                                                                           |
| Trigger local CI based on secret naming or workflow success              | Rejected until credential provenance and two-sided provisioning are reviewable.                                                                                                                                          |
| Add nested E2E `AGENTS.md` files or another authoring skill              | Rejected because package instructions, the glob-scoped rule, Fumadocs, the Cloud runbook, and executable contracts already provide the intended layers.                                                                  |

The retrospective explains why these choices mattered. The standalone decision
record defines the accepted long-running observability rule. Package
instructions and the Cloud runbook contain the concise operational checklist.
This intentional overlap gives each audience the right level of detail rather
than creating competing sources of truth.

## Where We Changed Course

### From destructive setup scripts to a state controller

The initial problem could have been approached as a sequence of reset and test
commands. Review showed that environment identity, database ownership, lease
renewal, fail-stop behavior, and recovery had to be modeled explicitly.

### From title-based cleanup to creation-time attribution

Resource names alone were insufficient for safe cleanup. The project introduced
run/test markers, a registry, exact live-marker checks, and browser-scope
creation intents. Cleanup now removes only resources whose current ownership
matches the recorded intent.

### From generic editor readiness to layered readiness

`load`, HTTP `200`, `core/editor`, package UI, Advanced Custom Fields, jQuery
UI, and enabled Select2 options proved to be different readiness layers.
Navigation and page objects now verify the layer required by the actual
business action.

### From per-task repetition to common-root measurement

Twenty repetitions after each task delayed progress and repeatedly measured
known downstream failures. The project moved to one task smoke, bounded
diagnostic repeats, grouped 20-pass gates, and complete acceptance only after
all common roots stabilized.

### From ten acceptance runs to three

The reduction was discussed before it was approved, and the project initially
kept ten as authoritative. After the operator explicitly approved three, the
plan and state were updated. This distinction matters: a proposed efficiency
change is not a decision until approval is recorded.

### From UI notifications to authoritative persistence

Snackbars and immediate DOM state were replaced with successful REST writes,
clean editor state, and bounded GraphQL or RSS convergence. The test now waits
for the contract users and downstream systems depend on.

### From heartbeats alone to terminal reconciliation

Runner heartbeats solved opaque silence but did not wake the monitoring agent
or guarantee that completion was published. The project now records the
separate long-running verification decision in
[001-long-running-verification-observability.md](decisions/001-long-running-verification-observability.md).

## New Architecture Patterns and Approaches

### Environment ownership plus invocation lease

Static ownership answers which checkout controls the dedicated environment.
The renewable lease answers which run may mutate it now. Nested setup and
Playwright processes adopt the outer run identity rather than opening lease
gaps between cohorts.

### Three state classes

The implementation effectively distinguishes:

1. **Owned resources** — posts, terms, feeds, packages, streams, media, and
   search documents that carry an exact run/test marker.
2. **Controlled shared state** — homepage storage, options, preferences, and
   schedules restored through immutable snapshots and compare-and-swap checks.
3. **Incidental lifecycle state** — auto-drafts and lazy terms attributed by a
   creation intent even when the browser created them outside an expected
   candidate route.

This model is more precise than "delete everything the test might have made."

### Transactional complete acceptance

A complete acceptance attempt is one transaction:

1. acquire the outer lease;
2. reset and capture the canonical baseline;
3. run login, fixture shard 1, fixture shard 2, and sequential cohorts;
4. validate exact manifest identities and statuses;
5. restore controlled state and clean owned resources;
6. prove zero residue and canonical baseline equality; and
7. retain command-bound evidence before releasing the lease.

A passing cohort inside a failed transaction does not count as an acceptance
run.

### Manifest-bound orchestration

The manifest is both inventory and executable contract. It supplies cohort
commands, expected identities, expected statuses, and counts. The runner derives
budgets from the selected manifest instead of using one arbitrary shell
timeout.

### Bounded observable synchronization

The project replaced sleeps and transient UI signals with named conditions:

- editor dirty/save/autosave state;
- successful WordPress REST writes;
- exact enabled Select2 options;
- GraphQL projection;
- RSS content;
- Elasticsearch state;
- scheduled status; and
- restored homepage storage.

Each poll has a finite deadline and retains diagnostics on failure.

### First-independent-failure classification

Teardown and baseline errors often followed a test failure. The evidence
workflow records the first independent failure before classifying later residue
or baseline symptoms. This prevents cleanup fallout from replacing the
originating defect in the narrative.

## What We Learned About Flaky Tests

### "Flaky" is a symptom category, not a root cause

The project found at least seven materially different failure classes:

| Failure class               | Examples                                                                         | Correct response                                                      |
| --------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Deterministic test contract | Wrong dashboard, generated inspector ID, substring title match, assignment order | Fix the selector, navigation, state, or product expectation           |
| Browser transport/bootstrap | `net::ERR_FAILED`, missing editor store, partial package UI                      | Trace failed resources; allow one exact recovery only when proven     |
| Eventual consistency        | GraphQL, RSS, Elasticsearch, Select2 enablement                                  | Poll the authoritative business condition with a deadline             |
| Cross-test state lifecycle  | Hero revision collision, preferences, auto-drafts, lazy terms                    | Attribute at creation; restore snapshots; verify canonical state      |
| Measurement/orchestration   | Fixed ten-minute cap, malformed reporter output, missing artifact                | Fix the runner before interpreting suite reliability                  |
| Environment/runtime         | VM suspension, unreadable assets, upload ownership, missing auth                 | Prove the environment boundary; do not patch product code reflexively |
| Product contract            | Thumbnail nullability, stale Atom entitlement IDs                                | Escalate for product approval and add focused regression coverage     |

### A successful transport is not a successful business action

HTTP `200` did not prove that the editor store existed. An AJAX response did not
prove a Select2 option was enabled. A snackbar did not prove stream state
persisted. A storage write did not prove GraphQL projection converged.

The test must wait for the contract it actually asserts.

### Broad retries would have hidden independent defects

Retries could have made some Chromium transport failures disappear, but they
would also have obscured wrong navigation, stale projection, missing auth,
runner timeouts, and state contamination. Zero retries forced each independent
cause to become visible.

### Readiness is surface-specific

There is no single universal "WordPress editor ready" predicate. A post editor,
package editor, Advanced Custom Fields screen, and Select2-backed dashboard
need different controls and dependencies. Shared helpers should model common
layers, while each page object verifies its required surface.

### Cleanup success is not baseline success

Zero marker-owned residue says that owned resources are gone. It does not say
preferences, terms, homepage content, schedules, or incidental auto-drafts
returned to baseline. Both checks are mandatory.

### Quarantine requires a stronger contract than `test.skip()`

A legitimate quarantine has:

- one exact manifest identity;
- explicit operator approval;
- a narrow reason;
- retained evidence that the core behavior still passes;
- unchanged collection accounting;
- restoration criteria or a follow-up; and
- acceptance that fails every unexpected skip or non-run.

The project does not establish permission to skip an inconvenient core
failure.

### Some mechanisms remained inconclusive

The `Channel closed` event produced no valid JSON report. Timeout, disk, and
ordinary out-of-memory explanations were rejected, but the exact mechanism was
not recovered from the old runner. The correct durable result is the diagnostic
improvement that followed, not a fictional root cause.

Likewise, a host-suspension classification was supported by a large wall-clock
heartbeat gap and a clean instrumented reproduction. It should not be
generalized to every quiet test process.

## What We Learned About Long-Running Verification

### Time budgets must scale with selected work

A fixed ten-minute aggregate deadline was incompatible with a 115-identity
sequential cohort. Budgets now derive from the manifest and per-test deadline,
with bounded overhead.

### A heartbeat is evidence of liveness, not health

The project used two different heartbeat layers:

- **Lease heartbeats** prove that the state controller still owns mutation
  authority.
- **Runner heartbeats** prove that the reliability process is still emitting
  progress.

Neither proves that tests are passing, that the root noticed completion, or
that final evidence is valid.

### Terminal monitoring is a separate responsibility

The root missed more than one completed terminal event even after progress
heartbeats existed. Monitoring must poll on a bounded cadence and reconcile:

- the accepted child handle;
- the exact tmux pane and descendant process tree;
- runner and lease heartbeat freshness;
- the final `run-complete` or failure event;
- the parseable identity-bearing report;
- baseline and residue results; and
- consecutive-run accounting.

Do not assume that a status-file write automatically wakes the monitoring
agent.

### A terminal child and a detached process are different states

The project encountered both:

- a child that returned `BLOCKED` and left no work running, while durable state
  still said "in progress"; and
- a child that returned `BLOCKED` while a tmux Playwright chain continued for
  hours.

Every terminal child return requires both handle reconciliation and process-tree
inspection.

### Progress instrumentation must be committed before the run

Unformatted progress-source changes once caused a bookkeeping push to fail
while detached tests were running. Observability is production test
infrastructure. Implement, format, test, commit, and push it before launching
the expensive gate it is meant to observe.

### Do not launch replacement work until prior evidence is accounted for

Before restarting:

1. preserve the prior JSONL and identity reports;
2. record the first independent failure;
3. determine whether the exact process is still live;
4. adopt or stop only the exact process;
5. recover lease and canonical baseline;
6. regenerate browser auth when required; and
7. reset consecutive accounting correctly.

Partial or standalone passes are diagnostic evidence. They are not complete
acceptance runs.

### Consecutive accounting must be honest

A failure in run 2 resets a previous run 1 success to zero consecutive passes.
A clean standalone sequential run does not advance combined acceptance.
Changing the baseline or command between attempts starts a different evidence
series.

## Gotchas for Anyone Working on E2E Tests

1. Use the reserved `wp-platform-e2e` stack for Vox-local reliability work.
   Never substitute the ordinary development stack or run `docker compose
down -v`.
2. Run from the documented working directory. Environment commands, package
   tests, and underlying Compose scripts have different roots.
3. Regenerate `playwright/.auth/user.json` after reset, VM recreation, or an
   interrupted targeted/sequential run. Full mode runs its own login cohort.
4. Use `@/fixtures/e2eTest` for new fixture-driven tests. Sequential suites use
   `installSequentialSuiteLifecycle`; do not migrate by swapping one import.
5. Attribute every mutation at creation time. Cleanup may delete only a live
   resource whose marker matches the current run/test.
6. Prefer semantic selectors and exact accessible names. Generated Gutenberg
   IDs and transient CSS classes are not contracts.
7. Wait for clean editor state and authoritative persistence. Do not use a
   snackbar, load event, or request completion as a substitute.
8. Treat editor readiness as layered and route-specific.
9. Use bounded polling for GraphQL, RSS, search, schedules, and Select2
   enablement. Do not add fixed sleeps or blanket timeout increases.
10. Preserve both zero residue and canonical baseline equality.
11. Update the manifest and expected status in the same reviewed change as an
    intentional collection change.
12. Never use Playwright retries to claim reliability improvement.
13. Keep credentials, cookies, Authorization headers, lease tokens, and full
    process environments out of logs and artifacts.
14. Generated theme assets must remain Apache-readable. Use the reset's
    permission normalization; do not apply broad permissions to the repository.
15. Leave the stack running after verification so the next operator can
    continue.

## Gotchas for Autonomous Agents

1. A project can be unfinished without being actively executing. Report the
   exact liveness state.
2. A terminal subagent result clears handle liveness but does not prove its tmux
   or process descendants stopped.
3. Inspect exact tmux sessions and process trees before starting replacement
   work. Adopt or stop only exact sessions and process IDs.
4. Do not assume a progress-file update wakes the root agent. Poll on a bounded
   cadence until the process and terminal evidence reconcile.
5. Publish `BLOCKED`, `NEEDS_CONTEXT`, failed, and completed outcomes
   immediately. Update and push project bookkeeping without staging another
   agent's dirty implementation files.
6. Do not rerun an expensive cohort until existing evidence is deduplicated and
   the first independent failure is understood.
7. Distinguish the runner, environment, test, product, and evidence layers
   before modifying code.
8. Preserve hypotheses as hypotheses. A later clean run does not retroactively
   prove the mechanism of an earlier inconclusive failure.
9. Do not count partial cohorts, standalone controls, or targeted homepage
   hashes as complete canonical acceptance.
10. Measure wall time, Playwright time, heartbeat gaps, and lease renewal before
    diagnosing a quiet run as a code defect.
11. After VM loss, assume tmux, browser auth, temporary lease files, and
    unuploaded evidence are gone.
12. Record operator approvals and rejected alternatives before changing scope.
    Discussion is not authorization.
13. Keep project-specific statistical thresholds in project artifacts. Do not
    promote three runs or 20-pass groupings into a universal repository rule.
14. Leave production and CI changes behind their explicit approval boundaries.
15. Continue monitoring until a long-running command reaches a terminal,
    evidence-validated state.

## Durable Guidance Promotions

This retrospective found four narrow gaps worth promoting:

1. Fumadocs now explains reset/interruption recovery, browser-auth
   regeneration, and the asset-permission footgun.
2. Package instructions now connect reset/VM recreation to
   `test:e2e:login` and distinguish heartbeat liveness from terminal evidence.
3. Root Cursor Cloud instructions now route Playwright and reliability work to
   the reserved E2E stack rather than the ordinary development stack.
4. The Cloud environment skill now lists the reserved stack as a
   learned-the-hard-way constraint and its runbook defines bounded terminal
   reconciliation.

No new nested `AGENTS.md` files were added under `apps/wp-platform-e2e`.
The existing layering is intentional:

- root `AGENTS.md` routes repository and Cloud work;
- package `apps/wp-platform-e2e/AGENTS.md` defines E2E constraints;
- `.agents/rules/e2e-test-patterns.md` applies spec-file authoring rules by
  glob;
- Fumadocs provides canonical human explanations and runbooks;
- the Cloud skill owns environment-specific setup and recovery; and
- executable scripts and the manifest remain the source of truth.

Nested files under `src/tests/e2e`, `src/tests/sequential`, `scripts`, or
`src/utils/e2e-state` would duplicate these layers and make drift more likely.
The project records that as a deliberate non-decision rather than adding files
for discoverability alone.

The project also does not create another E2E authoring skill. The existing
authoring rule, package instructions, Fumadocs, and fixture-refactoring skill
already cover that workflow.

## Remaining Boundaries and Follow-Ups

### Local CI credential provenance

An authorized workflow or secret owner must either provision a dedicated
local-only credential to both WordPress and Playwright or provide reviewable
proof that the existing QA token is authorized and supplied to both sides.
Only then can the local workflow be evaluated against the reliability
contract.

### Three fixture quarantines

`FU-P04-01`, `FU-P04-02`, and `FU-P04-03` remain exact expected skips. Their
restoration criteria are documented in the reliability harness. They should be
removed only with the corresponding readiness fix, focused evidence, and
manifest update.

### Root terminal-event notification

The runner now emits durable heartbeats and terminal events, and agent
instructions require bounded polling. Cursor Cloud does not automatically
guarantee that a file update wakes the monitoring agent. A future orchestration
improvement could provide a first-class awaited terminal-event notification,
but this project does not invent one.

### Evidence-audit automation

The final review manually reconciled manifest identities, reports, baselines,
residue, and hashes. A reusable evidence-audit skill or command is worth
considering only if this exact reconciliation recurs across additional
projects. One successful use does not yet justify another durable workflow
layer.

## Reflections

The project accomplished more than making a difficult test suite green. It
made the result explainable.

At the beginning, a failure could mean a stale selector, a browser transport
error, a WordPress save race, a GraphQL projection delay, a leaked auto-draft,
an expired lease, a broken reporter, an unreadable asset, or an inactive agent
that looked busy. By the end, those possibilities had explicit boundaries,
diagnostics, owners, and recovery paths.

The strongest work was not any single selector or timeout fix. It was the
combination of safety and evidence: preserving unknown data, attributing
resources when they are created, retaining exact identities, refusing to count
an incomplete run, and changing direction when runtime evidence contradicted
the current model.

The project also demonstrated why human feedback is part of autonomous
engineering. The operator's questions about silence, repetition, approval, and
heartbeats exposed real orchestration defects. Recording those corrections
turned one project's friction into guidance that future agents can follow.

The final three green runs matter because the failed runs were allowed to
matter first. They forced the harness to become honest about state, evidence,
and completion. That is the durable accomplishment: the team now has a local
E2E system whose success can be reviewed, whose failures can be classified,
and whose environment can be recovered without guesswork.

This work should materially reduce the cost of the next E2E investigation. A
future engineer or agent does not have to rediscover why residue differs from
baseline, why a heartbeat differs from completion, or why a valid editor
document can still be unusable. Those lessons are now part of the system.

---

## Appendix C — Companion Decision Record

Full text of
`references/decisions/001-long-running-verification-observability.md`:

---

title: Reconcile Four Signals for Long-Running Verification
status: accepted
date: 2026-08-03
project: reliable-local-e2e-tests

---

# Reconcile Four Signals for Long-Running Verification

## Context

This project encountered three different orchestration failures that initially
looked similar:

1. A phase subagent returned `BLOCKED`, no process remained active, and the
   project was still described as running.
2. A phase subagent returned `BLOCKED`, but a detached tmux Playwright chain
   continued for hours.
3. Reliability commands emitted healthy 30-second progress heartbeats and then
   finished, but the root agent did not promptly publish the terminal result.

Runner heartbeats improved observability but did not resolve handle state,
detached process ownership, or terminal notification. A terminal subagent
return also did not prove that background descendants had stopped.

## Decision

Long-running verification must reconcile four independent signals:

1. **Subagent handle liveness** — whether the accepted child handle is still
   active. A terminal result clears this signal immediately.
2. **Process liveness** — whether the exact tmux pane, command, or descendant
   process tree remains active.
3. **Runner and lease liveness** — whether progress events and lease renewals
   remain current. These signals prove activity or mutation authority, not test
   health.
4. **Terminal health and evidence** — whether the exact process exited and
   produced a valid final event, identity-bearing report, baseline result,
   residue result, and consecutive-run accounting.

The monitoring owner must poll these signals on a bounded cadence until they
reconcile at a terminal boundary. It must not assume that a status-file write
wakes the monitoring agent.

After a terminal subagent return, the root must:

1. clear handle liveness;
2. inspect exact tmux and process descendants;
3. adopt or stop any detached work through its exact session or process ID;
4. preserve and validate terminal evidence;
5. update durable project state and the user; and
6. avoid launching replacement work until the prior invocation is accounted
   for.

## Consequences

- Agent and project lifecycle status updates distinguish `running`, `blocked`,
  and `idle-awaiting-root`. These are reporting terms, not the reliability
  runner's `outcome` enum.
- A current heartbeat is not reported as a health verdict.
- A missing heartbeat triggers investigation, not an automatic code-defect
  classification.
- Detached work cannot become ownerless when a child exits.
- Long-run instrumentation is implemented, tested, formatted, committed, and
  pushed before the run starts.
- Partial cohorts and standalone controls remain diagnostic evidence; they do
  not advance complete acceptance.
- Cancellation targets exact tmux panes or process IDs. Broad name-based
  termination is prohibited.

## Alternatives Rejected

### Treat a terminal child result as proof that all work stopped

Rejected because the Phase 3 child returned `BLOCKED` while a separate tmux
test chain and Playwright descendants remained active.

### Treat a heartbeat as proof that monitoring is complete

Rejected because the runner emitted current heartbeats while the root still
missed terminal completion.

### Treat a quiet process as failed and launch a replacement

Rejected because a measured host-suspension interval produced a large
wall-clock heartbeat gap without proving a repository defect. Replacement work
must wait for exact process and evidence reconciliation.

### Rely on console output only

Rejected because long output can truncate, terminals can disconnect, and a
malformed reporter may not produce parseable JSON. The durable JSONL stream and
retained report are required.

## Evidence

- [project-log.md](../../project-log.md), especially the entries titled
  `Terminal subagent liveness reporting`, `Orphaned Phase 3 background gate`,
  `Complete sequential verification passed`, and `Phase 5 code review findings
resolved`.
- [oat-execution-learnings.md](../../oat-execution-learnings.md), especially
  `Phase blockers lacked durable status reporting`, `Correction: Phase 3
entered an idle terminal state`, `Correction: terminal subagent left
orphaned test work`, and `Long-gate observability resolution`.
- [implementation.md](../../implementation.md), especially `Phase 3 status
correction`, `Orphaned Phase 3 gate correction`,
  `p05-t01 - Complete-run orchestration`, and the Phase 5 code-review notes.
- [full-reliability.md](../../evidence/full-reliability.md), especially the
  `Channel closed`, standalone sequential, heartbeat, and final acceptance
  records.
- [p05 review](../../reviews/p05-review-2026-08-03.md), which required
  attempt-wide lease coverage and actual command/artifact binding.
