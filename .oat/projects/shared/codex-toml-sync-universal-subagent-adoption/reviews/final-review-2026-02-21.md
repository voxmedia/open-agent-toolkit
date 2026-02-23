---
oat_generated: true
oat_generated_at: 2026-02-21
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/codex-toml-sync-universal-subagent-adoption
---

# Code Review: Final (all tasks p01-t01 through p07-t02)

**Reviewed:** 2026-02-21
**Scope:** Final review of all uncommitted changes in worktree vs main (f6386c1)
**Files reviewed:** 41 (19 modified, 22 new)
**Commits:** None (all changes uncommitted in worktree)

## Summary

The implementation covers the core plan requirements: canonical subagent parser/renderer, provider codec layer, Codex TOML import/export, config merge, sync extension, stray detection, adoption, doctor/status drift checks, and documentation updates. Tests pass (568/568), types check clean, lint passes. Two critical issues exist: (1) the `status` command's conflict handling throws in non-interactive mode instead of skipping with a warning as required, and (2) missing integration tests for doctor/status/sync/init codex behavior leave important paths unverified at the command level.

## Findings

### Critical

- **Status conflict handler throws in non-interactive mode** (`packages/cli/src/commands/status/index.ts:517`)
  - Issue: The conflict resolution path in `status` uses `selectManyWithAbort()` which throws `CliError('Selection prompt requires interactive mode.')` when `context.interactive === false`. The imported plan (Phase 3, Behavior item 3) requires: "non-interactive: skip with deterministic warning and non-zero issue count". The `init` command correctly uses `confirmAction()` (returns `false` in non-interactive mode), but `status` does not.
  - Fix: Replace the `selectManyWithAbort` call at line 517 with `confirmAction` (matching `init`'s pattern), or add a guard that checks `context.interactive` before calling `selectManyWithAbort` and skips with a `context.logger.warn(...)` message when non-interactive.
  - Requirement: Phase 3, Behavior item 3 -- "non-interactive: skip with deterministic warning and non-zero issue count"

### Important

- **Missing command-level integration tests for codex features in doctor** (`packages/cli/src/commands/doctor/index.test.ts`)
  - Issue: Task p07-t01 requires tests for codex drift/misconfiguration checks (missing role file, modified role file, config role mismatch, unmanaged codex role entries, TOML parse errors, missing/false `features.multi_agent`, role entry references missing file). No codex-specific tests exist in the doctor test file.
  - Fix: Add test cases exercising the new doctor codex check branches (lines 196-300 of `doctor/index.ts`) -- at minimum: parseable TOML pass, unparseable TOML fail, multi_agent warn, role file ref warn.
  - Requirement: p07-t01

- **Missing command-level integration tests for codex features in status** (`packages/cli/src/commands/status/index.test.ts`)
  - Issue: Task p05-t01 requires coverage for codex stray detection via `.codex/config.toml` and `.codex/agents/*.toml` within `status`. Task p07-t01 requires tests for codex drift reporting in status. No codex-specific tests exist in the status test file.
  - Fix: Add test cases verifying that status reports codex drift operations and codex stray candidates when codex adapter is active.
  - Requirement: p05-t01, p07-t01

- **Missing command-level integration tests for codex features in init** (`packages/cli/src/commands/init/index.test.ts`)
  - Issue: Task p05-t01 requires coverage for codex stray detection in `init`. No codex-specific stray/adoption tests exist in the init test file.
  - Fix: Add test cases verifying that init detects codex role strays and presents them for adoption.
  - Requirement: p05-t01

- **Missing command-level integration tests for codex sync extension** (`packages/cli/src/commands/sync/index.test.ts`)
  - Issue: Task p06-t01 requires sync tests for codex extension operations (dry-run reports create/update/remove). No codex-specific tests exist in the sync test file.
  - Fix: Add test cases verifying the codex extension planning is triggered when codex adapter is active at project scope.
  - Requirement: p06-t01

- **Missing conflict behavior tests for adoption** (no test file covers non-interactive conflict skip)
  - Issue: Task p05-t02 requires tests for conflict behavior: "non-interactive deterministic skip + warning". The `adopt-stray.test.ts` tests only cover the `replaceCanonical: true` path. No test verifies the catch-confirm-skip pattern in init or the (broken) status non-interactive path.
  - Fix: Add integration tests in init and status test files that exercise the conflict path both interactively (replace) and non-interactively (skip with warning).
  - Requirement: p05-t02

- **Task p06-t02 aggregate codex config tracking not implemented** (no manifest modifications)
  - Issue: Task p06-t02 specifies adding aggregate config tracking metadata: "record codex aggregate drift in sync/status extension result metadata (including contributing canonical role set + computed config hash)" and "existing one-to-one manifest entry schema remains backward compatible". The `aggregateConfigHash` is present in the `CodexExtensionPlan` and `CodexExtensionSummary` types and populated in sync output, but no manifest-level tracking or test validates this. No modifications were made to `packages/cli/src/manifest/*.ts` files as specified in the task.
  - Fix: Either implement the manifest-level aggregate tracking as specified in p06-t02, or explicitly document that aggregate tracking is carried purely in the extension result metadata without manifest-level persistence (and update the task description to reflect this design delta).
  - Requirement: p06-t02

### Minor

- **`as never` type casts for TOML.stringify** (`packages/cli/src/providers/codex/codec/export-to-codex.ts:65`, `config-merge.ts:87`)
  - Issue: Using `as never` to work around `@iarna/toml` type incompatibility with `Record<string, unknown>`. While functional, this suppresses all type checking on the stringify argument.
  - Suggestion: Create a typed wrapper function `function stringifyToml(obj: Record<string, unknown>): string { return TOML.stringify(obj as TOML.JsonMap); }` in `shared.ts` to centralize the cast and provide clearer intent.

- **Duplicated `isAdoptionConflictError` helper** (`packages/cli/src/commands/init/index.ts:305`, `packages/cli/src/commands/status/index.ts:256`)
  - Issue: The same function is defined identically in both init and status modules.
  - Suggestion: Move to `packages/cli/src/commands/shared/adopt-stray.ts` alongside the `adoptStrayToCanonical` function and re-export.

- **Duplicated codex stray candidate construction** (`packages/cli/src/commands/init/index.ts:211-234`, `packages/cli/src/commands/status/index.ts:383-415`)
  - Issue: The stray candidate object construction for codex (mapping, adoption metadata) is duplicated between init and status.
  - Suggestion: Extract a `buildCodexStrayCandidate(stray: CodexRoleStray)` helper into `codex-strays.ts` and import from both commands.

- **Duplicated codex extension apply-after-adoption block** (`packages/cli/src/commands/init/index.ts:500-509`, `packages/cli/src/commands/status/index.ts:550-563`)
  - Issue: The post-adoption codex regeneration logic (scan, plan, apply) is duplicated between init and status.
  - Suggestion: Extract into a shared helper like `regenerateCodexAfterAdoption(scopeRoot)` in the codex codec or commands/shared module.

- **Render body double-newline handling** (`packages/cli/src/agents/canonical/render.ts:20-21`)
  - Issue: The renderer strips a leading newline from the body, but the parser always returns the body starting after `---\n`. If the original markdown has `---\n\n## Role`, the body will be `\n## Role`. After render, this becomes `---\n\n\n## Role` (three newlines between frontmatter end and heading) unless the body happens to start with exactly one `\n`. The round-trip test in `render.test.ts` passes because it re-parses and compares trimmed body, but the actual rendered output may differ from the original source formatting.
  - Suggestion: Normalize so that the output always has exactly one blank line between `---` and body content, regardless of input body prefix.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (normalized imported plan), `references/imported-plan.md` (original imported plan), `implementation.md`

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Phase 0 (p01-t01): Contract closure / baseline gate docs | implemented | Docs updated in overview.md, reviews.md, providers.md |
| Phase 0.5 (p02-t01): Dependency installation + wiring | implemented | `@iarna/toml@2.2.5`, `yaml@2.8.2` installed; tsconfig alias `@agents/*` added; smoke test exists |
| Phase 1 (p03-t01): Canonical types + parser | implemented | types.ts, parse.ts, parse.test.ts with required/optional fields, extensions, name validation |
| Phase 1 (p03-t02): Canonical renderer + round-trip regressions | implemented | render.ts, render.test.ts with round-trip and extension preservation |
| Phase 2 (p04-t01): Shared codec interfaces + markdown codecs | implemented | agent-codec.types.ts, markdown-agent-codec.ts with tests |
| Phase 2 (p04-t02): Codex TOML import/export + config merge | implemented | import-from-codex.ts, export-to-codex.ts, config-merge.ts, shared.ts all with tests |
| Phase 3 (p05-t01): Provider-aware stray detection | partial | codex-strays.ts with unit tests, but no command-level integration tests in init/status |
| Phase 3 (p05-t02): Adoption handlers + conflict policy | partial | adopt-stray.ts updated with codex_role path and replaceCanonical option; status non-interactive conflict path is broken |
| Phase 4 (p06-t01): Codex sync extension dry-run + apply | partial | sync-extension.ts with unit tests, but no command-level sync integration tests |
| Phase 4 (p06-t02): Aggregate config tracking + manifest | partial | aggregateConfigHash in extension metadata but no manifest-level tracking, no manifest module modifications |
| Phase 5 (p07-t01): Status/doctor codex drift checks | partial | Doctor checks implemented, status drift reporting implemented, but no command-level tests |
| Phase 6 (p07-t02): Provider interop docs + rollout guidance | implemented | README.md, overview.md, providers.md, reviews.md all updated |
| ADR for command-layer extension | implemented | providers.md documents the intentional command-layer approach |
| Codex user-scope deferral documented | implemented | overview.md, reviews.md, providers.md all state deferral |
| Stale managed role cleanup with both markers | implemented | sync-extension.ts `collectStaleManagedRoles` checks both `isOatManagedCodexRoleFile(content, roleName)` |
| Default tools fallback for codex import | implemented | import-from-codex.ts defaults to `Read, Grep, Glob, Bash` |
| Idempotent sync | implemented | sync-extension.test.ts verifies second plan is all-skip |
| Preserve unmanaged config keys/roles | implemented | config-merge.test.ts verifies unmanaged settings preserved |

### Extra Work (not in declared requirements)

None. All code maps to declared plan requirements.

## Verification Commands

Run these to verify the implementation:

```bash
# Run all CLI tests
pnpm --filter @oat/cli test -- --run

# Type check
pnpm --filter @oat/cli type-check

# Lint
pnpm --filter @oat/cli lint

# Build
pnpm --filter @oat/cli build

# Run only new test files
pnpm --filter @oat/cli test -- --run packages/cli/src/agents/canonical packages/cli/src/providers/codex/codec packages/cli/src/providers/shared/markdown-agent-codec.test.ts packages/cli/src/commands/shared/adopt-stray.test.ts packages/cli/src/commands/shared/codex-strays.test.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
