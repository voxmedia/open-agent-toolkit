---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-12
oat_generated: false
oat_template: false
---

# Design: subagent-model-selection

## Overview

The dispatch-selection feature adds lightweight guidance for phase-level model and reasoning-effort choices in OAT. The first pass is prompt/skill/template guidance only: no CLI helper, no runtime package code, and no schedule-preview feature.

The design pivots away from planner-generated Dispatch Profile rows and invocation-cap preflight. Codex cannot reliably determine the current active model or reasoning effort from inside the agent. Because of that, OAT should not build approval and resolver semantics around a value that may only exist as a UI/session setting outside the skill's reach.

Instead, OAT adopts the Superpowers-style policy:

- Implementation dispatch uses the **lowest available model/effort that can confidently complete the phase**.
- The orchestrator logs the chosen tier and rationale before dispatch.
- If confidence is low, a subagent reports reasoning blockage, or repeated review cycles fail, the orchestrator escalates to a more capable available tier.
- Reviews, re-reviews, and review-fix evaluation use the **most capable available tier** unless explicitly constrained.
- `plan.md` may contain an optional `## Dispatch Profile`, but only as a user-authored override/constraint surface. The planner does not generate default rows.

This keeps the useful user-facing property (tier decisions are visible) while removing brittle precomputed tier math.

## Revision 2: Two-axis dispatch logging (2026-05-13)

After implementation and final review, dogfooding surfaced a follow-up gap: the original single-axis `dispatch_control` field collapsed model selection and reasoning-effort into one label, and used `host-auto` whenever any axis was not exposed. That hid the fact that Claude Code's Task tool exposes model selection even though it does not expose a separate `reasoning_effort` control, so dispatches could log `host-auto` while a real per-subagent `model` parameter went unused.

The contract evolved to two independent axes, each with one of four states:

- `selected:<value>` — host exposes the axis and the orchestrator chose a value.
- `inherited` — host exposes the axis and the orchestrator deliberately defers to the parent session.
- `not-applicable` — this host/API has no meaningful per-dispatch concept for that axis.
- `host-auto` — exceptional; the host uses the axis internally but the orchestrator cannot read or pin it.

The orchestrator skill (`.agents/skills/oat-project-implement/SKILL.md`) is the canonical reference for the current contract. The following subsections of this design document use the original single-axis vocabulary and should be read with the two-axis contract in mind:

- Section 3.2, "Runtime selection" — the dispatch decision block now records `model_axis` and `effort_axis` instead of a single `dispatch_control` field. The dispatch log examples at the end of Section 3.2 reflect the pre-revision shape; current examples live in the orchestrator skill.
- Section 3.5, "`oat-reviewer` guidance" — reviewer dispatch is now `model_axis=inherited, effort_axis=inherited` on every host. The original statement that Codex hosts without per-dispatch reviewer effort should log `host-auto` is superseded.
- Error Handling, "Host does not expose model/effort controls" — `host-auto` is now per-axis; `not-applicable` is the right label when an axis has no concept on the host, such as Claude Code `reasoning_effort`.
- Testing Strategy, "Host-auto only" row — read the scenario as axis-specific: the unavailable axis logs `not-applicable` or `host-auto` per the contract, while the other axis logs `selected:<value>` or `inherited` as appropriate.

Revision 2 is documentation-only relative to the design's chosen direction: override-only profile plus runtime selection. The underlying policy is unchanged.

## Architecture

### Approach

The feature is implemented by updating existing guidance surfaces:

- `plan.md` template: documents optional override-only Dispatch Profile syntax.
- `oat-project-plan-writing`: describes when override rows are appropriate and avoids planner-generated tier proposals.
- `oat-project-implement`: chooses and logs runtime dispatch tiers, escalates when confidence/outcomes require it, and records meaningful dispatch history in `implementation.md`.
- `oat-phase-implementer`: reports confidence and reasoning blockage clearly.
- `oat-reviewer`: runs review work at the strongest available tier unless explicitly constrained.
- `oat-project-import-plan`: preserves imported override rows and treats foreign model/effort hints as constraints or rationale signals.
- `oat-project-review-provide`: flags risky or malformed explicit override rows during plan review.

