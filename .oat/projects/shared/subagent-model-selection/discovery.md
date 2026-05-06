---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-06
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

## Reference Inputs

### Codex consultation summary (two passes)

**Pass 1 — case for explicit expression.** Codex's `reasoning_effort` auto-selection should not be treated as predictably reviewable by users. The strongest case for explicit expression is therefore not "auto-selection is bad"; it is "dispatch choices should be visible and reviewable before execution." Minimum viable expression should be lightweight and optional — a sparse table-form expression in `plan.md` is preferable to per-phase YAML frontmatter.

**Pass 2 — invocation-cap model confirmation.** Codex agreed that the cap should be the orchestrator's current invocation tier rather than a separate authored "plan default" field, and added four constraints:

1. **Approvals are run-local; never mutate `plan.md`.** If approvals need to persist, they live in `implementation.md`, not the plan. The plan stays authored intent; execution state stays separate.
2. **Long-plan UX guardrail.** When many phases exceed cap, "approve all" is too frictionless. Preflight should recommend downgrade-for-run or abort/reinvoke as primary paths, with "approve specific" available but not the default.
3. **Dry-run behavior.** Dry-run surfaces flagged escalations without asking. No gate fires.
4. **`auto` stays truly auto.** No explicit override, no preflight flag. Phases set to `auto` don't appear in the preflight table.

Codex also confirmed: review runs at the approved phase tier once a phase has been approved to escalate (not at the original invocation cap), and a plan-level _minimum_ tier (floor) is a real need but should be deferred to a follow-up backlog item.

### Superpowers reference

Local reference: `/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/archived/collaborative-design-workflow/reference/superpowers-subagent-driven-development.md`

Useful concepts to adapt:

- Use the least powerful model that can handle each role.
- Mechanical implementation tasks can run on a cheaper/faster tier.
- Integration and judgment tasks need a standard tier.
- Architecture, design, and review tasks use the most capable available tier.
- If a task is blocked because it needs more reasoning, retry with a more capable model.
- Reviewer findings must be fixed and re-reviewed; review loops are not optional.

OAT adapts Superpowers' "most capable available" as **"highest tier currently in scope for that phase,"** where "in scope" means the orchestrator's invocation tier (default) or the user-approved escalation tier (for phases the user has explicitly approved to exceed the cap).

## Solution Space

Discovery considered three candidate approaches:

### Approach A: Keep scope as recast (model selection only)

**Description:** Implement `bl-0738` exactly as currently scoped — Claude-family model choice per phase, with Codex `reasoning_effort` left to auto-selection. Document that explicit Codex effort overrides are out of scope.

**When this is the right choice:** If Codex's auto-selected `reasoning_effort` is reliably appropriate per phase complexity in practice, the marginal value of explicit overrides is low and authoring cost is real.

**Tradeoffs:** Misses the transparency/review benefit. User cannot pre-empt mid-execution surprises. Creates an asymmetric experience: Claude phases are reviewable, Codex phases are opaque.

### Approach B: Widen scope to cover both model selection and reasoning_effort

**Description:** Treat plan-level `reasoning_effort` (Codex) and model selection (Claude Code) as a single phase dispatch profile. Both are expressed in `plan.md`, both are surfaced at dispatch with rationale, and both resolve through the same invocation-cap policy. Provider auto-selection remains the default for any phase the user has not explicitly tuned.

**When this is the right choice:** If user-agency at plan-review time is the primary value driver, regardless of how good auto-selection is.

**Tradeoffs:** Slightly more authoring effort per plan. Risk of users hand-tuning effort levels into worse outcomes than auto-selection. Need to define UX for surfacing escalations above invocation cap and obtaining explicit user confirmation.

### Approach C: Plan-level model selection now, defer Codex effort to a later item

**Description:** Ship `bl-0738` as currently scoped, but explicitly carve out a follow-up backlog item for Codex `reasoning_effort` once we have more evidence of variance in auto-selection.

**When this is the right choice:** If we want to ship faster and gather more data on Codex auto-selection before committing to a plan-level mechanism.

**Tradeoffs:** Two-step delivery for what should arguably be one user-facing concept. Risk of the follow-up never landing.

### Chosen Direction

Approach B, with an **invocation-cap model**.

The project widens beyond the 2026-04-24 recast and covers both Claude model selection and Codex `reasoning_effort`. The scope remains prompt/skill/template guidance only; no CLI helper is required for the first pass.

This choice is driven primarily by user agency, not by conclusive evidence that Codex auto-selection is wrong or flat. The observed variance question is useful background, but not the deciding input: even good auto-selection is not reviewable at planning time unless the plan exposes the dispatch profile.

The key semantic choice: **the cap on dispatch tier is the orchestrator's current invocation tier, not a separately authored "plan default" field.** Whatever model/effort the user invoked OAT with at implementation time _is_ the ceiling for that run. Per-phase values are absolute target tiers, not deltas from any plan-level default.

