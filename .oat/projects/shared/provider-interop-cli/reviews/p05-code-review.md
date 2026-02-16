---
oat_generated: true
oat_generated_at: 2026-02-14
oat_review_scope: p05
oat_review_type: code
oat_project: .oat/projects/shared/provider-interop-cli
---

# Code Review: Phase 5 (Git Hook, Polish, E2E)

**Reviewed:** 2026-02-14
**Scope:** p05 (5 tasks, 5 commits)
**Range:** d134225..5791842
**Files reviewed:** 12
**Lines:** +1,050 / -128
**Test count:** 262 (up from 219 in p04)

## Summary

Phase 5 implements the final layer of the OAT CLI: a canonical `engine/hook.ts` module for git pre-commit hook management, edge-case hardening across engine/manifest/drift, adapter contract tests, help output snapshot tests, and end-to-end workflow tests. The implementation is clean and well-structured. All 262 tests pass, type-check is clean, lint reports zero issues, and the built CLI produces correct help output.

The hook module is well-designed with proper idempotency, marker-based section management, and correct delegation from `init/index.ts`. The `init` command was properly refactored to import from `engine/hook` with no residual inline hook logic. Edge cases are handled defensively with appropriate `CliError` usage. The e2e tests cover all five required workflows with real filesystem operations. The overall quality is high with no critical or important findings.

## Findings

### Critical

None.

### Important

None.

### Medium

**M1: `uninstallHook` leaves an empty pre-commit file when OAT was the sole hook content**
- File: `packages/cli/src/engine/hook.ts:175-176`
- When the OAT section is the only content in `pre-commit`, `removeHookSnippet` correctly returns an empty string. However, `uninstallHook` writes this empty string to the file rather than deleting it. This leaves a zero-byte `pre-commit` file in `.git/hooks/` which, while harmless (git ignores empty hooks), is untidy and could confuse users inspecting their hooks directory.
- **Fix:** After `removeHookSnippet`, if the result is empty, delete the hook file with `rm(hookPath)` instead of writing an empty string. Add a test case: "uninstallHook removes hook file entirely when OAT is the only content."

**M2: `runHookCheck` double-catches errors in status command execution**
- File: `packages/cli/src/engine/hook.ts:199-204`
- The `runStatusCommandDefault` function already catches all errors and returns `false`. Then `runHookCheck` wraps the call in another try/catch that also catches and sets `inSync = false`. The outer catch is unreachable when using the default implementation. While the outer catch provides safety for custom `runStatusCommand` injections that might throw, this redundancy is worth a brief comment explaining the defensive contract.
- **Fix:** Add an inline comment on the outer try/catch explaining it exists as a safety net for injected `runStatusCommand` implementations. Alternatively, remove the outer try/catch since the interface contract (returning a boolean) should be sufficient.

**M3: Edge-case test for concurrent manifest writes has a weak assertion**
- File: `packages/cli/src/engine/edge-cases.test.ts:86-95`
- The concurrent write test fires 8 parallel `saveManifest` calls, then asserts the loaded manifest has exactly 1 entry. This test validates that atomic writes (temp + rename) don't corrupt the file, which is good. However, the assertion `expect(loaded.entries).toHaveLength(1)` only proves the last write won. It doesn't verify that the file isn't corrupted -- any single valid manifest would pass. A stronger assertion would verify the loaded manifest passes schema validation explicitly.
- **Fix:** Add `expect(() => ManifestSchema.parse(loaded)).not.toThrow()` to make the corruption-safety intent explicit. The current assertion is acceptable but could be more expressive about what it tests.

**M4: E2e `runCli` helper patches `process.stdout.write` with a type assertion**
- File: `packages/cli/src/e2e/workflow.test.ts:56-67`
- The stdout/stderr capture patches use `as unknown as (chunk: unknown) => boolean` casts. This is understandable for test infrastructure, but if `commander` or any library checks the arity or signature of `write`, the cast could silently break. This is a test-only concern and acceptable, but worth noting.
- **Fix:** No immediate action needed. If e2e tests become flaky in the future, consider using a writable stream approach instead of patching process streams directly.

**M5: Help snapshot tests do not cover `providers inspect` subcommand**
- File: `packages/cli/src/commands/help-snapshots.test.ts`
- The plan specifies snapshots for: root, init, status, sync, providers, providers list, doctor (7 total). The implementation covers all 7. However, `providers inspect <provider>` is a notable subcommand that is not snapshot-tested. Since all other leaf commands are covered, this is a minor gap.
- **Fix:** Consider adding a snapshot for `providers inspect --help` for completeness, especially since `inspect` takes a required argument which affects its help text. This is optional -- the plan does not explicitly require it.

### Minor

**m1: `resolveHooksDirectory` handles symlinked `.git/hooks` but not symlinked `.git` itself**
- File: `packages/cli/src/engine/hook.ts:41-74`
- The function correctly handles `.git/hooks` being a symlink (e.g., from husky or lefthook configurations). However, `.git` itself being a symlink (less common, but possible in worktree setups) is not explicitly handled. The code would still work via normal path resolution, so this is informational only.
- **Fix:** None needed. The current behavior is correct for standard git setups. Document as a known limitation for exotic git configurations.

**m2: Hook snippet uses `oat status` without `--scope project`**
- File: `packages/cli/src/engine/hook.ts:27-29`
- The hook snippet runs `oat status >/dev/null 2>&1` which defaults to `--scope all`, potentially checking user-level scope too. Since the hook is project-level (installed in `.git/hooks/`), it would be more precise to use `oat status --scope project`.
- **Fix:** Change the hook snippet to `oat status --scope project >/dev/null 2>&1`. This is a minor precision improvement and the current behavior is functionally correct.

