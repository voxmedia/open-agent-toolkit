---
title: Slow final-review feedback and proposed reviewer improvements
date: 2026-07-26
status: proposal
applies_to:
  - .agents/agents/oat-reviewer.md
  - .agents/skills/oat-project-review-provide/SKILL.md
  - .agents/skills/oat-dispatch-subagents/SKILL.md
---

# Slow Final-Review Feedback and Proposed Reviewer Improvements

## Purpose

This artifact records feedback from the `multi-provider-support` final-review
experience and proposes changes to make broad OAT reviews faster, more
observable, and more deliberate without weakening review coverage.

This document is upstream-facing feedback for the OAT toolkit. The originating
project resolved its own closeout operationally (further configured gate
reviews were skipped for its PR by operator decision), so nothing here is
required to unblock that project; the proposals target the OAT contracts and
CLI listed in the frontmatter.

The central recommendation is:

> Read lifecycle artifacts first, inspect change metadata second, create an
> explicit review plan third, and only then load path-scoped code and diff
> content.

A large final review should not begin by loading the entire effective diff into
one context and deciding what to do afterward.

## Executive Summary

The current reviewer contract contains the beginnings of an artifact-first
workflow, but it does not enforce a distinct planning boundary before source and
diff inspection. Its recently added reconnaissance delegation can also increase
wall-clock time because:

1. The primary reviewer reads enough artifacts and changed surfaces to
   decompose the review.
2. Reconnaissance workers inspect parts of those surfaces again.
3. The primary reviewer must reopen authoritative sources and directly
   re-verify every load-bearing worker claim.
4. Dispatch selection, classification, evidence recording, and reconciliation
   add coordination overhead.

Delegation is therefore not intrinsically faster. It is only beneficial when
the review plan identifies multiple substantial, independent lanes whose work
the primary reviewer can consume without replaying in full.

The two Cursor gate timeouts do not prove that delegated reconnaissance caused
the failure. Those runs produced no review artifact or orchestration record, so
there is no direct evidence of whether nested reconnaissance launched or where
the time was spent. The current workflow design nevertheless makes duplicated
work and poor deadline behavior plausible contributors.

## What the Current Contracts Actually Do

### Artifact-first intent exists

`.agents/agents/oat-reviewer.md` requires the primary reviewer to establish the
authoritative commit range and read mode-required lifecycle artifacts before
decomposition or delegation. Its normal review process also starts by loading
`plan.md`, `implementation.md`, and the mode-appropriate requirements and design
sources.

This is directionally correct.

### The artifact-first boundary is not enforced

The same reconnaissance section requires classification after understanding
"the artifacts and diff." It does not define:

- which diff metadata may be read during planning;
- when content-level diff traversal may start;
- a required review-plan output;
- a threshold for whole-range diff loading;
- a requirement to divide a broad range into path-scoped evidence lanes.

As a result, a reviewer can satisfy the prose by loading a very large diff
before it has decided how to review it.

### The project wrapper gathers change names, not the full diff

`.agents/skills/oat-project-review-provide/SKILL.md` initially runs
`git diff --name-only` to assemble `FILES_CHANGED`. The wrapper itself is not
explicitly loading all diff contents at that point.

The expensive traversal is more likely to happen inside the reviewer after
dispatch or in the inline reset path. The inline reset explicitly says to read
all files in `FILES_CHANGED`.

This distinction matters: the wrapper's inventory behavior is reasonable, but
the downstream review strategy is underspecified.

### Delegation currently duplicates verification

The reviewer contract correctly keeps judgment with the primary reviewer, but
it requires the primary to:

- understand changed surfaces before delegating;
- receive advisory worker reports;
- reopen authoritative sources;
- directly re-verify every load-bearing positive and negative claim;
- repeat searches that support absence claims;
- reconcile every lane before assigning severity.

This is rigorous but eliminates much of the expected speedup. In the worst case,
delegation turns one review into:

1. primary reconnaissance;
2. worker reconnaissance;
3. primary replay;
4. orchestration bookkeeping.

### Deadline behavior is missing from the reviewer workflow

The generic dispatch contract requires deadlines in dispatch requests, but the
reviewer contract does not define:

- an overall review time budget;
- planning, evidence, synthesis, and artifact-writing allocations;
- a last safe time to launch workers;
- a deadline for reconnaissance lanes;
- how to preserve time for the final artifact;
- how to return a useful `BLOCKED` result before an outer gate kills the run.

This makes it possible for a review to consume the full outer timeout without
producing a review artifact or a useful diagnostic.

### Broad final reviews do not exploit prior review evidence enough

The final-review workflow gathers a deferred-findings ledger, but it does not
fully use prior phase and final reviews as a non-authoritative evidence index.

A final reviewer should still independently verify the implementation. It
should not blindly trust previous verdicts. However, prior artifacts can safely
tell the reviewer:

- which ranges were already reviewed;
- which requirements and tests were examined;
- which risks were previously identified;
- which findings were fixed, deferred, or rejected;
- where cross-phase seams and freshness risks remain.

That information should guide inspection rather than cause the entire project
history to be reread uniformly.

## Proposed Review Workflow

### Phase 0: Resolve authority and budget

Before evidence collection:

1. Resolve the authoritative project, branch, range, workflow mode, review type,
   and output sink.
2. Resolve the outer deadline when one exists.
3. Allocate the available time across:
   - planning;
   - evidence collection;
   - verification;
   - reconciliation;
   - artifact writing and bookkeeping.
4. Reserve at least 25 percent of the budget for reconciliation and output.

The review should fail closed before launching if it cannot establish a viable
route, range, or minimum completion budget.

### Phase 1: Artifact-only intake

Read only:

- applicable repository instructions;
- `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, and
  `state.md` as required by workflow mode and review scope;
- prior phase/final review artifacts relevant to the current range;
- the deferred-findings ledger;
- imported-plan references when applicable.

During this phase, do not read source files or content-level diffs.

Extract:

- requirements and acceptance criteria in scope;
- planned components and boundaries;
- task-to-commit and requirement-to-test mappings;
- declared verification commands;
- accepted deviations;
- deferred findings;
- prior reviewed ranges and freshness points;
- cross-phase integration seams.

Large lifecycle artifacts may be read selectively by stable sections or machine
readable metadata, but every section used to make a review decision must be
identified.

### Phase 2: Metadata-only change map

Inspect change structure without loading diff contents:

- `git log --oneline`;
- `git diff --name-status`;
- `git diff --stat`;
- `git diff --numstat`;
- rename and deletion metadata;
- directory-level grouping;
- optional generated-file classification.

Build an inventory in which every changed file is assigned to exactly one
primary review lane or explicitly classified as mechanically generated,
bookkeeping-only, or out of scope with a documented reason.

This phase provides whole-range coverage without consuming the whole diff in
one context.

### Phase 3: Required review plan

Before source or diff content is loaded, create an internal `ReviewPlan` with:

```yaml
scope:
  type: code
  token: final
  range: BASE..HEAD

artifact_obligations:
  - requirement_or_decision: FR1
    expected_surfaces: [...]
    expected_verification: [...]

lanes:
  - id: routing-and-startup
    files: [...]
    requirements: [...]
    risk: high
    inspection_strategy: path-scoped-diff
    checks: [...]

cross_cutting_invariants:
  - provider SDK imports remain adapter-confined
  - production defaults remain unchanged

delegation:
  decision: inline | delegate
  rationale: ...
  estimated_coordination_cost: ...

budget:
  planning_deadline: ...
  evidence_deadline: ...
  synthesis_reserve: ...
