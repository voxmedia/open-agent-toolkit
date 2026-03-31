---
oat_generated: true
oat_generated_at: 2026-03-31
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/archive-sync-closeout-config
---

# Code Review: final (6a80c6a..fa35fe7)

**Reviewed:** 2026-03-31
**Scope:** Final code review for all 7 tasks (p01-t01 through p03-t02) in import-mode project
**Files reviewed:** 23
**Commits:** 14 (6a80c6a..fa35fe7)

## Summary

The implementation faithfully delivers all requirements from the imported plan across three phases: archive config foundations, archive sync and closeout automation, and config discoverability. Code quality is solid with clean dependency injection patterns, comprehensive test coverage for the happy paths, and well-structured documentation updates. The main gaps are in edge-case test coverage for error paths in the archive sync command.

## Evidence Sources

**Artifacts reviewed:**

- `references/imported-plan.md` (primary requirements source for import mode)
- `plan.md` (normalized execution plan)
- `implementation.md` (execution log and outcomes)
- `state.md` (lifecycle state)

**Design alignment:** Not applicable (design artifact not present for import mode).

## Findings

### Critical

None

### Important

- **Missing test for `--force` without project name error path** (`packages/cli/src/commands/project/archive/index.ts:160`)
  - Issue: The `--force` flag validation guard (`if (options.force && !projectName)`) has no test coverage. This is a user-facing error path that should be protected from regressions.
  - Fix: Add a test in `index.test.ts` that calls `runArchiveSyncCommand(command, { commandArgs: ['--force'] })` and asserts that `capture.error[0]` contains the expected message and `process.exitCode` is 1.
  - Requirement: Imported plan "Support `--force`" -- the constraint that force requires a named project needs coverage.

- **Missing test for missing `archive.s3Uri` error path** (`packages/cli/src/commands/project/archive/index.ts:172`)
  - Issue: The error when `archive.s3Uri` is not configured has no test coverage. The default test harness always provides a config with `archive.s3Uri` set, so this path is never exercised.
  - Fix: Add a test in `index.test.ts` with `createHarness({ config: { version: 1 } })` and assert the error message about requiring `archive.s3Uri` and exit code 1.
  - Requirement: Imported plan "Add `oat project archive sync [project-name]`" -- the fail-fast behavior when config is missing is part of the command contract.

### Medium

- **Duplicated `ExecFileLike` and `ExecFileResult` types across archive files** (`packages/cli/src/commands/project/archive/archive-utils.ts:17-26`, `packages/cli/src/commands/project/archive/index.ts:23-31`)
  - Issue: Both `archive-utils.ts` and `index.ts` define identical `ExecFileLike` and `ExecFileResult` types. If the signature changes in one, the other may drift.
  - Suggestion: Export `ExecFileLike` and `ExecFileResult` from `archive-utils.ts` and import them in `index.ts`.

- **Mixed posix/platform path helpers for local archive root resolution** (`packages/cli/src/commands/project/archive/index.ts:74-76` vs `archive-utils.ts:116-123`)
  - Issue: `resolveLocalArchiveRoot` in `index.ts` uses `node:path.join` (platform-specific) while `resolveLocalArchiveProjectPath` in `archive-utils.ts` uses `posix.join`. Both produce the same result on macOS/Linux, but the intent differs. Since these paths are used with `aws s3 sync`, posix semantics are the expected contract.
  - Suggestion: Use `posix` consistently for archive path construction, or add a comment to `resolveLocalArchiveRoot` explaining why platform join is acceptable in this context (the path is passed to a local filesystem operation, not an S3 URI).

### Minor

- **No JSON output mode test for `oat config describe`** (`packages/cli/src/commands/config/index.test.ts`)
  - Issue: The `supports json mode for get, set, and list` test does not cover `describe`. The JSON path exists in `runDescribe` (line 812-816 of `index.ts`) but has no test assertion.
  - Suggestion: Add a test case that calls `runCommand(command, ['describe'], ['--json'])` and asserts the JSON payload has `status: 'ok'` and an `entries` array.

- **No JSON output mode test for `oat project archive sync`** (`packages/cli/src/commands/project/archive/index.test.ts`)
  - Issue: The archive sync command supports JSON output (lines 214-221 of `index.ts`) but no test exercises this path.
  - Suggestion: Add one test with `createHarness({ json: true })` and assert the JSON payload structure.

- **No test for wildcard provider key resolution in `describe`** (`packages/cli/src/commands/config/index.test.ts`)
  - Issue: The `matchesCatalogKey` function (line 645-656 of `index.ts`) does regex matching for wildcard provider keys like `sync.providers.<name>.enabled`, but this is never tested with a concrete key like `sync.providers.github.enabled`.
  - Suggestion: Add a test that calls `describe sync.providers.github.enabled` and asserts it resolves to the wildcard catalog entry.

