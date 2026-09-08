---
id: BL-260907-route-quick-mode-discovery
title: Route quick-mode discovery rows in oat-project-next and oat-project-progress straight to quick-start
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - skills
  - lifecycle
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:35.545Z
updated: 2026-09-08T16:55:27.000Z
associated_issues: []
external_plans: []
---

## Description

After wave-5 p03 (2026-09-02-route-incomplete-quick-projects-to-quick-start.md) the quick-mode `plan` rows in oat-project-next route incomplete quick plans to oat-project-quick-start, but the quick-mode `discovery` rows still target oat-project-plan, which now forwards to quick-start: a two-hop route rather than a dead end. The same stale row survives in oat-project-progress's routing table (`| discovery | complete | oat-project-plan |`, whose sibling `plan` rows p03 did rewrite), leaving that table inconsistent with itself and with picking-up-projects.md. Point the discovery rows in both skills at quick-start directly and pin them in the load-contract test (both skills are already bumped in the wave-5 PR; the fix needs one bump each in its own PR).

## Acceptance Criteria

- [ ] The quick-mode `discovery` rows in `oat-project-next/SKILL.md` and the `discovery` row in `oat-project-progress/SKILL.md`'s routing table name `oat-project-quick-start`
- [ ] `named-skill-load-contract.test.ts` pins the rows and both skills are bumped once in the PR
