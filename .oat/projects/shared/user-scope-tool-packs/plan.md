---
oat_plan_source: spec-driven
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-27
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_generated: false
oat_template: false
---

# Implementation Plan: user-scope-tool-packs

> Execute with `oat-project-implement`. The phases are sequential because later
> command, migration, PJM, and documentation work all depend on the same
> canonical manifest and inventory surface.

**Goal:** Make every OAT pack a complete, evolving user-scope capability while
preserving project-scope compatibility, repository-owned PJM state, and safe
explicit migration.

**Architecture:** A canonical pack manifest plus scoped intent drives complete
inventory and pure reconcile plans. Thin CLI adapters apply those plans,
synchronize providers, and enforce PJM adoption/template boundaries.

**Tech Stack:** Node.js 22, TypeScript ESM, Commander, Zod/YAML/JSON config,
Vitest, pnpm/Turborepo, oxfmt/oxlint.

**Commit Convention:** `{type}(pNN-tNN): {description}`

## Planning Checklist

- [x] Design is complete and approved
- [x] Requirement Index mapped to stable task IDs
- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism; shared manifest/inventory files require sequential execution
- [x] Keep `oat_plan_parallel_groups: []`
- [x] Dispatch ladder complete; project managed maximum is High
- [x] Project explainer skipped for this project
- [x] Phase gate review left disabled because no implementation-phase selection was requested

## Phase 1: Canonical Pack Contract and Inventory

**Goal:** Establish one validated release manifest, scoped intent, content
comparison, and complete observed-state model without changing command behavior.

### Task p01-t01: Define pack manifest types and validation

**Files:**

- Create: `packages/cli/src/commands/tools/shared/pack-manifest.ts`
- Create: `packages/cli/src/commands/tools/shared/pack-manifest.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/types.ts`

**Step 1: Write test (RED)**

Cover unique pack/asset IDs, allowed/default scopes, path traversal rejection,
scope-specific ownership, and exhaustive `PackName` coverage.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts`
Expected: fails because the manifest API does not exist.

**Step 2: Implement (GREEN)**

Add `PackAssetKind`, `PackAssetOwnership`, `PackAssetDefinition`,
`PackDefinition`, `PACK_MANIFEST`, and `validatePackManifest()` using explicit
same-directory exports.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/src/commands/tools/shared/types.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p01-t01): define canonical pack manifest contract"`

### Task p01-t02: Populate every pack asset and derive legacy exports

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts`

**Step 1: Write test (RED)**

Assert all eight packs, core docs directory, workflow/research agents,
workflow/PJM templates and scripts, ideas/workflow seed assets, and reverse
bundle-to-manifest coverage.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/init/tools/shared/pack-metadata.test.ts`

**Step 2: Implement (GREEN)**

Populate `PACK_MANIFEST`; make old exported member arrays derived compatibility
views; set user defaults for every reusable pack and preserve core user-only.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass with no independent missing asset.

**Step 5: Commit**

`git commit -m "refactor(p01-t02): centralize all pack asset membership"`

### Task p01-t03: Add deterministic file and directory comparison

**Files:**

- Create: `packages/cli/src/commands/tools/shared/content-digest.ts`
- Create: `packages/cli/src/commands/tools/shared/content-digest.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/copy-helpers.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/copy-helpers.test.ts`

**Step 1: Write test (RED)**

Cover equal/different files, stable sorted tree digests, executable-mode changes,
and ignored filesystem enumeration order.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/content-digest.test.ts src/commands/init/tools/shared/copy-helpers.test.ts`

**Step 2: Implement (GREEN)**

Add `digestFile()`, `digestDirectory()`, and identical-content no-op support to
copy helpers without changing versioned skill precedence.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/content-digest.ts packages/cli/src/commands/tools/shared/content-digest.test.ts packages/cli/src/commands/init/tools/shared/copy-helpers.ts packages/cli/src/commands/init/tools/shared/copy-helpers.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p01-t03): compare non-versioned pack assets"`

### Task p01-t04: Add scoped project and user intent storage

**Files:**

- Create: `packages/cli/src/commands/tools/shared/scoped-pack-intent.ts`
- Create: `packages/cli/src/commands/tools/shared/scoped-pack-intent.test.ts`
- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/user-sync-config.ts`
- Modify: `packages/cli/src/config/user-sync-config.test.ts`

**Step 1: Write test (RED)**

Cover project/user config provenance, `config.local.json` exclusion, user
owned-key preservation, true writes, key deletion, and unrelated-key retention.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/scoped-pack-intent.test.ts src/config/oat-config.test.ts src/config/user-sync-config.test.ts`

**Step 2: Implement (GREEN)**

Add `readScopedPackIntent()` and `writeScopedPackIntent()`; extend `UserConfig`
with `tools`; write true on adoption and delete the selected key on removal.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/scoped-pack-intent.ts packages/cli/src/commands/tools/shared/scoped-pack-intent.test.ts packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/user-sync-config.ts packages/cli/src/config/user-sync-config.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p01-t04): persist pack intent by concrete scope"`

