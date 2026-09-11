---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-11
oat_current_task_id: p03-t01
oat_generated: false
---

# Implementation: agent-authored-recap

**Started:** 2026-09-09
**Last Updated:** 2026-09-11

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

| Phase   | Status    | Tasks | Completed |
| ------- | --------- | ----- | --------- |
| Phase 1 | completed | 17    | 17/17     |
| Phase 2 | completed | 4     | 4/4       |
| Phase 3 | pending   | 8     | 0/8       |
| Phase 4 | pending   | 2     | 0/2       |
| Phase 5 | pending   | 1     | 0/1       |

**Total:** 21/32 tasks completed

---

## Phase 1: The cut — core flow, contracts, and retirement

**Status:** completed
**Started:** 2026-09-09

### Phase Summary

**Outcome (what changed):**

- Added the browser-free `bundle → author → verify → record` flow with manifest-v2 packages and direct generic package validation.
- Replaced project recap archive validation with the strict v2 package contract while preserving the exact project-recap recipe boundary.
- Proved the flow over tracked program material before deleting callback orchestration, durability/publishing, release-candidate, smoke, and adapter tooling.
- Removed explainer publish configuration and migrated completion-transaction fixtures to the new outcome/package vocabulary.
- Added a code-scope retired-reference sweep; bumped the core to 3.0.0, adapter to 1.0.9, and public packages to 0.2.73.

**Key files touched:**

- `.agents/skills/explainer-kit/scripts/{bundle,verify,record}.mjs` - replacement core flow.
- `.agents/skills/explainer-kit/tests/flow.e2e.test.mjs` - real-material proof and negative controls.
- `packages/cli/src/commands/project/archive/archive-utils.ts` - strict project-recap manifest-v2 archive boundary.
- `.agents/skills/oat-explainer-kit/scripts/check-terminal-outcome.mjs` - new outcomes and guarded `skip/failed_attempt`.
- `tools/smoke/explainer-kit/no-retired-references.test.mjs` - executable retired-reference invariant.

**Verification:**

- Run: full ordered CI gate list; forced uncached Turbo tests; standalone smoke/skill/script/skill-validation suites; lint; format; focused package and negative-control suites.
- Result: all final gates passed. Forced Turbo reported `Cached: 0`; one unrelated visual-companion five-second startup timeout passed independently and on the immediate full retry.

**Notes / Decisions:**

- Operator correction `cont-agent-authored-recap-p01-plan-correction-1` kept `verifySelectedProjectRecapForArchive` project-only and changed non-project recap checks to direct generic package validation.
- Recovery usage remained `0/10`; no automatic phase recovery was opened.

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

### Task p01-t11: Retire the explainer release-candidate tooling

**Status:** completed
**Commit:** 72312063bc5a4edc979e6bbc386a50a76f8c1b5e

**Outcome:**

- Removed the explainer RC build/run/acceptance/visual tooling and its immutable acceptance snapshot.
- Removed `release:validate:visual` and `test:release` from root scripts and contributor/testing instructions.
- Retired-reference sweep found only the explicitly deferred skill/docs references and durable repository history.

**Verification:**

- Root-script absence probe passed with exit 0; `pnpm format` passed.
- `pnpm release:validate` validated all five tarballs, then exited 1 only on the lockstep version bump deliberately owned by p01-t17.
- `pnpm test:smoke` ran 161 tests: 156 passed and the five explainer smoke tests scheduled for deletion in p01-t12 failed as expected.

---

### Task p01-t12: Retire the explainer smoke tests

**Status:** completed
**Commit:** aeed93c29c791b5a19f4b09b0f6d6bf9af15d2e2

**Outcome:**

- Removed obsolete package-consumer, packaged-layout, publishing, wrapper-compatibility, and duplicated skill-reader smoke coverage.
- Removed the stale package-layout cross-reference from the CLI test helper.
- Retained `check-core-version-parity.test.mjs` as the sole explainer smoke test.

**Verification:**

- `pnpm build` and `pnpm test:smoke` passed; smoke ran 153/153 tests.
- `pnpm format` passed.
- Retired-file sweep found only p01-t13/p03-t01 deferred references and durable project/repository history.

---

### Task p01-t13: Retire the core orchestrator and obsolete modules

**Status:** completed
**Commit:** e47be8859204bfc959350fd05cbfedf00537a799

**Outcome:**

- Removed the retired core orchestrator, render/publish/durability modules, schemas, references, examples, golden fixtures, and obsolete tests.
- Retained exactly three entry scripts, ten library modules, three schemas, two references, and fourteen test files.

**Verification:**

