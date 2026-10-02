---
id: BL-261002-make-explainer-kit-accept-or
title: Make explainer-kit accept or reject source-code inputs explicitly
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - explainer-kit
  - skills
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:09.757Z
updated: 2026-10-02T18:41:09.757Z
associated_issues: []
external_plans: []
---

## Description

`explainer-kit --inputs` collects only `.md`, `.txt`, `.html` and `.json`
files and silently skips source code. A directory containing only source fails
with `Generated fact base is invalid: min-items`. The engineer-tour recipe's
`codebase` source role (`accepts: directory|git`, max 1 binding) is not
enforced anywhere found; only schema validation of the recipe exists
(`scripts/lib/recipes.mjs`).

Why it matters: the documented engineer-tour example passes
`--inputs docs/architecture.md src/api` expecting "source-backed explanations
of the main flows"; the source directory is ignored without a message, and a
source-only run fails with an error that does not say why.

Reproduced. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/skill-guides-family-A.verify.md` (explainer-kit
rows).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry E14.

## Acceptance Criteria

- Source files passed through `--inputs` are either ingested for recipes that
  declare a `codebase` role, or reported by name as skipped.
- A source-only input produces an actionable error naming the skipped files
  and the accepted types.
- The `codebase` role's constraints are enforced (or removed from the recipe),
  with a test for a file passed where a directory is expected.
- The skill's `metadata.version` is bumped and the engineer-tour guidance on
  the docs branch `docs-overhaul-readme-visual` (`skills/explainer-kit.md:198-214`) matches the behavior.
