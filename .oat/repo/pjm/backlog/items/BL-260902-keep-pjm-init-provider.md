---
id: BL-260902-keep-pjm-init-provider
title: Keep pjm init provider pointers out of documentation content trees
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - pjm
  - cli
  - docs
  - instruction-sync
assignee: null
created: 2026-09-02T23:48:35.398Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/238
external_plans: []
---

## Description

`oat pjm init` writes `CLAUDE.md` pointer files (`@AGENTS.md`) into source directories, including documentation content trees, which breaks every consumer that treats the tree as pages: docs validators, `oat docs generate-index`, and MDX site builds. PR #244 already taught `oat pjm doctor` to accept the repo-level pointers; this item covers placement. Skip or opt out of pointer writes under the configured `documentation` docs directory and any directory whose `AGENTS.md` is itself an indexed page. Source: GitHub issue #238.

## Acceptance Criteria

- `oat pjm init` does not write `CLAUDE.md` pointer files inside the configured `documentation` docs directory or inside any directory whose `AGENTS.md` is an indexed documentation page.
- A documented opt-out lets a repository exclude additional directories from pointer placement without editing generated files by hand.
- Running `oat pjm init` in a fixture with a documentation tree leaves the docs validator, `oat docs generate-index`, and an MDX-style frontmatter check clean.
- Existing repo-level pointers (`.oat/repo/CLAUDE.md`, `.oat/repo/reference/CLAUDE.md`) keep passing `oat pjm doctor` as PR #244 established.
- Focused tests cover docs-directory skipping, the opt-out, and idempotent re-runs.
