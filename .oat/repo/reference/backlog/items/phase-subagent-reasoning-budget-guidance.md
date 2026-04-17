---
id: bl-0738
title: 'Define reasoning-budget guidance for phase-subagent dispatch'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels:
  - workflow/implementation
  - provider/codex
  - provider/anthropic
  - topic/model-selection
assignee: null
created: '2026-04-17T20:34:12Z'
updated: '2026-04-17T20:34:12Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

Define explicit reasoning-budget guidance for phase-level dispatch in `oat-project-implement`, with one consistent orchestration rule across Codex and Claude-family providers: keep the model fixed, and vary the thinking depth by phase complexity and retry state.

The remaining design question is not whether to switch models, but how to express and document portable effort tiers. The guidance should map the same policy onto provider-specific controls:

- Codex: `reasoning_effort`
- Claude-family providers: thinking budget / extended thinking control

Keep the scope focused on prompt, skill, and template guidance:

- agent defaults on `oat-phase-implementer`
- orchestration guidance in `oat-project-implement`
- optional complexity or effort-default hints in `plan.md`
- brief planning guidance in `oat-project-plan`

Do not require a CLI helper in the first pass. A `recommend-models` helper can be revisited later if manual authoring or execution review proves error-prone.

## Acceptance Criteria

- Define a first-pass policy that keeps the model fixed and varies reasoning budget or thinking depth by phase complexity.
- Describe how the policy maps to Codex as well as Claude-family providers, including what happens on providers that expose different effort controls or naming.
- Specify the minimal file changes needed to support the first pass in:
  - `.agents/agents/oat-phase-implementer.md`
  - `.agents/skills/oat-project-implement/SKILL.md`
  - `.oat/templates/plan.md`
  - `.agents/skills/oat-project-plan/SKILL.md`
- Define the precedence rules for resolved effort choice, such as plan-level override, phase-level hint, and agent default.
- Document default escalation rules for implementer, reviewer, and fix-loop redispatch.
- Keep any CLI helper or schedule-preview command explicitly out of scope for this item unless later evidence shows the manual workflow is insufficient.
