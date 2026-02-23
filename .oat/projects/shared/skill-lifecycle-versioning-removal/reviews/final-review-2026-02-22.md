---
oat_generated: true
oat_generated_at: 2026-02-22
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/skill-lifecycle-versioning-removal
---

# Code Review: final (b31c077..HEAD)

**Reviewed:** 2026-02-22
**Scope:** Final code review covering all 12 tasks across 4 phases (p01-t01 through p04-t02)
**Files reviewed:** 60
**Commits:** 13 (b31c077..HEAD)

## Summary

The implementation is well-structured and closely aligned with the imported plan. All 12 tasks are implemented with corresponding tests. The code follows project conventions (dependency injection, dry-run-by-default, exit codes, commander patterns). There are no critical findings. A few important and minor items are noted relating to edge case handling, a missing `remove-skills.ts` barrel file (which is actually inlined into `skills/index.ts`), and some minor inconsistencies in test coverage or defensive coding.

## Findings

### Critical

None

### Important

- **Missing `getSkillVersion` null return for SKILL.md read failure** (`packages/cli/src/commands/shared/frontmatter.ts:36`)
  - Issue: `getSkillVersion` calls `parseFrontmatterField` which returns `''` on read failure (e.g., missing SKILL.md file in the directory). This maps to `null` return since the length check succeeds. However, the function is implicitly depending on the error-swallowing behavior of `parseFrontmatterField` for the case where a skill directory exists but has no `SKILL.md`. If `parseFrontmatterField` behavior changes to throw on certain errors, `getSkillVersion` would bubble up an unhandled exception. This is a resilience concern for the `checkSkillVersionsDefault` path in doctor (line 142) and the `copyDirWithVersionCheck` path (line 79-80).
  - Fix: The current behavior is functionally correct given how `parseFrontmatterField` works today. Consider adding a brief inline comment documenting the error-swallowing contract, e.g., `// parseFrontmatterField returns '' on read errors, so missing SKILL.md safely maps to null`.
  - Requirement: Phase 1 - version parsing infrastructure

- **`checkSkillVersionsDefault` uses `pathExistsDefault` instead of injectable `dependencies.pathExists`** (`packages/cli/src/commands/doctor/index.ts:136`)
  - Issue: The `checkSkillVersionsDefault` function on line 136 calls `pathExistsDefault(bundledSkillDir)` directly instead of going through the `dependencies.pathExists` injectable. While this function itself is the default implementation of `checkSkillVersions`, the inconsistency means that if a test overrides `pathExists` in the doctor dependencies, the bundled-skill existence check inside `checkSkillVersionsDefault` would still use the real filesystem. This does not cause a bug today since tests mock `checkSkillVersions` entirely, but it violates the DI contract pattern used elsewhere in the codebase.
  - Fix: This is acceptable as-is since tests mock `checkSkillVersions` at a higher level. If the internal implementation of `checkSkillVersionsDefault` needs to be tested in isolation in the future, extract `pathExists` as a parameter or use the dependency pattern consistently. Low priority.
  - Requirement: p04-t01 - doctor integration

- **`remove-skill.ts` does not emit JSON for successful dry-run or apply** (`packages/cli/src/commands/remove/skill/remove-skill.ts:290-302`)
  - Issue: When `context.json` is enabled and the skill is found, `runRemoveSkill` logs dry-run output or apply output via `context.logger.info/warn` but never emits a structured JSON payload for the successful path. JSON output is only emitted for the `not_found` case (line 282-283). The `remove skills` parent command works around this by setting `json: false` for child invocations (line 103-104 in `remove-skills.ts`), but standalone `oat remove skill <name> --json` in dry-run or apply mode would produce no JSON output at all for a successful operation.
  - Fix: Add a JSON payload emission for the successful dry-run and apply paths, e.g., after line 293 add `if (context.json) { context.logger.json({ status: 'dry_run', skill: skillName, scopes: plans.map(p => p.scope) }); }` and similarly after line 299 for apply. This follows the convention in other commands that emit structured output in JSON mode.
  - Requirement: Phase 3 - CLI command conventions (JSON output support)

