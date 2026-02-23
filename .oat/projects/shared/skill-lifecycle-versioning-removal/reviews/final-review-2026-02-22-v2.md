---
oat_generated: true
oat_generated_at: 2026-02-23
oat_review_scope: final re-review (983de1d..HEAD)
oat_review_type: code
oat_project: .oat/projects/shared/skill-lifecycle-versioning-removal
---

# Code Review: final re-review (983de1d..HEAD)

**Reviewed:** 2026-02-23
**Scope:** Final re-review covering all 18 tasks across 4 phases (p01-t01 through p04-t08), including 6 review-fix tasks
**Files reviewed:** 64
**Commits:** 23 (983de1d..HEAD)

## Summary

All seven findings from the prior review have been properly addressed. The six fix tasks (p04-t03 through p04-t08) are correctly implemented with appropriate test coverage. The full implementation is well-aligned with the plan across all 18 tasks. No critical or important issues remain. Two minor observations are noted for future consideration but do not block merge.

## Prior Finding Resolution

| Finding | Fix Task | Status | Verification |
|---------|----------|--------|--------------|
| I1: `getSkillVersion` missing-file contract | p04-t03 | Resolved | Inline contract comment added at `frontmatter.ts:36-37`; regression test added at `frontmatter.test.ts:136-141` |
| I2: `checkSkillVersionsDefault` DI inconsistency | p04-t04 | Resolved | `checkSkillVersionsDefault` now accepts `pathExists` parameter (`doctor/index.ts:121`); caller at `index.ts:302` passes `dependencies.pathExists`; test at `index.test.ts:279-307` verifies threading |
| I3: Missing JSON success payloads for remove skill | p04-t05 | Resolved | JSON payloads emitted for dry-run (`remove-skill.ts:314-319`) and apply (`remove-skill.ts:328-333`); tests at `remove-skill.test.ts:388-431` and `remove-skill.test.ts:433-473` |
| m1: Duplicate frontmatter regex | p04-t06 | Resolved | `validation/skills.ts:3` now imports `getFrontmatterBlock` from shared module; duplicate regex removed |
| m2: Missing getSkillVersion error test in remove | N/A | Acknowledged | Correctly deferred; remove is version-agnostic and does not call `getSkillVersion` |
| m3: Negative version segments | p04-t07 | Resolved | Guard added at `version.ts:12`: `part < 0` check; test at `version.test.ts:20`: `'-1.2.3'` normalized to `[0,0,0]` |
| m4: `0.0.0` display for unversioned skills | p04-t08 | Resolved | Installers now propagate `null` for missing versions (`install-workflows.ts:117`, `install-ideas.ts:81`, `install-utility.ts:57`); `formatVersionForDisplay` at `index.ts:78-80` renders `(unversioned)`; test at `index.test.ts:306-335` |

## Findings

### Critical

None

### Important

None

### Minor

- **Doctor still uses `0.0.0` fallback for display in `OutdatedSkillVersion`** (`packages/cli/src/commands/doctor/index.ts:161-162`)
  - Issue: The `checkSkillVersionsDefault` function coerces `null` versions to `'0.0.0'` strings for the `OutdatedSkillVersion` type. While the `oat init tools` display was fixed in p04-t08 to show `(unversioned)`, the doctor output will still show `0.0.0` for unversioned skills in its `formatOutdatedSkillList` output. This is a minor UX inconsistency between the two commands.
  - Suggestion: Consider aligning doctor display with init-tools display by using `string | null` in `OutdatedSkillVersion` and rendering `(unversioned)` in `formatOutdatedSkillList`. This is low priority since bundled skills are now all versioned, making this path unlikely in practice.

