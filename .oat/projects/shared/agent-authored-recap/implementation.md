---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-10
oat_current_task_id: p01-t11
oat_generated: false
---

# Implementation: agent-authored-recap

**Started:** 2026-09-09
**Last Updated:** 2026-09-09

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | 17    | 10/17     |
| Phase 2 | pending     | 4     | 0/4       |
| Phase 3 | pending     | 8     | 0/8       |
| Phase 4 | pending     | 2     | 0/2       |
| Phase 5 | pending     | 1     | 0/1       |

**Total:** 10/32 tasks completed

---

## Phase 1: The cut — core flow, contracts, and retirement

**Status:** in_progress
**Started:** 2026-09-09

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- {2-5 bullets describing user-visible / behavior-level changes delivered in this phase}

**Key files touched:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {trade-offs or deviations discovered during implementation}

### Task p01-t01: Trim `contracts.mjs` to the three kept contract kinds

**Status:** completed
**Commit:** cd6314c6eeadf512dc5d0077a080c37587b3abbb

**Outcome (required when completed):**

- Contract validation now loads only fact-base, manifest, and theme schemas.
- Retired publication, authoring, planning, review, and evidence validation branches and exports are gone.

**Files changed:**

- `.agents/skills/explainer-kit/scripts/lib/contracts.mjs` - retained schema validation and canonical serialization only.
- `.agents/skills/explainer-kit/tests/contracts.test.mjs` - bounded tests for the three retained contract surfaces.

**Verification:**

- Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`; retired-symbol `rg`; `pnpm lint`; `pnpm format`.
- Result: pass; five contract tests green and retired-symbol search empty.

**Notes / Decisions:**

- The fact-base schema still permits legacy backlink tuple keys, so the retained validator explicitly rejects those keys on citations to enforce the new `{ sourceId, locator }` contract without changing the frozen fact-base schema.

**Issues Encountered:**

- RED correctly failed for both the retired contract kind and a citation carrying `path`; the retained implementation made both cases pass.

---

### Task p01-t02: Trim the recipes, the recipe loader, and the briefs

**Status:** completed
**Commit:** e092ba547525262a70c456773c4650981731898c

**Outcome:**

- The recipe registry now exposes four retained recipes whose policy is limited to source roles and required floor artifacts.
- Legacy v1 recap replay, optional expansion policy, fallback policy, discovery limits, and unused briefs are removed.

**Files changed:**

- `.agents/skills/explainer-kit/recipes/` - four trimmed retained recipes; v1 recap recipe deleted.
- `.agents/skills/explainer-kit/briefs/` - only the four recipe briefs remain.
- `.agents/skills/explainer-kit/scripts/lib/recipes.mjs` - retained recipe loader and floor/narrative accessors.
- `.agents/skills/explainer-kit/tests/recipes.test.mjs` - retained recipe contract tests.

**Verification:**

- Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`; retained brief listing; recipe registry import; `pnpm lint`; `pnpm format`.
- Result: pass; three tests green, four expected registry keys printed, and only four briefs remain.

**Notes / Decisions:**

- `validateRecipe` remains internal. Its retired-key behavior is tested by importing a scratch copy of the real module against a mutated recipe.

---

### Task p01-t03: Trim `qa.mjs` and rewrite the kept QA, theme, safety, and schema tests

**Status:** completed
**Commit:** c34b07113206e8c07d1b55c08f4ba4066d8b7ff9

**Outcome:**

- QA now retains only structural, source-dumping, cohesion, browser-probe, and PNG checks.
- The cohesion ledger accepts an empty individual group and fails only when all three groups are empty.
- Theme, HTML safety, visual matrix, and schema tests no longer execute retired rendering or record paths.

**Files changed:**

- `.agents/skills/explainer-kit/scripts/lib/qa.mjs` - retained QA primitives and browser finding rules.
- `.agents/skills/explainer-kit/tests/{qa,html-safety,theme,visual-matrix,schemas}.test.mjs` - retained browser-free test surface.

