---
oat_generated: true
oat_generated_at: 2026-02-16
oat_review_scope: final (v2 re-review)
oat_review_type: code
oat_project: .oat/projects/shared/provider-config-worktree-sync
---

# Final Code Review (v2 Re-Review): provider-config-worktree-sync

**Reviewer:** oat-reviewer (code)
**Date:** 2026-02-16
**Scope:** Final re-review covering all 20 tasks (p01-t01 through p07-t09), verifying v1 findings are resolved
**Commit Range:** 0f0ee82..HEAD (26 commits)
**Workflow Mode:** import (plan.md + references/imported-plan.md are primary requirements)

---

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm --filter @oat/cli test` | PASS (44 files, 355 tests) |
| `pnpm --filter @oat/cli type-check` | PASS (no errors) |

---

## V1 Finding Resolution Status

### Important Findings

**I-1 (p07-t01): `providers set` scope validation consolidation** -- RESOLVED
- Both the `resolveScopeRoot` dependency (line 50) and `runProvidersSetCommand` guard (line 98) in `packages/cli/src/commands/providers/set/index.ts` now share the same `PROJECT_SCOPE_ONLY_MESSAGE` constant (line 22-23), ensuring a single consistent remediation message.
- Verified: `PROJECT_SCOPE_ONLY_MESSAGE` is used at both line 50 and line 98, producing identical error output regardless of which path triggers first.

**I-2 (p07-t02): Sync mismatch deduplication guard** -- RESOLVED
- `packages/cli/src/commands/sync/index.ts:147` now wraps mismatch provider iteration in `new Set([...mismatches.detectedUnset, ...mismatches.detectedDisabled])`.
- Line 146 includes the invariant comment: `// detectedUnset and detectedDisabled are mutually exclusive by contract.`
- The `buildMismatchChoices` helper (line 77) also uses `new Set` for the same lists.

### Medium Findings

**M-1 (p07-t03): Init stray scanning should use config-aware resolution** -- RESOLVED
- `packages/cli/src/commands/init/index.ts:312` introduces `activeAdaptersForStrays` which is populated from `resolution.activeAdapters` (line 369) for project scope.
- This is passed to `collectStrays` at line 386 as the optional 5th parameter.
- `collectStraysDefault` (line 151-163) uses the provided adapters when present and falls back to detection-only `getActiveAdapters` only when no explicit adapter list is given (user scope).
- New test at line 365-395 (`uses config-aware active adapters for project stray scanning`) confirms that only config-aware adapters are passed to `collectStrays` for project scope.
- E2e adoption test updated in commit `f9e20fe` to account for provider selection prompt.

**M-2 (p07-t04): Missing `--scope user` rejection test** -- RESOLVED
- `packages/cli/src/commands/providers/set/index.test.ts:203-216` adds explicit `it('rejects user scope', ...)` test matching the existing `--scope all` rejection pattern at lines 188-201.
- Both tests assert `capture.error[0]` contains `'only --scope project'`.

**M-3 (p07-t05): SyncConfig type divergence documentation** -- RESOLVED
- `packages/cli/src/config/sync-config.ts:19` now has the comment: `` // `providers` is optional in persisted JSON but always populated after normalization. ``
- This appears directly above the type intersection on line 20, clarifying the intentional widening.

### Minor Findings

**m-1 (p07-t06): Duplicate `countPlannedOperations` helper** -- RESOLVED
- `packages/cli/src/commands/sync/sync.utils.ts` contains the single definition of `countPlannedOperations` (lines 3-11).
- Both `apply.ts` (line 7) and `dry-run.ts` (line 7) import from `./sync.utils` with no local definition.
- Grep confirms no duplicate definitions exist.

**m-2 (p07-t07): Duplicate `PROVIDER_CONFIG_REMEDIATION` constant** -- RESOLVED
- `packages/cli/src/commands/shared/messages.ts` defines the single source of truth (line 1).
- All consumers import from `@commands/shared/messages`: `sync/index.ts:3`, `init/index.ts:9`, `init/index.test.ts:17`.
- Grep confirms no inline string duplicates remain.

**m-3 (p07-t08): Type assertion in sync command** -- RESOLVED
- `packages/cli/src/commands/sync/index.ts:291` now uses proper typed assignment:
  ```typescript
  const dependencies: SyncCommandDependencies = {
    ...defaultDependencies(),
    ...overrides,
  };
  ```
- Grep for `as SyncCommandDependencies` in the sync directory returns no matches.

**m-4 (p07-t09): Test constant should use factory function** -- RESOLVED
- `packages/cli/src/commands/sync/index.test.ts:32-55` defines `createAdapter(name = 'claude')` factory function.
- The `createHarness` function (line 114) calls `createAdapter()` to produce a fresh adapter per harness instance.
- Grep confirms no module-level `const ADAPTER` exists in the sync test file.

