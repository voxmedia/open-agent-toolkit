---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-07
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p01', 'p02', 'p03'], ['p04', 'p05']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-6-execution (Wave 6 external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: 3 worktrees (operator
> decision); group 1 is p01 + p02 + p03, group 2 is p04 + p05 after the group-1
> fan-in (p04 after p02 releases `validation/skills.test.ts`; p05 after p01
> releases `info-tool.ts`).

**Goal:** Execute the 5 Wave 6 external plans ("truthfulness residue": populate
provider reachability evidence across pack and lifecycle surfaces; validate
review-ledger paths and archive only terminal reviews before the final PR;
preserve `__proto__`-named config keys through JSON parsing; honor
`metadata.version` as the canonical skill version; diagnose canonical skills
missing from a provider view at resolution time) through the wave→project
wrapper pattern (DR-260713-wave-project-wrapper-over), per the 2026-08-31
execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`, Wave 6).

**Architecture:** Thin wrapper. Each task's **entire and only implementation contract** is its external plan under `.oat/repo/reference/external-plans/`, including the dated **Refresh applied 2026-09-07 (wave-6 boundary)** entry that the program's pre-dispatch refresh clause placed in all five plans' `## Revalidation Before Execution` sections before dispatch (commit `ceeac1149`). Tasks below carry wrapper-owned metadata exclusively: the source-plan path, ordering/dependencies, wrapper-level verification gates, the commit convention, and review mapping. Nothing in this file restates, narrows, or overrides a source plan; the Parallelism observations and the Drift Refresh Record are evidence, not contract text.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — the external plan
governs commit content and granularity; the wrapper adds the `pNN-tNN` scope.

**Wrapper execution contract (applies to every task):**

