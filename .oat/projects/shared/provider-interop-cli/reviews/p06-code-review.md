---
oat_generated: true
oat_generated_at: 2026-02-14
oat_review_scope: p06
oat_review_type: code
oat_project: .oat/projects/shared/provider-interop-cli
---

# Code Review: Phase 6 (Deferred Findings Cleanup)

**Reviewed:** 2026-02-14
**Scope:** p06 (4 tasks, 5 commits)
**Range:** 1fdec55..ea338e1
**Files reviewed:** 26
**Lines:** +521 / -199
**Test count:** 277 (up from 262 in p05)

## Summary

Phase 6 systematically closes all deferred Medium and Minor findings from prior phase reviews (p02 through p05). The changes span the engine types, markers, compute-plan, execute-plan, drift/stray detection, shared prompts, UI output/ANSI utilities, hook module, and test files across contract, edge-case, e2e, and help snapshot suites.

The implementation quality is high. Every deferred finding has been properly addressed with both implementation changes and corresponding test coverage. The code is clean: all 277 tests pass, TypeScript type-check is clean, and Biome lint reports zero issues across 104 files.

Key accomplishments:
- `RemovalSyncPlanEntry` narrowed type correctly constrains removals to `operation: 'remove'`
- `createTestAdapter` in `engine/test-helpers.ts` replaces duplicated adapter factories in engine tests
- `stripAnsi` centralized in `ui/ansi.ts` with no remaining duplicates
- `inputRequired` prompt primitive added with proper CliError in non-interactive mode
- Hook snippet now uses `--scope project` with improved warning text
- `uninstallHook` removes empty hook files instead of leaving zero-byte files
- `writeDirectorySentinel` creates directory-level `.oat-generated` marker files
- Sync plan output has operation-level color semantics (green/yellow/red/gray)
- `providers inspect` help snapshot added
- Contract tests include `nativeRead` assertions and positive `detect` path tests
- Concurrent manifest test strengthened with explicit schema parse assertion

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

**m1: Command-level test files retain local `createAdapter` factories**
- Files: `commands/status/index.test.ts:46`, `commands/providers/list.test.ts:19`, `commands/providers/inspect.test.ts:20`
- These files still define their own local `createAdapter` helper functions, structurally similar to the engine-level `createTestAdapter`. The deferred finding specifically targeted engine test deduplication (which is done), but there is a minor opportunity to further consolidate.
- **Assessment:** Acceptable. The command-level factories have different shapes (single mapping, parametric names, detect overrides) and serve different test contexts than the engine-level helper. The deferred finding was scoped to engine tests, and that scope has been fully addressed. No action needed.

**m2: `inferScopeRoot` in `execute-plan.ts` and `strays.ts` are distinct implementations**
- Files: `packages/cli/src/engine/execute-plan.ts:10-21`, `packages/cli/src/drift/strays.ts:23-40`
- Both export an `inferScopeRoot` function with the same name but different algorithms (marker-string approach vs segment-walk approach). They solve different problems (canonical path decomposition vs provider path decomposition), so the naming overlap is not a bug, but could be confusing to future contributors.
- **Assessment:** Informational only. The functions operate on different path types and are in different modules. No immediate action required.

## Deferred Findings Resolution

### From p02 review (addressed in p06-t01)

| Finding | Status | Evidence |
|---------|--------|----------|
| Simplify removal-entry name handling (use `path.basename`) | Resolved | `compute-plan.ts:117` uses `basename(canonicalRelative)` |
| Normalize mapping path comparisons independent of platform separators | Resolved | `compute-plan.ts:56-67` `entryInsideMapping` normalizes with `replaceAll('\\', '/')` |
| Extract shared engine test fixture helpers (deduplicate `createAdapter`) | Resolved | `engine/test-helpers.ts` exports `createTestAdapter()`, imported in `compute-plan.test.ts` and `engine.integration.test.ts` |
| Add directory-level `.oat-generated` sentinel alongside inline markers | Resolved | `markers.ts:29-36` implements `writeDirectorySentinel`; `execute-plan.ts:60-81` calls it during copy operations; tests in `markers.test.ts:67-81` and `execute-plan.test.ts:133-139,196-198` verify sentinel content |
| Narrow `SyncPlan.removals` typing to removal-only entries | Resolved | `engine.types.ts:26` defines `RemovalSyncPlanEntry = SyncPlanEntry & { operation: 'remove' }`; `engine.types.ts:31` uses it for `removals` field; type tests in `engine.types.test.ts:59-73` verify |

