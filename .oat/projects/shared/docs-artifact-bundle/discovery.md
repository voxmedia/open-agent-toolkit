---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-21
oat_generated: false
---

# Discovery: docs-artifact-bundle

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Turn the discussion about applying the agent-instructions artifact-bundle strategy to `oat-docs-analyze` and
`oat-docs-apply` into a quick project.

## Clarifying Questions

### Question 1: Scope of change

**Q:** Should the same bundling strategy used for agent instructions be applied to docs analyze/apply?
**A:** Probably yes in concept, but not as a 1:1 copy. The likely fit is a lighter hybrid contract rather than a
full mandatory bundle for every docs recommendation.
**Decision:** This project should evaluate and likely plan a docs-specific bundle strategy, not blindly mirror the
agent-instructions design.

## Solution Space

This request is exploratory because there are multiple viable ways to reduce analyze -> apply loss in docs, and the
right answer depends on how much complexity the docs workflow should absorb.

### Approach 1: Full Bundle Mirror

**Description:** Copy the agent-instructions model directly: reviewer-facing markdown artifact plus a mandatory
companion bundle with a manifest and per-recommendation packs for every docs analysis run.
**When this is the right choice:** Best if docs analyze/apply already shows repeated loss of recommendation-scoped
behavior, workflow nuance, and evidence handoff across many recommendation types.
**Tradeoffs:** Highest consistency and machine-readability, but also the most complexity. It risks overfitting the
docs workflow to a problem that may only affect a subset of recommendation types.

### Approach 2: Hybrid Optional Packs _(Recommended)_

**Description:** Keep the markdown docs analysis artifact as the primary review document, add stable recommendation
IDs, and introduce optional per-recommendation packs only for complex recommendations such as large `CREATE`,
`SPLIT`, or high-context content-opportunity work.
**When this is the right choice:** Best when simple docs fixes still fit cleanly in one artifact, but a subset of
recommendations need richer handoff detail.
**Tradeoffs:** Better balance of fidelity and complexity, but it introduces a mixed contract that apply must handle
carefully.

### Approach 3: Enrich the Single Artifact Only

**Description:** Keep one markdown artifact and continue adding richer fields, structure, and evidence expectations to
it without introducing a companion bundle.
**When this is the right choice:** Best if the current docs artifact is only missing a few fields and does not
regularly lose detail at apply time.
**Tradeoffs:** Lowest implementation cost, but it keeps all detail compressed into one reviewer-oriented document and
may recreate the same ceiling the agent-instructions workflow hit.

### Chosen Direction

**Approach:** Hybrid optional packs
**Rationale:** It preserves the simpler docs workflow where possible, while still giving apply a richer contract for
the recommendation types most likely to lose nuance.
**User validated:** Yes

## Options Considered

{Specific implementation options within the chosen approach. More granular than Solution Space — captures decisions about libraries, patterns, data formats, etc.}

### Option A: Reuse the agent-instructions bundle shape as-is

**Description:** Use the same manifest + summary + pack structure and field names across docs and instructions.

**Pros:**

- Consistent mental model across skill families
- Reuses a pattern already proven useful in the repo

**Cons:**

- Docs recommendations are often simpler and more prose-oriented than instruction-file generation
- Could force unnecessary pack overhead on routine docs fixes

**Chosen:** Neither

### Option B: Use a docs-specific lighter contract

**Description:** Keep the same high-level idea but tailor the contract to docs workflows, likely with optional packs
and fewer mandatory fields for simple updates.

**Pros:**

- Better fit for mixed docs recommendation complexity
- Reduces bundle overhead for low-risk fixes

**Cons:**

- Less symmetry across the two skill families
- Requires a fresh contract design instead of a direct port

**Chosen:** B

**Summary:** Reuse the bundle idea, but not the full agent-instructions contract verbatim. A docs-specific lighter
variant is the leading direction.

## Key Decisions

1. **Workflow stance:** Keep separate `oat-docs-analyze` and `oat-docs-apply` steps instead of merging them.
2. **Contract stance:** Prefer a hybrid docs-specific bundle strategy over a mandatory full bundle for every docs
   recommendation.
3. **Evidence boundary:** Apply should remain constrained by the analysis contract and cited evidence, not rediscover
   new recommendations on its own.

## Constraints

- Preserve the current reviewer-friendly markdown artifact for docs analysis.
- Avoid adding bundle overhead to simple docs fixes unless there is clear value.
- Keep docs apply from inventing unsupported docs conventions.
- Stay compatible with the existing OAT docs analyze/apply workflow shape unless the project deliberately changes it.

## Success Criteria

- A quick-mode plan exists for evaluating or implementing a docs-specific bundle handoff.
- The plan makes an explicit decision between full mirror, hybrid optional packs, or single-artifact enrichment.
- The project captures when docs recommendations should stay inline versus when they need richer pack-style context.

## Out of Scope

- Reworking unrelated docs-analysis quality criteria that are not part of the analyze/apply handoff.
- Merging docs analyze and docs apply into one skill.
- Blindly copying the entire agent-instructions bundle contract without docs-specific evaluation.

## Deferred Ideas

{Ideas that came up during discovery but are intentionally out of scope for now}

- Add runtime parsing/validation for docs bundles in the CLI - deferred until the docs contract is chosen
- Unify docs and agent-instructions bundle schemas completely - deferred until both workflows prove they need the same
  shape

## Open Questions

- **Recommendation threshold:** Which docs recommendation types are complex enough to require packs?
- **Contract shape:** Should docs packs be optional per recommendation, or should bundle presence imply packs for all
  recommendations in a run?
- **Apply behavior:** How should docs apply treat mixed runs where some recommendations have packs and others stay
  inline in the main artifact?

## Assumptions

- Docs analyze/apply currently has a lower fidelity-loss risk than agent instructions because many docs changes are
  simpler and prose-oriented.
- Some docs recommendation classes are still complex enough to benefit from a richer handoff.

## Risks

- **Over-engineering:** The docs workflow could inherit unnecessary contract complexity from the agent-instructions
  solution.
  - **Likelihood:** Low / Medium / High
  - **Impact:** Medium
  - **Mitigation Ideas:** Start with a hybrid design and define explicit thresholds for when packs are needed.

- **Insufficient fidelity:** A lighter docs contract could still leave apply starved of recommendation-scoped context
  for complex docs work.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Add regression scenarios for complex `CREATE`, `SPLIT`, and content-opportunity
    recommendations.

- **Contract inconsistency:** A docs-specific variant may diverge too far from the agent-instructions pattern and
  become harder to maintain.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Reuse stable concepts like recommendation IDs and per-recommendation context packs even if
    the exact schema differs.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Quick mode → straight to plan:** proceed directly to `plan.md` when scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused `design.md` (architecture, components, data flow, testing) before planning. Choose this when discovery surfaced architecture choices or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed the scope is larger or more complex than expected.
- **Spec-driven mode:** continue to `oat-project-spec` (after HiLL approval if configured).

This project chose the quick-mode lightweight design path and is ready for planning.
