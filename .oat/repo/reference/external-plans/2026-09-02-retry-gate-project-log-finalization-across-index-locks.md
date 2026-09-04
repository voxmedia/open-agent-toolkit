---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-retry-gate-project-log.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-retry-gate-project-log
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/213
created: '2026-09-02T23:59:00Z'
---

# Retry gate project-log finalization across transient Git index locks

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Land the
> sibling post-selection recovery plan first when both run in one wave; they
> edit disjoint regions of the same gate module. Draft PR #190 rewrites the
> same module; see the landing-event table.

## Outcome

A transient `.git/index.lock` no longer turns a completed review into a failed
gate. Gate-owned project-log finalization carries the gate `runId` as a stable
event identity, retries `git add`/`git commit` a declared bounded number of
times when the failure is an index lock, classifies the lock as transient or
persistent in its diagnostic, never appends a duplicate log entry on retry,
and, when retries are exhausted, writes a partial-finalization receipt that a
later run can complete without re-running the review. The lock file is never
deleted.

## Source and live evidence

- Source backlog item:
  [BL-260902-retry-gate-project-log — Retry gate project-log finalization across transient Git index locks](../../pjm/backlog/items/BL-260902-retry-gate-project-log.md)
- Source issue: [#213](https://github.com/voxmedia/open-agent-toolkit/issues/213)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/commands/gate/index.ts:2791-2845` —
    `commitReviewGateProjectLog` runs `git status --porcelain`, `git add`, and
    `git commit` once each via `execFileSync`; no retry, no lock detection.
  - `packages/cli/src/commands/gate/index.ts:2836-2844` — failure returns
    `{ committed: false, error: <raw stderr> }` with no classification.
  - `packages/cli/src/commands/gate/index.ts:2848-2915` —
    `finalizeReviewGateProjectLog` appends then commits; on failure it only
    emits `gate-project-log-commit-failed` through `writeDiagnostic`; nothing
    durable is written.
  - `packages/cli/src/commands/gate/index.ts:2859`, `:2890-2900` — the
    structural body and append call carry no run identity, so a retry cannot
    recognize its own prior append.
  - `packages/cli/src/commands/project/log/append.ts:329-368` —
    `appendProjectLog` is unconditionally append-only; it returns
    `appended | skipped` and never scans for an existing entry.
  - `packages/cli/src/commands/gate/index.ts:3705-3722` — finalization runs in
    the `finally` after `writeReviewGateResult` has flushed the envelope, so a
    receipt cannot live in the envelope.
  - `packages/cli/src/commands/gate/index.test.ts:5085` — `reports a staging
failure without changing the gate result` holds a real `.git/index.lock`
    and asserts only the failure diagnostic; today it proves no retry occurs.
  - `packages/cli/src/commands/gate/index.ts:415-448` —
    `writeGateRunMarker`/`removeGateRunMarker` write
    `tmpdir()/oat-gate-runs/<runId>.json` through injectable dependencies; the
    shape to copy for a receipt.
- Constraining decisions:
  - [DR-260718-cli-owned-log-mutations](../decisions/DR-260718-cli-owned-log-mutations.md)
    — log mutation and any dedupe scan live in the `oat project log` module,
    not in the gate module.
  - [DR-260714-append-ordered-review-event](../decisions/DR-260714-append-ordered-review-event.md)
    — append order is preserved; a retry never reorders or rewrites.
  - [DR-260807-receipt-outcomes-use-one-pre](../decisions/DR-260807-receipt-outcomes-use-one-pre.md)
    — a receipt derives one outcome from a pre-action snapshot.
  - [DR-260731-dedicated-bounded-recovery](../decisions/DR-260731-dedicated-bounded-recovery.md)
    — recovery has a declared bound.
  - [DR-260713-best-effort-cross-process](../decisions/DR-260713-best-effort-cross-process.md)
    — no cross-process locking; issue #213 forbids deleting an unverified lock.

## Dependencies

| Type             | Dependency                                                                                                                                                                       | Required state                                                                                                                                                                 | Current state                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Soft integration | Sibling plan [Recover committed review artifacts](./2026-09-02-recover-committed-review-artifacts-after-post-selection-failures.md)                                              | Land first in a shared wave; rebase this plan's `gate/index.ts` hunks and its `workflow-gates.md` status-table and incident-table hunks after it; never in one parallel group. | Pending.                                                      |
| Soft ownership   | [review-gate-integrity](../../../projects/shared/review-gate-integrity/state.md) / [BL-260820-bind-each-gate-review](../../pjm/backlog/items/BL-260820-bind-each-gate-review.md) | Do not touch lifecycle-event consumption or receive routing; record the receipt shape as a decision.                                                                           | Project in discovery; this item is listed as a child.         |
| Design decision  | Receipt location                                                                                                                                                                 | One decision record chooses `tmpdir()/oat-gate-runs/` (existing precedent, not reboot-durable) or a gitignored repo-local path.                                                | Unresolved; decide in step 4 before writing the receipt code. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                       | Required update                                                                                                                                                                            |
| ------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | No       | None of the in-scope files.                                                                                           | Re-run the drift check only. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch.                                                              |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes      | `gate/index.ts`, `gate/index.test.ts`, `gate-hardening.integration.test.ts`, `workflow-gates.md`, `cli-reference.md`. | If #190 merges first: re-anchor `commitReviewGateProjectLog`, `finalizeReviewGateProjectLog`, the `finally` block, and the `:5085` test before editing. If this lands first: #190 rebases. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts packages/cli/src/commands/project/log packages/cli/src/commands/gate/gate-hardening.integration.test.ts apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/reference/cli-reference.md .gitignore packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If the finalization functions or `appendProjectLog` changed shape, re-anchor
before editing. A new finalization ordering relative to the envelope write is a
STOP until this plan is refreshed.

## Repository conventions

- Build: `pnpm build` → passes. Typecheck: `pnpm type-check` → passes.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/gate/index.test.ts src/commands/project/log`.
- Lint/format/docs: `pnpm check` → passes.
- Implementation pattern: injectable dependencies as in
  `writeGateRunMarker`; bounded recovery constants declared, not inline.
- Git/PR convention: docs under `apps/oat-docs/docs` are shipped, so bump the
  five lockstep packages; do not push or open a PR unless instructed.

## Scope

### In scope

- `packages/cli/src/commands/gate/index.ts` — `runId` on
  `ReviewGateProjectLogFinalization` and in the structural body;
  `classifyGitLockFailure`; bounded retry in `commitReviewGateProjectLog`;
  receipt writer and `gate-project-log-partial-finalization` diagnostic.
- `packages/cli/src/commands/project/log/append.ts` and its tests — optional
  idempotency key with an `already-appended` result branch.
- `packages/cli/src/commands/gate/index.test.ts` — the cases below.
- `apps/oat-docs/docs/cli-utilities/workflow-gates.md` — finalization,
  retry bound, receipt, incident-to-regression row (`reference/cli-reference.md`
  is watch-only in the drift check; no edit planned).
- One decision record for the receipt shape and location (Before writing the record, run `oat pjm doctor --json` and require `adoption.state` of `declared` or `inferred-legacy` (STOP otherwise), read `.oat/repo/reference/decisions/AGENTS.md`, create it with `oat decision new`, and run `oat decision regenerate-index`.)
- `.gitignore` — only if the decision chooses a repo-local receipt path.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- The review envelope and `writeReviewGateResult` ordering — finalization
  runs after emission by design.
- `branch-local-cli.ts`, `child-process.ts`, `review-verdict.ts`.
- `.agents/skills/**` — unless the receipt becomes agent-consumable, which is
  a separate bump.
- Deleting, moving, or forcing any `.git/index.lock`.

## Current state

`finalizeReviewGateProjectLog` (`index.ts:2848`) is the sole caller of
`commitReviewGateProjectLog` (`:2791`), invoked once from the `finally`
(`:3717`) under the `projectLogFinalized` guard. The gate's `runId` (`:3159`,
`randomUUID()`) already appears in every envelope and in
`gateInvocation.runId`; it is the natural idempotency key. Structural entries
are one-line bodies (`append.ts:187-196`), so a `run=<uuid>` token is legal.

## Implementation steps

### 1. Carry a stable event identity

Add `runId: string` to `ReviewGateProjectLogFinalization` (`index.ts:236`), set
it where the finalization record is built (`:3229-3239`), and append
` run=${finalization.runId}` to the structural body (`:2859`).

**Verify:** `pnpm exec vitest run src/commands/gate/index.test.ts -t 'project log'`
→ the `:4816-4838` body assertions pass with the new token.

### 2. Make the append idempotent in the log module

Extend `appendProjectLog` (`append.ts:329`) with an optional idempotency key
and an existing-entry scan returning `status: 'already-appended'`. Have
`finalizeReviewGateProjectLog` treat that as success and proceed to commit.

**Verify:** `pnpm exec vitest run src/commands/project/log` → new case passes.

### 3. Classify and retry the commit

In `commitReviewGateProjectLog` add `classifyGitLockFailure(stderr, lockPath)`
returning `transient-index-lock | persistent-index-lock | other` (persistent
when the lock's mtime is unchanged across the whole retry window). Retry
`add`/`commit` with `PROJECT_LOG_COMMIT_ATTEMPTS = 3` and an injectable sleep
defaulting to 250 ms, 500 ms, 1000 ms between attempts (the window the
mtime-unchanged check spans). Return `{ committed, error?, lockClass?, attempts }`. Never
unlink the lock.

**Verify:** `pnpm exec vitest run src/commands/gate/index.test.ts -t 'index lock'`
→ transient and persistent cases pass.

### 4. Write the partial-finalization receipt

Record the location decision with `oat decision new`. On exhausted retries
write `{ runId, project, logPath, appendStatus, commitStatus, lockClass,
attempts, body }` through a new injectable `writeGateProjectLogReceipt` and
emit a `gate-project-log-partial-finalization` diagnostic naming the path.
Derive exactly one outcome from the pre-action snapshot. Do not remove the
receipt in `removeGateRunMarker`'s cleanup path.

**Verify:** `pnpm exec vitest run src/commands/gate/index.test.ts -t 'partial finalization'`
→ receipt asserted.

### 5. Document and bump

Update `workflow-gates.md` and add the incident-to-regression row
(`:800-809`); bump the five lockstep packages above fresh `origin/main`.

**Verify:** `pnpm check` → exit 0.

### 6. Run the definition-of-done gates

**Verify:** the eight AGENTS.md gates in order, each with a captured exit code.

## Test plan

Pattern: `it('reports a staging failure without changing the gate result')`
at `index.test.ts:5085` (real repo, real lock) and
`it('commits its own project log append so the worktree stays clean')` at
`:4995`.

- `retries and commits after a transient index lock clears` → HEAD advances,
  one structural heading, no failure diagnostic.
- `classifies a held index lock as persistent after exhausting retries` →
  `lockClass: 'persistent-index-lock'`, `attempts: 3`, gate result unchanged.
- `does not delete the index lock` → lock file still present.
- `emits a partial-finalization receipt when retries are exhausted` → receipt
  fields and diagnostic path.
- `never duplicates the log entry when finalization is retried for the same run`
  → heading count stays 1 (`:4871-4901` pattern).
- `unstages the log when the commit itself fails after staging` (`:5121`) →
  unchanged.
- `append.ts`: `returns already-appended for a matching idempotency key`.

## Done criteria

- [ ] Transient index locks are retried within the declared bound; persistent
      locks are classified and reported.
- [ ] A retry never appends a duplicate entry or commit for the same `runId`.
- [ ] Exhausted retries leave a receipt a later run can complete.
- [ ] `.git/index.lock` is never deleted by the gate.
- [ ] Envelope emission ordering and the PR #246 contracts are unchanged.
- [ ] Decision record, docs, lockstep bump, and all gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- any design deletes or forces an unverified `.git/index.lock`;
- a receipt-in-envelope requirement appears (finalization runs after
  emission);
- the retry would extend the gate beyond its own time budget;
- the dedupe scan would read or edit `project-log.md` from the gate module;
- a downstream parser of the structural body is found (grep found none);
- PR #190 merged first and the finalization functions no longer match the
  cited shapes; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #213, the
decision records above, and the gate and log tests when substantial time
passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, PR #190 or the
`review-gate-integrity` design lands, cited contracts change, another PR
implements part of the outcome, or a load-bearing claim cannot be reproduced.
Apply the landing-event table above for the two named events.

## Review focus

- The receipt outcome derivation follows DR-260807 (one outcome, pre-action
  snapshot).
- Retry bound and sleep are injectable and declared.
- The `run=` token is additive to the structural body and does not break the
  project-log grammar.
