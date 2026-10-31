---
id: BL-260830-make-documentation-aware
title: Make the knowledge index optional by default for discovery and planning
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - cli
  - config
  - staleness
  - knowledge-index
  - docs
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:47.499Z
updated: 2026-10-31T19:40:00Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/205
external_plans: []
---

## Description

Promoted and broadened from legacy backlog record bl-b5af using verified GitHub issue #205 evidence, and reframed on 2026-10-31 by operator decision: the generated knowledge index (`oat-repo-knowledge-index`) becomes optional by default instead of a discovery prerequisite.

Discovery, brief, and goal planning must always offer to generate or refresh the knowledge index when it is missing or stale, but a missing or stale index must not block planning unless the repository opts in to requiring it. Replace the hardcoded staleness and prerequisite behavior with that policy, keeping repository instructions (`AGENTS.md`) a required check.

## Acceptance Criteria

- By default, a missing or stale knowledge index never blocks `oat-project-discover`, `oat-project-quick-start`, `oat-project-brief`, `oat-project-goal`, or the other planning entry points; it yields a truthful advisory instead.
- Those planning entry points always present the option to generate or refresh the knowledge index when it is missing or stale, and proceed without it when the user declines; autonomous runs record the skipped offer rather than prompting.
- A repository can opt in to requiring a current knowledge index through configuration, which restores the blocking prerequisite.
- Discovery prerequisite policy distinguishes repository instructions, generated knowledge, and authored documentation; staleness thresholds are configurable without hardcoded repository assumptions.
- Missing, intentionally absent, stale, and fresh knowledge yield truthful, test-covered outcomes, and GitHub #205's docs-free repository case is resolved without weakening required-instruction checks.
