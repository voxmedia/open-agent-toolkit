---
oat_generated: true
oat_generated_at: 2026-02-13
oat_review_scope: p04
oat_review_type: code
oat_project: .oat/projects/shared/provider-interop-cli
---

# Code Review: Phase 4 (Commands)

**Reviewed:** 2026-02-13
**Scope:** p04 (8 tasks, 8 commits)
**Range:** b5c2e8f..ea20ecd
**Files reviewed:** 25 (21 Phase 4 files + 4 context files from prior phases)
**Lines added:** ~3,997

## Summary

Phase 4 implements all five CLI commands (status, sync, init, providers list/inspect, doctor) and wires them into the entrypoint. The commands are well-structured with consistent dependency injection for testability, proper scope resolution, and JSON output. However, there are several spec deviations: the git hook installation produces a non-functional hook (missing shebang and chmod), `oat status` does not implement per-stray adoption prompts per FR8, `oat init` lacks JSON output, `providers list` omits required fields from FR12, and the integration test has weak symlink assertions.

## Findings

### Critical

None

### Important

**I1: Git hook is non-functional — missing shebang and executable permission**
- File: `packages/cli/src/commands/init/index.ts:105-113`
- The `createHookSnippet()` function generates a hook script without `#!/bin/sh` shebang line. The `installHookDefault()` function writes the file with `writeFile` but never calls `chmod` to set the executable bit. Git silently ignores non-executable hooks, so `oat init --hook` installs a hook that will never run.
- **Fix:** Add `#!/bin/sh\n` as the first line when creating a new hook from scratch (not when appending to existing). After writing, call `chmod(hookPath, 0o755)` or `chmod(hookPath, '755')`. Both are needed for the hook to function.

**I2: Hook script suppresses all output, violating FR11**
- File: `packages/cli/src/commands/init/index.ts:109`
- The hook script runs `oat status >/dev/null 2>&1 || true`, which redirects all output to `/dev/null`. FR11 states "Hook runs drift detection and prints a warning if provider views are out of sync." The current implementation silently swallows drift warnings.
- **Fix:** Change to something like `oat status --json 2>/dev/null | oat-hook-format` or more simply `oat status 2>&1 || true` (keeping output visible). If the intent is to only warn, consider a dedicated flag like `oat status --hook-mode` or use a simpler approach: `oat status 2>&1 | head -5 || true` to show brief drift info. At minimum, stderr should be shown: `oat status >/dev/null || echo "oat: provider views are out of sync — run 'oat sync --apply' to fix" >&2`.

**I3: `oat status` does not implement per-stray adoption per FR8**
- File: `packages/cli/src/commands/status/index.ts:256-268`
- FR8 states: "Detection occurs during `oat status` and `oat init`. For each stray, user is prompted interactively: adopt (move to `.agents/` + create symlink/copy back) or skip."
- The status command only prompts "Stray entries detected. Adopt them now with `oat init`?" — a single confirm prompt that redirects the user to `oat init`. It does not perform per-stray adoption directly.
- The design for `oat status` also says: "If strays found AND interactive: prompt for adoption."
- **Fix:** Either implement per-stray adoption in the status command (matching FR8), or document this as a deliberate simplification and update the spec accordingly. Given that `oat init` handles full adoption, this may be acceptable as-is, but the spec deviation should be acknowledged.

**I4: `providers list` JSON output missing `defaultStrategy` and `contentTypes` per FR12**
- File: `packages/cli/src/commands/providers/providers.types.ts:16-21`, `packages/cli/src/commands/providers/list.ts:168-174`
- FR12 states: "`oat providers list` enumerates all registered provider adapters with detection status, **default strategy**, **supported content types**, and sync status summary."
- The `ProviderListItem` type only has `name`, `displayName`, `detected`, and `summary`. It is missing `defaultStrategy` and `contentTypes`.
- **Fix:** Add `defaultStrategy: SyncStrategy` and `contentTypes: ContentType[]` to `ProviderListItem`. Populate from adapter config in `collectProviderList()`. Include in both human-readable table and JSON output.

**I5: `oat init` has no JSON output path**
- File: `packages/cli/src/commands/init/index.ts:296-350`
- All other commands (status, sync, providers, doctor) produce structured JSON output when `--json` is passed. The init command never calls `context.logger.json()`. Since info/warn/success are no-ops in JSON mode, `oat init --json` produces zero output.
- **Fix:** Add a JSON summary output at the end of `runInitCommand()` when `context.json` is true, containing at minimum: `{ scope, directoriesCreated, straysFound, straysAdopted, hookInstalled }`.

### Medium