- All 80 retained core tests passed.
- Every retained core library module imported successfully.
- `pnpm lint` and `pnpm format` passed.

---

### Task p01-t14: Cut the adapter callback path, seam probe, and finalizer

**Status:** completed
**Commit:** f9b6fa6a0a450e8773d57f63e49e7e74e86fc1a6

**Outcome:**

- Removed the adapter orchestrator, destination, finalizer, and seam-probe scripts plus their runtime tests.
- Reduced config resolution to theme defaults and workflow preferences; moved `MINIMUM_CORE_VERSION` to `check-core.mjs`.
- Rewrote project/program allowlists and retained the supplied-fact-base path without repository bindings.
- Removed runtime assertions from the completion integration test while retaining lifecycle prose assertions.

**Verification:**

- All 43 retained adapter tests passed, including new replacement-allowlist coverage.
- `pnpm lint` and `pnpm format` passed.
- The only retired-symbol matches in adapter tests are the lifecycle prose assertions explicitly deferred and allowlisted until Phase 3.

---

### Task p01-t15: Remove the explainer publish config keys

**Status:** completed
**Commit:** 0a8450c6d2c4413a62e7aa133d12a7e882984777

**Outcome:**

- Removed all six `explainers.publish.*` keys from CLI config types, catalogs, validation, normalization, defaults, writes, and tests.
- Retained four `explainers.defaults.*` keys and the two explainer workflow preferences.
- Collapsed the explainer write and surface-selection branches to defaults-only behavior.

**Verification:**

- The new retired-key test failed before implementation and passed after removal.
- Affected config suites passed 481/481; CLI type-check, `pnpm lint`, and `pnpm format` passed.
- Retired key/type sweep is empty; the sole `publish` hit in `oat-config.ts` is unrelated documentation-exclusion prose.

---

### Task p01-t16: Move completion-transaction recap fixtures to v2

**Status:** completed
**Commit:** bd444a3ea44c1d990ddab448dc72e2f91de86d4b

**Outcome:**

- Replaced two-file durability evidence fixtures with a single manifest-v2 recap fixture and the `built` outcome.
- Kept completion-transaction behavior unchanged while moving receipt evidence lists and contamination controls to the one-file contract.

**Verification:**

- Completion-transaction suite passed 31/31 before and after the fixture migration.
- Retired build-record and durability-outcome sweep is empty under the push command sources.
- CLI type-check, lint, and formatting checks passed.

---

### Task p01-t17: Add the retired-reference sweep and bump shipped versions

**Status:** completed
**Commit:** 853462ffd53b2d347ad6495c5829abd18091cab0

**Outcome:**

- Added the Phase 1 code-scope retired-reference scanner with three named transitional prose exclusions and two outcome-only negative-control allowlists.
- Bumped `explainer-kit` to 3.0.0, `oat-explainer-kit` to 1.0.9, the adapter minimum core to 3.0.0, and all five public packages to 0.2.73.
- Updated canonical version pins and the packaged public-version map.

**Verification:**

- Sweep red control found seeded `built-durable`; the named guard-test allowlist control stayed green; the tracked tree stayed green.
- Ordered phase gates all exited 0: check, type-check, test, build, skill bumps, origin fetch, release versions, release validation, and docs build.
- Final forced Turbo run passed all ten tasks with `Cached: 0`; standalone smoke (156/156), skills, scripts, canonical skill validation, lint, and format passed.
- One unrelated forced-run visual-companion startup timeout passed 5/5 independently and the immediate full uncached retry passed 390/390 CLI files.

---

## Phase 2: Ladder and fresh-host proof

**Status:** completed
**Started:** 2026-09-11

### Phase Summary

**Outcome:**

- Added host screenshot verification bound to the exact authored-page hash,
  canonical PNG widths, and an explicit inspection verdict.
- Added Playwright probing with retained screenshots, consumed layout
  findings, runtime downgrade reasons, and real Chromium coverage.
- Added the agent authoring mechanics and replaced the retired fact-base
  callback reference with the bundle, ledger, and consumer contract.
- Proved the browser-less fresh-host flow, archive acceptance, failed-section
  evidence, completion resume, missing-core stop, and browser-launch fallback.

**Verification:**

- Both fresh-host runs passed without Turbo caching.
- All ordered repository gates, the isolated-HOME forced Turbo run
  (`Cached: 0`), standalone smoke/skill/script validation, lint, and format
  passed.
- Recovery usage remained `0/10`; no recovery attempt or event was opened.

### Task p02-t01: Host rung with the artifact-hash binding

**Status:** completed
**Commit:** a670b8e8955ccd31c9ff9508e9ccdac04ae6e5cb

**Files changed:**

