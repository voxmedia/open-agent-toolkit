---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-05
oat_generated: false
---

# Discovery: explainer-improvements-v2

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Review the recent explainer projects and make further improvements. The
operator will supply a handoff document with feedback that should drive
scope. Prior project trees to use as context:

- archived `explainer-kit` (public skill family foundation)
- shared `explainer-improvements` (golden unattended recap recovery; PR open)

Ambiguity class: **exploratory** until the handoff feedback is ingested and
scope converges.

## Prior Project Context (reviewed)

### explainer-kit (archived)

Shipped the public skill family: destination-neutral `explainer-kit` core plus
thin `oat-explainer-kit` adapter. Established recipes, curated styles, fact-base
pipeline, content approval, rendering/visual QA, additive publish, and archive
hash semantics. Revision 1 hardened unattended authoring, curated styles, and
immutable-hash/archive correctness.

### explainer-improvements (shared; PR open)

Restored golden-quality unattended project recaps on top of that foundation:

- Adaptive recaps share one immutable set plan (hub + architecture + deck +
  optional source-backed artifacts).
- Unattended publication requires trusted Chromium browser evidence and an
  independent whole-set visual critic, with a hard one-correction cap.
- Non-linear graphs detect and artistically reroute; backlinks and catalog
  publishing hardened; approval resume requires authenticated current tokens
  only (legacy resume compatibility traded away).
- All three real-Chromium golden benchmarks passed; 62 tasks complete;
  PR [#188](https://github.com/voxmedia/open-agent-toolkit/pull/188) open.

Explicit P2 leftover from that project (still open backlog):

- `BL-260728-additional-visual-workflows` — evaluate diff review, plan review,
  fact-check, dashboards, complex tables, and richer compositions based on
  observed demand. Intentionally outside the golden-recap recovery path.

## Clarifying Questions

### Question 1: Handoff feedback document

**Q:** Please provide the handoff doc with feedback that should drive v2
scope (path, paste, or attach).
**A:** _awaiting operator_
**Decision:** Scope, priorities, and success criteria will be derived from
that feedback plus the prior-project context above; do not invent a
improvement slate from the project name alone.

## Solution Space

_Deferred until handoff feedback arrives. Candidate framings (not yet
validated):_

1. **Feedback-driven quality pass** — triage handoff findings into a bounded
   fix/improvement plan on the existing golden-recap runtime.
2. **Expand visual workflows** — pick up
   `BL-260728-additional-visual-workflows` (or a subset) once demand is clear
   from feedback.
3. **Hybrid** — close critical feedback first, then a small workflow expansion
   only if the handoff explicitly asks for it.

Recommendation pending handoff content; lean toward (1) or (3) unless the
handoff is primarily recipe expansion.

### Chosen Direction

**Approach:** TBD after handoff
**Rationale:** Operator indicated feedback will define further improvements
**User validated:** No — waiting on handoff doc

## Options Considered

_TBD after handoff feedback is reviewed._

## Key Decisions

1. **Workflow mode:** Quick-start (operator-selected via
   `oat-project-quick-start`).
2. **Baseline:** Build on shipped explainer-kit + explainer-improvements
   outcomes; do not reopen settled foundation decisions unless feedback
   requires it.
3. **Scope source of truth:** Operator handoff feedback document (not yet
   received).

## Constraints

- Preserve destination-neutral core / OAT-adapter boundary unless feedback
  requires a deliberate change.
- Preserve trusted browser-review and bounded visual-correction contracts for
  unattended adaptive recaps unless feedback explicitly revisits them.
- Public package changes remain under the five-package lockstep release
  policy; skill version bumps follow repo skill-sync rules.
- Prefer outcome-oriented discovery; keep implementation detail for design/plan.

## Success Criteria

- _TBD from handoff feedback_ — at minimum: prioritized, verifiable
  improvements with clear acceptance evidence and no silent regression of
  golden-recap conformance.

## Out of Scope

- Rebuilding the original personal-kit private wrapper as a public deliverable
- Open-ended visual recipe expansion without demand evidence (unless handoff
  explicitly prioritizes specific workflows)
- Reopening legacy `ekrt1` resume compatibility (explicitly traded away)

## Deferred Ideas

- `BL-260728-additional-visual-workflows` candidates remain deferred unless the
  handoff elevates specific workflows with observed demand.

## Open Questions

- **Handoff content:** What feedback items are in-scope for v2 vs backlog vs
  wont-fix?
- **PR #188 relationship:** Does v2 land as follow-on commits on the open PR,
  a new PR after merge, or a revise pass on explainer-improvements?
- **Depth:** Is this a bounded quality/fix pass, a recipe expansion, or
  something that should promote to spec-driven?

## Assumptions

- The open explainer-improvements PR represents the intended baseline to
  improve upon (or revise against).
- The handoff doc will be the primary driver of prioritization over the open
  P2 backlog item.

## Risks

- **Scope drift without handoff:** Inventing improvements from prior summaries
  alone could miss the operator's actual pain points.
  - **Likelihood:** High if we proceed without the doc
  - **Impact:** High
  - **Mitigation Ideas:** Gate solution-space convergence and planning on
    ingesting the handoff.

## Next Steps

1. Ingest operator handoff feedback document.
2. Converge solution space and get explicit direction buy-in.
3. Complete discovery → design-depth decision → plan for
   `oat-project-implement`.