- **Timestamp collision edge case in `resolveUniqueArchivePath`** (`packages/cli/src/commands/project/archive/archive-utils.ts:136-148`)
  - Issue: If the timestamped path also already exists (unlikely but possible), a collision occurs. The function does not check after appending the suffix.
  - Suggestion: Low priority. Document the assumption or add a simple retry loop if needed later.

## Requirements/Design Alignment

**Evidence sources used:** `references/imported-plan.md`, `plan.md`, `implementation.md`

### Requirements Coverage

| Requirement                                                                                    | Status      | Notes                                                                                                     |
| ---------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| Archive config keys (`archive.s3Uri`, `archive.s3SyncOnComplete`, `archive.summaryExportPath`) | implemented | Config types, normalization, and get/set wired in p01-t01                                                 |
| `git.defaultBranch` in config get/set                                                          | implemented | Added to `ConfigKey`, `KEY_ORDER`, `getConfigValue`, `setConfigValue`                                     |
| Reusable archive path resolution helpers                                                       | implemented | `buildRepoArchiveS3Uri`, `buildProjectArchiveS3Uri`, `resolveLocalArchiveProjectPath` in archive-utils.ts |
| AWS CLI presence checks                                                                        | implemented | `ensureS3ArchiveAccess` with ENOENT detection                                                             |
| AWS CLI usability checks                                                                       | implemented | `ensureS3ArchiveAccess` with `sts get-caller-identity`                                                    |
| Completion vs sync warning/error differentiation                                               | implemented | `mode: 'completion'` returns warnings, `mode: 'sync'` throws CliError                                     |
| `oat project archive sync [project-name]`                                                      | implemented | Full sync, single-project sync, `--dry-run`, `--force`, non-destructive default                           |
| No-delete default behavior                                                                     | implemented | `aws s3 sync` without `--delete` flag                                                                     |
| `--force` limited to named project                                                             | implemented | Guard at line 160 of index.ts (untested error path)                                                       |
| Completion-time local archive                                                                  | implemented | `archiveProjectOnCompletion` copies project, removes source                                               |
| Completion-time S3 upload                                                                      | implemented | Conditional on config, warning-tolerant                                                                   |
| Completion-time summary export                                                                 | implemented | Conditional on config, copies summary.md                                                                  |
| Warning-tolerant completion                                                                    | implemented | S3 and summary export failures produce warnings, not errors                                               |
| Skill delegation for completion archive                                                        | implemented | `oat-project-complete/SKILL.md` references canonical CLI helper behavior                                  |
| Auto-refresh summary in pr-final                                                               | implemented | SKILL.md updated, contract test added                                                                     |
| Auto-refresh summary in completion                                                             | implemented | SKILL.md updated, contract test added                                                                     |
| `oat config describe [key]`                                                                    | implemented | Grouped catalog, per-key detail, text and JSON output                                                     |
| Config catalog covering shared/local/user/sync surfaces                                        | implemented | All four config surfaces represented in `CONFIG_CATALOG`                                                  |
| Metadata fields (scope, file, type, default, mutability, owning command)                       | implemented | `ConfigCatalogEntry` interface and `formatCatalogDetails`                                                 |
| `git.defaultBranch` documented in catalog                                                      | implemented | Entry in `CONFIG_CATALOG` with shared repo group                                                          |
| Docs: config discovery guidance                                                                | implemented | cli-reference.md, file-locations.md, oat-directory-structure.md, provider-sync/config.md                  |
| Docs: archive config keys and warning semantics                                                | implemented | lifecycle.md, oat-directory-structure.md, file-locations.md                                               |
| Docs: archive sync command naming and usage                                                    | implemented | cli-reference.md, lifecycle.md                                                                            |
| Help snapshots updated                                                                         | implemented | `config --help` and `project --help` snapshots                                                            |
| Backlog item updated                                                                           | implemented | project-complete-cli-helper.md updated with implementation note                                           |

### Extra Work (not in declared requirements)

None. All changes map directly to imported plan requirements or necessary wiring (e.g., registering the archive subcommand under `oat project`, updating help snapshots).

## Verification Commands

Run these to verify the implementation:

```bash
# All targeted test suites
pnpm --filter @tkstang/oat-cli test -- src/config/oat-config.test.ts src/commands/config/index.test.ts src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/index.test.ts src/commands/help-snapshots.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts

# Full test suite
pnpm --filter @tkstang/oat-cli test

# Type checking
pnpm type-check

# Docs build
pnpm build:docs
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the 2 Important findings into plan fix tasks.
