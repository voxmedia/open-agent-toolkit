---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-31
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p07']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: spec-driven
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: Tool-Pack Scope, Provider Reachability, and Dispatch Truthfulness

> Execute with `oat-project-implement`. Phase p01 is a hard landing gate: no
> shared-source implementation starts until the diagnostics predecessor is
> accepted, landed, and present in this branch's ancestry.

**Goal:** Make tool-pack scope selection, realized placement, provider
reachability, restart advice, collection ownership, project guidance, and
dispatch provenance report what OAT can actually prove.

**Architecture:** Preserve canonical pack inventory, provider adapters, and
`DispatchReportV1` as their existing authorities. Add one layered evidence
projection, a central provider registry, bounded mutation reconcilers, and a
namespaced persisted dispatch record so intent, filesystem state,
materialization, visibility, and runtime observation never collapse into one
boolean.

**Tech Stack:** TypeScript ESM, Commander, Zod, Vitest, pnpm, Turborepo,
oxfmt/oxlint, Markdown skills, and Fumadocs.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Derived all phases from the approved spec and design
- [x] Revalidated current source and test seams with bounded reconnaissance
- [x] Mapped every FR/NFR to stable task IDs in `spec.md`
- [x] Defer HiLL checkpoint confirmation to `oat-project-implement`
- [x] Evaluated phase boundaries for parallelism; keep execution sequential
- [x] User confirmed the plan breakdown
- [x] Project dispatch policy selected and persisted
- [x] Phase gate review choice resolved after plan confirmation (disabled)
- [x] Automatic plan artifact review and configured plan gate passed

## Coordination and Sequencing

- `scope-adoption-diagnostics` landed through PR #249 at accepted merge SHA
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0`. It owns the narrow
  provider-materialization input, shared-owner attribution, inventory
  availability, doctor/status rendering, PJM fixes, and release/backlog
  fan-in.
- Treat that accepted SHA and its exported seams as the predecessor baseline.
  No routine cross-project coordination is required after p01 revalidation.
- Preserve PR #227's project-artifact `shared | local | synced` axis, PR #240's
  content-aware inventory/lifecycle safety, and PR #242's exact canonical-role
  and native-first contracts.
- Sync strategy is configuration-owned. Configured `auto` may select collection
  aliases; explicit configured `symlink` and `copy` remain per-entry. This plan
  does not invent an `oat sync --strategy` flag.
- Release topology is one integrated PR. No phase ships independently; p01-p07
  remain sequential commits in that PR, and p07-t04 is the sole lockstep
  version, backlog-closeout, release-validation, and reviewed-head boundary.
  Splitting a phase into a separately shipped PR requires revising this plan
  with a distinct version and gate fan-in for that release.
- Release manifests, help snapshots, shared docs, skill versions, and backlog
  indexes are final fan-in surfaces.

## Parallelism

`oat_plan_parallel_groups: []` keeps all phases sequential. Evidence, provider,
and collection work overlap sync, manifest, diagnostics, and lifecycle files.
Guidance and dispatch both touch CLI registration/help/docs/validation, and all
children converge on one release fan-in.

## Phase 1: Accepted Diagnostics Baseline

**Goal:** Establish one landed, tested predecessor baseline before overlapping
source changes.

### Task p01-t01: Land, rebase, and record the diagnostics predecessor

**Files:**

- Modify: `.oat/projects/shared/tool-pack-scope-provider-truthfulness/implementation.md`
- Modify only for landed interface drift: `.oat/projects/shared/tool-pack-scope-provider-truthfulness/design.md`
- Modify only for task/file drift: `.oat/projects/shared/tool-pack-scope-provider-truthfulness/plan.md`
- Modify with any remap: `.oat/projects/shared/tool-pack-scope-provider-truthfulness/spec.md`

**Step 1: Prove the landing gate**

Obtain the accepted `scope-adoption-diagnostics` merge SHA, fetch
`origin/main`, and require `git merge-base --is-ancestor <accepted-sha>
origin/main` to succeed. Stop without source edits if it is merely active or
pushed.

**Step 2: Rebase and inspect**

Rebase onto the containing `origin/main`. Compare landed inventory
materialization input, shared-owner attribution, inventory availability, and
doctor/status renderer exports/tests against the design. Record the SHA and
exact adaptations in `implementation.md`; update artifacts only when required.

**Step 3: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/pjm \
  src/commands/tools/shared/pack-inventory.test.ts \
  src/commands/doctor/index.test.ts \
  src/commands/status/index.test.ts \
  src/commands/sync/index.test.ts \
  src/commands/tools/tool-pack-lifecycle.integration.test.ts
git diff --check
```

Expected: landed predecessor contracts pass; no umbrella source implementation
predates the accepted SHA.

**Step 4: Commit**

```bash
git add -- \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/implementation.md \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/design.md \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/plan.md \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/spec.md
git commit -m "chore(p01-t01): record accepted diagnostics baseline"
```

**Phase 1 Verification:** The accepted SHA is in branch ancestry, focused
suites pass, and later tasks target landed—not pre-landing—interfaces.

## Phase 2: Shared Evidence and Truthful Scope

**Goal:** Separate intent from realized placement and make lifecycle/reporting
surfaces consume one unknown-aware model.

### Task p02-t01: Add the canonical pack evidence projector

**Files:**

- Create: `packages/cli/src/commands/tools/shared/pack-evidence.ts`
- Create: `packages/cli/src/commands/tools/shared/pack-evidence.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.test.ts`

**Step 1: Write tests (RED)**

Pin `PackScopeFacts`, `ToolPackEvidence`, `knownRealizedScopes`,
`unknownScopes`, and `realizedPlacement`. Cover declared-only, absent,
partial/current/drifted/newer, duplicate, one-scope unavailable, and all-scopes
verified absent while preserving landed owner/failure and PR #240 health/seed
semantics.

**Step 2: Implement (GREEN)**

Add `hasScopedPackRealizationEvidence()` and `projectPackEvidence()`. Derive
realization only from present non-shared managed assets in available inventory.
Keep legacy `PackInventory.placement` byte-shape compatible and deprecated for
one release; new selectors may not consume it.

**Step 3: Refactor**

Keep provider diagnostics outside canonical `PackDiagnostic`. Adapt the landed
narrow materialization input rather than recreating provider detection.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-evidence.test.ts src/commands/tools/shared/pack-inventory.test.ts`

Expected: evidence, health/seed, owner, and inventory-failure cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/shared/pack-evidence.ts packages/cli/src/commands/tools/shared/pack-evidence.test.ts packages/cli/src/commands/tools/shared/pack-inventory.ts packages/cli/src/commands/tools/shared/pack-inventory.test.ts
git commit -m "feat(p02-t01): project truthful pack placement evidence"
```

### Task p02-t02: Define the provider registry and scope context

**Files:**

- Create: `packages/cli/src/providers/shared/registry.ts`
- Create: `packages/cli/src/providers/shared/registry.test.ts`
- Modify: `packages/cli/src/providers/shared/index.ts`
- Modify: `packages/cli/src/providers/shared/adapter-contract.test.ts`

**Step 1: Write tests (RED)**

Require one registration per adapter, explicit scope/content capability rows,
projection modes, extension ownership, collection support, and refresh policy.
Missing/contradictory rows fail validation. Pin existing activation precedence
through `resolveProviderScopeContext()`. Require Copilot and Gemini managed-role
rows to carry focused adapter-test proof before reporting support; unproven rows
must register as `unknown` or `unsupported`.

**Step 2: Implement (GREEN)**