**m3: Contract test `assertMappingsValid` validates paths start with `.` but doesn't validate providerDir format**
- File: `packages/cli/src/providers/shared/adapter-contract.test.ts:16-29`
- The assertion checks `mapping.providerDir.startsWith('.')` and `!mapping.providerDir.includes('..')`, but unlike `canonicalDir` it doesn't validate a more specific pattern. Codex skills have `nativeRead: true` with `providerDir === '.agents/skills'` (same as canonical), which passes validation but isn't explicitly tested as an expected pattern for native-read mappings.
- **Fix:** Consider adding a `nativeRead`-aware assertion: when `nativeRead` is true, `providerDir` should equal `canonicalDir`. This is optional.

**m4: Adapter contract test `detect function is callable` only asserts return type, not functionality**
- File: `packages/cli/src/providers/shared/adapter-contract.test.ts:65-71`
- The test creates an empty temp directory and calls `detect()`, asserting the return is a boolean. Since none of the provider directories exist in the temp dir, all adapters return `false`. The test verifies the function is callable and returns the correct type, which matches the plan requirement ("callable detect"). A stronger test would also verify `detect` returns `true` when the provider directory exists.
- **Fix:** Optional: add a second case that creates the provider directory and verifies `detect` returns `true`. This is beyond the plan's stated requirement.

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Covered | Notes |
|---|---|---|
| FR11: Hook consent via `oat init` | Yes | Interactive prompt, `--hook`/`--no-hook` flags, non-interactive guidance |
| FR11: Hook warns on drift | Yes | Snippet prints warning to stderr when `oat status` fails |
| FR11: Hook does NOT block commits | Yes | Hook exits 0 regardless; uses `if/fi`, no `set -e` |
| FR11: Hook can be uninstalled cleanly | Yes | `uninstallHook` removes OAT section only; `--no-hook` triggers uninstall |
| NFR1: Safety by default | Yes | Hook is opt-in, warning-only; edge cases throw CliError with guidance |
| NFR5: Idempotency | Yes | `installHook` checks for existing marker; double-install tested |
| NFR3: Extensibility | Yes | Contract tests validate adapter interface across all 3 providers |
| NFR4: Clear user communication | Yes | Help snapshots verify stable command descriptions |

### Design Decision Compliance

| Decision | Compliant | Notes |
|---|---|---|
| Hook module in `engine/hook.ts` | Yes | Canonical implementation with 4 exported functions |
| Init delegates to hook module | Yes | Imports from `../../engine`, no inline hook logic |
| Marker-based idempotent sections | Yes | `HOOK_MARKER_START` / `HOOK_MARKER_END` used for section identification |
| Warning-only hook (exit 0) | Yes | Hook snippet uses `if/fi` without `set -e` or `exit 1` |
| Contract tests reusable across adapters | Yes | Single `for..of` loop over all 3 adapters |
| Inline snapshots for help output | Yes | All 7 tests use `toMatchInlineSnapshot()` |
| E2e tests on real filesystem | Yes | `mkdtemp` + `createWorkspace` with proper cleanup |

### Extra Work

None. All changes are within the scope of p05 tasks.

## Test Quality

### New Tests Added (p05)

| File | Tests | Quality |
|---|---|---|
| `engine/hook.test.ts` | 8 | Good: covers install, preserve, idempotent, uninstall, no-op uninstall, detect, drift warning, non-blocking. Uses real filesystem. |
| `engine/edge-cases.test.ts` | 5 | Good: covers empty dirs, permission denied, corrupt manifest, concurrent writes, non-directory entries. Real filesystem with cleanup. |
| `providers/shared/adapter-contract.test.ts` | 18 (6 x 3 adapters) | Good: reusable validation suite. Validates name, displayName, strategy, project/user mappings, detect callable. |
| `commands/help-snapshots.test.ts` | 7 | Good: inline snapshots for all major commands. Easy to maintain and update. |
| `e2e/workflow.test.ts` | 5 | Good: covers fresh repo, drift, adoption, copy fallback, removal. Real filesystem with proper cleanup. |

### Total Test Count

- **p04 total:** 219
- **p05 total:** 262
- **Net new:** +43

### Coverage Observations

- Hook module has strong unit + integration coverage via both `hook.test.ts` and `init/index.test.ts`
- E2e tests exercise the full command pipeline (createProgram + registerCommands + parseAsync) with real filesystem operations
- Edge-case tests are well-structured and test defensive error handling
- Contract tests ensure adapter interface compliance will catch regressions when adding new providers
- Help snapshots will catch accidental CLI surface changes during future refactors

## Verification Commands

All passed on 2026-02-14:

```
pnpm --filter=@oat/cli test         # 262 passed (39 test files)
pnpm --filter=@oat/cli type-check   # clean
pnpm --filter=@oat/cli lint         # 102 files checked, no fixes
pnpm --filter=@oat/cli build        # clean
node packages/cli/dist/index.js --help  # correct output
```

## Verdict

**PASS** -- Phase 5 is complete and ready for final release preparation. All plan tasks are implemented, all tests pass, and the code is clean. The findings are all Medium or Minor severity with no blockers. The hook module, edge-case handling, contract tests, help snapshots, and e2e workflow tests are well-implemented and align with the spec and design.

## Recommended Next Step

Run `oat-project-review-receive` to convert findings into plan tasks.