1. **Drift check first.** Run the source plan's `## Drift check` (including any files its 2026-09-07 refresh entry adds) against current HEAD. A material mismatch (per that plan's own definition) is a STOP. The wave-boundary drift refresh (see record below) does not replace the in-worktree re-check — the integration tip advances as groups merge.
2. **Execute the source plan's `## Implementation steps`** in order with each step's embedded Verify gate; honor its `## STOP conditions` verbatim. A load-bearing current-state claim the lane cannot reproduce on the built CLI is a STOP candidate: reproduce first, report, never improvise (the wave-5 p09 rule).
3. **Confirm the source plan's `## Done criteria`**, then run the lane-mode DoD gates: the plan's focused tests, then `pnpm check`, `pnpm type-check`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills` (uniform across lanes), each with captured exit codes; a lane that bumps a skill also sweeps the old version literal repo-wide (plain and regex-escaped forms, `packages/cli/src` and `tools/smoke`) and runs `pnpm test:smoke`. Lanes never edit the lockstep release files (five public package manifests, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`) and never run `pnpm release:check-versions` or `pnpm release:validate`; the wave fan-in owns the single lockstep bump (≥ 0.2.64, above freshly fetched `origin/main`) and runs the full eight-gate sequence at every fan-in boundary — after the group-1 merges and after the group-2 merges — always before that fan-in's bookkeeping edit.
4. **STOP → BLOCKED at phase level (bundle exception).** A source-plan STOP parks the phase (record in `state.md` `oat_blockers` + `implementation.md`); sibling phases continue. **Bundle phases:** a STOP parks only the stopped task; the implementer records the blocker and continues remaining independent tasks; the phase is terminal when every task is completed or parked (DR-260713-bundle-stop-semantics-park).
5. **Group-dependency rule:** a group starts when every phase of the previous group is terminal — merged, or parked with completed commits merged. A park never blocks the next group.
6. **Merge serialization:** within a group, merge phase branches one at a time in plan order, rebasing each on the updated tip first. Deliberately sequenced shared files (recorded from the drift refresh; the program's two-group composition exists so each seam is touched by at most one lane at a time): `packages/cli/src/validation/skills.test.ts` (p02 inserts and re-pins inside the `:4438` case; p04 inserts its own cases after p02 lands — both re-anchor on the merged tip); `packages/cli/src/commands/tools/info/info-tool.ts`, `info-tool.test.ts`, `tools/info/index.ts`, `status/index.test.ts`, and `apps/oat-docs/docs/cli-utilities/tool-packs.md` (p01 `:76`/`:82`/`:282-308` and its regression cases, then p05's provider-view block, its cases, and `:505`); `config/json.ts` (p03) feeds every `commands/tools` suite p01 runs — the group-1 fan-in re-runs those suites on the integrated tree; `getSkillVersion` (p04) is consumed by p05's canonical-vs-view comparison — the group-2 fan-in re-runs the integrated `scan-tools` / `info-tool` / `doctor` suites. One `version:` bump per skill per PR (no two W6 lanes bump the same skill: p02 bumps `oat-project-pr-final`, p04 bumps `create-agnostic-skill` and `create-oat-skill`). Each lane that edits a canonical skill runs `pnpm run cli -- sync --scope project` after its edits and commits any manifest restamp; `--scope all` is operator-only. The fan-in bump commit also runs the project-scope sync so `.oat/sync/manifest.json` restamps with the lockstep.
7. **Backlog archival is NOT part of any task** — once, serialized on the integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt <file>` (or `pnpm format:fix`) on markdown it writes and reports observations for `orchestration-log.md` (workers report; the root appends). Never format `state.md`.
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before retrying; record SHAs pasted from `git rev-parse` in `implementation.md`.
11. **Repo-local CLI:** the global `oat` trails the branch; every `oat` invocation that reads or writes repository state (`sync`, `docs generate-index`, validators, `tools info`) uses `pnpm run cli -- <command>` or `node packages/cli/dist/index.js` after `pnpm build`.
12. **Verification evidence:** `pnpm check` and `pnpm type-check` replay Turbo caches; evidence runs use `HOME=$(mktemp -d) pnpm exec turbo run <gate> --force` (`Cached: 0`). Disposition-verification rounds execute prose shell snippets verbatim in a fresh shell and walk every failure sequence of a contract; reviewers of command-surface lanes probe the built CLI in a scratch project; `oat gate review` writes its own Reviews row, which the receive step moves forward in place. Probe edits are restored from a `mktemp -d` backup copy, never with `git checkout --` on uncommitted work. Pins are located by grepping the version literal, never the skill name. A test that simulates filesystem case-insensitivity runs under a mocked directory probe (or a case-sensitive image), never only on APFS.
13. **Root final-review brief:** enumerates every sibling-plan dependency row (p02→p04, p01→p05) and every plan premise about another package, and probes each; the configured exit gate then runs in the foreground with no other agents active (two wave-5 launches were killed for memory).

## Parallelism

Group 1 (p01 reachability evidence, p02 review-ledger paths, p03 `__proto__`
config keys) runs three write-disjoint lanes in separate worktrees; group 2
(p04 `metadata.version`, p05 provider-view diagnostics) runs two write-disjoint
lanes after the group-1 fan-in, because p04 inserts into
`validation/skills.test.ts` after p02's inserts and p05 extends `info-tool.ts`
after p01's edits. The program's composition is confirmed by the recon (every
pairwise write intersection inside a group is empty).

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time. Paths are
> repository-relative; `writes` are the files a plan's `### In scope` names,
> `reads` are inputs it consumes without editing, `verification` are test files
> its Test plan touches that its drift command omits.

- p01 (group 1) — writes: `packages/cli/src/commands/tools/shared/pack-evidence.ts`,
  new `packages/cli/src/commands/tools/shared/provider-reachability.ts` (+ test),
  `packages/cli/src/commands/tools/shared/auto-sync.ts`,
  `packages/cli/src/commands/tools/install/index.ts`,
  `packages/cli/src/commands/tools/update/index.ts`, `.../update-tools.ts`,
  `packages/cli/src/commands/tools/remove/index.ts`, `.../remove-tools.ts`,
  `packages/cli/src/commands/init/tools/index.ts`,
  `packages/cli/src/commands/tools/shared/format-pack-inventory.ts`,
  `packages/cli/src/commands/tools/list/list-tools.ts`,
  `packages/cli/src/commands/tools/info/info-tool.ts` (the
  `userManagedRoleMaterialization` / provider-context lines around `:76`–`:82`),
  `packages/cli/src/commands/status/index.ts`, `packages/cli/src/commands/doctor/index.ts`
  (thread the context), `apps/oat-docs/docs/cli-utilities/tool-packs.md` (`:282-308`);
  test writes (from its Test plan): `packages/cli/src/commands/tools/list/list-tools.test.ts`
  and `packages/cli/src/commands/tools/info/info-tool.test.ts` (new regression
  cases), `format-pack-inventory.test.ts`, `pack-evidence.test.ts`,
  `auto-sync.test.ts`, `pack-lifecycle-outcome.test.ts`, `update/index.test.ts`,
  `status/index.test.ts`, `doctor/index.test.ts`, `commands/init/tools/**` tests.
