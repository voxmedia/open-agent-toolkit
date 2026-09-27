---
id: BL-260927-expose-a-scoped-template
title: Expose a scoped template resolver command and route lifecycle skills through it
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - templates
  - cli
  - skills
  - user-scope
assignee: null
created: 2026-09-27T03:35:36.485Z
updated: 2026-09-27T03:35:36.485Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/296
external_plans: []
---

## Description

About nine lifecycle skills (project-retro, discover, design, plan, spec, summary, quick-start, import-plan, promote-spec-driven) copy `.oat/templates/<name>.md` directly. A user-scope `oat tools install workflows` puts templates under `$HOME/.oat/templates/` and creates no repository `.oat/templates/`, so those paths do not exist (reproduced 2026-09-26). Two internal resolvers exist and disagree on precedence: `resolveTemplateSource` in `commands/project/new/scaffold.ts` checks user, then repository, then bundle; `resolvePjmTemplate` in `commands/pjm/template-source.ts` checks repository, then user, then bundle. No command exposes either. The ideas skills already use a scope-aware `TEMPLATES_ROOT`. Source: GitHub issue #296.

## Acceptance Criteria

- One documented precedence order is shared by the project scaffold, PJM, and the new command, and the choice is recorded.
- A CLI command resolves a named template, supports `--json`, and returns a clear not-found result without package-manager paths.
- Lifecycle skills that copy templates call the resolver instead of assuming `.oat/templates/`, with skill version bumps.
- Tests cover repository override, user-scope-only, and bundle-only resolution with an isolated `HOME`.
