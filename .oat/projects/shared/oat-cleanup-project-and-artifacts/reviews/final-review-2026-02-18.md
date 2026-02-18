---
oat_generated: true
oat_generated_at: 2026-02-18
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/oat-cleanup-project-and-artifacts
---

# Final Code Review (Cycle 2): oat-cleanup-project-and-artifacts

**Reviewed:** 2026-02-18
**Scope:** final (9d66b4d..ef5a89b) -- 18 tasks, 27 files
**Files reviewed:** 27
**Commits:** 19 (d900b53..ef5a89b)
**Review cycle:** 2 of 3 (re-review after fixes from review 1)

---

## Summary

All findings from review 1 have been properly addressed. The six review-fix tasks (p04-t03 through p04-t08) correctly resolve the Important, Medium, and selected Minor findings. The `cleanup artifacts` command is now fully wired with options, action handler, error handling, and exit codes. The archive path double-resolution is fixed, the shared `toRepoRelativePath` helper is extracted, dead types are removed, `planArchiveActions` has composition coverage, and exit codes follow the plan's contract. No new critical or important issues were introduced by the fix commits. The implementation is clean, well-tested (458 tests passing), and aligns with the imported plan's requirements.

---

## Prior Finding Verification

### Important Findings (all fixed)

**I-1: `cleanup artifacts` command was a no-op stub** -- FIXED in p04-t03 (commit 70a4840)
- Verified: `createCleanupArtifactsCommand()` at `packages/cli/src/commands/cleanup/artifacts/artifacts.ts:539-593` now has `--apply`, `--all-candidates`, `--yes` options and a full action handler that orchestrates `runCleanupArtifacts`.
- Verified: Help snapshot at `packages/cli/src/commands/help-snapshots.test.ts:213-227` shows `artifacts [options]` with correct options.
- Verified: Integration test at `packages/cli/src/commands/commands.integration.test.ts:389-425` validates JSON contract output.

**I-2: `planArchiveActions` called `resolveArchiveBasePath` twice** -- FIXED in p04-t04 (commit 4625993)
- Verified: `planArchiveActions()` at `artifacts.ts:226-246` now passes `target` directly to `buildArchiveTargetPath()`, which handles resolution internally exactly once.
- Verified: Regression test at `noninteractive.test.ts:32-48` explicitly asserts no double-resolution behavior.

**I-3: Missing error handling in `cleanup project` command action** -- FIXED in p04-t05 (commit 3f2af67)
- Verified: `createCleanupProjectCommand()` at `project.ts:338-366` has try/catch with JSON-safe error payloads and exit codes (`CliError.exitCode` for actionable errors, `2` for unexpected errors).
- Verified: Tests at `project.test.ts:400-425` cover both CliError (exit code 1) and unexpected Error (exit code 2) paths.

### Medium Findings (all fixed)

**M-1: Duplicated `toRepoRelativePath` helper** -- FIXED in p04-t06 (commit 8fa3bcf)
- Verified: Single definition at `cleanup.utils.ts:10-14`, imported by both `project.ts:15` and `artifacts.ts:20`.
- Verified: No duplicate definitions remain (grep confirms all usages import from `cleanup.utils`).
- Verified: Test coverage at `cleanup.utils.test.ts:84-92`.

**M-2: Dead/unused types and factory functions** -- FIXED in p04-t07 (commit c336129)
- Verified: `project.types.ts` file has been deleted (glob returns no results).
- Verified: `ProjectCleanupFindingType`, `ProjectCleanupFinding`, `createProjectCleanupScanResult`, `ArtifactCleanupScanResult`, `createArtifactCleanupScanResult` are all absent from the codebase (grep returns no results).
- Verified: `artifacts.types.ts` now contains only active types: `ArtifactCleanupCandidate`, `ArtifactDuplicateEntry`, `ArtifactDuplicateChain`.

**M-3: `planArchiveActions` exported but untested and uncalled** -- FIXED in p04-t08 (commit a482222)
- Verified: `planArchiveActions` is called in `runCleanupArtifacts` at `artifacts.ts:497` in the interactive apply path.
- Verified: Direct composition test at `noninteractive.test.ts:32-48`.
- Verified: Integration test at `cleanup.integration.test.ts:143-181` exercises the full archive apply path end-to-end.

### Minor Findings

**m-1: `process.exitCode = 0` always set even when drift exists** -- FIXED
- Verified: `project.ts:355` now uses `process.exitCode = payload.status === 'ok' ? 0 : 1`.
- Verified: `artifacts.ts:580` uses same pattern.
- Verified: Tests at `project.test.ts:384-398` explicitly check exit code 1 on drift and 0 on ok.
- Verified: Integration tests at `commands.integration.test.ts:408,445` confirm exit code 1 when drift is detected.

