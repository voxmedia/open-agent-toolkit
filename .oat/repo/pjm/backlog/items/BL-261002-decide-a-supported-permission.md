---
id: BL-261002-decide-a-supported-permission
title: Decide a supported permission setup for unattended cross-runtime review
status: open
priority: medium
scope: idea
scope_estimate: M
labels:
  - gates
  - reviews
  - needs-discussion
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:13.673Z
updated: 2026-10-02T18:41:13.673Z
associated_issues: []
external_plans: []
---

## Description

Unattended cross-runtime review (a gate that launches another runtime as
reviewer) either stalls on the reviewing tool's permission prompts or needs a
provider permission-bypass flag in a user-written exec target. No narrower
allowlist is documented or tested.

Why it matters: teams that want automated independent review must choose
between a review that hangs and one that runs the reviewer with all
permissions bypassed.

Recorded in the defect list as a first-run finding; no separate lane report
with a reproduction was found when this item was filed, so treat the details
as unverified until the first acceptance step confirms them.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry F4.

## Acceptance Criteria

- The stall and the bypass requirement are first reproduced with an
  unattended gate run per provider, and the result is recorded here.
- A decision is recorded on the supported permission posture for unattended
  reviewers per provider (Claude, Codex, Cursor).
- For each supported provider, a minimal allowlist (read-only tools plus the
  review-artifact write) is documented and tested in an unattended gate run
  that completes without prompts and without a bypass flag, or the item
  records why that is not possible.
- `workflows/advanced/workflow-gates.md` on the docs branch `docs-overhaul-readme-visual` documents the supported
  setup.