There is no new resolver component. The orchestrator owns runtime judgment at dispatch time.

### Lifecycle placement

```text
plan.md
  optional user-authored Dispatch Profile overrides
       |
       v
oat-project-implement
  reads phase scope, any override rows, and host capabilities available to the session
  chooses the lowest confident implementation tier
  logs choice + rationale
       |
       +--> oat-phase-implementer
       |      reports DONE / concerns / low confidence / BLOCKED
       |
       +--> oat-reviewer
              runs at strongest available tier unless constrained
```

### Key decisions

- **Runtime selection, not planner prediction.** Tier choice happens when the implementation context and host capability are real.
- **Override-only plan surface.** The Dispatch Profile is optional and user-authored. A missing row means "runtime selects"; it is not an implicit `auto` row that needs review.
- **Availability is host-defined.** The skill should use provider controls that the current host actually exposes. If the host does not expose model/effort controls, OAT logs that runtime selection is delegated to the host default/auto behavior.
- **Transparency is dispatch-time.** Every dispatch line should say what tier/control is being used and why, even when the host is auto-selecting.
- **Escalation is outcome-driven.** Escalate after low confidence, reasoning blockage, or repeated review failures, not because the planner predicted a cap crossing.
- **Review is judgment-heavy.** Review work defaults to the strongest available tier because it evaluates requirements, implementation, and previous findings.

## Component Design

### 3.1 Dispatch Profile table in `plan.md`

**Purpose:** Optional user-authored constraints or preferences for phase dispatch.

**Format:**

```markdown
## Dispatch Profile

_Optional. Use only for explicit user constraints or preferences. Omit this section when runtime selection should choose the lowest confident tier._

| Phase | Claude model              | Codex effort                   | Rationale                     |
| ----- | ------------------------- | ------------------------------ | ----------------------------- |
| pNN   | haiku\|sonnet\|opus\|auto | low\|medium\|high\|xhigh\|auto | why this constraint is needed |
```

**Rules:**

- `Phase` must match a real phase ID in the plan (`pNN`).
- A blank or `auto` provider cell means "no explicit constraint for that provider."
- A phase not in the table uses runtime selection.
- Rationale is optional but strongly recommended. Low-tier or high-tier constraints without rationale should be reviewed carefully.
- The section is omitted by default. Plan authors should not emit routine generated rows.

**Semantics:**

- A row is a user preference/constraint, not a planner recommendation.
- The current provider reads only its own column. The other provider's column is preserved as data for portability.
- If the host cannot enforce a requested tier, the orchestrator logs the mismatch and continues with the closest host-supported behavior, unless the row is written as a hard constraint in future syntax. Hard constraints are out of scope for the first pass.

### 3.2 Runtime selection in `oat-project-implement`

**Purpose:** Choose a dispatch tier at the moment work is sent to a phase implementer.

**Inputs:**

- `phase_id`
- phase task list and file scope from `plan.md`
- workflow mode and artifact set
- optional Dispatch Profile row for the phase
- host-exposed provider controls, if any
- prior run/review outcomes for the phase, if retrying

**Output:** a dispatch decision block:

```text
phase: p03
dispatch_control: {provider-specific tier or "host-auto"}
rationale: resolver/preflight guidance touches orchestration flow and downstream review behavior
confidence: high | medium | low
```

**Selection policy:**

1. If a valid override row applies and the host can honor it, use that requested tier/control.
2. If no override row applies, choose the lowest available tier/control that can confidently complete the phase:
   - mechanical, 1-2 files, clear scope -> cheaper/faster tier
   - multi-file integration/debugging/pattern matching -> standard tier
   - architecture, broad orchestration behavior, review-fix reasoning -> strongest available tier
3. If the host does not expose explicit controls, use `host-auto` and log the rationale that would have informed selection.
4. If confidence is low, start at the stronger available tier rather than knowingly underpowering the phase.

**Dispatch log examples:**

```text
Dispatching p01 with low/haiku: template + plan-writing edits are mechanical and file-local.
Dispatching p03 with xhigh/opus: orchestration dispatch policy affects review/fix loops and downstream agents.
Dispatching p02 with host-auto: Codex host does not expose a per-dispatch effort control here; rationale would map to standard effort.
```

