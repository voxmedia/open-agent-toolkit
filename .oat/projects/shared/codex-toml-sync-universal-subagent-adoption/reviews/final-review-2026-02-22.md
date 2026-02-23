---
oat_generated: true
oat_generated_at: 2026-02-22
oat_review_scope: final (re-review v2)
oat_review_type: code
oat_project: .oat/projects/shared/codex-toml-sync-universal-subagent-adoption
---

# Code Review: Final Re-Review v2 (post Phase 8 fixes)

**Reviewed:** 2026-02-22
**Scope:** Full re-review of all uncommitted changes (22 tasks across 8 phases), focusing on verification that Phase 8 fix tasks (p08-t01 through p08-t10) properly address prior review findings
**Files reviewed:** 47 (25 modified, 22 new)
**Commits:** None new (all changes uncommitted in worktree since bookkeeping commit 5569265)

## Summary

All 10 Phase 8 fix tasks have been properly implemented. The critical finding (C1: non-interactive status conflict handling) is fully resolved -- the status command now correctly gates adoption behind `context.interactive` and emits a remediation warning in non-interactive mode. All 6 important findings (I1-I6: missing integration test coverage) now have command-level tests. The 3 addressed minor findings (m1: TOML cast helper, m2: dedup conflict error helper, m4: dedup regeneration flow) are cleanly resolved. All 583 tests pass, type-check is clean, and lint reports no issues. No new critical or important findings were introduced by the fixes. The 2 previously deferred minor findings (m3, m5) remain acceptable deferrals.

## Prior Review Fix Verification

### C1: Non-interactive status conflict handling -- RESOLVED

**Prior issue:** `status` command's conflict resolution path used `selectManyWithAbort()` which throws in non-interactive mode.

**Verification:** The `status/index.ts` now gates adoption flow behind `if (context.interactive)` at line 488 with an `else if (!context.json)` branch at line 601 that emits `DEFAULT_REMEDIATION` warning text. Non-interactive mode never reaches `selectManyWithAbort` or `confirmAction`. This matches the imported plan's specification: "non-interactive: skip with deterministic warning and non-zero issue count."

**Test coverage:**
- `status/index.test.ts:410` -- "does not prompt in non-interactive mode"
- `status/index.test.ts:429` -- "non-interactive mode skips adoption attempts even when strays exist" (verifies no select, no confirm, no adopt, warn + exit 1)

### I1: Doctor codex integration coverage -- RESOLVED

**Prior issue:** Doctor codex drift/misconfiguration checks lacked command-level tests.

**Verification:** `doctor/index.test.ts` now includes 4 codex-specific tests (lines 246-342):
- "passes codex TOML parse + multi_agent + role-file checks" (line 246)
- "fails when codex config.toml cannot be parsed" (line 277)
- "warns when codex managed roles exist but multi_agent is not true" (line 295)
- "warns when codex role config_file points to a missing file" (line 320)

### I2: Status codex integration coverage -- RESOLVED

**Prior issue:** Status codex drift and stray reporting lacked command-level tests.

**Verification:** `status/index.test.ts` now includes 2 codex-specific tests (lines 453-509):
- "reports codex extension drift operations for project scope" (line 453)
- "reports codex role strays discovered from codex detector" (line 489)

### I3: Init codex stray/adoption integration coverage -- RESOLVED

**Prior issue:** Init codex stray detection/adoption lacked command-level tests.

**Verification:** `init/index.test.ts` includes a filesystem-level integration test at line 444 -- "detects codex role strays via default collector and includes codex adoption metadata" -- that creates real `.codex/config.toml` and `.codex/agents/*.toml` files, then verifies the stray is discovered and adoption metadata contains `kind: 'codex_role'`.

### I4: Sync codex extension integration coverage -- RESOLVED

**Prior issue:** Sync codex extension planning/apply lacked command-level tests.

**Verification:** `sync/index.test.ts` includes 2 codex-specific tests (lines 539-636):
- "includes codex extension operations in dry-run JSON output" (line 539)
- "applies codex extension plan during --apply when codex operations are pending" (line 594)

### I5: Conflict policy tests for init/status adoption paths -- RESOLVED

**Prior issue:** Adoption conflict behavior tests did not cover interactive replace vs non-interactive skip at command level.

