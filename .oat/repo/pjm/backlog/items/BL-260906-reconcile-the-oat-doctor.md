---
id: BL-260906-reconcile-the-oat-doctor
title: Reconcile the oat-doctor example table with its inventory sentence
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - skills
assignee: null
created: 2026-09-06T08:30:44.036Z
updated: 2026-09-06T08:30:44.036Z
associated_issues: []
external_plans: []
---

## Description

p01 review m2 (wave 2, deferred). The `oat-doctor` SKILL.md example output lists the same pack under both the installed section and the available-to-install section, so the example describes a state the doctor never reports (a pack is either installed or available). The wave-2 repair fixed the inventory counts and pinned pack membership; it did not remove the both-installed-and-available contradiction. Rewrite the example so each pack appears in exactly one section and pin that property.

## Acceptance Criteria

- [ ] No pack name appears in both the installed and the available example sections of `oat-doctor/SKILL.md`
- [ ] The doctor example assertion in `packages/cli/src/validation/skills.test.ts` fails when a pack is listed in both sections (neutralization recorded)
- [ ] Example counts still agree with `PACK_MANIFEST`
