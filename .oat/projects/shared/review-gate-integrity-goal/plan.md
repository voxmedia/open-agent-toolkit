---
oat_template: false
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-11-06
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
repeated gate runs and finding classification at receive; goal milestone exit
gates that scope themselves to the milestone; and non-goal closeout freshness
for every required receipt. Throughout, independent review keeps its authority: raw findings,
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
2. **Bookkeeping is defined narrowly, once (m01).** One shared definition says a finding is bookkeeping when it only asks to correct a record of existing evidence or state: a stale Reviews row cell or status label, an archived-artifact path reference, a derived counter, a task-SHA list, a progress label, or provenance wording. It is never bookkeeping when it asks for a missing review, a requirement change, an approval, a new receipt, completion of unfinished work, or an edit to a `**Status:**` acceptance marker, a Reviews row's `Reviewed Head`, or a set-once delivery field (brief contract section 12.8). Three limits apply to the fix itself: it touches only the project's own tracking files under `.oat/projects/<scope>/<project>/`; on goal paths it is a change section 12.8 permits (a correcting journal line is appended rather than a recorded one rewritten, approved brief sections are never edited, and Reviews-row edits are limited to status and date cells or a move to the archived counterpart artifact); and a Reviews Status cell is set to `passed` only by the bookkeeping-only receive branch for the review being received. A finding whose fix would break a limit is not bookkeeping. Reviewers may mark a finding `(bookkeeping)` inside its bold title; the mark is advisory, the receiver decides, and a doubtful finding is not bookkeeping. — Evidence: the definition, its exclusions and its three limits are pinned by a contract test; a branch-build probe shows a section 12.8-permitted bookkeeping fix after a goal integrated review leaves `oat project delivery check` ok, while a control that rewrites a recorded journal line reports stale; `oat-reviewer.md` documents the marker; a parser test shows a marked finding yields the same counts, severities and verdict as its unmarked twin.
3. **Verdict findings are identified, not tallied (m01).** The gate verdict parser accepts the captured #339 finding shape (an explicit bold finding-title marker followed by column-zero detail bullets with closed, exact labels) as one finding per title. It keeps genuinely distinct list-item findings as separate findings, refuses with a structured, receive-ineligible failure when ownership of a detail bullet is ambiguous rather than guessing, keeps the existing all-source refusal when declared and body counts disagree, and emits per-finding records (#339 parser slice). — Evidence: two fixtures with provenance headers, neither with invented content. The first is the issue #339 reproduction exactly as published; its header records that the issue text is abbreviated, so the original 2 Medium / 3 Low result cannot be reproduced from it. Its body tally changes from 6 Medium / 2 Low to 2 Medium / 1 Low, because detail bullets are no longer counted as findings. With its declared count line it is still refused for disagreement (3 Low declared against 1 in the abbreviated body), which is correct. The second is the reviewer's returned message from the backlog-wave-5 exit-gate r1 run, extracted from gate stderr with the JSONL events stripped. It yields the categorical outcome (counts or a structured refusal) recorded in its header before the grammar change, and serves as real-output evidence for the bold title marker and detail labels. A genuine disagreement is still refused. A body-only undercount control keeps a genuinely separate finding that follows a bold-title finding, even when its title starts with a detail-like word. An orphan detail item is refused, never ignored.
4. **Exact-event consistency (m02, re-aligned 2026-11-03).** Every review row and gate receipt binds to exactly one ledger event. An event's key is Scope + Type + Artifact filename for a row that names an artifact, read from ledger cells alone; its Reviewed Head and the artifact's `oat_gate_run_id` corroborate the key when the artifact file and a non-placeholder head exist, and are reported unavailable, never a mismatch, otherwise; and a row whose Artifact is `-` (a placeholder or a structured review that writes no artifact) never forms a duplicate key. No column or status is added. One writer records each event: the plan template carries a `plan` placeholder row, quick, import and lite scaffolds carry no unused `spec`/`design` rows, and the lifecycle skills update the row the gate child or the provide step wrote instead of adding a second one. A `received` row is superseded by a later row of the same Scope, Type and Invocation class that records a review (not a `pending` placeholder) at the same or a descendant Reviewed Head. The classes are gate (any Gate Target) and lifecycle (`manual` or `auto`); this deliberately differs from review-provide's target-qualified narrowing lineage, which is unchanged. Rows of different classes never supersede each other, and a row whose Invocation or Reviewed Head is `-` is never superseded and stays live, as today. Readers that select a review event ignore a superseded row, and a read-only, advisory CLI check reports superseded rows and duplicate keys through structured diagnostics. Nothing edits, promotes or deletes a superseded row. The gate result adds `reviewedHead`; receive consumes the event the gate result names (its scope, type, artifact path, run ID and reviewed head) instead of the newest artifact, and fails closed with structured diagnostics on a mismatch; artifact-gate rows record their gate target. Before PR creation, pr-progress and pr-final list required reviews still `pending`, and the user runs them, waives them with a recorded reason or stops; a non-interactive run stops at a boundary. — Evidence: a repeated-blocking-gate fixture (`BL-260820-bind-each-gate-review`) leaves no live stranded event after each disposition; the check reports a pinned copy of this project's superseded `final` row (failed Sol rerun `48f5553c`) and a duplicate-key fixture, and reports nothing for its distinct artifact-less `plan` rows or an unclaimed placeholder; a mismatched handoff fails closed while a matching one is consumed (branch-build probes with negative controls); quick, import and lite scaffolds have no `spec`/`design` rows; and a fixture with pending required rows is listed before PR creation while a fully reviewed one is not.
5. **Gate convergence visibility and classification (m03, re-aligned 2026-11-06).** A sequence is the successive runs of one configured gate on one subject: a goal milestone exit gate's subject is the milestone, whatever scope token a run used; a goal milestone plan gate's subject is settled by p08 so that runs on different amendments never share a sequence; and elsewhere the subject is the review scope; reruns after fixes count as well as reruns in a blocked gate's remediation loop. For every run after the first in its sequence, each finding is marked new or carried over, with the earlier run's finding reference, through a documented, deterministic stable finding key over p01's per-finding records. An unmatched finding is new and is never silently merged. The gate result and the gate's record of the review report new, carried-over and resolved counts per run, without rewriting the reviewer's findings. The first run on a subject carries no convergence fields. Separately, every review and gate receive path in p14's inventory records one class per finding: accepted-requirement (citing the contract source that requires it), regression, new-hardening, or bookkeeping under m01's definition. A new-hardening finding reaches the operator before any fix task exists, and the complexity-review fallback starts from the recorded classes. Both feed the existing exhaustion stop and complexity review; no authorization record or extra-cycle allowance is added. — Evidence: fixture run sequences (converging, stuck, and a reworded carried-over finding) are reported correctly in the gate JSON and the gate's record of the review; a first run's gate output carries no convergence fields and is otherwise unchanged, apart from the parser-identity changes p08 records for its deferred items (each with a before and after control); fixtures derived, with provenance headers, from this project's three local m02 exit-gate runs (`range-review-2026-11-03T215601Z.md`, `range-review-2026-11-03T224623Z.md`, `range-review-2026-11-04T015726Z.md`) are linked and reported as one m02 sequence by the branch build; every receive path in the inventory records a class with its contract source; a test fixture whose finding cites no contract source (classed new-hardening) reaches the operator rather than becoming a fix task, while an accepted-requirement control still becomes one; and the complexity-review fallback reads the recorded classes.
6. **Non-goal closeout freshness (m04, refined at re-alignment).** Outside goal mode, closeout refuses absent or stale evidence for every required review, check and gate receipt against the current head, through a documented bookkeeping rule rather than a broad exemption. — Evidence: settled at re-alignment; at minimum the RP-03 late-documentation case from `BL-260820-track-pr-closeout-evidence`.
7. **Goal milestone exit gates scope themselves (m03, added at m03 re-alignment 2026-11-06).** In a goal milestone closeout, the unchanged configured implement exit gate (`--review-scope final` with the state-selection prompt) reviews exactly the active milestone's ordered accepted phases, records the original `final` hint and the resolved phase set, and no longer refuses on a squash-merged earlier milestone's anchors. An explicit whole-project `code final` request keeps its whole-project meaning (`BL-261104-goal-mode-exit-gate-resolve`). — Evidence: a branch-build probe on a goal fixture whose earlier milestone was squash-merged resolves the state-selected `final` to the active milestone's phases with the branch's skills installed in an isolated HOME (or a branch-build CLI helper), while the released install refuses the same fixture (negative control); an explicit whole-project request still expands to the whole project; contract tests pin the rule.

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
  project-tracking descendants as closeout-only, so a fix confined to the
  project's tracking files does not stale the non-goal carrier. On goal paths
  the bookkeeping-successor rule (brief contract section 12.8) is unchanged,
  so the definition admits only fixes that rule permits, and the goal branch
  re-runs `oat project delivery check` after the fix commit; if it reports
  stale, the result follows today's flow.