### Minor

- **Duplicate frontmatter block regex across `frontmatter.ts` and `skills.ts`** (`packages/cli/src/validation/skills.ts:23-25`)
  - Issue: `skills.ts` defines its own `getFrontmatterBlock` (line 23) with a subtly different regex (`/^---\n([\s\S]*?)\n---\n/m` requiring trailing newline after closing `---`) compared to `frontmatter.ts` (line 5: `/^---\n([\s\S]*?)\n---/` no trailing newline required). This means a SKILL.md file ending with `---` and no trailing newline would parse in `frontmatter.ts` but fail validation in `skills.ts`.
  - Suggestion: Consider importing and reusing `getFrontmatterBlock` from `frontmatter.ts` in `skills.ts` to ensure parsing consistency. This pre-dates this PR but is exposed by the new `version` validation code that depends on this function.

- **`remove-skill.test.ts` missing test for SKILL.md `getSkillVersion` error path in `buildScopePlan`** (`packages/cli/src/commands/remove/skill/remove-skill.test.ts`)
  - Issue: Tests do not cover the scenario where `getSkillVersion` fails (e.g., corrupt SKILL.md). Since the remove flow does not call `getSkillVersion` (it is version-unaware), this is not actually needed. No action required; noting for completeness.
  - Suggestion: None needed -- removal is correctly version-agnostic.

- **Version comparison utility does not handle negative version segments** (`packages/cli/src/commands/init/tools/shared/version.ts:12`)
  - Issue: `parseVersion` uses `Number.parseInt` which would parse `-1` as a valid number, so a version like `-1.0.0` would parse as `[-1, 0, 0]`. The semver validation regex in `skills.ts` prevents this from appearing in SKILL.md frontmatter, but the utility function itself has no guard.
  - Suggestion: Consider adding `parsed.some((part) => part < 0)` to the guard on line 13 for defensive correctness: `if (parsed.some((part) => Number.isNaN(part) || part < 0))`.

