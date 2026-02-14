# Execution Contracts

Skill contracts are defined in each `SKILL.md` frontmatter and process sections.

## Common contract points

- Mode assertion and purpose
- Allowed vs blocked activities
- Progress indicator expectations
- Required artifacts and guardrails
- Output requirements

## Frontmatter fields in use

- `name`
- `description`
- `disable-model-invocation`
- `user-invocable`
- `allowed-tools` (for hosts that enforce this)

## Governance notes

- Use skill-first invocation language in docs and templates
- Keep `AGENTS.md` skills table synchronized with `.agents/skills`
- Prefer explicit user approval for potentially destructive transitions
