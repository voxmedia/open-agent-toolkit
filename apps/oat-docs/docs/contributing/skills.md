---
title: Writing Skills
description: 'Contributor guide to authoring OAT skills, including runtime contracts, governance, and where to start.'
---

# Writing Skills

Use this page when you are creating or updating OAT skills in `.agents/skills`.

Skill behavior is defined by frontmatter plus the process contract in each `SKILL.md`. The goal is to make lifecycle behavior explicit, reviewable, and reusable across sessions.

## Where Skills Live

- Canonical skills live in `.agents/skills`
- `AGENTS.md` is the session-facing registry and should stay aligned with skill frontmatter
- OAT project and review artifacts should reference skill names consistently

## Authoring Priorities

- Make the mode and purpose explicit.
- Keep prerequisites and expected artifacts concrete.
- Spell out blocked vs allowed activities for state-advancing skills.
- Define user-facing progress indicators for longer workflows.
- Keep output obligations explicit so downstream skills and users know what changed.

## Contract components

- Mode assertion (purpose, blocked/allowed activities)
- Preconditions and required artifacts
- User-facing progress indicator expectations
- Output obligations
- Escalation/guardrail behavior

## Frontmatter fields in active use

- `name`
- `description`
- `version`
- `disable-model-invocation`
- `user-invocable`
- `allowed-tools`

## Practical Authoring Flow

1. Decide whether you are adding a general reusable skill or an OAT-specific lifecycle skill.
2. Add or update the skill under `.agents/skills/<name>/SKILL.md`.
3. Keep the `AGENTS.md` skills registry synchronized with the new frontmatter.
4. Update related docs or lifecycle references if the skill changes user-visible behavior.

## Governance rules

- Prefer skill-first invocation language.
- Keep `AGENTS.md` skills table synchronized with `.agents/skills`.
- Require explicit user approval for destructive or state-advancing transitions.

## Recommended Starting Points

- Use `create-oat-skill` when the new skill belongs to an OAT lifecycle or maintenance flow.
- Use `create-agnostic-skill` when you want a reusable workflow skill that is not OAT-specific.
- Use existing lifecycle skills as examples for progress banners, prerequisites, and artifact updates.

## Reference artifacts

- `.agents/skills/*/SKILL.md`
- `AGENTS.md`
- `.agents/skills/oat-project-implement/SKILL.md`
- `.agents/skills/oat-project-complete/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md`
