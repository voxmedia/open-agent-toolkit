---
oat_generated: true
oat_generated_at: 2026-02-13
oat_review_scope: p02
oat_review_type: code
oat_project: .oat/projects/shared/provider-interop-cli
---

# Code Review: Phase 2 (Sync Engine)

**Reviewed:** 2026-02-13
**Scope:** p02 (5 tasks, 6 commits)
**Range:** 6cfbdf6..be5bad5
**Files reviewed:** 20 (10 Phase 2 files + 10 Phase 1 context files)
**Lines added:** ~1,465

## Summary

Phase 2 delivers a solid sync engine with well-structured `computeSyncPlan` and `executeSyncPlan` functions, proper partial failure handling, idempotency, and good integration test coverage. The code quality is high overall with clean separation of concerns. However, there are two important issues: copy-mode markers (`insertMarker`) are implemented but never called during sync execution, and the `classifyOperation` check ordering for symlinks contains an unreachable code path. There is also one lint violation (unused import) that should be cleaned up.

## Findings

### Critical

None

### Important

**IMP-1: Copy-mode markers are implemented but never integrated into the sync execution flow**

The plan task p02-t04 requires that `.oat-generated` marker files (or inline markers) are placed in copy-mode directories during sync execution. The `markers.ts` module implements `insertMarker` and `hasMarker` correctly (with unit tests), and the barrel `index.ts` re-exports them. However, `executeSyncPlan` in `execute-plan.ts` never calls `insertMarker` when processing `create_copy` or `update_copy` operations.

