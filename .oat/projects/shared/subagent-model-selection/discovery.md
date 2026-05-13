---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-12
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
- So the leverage was in model selection plus transparency, not behavioral tuning.

User wanted to revisit that recast. Two key signals:

1. **Observed Codex behavior:** earlier, the user saw Codex visibly varying `reasoning_effort` across dispatched subagents. Recently they have not seen that variation as much. It may be because recent work has been legitimately uniformly high-effort; it may be that auto-selection is less varied in practice than originally assumed.
2. **User-agency argument:** even if `reasoning_effort` is auto-chosen well most of the time, baking it into `plan.md` would let the user catch and override the choice at plan-review time rather than mid-execution. That argument applies independently of whether auto-selection is "good enough"; it is about transparency and control, not behavioral correction.

The discovery question: should the project widen `bl-0738`'s scope to cover both **model selection (Claude Code)** and **`reasoning_effort` (Codex)** as phase dispatch concerns, with clear policy and visible rationale?

## Reference Inputs

### Codex consultation summary (two passes)

**Pass 1 - case for explicit expression.** Codex's `reasoning_effort` auto-selection should not be treated as predictably reviewable by users. The strongest case for explicit expression is therefore not "auto-selection is bad"; it is "dispatch choices should be visible and reviewable before execution." Minimum viable expression should be lightweight and optional; a sparse table-form expression in `plan.md` is preferable to per-phase YAML frontmatter.

**Pass 2 - invocation-cap model.** Codex suggested that the cap should be the orchestrator's current invocation tier rather than a separate authored "plan default" field. That model also required run-local approvals, long-plan preflight UX, dry-run behavior, and `auto` staying truly automatic.

### Pivot: detection limits + runtime selection

After the design and plan reviews, the team identified a foundation problem in the invocation-cap model: Codex cannot reliably determine the current model or reasoning effort from inside the agent. Local config can expose defaults, but defaults are not proof of the active invocation because sessions can be started or resumed with CLI flags, UI overrides, Superconductor settings, or API-level parameters.

That breaks the core abstraction behind precomputed cap comparisons. Every approval decision, resolver comparison, and preflight gate depends on a value that may not be authoritatively available. Patching that with user prompts would preserve the machinery while weakening its premise.

The project therefore pivots to a Superpowers-style runtime policy:

- The planner does not precompute tier choices by default.
- Runtime dispatch chooses the **lowest available model/effort that can confidently complete the phase**.
- The orchestrator logs the chosen tier and rationale before dispatch.
- If confidence is low, the implementer is blocked for reasoning, or review cycles repeatedly fail, the orchestrator escalates to a more capable available tier.
- `plan.md` may still contain an optional `## Dispatch Profile`, but it is **override-only**: rows are user-authored constraints, not planner-generated predictions.

This keeps the useful transparency property while dropping the fragile cap-preflight mechanism.

### Superpowers reference

Local reference: `/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/archived/collaborative-design-workflow/reference/superpowers-subagent-driven-development.md`

Useful concepts to adapt:

- Use the least powerful model that can handle each role.
- Mechanical implementation tasks can run on a cheaper/faster tier.
- Integration and judgment tasks need a standard tier.
- Architecture, design, and review tasks use the most capable available tier.
- If a task is blocked because it needs more reasoning, retry with a more capable model.
- Reviewer findings must be fixed and re-reviewed; review loops are not optional.

OAT now adopts this as **lowest available confident tier for implementation, strongest available tier for review**.

## Solution Space

Discovery considered three original candidate approaches. These remain as historical record because they explain how the pivot emerged.

### Approach A: Keep scope as recast (model selection only)

**Description:** Implement `bl-0738` exactly as currently scoped: Claude-family model choice per phase, with Codex `reasoning_effort` left to auto-selection. Document that explicit Codex effort overrides are out of scope.

**When this is the right choice:** If Codex's auto-selected `reasoning_effort` is reliably appropriate per phase complexity in practice, the marginal value of explicit overrides is low and authoring cost is real.

**Tradeoffs:** Misses the transparency/review benefit. User cannot pre-empt mid-execution surprises. Creates an asymmetric experience: Claude phases are reviewable, Codex phases are opaque.

### Approach B: Widen scope to cover both model selection and reasoning_effort

**Description:** Treat plan-level `reasoning_effort` (Codex) and model selection (Claude Code) as a single phase dispatch profile. Both are expressed in `plan.md`, both are surfaced at dispatch with rationale, and both resolve through the same invocation-cap policy. Provider auto-selection remains the default for any phase the user has not explicitly tuned.

**When this is the right choice:** If user-agency at plan-review time is the primary value driver, regardless of how good auto-selection is.

**Tradeoffs:** Slightly more authoring effort per plan. Risk of users hand-tuning effort levels into worse outcomes than auto-selection. Need to define UX for surfacing escalations above invocation cap and obtaining explicit user confirmation.

**Status:** Superseded by Approach B'. The user-agency goal remains, but precomputing cap comparisons is not viable when the current invocation tier cannot be read reliably.

### Approach B': Override-only profile + runtime selection

**Description:** Keep both provider dimensions in scope, but do not ask the planner to predict phase tiers by default. Runtime dispatch selects the lowest available tier it can confidently use and logs the rationale. `plan.md` only carries explicit user-authored overrides or constraints.

**When this is the right choice:** If transparency and conservative resource use matter, but host/runtime limits make up-front tier math brittle.

**Tradeoffs:** Users cannot review generated tier recommendations during plan review because there are no generated recommendations. Instead, they review the runtime policy and any explicit override rows they choose to author.

**Chosen Direction:** Approach B'.

### Approach C: Plan-level model selection now, defer Codex effort to a later item