```

The plan need not be written as a separate durable file for every review, but a
compact version should appear in the final review artifact so the strategy is
auditable.

### Phase 4: Selective evidence loading

Inspect source and diff content according to the plan:

1. Start with highest-consequence seams.
2. Use path-scoped diffs such as `git diff RANGE -- path...`.
3. Use symbol searches to follow affected contracts beyond edited files only
   when required to verify behavior.
4. Load complete files only where local context is needed.
5. Run mechanical inventories for generated, configuration, and policy
   surfaces.
6. Record which lane accounts for every changed file.

A whole-range content diff should be allowed only when the inventory is below a
small configured threshold. File count alone should not be the only threshold;
changed-line count and generated-content proportion matter as well.

### Phase 5: Verification

Run the narrowest checks that establish the planned claims:

- focused tests for changed behavior;
- static audits for cross-cutting invariants;
- type checking, linting, or builds when appropriate;
- privacy or security scanners when applicable;
- only the full suite when the risk or repository contract justifies it.

Verification commands should be chosen during planning, not discovered only
after diff traversal.

### Phase 6: Reconciliation and output

The primary reviewer:

1. Directly verifies every finding promoted into the final report.
2. Directly verifies every consequential absence claim.
3. Resolves conflicting worker observations.
4. Spot-checks positive coverage evidence according to risk.
5. Confirms that every changed file and in-scope requirement has an accounting
   disposition.
6. Writes the review artifact with findings, evidence, uncertainty, and any
   uncovered surfaces.

If coverage cannot be completed inside the budget, return a clear blocking
result identifying:

- completed lanes;
- uncovered lanes;
- commands already run;
- why a pass cannot be issued.

Do not run silently until the outer process terminates.

## Delegation Policy

### Default

Do not delegate merely because a final review has many files.

Keep the review inline when:

- there is only one coherent semantic lane;
- lanes share substantial context;
- the primary must replay worker reasoning to trust it;
- coordination cost is likely comparable to direct inspection;
- remaining time is too short to reconcile worker output safely.

### Delegation eligibility

Delegate only after the `ReviewPlan` identifies at least two genuinely
independent, substantial lanes.

Good candidates include:

- deterministic test, lint, type-check, build, and scanner execution;
- mechanical import or policy inventories;
- independent provider adapters;
- separate documentation or deployment surfaces;
- isolated security boundaries with explicit evidence contracts.

Poor candidates include:

- ordinary semantic code reading split arbitrarily by directory;
- cross-cutting architecture decisions that require shared context;
- small task reviews;
- lanes whose conclusions the primary must reproduce in full.

### Worker return contract

Each worker should return a compact evidence dossier:

- exact bounded scope;
- files and requirements covered;
- checks performed and exact results;
- candidate observations with `file:line` evidence;
- explicit gaps and uncertainty;
- no final severity or pass/fail judgment.

### Primary verification boundary

Replace "re-verify every load-bearing positive and negative claim" with:

- directly re-verify every promoted finding;
- directly re-verify consequential negative or absence claims;
- resolve conflicts and cross-lane gaps;
- spot-check positive coverage based on consequence and evidence quality;
- accept deterministic command output when provenance and scope are verifiable.

This preserves judgment while avoiding complete worker replay.

## Deadline and Progress Contract

For a deadline-bound review:

- Complete the review plan within the first 10–15 percent of the budget.
- Do not launch new reconnaissance after 50 percent of the budget.
- Set worker deadlines early enough to preserve at least 25 percent for primary
  reconciliation and artifact writing.
- Emit progress after:
  1. artifact intake;
  2. review-plan completion;
  3. each evidence lane;
  4. verification;
  5. artifact persistence.
- If a worker fails or times out, do not launch a replacement automatically.
  Continue inline only when the generic dispatch recovery contract permits it
  and enough budget remains; otherwise return `BLOCKED`.
- Prefer a useful blocking artifact over a process-level timeout with no output.

The generic dispatch contract and reviewer-local fallback language should be
reconciled so it is unambiguous whether an accepted reconnaissance worker
timeout permits the primary reviewer to cover that lane inline. Reviewer
reconnaissance is advisory and should not necessarily invalidate the entire
primary review, but automatic replacement must remain prohibited.

## Prior-Review and Freshness Strategy

For final reviews:

1. Inventory prior phase/final review artifacts and their authoritative ranges.
2. Treat prior verdicts as navigation aids, not trusted proof.
3. Determine the unreviewed code delta since the latest applicable reviewed
   baseline.
4. Re-examine:
   - unreviewed changes;
   - cross-phase integration seams;
   - deferred findings;
   - requirements with weak or stale evidence;
   - high-consequence invariants.
5. Spot-check prior reviewed areas according to risk.
6. Distinguish code changes from OAT bookkeeping-only changes.

When a final review already passed against the current effective code
fingerprint and subsequent commits modify only lifecycle review receipt or gate
bookkeeping, an ordinary or manual same-scope re-review should offer freshness
reuse: verify the code-only fingerprint is unchanged, then let the caller
explicitly choose between reusing the prior verdict (with a freshness
re-certification artifact) and running a fresh independent review. A
non-interactive caller must select one behavior explicitly.

This reuse never applies to a configured independent gate (for example a
cross-family exit gate): such gates always perform their own review unless
their configured policy is explicitly changed, because their value is the
independent opinion, not the verdict. See the source-verified addendum and the
GPT-5.6 Sol feedback for the full rationale.

Freshness comparison must use effective code fingerprints, not merely `HEAD`
SHAs.

## Recommended Contract Changes by File

### `.agents/agents/oat-reviewer.md`

1. Add explicit phases for:
   - artifact-only intake;
   - metadata-only change mapping;
   - review-plan creation;
   - selective evidence loading;
   - reconciliation.
2. Replace "after understanding the artifacts and diff" with language that
   forbids content-level diff reading before the review plan.
3. Add the `ReviewPlan` schema and changed-file accounting requirement.
4. Make delegation opt-in after planning.
5. Narrow primary re-verification to promoted findings, consequential absence
   claims, conflicts, and risk-based positive spot checks.
6. Add deadline allocation and progress requirements.
7. Add prior-review freshness and effective-fingerprint behavior.
8. Include the compact review strategy in the final artifact.

### `.agents/skills/oat-project-review-provide/SKILL.md`

1. Preserve the existing name-only inventory but add `--name-status`, `--stat`,
   and `--numstat` metadata.
2. Pass a compact metadata manifest rather than encouraging a giant prompt with
   an unstructured file list.
3. Include the available deadline and output reserve in the reviewer payload.
4. Require plan completion before reviewer-local delegation.
5. Replace the inline instruction to "Read all files in FILES_CHANGED" with:
   - create a review plan;
   - account for all changed files;
   - inspect content selectively according to lane and risk.
6. Add validation that the resulting artifact includes a review-strategy
   summary and complete file/lane accounting for broad reviews.
7. For ordinary/manual same-scope re-reviews, detect an already-fresh final
   review by code-only effective fingerprint and offer an explicit
   reuse-versus-fresh-review choice. Never apply this reuse to a configured
   independent gate invocation.

### `.agents/skills/oat-dispatch-subagents/SKILL.md`

1. Clarify the recovery boundary for advisory reconnaissance:
   - no replacement worker after accepted timeout;
   - define whether the primary may still complete that lane inline;
   - require remaining-budget validation before inline continuation.
2. Require the caller to pass lane and reconciliation deadlines.
3. Support compact homogeneous mechanical waves without excessive per-lane
   bookkeeping.
4. Keep model-floor and authorization safeguards, but avoid making dispatch
   metadata larger than the evidence dossier it supports.

## Prompt and Ownership Simplification

`oat-project-review-provide` and `oat-reviewer` currently duplicate review
process, severity, artifact-template, and gate instructions.

The ownership boundary should be simplified:

### Project review wrapper owns

- project and branch resolution;
- authoritative scope and range resolution;
- reviewer target selection and invocation;
- immutable gate metadata;
- artifact-path allocation;
- review-artifact validation;
- plan review-row updates;
- commits and project-log bookkeeping.

### Reviewer owns

- artifact intake;
- review planning;
- evidence collection;
- optional reconnaissance;
- verification;
- reconciliation;
- severity and verdict;
- review artifact contents.

Reducing duplicated instructions should lower prompt size, prevent drift, and
make the actual review strategy more salient.

## Acceptance Criteria

The revised workflow should satisfy all of the following:

1. A broad review emits a review plan before reading code or content-level
   diffs.
2. The planning pass uses lifecycle artifacts and metadata-only change
   information.
3. Every changed file is assigned to a review lane or explicitly classified.
4. Whole-range diff content is not loaded when the configured size threshold is
   exceeded.
5. Delegation is skipped when there are not at least two independent,
   substantial lanes.
6. Delegated workers cannot mutate files, assign severity, or issue verdicts.
7. The primary directly verifies every promoted finding and consequential
   absence claim without replaying all positive worker evidence.
8. Review deadlines reserve time for reconciliation and artifact writing.
9. A deadline-bound review produces progress and a useful `BLOCKED` artifact
   rather than silently timing out whenever the host allows graceful
   completion.
10. For ordinary/manual re-reviews, a fresh prior final review plus
    bookkeeping-only commits offers an explicit reuse-versus-fresh choice
    instead of silently starting a second complete code review. A configured
    independent gate never reuses a lifecycle final-review verdict solely
    because the code fingerprint is unchanged.
11. Final findings remain evidence-backed with exact file and line references.
12. Review rigor and severity thresholds remain unchanged.

## Suggested Test Scenarios

### Large final range

- Use a fixture with hundreds of changed files across several domains.
- Verify no content-level whole-range diff is read before `ReviewPlan`
  completion.
- Verify all files are assigned to lanes.
- Verify path-scoped reads start with highest-risk lanes.

### Small task range

- Verify the reviewer stays inline.
- Verify delegation setup is skipped.
- Verify a small whole diff remains allowed.

### Delegation-beneficial range

- Provide two independent adapters plus a mechanical test lane.
- Verify bounded workers receive disjoint scopes.
- Verify the primary validates findings but does not replay all successful
  mechanical checks.

### Delegation-not-beneficial range

- Provide tightly coupled edits across several directories.
- Verify the reviewer records an inline decision despite high file count.

### Worker timeout

- Force an advisory worker to time out.
- Verify no replacement worker is launched.
- Verify the primary either covers the lane within the remaining budget or
  returns a blocking artifact naming the gap.

### Fresh prior final review

- Create a passed final review bound to an effective code fingerprint.
- Add only review bookkeeping commits.
- Verify a manual same-scope re-review offers the explicit
  reuse-versus-fresh-review choice and honors the caller's selection.
- Verify a configured independent gate still performs its own review and does
  not substitute the prior lifecycle verdict.

### Real code change after final review

- Modify one production source file after the reviewed baseline.
- Verify the freshness shortcut is rejected.
- Verify the changed lane and affected cross-cutting seams are reviewed.

## Recommended Rollout Order

### P0

1. Add the mandatory artifact-first `ReviewPlan` boundary.
2. Add metadata-only change mapping and path-scoped diff rules.
3. Make delegation opt-in with an explicit economic justification.
4. Remove mandatory replay of every positive worker claim.
5. Add deadline allocation and artifact-writing reserve.

### P1

6. Add prior-review effective-fingerprint freshness behavior for
   ordinary/manual re-reviews (explicit reuse-versus-fresh choice; never for
   configured independent gates).
7. Add progress and graceful blocking output.
8. Reconcile advisory-worker timeout behavior with the generic dispatch
   contract.

### P2

9. Remove duplicated process and template prose between the wrapper and agent.
10. Add fixture-based contract tests for broad-review planning and timing.

## Expected Outcome

These changes should reduce context pressure and duplicated inspection while
preserving independent review judgment. Broad reviews should become:

- easier to understand;
- faster when parallelism is genuinely useful;
- no slower when parallelism is not useful;
- observable early in their execution;
- capable of returning actionable diagnostics before timeout;
- less likely to repeat a completed final review in ordinary/manual flows when
  only bookkeeping changed, while configured independent gates keep their own
  review obligation.

The intended sequence is:

> artifacts → metadata-only change map → explicit review plan → selective
> evidence loading → verification → reconciliation → artifact

It should not be:

> artifacts → giant diff → delegation → duplicated verification → timeout

## Addendum: Empirical Evidence From the 2026-07-26 Manual Final Reviews

Recorded by the second session (the one that ran the manual final review while
the gate was blocked on Claude CLI authentication). This section adds measured
data and independent analysis; it does not change the proposals above.

### Measured baseline: two same-scope final reviews, zero delegation

On 2026-07-26 the same final scope (`af8cdc2b..62baabdf`, 227 commits, 237
changed files, 170 code/docs surfaces) was reviewed twice by independently
dispatched frontier reviewers, both Tier 1 subagents with no gate overhead:

| Reviewer                                    | Wall clock  | Delegation                             | Verdict                        |
| ------------------------------------------- | ----------- | -------------------------------------- | ------------------------------ |
| `oat-reviewer-gpt-5-6-sol-high`             | ~22 minutes | none (`Reconnaissance: not-attempted`) | PASS, 0C/0I/1M/0m (carried M1) |
| `oat-reviewer-claude-fable-5-thinking-high` | ~18 minutes | none (`Reconnaissance: not-attempted`) | PASS, 0C/0I/1M/0m (carried M1) |

Observations:

1. **The no-delegation floor for this scope is roughly 20 minutes.** Both
   reviewers read all lifecycle artifacts, inspected the implementation, and
   ran keyless verification (type-check, lint, hundreds of focused tests).
   Neither loafed; that is simply what the workload costs inline.
2. **A 20-minute gate budget therefore could not pass a fresh final review of
   this scope under any delegation policy.** The first gate timeout was not a
   delegation failure; it was an undersized budget. Gate timeouts must be
   sized from scope (changed-line count, artifact volume), not a constant.
3. **Both frontier reviewers independently chose not to delegate** when the
   option was open to them, and finished comfortably inside a 40-minute
   budget. Combined with the delegating gate run exceeding 40 minutes, the
   observed cost of delegation-as-currently-specified is roughly 2x wall
   clock for this scope.
4. **Both reviews converged on identical findings** (the single carried,
   operator-accepted Medium deferral). A second full re-review of an
   unchanged effective code fingerprint bought zero new information for ~20
   minutes of cost — the freshness short-circuit argument in concrete form.

### Transcript forensics supersede the "no direct evidence" caveat

The Executive Summary above notes the timed-out runs produced "no direct
evidence of whether nested reconnaissance launched or where the time was
spent." Subsequent transcript forensics (first session, 2026-07-26 morning)
did recover that evidence:

- The 20-minute run spent most of its budget loading the 234-file diff and
  large OAT artifacts and died at "preparing reconnaissance" — before any
  delegation. This is the artifacts → giant diff anti-pattern, measured.
- The 40-minute run spawned one broad reconnaissance worker that performed
  ~50 tool steps, including test runs, and never returned its report before
  the timeout: one oversized serial worker, not parallel lanes.
- Cursor buffered subagent output until completion, so the gate reported "no
  output" while the transcript was actively growing.

### Delegation was executed poorly, not conceptually wrong

The measured failures are specification failures, not evidence against
delegation as such. The current contract produced the worst possible shape:

- It requires the primary to understand the artifacts and diff **before**
  delegating, so the expensive intake happens serially up front.
- It permits a single broad reconnaissance worker instead of forcing bounded,
  disjoint lanes, so the "parallelism" was one serial hop that duplicated the
  primary's intake.
- It requires the primary to replay every load-bearing worker claim
  afterward, so even a successful worker saves little serial time.
- It gives workers no deadline or partial-result obligation, so a slow worker
  consumes the entire outer budget silently.

Each of those is fixable by contract, and the fixes are the proposals above:
plan first, delegate only into genuinely independent bounded lanes, narrow the
replay obligation, and impose lane deadlines with partial results. Where
delegation is aimed at deterministic command lanes (test suites, lint,
type-check, scanners, mechanical inventories), it should still produce real
wall-clock wins, because outputs are verifiable on provenance without replay.
What should not survive is delegating open-ended semantic reading by default:
under a replay contract the serial floor never drops, and coordination
overhead is added on top. The parallel-lane design only pays off if the
narrowed re-verification boundary ships with it (P0 items 3 and 4 are a
package, not independent line items).

### Incremental artifact writing (endorsed, with one gate-safety requirement)

The operator proposal — write the review artifact template first, then emit
progress updates into it during the review — is the right mechanism, and the
buffering forensics explain why it must be filesystem-based rather than
stdout-based: a dispatcher or gate polling stdout learns nothing on hosts that
buffer subagent output until completion.

Concretely:

1. Immediately after the ReviewPlan phase, write the artifact file with full
   frontmatter, the compact review plan, the lane inventory, and empty
   findings sections.
2. Update the artifact at each phase boundary (intake done, plan done, per
   lane, verification done), so `mtime` and content both advance.
3. Dispatchers and gates poll the artifact path for liveness instead of
   stdout. A stalled `mtime` is a real hang signal; a growing artifact is
   progress.
4. On timeout, whatever is on disk is a diagnosable partial: completed lanes,
   uncovered lanes, commands already run.

One safety requirement: a partial artifact must never be parseable as a
completed review. Add a frontmatter status field (for example
`oat_review_status: in_progress | complete`) written as `in_progress` at
creation and flipped to `complete` only after reconciliation. `oat gate
review` and `oat-project-review-receive` must fail closed on anything other
than `complete`, so an outer timeout that kills the reviewer mid-lane cannot
leave behind an artifact that a later parse mistakes for a passing verdict.

### Source-verified gate mechanics (corrections after reading the OAT source)

An earlier draft of this addendum claimed the redundant re-reviews were caused
by a fingerprint-staleness loop ("recording a passed review is what expires
it"). Reading the live OAT source (`~/Code/vox/open-agent-toolkit`, the
checkout the global `oat` binary links to) shows that claim was wrong, and
several proposals above are partially implemented already. Corrections:

**1. A rolling freshness checkpoint already tolerates bookkeeping commits.**
The closeout contract
(`.agents/skills/oat-project-implement/references/completion-and-closeout.md`)
defines "closeout-only descendants" (gate artifacts/receipts, project
tracking, `project-log.md` appends, summary/doc/PR outputs, HiLL and
completion bookkeeping). After each corroborated closeout-only transition, the
workflow rehashes the effective delta and advances a rolling
`freshness_head`/`freshness_fingerprint` checkpoint without rerunning gate or
receive. The differing fingerprints observed in this project's gate state are
that mechanism working as designed, not staleness. The trade-off is that the
verification (walking descendants, checking each commit is closeout-only) is
executed by the agent per prose, per resume — correct but not cheap.

**2. The fingerprint scope is a deliberate choice, not an oversight.** The
`effective-delta-v1` digest hashes the raw NUL-delimited
`git diff --raw -z --no-renames --no-abbrev` stream from the unique merge base
to HEAD, excluding only the exact `state.md` checkpoint carrier (literal
pathspec) to avoid a self-referential digest. Everything else — including
skill, template, and workflow files — stays fingerprinted so substantive
changes cannot hide. Bookkeeping tolerance is handled by the rolling
checkpoint above (verify-then-roll), not by path exclusion. A reference
implementation lives in
`packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`.

**3. The repeated reviews were recoveries of one never-passed gate, not
staleness re-triggers.** The configured exit gate
(`workflow.gates.skills.oat-project-implement`) is a deliberately independent
second final review (cross-family semantic review) on top of the built-in
lifecycle final review. It never completed: a 20-minute budget undersized for
the measured ~20-minute no-delegation floor, then the serial mega-worker run,
then a selector/avoidance mismatch, then Claude OAuth expiry. A freshness
short-circuit that returns the built-in lifecycle review's verdict would
defeat this gate's stated purpose (independent cross-family verification).
The right lever for the gate is making that independent review affordable
(ReviewPlan, selective loading, prior-review-as-index) — not skipping it.
The freshness short-circuit remains valid for _manual_ `final` re-reviews in
`oat-project-review-provide` when a passed same-scope review already covers an
unchanged code-only delta (this morning's two manual runs were exactly that
redundancy).

**4. Scope-sized gate timeouts partially exist.** `oat gate review` resolves
its timeout as: `--timeout-ms` flag → `target.timeoutMs` config →
`workflow.gateTimeouts.{code|artifact}` config → `OAT_GATE_EXEC_TIMEOUT_MS`
env → scope defaults of 900s (artifact and `pNN-tNN` scopes) / 1800s (`final`,
`pNN`, phase ranges). Two problems: the 30-minute final-scope default is below
`no-delegation floor (~20 min) + gate-child bootstrap + any delegation`, and
any config/env override (this project's persisted command pins
`OAT_GATE_EXEC_TIMEOUT_MS=2400000`) freezes a constant that ignores scope
size. The defaults should be calibrated against measured floors, and overrides
should scale rather than pin.

**5. Filesystem liveness probes already exist but do not inform the
deadline.** `packages/cli/src/commands/gate/activity-probes.ts` watches
per-runtime transcript directories (Claude/Codex/Cursor path encoders) and
surfaces change-since-baseline evidence through periodic liveness events. But
the hard timeout (`child.kill('SIGTERM')` at `timeoutMs`) fires regardless of
that evidence — probes are diagnostic only. This explains the observed
"review_failed with no output while the transcript grew." Two cheap
improvements: (a) include the final activity-probe evidence in the timeout
failure envelope so a killed run is diagnosable, and (b) optionally allow
bounded deadline extension while the artifact file (not stdout) is provably
advancing — which composes with the incremental-artifact-writing proposal and
its `in_progress` status guard.

### Priority adjustment suggested by the measurements (revised)

With the source-verified corrections, the value-per-effort ordering changes:

1. **Calibrate gate timeout defaults and make overrides scale-aware** — the
   20-minute and 40-minute failures were budget failures first. Data point:
   this scope's no-delegation floor is ~20 minutes before gate-child
   overhead.
2. **ReviewPlan boundary + metadata-only change mapping** — removes the
   measured artifacts → giant diff intake cost, which consumed most of the
   20-minute run.
3. **Delegation opt-in + narrowed re-verification (as a package)** — prevents
   the serial mega-worker shape that consumed the 40-minute run.
4. **Incremental artifact writing with the `in_progress` guard, plus surfacing
   existing activity-probe evidence in timeout envelopes** — turns silent
   kills into diagnosable partials; the probe machinery already exists.
5. **Freshness short-circuit, rescoped to manual `oat-project-review-provide`
   re-reviews only** — still a real win (both manual 2026-07-26 reviews were
   redundant), but it must not bypass the configured cross-family gate, whose
   independence is intentional.

## GPT-5.6 Sol Feedback (2026-07-26)

### Overall assessment

The source-verified addendum materially improves this proposal. In particular,
it correctly distinguishes:

- the mandatory lifecycle final review from the separately configured
  cross-family exit gate;
- immutable review provenance from rolling closeout freshness;
- review-workflow inefficiency from gate-runtime mechanics;
- useful delegation from a single broad serial reconnaissance hop.

The recommended artifact-first sequence remains the strongest part of the
proposal:

> artifacts → metadata-only change map → explicit review plan → selective
> evidence loading → verification → reconciliation → artifact

I would proceed with this design after reconciling the remaining contradictions
and tightening the timeout and partial-artifact recommendations below.

### 1. Reconcile the main body with the corrected freshness analysis

The addendum correctly rejects using a prior lifecycle final-review verdict to
satisfy the independently configured cross-family gate. Earlier sections still
contain broader language that says a later gate should perform only freshness
validation when code is unchanged.

Update every earlier occurrence so the document consistently says:

- configured independent gates always perform their own review unless their
  configured policy is explicitly changed;
- freshness reuse applies only to ordinary/manual same-scope re-reviews;
- an explicit request for a fresh independent opinion must bypass reuse even
  when the code fingerprint is unchanged.

This affects the earlier prior-review strategy, the proposed
`oat-project-review-provide` changes, acceptance criterion 10, and the expected
outcome language.

For manual reviews, freshness reuse should be an explicit interaction rather
than an unconditional shortcut:

```text
An unchanged implementation already has a passed final review.

