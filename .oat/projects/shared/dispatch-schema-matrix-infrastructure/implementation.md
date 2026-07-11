---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-11
oat_current_task_id: p05-t01
oat_generated: false
---

# Implementation: dispatch-schema-matrix-infrastructure

**Started:** 2026-07-10
**Last Updated:** 2026-07-11

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

| Phase | Status   | Tasks | Completed |
| ----- | -------- | ----- | --------- |
| p01   | complete | 6     | 6/6       |
| p02   | complete | 4     | 4/4       |
| p03   | complete | 6     | 6/6       |
| p04   | complete | 4     | 4/4       |
| p05   | pending  | 3     | 0/3       |

**Total:** 20/23 tasks completed

**HiLL:** Phase p05 approved by the user on 2026-07-11 before final release and backlog closeout work began.

---

## Phase p01: Shared Dispatch Matrix Core

**Status:** complete
**Started:** 2026-07-10
**Completed:** 2026-07-11

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Added a reusable dispatch-matrix algebra, normalizer, structured issue model, and provenance-rich walker.
- Layered config and project state now share canonical normalization while retaining their distinct malformed-input compatibility behavior.
- Config adoption and doctor now consume shared matrix references instead of maintaining duplicate traversal logic.
- Exact candidate selection now reports `candidateIndex` independently from fallback `routeIndex`.

**Key files touched:**

- `packages/cli/src/config/dispatch-matrix.ts` - shared normalization, traversal, types, guards, and target validation.
- `packages/cli/src/config/oat-config.ts` - layered-config adapter and compatibility exports.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` - project-state adapter and candidate-index propagation.
- `packages/cli/src/commands/config/index.ts` - shared-ref adoption validation.
- `packages/cli/src/commands/doctor/index.ts` - shared-ref diagnostics with structured source provenance.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts`
- Result: Pass - 6 files, 349/349 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check && pnpm lint && pnpm format`
- Result: Pass.

**Notes / Decisions:**

- Phase-direct execution used one exact pinned subagent for all six tasks and the phase self-review; no nested task workers were launched.
- The self-review found project-state direct structured cells had become newly accepted. Fix `2d789a92` made `compatibilityMode` effective and restored the legacy project-state behavior without changing layered config.
- A review concern about provider-specific validation location was rejected: availability policy remains outside the core, while shared types, guards, normalizers, and pre-existing target-shape validation belong to the reusable module per design.

### Task p01-t01: Add the shared matrix algebra, normalizer, and walker

**Status:** complete
**Commit:** 97dcab1a

**Outcome (required when completed):**

- Dispatch matrix inputs now normalize into a shared canonical algebra and walk into refs that retain tier, candidate, fallback-route, path, and source provenance.

**Files changed:**

- `packages/cli/src/config/dispatch-matrix.ts` - shared core.
- `packages/cli/src/config/dispatch-matrix.test.ts` - algebra and walker coverage.
- `packages/cli/src/config/oat-config.ts` - compatibility re-exports.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts`
- Result: Pass.

**Notes / Decisions:**

- The original exact phase-coordinator → exact task-worker topology remains unavailable in this host: nested CLI workers fail inside the coordinator sandbox, while native depth-2 delegation cannot expose deterministic materialized-role selection through the current orchestration tool.
- The user explicitly authorized phase-direct execution for this project. One exact pinned subagent will own each phase, implement its planned tasks sequentially, preserve task-level commits and verification, and return the phase for root verification and bookkeeping. It must not launch nested task workers.
- Durable remediation is tracked by `BL-260711-add-root-owned-dispatch-broker`.

**Issues Encountered:**

- Initial worker launch failed before sampling with `failed to initialize in-process app-server client: Operation not permitted`. Resolved for this project by the user-authorized phase-direct execution deviation: the exact phase subagent implements ordinary phase tasks itself and launches no nested task workers.

---

### Task p01-t02: Adopt shared normalization in layered configuration

**Status:** complete
**Commit:** 86900b29

**Notes:**

- Layered configuration uses the shared normalizer while preserving silent malformed-sibling dropping and atomic candidate ladders during precedence resolution.

---

### Task p01-t03: Adopt shared normalization in project state

**Status:** complete
**Commit:** b615abd0

**Notes:**

- Project-state parsing uses a shared canonical matrix internally and a separate compatibility view for legacy top-level JSON output.

---

### Task p01-t04: Propagate exact candidate index through resolution

