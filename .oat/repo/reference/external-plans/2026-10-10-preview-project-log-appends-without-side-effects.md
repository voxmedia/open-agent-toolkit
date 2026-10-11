---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/items/BL-260927-add-a-side-effect-free-dry-run.md
oat_external_plan_commit: 0702df1305492a4886ee5d97be744b35a3633e55
oat_external_plan_main_commit: 0702df1305492a4886ee5d97be744b35a3633e55
oat_external_plan_date: '2026-10-10'
oat_execution_status: READY
oat_backlog_items:
  - BL-260927-add-a-side-effect-free-dry-run
oat_issue_url: null
created: '2026-10-11T00:17:45Z'
---

# Preview project-log appends without filesystem or Git side effects

> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute directly when authorized, or optionally import with
> `oat-project-import-plan .oat/repo/reference/external-plans/2026-10-10-preview-project-log-appends-without-side-effects.md`. Begin with the drift check.
>
> **Execution status: READY.** No unsatisfied hard dependency was found.

## Source and provenance

- Source: [BL-260927-add-a-side-effect-free-dry-run](../../pjm/backlog/items/BL-260927-add-a-side-effect-free-dry-run.md).
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

`oat project log append --dry-run` validates the proposed entry and its target,
including asset/CLI compatibility and sealed-state rules, and returns a clear
preview without writing a log, lock, receipt, config, Git index, or commit.
Failures use the same diagnostic paths and non-zero exits as append validation.
A successful preview is advisory current-state validation, not a reservation or
a promise about later filesystem permissions, disk space, hooks, or other writers.

## Live evidence and current state

