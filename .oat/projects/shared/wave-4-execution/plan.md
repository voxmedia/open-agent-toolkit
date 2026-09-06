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

# Implementation Plan: wave-4-execution (Wave 4 external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: 3 worktrees (operator
> decision); group 1 is p01 + p02, p03 is ungrouped and runs alone after it.

**Goal:** Execute the 3 Wave 4 external plans (let one project disable
configured lifecycle gates explicitly; surface every non-sync manifest version
restamp; emit the canonical dispatch stamp with resolver JSON) through the
wave→project wrapper pattern (DR-260713-wave-project-wrapper-over), per the
2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`, Wave 4:
"Delivered-project follow-ups").

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
   `pnpm oat:validate-skills` (p01 and p03 change `.agents/skills`; p02 runs
   the same set so the lanes are uniform), each with captured exit codes. Lanes
   never edit the lockstep release files (five public package manifests,
   `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`) and
   never run `pnpm release:check-versions` or `pnpm release:validate`; the wave
   fan-in owns the single lockstep bump (≥ 0.2.59, above freshly fetched
   `origin/main`) and the full eight-gate sequence after every merge.
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
   shared files (p01 → p03, cross-group by construction):
   `packages/cli/src/validation/skills.test.ts` (both lanes move the two
   `oat-project-implement` pins on the same lines and edit the same two `it`
   blocks; p03 sees p01's values in its base), `.agents/skills/oat-project-implement/SKILL.md`
   (one `version:` bump per skill per PR — p01 bumps it in group 1 and p03,
   which edits only `references/dispatch-and-dry-run.md` under that skill,
   does not bump it again), `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
   (different regions), and `packages/cli/src/validation/named-skill-load-contract.test.ts`
   (both lanes add matrix rows for prose they change). Each lane that edits a
   canonical skill runs `pnpm run cli -- sync --scope project` after its edits
   and commits any manifest restamp; `--scope all` is operator-only because it
   rewrites user-scope provider views. The fan-in bump commit also runs the
   project-scope sync so `.oat/sync/manifest.json` restamps with the lockstep.
7. **Backlog archival is NOT part of any task** — once, serialized on the
   integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt <file>` (or
   `pnpm format:fix`) on markdown it writes and reports observations for
   `orchestration-log.md` (workers report; the root appends). Never format
   `state.md`.
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.
11. **Repo-local CLI:** the global `oat` (0.2.55) trails the branch (0.2.58);
    every `oat` invocation that reads or writes repository state (`sync`,
    `docs generate-index`, validators) uses `pnpm run cli -- <command>` or
    `node packages/cli/dist/index.js` after `pnpm build`.
12. **Verification evidence:** `pnpm check` and `pnpm type-check` replay Turbo
    caches; evidence runs use `HOME=$(mktemp -d) pnpm exec turbo run <gate>
