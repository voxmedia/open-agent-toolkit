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
