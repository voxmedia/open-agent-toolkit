---
id: BL-260907-route-quick-mode-discovery
title: Route quick-mode discovery rows in oat-project-next straight to quick-start
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - skills
  - lifecycle
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:35.545Z
updated: 2026-09-07T14:05:35.545Z
associated_issues: []
external_plans: []
---

## Description

After wave-5 p03 (2026-09-02-route-incomplete-quick-projects-to-quick-start.md) the quick-mode `plan` rows in oat-project-next route incomplete quick plans to oat-project-quick-start, but the quick-mode `discovery` rows still target oat-project-plan, which now forwards to quick-start: a two-hop route rather than a dead end. Point the discovery rows at quick-start directly and pin them in the load-contract test.

## Acceptance Criteria

- [ ] The quick-mode `discovery` rows in `oat-project-next/SKILL.md` name `oat-project-quick-start`
- [ ] `named-skill-load-contract.test.ts` pins the rows and `oat-project-next` is bumped once in the PR