- p02 (group 1) — writes: `.agents/skills/oat-project-pr-final/SKILL.md` (1.6.2 → 1.6.3),
  `packages/cli/src/validation/skills.test.ts` (pins `:2927`, `:4445`; the Step-2
  block `:4556-4590`; one new case), `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  (`:1486`, `:2098`; one new case); verification (the plan's drift command omits
  them): `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
  (`:970-982`), `packages/cli/src/validation/named-skill-load-contract.test.ts`
  (9 `file:` + 10 `skills:` pr-final rows), `packages/cli/src/validation/autonomy-gate-inventory.test.ts`
  (`:360-368`); reads: `.agents/skills/oat-project-plan-writing/SKILL.md:635`,
  `oat-project-complete/SKILL.md:355,778`, `oat-project-pr-progress/SKILL.md:108-122`, `.gitignore:85`.
- p03 (group 1) — writes: `packages/cli/src/config/json.ts`, new
  `packages/cli/src/config/json.test.ts`,
  `packages/cli/src/commands/tools/shared/project-tools-config.test.ts`, one
  decision record under `.oat/repo/reference/decisions/` (+ regenerated `index.md`);
  reads (the Step-4 consumer sweep, ten callers per the refresh): `packages/cli/src/config/oat-config.ts`,
  `config/sync-config.ts`, `config/user-sync-config.ts`, `commands/gate/index.ts`,
  `commands/config/index.ts` (+ their tests as verification).
- p04 (group 2) — writes: `packages/cli/src/commands/shared/frontmatter.ts`,
  `packages/cli/src/validation/skills.ts`, `packages/cli/src/validation/skills.test.ts`
  (new cases only — no template-skill pins exist), `packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts`
  (the wrapper `validate-skill-version-bumps.ts` is unchanged in behavior),
  `packages/cli/src/agents/canonical/resolve.ts` (`:176`),
  `.agents/skills/create-agnostic-skill/SKILL.md` (1.4.1 → 1.4.2),
  `.agents/skills/create-oat-skill/SKILL.md` (1.5.1 → 1.5.2),
  `apps/oat-docs/docs/contributing/skills.md` (sole W6 owner); verification:
  `frontmatter.test.ts`, `agents/canonical/**.test.ts`, `scan-tools.test.ts`,
  `doctor/index.test.ts`, `named-skill-load-contract.test.ts` (reads
  `create-oat-skill` at `:376`, `:2468`, `:2591`); reads: `config/resolve.ts`,
  `commands/init/tools/shared/copy-helpers.ts`, `scan-tools.ts`, `doctor/index.ts`
  (version read sites the resolver serves; not edited by this plan).
