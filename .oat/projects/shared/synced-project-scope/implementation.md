---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-26
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: synced-project-scope

**Started:** 2026-08-26
**Last Updated:** 2026-08-26

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | N     | 0/N       |
| Phase 2 | pending     | N     | 0/N       |

**Total:** 0/{N} tasks completed

---

## Phase 1: {Phase Name}

**Status:** in_progress
**Started:** 2026-08-26

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- {2-5 bullets describing user-visible / behavior-level changes delivered in this phase}

**Key files touched:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {trade-offs or deviations discovered during implementation}

### Task p01-t01: {Task Name}

**Status:** completed / in_progress / pending / blocked
**Commit:** {sha} (if completed)

**Outcome (required when completed):**

- {what materially changed (not “did task”, but “system now does X”)}

**Files changed:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {gotchas, trade-offs, design deltas, important context for future sessions}

**Issues Encountered:**

- {Issue and resolution}

---

### Task p01-t02: {Task Name}

**Status:** pending
**Commit:** -

**Notes:**

- {Notes will be added during implementation}

---

## Phase 2: {Phase Name}

**Status:** pending
**Started:** -

### Task p02-t01: {Task Name}

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-08-26

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-08-26

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`

## Plan Gate Escalation (2026-08-27)

The configured `oat-project-plan` gate (`oat gate review --review-type artifact --review-scope plan --exit-nonzero-on important`, target `cursor-gpt-5-6-sol-xhigh`, `onFailure: block`, `maxAttempts: 2`) blocked on both attempts. Attempts are exhausted; per the gate contract the plan stays `in_progress` pending human direction. Accumulated feedback:

**Attempt 1 — `reviews/archived/artifact-plan-review-2026-08-27T013313Z.md`** (0 critical, 2 important, 2 medium) — all resolved in `plan.md`:

- I1 NFR2 spike could not prove no-CI-trigger in this repo (all workflows filter to `main`) → p01-t10 now uses a disposable GitHub repo with an unfiltered `on: [push]` workflow, waits, queries by SHA, deletes the repo.
- I2 FR14 worktree docs uncovered → p04-t07 adds a "Synced projects in worktrees" section to `workflows/projects/implementation-execution.md`.
- M1 p03-t04 file surface → `fs/io.ts` in Files; e2e in GREEN verify + format.
- M2 p04-t01 negated `jq` grep → `! grep …`.

**Attempt 2 — `reviews/archived/artifact-plan-review-2026-08-27T014220Z.md`** (2 critical, 3 important, 1 medium) — five resolved in `plan.md`/`design.md`, one resolved by a reversible product default:

- C1 `commitRecordChange` must exclude pre-staged unrelated changes → p01-t09 requires pathspec-limited commits (`git commit -m … -- <pathspecs>`) and a pre-staged-file test.
- C2 `oat-project-review-provide` Step 9.5 missing from the sweep; validator too literal → added to p04-t02; p04-t06 gains rule (c) guarded-variable-pathspec check and rule (d) checked-in bookkeeping-site inventory.
- I1 prune could bypass the open-PR guard with no checkout → p03-t05 reads `git show <ref>:state.md` when the checkout is absent; new test.
- I2 migration rollback not retryable → single rollback contract (remove everything migrate created, restore source); design.md updated; step-5 failure-injection test added.
- I3 listing `local` conflicts with the spec non-goal → **resolved toward the spec as written**: `list` enumerates `shared` + `synced` only; `local` stays unenumerated. Reversible: if the maintainer prefers to list `local`, amend spec Non-Goals/NFR1 and restore the p02-t07 `local` cases (design.md notes this).
- M1 dangling `received` ledger rows → both gate rows now point at archived provenance with invocation/target filled.

**Needed from the maintainer:** confirm the I3 default (or reverse it), then either authorize a third gate attempt (`oat gate review …` as configured) or approve the plan without a further gate run. `plan.md` frontmatter remains `oat_status: in_progress` until then.

**Maintainer direction received (2026-08-27):** list `local` projects too (existing gap, not a boundary) — spec Non-Goals/NFR1 amended, p02-t07 and design restored to three-scope listing. Disposable spike repository provided by the maintainer: `https://github.com/tkstang/disposable-test-repo-for-oat` (deletion is an operator step after implementation). Third plan gate attempt authorized; implementation is not to start until the maintainer is told the plan is ready.