**Verification:**
- `init/index.test.ts:522` -- "on adoption conflict, keeps canonical when replacement is declined"
- `init/index.test.ts:545` -- "on adoption conflict, retries with replaceCanonical when confirmed"
- `status/index.test.ts:512` -- "prompts for replacement on adoption conflict and skips when declined"
- `status/index.test.ts:542` -- "retries adoption with replaceCanonical when conflict replacement is confirmed"

### I6: Aggregate codex config tracking gap against p06-t02 -- RESOLVED

**Prior issue:** p06-t02 contract text implied manifest-level tracking, while implementation exposes aggregate hash via extension output metadata.

**Verification:**
- `sync.types.ts:64` defines `CodexExtensionSummary` with `aggregateConfigHash` field
- `sync/index.ts:254` populates `aggregateConfigHash` from codex extension plan
- `dry-run.ts:89` and `apply.ts:125-126` include `codexExtensions` in JSON output
- `providers.md:21` explicitly documents: "Aggregate Codex config drift metadata (`aggregateConfigHash`) is emitted in sync/status codex extension output and intentionally not stored as a separate manifest row"
- `overview.md:37` documents: "Codex aggregate config drift is reported via sync/status extension metadata (`aggregateConfigHash`); it is not persisted as a separate manifest schema entry"
- Sync test at line 575 verifies `aggregateConfigHash` appears in JSON output

### m1: Centralize TOML stringify cast helper -- RESOLVED

**Prior issue:** Repeated `as never` casts for `TOML.stringify` at call sites.

**Verification:** `shared.ts:32-34` defines `stringifyToml(object: Record<string, unknown>): string` with the single `as never` cast. `export-to-codex.ts:65` and `config-merge.ts:88` both use the shared helper. No other `as never` casts exist in the codec directory.

### m2: Deduplicate adoption conflict error helper -- RESOLVED

**Prior issue:** `isAdoptionConflictError` helper duplicated in init and status.

**Verification:** `adopt-stray.ts:32-34` defines the single canonical `isAdoptionConflictError` function. Both `init/index.ts:10` and `status/index.ts:9` import from `@commands/shared/adopt-stray`. No duplicates exist.

### m4: Deduplicate codex post-adoption regeneration flow -- RESOLVED

**Prior issue:** Post-adoption codex regeneration logic duplicated between init and status.

**Verification:** `codex-strays.ts:168-177` defines `regenerateCodexAfterAdoption` with a typed `CodexRegenerationDependencies` interface. Both `init/index.ts:502` and `status/index.ts:573` call the shared helper. `codex-strays.test.ts:87-123` tests the helper in isolation.

## Deferred Finding Re-Evaluation

### m3: Duplicated codex stray candidate construction -- STILL DEFERRED (acceptable)

The stray candidate object construction (`{ provider: 'codex', report: {...}, mapping: {...}, adoption: {...} }`) remains duplicated between `init/index.ts:218-238` and `status/index.ts:417-439`. However:
- The contexts differ: init uses `collectStraysDefault` (returns candidates), while status uses `collectScopeReports` (pushes to both `reports` and `strayCandidates`)
- The duplication is a 20-line literal object construction, not complex logic
- Extracting a builder would require additional interface abstraction for marginal benefit
- No behavioral risk from the duplication

**Verdict:** Deferral remains acceptable. Low-priority refactor-only cleanup.

### m5: Renderer body double-newline handling -- STILL DEFERRED (acceptable)

`render.ts:20-21` still strips a leading newline from the body before rendering. The round-trip tests pass because they compare parsed documents, not raw byte output. However:
- The output formatting difference is cosmetic (potential extra blank line between frontmatter and body)
- Existing canonical agent files in the repo are unaffected (the sync codecs call the parser/renderer correctly)
- No user-visible behavioral impact

**Verdict:** Deferral remains acceptable. Output formatting polish.

## Findings

### Critical

None

### Important

None

### Minor