**Verification:**

- Run: retained five-file Node test suite; retired-symbol search; `pnpm lint`; `pnpm format`.
- Result: pass; 35 tests green and the retired QA imports/symbols are absent.

**Negative control:**

- Restoring the old any-group-empty cohesion rule made `qa.test.mjs` exit 1; restoring the all-groups-empty rule returned it to green.

**Issues encountered:**

- The first commit attempt was rejected by commitlint for a long body line before history changed; the wrapped retry produced the sole task commit.

---

### Task p01-t04: Manifest v2 schema and package rule v3

**Status:** completed
**Commit:** c96741c987b2b4c6873cd633910b65d073be1549

**Outcome:**

- Manifest validation now pins `explainer-kit.manifest/v2`, the four terminal outcomes, and the small run-package shape.
- Package coverage v3 requires the fact base, ledger, theme, QA result, and authored content while enforcing exact inventory.
- Retired run-request and build-record schemas are removed.

**Files changed:**

- `.agents/skills/explainer-kit/schemas/{manifest,build-record,run-request}.schema.json` - v2 replacement and retired schema deletions.
- `.agents/skills/explainer-kit/scripts/lib/{contracts,package-coverage}.mjs` - manifest hash bindings and v3 package rule.
- `.agents/skills/explainer-kit/tests/{contracts,package-coverage,schemas}.test.mjs` - v2 contract and exact-inventory coverage.

**Verification:**

- Run: focused 10-test Node suite; retired-package-symbol search; `pnpm lint`; `pnpm format`.
- Result: pass.

**Negative controls:**

- Allowing manifest v1 made `contracts.test.mjs` exit 1.
- Ignoring unexpected package files made `package-coverage.test.mjs` exit 1.

**Mechanical boundary addition:**

- `.agents/skills/explainer-kit/tests/schemas.test.mjs` was advanced from manifest v1 to v2; it was a completed p01-t03 consumer discovered by the repository-wide symbol sweep.

---

### Task p01-t05: `bundle.mjs` — allowlisted inputs, fact base, and anchor ledger

**Status:** completed
**Commit:** 0adf7ddf690e713c57d099a12b3d131e31eef748

**Notes:**

- Added all four input modes with recipe-specific allowlists, newest-per-wave program summaries, deterministic SHA-256 input hashes, schema-valid fact-base generation, and unresolved claims for unparseable inputs.
- Added realpath containment for every selected input, atomic source-directory writes, pre-authoring theme output, stale-failure cleanup, satisfied-manifest reuse, and mandatory `--out`.
- Added the bounded terminology/numbers/status anchor ledger plus the full numeric/date/status claims index keyed by row, sentence identifier, or heading subject.
- Added provenance-marked fixtures derived from the execution program and two wave summaries.
- Focused suite: `pnpm exec node --test .agents/skills/explainer-kit/tests/bundle.test.mjs` (9/9 passed).
- Required negative control: bypassing `assertContained` made the symlink-escape case fail with `Missing expected rejection`; restoring realpath containment returned the suite to 9/9.
- Skill gates: `pnpm lint` and `pnpm format` passed.

---

### Task p01-t06: `record.mjs` — manifest v2 and the checked-in archive fixture

**Status:** completed
**Commit:** 0528fbfc54edb518478c79a4cc09e2529dbb14c7

**Notes:**

- Added deterministic manifest recording with explicit run-id and creation-time seams, exact immutable hashes, fact-base input hashes, recipe floor metadata, and all four terminal outcomes.
- Rejected stale QA evidence and pre-recording `failure.json`, and sanitized failed-check causes against absolute user paths and environment values.
- Added a checked-in v2 package with generating-task provenance, independently validated manifest, exact package inventory, and byte-for-byte regeneration parity.
- Focused suite: `node --test .agents/skills/explainer-kit/tests/record.test.mjs` (4/4 passed).
- Required negative control: omitting `source/ledger.json` from `record.mjs` hashing made 3/4 tests fail with `Manifest immutable hashes do not cover the canonical package`; restoring coverage returned the suite to 4/4.
- Skill gates: `pnpm lint` and `pnpm format` passed.