Add `ProviderRegistration`, `ProviderContentCapability`,
`ProviderCatalogRefreshPolicy`, `getProviderRegistrations()`, and
`resolveProviderScopeContext()`. Registry facts describe support; they never
launch providers or infer visibility.

**Step 3: Refactor**

Keep `PathMapping` authoritative for paths/strategies. A missing capability row
is an error, not implicit support.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/shared/registry.test.ts src/providers/shared/adapter-contract.test.ts src/providers/shared/adapter.types.test.ts`

Expected: registry and activation contracts pass; Copilot/Gemini managed-role
support is either proven by focused adapter tests or reported
`unknown`/`unsupported`.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/providers/shared/registry.ts \
  packages/cli/src/providers/shared/registry.test.ts \
  packages/cli/src/providers/shared/index.ts \
  packages/cli/src/providers/shared/adapter-contract.test.ts
git commit -m "feat(p02-t02): centralize provider capability registration"
```

### Task p02-t03: Route provider consumers through the registry

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `packages/cli/src/commands/providers/list/list.ts`
- Modify: `packages/cli/src/commands/providers/list/list.test.ts`
- Modify: `packages/cli/src/commands/providers/inspect/inspect.ts`
- Modify: `packages/cli/src/commands/providers/inspect/inspect.test.ts`
- Modify: `packages/cli/src/commands/providers/set/index.ts`
- Modify: `packages/cli/src/commands/providers/set/index.test.ts`

**Step 1: Write tests (RED)**

Inject registrations into every caller and assert common provider order,
activation evidence, and extensions. A registry-only test provider must appear
without editing any command-private provider list.

**Step 2: Implement (GREEN)**

Replace duplicated arrays with the registry. Resolve config/detection once per
scope and inject `ProviderScopeContext` into consumers.

**Step 3: Refactor**

Preserve dependency injection and mismatch prompts; keep volatile detection
outside canonical inventory.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts src/commands/sync/index.test.ts src/commands/status/index.test.ts src/commands/doctor/index.test.ts src/commands/providers`

Expected: all consumers use the registry with unchanged activation precedence.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/init/index.ts \
  packages/cli/src/commands/init/index.test.ts \
  packages/cli/src/commands/sync/index.ts \
  packages/cli/src/commands/sync/index.test.ts \
  packages/cli/src/commands/status/index.ts \
  packages/cli/src/commands/status/index.test.ts \
  packages/cli/src/commands/doctor/index.ts \
  packages/cli/src/commands/doctor/index.test.ts \
  packages/cli/src/commands/providers/list/list.ts \
  packages/cli/src/commands/providers/list/list.test.ts \
  packages/cli/src/commands/providers/inspect/inspect.ts \
  packages/cli/src/commands/providers/inspect/inspect.test.ts \
  packages/cli/src/commands/providers/set/index.ts \
  packages/cli/src/commands/providers/set/index.test.ts
git commit -m "refactor(p02-t03): route provider consumers through registry"
```

### Task p02-t04: Add additive scope selection and lifecycle outcomes

**Files:**

- Create: `packages/cli/src/commands/tools/shared/pack-lifecycle-outcome.ts`
- Create: `packages/cli/src/commands/tools/shared/pack-lifecycle-outcome.test.ts`
- Modify: `packages/cli/src/commands/init/tools/install-state.ts`
- Modify: `packages/cli/src/commands/init/tools/install-state.test.ts`

**Step 1: Write tests (RED)**

Cover `resolveAdditivePackScopeSelection()` and
`evaluatePackLifecycleOutcome()` for every request/retained scope, declared-only
intent, unknown scope, canonical/provider/verification failure, and complete
outcome.

**Step 2: Implement (GREEN)**

Introduce `PackScopeSelection` and `PackLifecycleOutcome`. Unknown evaluated
scopes fail closed; legacy `InstalledState` stays compatibility-only.

**Step 3: Refactor**

Removal stays explicit. Provider failure yields `partial` without rolling back
verified canonical success.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-lifecycle-outcome.test.ts src/commands/init/tools/install-state.test.ts`

Expected: selection/outcome matrices pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/shared/pack-lifecycle-outcome.ts packages/cli/src/commands/tools/shared/pack-lifecycle-outcome.test.ts packages/cli/src/commands/init/tools/install-state.ts packages/cli/src/commands/init/tools/install-state.test.ts
git commit -m "feat(p02-t04): model additive pack lifecycle outcomes"
```

### Task p02-t05: Make aggregate and direct installs use realized placement

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/tools/install/index.ts`
- Modify: `packages/cli/src/commands/tools/install/index.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/auto-sync.ts`
- Modify: `packages/cli/src/commands/tools/shared/auto-sync.test.ts`
- Modify: `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts`

**Step 1: Write tests (RED)**

Replace the fixture that pins declared placement. For ideas, utility, research,
and brainstorm assert labels, explicit user selection, user-only canonical
apply/auto-sync/completion. Cover additive project/user/both and fail-closed
inventory unknowns. For the FR10 / PR #227 regression, exercise aggregate and
direct installs with config fixtures that seed `projects.defaultScope`,
`projects.root`, and an unknown future sibling project field. Assert all three
values remain byte-equivalent after project-only, user-only, and additive
project+user reconciliation.

**Step 2: Implement (GREEN)**

Make picker/default/direct/aggregate selection consume
`knownRealizedScopes`; label intent separately, sync only changed canonical
scopes, and re-inventory before completion.

**Step 3: Refactor**

Share one selection/outcome path while preserving the safe reconcile
transaction and PJM independence.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts src/commands/tools/shared/auto-sync.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts`

Expected: issue #228 and additive placement cases pass with human/JSON parity;
the explicit FR10 project-config preservation matrix passes without rewriting
`projects.defaultScope`, `projects.root`, or the future sibling field.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/init/tools/index.ts \
  packages/cli/src/commands/init/tools/index.test.ts \
  packages/cli/src/commands/tools/install/index.ts \
  packages/cli/src/commands/tools/install/index.test.ts \
  packages/cli/src/commands/tools/shared/auto-sync.ts \
  packages/cli/src/commands/tools/shared/auto-sync.test.ts \
  packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts
git commit -m "fix(p02-t05): honor verified tool pack scope selections"
```

### Task p02-t06: Project evidence through inspection and diagnostics

**Files:**

- Modify: `packages/cli/src/commands/tools/list/list-tools.ts`
- Modify: `packages/cli/src/commands/tools/list/list-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/info/info-tool.ts`
- Modify: `packages/cli/src/commands/tools/info/info-tool.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/format-pack-inventory.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write tests (RED)**

Pin additive `packEvidence` JSON and matching human output for absent,
declared-only, partial, duplicate, provider-unreachable, and unavailable
inventory. Preserve predecessor warning/exit and doctor-check contracts.

**Step 2: Implement (GREEN)**

Render list/info/status/doctor from normalized evidence. Retain legacy top-level
shapes and deprecated placement without reinterpreting it.

**Step 3: Refactor**

Use one structured diagnostic/recovery source with redacted paths.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/list/list-tools.test.ts src/commands/tools/info/info-tool.test.ts src/commands/status/index.test.ts src/commands/doctor/index.test.ts`

Expected: renderer parity and landed fault tolerance pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/tools/list/list-tools.ts \
  packages/cli/src/commands/tools/list/list-tools.test.ts \
  packages/cli/src/commands/tools/info/info-tool.ts \
  packages/cli/src/commands/tools/info/info-tool.test.ts \
  packages/cli/src/commands/tools/shared/format-pack-inventory.ts \
  packages/cli/src/commands/status/index.ts \
  packages/cli/src/commands/status/index.test.ts \
  packages/cli/src/commands/doctor/index.ts \
  packages/cli/src/commands/doctor/index.test.ts
git commit -m "feat(p02-t06): render normalized pack evidence"
```

