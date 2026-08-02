---
id: BL-260727-ship-mit-notices-inside
title: Ship MIT notices inside distributed packages
status: closed
priority: high
scope: task
scope_estimate: S
labels:
  - licensing
  - packaging
  - explainer-kit
assignee: null
created: 2026-07-27T04:19:38.490Z
updated: '2026-07-28T02:28:23Z'
associated_issues: []
external_plans: []
---

## Description

NOTICES.md at the repo root records provenance for adapted external code, but it is not included in the published CLI package, so distributed artifacts carry adapted MIT-licensed code without the accompanying copyright and permission notice. The upstream MIT license for Nico Bailon's visual-explainer (https://github.com/nicobailon/visual-explainer) requires the copyright line and permission notice to accompany copies or substantial portions; Obra Superpowers and shadcn/improve are in the same position. The current repo-level notice summarizes provenance rather than reproducing the required text.

## Acceptance Criteria

- Each adapted upstream source's full MIT text — copyright line and permission
  notice, not a summary — is reproduced in the repo, with the upstream
  repository URL recorded alongside it.
- The notice file is present in the published package payload, verified by
  inspecting `npm pack` output rather than the working tree.
- The lockstep publishable packages that carry adapted code all ship it, so a
  consumer installing the CLI receives the notice.
- A release check fails if adapted-code attribution is missing from the package
  payload, so this cannot silently regress.
