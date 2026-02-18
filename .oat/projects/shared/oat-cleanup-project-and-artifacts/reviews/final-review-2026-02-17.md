---
oat_generated: true
oat_generated_at: 2026-02-17
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/oat-cleanup-project-and-artifacts
---

# Final Code Review: oat-cleanup-project-and-artifacts

**Reviewer:** Senior Code Review Agent (Opus 4.6)
**Project:** `.oat/projects/shared/oat-cleanup-project-and-artifacts`
**Scope:** final (9d66b4d..c782156) -- 12 tasks, 26 files
**Date:** 2026-02-17

---

## Summary

The implementation delivers a well-structured `oat cleanup` command family with `project` and `artifacts` subcommands. The `cleanup project` subcommand is fully operational with dry-run/apply drift detection and remediation, including pointer clearing, state file recreation, lifecycle metadata upsert, and dashboard regeneration. The `cleanup artifacts` subcommand provides a solid foundation of planning utilities (duplicate-chain pruning, reference guards, interactive triage, non-interactive safety, archive routing) but does not wire these into the actual command execution -- the artifacts command handler is an empty stub that registers as a valid command but performs no actions. The code quality is high, patterns are consistent with the existing codebase, and the test coverage adequately validates the implemented behavior, though the scope gap on artifact command execution should be explicitly acknowledged.

---

## Findings

### Critical

None

### Important

**I-1. `cleanup artifacts` command is a no-op stub -- does not wire planning utilities into command execution**

The `createCleanupArtifactsCommand()` function at `packages/cli/src/commands/cleanup/artifacts/artifacts.ts:297-301` creates a Commander command with only a description, no options, and no action handler:

```typescript
export function createCleanupArtifactsCommand(): Command {
  return new Command('artifacts').description(
    'Cleanup stale review and external-plan artifacts',
  );
}
```

The plan specifies `oat cleanup artifacts [--apply] [--all-candidates] [--yes]` with full execution behavior. While the underlying planning/triage functions are implemented and tested, the command itself has no `--apply`, `--all-candidates`, or `--yes` options and no action handler. The help snapshot at `packages/cli/src/commands/help-snapshots.test.ts:223` confirms the command has no options. The implementation notes mention "foundation-first in this phase" and "full command orchestration can build on the implemented planning and safety helpers," which is a reasonable phased approach. However, the imported plan's acceptance criteria state: "Users can interactively Keep/Archive/Delete stale artifacts in one flow" and "`oat cleanup artifacts` auto-prunes duplicate chains to latest version." These criteria are only met at the library/utility level, not at the command/user level. **Recommendation:** This should be explicitly documented as deferred scope. If the intent is to ship as-is, the backlog should carry a follow-up item for wiring the artifacts command execution, and the external plan status should note that artifact command orchestration is pending.

**I-2. `planArchiveActions` calls `resolveArchiveBasePath` twice on the same input**

At `packages/cli/src/commands/cleanup/artifacts/artifacts.ts:192-195`:

```typescript
const archiveTarget = buildArchiveTargetPath(
  resolveArchiveBasePath(target),
  existingTargets,
  timestamp,
);
```

`buildArchiveTargetPath` at `packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts:120` internally calls `resolveArchiveBasePath(sourcePath)` again. This means `resolveArchiveBasePath` is applied twice. Currently the double-call is a no-op because the archive path does not match either source prefix, but this is semantically incorrect and fragile -- if the archive path prefix ever overlaps with a source prefix pattern, this would produce wrong paths. **Recommendation:** Change `planArchiveActions` to pass `target` directly to `buildArchiveTargetPath` (which already handles resolution), or change `buildArchiveTargetPath` to not call `resolveArchiveBasePath` and accept already-resolved paths. The caller and callee should agree on who resolves.

**I-3. Missing error handling in `cleanup project` command action**

At `packages/cli/src/commands/cleanup/project/project.ts:353-371`, the command action has no try/catch. Other commands in the codebase (e.g., `state/index.ts:52-59`, `index-cmd/index.ts`, `project/new/index.ts`) consistently wrap their action body in try/catch and set `process.exitCode = 1` or `process.exitCode = 2` for errors:

```typescript
// Example from state/index.ts:
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
}
```

If `runCleanupProject` or `resolveProjectRoot` throws (e.g., invalid CWD, missing repo root), the error will propagate unhandled. The plan specifies exit code `1` for actionable user/precondition issues and exit code `2` for runtime/system errors. Neither is implemented. **Recommendation:** Add a try/catch block matching the codebase pattern, emitting JSON error payloads when `context.json` is true and setting appropriate exit codes.

### Medium

**M-1. Duplicated `toRepoRelativePath` helper across two files**

The same function appears identically at:
- `packages/cli/src/commands/cleanup/project/project.ts:57-59`
- `packages/cli/src/commands/cleanup/artifacts/artifacts.ts:21-23`

```typescript
function toRepoRelativePath(repoRoot: string, targetPath: string): string {
  return relative(repoRoot, targetPath).replaceAll('\\', '/');
}
```

**Recommendation:** Extract this into `cleanup.utils.ts` as a shared utility, consistent with the plan's section "5) Shared Utility Contracts" which calls for shared normalization utilities.

**M-2. Dead/unused types and factory functions**

Several types and functions are defined but never consumed by any caller:

- `ProjectCleanupFindingType` and `ProjectCleanupFinding` at `packages/cli/src/commands/cleanup/project/project.types.ts:1-10` -- imported only in `project.utils.ts` for the `createProjectCleanupScanResult` factory, but the actual project scan flow uses `CleanupActionRecord[]` directly, never the `findings` field.
- `createArtifactCleanupScanResult` at `packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts:8-16` -- exported but never imported or used outside the file.
- `ArtifactCleanupScanResult` at `packages/cli/src/commands/cleanup/artifacts/artifacts.types.ts:6-9` -- only used by the unused factory above.
- `createProjectCleanupScanResult` is called once at `packages/cli/src/commands/cleanup/project/project.ts:188` solely for its `.scanned` property, which just returns the input `scanned` value unchanged.

**Recommendation:** Remove dead types/functions, or if they are placeholders for upcoming work, add a comment noting their intended consumer.

**M-3. `planArchiveActions` is exported but has no test coverage and no callers**

At `packages/cli/src/commands/cleanup/artifacts/artifacts.ts:186-205`, the function is exported but never called from any other module and has zero test coverage. The component helpers it uses (`resolveArchiveBasePath`, `buildArchiveTargetPath`) are tested individually in `noninteractive.test.ts`, but the composition in `planArchiveActions` -- including the double-resolution bug noted in I-2 -- is not tested.

**Recommendation:** Add a test for `planArchiveActions` or mark it as internal/unexported until the artifacts command execution is wired.

### Minor

**m-1. `process.exitCode = 0` is always set even when drift exists**

At `packages/cli/src/commands/cleanup/project/project.ts:369`, `process.exitCode` is unconditionally set to `0`. The plan specifies exit code `1` for "actionable user/precondition issue," and detecting drift in dry-run mode could reasonably warrant exit code `1` to signal to CI that action is needed (similar to how `status` returns exit code `1` when issues exist at `packages/cli/src/commands/status/index.ts:448`). This is a design choice, not necessarily a bug, but it deviates from the plan's exit code semantics.

**Recommendation:** Consider `process.exitCode = payload.status === 'ok' ? 0 : 1` to match the plan's exit code contract and the `status` command precedent.

**m-2. Fixture directory contains only a `.gitkeep` with no fixture files**

The plan calls for seeded fixture files under `packages/cli/src/commands/cleanup/__fixtures__/cleanup-scenarios/`. Only a `.gitkeep` exists. The integration tests create temp directories instead, which is fine for test isolation but means the fixture directory adds noise. Minor cleanup opportunity.

**m-3. `discoverProjectDirectories` does not sort output**

At `packages/cli/src/commands/cleanup/project/project.ts:61-88`, the order of discovered directories depends on filesystem ordering (which varies by OS). While the final action list is sorted by `normalizeCleanupActions`, deterministic discovery ordering would improve debuggability.

**m-4. `scanCleanupProjectDrift` is exported but only used in tests**

At `packages/cli/src/commands/cleanup/project/project.ts:258-269`, this function duplicates logic from `runCleanupProject` with `apply=false`. It exists only as a convenience for the test file. The command action handler calls `runCleanupProject` directly.

---

## Requirements Coverage

| # | Requirement (from imported plan) | Status | Notes |
|---|----------------------------------|--------|-------|
| AC-1 | `oat cleanup project` detects and remediates project-state drift with dry-run/apply | Met | Full implementation with tests covering pointer, state, lifecycle drift |
| AC-2 | `oat cleanup artifacts` auto-prunes duplicate chains to latest version | Partially Met | Planning utilities implemented and tested, but not wired into command execution |
| AC-3 | Users can interactively Keep/Archive/Delete stale artifacts in one flow | Partially Met | Interactive triage function implemented and tested, but not accessible from CLI command |
| AC-4 | Archive moves follow repo archive path conventions | Met (at utility level) | `resolveArchiveBasePath` and `buildArchiveTargetPath` correctly implement archive routing |
| AC-5 | Non-interactive mutation paths are safe and explicit | Met (at utility level) | Safety gate logic correctly blocks referenced candidates and requires `--all-candidates --yes` |
| AC-6 | Command outputs are deterministic and audit-friendly | Met (for project) | Deterministic sorting, stable JSON contract, tested payload shapes |
| Plan: `--apply` option on artifacts | Not Met | Artifacts command has no `--apply` option |
| Plan: `--all-candidates` option | Not Met | Artifacts command has no options at all |
| Plan: `--yes` option | Not Met | Artifacts command has no options at all |
| Plan: Exit code 1 for actionable issues | Not Met | `cleanup project` always exits 0; artifacts has no action handler |
| Plan: Exit code 2 for runtime errors | Not Met | No error handling in command action |
| Plan: JSON output for artifacts | Not Met | Artifacts command produces no output |

---

## Extra Work Not in Requirements

| Item | Description |
|------|-------------|
| `selectManyOrEmpty` helper | Added to `shared.prompts.ts` -- useful utility beyond this project, normalizes abort to empty array |
| `selectManyOrEmpty` test | Added test in `shared.prompts.test.ts` |
| Backlog updates | Both cleanup backlog items marked as completed with detailed notes |
| External plan status annotation | Added implementation status section to the external plan document |

---

## Verification Commands

```bash
# Tests
pnpm --filter @oat/cli test
# Expected: all tests passing

# Lint
pnpm --filter @oat/cli lint
# Expected: no errors (warnings in existing unrelated files are acceptable)

# Type check
pnpm --filter @oat/cli type-check
# Expected: no errors
```

---

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
