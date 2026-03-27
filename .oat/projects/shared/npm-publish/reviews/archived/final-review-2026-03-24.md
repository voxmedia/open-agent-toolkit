---
oat_generated: true
oat_generated_at: 2026-03-24
oat_review_scope: final (re-review of fix tasks p04-t03 through p04-t06)
oat_review_type: code
oat_project: .oat/projects/shared/npm-publish/
---

# Code Review: final (re-review)

**Reviewed:** 2026-03-24
**Scope:** Re-review of review fix tasks p04-t03, p04-t04, p04-t05, p04-t06 (commits 539d8ac..b12375a)
**Files reviewed:** 2 (non-OAT changed files: `.github/workflows/release-dry-run.yml`, `packages/cli/AGENTS.md`)
**Commits:** 4 implementation commits (e83c506, d06d3cd, 48e1871, b12375a) plus 3 tracking commits

## Summary

All four review fix tasks from the initial final review have been correctly addressed. The knowledge base no longer contains stale `@oat/*` references (I2/p04-t03), the CLI contributor instructions now use the public package name (M1/p04-t04), the dry-run workflow is scoped to release-relevant paths (M2/p04-t05), and the dry-run publish order matches the real release workflow (M3/p04-t06). The deferred I1 finding (partial publish risk) remains appropriately deferred per explicit user direction and design acknowledgement.

## Findings

### Critical

None

### Important

None

### Minor

None

## Prior Finding Disposition

### I1 (Important, deferred): Partial publish risk in release workflow

- **Status:** Remains deferred
- **Rationale:** Deferred by explicit user direction during initial review receive. The design document identifies `partial-publish-risk` as an acknowledged first-release operational concern (design.md line 513). No code fix was requested or required. This is an accepted operational risk for the first release, documented in the rollback plan section of the design.

### I2 (Important): Knowledge base files contain stale `@oat/*` references -- fix task p04-t03

- **Status:** Fixed
- **Verification:** `rg '@oat/(cli|docs-config|docs-theme|docs-transforms)' .oat/repo/knowledge` returns no matches. All 8 knowledge files were updated in commit e83c506. The diff confirms 16 insertions/16 deletions across the knowledge base, replacing all stale `@oat/*` references with `@voxmedia/oat-*`.

### M1 (Minor): `packages/cli/AGENTS.md` stale filter names -- fix task p04-t04

- **Status:** Fixed
- **Verification:** `rg '@oat/cli' packages/cli/AGENTS.md` returns no matches. Commit d06d3cd updated all four occurrences (lines 16, 17, 18, 35) from `@oat/cli` to `@voxmedia/oat-cli`.

### M2 (Minor): Dry-run workflow triggers on all PRs -- fix task p04-t05

- **Status:** Fixed
- **Verification:** Commit 48e1871 adds `paths:` filters to the `pull_request` trigger. The filter covers `packages/**`, `tools/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.github/workflows/ci.yml`, and `.github/workflows/release*.yml`. The `workflow_dispatch` trigger remains available for manual runs. The path set is well-chosen: it captures all files that could affect release readiness while excluding docs-only and `.oat/`-only changes.

### M3 (Minor): Publish order mismatch between dry-run and release -- fix task p04-t06

- **Status:** Fixed
- **Verification:** Commit b12375a reorders the dry-run publish loop from `oat-cli, oat-docs-config, oat-docs-theme, oat-docs-transforms` to `oat-docs-transforms, oat-docs-config, oat-docs-theme, oat-cli`. This now matches the release workflow order exactly (release.yml lines 69-73).

## Requirements/Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`, `implementation.md`, prior archived review (`reviews/archived/final-review-2026-03-23.md`)

### Requirements Coverage

This re-review is scoped to fix tasks only. The initial final review verified full requirements coverage. The fix tasks close the remaining partial finding:

| Requirement | Status      | Notes                                                                                                               |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| FR5         | implemented | Previously partial due to stale knowledge base and AGENTS.md references. Now fully resolved by p04-t03 and p04-t04. |

### Extra Work (not in declared requirements)

None. All four fix commits directly address findings from the initial final review.

## Deferred Findings Ledger

| Finding | Severity  | Status   | Rationale                                                                                                           |
| ------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| I1      | Important | Deferred | Partial publish risk -- acknowledged first-release operational risk per design; deferred by explicit user direction |

## Verification Commands

Run these to verify the fixes:

```bash
# Verify no stale @oat/* references in knowledge base (p04-t03)
rg '@oat/(cli|docs-config|docs-theme|docs-transforms)' .oat/repo/knowledge

# Verify no stale @oat/cli in CLI AGENTS.md (p04-t04)
rg '@oat/cli' packages/cli/AGENTS.md

# Verify dry-run workflow has path filters (p04-t05)
grep -A 10 'paths:' .github/workflows/release-dry-run.yml

# Verify publish order matches between dry-run and release (p04-t06)
rg '@voxmedia/oat-(docs-transforms|docs-config|docs-theme|cli)' .github/workflows/release-dry-run.yml .github/workflows/release.yml
```