### Task p01-t05: Preserve legacy installs and derived false compatibility

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/scoped-pack-intent.ts`
- Modify: `packages/cli/src/commands/tools/shared/scoped-pack-intent.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/project-tools-config.ts`
- Modify: `packages/cli/src/commands/tools/shared/project-tools-config.test.ts`

**Step 1: Write test (RED)**

Cover physical assets with missing or legacy-false keys, explicit true with all
files missing, read-only non-mutation, and `legacy-false-conflict` diagnostics.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/scoped-pack-intent.test.ts src/commands/tools/shared/project-tools-config.test.ts`

**Step 2: Implement (GREEN)**

Return `declared | inferred-legacy | none`; stop deriving all booleans from any
member; retain a narrow compatibility adapter for existing call sites.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/scoped-pack-intent.ts packages/cli/src/commands/tools/shared/scoped-pack-intent.test.ts packages/cli/src/commands/tools/shared/project-tools-config.ts packages/cli/src/commands/tools/shared/project-tools-config.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "fix(p01-t05): preserve legacy pack intent discovery"`

### Task p01-t06: Implement complete per-scope pack inventory

**Files:**

- Create: `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- Create: `packages/cli/src/commands/tools/shared/pack-inventory.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.test.ts`

**Step 1: Write test (RED)**

Cover complete/partial/absent, managed versus seed ownership, skill/agent
versions, static digests, core docs directory, and duplicate project/user paths.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/tools/shared/scan-tools.test.ts`

**Step 2: Implement (GREEN)**

Add `inventoryScopedPack()` and `inventoryPack()`; scan user agents; keep custom
tool enumeration as a compatibility output derived beside pack inventory.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/pack-inventory.ts packages/cli/src/commands/tools/shared/pack-inventory.test.ts packages/cli/src/commands/tools/shared/scan-tools.ts packages/cli/src/commands/tools/shared/scan-tools.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p01-t06): compute complete pack inventory"`

### Task p01-t07: Harden managed-root path validation

**Files:**

- Modify: `packages/cli/src/fs/paths.ts`
- Modify: `packages/cli/src/fs/paths.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.test.ts`

**Step 1: Write test (RED)**

Cover symlinked `.agents`/`.oat` roots, nearest existing ancestors for fresh
paths, nested escape rejection, and clear recovery details.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/fs/paths.test.ts src/commands/tools/shared/pack-inventory.test.ts`

**Step 2: Implement (GREEN)**

Add a managed-root resolver/validator used by inventory and later destructive
execution; do not require a not-yet-created destination to pass `realpath`.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/fs/paths.ts packages/cli/src/fs/paths.test.ts packages/cli/src/commands/tools/shared/pack-inventory.ts packages/cli/src/commands/tools/shared/pack-inventory.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "fix(p01-t07): validate managed scope roots safely"`

**Phase 1 Verification:**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared src/commands/init/tools/shared src/fs/paths.test.ts`

## Phase 2: Unified Pack Lifecycle Commands

**Goal:** Route installation, inspection, update, removal, config, and sync
through one deterministic reconcile surface at project and user scope.

### Task p02-t01: Build pure reconcile plans

**Files:**

- Create: `packages/cli/src/commands/tools/shared/pack-reconcile.ts`
- Create: `packages/cli/src/commands/tools/shared/pack-reconcile.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/install-sync-context.ts`
- Modify: `packages/cli/src/commands/tools/shared/install-sync-context.test.ts`

**Step 1: Write test (RED)**

Cover install/update/remove operations, stable order, seed exclusion,
scope-specific template ownership, intent ordering, dry-run serialization, and
manifest-derived canonical provider paths for every pack.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-reconcile.test.ts src/commands/tools/shared/install-sync-context.test.ts`

**Step 2: Implement (GREEN)**

Add `planPackReconcile()` returning typed file/chmod/intent operations and exact
changed canonical provider paths. Replace `canonicalPathsForPack()`'s per-pack
switch with the manifest helper or a thin wrapper while retaining the existing
installed-path command hand-off.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/pack-reconcile.ts packages/cli/src/commands/tools/shared/pack-reconcile.test.ts packages/cli/src/commands/tools/shared/install-sync-context.ts packages/cli/src/commands/tools/shared/install-sync-context.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p02-t01): plan deterministic pack reconciliation"`

### Task p02-t02: Apply and verify reconcile plans

**Files:**

- Create: `packages/cli/src/commands/tools/shared/apply-pack-reconcile.ts`
- Create: `packages/cli/src/commands/tools/shared/apply-pack-reconcile.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/auto-sync.ts`
- Modify: `packages/cli/src/commands/tools/shared/auto-sync.test.ts`

**Step 1: Write test (RED)**

Cover successful apply, identical no-op, executable mode, path rejection,
failure before intent write, post-apply inventory verification, and sync input.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/apply-pack-reconcile.test.ts src/commands/tools/shared/auto-sync.test.ts`

**Step 2: Implement (GREEN)**

Add `applyPackReconcilePlan()` with injected filesystem/config/sync dependencies;
verify expected completeness before fresh-install intent persistence.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/apply-pack-reconcile.ts packages/cli/src/commands/tools/shared/apply-pack-reconcile.test.ts packages/cli/src/commands/tools/shared/auto-sync.ts packages/cli/src/commands/tools/shared/auto-sync.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p02-t02): apply pack reconcile plans safely"`

