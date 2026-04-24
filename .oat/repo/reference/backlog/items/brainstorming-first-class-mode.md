---
id: bl-8487
title: 'Elevate brainstorming to a first-class mode with three outcome paths'
status: open
priority: low
priority_reviewed: '2026-04-24'
scope: initiative
scope_estimate: L
labels: ['skills', 'ideas', 'brainstorming', 'ux']
assignee: null
created: '2026-04-24T00:00:00Z'
updated: '2026-04-24T00:00:00Z'
associated_issues: []
oat_template: false
---

## Description

Today, brainstorming in OAT is entangled with project discovery — you have to create a project to enter the brainstorming/discovery flow, which forces a premature commitment. The direction here is to elevate brainstorming to a first-class mode that can auto-trigger (in the shape of the Superpowers brainstorming skill) and route to one of three outcomes depending on where the thinking lands.

### The three outcome paths

1. **Inline** — the brainstorm is for the task the user is actively working on, right now. No persistent artifact; the output flows into whatever in-progress work prompted it.
2. **Idea** — the brainstorm is worth capturing but the user doesn't know yet what to do with it. Route to the existing ideas infrastructure (`oat-idea-*`).
3. **Project** — the brainstorm matured into something concrete enough to ship. Promote to an OAT project (this is the narrow scope currently tracked by `bl-b3f7`).

### Desired invocation model

Modeled on the `superpowers:brainstorming` skill: the skill determines "this is worth brainstorming" from context rather than requiring the user to declare intent up front. The user says "I've been thinking about X" or "what if we did Y" and the skill recognizes the opening, runs a structured exploration, and then offers the three-way outcome choice at the end.

### Relationship to existing items

- `bl-b3f7` (idea → project promotion) is the narrow "outcome 3" path. It was created before this broader framing existed. Once this item is in motion, `bl-b3f7` is likely absorbed or superseded.
- The ideas pipeline (`oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`) is the "outcome 2" destination and largely exists; the work is routing and seeding rather than building it from scratch.

### When to start

**Deferred until the collaborative design project ships.** The collaborative design work is expected to formalize the discovery/design-phase conversational patterns this flow depends on, and building both in parallel risks divergent contracts. Revisit the scope and effort estimate once that project is in review.

### Open design questions (for when this starts)

- Does brainstorming have its own skill (`oat-brainstorm`?) or is it a mode of an existing skill?
- How does auto-triggering work without becoming annoying — what signal in user messages reliably indicates "this is brainstorming" vs "implement this"?
- How does the inline outcome reconcile with in-progress project state — does it write anywhere, or is it purely conversational?
- Does the outcome decision happen at the end (after the brainstorm) or up front (with optional re-routing)?

## Acceptance Criteria

- A brainstorming mode exists that can be invoked explicitly AND auto-triggered from conversational cues (modeled on `superpowers:brainstorming`).
- The mode concludes by offering three clear outcome paths: inline (no artifact), idea capture, or project promotion.
- Routing to the idea path integrates with the existing `oat-idea-*` skill family and seeds the idea with the brainstorm output.
- Routing to the project path handles handoff to `oat-project-new` with brainstorm content as discovery seed (absorbs or collaborates with `bl-b3f7`).
- The inline path does not require any persistent artifact and exits cleanly back to the prior conversation.
- Design doc defines the auto-triggering heuristics and when the user should be asked vs. implicitly routed.

## Priority Review (2026-04-24)

New item at low priority, explicitly deferred behind the collaborative design project. The direction feels right but committing before the design-phase conversational patterns are settled would create rework.
