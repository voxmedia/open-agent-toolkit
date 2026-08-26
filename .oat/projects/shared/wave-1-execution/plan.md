---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-26
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02'] # final phase only (workflow.hillCheckpointDefault=final); p01/p02 complete together as one group
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_plan_parallel_groups: [['p01', 'p02']] # write-disjoint per the 2026-08-26 drift refresh (tools/smoke vs tools/release + packages/cli/src/release)
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-1-execution (Wave 1 external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: 3 worktrees (operator
> decision); this wave uses 2.

**Goal:** Execute the 2 Wave 1 external plans (bound smoke cleanup signal waits;
reject package versions overtaken by main) through the wave→project wrapper
pattern (DR-260713-wave-project-wrapper-over).

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
3. **Confirm the source plan's `## Done criteria`**, then run the full DoD gates
   in this order, capturing each exit code explicitly: `pnpm check`,
   `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`,
   `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`;
   plus `pnpm lint` and `pnpm format` (Wave 1 touches `tools/smoke`). Node
   22.17.0 and pnpm 10.13.1 are the repository toolchain; run
   `pnpm run worktree:init` once per fresh worktree before the gates.
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
   plan order, rebasing each on the updated tip first. Deliberately sequenced
   shared files: none (the drift refresh found an empty write-surface
   intersection); merge order is p01 then p02 so the bounded signal harness is in
   place before the release-guard lane's integration test run.
7. **Backlog archival is NOT part of any task** — once, serialized on the
   integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm format:fix` (or a file-scoped
   `pnpm exec oxfmt --write <file>`) on markdown it writes and reports
   observations for `orchestration-log.md` (workers report; the root appends).
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.

## Parallelism

Group 1 = `p01` + `p02` in separate worktrees at the same base. Rationale: the
two lanes have disjoint write surfaces (`tools/smoke/runner/cleanup.test.mjs`
vs `tools/release/*`, `packages/cli/src/release/*`, and conditionally
`.github/workflows/ci.yml` / `AGENTS.md`), neither changes shipped package
versions, and pairing them uses bounded parallel capacity without stacking
runtime product changes.

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time.

- p01 write surface: `tools/smoke/runner/cleanup.test.mjs` (only).
- p02 write surface: `tools/release/check-version-bumps.ts`,
  `tools/release/release-utils.ts`,
  `packages/cli/src/release/check-version-bumps.test.ts`,
  `packages/cli/src/release/release-utils.test.ts`; conditional per the plan:
  `.github/workflows/ci.yml`, `AGENTS.md`.
- Intersection: empty. Only p01 touches `tools/smoke`; neither touches
  `.agents/skills`, bundled assets, or public package manifests.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in both lanes: p01 is a signal/containment surface and
p02 is a release-safety (CI gate) surface._

## Drift Refresh Record (2026-08-26, vs `bf7aff9cbdbbd28d5709b93dbf0af2312cb0eb22`)

**2 PASS / 0 MINOR-DRIFT / 0 STOP.** This record is non-authoritative recon
evidence (one bounded read-only recon agent, Sonnet 5, native dispatch); each
lane re-runs its own drift check in its worktree.

- **p01 — bound smoke cleanup signal waits:** PASS. Drift-check diff empty
  (`6f443c08..HEAD` touched only `.oat/`). All four evidence bullets verified
  at their stated lines (`runSignalCase` at
  `tools/smoke/runner/cleanup.test.mjs:651`; spawn 737; sentinel wait 761;
  SIGTERM 762; unbounded exit await 763–765; `finally` SIGKILL 780–783; two
  call sites at 790/794). Drift-check coverage adequate (the scoped directory
  contains every module the test imports).
- **p02 — reject package versions overtaken by main:** PASS. Drift-check diff
  empty. All five evidence bullets verified (`runVersionBumpCheck` DI shape at
  `tools/release/check-version-bumps.ts:27–48`; `resolveMergeBase` at
  `tools/release/release-utils.ts:73`; CI `fetch-depth: 0` at
  `.github/workflows/ci.yml:20` under the checkout step at line 17;
  `pnpm release:check-versions` at line 46; all five public manifests at
  `0.2.32`). No semver/comparator helper exists anywhere in the repo.
  **Rule-1 addendum (coverage gap):** the plan's drift-check command omits two
  files its implementation reads and extends —
  `tools/release/validate-public-packages.ts` (hosts
  `findLockstepVersionBumpErrors`, the "existing lockstep errors" the plan
  appends to) and `packages/cli/src/release/public-package-contract.ts` (the
  five-package set). The in-worktree drift check for p02 MUST additionally run
  `git diff --stat 6f443c08..HEAD -- tools/release/validate-public-packages.ts packages/cli/src/release/public-package-contract.ts`
  and treat a change to either as a material mismatch to compare against the
  plan before editing.
  **Orchestrator reconciliation (non-narrowing):** the new strict-greater
  comparison belongs in `check-version-bumps.ts` / `release-utils.ts` exactly
  as the plan scopes it, with its errors appended to the result that already
  aggregates the merge-base lockstep errors; `release:validate`'s separate
  merge-base lockstep pass is intentionally left unchanged (the plan requires
  the extended `release:check-versions` gate to reject the overtaken case, and
  both commands run in CI, so a single failing gate is sufficient; "do not add
  a second competing gate" governs). Nothing the plan requires is waived.
- **Pre-existing repository condition (not drift):** the existing release test
  files import `tools/release/*` through parent-relative paths; extending
  those files may reuse their established import style, but no new file may
  introduce a parent-relative import (AGENTS.md import convention).

---

## Phase 01: bound-smoke-cleanup-signal-wait (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Bound smoke cleanup signal waits and preserve failure diagnostics

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-19-bound-smoke-cleanup-signal-wait.md`

**Ordering:** group 1; own worktree, parallel with p02. Merges first (bounds the
validation hang before the release-guard lane's integration run). Write surface
is `tools/smoke/runner/cleanup.test.mjs` only (non-authoritative recon).

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the full DoD gates from
the wrapper execution contract (including `pnpm lint && pnpm format`).
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(provider/model/effort owned by dispatch configuration, not this plan);
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t01): bound smoke cleanup signal waits and keep failure diagnostics"
```

---

## Phase 02: detect-behind-main-package-versions (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Reject publishable package versions overtaken by current main

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-19-detect-behind-main-package-versions.md`

**Ordering:** group 1; own worktree, parallel with p01. Merges second, after
p01. Write surface is `tools/release/*` + `packages/cli/src/release/*` with
conditional `.github/workflows/ci.yml` / `AGENTS.md` (non-authoritative recon).
Apply the rule-1 drift-check addendum from the Drift Refresh Record.

**Step 1: Drift check** — per the source plan's `## Drift check`, plus the
rule-1 addendum above.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the full DoD gates from
the wrapper execution contract.
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(provider/model/effort owned by dispatch configuration, not this plan);
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p02-t01): reject publishable package versions overtaken by current main"
```

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                           | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | -------- | ---------- | -------------------------------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending  | -          | -                                                  | -             | -          | -           |
| p02    | code     | pending  | -          | -                                                  | -             | -          | -           |
| final  | code     | pending  | -          | -                                                  | -             | -          | -           |
| plan   | artifact | received | 2026-08-26 | reviews/artifact-plan-review-2026-08-26T125608Z.md | -             | -          | -           |
| spec   | artifact | pending  | -          | -                                                  | -             | -          | -           |
| design | artifact | pending  | -          | -                                                  | -             | -          | -           |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

- [ ] 2/2 phases, 2/2 tasks complete
- [ ] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after all merges):
      `oat backlog archive` with real outcome summaries for
      `BL-260818-bound-the-smoke-cleanup` and
      `BL-260817-detect-branch-behind-published`, one commit
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md`
      before any archive step
- [ ] Full DoD gates green on the integration branch

## References

- Source plans: the 2 `.oat/repo/reference/external-plans/*.md` files named above
- Program artifact: `.oat/repo/reference/external-plans/2026-08-19-execution-program.md`
- Program index: `.oat/repo/reference/external-plans/2026-08-19-backlog-review-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`, prior wave summary
  `.oat/repo/reference/project-summaries/20260722-wave-skills-promotion.md`
