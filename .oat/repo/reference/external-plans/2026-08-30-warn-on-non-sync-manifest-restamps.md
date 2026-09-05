---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260826-warn-on-silent-oatversion.md
oat_external_plan_commit: cf01598937cd508329dba9651835488a0c5096a8
oat_external_plan_date: '2026-09-03'
oat_execution_status: READY
oat_backlog_items:
  - BL-260826-warn-on-silent-oatversion
oat_issue_url: null
created: '2026-08-30T23:40:20Z'
---

# Surface every non-sync manifest version restamp

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** The `tool-pack-scope-provider-truthfulness`
> project merged as PR #255 (`a06e9713a`, CLI 0.2.52) and PR #256 followed
> (0.2.53). The 2026-09-03 refresh re-anchored every evidence line on that
> tree: Manifest V2 landed, new engine save sites exist, status gained a
> collection-migration block, and no part of this outcome was implemented.
> In standalone mode, execute against a lockstep version above the then-current
> `origin/main`; under the execution program the wave fan-in owns that bump.

## Outcome

Every command that saves a stale sync manifest tells the operator before
`saveManifest` replaces producer-version evidence. Human mode emits one scoped
advisory and JSON mode carries equivalent structured evidence. A sync apply
whose only mutation is a version refresh reports that fact instead of claiming
that no changes were required.

## Source and live evidence

- Source backlog item:
  [BL-260826-warn-on-silent-oatversion — Warn on silent oatVersion restamps outside sync](../../pjm/backlog/items/BL-260826-warn-on-silent-oatversion.md)
- Planned at: `origin/main` commit
  `cf01598937cd508329dba9651835488a0c5096a8` on `2026-09-03`.
- Verified evidence:
  - `packages/cli/src/manifest/manager.ts:106-119` (`saveManifest(path,
ManifestV2)`) always replaces `manifest.oatVersion` with `OAT_VERSION`
    and validates through `ManifestV2Schema` immediately before atomic save;
    `loadManifest` (`:37-82`) silently upgrades V1 files to V2 in memory.
  - `packages/cli/src/commands/init/index.ts:1246` saves every processed scope
    without first reporting version skew.
  - `packages/cli/src/commands/remove/skill/remove-skill.ts:359-367` derives a
    new manifest and saves it without preserving/restating the old producer.
  - `packages/cli/src/commands/status/index.ts:1508-1512` can save an adopted
    manifest without an advisory, after a collection-migration block
    (`:1282-1390`) that may set `migrationAborted` and mutate the manifest.
  - `packages/cli/src/commands/sync/index.ts:302` (`detectVersionSkew`) defines plain
    string-inequality skew semantics, and PR #217 made sync warn before apply.
  - `packages/cli/src/commands/sync/apply.ts` keys restamping off that
    diagnostic, but `:498-499` still prints `No changes required.` whenever
    `summary.plannedOperations === 0`, including when the version refresh is
    the only mutation.
  - `packages/cli/src/commands/sync/index.test.ts:1324-1326` and `:1545` lock in
    both the restamp-only mutation and the coupled advisory.
  - `packages/cli/src/engine/execute-plan.ts:679` and `:970` are engine save
    sites reached only through sync's `executeSyncPlan`; they inherit sync's
    advisory and are enumerated here so the done criteria are complete.
