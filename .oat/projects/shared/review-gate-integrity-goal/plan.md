---
oat_template: true
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-01
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: [] # [] = none for brief modes
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: goal
oat_phase_review_gate:
  enabled: true
  phases: [p02, p03, p05]
  review_type: code
  exit_nonzero_on: high
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

This goal delivers, one merged milestone at a time: a verified clerical
settlement that needs no re-review and no attempt debit, first for project
code-review and implementation paths and then for planning gates; exact-event
consistency for every review row and gate receipt; convergence visibility for
repeated gate attempts; and non-goal closeout freshness for every required
receipt. Throughout, independent review keeps its authority: raw findings,
severities, counts and verdicts are never rewritten, and a clerical settlement
is never recorded as a reviewer pass.

Verified starting facts: `references/research/current-main-facts.md`.

## Outcomes

<!-- Number each outcome and name the evidence that will show it holds. Completion is audited against this list. -->

1. **Clerical settlement for project code-review and implementation paths (m01).** In the root phase review, phase gate, final review, implement exit gate, and goal milestone exit and integrated review, a review or gate whose every finding is a verified clerical repair settles with zero further reviewer dispatch and no attempt debit. It is recorded as Reviews status `resolved` and carrier disposition `clerical_resolved`, never `passed`, and the raw verdict and counts are unchanged. Planning-skill gates keep their existing behavior in m01 and never read `resolved` as `passed`. — Evidence: one end-to-end control through the built CLI and the real receive and carrier boundary, in which a goal-mode blocked integrated review whose only finding is a stale archived-artifact reference settles to deliverable with no reviewer dispatch and an unchanged attempt count.
2. **Clerical settlement never hides substantive work (m01).** A substantive finding tagged as clerical, a commit-bearing but incomplete task, a forged `resolved` row, an edit that invents missing review evidence or promotes a Status, missing durable proof, and a resumed receive each fail to produce an acceptance or a repeated effect. A later substantive change stales the settled evidence exactly as it stales a reviewer pass. — Evidence: one distinct negative control per case through its owning public boundary (verifier CLI, receive, delivery check or closeout-check), each shown able to fail by neutralizing its guard, with the probe and expected outcome recorded in the journal.
3. **Verdict findings are identified, not tallied (m01).** The gate verdict parser identifies each finding by its list-item structure, emits per-finding records, and refuses an artifact whose declared counts and body findings disagree instead of trusting either source (#339 parser slice). — Evidence: fixtures derived from a captured real #339 artifact (provenance in the fixture header), where the detail-bullet shape counts 2 Medium and 3 Low rather than 6 and 6, plus a count-disagreement case that is refused.
4. **Clerical settlement for planning-skill gates (m02).** The plan, quick-start, import-plan, lite, brief and goal gate paths apply the same verified settlement through the same verifier and records. — Evidence: settled at re-alignment after m01; at minimum one planning-gate control per supported mode family.
5. **Exact-event consistency (m03).** Every review disposition and gate receipt binds to exactly one ledger event; duplicate rows are prevented and existing duplicates are repairable; the remaining source-qualified provenance fields that consumers need are emitted; and pull-request skills list pending required reviews before a PR is created. — Evidence: settled at re-alignment; at minimum the repeated-blocking-gate fixture from `BL-260820-bind-each-gate-review`.
6. **Gate convergence visibility (m04).** For every gate attempt after the first, each finding is marked new or carried over, the result reports new, carried-over and resolved counts per attempt, and findings carry the contract classification (accepted-requirement, regression, new-hardening) derived from m01's eligibility decision. These feed the existing exhaustion stop and complexity review. — Evidence: settled at re-alignment; at minimum a converging, a stuck and a reworded-carried-over attempt sequence.
7. **Non-goal closeout freshness (m05, provisional).** Outside goal mode, closeout refuses absent or stale evidence for every required review, check and gate receipt against the current head, through a documented bookkeeping rule rather than a broad exemption. — Evidence: settled at re-alignment; at minimum the RP-03 late-documentation case from `BL-260820-track-pr-closeout-evidence`.

## Approach

The work extends existing contracts and adds one read-only verifier. It does
not introduce a new evidence store, a new event-ID column, or a second
classifier.

- **Eligibility is decided once.** A finding is clerical only when it asks to
  correct a record of existing evidence or authority. It is never clerical when
  it asks to obtain a missing review, change a requirement, invent a receipt,
  grant approval, promote a status, or infer completion. Severity is a separate
  dimension: a High finding can be clerical, and a Low content finding is still
  content.
- **Receiver authority.** Reviewers may tag a finding with a repair kind, but
  the tag is advisory. The receiving owner decides, and only after verification.
  The reviewer's verdict, counts and threshold result are preserved unchanged.
- **Verify, then record, then route.** The receiving owner repairs the record,
  commits the repair, runs the read-only verifier, and only then writes the
  settlement record in a separate commit, before routing onward or applying any
  attempt or failure policy. Mixed, unknown or unverifiable sets follow ordinary
  review.
- **Consumers ask their own question.** Routing, acceptance, delivery and
  cleanup each accept "a reviewer pass, or a valid clerical resolution of this
  required event" at their own boundary and then still apply every existing
  freshness and coverage check. No reader replaces `passed` with membership in a
  set.

### Design

**Closed repair kinds (m01).** Each kind names its authoritative source.
Anything else is ordinary review.

1. _Review-row metadata._ A `## Reviews` cell other than Status (Date, Artifact,
   Reviewed Head, Invocation, Gate Target) that disagrees with its own review
   artifact or retained gate proof. Status is never corrected by copying artifact
   status or counts. A mis-transcribed Status may be restored only from an
   independently existing, bound receive or acceptance receipt; otherwise the
   event goes through the new resolution route. A genuinely reviewed head is
   never changed to the repair head. When Reviewed Head is itself the wrong cell,
   the actual reviewed revision is established independently, and the proposed
   value is never its own oracle.
2. _Archived-artifact reference._ A reference to a review artifact that now
   lives under `reviews/archived/`, where the source and archived counterparts
   are proven to be the same event and run. Filename coincidence is not
   identity.
3. _Descriptive prose._ Purely descriptive prose synchronized from a validated
   event row, where the prose is not itself a task-completion, phase-acceptance,
   gate or approval marker. A stale or forged row never authorizes another view.

Routing and progress pointers, phase status and task completion are excluded:
commits and anchors prove implementation history, not verification or
acceptance.

**Verifier (CLI, read-only).** It takes a structured proposal: the explicitly
selected review event (scope, type, artifact; never "latest for this scope"),
and for each finding its finding ID, repair kind, corrected field and
authoritative source, plus the repair range. It checks, with per-check reasons
in JSON:

- exactly one ledger event matches the tuple;
- the actual reviewed revision, and for gates the run and target, are
  corroborated against the retained artifact and gate proof;
- every finding of the event is covered by an eligible proposal entry;
- the reviewed subject is unchanged between the reviewed revision and the
  repair head;
- every repair commit changes only the named fields of permitted records;
- each corrected field now agrees with its authoritative source.

Tags and a stored `verifier: success` are never proof. The verifier reuses
`delivery/evidence.ts` judgments selectively, never as a finding-resolution
oracle: that evaluator admits arbitrary review-artifact and `summary.md` edits,
and its plan and journal rules follow brief grammar. The goal contract (brief
contract section 12.8) is preserved, not broadened.

**Replay without the local review file.** The first settlement may read the
local review artifact and retained gate proof. Later consumers (delivery check
and refresh, closeout-check) re-verify from committed evidence only: the journal
`### Review Received:` receipt, the settlement entry that references it, and
immutable revision bindings. Review files stay local-only. Missing durable proof
refuses. The repair head is recorded separately from the commit that records the
settlement, and a later substantive change never inherits a past verification.

**Records.**

- Reviews Status `resolved`: re-review not required, clerical resolution
  verified. It is terminal for routing but never `passed`.
- One bounded, machine-checkable entry in the journal's `## Reviews and Gates`
  slot, bound to the event tuple, the referenced receipt, the findings, the
  reviewed revision, the repair range and the corroborated proof. It need not be
  a single line.
- Gate carriers keep the blocked verdict and counts and record the disposition
  `clerical_resolved`. The integrated-review disposition union
  (`passed | stale | failed | null`, `packages/control-plane/src/types.ts:372`)
  is extended explicitly, never coerced to `passed`. `resolved` never stamps a
  new reviewed head and never unlocks set-once delivery evidence (brief contract
  section 12.8) as if a new independent review had happened.

**Purity and ordering.** The control-plane router stays pure. It reads
persisted state, never runs Git, and never spawns the CLI. CLI orchestration
validates before the authoritative transition. Settlement happens before
failure policy: operational, correlation and validation failures still stop
regardless of `onFailure: warn`, and an unresolved `prompt` gate still needs
direction. No retrospective attempt refunds. An interrupted settlement is
re-verified before any further transition, and a reviewer is never rerun to
manufacture missing proof.

**Autonomy.** Under `OAT_AUTONOMOUS=1`, verified clerical settlement may proceed
without stopping once this policy is approved. Each delivery updates the shared
resolution rules and the existing autonomy inventory rows whose behavior it
changes: `REVIEWRECEIVE-01/06/07/09` and `IMPLEMENT-06/10/12/18` in m01, and the
planning rows in m02. A settlement never infers completion, waives HiLL, grants
approval, repairs an invalid reviewer artifact, accepts an unresolved Critical,
changes policy or exceeds a budget.

## Constraints and Out of Scope

- **Constraint:** Raw reviewer findings, severities, counts and verdicts are never rewritten; a clerical settlement is never recorded or reported as `passed`.
- **Constraint:** Each milestone PR bumps all five lockstep public package versions (bundled skills and agents count as shipped CLI functionality), the `metadata.version` of every changed canonical skill, and the top-level `version:` of `.agents/agents/oat-reviewer.md` when it changes.
- **Constraint:** Each milestone runs the AGENTS.md Definition of Done gates in CI order, with explicit exit-code capture and evidence-grade reruns where Turborepo may replay caches, plus the skill contract tests (`src/commands/init/tools/shared` and `src/validation`) whenever skill prose changes.
- **Constraint:** Assurance-bearing changes carry reproduction-grade negative controls (bad state accepted before, rejected after, valid control still accepted), each shown able to fail by neutralizing its guard. Keep them distinct per failure; do not build a broad matrix at every layer.
- **Constraint:** Parser fixtures derive from captured real reviewer output, with provenance recorded in the fixture header, and run against a real artifact before review is requested.
- **Constraint:** Gate and review-provide behavior changes are probed with the branch build (`node packages/cli/dist/index.js --json gate review …`), not the `oat` on PATH.
- **Constraint:** The control-plane router stays pure; review files stay local-only; no new evidence store or event-ID column; the goal bookkeeping-successor contract is preserved.
- **Constraint:** Brief amendments stay local until the open delivery merges (pushing one stales that delivery, `DR-261011-bookkeeping-successors-keep`).
- **Constraint:** Docs, autonomy-rule changes and decision records ship with the delivery whose behavior they describe (`README.md`, affected package READMEs, `apps/oat-docs/docs/`).
- **Out of scope:** Planning-skill gate settlement in m01 (it is m02); unsupported planning paths keep existing behavior.
- **Out of scope:** Remote and ad-hoc non-project reviews (`oat-review-provide`, `packages/cli/src/review-remote/`).
- **Out of scope:** Routing or progress pointer repair, phase-status promotion, and task or phase completion inferred from commits.
- **Out of scope:** `BL-260927-derive-current-lifecycle-state` beyond m03's one-row-per-event slice; `BL-260711-add-activity-aware-gate`; `BL-260706-front-load-recurring-gate`; `BL-260902-file-deferred-repository`; `BL-261002-offer-a-strict-gate-reviewer`; `BL-261002-re-review-a-phase-only-after`; the #344 autonomous invalid-artifact recovery slice of `BL-260711-skip-re-review-for-bookkeeping`; the original-run rewrite and revalidation half of `BL-261003-diagnose-review-finding`; and the ReviewPlan-first redesign (`BL-260729-implement-reviewplan-first`, PR #190).
- **Out of scope:** Extra cycles and proceed-with-override at exhaustion (`BL-260818-distinguish-operator-directed`), which stay open as a candidate for a later, optional, operator-selected delivery.

## Decisions

- **Scope (Round 1 Q1).** The outcome areas are clerical settlement, exact-event consistency, convergence visibility and non-goal closeout freshness. m01 owns the minimal exact-event and eligibility guards its own settlement needs; m03 generalizes them. Rejected: folding closeout freshness into the binding milestone, because it mixes CLI closeout logic into binding work.
- **Exclusions (Round 1 Q1).** The items listed under Out of scope stay open in the backlog. The ReviewPlan-first redesign stays parked.
- **#339 parser slice only (Round 1 Q1).** From `BL-261003-diagnose-review-finding` only the verdict-parser slice ships: finding identification and count agreement, not trusting declared counts over body evidence or the reverse.
- **BL-260818 out of the convergence milestone by default (Round 1 Q1).** m04 is visibility and classification reporting that feed the existing exhaustion stop and complexity review. Rejected: building the authorization record into m04, which adds authority, allowance accounting, resume and closeout obligations beyond visibility.
- **One eligibility decision (Round 1 Q1).** m01 decides clerical eligibility once (see Approach). m04's accepted-requirement, regression and new-hardening reporting reuses it. Rejected: a second classifier with conflicting authority.
- **Bookkeeping first (Round 1 Q2).** Clerical settlement ships before identity work, on condition that m01 selects the original event explicitly; requires exactly one matching ledger event corroborated by scope, type, artifact, the reviewed revision and, for gates, run and target; binds the settlement to that event and the exact repair revision, preserved through archival and idempotent on resume; and stops without acceptance on duplicate, missing or contradictory evidence. The existing (scope, type, artifact) tuple is the identity once its uniqueness and bindings are checked. Legacy duplicates may stay blocked until m03. Rejected: identity first, which delays the urgent pain by a milestone.
- **Receiver authority with advisory tags (Round 1 Q3).** Reviewer tags advise and the receiving owner decides after verification. Every carrier, phase, final and PR consumer recognizes the verified settlement without relabeling it `passed`, and the blocked-but-resolved integration cost is accepted. Rejected: (a) letting reviewer tags remove findings from the blocking count, because a mis-tagged High would pass before any verification; (b) receiver-only with no tags, which loses useful reviewer input.
- **No Medium/Low exemption (Round 1 Q4).** Severity and clerical eligibility are separate dimensions.
- **Merged endpoint (Round 1 Q5).** Each milestone's PR merges before the next activates, followed by re-alignment against the observed integration base. Rejected: `open`, which stacks branches on shared skill files and lockstep versions.
- **Read-only CLI verifier (Round 2 Q6).** It takes structured per-finding input; it replays from committed receipt evidence without the local review file, referencing the existing `### Review Received:` receipt rather than a new store; it keeps the router pure; and it keeps the repair head separate from the recording commit. Rejected: skill-prose-only verification, whose controls cannot be repeated mechanically.
- **Closed repair kinds (Round 2 Q7).** The three kinds under Design. Rejected: Status promotion copied from artifacts; Reviewed Head rewritten to the repair head; filename-only archive identity; commit-inferred pointer or completion repair (it could hide unfinished work); open receiver judgment over a diff check, which cannot prove resolution.
- **Distinct records (Round 2 Q8).** Reviews Status `resolved`, carrier disposition `clerical_resolved`, and a bounded journal entry in `## Reviews and Gates`, accepted only with validated same-event proof. Each reader applies "a pass, or a valid clerical resolution of this required event" at its own acceptance boundary and keeps every freshness and coverage check. The integrated-review disposition union is extended explicitly. Rejected: replacing every `passed` check with membership in {passed, resolved}; overloading `fixes_completed`, which today means awaiting re-review.
- **Split planning gates out of m01 (Round 2 Q9).** m01 is project code-review and implementation paths plus their real code consumers (verifier, receive, carrier, router, delivery and closeout must compose, including a blocked clerical integrated review in goal mode). Planning-skill gates are m02, and the later milestones are renumbered. Rejected: one milestone changing code-review acceptance and every planning gate's approval semantics in one PR.
- **Autonomous settlement (Round 2 Q10).** Allowed after this policy is approved, only for verified clerical settlement, with the shared rules and existing inventory rows updated (see Approach). Rejected: an autonomous stop for every candidate settlement, because autonomous runs are where paperwork reruns cost most.
- **Authority and decision record (Round 2 Q11).** As recorded under Delivery endpoint and authority. m01 records a decision stating the narrow exception and its exclusions, not a general power to repair lifecycle state.
- **Planning setup (2026-11-01).** Dispatch policy High (recorded in `state.md`). Optional phase gate review runs after p02, p03 and p05; the phase gate selection for later milestones' phases is decided at each milestone's re-alignment. Both configured lifecycle gates (`oat-project-goal`, `oat-project-implement`) are kept.
- **Goal workflow fit.** Several deliveries over time, each merged and re-aligned. The first milestone is concrete; later milestones depend on what m01 teaches about the verifier and records. One delivery would bundle four approval semantics into one PR; quick mode would require an approved up-front task plan the operator did not ask for.

## Known Unknowns

- The verifier's command name, its proposal input format (supplied or derived unambiguously), and its JSON shape — Settled by: p02
- How far `delivery/evidence.ts` per-file judgments apply to task-plan modes (quick, spec-driven, import, lite), whose `plan.md` and journal grammar differ from brief grammar — Settled by: p02
- How the pure router distinguishes a persisted `resolved` event that has a well-formed settlement entry from one that does not, without running Git; and which CLI boundaries must re-verify before a transition — Settled by: p03
- The exact name and placement of the extended integrated-review disposition, and the migration of set-once delivery fields around it — Settled by: p03
- Which `passed` checks in skill prose (pr-final, complete, implement closeout) need the acceptance-boundary rule, as opposed to leaving `resolved` unsupported — Settled by: p05
- The planning-gate carriers' settlement shape (`oat_quick_start_gate`, `oat_brief_gate`, goal `plan` carriers) — Settled by: p06
- The remaining provenance fields m03 and m05 actually consume, and the duplicate-row repair mechanism — Settled by: p07
- The stable finding key rule for carried-over matching — Settled by: p08
- Which non-goal receipt classes are required, and how self-advancing summary, document and PR outputs are bound — Settled by: p09

## Delivery endpoint and authority

- **Endpoint:** merged — each milestone is delivered as its own pull request into `main`, and a milestone counts as delivered at its endpoint only when that PR is observed merged. The next milestone activates only after re-alignment against the observed integration base.
- **Authority:** The operator approves this brief and each milestone amendment, and merges each milestone PR. The agent accepts phases only through the normal ladder (author self-check, a fresh per-phase review, the configured gates, and the milestone integrated review), as amended by the approved clerical-settlement rule. The agent never merges, never self-issues an approval or an exhaustion disposition, and never pushes a brief amendment onto an open delivery branch. Within the approved outcomes, constraints and evidence, the agent may split, add or reorder phases inside a milestone and make provisional phases concrete, logging each change.

## Milestones

<!-- One row per milestone: its id (m01, m02, …) and its ordered, comma-separated phase ids. Every phase, including revision phases, belongs to exactly one milestone. -->

| Milestone | Phases                  |
| --------- | ----------------------- |
| m01       | p01, p02, p03, p04, p05 |
| m02       | p06                     |
| m03       | p07                     |
| m04       | p08                     |
| m05       | p09                     |

## Phase p01: Verdict parser finding identification

**Intent:** Make `packages/cli/src/commands/gate/review-verdict.ts` identify each finding by its list-item structure: a top-level finding item owns its nested and unindented detail lines. Emit per-finding records (finding ID, severity, title, location) beside the existing aggregate counts, and refuse an artifact whose declared counts and identified body findings disagree, as a structured validation failure rather than picking one source. This is the #339 parser slice of `BL-261003-diagnose-review-finding`, and the per-finding records are the input the verifier needs.
**Exit evidence:** Fixtures derived from a captured real #339-shaped reviewer artifact (provenance in each fixture header) parse to 2 Medium and 3 Low instead of 6 and 6. A count-disagreement fixture is refused with a structured reason. Existing verdict and gate tests pass. Neutralizing the agreement check makes the disagreement fixture pass, and restoring it makes the fixture fail again, recorded in the journal. The branch build parses one real artifact from `reviews/archived/` in this repository.
**Provisional:** no

## Phase p02: Read-only clerical-resolution verifier

**Intent:** Add a read-only CLI verifier that takes a structured proposal and checks the conditions listed under Design. The proposal names the explicitly selected review event, and for each finding its ID, repair kind (review-row metadata, archived-artifact reference or descriptive prose), corrected field and authoritative source, plus the repair range. The verifier returns JSON with per-check reasons. It supports both a first-settlement mode, which reads the local artifact and retained gate proof, and a replay mode, which reads committed evidence only. It reuses `delivery/evidence.ts` judgments selectively and leaves the goal contract unchanged.
**Exit evidence:** Built-CLI negative controls, each with a valid accepted control and shown able to fail by neutralizing its guard:

- a substantive finding proposed as clerical is refused;
- a Status promotion or invented review evidence in the repair range is refused;
- a duplicate or ambiguous matching event is refused;
- an archived counterpart from a different run is refused;
- a Reviewed Head proposed as its own oracle is refused;
- replay with the local review file deleted succeeds from committed evidence, and replay with the settlement's durable proof missing refuses.
  A genuine archived-reference repair verifies. The probes and their outcomes are recorded in the journal.
  **Provisional:** no

## Phase p03: Records and code consumers

**Intent:** Define the settlement records and teach the real code consumers to read them.

- Define the Reviews Status `resolved`, the bounded settlement entry in the journal's `## Reviews and Gates` slot, and the gate-carrier disposition `clerical_resolved`.
- Extend the integrated-review disposition union explicitly, and teach the real code consumers to apply "a pass, or a valid clerical resolution of this required event" at their own boundary, then keep every freshness and coverage check. The consumers are the control-plane router (pure: persisted state only), `oat project delivery check` and `refresh`, `oat project closeout-check`, `oat project journal check`, and the cleanup readiness utility.
- Planning-gate carriers explicitly do not accept `resolved` or `clerical_resolved` in m01.
  **Exit evidence:** Consumer controls pass, and the existing suites stay green.
- Controls through each owning public boundary:
  - a forged `resolved` row without a valid settlement entry is not accepted by delivery check or closeout-check;
  - a settled event later followed by a substantive change is reported stale;
  - set-once delivery fields and reviewed heads are unchanged by settlement;
  - the router routes a well-formed settled event as dispositioned and an unsettled `resolved` row to its verification owner;
  - a planning-gate carrier carrying `clerical_resolved` is not accepted.
- Each control is shown able to fail by neutralizing its guard.
- Control-plane, CLI and type-check suites pass.
  **Provisional:** no

## Phase p04: Receive settlement and the reviewer's advisory tag

**Intent:** Settle verified clerical findings in the receive skill, and let reviewers advise.

- Add a clerical settlement step to `oat-project-review-receive`, run before fix-task creation and before failure policy. The step builds the structured proposal, repairs the records, commits the repair, runs the verifier, then records `resolved` and the settlement entry, referencing the existing `### Review Received:` receipt, in a separate commit. On resume, it re-verifies before any transition. Mixed, unknown or unverifiable sets follow ordinary review.
- Add an optional per-finding repair-kind tag to `.agents/agents/oat-reviewer.md` that never affects counts or verdicts.
- Update the shared resolution rules and the `REVIEWRECEIVE-01/06/07/09` autonomy inventory rows.
- Bump skill and agent versions.
  **Exit evidence:** Receive-level controls pass, and the contract and version gates pass.
- A receive-level control shows a resumed or duplicate receive repeats no settlement or counter effect.
- A falsely tagged substantive finding stays on the ordinary fix-and-re-review path.
- The skill contract suites (`src/commands/init/tools/shared`, `src/validation`) pass with updated pins.
- `pnpm run check:skill-bumps` passes.
  **Provisional:** no

## Phase p05: Implement paths, end-to-end composition, docs and decision record

**Intent:** Settle verified clerical findings on every implement path, and ship the docs and decision record that describe it.

- Wire the settlement into `oat-project-implement` and its references, covering the root phase review, phase gate, final review, implement exit gate and goal milestone exit carrier.
- A verified clerical settlement routes onward with no reviewer redispatch and no attempt debit, the carrier keeps its raw blocked verdict and counts, and settlement precedes failure policy.
- Update `IMPLEMENT-06/10/12/18`, the skill-prose `passed` checks that need the acceptance-boundary rule (pr-final, complete, implement closeout), and the workflow docs under `apps/oat-docs/docs/`.
- Record a decision with `oat decision new` stating the narrow exception and its exclusions.
  **Exit evidence:** The m01 end-to-end composition holds, and every delivery gate passes.
- The Outcome 1 end-to-end control passes through the built CLI and the real receive and carrier boundary: a goal-mode blocked integrated review whose only finding is a stale archived-artifact reference settles to deliverable with zero reviewer dispatch and an unchanged attempt count.
- A commit-bearing incomplete task is not accepted through settlement.
- The full Definition of Done gate list passes with exit codes captured.
- The decision index is regenerated, and the docs build and docs-index freshness checks pass.
  **Provisional:** no

## Phase p06: Planning-gate clerical settlement

**Intent:** Extend the verified settlement to the plan, quick-start, import-plan, lite, brief and goal gate paths and their carriers, updating the planning autonomy inventory rows, docs and contract pins. Refined at m02 re-alignment from what m01 taught.
**Exit evidence:** At least one planning-gate control per supported mode family settles with no reviewer redispatch and no attempt debit, and the negative controls from p02 to p03 still refuse on the planning path. Refined at re-alignment.
**Provisional:** yes

## Phase p07: Exact-event consistency, provenance and pending reviews

**Intent:** Generalize m01's event guards to every review row and gate receipt. One row per event (the `plan` placeholder row in `.oat/templates/plan.md`, no unused `spec` and `design` rows in quick and lite scaffolds); duplicate prevention and repair; exact-event consumption in gate and root receive handoffs; the remaining source-qualified provenance fields consumers need (`BL-260820-emit-source-qualified`, gap-only); and the pending-required-review listing before a PR (`BL-261002-list-pending-required-reviews`). Refined at m03 re-alignment.
**Exit evidence:** The repeated-blocking-gate fixture leaves no stale `received` event; a mismatched consumption fails closed with structured diagnostics; and pending required reviews are listed before PR creation. Refined at re-alignment.
**Provisional:** yes

## Phase p08: Gate convergence visibility and classification reporting

**Intent:** Mark each finding new or carried over for every gate attempt after the first, using a documented stable finding key over p01's per-finding records. Report new, carried-over and resolved counts per attempt. Record the contract classification (accepted-requirement, regression, new-hardening) at receive, derived from m01's eligibility decision, so the existing exhaustion stop and complexity review start from recorded classes (`BL-260927-mark-gate-findings-as-new-or`, `BL-261013-classify-review-findings`). Refined at m04 re-alignment.
**Exit evidence:** Converging, stuck and reworded-carried-over attempt sequences are reported correctly; first attempts and single-attempt gates are unchanged; and a finding with no contract source reaches the operator rather than becoming a fix task. Refined at re-alignment.
**Provisional:** yes

## Phase p09: Non-goal closeout freshness for every required receipt

**Intent:** Bind each required non-goal closeout receipt (final review, checks, exit gate, and summary, document and PR steps) to the head it covered, and make `oat project closeout-check` refuse absent or stale evidence through a documented bookkeeping rule (`BL-260820-track-pr-closeout-evidence`). Refined at m05 re-alignment.
**Exit evidence:** The RP-03 late-documentation case is reported stale and recovers after a rerun against the current head; current, stale and mixed receipts are covered. Refined at re-alignment.
**Provisional:** yes

---

## Parallelism

Phases that have no overlapping file modifications may run concurrently. To declare parallelism:

```yaml
oat_plan_parallel_groups: [['p02', 'p03']]
```

Each inner array is a group of phases that execute in parallel (each in its own worktree) and merge back in plan order after all pass. Groups may be declared whenever the phases become concrete.

Default is `[]` (fully sequential, no worktrees). m01's phases are sequential:
p02 consumes p01's per-finding records, p03 consumes p02's verifier, and p04
and p05 consume p03's records.

---

## Reviews

| Scope | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ----- | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| plan  | artifact | pending | -    | -        | -             | -          | -           |
| p01   | code     | pending | -    | -        | -             | -          | -           |
| p02   | code     | pending | -    | -        | -             | -          | -           |
| p03   | code     | pending | -    | -        | -             | -          | -           |
| p04   | code     | pending | -    | -        | -             | -          | -           |
| p05   | code     | pending | -    | -        | -             | -          | -           |
| final | code     | pending | -    | -        | -             | -          | -           |

Add one `code` row per phase as phases become concrete. For code-review events,
`Reviewed Head` is the full 40-character SHA at the head of the reviewed range.
Writers must preserve every existing row and every unknown trailing cell.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Filled at terminal closeout.

**Total: 9 phases**

---

## References

- Journal: `implementation.md`
- Research: `references/research/current-main-facts.md`
- Superseded project: `.oat/projects/shared/review-gate-integrity/` (paused 2026-11-01)
- Backlog review: `.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md` (2026-10-31; Lane A, lanes 1 and 2, Wave 3)
- Advisories (machine-local): `/Users/tstang/.t3/worktrees/open-agent-toolkit/t3-e32280d5/.oat/repo/analysis/backlog-review-2026-10-31/sol-advisor-02.md`, `sol-advisor-03.md`
- Project log: `project-log.md` (when enabled)