### Task p02-t07: Extend lifecycle compatibility across update and removal

**Files:**

- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/update/index.test.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/remove/index.ts`
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.ts`
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Modify: `packages/cli/src/e2e/workflow.test.ts`

**Step 1: Write tests (RED)**

Assert optional lifecycle evidence for pack update/remove, unchanged non-pack
shapes, structured partial/error evidence, and identical `--scope user`/
`--scope=user` behavior.

**Step 2: Implement (GREEN)**

Route pack update/remove through the common projector while preserving explicit
removal, existing exit codes, and unrelated tool paths.

**Step 3: Refactor**

Keep adapters thin and centralize status/recovery construction.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/update src/commands/tools/remove src/commands/commands.integration.test.ts src/e2e/workflow.test.ts`

Expected: compatibility and failure-evidence cases pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/tools/update/index.ts \
  packages/cli/src/commands/tools/update/index.test.ts \
  packages/cli/src/commands/tools/update/update-tools.ts \
  packages/cli/src/commands/tools/update/update-tools.test.ts \
  packages/cli/src/commands/tools/remove/index.ts \
  packages/cli/src/commands/tools/remove/remove-tools.ts \
  packages/cli/src/commands/tools/remove/remove-tools.test.ts \
  packages/cli/src/commands/commands.integration.test.ts \
  packages/cli/src/e2e/workflow.test.ts
git commit -m "feat(p02-t07): expose pack lifecycle evidence consistently"
```

**Phase 2 Verification:** Run all p02 focused suites together. Expected:
declared intent never becomes realized placement, unknown scopes fail closed,
and every human/JSON surface agrees.

## Phase 3: Provider Materialization and Restart Truth

**Goal:** Materialize supported user agents for active providers and report
capability, per-asset outcome, and visibility limits separately.

### Task p03-t01: Make user agent scanning capability-aware

**Files:**

- Modify: `packages/cli/src/shared/types.ts`
- Modify: `packages/cli/src/engine/scanner.ts`
- Modify: `packages/cli/src/engine/scanner.test.ts`
- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/compute-plan.test.ts`
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Write tests (RED)**

Cover provider/scope/content filtering for skills, agents, rules, and declared
directories. User agents are scanned only when registry capability requires
them, without duplicate core/extension ownership.

**Step 2: Implement (GREEN)**

Replace the global `user = ['skill']` oracle with caller-supplied capability.
Preserve bounded scanning and install canonical filters.

**Step 3: Refactor**

Keep bundled role scanning separate from general canonical scanning and retain
explicit unsupported rows.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/scanner.test.ts src/engine/compute-plan.test.ts src/commands/sync/index.test.ts`

Expected: user agent planning follows capability without collisions.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/shared/types.ts \
  packages/cli/src/engine/scanner.ts \
  packages/cli/src/engine/scanner.test.ts \
  packages/cli/src/engine/compute-plan.ts \
  packages/cli/src/engine/compute-plan.test.ts \
  packages/cli/src/commands/sync/index.ts \
  packages/cli/src/commands/sync/index.test.ts
git commit -m "feat(p03-t01): scan user agents by provider capability"
```

### Task p03-t02: Return per-operation core sync evidence

**Files:**

- Modify: `packages/cli/src/engine/engine.types.ts`
- Modify: `packages/cli/src/engine/engine.types.test.ts`
- Modify: `packages/cli/src/engine/execute-plan.ts`
- Modify: `packages/cli/src/engine/execute-plan.test.ts`
- Modify: `packages/cli/src/commands/sync/sync.types.ts`
- Modify: `packages/cli/src/commands/sync/apply.ts`
- Modify: `packages/cli/src/commands/sync/dry-run.ts`

**Step 1: Write tests (RED)**

Require each planned entry to report provider/content/asset/action/status and
redacted failure. Compatibility counts must derive from operation results.

**Step 2: Implement (GREEN)**

Extend `SyncResult` and sync reports with per-operation results while retaining
counts and best-effort unrelated-entry behavior.

**Step 3: Refactor**

Separate planned, changed, current, missing, failed, unsupported, and unknown;
a missing manifest row is never visibility evidence.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/engine.types.test.ts src/engine/execute-plan.test.ts src/commands/sync/index.test.ts`

Expected: detailed outcomes and compatibility counts pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/engine/engine.types.ts \
  packages/cli/src/engine/engine.types.test.ts \
  packages/cli/src/engine/execute-plan.ts \
  packages/cli/src/engine/execute-plan.test.ts \
  packages/cli/src/commands/sync/sync.types.ts \
  packages/cli/src/commands/sync/apply.ts \
  packages/cli/src/commands/sync/dry-run.ts
git commit -m "feat(p03-t02): report per-asset core sync outcomes"
```

### Task p03-t03: Return extension evidence and cover managed roles

**Files:**

- Modify: `packages/cli/src/providers/shared/materialization-extension.ts`
- Modify: `packages/cli/src/providers/shared/materialization-extension.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- Modify: `packages/cli/src/providers/cursor/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/cursor/codec/sync-extension.test.ts`
- Modify: `packages/cli/src/providers/claude/adapter.test.ts`
- Modify: `packages/cli/src/engine/engine.integration.test.ts`

**Step 1: Write tests (RED)**

Require extension results per operation. Cover Claude reviewer/implementer
entry sync, Codex/Cursor extension roles, scope isolation, stale cleanup, and
core/extension collision rejection.

**Step 2: Implement (GREEN)**

Extend `MaterializationApplyResult` and project it into provider reachability.
Claude uses its user agent mapping; Codex/Cursor roles remain extension-owned.

**Step 3: Refactor**

Derive the compatibility `user-agent-unmaterialized` summary from richer
provider evidence for one release.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/shared/materialization-extension.test.ts src/providers/codex/codec/sync-extension.test.ts src/providers/cursor/codec/sync-extension.test.ts src/providers/claude/adapter.test.ts src/engine/engine.integration.test.ts`

Expected: managed-role and per-operation outcomes pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/providers/shared/materialization-extension.ts \
  packages/cli/src/providers/shared/materialization-extension.test.ts \
  packages/cli/src/providers/codex/codec/sync-extension.ts \
  packages/cli/src/providers/codex/codec/sync-extension.test.ts \
  packages/cli/src/providers/cursor/codec/sync-extension.ts \
  packages/cli/src/providers/cursor/codec/sync-extension.test.ts \
  packages/cli/src/providers/claude/adapter.test.ts \
  packages/cli/src/engine/engine.integration.test.ts
git commit -m "feat(p03-t03): expose provider role materialization evidence"
```

### Task p03-t04: Support user provider config and truthful inspection

**Files:**

- Modify: `packages/cli/src/commands/providers/providers.types.ts`
- Modify: `packages/cli/src/commands/providers/set/index.ts`
- Modify: `packages/cli/src/commands/providers/set/index.test.ts`
- Modify: `packages/cli/src/commands/providers/list/list.ts`
- Modify: `packages/cli/src/commands/providers/list/list.test.ts`
- Modify: `packages/cli/src/commands/providers/inspect/inspect.ts`
- Modify: `packages/cli/src/commands/providers/inspect/inspect.test.ts`
- Modify: `packages/cli/src/config/user-sync-config.ts`
- Modify: `packages/cli/src/config/user-sync-config.test.ts`

**Step 1: Write tests (RED)**