- **`checkSkillVersions` default binding still uses `pathExistsDefault` directly** (`packages/cli/src/commands/doctor/index.ts:200-201`)
  - Issue: In `createDependencies()`, the default `checkSkillVersions` binding at line 200-201 binds to `pathExistsDefault` rather than to `dependencies.pathExists`. This is because `createDependencies` constructs a plain object and cannot self-reference. The call site at `runChecksForScope` (line 302) correctly passes `dependencies.pathExists`, so when tests override `checkSkillVersions` entirely, DI works. However, the default implementation's bound closure still hardcodes `pathExistsDefault`. This only matters if someone tests the default implementation in isolation without overriding `checkSkillVersions`, which current tests do not do. Acceptable as-is.
  - Suggestion: No change needed. The DI contract is satisfied at the consumer level (line 302). Document this as a known limitation if the default implementation ever needs isolated testing.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (canonical, 18 tasks), `references/imported-plan.md` (original design source), `implementation.md` (execution log)

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Phase 1.1: `getSkillVersion()` helper | implemented | `frontmatter.ts:33-43`, contract documented in p04-t03 |
| Phase 1.1: Optional `version` semver validation | implemented | `skills.ts:132-140` with `/^\d+\.\d+\.\d+$/` |
| Phase 1.2: `parseVersion()` utility | implemented | `version.ts:1-17`, negative guard added in p04-t07 |
| Phase 1.2: `compareVersions()` utility | implemented | `version.ts:19-36` |
| Phase 1.3: `version: 1.0.0` in all bundled OAT skills | implemented | Verified in SKILL.md samples + test enforcement via `skills.test.ts:498-542` |
| Phase 2.1: `CopyStatusExtended` and `CopyResult` types | implemented | `copy-helpers.ts:7-13` |
| Phase 2.1: `copyDirWithVersionCheck()` | implemented | `copy-helpers.ts:61-88` |
| Phase 2.2: `outdatedSkills` in workflow installer | implemented | `install-workflows.ts:62-66,114-119`; null propagation for p04-t08 |
| Phase 2.2: `outdatedSkills` in ideas installer | implemented | `install-ideas.ts:34-37,79-84`; null propagation for p04-t08 |
| Phase 2.2: `outdatedSkills` in utility installer | implemented | `install-utility.ts:23-27,54-59`; null propagation for p04-t08 |
| Phase 2.3: Interactive outdated update prompt | implemented | `index.ts:265-291` using `selectManyWithAbort` |
| Phase 2.3: Non-interactive report-only mode | implemented | `index.ts:292-297` |
| Phase 2.3: `--force` bypasses version check | implemented | `copyDirWithVersionCheck` returns `updated` when force=true |
| Phase 2.3: Unversioned display clarity (p04-t08) | implemented | `formatVersionForDisplay` at `index.ts:78-80` |
| Phase 3.1: `oat remove` command group | implemented | `remove/index.ts`, registered in `commands/index.ts:19` |
| Phase 3.1: `remove skill` subcommand | implemented | `remove/skill/index.ts` + `remove-skill.ts` |
| Phase 3.1: `remove skills` subcommand | implemented | `remove/skills/index.ts` + `remove-skills.ts` |
| Phase 3.2: Scope-aware removal | implemented | `remove-skill.ts:284` uses `resolveConcreteScopes` |
| Phase 3.2: Managed provider view deletion | implemented | `remove-skill.ts:250-252` |
| Phase 3.2: Unmanaged provider view warning | implemented | `remove-skill.ts:268-275` |
| Phase 3.2: Manifest entry removal | implemented | `remove-skill.ts:254-262` |
| Phase 3.2: Dry-run default | implemented | `--apply` opt-in, default is dry-run |
| Phase 3.3: Pack membership from constants | implemented | `remove-skills.ts:24-28` uses `IDEA_SKILLS`, `WORKFLOW_SKILLS`, `UTILITY_SKILLS` |
| Phase 3.3: Confirmation for large packs | implemented | `remove-skills.ts:87-99` with threshold >3 |
| Phase 3.3: Invalid pack handling | implemented | `remove-skills.ts:79-83` |
| Phase 3.4: Multi-scope regression coverage | implemented | `remove-skill.test.ts:287-369` |
| Phase 3.4: JSON output assertions | implemented | `remove-skill.test.ts:371-473`, `remove-skills.test.ts:164-187` |
| Phase 4.1: `skill_versions` doctor check | implemented | `doctor/index.ts:296-347` |
| Phase 4.1: Outdated warn with fix guidance | implemented | `doctor/index.ts:304-313` |
| Phase 4.1: No installed skills -> pass | implemented | `doctor/index.ts:314-320` |
| Phase 4.1: Missing bundled counterpart -> skip | implemented | `doctor/index.ts:321-327` |
| Phase 4.2: Full verification | implemented | All verification commands passed |
| Phase 4 review fixes (p04-t03 through p04-t08) | implemented | All 6 fix tasks verified above |
| Help snapshots for remove commands | implemented | `help-snapshots.test.ts:196-263` |
| Command registration for remove | implemented | `index.test.ts:43-53` |
| JSON payloads for remove skill (p04-t05) | implemented | `remove-skill.ts:314-333`, tests at `remove-skill.test.ts:388-473` |
| Unified frontmatter parsing (p04-t06) | implemented | `validation/skills.ts:3,76` imports shared `getFrontmatterBlock` |

