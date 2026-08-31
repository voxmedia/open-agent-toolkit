---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260826-warn-on-silent-oatversion.md
oat_external_plan_commit: 845462e78468265c7e2e2b2f6c64731472731ecb
oat_external_plan_date: '2026-08-30'
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

> [!CAUTION]
> **Execution status: BLOCKED. Do not import or execute this plan** until the
> [scope-adoption-diagnostics project](../../../projects/shared/scope-adoption-diagnostics/state.md)
> is completed and its implementation is merged into `origin/main`. Then
> revalidate `packages/cli/src/commands/status/index.ts` and its output/tests
> before changing any file.

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
  `845462e78468265c7e2e2b2f6c64731472731ecb` on `2026-08-30`.
- Verified evidence:
  - `packages/cli/src/manifest/manager.ts:81-94` always replaces
    `manifest.oatVersion` with `OAT_VERSION` immediately before atomic save.
  - `packages/cli/src/commands/init/index.ts:1196` saves every processed scope
    without first reporting version skew.
  - `packages/cli/src/commands/remove/skill/remove-skill.ts:339-350` derives a
    new manifest and saves it without preserving/restating the old producer.
  - `packages/cli/src/commands/status/index.ts:1218-1222` can save an adopted
    manifest in the active diagnostics-owned surface without an advisory.
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

## Dependencies

| Type           | Dependency                                                                                                                                                                                           | Required state                                                                                                                                      | Current state                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Hard ownership | [scope-adoption-diagnostics](../../../projects/shared/scope-adoption-diagnostics/state.md) / [BL-260827-correct-scope-and-adoption](../../pjm/backlog/items/BL-260827-correct-scope-and-adoption.md) | Project completed; implementation merged to `origin/main`; `status/index.ts`, its JSON/human output, and tests revalidated on that merged baseline. | Active outside this planning branch; repository snapshot is not authoritative for final implementation state. |
| Soft precedent | [PR #217](https://github.com/voxmedia/open-agent-toolkit/pull/217) and [its external plan](./2026-08-19-warn-sync-version-skew.md)                                                                   | Preserve pre-mutation, non-blocking, plain-identity comparison semantics.                                                                           | Merged/implemented.                                                                                           |

The ownership dependency is unsatisfied, so execution remains blocked.

## Drift check

After the hard dependency is verified and before editing:

```bash
git fetch origin main
git diff --stat 845462e78468265c7e2e2b2f6c64731472731ecb..origin/main -- packages/cli/src/manifest/manager.ts packages/cli/src/manifest/manager.test.ts packages/cli/src/commands/init packages/cli/src/commands/remove/skill packages/cli/src/commands/status packages/cli/src/commands/sync packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
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
Status's save path is interactive; if the completed diagnostics project adds a
JSON mutation path, that new path must receive equivalent structured evidence.

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

On the completed diagnostics-project baseline, locate every status-owned
`saveManifest` path. For interactive adoption, warn immediately before save
using the original loaded version. If status can mutate under JSON mode after
the dependency lands, add the same structured field to its payload without
mixing human text; otherwise add a test that establishes the mutation is
interactive-only.

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

- the scope-adoption-diagnostics implementation is not completed and merged;
- import or execution is attempted while `oat_execution_status` is `BLOCKED`;
- status ownership or output changed without revalidation;
- a caller cannot preserve the pre-save producing version;
- JSON output would require mixing human warning text into stdout;
- satisfying the plan would weaken manifest validation or stop final restamping;
  or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidation is mandatory after the hard dependency lands. Compare this plan
with current `origin/main`, both linked backlog items, the completed project,
PR #217, the predecessor external plan, every `saveManifest` call site, output
schemas, and focused tests. Revalidate again when substantial time passes,
main advances materially, cited contracts/intent change, another PR implements
part of the outcome, or any load-bearing silent-restamp claim no longer
reproduces.

Refresh or supersede the plan before changing its execution status or importing
it for implementation.

## Review focus

- Verify warnings precede mutation and preserve the original producer value.
- Confirm JSON remains machine-only and additive.
- Confirm status changes are reconciled with the completed dependency.
- Confirm sync differentiates true no-op from restamp-only mutation.
