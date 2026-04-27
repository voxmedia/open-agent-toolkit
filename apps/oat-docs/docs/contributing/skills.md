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

## Reading project state

Skills that need fields from the active project's `state.md` (e.g. `phase`, `phaseStatus`, `workflowMode`, `docsUpdated`, `lastCommit`) MUST query the CLI's JSON contract instead of hand-parsing YAML with `grep`/`awk`. The canonical inline preamble — including the `npx @open-agent-toolkit/cli` fallback for environments without `oat` on `$PATH` — lives in [`.agents/skills/create-oat-skill/SKILL.md`](https://github.com/open-agent-toolkit/open-agent-toolkit/blob/main/.agents/skills/create-oat-skill/SKILL.md) under the "Reading project state" section. Paste it verbatim and select fields with `jq -r '.project.<field>'` (no `// ""` defaults — YAML `null` surfaces as the literal string `null` to match the prior parser).

The JSON output is a stable contract: the field set consumed by migrated skills is locked by `MIGRATED_FIELDS` in `packages/cli/src/commands/project/status.test.ts`, so removing or renaming any of those keys is a real test failure rather than a silent runtime break. See [CLI Reference](../reference/cli-reference.md) for the full locked field set.

## Reference artifacts

- `.agents/skills/*/SKILL.md`
- `AGENTS.md`
- `.agents/skills/oat-project-implement/SKILL.md`
- `.agents/skills/oat-project-complete/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md`
