---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-05
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p01', 'p02'], ['p03', 'p04']]
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
> decision); this wave uses 2 per group.

**Goal:** Execute the 4 Wave 1 external plans (configured docs-index paths;
asset-bundle structure validation; override-aware asset errors; docs-index
exclusions) through the wave→project wrapper pattern
(DR-260713-wave-project-wrapper-over), per the 2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`, Wave 1).

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
   gates: the plan's focused tests, then `pnpm check`, `pnpm type-check`, and
   `pnpm run check:skill-bumps` with captured exit codes (plus `pnpm lint`,
   `pnpm format`, and `pnpm oat:validate-skills` when the lane changes
   `.agents/skills`). Lanes never edit the lockstep release files (the five
   public package manifests, `packages/cli/assets/public-package-versions.json`,
   `pnpm-lock.yaml`) and never run `pnpm release:check-versions` or
   `pnpm release:validate`; the wave fan-in owns the single lockstep bump and
   the full eight-gate definition-of-done sequence after every group merge.
4. **STOP → BLOCKED at phase level (bundle exception).** A source-plan STOP parks
   the phase (record in `state.md` `oat_blockers` + `implementation.md`); sibling
   phases continue. **Bundle phases:** a STOP parks only the stopped task; the
   implementer records the blocker and continues remaining independent tasks; the
   phase is terminal when every task is completed or parked
   (DR-260713-bundle-stop-semantics-park).
5. **Group-dependency rule:** a group starts when every phase of the previous
   group is terminal — merged, or parked with completed commits merged. A park
   never blocks the next group. Group 2's two phases are ordered successors whose
   source plans are `BLOCKED` until the wrapper runs each plan's own readiness
   check against the merged wave branch and flips it to `READY` (program Wave 1
   "Group 2 status gate"); a failed readiness check parks that successor.
6. **Merge serialization:** within a group, merge phase branches one at a time in
   plan order, rebasing each on the updated tip first. Deliberately sequenced
   shared files (all cross-group, none within a group):
   `packages/cli/src/commands/docs/index-generate/index.ts`,
   `packages/cli/src/commands/docs/index-generate/index.test.ts`,
   `apps/oat-docs/docs/docs-tooling/commands.md`, and
   `apps/oat-docs/docs/reference/oat-directory-structure.md` (p01 → p04);
   `packages/cli/src/fs/assets.ts` and `packages/cli/src/fs/assets.test.ts`
   (p02 → p03).
7. **Backlog archival is NOT part of any task** — once, serialized on the
   integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm format:fix` (or
   `pnpm exec oxfmt <file>`) on markdown it writes and reports observations for
   `orchestration-log.md` (workers report; the root appends). Never run the
   formatter on `state.md`.
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.
11. **Repo-local CLI:** there is no `node_modules/.bin/oat`; lanes that need the
    branch-built CLI use `pnpm run cli -- <command>` (or
    `node packages/cli/dist/index.js` after `pnpm build`). The global `oat` is
    0.2.55 and matches the branch until the fan-in bumps versions.

## Parallelism

Group 1 = `p01` + `p02` in separate worktrees at `BASE_SHA`. Group 2 = `p03` +
`p04` in separate worktrees at the post-group-1 integration tip, each dispatched
only after its predecessor merged and its own readiness check passed. Rationale:
the drift refresh intersected all four complete write surfaces; the only
non-empty intersections are exactly the two predecessor → successor pairs
(p01 ∩ p04 on the index-generate command and two docs pages; p02 ∩ p03 on the
two assets files), and the two lanes inside each group share nothing.

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time.

