# Astra v1.5 plan-revision round 1

- **Date:** 2026-10-11
- **Reviewer:** Astra (gpt-6-astra, reasoning high, Codex provider, read-only delegate)
- **Reviewed head:** ebccf5ba3 on `feat/freestyle-project-workflow` (v1 brief seam complete, p01–p08)
- **Scope:** the four objections carried in design.md "Carried to the v1.5 review" and phases p09–p12
- **Verdict:** with A (four resolutions) and B (four new corrections) applied, v1.5 is ALIGNED for execution; no operator decision needed

## A. Four carried objections

### A1. Review recovery owners — resolved-by-this-text

Objection: review production cannot authorize delivery, and recovery of stale evidence must identify its owner and target without changing the active milestone. The contradictory owners are at design.md:348; landed review-provide writes `received`, not `passed` (review-provide/SKILL.md:1465–1488).

Design revision (Goal transition contract): replace the router priority and affected transition rows with:

> **Goal review and recovery ownership.** Review-provide creates an artifact and records its Reviews event as `received`; it never writes `delivering`. Review-receive owns the clean-receive transition to `delivering`, after recording `passed` for that exact artifact and verifying that its scope, revisions and milestone exit carrier remain valid. `fixes_completed` is not a passed review.
>
> A missing, blocked or stale milestone exit carrier routes to `oat-project-implement` with an explicit scoped milestone-closeout context. Once the carrier is allowed and fresh, a missing or stale integrated review routes to review-provide; a produced, unreceived artifact routes to review-receive. Queued fixes route to implement and invalidate the affected integrated-review and exit-gate evidence. For goal milestone delivery this is an explicit exception to the shared brief ladder: the milestone exit gate precedes the integrated delivery review, and fixes require the gate to run again.
>
> Persist interrupted recovery in `oat_goal_recovery: null | { milestone, delivery_id, phase_ids, stage, review_artifact }`, where `delivery_id` and `review_artifact` may be null and `stage` is `implementing | exit_gate | reviewing | receiving | delivering`. The recovery scope is explicit. Recovery of an older delivery does not change `oat_milestone`, its status, or its active execution pointer; resume uses the recovery record until it is cleared. Only the root commits shared routing, registry, gate and acceptance records.
>
> After the existing decomposition/HiLL checks, goal routing handles a valid terminal declaration through terminal recovery, then actionable review artifacts and pending recovery, then normal milestone routing. Terminal recovery uses the same owners above and cannot bypass received feedback or stale evidence. Missing carrier → scoped implement closeout; missing review → review-provide; unreceived review → review-receive; clean received review plus fresh carrier → delivery owner. `declared_met` prevents activation of another milestone; it does not imply delivery readiness.

Error Handling: replace "stale review or carrier → back to `reviewing`" with "Goal recovery routes by the missing evidence: carrier to scoped implement closeout, integrated review to review-provide, and received feedback to review-receive. Older-delivery recovery preserves the active milestone."

Plan deltas: p09-t01 recovery types/parsing in `types.ts`, `state/parser.ts`, both readers in `project.ts` plus reader tests; p09-t02 explicit Steps block for the priority, verified through the real project readers and `recommendSkill`; p11-t02 extend review-provide, review-receive, implement resume/closeout references and reconcile, mirror the goal ladder exception in `brief-contract.md`. Negative control: m02 active, d01 needing recovery — the faulty transition accepts a `received` review as delivery-ready or recommends review-provide despite a missing exit carrier; the corrected route rejects both and preserves m02 and its pointer; valid control: clean receive of the exact fresh review advances only the targeted delivery.

### A2. Bookkeeping-successor freshness — resolved-by-this-text

Objection: evidence must retain its actual reviewed revision while accepting verified bookkeeping successors and rejecting substantive successors. Exact-head comparisons at design.md:345–346, :387–388, :663–666 reject the head-recording and receive commits landed execution requires (phase-execution.md:100–104; review-receive/SKILL.md:676–691).

Design revision (Delivery registry and closeout boundary), replace the Freshness bullet with:

> **Bookkeeping-successor freshness.** Keep `reviewed_head`, review-row `Reviewed Head`, artifact revision fields and bound review revisions equal to the revisions actually reviewed. Never advance them merely because registration, receive or publication advanced HEAD.
>
> Evidence reviewed at R may cover a published head H when R = H, or when R is an ancestor of H and every intervening commit changes only permitted bookkeeping. Inspect every commit, including merge-introduced changes; a substantive change followed by a revert is not a bookkeeping successor. Missing Git objects, failed inspection, unknown paths or disallowed edits fail closed.
>
> The path allowlist is confined to this project's `state.md`, `plan.md`, `implementation.md`, `project-log.md`, and the exact review artifacts belonging to the evidence being recorded or archived. Path membership alone is insufficient. Permitted changes are routing/progress updates, evidence recording, review dispositions, registration/observation metadata and append-only execution observations. Changes to approved outcomes, approach, constraints, decisions, endpoint/authority, phase intent or exit evidence, milestone membership, frozen delivery scope, or existing evidence identities/revisions are substantive. Added evidence must refer to the unchanged subject it records. Executable code, tests, configuration, templates, skills and product documentation are never bookkeeping.
>
> A member base change invalidates the delivery evidence independently of this head-successor exception. Historical deliveries are checked against their own observed member revisions, never the project branch's latest HEAD. Refresh records observations and derived freshness; it does not manufacture a successful review or gate.

Goal transition contract, replace the carrier freshness sentences with:

> Gate outcomes retain the gate-approval-record core. Freshness is additional derived state, not a replacement `status` value. A configured code gate keeps its actual `reviewed_head`; its successor check uses the contract above. A plan carrier binds the approved brief/amendment and milestone membership at activation, not the later implementation aggregate head. An amendment requires its own plan review, gate resolution and approval.
>
> For `no_gate` and `project_disabled`, `reviewed_head` is null: no review occurred. Persist the applicable resolution and a separate subject binding identifying the approved plan or code scope to which that resolution applies. Changed gate configuration, subject or override requires reevaluation; it cannot inherit a fabricated reviewed SHA.