### Task p02-t03: Route fresh and aggregate installs through the manifest

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/tools/install/index.ts`
- Modify: `packages/cli/src/commands/tools/install/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/install-state.ts`
- Modify: `packages/cli/src/commands/init/tools/install-state.test.ts`

**Step 1: Write test (RED)**

Cover user defaults for fresh packs, preservation of existing/both placement,
explicit additive scope, user-only no-Git operation, and complete PJM selection.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts src/commands/init/tools/install-state.test.ts`

**Step 2: Implement (GREEN)**

Replace eligibility/member special cases with manifest and reconcile adapters;
gate repository guidance/config writes on project-scope adoption only.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.ts packages/cli/src/commands/tools/install/index.test.ts packages/cli/src/commands/init/tools/install-state.ts packages/cli/src/commands/init/tools/install-state.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p02-t03): install every pack at user scope"`

### Task p02-t04: Unify direct pack installers

**Files:**

- Modify: `packages/cli/src/commands/init/tools/core/index.ts`
- Modify: `packages/cli/src/commands/init/tools/ideas/index.ts`
- Modify: `packages/cli/src/commands/init/tools/docs/index.ts`
- Modify: `packages/cli/src/commands/init/tools/workflows/index.ts`
- Modify: `packages/cli/src/commands/init/tools/utility/index.ts`
- Modify: `packages/cli/src/commands/init/tools/project-management/index.ts`
- Modify: `packages/cli/src/commands/init/tools/research/index.ts`
- Modify: `packages/cli/src/commands/init/tools/brainstorm/index.ts`
- Modify: matching `index.test.ts` files in those directories

**Step 1: Write test (RED)**

Update the eight command suites for allowed scopes, manifest defaults, no-Git
user installs, stable JSON results, and project-only seed behavior.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/core/index.test.ts src/commands/init/tools/ideas/index.test.ts src/commands/init/tools/docs/index.test.ts src/commands/init/tools/workflows/index.test.ts src/commands/init/tools/utility/index.test.ts src/commands/init/tools/project-management/index.test.ts src/commands/init/tools/research/index.test.ts src/commands/init/tools/brainstorm/index.test.ts`

**Step 2: Implement (GREEN)**

Make direct installers thin adapters over the shared reconcile lifecycle and
remove project-management's user-scope rejection.

**Step 3: Format**

Run: `pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify**

Run the RED command again; expected: all eight suites pass.

**Step 5: Commit**

`git commit -m "refactor(p02-t04): unify direct pack installers"`

### Task p02-t05: Report complete pack list and info state

**Files:**

- Modify: `packages/cli/src/commands/tools/list/list-tools.ts`
- Modify: `packages/cli/src/commands/tools/list/list-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/info/info-tool.ts`
- Modify: `packages/cli/src/commands/tools/info/info-tool.test.ts`

**Step 1: Write test (RED)**

Cover placement, intent source, completeness, missing/static/agent members,
duplicates, versions, paths, and legacy diagnostics in human/JSON results.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/list/list-tools.test.ts src/commands/tools/info/info-tool.test.ts`

**Step 2: Implement (GREEN)**

Render shared inventory without removing compatible tool-level fields.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/list/list-tools.ts packages/cli/src/commands/tools/list/list-tools.test.ts packages/cli/src/commands/tools/info/info-tool.ts packages/cli/src/commands/tools/info/info-tool.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p02-t05): expose complete pack inventory"`

### Task p02-t06: Tighten has and outdated semantics

**Files:**

- Modify: `packages/cli/src/commands/tools/has/has-pack.ts`
- Modify: `packages/cli/src/commands/tools/has/has-pack.test.ts`
- Modify: `packages/cli/src/commands/tools/has/index.ts`
- Modify: `packages/cli/src/commands/tools/has/index.test.ts`
- Modify: `packages/cli/src/commands/tools/outdated/outdated-tools.ts`
- Modify: `packages/cli/src/commands/tools/outdated/outdated-tools.test.ts`

**Step 1: Write test (RED)**

Require complete-only pack success with `completeness`/`missing`; report static
asset drift and intended-but-absent packs as outdated/repairable.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/has src/commands/tools/outdated/outdated-tools.test.ts`

**Step 2: Implement (GREEN)**

Route both commands through inventory and preserve name-level custom-tool checks.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/has packages/cli/src/commands/tools/outdated/outdated-tools.ts packages/cli/src/commands/tools/outdated/outdated-tools.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "fix(p02-t06): require complete pack availability"`

### Task p02-t07: Reconcile evolving pack updates

**Files:**

- Modify: `packages/cli/src/commands/tools/update/update-tools.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/update/index.test.ts`
- Modify: `packages/cli/src/commands/tools/update/config-write.test.ts`

**Step 1: Write test (RED)**

Cover current release expansion, fully missing repair from intent, user agents,
core docs, identical static no-op, project override retention, dry-run parity,
and `--scope all` outside Git.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/update`

**Step 2: Implement (GREEN)**

Replace any-member expansion and duplicated asset tables with inventory/reconcile;
persist inferred intent only after successful explicit mutation.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/update`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p02-t07): update complete evolving pack surfaces"`

### Task p02-t08: Remove complete managed packs and scoped intent

**Files:**

