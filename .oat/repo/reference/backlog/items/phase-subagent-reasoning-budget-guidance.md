---
id: bl-0738
title: 'Define per-phase model selection guidance for phase-subagent dispatch'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
priority_reviewed: '2026-04-24'
scope: feature # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels:
  - workflow/implementation
  - provider/codex
  - provider/anthropic
  - topic/model-selection
assignee: null
created: '2026-04-17T20:34:12Z'
updated: '2026-04-24T00:00:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

Define explicit **model-selection** guidance for phase-level dispatch in `oat-project-implement`, with one consistent orchestration rule across Codex and Claude-family providers: vary the dispatched model by phase complexity and retry state, and surface the rationale to the user so the choice is legible rather than arbitrary.

This item was originally framed as "reasoning budget" guidance, but the actual harness constraints are:

- **Claude-family via Claude Code Agent/Task tool:** the dispatcher picks a model (`haiku | sonnet | opus`). There is no per-dispatch thinking-budget parameter exposed to skills; extended thinking exists in the raw Anthropic API but is not controllable from a skill invocation.
- **Codex CLI:** `reasoning_effort` can be expressed per plan phase, but Codex already auto-chooses a reasonable effort tier. The value of authoring an explicit override is primarily transparency, not behavioral change.

So the scope narrows to: pick the right model per phase, with provider-appropriate expression, and make that choice visible.

Keep the scope focused on prompt, skill, and template guidance only:

- agent defaults on `oat-phase-implementer`
- orchestration guidance in `oat-project-implement` (how plan-level/phase-level hints resolve to a dispatched model)
- optional complexity or model hint columns in `plan.md`
- brief planning guidance in `oat-project-plan` that includes model-selection rationale

No CLI helper in the first pass. A `recommend-models` command can be revisited later if manual authoring or execution review proves error-prone.

## Acceptance Criteria

- Define a first-pass policy for mapping phase complexity to a dispatched model on Claude-family providers (`haiku` for trivial/scaffolding, `sonnet` for typical phases, `opus` for cross-cutting or high-risk phases).
- Describe how the same policy maps onto Codex, noting that `reasoning_effort` is auto-chosen by default and that explicit overrides are for user transparency rather than behavioral correction.
- Require the dispatch step to surface the chosen model and the reason to the user (e.g., "Dispatching phase 2 with `sonnet` — standard complexity, single-file scope").
- Specify the minimal file changes needed to support the first pass in:
  - `.agents/agents/oat-phase-implementer.md`
  - `.agents/skills/oat-project-implement/SKILL.md`
  - `.oat/templates/plan.md`
  - `.agents/skills/oat-project-plan/SKILL.md`
- Define precedence rules for resolved model choice: plan-level override > phase-level hint > agent default.
- Document default escalation rules for implementer, reviewer, and fix-loop redispatch (e.g., escalate one tier on retry).
- Keep any CLI helper or schedule-preview command explicitly out of scope for this item unless later evidence shows the manual workflow is insufficient.

## Priority Review (2026-04-24)

Recast from "reasoning-budget" to "model-selection" to match actual harness capabilities. Kept at medium priority — the change is clarifying rather than behavioral, and it unblocks consistent phase dispatch without needing code changes.
