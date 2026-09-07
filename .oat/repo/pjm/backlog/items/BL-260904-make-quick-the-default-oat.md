---
id: BL-260904-make-quick-the-default-oat
title: Make quick the default OAT workflow mode and spec-driven the explicit
  larger mode
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - workflow-modes
  - cli
  - skills
  - docs
assignee: null
created: 2026-09-04T20:35:55.819Z
updated: 2026-09-04T20:35:55.819Z
associated_issues: []
external_plans: []
---

## Description

Today the workflow modes are spec-driven and quick, with spec-driven implicitly the primary mode and quick the lighter alternative. With the planned lite mode (see project lite-workflow-mode) the ladder becomes lite, quick, spec-driven, and quick is the mode most work should land in. Rename or re-default so that quick is the default workflow mode and spec-driven is the explicit escalation for larger, higher-ambiguity work. This is a repo-wide rename sweep: CLI mode enum and scaffold defaults, the Feature Planning Triage table in AGENTS.md, every skill that names the modes, templates, docs, tests, and a migration path for existing state.md files. Surfaced during the lite-workflow-mode brainstorm on 2026-09-04 and deliberately kept out of that project's scope.

## Acceptance Criteria

- `oat project new <slug>` with no `--mode` flag scaffolds a quick-mode project, and `--mode` is documented as required only to select `lite` or `spec-driven`.
- The Feature Planning Triage section in `AGENTS.md` and the docs app present the mode ladder as lite, quick (default), spec-driven, with the recommendation heuristic updated to match.
- Every canonical skill under `.agents/skills` that names `quick` or `spec-driven` reflects the new default, with a frontmatter version bump per changed skill, and provider views are refreshed via `oat sync --scope all`.
- Existing `state.md` files with `oat_workflow_mode: quick` or `spec-driven` continue to load without migration errors; any renamed value has a documented migration path exercised by a test.
- Templates, scaffold fixtures, and CLI tests assert the new default; `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, and `pnpm release:validate` pass.
- The lockstep public package versions are bumped together in the same PR, since bundled skills, templates, and docs are shipped CLI functionality.
