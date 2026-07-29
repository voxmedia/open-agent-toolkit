# ReviewPlan Workflow: Current-State and Fresh-Thread Handoff

**Prepared:** 2026-07-29  
**Status:** orientation evidence; revalidate before planning  
**Backlog:** `BL-260729-implement-reviewplan-first`

## Why This Project Exists

The 2026-07-26 `multi-provider-support` final-review incident produced a broad
reviewer redesign proposal. The follow-up project
`rereview-scope-narrowing` implemented only guarded, default-on re-review range
narrowing. Its discovery explicitly excluded the larger redesign even though it
also recorded that lifecycle-artifact intake was the larger remaining part of
the measured review cost.

This project restores the central recommendation as durable tracked work:

> lifecycle artifacts → metadata-only change map → explicit ReviewPlan →
> selective evidence loading → verification → reconciliation → artifact

The source proposal is preserved beside this file as
`slow-review-feedback.md`. Read its source-verified addendum and GPT-5.6 Sol
feedback before relying on claims in its earlier sections; several early
diagnoses were corrected later in the same document.

## Empirical Incident Evidence

The originating final scope contained 227 commits, 237 changed files, and about
170 code/documentation surfaces.

- Two independent, non-delegating frontier reviews took approximately 22 and
  18 minutes and converged on the same carried Medium finding.
- A 20-minute gate run spent most of its budget loading lifecycle artifacts and
  a roughly 234-file diff, then timed out while preparing reconnaissance before
  any worker launched.
- A 40-minute gate run performed the same serial intake and then launched one
  oversized reconnaissance worker. The worker performed roughly 50 tool steps,
  including tests, but did not return before the outer timeout.
- The host buffered child output until completion, so ordinary stdout did not
  expose useful progress even while the transcript grew.

Interpretation to preserve:

- The 18–22 minute result is an observed baseline for that scope, not a
  universal review floor.
- The 20-minute failure combined an undersized budget with giant-diff-first
  intake.
- The 40-minute failure was primarily decomposition/orchestration failure, not
  evidence that 40 minutes is always insufficient.
- Delegation was specified poorly: serial primary intake, one broad worker,
  mandatory primary replay, and no lane deadline or partial return.

## Current Contracts Before This Project

### Reviewer

`.agents/agents/oat-reviewer.md` already:

- resolves the authoritative range and reads lifecycle artifacts before
  deciding whether to delegate;
- allows one bounded, read-only, non-recursive round of disjoint
  reconnaissance;
- keeps validation, synthesis, severity, verdict, and output ownership with the
  primary reviewer;
- requires compact worker evidence and prohibits worker mutation or verdicts.

It still:

- says lane classification happens after understanding “the artifacts and
  diff,” so content-level diff loading is not prohibited before planning;
- has no mandatory internal `ReviewPlan`;
- has no metadata-only change-map phase or every-file lane accounting;
- does not require an economic threshold beyond “multiple independent lanes”;
- requires direct re-verification of every load-bearing positive and negative
  worker claim, preserving most of the serial review floor;
- has no overall review budget, phase deadlines, synthesis reserve, lane cutoff,
  or useful partial-output contract.

### Project Review Wrapper

`.agents/skills/oat-project-review-provide/SKILL.md` currently:

- resolves project, branch, authoritative range, invocation, output path, and
  reviewer route;
- gathers a `git diff --name-only` inventory;
- passes `files_changed` as an orientation hint;
- leaves the full delegated review process to `oat-reviewer`.

Its inline reset path still says to read every file in `FILES_CHANGED`, and its
inline section repeats review checklist and artifact-template behavior already
owned by the reviewer. It does not build a compact manifest from
`--name-status`, `--stat`, and `--numstat`, pass an outer deadline, or validate
that broad review artifacts contain a strategy and complete lane accounting.

### Generic Dispatch

`.agents/skills/oat-dispatch-subagents/SKILL.md` already requires bounded scope,
authority, verification evidence, a deadline, retry policy, and fallback. Once
a child launch is accepted, timeout/failure does not authorize an automatic
replacement.

The remaining reviewer-specific ambiguity is whether an advisory lane that
times out may be completed by the primary inline when sufficient budget
remains. Caller-inline capability fallback is defined, but post-acceptance
worker timeout and partial-result semantics need an explicit review-level
contract.

### Gate Runtime

The gate already has timeout precedence:

1. CLI `--timeout-ms`
2. target `timeoutMs`
3. `workflow.gateTimeouts.{code|artifact}`
4. `OAT_GATE_EXEC_TIMEOUT_MS`
5. scope defaults

Current scope defaults are 15 minutes for artifact/task reviews and 30 minutes
for final/phase/range reviews. PR #185 added fresh timeout activity samples and
human-readable diagnostics. Transcript activity remains diagnostic and is not
safe evidence for deadline extension because it may be ambient or show activity
without convergence.

The reviewer prompt does not currently receive the resolved budget in a form
that lets it allocate planning, lane, reconciliation, and artifact-writing
deadlines.

### Re-review Narrowing

PR #186 (`rereview-scope-narrowing`) implements:

- prompt-free default narrowing with explicit opt-out;
- same-lineage prior-review matching;
- full-SHA, existence, and ancestry guards;
- fail-open full-scope fallback;
- durable reviewed-head provenance in artifacts and the tracked Reviews ledger;
- separate lifecycle and configured-gate lineages;
- reporting-only `empty`, `bookkeeping-only`, and `substantive`
  classification;
- inherited coverage metadata for narrowed reviews.

It deliberately does not:

- skip review based on classification;
- implement manual prior-verdict reuse;
- implement the ReviewPlan boundary;
- reduce lifecycle artifact intake;
- change delegation eligibility or primary replay;
- calibrate timeout budgets;
- write incremental review artifacts.

Do not reimplement PR #186 in this project. Treat its final merged behavior as
the baseline and revalidate after rebasing the fresh worktree.

## Proposed Capability Areas

### 1. ReviewPlan-first intake

Before source or content-level diff reads:

- resolve authority, range, mode, sink, and budget;
- read only required lifecycle/prior-review artifacts;
- build a metadata-only map from log/name-status/stat/numstat/rename data;
- account for each changed file as a lane member, generated output,
  bookkeeping, or justified exclusion;
- create a compact internal `ReviewPlan`.

The plan should record:

- authoritative scope and range;
- requirement/artifact obligations;
- lane IDs, paths, requirements, risk, strategy, and checks;
- cross-cutting invariants;
- inline/delegate decision and coordination-cost rationale;
- planning/evidence/reconciliation/output deadlines.

A compact strategy/accounting summary should appear in the final artifact, even
if the complete internal plan is not a separately durable file.

### 2. Selective evidence loading

- Inspect high-consequence seams first.
- Use path-scoped diffs and symbol-following only when required.
- Load full files only for necessary local context.
- Permit a whole content diff only below a revalidated complexity threshold
  that considers changed lines and generated-content proportion, not file count
  alone.
- Preserve complete changed-file and requirement accounting.

### 3. Delegation economics

- Keep review inline for one coherent lane, tightly shared context, low expected
  savings, or insufficient reconciliation time.
- Delegate only after the plan identifies at least two independent,
  substantial lanes.
- Reject the observed one-broad-semantic-worker shape.
- Favor deterministic command/inventory lanes whose provenance can be checked
  without replay.
- Require lane deadlines and compact complete-or-partial dossiers.

### 4. Primary verification boundary

The primary must directly verify:

- every promoted finding;
- every consequential negative/absence claim;
- conflicts and cross-lane gaps;
- risk-based samples of positive coverage.

It may accept deterministic command output when command, scope, provenance, and
result are verifiable. The intent is to preserve primary judgment without
reproducing every worker's successful reasoning.

### 5. Deadline and partial-output contract

Revalidate the proposal's suggested percentages rather than treating them as
final policy. Required outcomes are:

- planning completes early enough to affect execution;
- no new lane launches after the safe reconciliation cutoff;
- worker deadlines preserve synthesis and output time;
- incomplete coverage produces a useful `BLOCKED` result naming completed and
  uncovered lanes, commands run, and uncertainty;
- accepted-worker timeout never launches a replacement automatically.

### 6. Transactional incremental artifacts

The source proposal recommends early filesystem artifacts because child stdout
may be buffered. This is not safe as a reviewer-only prose change.

Preferred migration candidate:

- write a run-correlated partial under `reviews/in-progress/<run-id>.md`;
- mark it explicitly in progress;
- update it at meaningful phase boundaries;
- prevent every resolver, parser, receiver, gate, and control-plane reader from
  treating it as actionable;
- verify run ID and target scope, close/fsync, set complete status, and
  atomically rename to the final collision-safe path;
- update the Reviews ledger only after publication.

