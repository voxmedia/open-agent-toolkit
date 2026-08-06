---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-06
oat_current_task_id: p02-t01
oat_generated: false
---

# Implementation: explainer-improvements-v2

**Started:** 2026-08-05
**Last Updated:** 2026-08-06

## Quick-Start Exit Gate Feedback (escalation record)

The configured quick-start exit gate (`oat gate review`, plan artifact scope,
target `cursor-gpt-5-6-sol-xhigh`, `onFailure: block`, `maxAttempts: 2`)
blocked on both attempts; attempts are exhausted and the outcome was
escalated to the operator.

- **Attempt 1** (`reviews/archived/artifact-plan-review-2026-08-06T002327Z.md`):
  4 Important + 1 Medium — in-place schema-version tightening, metadata-only
  protected byte verification, approval-ordering task targeting the wrong
  orchestrator seam, vacuous negative visual fixture oracle, missing generated
  release version asset. All five resolved in the plan artifact
  (commit `443f e4f4`).
- **Attempt 2** (`artifact-plan-review-2026-08-06T004027Z.md`): prior findings
  confirmed resolved; 2 Important + 1 Medium new — flagged
  `built-needs-review` runs lack a durability/finalization path (durability
  and finalize seams currently reject that outcome); new contract versions not
  propagated through registries/readers/embedding schemas
  (receipt v1/v2 dispatch, `theme/v1` in-place tightening, `author-request`
  ↔ `set-plan/v2` reference, missing v3 author-request in p05-t06); p01-t04
  file scope cannot reach the run slug (add `run.mjs`).

- **Attempt 3** (operator-authorized;
  `artifact-plan-review-2026-08-06T005429Z.md`): attempt-2 findings confirmed
  resolved; 4 Important + 2 Medium new — `publicAccess` emitted before core
  schema support (fixed: threading moved to new p03-t06), contract versions
  not propagated to shipped consumers outside the skill trees (fixed: new
  p06-t05 migrates release tooling, smoke fixture, adapter callbacks),
  missing `oat-project-implement` skill version bump (fixed in p07-t01),
  receipt verification enum unable to hold both protected facts (fixed:
  structured per-artifact object/public verification fields in p03-t03),
  failure-record contract ordered after its consumer (fixed: p04-t03/p04-t04
  swapped), and file-list/verify-command drift in p03-t03 and p04-t02
  (fixed). Plan now totals 32 tasks.

- **Attempt 4** (operator standing direction to iterate;
  `artifact-plan-review-2026-08-06T012720Z.md`): attempt-3 findings confirmed
  resolved; 3 Important + 1 Medium new — `publicAccess` missing from CLI
  config surfaces (fixed: p01-t02 expanded to `packages/cli/src/config/**`
  and command catalog), visual-review v2 registry dispatch missing (fixed in
  p06-t02), executable consumers missing from p06-t05 (fixed: adapter
  `run.mjs`, private-wrapper fixture, release-tool tests, `publicAccess`
  key-check), and stale design.md protected-verification wording (fixed:
  design aligned to service-checksum verification and split verification
  fields).

- **Attempt 5** (`artifact-plan-review-2026-08-06T013953Z.md`): attempt-4
  findings confirmed resolved; 2 Important + 2 Medium new — executable recap
  fixtures (`e2e-recap.test.mjs`, adapter completion fixture) missing from
  the structured-authoring/hub-floor tasks (fixed in p05-t06/p06-t01),
  package-coverage smoke consumer missing from p06-t05 (fixed, with CLI build
  prerequisite in verification), link-validator parser strategy undefined
  (fixed: bounded fail-closed tokenizer, no new dependency), contradictory
  receipt verification shapes (fixed: single structured object/public shape).

- **Attempt 6** (`artifact-plan-review-2026-08-06T015212Z.md`): attempt-5
  findings confirmed resolved; 2 Important, 0 Medium new — p02-t01 defined
  `author-request/v3` without scoping the emitting seam (`run.mjs` builds and
  pins requests to v2; fixed: `run.mjs` and `run.integration.test.mjs` added
  with exact relative-URL assertions), and no production caller was required
  to finalize flagged/failed recap outcomes (fixed: p04-t04 revises the
  implementation-tail sequence to finalize clean, flagged, and failed
  outcomes before recording the gate outcome, with end-to-end integration
  coverage for all three classes).