### 3.3 Escalation flow

Escalation is triggered by evidence that the current dispatch control is insufficient.

**Triggers:**

- Implementer reports `LOW_CONFIDENCE` or `BLOCKED` because more reasoning/capability is needed.
- The same phase fails review twice for substantive correctness or requirement-alignment issues.
- The orchestrator detects that a fix loop is repeating the same class of error.

**Resolution:**

1. If a more capable available tier/control exists, re-dispatch at the next stronger tier.
2. Log the escalation and reason: `p03 escalated to xhigh after repeated review failures`.
3. Count the redispatch against the existing bounded retry budget.
4. If already at the strongest available tier/control, do not invent another tier. Provide more context, split the task, stop for user input, or mark the plan as needing correction.

No approval gate is required for ordinary escalation because the runtime only uses tiers available to the current host/session. If a future host supports billable or policy-sensitive escalation controls, that should be designed separately as host capability policy, not as the default OAT plan model.

### 3.4 `oat-phase-implementer` guidance

The phase implementer does not choose its own model. It receives whatever dispatch control the orchestrator used.

Required prompt additions:

- Report confidence in the phase summary (`high`, `medium`, `low`).
- If blocked because more reasoning/capability is needed, say so explicitly and include the current dispatch control if known.
- Do not keep retrying at the same capability when the issue is reasoning capacity rather than missing context.

### 3.5 `oat-reviewer` guidance

Review work should run at the strongest available tier/control unless the user explicitly constrained it.

Rationale:

- Review requires comparing implementation to requirements, design, plan, tests, and previous findings.
- Underpowered reviews create false confidence and compound workflow cost.
- This follows the Superpowers rule that architecture, design, and review use the most capable available model.

For Codex hosts that do not expose a per-dispatch reviewer effort control, the orchestrator logs `host-auto` and includes the rationale for review-strength preference.

### 3.6 Plan-writing guidance

`oat-project-plan-writing` owns the canonical plan syntax.

Changes:

- Add the override-only Dispatch Profile format.
- State that planners should omit the section by default.
- Remove the planner proposal step.
- Warn that routine hand-tuning can make outcomes worse than runtime/host selection.
- Explain that override rows are appropriate only when a user has a concrete constraint or preference, such as "this phase is intentionally cheap/scaffold-only" or "this phase must run strongest available because it changes orchestration behavior."

### 3.7 Import-plan handling

`oat-project-import-plan` handles three cases:

1. **Existing OAT-format Dispatch Profile:** preserve rows as user-authored constraints/preferences and mention preservation in the import summary.
2. **Foreign model/effort hints:** map them into the Dispatch Profile only when they look like explicit user constraints; otherwise preserve them as rationale notes and let runtime selection decide.
3. **No hints:** omit Dispatch Profile entirely.

The import flow does not generate recommendations.

### 3.8 Plan-review advisory

`oat-project-review-provide artifact plan` reviews explicit override rows only. Missing rows are normal and should not be flagged.

**Important findings:**

- Invalid phase ID that does not match a real phase.
- Unknown tier value in the active provider column.
- Low-tier override for a multi-file integration, architecture, or review-heavy phase.
- Low-tier override with missing or generic rationale.

**Medium findings:**

- Malformed but recoverable table structure where intent is mostly clear.
- Mid-tier override for architecture-heavy work without a convincing rationale.

**Minor findings:**

- Rationale is present but does not clearly tie to phase scope.

**Silent cases:**

- No Dispatch Profile section.
- High-tier overrides with clear rationale.
- Provider column for a provider not used in the current run, unless malformed syntax threatens portability.

## Data Models

### Dispatch Profile row

Stored as a Markdown table row in `plan.md`.

Fields:

- `Phase`: `pNN`, required
- `Claude model`: `haiku | sonnet | opus | auto | blank`
- `Codex effort`: `low | medium | high | xhigh | auto | blank`
- `Rationale`: free text

The first pass does not add hard/soft constraint syntax. All rows are treated as preferences/constraints that OAT should honor when the host can support them.

### Dispatch decision log

