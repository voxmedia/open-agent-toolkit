---
oat_generated: true
oat_generated_at: 2026-02-21
oat_review_type: code
oat_review_scope: /Users/thomas.stang/.claude/plans/sunny-popping-corbato.md
oat_review_scope_mode: files
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: /Users/thomas.stang/.claude/plans/sunny-popping-corbato.md

**Reviewed:** 2026-02-21
**Range:** (files mode)
**Files reviewed:** 1

## Summary

The plan is well-structured and generally aligns with existing CLI command patterns in this repository. The primary risks are around filesystem traversal safety and cross-platform newline handling, both of which can cause incorrect behavior in real repos. Test coverage also needs one additional scenario for sync skip/json behavior.

## Findings

### Critical

None.

### Important

1. **Symlink traversal can create escape/cycle risk in scanner and sync writes**  
   Reference: `/Users/thomas.stang/.claude/plans/sunny-popping-corbato.md:49`, `/Users/thomas.stang/.claude/plans/sunny-popping-corbato.md:129`  
   The plan explicitly says the scanner follows directory symlinks. In a BFS walk this can recurse indefinitely (symlink cycles) or traverse outside repo boundaries, and `sync --apply` could then write `CLAUDE.md` outside the intended workspace. This should be constrained before implementation.

   **Fix guidance:** Skip directory symlinks by default (use `lstat`/`Dirent.isSymbolicLink()`), or require `realpath` + visited inode tracking + repo-root boundary enforcement before descending.

2. **Strict CRLF mismatch policy will produce false failures on Windows checkouts**  
   Reference: `/Users/thomas.stang/.claude/plans/sunny-popping-corbato.md:54`, `/Users/thomas.stang/.claude/plans/sunny-popping-corbato.md:126`  
   The plan requires exact equality with `@AGENTS.md\n` and explicitly forbids CRLF normalization. On repos with CRLF conversion, valid pointer files (`@AGENTS.md\r\n`) will be reported as mismatched, causing repeated non-actionable drift.

   **Fix guidance:** Normalize line endings for comparison only (e.g., `content.replace(/\r\n/g, '\n')`) or explicitly accept both newline variants while still writing canonical `\n` on apply.

### Minor

1. **Integration test matrix misses sync skip/json outcome assertions**  
   Reference: `/Users/thomas.stang/.claude/plans/sunny-popping-corbato.md:98`, `/Users/thomas.stang/.claude/plans/sunny-popping-corbato.md:116`  
   The plan specifies exit code behavior when skipped mismatches remain, but the listed integration tests do not explicitly assert dry-run/apply exit status for "mismatch without `--force`" and do not verify `sync --json` payload shape.

   **Fix guidance:** Add integration coverage for `sync` with mismatched `CLAUDE.md` (without `--force`) asserting exit code 1 and stable JSON payload fields in both dry-run and apply modes.

## Verification Commands

```bash
# Confirm scanner does not recurse through a directory symlink cycle.
pnpm --filter @oat/cli test -- instructions.integration.test.ts

# Add/execute a test where CLAUDE.md contains CRLF and validate reports OK.
pnpm --filter @oat/cli test -- instructions.utils.test.ts

# Validate sync exit code/json behavior when mismatch is skipped without --force.
pnpm --filter @oat/cli test -- instructions.integration.test.ts
```

## Next Step

- If this review should feed an OAT project lifecycle, import/attach it to that project and run `oat-project-review-receive`.
- Otherwise, apply fixes directly and re-run `oat-review-provide` for a follow-up pass.
