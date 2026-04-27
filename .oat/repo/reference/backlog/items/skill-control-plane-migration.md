---
id: bl-281c
title: 'Migrate skills to control-plane-backed CLI with cloud-env fallback'
status: open
priority: medium
priority_reviewed: '2026-04-27'
scope: initiative
scope_estimate: M
labels: [skills, control-plane, cli, refactor, cloud]
assignee: null
created: '2026-04-10T00:00:00Z'
updated: '2026-04-27T00:00:00Z'
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

- [x] A migration pattern is documented for skills: bash snippet with `oat` detection and `npx @open-agent-toolkit/cli` fallback — landed in `.agents/skills/create-oat-skill/SKILL.md` "Reading project state" section (skill-cli-migration project, 2026-04-27)
- [x] A first-pass candidate list is agreed — the seven `state.md` grep consumers shipped under skill-cli-migration: `oat-project-progress`, `oat-project-pr-progress`, `oat-project-plan`, `oat-project-pr-final`, `oat-project-review-provide`, `oat-project-reconcile`, `oat-project-complete`
- [ ] Each migrated skill replaces manual `state.md` / `plan.md` / `implementation.md` parsing with a single `oat project status --json` call (or similar) where the skill is purely a read consumer — `state.md` slice complete; `plan.md` and `implementation.md` parsing in skills NOT yet migrated
- [x] All migrated skills detect the `oat` binary at invocation time and fall back to `npx @open-agent-toolkit/cli` when unavailable — canonical `if command -v oat ... else npx ...; fi` preamble in the seven migrated skills
- [x] A smoke test confirms migrated skills work in an environment without global `oat` installed (cloud-env parity) — exercised end-to-end in skill-cli-migration p04-t02 (Run B with `oat` removed from `$PATH` returned `quick`, exit 0). Also locked at the contract level by `MIGRATED_FIELDS` in `packages/cli/src/commands/project/status.test.ts`.
- [x] Skills that both read and write state are explicitly left untouched in this pass and tracked separately — write paths in `oat-project-plan`, `oat-project-pr-final`, `oat-project-reconcile`, `oat-project-complete` were left untouched per discovery scope guard
- [x] Documentation updated to describe the invocation pattern and when to use control-plane CLI commands vs direct file reads — `apps/oat-docs/docs/contributing/skills.md` "Reading project state" + `apps/oat-docs/docs/reference/cli-reference.md` JSON-contract annotation + `.oat/repo/reference/current-state.md` "Skill state reads" bullet

## Remaining Scope (2026-04-27)

The state.md slice is shipped. Remaining work for bl-281c:

- Migrate skills that consume `plan.md` and/or `implementation.md` via grep/awk — equivalent JSON read surface needs to land first (or a CLI reader added). Decide: extend `oat project status --json` with plan/implementation fields, OR ship a separate `oat project plan --json` / `oat project implementation --json` command, OR keep these skills on direct file reads if the JSON layer is overkill for write-adjacent flows.
- Migrate the named candidates not covered by the state.md grep scan: `oat-project-next`, `docs-completed-projects-gap-review`, plus any other bootstrap-heavy skills that resolve active project state without grepping `state.md`.
- Cross-skill consistency sweep: a few migrated skills retain dead bash defaults (e.g., `${WORKFLOW_MODE:-spec-driven}`) that no longer fire because the JSON path emits the literal string `null`. Optional cleanup; not behavioral.
- Plan-template recipe fix: the skill-cli-migration plan's literal `env PATH="/usr/bin:/bin"` recipe for fallback verification fails on nvm-managed hosts (excludes `npx`). Replace with a portable PATH-trim that strips only the `oat`-bearing dir for any future similar verification.

## Priority Review (2026-04-27)

Reduced to **medium** after the strategic state.md slice shipped under skill-cli-migration. The high-leverage portion (cloud-env fallback pattern + canonical preamble + JSON contract test) is now in place, so the residual is incremental rather than blocking. Re-elevate if a future project needs the plan.md/implementation.md JSON read surface.

## Priority Review (2026-04-24)

Bumped to **high**. Delivers three compounding values at once: cloud-environment parity (implicit blocker for remote agent use), determinism/reduced duplication in skill bootstrap, and lower token usage per skill invocation. Also produces the measurement baseline that gates `bl-931d`. This is the top strategic item in the current backlog.