- p05 (group 2) — writes: new `packages/cli/src/drift/skill-view-diagnostic.ts`
  (+ test), `packages/cli/src/drift/index.ts`,
  `packages/cli/src/commands/tools/info/info-tool.ts` (a new provider-view
  block after `:104-155`), `packages/cli/src/commands/tools/info/index.ts`,
  `packages/cli/src/commands/tools/info/info-tool.test.ts` (shared with p01 —
  the ordered seam; re-anchor on the merged tip), one post-sync convergence
  integration case (`tool-pack-lifecycle.integration.test.ts`),
  `packages/cli/src/commands/status/index.test.ts` (the required negative case:
  status output is unchanged — a test write, not a `status/index.ts` edit),
  `apps/oat-docs/docs/cli-utilities/tool-packs.md` (`:505`),
  `apps/oat-docs/docs/provider-sync/manifest-and-drift.md` (`:67`); reads:
  `drift/detector.ts`, `drift/drift.types.ts`, `manifest.types.ts`,
  `scope-option.ts`, `scan-tools.ts:115-118` (p04 rewrites `getSkillVersion`
  behind it), `list-tools.ts`, `tools/shared/types.ts`; explicitly OUT of scope
  per its plan: `status/index.ts` (owned by the W4 restamp and this wave's p01).
- Within-group write intersections recomputed from these lists: group 1
  p01 × p02 = ∅, p01 × p03 = ∅ (p03 writes `project-tools-config.test.ts`, a
  test p01 runs but does not edit), p02 × p03 = ∅; group 2 p04 × p05 = ∅
  (`scan-tools.ts` is a read for both). Ordered seams: p02 → p04
  (`validation/skills.test.ts`), p01 → p05 (`info-tool.ts`, `info-tool.test.ts`,
  `status/index.test.ts`, and `tool-packs.md` in different sections `:282-308`
  vs `:505`; p05 re-anchors all four on the merged tip). Test files a lane
  edits count as writes; every within-group intersection stays empty (p01's
  test writes are all under `commands/tools`, `status`, `doctor`, `init/tools`;
  p02's under `validation` and `init/tools/shared`; p03's `json.test.ts` and
  `project-tools-config.test.ts`). Grouping retained.
- **Smoke tier:** no `tools/smoke` pin names a skill any W6 lane bumps
  (`wrapper-compatibility.test.mjs` pins explainer-kit only).

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in every lane: p01 and p05 change `oat tools` output
surfaces (reviewed with live CLI probes); p02 changes a lifecycle skill's
pre-PR guard (verbatim snippet execution; weaker-anywhere on the archive
step); p03 changes the config parse chokepoint (every consumer suite plus a
`__proto__` scratch config through the real commands); p04 changes skill
version resolution and the bump gate (weaker-anywhere on the validators)._

## Refreshes Applied to the Source Plans (2026-09-07)

The program's Wave 6 cross-wave prerequisite instructs the wrapper, before
dispatch, to re-read every W6 plan's landing-event table against the
then-current state and apply the listed refreshes, and each plan's
`## Revalidation Before Execution` section requires a refresh when main
advances materially. Those refreshes were applied to the plan files themselves
(`DR-260907-pre-dispatch-refreshes-live`), as a dated
**Refresh applied 2026-09-07 (wave-6 boundary)** entry at the top of each
plan's Revalidation section (commit `ceeac1149`; p04's entry amended by `061841159` after the plan gate's attempt 1): p01 (anchors; live premises
reproduced; seam ownership with p05), p02 (pr-final is 1.6.2; relocated and
revalued pins; the `named-skill-load-contract.test.ts` rows; an idempotency
case for the timestamp-suffix rule), p03 (the caller inventory is ten, not
eight — the W5 `oat config unset` consumer joins the drift check, the sweep,
and In-scope; a zod null-prototype case), p04 (no template-skill pins exist;
two constraining decisions from 2026-09-06; the `oat-*` filter in the structural
validator means the version-alias pass must iterate every bundled skill while
the alias warning stays out of the bump result; 82 skills), p05 (anchors; live `oat tools info` shape; seam
ownership after p01 and beside p04).

## Drift Refresh Record (2026-09-07, vs `1bef28fa1fb95e1473872ff9a511a6b42fa37889`)

**1 PASS / 4 MINOR-DRIFT / 0 STOP** (three false premises corrected in the plans' own refresh entries: p03's caller count, p04's non-existent pins and "no constraining decisions"; p02's version premise re-pinned). This record is non-authoritative recon evidence; the wave base is `origin/main` after the wave-5 close PR #276; PR #190 is still an open draft at `63161897d`, so every "#190 merged first" row is un-triggered. The lockstep on the base is 0.2.63 and `.oat/sync/manifest.json` is at 0.2.63 (`sync --scope project --dry-run` clean), so the group-1 fan-in bump is 0.2.63 → 0.2.64 with the manifest restamped in the same commit.

- **p01 — provider reachability evidence:** MINOR-DRIFT. 37 files changed nearby (PR #248, W4, W5) but every seam file is byte-unchanged; shifted anchors listed in the refresh entry; premises reproduced live (`packEvidence.items[0].providers === []`; list/info omit `userManagedRoleMaterialization` while status/doctor pass it; the other six diagnostic codes have zero emitters).
- **p02 — review-ledger paths before the final PR:** MINOR-DRIFT. `skills.test.ts` +2178 and `review-skill-contracts.test.ts` +1598 since authoring; pr-final is 1.6.2; all pins relocated (refresh entry); every W2/W3/W5 dependency row is satisfied.
- **p03 — `__proto__` config keys:** MINOR-DRIFT with a corrected premise. Mechanism reproduced live on `jsonc-parser` 3.2.1; ten production callers (the plan said eight), including the W5 `commands/config/index.ts:2856` consumer that already carries a `__proto__` disclaimer — added to the contract by the refresh; the gate module (`gate/index.ts:980`) was rewritten by W5.
- **p04 — `metadata.version`:** MINOR-DRIFT with two corrected premises. `frontmatter.ts` +144 (W4); no version pins exist for the two template skills; `DR-260906-standing-claims-in-skills-name` and `DR-260906-one-version-bump-per-changed` constrain the work; `validateOatSkills` covers 64 `oat-*` of 82 skills, so its version-alias pass iterates every bundled skill (the alias warning stays out of the bump result; `check:skill-bumps` exit 0 unchanged).
- **p05 — provider-view diagnostics:** PASS. Eight files changed, none of its seams; `DriftReport` and the manifest entry schema unchanged; `oat tools info` has no provider or drift section today.

## Phase 01: populate-provider-reachability-evidence (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Populate provider reachability evidence across pack and lifecycle surfaces

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-03-populate-provider-reachability-evidence.md`

**Refresh applied 2026-09-07:** see the source plan's `## Revalidation Before Execution` entry (`p01`).

**Ordering:** group 1; runs at the wave base in parallel with p02 and p03 and merges first within the group. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p01-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t01): populate provider reachability evidence across pack and lifecycle surfaces"
```

---

## Phase 02: validate-review-ledger-paths-before-final-pr (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Validate review-ledger paths and archive only terminal reviews before the final PR

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-03-validate-review-ledger-paths-before-final-pr.md`

