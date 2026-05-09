---
oat_generated: true
oat_generated_at: 2026-05-08
oat_review_type: code
oat_review_scope: unstaged
oat_review_scope_mode: unstaged
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: unstaged

**Reviewed:** 2026-05-08
**Range:** unstaged working tree
**Files reviewed:** 7

## Summary

Reviewed the unstaged fix for archive-aware PR descriptions after `oat-project-complete`, including the canonical skill update, string-contract test, and lockstep public package version bumps. The change correctly targets the stale active-project artifact links, but the new project-record replacement link is pointed at the base branch, which can preserve the same class of broken PR-body link while the PR is still open.

## Findings

### Critical

None.

### Important

- `.agents/skills/oat-project-complete/SKILL.md:328` builds the archive-aware project-record link with `{BASE_BRANCH}`. The summary export is created and committed on the current feature branch during completion before the PR is merged, so a PR body link to `blob/main/...` will 404 until after merge whenever the export file does not already exist on `main`. This undercuts the stated goal of keeping PR description links resolving after archive. The canonical final-PR link policy still says to prefer current-branch blob links, so this replacement should use the current/head branch for the PR body link, or otherwise avoid emitting the link until it resolves on the branch being pushed. Add a contract check that catches `blob/{BASE_BRANCH}` in the project-record example so this does not regress silently.

### Minor

None.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts
```

## Next Step

- Apply the branch-target fix, then re-run `oat-review-provide` for a follow-up pass.