**Status:** complete
**Commit:** 672cf67f

**Notes:**

- Candidate indices are captured during ladder matching and remain separate from fallback route indices; non-candidate branches emit `null`.

---

### Task p01-t05: Replace config adoption traversals with shared references

**Status:** complete
**Commit:** ec189c6c

**Notes:**

- Config adoption validates canonical shared refs and structured targets, with malformed targets failing before provider availability probes.

---

### Task p01-t06: Replace doctor traversal with shared references

**Status:** complete
**Commit:** 6fe49d1c

**Notes:**

- Doctor uses shared refs and their structured source field for user/shared/local provenance while preserving valid, unknown, and unvalidated outcomes.
- Phase review fix: `2d789a92` restored project-state direct-target compatibility and added explicit non-candidate index coverage.

---

## Phase p02: Pass-Scoped Cursor Validation

**Status:** complete
**Started:** 2026-07-11
**Completed:** 2026-07-11

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Split Cursor Task/subagent probing from broad catalog resolution while preserving the public availability API.
- Added an explicit validation-pass context that memoizes one Task probe per exact Cursor candidate and one broad catalog resolution per command pass.
- Config adoption and doctor now batch shared matrix refs through the same coordinator while retaining their existing warning, provenance, and severity policies.
- Catalog presence remains diagnostic-only: it can produce `unvalidated` or `unknown-value`, never `valid` without Task/allow-list evidence.

**Key files touched:**

- `packages/cli/src/providers/identity/availability.ts` - separate Task-probe and broad-catalog operations.
- `packages/cli/src/providers/identity/dispatch-validation.ts` - explicit pass context, memoization, result fan-out, and evidence typing.
- `packages/cli/src/commands/config/index.ts` - one batch validation pass per matrix adoption.
- `packages/cli/src/commands/doctor/index.ts` - one batch validation pass per dispatch-matrix doctor check.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/availability.test.ts src/providers/identity/dispatch-validation.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts`
- Result: Pass - 4 files, 165/165 tests.
- Run: CLI type-check, Oxlint, formatting, and commit-range diff checks.
- Result: Pass.

**Notes / Decisions:**

- The exact opaque candidate string is the Task-probe cache key; no trimming or normalization is used for grouping.
- One stored promise covers broad catalog resolution, including its single permitted fallback call, and failures remain memoized for the pass.
- Phase self-review found operation hooks leaking into non-Cursor validator options and fake coordinators in command test harnesses. Fix `75288f32` restored the prior options boundary and moved those tests onto the production coordinator.
- One exact pinned phase subagent implemented all four tasks and the bounded review/fix loop directly; no nested task workers were launched.

### Task p02-t01: Separate Cursor Task probing from catalog diagnostics

**Status:** complete
**Commit:** 697a80d5

**Outcome:**

- Cursor Task-probe and catalog resolution are independently injectable operations with the legacy public validator behavior preserved.

---

### Task p02-t02: Add the validation-pass coordinator

**Status:** complete
**Commit:** 22e254c0

**Outcome:**

- Added explicit pass-scoped Task-probe and catalog promise caches with typed result fan-out to every source ref.

---

### Task p02-t03: Use one validation pass during matrix adoption

**Status:** complete
**Commit:** df5fa4c5

**Outcome:**

- Matrix adoption validates all structural constraints first, then batches availability work while preserving path-specific save-anyway warnings.

---

### Task p02-t04: Use one validation pass during doctor checks

**Status:** complete
**Commit:** 5e2fff75

**Outcome:**

- Doctor shares validation work across user, shared, and local layers while preserving each issue's exact path and source label.

**Review fix:** `75288f32` preserves non-Cursor validator option boundaries and exercises the production coordinator in command tests.

---

## Phase p03: Dispatch Report V1

**Status:** complete
**Started:** 2026-07-11
**Completed:** 2026-07-11

### Phase Summary

**Outcome (what changed):**

- Added a reusable versioned dispatch report that keeps policy, requested candidate, ceiling, exact selection, configured defaults, immutable gate invocation, and runtime identity distinct.
- Added deterministic JSON and human formatters and made the legacy `Dispatch:` line a derived compatibility representation.
- Added opt-in report context to `dispatch-ceiling resolve` without changing legacy output when report flags are absent.
- Adapted gate output to preserve configured invocation provenance without treating it as matrix-cell or runtime-observed identity.
- Updated implementation and review workflows to consume the report and derive compatibility stamps from it.

**Key files touched:**

- `packages/cli/src/providers/identity/dispatch-report.ts` - V1 schema, builder, deterministic serialization, human formatting, and stamp adapter.
- `packages/cli/src/providers/identity/stamp.ts` - compatibility stamp derivation from report data.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` - opt-in resolver report context and output.
- `packages/cli/src/commands/gate/index.ts` - immutable gate invocation report adapter.
- `.agents/skills/oat-project-{implement,review-provide,review-provide-remote}/SKILL.md` - workflow report and derived-stamp guidance.

