---
id: bl-3327
title: 'Add dependency intelligence skill family'
status: open
priority: medium
scope: feature
scope_estimate: L
labels: ['skills', 'dependencies']
assignee: null
created: '2026-02-14T00:00:00Z'
updated: '2026-02-14T00:00:00Z'
associated_issues: []
---

## Description

OAT could use a dedicated dependency intelligence skill family that analyzes package state, evaluates upgrade risk, and turns version churn into an actionable upgrade plan instead of a raw list of updates.

Proposed change:

- Evaluate the canonical skill name (`oat-dep-audit`, `oat-dep-evaluate`, `oat-dep-plan-upgrade`, or `oat-dep-impact-report`).
- Analyze `package.json`, compare available versions, summarize changelog impact, and classify breaking versus non-breaking changes.
- Optionally scan code usage to identify touch points for breaking API changes.

Links:

- Source discussion: OAT feature ideas for dependency intelligence

## Acceptance Criteria

- The skill outputs a prioritized, actionable upgrade plan rather than just version lists.
- Breaking-change risk is called out explicitly and linked to likely code touch points.
