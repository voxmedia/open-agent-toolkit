---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-26
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p01'] # final (only) phase; workflow.hillCheckpointDefault=final
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_plan_parallel_groups: [] # solo lane — one ungrouped phase (validate-plan rejects singleton groups)
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-2-execution (Wave 2 external-plan wrapper)

> Execute this plan using `oat-project-implement` — one ungrouped phase
> executed sequentially. Concurrency ceiling: 3 worktrees (operator decision);
> this wave uses 1.

**Goal:** Execute the 1 Wave 2 external plan (surface sync producer/invoker
version skew before mutation) through the wave→project wrapper pattern
(DR-260713-wave-project-wrapper-over).

**Architecture:** Thin wrapper. The task's **entire and only implementation
contract** is its external plan under `.oat/repo/reference/external-plans/`. The
task below carries wrapper-owned metadata exclusively: the source-plan path,
ordering/dependencies, wrapper-level verification gates, the commit convention, and
review mapping. Nothing in this file restates, narrows, or overrides the source plan.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — the external plan
governs commit content and granularity; the wrapper adds the `pNN-tNN` scope.

**Wrapper execution contract (applies to every task):**

1. **Drift check first.** Run the source plan's `## Drift check` against current
   HEAD (plus the rule-1 addendum below). A material mismatch (per that plan's own
   definition) is a STOP. The wave-boundary drift refresh (see record below) does
   not replace the in-worktree re-check.
2. **Execute the source plan's `## Implementation steps`** in order with each
   step's embedded Verify gate; honor its `## STOP conditions` verbatim.
3. **Confirm the source plan's `## Done criteria`**, then run the full DoD gates
   in this order, invoking each gate literally and capturing each exit code to a
   log file: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`,
   `pnpm run check:skill-bumps`, `pnpm release:check-versions`,
   `pnpm release:validate`, `pnpm build:docs`. (`pnpm lint`/`pnpm format` are not
   required — this wave touches neither `tools/smoke` nor `.agents/skills`.)
   Toolchain: Node 22.17.0 / pnpm 10.13.1; `pnpm run worktree:init` already ran.
4. **STOP → BLOCKED at phase level.** A source-plan STOP parks the phase (record
   in `state.md` `oat_blockers` + `implementation.md`).
5. **Group-dependency rule:** not applicable (single phase).
6. **Merge serialization:** not applicable (the phase runs on the integration
   checkout; no phase worktree merges).
7. **Backlog archival is NOT part of the task** — once, serialized on the
   integration branch after the phase passes (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt --write <file>` on
   markdown it writes and reports observations for `orchestration-log.md`
   (workers report; the root appends).
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.

## Parallelism

None — one phase, executed sequentially on the integration checkout.

> The recon observations below are **non-authoritative grouping evidence only** —
> they never constrain the source plan: its own live checks govern at execution
> time.

- Write surface: `packages/cli/src/commands/sync/{sync.types,index,apply,dry-run}.ts`,
  `packages/cli/src/commands/sync/index.test.ts`, the five public package
  manifests, `pnpm-lock.yaml` (likely no-op — workspace links, no literal
  versions), and the build-generated `packages/cli/assets/public-package-versions.json`.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review is
embedded in the lane: shipped CLI output/provenance surface._

## Drift Refresh Record (2026-08-26, vs `1bd5424b48af0f1cd385ce42246952d16ab438f7`)

**1 PASS / 0 MINOR-DRIFT / 0 STOP.** Non-authoritative recon evidence (one bounded
read-only recon agent, Sonnet 5, native dispatch); the lane re-runs its drift
check in-worktree.

- Drift-check diff `6f443c08..1bd5424b -- packages/cli/src/commands/sync packages/cli/src/manifest`
  is empty; all six in-scope files are byte-identical to the authoring commit.
  Evidence lines: 5/7 exact, 2 off-by-one (`dry-run.ts` JSON envelope at :99,
  `apply.ts` at :169; `index.ts:238` is the manifest-path line, the `loadManifest`
  call is :243) — authoring imprecision, not drift. No `diagnostics`/`warnings`/
  `advisories` field exists in sync output (STOP #1 does not apply).
- **Rule-1 addendum (coverage gap):** `OAT_VERSION` lives in
  `packages/cli/src/shared/oat-version.ts` (imported by `apply.ts` and
  `manifest/manager.ts`), outside the plan's drift command. The in-worktree drift
  check MUST additionally run
  `git diff --stat 6f443c08..HEAD -- packages/cli/src/shared/oat-version.ts` and
  treat a change there as a material mismatch to compare before editing.
- **Release-root intersection (W1 rule):** every touched file sits under
  `packages/cli/src/**` (publishable change; `versionPolicyIgnorePatterns` is
  `['assets/**']`); the plan's step 4 lockstep bump **0.2.33 → 0.2.34** is
  required and pre-planned as part of the lane. `origin/main` = `1bd5424b` at
  0.2.33, so the strict-greater guard passes at 0.2.34.
- Implementer notes (non-narrowing): `pnpm-lock.yaml` records workspace links, so
  the bump likely leaves it unchanged — an unchanged lockfile is not a failure;
  `packages/cli/assets/public-package-versions.json` is committed and regenerated by
  `pnpm build` (its 4-key shape — no `control-plane` entry — is pre-existing and
  out of scope); `packages/cli/tsconfig.json` excludes `*.test.ts` from
  `pnpm type-check`; same-directory imports use `./…`, cross-directory use aliases.

---

## Phase 01: warn-sync-version-skew (solo)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Surface sync producer and invoker version skew before mutation

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-19-warn-sync-version-skew.md`

**Ordering:** solo; runs on the integration checkout (`wave-2-execution`).

**Step 1: Drift check** — per the source plan's `## Drift check`, plus the rule-1
addendum above.

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
git commit -m "feat(p01-t01): warn when oat sync manifest and invoking CLI versions differ"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending         | -          | -                                                           | -             | -          | -           |
| final  | code     | pending         | -          | -                                                           | -             | -          | -           |
| plan   | artifact | fixes_completed | 2026-08-26 | reviews/archived/artifact-plan-review-2026-08-26T192011Z.md | -             | -          | -           |
| spec   | artifact | pending         | -          | -                                                           | -             | -          | -           |
| design | artifact | pending         | -          | -                                                           | -             | -          | -           |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

- [ ] 1/1 phases, 1/1 tasks complete
- [ ] The source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after the phase passes):
      `oat backlog archive BL-260718-warn-when-oat-sync-uses` with a real outcome summary, one commit
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md`
      before any archive step
- [ ] Full DoD gates green on the integration branch

## References

- Source plan: `.oat/repo/reference/external-plans/2026-08-19-warn-sync-version-skew.md`
- Program artifact: `.oat/repo/reference/external-plans/2026-08-19-execution-program.md`
- Program index: `.oat/repo/reference/external-plans/2026-08-19-backlog-review-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`; prior wave summary
  `.oat/projects/shared/wave-1-execution/summary.md`
