---
id: BL-261120-evaluate-project-links
title: Evaluate project links for goal and milestone modes
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - projects
  - links
  - goal-mode
  - freestyle
assignee: null
created: 2026-11-20T23:51:47.161Z
updated: 2026-11-20T23:51:47.161Z
associated_issues: []
external_plans: []
---

## Description

Freestyle mode (GitHub #420) adds project links: a child project created with --parent from another project's branch adds one file to the parent's links/ folder. When the child's PR merges, the parent's orchestrator sees an unacknowledged link, reads the child's records, updates its own docs and logs an acknowledgment, and status flags unacknowledged links. This lets a lane grow into its own linked project and run in parallel without its delivery being missed at merge, as happened when the Cursor MVP project merged into the Factory Platform T3 MVP and the orchestrator never read its records. Links ship in freestyle only first. This item evaluates whether goal mode (milestones, progress PRs) and other lifecycle modes should adopt them, once freestyle links have been used.

## Acceptance Criteria

- After freestyle project links have been used in at least one real project, record how goal mode would use them: for example a milestone spun out as a linked child project, and links acknowledged at milestone re-alignment or in progress PRs.
- Decide whether goal mode and the other lifecycle modes adopt links in full, in part or not at all, with reasons, recorded on this item or as a decision record.
- If any mode adopts links, file follow-up backlog items for the implementation, covering how links interact with that mode's gates, re-alignment and closeout.
