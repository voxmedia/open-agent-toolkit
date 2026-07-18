---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
---

# Discovery: implement-final-gate-enforcement

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Reinforce the implementation workflow so its configured skill-exit gate is an
independent, mandatory closeout boundary whenever configured. The workflow
currently can finish its lifecycle self-review, optional phase review, final
HiLL approval, and post-implementation sequence before reaching gate
resolution, allowing it to report success without producing configured-gate
provenance.

## Clarifying Questions

### Question 1: Workflow depth

**Q:** Should this use quick mode with a lightweight design?
**A:** Yes. Scaffold and seed the quick-start project, confirm the lightweight
design and plan, then implement through review.
**Decision:** Use native quick mode and produce `design.md` before planning.

## Solution Space

The direction is constrained by the incident: move the configured skill-exit
gate into the authoritative closeout sequence and persist its lifecycle state.
The lightweight design will resolve the exact state shape and ordering boundary.

### Chosen Direction

**Approach:** Enforce the configured exit gate as a resumable final closeout
state machine, separate from lifecycle self-review and optional phase review.
**Rationale:** Documentation-only reordering cannot prevent premature state
transitions or make interruption, retry, and stale-result handling safe.
**User validated:** Yes — the request explicitly requires durable pending,
allowed, and blocked outcomes tied to the reviewed HEAD/run.

## Options Considered

### Option A: Instruction-only ordering

**Description:** Move gate instructions above completion and strengthen success
criteria without adding durable state.

**Pros:**

- Small and easy to review.
- Directly fixes the misleading appendix placement.

**Cons:**

- Cannot safely resume interrupted gate handling.
- Cannot invalidate a stale successful result after later commits.
- Relies on prose compliance to prevent premature completion.

**Chosen:** No

### Option B: Durable closeout gate state

**Description:** Combine corrected lifecycle ordering with persisted gate
resolution/outcome provenance bound to the reviewed revision and run.

**Pros:**

- Makes pending, allowed, and blocked outcomes machine-checkable.
- Supports interruption/resume without duplicate valid runs.
- Makes later commits invalidate stale gate success.

**Cons:**

- Requires state contracts, fixtures, tests, and documentation updates.

**Chosen:** Yes

**Summary:** Use durable state plus explicit ordering because the failure is a
lifecycle correctness problem, not only a documentation problem.

## Key Decisions

1. **Mechanism independence:** Mandatory lifecycle self-review, optional
   `oat_phase_review_gate`, and optional configured skill-exit gate remain
   separate mechanisms; none satisfies or disables another.
2. **Ordering:** Resolve and handle the configured implementation gate after
   final implementation verification and mandatory lifecycle review, but before
   the approval-aware pre/post-implementation sequence, final HiLL approval,
   implementation completion state, or success output.
3. **Durability:** Persist gate pending, policy-allowed/passed, and
   blocked/failed states with enough provenance to resume safely.
4. **Freshness:** Bind a successful gate disposition to the reviewed HEAD/run;
   any later commit invalidates that success.
5. **Compatibility:** Preserve null resolution, configured `onFailure`,
   `maxAttempts`, structured envelope validation, receive eligibility, and
   review-receive semantics.
6. **Provenance:** A manual independent review without configured-gate
   provenance cannot satisfy the exit gate.
7. **Coordination:** Keep this project functionally separate from the
   orchestration run-log feature while stacking on its branch until PR #156
   merges.

## Constraints

- Preserve fail-closed behavior; never substitute normal final self-review for
  the independent configured gate.
- Preserve current configured-gate failure policy and retry semantics.
- Do not duplicate a still-valid successful gate on resume.
- Add regression coverage for ordering, phase-gate independence, null
  resolution, all failure policies, interruption/resume, and stale-HEAD
  invalidation.
- Update bundled workflow documentation when ordering or persisted state
  changes.
- Bump the changed canonical skill version once and run provider sync.
- Treat canonical skill changes as shipped CLI functionality and perform the
  required lockstep public-package version bump.
- Run targeted validation plus repository format, lint, type-check, full tests,
  build, and release validation.

## Success Criteria

- A configured implementation exit gate is always resolved and handled,
  regardless of optional phase-gate configuration.
- Implementation cannot become complete and cannot emit success before the
  configured gate reaches a policy-allowed terminal disposition.
- Null gate resolution remains a valid no-gate outcome.
- Block, prompt, warn, and success paths preserve their existing semantics and
  structured receive contract.
- Persisted state supports safe resume, avoids duplicate valid gate runs, and
  invalidates success when HEAD changes.
- Lifecycle ordering and post-implementation sequence tests prevent regression.
- Required documentation, synchronization, release versioning, and validation
  gates pass.

## Out of Scope

- Changing the behavior or ownership of mandatory lifecycle self-review.
- Enabling or redesigning optional per-phase external review gates.
- Adding orchestration run-log functionality beyond compatibility with the
  stacked base.
- Treating arbitrary manual reviews as configured exit-gate runs.

## Deferred Ideas

None identified.

## Open Questions

- **State ownership:** Whether gate lifecycle state belongs in project
  `state.md`, implementation tracking, or a coordinated split between the two.
- **Run identity:** Which existing gate envelope fields and revision identifiers
  form the canonical freshness key.

## Assumptions

- Existing gate resolution and review-receive commands remain the source of
  truth; this project orchestrates them rather than replacing their contracts.
- Existing frontmatter/state parsing can be extended compatibly without a data
  migration for projects that lack gate state.
- PR #156 remains the temporary stack base and will be replaced by `main` after
  it merges.

## Risks

- **False freshness:** A result may appear reusable after code or bookkeeping
  commits change the reviewed revision.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Define the exact reviewed revision boundary and test
    both unchanged resume and changed-HEAD invalidation.
- **Conflated gates:** New logic could accidentally make phase-review or final
  self-review status satisfy the configured exit gate.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Separate state/provenance fields and explicit
    independence tests.
- **Closeout ordering drift:** Expected post-gate sequence mutations could be
  mistaken for substantive implementation changes, or substantive changes
  could be incorrectly treated as closeout-only descendants.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Define a narrow closeout-only descendant policy,
    invalidate on implementation changes, and enforce the intended ordering
    with structural tests.

## Next Steps

Produce and confirm a lightweight design covering closeout ordering, durable
gate state, freshness/resume behavior, and regression testing before generating
the execution plan.
