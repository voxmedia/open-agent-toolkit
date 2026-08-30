---
id: bl-53f0
title: 'Project-independent brainstorming mode'
status: closed # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
priority_reviewed: '2026-04-27'
scope: feature # idea | task | feature | initiative
scope_estimate: L # XS | S | M | L | XL | XXL
labels: ['workflow-design', 'ideas', 'brainstorming']
assignee: null
created: '2026-04-27T15:47:14Z'
updated: '2026-05-02T00:00:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

OAT has lightweight idea capture (`oat-idea-*`) and full project workflows (`oat-project-*`), but it does not have a first-class project-independent brainstorming mode for exploratory conversations that may or may not become a project.

The existing ideas workflow intentionally blocks formal requirements, technical design, and task planning so brainstorming stays lightweight. The collaborative-design-workflow project, meanwhile, imported a Superpowers-style collaborative discovery/design pattern into project workflows. This backlog item tracks the missing middle: a natural brainstorming skill/mode that can start without creating an OAT project, explore an idea with Superpowers-like conversational structure, and then end in the right durable state.

The invocation model should be **always-on**: the skill proactively checks whether the current conversation context warrants a brainstorming session and offers it without waiting for explicit invocation — following the `superpowers:brainstorming` pattern. Signals include exploratory phrasing ("I've been thinking about X", "what if we did Y"), open-ended design questions, or any moment where the user is clearly thinking out loud rather than requesting implementation. The session then concludes by offering one of the outcomes below.

The set of available outcomes depends on which OAT tool packs are installed in the current repo. The skill must detect installed packs and only surface terminal states that are actually available — the base behavior (inline only + write-to-user-path) must work in any repo, including those with no OAT tool packs enabled.

**Always available (no tool pack required):**

- **Inline only** — no artifact, ephemeral conversation closure.
- **Brainstorming document at a user-specified path** — write a synthesized brainstorming document to any path the user names: in-repo (e.g., `docs/`, a project scratchpad), out-of-repo (e.g., a Stoa vault note, a personal scratchpad), or even a research target with no codebase home. This is the universal fallback that makes the skill useful regardless of which packs are installed or whether the brainstorm has any target inside the current repo.

**Requires the ideas tool pack:**

- Capture or update an OAT idea via `oat-idea-new` / `oat-idea-scratchpad` (`.oat/ideas` or `~/.oat/ideas`).
- Extend an existing idea with the brainstorm transcript via `oat-idea-ideate`.
- Summarize into the ideas backlog via `oat-idea-summarize`.

**Requires the project management tool pack:**

- Create a backlog item via `oat-pjm-add-backlog-item` when the brainstorm produced a discrete, scoped piece of work worth tracking but not yet a full project. Distinct from idea capture: ideas are vague/exploratory, backlog items are scoped/shippable.

**Requires the project workflows tool pack:**

- Promote the brainstorm into a new OAT project, seeding discovery with the conversation context.
- Transition into the active project's discovery/design phase when the brainstorm fits a project already in flight.

**Off-repo / external targets are first-class.** The brainstorm may target something outside the current repository entirely — a research task, an external doc, a personal vault, a project that lives in another repo. The skill should treat external destinations as a normal outcome category (handled via the user-specified path mechanism above), not an afterthought.

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
- The skill **detects which OAT tool packs are installed** in the current repo and only surfaces terminal states that are actually available; pack-gated outcomes do not appear when the corresponding pack is missing.
- The skill **always supports two base outcomes** regardless of installed packs: stay inline only, and write a brainstorming document to a user-specified path (in-repo or external). This guarantees the skill is useful in any repo.
- When the **ideas pack** is installed, the skill can capture, extend, or summarize via `oat-idea-*` skills.
- When the **project management pack** is installed, the skill can produce a scoped backlog item directly via `oat-pjm-add-backlog-item`. Backlog item is a distinct terminal state from idea capture (scoped/shippable vs vague/exploratory).
- When the **project workflows pack** is installed, the skill can seed a new OAT project from the brainstorming transcript or synthesized summary, or transition into an active project's discovery/design phase.
- **External / off-repo targets** are first-class: the user-specified path mechanism supports paths outside the current repository (vaults, scratchpads, research targets) without requiring integration with each external system.
- The workflow clearly distinguishes lightweight ideation from formal project discovery/design, including when to stay in `oat-idea-*` versus when to transition to `oat-project-*`.
- The design evaluates whether to extend `oat-idea-ideate`, add a new `oat-brainstorm`/`oat-project-brainstorm` skill, or introduce a provider mode that can hand off to existing skills.
- The workflow accounts for both project-level and global/user-level brainstorming.
- The relationship to `bl-b3f7` is documented so idea promotion work does not duplicate the brainstorming-mode responsibilities.
- At least one dogfood scenario covers each terminal state available in this repo: ephemeral inline, brainstorming document at user-specified path, captured idea, summarized idea, backlog item, promoted project, and external/off-repo target.
