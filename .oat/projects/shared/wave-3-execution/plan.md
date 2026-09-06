---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-06
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p01', 'p02']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-3-execution (Wave 3 external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: 3 worktrees (operator
> decision); group 1 is p01 + p02, p03 is ungrouped and runs alone after it.

**Goal:** Execute the 5 Wave 2 external plans (bundled-skill contract repair;
codex-skill anaphora guard; docs-app mirrors of contract-tested prose; named
lifecycle skills must be loaded; patch-and-restore recovery for lost child
handles) through the wave→project wrapper pattern
(DR-260713-wave-project-wrapper-over), per the 2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`, Wave 3).

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
3. **Confirm the source plan's `## Done criteria`**, then run the lane-mode DoD
   gates: the plan's focused tests, then `pnpm check`, `pnpm type-check`,
   `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
   `pnpm oat:validate-skills` (every lane changes `.agents/skills` or its tests),
   each with captured exit codes. Lanes never edit the lockstep release files
   (five public package manifests, `packages/cli/assets/public-package-versions.json`,
   `pnpm-lock.yaml`) and never run `pnpm release:check-versions` or
   `pnpm release:validate`; the wave fan-in owns the single lockstep bump
   (≥ 0.2.58, above freshly fetched `origin/main`) and the full eight-gate
   sequence after every merge.
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
   shared files: `packages/cli/src/validation/skills.test.ts` (p01 → p03: p01 moves the three `oat-phase-implementer` pins when it bumps the agent, p03 adds assertions and moves the two `oat-project-design` pins), `.oat/sync/manifest.json` (p01 → p03; a no-op restamp in lane mode because every entry is a symlink, so it only diffs with the lockstep), and `.agents/skills/create-oat-skill/SKILL.md` (wave 2 bumped it to 1.5.0; p03 bumps it once more) (each lane that edits a canonical skill or agent file
   runs `pnpm run cli -- sync --scope all` after its edits and commits the
   restamp; never the global `oat`, which is 0.2.55 and would restamp
   `oatVersion` downward). The fan-in bump commit also runs the sync so
   `.oat/sync/manifest.json` restamps with the lockstep.
7. **Backlog archival is NOT part of any task** — once, serialized on the
   integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt <file>` (or
   `pnpm format:fix`) on markdown it writes and reports observations for
   `orchestration-log.md` (workers report; the root appends). Never format
   `state.md`.
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.
11. **Repo-local CLI:** the global `oat` (0.2.55) trails the branch (0.2.57);
    every `oat` invocation that reads or writes repository state (`sync`,
    `docs generate-index`, validators) uses `pnpm run cli -- <command>` or
    `node packages/cli/dist/index.js` after `pnpm build`.

12. **Verification evidence:** `pnpm check` and `pnpm type-check` replay Turbo
    caches; evidence runs use `HOME=$(mktemp -d) pnpm exec turbo run <gate>
--force` (`Cached: 0`). Disposition-verification rounds execute prose shell
    snippets verbatim in a fresh shell and walk every failure sequence of a
    contract; `oat gate review` writes its own Reviews row, which the receive
    step moves forward in place.

## Parallelism

Group 1 is p01 (repo-wide call-site sweeps) and p02 (deterministic smoke
worktree journaling) together in separate worktrees at the wave base: their
write surfaces are disjoint (lifecycle prose and its contract test versus
`tools/smoke/**`). p03 (executable backstops) runs alone after group 1
(ungrouped) because it edits `create-oat-skill/SKILL.md` and
`packages/cli/src/validation/skills.test.ts`, which p01's contract-test work
and the fan-in pins also touch, and because the program orders it second so its
examples can cite the freshly delivered executable contracts.

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time.