**M1: Integration test has weak symlink assertions**
- File: `packages/cli/src/commands/commands.integration.test.ts:159-173`
- The test asserts `lstat(path).resolves.toMatchObject({ isSymbolicLink: expect.any(Function) })` which only checks that the `Stats` object has an `isSymbolicLink` method. All `Stats` objects have this method, so this assertion passes for regular files and directories too.
- **Fix:** Use `const stat = await lstat(path); expect(stat.isSymbolicLink()).toBe(true);` for each symlink assertion.

**M2: Duplicated `LoggerCapture` helper across all test files**
- Files: All 8 test files define the same `LoggerCapture` interface and `createLoggerCapture()` factory.
- This is ~30 lines of boilerplate repeated 8 times (240 lines total). A shared test utility would reduce duplication and make updates easier.
- **Fix:** Create a shared test helper in `src/commands/__tests__/helpers.ts` (or similar) that exports `createLoggerCapture()`, `createTestContext()`, and `runWithProgram()`.

**M3: Duplicated `resolveScopes()` and `readGlobalOptions()` across commands**
- Files: `status/index.ts`, `sync/index.ts`, `init/index.ts`, `providers/list.ts`, `providers/inspect.ts`, `doctor/index.ts` all define identical `resolveScopes()` and `readGlobalOptions()` functions.
- **Fix:** Extract to a shared command utility module (e.g., `src/commands/shared.ts` or `src/shared/utils.ts`).

**M4: Duplicated `ConcreteScope` type definition**
- Files: `status/index.ts:29`, `sync/sync.types.ts:8`, `init/index.ts:40`, `providers/providers.types.ts:7`, `doctor/index.ts:18` all define `type ConcreteScope = Exclude<Scope, 'all'>`.
- **Fix:** Export from `src/shared/types.ts` alongside the `Scope` type.

**M5: `oat inspect` formats provider details with empty mappings arrays**
- File: `packages/cli/src/commands/providers/inspect.ts:150-164`
- The `formatInspect()` function calls `formatProviderDetails()` with `projectMappings: []` and `userMappings: []`, then appends its own mapping lines. This means `formatProviderDetails()` always reports "Project mappings: none" and "User mappings: none" in the first section, while the actual mappings are shown separately below. The formatting is misleading.
- **Fix:** Either pass the real adapter mappings to `formatProviderDetails()`, or restructure the output so the "none" label doesn't appear when mappings exist.

**M6: Stray adoption in `oat init` doesn't support "skip all" option**
- File: `packages/cli/src/commands/init/index.ts:331-343`
- FR8 states: "Users can skip all remaining strays with a single action." The current implementation prompts for each stray individually with a simple confirm, but there's no "skip all" option.
- **Fix:** Add a "skip all remaining" response to the adoption loop (e.g., track a `skipAll` flag or use `selectWithAbort` with adopt/skip/skip-all choices).

### Minor

**m1: Status command doesn't detect missing entries from canonical**
- File: `packages/cli/src/commands/status/index.ts:188-207`
- The status command only iterates manifest entries to detect drift. It does not detect "missing" entries where canonical content exists but no provider view exists and no manifest entry exists (i.e., content that has never been synced). These show up as "nothing" rather than "missing." This is fine for post-sync workflows but could be confusing for users who haven't run `oat sync` yet.

**m2: `oat providers inspect` test does not verify `--scope` flag behavior**
- File: `packages/cli/src/commands/providers/inspect.test.ts`
- The list command has a `--scope` test, but inspect does not. The functionality works (scope is read from global options) but there's no test coverage.

**m3: Hook installation doesn't handle the case where `.git/hooks/` has a symlink**
- File: `packages/cli/src/commands/init/index.ts:133-161`
- If `.git/hooks` itself is a symlink (common in some git worktree setups), `ensureDir(dirname(hookPath))` would attempt to create the symlink target path rather than the expected hooks directory. This is an edge case.

**m4: `checkSymlinkSupportDefault` creates a dangling symlink**
- File: `packages/cli/src/commands/doctor/index.ts:56-71`
- The symlink test points to a target directory that was never created. This works on macOS/Linux (symlinks can be dangling) but is worth a comment to explain the intent. It tests that the `symlink` syscall succeeds, not that symlinks work end-to-end.