- Related implementation history:
  - [PR #217 — fix(sync): warn on manifest/CLI version skew before any mutation (wave 2)](https://github.com/voxmedia/open-agent-toolkit/pull/217)
    is the behavior precedent, not duplicate unfinished work.
  - [Surface sync producer and invoker version skew before mutation](./2026-08-19-warn-sync-version-skew.md)
    is the implemented predecessor plan.
  - [PR #249 — Correct scope and adoption diagnostics](https://github.com/voxmedia/open-agent-toolkit/pull/249)
    completed the ownership dependency at
    `2c6005d64f45a19e8b9eedbc977959b066d3eda0`; its
    [project summary](../project-summaries/20260831-scope-adoption-diagnostics.md)
    records the delivered status and inventory contracts.

## Dependencies

| Type                  | Dependency                                                                                                                                                                      | Required state                                                                                                                                      | Current state                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Satisfied predecessor | [PR #249](https://github.com/voxmedia/open-agent-toolkit/pull/249) / [BL-260827-correct-scope-and-adoption](../../pjm/backlog/archived/BL-260827-correct-scope-and-adoption.md) | Project completed; implementation merged to `origin/main`; `status/index.ts`, its JSON/human output, and tests revalidated on that merged baseline. | Satisfied at merge `2c6005d64f45a19e8b9eedbc977959b066d3eda0`; status mutation remains interactive-only.                               |
| Satisfied integration | `tool-pack-scope-provider-truthfulness` project / [BL-260829-make-tool-pack-scope-selection](../../pjm/backlog/archived/BL-260829-make-tool-pack-scope-selection.md)            | Merged to `origin/main`; this plan refreshed against the merged tree.                                                                               | Satisfied at merge `a06e9713a3efa9659775af341073b54c226eee24` (PR #255); refreshed 2026-09-03 with PR #256 (`cf0159893`) also on main. |
| Soft precedent        | [PR #217](https://github.com/voxmedia/open-agent-toolkit/pull/217) and [its external plan](./2026-08-19-warn-sync-version-skew.md)                                              | Preserve pre-mutation, non-blocking, plain-identity comparison semantics.                                                                           | Merged/implemented.                                                                                                                    |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                                                 | Required update                                                        |
| ------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections.                         | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted. |
| `review-plan-workflow` (draft PR #190) merges                                        | No               | None (init, remove-skill, status, sync, manifest are outside the #190 surface). | None.                                                                  |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat cf01598937cd508329dba9651835488a0c5096a8..origin/main -- packages/cli/src/manifest/manager.ts packages/cli/src/manifest/manager.test.ts packages/cli/src/commands/init packages/cli/src/commands/remove/skill packages/cli/src/commands/status packages/cli/src/commands/sync packages/cli/src/engine/execute-plan.ts packages/cli/src/engine/execute-plan.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
```

Reproduce each save call and determine whether the diagnostics project added,
removed, or reordered status mutation. Any mismatch is a STOP condition until
this plan is refreshed.

## Repository conventions

- Build: `pnpm build` → all non-docs workspace builds pass.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Focused tests: run the manifest manager plus init, remove-skill, status, and
  sync command test files; each stale/equal version path must execute.
- Lint/format check: `pnpm check` → repository checks pass.
- Implementation pattern: follow PR #217's pre-mutation diagnostic, suppress
  human warnings in JSON mode, and compare version identity rather than semver
  ordering.
- Git/PR convention: shipped CLI behavior requires a lockstep five-package
  version bump, whose owner is mode-dependent (see step 5): the wave fan-in
  under the execution program, the executor only in standalone mode. Do not
  push or open a PR unless instructed.

## Scope

### In scope

- `packages/cli/src/manifest/manager.ts` and tests — one reusable, pure
  producing/invoking version comparison; keep `saveManifest` enforcement intact.
- `packages/cli/src/commands/init/index.ts` and tests — pre-save advisory and
  structured JSON evidence by scope.
- `packages/cli/src/commands/remove/skill/remove-skill.ts` and tests — preserve
  pre-removal producer evidence in human/JSON output before save.
- `packages/cli/src/commands/status/index.ts` and tests — advisory immediately
  before interactive adoption saves, reconciled against the completed
  diagnostics project.
- `packages/cli/src/commands/sync/index.ts`, `apply.ts`, shared types, and tests —
  reuse the common comparison where practical and acknowledge restamp-only apply.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- Blocking a command because versions differ.
- Semantic-version ordering, update checks, or automatic tool upgrades.
- Changing `saveManifest`'s required final `OAT_VERSION` stamp.
- Reworking scope/adoption diagnostics or status output beyond the advisory.
- Treating an absent manifest as skew; it is created with the invoking version.

## Current state

Sync preserves producer evidence by computing `versionSkew` before mutation,
emitting it, and only then allowing the save path to restamp. Init, skill
removal, and interactive status adoption call the same `saveManifest` function
without that pre-save evidence. The comparison should be centralized as a pure
manifest helper, while each command remains responsible for when and how its
output exposes the diagnostic.

Use one structured shape with `scope`, `producingVersion`, and
`invokingVersion`. Human output must identify the command/scope and both
versions. JSON commands must add an array field and emit no warning text.
Status's delivered save path remains interactive-only. Add the human advisory
immediately before its save and add a focused negative contract proving JSON
status does not mutate or claim restamp evidence.

## Implementation steps

### 1. Extract a reusable version-restamp diagnostic

In `manifest/manager.ts` (or a same-directory explicit helper exported through
`manifest/index.ts`), export a pure function over `ManifestV2` that returns
producing/invoking versions only when they differ by plain string identity.
Rule explicitly that the silent V1→V2 `version` upgrade performed by
`loadManifest` is out of scope for the advisory; only `oatVersion` is reported. Keep absent-manifest and invalid-manifest behavior in
the existing loader/schema. Make sync's scoped detector wrap or reuse this
helper so comparison semantics cannot diverge.

Do not move warning output into `saveManifest`: that layer lacks command,
scope, and JSON-envelope ownership, and would report after callers have lost
control of output ordering.

**Verify:** manifest manager and sync typechecks/tests pass for equal, older,
newer, absent, and invalid values.

### 2. Emit init and remove-skill evidence before saving

For each scope plan, compute the diagnostic from the loaded pre-mutation
manifest. In human mode, emit one deterministic warning immediately before the
save. In JSON mode, suppress warning text and add
`manifestVersionRestamps: [{scope, producingVersion, invokingVersion}]` to the
existing final payload.

Removal must retain the original producing version even though `nextManifest`
is assembled before save. Dry-run must report planned file removal but must not
claim a restamp will be applied unless the JSON field is explicitly named as a
planned restamp; prefer emitting applied restamps only on the apply path.

**Verify:** focused init/remove tests prove pre-save ordering, human/JSON
separation, equality suppression, and one diagnostic per affected scope.

### 3. Reconcile and cover status adoption

Cover the status-owned `saveManifest` path (`status/index.ts:1508`). Place the
advisory after the collection-migration block and immediately before the save,
using the original loaded version, and prove the `migrationAborted` path emits
no restamp advisory. Add a test that establishes JSON status is
non-mutating and therefore does not emit applied-restamp evidence.

Do not alter drift status, exit codes, remediation, or adoption eligibility.

**Verify:** focused status tests prove a stale manifest is observable before
restamp and an equal version remains quiet.

### 4. Make restamp-only sync output truthful

In `runSyncApply` (`apply.ts:498-499`), distinguish
`summary.plannedOperations === 0 && versionSkew.length > 0` from a true no-op
against the enlarged JSON payload (`collectionOperations`, `operationResults`,
`providerRefreshAdvice`). Emit a stable semantic message such as
`Manifest version refreshed; no content changes required.` for the restamp-only
case. Preserve `No changes required.` only when no operation or restamp occurs.
JSON already exposes `versionSkew`; do not add a second redundant field there.

**Verify:** the restamp-only and true no-op cases in `sync/index.test.ts`
(`:1310-1347`, the block whose comment says the restamp is the only mutation)
assert the new message,
continued restamp, unchanged exit code, and no false success text.

### 5. Run the mode-appropriate gates

**Lane mode (default under the execution program):** bump changed skill
`version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` where a pin exists; run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes. Do not edit
lockstep release files or run `pnpm release:check-versions` /
`pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. **Standalone mode only:** bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md gates
in order.

**Verify:** every command in the selected mode exits zero. Run focused command
tests independently so Turbo cache replay cannot stand in for execution
evidence.

## Test plan

- `packages/cli/src/manifest/manager.test.ts`: pure comparison and unchanged
  restamp enforcement.
- Init tests: stale/equal versions, multiple scopes, warning-before-save, and
  structured JSON-only output.
- Remove-skill tests: original producing version retained through `nextManifest`,
  human/JSON separation, and no apply evidence on dry-run.
- Status tests: interactive save warns before mutation; JSON behavior matches
  the dependency's final contract.
- Sync tests: restamp-only output acknowledges refresh; true no-op keeps the
  current message.
- Full CLI tests and build, then the lane-mode or standalone gate set from
  step 5.

## Done criteria

- [ ] Every non-sync save site reports stale producer evidence before restamp;
      the two `engine/execute-plan.ts` sites are documented as sync-covered.
- [ ] Human output names scope and both versions exactly once.
- [ ] JSON output carries equivalent structured evidence and no human warning.
- [ ] Equal/absent manifests do not produce false diagnostics.
- [ ] Invalid manifests retain current fail-closed schema behavior.
- [ ] Restamp-only sync no longer says no changes were required.
- [ ] Status behavior is based on the completed diagnostics-project baseline.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- PR #249's canonical scope-owned observations or exception-safe status output
  would be changed instead of preserved;
- status ownership or output changed without revalidation;
- a caller cannot preserve the pre-save producing version;
- JSON output would require mixing human warning text into stdout;
- satisfying the plan would weaken manifest validation or stop final restamping;
  or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Refreshed 2026-09-03 against `origin/main` after PR #255 (truthfulness) and
PR #256 merged, and re-anchored 2026-09-04 after PR #248 (recon packets)
shifted the init and status save sites by a few lines without changing them; all seven evidence anchors and the new engine save sites were
re-verified on that tree and the checklist below is applied in the steps
above. If a later PR touches `manifest/manager.ts`, the status
collection-migration block, or `runSyncApply`, repeat the re-anchor.

Revalidate again against PR #217, the predecessor external plan, every
`saveManifest` call site, output schemas, and focused tests when substantial
time passes, main advances materially, cited contracts/intent change, another
PR implements part of the outcome, or any load-bearing silent-restamp claim no
longer reproduces.

## Review focus

- Verify warnings precede mutation and preserve the original producer value.
- Confirm JSON remains machine-only and additive.
- Confirm status changes are reconciled with the completed dependency.
- Confirm sync differentiates true no-op from restamp-only mutation.
