---
title: Repo Improve
description: 'Turn repository audits, maintainability reviews, and backlog sources into standalone external implementation plans.'
---

# Repo Improve

Use `oat-repo-improve` when the desired output is an executable implementation plan rather than another analysis report. Every successful run writes one or more standalone plans under `.oat/repo/reference/external-plans/`.

## Choose a source

| Source                 | Use it when                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo audit             | You need fresh repository reconnaissance and vetted improvement findings.                                                                            |
| Maintainability review | A file-backed `oat-repo-maintainability-review` already identifies candidates. Improve verifies selected evidence without repeating the broad audit. |
| Backlog review         | A living backlog review and optional priority alignment already establish value, dependencies, and sequencing.                                       |
| Backlog directory      | You want to start from active items. Substantive backlogs should pass through backlog review and alignment before plan generation.                   |
| Backlog item           | One existing item needs enough repository investigation to become executable.                                                                        |

With no source argument, the skill probes for available review and backlog artifacts, annotates all five options, and asks which source to use.

## Output boundary

External plans are not canonical OAT project `plan.md` files. They contain self-contained context, scope, steps, verification, done criteria, and STOP conditions, but no OAT phase/task IDs or lifecycle bookkeeping.

After generation, choose either execution path:

- Execute a plan directly as a standalone handoff.
- Run `oat-project-import-plan <external-plan-path>` to preserve and normalize one plan for tracked OAT execution.

Project-sized candidates are split when possible. If inseparable work needs multiple design decisions or lacks one coherent verification boundary, improve recommends an OAT project workflow instead of emitting a mega-plan.

## Optional tracking

Plans are always the primary output. Tracking is optional and source-aware:

- `--backlog-items` creates missing PJM items for repo-audit or maintainability-review plans. Backlog-backed sources reuse their existing items and add `external_plans` reverse links.
- `--issues` previews one GitHub issue per plan, checks repository visibility and sensitive content, and requires explicit confirmation before publication. It is useful as a fallback when PJM is not installed.
- Request both modifiers explicitly to create both forms. Neither implies the other.

Failure to publish a backlog item or issue does not invalidate a successfully written plan; the skill reports partial tracking results precisely.

## Orchestration

Full repository audits use `oat-dispatch-subagents` for bounded read-only reconnaissance while the root agent retains vetting, prioritization, and plan writing. Dispatch is native-first. Configured project/workflow policy may authorize required CLI or cross-runtime routes; an agent-improvised alternate route requires explicit current-run approval.
