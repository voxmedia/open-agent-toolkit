---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260903-populate-provider-reachability.md
oat_external_plan_commit: dd41adb9bed53aa2389e911b601615fc2b26f0b7
oat_external_plan_date: '2026-09-03'
oat_execution_status: READY
oat_backlog_items:
  - BL-260903-populate-provider-reachability
oat_issue_url: null
created: '2026-09-03T22:30:00Z'
---

# Populate provider reachability evidence across pack and lifecycle surfaces

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. This is the
> known gap PR #255 recorded openly: the reachability type exists and every
> production path hard-codes `providers: []`. Execute this before
> `BL-260903-retire-deprecated-pack`, which shrinks once the six dead
> diagnostic codes have emitters.

## Outcome

Every pack lifecycle outcome (install, update, remove, and the aggregate
init path) and every pack inventory surface (`oat tools list`, `oat tools
info`, `oat status`, `oat pjm doctor`) carries populated
`ProviderReachabilityEvidence` per provider, derived from the same
config-aware registry the sync engine uses: activation, content capability,
projection outcome, materialization outcome, catalog-refresh policy, and
recovery guidance. The six diagnostic codes that have no emitter today gain
emitters. Human output names the provider; JSON carries the structured
evidence. `oat tools list` and `oat tools info` stop reporting
unmaterialized user agents when an active Codex or Cursor adapter supplies
managed roles.

## Source and live evidence

- Source backlog item:
  [BL-260903-populate-provider-reachability — Populate provider reachability evidence across pack and lifecycle surfaces](../../pjm/backlog/items/BL-260903-populate-provider-reachability.md)
- Planned at: `origin/main` commit `dd41adb9bed53aa2389e911b601615fc2b26f0b7` on `2026-09-03`.
- Verified evidence:
  - `packages/cli/src/commands/tools/shared/pack-evidence.ts:64-70` —
    `ProviderReachabilityEvidence` is `{ provider, scope, contentKind,
assets }` plus an index signature; none of the design's activation,
    capability, projection, materialization, visibility, or recovery fields
    are required.
  - `pack-evidence.ts:218-245` — `projectPackEvidence()` emits
    `input.providers ?? []` (`:243`); no production caller passes
    `providers` (`init/tools/index.ts:329,460,1713`,
    `update/update-tools.ts:413`, `remove/remove-tools.ts:450`,
    `format-pack-inventory.ts:42,92`).
  - `pack-evidence.ts:40-52` — eleven diagnostic codes; only
    `provider-materialization-missing` is emitted
    (`format-pack-inventory.ts:101`) and it names no provider.
  - Hard-coded `providers: []` at successful-outcome construction:
    `init/tools/index.ts:1584,1638,1860`, `update/index.ts:386`,
    `remove/index.ts:353,363`, plus `not-run` defaults in
    `update-tools.ts:445,454,478`, `remove-tools.ts:601,627,670`,
    `init/tools/index.ts:1166,1828,1978`.
  - `auto-sync.ts:5-12` and `install/index.ts:23-43` — auto-sync spawns
    `oat sync` and discards stdout, dropping the evidence that
    `sync/apply.ts:480-493` already emits (`operationResults`,
    `materializationExtensions`, `codexExtensions`,
    `providerRefreshAdvice`).
  - Already available inputs: `providers/shared/registry.ts:39-48`
    (`ProviderContentCapability`), `:56-67` (`ProviderActivationEvidence`),
    `:24-37` (`ProviderCatalogRefreshPolicy`), `:320`
    (`resolveProviderScopeContext`), `:157-177`
    (`userAgentMaterializationCoverage`).
  - `list/list-tools.ts:65-73` and `info/info-tool.ts:76-81` call
    `inventoryPack` without `userManagedRoleMaterialization`, unlike
    `status/index.ts:720` and `doctor/index.ts:1155`; a second live defect.
  - `pack-lifecycle-outcome.ts:72-87` —
    `providerSyncOutcomeFromAutoSync(result, providers = [])` already
    accepts providers; wire it, do not add a parallel path.
- Constraining decisions:
  [DR-260831-provider-aware-reachability](../decisions/DR-260831-provider-aware-reachability.md)
  (derive reachability from the config-aware adapters sync uses; never from
  filesystem presence; Claude-only must not produce false managed-role
  reachability),
  [DR-260831-diagnostic-inventory-failures](../decisions/DR-260831-diagnostic-inventory-failures.md)
  (unavailable is structured data rendered by both doctor and status).

