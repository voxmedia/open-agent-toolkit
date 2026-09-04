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
    `createConfigCommand` registers `get`, `set`, `adopt`, `list`, `dump`,
    `describe`; no `unset`. The only `'unset'` strings are display defaults.
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

| Type          | Dependency                                                                                                                        | Required state                                                                                     | Current state            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| Soft ordering | Sibling plan [Add docs-index exclusions](./2026-09-02-add-exclusions-to-docs-index-generation.md)                                 | Land first so the family-coverage test includes `documentation.excludes`.                          | Pending (BLOCKED on W1). |
| Soft ordering | Sibling plan [Keep instruction-sync pointers out of docs trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md) | Land first so the family-coverage test includes its `documentation.*` opt-out key.                 | Pending (W5 group 1).    |
| Soft ordering | Sibling plan [Make the autonomous recap capability-aware](./2026-09-02-make-autonomous-project-recap-capability-aware.md)         | Runs after this plan and must extend the family-coverage test with its optional `recapSeams` keys. | Pending (W5 group 3).    |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                       | Required update                                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | No       | None.                                                                                 | None. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch.                                                                                       |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes      | `commands/config/index.ts`, `config/index.test.ts`, `cli-utilities/configuration.md`. | If #190 merges first: re-anchor the subcommand registration, the `set` action, `validateSurfaceForKey`, and `KEY_ORDER`; re-run the family-coverage test. If this lands first: #190 rebases. |

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
- Git/PR convention: shipped CLI surface; five-package lockstep bump; help
  snapshots may need regeneration (`help-snapshots.test.ts`).

## Scope

### In scope

- `packages/cli/src/commands/config/index.ts` — `resolveSurfaceFlags`
  helper extracted from `set`; `unsetConfigValue` mirroring every family
  with parent pruning; `runUnset`; `unset` registration after `set`.
- `packages/cli/src/commands/config/index.test.ts` — the cases below.
- Docs: `config-and-local-state.md:117-128`, `cli-reference.md:152-162`.
- Five public package manifests.

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

### 5. Docs, help snapshots, bump, gates

Update both docs pages; regenerate help snapshots if the test requires; bump
the five packages.

**Verify:** `pnpm check`, then the eight AGENTS.md gates in order.

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
- [ ] Docs and help snapshots updated; lockstep bump and all gates pass.
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

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, `KEY_ORDER`, and
the config tests when substantial time passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, PR #190 or the docs-index
exclusion plan lands, cited contracts change, or a load-bearing claim cannot
be reproduced. Apply the landing-event table above.

## Review focus

- Family coverage is asserted mechanically against `KEY_ORDER`.
- No message strings or `set` behavior changed in the refactor.
- Env-sourced values are never reported as unset.
