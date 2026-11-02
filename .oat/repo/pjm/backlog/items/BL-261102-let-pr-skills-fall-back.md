---
id: BL-261102-let-pr-skills-fall-back
title: Let PR skills fall back to origin/HEAD when git.defaultBranch is unset
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - config
  - skills
assignee: null
created: 2026-11-02T14:07:17.281Z
updated: 2026-11-02T14:07:17.281Z
associated_issues: []
external_plans: []
---

## Description

When git.defaultBranch is unset, oat config get git.defaultBranch prints the built-in default main and exits 0 (the default comes from packages/cli/src/config/resolve.ts). The base-branch chain in oat-project-pr-final, oat-project-pr-progress and oat-project-complete (config, then origin/HEAD, then main) therefore never reaches its origin/HEAD step, so a repository whose default branch is not main gets the wrong base. Reported by the wave-1-correctness run (deferred finding p03 M2). The same run noted related hardcoded bases: oat-project-pr-final Step 3 computes its merge-base against origin/main, and oat-docs-apply and oat-agent-instructions-apply call gh pr create --base main.

## Acceptance Criteria

- With `git.defaultBranch` unset, the base-branch resolution used by `oat-project-pr-final`, `oat-project-pr-progress` and `oat-project-complete` reaches `origin/HEAD`: in a repository whose `origin/HEAD` points at `develop`, all three resolve `develop`.
- With `git.defaultBranch` set, the configured value still wins; with neither the setting nor `origin/HEAD`, resolution still falls back to `main`.
- The skills can tell an explicitly configured value from the built-in default, for example through a CLI flag or field that reports the value's source, without parsing human output.
- `oat-project-pr-final` Step 3's merge-base and the `gh pr create --base` calls in `oat-docs-apply` and `oat-agent-instructions-apply` use the same resolved base instead of a hardcoded `main`.
- Each changed skill's `metadata.version` is bumped, and a test or contract check covers the unset-config case.
