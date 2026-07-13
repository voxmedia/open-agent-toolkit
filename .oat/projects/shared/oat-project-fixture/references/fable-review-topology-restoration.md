---
status: review-feedback
purpose: code-and-docs-review
project: oat-project-fixture
reviewer: fable-session
reviewed: 2026-07-12
reviewed_range: a67bd378..e6fbc717
---

# Fable Review: Topology Restoration Code & Docs

Review of the root-owned phase-agent restoration (p05-t11 through p05-t17 and
the p06-t01 docs alignment), conducted while the fresh Codex confirmation run
is pending. Verdict up front: **ship-ready, no blocking findings.** Items
below are ordered by priority; none needs to gate the confirmation run.

## Verified strengths

1. **The restoration matches the reviewed plan, including all three
   load-bearing feedback items.** `oat-phase-implementer` v1.0.7 is
   v1.0.3-shaped (231 lines vs. the coordinator version's ~380): direct task
   execution, one verified commit per task, between-task transition checks
   retained (feedback item 2), and fix-mode `continuation_event` linkage to
   `original_request_id` through the existing `continuation_events` field —
   explicitly forbidding a new schema (feedback item 3).
2. **`phase-execution.md` shrank 718 → 268 lines** and the root loop is
   clean: resolve one implementer per phase (`--report-scope <pNN>`, "use the
   phase scope, not each task ID"), root-dispatched `oat-reviewer` rounds,
   bounded fix continuation, at most one fresh same-target recovery.
3. **The adapter role table is correctly rewritten** — phase implementer as
   `worker` at phase scope; optional nested child as `worker`/`recon` with
   the guarded justification list; reviewer root-dispatched; gates unchanged.
4. **Assertions re-targeted properly.** The `implement` profile now validates
   `dispatch.role === 'phase-implementer'` per phase with the full nine
   assertions (completeness, exact-target-within-ceiling, markers/commits,
   parallel isolation, fan-in, runtime-identity status, etc.).
5. **Release mechanics are consistent:** all five lockstep packages at
   0.1.58, skill versions bumped (`oat-project-implement` 2.0.40, adapter
   1.1.2, engine 1.1.1), provider TOML roles regenerated via sync.
6. **Docs alignment went beyond the requested revision map** — it also
   rewrote `implementation-execution.md` (the pre-existing page, biggest
   stale-content risk), `dispatch-ceiling.md`, configuration and
   provider-sync pages, and the `.agents/docs` guides. The docs index was
   regenerated via the CLI at the right time (release validation is now).
7. **Two hardening wins landed alongside:** `p05-t17` requires dispatch
   records to be terminal before publication (rejects `running` outcomes in
   immutable records — a real immutability property), and `p05-t11` made
   Codex `agents.max_depth >= 2` optional (depth 1 suffices for root→phase;
   depth 2 only gates optional nesting). The latter removes a readiness
   requirement that would have failed plain runs for no reason.

## Concerns (non-blocking, ordered)

1. **`dispatch-and-dry-run.md` grew to 715 lines during the revision** (was
   697 when backlog item `BL-260712-trim-dispatch-and-dry-run` was filed).
   It is now by far the largest routed reference and the first thing every
   run loads. Nothing to do in this project, but the trim item should be
   treated as next-up maintenance, and reviewers of future changes should
   push back on further growth.
2. **Fix-mode resume depends on handle resumability that varies by
   provider.** `phase-execution.md` says "Resume the original phase
   implementer handle in `mode: fix`" with the fresh-launch fallback for
   resume-unavailable. On several native surfaces (Claude Task, Cursor
   native subagents) completed-handle resume is not generally available, so
   the "fallback" will be the _normal_ path there. Suggest one clarifying
   sentence in `phase-execution.md` (or the provider references) stating
   expected resumability per provider, so evidence readers don't treat
   routine fresh-launch recoveries as anomalies.
3. **`orchestration-model.md` pins fixture internals in a concept page**
   ("The default five-task smoke fixture intentionally proves successful
   execution with no task workers", ~line 127). The five-task count will
   drift with fixture changes. Suggest rewording to "the smoke fixture
   intentionally proves successful execution with no task workers" — same
   point, no number to go stale.
4. **The 38m22s baseline comparison must actually be recorded.** The pending
   fresh Codex run is the before/after datum for `DR-260712-restore-phase-agent`.
   When publishing the 9-assertion report, record elapsed time and launch
   counts next to the preserved three-tier baseline in `implementation.md`
   so the decision record's evidence chain is complete. (The two nearly-free
   timing-telemetry follow-ups — journal completion timestamp, persisting
   the gate-liveness elapsed values — remain unfiled follow-ups; fine to
   leave post-ship, but name them in the summary.)
5. **Minor, wording:** `oat-phase-implementer` Critical Rules says "SERIAL IN
   ONE WORKTREE. Parallelism exists only across plan-declared phase worktrees
   or explicitly isolated optional fanout." The second clause is the one new
   liberty relative to v1.0.3 — consider one sentence somewhere in the
   optional-nesting section stating what "safely isolated" concretely means
   for concurrent writers (disjoint file sets or separate worktrees), since
   that is the only remaining way two writers can exist in one phase.

## Pre-ship checklist (mechanical)

- [ ] Fresh Codex `implement` run passes all 9 assertions on the restored
      topology (in progress).
- [ ] Elapsed time + launch counts recorded against the 38m22s baseline in
      `implementation.md`.
- [ ] Descoped live runs (p05-t03/t04/t05, live parts of t06) are marked
      descoped/deferred in `plan.md` with the operator runbook referenced.
- [ ] `DR-260712-restore-phase-agent` and the revision-plan reference doc
      ride along in the final PR (both currently uncommitted alongside two
      backlog items: `BL-260712-trim-dispatch-and-dry-run`,
      `BL-260712-per-project-override`).
- [ ] `pnpm release:validate` re-run after any post-review edits.

## Out-of-scope observations (post-ship)

- The docs worktree `oat-project-fixture-2` can be removed once the final PR
  merges (`git worktree remove`), and its branch deleted.
- Timing telemetry follow-ups (journal `deregisteredAt`, persisted gate
  liveness) would make the next topology/cost debate data-first from the
  start.
- The operator-run campaign (Claude, Cursor IDE, Cursor CLI, cross-harness
  summary) uses `contributing/smoke-testing.md` as its runbook; that page's
  operator flow was authored against the pre-restoration topology's
  _commands_, which did not change — verified still accurate.