This means FR10 (Generated Views Contract) is partially implemented: the primitives exist, but copy-mode views created by `oat sync --apply` will NOT contain the OAT-managed marker, making them indistinguishable from user-created content. This directly impacts drift detection accuracy in Phase 3 and the `oat status` warning for modified copy-mode files.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/execute-plan.ts`
- Lines: 64-75 (the `create_copy`/`update_copy` case blocks)
- Fix: After `copyDirectory(...)` completes, call `insertMarker` on the appropriate file (e.g., `SKILL.md` or `AGENT.md`) in the destination directory. Consider whether the marker should be applied to a specific file or to a separate `.oat-generated` sentinel file per the design's "marker file" vs "inline marker" options. The current `markers.ts` implementation uses inline HTML comment markers in a specific file, which aligns with the plan's description of prepending a comment to `SKILL.md`. Ensure the integration test for copy mode (`engine.integration.test.ts` line 205) also asserts the marker is present.

**IMP-2: Unreachable code path in `classifyOperation` -- broken symlink check after successful `readlink`**

In `compute-plan.ts` lines 139-156, the symlink classification logic first resolves the symlink target via `readlink`, then checks if `resolvedTarget !== canonicalPath` (returning `update_symlink` for wrong target). If the targets match (line 150), it then checks `pathExists(resolvedTarget)`. However, if `readlink` succeeds and the resolved target equals the canonical path, then `pathExists(resolvedTarget)` will virtually always return `true` because the canonical entry already existed when `scanCanonical` found it. The "symlink target is missing" branch at lines 151-155 is unreachable under normal operation because:

1. The canonical entry exists (it was scanned from the filesystem).
2. `resolvedTarget === canonicalPath` was just confirmed.
3. Therefore `resolvedTarget` exists.

This is not a bug per se -- it is dead code that creates a false sense of coverage. In a race condition scenario (canonical deleted between scan and plan), it could theoretically fire, but this is extremely unlikely and would indicate a broader issue.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/compute-plan.ts`
- Lines: 150-155
- Fix: Either remove the dead check and add a comment noting the assumption, or reorder the logic to check target existence BEFORE comparing paths (which would make both branches reachable and match the design's drift classification table where `drifted:broken` is checked before `drifted:replaced`). The design document's Drift Classification Logic table specifies: Symlink target exists? No -> `drifted:broken` should come before Symlink target matches canonical? No -> `drifted:replaced`. The current implementation inverts this order.

### Medium

**MED-1: Unused `relative` import triggers lint warning**

Biome reports an unused import of `relative` from `node:path` in `compute-plan.ts`. This is the only lint issue in the entire codebase and should be cleaned up.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/compute-plan.ts`
- Line: 2
- Fix: Remove `relative` from the import statement.

**MED-2: `inferScopeRoot` in execute-plan.ts uses platform-specific path separator for string matching**

The `inferScopeRoot` function searches for `${sep}.agents${sep}` in canonical paths. On Windows (if ever used), this would search for `\.agents\`. However, the canonical paths in tests and throughout the codebase consistently use forward slashes via `join()` which returns platform-native paths. The issue is that on macOS/Linux this works fine, but the function is fragile -- if a path ever uses forward slashes explicitly (e.g., from manifest entries), the match would fail.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/execute-plan.ts`
- Lines: 9-19
- Fix: Consider using `path.normalize()` on the input or searching for both separator variants. Alternatively, document this as macOS/Linux only (which aligns with NFR2's "Windows is best-effort"). Low severity because Windows is not a primary target.

**MED-3: `resolveStrategy` auto resolution may not always match design intent**

In `compute-plan.ts` lines 58-85, the `resolveStrategy` function handles the `auto` strategy by falling through to check `adapter.defaultStrategy`. If the config says `auto` and the adapter's `defaultStrategy` is also `auto`, the function reaches line 84 and returns `'symlink'`. This is reasonable but implicit. The design states "auto = symlink where supported, copy as fallback." The current implementation treats `auto` as always resolving to `symlink` unless the adapter explicitly declares `copy`. There is no runtime check for symlink support (e.g., trying a test symlink). The `createSymlink` function in `fs/io.ts` handles the runtime fallback, so this is functionally correct, but the strategy recorded in the plan entry will say `symlink` even when the runtime will fall back to `copy`.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/compute-plan.ts`
- Lines: 58-85
- Fix: This is acceptable for v1 since `createSymlink` handles the fallback and `executeSyncPlan` records the actual strategy used (via the return value of `createSymlink`). Add a code comment clarifying that `auto` resolves to `symlink` at planning time, with runtime fallback handled during execution.

**MED-4: `toManifestEntry` computes hash for removed entries unnecessarily**

When processing a `remove` operation, `applyEntry` calls `toManifestEntry(planEntry, planEntry.strategy)`. Inside `toManifestEntry`, if `strategy === 'copy'`, it calls `computeDirectoryHash(entry.canonical.canonicalPath)`. For a removal, the canonical path no longer exists (that is WHY it is being removed), so this will throw a `CliError("Directory does not exist")`. The error is caught by the try-catch in `executeSyncPlan`'s loop and counted as a `failed` operation, but the provider view would NOT have been cleaned up despite the `rm` call happening first (line 77).

Wait -- re-reading the code more carefully: the `remove` case at line 76 does `rm` first, then calls `toManifestEntry`. The `toManifestEntry` call is only used to derive `canonicalPath` and `provider` for the `removeEntry` call. For symlink strategy, `contentHash` is null so no hash is computed. For copy strategy removals, the hash computation would fail.

Actually, this IS a real bug for copy-mode removals:
1. `rm(providerPath)` succeeds -- provider view removed
2. `toManifestEntry(planEntry, 'copy')` is called
3. `computeDirectoryHash(canonical.canonicalPath)` is called for copy strategy
4. The canonical path does not exist (that is why it is being removed)
5. `CliError` is thrown
6. The `catch` in the loop catches it, increments `failed`
7. The manifest entry is NOT removed despite the provider view being deleted
8. Result: orphaned manifest entry pointing to a deleted provider view

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/execute-plan.ts`
- Lines: 76-87 (remove case), and lines 21-45 (toManifestEntry)
- Fix: For `remove` operations, do not call `toManifestEntry`. Instead, derive `canonicalPath` and `provider` directly from the `planEntry` fields (the relative canonical path can be computed from `planEntry.canonical` without hashing). Alternatively, pass `null` for contentHash directly in the remove path.

### Minor

**MIN-1: `createRemovalEntry` name extraction could be simplified**

In `compute-plan.ts` lines 100-115, the name extraction uses `canonicalRelative.split('/').filter(Boolean).at(-1) ?? canonicalRelative`. This is functionally correct but could use `path.basename()` for clarity and consistency with path manipulation elsewhere.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/compute-plan.ts`
- Lines: 103-105
- Fix: Use `import { basename } from 'node:path'` and `basename(canonicalRelative)`.

**MIN-2: `entryInsideMapping` uses platform-specific `sep` which may not match stored canonical dirs**

The `entryInsideMapping` function checks `relativeCanonicalPath.startsWith(mappingCanonicalDir + sep)`. The mapping canonical dirs in adapter definitions use forward slashes (e.g., `.agents/skills`). On macOS/Linux, `sep` is `/` so this works. On Windows, `sep` would be `\` and the comparison would fail. This is a latent issue given the non-goal of Windows support but worth noting.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/compute-plan.ts`
- Lines: 47-56
- Fix: Use `/` directly instead of `sep`, or normalize both sides. Low priority per NFR2.

**MIN-3: Test helper `createAdapter` is duplicated across three test files**

The `createAdapter` helper function with Claude adapter defaults is duplicated in `compute-plan.test.ts`, `engine.integration.test.ts`, and similar patterns in `execute-plan.test.ts`. This creates maintenance burden if adapter structure changes.

- Files:
  - `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/compute-plan.test.ts` (lines 12-44)
  - `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/engine.integration.test.ts` (lines 19-51)
  - `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/execute-plan.test.ts` (lines 18-33)
- Fix: Extract to a shared test fixture file (e.g., `src/engine/__fixtures__/test-helpers.ts`). Low priority.

**MIN-4: `insertMarker` only handles single-file markers, not directory-level `.oat-generated` files**

The plan task p02-t04 mentions "write `.oat-generated` marker file in copied directories." However, the implementation in `markers.ts` uses an inline HTML comment prepended to a specific file (SKILL.md), not a separate `.oat-generated` sentinel file. Both approaches are valid per the spec, but the current approach has a limitation: it only marks ONE file and assumes the file is always named with a specific convention. If a skill directory has no `SKILL.md`, the marker has no target.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/markers.ts`
- Lines: 1-25
- Fix: Consider adding a companion function that writes a `.oat-generated` sentinel file in the directory root as a directory-level marker (more robust). The inline marker is fine as a secondary indicator. Low priority for v1.

**MIN-5: `SyncPlan.removals` type is `SyncPlanEntry[]` but could benefit from a narrower type**

The `removals` array contains entries where `operation` is always `'remove'`. The current type allows any `SyncOperationType`, which means consumers cannot rely on the type system to guarantee removal entries only have `operation: 'remove'`.

- File: `/Users/thomas.stang/Code/open-agent-toolkit/packages/cli/src/engine/engine.types.ts`
- Lines: 26-30
- Fix: Consider a discriminated union or a type alias like `type RemovalEntry = SyncPlanEntry & { operation: 'remove' }`. Low priority.

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR3 (Sync canonical to providers) | implemented | `computeSyncPlan` + `executeSyncPlan` cover create/update/remove/skip for both symlink and copy modes |
| FR5 (Provider adapter system) | implemented | Engine correctly iterates adapters, filters nativeRead, respects scope |
| FR6 (Sync manifest) | implemented | Manifest is updated after sync with correct entries, timestamps, hashes |
| FR9 (Sync strategy config) | implemented | `resolveStrategy` resolves per-provider and global strategy overrides |
| FR10 (Generated views contract) | partial | Marker primitives exist but are NOT called during copy-mode execution (see IMP-1) |
| NFR1 (Safety by default) | implemented | `computeSyncPlan` makes zero filesystem changes; removals are manifest-scoped only |
| NFR2 (Platform compatibility) | implemented | Symlink-first with copy fallback; minor platform-specific path concerns noted |
| NFR5 (Idempotency) | implemented | Integration test confirms second run produces all `skip` entries |

### Design Decision Compliance

| Decision | Status | Notes |
|----------|--------|-------|
| Symlink-first, copy fallback | compliant | `createSymlink` in `fs/io.ts` tries symlink then falls back to copy; `executeSyncPlan` records actual strategy used |
| Manifest tracks sync state | compliant | Manifest entries are created/updated with hashes, timestamps, and strategies after each operation |
| Partial failure handling | compliant | `executeSyncPlan` catches per-entry errors, continues processing, reports counts; BUT see MED-4 for copy-mode removal bug |
| Scope-aware iteration | compliant | `EngineScope` type excludes `'all'`; `getSyncMappings` filters by concrete scope; scanner enforces concrete scope |
| Copy markers | partial | Primitives implemented and exported; NOT integrated into execution flow (see IMP-1) |
| Deterministic plan | compliant | Same inputs produce same plan; adapter iteration order is stable; `seenCanonicalKeys` set prevents duplicates |
| Remove action for deleted entries | compliant | Manifest entries not matched by canonical scan produce `remove` entries in `plan.removals`; BUT see MED-4 for copy-mode removal execution bug |

### Extra Work (not in requirements)

None. All implemented work maps to plan tasks p02-t01 through p02-t05.

## Test Quality

**Coverage:** Good. 29 tests across 4 test files cover the Phase 2 scope:
- `engine.types.test.ts` (4 tests): Type structure validation
- `compute-plan.test.ts` (7 tests): All plan operations including create, skip, update, remove, nativeRead filtering, scope filtering, and copy strategy
- `execute-plan.test.ts` (9 tests): All execution paths including create symlink/copy, update symlink/copy, remove, skip, manifest update, partial failure, and result counts
- `markers.test.ts` (3 tests): Insert marker, detect marker, marker content
- `engine.integration.test.ts` (6 tests): Full round-trip, idempotency, dry-run safety, removal flow, copy mode with hashes, scope filtering

**Strengths:**
- Every test uses temp directories with proper cleanup (afterEach)
- Integration tests exercise the full scan -> plan -> execute pipeline
- Idempotency test validates second-run behavior with loaded manifest
- Partial failure test verifies that one failed entry does not block others
- Removal test validates full lifecycle (sync -> delete canonical -> re-plan -> execute removal)

**Edge cases covered:**
- nativeRead mappings are filtered out
- User scope skips agents
- Wrong symlink target triggers update
- Stale copy content triggers update

**Edge cases NOT covered:**
- Copy-mode removal (MED-4 bug -- would fail if tested with copy strategy removal)
- Race condition: canonical deleted between scan and plan computation
- Multiple adapters in single plan (all tests use single adapter)
- Multiple canonical entries of mixed types (skill + agent) in single plan execution
- Error during `saveManifest` (what happens if manifest write fails after operations succeed?)
- Symlink fallback to copy during execution (the `createSymlink` fallback is tested in `fs/io.test.ts` but not in `execute-plan.test.ts`)
- Marker integration (markers tested in isolation but not as part of sync flow)

## Verification Commands

```bash
# After fixing IMP-1 (marker integration):
pnpm --filter=@oat/cli test src/engine/execute-plan.test.ts
pnpm --filter=@oat/cli test src/engine/engine.integration.test.ts

# After fixing IMP-2 (classifyOperation order):
pnpm --filter=@oat/cli test src/engine/compute-plan.test.ts

# After fixing MED-1 (unused import):
pnpm --filter=@oat/cli lint

# After fixing MED-4 (copy-mode removal):
pnpm --filter=@oat/cli test src/engine/execute-plan.test.ts

# Full verification:
pnpm --filter=@oat/cli test && pnpm --filter=@oat/cli type-check && pnpm --filter=@oat/cli lint
```

## Recommended Next Step

Run `/oat:receive-review` to convert findings into plan tasks.
