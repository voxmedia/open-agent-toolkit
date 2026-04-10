---
id: bl-281c
title: 'Migrate skills to control-plane-backed CLI with cloud-env fallback'
status: open
priority: medium
scope: initiative
scope_estimate: L
labels: [skills, control-plane, cli, refactor, cloud]
assignee: null
created: '2026-04-10T00:00:00Z'
updated: '2026-04-10T00:00:00Z'
associated_issues: []
oat_template: false
---

## Description

The control-plane package (`packages/control-plane/`, PR #38) introduced a read-only state inspection layer that the CLI exposes via `oat project status --json`, `oat project list --json`, and `oat config dump --json`. However, no existing skills have been migrated to consume these commands — they still do 5-8 manual file reads and regex-based frontmatter parsing on every invocation to resolve active project, check phase status, read task progress, and scan reviews.

This item captures the follow-up migration work to replace that bootstrap boilerplate with control-plane-backed CLI calls, plus a related cloud-environment concern that surfaced during workflow-friction planning.

### Scope: skill migration

Good candidates for migration (read-only state consumers):

- `.agents/skills/oat-project-progress/SKILL.md`
- `.agents/skills/oat-project-next/SKILL.md`
- `.agents/skills/docs-completed-projects-gap-review/SKILL.md`
- Bootstrap sections (active project resolution, phase/status reads) in most `oat-project-*` skills

Explicitly **out of scope** for the first pass:

- Skills that both read AND write state (e.g., `oat-project-implement` — its writes still need direct file mutation)
- Non-project markdown parsing (e.g., skill frontmatter validation in `packages/cli/src/validation/skills.ts`)
- Skill registry parsing

The migration should follow the guidance from the PR #38 follow-up discussion: "use control plane for read-only OAT project state; keep direct file reads for mutation workflows and for non-project markdown domains."

### Scope: cloud-environment fallback

Currently, skills invoke `oat` directly (e.g., `oat config get activeProject`). In cloud environments where OAT isn't installed globally (mobile agents, ephemeral runtime sandboxes, fresh CI containers), these calls fail silently or hard-error, forcing the skill into brittle fallback paths.

As part of the migration, skills should be refactored to use a consistent invocation pattern that falls back to `npx @open-agent-toolkit/cli` when the `oat` binary isn't available. Rough shape:

```bash
if command -v oat >/dev/null 2>&1; then
  OAT="oat"
else
  OAT="npx --yes @open-agent-toolkit/cli"
fi

PROJECT_STATE=$($OAT project status --json)
```

This pattern (or a shell helper sourced by skills) should be documented and applied consistently across migrated skills. Any new skill that invokes CLI commands should adopt the same pattern.

### Prior context

- PR #38 (`feat: add control-plane project state inspection surfaces`) — established the control-plane package and CLI commands
- Workflow-friction project (`.oat/projects/shared/workflow-friction/`) — deliberately scoped to exclude this migration to keep its change set focused on behavioral prompt-skipping
- CLI agent's framing (see PR #38 discussion): prefer control plane for repo code, prefer CLI JSON commands for skill/runtime workflows, limit first pass to read-only status consumers

## Acceptance Criteria

- [ ] A migration pattern is documented for skills: bash snippet with `oat` detection and `npx @open-agent-toolkit/cli` fallback
- [ ] A first-pass candidate list is agreed (starting with the 3 named above plus any obvious bootstrap-heavy skills)
- [ ] Each migrated skill replaces manual `state.md` / `plan.md` / `implementation.md` parsing with a single `oat project status --json` call (or similar) where the skill is purely a read consumer
- [ ] All migrated skills detect the `oat` binary at invocation time and fall back to `npx @open-agent-toolkit/cli` when unavailable
- [ ] A smoke test confirms migrated skills work in an environment without global `oat` installed (cloud-env parity)
- [ ] Skills that both read and write state are explicitly left untouched in this pass and tracked separately
- [ ] Documentation updated to describe the invocation pattern and when to use control-plane CLI commands vs direct file reads
