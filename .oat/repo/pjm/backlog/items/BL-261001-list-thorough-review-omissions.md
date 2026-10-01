---
id: BL-261001-list-thorough-review-omissions
title: List thorough-review omissions in recon Review Downgrades
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - recon
  - skills
assignee: null
created: 2026-10-01T20:42:43.108Z
updated: 2026-10-01T20:42:43.108Z
associated_issues: []
external_plans: []
---

## Description

Deferred from the Wave 3 exit gate (`reviews/archived/final-review-2026-10-01T203319Z.md`,
M2). `render-packet.mjs` (around 127) derives "not reviewed" omissions only
from semantic, adversarial, and coverage reviews. In the thorough profile a
redundant-verification brief can list a claim the review leaves without a
disposition; the packet validates and the claim stays `unresolved`, but
Review Downgrades does not list it, contradicting `packet-contract.md` (around
396). The omission-gap protocol stays retired; this is a rendering fix.

## Acceptance Criteria

- Omitted claims are derived from every incorporated assurance review and its
  immutable brief membership (thorough kinds included) and listed as "not
  reviewed"; claims outside a review's brief are not labelled omissions.
- A validated thorough-profile packet test covers it beside the core omission
  test.