### Extra Work (not in declared requirements)

- **`dedupeViews` helper** (`remove-skill.ts:120-130`): Utility to deduplicate provider views across adapter mappings. Reasonable defensive measure.
- **`formatOutdatedSkillList` helper** (`doctor/index.ts:174-183`): Formatting helper for doctor output. Within scope.
- **`formatVersionForDisplay` helper** (`index.ts:78-80`): Display helper for unversioned skills in init-tools. Added as part of p04-t08 fix.
- **`toJsonScopeResults` helper** (`remove-skill.ts:230-241`): Transforms scope plans into JSON-serializable results. Added as part of p04-t05 fix.

All extra work is minimal, well-scoped, and directly supports the declared requirements.

## Test Coverage Assessment

| Area | Test File | Key Scenarios |
|------|-----------|---------------|
| Version parsing | `version.test.ts` | valid semver, null/empty, malformed, negative segments (7 tests) |
| Frontmatter extraction | `frontmatter.test.ts` | version extraction, missing version, no frontmatter, missing SKILL.md (17 tests) |
| Validation | `skills.test.ts` | valid/invalid semver, bundled skill version enforcement (14 tests) |
| Copy helpers | `copy-helpers.test.ts` | copied/updated/outdated/skipped, missing version, force (10 tests) |
| Workflow installer | `install-workflows.test.ts` | fresh install, idempotent, force, outdated detection, null version propagation (8 tests) |
| Ideas installer | `install-ideas.test.ts` | fresh install, idempotent, partial, force, outdated detection (5 tests) |
| Utility installer | `install-utility.test.ts` | project/user scope, idempotent, force, outdated detection (6 tests) |
| Init tools orchestrator | `index.test.ts` | interactive prompt, non-interactive report, unversioned display, cancellation (8 tests) |
| Remove skill | `remove-skill.test.ts` | dry-run, apply, not-found, multi-scope, JSON payloads (8 tests) |
| Remove skills (pack) | `remove-skills.test.ts` | invalid pack, utility pack, confirmation, count tracking, scope propagation, JSON aggregate (7 tests) |
| Doctor | `index.test.ts` | outdated warn, no installed, bundled missing, DI threading, codex checks (15 tests) |
| Command registration | `index.test.ts` | remove command with skill/skills subcommands (10 tests) |
| Help snapshots | `help-snapshots.test.ts` | remove, remove skill, remove skills snapshots (21 tests) |

Total: 633 tests across 83 test files, all passing.

## Verification Commands

Run these to verify the implementation:

```bash
# Full test suite
pnpm --filter @oat/cli test -- --run

# Lint and type-check
pnpm lint && pnpm type-check

# Full build + test
pnpm build && pnpm test

# Phase-specific verification
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/shared/frontmatter.test.ts packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/version.test.ts packages/cli/src/commands/init/tools/shared/copy-helpers.test.ts packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts packages/cli/src/commands/init/tools/ideas/install-ideas.test.ts packages/cli/src/commands/init/tools/utility/install-utility.test.ts packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/remove/skill/remove-skill.test.ts packages/cli/src/commands/remove/skills/remove-skills.test.ts packages/cli/src/commands/doctor/index.test.ts packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/index.test.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