**Attempt 3 — `reviews/archived/artifact-plan-review-2026-08-27T015823Z.md`** (1 critical, 2 important, 1 medium) — all resolved in `plan.md`/`design.md`:

- C1 PR skills never push/persist PR state for synced projects → p04-t05 now specifies a six-step sequence for both PR skills (push → links → create → persist `oat_pr_status`/`oat_pr_url` (new for progress PRs) → push).
- I1 prune only removed the current worktree's checkout → prune is project-wide across all registered checkouts with per-checkout preflight; two-parent-worktree test; design updated.
- I2 migration rollback after the branch commit → capture pre-migration HEAD; `reset --soft` + path-scoped restore incl. self-healed `.gitignore`; failure injection after commit and at `activeProject` retarget; design updated.
- M1 dogfood asserted the whole `refs/oat/projects/*` namespace empty → assertions scoped to the scratch slug.

Status after attempt 3: still `blocked` by the gate; all findings applied. Awaiting maintainer: run again or approve.

**Attempt 4 — `reviews/archived/artifact-plan-review-2026-08-27T022840Z.md`** (1 critical, 2 important, 2 medium) — all resolved in `plan.md`:

- C1 `oat-project-complete` classifies scope shared-vs-local in Step 1 and gates archive/recap on it → p04-t05 now rewrites Step 1 to `oat project scope` + `IS_DURABLE_PROJECT` (shared|synced), audits all six `IS_SHARED_PROJECT` sites, and updates the pinned contract test.
- I1 `oat-project-review-provide` Step 1.6 baseline check can't see the nested checkout → p04-t02 makes it scope-aware (`git -C "$PROJECT_PATH" status` on core artifacts; pull when absent) with a contract-test case.
- I2 p04-t09/p04-t10 could fix files without committing them → scoped fix commits before evidence commits; clean-status assertions before/after.
- M1 format/commit surfaces incomplete (p02-t05, p02-t07, p04-t06, p04-t08) → all declared files now formatted and staged; manifest format step added.
- M2 `ProjectSummary.scope` public API → `packages/control-plane/README.md` added to p02-t07.

Status after attempt 4: still `blocked`; all findings applied. Awaiting maintainer: run again or approve.

**Attempt 5 — `reviews/archived/artifact-plan-review-2026-08-27T025742Z.md`** (0 critical, 3 important) — all resolved:

- I1 canonical snippet failed open to `shared` → fail-closed (`|| exit 1`); validator rule (c) rejects fallback patterns.
- I2 archive "dry-check" named a destructive helper → new read-only `preflightSyncedCheckout`; `removeSyncedCheckout` called exactly once, last.
- I3 spike never requested a blob URL → spike commit carries `design.md`; `blob/<sha>/design.md` fetched and content-checked.

**Scope fold-in (maintainer direction 2026-08-27):** FR16 remote discovery & adoption (`list --remote`, adopting `pull`) and FR17 coordination pull added to spec; design gains the API additions and a "Discovery across machines and users" section (forks, clone refspec, GC roots); plan gains p02-t09/p02-t10 and a "picking up projects" docs page (40 tasks); FR18 (archive drops reviews/ for all scopes; S3 already excluded them) folded into p03-t04. Gate attempt 6 authorized on the combined change.

**Attempt 6 — `reviews/archived/artifact-plan-review-2026-08-27T031106Z.md`** (2 critical, 4 important, 1 medium; on the FR16/FR17 fold-in) — all resolved in `plan.md`:

- C1 synced split: `finalize.ts`/`split/run.ts` carry the parent scope root; parent + children re-pushed after post-scaffold mutations; e2e asserts remote parent `oat_children`.
- C2 arrival ordering: implement Step 0 and review-provide Step 0 pull before validating the directory; contract fixtures.
- I1 `oat_children` parsed from the YAML frontmatter object, not the scalar helper; slug validation; test uses `writeCoordinationParent` output.
- I2 single commit owner: `pullSynced` returns pending record paths; the command commits once (or not, `--no-commit`); partial-failure semantics specified.
- I3 `ProjectListRow` discriminated contract (materialized / recorded-absent / remote) with null lifecycle fields; README.
- I4 gate logs written to `mktemp -d`, removed before clean-status assertions.
- M1 ledger reconciled: duplicate 013313Z row removed (my accidental duplicate; the gate's row kept), stale 025742Z row set to archived/fixes_completed.

Gate attempt 7 authorized by the fold-in decision.
