---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260826-deterministic-smoke-tier-leaks.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260826-deterministic-smoke-tier-leaks
oat_issue_url: null
created: '2026-08-31T00:01:21Z'
---

# Journal deterministic smoke worktrees before creation

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** Close the demonstrated create-before-journal
> transaction gap. Cleanup remains manifest-bound and fail-closed: never prune
> worktrees or branches by `smoke-*` name, age, ancestry, or path prefix alone.

## Outcome

Before the deterministic provider creates a nested phase worktree, its exact
branch, worktree path, marker path, baseline, shared Git directory, and run
identity are durably reserved in the run manifest. Successful creation
finalizes that reservation.
If interruption occurs between those operations, existing signal/error cleanup
can safely reconcile the reserved resource using corroborated Git and marker
evidence instead of refusing it as unjournaled.

## Source and live evidence

- Source backlog item:
  [BL-260826-deterministic-smoke-tier-leaks — Deterministic smoke tier leaks worktrees](../../pjm/backlog/items/BL-260826-deterministic-smoke-tier-leaks.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `tools/smoke/deterministic/provider.mjs:110-132` runs `git worktree add` at
    lines 114-126 and calls `registerNestedSmokeResource` only afterward at
    lines 127-131. Interruption in that interval leaves an unjournaled child.
  - `tools/smoke/runner/journal.mjs:383-600` validates an already-created child
    and appends only the completed ownership entry.
  - `tools/smoke/runner/cleanup.mjs:769-795` deliberately refuses any
    run-descendant worktree or branch absent from the journal.
  - `tools/smoke/runner/cleanup.test.mjs:265-301` contract-tests that refusal;
    weakening it into prefix or ancestry cleanup would regress containment.
  - `tools/smoke/deterministic/deterministic.test.mjs:32-70` provisions against
    the real repository and cleans in `finally`, so a killed process can leave
    Git state even though normal teardown is correct.
  - `tools/smoke/runner/run-smoke.mjs:218-369` already requests subprocess
    quiescence, recovery collection, and manifest cleanup on signal/error.
    `run-smoke.test.mjs:108-180` verifies that ordering.
  - [PR #215](https://github.com/voxmedia/open-agent-toolkit/pull/215) and
    [the existing bounded-signal-wait plan](./2026-08-19-bound-smoke-cleanup-signal-wait.md)
    addressed a test-child wait, not this production ownership transaction.
  - `apps/oat-docs/docs/contributing/smoke-testing.md:229-255` and
    `tools/smoke/CONTRACT.md:293-307` explicitly require manifest-scoped,
    corroborated, fail-closed cleanup.

## Dependencies

| Type             | Dependency                               | Required state                                                                                   | Current state                        |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Soft evidence    | PR #215 / bounded signal-wait work       | Preserve bounded child reaping and signal ordering; do not reopen that test-harness scope.       | Delivered on baseline.               |
| Safety invariant | Manifest-scoped smoke ownership contract | Reservation and cleanup must retain exact ownership corroboration and refusal on contradictions. | Enforced by current code/tests/docs. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                         | Required update                                                        |
| ------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections. | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted. |
| `review-plan-workflow` (draft PR #190) merges                                        | No               | None.                                                   | None.                                                                  |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- tools/smoke/deterministic/deterministic.test.mjs tools/smoke/deterministic/provider.mjs tools/smoke/runner/journal.mjs tools/smoke/runner/journal.test.mjs tools/smoke/runner/cleanup.mjs tools/smoke/runner/cleanup.test.mjs tools/smoke/runner/provision.mjs tools/smoke/runner/provision.test.mjs tools/smoke/runner/run-smoke.mjs tools/smoke/runner/run-smoke.test.mjs tools/smoke/CONTRACT.md apps/oat-docs/docs/contributing/smoke-testing.md
```

If ownership schema, deterministic phase creation, or cleanup corroboration
changed, repeat the create-to-register transaction trace before editing.

## Repository conventions

- Smoke cleanup authority comes only from a validated run manifest plus exact
  Git/marker corroboration. Names, timestamps, and ancestry are insufficient.
- Keep file writes atomic under the existing manifest lock.
- Tests that create Git state must use temporary repositories and clean only
  their fixture-owned resources.
- Run `pnpm lint && pnpm format` because `tools/smoke` is touched.
- Docs changes are bundled assets and therefore shipped functionality; the
  release bookkeeping they require is mode-dependent (see step 6): the wave
  fan-in owns the lockstep bump, and only a standalone execution bumps the five
  public packages and `pnpm-lock.yaml` itself.
- Run focused smoke tests independently, then the mode-appropriate gates.
- Do not remove existing leaked worktrees or branches as part of implementation.
- Do not push or open a PR unless instructed.

## Scope

### In scope

- `tools/smoke/runner/journal.mjs` — durable reservation and finalization API,
  atomic updates, explicit journal schema compatibility.
- `tools/smoke/deterministic/provider.mjs` — reserve before `git worktree add`,
  finalize after current marker/worktree verification.
- `tools/smoke/runner/cleanup.mjs` — safe reconciliation of reserved entries.
- `tools/smoke/runner/provision.mjs` — the production manifest emitter; its
  `ownershipJournal` initializer (`:243-246`, currently `schemaVersion: 1`)
  must emit the new schema for new manifests.
- `tools/smoke/runner/provision.test.mjs` — the manifest-creation assertion
  (`:291-294`, currently `deepEqual` against `schemaVersion: 1`) plus a new
  production-manifest transaction test.
- Journal, cleanup, deterministic, provision, and run-smoke focused tests as
  needed to prove interruption boundaries.
- Smoke contract/docs updates.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- Deleting any currently leaked branch or worktree.
- Startup pruning by `smoke-automated-*`, path prefix, age, or ancestry.
- Guessing whether another run is stale or active without an ownership lease.
- Changing outer worktree provisioning, signal delivery, or `--keep`
  semantics. Provider behavior is likewise unchanged, with one explicit
  exception: the deterministic provider's reserve-then-create ordering in
  step 3 is permitted; no other provider behavior may change.
- Generalizing reservation to every non-deterministic worktree creator without
  a separately verified transaction trace.

## Current state

The runner's signal path is sound once a resource is journaled. The deterministic
provider violates that prerequisite by creating Git state before its atomic
manifest registration. Cleanup correctly refuses the result because deleting a
run-descendant resource without journal ownership would be unsafe. The repair
must move durable intent before creation and preserve refusal for all resources
that lack such intent.

Use an explicit two-state journal entry:

- `reserved`: exact intended branch/worktree/marker paths, baseline, common-Git,
  and run identity are durable, but creation has not been corroborated;
- `registered`: the existing marker, branch, path, HEAD ancestry, and common-Git
  checks have succeeded.

Emit a new journal schema version for new manifests and retain read support for
schema v1 by interpreting its existing entries as `registered`. The production
emitter is `provision.mjs:243-246`, which today initializes
`ownershipJournal: { resources: [], schemaVersion: 1 }`; the reader is
`validateJournal` in `journal.mjs:356-365`, which today rejects anything but
`schemaVersion === 1`. Compatibility contract: the new writer emits the new
version; the reader accepts both versions, treats every v1 entry as
`registered`, and never rewrites a v1 manifest's version in place.

## Implementation steps

### 1. Add an atomic reservation primitive

In `journal.mjs`, add `reserveNestedSmokeResource` accepting the manifest path,
intended branch, normalized absolute worktree and marker paths, and expected
baseline. Require the marker path to be the contract-owned marker location
inside the intended child worktree.
Under the existing manifest lock, validate ready provisioning, run identity,
shared Git directory, containment beneath the manifest run directory, safe
branch syntax, and path/branch uniqueness. Persist a `reserved` entry before
returning.

Define the new schema explicitly. Update the `ownershipJournal` initializer in
`provision.mjs:243-246` so new manifests emit it, and widen `validateJournal`
(`journal.mjs:356-365`) so v1 manifests remain readable and their entries
behave as already registered. Update the `provision.test.mjs:291-294`
`deepEqual` to the new emitted shape. A reservation may be idempotently
replayed only when every ownership field matches.

**Verify:** concurrent duplicate/conflicting reservations serialize correctly,
no temporary lock/write file remains, `node --test tools/smoke/runner/provision.test.mjs`
proves a freshly provisioned manifest carries the new schema, and a v1
fixture manifest still loads.

### 2. Finalize an existing reservation after creation

Update `registerNestedSmokeResource` so a matching reservation is finalized
only after all current marker, worktree registration, branch, HEAD ancestry,
and common-Git checks pass. Preserve backward-compatible direct registration
for current non-deterministic callers until their creation transactions are
separately migrated.

A mismatch between reservation and materialized state must refuse without
rewriting intent. Do not derive authority from the generated branch name.

**Verify:** current journal race and already-removed-worktree tests stay green;
add reservation-finalization and mismatch cases.

### 3. Reserve before deterministic worktree creation

In `createPhaseWorktree`, compute branch/path once, reserve them, then invoke
`git worktree add`, then finalize through the updated registration helper. Keep
hook isolation and baseline selection unchanged.

Do not catch an interruption merely to delete paths directly. Let the existing
runner cleanup consume the manifest and exercise the same ownership checks as
all other recovery.

**Verify:** instrumented tests prove reservation is persisted before the Git
call and finalization occurs only after successful creation.

### 4. Reconcile reserved entries without weakening containment

Teach cleanup to evaluate each `reserved` entry:

- branch and worktree both absent: treat as never materialized and remove only
  the manifest reservation during normal run cleanup;
- exact branch/worktree registration present: require expected baseline
  ancestry, common Git directory, and matching run marker before removal;
- branch present without worktree: delete only when its tip and marker-backed
  baseline exactly corroborate the reservation;
- path without exact Git registration, mismatched branch/HEAD/common Git,
  missing marker, or any contradiction: fail closed and leave it untouched.

Retain the current refusal for every unjournaled run-descendant resource.

**Verify:** a prefix-matching unrelated worktree and an unjournaled descendant
both remain untouched and produce refusal.

### 5. Prove all interruption windows with isolated fixtures

Add focused journal/cleanup transaction tests for interruption:

1. after reservation but before `git worktree add`;
2. after `git worktree add` but before final registration; and
3. after final registration.

For each, run cleanup and assert exact branch/path/manifest results. Add
contradiction cases and v1-read compatibility. Build the new failure-injection
fixtures in temporary Git repositories or use dependency-injected provider
spies; never inspect or clean the developer's pre-existing worktrees. Run the
existing deterministic integration suite afterward as an unchanged end-to-end
control.

Add one end-to-end transaction test that starts from a manifest created by the
production emitter (`provisionSmoke` in `provision.mjs:311`, in a temporary
repository) rather than a hand-built fixture, and drives it through reserve,
`git worktree add`, finalize, and an interrupted cleanup. A hand-built journal
fixture can encode a schema the emitter never writes; this test proves the
production shape round-trips.

**Verify:** `node --test tools/smoke/runner/journal.test.mjs tools/smoke/runner/cleanup.test.mjs tools/smoke/runner/provision.test.mjs tools/smoke/deterministic/deterministic.test.mjs`
exits zero without leaving fixture branches or worktrees.

### 6. Update ownership documentation and complete gates

Update `tools/smoke/CONTRACT.md` and the smoke-testing docs to explain reserved
versus registered ownership, v1 compatibility, and why automatic prefix/stale
pruning remains prohibited. Do not claim the code can distinguish stale from
active runs without a lease.

**Lane mode (default under the execution program):** bump changed skill
`version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` where a pin exists; run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint` and `pnpm format`
because this plan changes `tools/smoke`. Do not edit
lockstep release files or run `pnpm release:check-versions` /
`pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. **Standalone mode only:** bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md gates
in order.
Run the focused smoke tests independently first.

## Test plan

- Atomic/idempotent/conflicting reservation tests.
- Reservation-to-registration validation and schema-v1 compatibility.
- Three interruption-window cleanup cases in temporary Git repositories.
- Refusal controls for unjournaled, prefix-matching, divergent, missing-marker,
  wrong-common-Git, and path-only state.
- Production-emitter manifest through reserve, create, finalize, and
  interrupted cleanup.
- Existing signal ordering, deterministic tier, and complete smoke suite.
- Lint/format and docs gates, then the lane-mode or standalone gate set from
  step 6.

## Done criteria

- [ ] Deterministic phase intent is durable before `git worktree add`.
- [ ] Registration finalizes only a matching, fully corroborated reservation.
- [ ] Cleanup safely handles all three interruption windows.
- [ ] Existing schema-v1 manifests remain recoverable, and the production
      emitter writes the new schema.
- [ ] Unjournaled or contradictory resources still fail closed.
- [ ] No name-, age-, ancestry-, or prefix-only cleanup exists.
- [ ] No existing leaked developer resource is modified.
- [ ] Focused smoke tests pass.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- safe cleanup would require deciding stale versus active without a lease;
- a reserved resource cannot be corroborated by exact manifest, Git, and marker
  identity;
- compatibility requires treating a v1 unjournaled resource as owned;
- a test would create or delete state in the developer's real repository;
- implementation expands to unrelated worktree creators or signal semantics;
- an existing leaked resource would be modified; or
- a named verification gate fails twice after one bounded correction.

## Execution record (2026-09-06, wave 3)

Executed as wave-3 p02 (PR wave-3-execution): reservation before `git worktree add`, reserved-origin invariants re-derived in cleanup, tip re-read before `git branch --delete --force`, `reservedAt` required for schema-v2 reserved entries; the dedicated deletion-safety review ran sixteen adversarial probes (all refuse) and required the probe→`worktree add -b` window to be documented honestly in code, CONTRACT.md, and a pinning test (a foreign branch created in that window at the exact reserved baseline is deleted; no sound Git discriminator exists). Direct registration keeps its looser containment for `scripts/worktree/init.sh`. Follow-ups: project reservation state into the evidence bundle; run `scripts/worktree/init.test.mjs` under a gate. Sync convention (program rule from wave 3): where this plan says `oat sync --scope all`, lanes run `pnpm run cli -- sync --scope project`; `--scope all` also rewrites the operator's user-scope provider views and manifest and is operator-only.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, PR #215, the
bounded signal-wait plan, deterministic creation, journal/cleanup schema and
tests, run-smoke signal ordering, and smoke contract/docs when main advances
materially from `49aeb5075971180b48c131bbd2b21b82d455bfc9`, any ownership
surface changes, another PR adds pre-creation intent, or the transaction gap
cannot be reproduced. Refresh or supersede stale schema decisions before work.

## Review focus

- Audit every new cleanup path as an ownership/security boundary.
- Confirm reservation is durable before the first Git mutation.
- Confirm v1 compatibility does not manufacture ownership.
- Attack path, branch, baseline, marker, common-Git, and concurrency mismatches.
- Reject startup/prefix pruning and any test touching real developer residue.