- **Attempt 7** (`artifact-plan-review-2026-08-06T021300Z.md`): attempt-6
  findings confirmed resolved; 2 Important + 3 Medium new — structured recap
  migration changed `project-recap@1` in place (fixed: new
  `project-recap.v2.json` / `project-recap@2` with registry entry, adapter
  version switch in `resolve-config.mjs`, v1-replay plus v2-emission
  coverage, and the recipe pair added to p06-t05 consumer migration),
  double-nesting guard was adapter-only (fixed: generic guard moved to the
  core `createConfinedRunRoot`/`initializeRun` boundary with core tests),
  source-aware `publicAccess` propagation unstated (fixed: explicit
  non-default-source emission rule in p01-t02/p03-t06 with four source
  cases), adapter destination encoding outside the single-helper task (fixed:
  `derive-destination.mjs` added to p03-t04 with cross-skill parity tests),
  and stale Reviews-table rows pointing at archived artifacts (fixed:
  archived paths, dispositions, and finding counts recorded).

- **Attempt 8** (`artifact-plan-review-2026-08-06T023457Z.md`): attempt-7
  findings confirmed resolved; 4 Important, 0 Medium new — the
  `oat-project-complete` route could finalize the lifecycle without a
  terminal recap outcome (fixed: its completion gate added to p04-t04 with
  route-level integration coverage and a p07-t01 version bump), the
  flagged-run publication denial was unenforced at the direct publisher
  (fixed: `publish.mjs`/`s3-static.mjs` reject flagged manifests unless a
  new `publish-override/v1` record bound to run ID and manifest hash
  validates, with negative tests and receipt audit), shipped guidance
  consumers remained on old contracts (fixed: p06-t05 expanded to canonical
  skill guidance, wave/program callers, `oat-project-summary` outcomes, RC
  inventory assertions, and `apps/oat-docs` contract pages, with matching
  p07-t01 bumps), and no test crossed the adapter/core publication boundary
  (fixed: new p06-t06 acceptance fixture proves project/repo prefixes,
  explicit `index.html`, protected/public propagation, hash equality, and
  receipt completeness against a fake destination). Plan now totals 33
  tasks.

- **Attempt 9** (`artifact-plan-review-2026-08-06T024804Z.md`): attempt-8
  findings confirmed resolved; 4 Important, 0 Medium new (all downstream of
  the attempt-8 fixes) — the lifecycle transition test had no executable
  production seam (fixed: shared `check-terminal-outcome.mjs` guard script
  invoked by both completion routes and executed directly by the integration
  test for missing/clean/flagged/failure cases), flagged durability
  permitted an incomplete package (fixed: `package-coverage.mjs` added to
  p04-t02 with a canonical flagged package and hash-verified evidence),
  the closed receipt contract could not carry the publish override (fixed:
  `publish-receipt.v2` schema, docs, and validation tests added to p04-t02
  with required-when-flagged/absent-when-clean shapes), and the adapter
  could not reach the shared URL helper through its declared scope (fixed:
  adapter `run.mjs` compatibility-seam injection added to p03-t04 with a
  divergent-core-root fixture).

- **Attempt 10** (first run timed out at the 900s gate budget with no
  review; rerun with `--timeout-ms 1800000` produced
  `artifact-plan-review-2026-08-06T031926Z.md`): attempt-9 findings
  confirmed resolved; 2 Important + 1 Medium new — new contract versions
  were separated from live adapter consumers (fixed: set-plan/v2 adapter and
  completion fixtures moved into p06-t01, visual-review v2 adapter
  acceptance moved into p06-t02, p06-t05 refocused on remaining
  guidance/release/docs consumers), the docs migration skipped the required
  authoring workflow (fixed: p06-t05 enumerates the affected pages, adds
  delta analysis with user approval, nav sync, and `oat docs generate-index`
  regeneration before build checks), and the p01/p02 parallel write
  boundary was stale after the p01-t04 core-guard fix (fixed: exact-file
  disjointness documented with a sequential fallback).

- **Attempt 11** (`artifact-plan-review-2026-08-06T033345Z.md`): attempt-10
  findings confirmed resolved; 3 Important, 0 Medium new —
  `project-recap@2` was mutated between p05-t06 and p06-t01 (fixed:
  p05-t06 reduced to runtime structured-authoring capability via test-local
  recipes; `project-recap@2` is created, registered, and adapter-activated
  atomically in its final hub-floor form in p06-t01), the flagged-run
  publish override contradicted the normative handoff criteria (fixed:
  override removed entirely — flagged manifests are categorically rejected
  at `publish.mjs` and the connector; design.md reconciled), and the CLI
  archive verifier still rejected `built-needs-review` (fixed:
  `archive-utils.ts` and archive/push tests added to p04-t02 so
  flagged-durable packages verify and export while staying unpublishable;
  `workflows/projects/artifacts.md` added to the docs delta).

