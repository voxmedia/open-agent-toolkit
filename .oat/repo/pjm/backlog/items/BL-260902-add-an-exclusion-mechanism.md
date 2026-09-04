---
id: BL-260902-add-an-exclusion-mechanism
title: Add an exclusion mechanism to oat docs generate-index
status: open
priority: medium
scope: feature
scope_estimate: S
labels:
  - docs
  - cli
assignee: null
created: 2026-09-02T23:48:37.046Z
updated: 2026-09-03T00:08:42Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/239
external_plans:
  - .oat/repo/reference/external-plans/2026-09-02-add-exclusions-to-docs-index-generation.md
---

## Description

`oat docs generate-index` indexes every Markdown file under `--docs-dir` as a page and offers no way to exclude non-page files, so downstream repositories post-process the tracked manifest to keep it honest. Add a repeatable `--exclude <glob>` option and a documented `documentation` config key that the command honors, with tests for glob, directory, and config-sourced exclusions. Source: GitHub issue #239; the docs-index path plan (BL-260718) explicitly scopes this out.

## Acceptance Criteria

- `oat docs generate-index --exclude <glob>` is repeatable and omits matching files from the generated index.
- A `documentation` config key supplies default exclusions that the command honors without flags, and CLI flags extend rather than replace them.
- `oat docs generate-index --help` and the docs-tooling reference document both mechanisms.
- Focused tests cover glob exclusion, directory exclusion, config-sourced exclusion, and the unchanged default when nothing is excluded.
- The change does not alter the path-resolution behavior owned by BL-260718-fix-oat-docs-generate-index.