---

### Task p01-t07: `verify.mjs` — browser-free checks, rendered claims, and the none rung

**Status:** completed
**Commit:** 6bbde384d318e1558178814929bbe94890da7d27

**Notes:**

- Added required-section, structure, source-dumping, shell-script, ledger-to-page, and bounded page-to-ledger checks with no separate `externalRequests` result.
- Added rendered term, number, date, and closed-status extraction keyed by table-row, sentence identifier, or section/heading subject.
- Added the none rung, distinct authoring/verify failure records, malformed-page QA output, and program fixtures derived from real execution material.
- Focused suite: `node --test .agents/skills/explainer-kit/tests/verify.test.mjs` (6/6 passed).
- Required negative controls: bypassing page-to-ledger matching made the untraced-number and swapped-wave tests fail; bypassing shell-script errors made the foreign-script test fail. Restoring both guards returned the suite to 6/6.
- Skill gates: `pnpm lint` and `pnpm format` passed.

---

### Task p01-t08: Archive command validates the v2 package

**Status:** completed
**Commit:** d7b4606e109466220d4e33a290f96b801d1a6502

**Notes:**

- Archive validation now accepts exact manifest v2 packages with package-coverage/v3 for both retained successful outcomes and both run modes.
- Fact-base, theme, authored artifact, and exact immutable inventory bindings are validated before export and revalidated from the staged copy.
- Retired terminal-evidence and source-backlink archive loaders, legacy coverage branches, and browser-chain checks are removed.
- Required suite: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/release src/validation/skills.test.ts` (450/450 passed).
- Required negative controls: allowing manifest v1 failed the wrong-schema test; bypassing exact inventory failed the extra-file test; allowing `failed` and `incomplete` failed their rejection tests.
- Retired-symbol sweep was empty; package type-check, `pnpm lint`, and `pnpm format` passed.

---

### Task p01-t09: Prove one real path end to end before any deletion

**Status:** completed
**Commit:** c4a95b5fa1be33586dd001dff08410d3651ff585

**Operator-approved plan correction:**

- Corrected p01-t09 (`program-recap`), p04-t02 (`project-explainer`), p05-t01 (`program-recap`), and the design's FR9 test row to compose the generic package contract directly: manifest validation, every immutable hash checked against file bytes, and exact inventory enforcement.
- The project-only `verifySelectedProjectRecapForArchive` recipe pin remains strict.
- Cause: the archive check was added post-review without re-checking the recipe pin.

**Outcome:**

- A hand-authored program recap over the execution program and the two newest wave summaries passes all browser-free checks, records `built-needs-review`, passes direct generic manifest/hash/inventory validation, and is reused on identical inputs.
- Swapping the W6/W7 task counts produces `verify-claim-untraced`; recording QA against changed HTML bytes produces `record-qa-stale`.
- The project-only archive validator remained unchanged and its 89-test suite passed.

**Verification:**

- `node --test .agents/skills/explainer-kit/tests/flow.e2e.test.mjs` (3/3 passed).
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts` (89/89 passed).
- `pnpm lint` and `pnpm format` passed.

**Deletion gate:** open. p01-t10 may proceed.

---

### Task p01-t10: Rewrite the terminal-outcome guard and intent pairs

**Status:** completed
**Commit:** f3b0c6dbc160d2f690b838e66545c04e6d1dc293

**Outcome:**

- `generate` is satisfied only by `built` or `built-needs-review`; failed, incomplete, and retired durability outcomes are rejected.
- `skip/failed_attempt` requires a failed/incomplete manifest or a well-formed `failure.json`; `capability_probe` remains readable.
- Intent validation permits `skip/failed_attempt` only for project recaps.