Replace user-scope rejection with resolved user-config writes. Pin sibling
preservation and list/inspect activation, capability, projection mode,
materialization, visibility, and native-read reporting.

**Step 2: Implement (GREEN)**

Make `providers set --scope user` use the existing user config path/schema.
Generate list/inspect surfaces from the registry, not filtered sync mappings.

**Step 3: Refactor**

Keep detection mismatch and config authority separate; inspection launches no
provider.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/providers src/config/user-sync-config.test.ts`

Expected: user config and complete inspection matrix pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/providers/providers.types.ts \
  packages/cli/src/commands/providers/set/index.ts \
  packages/cli/src/commands/providers/set/index.test.ts \
  packages/cli/src/commands/providers/list/list.ts \
  packages/cli/src/commands/providers/list/list.test.ts \
  packages/cli/src/commands/providers/inspect/inspect.ts \
  packages/cli/src/commands/providers/inspect/inspect.test.ts \
  packages/cli/src/config/user-sync-config.ts \
  packages/cli/src/config/user-sync-config.test.ts
git commit -m "feat(p03-t04): configure and inspect user providers"
```

### Task p03-t05: Add sourced refresh policy and lifecycle advice

**Files:**

- Create: `packages/cli/src/providers/shared/restart-adviser.ts`
- Create: `packages/cli/src/providers/shared/restart-adviser.test.ts`
- Modify: `packages/cli/src/providers/shared/registry.ts`
- Modify: `packages/cli/src/providers/shared/registry.test.ts`
- Modify: `packages/cli/src/commands/sync/apply.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`

**Step 1: Establish evidence and tests (RED)**

Record official-contract, reproducible-local-validation, or repository-decision
provenance with version/date. At least one supported provider must have a
sourced non-`unknown` policy. Cover changed/current/failed/unsupported under
live/manual/restart/unknown policies.

**Step 2: Implement (GREEN)**

Add `adviseProviderRefresh()`. Emit advice only after a successful relevant
current-run change; missing/failed/inactive/unsupported gets layer-specific
recovery.

**Step 3: Refactor**

Keep `visible` observation-only and distinguish `unknown` from `not-reported`.
If no non-unknown policy can be sourced, stop at HiLL review and record the
first-release limitation instead of claiming FR7 delivery.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/shared/restart-adviser.test.ts src/providers/shared/registry.test.ts src/commands/sync/index.test.ts src/commands/init/tools/index.test.ts src/commands/status/index.test.ts src/commands/doctor/index.test.ts
pnpm check
```

Expected: distinct materialization/visibility/restart states pass and the docs
pass repository checks.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/providers/shared/restart-adviser.ts \
  packages/cli/src/providers/shared/restart-adviser.test.ts \
  packages/cli/src/providers/shared/registry.ts \
  packages/cli/src/providers/shared/registry.test.ts \
  packages/cli/src/commands/sync/apply.ts \
  packages/cli/src/commands/sync/index.test.ts \
  packages/cli/src/commands/init/tools/index.ts \
  packages/cli/src/commands/init/tools/index.test.ts \
  packages/cli/src/commands/status/index.ts \
  packages/cli/src/commands/status/index.test.ts \
  packages/cli/src/commands/doctor/index.ts \
  packages/cli/src/commands/doctor/index.test.ts \
  apps/oat-docs/docs/provider-sync/providers.md \
  apps/oat-docs/docs/provider-sync/scope-and-surface.md \
  apps/oat-docs/docs/cli-utilities/tool-packs.md
git commit -m "feat(p03-t05): report sourced provider refresh advice"
```

**Phase 3 Verification:** Run provider/shared, Claude, Codex/Cursor extension,
scanner, executor, engine integration, providers command, and sync suites.
Expected: managed user roles are reachable where supported and unsourced
visibility remains unknown.

## Phase 4: Safe Collection-Directory Aliases

**Goal:** Prefer exact collection aliases under configured `auto` while
preserving unmanaged content and explicit ownership.

### Task p04-t01: Add Manifest V2 collection ownership

**Files:**

- Modify: `packages/cli/src/manifest/manifest.types.ts`
- Modify: `packages/cli/src/manifest/manifest.types.test.ts`
- Modify: `packages/cli/src/manifest/manager.ts`
- Modify: `packages/cli/src/manifest/manager.test.ts`
- Modify: `packages/cli/src/manifest/index.ts`

**Step 1: Write tests (RED)**

Replace V2 rejection with V1 in-memory normalization and V2 round trips.
Validate relative POSIX collection paths, exact references, provider/content/
ancestry consistency, and no overlapping per-entry ownership.

**Step 2: Implement (GREEN)**

Add `ManifestV2`, `ManifestCollectionEntry`, and `strategy: collection`.
Normalize V1 to empty collections; write V2 only after successful apply.

**Step 3: Refactor**

Keep entry identity and atomic full-manifest replacement; collection records
never authorize target deletion.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/manifest/manifest.types.test.ts src/manifest/manager.test.ts`

Expected: V1 compatibility and V2 invariants pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/manifest/manifest.types.ts \
  packages/cli/src/manifest/manifest.types.test.ts \
  packages/cli/src/manifest/manager.ts \
  packages/cli/src/manifest/manager.test.ts \
  packages/cli/src/manifest/index.ts
git commit -m "feat(p04-t01): add collection ownership manifest v2"
```

### Task p04-t02: Prove identity and plan config-auto aliases

**Files:**

- Create: `packages/cli/src/engine/collection-sync.ts`
- Create: `packages/cli/src/engine/collection-sync.test.ts`
- Modify: `packages/cli/src/engine/engine.types.ts`
- Modify: `packages/cli/src/engine/engine.types.test.ts`
- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/compute-plan.test.ts`
- Modify: `packages/cli/src/engine/provider-path-safety.ts`
- Modify: `packages/cli/src/engine/provider-path-safety.test.ts`

**Step 1: Write tests (RED)**

Cover absent, exact relative/absolute alias, real directory, divergence,
broken/cyclic/foreign/nested alias, unsafe ancestry, and unavailable identity.
Configured `auto` retains provenance; explicit configured symlink/copy stay
per-entry.

**Step 2: Implement (GREEN)**

Add `CollectionIdentityProof`, `CollectionProjectionPlan`, and a pre-child
planner. Exact aliases inherit; real/divergent directories fall back unchanged.

**Step 3: Refactor**

Do not relax ordinary ancestry checks; forbid child mutation under inherited
collections.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/collection-sync.test.ts src/engine/compute-plan.test.ts src/engine/provider-path-safety.test.ts`

Expected: proof and strategy-provenance cases pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/engine/collection-sync.ts \
  packages/cli/src/engine/collection-sync.test.ts \
  packages/cli/src/engine/engine.types.ts \
  packages/cli/src/engine/engine.types.test.ts \
  packages/cli/src/engine/compute-plan.ts \
  packages/cli/src/engine/compute-plan.test.ts \
  packages/cli/src/engine/provider-path-safety.ts \
  packages/cli/src/engine/provider-path-safety.test.ts
git commit -m "feat(p04-t02): plan exact collection aliases safely"
```

### Task p04-t03: Apply collection aliases atomically

**Files:**

- Modify: `packages/cli/src/fs/io.ts`
- Modify: `packages/cli/src/fs/io.test.ts`
- Modify: `packages/cli/src/engine/collection-sync.ts`
- Modify: `packages/cli/src/engine/collection-sync.test.ts`
- Modify: `packages/cli/src/engine/execute-plan.ts`
- Modify: `packages/cli/src/engine/execute-plan.test.ts`

**Step 1: Write tests (RED)**

Pin no-clobber final-path creation, `EEXIST` preservation, apply-time identity
recheck, create-rescan-manifest commit, manifest-failure rollback of only an
unchanged new link, rollback failure as partial, and adoption as manifest-only.

**Step 2: Implement (GREEN)**

Add a collection-link primitive with no copy fallback or target removal.
Execute collection groups as one recoverable transaction outside the current
save-after-partial-entry loop.

**Step 3: Refactor**

Retain per-entry best effort for unrelated operations while making collection
ownership atomic.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/fs/io.test.ts src/engine/collection-sync.test.ts src/engine/execute-plan.test.ts`

