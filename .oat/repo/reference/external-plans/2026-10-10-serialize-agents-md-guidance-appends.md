---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/items/BL-260928-serialize-concurrent-agents-md.md
oat_external_plan_commit: 0702df1305492a4886ee5d97be744b35a3633e55
oat_external_plan_main_commit: 0702df1305492a4886ee5d97be744b35a3633e55
oat_external_plan_date: '2026-10-10'
oat_execution_status: READY
oat_backlog_items:
  - BL-260928-serialize-concurrent-agents-md
oat_issue_url: null
created: '2026-10-11T00:17:45Z'
---

# Serialize concurrent AGENTS.md guidance appends

> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute directly when authorized, or optionally import with
> `oat-project-import-plan .oat/repo/reference/external-plans/2026-10-10-serialize-agents-md-guidance-appends.md`. Begin with the drift check.
>
> **Execution status: READY.** No unsatisfied hard dependency was found.

## Source and provenance

- Source: [BL-260928-serialize-concurrent-agents-md](../../pjm/backlog/items/BL-260928-serialize-concurrent-agents-md.md).
- Review: [Backlog and roadmap review](../../pjm/backlog/reviews/backlog-and-roadmap-review.md).
- Inspected HEAD: `0702df1305492a4886ee5d97be744b35a3633e55`.
- Compared fetched `origin/main` and merge-base: `0702df1305492a4886ee5d97be744b35a3633e55`; both equal the inspected HEAD.
- Planning date: 2026-10-10 (America/Chicago). `created` records UTC.
- `git status --porcelain` was empty before plan writes. Evidence below is
  file inspection, not a runtime reproduction. No source code or tests were changed.
- Item is open, unassigned, and had no external plan link. Searches across
  external plans and current project artifacts found no plan or active owner
  for this exact outcome. Open PR inventory was #357, #190, and #125;
  none claimed this outcome. Recheck ownership before execution.

## Outcome

Two cooperating OAT processes appending the same absent managed block to one
AGENTS.md target produce one block: one invocation reports `appended`, the
other reports `no-change`, and a rerun reports `no-change`. Serialization
covers the final decision and append while retaining existing file identity,
hard-link refusal, no-follow, and append-only protections. Preview stays
read-only and existing differing blocks still require a manual patch.

## Live evidence and current state

- `packages/cli/src/commands/shared/agents-md.ts:757-782` reads and classifies
  managed blocks and verifies current bytes. `upsertSectionsInternal` at
  `:785-845` subsequently appends the earlier `classification.absentBlocks`
  without a cross-process lock or marker re-read at the append boundary.
- `appendAbsentSections` at `:546-624` opens with the flags at `:499-503`, checks
  regular-file/device/inode/link count on the handle, and appends the payload.
  These defenses preserve bytes and identity but cannot stop two cooperating
  writers from appending the same previously absent marker pair.
- `agents-md.test.ts:625-885` covers real direct/symlink appends and concurrent
  user text; `:887-1104` covers refusal and partial-write paths. Existing
  `AgentsMdFileSystem` injection can coordinate real reads without a new
  production-only pause flag. No two-process same-block regression exists.
- `previewAgentsMdSections` at `:854` uses the read-only inspection path.
  Keep it outside lock acquisition and other mutations.
- This item was created on September 28, after the September 26 review, and
  is not considered in that review. Its explicit three acceptance criteria,
  current read/classify/append gap, and existing filesystem tests independently
  establish readiness. The source cites an archived review not present in this
  checkout; the plan relies on current source rather than that missing artifact.

## Dependencies

| Type                   | Dependency                                 | Required state                            | Current state                                                                            |
| ---------------------- | ------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Satisfied prerequisite | Append-only guidance and read-only preview | Existing shared helper contracts retained | Satisfied in `agents-md.ts`.                                                             |
| Soft coordination      | Guidance writers and preview consumers     | No concurrent edits to shared helper      | No same-outcome owner found; completed guidance work is not ownership of this follow-up. |