**Refresh applied 2026-09-07:** see the source plan's `## Revalidation Before Execution` entry (`p02`).

**Ordering:** group 1; runs at the wave base in parallel with p01 and p03 and merges second within the group; p04 (group 2) inserts into `validation/skills.test.ts` after this lane lands. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p02-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p02-t01): validate review-ledger paths and archive only terminal reviews before the final PR"
```

---

## Phase 03: preserve-proto-named-config-keys (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p03-t01: Execute external plan — Preserve `__proto__`-named config keys through JSON parsing

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-03-preserve-proto-named-config-keys.md`

**Refresh applied 2026-09-07:** see the source plan's `## Revalidation Before Execution` entry (`p03`; it amends the drift check, the consumer sweep, and In-scope with the W5 `commands/config/index.ts` consumer).

**Ordering:** group 1; runs at the wave base in parallel with p01 and p02 and merges third within the group (its `config/json.ts` rewrite feeds the `commands/tools` suites p01 runs, so the fan-in re-runs them on the integrated tree). Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p03-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p03-t01): preserve __proto__-named config keys through JSON parsing"
```

---

## Phase 04: honor-metadata-version-for-skills (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p04-t01: Execute external plan — Honor metadata.version as the canonical skill version

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-04-honor-metadata-version-for-skills.md`

**Refresh applied 2026-09-07:** see the source plan's `## Revalidation Before Execution` entry (`p04`; it corrects the pin premise, names the two constraining decisions, and amends the alias-warning contract for non-`oat-*` skills).

**Ordering:** group 2; starts after the group-1 fan-in (p02 has released `validation/skills.test.ts`) in parallel with p05 and merges first within the group. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p04-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p04-t01): honor metadata.version as the canonical skill version"
```

---

## Phase 05: diagnose-canonical-skills-missing-from-provider-views (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p05-t01: Execute external plan — Diagnose canonical skills missing from a provider view at resolution time

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-04-diagnose-canonical-skills-missing-from-provider-views.md`

**Refresh applied 2026-09-07:** see the source plan's `## Revalidation Before Execution` entry (`p05`).

