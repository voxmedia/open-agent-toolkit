---
id: BL-261011-re-project-oat-pr-status-from
title: Re-project oat_pr_status from goal delivery observations at terminal closeout
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - brief-goal-workflow-modes
  - goal
  - complete
assignee: null
created: 2026-10-11T16:27:33.305Z
updated: 2026-10-11T16:27:33.305Z
associated_issues: []
external_plans: []
---

## Description

Found by the p12-t02 real-artifact probe. oat_pr_status and oat_pr_url are projected from the latest delivery member only at milestone activation (oat-project-goal Step 7) and at registration (pr-progress Step 5.5 item 6). After the last milestone's delivery merges and the goal is declared met, state.md still says oat_pr_status: open. oat-project-complete then takes its tracked-open-PR branch: it skips PR creation (correct outcome, but for the wrong reason, ahead of the goal coverage branch) and its Step 11.5 would try to sync the description of a merged pull request. Fix: re-project the PR fields from refreshed observations at the terminal declaration (oat-project-goal Step 9 item 2) or in complete's goal branch.

## Acceptance Criteria

- After the terminal declaration of a goal whose deliveries are merged, oat_pr_status reflects the latest member's observed status
- oat-project-complete's goal path reaches the coverage branch and does not try to edit a merged pull request