- **Autonomy.** Under `OAT_AUTONOMOUS=1` the rule applies without a stop. The
  autonomy rows that govern re-review and gate retry say so; a bookkeeping
  repair never infers completion, waives HiLL, grants approval or accepts an
  unresolved Critical.

**m02 (re-aligned 2026-11-03).** Three phases, in order. p07 makes each event
one row and makes superseded `received` rows (same lane, same or later head)
read as superseded, with a
read-only, advisory check; p12 makes gate consumption exact; p13 lists pending
required reviews before a PR. Event identity reuses existing cells (Scope,
Type, Artifact filename, corroborated by Reviewed Head) and the artifact's
existing `oat_gate_run_id`; m02 adds no Reviews column, no status and no
mutating repair. Supersession is read-side only, so m01's bookkeeping
definition and its limits are unchanged and goal-path Reviews rows are never
edited for it. The released `0.3.45` toolchain, with m01's rule, governs m02's
own reviews and gates.

**m03 (re-aligned 2026-11-06).** Four phases, in order. p08 adds convergence
marking in the gate CLI over p01's per-finding records: a run is linked to the
earlier runs of the same configured gate on the same subject (a goal exit
gate's subject is the milestone, whatever scope token a run used; a goal plan
gate's subject is settled by p08 so amendments never share a sequence;
elsewhere the scope) through existing records, with no new evidence store, and the
reviewer's findings text is never rewritten. p14 records a class per finding
in the receive skills, reusing m01's bookkeeping definition. p15 extends
review-provide's state-selected `final` rule from a recovery record to the
active milestone. p16 is m02 upkeep. The released toolchain governs m03's own
reviews and gates, so m03's exit gate is still routed to its phase range.

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
- **Out of scope (m02):** the versioned source-qualified provenance envelope of `BL-260820-emit-source-qualified` (#202) beyond the `reviewedHead` that exact consumption needs and the gate target on artifact-gate rows; detecting a mismatch between a row's Invocation cell and the artifact's `oat_review_invocation` (#305); any edit, promotion or deletion of a superseded row, and a mutating ledger repair command.

## Decisions

- **Prose-only bookkeeping rule (amendment, 2026-11-02, operator).** After a complexity review of the built verifier, the operator chose a prose rule over verified settlement. Answers: (1b) a bookkeeping-only review is recorded `passed` with a note, not a new `resolved` status, so no reader changes; (2) a blocking gate whose findings are all bookkeeping is satisfied after the fix, with no relaunch and no attempt; (3) derived counters, task-SHA lists and progress labels are bookkeeping, `**Status:**` acceptance markers are not; (4a) this amendment takes one artifact-review attempt, then the `oat-project-goal` gate on a Sol model, then operator approval; (5) Claude Opus 5.5 implements the remaining m01 work, a fresh, independently dispatched `oat-reviewer` on Opus 5.5 high performs each per-phase review, and Sol runs the lifecycle gates. Rejected: (1a) a `resolved` status, which needs about nine reader and skill edits; finishing m01 as first designed, whose cost far exceeds the reruns it saves. Accepted cost: the rule is enforced by the receiving agent's judgment against the definition, not mechanically. After the amendment's artifact review (H1, M2), the operator also approved three limits on the fix itself: tracking files only, section 12.8-permitted changes on goal paths with a delivery-check fallback, and no Reviews Status set to `passed` outside the receive branch. Supersedes Round 2 Q6 (verifier), Q7 (closed repair kinds), Q8 (distinct records), Q9 (planning gates split out), R2, R3, R5's m02 clause, M3, and final review M3 and M4.
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
- **m02 re-alignment (2026-11-03, operator).** (1) Split p07 into three phases: p07 one row per event plus a read-only detector, p12 exact-event consumption, p13 the pending-review listing. Rejected: one phase (one large review across templates, prose and CLI), and dropping the listing. (2) A `received` row followed by a later recorded round of the same Scope, Type and Invocation class, at the same or a descendant head, is superseded on the read side (cross-lane rows never supersede, so a manual round cannot hide an unreceived gate row): readers ignore it and a read-only, advisory check reports it. This replaces the operator's first choice, a bookkeeping-receive repair, after the amendment review showed that repair would promote another event to `passed`, which m01 limit 3 forbids, and would dispose of the failed Sol rerun `48f5553c`, which the operator ruled receives no further disposition. Rejected: prevention only (stranded rows with active artifacts route to receive and stale events block closeout, #194), a named exception to limit 3, a repair capped below `passed` (no status means superseded), and a mutating repair command. (3) Provenance is gap-only: what exact consumption needs, plus the gate target on artifact-gate rows. Rejected: the full #202 envelope (no consumer yet), and the #305 Invocation mismatch check (not in the backlog criteria). (4) Install the released `0.3.45` CLI and user-scope skills before activating m02, so m01's rule governs m02. Not adopted: opening the m02 PR as a draft before the integrated review.
- **m03 re-alignment (2026-11-06, operator).** (1) Split p08: p08 marks findings new or carried over in the gate CLI and owns the parser identity deferrals; p14 records classes at receive in the skills. Rejected: one phase with one review over a mixed CLI and skill diff. (2) Add Outcome 7 and p15 for `BL-261104-goal-mode-exit-gate-resolve`, filed at this re-alignment. It takes effect only once released and installed, so m03's own exit gate is still routed to the milestone's phase range. Rejected: leaving it in the backlog. (3) The two m02 review-ledger follow-ups deferred to p08 go to their own phase, p16. Rejected: folding them into p08 or p15. (4) Outcome 5's evidence is settled as recorded there, including fixtures derived from the real m02 exit-gate runs. Rejected: invented fixtures only. Synthetic converging, stuck and reworded sequences are key-rule fixtures over per-finding records, or are edited from real captured findings with provenance; any artifact text fed to the parser follows the real-output fixture Constraint. (5) Amendment review (H1): a convergence sequence is the successive runs of one configured gate on one subject (the milestone for a goal exit gate, otherwise the scope), including reruns after fixes. Rejected: only reruns inside one blocked gate's remediation loop, which leaves this project's fix-driven reruns unmarked. Phases run in order p08, p14, p15, p16, sequentially. The endpoint is unchanged: merged.
- **Goal workflow fit.** Several deliveries over time, each merged and re-aligned. The first milestone is concrete; later milestones depend on what m01 teaches. Quick mode would require an approved up-front task plan the operator did not ask for.

## Known Unknowns

- Where the shared bookkeeping definition lives so that review-receive, implement and the planning skills can all reference it (a shared doc under `.agents/docs/` linked into each skill, or one owning skill named by the others) — Settled by: p10
- Whether today's gate receipts already keep the raw blocked verdict and counts once the carrier records `allowed`/`passed`, or need one recorded line — Settled by: p10
- Which planning skills restate the gate block-and-retry rule and the artifact-review retry loop, and need the branch (discover, design, quick-start, plan, import-plan, brief, goal, lite, plan-writing) — Settled by: p11
- The remaining provenance fields m02 and m04 actually consume, and the duplicate-row repair mechanism — Settled at m02 re-alignment (Decisions): gap-only fields for exact consumption; read-side supersession with a read-only, advisory check
- Where the read-only duplicate and stranded-row check lives (a `journal check` or `validate-plan` rule, `oat review latest`, or its own command), which lifecycle points run it, which readers apply supersession, and how readers that cannot run git (the pure control-plane router) evaluate the descendant-head clause (for example, ancestry precomputed by the CLI caller) without diverging from the CLI check — Settled by: p07
- How quick, import and lite scaffolds drop the unused `spec`/`design` rows while spec-driven keeps them (a separate template or a post-copy edit) — Settled by: p07
- How receive is given the gate's event (an explicit artifact and head argument, or the gate JSON) and which gate paths adopt it (implement's exit gate, the phase gate, the goal milestone exit gate, the planning gates) — Settled by: p12
- Which pending rows count as required, and where a waiver is recorded without a new column or status (an existing Reviews cell, or the journal's `## Reviews and Gates` slot with the row left `pending`); if neither works, p13 stops for an operator amendment — Settled by: p13
- The stable finding key rule for carried-over matching; how a run is linked to the earlier runs of the same gate on the same subject through existing records, without a new evidence store; how the gate's record of the review carries the marks without rewriting the reviewer's findings (for example a gate-written section the parser ignores, or the gate result and its receipt only); the subject of a goal milestone's plan gate (each amendment's gate runs on scope `plan`, so it must not join an earlier amendment's runs); and how a goal exit run with a `final` token is attributed to its milestone without depending on p15's hint record — Settled by: p08
- Where each receive records a finding's class without a new Reviews column or status, and the inventory of receive paths that must adopt it — Settled by: p14
- How the state-selected `final` hint tells a goal milestone closeout from an explicit whole-project review — Settled by: p15
- Which non-goal receipt classes are required, and how self-advancing summary, document and PR outputs are bound — Settled by: p09

## Delivery endpoint and authority

- **Endpoint:** merged — each milestone is delivered as its own pull request into `main`, and a milestone counts as delivered at its endpoint only when that PR is observed merged. The next milestone activates only after re-alignment against the observed integration base.
- **Authority:** The operator approves this brief and each milestone amendment, and merges each milestone PR. The agent accepts phases only through the normal ladder (author self-check, a per-phase review, the configured gates, and the milestone integrated review). m01's own reviews and gates do not use the bookkeeping rule m01 ships; from m02 onward the rule may govern this project only through capabilities already released and installed in the actual execution toolchain (user-scope skills included). The agent never merges, never self-issues an approval or an exhaustion disposition, and never pushes a brief amendment onto an open delivery branch. Within the approved outcomes, constraints and evidence, the agent may split, add or reorder phases inside a milestone and make provisional phases concrete, logging each change.
- **Brief approved:** 2026-11-01 by user at cbc8836c7ca14d56742831a13fc0cd8e1fba2057
- **Milestone m01 approved:** 2026-11-02 by user at b2a38a09005e35818eccfa4191ad97444316e020
- **Milestone m02 approved:** 2026-11-03 by user at ee377dd7bcbedec4e0c66cc8d12a754c45c1587d
- **Milestone m03 approved:** 2026-11-06 by user at e38f33e5e58e4b9fd30f84240d250a3c2555febf

## Milestones

<!-- One row per milestone: its id (m01, m02, …) and its ordered, comma-separated phase ids. Every phase, including revision phases, belongs to exactly one milestone. -->

| Milestone | Phases                                |
| --------- | ------------------------------------- |
| m01       | p01, p02, p10, p11                    |
| m02       | p07, p12, p13, p-rev1, p-rev2, p-rev3 |
| m03       | p08, p14, p15, p16                    |
| m04       | p09                                   |

## Phase p01: Verdict parser finding identification

**Intent:** The parser already refuses any declared-versus-body count disagreement (`assertAgreeingCounts`, `packages/cli/src/commands/gate/review-verdict.ts:847-866`), so the real #339 artifact was refused because its detail bullets were counted as findings (issue #339 reports a 6 Medium / 6 Low tally against 2 / 3 declared). Extend `review-verdict.ts`'s finding grammar narrowly, per the R1 decision, so the captured #339 shape parses as one finding per explicit bold title marker with its closed-label column-zero detail bullets, while existing list-item findings keep their meaning. Ambiguous ownership becomes a structured, receive-ineligible refusal with no carrier allowance or attempt debit. Turn the existing disagreement refusal into the same structured failure, keep raw artifact bytes untouched, and emit per-finding records (finding ID, severity, title, location) beside the aggregate counts. Update the gate-parsing contract in `.agents/agents/oat-reviewer.md` (with its `version:` bump) and `FINDING_LIST_ITEM_CONTRACT_HINT` to describe the accepted syntax. This is the #339 parser slice of `BL-261003-diagnose-review-finding`.
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
**Exit evidence:** `packages/cli/src/commands/project/clerical-settlement/` no longer exists, and `git diff 23c7d5ae9 <p02 Head> -- packages/cli/src/commands/project/clerical-settlement packages/cli/src/commands/project/delivery/check.ts packages/cli/src/commands/project/delivery/index.ts packages/cli/src/commands/project/index.ts packages/cli/src/commands/help-snapshots.test.ts packages/cli/README.md apps/oat-docs/docs/reference/cli-reference.md` is empty, where `23c7d5ae9` is the parent of `fcb556d4e` and `<p02 Head>` is the journal's recorded p02 head after the revert. The CLI type-check and test suites pass. A fresh per-phase review of the revert range passes.
**Provisional:** no

## Phase p10: Bookkeeping definition and the receive rule

**Intent:** Write the shared bookkeeping definition of Outcome 2, with its inclusions, its exclusions and the rule that a doubtful finding is not bookkeeping, in the one shared place this phase settles. In `oat-project-review-receive`, add the all-bookkeeping branch for code and artifact reviews, placed before fix-task creation and before any failure policy: fix every finding in one commit, note each in the receipt, record the Reviews row `passed` with the note "bookkeeping-only fixes applied at receive", skip re-review routing and the review-cycle count, and route onward. The goal integrated-review path takes its existing clean-receive transition (re-run `oat project delivery check`, and write `reviewing → delivering` only on `status: ok`); a stale result after the fix commit falls back to today's flow. State the single exception to the rule that `passed` is never written for completed fixes. For a blocking gate result handled at receive, record that the gate is satisfied (carrier `allowed`/`passed`, no attempt counted) while its receipt keeps the raw verdict and counts, and add that write rule to `.agents/docs/gate-approval-record.md`. Document the optional `(bookkeeping)` mark inside the bold finding title in `.agents/agents/oat-reviewer.md`, advisory only. Update the `REVIEWRECEIVE-01/02/06/07/09` autonomy rows. Each changed skill and `oat-reviewer.md` carries exactly one version bump relative to `origin/main` in the m01 PR (p01 already bumped `oat-reviewer.md`).
**Exit evidence:** Contract tests pin the definition, its exclusions and its three limits, the receive branch, the `passed` exception and the gate write rule. A parser test shows a finding marked `(bookkeeping)` in both the list-item and the bold-title shape yields the same counts, severities and verdict as its unmarked twin. A branch-build probe over a scratch goal fixture shows a section 12.8-permitted bookkeeping fix commit after the integrated review leaves `oat project delivery check` at `status: ok`, while a control that rewrites a recorded journal line reports stale; the probe and outcomes are recorded in the journal. One recorded bookkeeping-only review rerun from project history is walked through the amended receive text and recorded in the journal, showing no reviewer dispatch and no cycle count. The skill contract suites (`src/commands/init/tools/shared`, `src/validation`) pass with updated pins, and `pnpm run check:skill-bumps` passes.
**Provisional:** no

## Phase p11: Implement and planning paths, docs and release

**Intent:** Add the same branch, naming the shared definition, at every remaining place that re-dispatches a reviewer, counts a cycle or consumes a gate attempt after fixes. In `oat-project-implement`, that covers the per-phase review loop and optional phase gate (`references/phase-execution.md`) and the final review, the implement exit gate attempt rule and the goal milestone exit gate (`references/completion-and-closeout.md`). In the planning skills, it covers the artifact-review loop in `oat-project-plan-writing` and the Gate Execution sections of discover, design, quick-start, plan, import-plan, brief, goal and lite. Each branch sits next to today's sentences rather than rewording them. Update the autonomy rows that govern these paths (`IMPLEMENT-12/18`, `DISC-08`, `DES-08`, `QS-11/12`, `LITE-08/09`, `BRIEF-09/10`, `GOAL-09/10`, `PLAN-09/11`, `IMPORT-08/09`, and `PRFINAL-03` or `COMPLETE-03` only if their wording needs it), the brief contract wherever it restates the retry rules, and the workflow docs under `apps/oat-docs/docs/`. Confirm one version bump per changed skill relative to `origin/main` with `pnpm run check:skill-bumps`, bump the five lockstep public package versions, and record a decision with `oat decision new` stating the rule, its exclusions and why verified settlement was dropped.
**Exit evidence:** Contract tests pin the branch on each changed path. A walkthrough of the #233 incident, a blocking gate whose only findings were bookkeeping, traces the amended gate text step by step and shows the gate satisfied with no attempt used and no relaunch; it is recorded in the journal. The full Definition of Done gate list passes with exit codes captured; the decision index is regenerated; and the docs build and docs-index freshness checks pass.
**Provisional:** no

## Phase p07: One row per review event and stranded-row detection

**Intent:** Give every review and gate event exactly one Reviews row, keyed as Outcome 4 states. Add a `plan` placeholder row to `.oat/templates/plan.md` and `.oat/templates/plan-lite.md`; stop quick, import and lite scaffolds from carrying unused `spec`/`design` rows while spec-driven keeps them. Make the lifecycle skills that record a plan or artifact review (quick-start, plan-writing and the planning skills it serves) update the event row the gate child or the provide step wrote, matched by the event key, instead of adding a second row; review-provide Step 9 states the same one-writer rule. Treat a `received` row as superseded, as Outcome 4 defines it (same class, a recorded later round, same or descendant head; `-` rows stay live), in the readers that select a review event (the router's actionability, `oat review latest` and the skills that read the latest row), with no ledger edit. Add a read-only CLI check that reports superseded `received` rows and duplicate event keys with structured diagnostics; it keys events from ledger cells alone, reports corroboration as unavailable when an artifact file or head is absent, and its diagnostics are advisory and block no lifecycle step in m02. Version bumps, sync and docs follow the brief's constraints.
**Exit evidence:** A deterministic repeated-blocking-gate fixture leaves no live stranded `received` event after each disposition, with contract tests for the single-round path and the repeated-round regression. The check, built from the branch, reports the superseded `final` row in a copied fixture of this project's `plan.md` at `c1a653b976d1c0176eedcf684a5d47d171ccd8ca` (provenance header; the failed Sol rerun `48f5553c`) and a duplicate-key fixture, and does not report that fixture's distinct artifact-less `plan` rows or an unclaimed `pending` placeholder; a clean control reports nothing. Controls with fixed expected outcomes: a `received` gate row followed only by a manual round stays live; a gate row followed by a later gate row of a different Gate Target at the same head is superseded (the pinned Sol case); a superseding row at a descendant head is superseded in every reader that applies the rule; a `-` Invocation artifact row stays live; a `received` row followed only by a `pending` placeholder stays live; a fixture whose artifact files are absent reports corroboration unavailable, not a mismatch; and, as the negative control, a stranded row with an active artifact routes to receive before the change and is ignored after it. Run over this project and one archived project, it emits only the expected diagnostics and blocks no existing flow. The probes and outcomes are recorded in the journal. Quick, import and lite scaffolds have a `plan` row and no `spec`/`design` rows, a spec-driven scaffold keeps them, and a quick lightweight-design review still records exactly one `design` row. Contract tests pin the one-writer rule and the reader supersession; the skill contract suites and `pnpm run check:skill-bumps` pass.
**Provisional:** no

## Phase p12: Exact-event consumption for gate handoffs

**Intent:** Make receive consume exactly the event a gate result names. `oat gate review` adds `reviewedHead` to the ok/blocked JSON result: the artifact's full-SHA `oat_review_head_sha` (the head the reviewer reviewed, which is the value the gate child writes into the Reviews row's Reviewed Head) when present, otherwise the HEAD the gate dispatched the reviewer against. The gate captures that dispatch HEAD, and its existing corroboration reports the artifact head's relation to it: `match`, `ancestor` (an anchored range ending at an earlier commit, the normal exit-gate case), `mismatch`, or `unavailable` when the artifact has none; corroboration is reporting only. The result already carries `scope`, `reviewType`, `artifactPath` and `runId`; the prose `handoff` string is unchanged. Add a read-only CLI resolver that takes that event (artifact path plus the expected scope, type, run ID and reviewed head), binds the `## Reviews` row by the p07 event key (Scope + Type + Artifact filename) and validates its Scope, Type, Artifact, Reviewed Head and the artifact's `oat_gate_run_id` against the event, returning structured diagnostics and a nonzero exit on any mismatch or a missing row; a `-` Reviewed Head cell is reported unavailable, not a mismatch, as Outcome 4 defines corroboration. `oat-project-review-receive` Step 1 accepts the gate event: when a caller supplies it, receive consumes that artifact through the resolver and fails closed on its diagnostics instead of selecting the newest artifact by `oat_generated_at`; without one (manual and auto reviews), Step 1 is unchanged. The adopting paths are every path that runs `oat gate review` and then receive: implement's exit gate (Step 14, which the goal milestone exit gate delegates to), the optional phase gate, and the planning gates in goal, brief, lite, discover, design, quick-start, plan and import-plan; each passes the gate result's event to receive. Artifact-gate rows record their gate target: review-provide Step 9 and receive's ledger rule write `Invocation: gate` and the exact `oat_gate_target` for every gate review, artifact reviews included. Fold in the p07 re-review L1 deferral (receive's CLI-unavailable fallback clause names the `received` requirement and the two Invocation classes). Version bumps, sync and docs follow the brief's constraints.
**Exit evidence:** Unit and contract tests pin `reviewedHead` on the ok and blocked gate results (the artifact's reviewed head, or the dispatch HEAD when the artifact has none) and its corroboration against the dispatch HEAD (match, ancestor, mismatch, unavailable); the resolver compares the row's Reviewed Head to the event's `reviewedHead` by exact equality; one branch-build `node packages/cli/dist/index.js --json gate review` run on a scratch project shows `reviewedHead` in a real result. Branch-build probes of the resolver on a scratch project show a matching gate event consumed (exit 0) and mismatched events refused with structured diagnostics and a nonzero exit: wrong artifact, wrong head, wrong scope or type, wrong run ID, and an event with no bound row; a `-` Reviewed Head row reports unavailable and is accepted. Negative control: in a scratch project where a newer non-gate artifact is also present, the released `0.3.45` receive selection (`oat review latest --actionable-project`) picks the newer artifact rather than the gate-named one, and the branch resolver given the gate event consumes the named artifact and refuses the other. Single-round manual and auto flows stay compatible (receive Step 1 without an event is unchanged, and its existing contract tests pass). Contract tests pin the receive Step 1 event input, each adopting path's hand-off text, the Gate Target rule for artifact-gate rows and the folded fallback clause. The probes and outcomes are recorded in the journal; the skill contract suites, `pnpm run check:skill-bumps` and the Definition of Done gates pass.
**Provisional:** no

## Phase p13: Pending required reviews before a pull request

**Intent:** Before PR creation, `oat-project-pr-progress` and `oat-project-pr-final` list the required reviews still `pending` for the PR's scope (`BL-261002-list-pending-required-reviews`), and the user runs them, waives them with a recorded reason, or stops. A new read-only command `oat review pending --project <path> --scope <pNN[,pNN…]|mNN|project> [--json]` computes the list from the latest `## Reviews` row per Scope + Type: required rows are the `code` rows of the scope's phases that exist in the plan (an `mNN` scope expands through the Milestones table; `project` covers every phase), plus `plan | artifact` for a `project` scope unless the plan-review skip line is recorded; `spec`, `design`, `final` and `mNN` rows are never required (`final` stays with pr-final Step 2 and `PRFINAL-03`, `mNN` with `oat project delivery check`). It reports `pending` and `waived` lists separately, always exits 0 on a readable project, and decides nothing. The p13 Known Unknown settles on the journal slot: the row stays `pending`, and a waiver is one line appended under `## Reviews and Gates` in `implementation.md`, `**Review waived:** <scope> <type> · **Waived by:** <user> · **Date:** <date> · **Reason:** <text>`, written only on the user's explicit choice; a Reviews cell would break Outcome 4's event key or be overwritten when a review claims the row. A waiver applies only to a required key, moves it from `pending` to `waived`, and is inert once a later row records a review. No reader treats a waiver as `passed`: the row stays `pending`, and pr-final Step 2, closeout-check and delivery check do not read the line. pr-progress runs the listing before PR creation (in goal mode before Step 5.5 writes its `registering` entry) and pr-final before PR creation (in goal mode inside Step 1.5 before registration); with pending rows and no waiver, an interactive run offers run, waive or stop, and a non-interactive run stops. pr-final's stop is the new autonomy row `PRFINAL-06` (required reviews pending without a waiver); pr-progress, which is not an autonomy-inventory root, states the same non-interactive stop in prose. Operator decision (2026-11-03, p13 review M1): a required key whose phase is concrete (not `**Provisional:** yes`) but which has no `## Reviews` row is reported in a separate `missing` list; both PR skills treat `missing` like `pending` (run, waive or stop; a non-interactive run stops, `PRFINAL-06` for pr-final), and a waiver applies to a `missing` key.
**Exit evidence:** Unit tests of `oat review pending` on fixtures: pending phase and `plan` rows are listed and a fully reviewed fixture lists none; `spec`, `design`, `final`, `mNN`, a skip-lined `plan` row and a row of a phase not in the plan are never listed; an `mNN` scope follows the Milestones table; a waiver line moves its row to `waived` and it is not listed as pending on the next run, while a waiver for a non-required key or a later recorded review leaves the waiver unapplied. A negative control proves the waiver guard can fail. Branch-build probes on a scratch project show a waived row still `pending` in the table and `oat project closeout-check` and `oat project delivery check` results unchanged by the waiver line. Contract tests pin the pr-progress and pr-final listing and stop sentences, and `autonomy-gate-inventory.test.ts` passes with `PRFINAL-06`. `oat project journal check` accepts a waiver line. The CLI reference, the reviews and PR-flow docs, and the pr-progress and pr-final skill version bumps ship in the phase. Added by the M1 decision: a concrete phase with no row is listed in `missing` and stops a non-interactive run, a provisional phase with no row is not listed, and a waiver moves a `missing` key to `waived`; a guard-can-fail control covers it.
**Provisional:** no

## Phase p-rev1: Refuse a malformed Reviewed Head in review resolve

**Intent:** Correct p12 for the m02 exit gate finding M1 (`reviews/archived/range-review-2026-11-03T215601Z.md`). `parseReviewTable` drops any Reviewed Head that is not a full SHA, so `oat review resolve` reads an abbreviated or malformed cell as the permitted `-` placeholder and accepts the event as `unavailable`, contradicting p12's exact equality. The resolver keeps the raw cell at its boundary: `-` (and a legacy absent column) still reads `unavailable`, while any other non-full-SHA value refuses with a structured diagnostic. No other reader changes.
**Exit evidence:** Resolver tests and a branch-build probe (the gate artifact's M1 reproduction) show a matching full SHA accepted, a wrong full SHA refused with `reviewed_head_mismatch`, an abbreviated and a malformed cell refused with the new diagnostic, and `-` accepted as unavailable; a guard-can-fail control; the CLI reference code list matches the code.
**Provisional:** no

## Phase p-rev2: Resolve synced-project review ancestry in the source repository

**Intent:** Correct p07 for the m02 exit gate finding M2 (`reviews/archived/range-review-2026-11-03T215601Z.md`). `getProjectStateWithReviewAncestry` runs git with `cwd` at the project path, so in a synced project (a nested tracking checkout) the source commits a Reviewed Head names are unresolvable, the older `received` event stays live, and `project status` routes to receive while `review latest --actionable-project` and `review check` treat it as superseded. The ancestry queries of `project status`, `project list`, `review latest` and `review check` resolve against the source repository root, so all readers agree; the control-plane reader stays pure.
**Exit evidence:** The real-git ancestry wiring test gains a nested synced checkout with source-repository head SHAs, and status, latest and check agree on supersession there, with the ordinary layout and an unresolved or non-descendant head as controls; the gate artifact's M2 reproduction passes on the branch build; a guard-can-fail control.
**Provisional:** no

## Phase p-rev3: Keep a retired waiver from hiding a later pending review

**Intent:** Correct p13 for the m02 exit gate rerun finding M1 (`reviews/archived/range-review-2026-11-03T224623Z.md`). `oat review pending` decides waiver applicability from the latest Scope + Type row only, so a waiver retired by a later recorded review applies again when a new `pending` row for the same key is appended, and both PR skills proceed without a review or a fresh waiver. A waiver applies only to the pending obligation it was written for: once any row for its key records a review after the waiver, that waiver stays inert for every later row of the key, while a waiver written after the newest recorded review still applies. No Reviews column, status or ledger edit is added; if the ordering cannot be established from existing ledger cells and the waiver line, the waiver line may name what it waives in a backward-compatible way, documented in both PR skills.
**Exit evidence:** Unit tests at the pending-listing boundary: waiver, then a recorded review, then a new `pending` row lists the key as pending (the gate's reproduction); an active waiver over a pending row still reads `waived`; a waiver after a recorded review with no later row is inert; a fresh waiver written after the new pending row applies. A guard-can-fail control. The PR skills, CLI reference and reviews docs match the rule.
**Provisional:** no

## Phase p08: Gate convergence marking and the stable finding key

**Intent:** Mark each gate finding new or carried over for every run after the first in its sequence (the successive runs of one configured gate on one subject, as Outcome 5 defines), and report new, carried-over and resolved counts per run in the gate result and the gate's record of the review (`BL-260927-mark-gate-findings-as-new-or`, Outcome 5). Document the stable finding key over p01's per-finding records and how a run is linked to the earlier runs of its sequence. First settle the parser identity items deferred to p08 (Deferred Findings: p01 review L2 and L3, p01 review round 2 L1 and L2, and the PR #400 self-review C1 bundle with T2, T3/C3 and T4/C2), keeping or removing each unused refusal according to what the key needs.
**Exit evidence:** Converging, stuck and reworded-carried-over fixture sequences are reported correctly in the gate JSON and the gate's record of the review; a first run carries no convergence fields and is otherwise unchanged apart from the recorded parser-identity changes, each with a before and after control; the branch build links the fixtures derived from the three m02 exit-gate runs as one m02 sequence; each deferred item named in the Intent is fixed, removed or closed with a recorded reason; guard-can-fail controls show the matching rule's tests can fail.
**Provisional:** no

## Phase p14: Finding classification at receive

**Intent:** Record one class per finding at every review and gate receive: accepted-requirement (citing its contract source), regression, new-hardening, or bookkeeping under m01's shared definition. Route a new-hardening finding to the operator before any fix task exists, and make the classes visible to the complexity-review fallback (`BL-261013-classify-review-findings`, Outcome 5). Inventory the receive paths that must adopt it. Disposition the deferrals this work triggers: p10 review L1 (a stale fallback after a bookkeeping-only integrated-review receive), p12 review L2 (planning and phase gates hand the gate event to receive only in-session) and the m01 exit gate L1 (limit 1 wording in the shared bookkeeping definition).
**Exit evidence:** Each receive path in the inventory states the classification and the routing, pinned by contract tests; a test fixture whose finding cites no contract source (classed new-hardening) reaches the operator rather than becoming a plan task, while an accepted-requirement control still becomes one; p10 review L1, p12 review L2 and m01 exit gate L1 are each fixed or kept deferred with a recorded reason; the complexity-review fallback starts from recorded classes; the autonomy inventory and contract suites pass.
**Provisional:** no

## Phase p15: Goal milestone exit gate scope

**Intent:** Resolve a state-selected `final` hint in a goal milestone closeout to the active milestone's ordered accepted phases, as the recovery-exit rule already does for `oat_goal_recovery`, so the unchanged configured exit gate needs no operator scope routing after a squash-merged milestone. An explicit whole-project `code final` keeps its meaning (`BL-261104-goal-mode-exit-gate-resolve`, Outcome 7).
**Exit evidence:** Contract tests pin the rule and are the primary evidence. One corroborating probe runs a goal fixture with a squash-merged earlier milestone using the branch build CLI and the branch's skills installed inside one `scripts/with-isolated-home.sh` invocation, either exercising review-provide's scope-resolution step (the anchor check) directly without dispatching a model, or passing the provider runtime's configuration through explicitly: it resolves the state-selected `final` to the active milestone's phases and records (or, without a dispatched model, prints) the hint and the resolved set, while the released install refuses the same fixture (negative control); when the probe dispatches no model, the contract tests evidence the recording itself; if p15 moves the resolution into a CLI helper, the branch build (`node packages/cli/dist/index.js`) probes it deterministically instead. An explicit whole-project request still expands to the whole project.
**Provisional:** no

## Phase p16: m02 review-ledger follow-ups

**Intent:** Close the two m02 review-ledger follow-ups the operator deferred to m03 (Outcome 4 upkeep). Make `oat review check`, `oat review resolve` and `oat review pending` number Reviews rows the same way, by physical data line, or document the difference in the CLI reference (m02 integrated review L1). Remove the test-local row writer and its post-write cases from `review-event-row-contracts.test.ts`, keeping the Step 9 prose pin and the real `scaffoldProject` checks (PR #403 Warp suggestion).
**Exit evidence:** A fixture with an unparsed row above a parsed one reports the same row number from all three commands, or the CLI reference states the difference; the contract test file no longer simulates a writer and its remaining pins pass; the CLI and skill contract suites pass.
**Provisional:** no

## Phase p09: Non-goal closeout freshness for every required receipt

**Intent:** Bind each required non-goal closeout receipt (final review, checks, exit gate, and summary, document and PR steps) to the head it covered, and make `oat project closeout-check` refuse absent or stale evidence through a documented bookkeeping rule (`BL-260820-track-pr-closeout-evidence`). Refined at m04 re-alignment.
**Exit evidence:** The RP-03 late-documentation case is reported stale and recovers after a rerun against the current head; current, stale and mixed receipts are covered. Refined at re-alignment.
**Provisional:** yes

---

## Parallelism

Phases that have no overlapping file modifications may run concurrently. To declare parallelism:

```yaml
oat_plan_parallel_groups: [['pA', 'pB']]
```

Each inner array is a group of phases that execute in parallel (each in its own worktree) and merge back in plan order after all pass. Groups may be declared whenever the phases become concrete.

Default is `[]` (fully sequential, no worktrees). m01's remaining phases are
sequential: p11 names the definition and mirrors the branch that p10 writes.

---

## Reviews

| Scope      | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation      | Gate Target          |
| ---------- | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | --------------- | -------------------- |
| plan       | artifact | fixes_completed | 2026-11-01 | -                                                           | 6769eba80b12d80acdddea66b32ab8c21b1fd87a | -               | -                    |
| p01        | code     | fixes_completed | 2026-11-01 | reviews/archived/p01-review-2026-11-01T220753Z.md           | ffa8f869881fea4fbf51b7e31105b4a1f033ec63 | manual          | -                    |
| p01        | code     | passed          | 2026-11-01 | reviews/archived/p01-review-2026-11-01T222248Z.md           | ded0985d59ee8039415ad163c750cb9abe2f2c08 | manual          | -                    |
| p02        | code     | fixes_completed | 2026-11-01 | reviews/archived/p02-review-2026-11-01T224642Z.md           | 09d8f57b55dbf2ab0b2d8f5c9183d212e86974ae | manual          | -                    |
| p02        | code     | fixes_completed | 2026-11-01 | reviews/archived/p02-review-2026-11-01T232603Z.md           | 4497d05f532e3d52984efaf7fde684c65f008b71 | manual          | -                    |
| p02        | code     | passed          | 2026-11-01 | reviews/archived/p02-review-2026-11-02T001304Z.md           | 9ef1fcb89807a67dd9da78bbe4b6b8e45810116c | manual          | -                    |
| p02        | code     | passed          | 2026-11-02 | reviews/archived/p02-review-2026-11-02T162147Z.md           | 8427732e8bfd661a536997096ed43af0bc5376d1 | manual          | -                    |
| p10        | code     | fixes_completed | 2026-11-02 | reviews/archived/p10-review-2026-11-02T170200Z.md           | 73b277434f24cb95f785ac4fa36618b09b6d20e7 | manual          | -                    |
| p10        | code     | fixes_completed | 2026-11-02 | reviews/archived/p10-review-2026-11-02T172814Z.md           | 2eca1422aaee6e93a0b7be53e6b86aa5c2d34b9c | manual          | -                    |
| p10        | code     | passed          | 2026-11-02 | reviews/archived/p10-review-2026-11-02T193214Z.md           | cf26ae9c9f9dc7df0ed17be40f99822ae63ad6e9 | manual          | -                    |
| p11        | code     | passed          | 2026-11-02 | reviews/archived/p11-review-2026-11-02T210607Z.md           | 204a24f697c61947b64176a4516f33904f3261bf | manual          | -                    |
| final      | code     | fixes_completed | 2026-11-02 | reviews/archived/final-review-2026-11-02T211656Z.md         | 8a97fe85dbaa5d47f4450fa46703403097f71a88 | gate            | claude-opus-5-5-high |
| plan       | artifact | passed          | 2026-11-01 | reviews/archived/artifact-plan-review-2026-11-01T214129Z.md | -                                        | -               | -                    |
| plan       | artifact | fixes_completed | 2026-11-02 | -                                                           | d09ac39c581ad4fe26b8c006a27266cd6c4a79e3 | -               | -                    |
| plan       | artifact | passed          | 2026-11-02 | reviews/archived/artifact-plan-review-2026-11-02T155547Z.md | -                                        | -               | -                    |
| final      | code     | received        | 2026-11-02 | reviews/archived/final-review-2026-11-02T213631Z.md         | 395b90677db9487e42f01d31b045f4819f3d85ae | gate            | codex-6-sol-xhigh    |
| final      | code     | passed          | 2026-11-02 | reviews/archived/final-review-2026-11-02T233110Z.md         | 395b90677db9487e42f01d31b045f4819f3d85ae | gate            | claude-opus-5-5-high |
| final      | code     | passed          | 2026-11-02 | reviews/archived/final-review-2026-11-02T233729Z.md         | 1a5a37684f05492470952fdc54359a082ac9cc58 | gate            | claude-opus-5-5-high |
| m01        | code     | fixes_completed | 2026-11-02 | reviews/archived/m01-review-2026-11-02T234808Z.md           | 1a5a37684f05492470952fdc54359a082ac9cc58 | manual          | -                    |
| final      | code     | passed          | 2026-11-02 | reviews/archived/final-review-2026-11-02T235632Z.md         | 5599af21d4927c7d39c668b9d1662509e5d3b403 | gate            | claude-opus-5-5-high |
| m01        | code     | passed          | 2026-11-03 | reviews/archived/m01-review-2026-11-03T000239Z.md           | 5599af21d4927c7d39c668b9d1662509e5d3b403 | manual          | -                    |
| p07        | code     | fixes_completed | 2026-11-03 | reviews/archived/p07-review-2026-11-03T184519Z.md           | 6598a6e76555c884fdca27b3ee4f5b1e70cafdb8 | manual          | -                    |
| p07        | code     | passed          | 2026-11-03 | reviews/archived/p07-review-2026-11-03T190319Z.md           | 34ebd3ef9c02d90a6797ece84d69b6ab7b54d201 | manual          | -                    |
| p12        | code     | fixes_completed | 2026-11-03 | reviews/archived/p12-review-2026-11-03T200007Z.md           | c92b11dfbf631e16ab9be77999555669fdbef8d2 | manual          | -                    |
| p12        | code     | passed          | 2026-11-03 | reviews/archived/p12-review-2026-11-03T201925Z.md           | 8016d7d98f8799010d40ff497aa526b180508dbf | manual          | -                    |
| p13        | code     | fixes_completed | 2026-11-03 | reviews/archived/p13-review-2026-11-03T210640Z.md           | 2f1dae7a099dc37d5196f7cc008712d8681249f1 | manual          | -                    |
| p13        | code     | passed          | 2026-11-03 | reviews/archived/p13-review-2026-11-03T213802Z.md           | 2375b77bd1b1326b5feec60ae7258f3bbeb7556a | manual          | -                    |
| plan       | artifact | fixes_completed | 2026-11-03 | -                                                           | f293a58775dd4408fdcf360a3c00028aba2a5c5f | -               | -                    |
| plan       | artifact | passed          | 2026-11-03 | reviews/archived/artifact-plan-review-2026-11-03T023206Z.md | -                                        | gate            | codex-6-sol-xhigh    |
| p07-p13    | code     | fixes_completed | 2026-11-03 | reviews/archived/range-review-2026-11-03T215601Z.md         | 2375b77bd1b1326b5feec60ae7258f3bbeb7556a | gate            | codex-6-sol-xhigh    |
| p-rev1     | code     | passed          | 2026-11-03 | reviews/archived/p-rev1-review-2026-11-03T221746Z.md        | 2c341cff58b74a8cb13ff9e80c4e27690ea27210 | manual          | -                    |
| p-rev2     | code     | passed          | 2026-11-03 | reviews/archived/p-rev2-review-2026-11-03T223853Z.md        | d128a41181d86d258be802500c4129bf45ed0fa0 | manual          | -                    |
| p07-p-rev2 | code     | fixes_completed | 2026-11-03 | reviews/archived/range-review-2026-11-03T224623Z.md         | d128a41181d86d258be802500c4129bf45ed0fa0 | gate            | codex-6-sol-xhigh    |
| p-rev3     | code     | fixes_completed | 2026-11-03 | reviews/archived/p-rev3-review-2026-11-03T231519Z.md        | 8ce9e2a540bded95953b383ff9d81032690ee4b3 | manual          | -                    |
| p-rev3     | code     | fixes_completed | 2026-11-03 | reviews/archived/p-rev3-review-2026-11-03T233325Z.md        | 08a2dc6d5bb1aa43dcec48c32ca72ffd8acc5f39 | manual          | -                    |
| p-rev3     | code     | fixes_completed | 2026-11-03 | reviews/archived/p-rev3-review-2026-11-03T234849Z.md        | edc4b4eee83e0ebd9cfa41d94808da559699fd85 | manual          | -                    |
| p07-p-rev3 | code     | passed          | 2026-11-03 | reviews/archived/range-review-2026-11-04T015726Z.md         | c08b2c054d95dda0691fc3a247b70c5acdaa8007 | gate            | codex-6-sol-xhigh    |
| m02        | code     | passed          | 2026-11-04 | reviews/archived/m02-review-2026-11-04T020725Z.md           | c08b2c054d95dda0691fc3a247b70c5acdaa8007 | manual          | -                    |
| plan       | artifact | fixes_completed | 2026-11-06 | -                                                           | 2666257febe06b43b9229b71fb602b8ac071d015 | -               | -                    |
| plan       | artifact | passed          | 2026-11-06 | reviews/archived/artifact-plan-review-2026-11-06T222001Z.md | -                                        | gate            | codex-6-sol-xhigh    |
| p08        | code     | fixes_completed | 2026-11-07 | reviews/archived/p08-review-2026-11-07T233955Z.md           | 9eebbd39ce7dc2dc7cfa1b47ad061b6b0a690dab | implement-phase | -                    |
| p08        | code     | fixes_completed | 2026-11-08 | reviews/archived/p08-review-2026-11-08T001015Z.md           | d23563aeefcd8881be6591a91920bdc68be1bb17 | implement-phase | -                    |
| p08        | code     | passed          | 2026-11-08 | reviews/archived/p08-review-2026-11-08T002049Z.md           | dc43fa5b93a85ede751ba1df052239fc099eef25 | implement-phase | -                    |
| p14        | code     | fixes_completed | 2026-11-08 | reviews/archived/p14-review-2026-11-08T011039Z.md           | 9e9c3083ced3eea68f9a50b3e503fd2be75554fa | implement-phase | -                    |
| p14        | code     | passed          | 2026-11-08 | reviews/archived/p14-review-2026-11-08T014245Z.md           | 27f118621b1c2eff195d4c04e84b137761790b7e | implement-phase | -                    |

**Plan artifact review disposition (2026-11-01):** three structured attempts by `oat-reviewer-claude-opus-5-5-high` (retry bound 2, now exhausted), with no review artifact written.

- Attempt 1 (`567b3148a`): 1 High, 6 Medium, 3 Low. Artifact-local findings were folded (`aafb3a4ba`); H1, M1, M2, M4 and M6 were realigned with the operator (R1 to R5, `dae9afeb5`).
- Attempt 2 (`dae9afeb5`): 0 Critical, 0 High, 6 Medium, 5 Low. Nine were folded (`4cfbb3c59`); M3 and M6 were realigned (`6769eba80`).
- Attempt 3 (`6769eba80`): 0 Critical, 0 High, 4 Medium, 3 Low. The Lows were folded (`a93560f4d`), and M1 to M4 were realigned with the operator and applied after the last attempt, so no artifact review covers them.

The `oat-project-goal` gate reviews the resulting bundle. There are no residual unaddressed findings.

**m01 amendment artifact review disposition (2026-11-02):** one structured attempt by `oat-reviewer-claude-opus-5-5-high` on `d09ac39c5`, as the operator directed (no retries), with no review artifact written: 0 Critical, 1 High, 3 Medium, 5 Low. M1 (discover and design gates, `IMPORT-08/09`), M3 (a per-phase review for the p02 revert) and L1 to L5 were folded as artifact-local. H1 (bookkeeping fixes that would stale goal delivery evidence under section 12.8) and M2 (a fix promoting a Reviews Status to `passed`) changed Outcome 2 and were realigned with the operator, who approved the three limits now in Outcome 2, the delivery-check fallback and p10's branch-build probe. No artifact review re-ran after the fixes; the `oat-project-goal` gate reviews the resulting bundle. The reviewer also noted that `origin/main` has since changed `oat-project-review-receive`, the autonomy contract and brief contract section 12.8 (#396, #397); p10 reconciles them at phase start.

**m03 amendment artifact review disposition (2026-11-06):** three structured attempts by `oat-reviewer-claude-opus-5-5-high` (retry bound 2, now exhausted), with no review artifact written.

- Attempt 1 (`13bae0a7a`): 0 Critical, 1 High, 3 Medium, 6 Low. H1 (Outcome 5 marked only attempts after the first, yet required three separate m02 exit-gate runs to read as one sequence) changed Outcome 5 and went to the operator, who chose a sequence of successive runs of one configured gate on one subject, recorded as Decision (5). M1 to M3 and L2 to L6 were folded as artifact-local (`060923361`). L1 (re-routing the journal deferrals and phase headings) is journal work, done when the journal is extended.
- Attempt 2 (`060923361`): 0 Critical, 0 High, 1 Medium, 4 Low, all folded (`2666257fe`): Outcome 5's evidence wording, p08 Known Unknowns for the goal plan-gate subject and for attributing a `final`-token exit run, p15's isolated-HOME probe mechanics, and the phase total.
- Attempt 3 (`2666257fe`): 0 Critical, 0 High, 0 Medium, 2 Low, verdict ready to approve. Both Lows (the goal plan-gate subject in Outcome 5 and the Approach, and how a no-model p15 probe evidences the recording) were folded after the last attempt, so no artifact review covers them; the `oat-project-goal` gate reviews the resulting bundle.

Add one `code` row per phase as phases become concrete. For code-review events,
`Reviewed Head` is the full 40-character SHA at the head of the reviewed range.
Writers must preserve every existing row and every unknown trailing cell.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Filled at terminal closeout.

**Total: 15 phases**

---

## References

- Journal: `implementation.md`
- Research: `references/research/current-main-facts.md`
- Superseded project: `.oat/projects/shared/review-gate-integrity/` (paused 2026-11-01)
- Backlog review: `.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md` (2026-10-31; Lane A, lanes 1 and 2, Wave 3)
- Advisories (machine-local): `/Users/tstang/.t3/worktrees/open-agent-toolkit/t3-e32280d5/.oat/repo/analysis/backlog-review-2026-10-31/sol-advisor-02.md`, `sol-advisor-03.md`
- Project log: `project-log.md` (when enabled)
