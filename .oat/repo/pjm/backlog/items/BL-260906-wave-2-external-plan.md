---
id: BL-260906-wave-2-external-plan
title: Wave 2 external-plan corrections for the program refresh
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - pjm
  - external-plans
assignee: null
created: 2026-09-06T08:58:02.840Z
updated: 2026-09-06T08:58:02.840Z
associated_issues: []
external_plans: []
---

## Description

Corrections the wave-2 reviews queued for the external plans, to land in the wave-close program-refresh commit: repair-bundled-skill-contract-drift.md step 2 'one named contract group' wording and the wrong claim that analyze is unpinned (p01 m3); require-named-lifecycle-skills-to-be-loaded.md ten-skill executor list under-counts (thirteen carried directives), named focused tests omit review-skill-contracts.test.ts and autonomy-gate-inventory.test.ts, Dependencies row PR #190 head (p04); document-patch-and-restore-for-lost-child-handles.md step 5 autonomy-contract refresh is conditional, landing row and stale skills.test.ts anchors (p05 m5); harden-codex-skill-anaphora-guard.md record the anaphor-only ruling and the fail-open filler boundary as the accepted shape (p02).

## Acceptance Criteria

- [ ] `2026-08-30-repair-bundled-skill-contract-drift.md`: step 2 wording matches the shipped per-defect contract groups and the `analyze` pin is named in the in-scope files
- [ ] `2026-08-30-require-named-lifecycle-skills-to-be-loaded.md`: executor list names all thirteen skills, the named focused tests include `review-skill-contracts.test.ts` and `autonomy-gate-inventory.test.ts`, and the PR #190 dependency row cites the current head
- [ ] `2026-09-02-document-patch-and-restore-for-lost-child-handles.md`: step 5 is stated as conditional on prompt-site changes, the landing row is current, and the `skills.test.ts` anchors are re-verified
- [ ] `2026-08-30-harden-codex-skill-anaphora-guard.md`: records the anaphor-only ruling and the fail-open filler boundary as the accepted shape
- [ ] All four corrections land in one program-refresh commit that also updates the execution program's revalidation log
