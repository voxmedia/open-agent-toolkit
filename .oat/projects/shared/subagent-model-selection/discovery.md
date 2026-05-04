---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-04
oat_generated: false
---

# Discovery: subagent-model-selection

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Promote backlog item `bl-0738` ("Define per-phase model selection guidance for phase-subagent dispatch") into a quick-mode project, and use discovery to decide whether the scope should widen back beyond the recent recast.

The original backlog item was framed as **reasoning-budget guidance**, but was recast on 2026-04-24 to **model selection only**, on the rationale that:

- Claude Code's Agent/Task tool only exposes a model choice (`haiku|sonnet|opus`), not a thinking budget.
- Codex auto-chooses `reasoning_effort` per dispatch.
- So the leverage was in model selection + transparency, not behavioral tuning.

User wants to revisit that recast. Two key signals:

1. **Observed Codex behavior:** earlier, the user saw Codex visibly varying `reasoning_effort` across dispatched subagents. Recently they have not seen that variation as much. It may be because recent work has been legitimately uniformly high-effort; it may be that auto-selection is less varied in practice than originally assumed.
2. **User-agency argument:** even if `reasoning_effort` is auto-chosen well most of the time, baking it into `plan.md` would let the user catch and override the choice at plan-review time rather than mid-execution. That argument applies independently of whether auto-selection is "good enough" — it's about transparency and control, not behavioral correction.

The question for discovery: should the project widen `bl-0738`'s scope to cover both **model selection (Claude Code)** and **`reasoning_effort` (Codex)** as plan-level concerns, with clear precedence rules and surfaced rationale at dispatch?

## Solution Space

_To be filled in after Codex consultation. Initial framing of the candidate approaches:_

### Approach A: Keep scope as recast (model selection only)

**Description:** Implement `bl-0738` exactly as currently scoped — Claude-family model choice per phase, with Codex `reasoning_effort` left to auto-selection. Document that explicit Codex effort overrides are out of scope.

**When this is the right choice:** If Codex's auto-selected `reasoning_effort` is reliably appropriate per phase complexity in practice, the marginal value of explicit overrides is low and authoring cost is real.

**Tradeoffs:** Misses the transparency/review benefit. User cannot pre-empt mid-execution surprises. Creates an asymmetric experience: Claude phases are reviewable, Codex phases are opaque.

### Approach B: Widen scope to cover both model selection and reasoning_effort

**Description:** Treat plan-level `reasoning_effort` (Codex) and model selection (Claude Code) as a single "phase dispatch profile" concern. Both expressed in `plan.md` per phase, both surfaced at dispatch with rationale, both subject to the same precedence rules (plan-level override > phase hint > agent default). Codex auto-selection remains the default; explicit values are opt-in transparency.

**When this is the right choice:** If user-agency at plan-review time is the primary value driver, regardless of how good auto-selection is.

**Tradeoffs:** Slightly more authoring effort per plan. Risk of users hand-tuning effort levels into worse outcomes than auto-selection. Need to define a small policy for when explicit values are recommended vs. when "let Codex pick" is the right default.

### Approach C: Plan-level model selection now, defer Codex effort to a later item

**Description:** Ship `bl-0738` as currently scoped, but explicitly carve out a follow-up backlog item for Codex `reasoning_effort` once we have more evidence of variance in auto-selection.

**When this is the right choice:** If we want to ship faster and gather more data on Codex auto-selection before committing to a plan-level mechanism.

**Tradeoffs:** Two-step delivery for what should arguably be one user-facing concept. Risk of the follow-up never landing.

### Chosen Direction

_TBD — pending Codex consultation and user buy-in._

## Key Decisions

_TBD._

## Constraints

- Scope stays at prompt/skill/template guidance only. No new CLI helpers in the first pass.
- Must not regress the existing `oat-project-implement` dispatch flow.
- Must not require users to author dispatch profiles when defaults are appropriate (auto-selection remains the default for both providers).

## Success Criteria

_TBD — likely some variant of: a phase-implementer dispatch for a representative plan visibly surfaces the chosen model + (where applicable) reasoning effort and the rationale, and a user can edit `plan.md` to override either before dispatch._

## Out of Scope

- Any CLI helper like `recommend-models` (deferred per original item).
- Schedule-preview tooling.
- Behavioral tuning of model selection beyond first-pass policy guidance.

## Open Questions

- **Codex auto-selection variance:** Is `reasoning_effort` auto-selection in subagent dispatch reliably varying by phase complexity in practice, or is it largely flat?
- **Authoring cost:** What's the minimum-viable expression of dispatch profile in `plan.md` so authoring stays cheap?
- **Precedence symmetry:** Should the same precedence rules apply identically to model and effort, or do they need separate resolution?
- **Pitfalls of hand-tuning:** What's the risk of users specifying lower-than-needed effort levels and getting worse outputs?

## Assumptions

- The dispatch transparency case is strong enough on its own merits to justify the authoring cost, _if_ expression in `plan.md` is lightweight enough.
- Codex `reasoning_effort` auto-selection remains the recommended default; explicit overrides are opt-in.

## Risks

- **Hand-tuning regression:** Users specify effort levels that produce worse outputs than auto-selection.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Treat explicit values as overrides with a default of "auto"; surface auto-selection rationale at dispatch so users have a baseline before they override.
- **Asymmetry confusion:** Users expect parity between Claude model and Codex effort and are surprised when behavior differs.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Clear documentation in `oat-project-plan` describing how the same dispatch profile maps onto each provider.

## Next Steps

1. Consult Codex on the four open questions (see above).
2. Converge on chosen approach and document rationale.
3. Confirm requirements gate with user.
4. Generate `plan.md`.