**Verification:**

- Focused guard/intent suite passed 17/17.
- Bypassing the missing-evidence guard made both lifecycle tests fail with `Missing expected rejection`; restoring it returned the suite to green.
- `pnpm lint` and `pnpm format` passed.

---

## Phase 2: Ladder and fresh-host proof

**Status:** pending
**Started:** -

### Task p02-t01: Host rung with the artifact-hash binding

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run dispatch-agent-authored-recap-p01-20260911T0308Z

- Request ID: `dispatch-agent-authored-recap-p01-20260911T0308Z`
- Launch status: `accepted`
- Authorization scope: this OAT implementation run
- Role selector: `oat-phase-implementer-gpt-5-6-sol-high`
- Model selector: `gpt-5.6-sol-high`
- Model selector granularity: `opaque-materialized-role`
- Effort selector: `null`
- Reasoning mode selector: `null`
- Service tier selector: `standard`
- Guidance reference: `subagent-orchestration/references/provider-cursor.md`
- Guidance version: `2026-07-25`
- Guidance verified at: `2026-07-25`
- Guidance status: `review-required`
- Selection source: `native-default`
- Selection reason: `native-catalog`
- Floor satisfaction: `satisfied`
- Fallback: `caller-inline` (`allow_below_task_class_floor=false`)
- Runtime confirmation: `not-reported`
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high`
- Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-high

#### Continuation cont-agent-authored-recap-p01-plan-correction-1

- Original request: `dispatch-agent-authored-recap-p01-20260911T0308Z`
- Disposition: `operator-scope`
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high` (unchanged)
- Decision: preserve the strict project-only archive validator and replace the non-project-recap checks in p01-t09, p04-t02, p05-t01, and the FR9 test row with direct generic package-contract composition.
- Cause: the archive check was added post-review without re-checking the recipe pin.
- Recovery accounting: not an automatic phase-recovery attempt; usage remains `0/10`, `pending_attempt: null`.

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-09-09

**Session Start:** 2026-09-11T03:08:00Z

- [x] p01-t01: Trim `contracts.mjs` to the three kept contract kinds - cd6314c6eeadf512dc5d0077a080c37587b3abbb
- [x] p01-t02: Trim the recipes, the recipe loader, and the briefs - e092ba547525262a70c456773c4650981731898c
- [x] p01-t03: Trim `qa.mjs` and rewrite the kept core tests - c34b07113206e8c07d1b55c08f4ba4066d8b7ff9
- [x] p01-t04: Manifest v2 schema and package rule v3 - c96741c987b2b4c6873cd633910b65d073be1549
- [x] p01-t05: Add `bundle.mjs` with anchor ledger - 0adf7ddf690e713c57d099a12b3d131e31eef748
- [x] p01-t06: Add deterministic `record.mjs` and checked-in archive fixture - 0528fbfc54edb518478c79a4cc09e2529dbb14c7
- [x] p01-t07: Add browser-free `verify.mjs` checks and the none rung - 6bbde384d318e1558178814929bbe94890da7d27
- [x] p01-t08: Replace archive validation with the v2 package contract - d7b4606e109466220d4e33a290f96b801d1a6502
- [x] p01-t09: Prove one real path end to end before any deletion - c4a95b5fa1be33586dd001dff08410d3651ff585
- [x] p01-t10: Rewrite the terminal-outcome guard and add `skip/failed_attempt` - f3b0c6dbc160d2f690b838e66545c04e6d1dc293
- [ ] p01-t11: Retire the explainer release-candidate tooling - in progress

**What changed (high level):**