**Ordering:** group 2; starts after the group-1 fan-in (p01 has released `info-tool.ts`) in parallel with p04 and merges second within the group (re-anchor on the merged tip; p04's `getSkillVersion` rewrite is consumed through `scan-tools.ts`). Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p05-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p05-t01): diagnose canonical skills missing from a provider view at resolution time"
```

---

## Phase 06: final-review fixes (p06)

**Milestone:** the root final review's Important and the fixable Mediums/Minors resolved with negative controls; the fix round verified by the same reviewer; then the configured exit gate.

**Lanes:** A = p06-t01, p06-t02, p06-t03 (`packages/cli` p04/p05 surfaces, worktree `.worktrees/wave-6/p06a`); B = p06-t04, p06-t05 (`oat-project-pr-final` skill prose and tests — no re-bump, 1.6.3 is already this PR's bump — and the p03 end-to-end test, worktree `.worktrees/wave-6/p06b`). Record-only findings (M5, m4–m9) were fixed by the root in the receive commit; M3 (the two `^version:` regex readers) became a blocking acceptance criterion on `BL-260904-migrate-bundled-skills-from`.

### Task p06-t01: (review) Degrade a scope with an unreadable sync config to unavailable in the provider-view diagnostic

**Files:**

- Modify: `packages/cli/src/commands/tools/info/skill-views.ts` (`diagnoseScope`, `:242`), `packages/cli/src/commands/tools/shared/provider-context.ts:50-52` if the shared helper must surface the distinction, `skill-views.test.ts` / `info-tool.test.ts`

**Step 1: Understand the issue**

Review finding: Final review I1: `resolveScopeProviderContext` swallows every error in a bare `catch { return null }` and `diagnoseScope` turns that `null` into `return null`, so a scope whose `.oat/sync/config.json` is invalid JSON, `chmod 000`, or a directory is dropped from `providerViews` entirely (no row, no reason, human and `--json`) instead of the `unavailable` degradation the contract comment at `:178-183` declares. Reproduced at both scopes.
Location: `reviews/archived/final-review-2026-09-08T052928Z.md`

**Step 2: Implement fix**

Distinguish "no sync config present" (keep the current silence) from "sync config present but unreadable or invalid": surface the distinction from `resolveScopeProviderContext` (or probe `join(scopeRoot, '.oat', 'sync', 'config.json')` in `diagnoseScope` before calling it and treat exists-but-null as the failure) so the existing scope-level catch emits `{ result: 'unavailable', reason: <redacted> }`. Add regression cases beside the existing manifest-failure cases for invalid JSON, EACCES, and EISDIR at both the project and user scope; neutralize the guard to prove each is red.

**Step 3: Verify**

Run: `pnpm exec vitest run src/commands/tools/info src/commands/tools/shared/provider-context.test.ts` (from `packages/cli`), then the lane-mode gates
Expected: the new cases are red before the fix and green after; `oat tools info <skill>` still exits 0 with full tool detail; all gates green

**Step 4: Commit**

```bash
git commit -m "fix(p06-t01): degrade a scope with an unreadable sync config to unavailable in the provider-view diagnostic"
```

### Task p06-t02: (review) Never attach a drift verdict computed for one path to a provider-view row that names another

**Files:**

- Modify: `packages/cli/src/commands/tools/info/skill-views.ts:257-266`, `packages/cli/src/drift/skill-view-diagnostic.ts` if a new state is added, their tests, `apps/oat-docs/docs/provider-sync/manifest-and-drift.md` if the state set changes

**Step 1: Understand the issue**

Review finding: Final review M4: `providerPath` comes from the adapter's expected projection while `drift` comes from `detectDrift(manifestEntry, …)`, which resolves the manifest entry's own `providerPath`; the manifest lookup keys on `(canonicalPath, provider)` only, so a manifest entry pointing elsewhere with a healthy file at the expected path renders `removed (copy) <expected path>` with "the provider file is gone from disk" — a false statement about a file that exists.
Location: `reviews/archived/final-review-2026-09-08T052928Z.md`

**Step 2: Implement fix**

When `manifestEntry.providerPath !== projection.providerPath`, render the manifest's path in the row or classify the row as a distinct tracked-at-a-different-path state with an honest detail line; never combine a drift verdict for one path with another path's label. Pin the divergent-entry case red then green.

**Step 3: Verify**

Run: `pnpm exec vitest run src/commands/tools/info src/drift` (from `packages/cli`), then the lane-mode gates
Expected: the divergent case is red before the fix and green after; the 82-skill `--json` sweep on this repository is byte-identical; all gates green

**Step 4: Commit**

```bash
git commit -m "fix(p06-t02): never attach a drift verdict computed for one path to a provider-view row that names another"
```

### Task p06-t03: (review) Harden the provider-view redaction, degradation granularity, and row cosmetics

**Files:**

- Modify: `packages/cli/src/commands/tools/info/skill-views.ts` (`:221` redaction, `:178-194` catch placement, `:305-311` qualifier), `packages/cli/src/agents/canonical/resolve.ts:181-186` and `packages/cli/src/commands/shared/frontmatter.ts:337-341` (comment drift), tests

**Step 1: Understand the issue**

Review finding: Final review m11 (the second redaction pass fires only after start, whitespace, quotes, or `(`; paths after `=`, `:`, `[`, backtick, or `<` pass), m13 (one unreadable provider path collapses every provider row for the scope because the catch sits at scope level), m14 (`inactive`/`unsupported`/`excluded` rows print a projection qualifier and path), m10 (both comments say "tagged or anchored" while aliased scalars are also rejected and block scalars accepted).
Location: `reviews/archived/final-review-2026-09-08T052928Z.md`

**Step 2: Implement fix**

Widen the redaction to any absolute path token with a containment test; move the catch to the per-observation loop so only the failing provider degrades; suppress the qualifier and path for `inactive`/`unsupported`/`excluded`; fix both comments. Pin the `path=<absolute>` redaction shape and the per-provider degradation red then green.

**Step 3: Verify**

Run: `pnpm exec vitest run src/commands/tools/info src/agents/canonical src/commands/shared/frontmatter.test.ts` (from `packages/cli`), then the lane-mode gates
Expected: new cases red before, green after; all gates green

**Step 4: Commit**

```bash
git commit -m "fix(p06-t03): harden the provider-view redaction, degradation granularity, and row cosmetics"
```

### Task p06-t04: (review) Close the non-directory reviews/archived hole and the silent no-ledger path in the pr-final guard

**Files:**

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md` (`:441`, `:472`, `:493`, `:592`, `:608`, prose at `:412`; no version re-bump — 1.6.3 is this PR's bump), `packages/cli/src/validation/review-skill-contracts.test.ts`

**Step 1: Understand the issue**

Review finding: Final review M1: the "never materialized" excuse keys on `[ ! -d ]`, so a regular file or a dangling symlink at `reviews/archived` re-opens the round-2 Critical (reproduced verbatim from the fenced block: exit 0 with the local-only notice). m1: a plan whose ledger is not under an exact `## Reviews` heading leaves `saw_table` at 0 and the guard exits 0 having checked nothing. m2: the prose says the scan ends at any heading while only `##` exits. m3: an escaped `\|` in an earlier cell shifts `artifact_column` onto a `-` placeholder and the row is skipped.
Location: `reviews/archived/final-review-2026-09-08T052928Z.md`

**Step 2: Implement fix**

Replace `! -d` with `! -e` at both sites and stop with `PRFINAL-05: reviews/archived exists but is not a directory` when the path exists and is not a directory; raise `PRFINAL-05` in the `END` block when no `## Reviews` section was seen; correct the prose to the level-two boundary (or scan every section); substitute a sentinel for `\|` before splitting or reject rows whose field count differs from the header's. Add the regular-file, dangling-symlink, missing-heading, and escaped-pipe shapes to the contract test, each proven red by reverting the guard line.

**Step 3: Verify**

Run: `pnpm exec vitest run src/validation/review-skill-contracts.test.ts src/validation/named-skill-load-contract.test.ts src/validation/skills.test.ts` (from `packages/cli`), `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, `pnpm test:smoke`, then the lane-mode gates
Expected: the four new shapes red before and green after; `check:skill-bumps` reports pr-final 1.6.3 unchanged (no second bump); all gates green

**Step 4: Commit**

```bash
git commit -m "fix(p06-t04): close the non-directory reviews/archived hole and the silent no-ledger path in the pr-final guard"
```

### Task p06-t05: (review) Pin the end-to-end proto-keyed config control through the real oat config command

**Files:**

- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Understand the issue**

Review finding: Final review M2: the p03 refresh added an end-to-end control to In scope (a `__proto__`-keyed scratch config must flow through `oat config get/set/unset/list/adopt` unchanged), the lane and both reviewers verified it live, but no test pins it — `grep -rln __proto__` finds no case in `commands/config/index.test.ts` or `tools/smoke`.
Location: `reviews/archived/final-review-2026-09-08T052928Z.md`

**Step 2: Implement fix**

Add one case that writes `{"__proto__":{"git":{"defaultBranch":"INJECTED"}}}` to a scratch config, asserts `config get git.defaultBranch` returns the real value, and asserts the `__proto__` key survives `set`/`unset`/`list` as an own key; neutralize `materializeTree`'s `defineProperty` once to prove the case goes red.

**Step 3: Verify**

Run: `pnpm exec vitest run src/commands/config/index.test.ts src/config/json.test.ts` (from `packages/cli`), then the lane-mode gates
Expected: the case is red under the neutralized materializer and green after restoring it; all gates green

**Step 4: Commit**

```bash
git commit -m "fix(p06-t05): pin the end-to-end proto-keyed config control through the real oat config command"
```

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target         |
| ------ | -------- | ----------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------- |
| plan   | artifact | fixes_added | 2026-09-07 | reviews/archived/artifact-plan-review-2026-09-07T235418Z.md | -                                        | gate       | codex-5-6-sol-xhigh |
| spec   | artifact | pending     | -          | -                                                           | -                                        | -          | -                   |
| design | artifact | pending     | -          | -                                                           | -                                        | -          | -                   |
| plan   | artifact | passed      | 2026-09-08 | reviews/archived/artifact-plan-review-2026-09-08T001147Z.md | -                                        | gate       | codex-5-6-sol-xhigh |
| p03    | code     | fixes_added | 2026-09-08 | reviews/archived/p03-review-2026-09-08T012336Z.md           | 9f714cb5612e06724d083bcdd1db6bbd4d0b5b49 | manual     | -                   |
| p03    | code     | passed      | 2026-09-08 | reviews/archived/p03-review-2026-09-08T013112Z.md           | 58e00e20fd3feb1e3457678d832cde6525740bd5 | manual     | -                   |
| p02    | code     | fixes_added | 2026-09-08 | reviews/archived/p02-review-2026-09-08T012908Z.md           | bad7d0e901584091ea8a0b002faca561caee7d23 | manual     | -                   |
| p01    | code     | fixes_added | 2026-09-08 | reviews/archived/p01-review-2026-09-08T013142Z.md           | d5fb6e1d474b057e74323590feaa8974fd24efa3 | manual     | -                   |
| p01    | code     | passed      | 2026-09-08 | reviews/archived/p01-review-2026-09-08T015542Z.md           | c037e5ebf198969b399ea175679b9aab75ff81b1 | manual     | -                   |
| p02    | code     | fixes_added | 2026-09-08 | reviews/archived/p02-review-2026-09-08T020858Z.md           | 1387b1c5821b9df84b8a79f80a5ff7797a3dde83 | manual     | -                   |
| p02    | code     | passed      | 2026-09-08 | reviews/archived/p02-review-2026-09-08T025226Z.md           | ee6a692450dcc568bf2b5cbb7c10dd344a1d7594 | manual     | -                   |
| p05    | code     | fixes_added | 2026-09-08 | reviews/archived/p05-review-2026-09-08T035621Z.md           | bfa0c7c8ebe5f11d9f169be116dc1c46cd2ad660 | manual     | -                   |
| p04    | code     | fixes_added | 2026-09-08 | reviews/archived/p04-review-2026-09-08T040044Z.md           | 5ad26a195cde3f3021ea87de3cd2fb2df50b266e | manual     | -                   |
| p05    | code     | fixes_added | 2026-09-08 | reviews/archived/p05-review-2026-09-08T042114Z.md           | 63b5f3c0961d44afe2ecc59fe3f95d4982157977 | manual     | -                   |
| p04    | code     | passed      | 2026-09-08 | reviews/archived/p04-review-2026-09-08T042834Z.md           | 839321e746a540ce9b5b2bbbd9dbe642831f3613 | manual     | -                   |
| p05    | code     | passed      | 2026-09-08 | reviews/archived/p05-review-2026-09-08T045824Z.md           | d2923f5ab0ed4e87142b66f58b6d28f99072c5cd | manual     | -                   |
| final  | code     | fixes_added | 2026-09-08 | reviews/archived/final-review-2026-09-08T052928Z.md         | 7219ae837a720648da86e9e377a6bb5c5fb864bb | manual     | -                   |

> Reviews are recorded newest-last (append-only); superseded events keep their own rows, and `oat gate review` writes its own row per gate artifact which the receive step moves forward in place. Reviewed heads are the pre-rebase lane commits the reviewers examined; the fan-in entries in `implementation.md` map each to its integration commit.

## Implementation Complete

- [x] 5/5 phases, 5/5 tasks complete (plus the final-review fix round, Phase 06)
- [x] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`; re-verified by the root final review)
- [x] **Serialized backlog bookkeeping** (integration branch, after all merges): `oat backlog archive` with real outcome summaries for `BL-260903-populate-provider-reachability`, `BL-260903-pr-final-archives-reviews`, `BL-260903-preserve-proto-named-config`, `BL-260904-honor-metadata-version`, `BL-260904-diagnose-canonical-skills`, one commit
- [x] Orchestration-log end-of-run synthesis written; roll-up into `summary.md` before any archive step — `summary.md` is produced by the post-implement sequence after the exit gate (archive tail deferred to program close)
- [ ] Full DoD gates green on the integration branch (fan-in lockstep bump above freshly fetched `origin/main`)

## References

- Source plans: the 5 `.oat/repo/reference/external-plans/*.md` files named above
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Program index: `.oat/repo/reference/external-plans/2026-09-03-backlog-review-wave-5-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`, `DR-260713-bundle-stop-semantics-park`, `DR-260713-shared-tracked-surfaces` — program-level decision slugs from the 2026-08 wave program carried by `oat-wave-execute`, not records in this repository's decision index; `DR-260907-pre-dispatch-refreshes-live` (this repository); prior wave summaries in `.oat/projects/shared/wave-{1,2,3,4,5}-execution/summary.md`
