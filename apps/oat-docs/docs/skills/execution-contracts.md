---
title: Execution Contracts
description: 'Skill runtime contracts: frontmatter fields, mode assertions, preconditions, and governance.'
---

# Execution Contracts

Skill contracts are defined by frontmatter + process sections in each `SKILL.md`.

## Contract components

- Mode assertion (purpose, blocked/allowed activities)
- Preconditions and required artifacts
- User-facing progress indicator expectations
- Output obligations
- Escalation/guardrail behavior

## Frontmatter fields in active use

- `name`
- `description`
- `disable-model-invocation`
- `user-invocable`
- `allowed-tools`

## Governance rules

- Prefer skill-first invocation language.
- Keep `AGENTS.md` skills table synchronized with `.agents/skills`.
- Require explicit user approval for destructive or state-advancing transitions.

## Reference artifacts

- `.agents/skills/oat-project-implement/SKILL.md`
- `.agents/skills/oat-project-complete/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md`
- `.oat/repo/reference/decision-record.md`