Expected: every race/failure preserves foreign and canonical content.

**Step 5: Commit**

```bash
git add packages/cli/src/fs/io.ts packages/cli/src/fs/io.test.ts packages/cli/src/engine/collection-sync.ts packages/cli/src/engine/collection-sync.test.ts packages/cli/src/engine/execute-plan.ts packages/cli/src/engine/execute-plan.test.ts
git commit -m "feat(p04-t03): apply collection aliases atomically"
```

### Task p04-t04: Reconcile collection drift and disablement

**Files:**

- Modify: `packages/cli/src/drift/detector.ts`
- Modify: `packages/cli/src/drift/detector.test.ts`
- Modify: `packages/cli/src/drift/strays.ts`
- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/compute-plan.test.ts`
- Modify: `packages/cli/src/commands/remove/skill/remove-skill.ts`
- Modify: `packages/cli/src/commands/remove/skill/remove-skill.test.ts`
- Modify: `packages/cli/src/engine/engine.integration.test.ts`

**Step 1: Write tests (RED)**

Cover canonical add/remove, repeated no-op, provider disablement, changed owned
alias, and adopted alias. Adopted-exact disable removes only its record;
unchanged OAT-created disable unlinks only the alias; changed/unverifiable
links are preserved/detached. Never delete through the alias.

**Step 2: Implement (GREEN)**

Make drift/removal collection-aware and reconcile inherited entries without
provider child operations.

**Step 3: Refactor**

Keep per-entry drift for real-directory fallback and summarize collection state
without treating it as copy mode.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/drift/detector.test.ts src/engine/compute-plan.test.ts src/commands/remove/skill/remove-skill.test.ts src/engine/engine.integration.test.ts`

Expected: deterministic ownership and zero canonical/unmanaged loss.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/drift/detector.ts \
  packages/cli/src/drift/detector.test.ts \
  packages/cli/src/drift/strays.ts \
  packages/cli/src/engine/compute-plan.ts \
  packages/cli/src/engine/compute-plan.test.ts \
  packages/cli/src/commands/remove/skill/remove-skill.ts \
  packages/cli/src/commands/remove/skill/remove-skill.test.ts \
  packages/cli/src/engine/engine.integration.test.ts
git commit -m "feat(p04-t04): reconcile collection ownership safely"
```

### Task p04-t05: Render and document collection lifecycle

**Files:**

- Modify: `packages/cli/src/commands/sync/sync.types.ts`
- Modify: `packages/cli/src/commands/sync/sync.utils.ts`
- Modify: `packages/cli/src/commands/sync/apply.ts`
- Modify: `packages/cli/src/commands/sync/dry-run.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/providers/list/list.ts`
- Modify: `packages/cli/src/commands/providers/list/list.test.ts`
- Modify: `packages/cli/src/commands/providers/inspect/inspect.ts`
- Modify: `packages/cli/src/commands/providers/inspect/inspect.test.ts`
- Modify: `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
- Modify: `apps/oat-docs/docs/provider-sync/commands.md`
- Modify: `apps/oat-docs/docs/provider-sync/config.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`

**Step 1: Write tests (RED)**

Require dry-run/apply parity, collection action/reason/ownership, real-directory
fallback, and inspection summaries. Confirm help still has no `--strategy`.

**Step 2: Implement (GREEN)**

Thread collection plans/results through JSON/human output. Document configured
auto preference, explicit per-entry modes, adoption, atomicity, and recovery.

**Step 3: Refactor**

Redact scope roots and reuse structured reasons.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/commands/providers/list/list.test.ts src/commands/providers/inspect/inspect.test.ts src/commands/help-snapshots.test.ts
pnpm check
```

Expected: apply/dry-run/docs agree and the docs pass repository checks.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/sync/sync.types.ts \
  packages/cli/src/commands/sync/sync.utils.ts \
  packages/cli/src/commands/sync/apply.ts \
  packages/cli/src/commands/sync/dry-run.ts \
  packages/cli/src/commands/sync/index.test.ts \
  packages/cli/src/commands/providers/list/list.ts \
  packages/cli/src/commands/providers/list/list.test.ts \
  packages/cli/src/commands/providers/inspect/inspect.ts \
  packages/cli/src/commands/providers/inspect/inspect.test.ts \
  apps/oat-docs/docs/provider-sync/manifest-and-drift.md \
  apps/oat-docs/docs/provider-sync/commands.md \
  apps/oat-docs/docs/provider-sync/config.md \
  apps/oat-docs/docs/reference/oat-directory-structure.md
git commit -m "feat(p04-t05): expose collection alias lifecycle"
```

**Phase 4 Verification:** Run manifest, filesystem, engine, drift, sync,
removal, and provider focused suites. Expected: exact aliases are low-churn,
divergent content remains untouched, and collection writes are atomic.

## Phase 5: Independent Project AGENTS.md Guidance

**Goal:** Offer one explicit, idempotent repository-guidance choice independent
of pack scope and PJM adoption.

### Task p05-t01: Harden shared AGENTS.md section mutation

**Files:**

- Modify: `packages/cli/src/commands/shared/agents-md.ts`
- Modify: `packages/cli/src/commands/shared/agents-md.test.ts`
- Modify: `packages/cli/src/commands/docs/init/index.test.ts`
- Modify: `packages/cli/src/commands/pjm/init.test.ts`
- Modify: `packages/cli/src/commands/decision/agents-guidance.test.ts`

**Step 1: Write tests (RED)**

Cover contained relative/absolute symlinks, external/broken/cyclic/directory
targets, identity swaps, malformed/duplicate markers, atomic-write failure,
and preservation of unrelated/PJM/decision sections.

**Step 2: Implement (GREEN)**

Plan/revalidate root `AGENTS.md`, follow only a contained unchanged symlink to
a regular file, require one ordered marker pair, and write atomically.

**Step 3: Refactor**

Apply the safety improvement globally to shared-helper consumers while
preserving their independent section/adoption semantics.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/agents-md.test.ts src/commands/docs/init/index.test.ts src/commands/pjm/init.test.ts src/commands/decision/agents-guidance.test.ts`

Expected: safe path/marker behavior and existing consumers pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/shared/agents-md.ts packages/cli/src/commands/shared/agents-md.test.ts packages/cli/src/commands/docs/init/index.test.ts packages/cli/src/commands/pjm/init.test.ts packages/cli/src/commands/decision/agents-guidance.test.ts
git commit -m "fix(p05-t01): harden managed agents guidance writes"
```

### Task p05-t02: Add the shared project guidance planner and flags

**Files:**