**Verification:**

- Run: nine focused report, stamp, resolver, gate, workflow-contract, and bundle-consistency suites.
- Result: Pass - 9 files, 436/436 tests.
- Run: CLI type-check, lint, formatting, canonical-skill formatting, and commit-range diff checks.
- Result: Pass.

**Notes / Decisions:**

- Gate-configured invocation provenance is immutable and remains separate from `selection.cellSource` and runtime-observed identity.
- Unknown configured Codex effort is represented as `null` with no source; `codex-config` is emitted only when the effort is known.
- Canonical workflow skill versions were bumped exactly once in the phase; bundled mirrors remain deferred to p05 regeneration.
- One exact pinned phase subagent implemented all six tasks and the bounded review/fix loop directly; no nested task workers were launched.

### Task p03-t01: Add the report schema and pure builder

**Status:** complete
**Commit:** aedafd6b

**Outcome:**

- Added the V1 schema and pure builder with explicit provenance boundaries.

---

### Task p03-t02: Add deterministic JSON and human formatting

**Status:** complete
**Commit:** 67704a2a

**Outcome:**

- Added stable serialization and human-readable report rendering.

---

### Task p03-t03: Derive compatibility stamps from reports

**Status:** complete
**Commit:** 07823ab2

**Outcome:**

- The legacy `Dispatch:` representation is now derived from report data.

---

### Task p03-t04: Integrate report context with dispatch-ceiling resolve

**Status:** complete
**Commit:** 5bb809e3

**Outcome:**

- Resolver callers can request a scoped report while existing output remains compatible by default.

---

### Task p03-t05: Adapt immutable gate provenance into reports

**Status:** complete
**Commit:** c6256d5b

**Outcome:**

- Gate JSON output carries the report alongside immutable configured invocation metadata.

---

### Task p03-t06: Integrate reports into implementation and review workflows

**Status:** complete
**Commit:** 30ffd78e

**Outcome:**

- Implementation and review skills request, render, and retain report context and derive compatibility stamps from it.

**Review fix:** `760de162` resolves all five p03 self-review findings covering gate provenance, unknown configured effort, absent-report compatibility, deep stable ordering, and literal workflow command contracts.

---

## Phase p04: Cursor Evidence and User Documentation

**Status:** complete
**Started:** 2026-07-11
**Completed:** 2026-07-11

### Phase Summary

**Outcome (what changed):**

- Added a deterministic machine checker and evidence protocol derived from recommendation version `2026-07-10.2`.
- Ran one canonical Cursor Task/subagent probe for every distinct recommended GPT-5.6 candidate and persisted sanitized command, prompt, output, exit, duration, environment, outcome, and recheck evidence.
- Recorded all 13 candidates as `unvalidated`: eight exited without decisive evidence and five timed out; the four configured candidates are explicitly identified.
- Retained the recommendation unchanged because no probe produced sentinel or explicit allow-list evidence supporting a change.
- Documented Dispatch Report V1 semantics, one-pass Cursor validation lifetime, evidence limitations, and recheck behavior across user-facing docs.

**Key files touched:**

- `.oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md` - complete live evidence and machine disposition.
- `tools/verification/verify-cursor-subagent-evidence.mjs` - deterministic inventory, protocol, redaction, outcome, subset, and disposition checker.
- `tools/verification/verify-cursor-subagent-evidence.test.mjs` - positive and adversarial checker coverage.
- `apps/oat-docs/docs/**` - dispatch report, gate provenance, Cursor cache, and live-evidence documentation.

**Verification:**

- Run: verifier test suite and final evidence checker.
- Result: Pass - 11/11 tests and 13/13 complete records.
- Run: recommendation adoption and bundle consistency tests.
- Result: Pass - 128/128 tests.
- Run: docs build, docs formatting/Markdown lint, and local static-export link crawl.
- Result: Pass - 52 pages, 549 links, 0 broken.

**Notes / Decisions:**