- Modify: `packages/cli/src/commands/tools/remove/remove-tools.ts`
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/remove/index.ts`
- Modify: `packages/cli/src/commands/tools/remove/config-write.test.ts`
- Modify: `packages/cli/src/commands/remove/skills/remove-skills.ts`
- Modify: `packages/cli/src/commands/remove/skills/remove-skills.test.ts`

**Step 1: Write test (RED)**

Cover all asset kinds, already-missing files, seed/override retention, intent-key
deletion after success, failure retention, dry-run, and legacy command parity.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/remove src/commands/remove/skills/remove-skills.test.ts`

**Step 2: Implement (GREEN)**

Plan removal from the manifest instead of scan results; derive legacy pack lists
and report retained owner data.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/remove packages/cli/src/commands/remove/skills/remove-skills.ts packages/cli/src/commands/remove/skills/remove-skills.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p02-t08): remove only manifest-managed pack assets"`

### Task p02-t09: Add canonical removal sync

**Files:**

- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/sync/sync.types.ts`
- Modify: `packages/cli/src/commands/sync/dry-run.ts`
- Modify: `packages/cli/src/commands/sync/apply.ts`
- Modify: `packages/cli/src/commands/tools/remove/index.ts`
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/auto-sync.ts`
- Modify: `packages/cli/src/commands/tools/shared/auto-sync.test.ts`

`sync/dry-run.ts` and `sync/apply.ts` remain part of the audited task boundary
but required no code change; `remove-tools.test.ts` supplies the canonical-path
evidence consumed by the removal adapter.

**Step 1: Write test (RED)**

Cover `--remove-canonical` validation, absent-source requirement, exact provider
view pruning, scope isolation, dry-run, and install-filter non-regression.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/commands/tools/shared/auto-sync.test.ts`

**Step 2: Implement (GREEN)**

Add the internal symmetric removal filter and wire removal adapters to one sync
per affected scope.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/sync packages/cli/src/commands/tools/shared/auto-sync.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p02-t09): prune removed canonical provider views"`

**Phase 2 Verification:**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools src/commands/init/tools src/commands/remove/skills src/commands/sync/index.test.ts`

## Phase 3: Verified Scope Migration

**Goal:** Add an explicit preview-first move that verifies destination before
offering source removal and retains a recoverable combined state on failure.

### Task p03-t01: Define migration plans and result state

**Files:**

- Create: `packages/cli/src/commands/tools/migrate/migrate-pack.ts`
- Create: `packages/cli/src/commands/tools/migrate/migrate-pack.test.ts`

**Step 1: Write test (RED)**

Cover invalid same scope, source intent/legacy detection, conflicts, retained
overrides, destination operations, and stable preview/result shapes.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/migrate/migrate-pack.test.ts`

**Step 2: Implement (GREEN)**

Add `planPackMigration()` and typed preview/outcome models composed from
inventory and reconcile plans.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/migrate/migrate-pack.ts packages/cli/src/commands/tools/migrate/migrate-pack.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p03-t01): plan verified pack scope migration"`

### Task p03-t02: Install and verify migration destination

**Files:**

- Modify: `packages/cli/src/commands/tools/migrate/migrate-pack.ts`
- Modify: `packages/cli/src/commands/tools/migrate/migrate-pack.test.ts`

**Step 1: Write test (RED)**

Inject copy and verification failures; assert source assets/intent remain
untouched and destination intent is written only after complete re-inventory.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/migrate/migrate-pack.test.ts`

**Step 2: Implement (GREEN)**

Add `executeMigrationDestination()` using apply/re-inventory and explicit
verified destination state.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/migrate/migrate-pack.ts packages/cli/src/commands/tools/migrate/migrate-pack.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p03-t02): verify migration destination before removal"`

### Task p03-t03: Gate source removal and recovery

**Files:**

- Modify: `packages/cli/src/commands/tools/migrate/migrate-pack.ts`
- Modify: `packages/cli/src/commands/tools/migrate/migrate-pack.test.ts`

**Step 1: Write test (RED)**

Cover decline, non-interactive stop, successful removal, partial removal
failure, retry, source-intent clearing order, and exact sync paths.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/migrate/migrate-pack.test.ts`

**Step 2: Implement (GREEN)**

Add `completeMigrationSourceRemoval()` with explicit confirmation input and
structured recovery instructions; retain destination and source intent on fail.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/migrate/migrate-pack.ts packages/cli/src/commands/tools/migrate/migrate-pack.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p03-t03): gate migration source removal"`

### Task p03-t04: Add the tools migrate CLI

**Files:**

- Create: `packages/cli/src/commands/tools/migrate/index.ts`
- Create: `packages/cli/src/commands/tools/migrate/index.test.ts`
- Modify: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Cover required pack/from/to, dry-run, human preview/confirmation, JSON output,
no force bypass, exit codes, and command registration/help.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/migrate/index.test.ts src/commands/help-snapshots.test.ts`

**Step 2: Implement (GREEN)**

Register `oat tools migrate` as a thin adapter over migration functions.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/migrate/index.ts packages/cli/src/commands/tools/migrate/index.test.ts packages/cli/src/commands/tools/index.ts packages/cli/src/commands/help-snapshots.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p03-t04): expose guided pack migration command"`

### Task p03-t05: Exercise migration end to end

**Files:**

- Create: `packages/cli/src/commands/tools/migrate/migrate.integration.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)**

Use temp HOME/Git roots for project→user, user→project, retained both, new
release members, PJM owner-data preservation, sync, and recovery reruns.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/migrate/migrate.integration.test.ts src/commands/commands.integration.test.ts`