- Create: `packages/cli/src/commands/init/tools/project-guidance.ts`
- Create: `packages/cli/src/commands/init/tools/project-guidance.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/tools/install/index.ts`
- Modify: `packages/cli/src/commands/tools/install/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write tests (RED)**

Pin `--project-guidance`/`--no-project-guidance`, conflict rejection,
prompt-once/default-decline, noninteractive notice, and zero scope/PJM
mutation. Build content from complete realized pack evidence, not the current
request alone.

**Step 2: Implement (GREEN)**

Add `ProjectGuidanceChoice`, `AgentsGuidancePlan`,
`planProjectGuidance()`, and shared flag propagation.

**Step 3: Refactor**

Remove automatic project-placement writes. Remove legacy `OAT workflows` only
inside an accepted guidance update.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/project-guidance.test.ts src/commands/init/tools/index.test.ts src/commands/init/index.test.ts src/commands/tools/install/index.test.ts src/commands/help-snapshots.test.ts`

Expected: one choice contract drives every entry point; defaults are zero-write.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/init/tools/project-guidance.ts \
  packages/cli/src/commands/init/tools/project-guidance.test.ts \
  packages/cli/src/commands/init/tools/index.ts \
  packages/cli/src/commands/init/tools/index.test.ts \
  packages/cli/src/commands/init/index.ts \
  packages/cli/src/commands/init/index.test.ts \
  packages/cli/src/commands/tools/install/index.ts \
  packages/cli/src/commands/tools/install/index.test.ts \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p05-t02): plan explicit project guidance"
```

### Task p05-t03: Apply guidance through aggregate and guided init

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/init/guided-setup.test.ts`
- Modify: `packages/cli/src/e2e/workflow.test.ts`

**Step 1: Write tests (RED)**

Cover user/project installs, accept/decline, missing/existing/contained symlink
files, repeated runs, complete pack section content, unrelated content, and no
duplicate prompt/section.

**Step 2: Implement (GREEN)**

Apply the `tools` section only after acceptance. Report guidance beside—not
inside—pack lifecycle and PJM evidence.

**Step 3: Refactor**

Capability installation stays successful when guidance is declined; unsafe
guidance becomes a separate blocked outcome.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/init/guided-setup.test.ts src/e2e/workflow.test.ts`

Expected: aggregate/guided paths converge on one section without scope/adoption
changes.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/init/guided-setup.test.ts packages/cli/src/e2e/workflow.test.ts
git commit -m "feat(p05-t03): apply opted-in project guidance"
```

### Task p05-t04: Apply standalone workflows guidance and document boundaries

**Files:**

- Modify: `packages/cli/src/commands/init/tools/workflows/index.ts`
- Modify: `packages/cli/src/commands/init/tools/workflows/index.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/bootstrap.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`

**Step 1: Write tests (RED)**

Cover standalone user/project workflows with accept, decline, explicit flags,
noninteractive notice, repeated update, and preservation of other realized
packs in the shared section.

**Step 2: Implement (GREEN)**

Reuse the planner/apply path after workflows installation. Guidance does not
change capability scope.

**Step 3: Refactor**

Document capability placement, repository guidance, and PJM adoption as three
independent decisions.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/workflows/index.test.ts src/commands/init/tools/project-guidance.test.ts
pnpm check
```

Expected: standalone parity passes and the docs pass repository checks.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/init/tools/workflows/index.ts \
  packages/cli/src/commands/init/tools/workflows/index.test.ts \
  apps/oat-docs/docs/cli-utilities/bootstrap.md \
  apps/oat-docs/docs/cli-utilities/tool-packs.md
git commit -m "feat(p05-t04): ship independent project guidance"
```

**Phase 5 Verification:** AGENTS helper, init, guided setup, standalone
workflows, tools install, help, and e2e suites pass. Decline/noninteractive
default performs zero writes.

## Phase 6: Native Dispatch and Fallback Provenance

**Goal:** Persist one generic dispatch record plus namespaced OAT role/fallback
evidence without changing native selection authority.

### Task p06-t01: Extract the exact canonical role resolver

**Files:**

- Create: `packages/cli/src/agents/canonical/resolve.ts`
- Create: `packages/cli/src/agents/canonical/resolve.test.ts`
- Modify: `packages/cli/src/agents/canonical/index.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Step 1: Write tests (RED)**

Move PR #242 cases from test-local helpers: loaded/user/project order, direct
unsuffixed Markdown or exact canonical symlink, candidate misses, redacted
path, version/digest, and per-dependency fail closed.

**Step 2: Implement (GREEN)**

Return `CanonicalRoleEvidence` without role content.

**Step 3: Refactor**

Retain bundled-contract tests as an integration consumer, not a second
resolver.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/agents/canonical/resolve.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

Expected: exact identity/root-order cases pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/agents/canonical/resolve.ts \
  packages/cli/src/agents/canonical/resolve.test.ts \
  packages/cli/src/agents/canonical/index.ts \
  packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
git commit -m "feat(p06-t01): expose exact canonical role resolution"
```

### Task p06-t02: Validate generic and namespaced dispatch records

**Files:**

- Create: `packages/cli/src/providers/identity/generic-dispatch-record.ts`
- Create: `packages/cli/src/providers/identity/generic-dispatch-record.test.ts`
- Create: `packages/cli/src/providers/identity/oat-dispatch-record.ts`
- Create: `packages/cli/src/providers/identity/oat-dispatch-record.test.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.test.ts`

**Step 1: Write tests (RED)**

Translate the neutral schema without renaming fields. Test strict `oat` events,
immutable generic fields, stable IDs, one fallback per trigger,
blocked-before-start plus `provesNoChildStarted`, preserved controls,
approximation labeling, and sensitive-content rejection.

**Step 2: Implement (GREEN)**

Add Zod/TypeScript records and `augmentDispatchRecord()`. Fallback is a fresh
generic record linked to the rejected native record.

**Step 3: Refactor**

Keep `DispatchReportV1` and the `Dispatch:` stamp byte-shape unchanged.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/generic-dispatch-record.test.ts src/providers/identity/oat-dispatch-record.test.ts src/providers/identity/dispatch-report.test.ts`

Expected: legal transitions pass; all post-acceptance replacement fails.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/providers/identity/generic-dispatch-record.ts \
  packages/cli/src/providers/identity/generic-dispatch-record.test.ts \
  packages/cli/src/providers/identity/oat-dispatch-record.ts \
  packages/cli/src/providers/identity/oat-dispatch-record.test.ts \
  packages/cli/src/providers/identity/dispatch-report.test.ts
git commit -m "feat(p06-t02): validate namespaced dispatch provenance"
```

### Task p06-t03: Persist project dispatch records

**Files:**

- Create: `packages/cli/src/commands/project/dispatch/index.ts`
- Create: `packages/cli/src/commands/project/dispatch/record.ts`
- Create: `packages/cli/src/commands/project/dispatch/record.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/fs/io.ts`
- Modify: `packages/cli/src/fs/io.test.ts`

**Step 1: Write tests (RED)**

Cover `project dispatch record`, project scope, request-ID containment, atomic
create/update, prior-record preservation, nonproject no-persistence, stdin,
and sensitive-content rejection.

**Step 2: Implement (GREEN)**

Persist one complete generic record plus `oat` augmentation at
`dispatch/<request-id>.json`. Validate only; never launch a provider.

**Step 3: Refactor**

Reuse atomic JSON replacement with stricter journal containment/redaction.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch/record.test.ts src/commands/help-snapshots.test.ts src/fs/io.test.ts`

Expected: CLI, atomicity, and validation cases pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/project/dispatch/index.ts \
  packages/cli/src/commands/project/dispatch/record.ts \
  packages/cli/src/commands/project/dispatch/record.test.ts \
  packages/cli/src/commands/project/index.ts \
  packages/cli/src/commands/help-snapshots.test.ts \
  packages/cli/src/fs/io.ts \
  packages/cli/src/fs/io.test.ts
git commit -m "feat(p06-t03): persist project dispatch records"
```

