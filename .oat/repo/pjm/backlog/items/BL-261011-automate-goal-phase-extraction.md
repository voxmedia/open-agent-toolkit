---
id: BL-261011-automate-goal-phase-extraction
title: Automate goal phase extraction into a child project
status: open
priority: low
scope: feature
scope_estimate: M
labels:
  - brief-goal-workflow-modes
  - goal
  - extraction
assignee: null
created: 2026-10-11T16:27:33.523Z
updated: 2026-10-11T16:27:33.523Z
associated_issues: []
external_plans: []
---

## Description

Deferred by design (DR-261011-goal-milestone-extraction-is): extraction in goal mode is a manual amendment in v1.5, not oat-project-split. The author writes '**Extracted to:** <slug>' in the brief, the journal marker pair, and oat_extracted_from plus the transferred outcome text in the child. A command or skill step could scaffold the child, write both sides and validate the backlink that the closeout boundary resolves.

## Acceptance Criteria

- One command or skill step extracts a goal phase into a new child project and writes the brief, journal and child markers together
- The closeout boundary's extraction checks pass on the produced artifacts without manual edits