--force` (`Cached: 0`). Disposition-verification rounds execute prose shell
    snippets verbatim in a fresh shell and walk every failure sequence of a
    contract; `oat gate review` writes its own Reviews row, which the receive
    step moves forward in place. Probe edits are restored from a `mktemp -d`
    backup copy, never with `git checkout --` on uncommitted work.

## Parallelism

Group 1 is p01 (disable configured gates per project) and p02 (warn on
non-sync manifest restamps) together in separate worktrees at the wave base:
their write surfaces are disjoint (state schema, gate resolution, lifecycle
skills, and their contract tests versus the manifest manager, init, remove-skill,
status, and sync commands). p03 (emit the dispatch stamp with resolver JSON)
runs alone after group 1 (ungrouped) because it shares
`review-skill-contracts.test.ts`, the `oat-project-implement` version pins in
`skills.test.ts`, and the `oat-project-implement` skill directory with p01
(regrouped in the program on 2026-09-05). p03 shares nothing with p02.

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time.

- p01 write surface: `.oat/templates/state.md`, `packages/cli/src/commands/shared/frontmatter.ts`
  (+ test), `packages/cli/src/config/**` (source-aware gate resolution),
  `packages/cli/src/commands/gate/**` (`resolve --project`), the lifecycle
  skills `oat-project-plan-writing`, `oat-project-quick-start`,
  `oat-project-plan`, `oat-project-import-plan`, `oat-project-implement`
  (`SKILL.md` + `references/completion-and-closeout.md`), `oat-project-next`,
  `oat-project-progress` (each bumped once; pins in `skills.test.ts` where they
  exist), the contract tests `project-start-preflight-contracts.test.ts`,
  `post-implement-sequence-contracts.test.ts`, `review-skill-contracts.test.ts`,
  `skills.test.ts`, and the workflow-gates / project-configuration docs pages.
  **Observation (descriptive, non-authoritative):** the recon lists three
  files the plan writes that its drift command omits
  (`frontmatter.test.ts`, `apps/oat-docs/docs/cli-utilities/configuration.md`,
  which itself changed +12/−2 in waves 1–3, and
  `named-skill-load-contract.test.ts`, whose matrix binds twenty
  `oat-project-next` rows and fifteen closeout-reference rows); the lane's
  in-worktree drift check and the plan's own Revalidation/STOP process decide
  what that means.
- p02 write surface: `packages/cli/src/manifest/manager.ts` (+ test, and
  possibly `manifest/index.ts`), `packages/cli/src/commands/init/index.ts`
  (+ test), `packages/cli/src/commands/remove/skill/remove-skill.ts` (+ test),
  `packages/cli/src/commands/status/index.ts` (+ test),
  `packages/cli/src/commands/sync/{index,apply}.ts`, `sync.types.ts` (+ tests).
  No `.agents/**` write, no skill bump, no sync. **Observation (descriptive):**
  this repository's own `.oat/sync/manifest.json` was restamped V1→V2 and
  0.2.50→0.2.58 by waves 1–3 (the silent restamp the plan targets), and the
  wave fan-in's lockstep bump will make it stale again, so the fan-in's
  project-scope sync is expected to emit the new advisory and restamp it in
  the bump commit; the lane's tests should not depend on the repository's own
  manifest as a fixture.
- p03 write surface: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
  (+ test), the skills `oat-project-review-provide` and
  `oat-project-review-provide-remote` (each bumped once; pins in
  `skills.test.ts`), `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
  (no second `oat-project-implement` bump — see rule 6),
  `review-skill-contracts.test.ts` (the `Dispatch stamp:` literal),
  `skills.test.ts` (producer-identity stamp regex + pins),
  `bundle-consistency.test.ts`, and `apps/oat-docs/docs/**/dispatch-ceiling.md`.
  **Observation (descriptive):** the plan's drift command covers only the
  reference file under `oat-project-implement`, not the skill's `SKILL.md`
  whose version line the pins track, and omits
  `named-skill-load-contract.test.ts` (nine rows bind the review-provide,
  review-provide-remote, and dispatch-and-dry-run prose the plan rewrites).
- Intersections: p01 ∩ p03 = `skills.test.ts` (identical pin lines),
  `oat-project-implement/SKILL.md:3`, `review-skill-contracts.test.ts`,
  `named-skill-load-contract.test.ts` (cross-group by construction);
  p01 ∩ p02 = the lockstep set only (fan-in owned) plus directory-only
  adjacency under `packages/cli/src/commands/init/` (no shared file);
  p02 ∩ p03 = the lockstep set only. Group 1 is write-disjoint.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in all three lanes: p01 changes a fail-closed gate
surface (a project-disabled gate must never read as passed, missing, or failed)
and the state-frontmatter allowlist, and receives a weaker-anywhere review with
adversarial probes on the resolution envelope and the router; p02 changes
pre-mutation diagnostics on every non-sync manifest save (ordering and
human/JSON separation are the review focus); p03 adds one additive JSON field
whose eligibility must exactly match `dispatchReport`._

## Drift Refresh Record (2026-09-06, vs `ed75370db2fc7cf43cd884572bd58502aa71f22bd`)

**0 PASS / 3 MINOR-DRIFT / 0 STOP.** This record is non-authoritative recon
evidence (one bounded read-only recon agent, Opus, native dispatch, run against
the W3 merge commit `ed75370db`; the wave base `0af558db8` differs from it only
by the W3 wave-close records under `.oat/repo/` — no product, skill, template,
or sync file changed between the two). Waves 1–3 merged since the plans'
authored commits (`49aeb5075` for p01; `cf0159893` for p02 and p03); draft PR
#190 is still open.

- **p01 — let one project disable configured lifecycle gates:** MINOR-DRIFT.
  Nineteen files in the drift set changed in waves 1–3 (the
  `oat-project-implement` references and its new `capture-dirty-tree` script
  and test, four lifecycle skills, `oat-config.ts` +170, `user-sync-config.ts`
  +16, `skills.test.ts` +1255). The plan's STOP ("changed command envelope or
  lifecycle integration") is not tripped: `oat gate resolve` still writes the
  raw `resolveGate(...)` value and its registration still has no project
  option; the lifecycle integration gained additive load clauses only. Anchors
  re-verified: `resolve.ts:240-257`, `gate/index.ts:2948-2958` and
  `:3747-3756`, `frontmatter.ts:17` exact; `oat-config.ts:181-214` →
  `GateConfig` at `:192-197`, `WorkflowGatesConfig.skills` at `:217-220`;
  `.oat/templates/state.md` is now 109 lines with the gate fields at `:39-59`
  and still no `oat_skill_gate_overrides`; `oat-project-plan-writing:271-392`
  → `:282-405`; `oat-project-next:303-316` → `:307-320` (the
  `allowed/configured` bullet at `:314-318`); `completion-and-closeout.md:307-320`
  → `:317-330`; quick-start `:721-787` → `:732-787`; plan `:536` → `:546`;
  import-plan `:452` → `:458`; `user-sync-config.ts` +16 is
  `updateUserSyncConfig` at `:70-85`. Live premises hold (no project context in
  resolve, no override key in the template, no `project_disabled` or
  `configured_disabled_by_project` anywhere). Seven of the plan's skills were
  bumped by earlier waves; pins to move sit at `skills.test.ts:4337`, `:4341`,
  `:4345`, `:5411-5414`, `:5430`.
- **p02 — surface every non-sync manifest version restamp:** MINOR-DRIFT.
  Eighteen files in the drift set changed, none at a save site: the
  `commands/init/index.ts` +17 is in the stray-scan region, `status/index.ts`
  +23 is scoped to `providerCanonicalEntries` inside `collectScopeReports`
  (`:972-1143`), `sync/index.ts` +44 and `sync.types.ts` +11 are the
  wave-2 coupled-advisory work. The plan's STOP ("status mutation added,
  removed, or reordered") is not tripped. Anchors re-verified: `manager.ts:106-119`
  and `:37-82`, `init/index.ts:1246`, `remove-skill.ts:359-367`,
  `status/index.ts:1508-1512`, `sync/index.ts:302`, `apply.ts:498-499`,
  `execute-plan.ts:679` and `:970` exact; the status collection-migration
  block `:1282-1390` → `:1289-~1430` (`migrationAborted` set at `:1327` and
  `:1415`, consumed at `:1519`/`:1524`); `sync/index.test.ts:1324-1326` →
  `:1332-1334` (block `:1318-1356`), `:1545` → `:1553`. Manifest V2 confirmed
  live (`version: 2`, `oatVersion: "0.2.58"`, 91 symlink entries,
  `collections: []`); no `manifestVersionRestamps` anywhere; `apply.ts:498`
  still prints `No changes required.` unconditionally.
- **p03 — emit the canonical dispatch stamp with resolver JSON:** MINOR-DRIFT.
  Only three files in the drift set changed (`bundle-consistency.test.ts` +32,
  `review-skill-contracts.test.ts` +10/−4, `skills.test.ts` +1197);
  `dispatch-ceiling/`, `providers/identity/`, `commands/project/dispatch/`,
  both review-provide skills, `dispatch-and-dry-run.md`, and the docs page are
  byte-identical. The plan's STOP ("another change added a stamp mode/field,
  changed report eligibility, or changed grammar") is not tripped:
  `dispatchStamp` has zero hits in `packages/cli/src`, and a live
  `dispatch-ceiling resolve --report-scope p01 --report-action implementation --json`
  returns `dispatchReport` (schemaVersion 1, runtime identity
  `unknown`/`not-reported`) and no stamp. Anchors re-verified:
  `dispatch-ceiling/index.ts:2758-2775` and `:2880-2901`, `stamp.ts:97-119`,
  `review-provide:647-661` (`formatDispatchStamp(dispatchReport)` at `:659`),
  `review-provide-remote:291`, `dispatch-and-dry-run.md:540-555` exact,
  `:387` → `:389`; `review-skill-contracts.test.ts:640` exact; the
  producer-identity stamp regex `skills.test.ts:2132` → `:2171-2180`; pins
  at `:4338`, `:4341`, `:5415`, `:5430-5432`, and the assertion at `:5470`.
- **Coverage audit (descriptive):** every drift command omits the lockstep release
  files (fan-in owned by all three In-scope lists) and `.oat/sync/manifest.json`
  (a no-op for these lanes: every managed entry is a symlink and a project-scope
  dry-run reports no changes); p01's omits `frontmatter.test.ts`,
  `configuration.md`, and `named-skill-load-contract.test.ts`; p02's omits
  `manifest/index.ts` and `public-package-versions.json`; p03's omits
  `oat-project-implement/SKILL.md` and `named-skill-load-contract.test.ts`.
  Lanes re-run their plan's own drift check in the worktree; these omissions
  are reported, not patched, by the wrapper.
- **Landing events:** draft PR #190 unchanged; W1–W3 merges are the only churn,
  all accounted for above. Lockstep bump for this wave: 0.2.58 → 0.2.59 at the
  group-1 fan-in, with the manifest restamp in the same commit.

---

## Phase 01: disable-configured-gates-per-project (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Let one project disable configured lifecycle gates explicitly

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-disable-configured-gates-per-project.md`

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
git commit -m "feat(p01-t01): let one project disable configured lifecycle gates explicitly"
```

---

## Phase 02: warn-on-non-sync-manifest-restamps (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Surface every non-sync manifest version restamp

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-warn-on-non-sync-manifest-restamps.md`