No unsatisfied hard dependency remains.

## Landing-event impact

| Event                                     | Affected | Files in common                                                  | Required update                                                |
| ----------------------------------------- | -------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Guidance or preview changes land          | Yes      | `commands/shared/agents-md.ts` and `.test.ts`                    | Re-anchor mutation/preview split and retain new safety checks. |
| PJM/init or tools guidance callers change | Possible | `commands/pjm/init.test.ts`, `commands/init/tools/index.test.ts` | Rerun consumer tests and verify action vocabulary.             |

## Drift check

```bash
git diff --stat 0702df1305492a4886ee5d97be744b35a3633e55..HEAD -- packages/cli/src/commands/shared/agents-md.ts packages/cli/src/commands/shared/agents-md.test.ts packages/cli/src/commands/pjm/init.ts packages/cli/src/commands/init/tools/index.ts
```

## Scope

Own `packages/cli/src/commands/shared/agents-md.ts` and its test file. A small
colocated private guidance-lock module or child-process test fixture is allowed
if it improves isolation. Keep lock logic specific to this target; do not
extract a repository-wide lock framework or import project-log command logic.
Do not change caller payloads, preview results, manual-patch ownership, managed
marker syntax, guidance contents, provider sync, or repair existing duplicates.

## Implementation steps

### 1. Prove the duplicate append with two cooperating processes

In `agents-md.test.ts`, launch two isolated child processes against a temp
repository containing an existing regular AGENTS.md and no requested block.
Each imports the real exported upsert function; wrap the existing filesystem
read dependency to pause after its initial absent-block inspection. Coordinate
readiness and release by IPC or explicit barrier files in the test's separate
temp control directory, never by sleeps. Both readers must reach the same
pre-lock observation before release. Assert the final marker count, ordered
results (`appended` plus `no-change`, order independent), unchanged original
prefix and inode, and a clean third invocation.

Use production filesystem operations beneath the barrier wrapper. Keep timeouts
and child cleanup bounded in `finally`; no child or barrier survives the test.
If a fixture is needed, place it under `commands/shared/__tests__/` and avoid
shipping it as a runtime asset.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/agents-md.test.ts`
— the new case fails against the baseline because two appends create duplicate
markers, not because child launch or imports fail.

### 2. Lock the target and recompute the authoritative decision

Add an advisory lock file beside the resolved target (for example
`${targetPath}.oat-guidance.lock`). Use the same canonical target for a direct
file and its permitted contained symlink alias. Acquire by exclusive creation;
never follow or truncate an existing lock. Use bounded asynchronous retries;
on contention exhaustion or unsafe lock state, return a clear `blocked` result
without writing guidance. Keep malformed/foreign locks fail-closed; do not
implement time-based lock stealing or automatic stale-lock deletion in this
bounded fix. Include actionable manual recovery after verifying the owner is
gone. Release only this invocation's owned lock, with identity/token checking,
in `finally` on all outcomes. Never remove another writer's lock.

Keep any pre-lock inspection advisory: a content-only change before lock acquisition
must trigger the locked re-read, not leak the old `assertPlanUnchanged` content
error instead of the required no-change result. Identity changes remain blocked.
The first inspection may remain optimistic to avoid lock writes for previews,
no-change results, and manual-only cases. Before any actual mutation, acquire
the target lock, validate the original target identity, re-read current content,
and classify markers again. Serialize missing-file creation through the same
canonical lock identity, preserving exclusive `wx` and appeared-file retry.
Accept a file created by another cooperating writer only via the existing
bounded replan rule; replacement of an originally existing target stays blocked.
The loser must observe the newly added block under lock and return `no-change`.
Hold the lock through the entire append/create and handle close.

Do not replace `appendAbsentSections` with a rewrite or rename. Retain
`O_WRONLY | O_APPEND | O_NOFOLLOW | O_NONBLOCK`, opened device/inode/link count
checks, prefix preservation, partial-write diagnostics, and manual refusal of
hard-linked targets. Preserve arbitrary concurrent user appends; the lock only
coordinates cooperating OAT writers.

**Verify:** rerun step 1; the barrier test passes and all existing safety cases
remain green. Removing the lock/recheck must turn the duplicate-block test red.

### 3. Verify lifecycle and consumer behavior

Extend existing cases only where new lock lifecycle behavior needs protection:
lock released after no-change/error; held/unsafe lock produces bounded refusal
with unchanged target; direct/symlink aliases contend on one lock identity;
read-only preview creates no lock. Use existing file-system injection for
errors and a real temp filesystem for identity and lock semantics. Run the
actual PJM/init and tools consumers without modifying their output contracts.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/agents-md.test.ts src/commands/pjm/init.test.ts src/commands/init/tools/index.test.ts`
— all pass; no temporary lock or child remains after settled calls.

