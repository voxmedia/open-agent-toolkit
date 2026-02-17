---
oat_generated: true
oat_generated_at: 2026-02-16
oat_review_type: code
oat_review_scope: "PR #11 (agent-sync-fix)"
oat_review_scope_mode: range
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: PR #11 (agent-sync-fix)

**Reviewed:** 2026-02-16
**Range:** a80661894616fc9323542a4bcbcc22c08917e440..f2e7c83c0e1eb823709623133e0a72b2c64f2d7a
**Files reviewed:** 18

## Summary

This PR correctly threads file-entry support through scanner, planner, executor, hash, drift, and stray detection, and the new integration coverage is strong for happy paths. I found one important edge-case bug in file-vs-directory detection that can break drift/status behavior for valid directory names. I also called out one minor behavior-expansion risk where generic markdown files under skills are now treated as sync targets.

## Findings

### Critical

None.

### Important

1. File/directory type is inferred from `*.md` suffix instead of tracked metadata, which can misclassify directory entries.
   - `packages/cli/src/drift/detector.ts:80`
   - `packages/cli/src/engine/compute-plan.ts:121`

   `detectDrift()` and removal-entry construction infer `isFile` via `canonicalPath.endsWith('.md')` / `name.endsWith('.md')`. A canonical directory named `something.md` (valid on disk and currently allowed by scanner) will be misclassified as a file. In copy mode this can route to `computeFileHash()` for a directory path and throw, causing status/sync flows to fail instead of reporting drift cleanly.

   Recommended fix:
   - Persist `isFile` in manifest entries (preferred, explicit), then consume that everywhere drift/planning needs content-type behavior.
   - If schema change is deferred, derive file-vs-directory from `lstat` at runtime where possible instead of extension heuristics.

### Minor

1. Scanner now treats any top-level `.md` file under `.agents/skills` as a syncable skill entry, including doc files like `README.md`.
   - `packages/cli/src/engine/scanner.ts:25`
   - `packages/cli/src/engine/scanner.ts:28`

   This is likely intentional for file-based entries, but it broadens behavior beyond agents and may unintentionally sync repository docs if users place markdown notes in `.agents/skills`.

   Recommended fix:
   - Decide and document whether file-based mode should apply to both skills and agents.
   - If not, gate file-based discovery by content type (agents-only), or introduce an explicit filename convention/ignore rule.

## Verification Commands

```bash
git fetch origin pull/11/head:pr-11-review
BASE=$(git merge-base origin/main pr-11-review)
git diff --name-only "$BASE..pr-11-review"
git show --patch --unified=3 --no-color f2e7c83c0e1eb823709623133e0a72b2c64f2d7a
```

## Next Step

- Address the `isFile` inference issue first (Important), then add a regression test for a directory named `*.md` to lock behavior.
- Decide whether file-based skill discovery should be broad (`*.md`) or constrained, and codify that in tests/docs.
