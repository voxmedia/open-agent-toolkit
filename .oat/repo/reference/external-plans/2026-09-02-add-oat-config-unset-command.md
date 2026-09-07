---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260830-add-oat-config-unset-command.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260830-add-oat-config-unset-command
oat_issue_url: null
created: '2026-09-02T23:59:00Z'
---

# Add an oat config unset command

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Draft PR #190
> edits the same config command module; see the landing-event table. Land
> after the docs-index exclusion plan so `unset` covers its new key.

## Outcome

`oat config unset <key>` removes a supported flat or nested key from the
shared, local, or user surface with the same `--shared`/`--local`/`--user`
flags, mutual-exclusion rule, and per-key surface restrictions as
`oat config set`. Emptied parent objects are pruned, effective reads fall back
through the existing precedence to lower surfaces or defaults, absent keys
report an explicit already-unset outcome, unknown keys error, and
env-sourced values are reported as not unsettable. Human and JSON envelopes
match `set`.

## Source and live evidence

- Source backlog item:
  [BL-260830-add-oat-config-unset-command — Add oat config unset command](../../pjm/backlog/items/BL-260830-add-oat-config-unset-command.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/commands/config/index.ts:2852-3010` —
    `createConfigCommand` registers `get`, `set`, `adopt`, `list`, and
    `describe`; `dump` is registered from the sibling `dump.ts`; no `unset`. The only `'unset'` strings are display defaults.
  - `:2866-3007` — the surface-flag trio and mutual-exclusion check live
    inline in the `set` action; not factored out.
  - `:1353-1427` — `validateSurfaceForKey`, the per-key restriction table;
    `:1429-1446` — `defaultSurfaceForKey`.
  - `:2000-2350` — `setConfigValue` is a per-key-family if-chain; the mirror
    for `unset` must cover every family in `KEY_ORDER` (`:219-288`).
  - `:2233-2240` — `archive.awsProfile`/`awsRegion` delete-on-empty, the only
    removal precedent; no parent pruning.
  - `:1903-1980` — reads resolve `default < user < shared < local < env`;
    `formatResolvedValue` returns `null` for absent values.
  - `packages/cli/src/config/resolve.ts:74-80` — defaults, so unsetting
    `documentation.requireForProjectCompletion` resolves back to `false`.
  - `:1137-1200` — `isConfigKey` and dynamic
    `workflow.dispatchCeiling.providers.<name>` keys, a nested-removal case.
- Constraining decisions:
  [DR-260217-introduce-oat-config-json](../decisions/DR-260217-introduce-oat-config-json.md),
  [DR-260222-adopt-config-local-lifecycle](../decisions/DR-260222-adopt-config-local-lifecycle.md)
  (state keys are local-only; `set <key> ''` remains the sanctioned path for
  lifecycle state),
  [DR-260718-keep-sync-state-in-sync-config](../decisions/DR-260718-keep-sync-state-in-sync-config.md).

## Dependencies

| Type          | Dependency                                                                                                                                                                | Required state                                                                                                                                                                | Current state            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Soft ordering | Sibling plan [Add docs-index exclusions](./2026-09-02-add-exclusions-to-docs-index-generation.md)                                                                         | Land first so the family-coverage test includes `documentation.excludes`. If it has not landed (it is BLOCKED on W1), omit that key from the coverage table and note the gap. | Pending (BLOCKED on W1). |
| Soft ordering | Sibling plan [Keep instruction-sync pointers out of docs trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md)                                         | Land first so the family-coverage test includes its `documentation.*` opt-out key.                                                                                            | Pending (W5 group 1).    |
| Soft ordering | W5 group 1 plan [Recover committed review artifacts after post-selection gate failures](./2026-09-02-recover-committed-review-artifacts-after-post-selection-failures.md) | Runs before this plan; both edit `apps/oat-docs/docs/reference/cli-reference.md`, so never in one parallel group.                                                             | Pending.                 |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                     | Required update                                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | No       | None.                                                                                                               | None. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch.                                                                                       |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes      | `commands/config/index.ts`, `config/index.test.ts`, `cli-utilities/configuration.md`, `reference/cli-reference.md`. | If #190 merges first: re-anchor the subcommand registration, the `set` action, `validateSurfaceForKey`, and `KEY_ORDER`; re-run the family-coverage test. If this lands first: #190 rebases. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/commands/config packages/cli/src/config/resolve.ts packages/cli/src/config/oat-config.ts apps/oat-docs/docs/cli-utilities/config-and-local-state.md apps/oat-docs/docs/reference/cli-reference.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If `KEY_ORDER` or `setConfigValue` families changed, re-anchor the mirror
before editing.

## Repository conventions

- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/config/index.test.ts`.
- Lint/format/docs: `pnpm check` → passes.
- Implementation pattern: `runSet`/`runGet` envelopes (`:2641-2721`);
  `validateSurfaceForKey`.
- Git/PR convention: shipped CLI surface, so the integrated change carries a
  lockstep bump (fan-in owned in lane mode; see Scope); help snapshots may
  need regeneration (`help-snapshots.test.ts`).

## Scope

### In scope

- `packages/cli/src/commands/config/index.ts` — `resolveSurfaceFlags`
  helper extracted from `set`; `unsetConfigValue` mirroring every family
  with parent pruning; `runUnset`; `unset` registration after `set`.
- `packages/cli/src/commands/config/index.test.ts` — the cases below.
- Docs: `config-and-local-state.md:117-128`, `cli-reference.md:152-162`, and
  `cli-utilities/configuration.md:23-24,52-53` (the three `get/set/list/describe`
  surface mentions).
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- `dump.ts`, `resolve.ts` (precedence already correct), `oat-config.ts`
  writers (verify they drop `undefined`), `oat config adopt`, sync config.
- `.agents/skills/**` — no skill instructs hand-editing JSON for removal;
  re-grep before concluding.

## Current state

`runSet` guards with `isConfigKey`, resolves the project root and user
config dir, and dispatches to `setConfigValue`. Reads use
`resolveEffectiveConfig`. Env-sourced values cannot be removed by this
command and must be reported as such rather than as success.

## Implementation steps

### 1. Extract the surface-flag helper

Move the flag parsing and mutual-exclusion check from the `set` action into
`resolveSurfaceFlags(options)` with no behavior or message change.

**Verify:** `pnpm exec vitest run src/commands/config/index.test.ts` → the
full suite passes, including `:1216` (mutually exclusive flags).

### 2. Add `unsetConfigValue`

Mirror `setConfigValue`'s families; call `validateSurfaceForKey` first; prune
parents that become empty (prove `workflow.dispatchCeiling.providers.<name>`
and `documentation.*`). Add a test that enumerates `KEY_ORDER` and asserts
every family is handled.

**Verify:** same command → family-coverage case passes.

### 3. Add `runUnset` and the subcommand

Same JSON/human envelopes as `set`; distinguish `already unset` (exit 0) from
`Unknown config key` (exit 1); report env-sourced values as not unsettable.

**Verify:** same command → outcome cases pass.

### 4. Prove effective-read fallback

Unset a local override and assert `get` returns the shared value with
`source: 'shared'`; unset the last surface and assert the default with
`source: 'default'`.

**Verify:** same command → fallback cases pass.

### 5. Docs, help snapshots, verification

Update both docs pages; regenerate help snapshots if the test requires.

**Verify (lane mode, the default under the execution program):** run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes. Do not edit lockstep
release files or run `pnpm release:check-versions` / `pnpm release:validate`;
the wave fan-in owns the lockstep bump and the full definition-of-done
sequence. **Standalone mode only:** bump the five public packages above
freshly fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

Patterns: `:405` (surface restriction), `:1057-1216` (flag handling),
`:3566` (value-shape errors).

- `unset removes a flat shared key`; `unset removes a nested workflow key and
prunes the emptied parent`; `unset removes a dynamic dispatchCeiling
provider key`; `unset --shared --local rejects mutually exclusive flags`;
  `unset rejects a structural key at local scope`; `unset of an absent key
reports already-unset with exit 0`; `unset of an unknown key errors with
exit 1`; `unset reports env-sourced values as not unsettable`; `get falls
back to the shared value after a local unset`; `get returns the default
after unsetting every surface`; `every KEY_ORDER family is handled by
unsetConfigValue`.

## Done criteria

- [ ] `unset` exists with `set`-parity flags, restrictions, and envelopes.
- [ ] Emptied parents are pruned; precedence fallback is proven.
- [ ] Absent, unknown, and env-sourced keys have explicit outcomes.
- [ ] Docs and help snapshots updated.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is
      edited. Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` is clean.

## STOP conditions

Stop and report instead of improvising when:

- pruning a parent would delete a key another consumer treats as present-but-
  empty (check `resolve.ts` defaults and `config dump`);
- `unset activeProject` or `lastPausedProject` is requested (lifecycle state
  stays with `set <key> ''` per DR-260222);
- the step-1 refactor changes any pinned message string;
- PR #190 merged first and the module no longer matches the cited shapes; or
- a named verification gate fails twice after one bounded correction.

## Execution record (2026-09-07, wave 5)

Executed as wave-5 p05 (PR #275 `wave-5-execution`, CLI 0.2.63): `oat config unset <key>` with `set`-parity refusals (tools.\*, surface flags, dispatch-ceiling key parsing shared with `set`, byte-identical errors), aggregate keys (`workflow.dispatchCeiling`, `.providers`) rejected before any path is computed, empty-parent pruning with sibling preservation, already-unset exit 0, unknown key exit 1, fallback to `source: default`; family coverage derived from the live `oat config list --json` catalog (excluding the two uncatalogued keys, incl. p02's `instructionPointerExcludes`, which `unset documentation.root` leaves intact — the plan's STOP #1 guard). Judgment call pinned: `unset tools.<pack>` REFUSES (points at `oat tools remove`). `oat config adopt` still carries an inline copy of the surface-flag block (plan step 1 said extract from `set`; left untouched) — follow-up filed at wave close. Docs: `config-and-local-state.md`, `configuration.md`, `cli-reference.md`, help snapshots. Exit gate (attempt 1) found the family-coverage test excluded p02's `documentation.instructionPointerExcludes` although this plan's dependency row required covering it; fixed in the wave as p12-t03 (catalogued as `string[]` through the same normalizer, family coverage + `KEY_ORDER` removal control). `unset` on a malformed stored value still exits 1 (identical to `documentation.excludes`) — `BL-260907-let-oat-config-unset-remove`.

## Revalidation Before Execution

**Refresh applied 2026-09-07 (wave-5 boundary, per the execution program's pre-dispatch refresh clause; drift re-run against `0f47bf700` after waves 1–4 and the Lite workflow PR #264 merged):** On the wave-5 base `0f47bf700`: no `unset` subcommand, `runUnset`, or `unsetConfigValue` exists; `runGet` `:2692`, `runSet` `:2731`, `KEY_ORDER` `:224`, `validateSurfaceForKey` `:1387`, `setConfigValue` `:2034`; `KEY_ORDER` already includes `documentation.excludes` (W1, PR #262), so the `documentation.excludes` dependency row is satisfied and the family-coverage test includes it plus any key the wave-5 p02 lane adds before this lane. `packages/cli/src/commands/help-snapshots.test.ts` (the literal `oat config --help` snapshot, `:423-446`) and `apps/oat-docs/docs/cli-utilities/configuration.md` (`:23-24,52-53` → `:22-26`, `:52-56`, +30 since authoring) are write surfaces and join the drift check; `config-and-local-state.md:117-128` exact; `cli-reference.md:152-162` → the `## oat config surface flags` heading at `:158`.

Revalidate against current `origin/main`, the backlog item, `KEY_ORDER`, and
the config tests when substantial time passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, PR #190 or the docs-index
exclusion plan lands, cited contracts change, or a load-bearing claim cannot
be reproduced. Apply the landing-event table above.

## Review focus

- Family coverage is asserted mechanically against `KEY_ORDER`.
- No message strings or `set` behavior changed in the refactor.
- Env-sourced values are never reported as unset.