- **Attempt 12** (`artifact-plan-review-2026-08-06T034831Z.md`): attempt-11
  findings confirmed resolved; 2 Important, 0 Medium new — the link
  validator lacked valid fragment/non-site reference classes (fixed:
  explicit reference classifier in p02-t02 with fragment-target
  verification, HTML-safety-governed `data:`/SVG exemptions, and classifier
  fixtures), and the hard link gate never proved correction recovery
  (fixed: p02-t03 gains a full recovery scenario — link finding → bounded
  correction → rerender → revalidation → browser/visual review →
  durability-eligible — plus an exhaustion case, with findings recorded via
  `records.mjs`). Consequence: the p01/p02 parallel group was dropped
  (records-file overlap), so the plan is now fully sequential.

- **Attempt 13** (`artifact-plan-review-2026-08-06T040012Z.md`): attempt-12
  findings confirmed resolved; 2 Important, 0 Medium new —
  `author-request/v3` was mutated by later tasks after runs start emitting
  it (fixed: p02-t01 now creates the v3 schema in its complete final form —
  canonical link table, authoring-variant discriminator, theme v1/v2 by
  discriminator, embedded set-plan v1/v2 by discriminator — and the file is
  immutable thereafter; p05-t02, p05-t06, and p06-t01 activate runtime
  capability and registry acceptance without touching the schema, with
  retained-request replay tests), and most new schemas bypassed the explicit
  schema-conformance inventory (fixed: `tests/schemas.test.mjs` added to the
  file list and verify command of every schema-producing task — p02-t01,
  p03-t03, p04-t03, p05-t01, p05-t02, p06-t01, p06-t02 — each adding its new
  schema to the explicit map at its own commit).

- **Attempt 14** (`artifact-plan-review-2026-08-06T042235Z.md`): attempt-13
  findings confirmed resolved; 3 Important, 2 Medium new — repository
  invocation had no executable source-binding path (fixed: p01-t03 defines
  the repository input contract — a required, validated supplied fact base
  bound with reviewed-repository provenance, no implicit active-project
  fallback, fail-closed without one, with success/missing-source/
  ignores-active-project fixtures), the immutable `author-request/v3`
  discriminator dropped the live `markdown` authoring mode (fixed: v3
  request and `author-result/v3` retain `markdown | html | structured`,
  with executable new-run coverage for `project-explainer`, `program-recap`,
  the project-recap deep-dive expansion, and `deterministic-markdown`), and
  the adapter compatibility floor never advanced with its new core
  dependencies (fixed: p03-t04 allocates a new core minor, raises
  `MINIMUM_CORE_VERSION` and the documented floor in the same commit, and
  adds stale/current-core `check-core.test.mjs` fixtures; p07-t01 verifies
  the coordinated pair). Medium: p03-t01 now rejects protected execution
  fail-closed until p03-t02 activates it, and p06-t06's `index.html`
  assertion is scoped to HTML/manifest artifacts with the catalog JSON and
  transient sentinel asserted separately.

- **Attempt 15** (`artifact-plan-review-2026-08-06T043754Z.md`): attempt-14
  findings confirmed resolved; 2 Important, 1 Medium new — receipt v2 could
  not represent the generated catalog, which has no manifest artifact ID
  (fixed: v2 uses discriminated entries — manifest-artifact entries require
  the ID, auxiliary-object entries carry path/URI/URL/hash/verification
  without one — with exact-coverage cross-validation over manifest artifacts
  plus the catalog in both access modes), and executable consumer
  migrations trailed their producers (fixed: receipt v1/v2 acceptance in
  release tools and the private-wrapper smoke fixture moved into p03-t03,
  the validator's `publicAccess` key check into p03-t06, and the
  package-coverage smoke callback's set-plan/recipe and visual-review
  migrations into p06-t01/p06-t02; p06-t05 is now guidance/docs migration
  plus a repository-wide coverage sweep). Medium: the ledger rows for the
  two archived reviews now point at `reviews/archived/` with their actual
  fixes_completed disposition and gate provenance.

Operator disposition recorded in the conversation and reflected in the plan's
`## Reviews` table.

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

| Phase | Status    | Tasks | Completed |
| ----- | --------- | ----- | --------- |
| p01   | completed | 6     | 6/6       |
| p02   | pending   | 2     | 0/2       |
| p03   | pending   | 3     | 0/3       |
| p04   | pending   | 3     | 0/3       |
| p05   | pending   | 3     | 0/3       |

