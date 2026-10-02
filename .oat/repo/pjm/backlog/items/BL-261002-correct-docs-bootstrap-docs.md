---
id: BL-261002-correct-docs-bootstrap-docs
title: Correct docs-bootstrap, docs-apply, and docs-analyze skill contracts
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - docs
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:08.520Z
updated: 2026-10-02T18:41:08.520Z
associated_issues: []
external_plans: []
---

## Description

Contract defects in the docs skills (read in the skill text and scaffold):

- **E12. `oat-docs-bootstrap`.** Step 7b passes an "approved subset" that
  `oat-docs-apply` has no input for; it says `setup-docs.sh` creates a venv
  (it only runs `pip install`); it says the MkDocs docs index is
  `docs/index.md` (the scaffold sets `mkdocs.yml`); and it treats
  `documentation.tooling` as an object (it is a string).
- **E13.** The `allowed-tools` lists of `oat-docs-apply` and `oat-docs-analyze`
  omit tools the skills run (`oat`, `pnpm`, the tracking script).

Why it matters: the bootstrap-to-apply handoff cannot carry the user's
approval choices, a user following the venv claim installs into the wrong
Python environment, and hosts that enforce `allowed-tools` block the skills
mid-run.

Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/03-docs-tooling-flow.verify.md` and
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/F-config-scopes-packs-docs.verify.md`.
Related, not a duplicate: BL-260911-make-docs-bootstrap-a-front (approval
classes in analyze/apply).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry E12, E13.

## Acceptance Criteria

- Bootstrap's Step 7b hands off in a form `oat-docs-apply` accepts (or apply
  gains a documented input for an approved subset), coordinated with
  BL-260911-make-docs-bootstrap-a-front.
- Bootstrap's statements about `setup-docs.sh`, the MkDocs index location and
  `documentation.tooling` match the scaffold and config schema.
- `allowed-tools` for apply and analyze include every tool their steps run.
- Each changed skill's `metadata.version` is bumped.
