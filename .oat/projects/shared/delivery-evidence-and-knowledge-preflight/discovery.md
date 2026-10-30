---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-10-30
oat_generated: false
---

# Discovery: delivery-evidence-and-knowledge-preflight

## Initial Request

Fix four triaged issues in one PR, run autonomously in quick mode at the High
dispatch ceiling, with no project recap:

- GitHub #383 — backlog `BL-261030-evaluate-stacked-goal-delivery` (Evaluate
  stacked goal-delivery exit carriers against the stack tip).
- GitHub #384 — backlog `BL-261030-admit-goal-exit-gate-review` (Admit goal
  exit-gate review artifacts as milestone bookkeeping evidence).
- GitHub #385 — backlog `BL-261030-flag-rewritten-committed` (Flag rewritten
  committed journal lines in journal check).
- GitHub #355 — backlog `BL-261030-preflight-knowledge-index` (Preflight
  knowledge-index mapper dispatch before replacing generated knowledge).

Each claim was verified against `main` during the 2026-10-30 triage
(`.oat/repo/pjm/triage/2026-10-30-untriaged-issues.md`, merged in PR #388).

## Clarifying Questions

### Question 1: Stacked deliveries

**Q:** Make `kind: stack` deliveries a documented, supported shape, or reject
multi-member registration?
**A:** User: support stacks.
**Decision:** Document `kind: stack` and judge a stack's exit carrier against
its tip.

### Question 2: Knowledge-index mapper routing

**Q:** Route mapper workers through the generic dispatcher, or gate the skill
to Claude only?
**A:** User: generic; it must work on Codex and Cursor as well.
**Decision:** Route through `oat-dispatch-subagents`, with the Claude-specific
arguments confined to the Claude route.

### Question 3: Delivery topology and ceiling

**Q:** One PR or several; which dispatch ceiling?
**A:** User: one PR, High ceiling, no recap.
**Decision:** One branch and one final PR; `oat_dispatch_policy` managed/high;
`oat_project_recap` persisted as `skip/interactive`.

## Solution Space

The approach for each fix is settled by the backlog acceptance criteria; the
remaining choices are mechanism choices resolved below and in `design.md`.

## Options Considered

### Option A: Identify gate-originated rows by Invocation and reviewed head (#384)

**Description:** Admit a code-review row's artifact as bookkeeping when the row
records `Invocation: gate` and its `Reviewed Head` equals the exit carrier's
`reviewed_head`.

**Pros:**

- Uses tracked, append-only Reviews-row cells; no artifact frontmatter read.
- Binds the admission to the exact gate run that produced the carrier.

**Cons:**

- Requires the gate's row to carry the Invocation and Reviewed Head columns,
  which review-provide already writes for code reviews.

### Option B: Read the artifact's `oat_review_phase_ids` frontmatter (#384)

**Description:** Admit the artifact when its frontmatter phase IDs equal the
milestone scope.

**Pros:**

- Matches the issue's proposal literally.

**Cons:**

- Reads a file the judged commit can itself rewrite; contradicts the §12.8
  rule that unlocks come only from tracked append-only rows.

**Chosen:** A

**Summary:** The row-based binding is stronger and consistent with the
existing "own artifacts come from Reviews rows" rule.

## Key Decisions

1. **QS-03 (auto-resolved from repository evidence):** Discovery questions
   were answered by the user (Questions 1–3) or from verified source evidence;
   no material product ambiguity remains.
2. **QS-04 (auto-resolved): lightweight design.** Discovery surfaced
   component-boundary decisions in shared evidence code (#383/#384) and a
   cross-provider routing design (#355); a short `design.md` records them
   before planning. Spec-driven promotion is not warranted: requirements are
   fixed by four approved backlog items.
3. **#385 scope: goal projects only.** Only goal mode enforces the
   append-only journal rule (brief contract §12.8, `judgeJournalChange`).
   Brief projects have no consumer that rejects rewrites, so flagging them
   would create false positives. This narrows the backlog item's "at least
   goal and brief" wording; recorded as a deviation.
4. **#383 heads:** A stack's exit carrier is judged against the tip member's
   observed head; lower members must be ancestors of the tip. `kind: pr` and
   `null` keep every-member evaluation.
5. **#384 binding (deviation from the backlog wording):** gate artifacts are
   admitted by the row's `Invocation: gate` and a `Reviewed Head` equal to the
   carrier's, not by the artifact's `oat_review_phase_ids` (Option A above).
6. **#383 registration is attach-only:** pr-progress records an existing
   gh-stack base to tip; it does not create stacks.
7. **#385 boundaries:** the comparison runs at `implement-preflight` and
   `review`, not at `completion`, so `complete-state` and `--at completion`
   keep judging identical bytes.
8. **One PR, one lockstep bump.** All five public packages are bumped once;
   every changed canonical skill bumps its own `metadata.version`.

## Constraints

- Preserve fail-closed bookkeeping-successor semantics (§12.8): unknown paths
  stay disallowed; set-once delivery fields unlock only from a delivery's own
  Reviews rows.
- No change to single-member `kind: pr` behavior.
- Negative controls for evidence rules run through the production scope
  builder and the built CLI (§12.8 requirement), not hand-assembled scopes.
- Skill edits must keep the pinned contract tests in
  `packages/cli/src/validation` and `commands/init/tools/shared` green.
- External-integration research (autonomous Step 3): none required; the work
  touches only this repository's CLI, control-plane types and canonical skills.
  Evidence sources are the checked-out source at `e66894ab` and the triage
  record.

## Success Criteria

- A linear stack reviewed at its tip is deliverable under `delivery check`,
  `delivery refresh` and the closeout check; a lower layer that is not an
  ancestor of the tip is not.
- Milestone and delivery subjects agree on the same commit after registration.
- A configured exit gate's own artifact commit no longer stales the milestone
  carrier, while a non-gate or mismatched-head `final` row still does, and gate
  rows never become integrated-review rows or own-evidence unlocks.
- `journal check` reports a rewritten committed journal line in a goal
  project before delivery check would reject it.
- `oat-repo-knowledge-index` resolves a mapper route before any cleanup or
  index write, stops untouched when none resolves, and contains no
  Claude-only launch argument outside the Claude route or any hard-coded
  maintainer path.
- All CI gates in AGENTS.md pass.

## Out of Scope

- #353, #354 and #360 (separate backlog items).
- A commit-time journal guard in `oat internal commit-paths` and a journal
  append helper (optional follow-ons in the #385 item).
- An Amp provider adapter or automatic inline mapper fallback.

## Deferred Ideas

- Journal append helper (`oat project journal append`) — optional follow-on
  named by the backlog item; not required to close #385.

## Open Questions

- None blocking. Exact helper names and fixture layout are implementation
  choices recorded in `design.md` and the plan.
- **Pack dependency (operator decision, not taken here):** after #355,
  `oat-repo-knowledge-index` (workflows pack) needs the utility pack's dispatch
  skills; the skill names the recovery command, but declaring a
  workflows→utility dependency is left for operator sign-off.

## Assumptions

- Gate-run Reviews rows record `Invocation: gate` and a `Reviewed Head`
  (review-provide contract, `SKILL.md` Reviews-row rules).
- Stack members are recorded base to tip in `members` order.

## Risks

- **Widening the bookkeeping allowlist (#384):** an over-broad admission could
  let a non-gate change pass as bookkeeping.
  - **Likelihood:** Low
  - **Impact:** High
  - **Mitigation Ideas:** bind to Invocation and exact reviewed head; negative
    controls for manual rows, mismatched heads, and own-evidence isolation.
- **Pinned skill prose (#355):** contract tests pin skill sentences verbatim.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** run the shared and validation suites after each
    skill edit.

## Next Steps

Quick mode → lightweight design (QS-04), then plan.