- Reduced the core contract registry and validator to the three retained contract kinds.
- Reduced the recipe registry to four floor-and-brief contracts.
- Reduced QA to the retained browser-free and browser-probe primitives.
- Replaced manifest/package contracts with v2/v3.
- Added the replacement bundle intake, fact-base extraction, anchor ledger, and reuse flow.
- Added deterministic terminal recording and a parity-checked v2 archive package fixture.
- Added browser-free authoring verification and both mechanical claim-tracing directions.
- Replaced archive validation with the exact manifest v2/package-coverage v3 contract.

**Decisions:**

- Enforce citation `{ sourceId, locator }` in the validator because the unchanged fact-base schema retains legacy backlink fields.
- Operator correction `cont-agent-authored-recap-p01-plan-correction-1` preserves the strict project-recap archive boundary and composes generic package validation directly for p01-t09, p04-t02, p05-t01, and the FR9 test row.
- Cause: the archive check was added post-review without re-checking the recipe pin.

**Follow-ups / TODO:**

- Continue p01 in plan order; no deletion tasks may begin before p01-t09 passes.

**Blockers:**

- None.

**Session End:** {time}

---

### 2026-09-09

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review                  | Source Artifact        | Planned / Documented                                                     | Actual / Accepted                                                                                                                               | Reason                                                                      | Source of Truth                                                     | Follow-up                   |
| ------------------------------ | ---------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------- |
| p01-t09, p04-t02, p05-t01, FR9 | `plan.md`, `design.md` | Non-project recap packages passed `verifySelectedProjectRecapForArchive` | Compose `validateContract('manifest')`, immutable byte-hash checks, and `enforceRunPackageInventory` directly; keep the project-only pin strict | The archive check was added post-review without re-checking the recipe pin. | Operator decision `cont-agent-authored-recap-p01-plan-correction-1` | Applied before p01-t09 code |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`

### 2026-09-09 — Design artifact review received (round 1)

- `artifact-design-review-2026-09-09T225646Z.md`: 1 critical, 6 important, 7 medium, 3 minor — CHANGES REQUESTED. All 17 applied to `spec.md` / `design.md` (`resolve_in_artifact`): the archive package rule is replaced rather than branched (operator decision 2026-09-09, no backward compatibility); claims use the real fact-base schema and a derived `source/ledger.json`; a page→ledger extraction pass closes FR4; the intent record keeps three keys with `failed_attempt` added and `capability_probe` read-only; every vocabulary carrier incl. the CLI prose-pin test is listed; a missing core is a hard prerequisite failure; `built-durable` stays satisfied; `recap-result.json` and `inputs.json` dropped (consumers read `manifest.json` + `qa/result.json`); the host rung binds screenshots to the artifact hash; NFR4/NFR5 rows; `project-log.md` and the newest-export rule; recipe fields read are enumerated; the FR5 test names `verifySelectedProjectRecapForArchive`; the three Minors. Row → `fixes_completed`; re-review next.

### 2026-09-09 — Design artifact review received (round 2)

- `artifact-design-review-2026-09-09T232532Z.md`: 1 critical, 5 important, 6 medium, 3 minor — CHANGES REQUESTED; 13 of 17 round-1 findings confirmed closed, 4 partial. All 15 applied to `design.md` / `spec.md` / `discovery.md` (`resolve_in_artifact`), received inline by the design author: the archive change inventory is now complete (`validateImmutablePackageEvidence`'s `project-recap` branch deleted; `verifyProjectRecapTerminalEvidence` and its three call sites deleted; `terminal-evidence.json` dropped for every outcome; `run-request.json` `mode` defined); the cohesion ledger uses the consumed array shape with `terminology` always non-empty and dates folded into `numbers`; `extractRenderedClaims` is named as a new `verify.mjs` helper feeding both claim passes; NFR2's acceptance list is complete at five items, each with its own negative control; the seam-probe removal list gains the four reference/test carriers and the `resolve-intent.mjs` import; the autonomy prompt-site hash table and its test are carriers with a Phase 3 recompute step; a retained/retired adapter-surface table keeps `run.mjs` and its dependents for the user-invoked advanced path (retirement is a separate decision, flagged at the HiLL checkpoint); `build-record.json` stays in the package as a minimal schema-valid record; citations carry `locator`; `source.backlinks` is omitted; `lifecycle-contract.md` is extended rather than replaced; two docs pages added; the bundled `briefRef` briefs are handed to the agent verbatim and the authoring brief adds only mechanics; discovery carries dated superseded notes for the 2026-09-09 no-backward-compatibility decision; `schemaVersion` and the artifact subkeys enumerated; the review path citations corrected. Both review artifacts moved to `reviews/archived/`.

### 2026-09-10 — Design artifact review received (round 3, rescoped design)

- `artifact-design-review-2026-09-10T010926Z.md`: 2 critical, 8 important, 7 medium, 6 minor — CHANGES REQUESTED. All 23 applied (`resolve_in_artifact`), received inline by the design author: the kept `contracts.mjs` trim now deletes `validateSourceBacklinks` and its imports so no kept module imports a retired one, and citations are `{ sourceId, locator }`; the cohesion ledger is a bounded selection of anchor facts (≤12 per group) with per-group keying stated and `cohesion-ledger-empty` relaxed to all-groups-empty; the phase-boundary invariant is restated (executables/tests/config only; prose until Phase 3) and the adapter's scripts and tests move into the Phase 1 cut with the three cross-phase references named; the autonomy-contract mirrors (five, four pinned) and four more skill bumps; the enumerated `review-skill-contracts.test.ts` pins (`:446`, `:1501-1536`, `:2113`); the completion skill's archive-resume scripts and receipt parsers lose the recap evidence commit; the closeout range corrected to `:884-950`; the artifact-hash check rekeyed to `contentPath`; the sweep excludes `.oat/repo/pjm/` and the push-transaction fixtures are scoped to manifest+build-record; `BL-260727` closed `wont_do` in Phase 3; the fact base's eight required keys with `mode: supplied`; the Playwright call corrected to `viewport` + `BROWSER_PROBE_EVALUATE`; `RECIPE_FILES` drops v1; floor entries drop `authoring`/`required`; `checkTerminalOutcome --manifest` guards `skip/failed_attempt`; spec and discovery aligned on the durability retirement; the tracked (not untracked) legacy exports; the program ledger file named; kept test files and SKILL sections listed; `bind-project-sources` "rewritten"; `externalRequests` folded into `structure`; the ledger's post-run reader named. Artifact moved to `reviews/archived/`.

### 2026-09-10 — Design artifact review received (round 4, disposition verification)

- `artifact-design-review-2026-09-10T013018Z.md`: 1 critical, 4 important, 4 medium, 5 minor — CHANGES REQUESTED; 21 of 23 round-3 findings verified closed, 2 closed on one half. All 14 applied (`resolve_in_artifact`), received inline: the page→ledger pass resolves against the fact base's claims (the bounded ledger serves ledger→page only); `intent.test.mjs`'s seam-probe import and cases and the `completion.integration.test.mjs` split (Phase 1 executables, Phase 3 prose) named; the `skills.test.ts` version pins enumerated; `reader-sameness.test.mjs` deleted with its premise; the v2 validator rejects non-satisfied outcomes (Migration Plan item 6); `qa/result.json` drops `schemaVersion` (structural readers); `sources[]` entry shape stated; `theme.hash` cross-checked and `theme.derived` dropped; the program ledger anchored at `:423`; `--artifact-sha256` named; the sweep excludes itself; `cli-reference.md:154` clauses and the regenerated docs index added. Artifact moved to `reviews/archived/`.

### 2026-09-10 — Plan artifact review received (round 1, structured)

- Structured plan review (no artifact; `oat-reviewer`, opus, manual): 1 critical, 8 important, 6 medium, 6 minor — CHANGES REQUESTED. All 21 applied to `plan.md` (`resolve_in_artifact`), received inline: the Phase 1 sweep excludes the two prose-pin test files until p03-t08; the `oat-project-complete` / `oat-project-implement` bumps move to p03-t08 with the complete pin inventory under Conventions; `skills.test.ts:1501-1518` re-pinned in p03-t01; `MINIMUM_CORE_VERSION` relocated into `check-core.mjs` in p01-t08; p01-t10 names the config parser, defaults map, and their test with a symbol-based verify; p03-t04 covers the whole program-close sections; the core `explainer-kit/SKILL.md` § Run moves into p03-t01 and p01-t11 ships every input mode so p04-t01 is prose plus its test; the browser negative control uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` at a non-executable file; the guard tests' prose assertions are owned across the hand-off; FR12's task list completed; sweeps driven off `git ls-files`; the p01-t12 control regenerates the fixture with a parity check; sweep residues enumerated; p01-t09's `runMode` / `includeTerminalEvidence` bullets; anchors corrected; fixture-formatting note; `## Parallelism` added; parity-test wording; `:1406`/`:1442` pins; the `skill-version` category note. Design `:24` and `:94` corrected with it.

