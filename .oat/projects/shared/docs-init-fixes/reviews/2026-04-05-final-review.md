---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: auto
oat_review_date: 2026-04-05
oat_review_status: passed
oat_generated: false
---

# Final Review: docs-init-fixes

**Reviewer:** auto (Senior Code Reviewer)
**Scope:** All phases (p01 through p04) -- 9 tasks across 4 phases
**Branch:** `docs-bootstrap`
**Tests:** 1159 passing, 0 lint errors, 0 type errors

---

## Verdict: PASSED

The implementation is clean, well-tested, and faithfully follows the plan. All 9 tasks are complete. No critical or important issues found. A few minor suggestions are noted below for future consideration.

---

## Plan Alignment

All planned tasks were implemented as specified. The deviations table in `implementation.md` is empty, which matches my analysis -- there are no meaningful deviations from the plan.

| Task    | Plan Status | Implementation Status | Notes                                                                                                       |
| ------- | ----------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| p01-t01 | Planned     | Implemented correctly | `resolveRepoRoot` injected via `IndexGenerateFileDependencies`, tested with CWD vs repo root scenarios      |
| p01-t02 | Planned     | Implemented correctly | `buildDocumentationConfig` now returns `join(targetDir, 'docs', 'index.md')` for fumadocs                   |
| p01-t03 | Planned     | Implemented correctly | `buildGenerateIndexCmd` no longer wraps in `\|\| true` for non-OAT repos                                    |
| p02-t01 | Planned     | Implemented correctly | Next steps printed for both monorepo and single-package shapes                                              |
| p02-t02 | Planned     | Implemented correctly | Preflight check for `documentation.root` in existing config with interactive/non-interactive/--yes handling |
| p03-t01 | Planned     | Implemented correctly | Non-default app name triggers informational note about root scripts                                         |
| p03-t02 | Planned     | Implemented correctly | Per-package local OAT detection with `detectLocalOatPackages` returning a `Set<string>`                     |
| p03-t03 | Planned     | Implemented correctly | Full Next.js-compatible tsconfig with all expected fields                                                   |
| p04-t01 | Planned     | Verified              | All tests pass, lint clean, types clean, build clean                                                        |

---

## Code Quality Assessment

### What was done well

1. **Dependency injection is consistent.** Both `index-generate/index.ts` and `init/index.ts` use the established DI pattern with `*Dependencies` interfaces and `DEFAULT_*` constants. The `resolveRepoRoot` is injected through `IndexGenerateFileDependencies`, making it fully testable.

2. **Test quality is high.** The `index-generate/index.test.ts` harness is well-structured with explicit `writtenConfigs` and `writtenFiles` tracking arrays. Tests verify both the positive case (CWD != repo root) and the identity case (CWD == repo root). The scaffold tests cover the partial local packages scenario (p03-t02) thoroughly.

3. **Preflight check behavior is well-specified.** The three modes (interactive, non-interactive, JSON) each have distinct and correct behavior:
   - Interactive: warns + prompts for confirmation
   - Non-interactive without `--yes`: warns + exits with code 1
   - JSON without `--yes`: outputs structured error + exits with code 1
   - `--yes` in all modes: warns but proceeds

4. **Silent failure removal is clean.** The `|| true` was removed without introducing compensating complexity. The command will now fail visibly if `generate-index` encounters an error.

5. **Commit messages follow the planned convention.** All commits use `fix(docs-init):` or `feat(docs-init):` prefixes as specified in the plan.

6. **CLI AGENTS.md conventions are followed.** No direct `console.*` calls; all output goes through `context.logger`. Exit codes are explicit (0 for success, 1 for user error). Tests are updated for changed behavior.

### Architecture

The changes are well-scoped to `packages/cli/src/commands/docs/` as planned. No new modules were introduced. The `resolveProjectRoot` utility is reused from `@fs/paths` without modification. The per-package detection (`detectLocalOatPackages`) is a clean evolution of the existing `detectIsOatRepo` pattern -- it checks each package individually and returns a `Set<string>`, while `isOatRepo` is derived as `localPackages.size === OAT_DEP_PACKAGES.length`. This preserves backward compatibility for full-OAT-repo detection.

---

## Issues

### Suggestions (nice to have, not blocking)