- Broad catalog presence was not used as eligibility evidence.
- Model-unavailable prose without the implemented explicit subagent allow-list grammar remains `unvalidated`, matching production semantics.
- The recommendation and generated mirror remain byte-for-byte unchanged.
- The default remote link crawl still sees pre-deployment GitHub Pages HTML; rerun it after deployment. The current branch-local export is clean.
- One exact pinned phase subagent implemented all four tasks and the bounded review/fix loop directly; no nested task workers were launched.

### Task p04-t01: Create the live-verification inventory and protocol

**Status:** complete
**Commit:** 578fa21c

**Outcome:**

- Added the 13-candidate pending protocol artifact and deterministic evidence checker/tests.

---

### Task p04-t02: Run and record all live Cursor Task probes

**Status:** complete
**Commit:** e7f1ee86

**Outcome:**

- Recorded one sanitized direct probe for each exact candidate; all 13 remained non-definitive and received a 2026-07-18 recheck date.

---

### Task p04-t03: Reconcile the recommendation with live evidence

**Status:** complete
**Commit:** 44b513ce

**Outcome:**

- Retained recommendation version `2026-07-10.2` and every opaque candidate because no live result justified a change.

---

### Task p04-t04: Document report semantics and Cursor verification

**Status:** complete
**Commit:** d5ba8eaa

**Outcome:**

- Updated workflow, gate, configuration, and provider docs with the shipped report/cache/evidence semantics and repaired an existing referenced docs anchor.

**Review fix:** `f2122197` makes the evidence checker independently enforce canonical protocol, derived outcomes, recursive redaction, the authoritative configured subset, and complete machine recommendation disposition.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-07-10 23:24

**Branch:** dispatch-schema-matrix-infrastructure
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 attempted, 0 passed, 0 failed, 1 stopped

#### Phase Outcomes

| Phase | Implementer | Review  | Fix Iterations | Disposition |
| ----- | ----------- | ------- | -------------- | ----------- |
| p01   | blocked     | not-run | 0/2            | stopped     |

#### Parallel Groups

- p01: sequential

#### Dispatch Notes

- Coordinator: `gpt-5.6-sol`/`high`, target `oat-phase-implementer-gpt-5-6-sol-high`.
- p01-t01 resolved exact candidate `gpt-5.6-sol`/`high` with invocation source, but both pinned worker launches failed before sampling with `failed to initialize in-process app-server client: Operation not permitted`.

#### Outstanding Items

- Resolved for this project on 2026-07-11: the user authorized one exact phase subagent per phase with no nested task workers. Durable broker/provenance work is tracked by `BL-260711-add-root-owned-dispatch-broker`.

#### Artifact / Design Deltas

None.

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-10

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- Resume with one exact pinned phase subagent per phase. Each phase subagent implements its tasks sequentially and must not launch nested task workers. This is a project-local execution override, not a change to the intended OAT coordinator/worker contract.

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- Nested exact-worker launch from a restricted coordinator - resolved for this project through explicit phase-direct authorization; durable fix deferred to `BL-260711-add-root-owned-dispatch-broker`.

**Session End:** {time}

---

### 2026-07-10

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review   | Source Artifact                                                                      | Planned / Documented                                                                                         | Actual / Accepted                                                                                                   | Reason                                                                                                                                                                                              | Source of Truth                                                                                           | Follow-up                                  |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| execution-run-2 | `plan.md` execution contract and `oat-project-implement` coordinator/worker contract | One exact phase coordinator dispatches one exact task worker per task and does not edit ordinary task files. | One exact pinned phase subagent implements all tasks in its phase sequentially and launches no nested task workers. | Nested exact CLI workers cannot initialize inside the restricted phase sandbox; the user explicitly authorized phase-direct implementation to retain phase isolation while unblocking this project. | `implementation.md` for this run; planned product behavior remains governed by `plan.md` and `design.md`. | `BL-260711-add-root-owned-dispatch-broker` |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage                                                        |
| ----- | --------- | ------ | ------ | --------------------------------------------------------------- |
| 1     | 349       | 349    | 0      | Six focused suites; type-check, lint, and format also passed    |
| 2     | 165       | 165    | 0      | Four focused suites; type-check, lint, and format also passed   |
| 3     | 436       | 436    | 0      | Nine focused suites; type-check, lint, and format also passed   |
| 4     | 139       | 139    | 0      | 11 verifier and 128 targeted CLI tests; docs checks also passed |

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
