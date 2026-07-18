---
oat_status: complete
oat_ready_for: implement
oat_blockers: []
oat_last_updated: 2026-07-18
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04', 'p05']
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: Cursor Native Skills

> Execute this plan using `oat-project-implement`. Phases are sequential because
> provider metadata, drift handling, and command migration share core files.

**Goal:** Make Cursor consume canonical skills directly while safely migrating
existing generated and provider-local Cursor skills at project and user scope.

**Architecture:** Cursor skill mappings become native-read and declare
`.cursor/skills` as a separate adoption source. Legacy managed views are removed
only when verified clean; changed views are detached and presented through a
shared, per-skill adopt-or-keep migration flow. User known-stray state moves to
`~/.oat/sync/config.json`.

**Tech Stack:** TypeScript ESM, Commander, Inquirer prompts, Zod, Vitest,
filesystem-backed manifests and JSON configuration.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` to pause only after final phase
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` to sequential execution

---

## Phase 1: Native-Read Mapping and Adoption Sources

### Task p01-t01: Model Cursor skills as native-read

**Files:**

- Modify: `packages/cli/src/providers/shared/adapter.types.ts`
- Modify: `packages/cli/src/providers/shared/adapter.utils.ts`
- Modify: `packages/cli/src/providers/shared/adapter.types.test.ts`
- Modify: `packages/cli/src/providers/shared/adapter-contract.test.ts`
- Modify: `packages/cli/src/providers/cursor/paths.ts`
- Modify: `packages/cli/src/providers/cursor/adapter.test.ts`

**Steps:**

1. Add explicit provider-local adoption-source metadata without weakening the
   contract that native-read `providerDir` equals `canonicalDir`.
2. Add a utility that resolves adoption sources independently from sync
   mappings and deduplicates them by content type and directory.
3. Change project and user Cursor skill mappings to native-read
   `.agents/skills`, with `.cursor/skills` as the adoption source.
4. Preserve Cursor agent and rule mappings exactly.
5. Test mixed native/non-native Cursor mappings at both scopes.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/providers/shared/adapter.types.test.ts \
  src/providers/shared/adapter-contract.test.ts \
  src/providers/cursor/adapter.test.ts
```

**Commit:** `feat(p01-t01): make Cursor skills native-read`

---

### Task p01-t02: Scan provider-local adoption sources

**Files:**

- Modify: `packages/cli/src/drift/strays.ts`
- Modify: `packages/cli/src/drift/strays.test.ts`
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/remove/skill/remove-skill.ts`
- Modify corresponding command tests

**Steps:**

1. Use adoption-source mappings for stray discovery while retaining sync
   mappings for drift and missing-view reporting.
2. Continue ignoring manifest-owned, Git-ignored, and generated entries.
3. Surface same-name provider-local skills for explicit collision handling
   instead of silently suppressing divergent content.
4. Use adoption sources when skill removal checks for provider-local
   collisions or hazards.
5. Keep non-Cursor providers' current scan behavior unchanged.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/drift/strays.test.ts \
  src/commands/init/index.test.ts \
  src/commands/status/index.test.ts \
  src/commands/remove/skill/remove-skill.test.ts
```

**Commit:** `feat(p01-t02): discover Cursor-local skill migrations`

---

## Phase 2: Safe Legacy View Retirement

### Task p02-t01: Add preservation-aware detach operations

**Files:**

- Modify: `packages/cli/src/engine/engine.types.ts`
- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/execute-plan.ts`
- Modify: `packages/cli/src/engine/engine.types.test.ts`
- Modify: `packages/cli/src/engine/compute-plan.test.ts`
- Modify: `packages/cli/src/engine/execute-plan.test.ts`

**Steps:**

1. Classify stale manifest entries as verified clean, missing, or changed before
   planning destructive retirement.
2. Remove clean legacy symlinks/copies and stale missing-path manifest rows.
3. Add a detach/unmanage operation for replaced, modified, broken, or otherwise
   unverified provider paths that drops manifest ownership without deleting
   user content.
4. Make dry-run reasons distinguish delete from preserve-and-detach.
5. Preserve existing removal behavior where its safety contract remains valid,
   limiting the new operation to obsolete mapping retirement.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/engine/engine.types.test.ts \
  src/engine/compute-plan.test.ts \
  src/engine/execute-plan.test.ts
