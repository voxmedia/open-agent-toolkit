---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260826-warn-on-silent-oatversion.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: BLOCKED
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
> **Execution status: BLOCKED.** Scope and adoption diagnostics completed and
> merged as PR #249, and the 2026-09-02 revalidation reproduced every silent
> restamp claim on `origin/main`. Execution is blocked on integration: the
> in-flight `tool-pack-scope-provider-truthfulness` project rewrites every
> save site this plan edits (Manifest V2, collection sync, status migration,
> new engine save sites) in one integrated PR that is expected to merge next.
> Refresh this plan against that merged tree per Revalidation Before Execution,
> then set it `READY` before import or execution.

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
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/manifest/manager.ts:81-94` always replaces
    `manifest.oatVersion` with `OAT_VERSION` immediately before atomic save.
  - `packages/cli/src/commands/init/index.ts:1196` saves every processed scope
    without first reporting version skew.
  - `packages/cli/src/commands/remove/skill/remove-skill.ts:339-350` derives a
    new manifest and saves it without preserving/restating the old producer.
  - `packages/cli/src/commands/status/index.ts:1317-1321` can save an adopted
    manifest in the delivered diagnostics surface without an advisory.
  - `packages/cli/src/commands/sync/index.ts:250-274` already defines plain
    string-inequality skew semantics, and PR #217 made sync warn before apply.
  - `packages/cli/src/commands/sync/apply.ts:95-115` keys restamping off that
    diagnostic, but `:184-192` still prints `No changes required.` when the
    version refresh is the only mutation.
  - `packages/cli/src/commands/sync/index.test.ts:570-601` locks in both the
    restamp-only mutation and the misleading no-change message.
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

| Type                  | Dependency                                                                                                                                                                                                                                                     | Required state                                                                                                                                      | Current state                                                                                                                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Satisfied predecessor | [PR #249](https://github.com/voxmedia/open-agent-toolkit/pull/249) / [BL-260827-correct-scope-and-adoption](../../pjm/backlog/archived/BL-260827-correct-scope-and-adoption.md)                                                                                | Project completed; implementation merged to `origin/main`; `status/index.ts`, its JSON/human output, and tests revalidated on that merged baseline. | Satisfied at merge `2c6005d64f45a19e8b9eedbc977959b066d3eda0`; status mutation remains interactive-only.                                                                                                                                                                                                                  |
| Hard integration      | `tool-pack-scope-provider-truthfulness` project (spec-driven; at `p07-t04` on 2026-09-02; ships as one integrated PR with lockstep `0.2.52`) / [BL-260829-make-tool-pack-scope-selection](../../pjm/backlog/items/BL-260829-make-tool-pack-scope-selection.md) | Merged to `origin/main`; this plan refreshed against the merged tree per the checklist in Revalidation Before Execution.                            | Not merged. Its branch changes `manifest/manager.ts` (Manifest V1→V2, `saveManifest(path, ManifestV2)`), `init/index.ts`, `remove-skill.ts`, `status/index.ts` (collection-migration stray class with `migrationAborted`), `sync/*`, and adds `engine/execute-plan.ts` save sites; it implements no part of this outcome. |
| Soft precedent        | [PR #217](https://github.com/voxmedia/open-agent-toolkit/pull/217) and [its external plan](./2026-08-19-warn-sync-version-skew.md)                                                                                                                             | Preserve pre-mutation, non-blocking, plain-identity comparison semantics.                                                                           | Merged/implemented.                                                                                                                                                                                                                                                                                                       |

One hard integration dependency is unsatisfied: the truthfulness project must
merge to `origin/main` and this plan must be refreshed against that tree.

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/manifest/manager.ts packages/cli/src/manifest/manager.test.ts packages/cli/src/commands/init packages/cli/src/commands/remove/skill packages/cli/src/commands/status packages/cli/src/commands/sync packages/cli/src/engine/execute-plan.ts packages/cli/src/engine/execute-plan.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
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
  version bump; do not push or open a PR unless instructed.

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
- Five public package manifests and `pnpm-lock.yaml`.

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

In `manifest/manager.ts` (or a same-directory explicit helper), export a pure
function that returns producing/invoking versions only when they differ by
plain string identity. Keep absent-manifest and invalid-manifest behavior in
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

On the completed diagnostics-project baseline, cover the status-owned
`saveManifest` path. For interactive adoption, warn immediately before save
using the original loaded version. Add a test that establishes JSON status is
non-mutating and therefore does not emit applied-restamp evidence.

Do not alter drift status, exit codes, remediation, or adoption eligibility.

**Verify:** focused status tests prove a stale manifest is observable before
restamp and an equal version remains quiet.

### 4. Make restamp-only sync output truthful

In `runSyncApply`, distinguish zero content/provider operations with non-empty
`versionSkew` from a true no-op. Emit a stable semantic message such as
`Manifest version refreshed; no content changes required.` for the restamp-only
case. Preserve `No changes required.` only when no operation or restamp occurs.
JSON already exposes `versionSkew`; do not add a second redundant field there.

**Verify:** existing sync tests around lines 570-601 assert the new message,
continued restamp, unchanged exit code, and no false success text.

### 5. Apply release bookkeeping and full gates

Bump the five public packages together and update `pnpm-lock.yaml`. Fetch main
immediately before version validation.

**Verify:** run the repository Definition of Done in order; every command exits
zero. Run focused command tests independently so Turbo cache replay cannot
stand in for execution evidence.

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
- Full CLI tests, build, release validation, and docs build.

## Done criteria

- [ ] Every non-sync save site reports stale producer evidence before restamp.
- [ ] Human output names scope and both versions exactly once.
- [ ] JSON output carries equivalent structured evidence and no human warning.
- [ ] Equal/absent manifests do not produce false diagnostics.
- [ ] Invalid manifests retain current fail-closed schema behavior.
- [ ] Restamp-only sync no longer says no changes were required.
- [ ] Status behavior is based on the completed diagnostics-project baseline.
- [ ] Five-package lockstep release bookkeeping and all gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- the `tool-pack-scope-provider-truthfulness` project has not merged to
  `origin/main`, or it has merged but this plan's refresh checklist has not
  been applied and the status flipped to `READY`;
- PR #249's canonical scope-owned observations or exception-safe status output
  would be changed instead of preserved;
- status ownership or output changed without revalidation;
- a caller cannot preserve the pre-save producing version;
- JSON output would require mixing human warning text into stdout;
- satisfying the plan would weaken manifest validation or stop final restamping;
  or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

The prerequisite-merge revalidation was completed against PR #249 and again on
2026-09-02 against `origin/main` at
`49aeb5075971180b48c131bbd2b21b82d455bfc9` (PR #254: lockstep version bumps
and unrelated test/skill edits only). A second refresh is REQUIRED once the
`tool-pack-scope-provider-truthfulness` project merges. Its branch, verified
read-only on 2026-09-02 at `27b978528`, reproduces every claim but changes the
surfaces this plan edits:

- Re-anchor the seven evidence line references (on that branch:
  `manager.ts:106-119`, `init/index.ts:1245`, `remove-skill.ts:359-367`,
  `status/index.ts:1500-1505`, `sync/index.ts:296-313`, `apply.ts:353-376`
  and `:497-499`, `sync/index.test.ts:1315-1347`).
- Step 1: target `ManifestV2Schema` and `saveManifest(path, ManifestV2)`,
  export the helper through `manifest/index.ts`, and rule explicitly on
  whether the silent V1→V2 `version` upgrade performed by `loadManifest` joins
  the advisory or stays out of scope (the final `OAT_VERSION` stamp remains
  out of scope).
- Step 3: place the status advisory after the new collection-migration block
  and prove the `migrationAborted` path emits no restamp advisory.
- Step 4: state the restamp-only condition as
  `summary.plannedOperations === 0 && versionSkew.length > 0` against the
  enlarged sync JSON payload (`collectionOperations`, `operationResults`,
  `providerRefreshAdvice`).
- Done criteria: enumerate `engine/execute-plan.ts:679` and `:970` as engine
  save sites reached only through sync and therefore covered by sync's
  existing advisory.
- Release bookkeeping: rebase onto the post-merge `origin/main` and choose a
  lockstep version above `0.2.52`.

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