### 2026-09-10 — Plan artifact review received (round 2, structured)

- Structured plan review round 2: 2 critical, 3 important, 5 medium, 6 minor — CHANGES REQUESTED; every round-1 disposition verified closed. All 16 applied (`resolve_in_artifact`), received inline: the Phase 1 sweep also excludes `completion.integration.test.mjs` until Phase 3 and carries a permanent two-file allowlist for the guard tests' retired-outcome negative controls (the v1-rejection archive fixture uses `built-needs-review`); `review-skill-contracts.test.ts` pins enumerated in full (six more blocks, incl. the `extractDurableDerivation` helper) in p03-t05 and the design; `record.mjs` gains `--run-id` / `--created-at` as the parity seam, plus a direct schema assertion and a fixture provenance note; p01-t10 names every `explainers.publish` region in `config/index.ts`; the pin inventory under Conventions covers every bumped skill and names the three with no pins; p04-t01 reframed as prose plus the end-to-end proof; p03-t02 names the camelCase evidence fields and the `EVIDENCE_MESSAGE` recovery path; p01-t03's range starts at the run-request branch; five anchors, the autonomous range, FR12's row, the import citation, the driver caveat, and the Phase 3 heading corrected.

### 2026-09-10 — Plan artifact review received (round 3, structured, final)

