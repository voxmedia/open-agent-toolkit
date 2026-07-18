---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: { YYYY-MM-DD }
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['{ final-phase-id }']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [{ groups of <= ceiling, write-disjoint, from recon }]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-N-execution (Wave N external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: { N } worktrees (operator
> decision).

**Goal:** Execute the { count } Wave N external plans ({ short lane list }) through
the wave→project wrapper pattern (DR-260713-wave-project-wrapper-over).

**Architecture:** Thin wrapper. Each task's **entire and only implementation
contract** is its external plan under `.oat/repo/reference/external-plans/`. Tasks
below carry wrapper-owned metadata exclusively: the source-plan path,
ordering/dependencies, wrapper-level verification gates, the commit convention, and
review mapping. Nothing in this file restates, narrows, or overrides a source plan.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — the external plan
governs commit content and granularity; the wrapper adds the `pNN-tNN` scope.

**Wrapper execution contract (applies to every task):**

1. **Drift check first.** Run the source plan's `## Drift check` against current
   HEAD. A material mismatch (per that plan's own definition) is a STOP. The
   wave-boundary drift refresh (see record below) does not replace the in-worktree
   re-check — the integration tip advances as groups merge.
2. **Execute the source plan's `## Implementation steps`** in order with each
   step's embedded Verify gate; honor its `## STOP conditions` verbatim.
3. **Confirm the source plan's `## Done criteria`**, then run the full DoD gates:
   { repo env setup commands, then repo test/lint/format/type gates }
   (source-program example: `nvm use` first; `pnpm rebuild -r better-sqlite3` if
   Node changed; `pnpm test && pnpm lint && pnpm format && pnpm type-check`).
4. **STOP → BLOCKED at phase level (bundle exception).** A source-plan STOP parks
   the phase (record in `state.md` `oat_blockers` + `implementation.md`); sibling
   phases continue. **Bundle phases:** a STOP parks only the stopped task; the
   implementer records the blocker and continues remaining independent tasks; the
   phase is terminal when every task is completed or parked
   (DR-260713-bundle-stop-semantics-park).
5. **Group-dependency rule:** a group starts when every phase of the previous
   group is terminal — merged, or parked with completed commits merged. A park
   never blocks the next group.
6. **Merge serialization:** within a group, merge phase branches one at a time in
   plan order, rebasing each on the updated tip first. Name the deliberately
   sequenced shared files here: { shared-file list from recon }.
7. **Backlog archival is NOT part of any task** — once, serialized on the
   integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs { repo formatter write command }
   (source-program example: `pnpm format:fix`) on markdown it writes and reports
   observations for `orchestration-log.md` (workers report; the root appends).
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.

## Parallelism

{ Group composition + rationale. Prefix the recon observations with: }

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md`; provider-specific model/effort selection is owned by
runtime resolution, not this plan. Cross-model review requirements are embedded in
{ lanes touching locking/security/containment/dependency surfaces }._

## Drift Refresh Record ({ date }, vs `{ BASE_SHA }`)

{ Recon results: N PASS / N MINOR-DRIFT / N STOP + one line each. State explicitly
that this record is non-authoritative recon evidence. }

---

## Phase { NN }: { lane-name } (group { G })

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p{NN}-t01: Execute external plan — { lane title }

**Source plan (the contract):**
`.oat/repo/reference/external-plans/{ plan-file }.md`

**Ordering:** group { G }; own worktree, parallel with { siblings }. { Grouping
notes, marked non-authoritative where recon-derived. }

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the full DoD gates from
the wrapper execution contract
Expected: all green.

{ **Step 4: Cross-model review** — include for locking/security/containment/
dependency/lifecycle surfaces: before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(provider/model/effort owned by dispatch configuration, not this plan);
disposition every finding in the phase report. }

**Step { N }: Commit**

```bash
git commit -m "{type}(p{NN}-t01): { description }"
```

---

## Reviews

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| plan   | artifact | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

- [ ] { N }/{ N } phases, { M }/{ M } tasks complete
- [ ] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after all merges):
      `oat backlog archive` with real outcome summaries for { backlog IDs }, one commit
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md`
      before any archive step
- [ ] Full DoD gates green on the integration branch

## References

- Source plans: the { N } `.oat/repo/reference/external-plans/*.md` files named above
- Program indexes: `.oat/repo/reference/external-plans/*-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`, prior wave summaries in
  `.oat/repo/reference/project-summaries/`
