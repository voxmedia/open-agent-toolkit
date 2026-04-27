---
id: bl-53f0
title: 'Project-independent brainstorming mode'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
priority_reviewed: '2026-04-27'
scope: feature # idea | task | feature | initiative
scope_estimate: L # XS | S | M | L | XL | XXL
labels: ['workflow-design', 'ideas', 'brainstorming']
assignee: null
created: '2026-04-27T15:47:14Z'
updated: '2026-04-27T00:00:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

OAT has lightweight idea capture (`oat-idea-*`) and full project workflows (`oat-project-*`), but it does not have a first-class project-independent brainstorming mode for exploratory conversations that may or may not become a project.

The existing ideas workflow intentionally blocks formal requirements, technical design, and task planning so brainstorming stays lightweight. The collaborative-design-workflow project, meanwhile, imported a Superpowers-style collaborative discovery/design pattern into project workflows. This backlog item tracks the missing middle: a natural brainstorming skill/mode that can start without creating an OAT project, explore an idea with Superpowers-like conversational structure, and then end in the right durable state.

The invocation model should be **always-on**: the skill proactively checks whether the current conversation context warrants a brainstorming session and offers it without waiting for explicit invocation — following the `superpowers:brainstorming` pattern. Signals include exploratory phrasing ("I've been thinking about X", "what if we did Y"), open-ended design questions, or any moment where the user is clearly thinking out loud rather than requesting implementation. The session then concludes by offering the outcome choices below.

Possible outcomes from a brainstorming session:

- Stay inline only, with no artifact created when the user wants a purely ephemeral conversation.
- Capture or update an OAT idea (`.oat/ideas` or `~/.oat/ideas`) when the thought is worth preserving but not ready for project workflow.
- Summarize an idea into the ideas backlog.
- Promote the brainstorm into a new OAT project, seeding discovery with the conversation context.
- Transition into project discovery/design when the work becomes concrete enough for formal tracking.

This should be separate from `bl-b3f7` (idea promotion and auto-discovery). `bl-b3f7` starts from an already summarized idea and improves promotion into projects. This item starts earlier: it defines the brainstorming experience itself and its terminal-state choices.

Related context:

- Existing idea skills: `.agents/skills/oat-idea-new/SKILL.md`, `.agents/skills/oat-idea-ideate/SKILL.md`, `.agents/skills/oat-idea-summarize/SKILL.md`
- Existing promotion backlog: `.oat/repo/reference/backlog/items/idea-promotion-auto-discovery.md`
- Related project workflow work: `.oat/projects/shared/collaborative-design-workflow/`
- Superpowers reference material: `.oat/projects/shared/collaborative-design-workflow/reference/superpowers-brainstorming.md`

## Acceptance Criteria

- A project-independent brainstorming skill or mode is defined with explicit entry points, blocked activities, allowed activities, and terminal states.
- The skill is **always-on**: it proactively offers brainstorming when conversational context signals exploratory intent (open-ended questions, "thinking out loud" phrasing, design uncertainty) rather than waiting for explicit invocation.
- The workflow supports starting without an active OAT project and without immediately creating an idea artifact.
- The workflow offers clear capture choices when the conversation becomes worth preserving: inline only, scratchpad, idea discovery, summarized idea, or new OAT project.
- The workflow can seed a new OAT project discovery from the brainstorming transcript or synthesized summary without requiring the user to restate context.
- The workflow clearly distinguishes lightweight ideation from formal project discovery/design, including when to stay in `oat-idea-*` versus when to transition to `oat-project-*`.
- The design evaluates whether to extend `oat-idea-ideate`, add a new `oat-brainstorm`/`oat-project-brainstorm` skill, or introduce a provider mode that can hand off to existing skills.
- The workflow accounts for both project-level and global/user-level brainstorming.
- The relationship to `bl-b3f7` is documented so idea promotion work does not duplicate the brainstorming-mode responsibilities.
- At least one dogfood scenario covers each terminal state: ephemeral inline, captured idea, summarized idea, and promoted project.