### From p03 review (addressed in p06-t02)

| Finding | Status | Evidence |
|---------|--------|----------|
| Add missing non-interactive `confirmAction` test | Resolved | `prompts.test.ts:33-38` tests non-interactive mode returns false without calling `confirm` |
| Add `inputRequired` prompt primitive | Resolved | `prompts.ts:40-60` implements `inputRequired` with CliError for non-interactive and empty input; 4 tests in `prompts.test.ts:40-70` cover all paths |
| Simplify path normalization in stray detection | Resolved | `strays.ts:8-10` centralizes `normalizePath`, used consistently throughout; `toScopeRelative` at line 42-44 combines resolve + relative + normalize |
| Add operation-level color semantics in sync plan output | Resolved | `output.ts:124-138` `colorSyncOperation` applies green (create), yellow (update), red (remove), gray (skip); test at `output.test.ts:66-123` verifies ANSI codes present |
| Remove duplicated `stripAnsi` (centralize in shared UI helper) | Resolved | `ui/ansi.ts:1-22` is the single definition; `output.ts:6` and `output.test.ts:7` import from `./ansi`; grep confirms no other definitions |
| Add focused `inferScopeRoot` behavior tests | Resolved | `strays.test.ts:194-203` tests nested dot directories and fallback behavior |

### From p04/p05 reviews (addressed in p06-t03)

| Finding | Status | Evidence |
|---------|--------|----------|
| Make hook snippet project-scoped (`oat status --scope project`) | Resolved | `hook.ts:33-34` runs `oat status --scope project`; `hook.ts:19` warning message references `--scope project`; `hook.test.ts:160-161` asserts `--scope project` in snippet |
| Improve warning specificity | Resolved | `hook.ts:18-19` warning now includes both `oat status --scope project` and `oat sync --apply --scope project` as remediation commands |
| Handle uninstall of OAT-only hook by removing empty file | Resolved | `hook.ts:216-217` uses `rm(hookPath)` when content is empty; `hook.test.ts:103-113` verifies ENOENT after uninstall of OAT-only hook |
| Document defensive `runHookCheck` catch behavior | Resolved | `hook.ts:244-246` has inline comment explaining the outer catch protects custom injected implementations |
| Harden hook path resolution for symlinked `.git` | Resolved | `hook.ts:48-78` `resolveGitDirectory` handles symlinked `.git`, gitdir-file `.git`, and standard `.git` directory; `hook.test.ts:148-161` tests symlinked `.git` directory scenario |

### From p05 review (addressed in p06-t04)

| Finding | Status | Evidence |
|---------|--------|----------|
| Strengthen concurrent-manifest test with schema parse assertion | Resolved | `edge-cases.test.ts:92` uses `ManifestSchema.parse(loaded)` with `not.toThrow()` assertion |
| Improve e2e stream interception typing | Resolved | `e2e/workflow.test.ts:79-101` `createWriteCapture` function with proper typed signature replaces inline type assertions |
| Add `providers inspect` help snapshot | Resolved | `help-snapshots.test.ts:133-151` adds inline snapshot for `providers inspect --help` including required `<provider>` argument |
| Tighten adapter contract assertions for nativeRead mappings | Resolved | `adapter-contract.test.ts:28-29` asserts `providerDir === canonicalDir` when `nativeRead` is true; also validates `canonicalDir` matches `.agents/(skills|agents)` pattern |
| Add positive detect-path assertions in adapter contract tests | Resolved | `adapter-contract.test.ts:76-85` creates provider root directory and asserts `detect` returns `true` |

## Spec/Design Alignment

### Requirements Coverage

Phase 6 is a cleanup phase that does not introduce new functional requirements. All changes reinforce existing requirements established in p01-p05.