- Structured plan review round 3: 1 critical, 1 important, 2 medium, 7 minor — CHANGES REQUESTED on the Critical only; every round-2 disposition verified closed and the Phase 1 survivor-set sweep re-simulated clean. All 11 applied (`resolve_in_artifact`), received inline: `IS_DURABLE_PROJECT` is the project-scope classifier (archive and pointer gates), not recap durability — p03-t02 now touches only `oat-project-complete/SKILL.md:610` and names the classifier and its eight gates as out of scope; p03-t05 keeps `:1913`, `extractDurableDerivation` with its two active-pointer tests, and the fixture preambles verbatim and re-pins only `:1523`, `:1533`, `:1536`; the design's completion paragraph and pin list corrected the same way; `resolve-intent.mjs`'s whole `seamProbe` closure (`:36`, `:51-52`, `:74`, `:175-189`, `assertSeamProbe`) and the camelCase sweep pattern; `intent.test.mjs` `:19-29` + `:157-489`; `qa.mjs` private helpers incl. `retainBrowserEvidence`; the `includeTerminalEvidence` attribution, two more `completion-transaction.test.ts` anchors, the stale `skill-version.ts:45` comment, six/six/five narratives, the nonexistent visual-review import, the summary range `:290-302`, one plan row per review round, design `:132-171` and the Phase 3 sentence, spec FR10/FR12 rows. The auto artifact-review retry bound (2) is exhausted: the plan row stays `fixes_completed`; the implementer should treat the round-3 residual notes as applied and re-verify at p01-t16 and p03-t08 boundaries.

