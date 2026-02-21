---
oat_generated: true
oat_generated_at: 2026-02-21
oat_review_type: code
oat_review_scope: files:/Users/thomas.stang/.claude/plans/humble-fluttering-cray.md
oat_review_scope_mode: files
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: /Users/thomas.stang/.claude/plans/humble-fluttering-cray.md

**Reviewed:** 2026-02-21
**Range:** n/a (explicit file review)
**Files reviewed:** 1

## Summary

The plan is directionally strong, but it misses test updates that are required for the described skill registrations, so execution as written will likely fail CI. I also found one gate-reason inconsistency in the Step 5 hard-gate pseudocode that will reduce observability when failures occur.

## Findings

### Critical

None.

### Important

1. **[I1] Workflow install tests will fail unless hardcoded skill-count assertions are updated**
   - **Location:** `/Users/thomas.stang/.claude/plans/humble-fluttering-cray.md:242`
   - **Why this matters:** The plan only calls out updating the `WORKFLOW_SKILLS` fixture array. The existing test file has multiple hardcoded `toHaveLength(20)` assertions; adding `oat-project-review-receive-remote` increases expected workflow skills to 21 and will fail tests unless these assertions are revised.
   - **Evidence:** `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts:114`, `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts:188`, `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts:213`
   - **Fix guidance:** Add an explicit plan task to update all hardcoded count assertions (or derive expected counts from `WORKFLOW_SKILLS.length`) and update related test naming text.

2. **[I2] Utility init command tests are not included in scope despite adding new utility skills**
   - **Location:** `/Users/thomas.stang/.claude/plans/humble-fluttering-cray.md:235`
   - **Why this matters:** The plan adds two entries to `UTILITY_SKILLS`, but it does not include updates to tests that assert the full utility skill list used in non-interactive installs. This will cause test drift/failure once the skill list changes.
   - **Evidence:** `packages/cli/src/commands/init/tools/utility/index.test.ts:137`
   - **Fix guidance:** Add a plan task to update `packages/cli/src/commands/init/tools/utility/index.test.ts` expected `skills` array (or assert against exported `UTILITY_SKILLS` to avoid future hardcoded drift).

### Minor

1. **[M1] Hard-gate failure reason labels are inconsistent with the stated conditions**
   - **Location:** `/Users/thomas.stang/.claude/plans/humble-fluttering-cray.md:204`
   - **Why this matters:** The pseudocode says `verdict != pass` should map to `review_gate_not_executed`, while `no verdict entry` maps to `review_gate_missing`. That inverts/intangles semantics and makes run-log diagnosis noisy.
   - **Fix guidance:** Use distinct reasons such as `review_gate_failed` for non-pass verdicts and `review_gate_missing` for absent verdict entries.

## Verification Commands

```bash
rg -n "toHaveLength\(20\)" packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts
rg -n "skills:\s*\[" packages/cli/src/commands/init/tools/utility/index.test.ts
rg -n "review_gate_not_executed|review_gate_missing" /Users/thomas.stang/.claude/plans/humble-fluttering-cray.md
```

## Next Step

- Update the plan with explicit tasks for the two test-file changes and clarify the Step 5 reason taxonomy before implementation starts.
