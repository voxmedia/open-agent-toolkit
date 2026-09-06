---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-06
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p02', 'p03', 'p04']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-2-execution (Wave 2 external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: 3 worktrees (operator
> decision); p01 and p05 are ungrouped and run alone, group 2 uses all three.

**Goal:** Execute the 5 Wave 2 external plans (bundled-skill contract repair;
codex-skill anaphora guard; docs-app mirrors of contract-tested prose; named
lifecycle skills must be loaded; patch-and-restore recovery for lost child
handles) through the wave→project wrapper pattern
(DR-260713-wave-project-wrapper-over), per the 2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`, Wave 2).

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
   (≥ 0.2.57, above freshly fetched `origin/main`) and the full eight-gate
   sequence after every merge.
4. **STOP → BLOCKED at phase level (bundle exception).** A source-plan STOP parks
   the phase (record in `state.md` `oat_blockers` + `implementation.md`); sibling
   phases continue. **Bundle phases:** a STOP parks only the stopped task; the
   implementer records the blocker and continues remaining independent tasks; the
   phase is terminal when every task is completed or parked
   (DR-260713-bundle-stop-semantics-park). p01's source plan defines its own
   task and commit boundaries; a STOP inside it parks per that plan.
5. **Group-dependency rule:** a group starts when every phase of the previous
   group is terminal — merged, or parked with completed commits merged. A park
   never blocks the next group.
6. **Merge serialization:** within a group, merge phase branches one at a time in
   plan order, rebasing each on the updated tip first. Deliberately sequenced
   shared files (all cross-group, none within a group):
   `packages/cli/src/validation/skills.test.ts` (p01 → p04 → p05: p01 adds a
   contract group, p04 and p05 update version pins), `.oat/sync/manifest.json`
   (p01 → p04 → p05; each lane runs `pnpm run cli -- sync --scope all` after its
   skill edits and commits the restamp; never the global `oat`, which is 0.2.55
   and would restamp `oatVersion` downward), and
   `.agents/skills/oat-project-implement/SKILL.md` (p04 → p05: p04 bumps
   `oat-project-implement` once for the wave and updates its seven pins; p05
   rebases onto that value and does not bump again — one bump per changed skill
   in the final PR diff).
7. **Backlog archival is NOT part of any task** — once, serialized on the
   integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt <file>` (or
   `pnpm format:fix`) on markdown it writes and reports observations for
   `orchestration-log.md` (workers report; the root appends). Never format
   `state.md`.
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.
11. **Repo-local CLI:** the global `oat` (0.2.55) trails the branch (0.2.56);
    every `oat` invocation that reads or writes repository state (`sync`,
    `docs generate-index`, validators) uses `pnpm run cli -- <command>` or
    `node packages/cli/dist/index.js` after `pnpm build`.

## Parallelism

p01 runs alone first (ungrouped) because it establishes the corrected canonical
prose baseline and writes the shared contract-test file. Group 2 is p02, p03,
and p04 together in separate worktrees at the post-p01 integration tip. p05 runs alone
after group 2 (ungrouped) because it shares `oat-project-implement/SKILL.md`,
the version pins, and the sync manifest with p04. Rationale: the drift refresh
intersected all five complete write surfaces (including skill version bumps,
`skills.test.ts` pins, and the sync manifest); the only non-empty intersections
are p01∩p04, p01∩p05, and p04∩p05, all cross-group.

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time.

- p01 write surface: `.agents/skills/{oat-doctor,oat-brainstorm,oat-idea-summarize,analyze}/SKILL.md`
  (prose + `version:` bumps; none is pinned), `packages/cli/src/validation/skills.test.ts`
  (new contract group), `packages/cli/src/commands/tools/shared/pack-manifest.ts`
  (read; write only if the live inventory is wrong), `.oat/sync/manifest.json`.
- p02 write surface: `.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs`;
  conditional `.agents/skills/codex-skill/SKILL.md` (+ bump; `codex-skill` has
  no pin in `skills.test.ts`).
- p03 write surface: `.agents/skills/explainer-kit/tests/contracts.test.mjs`;
  conditional `apps/oat-docs/docs/workflows/skills/explainer-kit.md`;
  `apps/oat-docs/index.md` only via `pnpm run cli -- docs generate-index`.
  The plan makes no `explainer-kit/SKILL.md` edit; if one becomes necessary it
  forces a bump and the `skills.test.ts:1196` pin — that would create an
  in-group intersection with p04, so it is a STOP-and-report for the root, not a
  silent widening.