- `.agents/skills/explainer-kit/scripts/verify.mjs`
- `.agents/skills/explainer-kit/tests/verify.test.mjs`

**Verification:** focused host-rung suite, lint, and format passed. Bypassing
the hash comparison made the mismatch control fail; restoring it returned the
suite to green.

### Task p02-t02: Playwright rung

**Status:** completed
**Commit:** 18d13671e8a7fc4b1a45aeefabdf7e441bbafe4b

**Files changed:**

- `.agents/skills/explainer-kit/scripts/verify.mjs`
- `.agents/skills/explainer-kit/tests/verify.test.mjs`

**Verification:** focused verify and unchanged browser-runtime suites passed
with installed Chromium `152.0.7977.84`. Suppressing probe findings made the
fixed-width layout control fail; restoring findings returned the suite to
green.

### Task p02-t03: The authoring brief

**Status:** completed
**Commit:** 43ab318281970d2c51ba3ab09101a0639b8e5889

**Files changed:**

- `.agents/skills/explainer-kit/references/recap-authoring.md`
- `.agents/skills/explainer-kit/references/fact-base-contract.md`

**Verification:** the new reference shares no headings with the project-recap
brief; reference formatting, skill validation, lint, and format passed.

### Task p02-t04: Fresh-host end-to-end proof with negative controls

**Status:** completed
**Commit:** 38a46c85653ae8630465518e25aad053f92a088a

**Files changed:**

- `.agents/skills/explainer-kit/tests/fresh-host.test.mjs`

**Verification:** two uncached fresh-host runs and every phase-boundary gate
passed. Neutralizing required-section validation, browser-failure distinction,
or the missing-core prerequisite made its focused assurance control fail;
restoring each guard returned the suite to green.

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

#### Phase Outcome

| Phase | Status    | Tasks | Base                                       | Code Head                                  | Review                          |
| ----- | --------- | ----- | ------------------------------------------ | ------------------------------------------ | ------------------------------- |
| p01   | completed | 17/17 | `79f359957fabe4cbe042b39379523887b816cbff` | `5844547c524f09f700027691bd7c1148b536b2e4` | independent verification passed |

- Recovery ledger: `used_attempts: 0`, `pending_attempt: null`; no recovery events.
- File boundary: only p01-declared files, the operator-approved plan/design correction, p01 bookkeeping, and mechanically derived in-phase symbol consumers were changed.
- Completion time: `2026-09-11T15:44:08Z`.
- Task p01-t17 bookkeeping: `dd203b3aacdfdd9642fbe95d74855059b2711819`.
- Phase completion disposition: implementation complete; review round 1 fixes required; p02 not started.

#### Phase Review Round 1

- Request ID: `dispatch-agent-authored-recap-p01-review-r1-20260911T1549Z`
- Launch status: `accepted`
- Terminal outcome: `completed`
- Review artifact: `reviews/p01-review-2026-09-11T155532Z.md`
- Reviewed range: `79f359957fabe4cbe042b39379523887b816cbff..f1cff54c0e364e858f9e36fb820e9f95b1e5b578`
- Reviewed head: `f1cff54c0e364e858f9e36fb820e9f95b1e5b578`
- Findings: 2 Critical, 5 Important, 3 Medium, 0 Minor
- Disposition: `CHANGES REQUESTED`; review row advanced to `fixes_added`
- Reconnaissance: `not-attempted`; no Review Orchestration section or project-log entry
- Selection reason: `gate-target`
- Candidates considered: `gpt-5.6-sol-high`
- Dispatch target: `oat-reviewer-gpt-5-6-sol-high`
- Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
- Next: resume the original Phase 1 handle for the bounded review findings, then run a fresh root-owned review round.

#### Phase Review Round 1 Fix

- Continuation: `cont-agent-authored-recap-p01-review-r1-fix-1`
- Original request: `dispatch-agent-authored-recap-p01-20260911T0308Z`
- Review artifact: `reviews/p01-review-2026-09-11T155532Z.md`
- Fix range: `4b58a8dc1a13ca81c28f96b13c249605be1d411e..fd809a53820a6907f07b039a2b840d9fa31a26b5`
- Fix commit: `fd809a53820a6907f07b039a2b840d9fa31a26b5`
- Fixed: all 2 Critical and 5 Important findings with red/green negative controls
- Deferred unchanged: 3 Medium findings
- Verification: focused core, lifecycle, archive, CLI, smoke, skills, scripts, all eight phase gates, lint, format, and uncached Turbo passed
- Recovery accounting: review-fix continuation; phase recovery usage remains `0/10` with `pending_attempt: null`
- Dispatch target and axes: unchanged (`oat-phase-implementer-gpt-5-6-sol-high`, `selected:gpt-5.6-sol-high`, effort not applicable)
- Dispatch: scope=p01-review-r1-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-high
- Disposition: `fixes_completed`; root-owned re-review required before p02