**m-2: Fixture directory contains only `.gitkeep`** -- DEFERRED (user-approved)
- Confirmed: `packages/cli/src/commands/cleanup/__fixtures__/cleanup-scenarios/.gitkeep` still exists with no fixture files.
- Disposition: Accepted as deferred per user decision. Integration tests use temp directories for isolation, which is an appropriate pattern. The empty fixture directory is non-blocking noise.

**m-3: `discoverProjectDirectories` does not sort output** -- FIXED
- Verified: `project.ts:76-79` sorts directory names within each root, and line 86 sorts the final combined output.

**m-4: `scanCleanupProjectDrift` exported but only used in tests** -- FIXED
- Verified: No references to `scanCleanupProjectDrift` exist anywhere in the codebase.

---

## Findings

### Critical

None

### Important

None

### Minor

**m-1. `formatCleanupProjectPlan` omits `skipped` and `blocked` counts from text output** (`packages/cli/src/commands/cleanup/project/project.ts:311`)
- Issue: The project text formatter shows `scanned`, `issues`, `planned`, `applied` but not `skipped` or `blocked`. The artifacts formatter at `artifacts.ts:437` includes all six counts. While the project cleanup flow currently never produces skipped/blocked actions, this inconsistency could cause confusion if project cleanup gains blocking/skipping behavior in the future.
- Suggestion: Add `skipped` and `blocked` to the project summary line for consistency: `summary: scanned=${...}, issues=${...}, planned=${...}, applied=${...}, skipped=${...}, blocked=${...}`. Low priority since no functional impact exists today.

---

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `references/imported-plan.md`, `implementation.md`

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| AC-1: `cleanup project` detects/remediates drift with dry-run/apply | Implemented | Full implementation with pointer, state, lifecycle, dashboard drift coverage |
| AC-2: `cleanup artifacts` auto-prunes duplicate chains to latest | Implemented | Duplicate-chain detection, latest-version selection, prune planning all wired through command |
| AC-3: Interactive Keep/Archive/Delete stale triage | Implemented | Interactive triage function wired into command via `runCleanupArtifacts` interactive path |
| AC-4: Archive moves follow repo conventions | Implemented | `resolveArchiveBasePath` correctly maps both source directories to archive destinations |
| AC-5: Non-interactive mutation paths are safe | Implemented | Safety gate requires `--all-candidates --yes`; referenced candidates blocked |
| AC-6: Deterministic, audit-friendly output | Implemented | Deterministic sorting, stable JSON contract, tested payload shapes |
| Plan: `--apply` option on artifacts | Implemented | `artifacts.ts:549` |
| Plan: `--all-candidates` option | Implemented | `artifacts.ts:550-553` |
| Plan: `--yes` option | Implemented | `artifacts.ts:554` |
| Plan: Exit code 1 for actionable issues | Implemented | Both project (`project.ts:355`) and artifacts (`artifacts.ts:580`) |
| Plan: Exit code 2 for runtime errors | Implemented | Both project (`project.ts:363`) and artifacts (`artifacts.ts:589`) |
| Plan: JSON output for artifacts | Implemented | `artifacts.ts:574-576` |
| Plan: Command registration with subcommands | Implemented | `index.ts:1-10` registers both; `index.test.ts` verifies |
| Plan: Shared contracts for status/mode/summary/actions | Implemented | `cleanup.types.ts` defines complete contract; `cleanup.utils.ts` provides helpers |
| Plan: Integration tests with idempotency | Implemented | `cleanup.integration.test.ts` covers project idempotency, artifact flow, and archive composition |

### Extra Work (not in declared requirements)

| Item | Assessment |
|------|------------|
| `selectManyOrEmpty` helper in `shared.prompts.ts` | Reasonable utility extension; avoids null checks in triage flow |
| Backlog status updates | Documentation hygiene, appropriate |
| External plan status annotation | Documentation hygiene, appropriate |

No scope creep detected. All extra work is minor and directly supports the implemented features.

---

## Deferred Findings Ledger

| ID | Finding | Severity | Disposition | Reason |
|----|---------|----------|-------------|--------|
| m-2 (review 1) | Fixture directory `.gitkeep`-only | Minor | Deferred (user-approved) | Non-blocking; integration tests use temp dirs for isolation |

---

## Verification Commands

```bash
# Run all cleanup tests
pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup

# Run full CLI test suite
pnpm --filter @oat/cli test

# Lint (expect only pre-existing warnings in unrelated files)
pnpm --filter @oat/cli lint

# Type-check (expect clean)
pnpm --filter @oat/cli type-check

# Verify no dead code references remain
cd packages/cli && grep -r "scanCleanupProjectDrift\|createProjectCleanupScanResult\|createArtifactCleanupScanResult\|ArtifactCleanupScanResult\|ProjectCleanupFinding" src/commands/cleanup/ || echo "No dead references found"
```

---

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