---

## New Findings from p07 Changes

### Critical

None

### Important

None

### Medium

None

### Minor

**m-1: `collectStraysDefault` fallback still imports detection-only adapters inline**
- **File:** `packages/cli/src/commands/init/index.ts:160-163`
- **Issue:** When `activeAdapters` is not provided (user scope path), the function instantiates its own adapter list `[claudeAdapter, cursorAdapter, codexAdapter]` inside `getActiveAdapters`. This means adding a new provider adapter requires updating this list in addition to the `createDependencies` adapter list at line 221. This is a pre-existing pattern that was not introduced by p07 changes, and it only affects the user-scope fallback path which has no provider config.
- **Suggestion:** Consider extracting the default adapter list to a shared constant or accepting it as a required parameter to avoid future divergence. This is not blocking since user scope does not use provider config, and the existing `getAdapters` dependency handles all other paths.

---

## Spec/Design Alignment

### Requirements Coverage (from imported plan)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Config persistence foundation (save/update/normalize) | Implemented | `sync-config.ts` with `saveSyncConfig`, `setProviderEnabled`, normalization |
| Config-aware provider activation utility | Implemented | `getConfigAwareAdapters` in `adapter.utils.ts` with mismatch metadata |
| `oat providers set` command | Implemented | Full validation, JSON output, project-scope enforcement |
| Command registration and help snapshots | Implemented | `providers set` in command tree, help snapshots updated |
| Init interactive provider prompt | Implemented | Multiselect with detection+config-based defaults |
| Init non-interactive + scope-all safeguards | Implemented | No mutation, guidance output, project-only config write |
| Sync interactive mismatch prompt + persist | Implemented | Remediation flow with Set-based dedup and persist-before-planning |
| Sync non-interactive mismatch warnings | Implemented | Warning output with shared remediation message constant |
| `worktree:init` script | Implemented | Root `package.json` script at line 26 |
| AGENTS worktree-switch instruction | Implemented | `AGENTS.md` line 26 |
| Docs updates | Implemented | `overview.md`, `troubleshooting.md` updated |
| E2E verification | Implemented | 44 test files, 355 tests, type-check, build all pass |

### Extra Work (not in requirements)

None. All code changes map to planned tasks (p01-t01 through p07-t09).

---

## Acceptance Criteria Verification

| # | Criterion | Verified |
|---|-----------|----------|
| AC-1 | Fresh worktree with no provider dirs syncs when providers explicitly enabled | Yes -- `worktree:init` script + config-aware activation + e2e test |
| AC-2 | `oat init` establishes explicit provider intent without manual JSON edits | Yes -- interactive multiselect persists all known providers |
| AC-3 | `oat providers set` allows deterministic post-init provider management | Yes -- command validated with 7 test cases (including user-scope rejection) |
| AC-4 | `oat sync` surfaces directory/config mismatches with safe remediation | Yes -- interactive prompt + non-interactive warning + JSON output |
| AC-5 | AGENTS instructs running worktree init after switching worktrees | Yes -- AGENTS.md line 26 |
| AC-6 | `pnpm --filter @oat/cli test` and build pass | Yes -- 355/355 tests, clean type-check |

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Important | 0 |
| Medium | 0 |
| Minor | 1 (pre-existing, not introduced by p07) |
| Total | 1 |

**V1 Finding Disposition:** All 9 findings from the v1 review (2 Important, 3 Medium, 4 Minor) have been resolved by the p07 fix tasks. Each fix was verified by reading the actual code at the referenced locations and confirming the remediation matches the plan task description.

**Verdict:** The implementation is complete, well-tested, and aligned with the imported plan. All v1 review findings have been addressed. No new issues of medium severity or above were introduced by the p07 fixes. The single minor finding (m-1) is a pre-existing pattern, not a regression.

**Recommendation:** Pass. Merge-ready.

---

## Verification Commands

```bash
# Full test suite
pnpm --filter @oat/cli test

# Type safety
pnpm --filter @oat/cli type-check

# Integration test for providers set
pnpm --filter @oat/cli test packages/cli/src/commands/commands.integration.test.ts

# Sync mismatch tests
pnpm --filter @oat/cli test packages/cli/src/commands/sync/index.test.ts

# Init provider config tests
pnpm --filter @oat/cli test packages/cli/src/commands/init/index.test.ts

# Config persistence tests
pnpm --filter @oat/cli test packages/cli/src/config/sync-config.test.ts

# Provider resolution tests
pnpm --filter @oat/cli test packages/cli/src/providers/shared/adapter.types.test.ts

# E2E workflow tests
pnpm --filter @oat/cli test packages/cli/src/e2e/workflow.test.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks (if any actionable findings remain).