None (all prior findings either resolved or acceptably deferred)

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (normalized imported plan), `references/imported-plan.md` (original imported plan), `implementation.md`

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Phase 0 (p01-t01): Contract closure / baseline gate docs | implemented | Docs updated in overview.md, reviews.md, providers.md |
| Phase 0.5 (p02-t01): Dependency installation + wiring | implemented | `@iarna/toml@2.2.5`, `yaml@2.8.2` installed; tsconfig alias added; smoke test exists |
| Phase 1 (p03-t01): Canonical types + parser | implemented | types.ts, parse.ts, parse.test.ts with required/optional fields, extensions, name validation |
| Phase 1 (p03-t02): Canonical renderer + round-trip regressions | implemented | render.ts, render.test.ts with round-trip and extension preservation |
| Phase 2 (p04-t01): Shared codec interfaces + markdown codecs | implemented | agent-codec.types.ts, markdown-agent-codec.ts with tests |
| Phase 2 (p04-t02): Codex TOML import/export + config merge | implemented | import-from-codex.ts, export-to-codex.ts, config-merge.ts with tests |
| Phase 3 (p05-t01): Provider-aware stray detection | implemented | codex-strays.ts with unit tests; init/status command-level integration tests (p08-t03, p08-t04) |
| Phase 3 (p05-t02): Adoption handlers + conflict policy | implemented | adopt-stray.ts with codex_role path; conflict policy tests in init/status (p08-t06) |
| Phase 4 (p06-t01): Codex sync extension dry-run + apply | implemented | sync-extension.ts with unit tests; sync command-level tests (p08-t05) |
| Phase 4 (p06-t02): Aggregate config tracking + manifest | implemented | aggregateConfigHash in extension metadata; docs and tests aligned to extension-only model (p08-t07) |
| Phase 5 (p07-t01): Status/doctor codex drift checks | implemented | Doctor + status codex checks with command-level tests (p08-t02, p08-t03) |
| Phase 6 (p07-t02): Provider interop docs + rollout guidance | implemented | README.md, overview.md, providers.md, reviews.md all updated |
| Phase 8 (p08-t01): Non-interactive status conflict fix | implemented | Status gates adoption behind context.interactive; tests verify skip+warn behavior |
| Phase 8 (p08-t02): Doctor codex integration coverage | implemented | 4 codex doctor test scenarios |
| Phase 8 (p08-t03): Status codex integration coverage | implemented | 2 codex status test scenarios |
| Phase 8 (p08-t04): Init codex stray/adoption coverage | implemented | Filesystem-level init codex stray integration test |
| Phase 8 (p08-t05): Sync codex extension coverage | implemented | 2 codex sync extension test scenarios |
| Phase 8 (p08-t06): Conflict policy tests | implemented | 4 conflict policy test scenarios across init/status |
| Phase 8 (p08-t07): Aggregate tracking contract alignment | implemented | Docs + tests + types aligned to extension-only metadata model |
| Phase 8 (p08-t08): TOML stringify cast helper | implemented | Single centralized helper in shared.ts |
| Phase 8 (p08-t09): Dedup conflict error helper | implemented | Single definition in adopt-stray.ts, imported by both commands |
| Phase 8 (p08-t10): Dedup regeneration flow | implemented | Single helper in codex-strays.ts with typed dependencies interface |
| ADR for command-layer extension | implemented | providers.md documents the intentional command-layer approach |
| Codex user-scope deferral documented | implemented | overview.md, providers.md state deferral |
| Stale managed role cleanup with both markers | implemented | sync-extension.ts `collectStaleManagedRoles` checks both markers |
| Default tools fallback for codex import | implemented | import-from-codex.ts defaults to `Read, Grep, Glob, Bash` |
| Idempotent sync | implemented | sync-extension.test.ts verifies second plan is all-skip |
| Preserve unmanaged config keys/roles | implemented | config-merge.test.ts verifies unmanaged settings preserved |

### Extra Work (not in declared requirements)

None. All code maps to declared plan requirements.

## Deferred Findings Ledger

| ID | Severity | Description | Deferral Justification |
|----|----------|-------------|----------------------|
| m3 | minor | Duplicated codex stray candidate construction in init/status | Low-risk refactor-only; different surrounding contexts make extraction non-trivial for marginal benefit |
| m5 | minor | Renderer body double-newline handling | Output formatting polish with no behavioral impact; round-trip tests validate parsed document equality |

## Verification Commands

Run these to verify the implementation:

```bash
# Run all CLI tests (583 tests)
pnpm --filter @oat/cli test -- --run

# Type check
pnpm --filter @oat/cli type-check

# Lint
pnpm --filter @oat/cli lint

# Build
pnpm --filter @oat/cli build

# Run specific test suites for Phase 8 fixes
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/status/index.test.ts
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/doctor/index.test.ts
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init/index.test.ts
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/sync/index.test.ts
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/shared
pnpm --filter @oat/cli test -- --run packages/cli/src/providers/codex/codec
```

## Review Outcome

**PASS** -- No critical or important findings remain. All prior findings have been resolved or acceptably deferred.

## Recommended Next Step

Update the final review row status in `plan.md` to `passed` and proceed with merge preparation.