The dispatch decision is written to the live session output. When practical, `oat-project-implement` also records a compact phase-level note in `implementation.md`:

```markdown
- Dispatch: p03 used xhigh/opus because orchestration policy affects downstream review/fix flow.
```

This log is execution history. It must not mutate `plan.md`.

## Error Handling

### Host does not expose model/effort controls

Use `host-auto`, log the rationale that would have informed the choice, and continue. Do not claim a specific model or effort was selected if the host does not expose that control.

### Override cannot be honored

If the host cannot honor a requested tier/control:

- Log the mismatch before dispatch.
- Continue with host-supported behavior unless the user stops the run.
- Record the mismatch in `implementation.md` phase notes.

### Malformed override row

- Invalid phase ID: ignore the row for dispatch, log a warning, and expect plan review to flag it as Important.
- Unknown active-provider tier: ignore that cell, log a warning, and expect plan review to flag it as Important.
- Unknown inactive-provider tier: preserve for portability but expect plan review to flag it if syntax is clearly invalid.

### Repeated failure at strongest available tier

Stop the phase. Do not continue to subsequent phases as if stronger dispatch would solve it. The next response is one of:

- provide missing context
- split the phase
- revise the plan
- ask the user for direction

## Testing Strategy

This is a prompt/skill/template guidance project. Verification is by file inspection and scenario walkthroughs.

### Scenario walkthroughs

| Scenario                  | Setup                                          | Expected behavior                                                     |
| ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| No Dispatch Profile       | Plan has no `## Dispatch Profile`              | Runtime chooses lowest confident tier and logs rationale.             |
| Mechanical phase          | 1-2 file template edit                         | Dispatch chooses cheap/fast tier when host supports it.               |
| Architecture phase        | Orchestrator policy changes                    | Dispatch chooses strongest available tier.                            |
| Host-auto only            | Codex host does not expose per-dispatch effort | Log `host-auto` plus rationale; do not claim a specific effort.       |
| User override honored     | Valid pNN row with supported tier              | Dispatch uses requested tier and logs override rationale.             |
| User override unsupported | Valid row, host cannot enforce                 | Log mismatch, use host-supported behavior, note in implementation.    |
| Malformed row             | Unknown tier or invalid phase                  | Ignore malformed row for dispatch, log warning, plan review flags.    |
| Low confidence            | Implementer reports low confidence             | Re-dispatch at more capable available tier if possible.               |
| Repeated review failure   | Phase fails review twice for correctness       | Escalate if possible; otherwise stop and revise/split.                |
| Review dispatch           | Phase implementation complete                  | Reviewer runs strongest available tier or `host-auto` with rationale. |

### Plan-review advisory dry runs

Construct small fixture plans with:

- no Dispatch Profile section
- valid high-tier override
- low-tier override on cross-cutting phase
- unknown tier value
- invalid phase ID
- malformed but recoverable table

Expected: only explicit risky/malformed rows are flagged.

### What is not tested

- Whether provider `auto` choices are objectively optimal.
- Token cost or time-savings claims.
- Host-specific ability to force a particular model/effort when the host does not expose that control.

## Open Questions

- Should dispatch decision logs become mandatory `implementation.md` entries in the first pass, or only best-effort notes?
- Should a future syntax distinguish hard constraints from soft preferences?
- Should low-tier overrides for review work be rejected instead of flagged?

## References

- Discovery: `discovery.md`
- Plan template: `.oat/templates/plan.md`
- Canonical plan-writing skill: `.agents/skills/oat-project-plan-writing/`
- Entry skills: `.agents/skills/oat-project-plan/`, `.agents/skills/oat-project-quick-start/`, `.agents/skills/oat-project-import-plan/`
- Implementation orchestrator: `.agents/skills/oat-project-implement/`
- Phase implementer agent: `.agents/agents/oat-phase-implementer.md`
- Reviewer agent: `.agents/agents/oat-reviewer.md`
- Superpowers reference: `/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/archived/collaborative-design-workflow/reference/superpowers-subagent-driven-development.md`
- Backlog item: `.oat/repo/reference/backlog/items/phase-subagent-reasoning-budget-guidance.md` (bl-0738)