### Task p06-t04: Instrument native-first dispatch protocols

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-project-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `apps/oat-docs/docs/workflows/projects/evidence-layers.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/orchestration-model.md`
- Modify: `apps/oat-docs/docs/provider-sync/scope-and-surface.md`

**Step 1: Write contract tests (RED)**

Require construction/redaction before the native call, immediate accepted or
rejected-before-start attestation, exact controls, one qualifying fallback,
and no fallback after timeout/BLOCKED/refusal/runtime mismatch.

**Step 2: Implement (GREEN)**

Update central dispatch protocols and dependent lifecycle instructions to
record around host-owned native launch. Gate receipts remain out of scope.

**Step 3: Refactor**

Bump every changed `SKILL.md` version once. Keep smoke projection separate.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts
pnpm test:skills
pnpm oat:validate-skills
pnpm lint
pnpm format
```

Expected: native-first exact-pin/record contracts and skill gates pass.

**Step 5: Commit**

```bash
git add -- \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-project-dispatch-subagents/SKILL.md \
  .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md \
  .agents/skills/oat-project-review-provide/SKILL.md \
  .agents/skills/oat-project-review-provide-remote/SKILL.md \
  .agents/skills/oat-project-plan-writing/SKILL.md \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts \
  apps/oat-docs/docs/workflows/projects/evidence-layers.md \
  apps/oat-docs/docs/workflows/projects/implementation-execution.md \
  apps/oat-docs/docs/workflows/projects/orchestration-model.md \
  apps/oat-docs/docs/provider-sync/scope-and-surface.md
git commit -m "feat(p06-t04): attest native dispatch lineage"
```

**Phase 6 Verification:** Resolver, generic/OAT record, recorder, dispatch
report/stamp, dispatch-ceiling, help, bundled-skill, and validation suites pass.
Accepted native launch closes replacement; only proven pre-start rejection
permits one exact-target approximation.

## Phase 7: Runtime Observation and Integrated Release

**Goal:** Add optional metadata-only corroboration, close owned backlogs, and
pass every release gate at one reviewed head.

### Task p07-t01: Parse Codex runtime identity metadata

**Files:**

- Create: `packages/cli/src/providers/identity/codex-runtime-observation.ts`
- Create: `packages/cli/src/providers/identity/codex-runtime-observation.test.ts`
- Modify: `packages/cli/src/providers/identity/oat-dispatch-record.ts`
- Modify: `packages/cli/src/providers/identity/oat-dispatch-record.test.ts`

**Step 1: Write tests (RED)**

Use metadata-only root/depth-1/depth-2/fork-free/forked fixtures. Extract the
applicable child lineage, role, model, effort, and service tier without reading
conversation content.

**Step 2: Implement (GREEN)**

Add a bounded parser producing source-qualified matching/mismatching/missing/
not-comparable observation for the named request.

**Step 3: Refactor**

Observations are per-run and non-authoritative; parse failure never copies
requested values.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/codex-runtime-observation.test.ts src/providers/identity/oat-dispatch-record.test.ts`

Expected: lineage/correlation fixtures pass without content leakage.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity/codex-runtime-observation.ts packages/cli/src/providers/identity/codex-runtime-observation.test.ts packages/cli/src/providers/identity/oat-dispatch-record.ts packages/cli/src/providers/identity/oat-dispatch-record.test.ts
git commit -m "feat(p07-t01): parse codex runtime identity evidence"
```

### Task p07-t02: Parse Claude metadata and preserve Cursor not-reported

**Files:**

- Create: `packages/cli/src/providers/identity/claude-runtime-observation.ts`
- Create: `packages/cli/src/providers/identity/claude-runtime-observation.test.ts`
- Create: `packages/cli/src/providers/identity/runtime-observation.ts`
- Create: `packages/cli/src/providers/identity/runtime-observation.test.ts`
- Modify: `packages/cli/src/providers/identity/oat-dispatch-record.ts`
- Modify: `packages/cli/src/providers/identity/oat-dispatch-record.test.ts`

**Step 1: Write tests (RED)**

Cover Claude model/effort/service tier, `not-exposed` effort, missing/mismatch,
and Cursor `not-reported`. Requested arguments/materialized pins never become
observations.

**Step 2: Implement (GREEN)**

Add provider parsing and one normalizer comparing observed metadata with
immutable configured invocation without changing launch/fallback.

**Step 3: Refactor**

Reject prompts, messages, credentials, and transcript bodies at the schema
boundary.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/claude-runtime-observation.test.ts src/providers/identity/runtime-observation.test.ts src/providers/identity/oat-dispatch-record.test.ts`

Expected: Claude/Cursor provenance and no-replacement cases pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/providers/identity/claude-runtime-observation.ts \
  packages/cli/src/providers/identity/claude-runtime-observation.test.ts \
  packages/cli/src/providers/identity/runtime-observation.ts \
  packages/cli/src/providers/identity/runtime-observation.test.ts \
  packages/cli/src/providers/identity/oat-dispatch-record.ts \
  packages/cli/src/providers/identity/oat-dispatch-record.test.ts
git commit -m "feat(p07-t02): normalize provider runtime observations"
```

### Task p07-t03: Integrate observation and cross-child reporting

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch/record.ts`
- Modify: `packages/cli/src/commands/project/dispatch/record.test.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Modify: `packages/cli/src/e2e/workflow.test.ts`
- Modify: `tools/smoke/evidence/collect.mjs`
- Modify: `tools/smoke/evidence/collect.test.mjs`
- Modify: `tools/smoke/CONTRACT.md`
- Modify: `apps/oat-docs/docs/workflows/projects/evidence-layers.md`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Write tests (RED)**

Cover matching/mismatching/missing/not-reported through the recorder with
unchanged configured invocation/launch state. Prove static inspection launches
no provider and smoke remains a projection.

**Step 2: Implement (GREEN)**

Accept sanitized post-launch events under `oat` and render configured versus
observed evidence distinctly.

**Step 3: Refactor**

Observation stays optional/capability-gated; P0 correctness never depends on
transcript availability.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/dispatch/record.test.ts \
  src/providers/identity/dispatch-report.test.ts \
  src/commands/commands.integration.test.ts \
  src/e2e/workflow.test.ts
pnpm test:smoke
pnpm lint
pnpm format
```

Expected: observation is corroborative only; smoke/schema contracts pass.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/src/commands/project/dispatch/record.ts \
  packages/cli/src/commands/project/dispatch/record.test.ts \
  packages/cli/src/providers/identity/dispatch-report.test.ts \
  packages/cli/src/commands/commands.integration.test.ts \
  packages/cli/src/e2e/workflow.test.ts \
  tools/smoke/evidence/collect.mjs \
  tools/smoke/evidence/collect.test.mjs \
  tools/smoke/CONTRACT.md \
  apps/oat-docs/docs/workflows/projects/evidence-layers.md \
  apps/oat-docs/docs/provider-sync/providers.md \
  apps/oat-docs/docs/reference/cli-reference.md
git commit -m "feat(p07-t03): report runtime identity observations"
```

### Task p07-t04: Close backlogs, advance versions, and run release gates

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Move: `.oat/repo/pjm/backlog/items/BL-260829-make-tool-pack-scope-selection.md` to `.oat/repo/pjm/backlog/archived/BL-260829-make-tool-pack-scope-selection.md`
- Move: `.oat/repo/pjm/backlog/items/BL-260724-support-provider-directory.md` to `.oat/repo/pjm/backlog/archived/BL-260724-support-provider-directory.md`
- Move: `.oat/repo/pjm/backlog/items/BL-260828-add-project-level-oat-guidance.md` to `.oat/repo/pjm/backlog/archived/BL-260828-add-project-level-oat-guidance.md`
- Move: `.oat/repo/pjm/backlog/items/BL-260826-populate-native-subagent.md` to `.oat/repo/pjm/backlog/archived/BL-260826-populate-native-subagent.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Modify: `.oat/repo/pjm/backlog/index.md`
- Modify: `.oat/projects/shared/tool-pack-scope-provider-truthfulness/implementation.md`

