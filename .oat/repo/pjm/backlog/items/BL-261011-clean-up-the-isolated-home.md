---
id: BL-261011-clean-up-the-isolated-home
title: Clean up the isolated HOME directories that evidence-grade test runs
  leave under TMPDIR
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - brief-goal-workflow-modes
  - testing
  - developer-experience
assignee: null
created: 2026-10-11T22:25:08.163Z
updated: 2026-10-11T22:25:08.163Z
associated_issues: []
external_plans: []
---

## Description

Retro RP-05 (brief-goal-workflow-modes). Each HOME=$(mktemp -d) pnpm exec turbo run test --force invocation (AGENTS.md Definition of Done) leaves roughly 48 MB of Library/ state under TMPDIR and nothing removes it. One twenty-hour run accumulated 87 such directories (3.3 GB) and the volume ran under 600 MB three times, forcing a parallel group to run sequentially and pausing a phase mid-task. Add a repository helper (for example a pnpm test:evidence script that creates the temporary HOME, runs the forced turbo test, and removes the directory in a trap) and point the AGENTS.md Definition of Done at it, or have the test harness own the temporary HOME.

## Acceptance Criteria

- A repository script or harness owns the temporary HOME for the forced turbo test run and removes it on exit, including on failure
- AGENTS.md's Definition of Done points at that script instead of the bare `HOME=$(mktemp -d)` invocation
