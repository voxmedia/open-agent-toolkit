---
id: BL-261002-correct-docs-bootstrap-docs
title: Correct docs-bootstrap, docs-apply, and docs-analyze skill contracts
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - docs
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:08.520Z
updated: '2026-10-24T19:01:57Z'
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

## Closure evidence — 2026-10-24

E12 scaffold/config corrections shipped in [PR #368](https://github.com/voxmedia/open-agent-toolkit/pull/368),
with the exact artifact-plus-approved-IDs handoff in [PR #371](https://github.com/voxmedia/open-agent-toolkit/pull/371).
Bootstrap Step 7b:884–896 matches apply's input; bootstrap:835 correctly says
setup-docs.sh installs into the selected Python without creating/activating a
venv; :655–657/:747–754 match mkdocs.yml and string tooling. Accepted p01-t02
retains the original source-cited correction table and skill bumps.

Residual E13/p03 Gate-L2 is now corrected by p09-t01 commit
0d5b09247e885251a0a4f60fa2f33cf0bf8875b2: analyze header grants
command -v, sed, npm root -g, test and oat --version for its existing offline
shim procedure (:622–640). Existing pnpm/node/bash/jq/tracking grants and apply
grants remain; analyze nav-sync remains --check only. Analyze bumps 1.7.4→1.7.5;
no runtime code/test hook changes. Fresh isolated-HOME sentence/validation
contracts pass 1087/1087; existing analyze drift test passes. Prior E12/procedure
proof is inherited; all nine p09 gates are recorded in the phase journal.

Evidence: [docs-skills-ia-367 implementation](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/implementation.md),
[approved brief](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/plan.md) and
[issue #367 delivery checklist](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/references/issue-367-delivery-checklist.md).
P09 prepares OAT closure; root retains final acceptance/review and delivery.