## Test plan

Public boundaries: exported `upsertAgentsMdSection(s)` and
`previewAgentsMdSection(s)` as consumed by guidance callers. The oracle is one
literal ordered marker pair, the original file prefix/inode, `appended` plus
`no-change`, and a clean rerun. A second same-block writer is a distinct failure
from existing concurrent-user-text tests; a process-local mutex must fail the
new cross-process case.

Protects against: cross-process duplicate managed blocks; not already caught
because existing concurrency tests append unrelated user text inside one
invocation; covered by the bounded two-child barrier harness using real upsert
and filesystem behavior. Do not add a test-only exported lock primitive or
production pause flag. Retain the existing symlink, hard-link, inode, partial
write, and append-only tests as named safety keepers.

## Done criteria

- [ ] Deterministic baseline duplicate reproduced; fixed run gives one append and one no-change.
- [ ] Third invocation is no-change; target prefix/inode and all existing protections survive.
- [ ] Cross-process lock covers classification through write, and owned lock cleanup is bounded.
- [ ] Preview/manual-only paths remain read-only; blocked lock never permits an unlocked append.
- [ ] Focused consumer suites and repository gates pass; no unrelated refactoring.

## STOP conditions

Stop if current guidance work already owns this outcome or if the lock requires
an unapproved dependency or broader synchronization framework. Stop if preserving
inode/no-follow/hard-link defenses becomes impossible; do not trade them away
for idempotency. Do not repair pre-existing duplicate blocks or automatically
reap locks whose owner cannot be proven gone.

## Revalidation Before Execution

Recheck ownership, source status, and exact execution HEAD after integration,
after any guidance helper/caller landing, or after seven days. Confirm the
baseline two-child test still reaches the observed duplicate race. Reconcile
new safety guards before editing and preserve the authored provenance.

## Repository conventions and final verification

Read root `AGENTS.md` and `packages/cli/AGENTS.md` before implementation. Keep
logic domain-local and use same-directory relative imports or established
cross-directory aliases. Preserve JSON diagnostics and exit behavior. Do not
edit installed skills or provider views. Use Conventional Commits; this plan
alone does not authorize pushing, opening a PR, or merging.

Focused commands below use the existing CLI Vitest configuration. Run the full
CLI suite with `pnpm --filter @open-agent-toolkit/cli test`; then run the root
Definition of Done in its documented order, recording each exit code:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Fetch `origin/main` before version checks. Follow the existing lockstep release
contract when implementation changes public package content; coordinate its
five package manifests and lockfile with any integration owner instead of
independently bumping them in concurrent lanes. No skill bump is required for
these CLI-only fixes. Record cache replays honestly; focused `vitest run`
provides fresh execution evidence. Inject isolated `home` in new harnesses.
These commands are future implementation gates, **not planning-run results**.

At shipment, archive the source backlog item through the Backlog Lifecycle in
`.oat/repo/pjm/AGENTS.md`, in the same PR as the capability; this planning pass
leaves the item open and changes only its plan backlink and timestamp.