**Step 1: Establish the release floor**

Fetch `origin/main`, run `pnpm release:check-versions`, and choose one lockstep
patch greater than every current public version. The accepted p01 baseline is
`0.2.50`; do not assume the next patch remains available at release time.

**Step 2: Archive only accepted owned items**

Run `oat backlog archive <id> --summary ...` for the four owned items after
their criteria pass. Do not archive `BL-260827-correct-scope-and-adoption` or
`BL-260829-unified-agent-provider-root` here.

**Step 3: Run evidence-grade tests**

```bash
OAT_TEST_HOME=$(mktemp -d)
HOME="$OAT_TEST_HOME" pnpm exec turbo run test --force
pnpm test:smoke
pnpm test:skills
pnpm test:release
pnpm oat:validate-skills
```

Expected: feature, smoke, skill, release, and validation suites pass.

**Step 4: Run CI gates separately with explicit exit codes**

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `git fetch origin main && pnpm release:check-versions`
7. `pnpm release:validate`
8. `pnpm build:docs`

Run `git diff --check && git status --short` and record every command's own
exit code in `implementation.md`.

**Step 5: Commit**

```bash
git add -- \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .oat/repo/pjm/backlog/items/BL-260829-make-tool-pack-scope-selection.md \
  .oat/repo/pjm/backlog/archived/BL-260829-make-tool-pack-scope-selection.md \
  .oat/repo/pjm/backlog/items/BL-260724-support-provider-directory.md \
  .oat/repo/pjm/backlog/archived/BL-260724-support-provider-directory.md \
  .oat/repo/pjm/backlog/items/BL-260828-add-project-level-oat-guidance.md \
  .oat/repo/pjm/backlog/archived/BL-260828-add-project-level-oat-guidance.md \
  .oat/repo/pjm/backlog/items/BL-260826-populate-native-subagent.md \
  .oat/repo/pjm/backlog/archived/BL-260826-populate-native-subagent.md \
  .oat/repo/pjm/backlog/completed.md \
  .oat/repo/pjm/backlog/index.md \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/implementation.md
git commit -m "chore(p07-t04): release truthful tool pack state"
```

**Phase 7 Verification:** Runtime observations remain non-authoritative, every
acceptance suite passes, four owned items are archived once, and all eight
gates exit 0 at the final reviewed head.

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      | Reviewed Head                            | Invocation | Gate Target |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| p01    | code     | passed          | 2026-08-31 | reviews/p01-review-2026-08-31T115349Z.md                      | 940e87e5663bb6c36d8f7d7bfbb6db67d482b3e8 | manual     | -           |
| p02    | code     | fixes_completed | 2026-08-31 | reviews/p02-review-2026-08-31T132646Z.md                      | 23efb17c732c2a95fbe38eae2be4c48f78754932 | manual     | -           |
| p02    | code     | fixes_completed | 2026-08-31 | reviews/p02-review-2026-08-31T142211Z.md                      | d959cb12caadf9587a271a3757f7d917a5b674bc | manual     | -           |
| p02    | code     | fixes_completed | 2026-08-31 | reviews/p02-review-2026-08-31T144935Z.md                      | 9d557564faa2430001483ed823a07d2cc920a3c1 | manual     | -           |
| p02    | code     | fixes_completed | 2026-08-31 | reviews/p02-review-2026-08-31T155718Z.md                      | e85ba38ae575e193a7084f1046798ca0827f6bef | manual     | -           |
| p02    | code     | fixes_completed | 2026-08-31 | reviews/p02-review-2026-08-31T164057Z.md                      | 4e1cbac86f3f0bb5acefe446d8df8c81df3f025f | manual     | -           |
| p02    | code     | passed          | 2026-08-31 | reviews/p02-review-2026-08-31T170932Z.md                      | eb218a7a2463e580e1ddb8c0bed5b9998d25e0ab | manual     | -           |
| p03    | code     | pending         | -          | -                                                             | -                                        | -          | -           |
| p04    | code     | pending         | -          | -                                                             | -                                        | -          | -           |
| p05    | code     | pending         | -          | -                                                             | -                                        | -          | -           |
| p06    | code     | pending         | -          | -                                                             | -                                        | -          | -           |
| p07    | code     | pending         | -          | -                                                             | -                                        | -          | -           |
| final  | code     | pending         | -          | -                                                             | -                                        | -          | -           |
| spec   | artifact | pending         | -          | -                                                             | -                                        | -          | -           |
| design | artifact | fixes_completed | 2026-08-30 | reviews/archived/artifact-design-review-2026-08-30T221537Z.md | -                                        | -          | -           |
| plan   | artifact | passed          | 2026-08-30 | reviews/archived/artifact-plan-review-2026-08-30T231629Z.md   | -                                        | -          | -           |
| plan   | artifact | passed          | 2026-08-31 | reviews/archived/artifact-plan-review-2026-08-31T003934Z.md   | -                                        | -          | -           |

The design review findings were resolved directly in `design.md`. Thomas
approved planning without another design re-review, so that event remains
`fixes_completed`, not relabeled `passed`.

The first plan review's five findings were resolved directly in `plan.md`. A
managed High structured re-review then found and corrected exact staging
boundaries; its clean retry advanced the event to `passed`.

The configured Fable gate passed with two minor alignment findings. The design
predecessor observation and p02-t02 provider-proof assertion were aligned
directly, so the received gate event is `passed` with no new tasks.

Status progression: `pending` -> `received` -> `fixes_added` ->
`fixes_completed` -> `passed`.

## Implementation Complete

**Planned Summary:**

- Phase 1: 1 task - accepted diagnostics baseline
- Phase 2: 7 tasks - shared evidence and truthful scope
- Phase 3: 5 tasks - provider materialization and restart truth
- Phase 4: 5 tasks - safe collection-directory aliases
- Phase 5: 4 tasks - independent project AGENTS.md guidance
- Phase 6: 4 tasks - native dispatch and fallback provenance
- Phase 7: 4 tasks - runtime observation and integrated release

**Total: 30 tasks**

Implementation is in progress: p01 is complete and independently reviewed, and
p02 is next. Completion requires all remaining tasks, phase/final code reviews,
owned backlog closeout, and the complete repository gate sequence.

## References

- Design: `design.md`
- Specification: `spec.md`
- Discovery: `discovery.md`
- Diagnostics predecessor: PR #249,
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` (accepted and landed)
- Backlog: `BL-260829-make-tool-pack-scope-selection`
- Child: `BL-260724-support-provider-directory`
- Child: `BL-260828-add-project-level-oat-guidance`
- Child: `BL-260826-populate-native-subagent`
- PR #227: `a3ac2a01982c02e8690d5016912917b7bf3307b7`
- PR #240: `cd07d72e51eaa3c50660612186a54550067d20e5`
- PR #242: `ce7c3225da52508a123849cdd549f449651a5770`
- Generic dispatch record: `.agents/skills/oat-dispatch-subagents/references/record-schema.md`
- Repository knowledge: `.oat/repo/knowledge/conventions.md`,
  `.oat/repo/knowledge/testing.md`, `.oat/repo/knowledge/stack.md`
