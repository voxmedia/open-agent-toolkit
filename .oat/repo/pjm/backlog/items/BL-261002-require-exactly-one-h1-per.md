---
id: BL-261002-require-exactly-one-h1-per
title: Require exactly one H1 per docs page in docs:validate
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - docs-tooling
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T19:38:42.235Z
updated: 2026-10-02T19:38:42.235Z
associated_issues: []
external_plans: []
---

## Description

Four skill guides (research, brainstorm, diagnostics, session-closeout) shipped without an H1 in the docs overhaul and only a rendered tour found it. The docs app's markdownlint config disables MD025, frontmatter hides MD041, and apps/oat-docs/scripts/validate.ts has no heading rule. Fixed for those pages in 7f508e58a. Source: docs-improvement-overhaul retro RP-03.

## Acceptance Criteria

- `pnpm docs:validate` fails when a docs page has no H1 or more than one,
  naming the file.
- A self-contained fixture test in `apps/oat-docs/tests/` covers zero, one and
  two H1s, and fails if the check is neutralized.
- All current pages pass.
