---
oat_generated: true
oat_generated_at: 2026-02-17
oat_review_type: code
oat_review_scope: feat/oat-plan-writing-unification (PR #13)
oat_review_scope_mode: range
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: feat/oat-plan-writing-unification (PR #13)

**Reviewed:** 2026-02-17
**Range:** 0f0ee82eb822ba2b2e6b7bd591bba06c39f8041b..69a19a1
**Files reviewed:** 6

## Summary

This PR cleanly introduces a shared plan-writing contract and wires references across the expected plan-producing/plan-mutating skills. Skill schema validation passes. The main mismatch is routing behavior: `oat-project-plan` starts handling quick/import planning even though those modes are already planned by their entry skills and should route forward to implementation. I found two Important issues to fix before merge.

## Findings

### Critical

None.

### Important

1. **`oat-project-plan` should stop on `quick`/`import` mode and route, not continue planning.**
   - **Where:** `.agents/skills/oat-project-plan/SKILL.md:15`, `.agents/skills/oat-project-plan/SKILL.md:96`, `.agents/skills/oat-project-plan/SKILL.md:122`, `.agents/skills/oat-project-plan/SKILL.md:132`, `.agents/skills/oat-project-quick-start/SKILL.md:98`, `.agents/skills/oat-project-quick-start/SKILL.md:151`, `.agents/skills/oat-project-import-plan/SKILL.md:110`, `.agents/skills/oat-project-import-plan/SKILL.md:159`
   - **Issue:** The PR adds quick/import planning paths inside `oat-project-plan`, but quick-start/import-plan already create canonical `plan.md` and point users to `oat-project-implement`.
   - **Why it matters:** Running `oat-project-plan` in quick/import mode can duplicate or mutate already-finalized plans and gives conflicting guidance about the next valid action.
   - **Fix:** In `oat-project-plan`, after reading `oat_workflow_mode`, hard-stop for `quick` and `import` with a clear warning and route message:
     - `quick`: "Plan already produced by quick workflow; run oat-project-implement."
     - `import`: if normalized `plan.md` exists, route to `oat-project-implement`; if not, route to `oat-project-import-plan` first.
     - Keep planning execution path full-mode only.

2. **Review status semantics in the new shared contract are inconsistent with existing workflow and template.**
   - **Where:** `.agents/skills/oat-project-plan-writing/SKILL.md:62`
   - **Issue:** The contract defines `pending -> fixes_added -> fixes_completed -> passed`, but the canonical template and review-provide workflow include an intermediate `received` status (`pending -> received -> ...`).
   - **Why it matters:** The new contract is positioned as the source of truth. Omitting `received` will cause future plan writers/editors to diverge from `.oat/templates/plan.md` and `oat-project-review-provide` behavior.
   - **Fix:** Update the contract status semantics to include `received`, or update all consumers/templates in this PR to remove it consistently (the former is lower risk).

## Verification Commands

```bash
git -C /Users/thomas.stang/Code/open-agent-toolkit/.worktrees/oat-plan-writing merge-base origin/main HEAD
git -C /Users/thomas.stang/Code/open-agent-toolkit/.worktrees/oat-plan-writing diff --name-only 0f0ee82eb822ba2b2e6b7bd591bba06c39f8041b..HEAD
git -C /Users/thomas.stang/Code/open-agent-toolkit/.worktrees/oat-plan-writing diff 0f0ee82eb822ba2b2e6b7bd591bba06c39f8041b..HEAD -- .agents/skills/oat-project-import-plan/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-progress/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md
pnpm oat:validate-skills
```

## Next Step

- Update `oat-project-plan` to stop-and-route for quick/import modes (full-mode planning only), fix the status-semantics mismatch, and rerun `oat-review-provide` for a follow-up pass before merge.
