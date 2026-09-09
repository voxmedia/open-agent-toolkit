---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/archived/BL-260906-fix-sync-apply-branch.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-fix-sync-apply-branch
oat_issue_url: null
created: '2026-09-08T21:19:08Z'
---

# Make `oat sync` report a failure summary instead of "No changes required." when a rejected collection leaves zero planned operations

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> PR #273 merged on 2026-09-08 without touching `packages/cli/src/commands/sync/**`,
> no open PR touches that directory, and the change is a three-branch reorder
> in one function plus one regression test.

## Outcome

`runSyncApply`'s human-output branch tests `summary.failed > 0` before it tests
`summary.plannedOperations === 0`, so an `oat sync` run that exits 1 always ends
with the failure summary and never with the sentence `No changes required.`.
The one reachable producer of that state — a `reject-collection` collection
plan, which is counted as a failure but is not a _planned_ operation — is pinned
by a regression test asserting both the exit code and the absence of the false
sentence. The intentional whole-run restamp-only suppression is preserved
unchanged: it is guarded on `failed === 0`, so it is unreachable on the failure
branch, and its three existing tests stay green.

## Source and live evidence

- Source backlog item:
  [BL-260906-fix-sync-apply-branch — Fix sync apply branch precedence when a rejected collection leaves zero planned operations](../../pjm/backlog/archived/BL-260906-fix-sync-apply-branch.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip, which is PR #273's merge commit. `HEAD` is that tip plus
  commits that touch only `.oat/repo/reference/external-plans/` and
  `.oat/repo/pjm/backlog/` (`git diff --name-only origin/main..HEAD` lists
  nothing else), so every code citation below is a citation of `origin/main`.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- Verified evidence:
  - `packages/cli/src/commands/sync/apply.ts:539-547` — the human-output branch
    chain tests the no-op arm first:

    ```ts
    if (summary.plannedOperations === 0) {
      context.logger.info(
        restampOnly
          ? '\nManifest version refreshed; no content changes required.'
          : '\nNo changes required.',
      );
    } else if (summary.failed > 0) {
      context.logger.warn('\nSync completed with partial failures.');
    } else {
      context.logger.success('\nSync applied successfully.');
    }
    ```

  - `packages/cli/src/commands/sync/apply.ts:527-530` — `restampOnly` is the
    conjunction of `summary.plannedOperations === 0`, `summary.failed === 0`,
    and `versionSkew.length > 0`. The `failed === 0` conjunct is load-bearing and is
    documented in the comment at `:516-526`, which already names this exact
    hazard ("a run can fail with `plannedOperations === 0`. That run is not
    restamp-only and must never be described as needing no content changes").
    The comment is correct; the branch order two lines later is not.
  - `packages/cli/src/commands/sync/apply.ts:557` —
    `process.exitCode = summary.failed > 0 ? 1 : 0`, so the exit code and the
    printed sentence already disagree today.
  - `packages/cli/src/commands/sync/sync.utils.ts:120-139` +
    `:12-17` — `countPlannedOperations` admits only the four
    `MUTATING_COLLECTION_ACTIONS` (`create-collection-link`,
    `adopt-collection-link`, `inherit-collection`, `detach-collection`), so a
    `reject-collection` entry contributes 0.
  - `packages/cli/src/engine/execute-plan.ts:981-984` — a collection result with
    status `rejected` is counted into `failed`, alongside `failed` and
    `partial`. `packages/cli/src/engine/execute-plan.ts:465-475` maps a
    `reject-collection` plan to status `rejected`. So
    `plannedOperations === 0 && failed === 1` is reachable in production, not
    only in the unit harness.
  - **Live end-to-end reproduction on the built CLI (`oat 0.2.66`,
    `packages/cli/dist` built from this `HEAD`; reproduced twice, by the
    drafting author on `0.2.65` and again by the reviewing author on
    `0.2.66`).** In a throwaway `mktemp -d`
    project: `git init`, one canonical skill under `.agents/skills/`,
    `oat init --scope project --no-project-guidance --no-hook`,
    `oat providers set --scope project --enabled claude`, then
    `mkdir .claude && ln -s <a foreign directory> .claude/skills`. Running
    `oat sync --scope project` produced exit code **1** and this output, whose
    last line is the defect:

    ```text
    Scope: project
    Core results
    No per-entry operations.

    Collection aliases
    - [project] claude/skill:reject-collection ownership=none .agents/skills -> .claude/skills
      reason: collection identity is foreign-target; preserve the provider collection without child mutation
      result: rejected — collection identity is foreign-target; preserve the provider collection without child mutation

    No changes required.
    ```

    The `foreign-target` proof reason comes from
    `packages/cli/src/engine/collection-sync.ts:187-194`, and
    `packages/cli/src/engine/compute-plan.ts:850-857` turns any non
    `real-directory` ineligible proof into `action: 'reject-collection'`
    (`const fallback = proof.reason === 'real-directory'` at `:850`,
    `action: fallback ? 'fallback-per-entry' : 'reject-collection'` at `:857`).

  - Existing tests that pin the surrounding contract, all in
    `packages/cli/src/commands/sync/index.test.ts`:
    `:1320` `apply idempotent: second run reports nothing to do` (asserts
    `'\nNo changes required.'` on a **successful** empty run),
    `:1340` `apply no-op: refreshes stale manifest oatVersion even when no files
changed` (the restamp-only positive case),
    `:1387` `apply: never calls a failed run restamp-only, even with zero
planned operations` (the reject-collection scaffolding: it builds exactly
    the failing state but asserts only that `Manifest version refreshed` is
    absent — it does **not** assert the exit code or the absence of
    `No changes required.`), and
    `:1408` `apply true no-op: keeps the plan body sentence when nothing was
restamped` (the negative control for the body-suffix suppression).
  - Helpers available for the new test:
    `createCollectionPlan('reject-collection')` at
    `packages/cli/src/commands/sync/index.test.ts:237-287`,
    `createManifest` at `:130`, `createHarness` at `:312`, and the
    `useRealSyncPlanFormatter` harness option at `:66`.
  - `packages/cli/src/commands/sync/index.test.ts:534-543` — the `describe`
    block's `beforeEach` saves and clears `process.exitCode` and its
    `afterEach` restores it, so an exit-code assertion in the new case cannot
    inherit a value from a neighbouring case and needs no per-test reset.

- Corrections to the source item's claims, verified live:
  - The item cites "`sync/apply.ts:539` ordering" — correct at this `HEAD`.
  - The item cites the restamp-only suppression at "`apply.ts:286-291`". At this
    `HEAD` the `restampOnly` parameter and its explanatory comment are at
    `packages/cli/src/commands/sync/apply.ts:284-291`, and the _whole-run_
    `restampOnly` computation the fix must not disturb is at `:527-530`. The
    suffix-stripping half of the suppression lives at `:236-251` around
    `EMPTY_PLAN_SUFFIX` (`:228`). Anchor on the symbols, not the line numbers.
  - The plan-lane brief cited scaffolding at `index.test.ts:1390` and `:1514`.
    `:1390` is inside the reject-collection test that begins at `:1387` — usable.
    **`:1514` is not scaffolding for this defect**: at this `HEAD` it is inside
    `dry-run --json no-op: exposes version skew structurally with no human
warning` (`:1505`), which never reaches the applied-output branch. The second
    useful anchor is `:1408`, the true-no-op negative control.

## Dependencies

| Type                | Dependency                                                                                                                  | Required state                                                                                                                                                   | Current state                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Satisfied adjacency | PR #273 (remote project management)                                                                                         | Must not touch `packages/cli/src/commands/sync/**`.                                                                                                              | Merged 2026-09-08 as `7d70ac307`; `git diff --stat c9f2e147a..7d70ac307 -- packages/cli/src/commands/sync packages/cli/src/engine/execute-plan.ts` is empty.                     |
| Soft adjacency      | PR #190 (ReviewPlan Stage A, draft), PR #125 (brainstorm companion)                                                         | No coordination required; verified via the paginated file lists that neither touches `packages/cli/src/commands/sync/**` or `packages/cli/src/engine/**`.        | Open. Neither touches this plan's write surfaces.                                                                                                                                |
| Soft adjacency      | [Converge copy-strategy skill projections](./2026-09-08-converge-copy-strategy-skill-projections.md)                        | May run in any group relative to this lane: it edits `packages/cli/src/engine/compute-plan.ts`, which this plan reads as reachability evidence and never writes. | Authored in the same batch. If it integrates first, the drift check prints a `compute-plan.ts` line; re-read `:850-857` and confirm the `reject-collection` mapping still holds. |
| Soft ordering       | Any wave-7 lane that also edits `packages/cli/src/commands/sync/apply.ts` or `packages/cli/src/commands/sync/index.test.ts` | Never in the same parallel group as this lane.                                                                                                                   | None. Of the seventeen `2026-09-08-*.md` plans, this is the only one that names `packages/cli/src/commands/sync/`.                                                               |
| Satisfied premise   | `reject-collection` is reachable in production                                                                              | The failure state must be producible without the unit harness.                                                                                                   | Satisfied — reproduced end-to-end on the built CLI at this `HEAD`, recorded above.                                                                                               |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                              | Affected | Files in common                                                                                          | Required update                                                                                                                                                      |
| ---------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #273 `feat: add provider-neutral remote project management` (merged 2026-09-08) | None     | None. Its 143 files include no `packages/cli/src/commands/sync/**` or `packages/cli/src/engine/**` path. | Already reflected: this plan's inspected `HEAD` sits on top of its merge commit.                                                                                     |
| PR #190 `ReviewPlan Stage A compatibility release` (draft) lands                   | None     | None. Its 217 files include no `packages/cli/src/commands/sync/**` path.                                 | No plan change.                                                                                                                                                      |
| PR #125 `oat-brainstorm visual companion` lands                                    | None     | None (26 files, all brainstorm/skill surfaces).                                                          | No plan change.                                                                                                                                                      |
| Sibling lane `converge-copy-strategy-skill-projections` integrates first           | Minor    | `packages/cli/src/engine/compute-plan.ts` (evidence only; this plan does not write it).                  | Re-read `compute-plan.ts:850-857` and confirm the `reject-collection` mapping survived; the drift-check line for that file is expected and is not a STOP on its own. |
| A predecessor wave-7 lane integrates ahead of this one                             | Minor    | `packages/cli/src/commands/sync/index.test.ts` if any lane adds a case there.                            | Re-run the drift check against the integrated execution `HEAD` and re-anchor the `it(` line numbers before editing the test file.                                    |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..origin/main -- packages/cli/src/commands/sync/apply.ts packages/cli/src/commands/sync/index.test.ts packages/cli/src/commands/sync/sync.utils.ts packages/cli/src/engine/execute-plan.ts packages/cli/src/engine/compute-plan.ts packages/cli/src/engine/collection-sync.ts packages/cli/src/ui/output.ts
```

Expected at the authored baseline: no output. A line for
`packages/cli/src/engine/compute-plan.ts` alone is expected once the sibling
`converge-copy-strategy-skill-projections` lane integrates; re-read `:850-857`
and continue if the `reject-collection` mapping is intact. If `apply.ts` changed, re-read
`:516-557` and confirm the branch chain and the `restampOnly` computation still
have the shape described in `## Current state` before editing. A material
mismatch is a STOP condition. When this plan runs as a wave lane, run the same
command against the exact execution `HEAD` after predecessor lanes integrate,
not only against the authored SHA.

## Repository conventions

- Build: `pnpm build` → all packages compile; required before `pnpm test:smoke`
  or `pnpm test:release`, which load `packages/cli/dist`.
- Typecheck: `pnpm type-check`.
- Focused test (from `packages/cli`):
  `pnpm exec vitest run src/commands/sync/index.test.ts` → all cases pass.
- Forced full test run (Turborepo replays cached results by default, and
  `pnpm test --force` does **not** force a re-run):
  `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root.
- Lint/format check (non-mutating): `pnpm check`, plus `pnpm lint` and
  `pnpm format` — neither of the latter two runs in CI today.
- Capture each gate's exit code explicitly
  (`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`); never derive success from a
  pipeline ending in a pager or filter.
- Implementation pattern: the branch chain and its explanatory comments in
  `packages/cli/src/commands/sync/apply.ts:516-547`; the test shape at
  `packages/cli/src/commands/sync/index.test.ts:1387-1406`.
- Skill versioning: one `metadata.version` bump per changed skill per PR
  (top-level `version:` is gone since CLI 0.2.65). **This plan changes no skill**,
  so no bump applies. If a step ever did touch `.agents/skills/*/SKILL.md`,
  locate every pin by searching the OLD VERSION LITERAL across
  `packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests`.
- `DR-260906-standing-claims-in-skills-name`: a standing claim written into a
  skill must name what makes it true. No skill prose changes here.
- `.oat/config.json` keys parity: not touched by this plan.
- Never run `oxfmt` over an OAT `state.md`; it mangles the frontmatter. No
  `state.md` is in scope here.
- **Lane mode (the default under the wave-7 execution program):** this plan runs
  as a lane in wave 7, in a worktree at `.worktrees/wave-7/<lane>`, with a root
  review after. In lane mode run the focused tests plus `pnpm check`,
  `pnpm type-check`, the forced `turbo run test`, `pnpm run check:skill-bumps`,
  `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. **Do not** edit
  lockstep release files and **do not** run `pnpm release:check-versions` or
  `pnpm release:validate`: the wave fan-in owns the single lockstep bump for the
  integrated wave and the full definition-of-done sequence. Only a standalone
  execution bumps the five public packages itself, above freshly fetched
  `origin/main`, and runs all eight AGENTS.md gates in order.
- Git/PR convention: do not push or open a PR unless the wave orchestrator
  instructs it.

## Scope

### In scope

- `packages/cli/src/commands/sync/apply.ts` — reorder the three-arm branch chain
  in `runSyncApply`'s non-JSON output block (currently `:539-547`) so the
  `summary.failed > 0` arm is tested first.
- `packages/cli/src/commands/sync/index.test.ts` — strengthen the existing
  reject-collection case at `:1387` (or add one immediately beside it) to pin
  the exit code and the absence of the false sentence.
- Lockstep release files
  (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never
  edited by this plan when it runs as a wave lane; the wave fan-in makes exactly
  one lockstep bump for the integrated wave and regenerates the version asset
  through the build. Only a standalone execution bumps them itself.

### Out of scope

- `packages/cli/src/commands/sync/apply.ts:236-251` (`EMPTY_PLAN_SUFFIX` and the
  body-suffix stripping) and `:284-291` (the `formatCoreResults` `restampOnly`
  parameter and its comment) — the intentional restamp-only suppression. Read
  them to confirm they still hold; do not change them.
- `packages/cli/src/commands/sync/apply.ts:527-530` — the `restampOnly`
  computation, including its `summary.failed === 0` conjunct. Leave it byte
  identical; the fix must work _because_ of it, not by weakening it.
- The wording `'\nSync completed with partial failures.'` — it is the existing
  failure summary and it is what the reordered chain will now print for the
  reject-collection case. Rewording it (for example to distinguish "all failed"
  from "partially failed") is a separate product decision and is not authorized
  here.
- The `--json` branch at `packages/cli/src/commands/sync/apply.ts:501-514` — the
  JSON payload already carries `summary.failed` and makes no false claim.
- `packages/cli/src/commands/sync/dry-run.ts` — dry runs print
  `No changes to apply.` and exit 0; unaffected and unchanged.
- `packages/cli/src/ui/output.ts:114` (`formatSyncPlan`'s own
  `No changes required.` heading suffix) — shared with dry-run and other
  callers. Verify it is not reached on any failing apply path (see
  `## Current state`); do not edit it.
- `packages/cli/src/engine/execute-plan.ts` and
  `packages/cli/src/engine/compute-plan.ts` — read as evidence for reachability;
  not edited.
- Whether `reject-collection` should exit 1 at all. It does today; this plan
  changes only what is printed.

## Current state

`runSyncApply` (`packages/cli/src/commands/sync/apply.ts:358`) aggregates a
`SyncSummary` through `buildSummary` (`:143-157`) whose `plannedOperations`
comes from `countPlannedOperations` and whose `failed` comes from the engine's
own tally. In the non-JSON branch it then computes `restampOnly` and prints,
in this order:

```ts
const restampOnly =
  summary.plannedOperations === 0 &&
  summary.failed === 0 &&
  versionSkew.length > 0;
context.logger.info(
  formatAppliedOutput(scopePlans, coreApplyEvidence, dependencies, restampOnly),
);
if (summary.plannedOperations === 0) {
  context.logger.info(
    restampOnly
      ? '\nManifest version refreshed; no content changes required.'
      : '\nNo changes required.',
  );
} else if (summary.failed > 0) {
  context.logger.warn('\nSync completed with partial failures.');
} else {
  context.logger.success('\nSync applied successfully.');
}
```

The three states the chain must distinguish are independent, and
`plannedOperations === 0` is not exclusive with `failed > 0`. Because the
`plannedOperations === 0` arm is tested first, the failure state falls into it
and prints the no-op sentence while `process.exitCode` is set to 1 at `:557`.

**Reachability, established exhaustively.** A run can reach
`plannedOperations === 0 && failed > 0` only through a collection result whose
status is `rejected`, `failed`, or `partial`
(`packages/cli/src/engine/execute-plan.ts:981-984`) that
`countPlannedOperations` does not count. Of the collection actions, all four in
`MUTATING_COLLECTION_ACTIONS` — including `detach-collection` — _are_ counted,
`fallback-per-entry` maps to status `fallback` (counted as skipped, not failed),
and only `reject-collection` maps to status `rejected` with no planned
operation. Per-entry and extension failures each imply at least one non-skip
planned operation. The pure restamp path calls `executeSyncPlan` with an empty
plan and no collections, which returns `failed: 0`. So `reject-collection` is
the single producer.

That matters for the body text as well as the trailing sentence:
`formatCoreResults` (`:230-251`) returns the early string
`'Core results\nNo per-entry operations.'` whenever
`(plan.collections?.length ?? 0) > 0`, so on every reachable failing path the
shared formatter's own `No changes required.` suffix is never emitted into the
plan body. Only the trailing sentence at `:543` is wrong, and only the branch
order needs to change.

## Implementation steps

### 1. Confirm the defect on the current tree before touching it

Reproduce the live control end to end so the fix has a documented red state.
Work entirely inside a directory created with `mktemp -d`; never delete a
variable path with `rm -rf`.

From a repository build (`pnpm build`), in a fresh `mktemp -d` scratch tree:
create `proj/` and `foreign/`; inside `proj/` run `git init`, write one
canonical skill at `.agents/skills/demo-skill/SKILL.md` with `name` and
`description` frontmatter, then run
`node <repo>/packages/cli/dist/index.js init --scope project
--no-project-guidance --no-hook`,
`node <repo>/packages/cli/dist/index.js providers set --scope project --enabled
claude`, `mkdir .claude`, and
`ln -s <scratch>/foreign .claude/skills`. Use an isolated `HOME` so the run
cannot read or write the operator's `~/.oat`.

**Verify:**
`node <repo>/packages/cli/dist/index.js sync --scope project > apply.log 2>&1;
echo "exit=$?"` → prints `exit=1`, and `apply.log` ends with the line
`No changes required.` and contains `result: rejected —`. Record both facts.
If the run exits 0, or the sentence is absent, STOP: the reachability premise
has changed.

### 2. Reorder the branch chain in `runSyncApply`

In `packages/cli/src/commands/sync/apply.ts`, change the chain at `:539-547` so
the failure arm is tested first:

```ts
if (summary.failed > 0) {
  context.logger.warn('\nSync completed with partial failures.');
} else if (summary.plannedOperations === 0) {
  context.logger.info(
    restampOnly
      ? '\nManifest version refreshed; no content changes required.'
      : '\nNo changes required.',
  );
} else {
  context.logger.success('\nSync applied successfully.');
}
```

Leave the `restampOnly` computation at `:527-530` and its comment at `:516-526`
byte identical — the `summary.failed === 0` conjunct now makes the
`restampOnly` ternary provably unreachable under failure, which is the property
the comment already asserts. Extend the comment by at most one sentence to
record that the branch order now enforces what the conjunct only guarded.
Do not touch `formatAppliedOutput`, `formatCoreResults`, or `EMPTY_PLAN_SUFFIX`.

**Verify:** `pnpm exec vitest run src/commands/sync/index.test.ts` from
`packages/cli` → all existing cases pass, including `:1320`, `:1340`, `:1387`,
and `:1408`.

### 3. Pin the fixed behavior in the reject-collection test

In `packages/cli/src/commands/sync/index.test.ts`, extend the case at `:1387`
(`apply: never calls a failed run restamp-only, even with zero planned
operations`) — or add a sibling case immediately after it — so it asserts all
four of:

- `process.exitCode` is `1`;
- the joined `capture.info` does **not** contain `No changes required.`
  (join before matching: the plan body is logged as one multi-line string, so
  element-wise array membership is blind to a sentence inside it — the existing
  comment at `:1380-1382` makes the same point);
- `capture.warn` contains `'\nSync completed with partial failures.'`;
- the existing assertions still hold (`Manifest version refreshed` absent,
  `capture.warn` contains the version-skew warning).

The suite's `beforeEach` at `:536-539` already clears `process.exitCode` and
its `afterEach` at `:541-543` restores it, so the exit-code assertion cannot
inherit a value from a neighbouring case; do not add a second reset.

**Verify:** `pnpm exec vitest run src/commands/sync/index.test.ts -t 'never
calls a failed run restamp-only'` from `packages/cli` → passes.

### 4. Prove the new assertions can fail (negative control, one per clause)

Revert only `apply.ts` to its pre-fix branch order (keep the new test), re-run
the focused test, and confirm it fails on the exit-code clause **and** on the
`No changes required.` clause — run it once with each clause temporarily
isolated if a single failure masks the other, so each clause is shown red on
its own. Then restore the fix.

Separately, neutralize the preserved suppression to prove the restamp-only
tests can still fail: temporarily drop the `summary.failed === 0` conjunct from
`:527-530`, confirm the reject-collection case turns red (it would now print
`Manifest version refreshed`), and restore it.

**Verify:** each neutralization produces a red run and the restored tree
produces a green one; record the exact command and failure message for each.

### 5. Re-run the live end-to-end control against the fixed build

Rebuild and repeat step 1's scratch reproduction.

**Verify:**
`pnpm build`, then in the scratch project
`node <repo>/packages/cli/dist/index.js sync --scope project > apply.log 2>&1;
echo "exit=$?"` → still prints `exit=1`; `apply.log` now ends with
`Sync completed with partial failures.` and contains no
`No changes required.` line.

### 6. Run the lane gates

**Verify (lane mode):** from the repository root, each with its exit code
captured separately —
`pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test
--force`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` → every command exits 0. Do not edit lockstep
release files and do not run `pnpm release:check-versions` or
`pnpm release:validate`. **Standalone mode only:** additionally bump the five
public packages above freshly fetched `origin/main` and run the eight AGENTS.md
gates in order.

## Test plan

- **Changed test:** `packages/cli/src/commands/sync/index.test.ts:1387`,
  `apply: never calls a failed run restamp-only, even with zero planned
operations`. Uses `createCollectionPlan('reject-collection')` with
  `executeResults: [{ applied: 0, failed: 1, skipped: 0 }]`, a stale manifest
  (`createManifest({ oatVersion: '0.0.1' })`) so `versionSkew` is non-empty, and
  `useRealSyncPlanFormatter: true`. New assertions: `process.exitCode` is `1`;
  `capture.info.join('\n')` does not contain `No changes required.`;
  `capture.warn` contains `'\nSync completed with partial failures.'`.
- **Structural pattern:** the neighbouring restamp cases at `:1340` and `:1408`,
  which already use `useRealSyncPlanFormatter` and the joined-`capture.info`
  matching idiom.
- **Regression proved:** an exit-1 sync run claiming `No changes required.`
  (the exact wording of the item's first acceptance criterion), and the
  branch-precedence bug that produces it.
- **Red-then-green negative control:** with `apply.ts` at its pre-fix branch
  order the new assertions fail — pinned per clause in step 4, and independently
  reproduced end to end on the built CLI in step 1 (exit 1 with
  `No changes required.` in the output). With the fix applied both go green.
- **Preserved-behavior control:** `:1320` (successful empty run still prints
  `No changes required.`), `:1340` (restamp-only run still prints
  `Manifest version refreshed; no content changes required.` and exits 0), and
  `:1408` (true no-op still keeps the plan body sentence) must pass unchanged,
  with no edit to their assertions. Step 4's second neutralization proves the
  restamp guard itself is still load-bearing.
- **Focused command:** from `packages/cli`,
  `pnpm exec vitest run src/commands/sync/index.test.ts` → all cases pass.
- **Full relevant suite:** `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root → passes without a cache replay (do not accept a run
  reporting `cache hit, replaying logs` or `>>> FULL TURBO` as evidence).

## Done criteria

- [ ] A rejected collection that leaves zero planned operations exits 1, prints
      `Sync completed with partial failures.`, and never prints
      `No changes required.` — pinned by the test at
      `packages/cli/src/commands/sync/index.test.ts:1387` and reproduced
      end to end on the built CLI.
- [ ] `git diff` for `packages/cli/src/commands/sync/apply.ts` shows only the
      reorder of the three-arm chain plus at most one added comment sentence;
      `:236-251`, `:284-291`, and `:527-530` are unchanged.
- [ ] The restamp-only tests at `index.test.ts:1340` and `:1408`, and the
      successful-no-op test at `:1320`, pass with unmodified assertions.
- [ ] Step 4's negative controls are recorded: each new clause shown red on the
      pre-fix branch order, and the reject-collection case shown red when the
      `summary.failed === 0` conjunct is removed.
- [ ] Lane mode: `pnpm check`, `pnpm type-check`,
      `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
      `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each exit 0 with the exit code captured
      explicitly, and no lockstep release file is edited. Standalone mode: one
      lockstep bump and all eight AGENTS.md gates pass in order.
- [ ] `git status --short` contains no unexplained or out-of-scope files, and no
      scratch directory was created inside the repository.

## STOP conditions

Stop and report instead of improvising when:

- live state materially contradicts the verified evidence or drift assumptions —
  in particular, if `apply.ts`'s branch chain, the `restampOnly` computation, or
  the `MUTATING_COLLECTION_ACTIONS` set no longer has the shape recorded in
  `## Current state`;
- step 1's live reproduction does not produce exit 1 with `No changes required.`
  (the reachability premise this plan rests on would be false);
- fixing the trailing sentence would require editing `formatCoreResults`,
  `EMPTY_PLAN_SUFFIX`, `formatSyncPlan`, or the `restampOnly` computation — that
  crosses an out-of-scope boundary and means a second, unanalyzed producer of
  `plannedOperations === 0 && failed > 0` exists;
- any of `index.test.ts:1320`, `:1340`, or `:1408` fails, or would need its
  assertions relaxed, after the reorder;
- **the weaker-anywhere rule fires.** This plan changes a reporting branch, not
  a validator, but the same rule binds: any input, state, or run that the
  pre-fix tree rejected (non-zero exit, warning emitted, test failing) and that
  the post-fix tree accepts is a Critical finding, whatever the intent. In
  particular the exit code must remain `summary.failed > 0 ? 1 : 0` and no run
  that warned before may fall silent after;
- a named verification gate fails twice after one bounded correction;
- the work would expose, copy, or rotate a credential without explicit
  authority.

## Revalidation Before Execution

**Correction applied 2026-09-09 (wave-7 p14 execution; no requirement change):** (1) Step 4 / Done criterion 4's exit-code negative control is unsatisfiable as written — `process.exitCode = summary.failed > 0 ? 1 : 0` sits at `apply.ts:557`, outside the reordered chain, and already exits 1 pre-fix (this plan's own `## Current state` says so); the exit-code assertion is a preserved invariant, proven able to fail by neutralizing `:557` (`expected +0 to be 1`), not a clause the reorder flips. (2) Step 4's second neutralization (dropping the `failed === 0` conjunct) leaves the suite green post-fix, because the failure arm now wins before the `restampOnly` ternary is evaluated — the conjunct is retained defense-in-depth; a `--scope all` assertion (see 3) is the control that would catch its removal. (3) The `## Current state` claim that `EMPTY_PLAN_SUFFIX` is never emitted into the plan body on a failing path is single-scope reasoning and false for `oat sync --scope all`: `formatCoreResults` runs per scope while `restampOnly` is a whole-run value, so a sibling empty scope still prints `No changes required.` in its plan body (base: two occurrences and no warning; head: one occurrence plus the partial-failures warning — strictly better, not a regression). Fixing that body suffix means editing symbols this plan declares out of scope (a STOP), so it is a follow-up filed at closeout together with the `--scope all` pin. (4) The lane extended the existing `:1387` case rather than adding a new one.

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 or PR #125 lands, or the sibling `converge-copy-strategy` lane
  integrates (apply the `## Landing-event impact` table; none is expected to
  affect this plan);
- a dependency named in `## Dependencies` changes state;
- the `it(` line anchors in `packages/cli/src/commands/sync/index.test.ts`
  (`:1320`, `:1340`, `:1387`, `:1408`) or the branch anchors in
  `packages/cli/src/commands/sync/apply.ts` (`:236-251`, `:284-291`,
  `:516-557`) shift;
- the live end-to-end reproduction in step 1 cannot be reproduced.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`.

## Review focus

- That the reorder is _only_ a reorder: the three printed strings, the
  `restampOnly` ternary, and `process.exitCode` are unchanged.
- That the `summary.failed === 0` conjunct at `:527-530` survives. Removing it
  as now-redundant would reintroduce the defect the moment a fourth branch is
  added; step 4's second neutralization exists to prove it is still load-bearing.
- That the new test's exit-code assertion is not satisfied by leakage from a
  previous case in the same file.
- That the negative controls were genuinely run and recorded, not asserted — a
  test that cannot fail is the failure mode this repository has shipped twice.
- Deferred on purpose: rewording `Sync completed with partial failures.` for a
  run in which nothing succeeded, and the question of whether
  `reject-collection` should exit 1 at all.

## Execution record (2026-09-09, wave 7)

Executed as wave-7 p14 (PR #286 `wave-7-execution`, CLI 0.2.67; lane commit(s) `18ea51bb3` → integration `c4dbac3f3`): a rejected `oat sync` apply no longer ends with "No changes required.": the failure arm wins before the restamp-only ternary, so the run prints `Sync completed with partial failures.` (exit 1 unchanged). Verification: forced check/type-check/cli test `Cached: 0`; check:skill-bumps; lint; format; validate-skills; premise reproduced byte-for-byte; controls incl. a substitute exit-code control; Codex: no findings; root review PASS with findings (0/1I/2M/1m — all plan-artifact or deferred: a multi-scope body suffix the plan forbids fixing here; the unsatisfiable exit-code control; the conjunct's missing pin). Deviations: none in code; three plan corrections recorded by a dated entry; the `--scope all` body suffix and its pin deferred to a closeout follow-up.
