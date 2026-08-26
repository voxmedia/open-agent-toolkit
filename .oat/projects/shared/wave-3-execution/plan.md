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

# Implementation Plan: wave-3-execution (Wave 3 external-plan wrapper)

> Execute this plan using `oat-project-implement` — one ungrouped phase
> executed sequentially. Concurrency ceiling: 3 worktrees (operator decision);
> this wave uses 1.

**Goal:** Execute the 1 Wave 3 external plan (honor an explicit CLI assets root
and isolate the package-coverage smoke test) through the wave→project wrapper
pattern (DR-260713-wave-project-wrapper-over).

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
   `pnpm run check:skill-bumps`, `git fetch origin` then `pnpm release:check-versions`,
   `pnpm release:validate`, `pnpm build:docs`, then `pnpm lint` and `pnpm format`
   (required: this wave touches `tools/smoke`). Toolchain: Node 22.17.0 /
   pnpm 10.13.1; `pnpm run worktree:init` already ran.
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

- Write surface: `packages/cli/src/fs/assets.ts`, `packages/cli/src/fs/assets.test.ts`,
  `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs`, the five public
  package manifests, `pnpm-lock.yaml` (likely no-op — workspace links, no literal
  versions), and the build-generated `packages/cli/assets/public-package-versions.json`.
  Read-only dependency: `packages/cli/scripts/bundle-assets.sh`.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review is
embedded in the lane: environment-override / containment boundary on asset
resolution._

## Drift Refresh Record (2026-08-26, vs `33149b26298f6d6bb631fdadb55de23bc9678edc`)

**1 PASS / 0 MINOR-DRIFT / 0 STOP.** Non-authoritative recon evidence (one bounded
read-only recon agent, Sonnet 5, native dispatch); the lane re-runs its drift
check in-worktree.

- Drift-check diff `6f443c08..33149b26` over the plan's listed paths touches only
  the `version` line of the five public manifests (0.2.32 → 0.2.34 via W1 and W2);
  `assets.ts`, `assets.test.ts`, `bundle-assets.sh`,
  `package-coverage-consumers.test.mjs`, and `pnpm-lock.yaml` are byte-identical
  to the authoring commit. Plan evidence lines re-verified (`assets.ts:69/72`,
  `assets.test.ts:9/11`, `bundle-assets.sh:6`, `:12–19`, consumer test `:27`).