- p01 write surface: `packages/cli/src/commands/docs/index-generate/index.ts`,
  `…/index-generate/index.test.ts`, `packages/cli/src/commands/docs/init/scaffold.ts`,
  `…/init/scaffold.test.ts` (plus `integration.test.ts`, `mkdocs-compat.test.ts`,
  `index.test.ts` under `init/` only if red), conditional
  `.agents/skills/oat-docs-bootstrap/SKILL.md` (+ `version:` bump),
  `apps/oat-docs/docs/docs-tooling/commands.md`,
  `apps/oat-docs/docs/reference/oat-directory-structure.md`, verify-only
  `apps/oat-docs/AGENTS.md`. Expected incidental output: `apps/oat-docs/index.md`
  may be regenerated by `pnpm build:docs`; a regenerated manifest is a declared
  in-scope output for this lane (commit and report it), not an unexplained file.
- p02 write surface: `packages/cli/src/fs/assets.ts`,
  `packages/cli/src/fs/assets.test.ts`.
- p03 write surface: identical to p02.
- p04 write surface: `packages/cli/src/commands/docs/index-generate/generator.ts`,
  `…/generator.test.ts`, `…/index.ts`, `…/index.test.ts`,
  `packages/cli/src/config/oat-config.ts`, `…/oat-config.test.ts`,
  `packages/cli/src/commands/config/index.ts`, `…/index.test.ts`,
  `apps/oat-docs/docs/docs-tooling/commands.md`,
  `apps/oat-docs/docs/cli-utilities/configuration.md`,
  `apps/oat-docs/docs/reference/oat-directory-structure.md`;
  `reference/cli-reference.md` verified not required (its `:16-19` lists no
  options); `help-snapshots.test.ts` verified unaffected.
- Intersection within group 1: empty. Within group 2: empty. No lane writes the
  version pins in `packages/cli/src/validation/skills.test.ts` (no pinned skill
  is touched) or the lockstep release files.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in all four lanes: p01 and p04 change configuration
resolution and file-writing safety in the docs index generator; p02 and p03
change fail-closed asset-bundle validation and its remedies._

## Drift Refresh Record (2026-09-05, vs `a1fd7cd41031719c4db85276fceee402f6045e9c`)

**2 PASS / 2 MINOR-DRIFT / 0 STOP.** This record is non-authoritative recon
evidence (one bounded read-only recon agent, Opus, native dispatch); each lane
re-runs its own drift check in its worktree. `BASE_SHA` equals `origin/main` at
dispatch time. Draft PR #190 is unchanged at
`63161897dd40a66e1b29cf19e286665895c40dde` (217 files); every landing-event row
that names it stays a forecast until it merges.

- **p01 — use configured docs index paths:** MINOR-DRIFT. Drift diff touches only
  `apps/oat-docs/docs/reference/oat-directory-structure.md` (+11/−4, a
  `.oat/sync/` table rewrite above both cited regions). Twelve anchors verified:
  eleven exact; the schema table cited as `:113-116` now sits at `:120-123`
  (`:160` already reflects the shift). `index-generate/index.ts:71-97` is
  byte-identical to the plan's pre-state. **Executor note (non-narrowing):**
  re-anchor `:113-116` → `:120-123` in place; nothing the plan requires changes.
  Only `docs/init/scaffold.test.ts:546` asserts the Fumadocs seed the plan
  rewrites; the other three `docs/init` test files are run-and-edit-only-if-red.
- **p02 — validate assets bundle structure:** PASS. Drift diff is the five
  lockstep manifests only (fan-in owned). Eight anchors exact
  (`validateAssetsBundle` `:28-67`, `resolveAssetsRoot` `:85-111`, seven-directory
  producer `bundle-assets.sh:42`, fixtures `assets.test.ts:12`, `:41`, `:54`).
  Metadata-only acceptance still reproduces from source.