- Source issue [#314](https://github.com/voxmedia/open-agent-toolkit/issues/314)
  is OPEN. Its triage comment chooses this backlog's dry-run direction over the
  issue's alternative of expanding `log check`; do not implement both.
- `packages/cli/src/commands/project/log/append.ts:1963-1995` has no dry-run flag.
  The option/input types at `:1070` and `:1176` likewise omit it.
- `appendProjectLog` at `:1510-1520` acquires `withProjectLogLock` before doing
  validation. Lock acquisition at `:383-415` may mkdir and create/reclaim lock
  files. Entering this path and then suppressing `writeLog` is not read-only.
- `appendLockedProjectLog` at `:1523-1672` owns config skip, grammar,
  idempotency, ambiguity and seal validation, then resolves assets only for a
  missing log and writes/ appends. Existing logs do not currently resolve assets.
- `runAppendCommand` at `:1842-1869` validates a gate receipt for commit recovery;
  `:1903-1919` commits and removes a settled receipt. Dry-run must retain
  applicable receipt validation while bypassing all finalization writes.
- `packages/cli/src/fs/assets.ts:181-234` checks the bundle and produces the
  real CLI/assets mismatch diagnostic. Reuse that resolver, not a new version
  comparator. It reads bundle metadata and required directories.
- `append.test.ts:34-122` supplies a real temp-project command harness; the
  file also covers idempotency, sealing, actual Git commits, and receipt recovery.
- The September 26-labelled review explicitly contains this September 27 item
  at `:136` and its low-effort test matrix. Record it as explicitly covered,
  while noting the header/item chronology inconsistency. Current criteria are
  independently verified rather than inferred from the review date.
- [CLI-owned log mutations](../decisions/DR-260718-cli-owned-log-mutations.md)
  centralizes validation; [automatic first-append creation](../decisions/DR-260718-automatic-create-on-first.md)
  requires no artifact before an actual append and preserves writes to existing
  logs after config disables auto-creation.

## Dependencies

| Type                   | Dependency                                                        | Required state                                          | Current state                                                       |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| Satisfied prerequisite | Existing append validation, idempotency, seal and assets resolver | Preserve established contracts                          | Satisfied in inspected code.                                        |
| Soft adjacency         | Wave-7 polish or any log append edit                              | Serialize edits of `project/log/append.ts`              | Old review records an overlap; no current same-outcome owner found. |
| Soft integration       | Gate receipt consumers                                            | Preserve append result union and finalization semantics | Existing call sites rely on current mutation outcomes.              |

No unsatisfied hard dependency remains. Earlier plans for completion seals and
index-lock retry address distinct outcomes; they do not own this dry-run flag.

## Landing-event impact

| Event                                 | Affected | Files in common                               | Required update                                                      |
| ------------------------------------- | -------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Project-log or receipt changes land   | Yes      | `project/log/append.ts`, `.test.ts`           | Recheck validation ordering, replay semantics, and every write sink. |
| Assets compatibility changes land     | Yes      | `fs/assets.ts`                                | Use the updated real resolver and expected categorical diagnostic.   |
| Documentation navigation changes land | Possible | `workflows/projects/execution/project-log.md` | Re-anchor the append usage section; preserve existing links.         |

## Drift check

```bash
git diff --stat 0702df1305492a4886ee5d97be744b35a3633e55..HEAD -- packages/cli/src/commands/project/log packages/cli/src/fs/assets.ts packages/cli/src/commands/project/log/index.ts apps/oat-docs/docs/workflows/projects/execution/project-log.md
```

## Scope and compatibility decisions

Own `commands/project/log/append.ts`, `append.test.ts`, and the existing
`apps/oat-docs/docs/workflows/projects/execution/project-log.md` usage page.
Registration in `project/log/index.ts` may change only if propagation requires
it. Read `fs/assets.ts` and `assets.test.ts`; do not redesign their contract.

Use a separate preview result/API or internal preparation result so existing
`ProjectLogAppendResult` consumers do not acquire a fictitious `appended`
result or a new mandatory status variant. CLI success can report
`status: 'dry-run'` plus `wouldAppend`/`wouldCreate` and the predicted target;
text output must say no changes were made. A no-op replay or disabled missing
log should remain recognizable in preview output.

For asset parity, share real resolver validation for append-eligible entries
in both modes, including existing unsealed logs. This intentionally detects a
broken CLI/assets installation before a new append instead of only at first
log creation. Keep disabled missing-log and recognized replay short-circuits
unchanged: they would not append. Preserve validation ordering for grammar,
malformed logs, sealed failures, replay recognition, and receipts so preview
and mutation report the same relevant failure. Template loading/instantiation
remains necessary only for a would-create case, and must occur in memory.

`--dry-run --commit` is a read-only preview: validate any existing recovery
receipt exactly as normal commit mode does, but do not commit, stage, delete a
receipt, or create any lock. It does not promise commit/hook success. Keep
`log check`, seal grammar, config semantics, journal retention, gate recovery,
and lifecycle skills outside scope.

## Implementation steps

### 1. Add command-boundary acceptance cases

Extend the existing temp-repository harness in `append.test.ts`. Add valid
missing-log and existing-log previews; real asset mismatch; sealed-log refusal;
and a `--dry-run --commit` receipt/replay case. Feed the same command options
through the real Commander command. Snapshot file paths and bytes (including
ignored project-local artifacts), Git HEAD, index bytes when present, and
receipt bytes before/after. Assert unchanged values and no log created.
Use existing injected write/append dependencies as tripwires for attempted
writes as well: final equality alone would miss write-then-restore behavior.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/append.test.ts`
— new command tests initially fail because `--dry-run` is unsupported; after
wiring the flag, ensure negative controls specifically detect the original
lock/write path rather than just argument parsing.

### 2. Share preparation and branch before all mutations

Factor current validation into a read-only preparation routine in `append.ts`.
It resolves project/config, reads the current log, validates entry and key,
checks ambiguity/seal/replay, resolves compatible assets for eligible entries,
and, if needed, prepares and validates the template in memory. Return enough
information to report preview without exposing test-only internals.

The real append must still acquire its existing required lock first and run
fresh preparation inside that critical section. Never reuse a stale pre-lock
preview to mutate. Preview runs preparation without acquiring, reclaiming, or
releasing any project-log lock. Keep mutation writes behind a single explicit
normal-append branch. Use a read-only path for existing receipt validation;
make commit and receipt deletion unreachable for dry-run, including replay.

Register `--dry-run`, propagate it explicitly, retain stdin handling, and map
shared validation errors through the existing sealed/error diagnostics. Do
not use mutate-and-rollback, temp logs, or disposable commits to simulate it.

**Verify:** rerun step 1; valid previews exit 0 with explicit preview results;
asset mismatch and sealed entry exit non-zero, matching real append diagnostics
against equivalent fresh fixture states. Existing normal append cases pass.

### 3. Prove parity and document the probe

Extend table-driven boundary cases only for uncovered validation parity:
invalid judgment type/scope, structural grammar, ambiguous log, malformed
first-log template, disabled missing log, and recognized idempotent replay on
a sealed log. Use the real resolver with a temporary bundle mismatch fixture
following `fs/assets.test.ts`; do not mock an internal resolver to throw the
very error the test purports to prove. Keep fixture metadata independent of
the append implementation and route it through the existing resolver override.
A matched-version valid bundle is the acceptance control.

Document one copyable append command with `--dry-run` on the existing project-log
page, explain no writes/locks/commit and the current-state limit, and describe
asset validation for existing logs. Read the docs app AGENTS before editing;
no new page or navigation entry is needed for an inline usage section.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/log/append.test.ts src/commands/project/log/lifecycle.integration.test.ts src/commands/project/log/log-matrix.test.ts src/fs/assets.test.ts`
— all pass. Run `pnpm docs:validate` for the documentation edit, then final
repository gates. Run any CLI smoke commands only in a disposable project.

## Test plan

The stable boundary is Commander `project log append`, observed through
structured/text output, exit status, repository files, and Git state. Existing
library tests retain their current mutation/locking coverage. Tests use real
collaborators for preparation, grammar, seal, and assets; external filesystem
operations may be wrapped with tripwires through existing dependency seams.

Protects against: dry-run accidentally creating locks or finalizing receipts;
not already caught because current tests exercise mutating append/recovery;
covered by command cases combining filesystem/Git invariants with existing
write/append dependency tripwires. Add no production-only exported test hooks.
Preserve the test-owned temporary scope and do not point probes at real projects.

The mismatch oracle is the resolver's documented category and versions from an
independent invalid bundle fixture. The sealed oracle is a literal canonical
seal and existing `ProjectLogSealedError` path. Neutralizing the preview branch
must make the zero-write test fail; fixed valid preview and ordinary append
must both succeed in separate fixture states.

## Done criteria

- [ ] Help and command accept dry-run; preview truthfully reports no mutation.
- [ ] Every applicable validation is shared; mismatch/seal failures retain diagnostics and non-zero exits.
- [ ] Missing log, existing log, config skip, replay, and commit/receipt combinations remain read-only.
- [ ] Normal append still revalidates under its required lock and preserves its result contract.
- [ ] Negative controls, focused suites, docs validation, and repository gates pass.
- [ ] User docs explain current-state validation and no guarantee of later I/O or commit success.

## STOP conditions

Stop if issue/backlog direction changed, a current owner claims this flag, or
existing validation cannot be shared without changing seal/idempotency meaning.
Do not change `log check` as a substitute or widen into gate recovery redesign.
If preserving the existing result union requires unrelated consumer edits,
use a separate preview result boundary rather than propagating a new mutation
status through the repository.

## Revalidation Before Execution

Refresh item/issue state, ownership, and the exact execution HEAD after any
predecessor integration, log/asset landing, or seven days. Re-read write sinks
(including lock creation, Git finalization and receipt removal), not just the
flag registration. Preserve original provenance and record any drift resolution.

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