```

**Commit:** `fix(p02-t01): preserve changed views during mapping retirement`

---

### Task p02-t02: Cover Cursor upgrade behavior end to end

**Files:**

- Modify: `packages/cli/src/engine/engine.integration.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Modify: `packages/cli/src/e2e/workflow.test.ts`

**Steps:**

1. Cover project and user legacy Cursor skill manifest rows.
2. Assert clean generated skill views disappear while Cursor agents and rules
   retain their current behavior.
3. Assert modified/replaced skill views survive and become migration
   candidates.
4. Assert unmanaged Cursor-only entries are never deleted.
5. Assert later syncs do not recreate Cursor skill views or manifest rows.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/engine/engine.integration.test.ts \
  src/commands/commands.integration.test.ts \
  src/e2e/workflow.test.ts
```

**Commit:** `test(p02-t02): cover Cursor native-read upgrades`

---

## Phase 3: Per-Skill Decisions and User Config Migration

### Task p03-t01: Canonicalize user known-stray configuration

**Files:**

- Modify: `packages/cli/src/config/sync-config.ts`
- Modify: `packages/cli/src/config/sync-config.test.ts`
- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Create a focused legacy user-sync migration module and test if needed

**Steps:**

1. Add reusable normalized append/merge helpers for `knownStrays`.
2. Make `~/.oat/sync/config.json` the canonical user owner.
3. Migrate legacy `~/.oat/config.json#knownStrays` by writing the normalized
   union to user sync config first, then deleting only the legacy key while
   preserving unrelated and unknown fields.
4. Make migration retries idempotent and safe after interruption.
5. Retain additive user suppression for project scans, but stop exposing
   `knownStrays` as a general user preference after migration.
6. Extend config discovery/help for project and user sync locations.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/config/sync-config.test.ts \
  src/config/oat-config.test.ts \
  src/config/resolve.test.ts \
  src/commands/config/index.test.ts
```

**Commit:** `feat(p03-t01): migrate user stray state to sync config`

---

### Task p03-t02: Support native-read adopt and keep-local actions

**Files:**

- Modify: `packages/cli/src/commands/shared/adopt-stray.ts`
- Modify: `packages/cli/src/commands/shared/adopt-stray.test.ts`
- Add shared Cursor skill disposition module and tests

**Steps:**

1. Make native-read adoption move a Cursor skill to canonical without
   recreating a provider symlink or manifest row.
2. Remove an identical provider-local duplicate when canonical content already
   matches.
3. Preserve explicit conflict confirmation for different canonical content.
4. Implement keep-local by preserving content and immediately recording the
   exact normalized path in the applicable sync config.
5. Block keep-local when a same-name canonical skill exists and provide rename
   remediation.
6. Represent each outcome explicitly as adopt or keep; abort leaves the current
   and remaining skills unresolved.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/shared/adopt-stray.test.ts \
  src/commands/shared/cursor-skill-disposition.test.ts
```

Use the actual new test filename if the module name changes.

**Commit:** `feat(p03-t02): add Cursor skill disposition actions`

---

### Task p03-t03: Wire individual choices into init and status

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Steps:**

1. Partition Cursor skill candidates from ordinary provider strays.
2. Prompt every Cursor skill individually with Adopt and Keep Cursor-only.
3. Persist each completed choice before moving to the next skill.
4. Stop cleanly on abort without assigning implicit meaning to unanswered
   skills.
5. Keep the existing checklist flow for non-Cursor strays.
6. Report unresolved migration actions without mutation in non-interactive,
   hook, and JSON modes.
7. Cover mixed decisions, abort after partial progress, project/user/all scope,
   legacy config migration, same-name blocking, and repeat-prompt suppression.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/index.test.ts \
  src/commands/status/index.test.ts