- **p03 — make asset errors override-aware:** PASS at the wave boundary; hard
  dependency (p02 merged) not yet satisfied, as the plan states. Seven anchors
  exact. Readiness check to run after p02 merges: confirm `assets.ts` declares
  the seven-directory required list and throws `CliError(…, 2)` on a missing or
  non-directory entry; confirm the focused `assets.test.ts` run is green; re-run
  the drift check; confirm the predecessor's structural failure branch is
  included in the source-aware remedy design (the plan's own STOP otherwise);
  then flip `oat_execution_status` to `READY`.
- **p04 — add exclusions to docs index generation:** MINOR-DRIFT. Drift diff:
  `packages/cli/src/config/oat-config.ts` +84/−30 in five hunks that add or
  remove no `documentation` line (the `OatDocumentationConfig` interface at
  `:36-42` is byte-identical; the normalizer moved `:1195-1226` → `:1243-1276`);
  `cli-reference.md` +1 below the cited region; the W1 plan's own refresh; the
  lockstep manifests. **Executor note (non-narrowing):** re-anchor the
  normalizer citation in place. Readiness check (the plan's step 1) to run after
  p01 merges: read `index-generate/index.ts:71-111` and STOP if the default
  output is still `join(context.cwd, 'index.md')` or `writeOatConfig` is still
  called unconditionally; `git log --oneline -3 -- packages/cli/src/commands/docs/index-generate/index.ts`
  must name the path-resolution change; record the p01 merge SHA and the derived
  docs directory; then flip `oat_execution_status` to `READY`. Both STOP triggers
  are live at `BASE_SHA` by design.
- **Landing-event bookkeeping to carry to wave-close (plan files are immutable
  inputs during the wave):** p01's dependency row on p04 omits
  `oat-directory-structure.md` from its shared-file list (ordering conclusion
  unchanged); p04's PR #190 row under-reports three shared files
  (`oat-config.ts`, `oat-config.test.ts`, `oat-directory-structure.md`). If
  PR #190 merges before p04 dispatches, the p04 brief must re-anchor against the six
  write-surface overlaps (`commands/config/index.ts`, `config/index.test.ts`,
  `cli-utilities/configuration.md`, `oat-config.ts`, `oat-config.test.ts`,
  `oat-directory-structure.md`; `reference/cli-reference.md` is verify-only), and the fan-in bump is recomputed above the new main.
- **Orchestrator reconciliation (non-narrowing, p01, recorded once here):** the
  docs-index plan's `## Current state` carries two overlapping config-write
  rules that conflict when `documentation.tooling` is `fumadocs` and
  `documentation.config` is set (this repository's own live shape). The lane
  resolved it in favor of the plan's `## Outcome` and step 1 (MkDocs never
  writes; the Fumadocs bootstrap transition keeps updating
  `documentation.index`), which the root review confirmed on the real
  filesystem (probe P6) and which the fix round pins with a test. Nothing the
  plan requires is waived: authored `docs/index.md` and `mkdocs.yml` are never
  written, MkDocs configuration is never touched, and the config value written
  is the generated app-root manifest. The plan's negative clause is the stale
  artifact; its amendment is queued for wave-close plan corrections, not
  edited mid-wave.
- **Rule-1 coverage audit:** every lane's drift-check pathspec covers its write
  surface; no addendum needed.

---

## Phase 01: use-configured-docs-index-paths (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Use configured docs index paths

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-use-configured-docs-index-paths.md`

**Ordering:** group 1; own worktree, parallel with p02. Predecessor of p04
(shared index-generate command and two docs pages; recon-derived,
non-authoritative).

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from
the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(provider/model/effort owned by dispatch configuration, not this plan);
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t01): resolve docs index generation from configuration"
```

### Task p01-t02: (review) Address p01 review findings

**Files:**

- Modify: `packages/cli/src/commands/docs/index-generate/index.ts`, `packages/cli/src/commands/docs/index-generate/index.test.ts`, `apps/oat-docs/docs/docs-tooling/commands.md`

**Step 1: Understand the issue**

Review finding: root review `reviews/p01-review-2026-09-05T235808Z.md` (0C/2I/2M/5m): pin the Fumadocs-plus-config write (I1), make the MkDocs discriminator falsifiable (I2), split refusal exit codes from configuration exit codes (M1), add a real-filesystem end-to-end tier (M2), plus m2–m4.

**Step 2: Implement fix**

One append-only commit on top of the reviewed SHA; no lockstep release file; no file outside the declared surface.

**Step 3: Verify**

Run: focused `index.test.ts`, `pnpm check`, `pnpm type-check`, `pnpm run check:skill-bumps`, uncached CLI suite
Expected: all exit 0; I2 neutralization fails exactly the two new tests

**Step 4: Commit**

```bash
git commit -m "fix(p01-t02): address p01 review findings"
```

---

## Phase 02: validate-assets-bundle-structure (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Validate assets bundle structure

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-validate-assets-bundle-structure.md`

**Ordering:** group 1; own worktree, parallel with p01. Predecessor of p03
(shared `assets.ts` / `assets.test.ts`; recon-derived, non-authoritative).

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
git commit -m "fix(p02-t01): fail closed on a partial or malformed assets bundle"
```

---

## Phase 03: make-assets-errors-override-aware (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p03-t01: Execute external plan — Make asset errors override-aware

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-30-make-assets-errors-override-aware.md`

**Ordering:** group 2; own worktree, parallel with p04. Ordered successor of p02:
dispatched only after p02 merged into `wave-1-execution` and the readiness check
in the Drift Refresh Record passed against that exact tree, flipping the source
plan to `READY`.

**Step 1: Drift check** — per the source plan's `## Drift check`, against the
post-group-1 integration tip.

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
git commit -m "fix(p03-t01): make asset error remedies override-aware"
```

---

## Phase 04: add-exclusions-to-docs-index-generation (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p04-t01: Execute external plan — Add exclusions to docs index generation

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-02-add-exclusions-to-docs-index-generation.md`

**Ordering:** group 2; own worktree, parallel with p03. Ordered successor of p01:
dispatched only after p01 merged into `wave-1-execution` and the plan's own step 1
passed against that exact tree, flipping the source plan to `READY`.

**Step 1: Drift check** — per the source plan's `## Drift check`, against the
post-group-1 integration tip; re-check the PR #190 landing row first.

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
git commit -m "feat(p04-t01): add exclusion patterns to docs index generation"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target |
| ------ | -------- | ------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| p01    | code     | passed  | 2026-09-06 | reviews/p01-review-2026-09-06T001443Z.md                    | 7dd086feafb9ba53dd25b5a77900ece5f4cb5cc3 | manual     | -           |
| p02    | code     | passed  | 2026-09-05 | reviews/p02-review-2026-09-05T231204Z.md                    | ffb9d54e58427ac2896969cbb226e209062f3c50 | manual     | -           |
| p03    | code     | pending | -          | -                                                           | -                                        | -          | -           |
| p04    | code     | pending | -          | -                                                           | -                                        | -          | -           |
| final  | code     | pending | -          | -                                                           | -                                        | -          | -           |
| plan   | artifact | passed  | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T224504Z.md | -                                        | -          | -           |
| spec   | artifact | pending | -          | -                                                           | -                                        | -          | -           |
| design | artifact | pending | -          | -                                                           | -                                        | -          | -           |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

- [ ] 4/4 phases, 5/5 tasks complete (4 planned + 1 review fix)
- [ ] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after all merges):
      `oat backlog archive` with real outcome summaries for
      `BL-260718-fix-oat-docs-generate-index`, `BL-260827-fail-closed-on-partial-or`,
      `BL-260827-override-aware-remedy-text`, `BL-260902-add-an-exclusion-mechanism`,
      one commit
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md`
      before any archive step
- [ ] Full DoD gates green on the integration branch (fan-in lockstep bump above
      freshly fetched `origin/main`)

## References

- Source plans: the 4 `.oat/repo/reference/external-plans/*.md` files named above
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
- Program indexes: `.oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-1-plan-index.md`,
  `.oat/repo/reference/external-plans/2026-09-02-backlog-review-wave-4-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`, prior wave summaries in
  `.oat/repo/reference/project-summaries/`