1. Reuse the prior verdict after freshness verification
2. Run a fresh independent review anyway
```

A non-interactive caller should have to select one behavior explicitly.

> **Resolution note (2026-07-26, second session):** applied. The main body's
> Prior-Review and Freshness Strategy section, review-provide change 7,
> acceptance criterion 10, the fresh-prior-final-review test scenario, rollout
> item 6, and the Expected Outcome bullet now carry the manual-only,
> explicit-choice, gates-always-review language.

### 2. Activity evidence already exists in timeout envelopes

The current OAT source already carries the final `activityEvidence` value into
`review_failed` timeout envelopes. Both timeout receipts from this project also
contain it:

- `79c43422-465e-4a08-8875-352e7c563059.json`
- `e5971847-c41d-4bb7-876f-74b4bec0b45c.json`

Both record Cursor project-directory transcript growth with
`changedSinceBaseline: true`.

Therefore, the missing capability is not "include activity evidence in the
timeout envelope." It is:

1. surface that existing evidence in the human-facing gate failure summary;
2. persist the latest liveness diagnostic in implementation closeout notes;
3. distinguish "timed out while active" from "timed out with no observed
   activity";
4. use run-attributable artifact progress, not ambient transcript growth, for
   any deadline-extension decision.

Transcript activity is diagnostic evidence only. It cannot prove useful review
progress, and Codex's ambient-runtime probe is explicitly not attributable to a
single gate child.

### 3. Separate the two timeout diagnoses

The revised priority section calls both Cursor failures "budget failures first."
That is too broad.

- The 20-minute run was clearly undersized relative to the observed 18–22
  minute inline-review baseline plus gate bootstrap.
- The 40-minute run had enough time for either measured inline reviewer. Its
  failure is better classified as a decomposition and orchestration failure:
  full serial intake followed by one oversized reconnaissance worker, with no
  bounded lane deadline or partial return.

The timeout default still needs calibration, but increasing the budget alone
would mask the second failure rather than fix it.

### 4. Treat the observed 20 minutes as a baseline, not a universal floor

Two independent measurements are useful but insufficient to establish a
general lower bound. Call this the "observed inline baseline for this scope"
rather than the "no-delegation floor."

Future timeout sizing should use multiple inputs:

- changed-line count and file count;
- lifecycle artifact size;
- number of requirement and verification mappings;
- expected verification-command duration;
- review-plan lane count;
- runtime bootstrap overhead;
- a bounded synthesis and artifact-writing reserve.

The resulting budget should have a hard maximum. Liveness should never create
an indefinitely renewable review.

### 5. Make incremental artifact writing transaction-safe

The proposed `oat_review_status: in_progress | complete` guard is necessary but
not sufficient. An in-progress artifact written directly into the active
`reviews/` directory may be selected by `oat review latest` or another workflow
before every consumer has adopted the new status check.

Prefer one of these approaches:

1. write to a run-correlated staging location such as
   `reviews/in-progress/<run-id>.md`, then atomically rename into `reviews/`
   after reconciliation; or
2. teach every artifact resolver and receiver to exclude
   `oat_review_status != complete` before enabling direct active-directory
   writes.

The staging approach has the safer migration path. The final publish operation
should:

- verify the run ID and target scope;
- set `oat_review_status: complete`;
- fsync or close the completed file;
- atomically rename it to the final collision-safe review path;
- only then update the Reviews ledger.

Timed-out partials remain available for diagnosis but never become actionable
review events.

### 6. Keep deadline extension bound to the review artifact

If bounded deadline extension is implemented, require all of:

- the artifact belongs to the current gate run ID;
- its status remains `in_progress`;
- its content or size advanced since the previous probe;
- the reviewer process remains alive;
- the extension count and total extended time remain below configured caps;
- enough reserved time remains for reconciliation and final publication.

Transcript growth alone must not extend a deadline. A worker can produce large
transcripts without converging, which is what happened during the 40-minute
run.

### 7. Preserve review independence while reusing prior evidence as an index

The configured cross-family reviewer should still read prior reviews early, but
only as a navigation and risk index. It should independently inspect:

- unreviewed changes;
- cross-phase seams;
- deferred findings;
- high-consequence invariants;
- sampled prior positive evidence selected by risk.

It need not uniformly replay every previously reviewed file. Independence is a
judgment property, not a requirement to ignore useful evidence about where risk
is concentrated.

### 8. Recommended implementation order

I recommend this order:

1. **ReviewPlan boundary and metadata-only intake.** This removes the proven
   giant-diff-before-planning failure mode.
2. **Delegation eligibility and lane contracts.** Require multiple genuinely
   independent lanes, deadlines, and compact partial returns; prohibit the
   single broad semantic-recon worker shape.
3. **Narrow primary replay obligations.** Directly verify promoted findings,
   consequential absence claims, conflicts, and risk-based samples instead of
   replaying every positive worker claim.
4. **Transactional incremental artifacts.** Add the staging path, explicit
   status, atomic publish, and fail-closed consumer behavior.
5. **Timeout calibration and bounded extensions.** Size initial budgets from
   planned work, surface existing activity evidence, and permit only
   run-attributable artifact-based bounded extensions.
6. **Manual-review freshness reuse.** Offer prior-verdict reuse for unchanged
   ordinary/manual reviews while preserving explicit fresh-review intent and
   never satisfying the independent configured gate by substitution.
7. **Prompt/ownership deduplication.** Reduce overlap between the project
   wrapper and reviewer after the behavioral contracts are stable.

This ordering treats timeout increases as a safety margin around a bounded
review plan, not as compensation for unbounded review behavior.

### Additional acceptance criteria

Add the following tests to the proposal:

1. A configured independent exit gate does not reuse a lifecycle final-review
   verdict solely because the code fingerprint is unchanged.
2. A manual final re-review with unchanged code offers reuse versus fresh
   independent review and preserves the caller's explicit choice.
3. Timeout output distinguishes active transcript evidence, absent probe
   evidence, and run-attributable artifact progress.
4. Existing `activityEvidence` from the gate process is surfaced without
   changing the structured envelope incompatibly.
5. An `in_progress` review artifact is never returned by actionable-review
   resolution and cannot be received.
6. A completed staged artifact is atomically published once and bound to the
   correct run ID, scope, and Reviews event.
7. Deadline extension cannot be triggered by transcript growth alone.
8. A 40-minute-equivalent fixture with one oversized semantic worker is
   rejected during planning or terminated at its lane deadline with a useful
   partial dossier.