**Step 2: Implement (GREEN)**

Add only integration seams/fixtures needed by the public command; fix bounded
migration defects exposed by the scenarios.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/migrate/migrate.integration.test.ts packages/cli/src/commands/commands.integration.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass and source survives every pre-verify failure.

**Step 5: Commit**

`git commit -m "test(p03-t05): verify pack migration safety boundaries"`

**Phase 3 Verification:**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/migrate src/commands/commands.integration.test.ts`

## Phase 4: PJM Ownership and Portable Resources

**Goal:** Make PJM capability user-owned while repository adoption/state stays
explicit, and make every referenced static resource resolve from its installed scope.

### Task p04-t01: Add durable PJM adoption state

**Files:**

- Create: `packages/cli/src/commands/pjm/adoption.ts`
- Create: `packages/cli/src/commands/pjm/adoption.test.ts`
- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/commands/pjm/init.ts`
- Modify: `packages/cli/src/commands/pjm/init.test.ts`

**Step 1: Write test (RED)**

Cover explicit marker, complete legacy inference, partial initialization,
post-scaffold marker ordering, repeat init, and config preservation.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/adoption.test.ts src/commands/pjm/init.test.ts src/config/oat-config.test.ts`

**Step 2: Implement (GREEN)**

Add `resolvePjmAdoption()` and project config `pjm.initialized/schemaVersion`;
write marker only after successful canonical scaffold verification.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/pjm/adoption.ts packages/cli/src/commands/pjm/adoption.test.ts packages/cli/src/commands/pjm/init.ts packages/cli/src/commands/pjm/init.test.ts packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p04-t01): record explicit PJM repository adoption"`

### Task p04-t02: Fail PJM writes closed before initialization

**Files:**

- Modify: `packages/cli/src/commands/pjm/index.ts`
- Modify: `packages/cli/src/commands/pjm/index.test.ts`
- Modify: `packages/cli/src/commands/pjm/doctor.ts`
- Modify: `packages/cli/src/commands/pjm/doctor.test.ts`
- Modify: `packages/cli/src/commands/backlog/index.ts`
- Modify: `packages/cli/src/commands/backlog/index.test.ts`
- Modify: `packages/cli/src/commands/decision/index.ts`
- Modify: `packages/cli/src/commands/decision/index.test.ts`

**Step 1: Write test (RED)**

Snapshot zero writes for uninitialized/partial repos; cover `pjm init` guidance,
backlog/decision init no longer being alternate adoption, and doctor read-only
output derived from `resolvePjmAdoption()` rather than project pack intent. The
additive JSON contract is
`adoption: { state: 'declared' | 'inferred-legacy' | 'partial-initialization' | 'none', repoRoot: string, recovery: 'oat pjm init' | null }`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/backlog/index.test.ts src/commands/decision/index.test.ts`

**Step 2: Implement (GREEN)**

Apply the shared adoption guard before all non-migration mutations; use typed
`CliError` with repository path and recovery command. Re-key doctor status on
`resolvePjmAdoption()` and emit the fixed additive `adoption` JSON object.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/pjm packages/cli/src/commands/backlog/index.ts packages/cli/src/commands/backlog/index.test.ts packages/cli/src/commands/decision/index.ts packages/cli/src/commands/decision/index.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass with unchanged filesystem snapshots.

**Step 5: Commit**

`git commit -m "fix(p04-t02): guard PJM writes behind adoption"`

### Task p04-t03: Resolve PJM templates by repository, user, then bundle

**Files:**

- Create: `packages/cli/src/commands/pjm/template-source.ts`
- Create: `packages/cli/src/commands/pjm/template-source.test.ts`
- Modify: `packages/cli/src/commands/pjm/init.ts`
- Modify: `packages/cli/src/commands/pjm/init.test.ts`
- Modify: `packages/cli/src/commands/backlog/new.ts`
- Modify: `packages/cli/src/commands/backlog/new.test.ts`
- Modify: `packages/cli/src/commands/decision/new.ts`
- Modify: `packages/cli/src/commands/decision/new.test.ts`

**Step 1: Write test (RED)**

Cover all precedence combinations, explicit HOME injection, source tier/path,
missing-template error, and preservation of existing repository output.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/template-source.test.ts src/commands/backlog/new.test.ts src/commands/decision/new.test.ts src/commands/pjm/init.test.ts`

**Step 2: Implement (GREEN)**

Add `resolvePjmTemplate()` and replace duplicated repo/bundle lookup at all call sites.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/pjm/template-source.ts packages/cli/src/commands/pjm/template-source.test.ts packages/cli/src/commands/pjm/init.ts packages/cli/src/commands/pjm/init.test.ts packages/cli/src/commands/backlog/new.ts packages/cli/src/commands/backlog/new.test.ts packages/cli/src/commands/decision/new.ts packages/cli/src/commands/decision/new.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p04-t03): add PJM managed-default template precedence"`

### Task p04-t04: Complete project-management user installation

**Files:**

- Modify: `packages/cli/src/commands/init/tools/project-management/install-project-management.ts`
- Modify: `packages/cli/src/commands/init/tools/project-management/install-project-management.test.ts`
- Modify: `packages/cli/src/commands/init/tools/project-management/index.ts`
- Modify: `packages/cli/src/commands/init/tools/project-management/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/project-management/agents-guidance.ts`

