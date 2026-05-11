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
- Define a pre-work capability and authorization gate for skills that delegate to subagents, workers, or reviewers.
- Keep output obligations explicit so downstream skills and users know what changed.

## Contract components

- Mode assertion (purpose, blocked/allowed activities)
- Preconditions and required artifacts
- User-facing progress indicator expectations
- Delegation capability detection and fallback behavior, when the skill dispatches helper agents
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

## Delegation-Capable Skills

Skills that dispatch subagents, workers, reviewers, or fresh-context helper sessions need a capability model before work starts. Do not assume delegation is available, and do not silently downgrade just because the runtime needs user authorization.

At minimum, the skill contract should:

- Probe whether the host can dispatch the required helper role(s).
- Distinguish `available`, `authorization required`, and `not resolved`.
- Ask once at skill start when authorization is required, with the approval scope stated clearly.
- Lock the selected tier for the run unless the user explicitly changes execution mode.
- Stop before side effects if delegation is required for correctness and authorization remains unresolved.
- Document the fallback path and any quality or independence tradeoff.

Use `create-agnostic-skill` or `create-oat-skill` as the starting point; both include the current delegation guidance and optional capability-detection template.

## Reading project state

Skills that need fields from the active project's `state.md` (e.g. `phase`, `phaseStatus`, `workflowMode`, `docsUpdated`, `lastCommit`) MUST query the CLI instead of hand-parsing YAML with `grep`/`awk`.

For one field, use `--field`:

```bash
WORKFLOW_MODE=$(oat project status --field project.workflowMode 2>/dev/null || echo null)
```

If the skill is reading a resolved project path instead of the active project pointer, add `--project-path`:

```bash
WORKFLOW_MODE=$(oat project status --project-path "$PROJECT_PATH" --field project.workflowMode 2>/dev/null || echo null)
```

For multiple fields, use `--shell` so the CLI reads project state once and emits shell-safe assignments:

```bash
eval "$(oat project status --shell \
  PHASE=project.phase \
  PHASE_STATUS=project.phaseStatus \
  WORKFLOW_MODE=project.workflowMode 2>/dev/null)"
```

Skill snippets assume `oat` is available on `PATH`. Environments without a global install, including CI or cloud runners, can provide an `oat` shim backed by `npx`:

```bash
mkdir -p .oat/bin
cat > .oat/bin/oat <<'EOF'
#!/usr/bin/env bash
exec npx @open-agent-toolkit/cli "$@"
EOF
chmod +x .oat/bin/oat
export PATH="$PWD/.oat/bin:$PATH"
```

Create the shim once per checkout or CI job instead of putting `command -v oat` fallback branches in every skill. The same snippet also supports setups where `oat` is intentionally provided on `PATH` by `npx`.

The JSON output is a stable contract: the field set consumed by migrated skills is locked by `MIGRATED_FIELDS` in `packages/cli/src/commands/project/status.test.ts`, so removing or renaming any of those keys is a real test failure rather than a silent runtime break. See [CLI Reference](../reference/cli-reference.md) for the full locked field set.

## Reference artifacts

- `.agents/skills/*/SKILL.md`
- `AGENTS.md`
- `.agents/skills/oat-project-implement/SKILL.md`
- `.agents/skills/oat-project-complete/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md`