Revalidate whether incremental artifacts belong in the first implementation
slice. If included, all consumers must migrate together.

### 7. Prior evidence and freshness

- Independent configured gates always perform their own review unless their
  configured policy changes.
- Prior review artifacts may guide risk and sampling; independence does not
  require ignoring useful navigation evidence.
- A configured gate may narrow from its own prior completed run after PR #186,
  but cannot substitute a lifecycle final-review verdict.
- Manual same-scope reviews may eventually offer explicit “reuse after
  freshness verification” versus “run a fresh independent review.”
- `BL-260711-skip-re-review-for-bookkeeping` separately tracks the stricter
  deterministic bookkeeping-only skip.

Keep these policy choices separable from the core ReviewPlan boundary.

### 8. Ownership simplification

After behavior stabilizes:

- wrapper owns resolution, invocation, immutable gate metadata, output
  allocation/validation, ledger updates, commits, and project logging;
- reviewer owns intake, planning, evidence, optional reconnaissance,
  verification, reconciliation, severity, verdict, and artifact content.

Deduplicate process, severity, and artifact-template prose without weakening
inline fallback or provider portability.

## Regression Found and Repaired During Handoff

PR #186 widens the canonical Reviews ledger from five columns to eight columns,
but `packages/cli/src/commands/review/latest.ts` still filters parsed rows with
`cells.length === 5`. With an eight-column project ledger,
`parseReviewLedgerEvents()` returns no events and correlation falls back to the
default actionability of active artifacts.

This belongs to the current `rereview-scope-narrowing` PR because the schema
change introduced the incompatibility. Phase `p08-t01` added a failing
eight-column fixture, replaced the exact-cell-count parser with header-relative
resolution, and passed the focused suite, CLI lint, and CLI type-check. Recheck
that repair after PR #186 merges; do not carry the old behavior into this
project as accepted baseline.

## Revalidation Questions for the Fresh Thread

1. Is quick mode still appropriate, or should the project promote to
   spec-driven after discovery revalidation?
2. Which capability areas form the first atomic implementation slice:
   ReviewPlan/selective intake only, or ReviewPlan plus delegation/replay?
3. Is a plan-first contract enforceable through prose/contract tests, or does a
   runtime manifest/parser need to own the boundary?
4. What complexity threshold safely permits whole-range diff loading?
5. What exact evidence makes two lanes “independent” and “substantial”?
6. Which positive worker claims may be accepted without direct replay?
7. How should advisory timeout distinguish caller-inline completion from
   prohibited replacement?
8. Should budget propagation and scope-aware sizing ship with the reviewer
   contract or remain a dependent gate-runtime project?
9. Are transactional incremental artifacts required for the first release?
10. If partial artifacts ship, which complete list of consumers must reject
    in-progress state?
11. Should artifact mode and structured-output mode use the same internal plan
    contract despite different sinks?
12. Should manual freshness reuse be included, deferred to
    `BL-260711-skip-re-review-for-bookkeeping`, or tracked separately?
13. What telemetry or fixtures prove reduced wall-clock time without weakening
    coverage?

## Likely Change and Test Surfaces

Revalidate this inventory after updating the fresh worktree:

- `.agents/agents/oat-reviewer.md`
- `.agents/skills/oat-project-review-provide/SKILL.md`
- `.agents/skills/oat-dispatch-subagents/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md` if artifact lifecycle
  changes
- `packages/cli/src/commands/gate/index.ts`
- `packages/cli/src/commands/gate/review-verdict.ts`
- `packages/cli/src/commands/review/latest.ts`
- `packages/control-plane/src/state/reviews.ts`
- `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- `packages/cli/src/validation/skills.test.ts`
- gate, review-latest, receive, and control-plane tests
- generated provider reviewer/skill views
- user-facing project-review and gate documentation

Repository release policy applies: canonical skill/agent changes are shipped
CLI assets, changed skills need one PR-scoped version bump, all five public
packages bump in lockstep, provider views must be synced, and
`pnpm release:validate` is required.

## Suggested Fresh-Thread Orientation Order

1. Read this handoff.
2. Read `slow-review-feedback.md`, especially its addendum and final feedback.
3. Read the current reviewer, project wrapper, and generic dispatch contracts.
4. Inspect the merged PR #185 and PR #186 behavior rather than relying on this
   snapshot.
5. Re-run the empirical/stale-claim checks that materially affect scope.
6. Revalidate discovery with the user before choosing design depth or writing a
   plan.