#### Phase Review Round 2

- Request ID: `dispatch-agent-authored-recap-p01-review-r2-20260911T1635Z`
- Launch status: `accepted`
- Terminal outcome: `completed`
- Review artifact: `reviews/p01-review-2026-09-11T165150Z.md`
- Reviewed range: `79f359957fabe4cbe042b39379523887b816cbff..3f29035c2588bc590cfd361e88e5632e084238f5`
- Reviewed head: `3f29035c2588bc590cfd361e88e5632e084238f5`
- Prior dispositions: 2 Critical closed; 3 Important closed; 2 Important partial
- Findings: 0 Critical, 3 Important, 3 Medium, 0 Minor
- Disposition: `CHANGES REQUESTED`; new review row advanced to `fixes_added`
- Reconnaissance: `not-attempted`; no Review Orchestration section or project-log entry
- Selection reason: `gate-target`
- Candidates considered: `gpt-5.6-sol-high`
- Dispatch target: `oat-reviewer-gpt-5-6-sol-high`
- Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
- Next: final allowed bounded fix iteration for the three Important findings, then fresh root-owned review round 3

#### Phase Review Round 2 Fix

- Continuation: `cont-agent-authored-recap-p01-review-r2-fix-2`
- Original request: `dispatch-agent-authored-recap-p01-20260911T0308Z`
- Review artifact: `reviews/p01-review-2026-09-11T165150Z.md`
- Fix range: `8219e29adcbf161c7092c2bbce9e605463cdc6c2..ca185f1c629892c1616f136cfe9c15aa8c0bddcc`
- Fix commit: `ca185f1c629892c1616f136cfe9c15aa8c0bddcc`
- Fixed: all 3 Important findings with pre-fix controls and post-fix verification
- Deferred unchanged: failure sanitization, duplicate relative-locator handling, and heading-fact asymmetry
- Verification: focused core, lifecycle, archive/CLI, all eight phase gates, uncached Turbo, smoke, skills, scripts, lint, and format passed
- Recovery accounting: final review-fix iteration; phase recovery usage remains `0/10`
- Dispatch target and axes: unchanged (`oat-phase-implementer-gpt-5-6-sol-high`, `selected:gpt-5.6-sol-high`, effort not applicable)
- Dispatch: scope=p01-review-r2-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-high
- Disposition: `fixes_completed`; governance-final root-owned review round 3 required before p02

#### Phase Review Round 3 — Governance Final

- Request ID: `dispatch-agent-authored-recap-p01-review-r3-20260911T1726Z`
- Launch status: `accepted`
- Terminal outcome: `completed`
- Review artifact: `reviews/p01-review-2026-09-11T173707Z.md`
- Reviewed range: `79f359957fabe4cbe042b39379523887b816cbff..5e8694abbb7f7740970bd69e5feea64ddf9df316`
- Reviewed head: `5e8694abbb7f7740970bd69e5feea64ddf9df316`
- Prior closure: all earlier Critical and Important findings closed without regression
- Findings: 0 Critical, 1 Important, 3 Medium, 0 Minor
- Disposition: `CHANGES REQUESTED`; governance retry budget exhausted at round 3 of 3
- Reconnaissance: `not-attempted`; no Review Orchestration section
- Blocking finding: terminal `generate` guard accepts a partial or stale satisfied manifest, and interrupted rebundling can leave that stale manifest beside failure evidence
- Selection reason: `gate-target`
- Candidates considered: `gpt-5.6-sol-high`
- Dispatch target: `oat-reviewer-gpt-5-6-sol-high`
- Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
- Stop: operator direction is required before any further fix or Phase 2 work

#### Operator Authorization — Governance Extension

- Authorization time: `2026-09-11T18:27:00Z`
- Scope: one bounded manual remediation for the governance-final terminal-guard finding, followed by one independent verification review
- Finding: validate the complete satisfied project-recap package before `generate` succeeds, and prevent stale manifest/failure coexistence during changed-input rebundle interruption
- Continuation: `cont-agent-authored-recap-p01-governance-manual-fix-1`
- Authorization: `operator-scope`
- Original request: `dispatch-agent-authored-recap-p01-20260911T0308Z`
- Exact target: `oat-phase-implementer-gpt-5-6-sol-high` (unchanged)
- Recovery accounting: outside the automatic review-fix budget and not phase recovery; usage remains `0/10`
- Boundary: no Medium findings, p02 work, archive recipe widening, or unrelated cleanup

