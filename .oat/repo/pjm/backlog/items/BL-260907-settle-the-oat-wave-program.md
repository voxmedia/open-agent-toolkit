---
id: BL-260907-settle-the-oat-wave-program
title: Settle the oat-wave-program ledger status vocabulary
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - skills
  - wave-program
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:41.826Z
updated: 2026-09-07T14:05:41.826Z
associated_issues: []
external_plans: []
---

## Description

oat-wave-program/SKILL.md documents the ledger status flow as composed → in-progress → merged at one point and instructs the final row to flip to `done` at two others (lines near :66 versus :116/:124 at wave-5 time); the readiness contract shipped by wave-5 p07 tolerates both spellings only because the producing skill contradicts itself. Pick one vocabulary in the skill (bump + pin) and tighten the p07 contract to it.

## Acceptance Criteria

- [ ] `oat-wave-program/SKILL.md` uses one terminal vocabulary for the program ledger and is bumped once
- [ ] The readiness contract test in `skills-bundled-docs-contract.test.ts` accepts only that vocabulary and the execution program conforms