- p01 write surface: `.agents/agents/oat-phase-implementer.md` (prose + `version:`
  1.1.2 → next; pins at `packages/cli/src/validation/skills.test.ts:2817`,
  `:3127`, `:5577`), `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
  (stable assertions + negative probe), conditionally
  `.agents/skills/oat-project-implement/SKILL.md` (+ bump and seven pins, only
  if the canonical file is actually edited), provider views are symlinks,
  `.oat/sync/manifest.json` (no-op restamp). **Rule-1 addendum (non-narrowing):**
  the plan's In-scope list and drift-check command omit `skills.test.ts`
  although the agent bump (wave-2 precedent 1.1.1 → 1.1.2) moves its three pins;
  the lane extends its in-worktree drift check with
  `git diff --stat <plan-commit>..HEAD -- packages/cli/src/validation/skills.test.ts`
  and treats the pins as part of its write surface.
- p02 write surface: `tools/smoke/runner/journal.mjs`, `tools/smoke/runner/cleanup.mjs`,
  `tools/smoke/runner/provision.mjs`, `tools/smoke/deterministic/provider.mjs`,
  `tools/smoke/CONTRACT.md`, the five smoke test files (`journal`, `cleanup`,
  `provision`, `deterministic`, `run-smoke`), and
  `apps/oat-docs/docs/contributing/smoke-testing.md:229-255`; `apps/oat-docs/index.md`
  only if that page's frontmatter title/description changes. No `.agents/**`
  write, no skill bump, no sync.
- p03 write surface: `.agents/skills/create-oat-skill/SKILL.md` (1.5.0 → next; no
  pin anywhere), `.agents/skills/oat-project-design/SKILL.md` (2.3.2 → next;
  pins at `skills.test.ts:1839` and `:6467` — the plan's step-4 "pins where they
  exist" is plural), `packages/cli/src/validation/skills.test.ts` (new
  assertions + pins), `.oat/sync/manifest.json` (no-op restamp). **Executor
  note (non-narrowing):** `packages/cli/src/validation/named-skill-load-contract.test.ts`
  (wave 2) scans `create-oat-skill/SKILL.md` and requires a load clause on every
  execution-boundary-shaped mention of an `oat-project-*` skill; examples in the
  new subsection must avoid that shape or carry the clause.
- Intersections: p01 ∩ p03 = `skills.test.ts` and the manifest restamp
  (cross-group by construction); p02 ∩ anything = lockstep files only (fan-in
  owned). Group 1 is write-disjoint.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in all three lanes: p01 and p03 change lifecycle and
authoring prose that other skills load; p02 is a worktree-creation and
deletion-safety surface whose reservation and cleanup must fail closed, and it
receives the program's dedicated ownership and deletion-safety review before
integration._

## Drift Refresh Record (2026-09-06, vs `e97954dd1e85287a41a59fe58730c606e00eb598`)

**0 PASS / 3 MINOR-DRIFT / 0 STOP.** This record is non-authoritative recon
evidence (one bounded read-only recon agent, Opus, native dispatch, run against
the wave base `e97954dd1`). Waves 1 and 2 merged since the plans' authored
commit `49aeb5075`; draft PR #190 is unchanged at
`63161897dd40a66e1b29cf19e286665895c40dde`.

- **p01 — require repo-wide call-site sweeps:** MINOR-DRIFT. Wave 2 changed
  `oat-phase-implementer.md` (+132: `recovered_patch` clean-tree exception at
  `:345-354`, report-schema additions at `:476+`), `phase-execution.md` (+222:
  the capture/verify/recovery sequence, not task-boundary policy), and the
  `oat-project-implement/SKILL.md` version line. No equivalent cross-cutting
  sweep rule exists anywhere under `.agents/` (zero hits for "cross-cutting
  option", "repository-wide sweep", "call-site"), so the plan's STOP ("normative
  phase owner moved or already contains an equivalent rule") is not tripped.
  Anchors re-verified: `oat-phase-implementer.md:348-374` → `:359-385`
  (`### 2. Execute Tasks in Plan Order` at `:359`), `:161-240` → `:162-241`;
  `oat-project-implement/SKILL.md:191-216` unchanged;
  `post-implement-sequence-contracts.test.ts:850-865` unchanged. **Executor note
  (non-narrowing):** the wave-2 lesson encoded at
  `post-implement-sequence-contracts.test.ts:855-867` ("the entry file states
  the contract, but `phase-execution.md` is the route that runs") will create
  review pressure to mirror the rule into `phase-execution.md`; doing so is a
  plan decision that escalates into an `oat-project-implement` bump plus seven
  pins — the plan's own owner choice governs, and any widening is reported, not
  improvised.
- **p02 — journal deterministic smoke worktrees:** MINOR-DRIFT (benign). Only
  `tools/smoke/CONTRACT.md` changed (+14/−1, PR #255's `runtimeObservation`
  paragraph at `:421-424` and `:466-477`), the landing event the plan already
  records; the cleanup/ownership section it rewrites (`:293-307`) is unchanged.
  All eleven other cited files are byte-identical and every anchor is exact
  (`provider.mjs:110-132`, `provision.mjs:243-246`, `journal.mjs:356-365`,
  `cleanup.mjs:769-795`, the five test anchors). `pnpm test:smoke` on the wave
  base: 141/141, exit 0, no leaked worktrees.
- **p03 — require executable backstops:** MINOR-DRIFT. Wave 2 bumped
  `create-oat-skill/SKILL.md` to 1.5.0 and inserted a `**Named-skill
execution**` block at `:109-128`, moving the autonomy-inventory anchor
  `:109-120` → `:130-141` (the insertion point "near the existing autonomy
  inventory guidance" is still well-defined); `skills.test.ts` grew by 753
  lines and now pins `oat-project-design` twice; `skills-bundled-docs-contract.test.ts`
  was reshaped but remains the shipped-copy-consistency precedent (`describe`
  at `:525`), so the plan's "cited precedent no longer represents the class"
  STOP is not tripped. `oat-project-design/SKILL.md:387-400`,
  `autonomy-gate-inventory.test.ts`, and `commands/project/log/rollup.ts` are
  unchanged.
- **Coverage audit:** every drift command omits the lockstep release files
  (fan-in owned by all three In-scope lists) and `.oat/sync/manifest.json`; p01's
  omits `skills.test.ts` (rule-1 addendum above); p03's omits
  `named-skill-load-contract.test.ts` (executor note above).
- **Landing events:** draft PR #190 unchanged; W1/W2 merges are the only
  churn, all accounted for above. Lockstep bump for this wave: 0.2.57 → 0.2.58
  at the group-1 fan-in, with the manifest restamp in the same commit.

---

## Phase 01: require-repo-wide-call-site-sweeps (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Require repo-wide call-site sweeps for cross-cutting options

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-require-repo-wide-call-site-sweeps.md`

**Ordering:** group 1; runs at the wave base in parallel with p02 and merges first within the group. Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p01-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(at most two rounds; format before dispatching); disposition every finding in
the phase report.

**Step 5: Commit**

```bash
git commit -m "docs(p01-t01): require repo-wide call-site sweeps for cross-cutting options"
```

---

## Phase 02: journal-deterministic-smoke-worktrees-before-creation (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Journal deterministic smoke worktrees before creation

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-journal-deterministic-smoke-worktrees-before-creation.md`

**Ordering:** group 1; runs at the wave base in parallel with p01; dedicated ownership and deletion-safety review before integration. Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p02-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(at most two rounds; format before dispatching); disposition every finding in
the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p02-t01): journal deterministic smoke worktrees before creation"
```

---

## Phase 03: require-executable-backstops-for-contract-claims (ungrouped, last)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p03-t01: Execute external plan — Require executable backstops for standing contract claims

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-require-executable-backstops-for-contract-claims.md`

**Ordering:** ungrouped; runs alone after group 1 merges (shares `create-oat-skill/SKILL.md` and `skills.test.ts` seams). Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p03-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(at most two rounds; format before dispatching); disposition every finding in
the phase report.

**Step 5: Commit**

```bash
git commit -m "docs(p03-t01): require executable backstops for standing contract claims"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -          | -                                                           | -             | -          | -           |
| p02    | code     | pending | -          | -                                                           | -             | -          | -           |
| p03    | code     | pending | -          | -                                                           | -             | -          | -           |
| final  | code     | pending | -          | -                                                           | -             | -          | -           |
| plan   | artifact | passed  | 2026-09-06 | reviews/archived/artifact-plan-review-2026-09-06T110723Z.md | -             | -          | -           |
| spec   | artifact | pending | -          | -                                                           | -             | -          | -           |
| design | artifact | pending | -          | -                                                           | -             | -          | -           |

> Reviews are recorded newest-last (append-only); superseded events keep their own rows, and `oat gate review` writes its own row per gate artifact which the receive step moves forward in place. Reviewed heads are the pre-rebase lane commits the reviewers examined; the fan-in entries in `implementation.md` map each to its integration commit.

## Implementation Complete

- [ ] 3/3 phases, 3/3 tasks complete
- [ ] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after all merges):
      `oat backlog archive` with real outcome summaries for
      `BL-260818-require-repo-wide-call-site`, `BL-260826-deterministic-smoke-tier-leaks`,
      `BL-260714-executable-backstops`, one commit
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md`
      before any archive step
- [ ] Full DoD gates green on the integration branch (fan-in lockstep bump above
      freshly fetched `origin/main`)

## References

- Source plans: the 3 `.oat/repo/reference/external-plans/*.md` files named above
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Program indexes: `.oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-3-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`; prior wave summaries in
  `.oat/projects/shared/wave-1-execution/summary.md` and
  `.oat/projects/shared/wave-2-execution/summary.md`