#### Operator-Authorized Governance Remediation

- Continuation: `cont-agent-authored-recap-p01-governance-manual-fix-1`
- Original request: `dispatch-agent-authored-recap-p01-20260911T0308Z`
- Source review: `reviews/p01-review-2026-09-11T173707Z.md`
- Fix range: `4d971b476fac42e3d9cb95829b23a417a55bb132..5844547c524f09f700027691bd7c1148b536b2e4`
- Fix commit: `5844547c524f09f700027691bd7c1148b536b2e4`
- Fixed: terminal `generate` now requires a complete assured project-recap package; changed-input rebundles and failure recording invalidate stale manifests
- Negative controls: partial built manifest, corrupted package bytes, changed-input interruption, and failure/manifest coexistence all failed before the fix and pass after it
- Positive control: checked-in recorded project-recap package remains accepted
- Verification: focused core, lifecycle, archive/CLI, ordered phase gates, uncached Turbo, smoke, skills, scripts, lint, and format passed
- Recovery accounting: operator-scoped governance remediation; automatic retry budget remains exhausted and phase recovery usage remains `0/10`
- Dispatch target and axes: unchanged (`oat-phase-implementer-gpt-5-6-sol-high`, `selected:gpt-5.6-sol-high`, effort not applicable)
- Dispatch: scope=p01-governance-manual-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-high
- Deferred unchanged: failure sanitization, duplicate relative-locator handling, and heading-fact asymmetry
- Disposition: `fixes_completed`; one operator-authorized independent verification review remains before p02

#### Operator-Authorized Independent Verification

- Request ID: `dispatch-agent-authored-recap-p01-independent-verification-20260911T1857Z`
- Launch status: `accepted`
- Terminal outcome: `completed`
- Review artifact: `reviews/p01-review-2026-09-11T185739Z.md`
- Reviewed range: `79f359957fabe4cbe042b39379523887b816cbff..285673119c8493c99ea0c0208e18779a8e9a142c`
- Reviewed head: `285673119c8493c99ea0c0208e18779a8e9a142c`
- Findings: 0 Critical, 0 Important, 3 deferred Medium, 0 Minor
- Disposition: `PASS`
- Reconnaissance: `not-attempted`; no Review Orchestration section or project-log orchestration entry
- Verification: 154 focused tests passed, including positive and negative remediation controls and the strict project-recap archive boundary
- Selection reason: `gate-target`
- Candidates considered: `gpt-5.6-sol-high`
- Dispatch target: `oat-reviewer-gpt-5-6-sol-high`
- Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
- Phase outcome: p01 passed after 2 automatic fix iterations and 1 operator-authorized remediation; p02 is now ready
- Recovery accounting: phase recovery usage remains `0/10`, `pending_attempt: null`

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
- [x] p01-t11: Retire the explainer release-candidate tooling - 72312063bc5a4edc979e6bbc386a50a76f8c1b5e
- [x] p01-t12: Retire the explainer smoke tests - aeed93c29c791b5a19f4b09b0f6d6bf9af15d2e2
- [x] p01-t13: Retire the core orchestrator and obsolete modules - e47be8859204bfc959350fd05cbfedf00537a799
- [x] p01-t14: Cut the adapter callback path, seam probe, and finalizer - f9b6fa6a0a450e8773d57f63e49e7e74e86fc1a6
- [x] p01-t15: Remove the `explainers.publish.*` CLI config keys - 0a8450c6d2c4413a62e7aa133d12a7e882984777
- [x] p01-t16: Move completion-transaction recap fixtures to v2 - bd444a3ea44c1d990ddab448dc72e2f91de86d4b
- [x] p01-t17: Add retired-reference sweep and bump shipped versions - 853462ffd53b2d347ad6495c5829abd18091cab0

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

- Root-owned Phase p01 review; do not start p02 from this implementation handle.

**Blockers:**

- None.

**Session End:** 2026-09-11T15:44:08Z

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

| Phase | Tests Run                                                                                                                | Passed             | Failed  | Coverage                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------- | -------------------------------------------------------------------------------------------------- |
| 1     | Ordered CI gates; forced Turbo; standalone smoke/skills/scripts/skill validation; lint/format; focused negative controls | All final commands | 0 final | Browser-free flow, archive/package contract, terminal outcomes, retired references, version parity |
| 2     | Ordered CI gates; forced Turbo; standalone smoke/skills/scripts; fresh-host controls; lint/format                        | All final commands | 0 final | Host and Playwright rungs, authoring contract, fresh-host completion and failure evidence          |

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
