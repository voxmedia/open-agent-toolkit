# OAT HiL -> HiLL Frontmatter Rename (Hard Cut)

## Summary
Rename workflow and plan checkpoint frontmatter keys from `hil` to `hill` across active templates/skills/docs/code, using a hard-cut migration with no backward compatibility.

Key set:
1. `oat_hil_checkpoints` -> `oat_hill_checkpoints`
2. `oat_hil_completed` -> `oat_hill_completed`
3. `oat_plan_hil_phases` -> `oat_plan_hill_phases`

This is intentionally deferred until there is no active implementation work to avoid mid-stream artifact drift.

## Locked Decisions
1. Hard cut only (no compatibility reads/writes).
2. Canonical keys become:
   - `oat_hill_checkpoints`
   - `oat_hill_completed`
   - `oat_plan_hill_phases`
3. Apply only when there is no active project workflow in progress.
4. Update active docs/skills/templates and current repo references.
5. Archived historical artifacts may remain unchanged unless explicitly included.

## Preconditions
1. `.oat/active-project` is absent.
2. No in-progress project implementation branch depends on old key semantics.
3. Team confirms migration window (single PR, no parallel workflow edits).

## In Scope
1. Rename `oat_hil_checkpoints` -> `oat_hill_checkpoints` in active OAT templates/skills/docs/code.
2. Rename `oat_hil_completed` -> `oat_hill_completed` in active OAT templates/skills/docs/code.
3. Rename `oat_plan_hil_phases` -> `oat_plan_hill_phases` in active OAT templates/skills/docs/code.
4. Rename references in current repo references (`.oat/repo/reference/**`, `.oat/repo/reviews/**`) where the content is active guidance.
5. Validate zero remaining old-key usage in active (non-archive) surfaces.

## Out of Scope
1. Compatibility aliases/fallback parsing.
2. Migration script for existing historical archived projects.
3. Archived artifact rewrite under `.oat/repo/archive/**` or `.oat/projects/archived/**` unless explicitly requested.

## Target Files (Initial)

### Templates
- `.oat/templates/plan.md`
- `.oat/templates/state.md`

### Skills
- `.agents/skills/oat-project-discover/SKILL.md`
- `.agents/skills/oat-project-spec/SKILL.md`
- `.agents/skills/oat-project-design/SKILL.md`
- `.agents/skills/oat-project-plan/SKILL.md`
- `.agents/skills/oat-project-plan-writing/SKILL.md`
- `.agents/skills/oat-project-implement/SKILL.md`
- `.agents/skills/oat-project-quick-start/SKILL.md`
- `.agents/skills/oat-project-progress/SKILL.md`

### Docs
- `docs/oat/workflow/hil-checkpoints.md`
- Any additional `docs/oat/**` references discovered by grep.

### CLI Code + Tests
- `packages/cli/src/commands/state/generate.ts`
- `packages/cli/src/commands/state/generate.test.ts`

### Current Repo References
- `.oat/repo/reference/backlog.md` (if key name appears)
- `.oat/repo/reference/roadmap.md` (if key name appears)
- `.oat/repo/reviews/backlog-and-roadmap-review.md` (if key name appears)
- Any additional non-archived `.oat/repo/reference/**` or `.oat/repo/reviews/**` matches.

## Implementation Plan

### 1) Preflight safety check
1. Verify `.oat/active-project` does not exist.
2. Run grep to enumerate old key usage and separate:
   - active surfaces (to change),
   - archived/historical surfaces (default no-change).

### 2) Hard-cut rename in active sources
1. Replace all active-surface occurrences:
   - `oat_hil_checkpoints` -> `oat_hill_checkpoints`
   - `oat_hil_completed` -> `oat_hill_completed`
   - `oat_plan_hil_phases` -> `oat_plan_hill_phases`
2. Ensure wording remains consistent with HiLL naming intent where referenced.

### 3) Contract consistency pass
1. Ensure all skills that read/write these keys use only `hill` variants.
2. Ensure template frontmatter uses only new keys.
3. Ensure CLI state dashboard parsing reads only new state keys.
4. Ensure docs examples/snippets use only new keys.

### 4) Verification
1. Assert zero matches in active surfaces for old keys:
   - `.agents/**`
   - `.oat/templates/**`
   - `packages/cli/src/**`
   - `docs/oat/**`
   - `.oat/repo/reference/**` (non-archive)
   - `.oat/repo/reviews/**`
2. Confirm expected matches in archived/historical content only (if any).
3. Run:
   - `pnpm test`
   - `pnpm type-check`
   - `pnpm lint`
   - `pnpm oat:validate-skills`

## Test Scenarios
1. `state.md` template contains `oat_hill_checkpoints` and `oat_hill_completed`.
2. `plan.md` template contains `oat_plan_hill_phases`.
3. `oat-project-*` skills reference only new keys.
4. `oat state refresh` reads `oat_hill_*` keys and existing tests pass with updated fixtures.
5. Docs examples no longer mention old key names in active docs.
6. Grep sweep confirms no old keys in active surfaces.

## Acceptance Criteria
1. Old keys are removed from active templates/skills/docs/code/references:
   - `oat_hil_checkpoints`
   - `oat_hil_completed`
   - `oat_plan_hil_phases`
2. New `hill` keys are the only active checkpoint frontmatter contract.
3. Validation/test suite passes.
4. Migration PR is clearly labeled as breaking-change hard cut (internal dogfood context).

## Notes
- This plan assumes you are the sole current user and can enforce a clean migration window.
- If multi-user adoption begins, add a compatibility phase before any future key migrations.