- **`outdatedSkills` version strings use fallback `'0.0.0'` without noting provenance** (`packages/cli/src/commands/init/tools/workflows/install-workflows.ts:112`)
  - Issue: When `installedVersion` or `bundledVersion` is `null`, the code coerces to `'0.0.0'` (line 112-113). This is correct semantics (missing version = oldest) but the user-facing string `0.0.0` in the update prompt could be confusing for a skill that simply lacks a version field. The imported plan explicitly calls this out as a design decision ("Missing version treated as 0.0.0"), so this is acceptable.
  - Suggestion: Consider using `'(unversioned)'` as the display string while preserving `0.0.0` for comparison logic, to improve user clarity. This is a UX polish item.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (canonical), `references/imported-plan.md` (original design source), `implementation.md` (execution log)

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Phase 1.1: `getSkillVersion()` helper | implemented | `frontmatter.ts:33-41` |
| Phase 1.1: Optional `version` semver validation | implemented | `skills.ts:136-144` with `/^\d+\.\d+\.\d+$/` |
| Phase 1.2: `parseVersion()` utility | implemented | `version.ts:1-17` |
| Phase 1.2: `compareVersions()` utility | implemented | `version.ts:19-36` |
| Phase 1.3: `version: 1.0.0` in all bundled OAT skills | implemented | Verified in 3 sample SKILL.md files + test enforcement via `skills.test.ts:498-542` |
| Phase 2.1: `CopyStatusExtended` and `CopyResult` types | implemented | `copy-helpers.ts:7-13` |
| Phase 2.1: `copyDirWithVersionCheck()` | implemented | `copy-helpers.ts:61-88` |
| Phase 2.2: `outdatedSkills` in workflow installer | implemented | `install-workflows.ts:61,109-114` |
| Phase 2.2: `outdatedSkills` in ideas installer | implemented | `install-ideas.ts:34,75-80` |
| Phase 2.2: `outdatedSkills` in utility installer | implemented | `install-utility.ts:21,48-53` |
| Phase 2.3: Interactive outdated update prompt | implemented | `index.ts:261-287` using `selectManyWithAbort` |
| Phase 2.3: Non-interactive report-only mode | implemented | `index.ts:288-293` |
| Phase 2.3: `--force` bypasses version check | implemented | `copyDirWithVersionCheck` returns `updated` when force=true |
| Phase 3.1: `oat remove` command group | implemented | `remove/index.ts`, registered in `commands/index.ts:19` |
| Phase 3.1: `remove skill` subcommand | implemented | `remove/skill/index.ts` + `remove-skill.ts` |
| Phase 3.1: `remove skills` subcommand | implemented | `remove/skills/index.ts` + `remove-skills.ts` |
| Phase 3.2: Scope-aware removal | implemented | `remove-skill.ts:264` uses `resolveConcreteScopes` |
| Phase 3.2: Managed provider view deletion | implemented | `remove-skill.ts:230-232` |
| Phase 3.2: Unmanaged provider view warning | implemented | `remove-skill.ts:248-255` |
| Phase 3.2: Manifest entry removal | implemented | `remove-skill.ts:234-242` |
| Phase 3.2: Dry-run default | implemented | `--apply` opt-in, default is dry-run |
| Phase 3.3: Pack membership from constants | implemented | `remove-skills.ts:24-28` uses `IDEA_SKILLS`, `WORKFLOW_SKILLS`, `UTILITY_SKILLS` |
| Phase 3.3: Confirmation for large packs | implemented | `remove-skills.ts:87-99` with threshold >3 |
| Phase 3.3: Invalid pack handling | implemented | `remove-skills.ts:79-83` |
| Phase 3.4: Multi-scope regression coverage | implemented | `remove-skill.test.ts:287-307,309-369` |
| Phase 3.4: JSON output assertions | implemented | `remove-skill.test.ts:371-386`, `remove-skills.test.ts:163-186` |
| Phase 4.1: `skill_versions` doctor check | implemented | `doctor/index.ts:283-332` |
| Phase 4.1: Outdated warn with fix guidance | implemented | `doctor/index.ts:293-298` |
| Phase 4.1: No installed skills -> pass | implemented | `doctor/index.ts:299-304` |
| Phase 4.1: Missing bundled counterpart -> skip | implemented | `doctor/index.ts:306-311` |
| Phase 4.2: Full verification | implemented | `implementation.md` confirms all verification commands passed |
| Help snapshots for remove commands | implemented | `help-snapshots.test.ts:196-263` |
| Command registration for remove | implemented | `index.test.ts:43-53` |

### Extra Work (not in declared requirements)

- **`dedupeViews` helper** (`remove-skill.ts:113-123`): Utility to deduplicate provider views. This is a reasonable defensive measure not explicitly called out in the plan but prevents duplicate deletion operations. Acceptable scope addition.
- **`formatOutdatedSkillList` helper** (`doctor/index.ts:163-172`): Formatting helper for doctor output. Reasonable and within scope of doctor integration.

## Verification Commands

Run these to verify the implementation:

```bash
# Full test suite
pnpm --filter @oat/cli test -- --run

# Phase 1 specific
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/shared/frontmatter.test.ts packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/version.test.ts

# Phase 2 specific
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init/tools/shared/copy-helpers.test.ts packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts packages/cli/src/commands/init/tools/ideas/install-ideas.test.ts packages/cli/src/commands/init/tools/utility/install-utility.test.ts packages/cli/src/commands/init/tools/index.test.ts

# Phase 3 specific
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/remove/skill/remove-skill.test.ts packages/cli/src/commands/remove/skills/remove-skills.test.ts packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/index.test.ts

# Phase 4 specific
pnpm --filter @oat/cli test -- --run packages/cli/src/commands/doctor/index.test.ts

# Lint and type-check
pnpm lint && pnpm type-check

# Full build + test
pnpm build && pnpm test
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
