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

p01 review m2 (wave 2, deferred). The oat-doctor SKILL.md example output table shows pack counts that disagree with the inventory sentence above it in one row. Reconcile the example with the PACK_MANIFEST-derived counts and extend the doctor example membership assertion in packages/cli/src/validation/skills.test.ts to cover the denominators.

## Acceptance Criteria

- [ ] The `oat-doctor` example output table agrees with the inventory sentence for every pack row
- [ ] The doctor example membership assertion in `skills.test.ts` also checks each row's denominator against `PACK_MANIFEST`
- [ ] Neutralization recorded: editing one example denominator fails the assertion
