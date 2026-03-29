---
oat_generated: true
oat_generated_at: 2026-03-29
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/oat-project-next
---

# Code Review: final

**Reviewed:** 2026-03-29
**Scope:** Final code review for `oat-project-next`
**Files reviewed:** 13
**Commits:** `85eccb6b3af9bc5747a32d915dd0cca6e456fca4..HEAD`

## Summary

The branch is close, but the final lifecycle loop is not actually safe to ship yet. `oat-project-next` sends completed review-fix cycles to the wrong skill, and `oat-project-pr-final` now advertises a configurable base branch while still hardcoding `main` during `gh pr create`.

## Findings

### Critical

None.

### Important

1. **`fixes_completed` final reviews route to the wrong skill.** In the post-implementation router, any non-`passed` final-review row is sent to `oat-project-review-receive`. That is incorrect once a review cycle has already been received and the generated fix tasks have been finished: `fixes_completed` explicitly means “awaiting re-review,” and `oat-project-review-receive` blocks when there is no active review artifact to consume. The next step in that state must be `oat-project-review-provide code final`, not another receive pass. As written, the new router can strand projects after review-fix implementation. Evidence: [.agents/skills/oat-project-next/SKILL.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.agents/skills/oat-project-next/SKILL.md#L234), [.agents/skills/oat-project-review-receive/SKILL.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.agents/skills/oat-project-review-receive/SKILL.md#L98), [.agents/skills/oat-project-review-receive/SKILL.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.agents/skills/oat-project-review-receive/SKILL.md#L185), [.agents/skills/oat-project-implement/SKILL.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.agents/skills/oat-project-implement/SKILL.md#L360).

### Medium

1. **Configured PR base branch is ignored during automatic PR creation.** The skill still documents a configurable `base=` argument and says it will ask for the base branch, but Step 5 now hardcodes `gh pr create --base main`. Any caller who supplies a different base branch will get a PR against `main` anyway. This is a behavioral regression introduced by the automatic-creation change and can target the wrong branch in release or backport workflows. Evidence: [.agents/skills/oat-project-pr-final/SKILL.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.agents/skills/oat-project-pr-final/SKILL.md#L75), [.agents/skills/oat-project-pr-final/SKILL.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.agents/skills/oat-project-pr-final/SKILL.md#L88), [.agents/skills/oat-project-pr-final/SKILL.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.agents/skills/oat-project-pr-final/SKILL.md#L316), [.agents/skills/oat-project-pr-final/SKILL.md](/Users/thomas.stang/Code/vox/open-agent-toolkit/.agents/skills/oat-project-pr-final/SKILL.md#L331).

### Minor

None.

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Status      | Notes                                                                                                                 |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| FR3         | partial     | Workflow routing exists, but the final re-review loop misroutes `fixes_completed` states.                             |
| FR5         | partial     | Post-implementation routing handles most branches, but the re-review branch is incorrect after review-fix completion. |
| FR7         | implemented | `oat-project-next` dispatches directly to target skills.                                                              |
| NFR2        | partial     | `oat-project-pr-final` advertises configurable base-branch behavior that the implementation no longer honors.         |

### Extra Work (not in requirements)

None.

## Verification Commands

```bash
git diff --name-only 85eccb6b3af9bc5747a32d915dd0cca6e456fca4..HEAD
git log --oneline 85eccb6b3af9bc5747a32d915dd0cca6e456fca4..HEAD
nl -ba .agents/skills/oat-project-next/SKILL.md | sed -n '197,267p'
nl -ba .agents/skills/oat-project-pr-final/SKILL.md | sed -n '71,89p'
nl -ba .agents/skills/oat-project-pr-final/SKILL.md | sed -n '316,332p'
nl -ba .agents/skills/oat-project-review-receive/SKILL.md | sed -n '98,99p'
nl -ba .agents/skills/oat-project-review-receive/SKILL.md | sed -n '181,185p'
nl -ba .agents/skills/oat-project-implement/SKILL.md | sed -n '358,361p'
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