## Dependencies

| Type          | Dependency                                                                                                                | Required state                                                                          | Current state |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------- |
| Satisfied     | PR #255 `tool-pack-scope-provider-truthfulness`                                                                           | Registry, evidence types, and sync JSON evidence exist on main.                         | Merged.       |
| Soft ordering | `BL-260903-retire-deprecated-pack` (unplanned)                                                                            | Run after this plan; it removes deprecated placement and then finds no dead codes left. | Open.         |
| Soft boundary | [Warn on non-sync manifest restamps](./2026-08-30-warn-on-non-sync-manifest-restamps.md) (W4) owns `sync/apply.ts` output | Consume the sync JSON; do not reshape it.                                               | Pending (W4). |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                         | Affected | Files in common | Required update |
| --------------------------------------------- | -------- | --------------- | --------------- |
| `review-plan-workflow` (draft PR #190) merges | No       | None.           | None.           |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat dd41adb9bed53aa2389e911b601615fc2b26f0b7..origin/main -- packages/cli/src/commands/tools packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/status/index.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/sync/apply.ts packages/cli/src/providers/shared/registry.ts apps/oat-docs/docs/cli-utilities/tool-packs.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If `pack-evidence.ts`, `registry.ts`, or the sync JSON payload changed shape,
re-anchor before editing. A new production caller passing `providers` means
part of this outcome landed; refresh rather than duplicate.

## Repository conventions

- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/tools src/commands/init/tools src/commands/status src/commands/doctor`.
- Lint/format/docs: `pnpm check` → passes.
- Implementation pattern: `providerSyncOutcomeFromAutoSync` for outcome
  wiring; `projectRenderablePackEvidence` as the one rendering seam.
- Git/PR convention: shipped CLI behavior; five-package lockstep bump above
  `0.2.53`; do not push or open a PR unless instructed.

## Scope

### In scope

- `pack-evidence.ts` — close the interface to required fields; add
  `providerDiagnostics()` emitting the six dead codes.
- New `provider-reachability.ts` mapper and test.
- `auto-sync.ts` — return structured sync evidence (prefer an in-process
  sync service over parsing spawned `--json` output); thread through
  `providerSyncOutcomeFromAutoSync`.
- `install/index.ts`, `update/index.ts`, `update-tools.ts`,
  `remove/index.ts`, `remove-tools.ts`, `init/tools/index.ts` — replace
  every production `providers: []`.
- `format-pack-inventory.ts` — provider context parameter and a provider
  line in the human renderer; `list-tools.ts`, `info-tool.ts` — pass
  `userManagedRoleMaterialization`; `status/index.ts`, `doctor/index.ts`
  — thread the context.
- Tests named in the test plan; docs
  `apps/oat-docs/docs/cli-utilities/tool-packs.md:282-308` (section
  "User-scope agent projection is provider-capability driven"; PR #248 added
  pack-dependency sections above it).
- Five public package manifests.

### Out of scope

- `registry.ts` — read-only source unless a capability field is missing.
- `sync/apply.ts` JSON shape — owned by the W4 restamp plan; consume only.
- `pack-inventory.ts:63-64` deprecated `placement` — owned by
  `BL-260903-retire-deprecated-pack`.
- `pack-manifest.ts` — owned by the skill-script validation plan.

## Current state

The evidence model is layered and typed, but the provider layer is a
permissive interface nobody fills. The registry already resolves activation,
capability, and refresh policy per provider and scope, and the sync engine
already emits per-operation results as JSON. The auto-sync seam throws that
JSON away, so lifecycle outcomes are constructed with an empty provider
array and inventory renderers have no provider context. Emitting new
diagnostic codes will flip `packEvidenceBlock` from `ok` to `partial`
(`format-pack-inventory.ts:131`) and can change the install exit code
(`init/tools/index.ts:1605-1610`), so severity assignment is load-bearing.

## Implementation steps

### 1. Close the type and add provider diagnostics

Make activation, capability, projection, materialization, visibility, and
recovery fields required on `ProviderReachabilityEvidence`; add
`providerDiagnostics()` producing `provider-inactive`,
`provider-unsupported`, `provider-materialization-failed`,
`visibility-unknown`, `refresh-required`, and `restart-required` from
registry state, with severities chosen so a healthy configured host stays
`ok`.

**Verify:** `pnpm exec vitest run src/commands/tools/shared/pack-evidence.test.ts`
→ existing five cases and the new cases pass.

### 2. Add the mapper

Create `provider-reachability.ts`: `(activation, capabilities,
syncOperationResults, extensionResults, refreshPolicy) →
ProviderReachabilityEvidence[]`, consuming `resolveProviderScopeContext`
and never filesystem presence.

**Verify:** `pnpm exec vitest run src/commands/tools/shared/provider-reachability.test.ts`
→ supported, unsupported, failed, unknown, and refresh-required cases pass.

### 3. Capture sync evidence through auto-sync

Widen `AutoSyncDependencies.runSync` to return normalized evidence; keep
human output of `oat tools install` unchanged; thread the result into
`providerSyncOutcomeFromAutoSync`.

**Verify:** `pnpm exec vitest run src/commands/tools/shared/auto-sync.test.ts src/commands/tools/shared/pack-lifecycle-outcome.test.ts`
→ updated mocks and new cases pass.

### 4. Feed every lifecycle outcome

Replace the nine production `providers: []` literals and the `not-run`
defaults with mapper output.

**Verify:** `pnpm exec vitest run src/commands/init/tools src/commands/tools/update src/commands/tools/remove`
→ pass; the `providers: []` assertions in `update/index.test.ts:261` and
`doctor/index.test.ts:576,1980` are updated deliberately.

### 5. Render provider context everywhere

Thread provider context into `projectRenderablePackEvidence`; fix
`list-tools.ts:68` and `info-tool.ts:76`; extend the human renderer with a
provider line.

**Verify:** `pnpm exec vitest run src/commands/tools/list src/commands/tools/info src/commands/status src/commands/doctor`
→ pass, including the list/info regression case.

### 6. Docs, bump, gates

Update `tool-packs.md:282-308`; bump the five packages; run the eight
AGENTS.md gates in order with captured exit codes.

## Test plan

- `pack-evidence.test.ts` (pattern `:110`): emits `provider-inactive` for a
  config-disabled provider; emits `provider-unsupported` with the registry
  reason; emits refresh/restart codes from catalog state; names the provider
  on `provider-materialization-missing`.
- `provider-reachability.test.ts` (new): the five reachability states.
- `auto-sync.test.ts` (pattern `:69`): returns evidence on success; empty
  evidence with failure preserved on failure.
- `pack-lifecycle-outcome.test.ts` (pattern `:91`): carries provider
  evidence into a complete outcome.
- `list-tools.test.ts`, `info-tool.test.ts`: no unmaterialized-user-agent
  report when an active provider supplies managed roles.

## Done criteria

- [ ] No production path constructs `providers: []`; every lifecycle outcome
      and inventory surface carries populated provider evidence.
- [ ] All six previously dead diagnostic codes have emitters and tests.
- [ ] Human output names providers; JSON is additive.
- [ ] list/info agree with status/doctor on managed-role materialization.
- [ ] Lockstep bump and all gates pass; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- closing the interface breaks a consumer outside `commands/tools/`;
- capturing sync evidence would require reshaping `sync/apply.ts` JSON;
- the mapper would need filesystem presence to decide reachability;
- new diagnostics would change `oat tools install` exit codes on a healthy
  host without an explicit severity decision; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Re-anchored 2026-09-04 after PR #248, which added pack dependencies
(`pack-dependencies.ts`, `pack-lifecycle.ts`, `pack-reconcile.ts`,
`scoped-pack-intent.ts`) and `userMaterializable` agent markers without
touching `pack-evidence.ts`, `auto-sync.ts`, list, or info; the `providers: []`
literals are unchanged. Revalidate against current `origin/main`, the backlog
item, the two decision records, and the registry and sync payload shapes when
substantial time passes, main advances materially from `dd41adb9bed53aa2389e911b601615fc2b26f0b7`, another PR
passes `providers` to `projectPackEvidence`, or a load-bearing claim cannot
be reproduced.

## Review focus

- Severity choices for the six new codes and their effect on exit codes.
- The auto-sync seam: in-process service versus parsed subprocess JSON.
- DR-260831: no filesystem-derived reachability anywhere in the mapper.
