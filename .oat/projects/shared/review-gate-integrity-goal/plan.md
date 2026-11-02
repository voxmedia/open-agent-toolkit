---
oat_template: false
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-11-02
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [] # [] = none for brief modes
oat_auto_review_at_hill_checkpoints: false # brief: no checkpoints
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: goal
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Project Brief: review-gate-integrity-goal

> Execute this brief using `oat-project-implement`. Phases are the units of
> progress: each `## Phase pNN:` block carries intent and exit evidence instead
> of planned tasks, and only the next phase must be concrete. Execution records
> (`### Task pNN-tNN:`) live in `implementation.md`, never here.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

**Phase block grammar (strict):** each phase is one `## Phase pNN: <name>`
heading followed by a blank line and these exact lines:

```markdown
**Intent:** one or more non-empty lines
**Exit evidence:** one or more non-empty lines
**Provisional:** no
```

Phase IDs are stable and document order governs execution. `**Provisional:**`
accepts `yes` or `no`; absent means `no`. The first phase must not be
provisional. Do not add `### Task` headings to phases.

## Goal

Review and gate cycles should spend reviewer runs and attempt budgets only on
findings that can change what ships. Today a reviewer that flags a stale ledger
row, an archived-path reference or a mis-transcribed review cell starts a whole
new review cycle, and a blocking gate whose only findings are such records
consumes an attempt and relaunches (GitHub #233). Review dispositions and gate
receipts are bound only to a (scope, type, artifact) convention that no code
checks, so stale or duplicate rows block closeout (#194, #305). An exhausted
gate cannot show whether it was converging or stuck (#327), and outside goal
mode, closeout checks only its sequence snapshot, not whether each required
receipt still covers the current head (#201).

This goal delivers, one merged milestone at a time: a prose rule under which
bookkeeping-only findings are fixed at receive with no re-review, no new review
cycle and no gate relaunch, on every project review and gate path; exact-event
consistency for every review row and gate receipt; convergence visibility for
repeated gate attempts; and non-goal closeout freshness for every required
receipt. Throughout, independent review keeps its authority: raw findings,
severities, counts and verdicts are never rewritten, and any finding that is
not bookkeeping follows today's flow.

**Amended 2026-11-02.** m01 was first approved as a verified clerical
settlement backed by a read-only CLI verifier. After p01 and p02 were built, a
complexity review found that design far larger than the pain it fixes, and its
closed repair kinds would have settled about one of seven recorded incidents.
The operator chose the prose-only rule recorded under Decisions. p02's verifier
is reverted, the old m01 phases p03 to p05 and the old m02 phase p06 are
removed, and planning gates and artifact reviews fold into m01.

Verified starting facts: `references/research/current-main-facts.md`.

## Outcomes

<!-- Number each outcome and name the evidence that will show it holds. Completion is audited against this list. -->

1. **Bookkeeping-only findings settle at receive (m01).** On every project review and gate path (`oat-project-review-receive`; implement's per-phase review, optional phase gate, final review, implement exit gate, and goal milestone exit gate and integrated review; the planning skills' artifact-review loops and lifecycle gates), when every finding of one review or gate result is bookkeeping, the receiver fixes them all in one commit with a one-line note per finding and records the review `passed` with the note "bookkeeping-only fixes applied at receive". No reviewer is dispatched, no review cycle is counted, and a blocking gate uses no attempt and is not relaunched: it counts as satisfied (carrier `status: allowed`, `disposition: passed`) while its raw verdict and counts stay in the gate receipt. A result with any non-bookkeeping finding follows today's flow unchanged. — Evidence: each changed path states the rule, pinned by contract tests; a walkthrough of at least two real recorded incidents (the #233 gate relaunch and one bookkeeping-only phase or final review rerun) shows the rule settles each without a rerun; the autonomy inventory and contract suites pass.
2. **Bookkeeping is defined narrowly, once (m01).** One shared definition says a finding is bookkeeping when it only asks to correct a record of existing evidence or state: a stale Reviews row cell or status label, an archived-artifact path reference, a derived counter, a task-SHA list, a progress label, or provenance wording. It is never bookkeeping when it asks for a missing review, a requirement change, an approval, a new receipt, completion of unfinished work, or an edit to a `**Status:**` acceptance marker, a Reviews row's `Reviewed Head`, or a set-once delivery field (brief contract section 12.8). Reviewers may mark a finding `(bookkeeping)` inside its bold title; the mark is advisory, the receiver decides, and a doubtful finding is not bookkeeping. — Evidence: the definition and its exclusions are pinned by a contract test; `oat-reviewer.md` documents the marker; a parser test shows a marked finding yields the same counts, severities and verdict as its unmarked twin.
3. **Verdict findings are identified, not tallied (m01).** The gate verdict parser accepts the captured #339 finding shape (an explicit bold finding-title marker followed by column-zero detail bullets with closed, exact labels) as one finding per title. It keeps genuinely distinct list-item findings as separate findings, refuses with a structured, receive-ineligible failure when ownership of a detail bullet is ambiguous rather than guessing, keeps the existing all-source refusal when declared and body counts disagree, and emits per-finding records (#339 parser slice). — Evidence: two fixtures with provenance headers, neither with invented content. The first is the issue #339 reproduction exactly as published; its header records that the issue text is abbreviated, so the original 2 Medium / 3 Low result cannot be reproduced from it. Its body tally changes from 6 Medium / 2 Low to 2 Medium / 1 Low, because detail bullets are no longer counted as findings. With its declared count line it is still refused for disagreement (3 Low declared against 1 in the abbreviated body), which is correct. The second is the reviewer's returned message from the backlog-wave-5 exit-gate r1 run, extracted from gate stderr with the JSONL events stripped. It yields the categorical outcome (counts or a structured refusal) recorded in its header before the grammar change, and serves as real-output evidence for the bold title marker and detail labels. A genuine disagreement is still refused. A body-only undercount control keeps a genuinely separate finding that follows a bold-title finding, even when its title starts with a detail-like word. An orphan detail item is refused, never ignored.
4. **Exact-event consistency (m02, refined at re-alignment).** Every review disposition and gate receipt binds to exactly one ledger event; duplicate rows are prevented and existing duplicates are repairable; the remaining source-qualified provenance fields that consumers need are emitted; and pull-request skills list pending required reviews before a PR is created. — Evidence: settled at re-alignment; at minimum the repeated-blocking-gate fixture from `BL-260820-bind-each-gate-review`.
5. **Gate convergence visibility (m03, refined at re-alignment).** For every gate attempt after the first, each finding is marked new or carried over, the result reports new, carried-over and resolved counts per attempt, and findings carry the contract classification (accepted-requirement, regression, new-hardening), with bookkeeping findings reported as their own class under m01's definition. These feed the existing exhaustion stop and complexity review. — Evidence: settled at re-alignment; at minimum a converging, a stuck and a reworded-carried-over attempt sequence.
6. **Non-goal closeout freshness (m04, refined at re-alignment).** Outside goal mode, closeout refuses absent or stale evidence for every required review, check and gate receipt against the current head, through a documented bookkeeping rule rather than a broad exemption. — Evidence: settled at re-alignment; at minimum the RP-03 late-documentation case from `BL-260820-track-pr-closeout-evidence`.

## Approach

m01 is skill prose plus the p01 parser fix. It adds no verifier, no new Reviews
status, no new carrier disposition, no evidence store and no event-ID column.

- **One definition, many call sites.** The bookkeeping definition (Outcome 2)
  lives in one shared place. Each review and gate path names it and adds one
  branch: "every finding is bookkeeping → fix in one commit, note each, record
  `passed`, route onward." The branch sits next to today's sentences rather
  than rewording them, so existing pins and behavior for every other case stay
  intact.
- **Receiver decides.** The receiving agent classifies each finding against the
  definition. A reviewer's `(bookkeeping)` mark is a hint, never a count or
  verdict change. A finding the receiver is unsure about is not bookkeeping.
- **`passed` means "no substantive finding remains".** A bookkeeping-only review
  is recorded `passed` with the note, so the router, pr-final, complete,
  cleanup, delivery check and closeout-check need no change: they already
  accept `passed`. The `review-receive` rule that `passed` is never written
  for completed fixes gains one stated exception for this case.
- **Gates.** A blocking gate whose findings are all bookkeeping is satisfied
  once the fix commit lands: the carrier records `allowed`/`passed`, no attempt
  is counted and the gate is not relaunched. The gate receipt keeps the raw
  blocked verdict and counts. The effective-delta freshness rule already treats
  project-tracking descendants as closeout-only, so the fix commit does not
  stale the carrier; the goal bookkeeping-successor rule (brief contract
  section 12.8) is unchanged, which is why set-once delivery fields and
  `Reviewed Head` are excluded from the definition.
- **Autonomy.** Under `OAT_AUTONOMOUS=1` the rule applies without a stop. The
  autonomy rows that govern re-review and gate retry say so; a bookkeeping
  repair never infers completion, waives HiLL, grants approval or accepts an
  unresolved Critical.

## Constraints and Out of Scope

- **Constraint:** Raw reviewer findings, severities, counts and verdicts are never rewritten; a bookkeeping-only review is recorded `passed` only with its note, and the gate receipt keeps the raw verdict.
- **Constraint:** Each milestone PR bumps all five lockstep public package versions (bundled skills and agents count as shipped CLI functionality), the `metadata.version` of every changed canonical skill, and the top-level `version:` of `.agents/agents/oat-reviewer.md` when it changes.
- **Constraint:** After any canonical skill or agent edit, run `oat sync --scope project` and commit the regenerated tracked provider views and `.oat/sync/manifest.json` with the change.
- **Constraint:** Each milestone runs the AGENTS.md Definition of Done gates in CI order, with explicit exit-code capture and evidence-grade reruns where Turborepo may replay caches, plus the skill contract tests (`src/commands/init/tools/shared` and `src/validation`) whenever skill prose changes.
- **Constraint:** New skill prose avoids wording that the autonomy inventory scan treats as a decision point, or adds the matching coverage entries in the same commit.
- **Constraint:** Parser fixtures derive from captured real reviewer output, with provenance recorded in the fixture header, and run against a real artifact before review is requested.
- **Constraint:** Gate and review-provide behavior changes are probed with the branch build (`node packages/cli/dist/index.js --json gate review …`), not the `oat` on PATH.
- **Constraint:** The control-plane router stays pure; review files stay local-only; no new evidence store or event-ID column; the goal bookkeeping-successor contract is preserved.
- **Constraint:** Brief amendments stay local until the open delivery merges (pushing one stales that delivery, `DR-261011-bookkeeping-successors-keep`).
- **Constraint:** Docs, autonomy-rule changes and decision records ship with the delivery whose behavior they describe (`README.md`, affected package READMEs, `apps/oat-docs/docs/`).
- **Out of scope:** A CLI verifier, replay checks, a `resolved` Reviews status or a `clerical_resolved` carrier disposition; the reverted p02 verifier stays recoverable from `7cb72f013` if a later incident shows the prose rule is abused.
- **Out of scope:** A general tolerant Markdown-repair parser; p01 extends the grammar only for the captured finding-title shape.
- **Out of scope:** Remote and ad-hoc non-project reviews (`oat-review-provide`, `packages/cli/src/review-remote/`).
- **Out of scope:** Routing or progress pointer repair, phase-status promotion, and task or phase completion inferred from commits.
- **Out of scope:** `BL-260927-derive-current-lifecycle-state` beyond m02's one-row-per-event slice; `BL-260711-add-activity-aware-gate`; `BL-260706-front-load-recurring-gate`; `BL-260902-file-deferred-repository`; `BL-261002-offer-a-strict-gate-reviewer`; `BL-261002-re-review-a-phase-only-after`; the #344 autonomous invalid-artifact recovery slice of `BL-260711-skip-re-review-for-bookkeeping`; the original-run rewrite and revalidation half of `BL-261003-diagnose-review-finding`; and the ReviewPlan-first redesign (`BL-260729-implement-reviewplan-first`, PR #190).
- **Out of scope:** Extra cycles and proceed-with-override at exhaustion (`BL-260818-distinguish-operator-directed`), which stay open as a candidate for a later, optional, operator-selected delivery.

## Decisions

- **Prose-only bookkeeping rule (amendment, 2026-11-02, operator).** After a complexity review of the built verifier, the operator chose a prose rule over verified settlement. Answers: (1b) a bookkeeping-only review is recorded `passed` with a note, not a new `resolved` status, so no reader changes; (2) a blocking gate whose findings are all bookkeeping is satisfied after the fix, with no relaunch and no attempt; (3) derived counters, task-SHA lists and progress labels are bookkeeping, `**Status:**` acceptance markers are not; (4a) this amendment takes one artifact-review attempt, then the `oat-project-goal` gate on a Sol model, then operator approval; (5) Claude Opus 5.5 implements the remaining m01 work, Opus 5.5 high self-reviews each phase, and Sol runs the gates. Rejected: (1a) a `resolved` status, which needs about nine reader and skill edits; finishing m01 as first designed, whose cost far exceeds the reruns it saves. Accepted cost: the rule is enforced by the receiving agent's judgment against the definition, not mechanically. Supersedes Round 2 Q6 (verifier), Q7 (closed repair kinds), Q8 (distinct records), Q9 (planning gates split out), R2, R3, R5's m02 clause, M3, and final review M3 and M4.
- **Built work (amendment, 2026-11-02).** p01 is kept as accepted. p02's verifier code (`fcb556d4e`, `56bae738d`, `7cb72f013`) is reverted inside p02, which then closes. The never-started phases p03, p04, p05 and p06 are removed; their IDs are not reused. The optional phase gates are dropped. m02 folds into m01, and the later milestones are renumbered m02 to m04.
- **Scope (Round 1 Q1).** The outcome areas are bookkeeping settlement, exact-event consistency, convergence visibility and non-goal closeout freshness. Rejected: folding closeout freshness into the binding milestone, because it mixes CLI closeout logic into binding work.
- **Exclusions (Round 1 Q1).** The items listed under Out of scope stay open in the backlog. The ReviewPlan-first redesign stays parked.
- **#339 parser slice only (Round 1 Q1).** From `BL-261003-diagnose-review-finding` only the verdict-parser slice ships: finding identification and count agreement, not trusting declared counts over body evidence or the reverse.
- **BL-260818 out of the convergence milestone by default (Round 1 Q1).** m03 is visibility and classification reporting that feed the existing exhaustion stop and complexity review. Rejected: building the authorization record into m03, which adds authority, allowance accounting, resume and closeout obligations beyond visibility.
- **One definition (Round 1 Q1, restated by the amendment).** m01 defines bookkeeping once. m03's classification reuses it. Rejected: a second classifier with conflicting authority.
- **Bookkeeping first (Round 1 Q2).** Bookkeeping settlement ships before identity work, because it is the urgent pain. Rejected: identity first, which delays it by a milestone.
- **No Medium/Low exemption (Round 1 Q4).** Severity and bookkeeping are separate dimensions: a High finding can be bookkeeping, and a Low content finding is still content.
- **Merged endpoint (Round 1 Q5).** Each milestone's PR merges before the next activates, followed by re-alignment against the observed integration base. Rejected: `open`, which stacks branches on shared skill files and lockstep versions.
- **Narrow parser grammar (realignment R1).** Option (a), narrowed: support the captured explicit bold finding-title marker (for example `**M1 — title**` with its location suffix) and closed, exact detail labels taken from captured output. A distinct finding title or list-item finding wins over any detail-label heuristic. Ambiguous or orphaned detail blocks are refused, fenced examples are ignored, ownership never crosses a severity or section boundary, and no grouping is chosen because it matches declared counts. The all-source disagreement refusal stays. Rejected: any bold paragraph as a title, and broad "starts with Fix/Issue" heuristics; diagnosis only, which leaves #339 artifacts forcing reruns.
- **No self-application in m01 (realignment R5, narrowed).** This project's own m01 reviews and gates follow the installed toolchain's existing ladder; the new rule governs this project only once it is released and installed.
- **#339 fixture sources (re-review M6, final review M1 and M2).** The original #339 reviewer artifact is unavailable. p01 uses the issue #339 reproduction exactly as published and asserts its own categorical outcomes. It also uses the reviewer's returned message from the backlog-wave-5 exit-gate r1 run, extracted from gate stderr, with an expected categorical outcome fixed before the grammar change. Rejected: reconstructing the elided Low findings (invented fixture content can encode the same wrong model as the code); capturing a fresh artifact first (the shape cannot be produced on demand).
- **Marker inside the bold title.** The optional `(bookkeeping)` mark goes inside the finding's bold title, because the parser's closed detail labels admit no new `Kind:` line and a mark after the bold would break location parsing.
- **Planning setup (2026-11-01, amended 2026-11-02).** Dispatch policy High (recorded in `state.md`). No optional phase gates. Both configured lifecycle gates (`oat-project-goal`, `oat-project-implement`) are kept.
- **Goal workflow fit.** Several deliveries over time, each merged and re-aligned. The first milestone is concrete; later milestones depend on what m01 teaches. Quick mode would require an approved up-front task plan the operator did not ask for.

## Known Unknowns

- Where the shared bookkeeping definition lives so that review-receive, implement and the planning skills can all reference it (a shared doc under `.agents/docs/` linked into each skill, or one owning skill named by the others) — Settled by: p10
- Whether today's gate receipts already keep the raw blocked verdict and counts once the carrier records `allowed`/`passed`, or need one recorded line — Settled by: p10
- Which planning skills restate the gate block-and-retry rule and the artifact-review retry loop, and need the branch (quick-start, plan, import-plan, brief, goal, lite, plan-writing) — Settled by: p11
- The remaining provenance fields m02 and m04 actually consume, and the duplicate-row repair mechanism — Settled by: p07
- The stable finding key rule for carried-over matching — Settled by: p08
- Which non-goal receipt classes are required, and how self-advancing summary, document and PR outputs are bound — Settled by: p09

## Delivery endpoint and authority

- **Endpoint:** merged — each milestone is delivered as its own pull request into `main`, and a milestone counts as delivered at its endpoint only when that PR is observed merged. The next milestone activates only after re-alignment against the observed integration base.
- **Authority:** The operator approves this brief and each milestone amendment, and merges each milestone PR. The agent accepts phases only through the normal ladder (author self-check, a per-phase review, the configured gates, and the milestone integrated review). m01's own reviews and gates do not use the bookkeeping rule m01 ships; from m02 onward the rule may govern this project only through capabilities already released and installed in the actual execution toolchain (user-scope skills included). The agent never merges, never self-issues an approval or an exhaustion disposition, and never pushes a brief amendment onto an open delivery branch. Within the approved outcomes, constraints and evidence, the agent may split, add or reorder phases inside a milestone and make provisional phases concrete, logging each change.
- **Brief approved:** 2026-11-01 by user at cbc8836c7ca14d56742831a13fc0cd8e1fba2057

## Milestones

<!-- One row per milestone: its id (m01, m02, …) and its ordered, comma-separated phase ids. Every phase, including revision phases, belongs to exactly one milestone. -->

| Milestone | Phases             |
| --------- | ------------------ |
| m01       | p01, p02, p10, p11 |
| m02       | p07                |
| m03       | p08                |
| m04       | p09                |

## Phase p01: Verdict parser finding identification

**Intent:** The parser already refuses any declared-versus-body count disagreement (`assertAgreeingCounts`, `packages/cli/src/commands/gate/review-verdict.ts:847-866`), so the real #339 artifact was refused because its detail bullets were counted as findings (issue #339 reports a 6 Medium / 6 Low tally against 2 / 3 declared). Extend `review-verdict.ts`'s finding grammar narrowly, per the R1 decision, so the captured #339 shape parses as one finding per explicit bold title marker with its closed-label column-zero detail bullets, while existing list-item findings keep their meaning. Ambiguous ownership becomes a structured, receive-ineligible refusal with no carrier allowance or attempt debit. Turn the existing disagreement refusal into the same structured failure, keep raw artifact bytes untouched, and emit per-finding records (finding ID, severity, title, location) beside the aggregate counts as the verifier's input. Update the gate-parsing contract in `.agents/agents/oat-reviewer.md` (with its `version:` bump) and `FINDING_LIST_ITEM_CONTRACT_HINT` to describe the accepted syntax. This is the #339 parser slice of `BL-261003-diagnose-review-finding`.
**Exit evidence:** Two source fixtures, each with a provenance header, neither with invented content. The #339 fixture is the issue reproduction exactly as published (https://github.com/voxmedia/open-agent-toolkit/issues/339; CLI 0.3.13; reviewer Claude Opus, high effort, artifact mode). Its header records that the issue text is "abbreviated from the real artifact", so the original 2 Medium / 3 Low result is not reproducible from it. The real-output fixture is the reviewer's returned message from the backlog-wave-5 exit-gate r1 run, extracted from gate stderr (`t3-e32280d5/.oat/projects/archived/backlog-wave-5/analysis/implementation-exit-gate-r1.err`) with the JSONL events stripped. It is not a review artifact; the gate parsed the real artifact separately, to 0/1/0/2. Its expected categorical outcome (counts or a structured refusal) is fixed in its header before the grammar change and never chosen to match declared counts. If neither fixture parses under the narrow grammar without prose inference, p01 stops under the R1 rule. Controls:

- the #339 fixture's body tally changes from 6 Medium / 2 Low to 2 Medium / 1 Low, because detail bullets are no longer counted as findings;
- with its declared count line, the #339 fixture is still refused for disagreement (3 Low declared against 1 in the abbreviated body), now as a structured failure;
- the real-output fixture yields its recorded expected categorical outcome, and evidences the bold title marker and its detail labels;
- a genuine disagreement and a stale-zero declaration are still refused with a structured reason;
- a body-only undercount control keeps both an explicit bold-title finding and a genuinely separate top-level finding that follows it, including when the second title starts with a detail-like word;
- an orphan detail item with no parent is refused, never ignored into a clean result;
- a fenced example of the bold-title shape is not counted, and a detail bullet opening a new severity section after a bold title in the previous section is refused as orphaned;
- the #339 fixture's identified findings and a list-item fixture emit the expected per-finding records (IDs, severities, titles and locations), asserted in the parser output.

Neutralizing the ownership and title-precedence guard breaks the undercount assertion, and neutralizing the new title rule returns the #339 fixture's body tally to 6 Medium / 2 Low; both are recorded in the journal. Existing verdict and gate tests pass. The branch build parses one real artifact from `reviews/archived/` in this repository.
**Provisional:** no

## Phase p02: Retire the clerical-resolution verifier

**Intent:** p02 first built a read-only clerical-resolution verifier (`fcb556d4e`, `56bae738d`, `7cb72f013`), which passed code review at `9ef1fcb89`. The 2026-11-02 amendment retires it. Revert those three commits so that no verifier code, tests, help snapshot, CLI reference or README entry remains, and keep the journal history of the work. The code stays recoverable from `7cb72f013`.
**Exit evidence:** `packages/cli/src/commands/project/clerical-settlement/` no longer exists, and `git diff 23c7d5ae9 HEAD` over every path the three commits touched is empty. The CLI type-check and test suites pass.
**Provisional:** no

## Phase p10: Bookkeeping definition and the receive rule

**Intent:** Write the shared bookkeeping definition of Outcome 2, with its inclusions, its exclusions and the rule that a doubtful finding is not bookkeeping, in the one shared place this phase settles. In `oat-project-review-receive`, add the all-bookkeeping branch for code and artifact reviews, placed before fix-task creation and before any failure policy: fix every finding in one commit, note each in the receipt, record the Reviews row `passed` with the note "bookkeeping-only fixes applied at receive", skip re-review routing and the review-cycle count, and route onward. The goal integrated-review path takes its existing clean-receive transition (re-run `oat project delivery check`, and write `reviewing → delivering` only on `status: ok`). State the single exception to the rule that `passed` is never written for completed fixes. For a blocking gate result handled at receive, record that the gate is satisfied (carrier `allowed`/`passed`, no attempt counted) while its receipt keeps the raw verdict and counts, and add that write rule to `.agents/docs/gate-approval-record.md`. Document the optional `(bookkeeping)` mark inside the bold finding title in `.agents/agents/oat-reviewer.md`, advisory only, and bump its `version:`. Update the `REVIEWRECEIVE-01/02/06/07/09` autonomy rows and bump every changed skill's version.
**Exit evidence:** Contract tests pin the definition and its exclusions, the receive branch, the `passed` exception and the gate write rule. A parser test shows a finding marked `(bookkeeping)` in both the list-item and the bold-title shape yields the same counts, severities and verdict as its unmarked twin. One recorded bookkeeping-only review rerun from project history is walked through the amended receive text and recorded in the journal, showing no reviewer dispatch and no cycle count. The skill contract suites (`src/commands/init/tools/shared`, `src/validation`) pass with updated pins, and `pnpm run check:skill-bumps` passes.
**Provisional:** no

## Phase p11: Implement and planning paths, docs and release

**Intent:** Add the same branch, naming the shared definition, at every remaining place that re-dispatches a reviewer, counts a cycle or consumes a gate attempt after fixes. In `oat-project-implement`, that covers the per-phase review loop and optional phase gate (`references/phase-execution.md`) and the final review, the implement exit gate attempt rule and the goal milestone exit gate (`references/completion-and-closeout.md`). In the planning skills, it covers the artifact-review loop in `oat-project-plan-writing` and the Gate Execution sections of quick-start, plan, import-plan, brief, goal and lite. Each branch sits next to today's sentences rather than rewording them. Update the autonomy rows that govern these paths (`IMPLEMENT-12/18`, `QS-11/12`, `LITE-08/09`, `BRIEF-09/10`, `GOAL-09/10`, `PLAN-09/11`, and `PRFINAL-03` or `COMPLETE-03` only if their wording needs it), the brief contract wherever it restates the retry rules, and the workflow docs under `apps/oat-docs/docs/`. Bump every changed skill's version and the five lockstep public package versions, and record a decision with `oat decision new` stating the rule, its exclusions and why verified settlement was dropped.
**Exit evidence:** Contract tests pin the branch on each changed path. A walkthrough of the #233 incident, a blocking gate whose only findings were bookkeeping, traces the amended gate text step by step and shows the gate satisfied with no attempt used and no relaunch; it is recorded in the journal. The full Definition of Done gate list passes with exit codes captured; the decision index is regenerated; and the docs build and docs-index freshness checks pass.
**Provisional:** no

## Phase p07: Exact-event consistency, provenance and pending reviews

**Intent:** Add exact-event guards to every review row and gate receipt. One row per event (the `plan` placeholder row in `.oat/templates/plan.md`, no unused `spec` and `design` rows in quick and lite scaffolds); duplicate prevention and repair; exact-event consumption in gate and root receive handoffs; the remaining source-qualified provenance fields consumers need (`BL-260820-emit-source-qualified`, gap-only); and the pending-required-review listing before a PR (`BL-261002-list-pending-required-reviews`). Refined at m02 re-alignment.
**Exit evidence:** The repeated-blocking-gate fixture leaves no stale `received` event; a mismatched consumption fails closed with structured diagnostics; and pending required reviews are listed before PR creation. Refined at re-alignment.
**Provisional:** yes

## Phase p08: Gate convergence visibility and classification reporting

**Intent:** Mark each finding new or carried over for every gate attempt after the first, using a documented stable finding key over p01's per-finding records. Report new, carried-over and resolved counts per attempt. Record the contract classification (accepted-requirement, regression, new-hardening) at receive, with bookkeeping findings classed under m01's definition, so the existing exhaustion stop and complexity review start from recorded classes (`BL-260927-mark-gate-findings-as-new-or`, `BL-261013-classify-review-findings`). Refined at m03 re-alignment.
**Exit evidence:** Converging, stuck and reworded-carried-over attempt sequences are reported correctly; first attempts and single-attempt gates are unchanged; and a finding with no contract source reaches the operator rather than becoming a fix task. Refined at re-alignment.
**Provisional:** yes

## Phase p09: Non-goal closeout freshness for every required receipt

**Intent:** Bind each required non-goal closeout receipt (final review, checks, exit gate, and summary, document and PR steps) to the head it covered, and make `oat project closeout-check` refuse absent or stale evidence through a documented bookkeeping rule (`BL-260820-track-pr-closeout-evidence`). Refined at m04 re-alignment.
**Exit evidence:** The RP-03 late-documentation case is reported stale and recovers after a rerun against the current head; current, stale and mixed receipts are covered. Refined at re-alignment.
**Provisional:** yes

---

## Parallelism

Phases that have no overlapping file modifications may run concurrently. To declare parallelism:

```yaml
oat_plan_parallel_groups: [['p02', 'p03']]
```

Each inner array is a group of phases that execute in parallel (each in its own worktree) and merge back in plan order after all pass. Groups may be declared whenever the phases become concrete.

Default is `[]` (fully sequential, no worktrees). m01's remaining phases are
sequential: p11 names the definition and mirrors the branch that p10 writes.

---

## Reviews

| Scope | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target |
| ----- | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| plan  | artifact | fixes_completed | 2026-11-01 | -                                                           | 6769eba80b12d80acdddea66b32ab8c21b1fd87a | -          | -           |
| p01   | code     | fixes_completed | 2026-11-01 | reviews/archived/p01-review-2026-11-01T220753Z.md           | ffa8f869881fea4fbf51b7e31105b4a1f033ec63 | manual     | -           |
| p01   | code     | passed          | 2026-11-01 | reviews/archived/p01-review-2026-11-01T222248Z.md           | ded0985d59ee8039415ad163c750cb9abe2f2c08 | manual     | -           |
| p02   | code     | fixes_completed | 2026-11-01 | reviews/archived/p02-review-2026-11-01T224642Z.md           | 09d8f57b55dbf2ab0b2d8f5c9183d212e86974ae | manual     | -           |
| p02   | code     | fixes_completed | 2026-11-01 | reviews/archived/p02-review-2026-11-01T232603Z.md           | 4497d05f532e3d52984efaf7fde684c65f008b71 | manual     | -           |
| p02   | code     | passed          | 2026-11-01 | reviews/archived/p02-review-2026-11-02T001304Z.md           | 9ef1fcb89807a67dd9da78bbe4b6b8e45810116c | manual     | -           |
| p10   | code     | pending         | -          | -                                                           | -                                        | -          | -           |
| p11   | code     | pending         | -          | -                                                           | -                                        | -          | -           |
| final | code     | pending         | -          | -                                                           | -                                        | -          | -           |
| plan  | artifact | passed          | 2026-11-01 | reviews/archived/artifact-plan-review-2026-11-01T214129Z.md | -                                        | -          | -           |

**Plan artifact review disposition (2026-11-01):** three structured attempts by `oat-reviewer-claude-opus-5-5-high` (retry bound 2, now exhausted), with no review artifact written.

- Attempt 1 (`567b3148a`): 1 High, 6 Medium, 3 Low. Artifact-local findings were folded (`aafb3a4ba`); H1, M1, M2, M4 and M6 were realigned with the operator (R1 to R5, `dae9afeb5`).
- Attempt 2 (`dae9afeb5`): 0 Critical, 0 High, 6 Medium, 5 Low. Nine were folded (`4cfbb3c59`); M3 and M6 were realigned (`6769eba80`).
- Attempt 3 (`6769eba80`): 0 Critical, 0 High, 4 Medium, 3 Low. The Lows were folded (`a93560f4d`), and M1 to M4 were realigned with the operator and applied after the last attempt, so no artifact review covers them.

The `oat-project-goal` gate reviews the resulting bundle. There are no residual unaddressed findings.

Add one `code` row per phase as phases become concrete. For code-review events,
`Reviewed Head` is the full 40-character SHA at the head of the reviewed range.
Writers must preserve every existing row and every unknown trailing cell.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Filled at terminal closeout.

**Total: 7 phases**

---

## References

- Journal: `implementation.md`
- Research: `references/research/current-main-facts.md`
- Superseded project: `.oat/projects/shared/review-gate-integrity/` (paused 2026-11-01)
- Backlog review: `.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md` (2026-10-31; Lane A, lanes 1 and 2, Wave 3)
- Advisories (machine-local): `/Users/tstang/.t3/worktrees/open-agent-toolkit/t3-e32280d5/.oat/repo/analysis/backlog-review-2026-10-31/sol-advisor-02.md`, `sol-advisor-03.md`
- Project log: `project-log.md` (when enabled)
