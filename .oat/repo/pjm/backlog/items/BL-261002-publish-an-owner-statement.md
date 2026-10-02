---
id: BL-261002-publish-an-owner-statement
title: Publish an owner statement on project stability, support, and non-goals
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - docs
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:16.046Z
updated: 2026-10-02T18:41:16.046Z
associated_issues: []
external_plans: []
---

## Description

The docs overhaul left one item only the repository owner can write: a
statement, in the owner's own words, of the project's stability level, what
support adopters can expect, and its non-goals. The adoption persona review
asked for a maturity, stability and non-goals page (finding F-26 in
`.oat/projects/shared/docs-improvement-overhaul/reviews/p06-persona-adoption-initial.md`),
and the editorial consensus left it to the owner (R1 in
`.oat/projects/shared/docs-improvement-overhaul/references/editorial-consensus.md`).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry G3.

## Acceptance Criteria

- The owner writes a short stability, support and non-goals statement.
- It is published on a docs page linked from the docs front door (and the
  README if appropriate), and `pnpm build:docs` passes.