**Ordering:** group 1; runs at the wave base in parallel with p01 and merges second within the group. Execution, commit, and review boundaries are the source
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
git commit -m "feat(p02-t01): surface every non-sync manifest version restamp"
```

---

## Phase 03: emit-dispatch-stamp-with-resolver-json (ungrouped, last)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p03-t01: Execute external plan — Emit the canonical dispatch stamp with resolver JSON

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-emit-dispatch-stamp-with-resolver-json.md`

**Ordering:** ungrouped; runs alone after group 1 merges (shares `review-skill-contracts.test.ts`, the `oat-project-implement` pins in `skills.test.ts`, and the `oat-project-implement` skill directory with p01). Execution, commit, and review boundaries are the source
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
git commit -m "feat(p03-t01): emit the canonical dispatch stamp with resolver JSON"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target |
| ------ | -------- | ----------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| p03    | code     | pending     | -          | -                                                           | -                                        | -          | -           |
| final  | code     | pending     | -          | -                                                           | -                                        | -          | -           |
| plan   | artifact | passed      | 2026-09-06 | reviews/archived/artifact-plan-review-2026-09-06T162416Z.md | -                                        | -          | -           |
| spec   | artifact | pending     | -          | -                                                           | -                                        | -          | -           |
| design | artifact | pending     | -          | -                                                           | -                                        | -          | -           |
| p01    | code     | fixes_added | 2026-09-06 | reviews/archived/p01-review-2026-09-06T173547Z.md           | 291234dc0a2833543b405414e2ec7223c584e592 | manual     | -           |
| p01    | code     | passed      | 2026-09-06 | reviews/archived/p01-review-2026-09-06T180051Z.md           | e11d901b30b690ff459642aa76f48fe3b7dcb2c6 | manual     | -           |
| p02    | code     | fixes_added | 2026-09-06 | reviews/archived/p02-review-2026-09-06T170818Z.md           | 9ad58ea4858a58852d42c0c1682cf237abae2c00 | manual     | -           |
| p02    | code     | passed      | 2026-09-06 | reviews/archived/p02-review-2026-09-06T173354Z.md           | 145adbed810d38f1c3a9f2abfa6c1237030af4be | manual     | -           |

> Reviews are recorded newest-last (append-only); superseded events keep their own rows, and `oat gate review` writes its own row per gate artifact which the receive step moves forward in place. Reviewed heads are the pre-rebase lane commits the reviewers examined; the fan-in entries in `implementation.md` map each to its integration commit.

## Implementation Complete

- [ ] 3/3 phases, 3/3 tasks complete
- [ ] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after all merges):
      `oat backlog archive` with real outcome summaries for
      `BL-260712-per-project-override`, `BL-260826-warn-on-silent-oatversion`,
      `BL-260826-emit-the-dispatch-stamp-from`, one commit
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md`
      before any archive step — `summary.md` is produced by the post-implement sequence after the exit gate (archive tail deferred to program close)
- [ ] Full DoD gates green on the integration branch (fan-in lockstep bump above
      freshly fetched `origin/main`)

## References

- Source plans: the 3 `.oat/repo/reference/external-plans/*.md` files named above
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Program indexes: `.oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-4-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`; prior wave summaries in
  `.oat/projects/shared/wave-1-execution/summary.md`,
  `.oat/projects/shared/wave-2-execution/summary.md`, and
  `.oat/projects/shared/wave-3-execution/summary.md`