**Step 1: Write test (RED)**

Cover user skill/template destinations, no Git/AGENTS writes, project override
seeding, adoption-owned guidance, update/removal parity, and JSON provenance.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/project-management/install-project-management.test.ts src/commands/init/tools/project-management/index.test.ts`

**Step 2: Implement (GREEN)**

Finish the direct adapter and move repository guidance ownership to explicit
PJM init/setup rather than pack placement.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/init/tools/project-management`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p04-t04): install PJM capability at user scope"`

### Task p04-t05: Make shared docs scripts scope-relative

**Files:**

- Modify: `.agents/skills/oat-docs-analyze/SKILL.md`
- Modify: `.agents/skills/oat-docs-apply/SKILL.md`
- Modify: `.agents/skills/oat-agent-instructions-analyze/SKILL.md`
- Modify: `.agents/skills/oat-agent-instructions-apply/SKILL.md`
- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/resolve-tracking-script.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Step 1: Write test (RED)**

Sweep every bundled skill that references `.oat/scripts/`; reject bare
repo-relative `.oat/scripts/resolve-tracking.sh`, require a scope root derived
from the loaded `SKILL.md`, and cover user/project installed layouts.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/resolve-tracking-script.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Step 2: Implement (GREEN)**

Update all five consuming skill contracts across the docs and workflows packs
to pair the loaded skill with the same-scope shared script. Bump each changed
skill's frontmatter version once for the PR.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-docs-analyze/SKILL.md .agents/skills/oat-docs-apply/SKILL.md .agents/skills/oat-agent-instructions-analyze/SKILL.md .agents/skills/oat-agent-instructions-apply/SKILL.md .agents/skills/oat-repo-knowledge-index/SKILL.md packages/cli/src/commands/init/tools/shared/resolve-tracking-script.test.ts packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Step 4: Verify**

Run the RED command plus `pnpm run check:skill-bumps`; expected: pass.

**Step 5: Commit**

`git commit -m "fix(p04-t05): resolve docs scripts from installed scope"`

### Task p04-t06: Make PJM skill resources and preflights portable

**Files:**

- Modify: `.agents/skills/oat-pjm-add-backlog-item/SKILL.md`
- Modify: `.agents/skills/oat-pjm-decision/SKILL.md`
- Modify: `.agents/skills/oat-pjm-update-repo-reference/SKILL.md`
- Modify: `.agents/skills/oat-pjm-review-backlog/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts`

**Step 1: Write test (RED)**

Require skill-local reference resolution, read-only adoption preflight before
writes, actionable `oat pjm init` stop, and packaged reference existence.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/init/tools/shared/project-start-preflight-contracts.test.ts`

**Step 2: Implement (GREEN)**

Update the four skills without repo-local skill-path assumptions. Bump each
changed skill version once for the PR.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-pjm-add-backlog-item/SKILL.md .agents/skills/oat-pjm-decision/SKILL.md .agents/skills/oat-pjm-update-repo-reference/SKILL.md .agents/skills/oat-pjm-review-backlog/SKILL.md packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts`

**Step 4: Verify**

Run the RED command plus `pnpm run check:skill-bumps`; expected: pass.

**Step 5: Commit**

`git commit -m "fix(p04-t06): make PJM skills user-scope portable"`

### Task p04-t07: Separate PJM capability presence from repository adoption

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: `.agents/skills/oat-brainstorm/references/destinations.md`
- Modify: `packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts`

**Step 1: Write test (RED)**

Reject bundled skill contracts that use `oat tools has project-management` as
evidence that the current repository adopted PJM. Require a read-only
`oat pjm doctor --json` adoption preflight before repository PJM writes, an
actionable `oat pjm init` stop for absent/partial adoption, and no implicit
decision initialization from an uninitialized repository.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/project-start-preflight-contracts.test.ts`

**Step 2: Implement (GREEN)**

Keep `tools has project-management` only as a capability-availability check.
Update the three consuming skills and brainstorm destination guidance to branch
on the exact `adoption.state` field from the read-only doctor JSON before
offering or performing PJM writes. Bump each changed skill's frontmatter
version once for the PR.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-project-summary/SKILL.md .agents/skills/oat-brainstorm/SKILL.md .agents/skills/oat-brainstorm/references/destinations.md packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts`

**Step 4: Verify**

Run the RED command plus `pnpm run check:skill-bumps`; expected: pass with no
bundled skill treating global pack presence as repository adoption.

**Step 5: Commit**

`git commit -m "fix(p04-t07): preflight repository PJM adoption in consumers"`

**Phase 4 Verification:**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/backlog src/commands/decision src/commands/init/tools/project-management src/commands/init/tools/shared && pnpm lint && pnpm format && pnpm run check:skill-bumps`

## Phase 5: Diagnostics, Documentation, and Release Readiness

**Goal:** Expose actionable ownership/drift diagnostics, document the new
contract, verify provider materialization, and satisfy release gates.

### Task p05-t01: Surface pack state in status and doctor

**Files:**

- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write test (RED)**

Cover partial, stale, newer, legacy false, duplicate, retained override,
uninitialized PJM, and project-scope-unavailable diagnostics in human/JSON mode.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts src/commands/doctor/index.test.ts`