**Description:** Ship `bl-0738` as previously scoped, but explicitly carve out a follow-up backlog item for Codex `reasoning_effort` once we have more evidence of variance in auto-selection.

**When this is the right choice:** If we want to ship faster and gather more data on Codex auto-selection before committing to a plan-level mechanism.

**Tradeoffs:** Two-step delivery for what should arguably be one user-facing concept. Risk of the follow-up never landing.

## Chosen Direction

Approach B': **runtime selection with override-only profile**.

The project still widens beyond the 2026-04-24 recast and covers both Claude model selection and Codex `reasoning_effort`, but it no longer uses a planner-generated Dispatch Profile or invocation-cap preflight. The scope remains prompt/skill/template guidance only; no CLI helper is required for the first pass.

The core policy:

1. **Runtime chooses the tier.** For each phase, `oat-project-implement` chooses the lowest available model/effort that it can confidently use for the phase.
2. **Log every choice.** The dispatch line includes the chosen tier and a short rationale grounded in phase scope.
3. **Escalate when needed.** If confidence is low, a subagent reports reasoning blockage, or repeated review cycles fail, re-dispatch at a more capable available tier.
4. **Reviews use the strongest available tier.** Review, re-review, and review-fix judgment should run at the most capable available tier unless the user explicitly constrains it.
5. **`plan.md` overrides are optional.** A `## Dispatch Profile` section is not generated by default. If present, it represents user-authored constraints or preferences, not planner-generated recommendations.

## Key Decisions

- **Widen scope to both providers.** The same dispatch policy should cover Claude model selection and Codex `reasoning_effort`.
- **Use runtime selection instead of precomputed plan recommendations.** The current invocation tier cannot be authoritatively read in all Codex contexts, so cap/preflight math is not a reliable foundation.
- **No default Dispatch Profile rows.** Plans should omit the section unless the user explicitly wants to constrain or prefer a phase tier.
- **No planner proposal step.** Planning guidance explains the policy and override syntax, but does not emit recommendations phase by phase.
- **Dispatch logs carry transparency.** Users see the tier/rationale when work is dispatched, where the runtime context is real.
- **Reviews run strong by default.** Reviews, re-reviews, and review-fix evaluation use the most capable available tier because they require judgment against requirements, implementation, and prior findings.
- **Escalation is behavioral, not permission math.** The orchestrator escalates when confidence or outcomes show the current tier is insufficient.
- **Preserve Superpowers' quality-loop lesson.** Reviewer findings require fixes and re-review; review loops are not optional.

## Constraints

- Scope stays at prompt/skill/template guidance only. No new CLI helpers in the first pass.
- Must not regress existing `oat-project-implement` dispatch flow.
- Must not require users to author dispatch profiles when defaults are appropriate.
- Must not silently hide dispatch choices. Every dispatch should log the selected tier and rationale.
- Must not promise that OAT can read the current Codex model or effort. Runtime policy must work without that value.
- Must keep bounded fix-loop semantics intact; tier escalation does not extend retry budgets unless a future design explicitly changes that.

## Success Criteria

- `oat-project-implement` guidance tells the orchestrator to choose the lowest available tier/model that can confidently complete each phase and to log the rationale.
- `oat-phase-implementer` guidance tells implementers to report low confidence or reasoning blockage so the orchestrator can escalate.
- `oat-reviewer` guidance says phase reviews should use the most capable available tier unless explicitly constrained.
- `plan.md` template documents optional override-only `## Dispatch Profile` syntax without generating rows by default.
- `oat-project-plan-writing` explains when a user-authored override row is appropriate and warns against routine hand-tuning.
- `oat-project-import-plan` preserves existing OAT-format Dispatch Profile rows and treats foreign model/effort hints as user constraints or rationale signals, not planner-generated recommendations.
- `oat-project-review-provide` flags malformed or risky explicit override rows during artifact plan review.
- The guidance cites/adapts the local Superpowers reference for least-capable-sufficient model selection and review loops.

## Out of Scope

- Any CLI helper like `recommend-models`.
- Schedule-preview tooling.
- Measuring provider auto-selection quality, token cost, or time savings.
- Plan-level minimum tier (floor). A field that asserts "this plan should not run on a tier weaker than X" is a separate concept from phase-level runtime selection and remains deferred.
- Persisting runtime dispatch decisions in `plan.md`. If later needed, run history belongs in `implementation.md`.

## Open Questions

- Should runtime dispatch choices be appended to `implementation.md` as durable history, or is the live dispatch log enough for the first pass?
- What exact vocabulary should Codex use for "available effort" when the host does not expose a direct model/effort control?
- Should user-authored low-tier overrides for review tasks be rejected outright or just flagged as Important during plan review?

## Assumptions

- Runtime context is a better place than planning to judge tier needs.
- The user still wants dispatch choices to be visible, but visibility can happen at dispatch time instead of plan-review time.
- Provider auto-selection remains useful; OAT's policy should guide and explain it rather than fight it by default.
- Explicit overrides are rare and intentional.

## Risks

- **Less plan-time agency:** Users no longer see planner-generated tier suggestions before implementation.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Keep override syntax available and make dispatch logs clear enough to audit.
- **Runtime overconfidence:** The orchestrator may choose too weak a tier.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Require low-confidence reporting, escalation on blockage, and escalation after repeated review failures.
- **Override misuse:** Users can still pin a tier that is too weak for the phase.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Plan-review advisory flags risky or malformed explicit rows before implementation.

## Next Steps

1. Update `design.md` to the runtime-selection model.
2. Regenerate `plan.md` around the smaller prompt/template guidance scope.
3. Update implementation/state tracking to the regenerated plan.
4. Archive the superseded design and plan reviews once their findings are resolved by the pivot.