Resolution rule:

1. **Cap = invocation tier.** Read at runtime from the orchestrator's current model/effort. Not authored in `plan.md`.
2. **Phase value (if set) = absolute target tier for that phase.**
3. **`auto` (or omitted) = no explicit OAT override.** The provider/runtime picks within the invocation envelope. Phases set to `auto` are not surfaced in the preflight scan.

OAT must never silently dispatch above the invocation cap. When `oat-project-implement` starts, it scans phase target tiers, surfaces every phase whose target exceeds the invocation tier, and asks for explicit user confirmation in batch. Per Codex's long-plan guardrail, the preflight UX should default toward downgrade-for-run or abort/reinvoke when many phases exceed cap; "approve specific" remains available but is not the primary path. Dry-run shows the flagged escalations without asking.

When a phase is **explicitly approved to escalate** above the cap, the approval is run-local — it covers implementation, review, re-review, and review-fix work for that phase at the approved tier, but does not authorize tiers above the approved tier and does not mutate `plan.md`. A retry that wants to exceed the approved tier fires the same gate again. Persistence of approvals across resume, if needed, lives in `implementation.md`, not the plan.

If escalation is denied or the agent remains blocked at the resolved tier, the orchestrator chooses a non-escalation response: provide missing context, stop for user input, split the task, or treat the plan as needing correction.

Concrete examples:

- **Invocation: sonnet, phase 4: haiku.** Below cap. Run at haiku. Reviews still run at sonnet (the cap), since review's "in scope" tier defaults to the cap.
- **Invocation: sonnet, phase 2: opus.** Above cap. Preflight surfaces phase 2 with its target and rationale, asks the user to approve / downgrade / abort. If approved, phase 2's implementation, reviews, re-reviews, and review-fixes all run at opus.
- **Invocation: opus, phase 7: auto.** Phase 7 not in preflight. Implementation dispatches with no explicit override. Reviews run at opus (the cap).
- **Invocation: opus, phase 2 approved for opus, retry blocks needing more.** Fresh gate fires. The original approval does not cover going above opus.

## Key Decisions

- **Widen scope to both providers.** The user-agency argument applies equally to Claude model selection and Codex `reasoning_effort`; keeping Codex opaque would preserve the exact asymmetry this project is meant to reduce.
- **Treat user agency as the dominant value driver.** Evidence about Codex auto-selection variance is not decisive; plan-level reviewability is.
- **Invocation tier is the implicit cap.** The cap on dispatch tier is read at runtime from the orchestrator's current model/effort. There is no separately authored "plan default" field.
- **Phase values are absolute target tiers.** They are not deltas from any other tier and they are not relative to the cap. They name the tier the user wants this phase to run at.
- **`auto` is truly auto.** No explicit override, no preflight flag. Phases set to `auto` (or omitted) defer to the provider/runtime within the invocation envelope and do not appear in the preflight table.
- **Preflight scan with batch gate.** When `oat-project-implement` starts, surface phases whose target tier exceeds the invocation cap and ask for explicit user confirmation. Default UX favors downgrade-for-run or abort/reinvoke over "approve all" when many phases are flagged.
- **Approval is run-local and tier-bounded.** Approving a phase to escalate expands that phase's cap to exactly the approved tier for the current run. Approval covers implementation, review, re-review, and review-fix dispatches for that phase at that tier. It does not authorize further escalation and does not mutate `plan.md`.
- **Review tier rule.** Reviews, re-reviews, and review-fix dispatches run at the highest tier currently in scope for that phase. "In scope" means the invocation cap by default, or the approved escalation tier for any phase the user has explicitly approved. Adapts Superpowers' "most capable available" with "available" reinterpreted as "within the user-reviewed envelope."
- **Authoring stays lightweight.** Prefer a sparse table-form expression in `plan.md`. Optional; phases default to `auto` when omitted.
- **Preserve Superpowers' quality-loop lesson.** Review loops are mandatory: reviewer findings require fixes and re-review.

## Constraints

- Scope stays at prompt/skill/template guidance only. No new CLI helpers in the first pass.
- Must not regress the existing `oat-project-implement` dispatch flow.
- Must not require users to author dispatch profiles when defaults are appropriate; `auto` (or omission) preserves existing behavior.
- Must not silently dispatch above the invocation cap. Escalation always requires explicit user confirmation.
- Must not mutate `plan.md` on approval. Approvals are run-local; persistence (if any) lives in `implementation.md`.
- Must keep the current bounded fix loop semantics intact; this project changes dispatch guidance, not retry-count behavior.

## Success Criteria