- STOP-condition pre-checks (recon, to be re-run in-worktree): every
  `resolveAssetsRoot(` call site (~35, all under `packages/cli/src/**`) passes
  zero arguments; the only `OAT_ASSETS_DIR` reader is `bundle-assets.sh:6`, and
  every test that sets it consumes the isolated bundle directly or via an
  explicit `assetsRoot` argument — no consumer relies on runtime resolution
  ignoring the variable (STOP #1 clear). `pnpm test:smoke` runs
  `node --test tools/smoke/*/*.test.mjs tools/smoke/*/*/*.test.mjs`, one process
  per file (STOP #3 clear at the runner level; per-file scoping is the plan's
  own step 3). The consumer test never mutates `process.env`; built modules
  resolve assets lazily inside function bodies, not at import.
- **Rule-1 addendum (coverage gaps):** the source plan's drift command omits
  surfaces its implementation writes or depends on. The in-worktree drift check
  MUST additionally run, before editing:
  1. `git fetch origin && git diff --stat 33149b26..origin/main -- packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml packages/cli/assets/public-package-versions.json`
     (the release surfaces the plan writes, revalidated against the recorded wave
     baseline `33149b26` on a freshly fetched `origin/main`) — any advance of the
     public-package baseline after planning is a material mismatch: STOP and
     report the new baseline rather than bumping from a stale one. Separately,
     run `git fetch origin` immediately before every `pnpm release:check-versions`
     invocation so the strict-greater guard compares against a current
     `origin/main`.
  2. `grep -rn "OAT_ASSETS_DIR" packages tools apps --include='*.ts' --include='*.mjs' --include='*.sh' --include='*.md' -l`
     and `grep -rn "resolveAssetsRoot(" packages tools --include='*.ts' --include='*.mjs'`
     — re-confirm before editing that no call site passes an argument and no
     consumer depends on the variable being ignored at runtime (the plan's first
     STOP condition); a new reader or an argument-passing call site is a material
     mismatch.
  3. `git diff --stat 6f443c08..HEAD -- package.json tools/smoke/runner`
     (the `test:smoke` invocation and the smoke runner that decide process
     isolation for the consumer test; a change to how `tools/smoke/*/*.test.mjs`
     files are executed is a material mismatch against the plan's third STOP
     condition).
- **Release-root intersection (W1 rule):** `packages/cli/src/fs/assets.ts` and
  its test sit under `packages/cli/src/**` (publishable change;
  `versionPolicyIgnorePatterns` is `['assets/**']`); the plan's step 4 lockstep
  bump **0.2.34 → 0.2.35** is required and pre-planned as part of the lane.
  `origin/main` = `33149b26` at 0.2.34, so the strict-greater guard passes at
  0.2.35.
- Implementer notes (non-narrowing): `pnpm-lock.yaml` records workspace links, so
  the bump likely leaves it unchanged — an unchanged lockfile is not a failure;
  `packages/cli/assets/public-package-versions.json` is committed and regenerated by
  `pnpm build` (`bundle-assets.sh:66–90`) — expect it to change with the bump;
  `packages/cli/tsconfig.json` excludes `*.test.ts` from `pnpm type-check`;
  same-directory imports use `./…`, cross-directory use aliases; `tools/smoke`
  is covered only by `pnpm lint`/`pnpm format` (CI runs neither — the wrapper
  DoD adds both).

---

## Phase 01: hermetic-cli-assets-root (solo)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Honor an explicit CLI assets root and isolate package coverage smoke tests

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-19-hermetic-cli-assets-root.md`

**Ordering:** solo; runs on the integration checkout (`wave-3-execution`).

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
git commit -m "feat(p01-t01): honor OAT_ASSETS_DIR in resolveAssetsRoot and isolate package-coverage smoke assets"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target              |
| ------ | -------- | ------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ------------------------ |
| p01    | code     | pending | -          | -                                                           | -             | -          | -                        |
| final  | code     | pending | -          | -                                                           | -             | -          | -                        |
| plan   | artifact | passed  | 2026-08-26 | reviews/archived/artifact-plan-review-2026-08-26T231805Z.md | -             | gate       | cursor-gpt-5-6-sol-xhigh |
| spec   | artifact | pending | -          | -                                                           | -             | -          | -                        |
| design | artifact | pending | -          | -                                                           | -             | -          | -                        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

Strictly ordered — each item depends on the one before it (wave-execute Step 6
closeout sequence):

1. [ ] 1/1 phases, 1/1 tasks complete; the source plan's `## Done criteria`
       confirmed (recorded in `implementation.md` § Done-criteria confirmation)
2. [ ] Full DoD gates green on the integration branch (exit codes captured per
       gate, including `pnpm lint` and `pnpm format`)
3. [ ] Orchestration-log end-of-run synthesis written and rolled up into
       `summary.md` — before any archive step of the project
4. [ ] **Serialized backlog bookkeeping:** `oat backlog archive
BL-260817-let-resolveassetsroot-honor` with a real outcome summary, one commit

## References

- Source plan: `.oat/repo/reference/external-plans/2026-08-19-hermetic-cli-assets-root.md`
- Program artifact: `.oat/repo/reference/external-plans/2026-08-19-execution-program.md`
- Program index: `.oat/repo/reference/external-plans/2026-08-19-backlog-review-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`; prior wave summaries
  `.oat/projects/shared/wave-1-execution/summary.md`,
  `.oat/projects/shared/wave-2-execution/summary.md`