- p04 write surface: `.agents/skills/{create-oat-skill,oat-project-implement,oat-project-autonomous,oat-project-quick-start,oat-project-complete,oat-project-pr-final,oat-project-next,oat-project-review-receive,oat-project-revise,oat-project-discover}/SKILL.md`
  (+ bumps), `oat-project-implement/references/completion-and-closeout.md`,
  `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`,
  `packages/cli/src/validation/skills.test.ts` (pins for implement ×7,
  quick-start ×3, complete, pr-final, next ×2, review-receive ×2, discover),
  `.oat/sync/manifest.json`.
- p05 write surface: `oat-project-implement/references/phase-execution.md`,
  `oat-project-implement/SKILL.md` (no second bump; carries p04's value),
  new `oat-project-implement/scripts/capture-dirty-tree.mjs` and
  `tests/capture-dirty-tree.test.mjs`, `.agents/agents/oat-phase-implementer.md`
  (bump + pin at `skills.test.ts:3080` — authorized below), `.agents/docs/autonomy-contract.md`
  and its four skill-tree mirrors (symlinks need no bump; copies must be
  refreshed and their owning skills bumped with pins), `packages/cli/src/validation/skills.test.ts`,
  `apps/oat-docs/docs/workflows/projects/implementation-execution.md`,
  `.oat/sync/manifest.json`.
- Intersection within group 2: empty (p02 and p03 bump no pinned skill and run
  no sync). Cross-group seams are listed in contract item 6.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in all five lanes: p01–p04 change contract tests and
lifecycle prose that other skills load; p05 is a recovery/containment surface
whose capture script must fail closed._

## Drift Refresh Record (2026-09-06, vs `90883f9bcfb0bc52a2fd58571542d194f71ee585`)

**1 PASS / 4 MINOR-DRIFT / 0 STOP.** This record is non-authoritative recon
evidence (one bounded read-only recon agent, Opus, native dispatch, run
against the W1 merge `6db0457c0`; the wave base `90883f9bc` adds only the
program's wave-close entry). Wave 1 touched no W2 write surface; all
substantive drift predates it (PRs #248, #255, #261). Draft PR #190 is
unchanged at `63161897dd40a66e1b29cf19e286665895c40dde` (217 files).

- **p01 — repair bundled-skill contract drift:** MINOR-DRIFT. `pack-manifest.ts`
  +124 (PR #248 added the `recon` skill, the `recon-worker` agent, and pack
  `dependencies` to the research pack) and `skills.test.ts` +81/−14 (no cited
  seam). **Orchestrator ruling:** accepted as drift, not a STOP — the plan's STOP
  list has no inventory-growth clause and its step 1 derives the inventory from
  the manifest, so the reconciliation simply covers one more skill and agent.
  Two doctor anchors were mis-anchored at authoring time: the workflows pack
  list is at `oat-doctor/SKILL.md:158-169` (cited `:154-165`) and the
  project-management list at `:186-189` (cited `:184-187`). **Executor note
  (non-narrowing):** the doctor's example "Available But Not Installed" block
  (`:242-249`) carries hard counts that the reconciled inventory makes false
  (research pack now has 6 skills); keep that example accurate as part of the
  inventory reconciliation without changing summary-mode behavior.
- **p02 — harden codex-skill anaphora guard:** PASS. Every cited file is
  byte-identical to the plan commit; the defect reproduces statically.
- **p03 — guard docs-app mirrors of skill prose:** MINOR-DRIFT (benign).
  `apps/oat-docs/index.md` +1 nav row (`recon.md`, outside the explainer-kit
  region). The docs mirror's missing catalog evidence is confirmed at
  `explainer-kit.md:437-439`.
- **p04 — require named lifecycle skills to be loaded:** MINOR-DRIFT.
  `dispatch-and-dry-run.md` +11 (PR #255, already recorded as satisfied
  revalidation, not a cited anchor); `skills.test.ts` +81/−14. All ten anchors
  exact, including the `oat-project-complete/SKILL.md:722` PR-final handoff
  canary. Stale field: the Dependencies row cites PR #190 head `81a51d2d845…`;
  the actual head is `63161897dd4…` (the Landing-event row is right). Plan
  correction queued for wave-close.
- **p05 — document patch-and-restore recovery:** MINOR-DRIFT.
  `implementation-execution.md` +13 (PR #255 inserted above the cited
  sentence; the sentence now sits at `:153-155`, cited `:141-143`);
  `autonomy-contract.md` (PR #261, `oat-dispatch-subagents` rows only);
  `review-skill-contracts.test.ts` +17 (not in scope). **Executor notes
  (non-narrowing):** re-anchor `:141-143` → `:153-155`; the test the plan
  describes at `autonomy-gate-inventory.test.ts:332-371` is
  `keeps all fifteen autonomous skill roots mapped at repository HEAD` at
  `:371-381`; the Landing-event row's `skills.test.ts:3325/:3277` are stale —
  the evidence section's `:3215/:3311/:3359` are exact; the revalidation grep
  `recovered_patch\|git diff --cached` now returns five hits (three in
  `review-skill-contracts.test.ts` from PR #255, two pre-existing in
  `commands/project/sync/ref-sync.ts`) while `recovered_patch` alone still
  returns none, so the plan's substantive claim holds. **Authorized in-phase
  boundary:** `.agents/agents/oat-phase-implementer.md` (v1.1.1) is pinned at
  `skills.test.ts:3080` and this plan edits it; bump it and update that pin
  (mechanically derived from the plan's own write). Plan corrections queued
  for wave-close.
- **Shared seam not in any plan:** `.oat/sync/manifest.json` is written by every
  lane that changes a canonical `SKILL.md` (p01, p04, p05) and by PR #190;
  contract item 6 assigns it per group and pins the CLI to the branch build.
  PR #190 overlaps: p01 (`skills.test.ts`, manifest); p04 (`oat-project-implement/SKILL.md`,
  `post-implement-sequence-contracts.test.ts`, `skills.test.ts`, manifest);
  p05 (`oat-project-implement/SKILL.md`, `phase-execution.md`,
  `autonomy-contract.md`, `skills.test.ts`, `implementation-execution.md`,
  manifest — the plan's row under-reports three of these). p02 and p03: none.
- **Rule-1 coverage audit:** p05's drift check omits
  `review-skill-contracts.test.ts` (not a write) and the sync manifest; the
  in-worktree drift check for p04 and p05 additionally runs
  `git diff --stat <plan-commit>..HEAD -- .oat/sync/manifest.json packages/cli/src/validation/skills.test.ts`
  and treats an unexpected change as material.

---

## Phase 01: repair-bundled-skill-contract-drift (ungrouped, first)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Repair four bundled-skill truthfulness contracts

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-repair-bundled-skill-contract-drift.md`

**Ordering:** ungrouped; runs alone at the wave base and merges before group 2
(it establishes the corrected canonical prose baseline and writes
`skills.test.ts`). Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p01-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer;
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t01): repair bundled-skill contract drift"
```

---

## Phase 02: harden-codex-skill-anaphora-guard (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Harden the codex-skill below-floor anaphora guard

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-harden-codex-skill-anaphora-guard.md`

**Ordering:** group 2; own worktree, parallel with p03 and p04 at the post-p01
tip. Shares no file with either sibling (recon-derived, non-authoritative).

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer;
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "test(p02-t01): harden the codex-skill anaphora guard"
```

---

## Phase 03: guard-docs-app-mirrors-of-skill-prose (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p03-t01: Execute external plan — Guard docs-app mirrors of contract-tested skill prose

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-guard-docs-app-mirrors-of-skill-prose.md`

**Ordering:** group 2; own worktree, parallel with p02 and p04. Shares no file
with either sibling as long as `explainer-kit/SKILL.md` stays unedited
(recon-derived, non-authoritative; an edit there is a STOP-and-report).

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer;
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "test(p03-t01): guard docs-app mirrors of contract-tested skill prose"
```

---

## Phase 04: require-named-lifecycle-skills-to-be-loaded (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p04-t01: Execute external plan — Require lifecycle orchestrators to load every named execution skill

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-require-named-lifecycle-skills-to-be-loaded.md`

**Ordering:** group 2; own worktree, parallel with p02 and p03. Only group-2
writer of `skills.test.ts` pins and `.oat/sync/manifest.json`; bumps
`oat-project-implement` once for the wave (p05 carries that value).
Predecessor of p05 (recon-derived, non-authoritative).

**Step 1: Drift check** — per the source plan's `## Drift check`, plus the
rule-1 addendum for the sync manifest and `skills.test.ts`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer;
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p04-t01): require lifecycle orchestrators to load every named execution skill"
```

---

## Phase 05: document-patch-and-restore-for-lost-child-handles (ungrouped, last)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p05-t01: Execute external plan — Document patch-and-restore recovery for lost child handles with staged work

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-document-patch-and-restore-for-lost-child-handles.md`

**Ordering:** ungrouped; runs alone after group 2 merges, at the post-group-2
tip. Carries p04's `oat-project-implement` bump (no second bump); bumps
`oat-phase-implementer` with its pin (authorized in the drift record).
Re-check the PR #190 landing row first.

**Step 1: Drift check** — per the source plan's `## Drift check`, plus the
rule-1 addendum for the sync manifest and `skills.test.ts`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(containment surface: weaker-anywhere analysis on the capture script's
fail-closed paths); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "docs(p05-t01): document fail-closed patch-and-restore recovery for lost child handles"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target |
| ------ | -------- | ----------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| p01    | code     | fixes_added | 2026-09-06 | reviews/archived/p01-review-2026-09-06T031243Z.md           | dcccb72d7c807593fd7b908ef78389eb6c98e636 | manual     | -           |
| p01    | code     | passed      | 2026-09-06 | reviews/archived/p01-review-2026-09-06T032717Z.md           | 848b8ef419e36f3a09c7a45e8cd69425af16e1f0 | manual     | -           |
| p02    | code     | fixes_added | 2026-09-06 | reviews/archived/p02-review-2026-09-06T051600Z.md           | c25e1fd4f3cfc70a60d9d17afe889403e8d008c7 | manual     | -           |
| p02    | code     | passed      | 2026-09-06 | reviews/archived/p02-review-2026-09-06T052907Z.md           | 530f428971dba27749bfb3f14cb8b0f13a65c8e7 | manual     | -           |
| p03    | code     | fixes_added | 2026-09-06 | reviews/archived/p03-review-2026-09-06T035240Z.md           | a207d3c11923aa10802c7747908458a924f1851f | manual     | -           |
| p03    | code     | passed      | 2026-09-06 | reviews/archived/p03-review-2026-09-06T041408Z.md           | 5a99837ec6fdb7e8d68bc7a5490228571ffd99ee | manual     | -           |
| p04    | code     | fixes_added | 2026-09-06 | reviews/archived/p04-review-2026-09-06T043410Z.md           | 6ef43933eee2dd79c14eaf5c4ddb50b3facc9157 | manual     | -           |
| p04    | code     | passed      | 2026-09-06 | reviews/archived/p04-review-2026-09-06T050809Z.md           | 2b06f7292ec47bf2835b91e7765d562dafd9e7b9 | manual     | -           |
| p05    | code     | fixes_added | 2026-09-06 | reviews/p05-review-2026-09-06T071018Z.md                    | de0ba133a4fdf85d382c070e46e4519bb4b10219 | manual     | -           |
| final  | code     | pending     | -          | -                                                           | -                                        | -          | -           |
| plan   | artifact | passed      | 2026-09-06 | reviews/archived/artifact-plan-review-2026-09-06T023526Z.md | -                                        | -          | -           |
| spec   | artifact | pending     | -          | -                                                           | -                                        | -          | -           |
| design | artifact | pending     | -          | -                                                           | -                                        | -          | -           |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Ledger rule:** superseded review events keep their own row; a later round is
appended, never rewritten over an earlier event.

## Implementation Complete

- [ ] 5/5 phases, 5/5 tasks complete
- [ ] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after all merges):
      `oat backlog archive` with real outcome summaries for
      `BL-260819-repair-verified-bundled-skill`, `BL-260827-harden-the-codex-skill-below`,
      `BL-260818-extend-guarded-prose-contract`, `BL-260718-mandatory-skill-load-clause`,
      `BL-260902-document-patch-and-restore`, one commit
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md`
      before any archive step
- [ ] Full DoD gates green on the integration branch (fan-in lockstep bump above
      freshly fetched `origin/main`)

## References

- Source plans: the 5 `.oat/repo/reference/external-plans/*.md` files named above
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Program indexes: `.oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-1-plan-index.md`,
  `2026-08-30-backlog-review-wave-2-plan-index.md`, `2026-08-30-backlog-review-wave-3-plan-index.md`,
  `2026-09-02-backlog-review-wave-4-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`; prior wave summaries in
  `.oat/repo/reference/project-summaries/` and `.oat/projects/shared/wave-1-execution/summary.md`