**m5: Doctor missing Codex agent check per FR4**
- File: `packages/cli/src/commands/doctor/index.ts`
- FR4 states: "For Codex subagent support: reports whether Codex agents path is functional (best-effort)." The doctor command checks provider detection generically but doesn't have a specific Codex agent path check.

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR1 (init) | partial | Creates dirs, manifest, adoption flow works. Missing JSON output. Hook install is non-functional (I1, I2). Missing "skip all" in adoption (M6). |
| FR2 (status) | implemented | Drift detection, stray detection, JSON output, exit codes all correct. |
| FR3 (sync) | implemented | Dry-run safety verified, `--apply` creates symlinks and updates manifest, JSON output, partial failure handling. |
| FR4 (doctor) | partial | Checks canonical dirs, manifest, symlinks, providers. Missing specific Codex agent check (m5). |
| FR7 (drift in status) | implemented | Drift states (in_sync, drifted:modified/broken/replaced, missing, stray) correctly surfaced. |
| FR8 (stray adoption) | partial | Works in `oat init` (per-stray prompts). Not implemented in `oat status` (I3). Missing "skip all" (M6). |
| FR10 (generated views) | n/a | Handled by sync engine in Phase 2. Commands wire through correctly. |
| FR11 (hook consent) | partial | Consent flow is correct (--hook/--no-hook, interactive prompt, non-interactive skip). Hook script itself is non-functional (I1, I2). |
| FR12 (providers) | partial | List and inspect work. List missing `defaultStrategy` and `contentTypes` (I4). Inspect has case-insensitive lookup, version display, per-mapping state. |
| NFR1 (safety) | implemented | Sync dry-run makes zero changes. Init is idempotent. No manifest-untracked content is modified. |
| NFR4 (communication) | implemented | Consistent table formatting, JSON mode works, fix suggestions in doctor. |
| NFR5 (idempotency) | implemented | Init re-run is safe. Sync re-run produces no changes. Verified in integration test. |

### Design Decision Compliance

| Decision | Status | Notes |
|----------|--------|-------|
| Command-factory pattern | compliant | All commands use `createXCommand(): Command` factories with dependency injection. |
| Non-interactive contract | compliant | All commands skip prompts when `!ctx.interactive`. Remediation text provided. |
| JSON output contract | mostly compliant | status, sync, providers list, providers inspect, doctor all have JSON output. Init is missing JSON output (I5). |
| Exit code contract (0/1/2) | compliant | Status: 0=sync, 1=drift. Sync: 0=success, 1=partial. Doctor: 0=pass, 1=warn, 2=fail. Providers: 0=success, 1=not found. |
| No direct console in commands | compliant | All output goes through `CliLogger`. |
| Centralized output formatters | compliant | Commands use `formatStatusTable`, `formatSyncPlan`, `formatDoctorResults`, `formatProviderDetails` from `ui/output.ts`. |
| `--scope` flag support | compliant | All commands respect scope via `resolveScopes()`. |
| Dependency injection for testability | compliant | All commands accept `overrides: Partial<Dependencies>` for test mocking. |

### Extra Work (not in requirements)

- Hook installation/uninstallation was partially implemented in p04-t03 (init command), though the plan assigns full hook logic to p05-t01. The init command includes `isHookInstalled`, `installHook`, and `createHookSnippet` implementations. Phase 5's p05-t01 is for the full hook module with `uninstallHook` and `runHookCheck`. This overlap is reasonable since init needs basic hook support for the consent flow.

## Test Quality

**Strengths:**
- All 8 p04 test files pass (42 tests total in p04 scope, 209 total in package)
- Dependency injection makes unit tests fast and deterministic (no filesystem access in unit tests)
- Good coverage of core flows: JSON mode, scope flag, exit codes, interactive vs non-interactive
- Integration tests use real filesystem with proper cleanup
- Process.exitCode save/restore pattern prevents test pollution

**Gaps:**
- Integration test symlink assertions are weak (M1) -- they verify existence but not symlink-ness
- No test for `oat init --json` (produces no output currently)
- No `--scope` test for `providers inspect`
- No test for hook execution (hook file is actually runnable by git) -- would require a git commit test
- No test for the hook's shebang/chmod behavior
- No negative test for malformed `--scope` values in commands
- Duplicated test utilities across all 8 test files (M2)
- No test verifying that `oat init` on a scope where canonical dirs already exist skips creation (mkdir recursive handles this, but no explicit assertion)

**Edge Cases Covered:**
- Idempotency (init + sync twice)
- Empty repo init
- Non-interactive mode with strays
- Partial sync failure
- Provider not found (inspect)
- Case-insensitive provider name resolution
- Manifest validation failure in doctor
- Missing canonical directories in doctor

## Verification Commands

After fixing findings, run:

```bash
# Full test suite
pnpm --filter=@oat/cli test

# Type-check
pnpm --filter=@oat/cli type-check

# Lint
pnpm --filter=@oat/cli lint

# Integration test specifically
pnpm --filter=@oat/cli test src/commands/commands.integration.test.ts

# Verify hook functionality manually after fixing I1/I2:
# 1. Create temp git repo
# 2. Run oat init --hook
# 3. Verify .git/hooks/pre-commit has shebang and is executable
# 4. Verify hook prints drift warnings on commit
```

## Recommended Next Step

Run `oat-project-review-receive` to convert findings into plan tasks.