- `plan.md` has an optional, reviewable dispatch-profile expression that can set absolute target tiers per phase for Claude model and/or Codex `reasoning_effort`.
- A representative `oat-project-implement` run performs a preflight scan, surfaces every phase whose target tier exceeds the invocation cap, and obtains explicit user confirmation before dispatching above cap.
- The documented resolver preserves provider auto-selection when phases are set to `auto` or omitted, and does not surface `auto` phases in the preflight table.
- Reviews, re-reviews, and review-fix dispatches run at the highest tier currently in scope for the phase: the invocation cap by default, or the approved escalation tier for approved phases.
- Approvals are documented to be run-local, tier-bounded, and non-mutating to `plan.md`. Retries that would exceed the approved tier fire a fresh gate.
- Dry-run surfaces flagged escalations without asking.
- The guidance cites/adapts the local Superpowers reference for least-capable-sufficient model selection and review loops.

## Out of Scope

- Any CLI helper like `recommend-models` (deferred per original item).
- Schedule-preview tooling.
- Behavioral tuning of model selection beyond first-pass policy guidance.
- **Plan-level minimum tier (floor).** A field that asserts "this plan should not run on a tier weaker than X" is a real need (especially for broad refactors and architecture-sensitive work), but it is a separate concept from the invocation cap and adds authoring complexity. Deferred to a follow-up backlog item — recommend creating `bl-XXXX: minimum_dispatch_tier (plan floor)` when this project closes.
- Persistence of run-local approvals across resume. May land later in `implementation.md` if real workflows need it.

## Open Questions

- **Exact table shape:** What columns does the dispatch-profile table need? At minimum: phase ID, Claude model target, Codex `reasoning_effort` target, rationale. Should rationale be required or optional? Should we add a "risk/scope" column to inform the preflight summary?
- **Role scope:** Does the dispatch profile govern only `oat-phase-implementer` and phase `oat-reviewer`, or should it also cover final review and other agents such as `oat-codebase-mapper`?
- **Cross-provider field handling:** What should a Codex `reasoning_effort` value mean during a Claude run, and what should a Claude model value mean during a Codex run: ignored, mapped, or warned/rejected by guidance?
- **Retry-budget interaction:** When a retry redispatches at the same tier (or fires a fresh gate to escalate), does each redispatch count against the existing `oat_orchestration_retry_limit`? Likely yes — each redispatch is a fix-loop iteration — but worth confirming the wording.
- **Auto visibility in preflight:** Codex's recommendation is that `auto` phases should not appear in the preflight table. Acceptable for a first pass, but it means a user reviewing preflight has no signal about which phases are running on auto. Worth deciding whether a low-key "phases on auto: 3, 5, 8" footer adds value or just noise.
- **Advisory warnings on risky low-tier choices:** Should dispatch surface a soft advisory when a user explicitly sets a low tier (e.g., `haiku`) for broad or review-fix work, or is documentation enough for the first pass?

## Assumptions

- The dispatch transparency case is strong enough on its own merits to justify the authoring cost, _if_ expression in `plan.md` is lightweight enough.
- Provider auto-selection remains the recommended default; explicit overrides are opt-in.
- The orchestrator's current invocation tier is reliably knowable at runtime in both Claude Code and Codex contexts.
- A Claude orchestrator never dispatches a Codex phase (and vice versa), so the invocation cap is per-provider implicitly — there is no need for separate per-provider cap fields.
- Review and review-fix work usually warrants the highest tier in scope for the phase because it requires judgment against requirements, implementation, and prior findings.

## Risks

- **Hand-tuning regression:** Users specify effort levels that produce worse outputs than auto-selection.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Default to `auto`; surface preflight rationale at dispatch so users have a baseline before they override; consider an advisory on obviously risky low-tier choices for broad or review-fix work.
- **Asymmetry confusion:** Users expect parity between Claude model and Codex effort and are surprised when behavior differs.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Clear documentation in `oat-project-plan` describing how the same dispatch profile maps onto each provider.
- **Approve-all friction collapse:** On long plans with many flagged phases, "approve all" becomes too easy and defeats the user-agency intent.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Per Codex's guardrail, default the preflight UX toward downgrade-for-run or abort/reinvoke when many phases exceed cap; "approve specific" available but not primary; "approve all" should require an extra step proportional to the count.
- **Review underpowering:** A mechanical implementation phase starts low and review accidentally stays low.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Review tier rule is explicit: reviews run at the highest tier in scope for the phase, not the implementation tier.
- **Approval drift across resume:** A run-local approval is forgotten on resume and the user is re-prompted, or worse, an approval is silently re-applied without re-prompting.
  - **Likelihood:** Low
  - **Impact:** Low
  - **Mitigation Ideas:** Document run-local semantics explicitly; if real workflows require persistence later, add it to `implementation.md` as a separate concern.

## Next Steps

1. Confirm the design-depth choice for this quick-mode project (straight to plan, or lightweight design first).
2. Resolve the remaining open questions, ideally in design or at the start of planning.
3. Confirm requirements gate with user.
4. Generate `plan.md` with the selected dispatch-profile shape.
5. On project completion, file follow-up backlog item for `minimum_dispatch_tier` (plan floor).
