---
id: BL-261002-split-the-tool-packs-page
title: Split the Tool Packs page and restructure the Workflow Gates and Dispatch
  Policy pages
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - docs
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:14.885Z
updated: 2026-10-02T18:41:14.885Z
associated_issues: []
external_plans: []
---

## Description

Documentation residuals left after the docs overhaul (not product defects):

- **G1.** `getting-started/tool-packs.md` is a ~45k-character specification
  listed under Getting Started. It needs a split into a short guide (what
  packs exist, which to install, scopes) and a reference page.
- **G2.** `workflows/advanced/workflow-gates.md` and
  `workflows/advanced/dispatch-ceiling.md` are mostly implementer contracts.
  Decision guidance now has "In short" pointers, but both pages need
  restructuring into user guidance first and contract detail after (or in a
  separate reference page).

Why it matters: new users land on a specification when they expect a
getting-started guide, and the gate and dispatch pages bury the decisions a
user has to make.

Applies to the docs branch `docs-overhaul-readme-visual` (or `main` once merged).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry G1, G2.

## Acceptance Criteria

- Tool Packs has a short Getting Started guide and a separate reference page;
  inbound links are updated and the generated docs index is regenerated.
- Workflow Gates and Dispatch Policy open with user decision guidance, with
  implementer contracts moved below or into reference pages.
- `pnpm build:docs` and markdownlint pass, and `oat docs generate-index` is
  rerun.