**Total:** 6/17 tasks completed

---

## Phase 1: Adapter path and destination derivation

**Status:** completed
**Started:** 2026-08-06
**Completed:** 2026-08-06

| Task    | Status    | Commit            |
| ------- | --------- | ----------------- |
| p01-t01 | completed | 84a5b4a           |
| p01-t02 | completed | 3a634e0           |
| p01-t03 | completed | ab12256           |
| p01-t04 | completed | aa1ec2d           |
| p01-t05 | completed | a42a385           |
| p01-t06 | completed | fcc100f + c1d5a1b |

## Phase 2: Core link integrity

**Status:** pending

| Task    | Status  | Commit |
| ------- | ------- | ------ |
| p02-t01 | pending | -      |
| p02-t02 | pending | -      |

## Phase 3: Publication integrity

**Status:** pending

| Task    | Status  | Commit |
| ------- | ------- | ------ |
| p03-t01 | pending | -      |
| p03-t02 | pending | -      |
| p03-t03 | pending | -      |

## Phase 4: Lifecycle and bounded recovery

**Status:** pending

| Task    | Status  | Commit |
| ------- | ------- | ------ |
| p04-t01 | pending | -      |
| p04-t02 | pending | -      |
| p04-t03 | pending | -      |

## Phase 5: Prose-led authoring and release closure

**Status:** pending

| Task    | Status  | Commit |
| ------- | ------- | ------ |
| p05-t01 | pending | -      |
| p05-t02 | pending | -      |
| p05-t03 | pending | -      |

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-08-06

- Completed p01-t01 through p01-t05 in five task commits.
- Verified the adapter/core focused suites, CLI tests, lint, and format against
  committed HEAD.
- Independent phase review found one executable defect plus stale lifecycle
  bookkeeping and two non-reproducible plan commands.

### Review Received: p01

**Date:** 2026-08-06
**Review artifact:** `reviews/archived/p01-review-2026-08-06T172134Z.md`

**Findings:**

- Critical: 0
- Important: 2
- Medium: 1
- Minor: 0

**Disposition:**

- I1 → p01-t06: reject credential-bearing or malformed publish roots before
  core invocation or request persistence.
- I2 → resolved in review-receive bookkeeping by reconciling the five completed
  task commits, verification results, and resume pointer.
- M1 → resolved in `plan.md` by replacing invalid test-directory operands with
  the verified `*.test.mjs` glob.

**New tasks added:** p01-t06

**Resolution:**

- p01-t06 landed in `fcc100f`.
- Focused re-review found one WHATWG normalization bypass for empty delimiters.
- The bounded append-only correction landed in `c1d5a1b`.
- A second focused review passed with no findings.

**Review artifacts:**

- `reviews/archived/p01-t06-review-2026-08-06T173603Z.md`
- `reviews/archived/p01-t06-review-2026-08-06T174423Z.md`

**Next:** Apply the operator-approved reduced plan before p02.

### Plan Revision: executable kernel + prose-led creative layer

**Date:** 2026-08-06

- Reduced the project from the then-current 34 tasks to 17 total tasks,
  including the completed p01 review fix.
- Removed structured content/theme contracts, renderer engines, semantic layout
  code, deterministic visual-quality heuristics, and new golden matrices.
- Preserved executable path, link, publication, credential, and lifecycle
  invariants.
- Kept the existing golden suite unchanged and moved simplification to a
  separate evidence-based follow-up.
- A delta-focused artifact review is required before p02 begins.

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact   | Planned / Documented                  | Actual / Accepted                               | Reason                                              | Source of Truth                                     | Follow-up                             |
| ------------- | ----------------- | ------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- | ------------------------------------- |
| p01-t06       | focused re-review | one task commit                       | one task commit plus one append-only correction | WHATWG URL parsing normalized away empty delimiters | committed implementation and passing focused review | none                                  |
| plan revision | operator decision | structured renderer and golden matrix | executable kernel plus prose-led creative layer | original plan overengineered judgment-oriented work | revised `design.md` and `plan.md`                   | golden-suite audit tracked separately |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                            | Passed | Failed | Coverage                                           |
| ----- | ---------------------------------------------------- | ------ | ------ | -------------------------------------------------- |
| 1     | adapter/core focused suites; CLI tests; lint; format | passed | 0      | p01-t01–p01-t06 complete; focused re-review passed |
| 2     | -                                                    | -      | -      | -                                                  |

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