```

**Commit:** `feat(p03-t03): prompt per Cursor skill migration`

---

## Phase 4: Documentation, Release Metadata, and Final Validation

### Task p04-t01: Update provider and configuration documentation

**Files:**

- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- Modify: `apps/oat-docs/docs/provider-sync/config.md`
- Modify: `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
- Modify: `apps/oat-docs/docs/provider-sync/commands.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/reference/file-locations.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify: `.agents/docs/skills-guide.md`
- Modify the vendored canonical-skill copy and bump that skill's frontmatter
  version if the copy is shipped from `.agents/skills`

**Steps:**

1. Document Cursor native-read skills at project and user scope.
2. Define `.cursor/skills` as a provider-local extension and adoption surface,
   not generated output.
3. Document individual migration choices, collision handling, and safe legacy
   retirement.
4. Document `~/.oat/sync/config.json` ownership and legacy migration.
5. Keep generated docs indexes untouched unless their generator reports a
   required change.

**Verify:**

```bash
pnpm build:docs
pnpm format
```

**Commit:** `docs(p04-t01): document Cursor native skill migration`

---

### Task p04-t02: Bump public packages and run release validation

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify generated/lock metadata only when required by repository tooling
- Preserve the pre-existing `.oat/sync/manifest.json` version change while
  reconciling obsolete Cursor rows through the supported sync workflow

**Steps:**

1. Bump all five lockstep public packages from `0.1.72` to the same next patch
   version.
2. Run focused tests, then full lint, format, type-check, test, and build.
3. Run sync dry-run before applying any generated provider-view cleanup.
4. Verify only obsolete manifest-owned Cursor skill views are removed and the
   user's existing manifest version update is preserved.
5. Run `pnpm release:validate`.
6. Record final verification and any intentional design deltas in
   `implementation.md`.

**Verify:**

```bash
pnpm lint
pnpm format
pnpm type-check
pnpm test
pnpm build
pnpm release:validate
```

**Commit:** `chore(p04-t02): validate Cursor native skill release`

---

## Phase 5: Final Review Fixes

### Task p05-t01: (review) Preserve legacy known strays on every user-config write

**Finding:** I1 — General user-config writes can erase legacy known-stray
choices before migration.

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/user-sync-config.ts`
- Modify: `packages/cli/src/config/user-sync-config.test.ts`
- Modify additional user-config caller tests only where required

**Step 1: Reproduce the data-loss window**

Add a regression test that seeds `~/.oat/config.json#knownStrays`, performs an
unrelated general user-config write, and verifies:

- legacy paths are present in `~/.oat/sync/config.json`;
- the requested unrelated update is preserved;
- unrelated and unknown general-config fields are preserved; and
- the legacy key is removed only after the canonical sync write succeeds.

**Step 2: Fix the shared write boundary**

Route every general user-config write through the idempotent legacy migration
helper before normalization replaces `~/.oat/config.json`. Keep the ordering
write-canonical-first, remove-legacy-second, and avoid caller-specific gaps.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/config/oat-config.test.ts \
  src/config/user-sync-config.test.ts \
  src/commands/config/index.test.ts \
  src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
```

**Step 4: Commit**

```bash
git add packages/cli/src/config
git commit -m "fix(p05-t01): preserve legacy strays on user config writes"
```

---

### Task p05-t02: (review) Align the plan completion summary

**Finding:** m1 — Plan completion summary remains in its pre-implementation
state.

**Files:**

- Modify: `.oat/projects/shared/cursor-native-skills/plan.md`

**Step 1: Align lifecycle records**

After p05-t01 completes, update `## Implementation Complete` to report all five
phases, eleven tasks, final verification, and readiness for re-review.

**Step 2: Verify**

```bash
pnpm exec oxfmt --check .oat/projects/shared/cursor-native-skills/plan.md
pnpm run cli -- project validate-plan \
  --project-path .oat/projects/shared/cursor-native-skills --json
```

**Step 3: Commit**

```bash
git add .oat/projects/shared/cursor-native-skills/plan.md
git commit -m "docs(p05-t02): align implementation completion summary"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                              |
| ------ | -------- | ----------- | ---------- | ----------------------------------------------------- |
| p01    | code     | pending     | -          | -                                                     |
| p02    | code     | pending     | -          | -                                                     |
| p03    | code     | pending     | -          | -                                                     |
| p04    | code     | pending     | -          | -                                                     |
| final  | code     | fixes_added | 2026-07-18 | `reviews/archived/final-review-2026-07-18T180043Z.md` |
| spec   | artifact | n/a         | 2026-07-18 | quick mode                                            |
| design | artifact | passed      | 2026-07-18 | `design.md`                                           |

## Implementation Complete

**Summary:** All five sequential phases and all eleven tasks are complete.

**Total:** 11 tasks across 5 sequential phases.

**Final verification:** Phase p05 focused tests (386), CLI lint, and CLI
type-check passed after the phase p04 full workspace and release validation.

**Review status:** Ready for final re-review.

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Cursor Agent Skills documentation: <https://cursor.com/docs/skills>