**Step 2: Implement (GREEN)**

Consume shared inventory/adoption state and emit structured recovery commands
without exposing unrelated home content.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "feat(p05-t01): diagnose scoped pack ownership and drift"`

### Task p05-t02: Update tool-pack and PJM documentation

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Modify: `apps/oat-docs/docs/cli-utilities/bootstrap.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/cli-utilities/backlog-lifecycle.md`
- Modify: `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/docs/reference/file-locations.md`
- Modify: `apps/oat-docs/docs/reference/troubleshooting.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Update if generated: `apps/oat-docs/index.md`

**Step 1: Define the acceptance checklist**

Document fresh user defaults, evolving membership, asset destinations,
complete-only `has`, intent versus inventory, migration/rollback, duplicates,
PJM adoption/state/template precedence, and removal ownership.

**Step 2: Implement (GREEN)**

Author the listed docs and update cross-links. Run
`pnpm run cli -- docs generate-index`; do not hand-edit the generated
`apps/oat-docs/index.md`, and commit it if regeneration changes it.

**Step 3: Format**

Run: `pnpm exec oxfmt --write apps/oat-docs/docs/cli-utilities/tool-packs.md apps/oat-docs/docs/cli-utilities/bootstrap.md apps/oat-docs/docs/cli-utilities/config-and-local-state.md apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/cli-utilities/backlog-lifecycle.md apps/oat-docs/docs/provider-sync/scope-and-surface.md apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/docs/reference/file-locations.md apps/oat-docs/docs/reference/troubleshooting.md apps/oat-docs/docs/workflows/projects/lifecycle.md`

**Step 4: Verify**

Run: `pnpm check && pnpm build:docs`
Expected: markdownlint and docs build pass.

**Step 5: Commit**

`git commit -m "docs(p05-t02): explain user-scope pack lifecycle"`

### Task p05-t03: Verify provider materialization across scopes

**Files:**

- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- Modify: `packages/cli/src/providers/cursor/codec/sync-extension.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)**

Cover user/project skills and agents, duplicate-source diagnostics, exact install
and removal filters, and representative Codex/Cursor materialized paths.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/providers/codex/codec/sync-extension.test.ts src/providers/cursor/codec/sync-extension.test.ts src/commands/commands.integration.test.ts`

**Step 2: Implement (GREEN)**

Fix bounded provider adapter gaps only; do not define provider execution
precedence when both canonical sources exist.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/sync/index.test.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts packages/cli/src/providers/cursor/codec/sync-extension.test.ts packages/cli/src/commands/commands.integration.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass.

**Step 5: Commit**

`git commit -m "test(p05-t03): verify scoped provider materialization"`

### Task p05-t04: Add complete lifecycle acceptance coverage

**Files:**

- Create: `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`

**Step 1: Write test (RED)**

Matrix all packs across fresh user/project installs, update to new membership,
fully missing repair, duplicates, removal, migration/rollback, PJM owner data,
repeat no-op, and no-Git user operation.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/tool-pack-lifecycle.integration.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`

**Step 2: Implement (GREEN)**

Add reusable temp-root fixtures and fix only contract gaps revealed by the
acceptance matrix.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`

**Step 4: Verify**

Run the RED command again; expected: pass for every manifest pack.

**Step 5: Commit**

`git commit -m "test(p05-t04): cover complete scoped pack lifecycle"`

### Task p05-t05: Bump lockstep public package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Verify expected RED**

Run: `pnpm release:check-versions`
Expected: fails because shipped CLI/assets/docs changed without lockstep bumps.

**Step 2: Implement (GREEN)**