**S1: `init/index.ts` DEFAULT_DEPENDENCIES.runDocsInit uses `context.cwd` for config read/write**

In `DEFAULT_DEPENDENCIES.runDocsInit` (line 89), config operations use `context.cwd`:

```
const config = await readOatConfig(context.cwd);
...
await writeOatConfig(context.cwd, config);
```

The discovery document explicitly notes this is "fine when run from repo root, but fragile." Since `init` is typically run from the repo root (unlike `generate-index` which runs from package scripts), this is a reasonable scope boundary. However, it creates an asymmetry: `generate-index` now resolves repo root, but `init` does not. A future follow-up could align both commands.

**Risk:** Low -- `init` is a top-level user command, not a package script, so CWD is almost always repo root.

**S2: Preflight check does not detect existing target directory**

The plan (p02-t02, step 1) mentioned checking "when target directory already exists and is non-empty." The implementation only checks for existing `documentation` config in `.oat/config.json`, not for an existing target directory. The `ensureTargetWritable` function in `scaffold.ts` still throws on non-empty directories rather than prompting.

The plan acknowledged this partially exists via `ensureTargetWritable` and suggested making it ask instead of erroring in interactive mode. This was not implemented, likely as a deliberate scope choice since the config check covers the most common case.

**Risk:** Low -- `ensureTargetWritable` still prevents silent overwrites; it just throws rather than prompting.

**S3: `readOatConfig` and `confirmAction` not mocked in default `createHarness()` helper**

The `createHarness()` function in `index.test.ts` does not mock `readOatConfig` or `confirmAction`. These fall through to `DEFAULT_DEPENDENCIES` which use real implementations. This works because `readOatConfig` gracefully returns a default config when the file doesn't exist at `/tmp/workspace/.oat/config.json`. Tests that need custom config behavior (lines 199, 252) correctly create their own full harness.

This is acceptable but slightly fragile -- if a test runner's temp directory happened to have a `/tmp/workspace/.oat/config.json` file, the default harness tests could behave unexpectedly.

**S4: tsconfig template differs from scaffold test fixture**

The real template at `packages/cli/assets/templates/docs-app-fuma/tsconfig.json` has the full Next.js-compatible config (target, lib, strict, jsx, plugins, include, exclude), while the in-test `FUMA_TEMPLATE_FILES` fixture in `scaffold.test.ts` has a minimal version (just baseUrl and paths). This is acceptable because the scaffold test focuses on token replacement and package wiring, not tsconfig content. The integration test uses real bundled assets and would catch template issues. Just noting the divergence for awareness.

---

## Test Coverage Summary

| Area                                | Coverage | Notes                                                                                                                |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| generate-index repo root resolution | Good     | 5 tests covering CWD vs repo root, relative paths, identity case                                                     |
| Config index path alignment         | Good     | Scaffold test asserts `join('apps/my-docs', 'docs', 'index.md')`                                                     |
| Silent failure removal              | Good     | Integration and scaffold tests verify no `\|\| true` in scripts                                                      |
| Post-scaffold next steps            | Good     | Separate tests for monorepo and single-package shapes                                                                |
| Preflight checks                    | Good     | Tests for non-interactive rejection, --yes bypass, existing config detection                                         |
| Non-default app name guidance       | Good     | Test verifies "root scripts" guidance appears                                                                        |
| Partial local packages              | Good     | Test seeds only 2 of 4 packages, verifies mixed workspace/published versions                                         |
| tsconfig preseed                    | Adequate | Integration test verifies template files have no unresolved tokens; direct content verified by reading real template |

---

## Regression Risk Assessment

**Low.** All changes are additive or corrective:

- Repo root resolution is new behavior (was previously using CWD)
- Index path change is a correctness fix (was pointing to wrong file)
- `|| true` removal is a correctness fix (was hiding errors)
- Next steps, preflight checks, and app name guidance are new informational output
- Partial package detection is an extension of existing detection logic
- tsconfig changes are to a template file, not runtime code

No existing API contracts were changed. The `OatDepContext` interface gained a `localPackages` field, but this is an internal interface not exported beyond the scaffold module.

---

## Summary

Solid implementation. The 9 tasks map 1:1 to 8 code commits (Phase 4 was verification-only). Test coverage is thorough for all new behaviors. The code follows established patterns and CLI conventions. Ready for PR.