### 2026-09-10 — Post-HiLL design amendment from the operator-relayed peer review of PR #293

- A peer review (Codex, relayed by the operator) of the artifacts at `b7d9d13d2` raised three substantive gaps in the replacement flow; each verified against the live tree and applied to `design.md`, `plan.md`, and `spec.md` as design deltas (the design stays HiLL-approved; these narrow, they do not widen): (1) the `(subject, value)` claims index cannot live in `fact-base.json` (`additionalProperties: false`, verified) — it moves to a fourth `claims` key in `source/ledger.json`, and the page→fact-base check is bounded to numeric, date, and closed-vocabulary status tokens with a row/sentence/section subject rule, proven on real material (a correct page passes, swapped wave counts fail); narrative fidelity is the author's under the brief, not a universal prose verifier (spec FR4 reworded). (2) Screenshot capture is not visual verification: `runBrowserProbes`' finding rules are retained (trimmed) and consumed on the Playwright rung, the host rung requires the agent's inspected `--visual-verdict`, `record.mjs` yields `built` only on a passing verdict, and a deliberately broken layout that captures successfully cannot earn `built` (spec FR3 reworded). (3) Failures before recording (core missing, bundle refusal, authoring absent, verify crash) write `<run-root>/failure.json`, which the skip guard accepts via `--failure` alongside `--manifest`; the fresh-host controls assert both evidence shapes. The fourth point and two smaller corrections arrived by reading the peer's session directly and are applied below.

### 2026-09-10 — Peer review of PR #293, remainder applied (read from the peer's session)

- (4) The two real-run tasks re-ran `verify --rung none` after `record.mjs`, which rewrites `qa/result.json` under the manifest's immutable hashes: the post-record check is now read-only (`verifySelectedProjectRecapForArchive`), and `record.mjs` rejects a `qa/result.json` whose `artifactSha256` differs from the current page (`record-qa-stale`). (5) Freshness gets a real reuse test (`bundle` reports `reuse: true` and touches nothing when a satisfied manifest with equal input hashes and the same recipe exists). (6) `theme.resolved.json` is written by `bundle.mjs` before authoring, not by `record.mjs` afterwards. (7) Sequencing: Phase 1 is reordered so the flow lands first and a new task, p01-t09, proves one real `bundle → author → verify → record → archive-check` path on tracked real material before any deletion task starts (plan Conventions: prove before deleting). Interruption before recording writes `failure.json` (`stage: interrupted`) and the resume chain (pre-bundle failure → permitted skip → resumed completion honors it) is a named test. Phase 1 task renumbering (old → new): t03→t01, t04→t02, t05→t03, t06→t04, t11→t05, t12→t06, t13→t07, t09→t08, new t09, t14→t10, t01→t11, t02→t12, t07→t13, t08→t14, t10→t15, t15→t16, t16→t17; earlier receive notes cite the old ids. 32 tasks.

### 2026-09-10 — Bugbot review of PR #293 received

- Four threads (commits `b7d9d13d2`, `f4b7714df`, `dbb0287c1`). (1) Claims index in the fact base — already closed at `f4b7714df` (index in `source/ledger.json`). (2) High: a stale `failure.json` would survive a successful retry and fail the exact-inventory rule — a run root now holds either a manifest or a `failure.json`: `bundle.mjs` deletes a stale one on a new attempt and `record.mjs` refuses with `record-failure-present`. (3) Authoring-absent contradiction — absent page → `verify.mjs` writes `failure.json` (`stage: authoring`), no manifest; malformed page → failing checks → `failed` manifest; never both. (4) p01-t06 required the archive vitest before p01-t08 rewrote the validator — p01-t06 now produces the checked-in package and proves it at the library level; p01-t08 consumes that package with no temporary fixture.