(This also corrects the sample `no_gate` carrier's non-null `reviewed_head`.)

Plan deltas: p10-t02 shared delivery-evidence evaluator (`delivery/evidence.ts` + tests): preserve actual revisions, inspect successor commits, distinguish carrier outcome from freshness, validate base independently; p10-t03 consume the evaluator and immutable subject bindings at closeout; p11-t01/t02 plan vs code subjects, nullable gate review heads, bounded successor rule. Negative control: a paths-only implementation accepts an Outcome or authority change inside allowed `plan.md`; corrected evaluation rejects it; also reject a substantive-then-reverted commit, a non-ancestor head and a changed base. Valid control: head-recording → receive/archive → registration commits pass with the reviewed SHA unchanged. Positive regression: exact-head comparison rejects that chain; the successor implementation accepts it.

### A3. Terminal boundary requires declaration — resolved-by-this-text

Objection: delivery coverage alone must never authorize terminal completion while the goal is undeclared or phases/outcomes lack explicit dispositions. The existing boundary returns directly for a completed snapshot or unconfigured sequence (`closeout-invariant.ts:423–453`).

Design revision (Goal transition contract), replace "Terminal closeout routing" with:

> **Terminal declaration.** Only `oat-project-goal`, after the user's explicit declaration, writes `oat_goal_status: declared_met` and `oat_goal_outcome_audit`. The audit records `decided_at`, the declaration/approval reference, the semantic brief identity, and exhaustive phase and outcome dispositions. Outcome references use the numbered outcome plus its bound text; renumbering or changing that text invalidates the audit.
>
> Each phase has exactly one audit disposition: `accepted`, `extracted`, `deferred`, or `retired`. Accepted means the real phase-unit contract reports acceptance, including provisional precedence, and the phase remains subject to delivery coverage. Extracted means matching plan/journal targets and a child with the matching `oat_extracted_from` backlink; the child is complete or its outstanding obligation has an explicitly approved deferral. Deferred/retired phases require a reason and scope-decision reference and remain historically incomplete; the audit never fabricates `**Status:** completed`.
>
> Each outcome has exactly one disposition: `met` with observed evidence, `extracted` with the validated child obligation, or `deferred`/`retired` with an approved scope decision. `met` is permitted only when no obligation remains deferred or retired; otherwise use `met_with_deferrals`. Unknown, duplicate, omitted or contradictory phase/outcome references invalidate the audit.
>
> Terminal routing first validates declaration and audit, then repairs review/gate/delivery obligations, then registers any uncovered accepted phases through the ordinary delivery prerequisites. Once coverage holds, the configured post-implement sequence runs unchanged; its `pr` step is satisfied by delivery coverage only at that step's position. Audit disposition allows explicitly deferred/retired units to leave terminal execution scope without changing ordinary progress counts.

Delivery registry and closeout boundary, replace Boundary inputs with:

> `checkProjectCloseout` loads the brief, journal, declaration/audit, extraction child identity/backlink/lifecycle, and current delivery observations. Every goal invocation requires valid declaration, exhaustive audit and delivery coverage before either snapshot-success or `not_required` can return. Missing or unreadable inputs refuse completion. A complete snapshot cannot waive these checks.
>
> `closeout-check` remains read-only. Factor host observation from persistence: the boundary obtains fresh observations without writing files; `delivery refresh` persists observations through its separate command. `complete-state` consumes the same evaluated inputs and performs no completion write on refusal. Failure to observe a required member is not endpoint success.
>
> Audit/refusal diagnostics identify the actual next owner: goal for declaration or audit repair, scoped implement for execution/carrier repair, review owners for review recovery, and delivery owners for registration/endpoint work.

Plan deltas: p09-t01 audit shape and validation results in goal state, full phase inventory (not only `selectPhaseUnits`); p09-t02 terminal audit validation and a terminal execution-scope exception for audited deferrals/retirements, ordinary phase-unit counts preserved; p10-t03 child facts sufficient to validate backlinks (not `childLifecycles` alone), read-only host-observation dependencies for `closeout-check` and `complete-state`, pure evaluator separate from I/O; p11-t01/t02 declaration ownership and audit authoring; implement consumes the declaration. Negative control: valid coverage + completed snapshot; omit the declaration, then independently omit one pending/provisional phase and one outcome from the audit — old boundary accepts, corrected boundary refuses each with its reason and `complete-state` writes nothing; repeat the omitted-declaration case through the `not_required` path. Valid control: declared, exhaustive audit with an approved deferral and covered accepted work passes; wrong child backlink fails, matching completed child passes.

### A4. Supersession chains — resolved-by-this-text

Objection: coverage must resolve replacement chains transitively and count inherited obligations once, with evidence covering the terminal delivery's complete effective scope. The current predicate follows one hop (design.md:673–689).

Design revision (Delivery registry and closeout boundary), replace Supersession and coverage clauses 2–4 with:

> **Supersession graph.** Delivery IDs are unique. In v1.5 each replacement has at most one direct predecessor: `covers_scope_of` is that predecessor's delivery ID, and the predecessor's `superseded_by` points back to the replacement. These links must agree. Reject missing targets, self-links, cycles, conflicting predecessors and links whose source is not superseded. `corrects_delivery_id` expresses an additive correction and contributes no inherited coverage.
>
> Resolve every replacement chain to its terminal non-superseded delivery. Its effective scope is the union of its frozen direct scope and every predecessor's frozen scope, ordered by the brief. Intermediate superseded entries contribute obligations but are not counted again as covering deliveries. Distinct terminal deliveries must have disjoint effective scopes. Every accepted non-extracted phase must occur in exactly one terminal effective scope; unknown or unaccepted phase claims refuse coverage.
>
> Each terminal delivery must reach its agreed endpoint and carry a passed integrated review and an allowed exit-gate result bound to its entire effective scope and member revisions. Scope labels alone do not prove coverage: the reviewed range must include every constituent phase's anchored contribution and relevant integration changes. A revision-only or narrowed review cannot stand alone as the full integrated review; it requires preserved, verifiable prior coverage or a new full-scope review.
>
> Persist the accepted exit-gate binding with the delivery's evidence. `oat_milestone_gates[mNN].exit` is the current working carrier; overwriting it for a correction cannot relabel or invalidate the historical evidence of another delivery merely because both share a milestone. Archived review files are optional local history; the authoritative scope, revision and disposition evidence must survive in tracked records.
>
> Only a delivery that never reached its agreed endpoint may be replaced. Preserve the first observed endpoint attainment as historical evidence; later corrections of such a delivery are additive and use new phase IDs.

Plan deltas: p09-t01 replacement links and durable delivery evidence incl. endpoint-attainment history; p10-t02 preserve history and evidence during refresh, never overwrite reviewed revisions with observations; p10-t03 transitive resolution, effective-scope ownership, evidence binding, duplicate-coverage rejection; p11-t02 registration writes reciprocal links and captures the exit result; receive persists authoritative review evidence before local archival. Negative control: against the one-hop predicate a terminal replacement whose review lists only its new revision phase is accepted despite inheriting earlier phases; corrected coverage rejects it; independently reject a cycle, a missing link, a mismatched reciprocal link and overlapping terminal deliveries. Valid control: `d01 → d02 → d03` with full effective-scope evidence on d03 passes and counts every inherited phase once.

For new goal-only guards: preserve the exact counterexample; show acceptance with the owning guard neutralized, rejection after restoration, and a passing valid control. HEAD does not implement goal routing, so a synthetic router demonstration is not a reproduced HEAD defect.

## B. New contradictions exposed by the landed v1

### B1. Milestone membership has no producer-to-consumer contract

p09-t01 names state parsing but omits the two explicit `ProjectState` constructors (`project.ts:51–82`, `:129–157`). Membership lives in the brief, not state frontmatter; `selectPhaseUnits` silently ignores unknown IDs (`state/tasks.ts:264–277`), so malformed membership can make unfinished work disappear. Add to p09-t01/p10-t01: a canonical fence-aware Milestones table grammar and shared reader exposed by both project readers with errors; every executable goal phase incl. revisions belongs to exactly one milestone, unknown/duplicate membership rejected before selecting units; malformed-membership and unknown-ID cases through the real readers; render `oat_plan_source: goal` during goal scaffolding (template hardcodes `brief` at plan-brief.md:10; scaffold.ts:435–444 does not replace it); keep "only the next phase must be concrete" incl. all members of the next dispatched parallel group — replace "phases concrete" at design.md:371 (whole-milestone-concrete contradicts brief-contract.md:46–48).

### B2. Late fixes need explicit milestone/delivery scopes

design.md:362 recommends `code <first>-<last>`; landed receive appends late revisions after the last phase (review-receive/SKILL.md:403–421) and `brief_resolve_anchors` expands every intervening phase (review-provide/SKILL.md:451–460). Example: m01 owns p01–p02, m02 owns p03, an m01 correction appends p-rev1; reviewing `p01-p-rev1` mislabels p03. Add to p09-t02/p10-t01/p11-t02:

> Goal review requests carry an explicit milestone/delivery identity and ordered phase set. Preserve that exact semantic set in review provenance; the Git range may be wider and must disclose intervening changes. Do not derive membership by first–last expansion or commit labels. A late correction is assigned explicitly to its recovery milestone, without moving the active milestone. Frozen delivery scopes remain immutable; appending correction phases does not mutate an earlier delivery's scope.

Validate that adding a correction is permitted while removing/reassigning frozen delivered phases is refused. Pre-fan-in member reviews are member evidence only; delivery evidence uses integration heads. Remove the design's merge-commit requirement at design.md:520–522 (brief-contract.md:229–237 permits cherry-pick integration).

### B3. Goal promotion is promised but unplanned

design.md:621–623 promises goal promotion; `promote.ts:428–444` accepts only brief/lite, its migration refuses every extracted phase (`:817–819`), and quick-start recognizes only `oat_promoted_from: brief` (quick-start/SKILL.md:154–169). Add **p10-t04 Goal promotion at a settled delivery boundary**: files `promote/promote.ts` + tests, `oat-project-quick-start/SKILL.md`, shared brief contract, affected help; permit goal → quick only at the specified delivered boundary with no open/unsettled delivery or recovery; keep the refusal for any extracted phase (matches the migration table at design.md:593); preserve registry/history; `oat_promoted_from: goal`; retain Reviews cells while naming their source mode; generalize quick-start's promotion resume to brief/goal reusing the pending-phase readiness clause. Verify: a settled goal promotes and resumes; active milestone, open delivery, recovery and extraction refuse without writes; no second readiness predicate. Commit `feat(p10-t04): promote settled goal projects to quick`. Update the `promote/*` surface disposition (design.md:778) from "v1" only.

### B4. "Delivered" has two incompatible meanings

design.md:364 says endpoint observed; :377 transitions when members are merely open; :398–402 permits planning while awaiting merge. Use the settled behavior consistently:

> `delivered` means the delivery is registered, open and review-ready; `at_endpoint` is the registry's separately observed endpoint condition. Re-alignment may draft and review the next milestone while awaiting the prior endpoint. It must not overwrite the active milestone pointer or activate the successor until that endpoint is satisfied.

Add to p09-t02/p11-t01 with a merged-endpoint case proving "open permits planning, not activation"; for endpoint `open` the same observation permits activation.

## C. Verdict

With A alone: NOT ALIGNED. With A plus B: ALIGNED for execution. Remaining before p09: persist these contracts and task deltas (including p10-t04); mirror goal exceptions in `brief-contract.md`; ensure milestone parsing, review scope, promotion and endpoint semantics carry the named verification cases. No additional scope or operator decision is needed.
