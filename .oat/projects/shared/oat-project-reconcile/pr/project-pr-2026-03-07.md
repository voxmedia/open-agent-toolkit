---
oat_generated: true
oat_generated_at: 2026-03-07
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/oat-project-reconcile
---

# feat: add oat-project-reconcile skill

## Summary

Adds a new `oat-project-reconcile` skill that maps manual/human commits back to planned tasks and reconciles OAT tracking artifacts after user confirmation. When developers implement tasks outside the structured OAT workflow (e.g., committing without task-ID conventions or skipping `implementation.md` updates), this skill analyzes the commit history, proposes commit-to-task mappings using five signals, and updates tracking artifacts in an append-only, non-destructive manner. The `oat-project-progress` skill is also updated with drift detection to proactively suggest reconciliation across all workflow modes.

## Goals / Non-Goals

**Goals:**
- Detect the last OAT checkpoint and analyze all subsequent untracked commits
- Map commits to planned tasks using five signals: task ID in message, file overlap scoring, keyword matching, temporal ordering, and unmapped classification
- Require human confirmation before any artifact updates (no silent assumptions)
- Produce `implementation.md` entries matching the existing template format exactly
- Work across all three workflow modes (spec-driven, quick, import)

**Non-Goals:**
- No CLI command (skill-only for now)
- No interactive TUI — uses `AskUserQuestion` for confirmations
- No automatic re-running of verification commands
- No modification of review status in `plan.md`

## Changes

**Phase 1 — Core Skill (7 tasks):**
- Skill skeleton with mode assertion, blocked/allowed activities, and self-correction protocol
- 6-step workflow: checkpoint detection, commit collection/analysis, commit-to-task mapping, human-in-the-loop confirmation, artifact updates, bookkeeping commit
- 5 mapping signals (A–E) with confidence levels (high/medium/low/unmapped)
- Append-only artifact updates with dynamic progress table enumeration
- Phase status stays `in_progress` after reconciliation (review gate respected)

**Phase 2 — Integration + Review Fixes (14 tasks):**
- Provider sync registration (Claude + Cursor symlinks)
- `oat-project-progress` routing updated with drift detection block (`PLAN_TASKS > IMPL_COMPLETED` as primary indicator, commit-based heuristics as secondary)
- Backlog updated to reflect in-progress status
- 11 review fix tasks across 4 review cycles addressing: append-only violations, temporal ordering signal, phase status gate bypass, variable naming (`ACTIVE_PROJECT_PATH`), hardcoded progress table, drift detection logic, bookkeeping filter glob patterns
- Mocked permission-denied test replacing chmod-based approach (works in root/container CI)

**Adjacent changes (on branch, outside reconcile scope):**
- Quick-start skill updates (v1.2.1, discovery.md synthesis, design.md opt-out)
- Scaffold test for quick workflow discovery template
- Skill validation utilities
- PR template alignment (consistent section names across final/progress skills)

## Verification

- `pnpm test` — 737/737 tests passing
- `pnpm lint` — clean
- `pnpm type-check` — clean
- `oat internal validate-oat-skills` — 36 skills validated
- `oat sync --scope all --apply` — symlinks created successfully
- lint-staged on all 21 task commits (pass)

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| final | code | passed | 2026-03-07 | reviews/final-review-2026-03-07-v4.md |

4 review cycles, 11 fix tasks total. Final review (v4): 0 critical, 0 important, 0 medium, 2 minor (1 converted, 1 deferred as logically correct).

## References

- Spec: [`spec.md`](https://github.com/tkstang/open-agent-toolkit/blob/claude/review-backlog-proposal-R05hW/.oat/projects/shared/oat-project-reconcile/spec.md)
- Plan: [`plan.md`](https://github.com/tkstang/open-agent-toolkit/blob/claude/review-backlog-proposal-R05hW/.oat/projects/shared/oat-project-reconcile/plan.md)
- Implementation: [`implementation.md`](https://github.com/tkstang/open-agent-toolkit/blob/claude/review-backlog-proposal-R05hW/.oat/projects/shared/oat-project-reconcile/implementation.md)
- Discovery: [`discovery.md`](https://github.com/tkstang/open-agent-toolkit/blob/claude/review-backlog-proposal-R05hW/.oat/projects/shared/oat-project-reconcile/discovery.md)
- Reviews: [`reviews/`](https://github.com/tkstang/open-agent-toolkit/tree/claude/review-backlog-proposal-R05hW/.oat/projects/shared/oat-project-reconcile/reviews)
