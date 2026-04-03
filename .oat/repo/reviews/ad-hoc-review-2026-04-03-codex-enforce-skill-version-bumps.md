---
oat_generated: true
oat_generated_at: 2026-04-03
oat_review_type: code
oat_review_scope: codex/enforce-skill-version-bumps vs main
oat_review_scope_mode: range
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: codex/enforce-skill-version-bumps

**Reviewed:** 2026-04-03
**Range:** `60885c0..fddea92` (1 commit)
**Files reviewed:** 12

## Summary

This PR adds a new `oat internal validate-skill-version-bumps` CLI command that enforces version bumps in canonical skill frontmatter when skills are modified relative to a base git ref. The validation is integrated into CI (before `pnpm check`), the pre-push hook, and optionally into the existing `validate-oat-skills` command via `--base-ref`. The implementation follows established CLI patterns (dependency injection, JSON output mode, structured findings, exit codes).

## Findings

### Critical

None

### Important

1. **Double `listChangedSkillFiles` call in `validateChangedSkillVersionBumps`** — `packages/cli/src/validation/skills.ts:280-291`

   `validateChangedSkillVersionBumps` calls `listChangedSkillFiles` at line 280 to count changed skills, then `collectChangedSkillVersionBumpFindings` (line 286) internally calls `listChangedSkillFiles` again at line 220. This runs the same `git diff --name-only` command twice per invocation.

   **Fix:** Accept the file list as a parameter in `collectChangedSkillVersionBumpFindings` instead of re-fetching it, or extract the list once and pass it down:

   ```ts
   export async function validateChangedSkillVersionBumps(
     repoRoot: string,
     options: ValidateChangedSkillVersionBumpsOptions,
     dependencies: ValidateOatSkillsDependencies = {},
   ): Promise<ValidateChangedSkillVersionBumpsResult> {
     const findings: ValidationFinding[] = [];
     const changedSkillFiles = await listChangedSkillFiles(
       repoRoot,
       options.baseRef,
       dependencies,
     );
     await collectChangedSkillVersionBumpFindings(
       repoRoot,
       options.baseRef,
       findings,
       dependencies,
       changedSkillFiles,
     );
     return { validatedSkillCount: changedSkillFiles.length, findings };
   }
   ```

   Similarly, `validateOatSkills` (line 412-419) calls `collectChangedSkillVersionBumpFindings` which internally calls `listChangedSkillFiles` a third time in the `validate-oat-skills --base-ref` code path.

2. **CI step runs before build** — `.github/workflows/ci.yml:34-35`

   The `Validate skill version bumps` step runs `pnpm run cli -- internal validate-skill-version-bumps` before `pnpm check` and `pnpm build`. This requires the CLI to be runnable via `tsx` or already built. Since the CI step appears to use `pnpm run cli` which likely invokes `tsx` directly (common in this repo's dev workflow), this should work. However, if the `cli` script depends on compiled dependencies (e.g., from other packages), it could fail on a cold CI cache. Verify this works on a fresh CI run without any cached build artifacts.

### Minor

1. **Missing test: brand-new skill (not in base ref)** — `packages/cli/src/validation/skills.test.ts`

   The code correctly handles a new skill (not present in the base ref) via the `baseContent === null` guard at line 236. No test covers this path. Consider adding a test where `git show` throws (simulating a file that doesn't exist in the base ref) to document the intended behavior.

2. **Missing test: skill without `version:` frontmatter key** — `packages/cli/src/validation/skills.test.ts`

   When either current or base skill lacks a `version:` key, the check is silently skipped (line 249). This is reasonable design, but the behavior isn't documented by a test.

3. **Pre-push hook missing shebang** — `tools/git-hooks/pre-push:1`

   The hook file starts with a comment (`# Fast quality gate...`) rather than a shebang (`#!/bin/sh`). Pre-existing condition (not introduced by this PR). On most systems the default shell interprets it correctly, but an explicit shebang would be more portable and make the file self-documenting.

4. **Success message wording ambiguity** — `packages/cli/src/commands/internal/validate-skill-version-bumps.ts:76`

   The message `OK: validated N changed canonical skill version bump checks against origin/main` is slightly awkward when N is 0 (no changed skills). Consider: `OK: 0 canonical skills changed relative to origin/main — nothing to validate` for the zero case, vs the current phrasing.

## Verification Commands

```bash
# Run the new command locally against main
cd /Users/thomas.stang/.codex/worktrees/082a/open-agent-toolkit
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main

# Run full test suite
pnpm --filter=@open-agent-toolkit/cli test

# Run existing validate-oat-skills with base-ref to check integration
pnpm run cli -- internal validate-oat-skills --base-ref origin/main

# Type check + lint
pnpm type-check && pnpm lint && pnpm format
```
