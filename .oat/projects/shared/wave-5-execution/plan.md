---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-07
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p11']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p01', 'p02', 'p03'], ['p04', 'p05', 'p06']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-5-execution (Wave 5 external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: 3 worktrees (operator
> decision); group 1 is p01 + p02 + p03, group 2 is p04 + p05 + p06, then p07 →
> p08 (sequential pair), p09 → p10 (sequential pair), and p11, each ungrouped and
> run alone in program order after the previous fan-in.

**Goal:** Execute the 11 Wave 5 external plans ("program-intake follow-ups":
recover committed review artifacts after post-selection gate failures; keep
instruction-sync pointer files out of documentation content trees; route
incomplete quick projects to quick-start; retry gate project-log finalization
across transient Git index locks; add `oat config unset`; validate every
shipped skill-to-script reference against its pack manifest; enforce
plan-readiness versus execution-readiness in `oat-repo-improve`; make the
autonomous project recap capability-aware and non-blocking; defer
`activeProject` clearing on shared archive completions; make terminal project
status agree with completed revision plans; make consolidated-project
retirement checks semantic) through the wave→project wrapper pattern
(DR-260713-wave-project-wrapper-over), per the 2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`, Wave 5).

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
   `pnpm oat:validate-skills` (uniform across lanes), each with captured exit
   codes. Lanes never edit the lockstep release files (five public package
   manifests, `packages/cli/assets/public-package-versions.json`,
   `pnpm-lock.yaml`) and never run `pnpm release:check-versions` or
   `pnpm release:validate`; the wave fan-in owns the single lockstep bump (≥ 0.2.63, above freshly fetched `origin/main`) and runs the full eight-gate sequence at every fan-in boundary — after the group-1 merges, after the group-2 merges, and after each later single-lane merge (p07, p08, p09, p10, p11) — always before that fan-in's bookkeeping edit.
4. **STOP → BLOCKED at phase level (bundle exception).** A source-plan STOP parks
   the phase (record in `state.md` `oat_blockers` + `implementation.md`); sibling
   phases continue. **Bundle phases:** a STOP parks only the stopped task; the
   implementer records the blocker and continues remaining independent tasks; the
   phase is terminal when every task is completed or parked
   (DR-260713-bundle-stop-semantics-park).
5. **Group-dependency rule:** a group starts when every phase of the previous
   group is terminal — merged, or parked with completed commits merged. A park
   never blocks the next group. The sequential pairs (p07 → p08, p09 → p10) and
   p11 each start when the previous phase is terminal.
6. **Merge serialization:** within a group, merge phase branches one at a time in
   plan order, rebasing each on the updated tip first. Deliberately sequenced
   shared files (recorded from the drift refresh; the program's five-group
   composition exists so each seam is touched by at most one lane at a time):
   `packages/cli/src/validation/skills.test.ts` version pins (written by the
   lanes that bump pinned skills — p03, p07, p08, p09, p10, p11 and any the
   refresh adds; at most one such lane per parallel group);
   `.agents/skills/oat-project-complete/SKILL.md` (p08 → p09 → p11 in sequence);
   `.agents/skills/oat-project-next/SKILL.md` (p03 → p10);
   the contract-test files under `packages/cli/src/commands/init/tools/shared/`
   (p06 → p07 share one); the gate module (p01 → p04); the documentation
   config seam (`config/oat-config.ts`, `commands/config/index.ts`: p02 → p05).
   One `version:` bump per skill per PR: when a later lane edits a skill an
   earlier lane already bumped, it does not bump again. Each lane that edits a
   canonical skill runs `pnpm run cli -- sync --scope project` after its edits
   and commits any manifest restamp; `--scope all` is operator-only. The fan-in
   bump commit also runs the project-scope sync so `.oat/sync/manifest.json`
   restamps with the lockstep.
7. **Backlog archival is NOT part of any task** — once, serialized on the
   integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt <file>` (or
   `pnpm format:fix`) on markdown it writes and reports observations for
   `orchestration-log.md` (workers report; the root appends). Never format
   `state.md`.
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.
11. **Repo-local CLI:** the global `oat` trails the branch (0.2.62); every `oat`
    invocation that reads or writes repository state (`sync`,
    `docs generate-index`, validators) uses `pnpm run cli -- <command>` or
    `node packages/cli/dist/index.js` after `pnpm build`.
12. **Verification evidence:** `pnpm check` and `pnpm type-check` replay Turbo
    caches; evidence runs use `HOME=$(mktemp -d) pnpm exec turbo run <gate>
--force` (`Cached: 0`). Disposition-verification rounds execute prose shell
    snippets verbatim in a fresh shell and walk every failure sequence of a
    contract; reviewers of command-surface lanes probe the built CLI in a
    scratch project; `oat gate review` writes its own Reviews row, which the
    receive step moves forward in place. Probe edits are restored from a
    `mktemp -d` backup copy, never with `git checkout --` on uncommitted work.
    Pins are located by grepping the version literal, never the skill name.

## Parallelism

Group 1 (p01 recover committed review artifacts, p02 instruction-sync pointers
out of docs trees, p03 route incomplete quick projects) and group 2 (p04 retry
gate project-log finalization, p05 `oat config unset`, p06 skill-to-script
reference validation) each run three write-disjoint lanes in separate
worktrees. p04 follows p01 (both in the gate module), p05 follows p02 (its
family-coverage test must include the new documentation key). Groups 3 and 4
are sequential pairs: p07 → p08 (both write `validation/skills.test.ts`; p07
shares a contract-test file with p06), p09 → p10 (p09 follows p08's release of
`oat-project-complete/SKILL.md`; p10 also edits `oat-project-next/SKILL.md`
after p03). p11 runs last, after the active-pointer and quick-resume lanes.
The 2026-09-05 program review recommended splitting W5 after group 2; the
operator kept one wrapper because every group ends in a full integration
checkpoint.

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time.

- Group 1 write surfaces (file-level disjoint, all three pairs empty): p01 —
  `packages/cli/src/commands/gate/{index.ts,index.test.ts,review-verdict.ts,configured-gate.integration.test.ts,gate-hardening.integration.test.ts}`,
  `apps/oat-docs/docs/cli-utilities/workflow-gates.md`, `reference/cli-reference.md`,
  one decision record (+ `decisions/index.md`); p02 —
  `packages/cli/src/commands/instructions/**` (types, utils, sync, validate + tests),
  `packages/cli/src/config/oat-config.ts`, `pjm/doctor.ts`,
  `apps/oat-docs/docs/provider-sync/{instruction-sync,commands}.md`; p03 —
  `.agents/skills/oat-project-{plan,progress,next,quick-start}/SKILL.md` (four bumps),
  `packages/cli/src/validation/skills.test.ts` (eight pins, not three: plan `:1854`/`:5555`,
  progress `:5348` — the plan says progress has no pin, which is no longer true — next
  `:4448`/`:5341`, quick-start `:1862`/`:2928`/`:5556`/`:6559`),
  `review-skill-contracts.test.ts`, `project-start-preflight-contracts.test.ts`,
  `.agents/docs/autonomy-contract.md`, `picking-up-projects.md`.
- Group 2 write surfaces (all three pairs empty): p04 — `gate/index.ts` (+ test),
  `packages/cli/src/commands/project/log/append.ts`, `.gitignore`, one decision
  record; p05 — `packages/cli/src/commands/config/{index.ts,index.test.ts}`,
  `config/resolve.ts`, `apps/oat-docs/docs/{reference/cli-reference,cli-utilities/configuration,cli-utilities/config-and-local-state}.md`,
  `packages/cli/src/commands/help-snapshots.test.ts` (carries a literal
  `oat config --help` snapshot — an unlisted write); p06 — new
  `skill-script-references.{ts,test.ts}`, `skills-bundled-docs-contract.test.ts`,
  `commands/tools/shared/pack-manifest.ts`.
- Cross-group seams that the ordering serializes: p01 → p04 (`gate/index.ts`,
  `gate/index.test.ts`, `workflow-gates.md`, and both regenerate
  `decisions/index.md`); p01 → p05 (`cli-reference.md`); p02 → p05
  (`oat-config.ts` / the `documentation.*` catalog; W1 already landed
  `documentation.excludes`, so p05's family-coverage row is satisfied); p06 → p07
  (`skills-bundled-docs-contract.test.ts`, `pack-manifest.ts`); p07 → p08
  (`skills.test.ts`, disjoint lines `:5816` vs `:1247`/`:4447`); p09 → p10
  (`skills.test.ts:4447` and `:4448` are adjacent entries of one array literal —
  the sharpest merge hazard in the wave; `review-skill-contracts.test.ts`); p11
  after p03 (quick-start), p08/p09 (complete, `review-skill-contracts.test.ts`),
  p09 (`lifecycle.md`).
- Skills two or three lanes edit (one `version:` bump per skill per PR; the
  first lane bumps, later lanes edit prose and leave the pins at that value):
  `oat-project-quick-start` p03 then p11; `oat-project-next` p03 then p10;
  `oat-project-complete` p08 then p09 then p11 (pins `skills.test.ts:4447` AND
  `review-skill-contracts.test.ts:1089`); p08 also edits
  `oat-project-implement/references/completion-and-closeout.md`, which is one
  `oat-project-implement` bump with eight pins the plan does not name.
- **Observation (descriptive, non-authoritative):** `packages/cli/src/validation/named-skill-load-contract.test.ts`
  (wave 2) is named by none of the eleven plans, yet its matrix binds every
  skill file p03, p08, p09, p10, and p11 rewrite (next 21 rows, plan 16,
  completion-and-closeout 15, quick-start 12, complete 11, autonomous 6+4,
  progress 2, summary 1), enforces a corpus floor, and fails on a dead row; the
  existing group ordering keeps those writes serial. Lanes carry it in their
  in-worktree drift check; the wrapper reports, not patches, the omission.
- **Lite (PR #264) re-anchor list (descriptive):** p03 (`oat-project-plan`
  now lists four modes; `oat-project-progress:295` has a Lite table with a
  tier-3 discriminator; `oat-project-next:260` has a Lite table;
  `skills.test.ts:5320-5342` asserts a `liteTable` row); p08
  (`completion-and-closeout.md:886-889` carries a non-lite recap carve-out not
  in the plan's landing table; `oat-project-autonomous:253`; the summary
  skill's lite/non-lite table split); p09/p11 (`lifecycle.md:330-340` is now
  Lite prose); p10 (`control-plane/src/recommender/router.ts` gained
  `LITE_ROUTES`, an early quick return, and a `workflowMode !== 'lite'` branch;
  `types.ts` turned `WorkflowMode` into `WORKFLOW_MODES` with `'lite'`); p05
  (`help-snapshots.test.ts:423-446`); p01/p04 (`workflow-gates.md`,
  `cli-reference.md` +6/+13, no semantic change).

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in every lane: p01 and p04 change gate-module
behavior (artifact recovery after failures; retry on index locks) and receive
weaker-anywhere reviews on their failure paths; p02 and p05 change the
documentation config seam and the config catalog; p06 and p07 add validators
(fail-closed on missing references / not-ready plans); p03, p08, p09, p10, p11
change lifecycle-skill prose and the completion/next routers, reviewed with
verbatim snippet execution and live CLI probes._

## Wave-Boundary Refresh Addenda (authoritative)

The program's Wave 5 cross-wave prerequisite instructs the wrapper, before
dispatch, to "re-read every W5 plan's `## Landing-event impact` table against
the then-current state … and apply the listed refreshes", and each source
plan's `## Revalidation Before Execution` section requires a refresh when main
advances materially or another PR implements part of the surface. The
external-plan files are immutable inputs during the wave (corrections land at
the wave-close refresh), so the refreshes are applied here as task addenda.
Each addendum below is part of the named task's contract, carries the same
authority as the source plan's own steps, and is reproduced verbatim in the
lane brief. Addenda never remove or weaken a source-plan requirement; they add
current-state requirements the plan's authored commit could not see.

- **All skill-editing lanes (p03, p08, p09, p10, p11):**
  `packages/cli/src/validation/named-skill-load-contract.test.ts` is a write
  surface and a verification gate: any new sentence pairing an execution verb
  with a named `oat-project-*` skill carries a load clause and a matrix row;
  no anchored heading is reworded without moving its rows; the corpus floor is
  not lowered. Add the file to the in-worktree drift check.
- **Shared-skill bump rule (wrapper-owned, PR-scoped):** the first lane in
  plan order that edits a skill bumps it once; later lanes (`oat-project-next`:
  p03 then p10; `oat-project-quick-start`: p03 then p11;
  `oat-project-complete`: p08 then p09 then p11) edit prose only and leave the
  pins at the earlier lane's value. Editing
  `oat-project-implement/references/completion-and-closeout.md` (p08) is one
  `oat-project-implement` bump (2.3.5 → 2.3.6) with its eight pins.
- **p03 addendum — pin set:** the source plan's "`oat-project-progress` has no
  pin" and "three pins" statements are superseded: four bumps (plan 1.4.9,
  progress 1.4.0, next 1.1.0, quick-start 2.3.9 → next patch each) with eight
  pins located by version literal — plan `skills.test.ts:1854`, `:5555`;
  progress `:5348`; next `:4448`, `:5341`; quick-start `:1862`, `:2928`,
  `:5556`, `:6559`. `skills.test.ts` and `named-skill-load-contract.test.ts`
  join the drift command. The base has four workflow modes: the readiness
  definition and routing rows are written for quick mode as the plan says, and
  the existing Lite tables in `oat-project-progress:295+` and
  `oat-project-next:260` are left intact unless the plan's own sweep rule
  requires a mechanical widening, which is then reported.
- **p08 addendum — Lite recap carve-out:** the Lite PR inserted a non-lite
  recap carve-out at `completion-and-closeout.md:886-889` ("this entire
  project-recap subsection applies only to non-lite workflows"). The
  capability-aware recap (skip reasons, non-blocking probe) is implemented for
  non-lite workflows inside that carve-out; the lite carve-out is preserved
  verbatim and its contract test (if any) stays green. Pins: `skills.test.ts:1247`
  (explainer-kit), `:4447` (complete), `:2925`/`:7435` (summary), the eight
  `oat-project-implement` pins, and `review-skill-contracts.test.ts:1089`.
- **p09 / p11 addendum — pins:** `oat-project-complete` is pinned at
  `skills.test.ts:4447` and `review-skill-contracts.test.ts:1089` (not `:4002`);
  p08 owns the wave's `oat-project-complete` bump; p09 and p11 do not re-bump.
  p11's `oat-project-quick-start` pins are `:1862`, `:2928`, `:5556`, `:6559`
  at p03's value.
- **p10 addendum — Lite mode and the current router:** the terminal-status
  guard is written against the current recommender ladder
  (`packages/control-plane/src/recommender/router.ts`: `LITE_ROUTES` `:79-85`,
  the early quick return `:106-115`, `getPostImplementationRecommendation`
  `:170` with `hasIncompleteRevisionPhase` `:173-178`, the
  `workflowMode !== 'lite'` branch `:218-224`) and `WORKFLOW_MODES` in
  `types.ts:11-17` (four members). The guard applies uniformly to every
  workflow mode including `lite`: a project whose plan still carries an
  incomplete revision phase is not terminal in any mode. The behavior/test
  matrix gains a positive and a negative control for `workflowMode: 'lite'`
  (an incomplete `p-revN` in a lite plan → not terminal / routed to the
  revision; all revision phases complete → terminal). `oat-project-next`
  Step 1's field table (`:124-140`) gains the `oat_lifecycle` row the
  discriminator reads, and Step 5.2 is at `:393-398`. Pins `skills.test.ts:4448`
  and `:5341` stay at p03's value (no re-bump).
- **p05 addendum — scope:** `packages/cli/src/commands/help-snapshots.test.ts`
  (the literal `oat config --help` snapshot) and
  `apps/oat-docs/docs/cli-utilities/configuration.md` are write surfaces and
  join the drift command; the `documentation.excludes` dependency row is
  satisfied (W1, PR #262), so the family-coverage test includes it and any key
  p02 adds.
- **p01 / p04 addendum — decision records:** both lanes create a decision
  record with `pnpm run cli -- decision new` and regenerate the index; the
  fan-in preserves both index rows.

## Drift Refresh Record (2026-09-07, vs `0f47bf7004166d420758d1bcd77d253007174332`)

**2 PASS / 9 MINOR-DRIFT / 0 STOP** (two current-contract refreshes carried as authoritative addenda in the next section). This record is non-authoritative recon evidence (one bounded read-only recon agent, Opus, native dispatch, run against
the wave base, the Lite PR #264 merge commit; 349 commits and the W1–W4,
#255, and #264 merges sit between the plans' authored commit `49aeb5075`
(`6b9a15841` for p10) and the base). Draft PR #190 is still open at
`63161897d`, so every "#190 merged first" STOP is un-triggered. The lockstep on
the base is 0.2.62 and `.oat/sync/manifest.json` is one version behind at
0.2.61 (Lite restamped 0.2.59 → 0.2.61 then bumped the package), so the
group-1 fan-in bump is 0.2.62 → 0.2.63 with the manifest restamped in the same
commit.

- **p01 — recover committed review artifacts:** MINOR-DRIFT. `gate/index.ts`
  +185 and its test +518 (W4 project-aware resolution and Lite), uniform +157
  line shift: `runReviewGate` `:3153` → `:3310`, `postSelectionContext` `:3164`
  → `:3322` (assignment `:3381`), the catch `:3684` → `:3851`,
  `ReviewGateTerminalStatus` `:228-235` → `:242-248` (still exactly six values,
  so the "seventh status" STOP is un-triggered). Structure intact.
- **p02 — instruction-sync pointers out of docs trees:** PASS. `oat pjm init`
  still never writes shims (`pjm/init.ts:57-60`, `INSTRUCTIONS_SYNC_HINT` at
  `:60`); `scanInstructionFiles` (`instructions.utils.ts:267`) has no exclusion
  option; `oat-config.ts` +170 (W1 `documentation.excludes`, W4 gate config)
  moves the `isRecord(parsed.documentation)` block `:1243-1275` → `:1292`;
  `documentation.instructionPointerExcludes` is unclaimed.
- **p03 — route incomplete quick projects to quick-start:** MINOR-DRIFT.
  `oat-project-plan/SKILL.md:18-24` → `:17-26` with a fourth (`lite`) mode
  bullet at `:25` and a `Mode: lite` STOP block at `:126-131`;
  `oat-project-progress:266` → `:279` (the dead-end row is still present) with
  a Lite mode table at `:295+`; `oat-project-next:245` → the Quick Mode table
  `:239-250` (target rows `:247-249`) with a Lite table at `:260`;
  `quick-start:120-138` → `:121-140`; `review-skill-contracts.test.ts:1677` →
  `:1670-1685`. Pins: eight, not three (see Parallelism); the plan's "progress
  has no pin" claim no longer holds (`skills.test.ts:5348`).
- **p04 — retry gate project-log finalization:** MINOR-DRIFT.
  `commitReviewGateProjectLog` `:2791` → `:2807`, `finalizeReviewGateProjectLog`
  `:2848` → `:2864`, `runId = randomUUID()` `:3159` → `:3316`, the
  `projectLogFinalized` guard `:3717` → `:3872-3873`; `append.ts:187-196` →
  `:177-208` (`appendProjectLog` at `:329`); `gate/index.test.ts` is now 8506
  lines — re-locate by name.
- **p05 — `oat config unset`:** MINOR-DRIFT. No `unset` subcommand, `runUnset`,
  or `unsetConfigValue` exists; `runGet` `:2692`, `runSet` `:2731`, `KEY_ORDER`
  `:224` (now includes `documentation.excludes` from W1 — the plan's dependency
  row is satisfied), `validateSurfaceForKey` `:1387`, `setConfigValue` `:2034`;
  docs `config-and-local-state.md:117-128` exact, `cli-reference.md:152-162` →
  the `## oat config surface flags` heading at `:158`, `configuration.md:23-24,52-53`
  → `:22-26`, `:52-56` (+30 since the plan; re-anchor before editing).
- **p06 — skill-to-script references:** MINOR-DRIFT.
  `skills-bundled-docs-contract.test.ts` was rewritten by #255 (`listSkillDirs`
  `:140`; the `it.each` extraction blocks now at `:605`, `:655`, `:747`, `:1245`,
  `:1341`, `:1403`, `:1461`, `:1494`; `manifestFixture` `:888-910`; the
  `$SCOPE_ROOT` case `:1812` → `:1613`); `pack-manifest.ts` +126; `.agents/skills`
  68 files changed (waves 1–4 and Lite).
- **p07 — plan-readiness contract:** PASS. `.agents/skills/oat-repo-improve`,
  its template, and `repo-improve.md` are byte-identical; `skills.test.ts:5330`
  → `:5816` (`['.agents/skills/oat-repo-improve/SKILL.md', '2.1.2']`);
  `skills-bundled-docs-contract.test.ts:1571` → `:1613`.
- **p08 — capability-aware recap:** MINOR-DRIFT (largest). `skills.test.ts:1197`
  → `:1247`, `:4002` → `:4447`; `review-skill-contracts.test.ts:194/264/311` →
  `:196/:266/:313`; `completion-and-closeout.md:765-793` → `:884-910`, and Lite
  inserted a non-lite recap carve-out at `:886-889` that is not in the plan's
  landing-event table and overlaps its skip-reason design;
  `oat-project-autonomous:255-265` → `:253-270`; the summary skill's recap table
  is now split lite/non-lite (`## Explainer Outcome` is the stable anchor).
  Editing `completion-and-closeout.md` is one `oat-project-implement` bump
  (2.3.5 → next) with eight pins the plan does not name; summary pins
  `:2925`/`:7435`; explainer-kit `:1247`.
- **p09 — defer activeProject clearing:** MINOR-DRIFT. `oat-project-complete`
  Step 6 `:709-716` → `:704-720`, Step 12 `:1476-1486` → `:1481`, Step 8 `:940`,
  Step 3.7 `:595`, `NONARCHIVE_LIFECYCLE_RECEIPT_SCRIPT` `:51` exact (guard
  `:68`); `skills.test.ts:4002` → `:4447` plus the bare pin
  `review-skill-contracts.test.ts:1089`; `lifecycle.md:333-335` is now Lite
  prose (re-anchor by section); `picking-up-projects.md` unchanged.
- **p10 — terminal status vs revision plans:** MINOR-DRIFT, refresh required.
  `tasks.ts` anchors exact (untouched since `6b9a15841`); the revision branch
  `router.ts:154-162` is now `hasIncompleteRevisionPhase` at `:173-178` inside
  `getPostImplementationRecommendation` (`:170`), with Lite's `LITE_ROUTES`
  (`:79-85`), early quick return (`:106-115`), and `workflowMode !== 'lite'`
  branch (`:218-224`); `types.ts:11-17` is now `WORKFLOW_MODES` with `'lite'`;
  `oat-project-next:354-358` Step 5.2 → `:393-398` (a new Step 5.1 precedes
  it) and Step 1's field table (`:124-140`) has no `oat_lifecycle` row;
  `skills.test.ts:4003` → `:4448` plus a second bare pin `:5341`. The plan must
  state the terminal guard's behavior for `workflowMode: 'lite'`.
- **p11 — semantic retirement:** MINOR-DRIFT. `skills.test.ts:4002` → `:4447`;
  the quick-start pin `:5071` → four pins (`:1862`, `:2928`, `:5556`, `:6559`);
  `review-skill-contracts.test.ts:1134` → use the `it(` titles at
  `:1038/:1053/:1083`; `autonomy-gate-inventory.test.ts` +20.
- **Coverage audit (descriptive):** every drift command omits the lockstep
  release files and `.oat/sync/manifest.json`; p01 and p04 omit
  `.oat/repo/reference/decisions/**`; p03, p08, and p09 omit `skills.test.ts`
  although they move pins; p05 omits `configuration.md` and
  `help-snapshots.test.ts`; p10 omits the `oat-project-next` Step 1 field
  table; every skill-editing lane omits `named-skill-load-contract.test.ts`.
  Lanes re-run their plan's own drift check in the worktree; these omissions
  are reported, not patched, by the wrapper and become wave-close plan
  corrections.
- **Landing events:** draft PR #190 unchanged; W1–W4 and Lite are the churn,
  all accounted for above.

---

## Phase 01: recover-committed-review-artifacts-after-post-selection-failures (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Recover committed review artifacts after post-selection gate failures

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-recover-committed-review-artifacts-after-post-selection-failures.md`

**Refresh addendum (part of this task's contract):** the `p01` items under `## Wave-Boundary Refresh Addenda`.

**Ordering:** group 1; runs at the wave base in parallel with p02 and p03 and merges first within the group. Execution, commit, and review boundaries are the source
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
git commit -m "fix(p01-t01): recover committed review artifacts after post-selection gate failures"
```

---

## Phase 02: keep-instruction-sync-pointers-out-of-docs-trees (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Keep instruction-sync pointer files out of documentation content trees

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md`

**Ordering:** group 1; runs at the wave base in parallel with p01 and p03 and merges second within the group. Execution, commit, and review boundaries are the source
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
git commit -m "fix(p02-t01): keep instruction-sync pointer files out of documentation content trees"
```

---

## Phase 03: route-incomplete-quick-projects-to-quick-start (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p03-t01: Execute external plan — Route incomplete quick projects to quick-start from plan, progress, and next

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-route-incomplete-quick-projects-to-quick-start.md`

**Refresh addendum (part of this task's contract):** the `p03` items under `## Wave-Boundary Refresh Addenda`.

**Ordering:** group 1; runs at the wave base in parallel with p01 and p02 and merges third within the group. Execution, commit, and review boundaries are the source
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
git commit -m "fix(p03-t01): route incomplete quick projects to quick-start from plan, progress, and next"
```

---

## Phase 04: retry-gate-project-log-finalization-across-index-locks (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p04-t01: Execute external plan — Retry gate project-log finalization across transient Git index locks

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-retry-gate-project-log-finalization-across-index-locks.md`

**Refresh addendum (part of this task's contract):** the `p04` items under `## Wave-Boundary Refresh Addenda`.

**Ordering:** group 2; runs after the group-1 fan-in in parallel with p05 and p06 (after group 1's gate plan p01) and merges first within the group. Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p04-t01` prefix.

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
git commit -m "fix(p04-t01): retry gate project-log finalization across transient Git index locks"
```

---

## Phase 05: add-oat-config-unset-command (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p05-t01: Execute external plan — Add an oat config unset command

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-add-oat-config-unset-command.md`

**Refresh addendum (part of this task's contract):** the `p05` items under `## Wave-Boundary Refresh Addenda`.

**Ordering:** group 2; runs after the group-1 fan-in in parallel with p04 and p06 (after the instruction-sync plan p02 so its family-coverage test includes the new documentation key) and merges second within the group. Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p05-t01` prefix.

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
git commit -m "feat(p05-t01): add an oat config unset command"
```

---

## Phase 06: validate-skill-script-references-against-pack-manifests (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p06-t01: Execute external plan — Validate every shipped skill-to-script reference against its pack manifest

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-validate-skill-script-references-against-pack-manifests.md`

**Ordering:** group 2; runs after the group-1 fan-in in parallel with p04 and p05 and merges third within the group. Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p06-t01` prefix.

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
git commit -m "feat(p06-t01): validate every shipped skill-to-script reference against its pack manifest"
```

---

## Phase 07: enforce-external-plan-readiness-contract (group 3 (sequential pair, first))

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p07-t01: Execute external plan — Enforce plan-readiness versus execution-readiness in oat-repo-improve

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-enforce-external-plan-readiness-contract.md`

**Ordering:** group 3 (sequential pair, first); runs alone after the group-2 fan-in (shares a contract-test file with p06). Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p07-t01` prefix.

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
git commit -m "feat(p07-t01): enforce plan-readiness versus execution-readiness in oat-repo-improve"
```

---

## Phase 08: make-autonomous-project-recap-capability-aware (group 3 (sequential pair, second))

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p08-t01: Execute external plan — Make the autonomous project recap capability-aware and non-blocking

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-make-autonomous-project-recap-capability-aware.md`

**Refresh addendum (part of this task's contract):** the `p08` items under `## Wave-Boundary Refresh Addenda`.

**Ordering:** group 3 (sequential pair, second); runs alone after p07 merges (both write `validation/skills.test.ts`). Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p08-t01` prefix.

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
git commit -m "feat(p08-t01): make the autonomous project recap capability-aware and non-blocking"
```

---

## Phase 09: defer-activeproject-clearing-on-archive-completions (group 4 (sequential pair, first))

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p09-t01: Execute external plan — Defer activeProject clearing on shared archive completions

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-defer-activeproject-clearing-on-archive-completions.md`

**Refresh addendum (part of this task's contract):** the `p09` items under `## Wave-Boundary Refresh Addenda`.

**Ordering:** group 4 (sequential pair, first); runs alone after p08 merges (p08 releases `oat-project-complete/SKILL.md`). Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p09-t01` prefix.

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
git commit -m "fix(p09-t01): defer activeProject clearing on shared archive completions"
```

---

## Phase 10: make-terminal-project-status-agree-with-revision-plans (group 4 (sequential pair, second))

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p10-t01: Execute external plan — Make terminal project status agree with completed revision plans

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-04-make-terminal-project-status-agree-with-revision-plans.md`

**Refresh addendum (part of this task's contract):** the `p10` items under `## Wave-Boundary Refresh Addenda`.

**Ordering:** group 4 (sequential pair, second); runs alone after p09 merges (shares `validation/skills.test.ts` with p09 and `oat-project-next/SKILL.md` with p03). Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p10-t01` prefix.

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
git commit -m "fix(p10-t01): make terminal project status agree with completed revision plans"
```

---

## Phase 11: make-consolidated-project-retirement-semantic (group 5)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p11-t01: Execute external plan — Make consolidated-project retirement checks semantic

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-make-consolidated-project-retirement-semantic.md`

**Refresh addendum (part of this task's contract):** the `p11` items under `## Wave-Boundary Refresh Addenda`.

**Ordering:** group 5; runs alone after p10 merges (after the active-pointer and quick-resume lanes; its sweep runs before the project-log seal). Execution, commit, and review boundaries are the source
plan's own; the wrapper adds only the `p11-t01` prefix.

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
git commit -m "fix(p11-t01): make consolidated-project retirement checks semantic"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target         |
| ------ | -------- | ----------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ------------------- |
| p01    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p02    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p03    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p04    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p05    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p06    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p07    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p08    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p09    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p10    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p11    | code     | pending     | -          | -                                                           | -             | -          | -                   |
| final  | code     | pending     | -          | -                                                           | -             | -          | -                   |
| plan   | artifact | fixes_added | 2026-09-07 | reviews/archived/artifact-plan-review-2026-09-07T042724Z.md | -             | gate       | codex-5-6-sol-xhigh |
| spec   | artifact | pending     | -          | -                                                           | -             | -          | -                   |
| design | artifact | pending     | -          | -                                                           | -             | -          | -                   |
| plan   | artifact | superseded  | 2026-09-07 | reviews/archived/artifact-plan-review-2026-09-07T043343Z.md | -             | gate       | codex-5-6-sol-xhigh |
| plan   | artifact | received    | 2026-09-07 | reviews/artifact-plan-review-2026-09-07T044034Z.md          | -             | -          | -                   |

> Reviews are recorded newest-last (append-only); superseded events keep their own rows, and `oat gate review` writes its own row per gate artifact which the receive step moves forward in place. Reviewed heads are the pre-rebase lane commits the reviewers examined; the fan-in entries in `implementation.md` map each to its integration commit.

## Implementation Complete

- [ ] 11/11 phases, 11/11 tasks complete
- [ ] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after all merges):
      `oat backlog archive` with real outcome summaries for
      `BL-260902-recover-committed-review`, `BL-260902-keep-pjm-init-provider`, `BL-260830-clarify-quick-mode-resume`, `BL-260902-retry-gate-project-log`, `BL-260830-add-oat-config-unset-command`, `BL-260902-validate-every-shipped-skill`, `BL-260830-distinguish-external-plan`, `BL-260902-make-autonomous-project-recap`, `BL-260902-defer-activeproject-clearing`, `BL-260901-make-terminal-project-status`, `BL-260902-make-consolidated-project`, one commit
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md`
      before any archive step — `summary.md` is produced by the post-implement sequence after the exit gate (archive tail deferred to program close)
- [ ] Full DoD gates green on the integration branch (fan-in lockstep bump above
      freshly fetched `origin/main`)

## References

- Source plans: the 11 `.oat/repo/reference/external-plans/*.md` files named above
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Program indexes: `.oat/repo/reference/external-plans/2026-09-02-backlog-review-wave-4-plan-index.md` (ten of the eleven lanes) and `.oat/repo/reference/external-plans/2026-09-03-backlog-review-wave-5-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`, `DR-260713-bundle-stop-semantics-park`, `DR-260713-shared-tracked-surfaces` — program-level decision slugs from the 2026-08 wave program carried by `oat-wave-execute`, not records in this repository's decision index; prior wave summaries in
  `.oat/projects/shared/wave-{1,2,3,4}-execution/summary.md`