| Aspect | Compliant | Notes |
|--------|-----------|-------|
| Type safety (narrower removal type) | Yes | `RemovalSyncPlanEntry` prevents invalid operation types at compile time |
| Safety by default (markers) | Yes | Directory sentinel adds a secondary identification mechanism for copy-mode content |
| Extensibility (nativeRead) | Yes | Contract tests now explicitly validate nativeRead behavior across all adapters |
| Clear user communication | Yes | Hook warning message includes specific remediation commands |
| Idempotency (hook) | Yes | Uninstall now properly cleans up empty files instead of leaving artifacts |

### Design Decision Compliance

| Decision | Compliant | Notes |
|----------|-----------|-------|
| Shared test helpers in engine | Yes | `test-helpers.ts` consolidates adapter factory |
| Centralized ANSI utilities | Yes | Single `stripAnsi` in `ui/ansi.ts` |
| Prompt primitives in shared | Yes | `inputRequired` alongside existing `confirmAction` and `selectWithAbort` |
| Operation-level output semantics | Yes | Color mapping follows standard conventions (green=create, yellow=update, red=remove) |

### Extra Work

None. All changes are within the scope of deferred findings from p02-p05.

## Test Quality

### New/Modified Tests (p06)

| File | Tests | Quality |
|------|-------|---------|
| `engine/engine.types.test.ts` | 4 | Good: validates `RemovalSyncPlanEntry` narrowed type, `SYNC_OPERATION_TYPES` constant |
| `engine/markers.test.ts` | 4 | Good: adds `writeDirectorySentinel` test verifying sentinel file content |
| `engine/compute-plan.test.ts` | 9 | Good: uses shared `createTestAdapter`, adds `nativeRead` filtering test |
| `engine/execute-plan.test.ts` | 11 | Good: validates sentinel file creation in copy mode, `inferScopeRoot` mixed separators |
| `engine/engine.integration.test.ts` | 7 | Good: uses shared `createTestAdapter`, verifies sentinel in copy mode |
| `engine/hook.test.ts` | 10 | Good: adds symlinked `.git` test, uninstall-removes-empty test, `--scope project` assertion |
| `engine/edge-cases.test.ts` | 5 | Good: concurrent manifest test strengthened with schema parse |
| `shared/prompts.test.ts` | 10 | Good: 4 new tests for `inputRequired` (trimming, empty, abort, non-interactive) |
| `drift/strays.test.ts` | 9 | Good: adds `inferScopeRoot` behavior tests and relative path handling |
| `ui/output.test.ts` | 7 | Good: adds semantic color test verifying ANSI escape codes per operation type |
| `providers/shared/adapter-contract.test.ts` | 21 | Good: adds nativeRead validation and positive detect assertions per adapter |
| `commands/help-snapshots.test.ts` | 8 | Good: adds `providers inspect` snapshot |
| `commands/init/index.test.ts` | 16 | Good: aligns hook warning expectations with updated message text |
| `e2e/workflow.test.ts` | 5 | Good: improved stream interception typing |

### Total Test Count

- **p05 total:** 262
- **p06 total:** 277
- **Net new:** +15

The test count increase of 15 reflects new tests for `inputRequired` (4), `writeDirectorySentinel` (1), `inferScopeRoot` behaviors (2), adapter contract additions (6 = 2 per adapter), `providers inspect` snapshot (1), and empty-hook uninstall (1).

### Coverage Observations

- All deferred test findings are resolved with appropriate assertions
- The `createTestAdapter` helper successfully eliminates duplication across engine test files
- Contract tests now validate behavioral properties (nativeRead semantics, positive detection) not just structural properties
- Help snapshots now cover all leaf commands including `providers inspect`

## Verification Commands

All passed on 2026-02-14:

```
pnpm --filter=@oat/cli test         # 277 passed (39 test files)
pnpm --filter=@oat/cli type-check   # clean
pnpm --filter=@oat/cli lint         # 104 files checked, no fixes
```

## Verdict

**PASS** -- Phase 6 successfully closes all deferred Medium and Minor findings from p02 through p05. No new Critical or Important issues were found. The two Minor observations are informational and do not require action. All 277 tests pass, type-check is clean, and lint reports zero issues.

The deferred findings resolution table above confirms every item has been addressed with both implementation and test evidence.

## Recommended Next Step

Proceed to final review (artifact + code) covering the complete project scope, followed by PR creation for merge to main.