Advance all five public packages to the same next patch version, then regenerate
`packages/cli/assets/public-package-versions.json` through `pnpm build` or the
CLI bundle-assets script.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json`

**Step 4: Verify**

Run: `pnpm release:check-versions && pnpm release:validate`
Expected: both pass.

**Step 5: Commit**

`git commit -m "chore(p05-t05): bump public packages for scoped packs"`

### Task p05-t06: Run the complete repository gate sequence

**Files:**

- Modify if needed: only files already owned by the failing task/phase
- Update: `.oat/projects/shared/user-scope-tool-packs/implementation.md`

**Step 1: Run gates in CI order**

Capture each exit code separately:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `pnpm release:check-versions`
7. `pnpm release:validate`
8. `pnpm build:docs`

Also run `pnpm lint` and `pnpm format` because skills changed.

**Step 2: Repair bounded failures**

Return any failure to the task that owns the affected contract; do not weaken
tests, broaden scope, or hide environment-limited evidence.

**Step 3: Verify clean worktree delta**

Run: `git diff --check && git status --short`
Expected: only intended implementation/project bookkeeping changes.

**Step 4: Commit**

Record final gate evidence in `implementation.md`, then stage it:
`git add .oat/projects/shared/user-scope-tool-packs/implementation.md`

Commit:
`git commit -m "chore(p05-t06): record scoped pack verification"`

**Phase 5 Verification:** The complete gate sequence above passes with explicit
exit-code evidence.

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      | Reviewed Head                            | Invocation | Gate Target                   |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------------------- |
| p01    | code     | fixes_completed | 2026-08-27 | reviews/archived/p01-review-2026-08-27T031035Z.md             | e0039d8065b4b8eb5ed45fb42d5c1382132c3104 | auto       | -                             |
| p01    | code     | fixes_completed | 2026-08-27 | reviews/archived/p01-review-2026-08-27T035112Z.md             | a1d5ff52d2f460cfdfd28e2edaf5230503195989 | auto       | -                             |
| p01    | code     | fixes_completed | 2026-08-27 | reviews/archived/p01-review-2026-08-27T041427Z.md             | f904f4c544b2fb51d71f0c029493d52d251e8959 | auto       | -                             |
| p01    | code     | passed          | 2026-08-27 | reviews/archived/p01-review-2026-08-27T050410Z.md             | 3aba439f46de528b61e9a9d317a96fc455745229 | auto       | -                             |
| p02    | code     | fixes_completed | 2026-08-27 | reviews/archived/p02-review-2026-08-27T055129Z.md             | 1c43cccbf7bc542e93d4157d13252c43cb352b80 | auto       | -                             |
| p02    | code     | fixes_completed | 2026-08-27 | reviews/archived/p02-review-2026-08-27T063435Z.md             | 0f5e9ac4a11ea404024b60decdacd98640ed26e0 | auto       | -                             |
| p02    | code     | passed          | 2026-08-27 | reviews/archived/p02-review-2026-08-27T070524Z.md             | dc600fe68bdcccd810cc0574f2b472113a588f11 | auto       | -                             |
| final  | code     | fixes_completed | 2026-08-27 | reviews/archived/final-review-2026-08-27T174707Z.md           | dd359d2bbf603e5af9030c6abe931f4c37f05a07 | manual     | -                             |
| final  | code     | fixes_completed | 2026-08-27 | reviews/archived/final-review-2026-08-27T222249Z.md           | 3802bd083bb74627916c28faefa0910c92b9a2eb | manual     | -                             |
| final  | code     | passed          | 2026-08-27 | reviews/archived/final-review-2026-08-27T230626Z.md           | 0bbeacc64e1b33f01bcbe506d00871bc4b3e813c | manual     | -                             |
| spec   | artifact | pending         | -          | -                                                             | -                                        | -          | -                             |
| design | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-design-review-2026-08-27T012258Z.md | -                                        | gate       | claude-fable-skip-permissions |
| p03    | code     | fixes_completed | 2026-08-27 | reviews/archived/p03-review-2026-08-27T074154Z.md             | 3e2421bce1286dd61852e8e15d87cff1c8c82b5d | manual     | -                             |
| p04    | code     | fixes_completed | 2026-08-27 | reviews/archived/p04-review-2026-08-27T133629Z.md             | bed357babe582cec0a32804e38ef05c2194abd01 | manual     | -                             |
| p05    | code     | fixes_completed | 2026-08-27 | reviews/archived/p05-review-2026-08-27T154500Z.md             | 17eb63ea5c3f691db8b7b6baae92a6f7fee857d5 | manual     | -                             |
| p03    | code     | fixes_completed | 2026-08-27 | reviews/archived/p03-review-2026-08-27T081809Z.md             | 6b0a7fe542f41f2a20143b0f3194242cf63ef770 | manual     | -                             |
| p03    | code     | fixes_completed | 2026-08-27 | reviews/archived/p03-review-2026-08-27T083913Z.md             | b0a6bc16e5efa5cb22cac853d8a45c2f8358e8f1 | manual     | -                             |
| p03    | code     | passed          | 2026-08-27 | reviews/archived/p03-review-2026-08-27T125029Z.md             | 38233ba2e997f3e18ad2fa3ebc888cab95131688 | manual     | -                             |
| p04    | code     | passed          | 2026-08-27 | reviews/archived/p04-review-2026-08-27T144000Z.md             | f337df8b5d3b403322a7461077dac6894c5ba7cc | manual     | -                             |
| p05    | code     | passed          | 2026-08-27 | reviews/archived/p05-review-2026-08-27T170000Z.md             | ab9250d685fa89a588ad896ca594b446b173bea4 | manual     | -                             |
| plan   | artifact | pending         | -          | -                                                             | -                                        | -          | -                             |
| plan   | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T015201Z.md   | -                                        | gate       | claude-fable-skip-permissions |
| plan   | artifact | passed          | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T020356Z.md   | -                                        | gate       | claude-fable-skip-permissions |

Statuses are monotonic: `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`. Append new review events; never delete earlier
rows.

## Implementation Complete

**Summary:**

- Phase 1: 7 tasks - canonical manifest, scoped intent, inventory, path safety
- Phase 2: 9 tasks - unified install/read/update/remove/sync lifecycle
- Phase 3: 5 tasks - verified guided scope migration
- Phase 4: 7 tasks - PJM adoption/templates/user scope/resource portability
- Phase 5: 6 tasks - diagnostics, docs, provider/acceptance tests, release gates

**Total: 34 tasks**

Ready for implementation. The configured Fable plan gate passed and its
non-blocking findings were resolved during review receipt.

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260818-make-the-project-management.md`
- Design review: `reviews/archived/artifact-design-review-2026-08-27T012258Z.md`
- Initial plan review: `reviews/archived/artifact-plan-review-2026-08-27T015201Z.md`
- Passing plan review: `reviews/archived/artifact-plan-review-2026-08-27T020356Z.md`
