---
id: BL-260927-detect-unfilled-placeholders
title: Detect unfilled placeholders and frontmatter-body drift at PR-final and
  completion
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - lifecycle
  - pr-final
  - completion
  - templates
assignee: null
created: 2026-09-27T03:35:37.105Z
updated: 2026-10-31T21:08:00Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/328
external_plans: []
---

## Description

The project scaffold writes `**Status:** Discovery` into the `state.md` body and only completion rewrites it. The implementation template ships `{…}` placeholders and `oat_status: in_progress`. `oat-project-pr-final` only warns when the Final Summary is obviously empty, and `oat-project-complete` has no placeholder or frontmatter-body check, so stale prose and placeholders reach PR bodies, archives, and reviewers. Related: the current-state authority item from GitHub issues #305 and #310. Source: GitHub issue #328.

**Delivery status (2026-10-31):** Landed: `oat project journal check` (#365)
refuses template placeholder residue in `implementation.md` records,
including inline-code slots (`packages/cli/src/commands/project/journal-check/rules.ts:1087`,
`687d63b53`), and `state-status-disagrees` for the journal's `oat_status` and
`oat_ready_for`; `oat-project-complete` runs it at completion
(`.agents/skills/oat-project-complete/SKILL.md:611`). Remaining:
`oat-project-pr-final` does not run the check, and the `state.md` body
(`**Status:**`) is not compared with its frontmatter.

## Acceptance Criteria

- The shared journal check also reports unreplaced template placeholders in the other core project artifacts and `state.md` frontmatter-body disagreement.
- `oat-project-pr-final` runs the check before generating the PR body.
- The `state.md` body cannot contradict its frontmatter after any lifecycle command, whether by derivation or by the check.
- Fixtures cover placeholder and drift cases plus a clean project.
