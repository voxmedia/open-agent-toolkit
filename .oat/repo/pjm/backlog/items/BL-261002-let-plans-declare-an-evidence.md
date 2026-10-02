---
id: BL-261002-let-plans-declare-an-evidence
title: Let plans declare an evidence tier per phase and reconcile tracking on
  driver takeover
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - lifecycle
  - workflow
  - skills
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T20:01:29.777Z
updated: 2026-10-02T20:01:29.777Z
associated_issues: []
external_plans: []
---

## Description

Implement applied code-grade evidence (receipts, negative controls, multi-round reviews, gates after each correction) to a docs-only page move; the user had to impose a speed amendment mid-run. When the driving agent changed mid-run (Codex hit a usage limit and Claude took over), no step refreshed state.md and implementation.md, which stayed stale until close. Source: docs-improvement-overhaul retro UP-05.

## Acceptance Criteria

- A plan can declare an evidence tier per phase (for example docs, code, or
  assurance-bearing) that sets the default number of review rounds and the
  required evidence artifacts.
- Docs-tier phases require a conservation diff and one review round, not
  receipts or negative controls.
- Implement has a resume-under-a-new-driver step that reconciles `state.md`,
  `implementation.md` and the plan's Reviews table with git history before
  continuing.
