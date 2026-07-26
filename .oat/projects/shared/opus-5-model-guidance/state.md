---
oat_current_task: p07-t03
oat_last_commit: f19445f5
oat_blockers: []
associated_issues: []
oat_kind: implementation
oat_parent: null
oat_siblings: []
oat_depends_on: []
oat_children: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: implement
oat_phase_status: pr_open
oat_dispatch_policy:
  mode: managed
  policy: high
  providers:
    codex: xhigh
    claude: opus
  source: project-state
oat_workflow_mode: quick
oat_workflow_origin: native
oat_docs_updated: complete
oat_pr_status: open
oat_pr_url: 'https://github.com/voxmedia/open-agent-toolkit/pull/178'
oat_project_created: '2026-07-25T00:19:49.509Z'
oat_project_completed: null
oat_project_state_updated: '2026-07-26T20:05:00Z'
oat_generated: false
---

# Project State: opus-5-model-guidance

**Status:** Implementation in progress
**Started:** 2026-07-25
**Last Updated:** 2026-07-25

## Current Phase

Implementation — PR open; completion may run before or after merge.

All 14 tasks done. The final review passed with zero findings on its fourth
round, documentation is synced, and PR #178 is open against `main`.

## Artifacts

- **Discovery:** `discovery.md` (complete, post-release reconciled)
- **Spec:** N/A (quick mode)
- **Design:** N/A (quick mode)
- **Plan:** `plan.md` (complete, post-release reconciled)
- **Implementation:** `implementation.md` (complete, 14/14 tasks)
- **Reverification:** `references/reverification.md` (complete)
- **G01 probe evidence:** `references/g01-probe-results.md`,
  `references/g01-probe-hooks.jsonl`
- **Historical plan:** `references/pre-synthesis-plan.md`

## Progress

- ✓ Original pre-release discovery and plan preserved
- ✓ Post-release synthesis accepted by independent reviewers and user
- ✓ Implementation scope reconciled
- ✓ Durable model-selection principles expanded
- ✓ Claude provider routing refreshed
- ✓ Codex economics refreshed
- ✓ Cursor provisional guidance refreshed without speculative pins
- ✓ Evidence and refresh protocol expanded
- ✓ Canonical skill and public packages versioned
- ✓ Generated provider views and bundled assets refreshed
- ✓ Repository validation passed (format, lint, type-check, tests, release)
- ✓ Reverification record written; downstream parity recorded as OPEN
- ✓ Policy coherence and generated-view parity audited
- ✓ Final cross-family review gates cleared
- ✓ G01 pin probe run with controls; six selectors verified from Cursor's own
  lifecycle hooks
- ✓ Probe-verified Cursor pins, recommendation rebalance, and generated roles
  shipped
- ✓ Final review passed with zero findings (fourth round)
- ✓ Documentation synced; Cursor pin verification runbook published
- ✓ Repo reference updated (`pjm/current-state.md`)
- ✓ PR created
- ⧗ Awaiting human review

## Blockers

None

## Next Milestone

PR is open for review.

- To incorporate feedback: run `oat-project-revise`
- Complete before merge: run `oat-project-complete` now, then merge the PR.
- Merge before completion: merge the PR, then run `oat-project-complete`.
