---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-16
oat_current_task_id: p07-t01
oat_generated: false
---

# Implementation: explainer-improvements-v2

**Started:** 2026-08-05
**Last Updated:** 2026-08-07

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
| p02   | completed | 2     | 2/2       |
| p03   | completed | 11    | 11/11     |
| p04   | completed | 6     | 6/6       |
| p05   | completed | 4     | 4/4       |
| p06   | completed | 5     | 5/5       |

**Total:** 34/34 tasks completed

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

**Status:** completed
**Started:** 2026-08-06
**Completed:** 2026-08-06

| Task    | Status    | Commit            |
| ------- | --------- | ----------------- |
| p02-t01 | completed | 617dea6           |
| p02-t02 | completed | fde1437 + 3f0dfe5 |

## Phase 3: Publication integrity

**Status:** completed
**Started:** 2026-08-06
**Completed:** 2026-08-06

| Task    | Status    | Commit            |
| ------- | --------- | ----------------- |
| p03-t01 | completed | 58a9fd2 + c9a0aee |
| p03-t02 | completed | cd65ad8           |
| p03-t03 | completed | 74d3d09           |
| p03-t04 | completed | c2aa4336          |
| p03-t05 | completed | b9be685           |
| p03-t06 | completed | a3c56bb           |
| p03-t07 | completed | 38ca2e4           |
| p03-t08 | completed | 2e6519a           |
| p03-t09 | completed | df0e904           |
| p03-t10 | completed | 4a726147          |
| p03-t11 | completed | ba66d54b          |

### Recovery Event p03-recovery-001

- Phase/task: p03 / p03-t01
- Original request: explainer-improvements-v2-p03-publication-integrity
- Original commit: 58a9fd294e8dfc83d398d43789c4f68c7092609c
- Defect class: composition
- Discovered by: pnpm test
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/1
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-high
- Recovery commit: c9a0aeead5bce79a5e31bd6ce247e80a64ec1800
- Verification: focused CLI validation, `pnpm test`, the p03 phase union,
  `pnpm lint`, `pnpm format`, and `git diff --check` passed; the focused p03
  reviewer independently validated the completed recovery marker.
- Reason: the stale bundled explainer-kit version assertion was a bounded
  mechanical mismatch after p03 raised the core compatibility floor; p05-t03
  retains ownership of lockstep public-package version bumps and release
  validation.

### Recovery Event p03-recovery-002

- Phase/task: p03 / p03-t01
- Original request: explainer-improvements-v2-p03-review-fixes
- Original commit: 58a9fd294e8dfc83d398d43789c4f68c7092609c
- Defect class: composition
- Discovered by:
  `node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 2/2
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-high
- Reservation head: df0e90417fb386f9d16a7ab39fe3beb40ddfa84f
- Recovery commit: 01d3c99075aa09ea5fb49b801d4deca1d5f3c51e
- Verification: the rebuildability regression and focused/direct p03 suites
  passed 231/231; release/smoke suites passed 31/31; `pnpm check`,
  `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm format`,
  and `git diff --check` passed serially. The broad skill glob remained
  nonzero only for 27 inherited `E_BROWSER_PROBE` failures in
  `e2e-recap.test.mjs`; the p03 fix range changes neither that fixture nor its
  trusted-browser enforcement path.
- Reason: p03-t01 correctly raised explainer-kit to 2.1.0, but one
  rebuildability assertion still expected 2.0.3. The bounded recovery aligned
  that stale assertion without changing runtime behavior.
- Ledger settlement: root validated the committed `completed` marker against
  event `p03-recovery-002`, attempt 2, reservation head `df0e904`, and recovery
  commit `01d3c99`. After recording this canonical event, `pending_attempt` was
  cleared while monotonic `used_attempts: 2` was preserved.

## Phase 4: Lifecycle and bounded recovery

**Status:** completed
**Started:** 2026-08-07
**Completed:** 2026-08-07

| Task    | Status    | Commit    |
| ------- | --------- | --------- |
| p04-t01 | completed | d4ceff20f |
| p04-t02 | completed | 888afba47 |
| p04-t03 | completed | 8adec3778 |
| p04-t04 | completed | c3ef47b71 |
| p04-t05 | completed | b0e543461 |
| p04-t06 | completed | 098e1780b |

### Review escalation and scope revision

Phase review found terminal-evidence credential, outcome, supersession, archive,
and confinement defects. Two automatic fix iterations (`7a8e15fc4`,
`6fbded0f2`) and one operator-authorized exception (`ba65b8258`) resolved every
finding except the open-ended retained-provider-text boundary.

The final acceptance review
(`reviews/archived/p04-review-2026-08-07T021700Z.md`) reproduced nested/double-
escaped serialization, YAML complex-key, and unenumerated standalone-token
bypasses. Both automatic review-fix attempts and the authorized exception are
exhausted.

The operator approved a scope reduction: p04-t04 replaces retained provider
prose with a closed code-only evidence contract. Provider text may guide the
single in-memory correction but is discarded before persistence or loggable
return. This is a planned contract revision, not another regex-based fix loop.

The first scope artifact review
(`reviews/archived/artifact-p04-scope-revision-review-2026-08-07T023400Z.md`)
confirmed the architecture and pre-release v1 decision, then required exact
terminal/review evidence post-images plus the omitted durable visual-review,
package-coverage, adapter-output, captured-log, schema-conformance, and lifecycle
guidance seams. Those findings were incorporated before implementation.

The second scope artifact review
(`reviews/archived/artifact-p04-scope-revision-review-2026-08-07T025000Z.md`)
confirmed those seams, then required independent visual reason cardinality,
exact request/attempt binding, a closed distinct-run supersession transition,
and the request-owning visual-review helper. The second bounded artifact fix
incorporated those rules before implementation.

The final bounded artifact review
(`reviews/archived/artifact-p04-scope-revision-review-2026-08-07T030500Z.md`)
found one precedence contradiction between preserved outcomes and the single
supersession reason. After the 2/2 artifact-fix budget was exhausted, the
operator explicitly authorized the minimal correction: supersession preserves
the original outcome and supersession reason rules override ordinary
outcome-specific reason requirements.

The final fresh scope review
(`reviews/archived/artifact-p04-scope-revision-review-2026-08-07T173000Z.md`)
passed with no findings. p04-t04 is implementation-ready with no further scope
expansion.

### Review Received: p04-t04

**Date:** 2026-08-07
**Review artifact:**
`reviews/archived/p04-t04-review-2026-08-07T185131Z.md`

**Findings:**

- Critical: 1
- Important: 1
- Medium: 0
- Minor: 0

**New tasks added:** p04-t05, p04-t06

- C1 → p04-t05: define and enforce the exact retained run-package inventory
  after filesystem-capable provider boundaries and across archive source,
  staged, and exported trees.
- I1 → p04-t06: inject each row's canary through the exercised core and adapter
  path before asserting complete stdout/stderr non-retention.

The automatic p04 review-fix budget and prior implementation exception were
already exhausted. The operator explicitly authorized one further bounded
exception to implement both findings and re-review only their fix range.

**Next:** Execute p04-t05 and p04-t06, then run a narrow fresh code re-review.

The authorized narrow re-review
(`reviews/archived/p04-t04-review-2026-08-07T200546Z.md`) passed with no
findings. C1 and I1 are resolved, p04 is complete, and execution pauses at the
configured p05 human checkpoint.

### Review ledger reconciliation

The immutable p04 code-review sequence is:

- `p04-review-2026-08-07T003711Z.md` manually reviewed p04 at
  `8adec377800752964941a8fdae02073136fe479b`; its findings were accepted and
  resolved by the first automatic fix range ending at
  `7a8e15fc44cd22f9d9f94c57b10e6f659561d2a8`.
- `p04-review-2026-08-07T010500Z.md` manually re-reviewed p04 at
  `7a8e15fc44cd22f9d9f94c57b10e6f659561d2a8`; its remaining and newly exposed
  findings were resolved by the second automatic fix range ending at
  `6fbded0f2c942100191a6d201775af3698b4d873`.
- `p04-review-2026-08-07T013800Z.md` manually re-reviewed p04 at
  `6fbded0f2c942100191a6d201775af3698b4d873`; its remaining findings were
  resolved by the operator-authorized exception ending at
  `ba65b8258b8e0adce74cd20ba534255dbfc8fccb`.
- `p04-review-2026-08-07T021700Z.md` manually reviewed p04 at
  `ba65b8258b8e0adce74cd20ba534255dbfc8fccb`. The bounded findings were fixed,
  but the retained-provider-text boundary required the approved p04-t04 scope
  revision described above.
- `p04-t04-review-2026-08-07T185131Z.md` manually reviewed p04-t04 at
  `c3ef47b71d640d4289576fad904e20e027e6935f`; its C1 and I1 findings became
  p04-t05 and p04-t06.
- `p04-t04-review-2026-08-07T200546Z.md` manually reviewed the resulting
  p04-t05/p04-t06 fix range at
  `098e1780b86116492073513614f64835aa470030` and passed with no findings. Its
  immutable artifact scope remains `p04-t04`; the plan ledger includes an
  explicit p04-t05/p04-t06 scope alias rather than relabeling the archive.

## Phase 5: Prose-led authoring and release closure

**Status:** completed
**Started:** 2026-08-07
**Completed:** 2026-08-07

| Task    | Status    | Commit    |
| ------- | --------- | --------- |
| p05-t01 | completed | d61a555fa |
| p05-t02 | completed | 5b92361d3 |
| p05-t03 | completed | 3ed90f009 |
| p05-t04 | completed | 836d85014 |

### Review Received: p05

**Date:** 2026-08-07
**Review artifact:** `reviews/archived/p05-review-2026-08-07T210515Z.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 0
- Minor: 0

**New task added:** p05-t04

- I1 → p05-t04: align the shipped core contracts reference and set-plan example
  with `project-recap@2`, while retaining v1 only as replay guidance.

The executable recipe, adapter selection, visual-review prose, versions,
provider views, docs, and release gates passed. The 74 unmanaged Cursor
symlinks are inherited and unchanged, so they are not a p05 defect.

**Next:** Execute p05-t04, then narrowly re-review this guidance fix.

The narrow re-review
(`reviews/archived/p05-review-2026-08-07T211756Z.md`) passed with no findings.
P05 and all 29 implementation tasks are complete. The project is ready for its
final full review.

## Phase 6: Final review fixes

**Status:** completed
**Started:** 2026-08-14
**Completed:** 2026-08-14

| Task    | Status    | Commit        |
| ------- | --------- | ------------- |
| p06-t01 | completed | 634463e0c     |
| p06-t02 | completed | 5ac0ce599     |
| p06-t03 | completed | cc5bb6c3a     |
| p06-t04 | completed | f6ba8c91d     |
| p06-t05 | completed | (this commit) |

### Review Received: final reconciliation

**Date received:** 2026-08-14
**Superseding review artifact:**
`reviews/archived/final-review-2026-08-07T215000Z.md`
**Superseded preliminary artifact:**
`reviews/archived/final-review-2026-08-07T214023Z.md`

**Findings:**

- Critical: 1
- Important: 1
- Medium: 3
- Minor: 3

**New tasks added:** p06-t01 through p06-t05

- C1, M3, m2 → p06-t01: reject credential-bearing and path-divergent S3
  roots at every semantic boundary and remove the dead cause argument.
- I1 → p06-t02: repair the v2 packaged-RC receipt fixture and make its contract
  fail in ordinary CI when it drifts.
- M1 → p06-t03: restore all immutable p04 review events and accurately alias
  the terminal p04-t05/p04-t06 re-review scope.
- M2, m3 → p06-t04: complete both five-scenario CLI matrices and add live
  provider-canary return/failure cases in each family.
- m1 → p06-t05: reconcile docs/completion metadata and the project log while
  preserving final-review-before-closure ordering.

The preliminary zero-finding artifact is retained for provenance but is
superseded and cannot close the lifecycle. The operator approved converting all
three Minor findings into fix work on 2026-08-14.

All five bounded fix tasks are implemented. Publication roots now fail closed
at every semantic boundary, ordinary and real packaged-RC evidence includes the
production auxiliary catalog contract, the p04 review ledger is monotonic and
scope-accurate, and both CLI families exercise complete projected and live
provider-canary paths. Documentation and implementation metadata are complete.

**Next:** Run all completion gates, then perform a fresh full final review.
Project completion remains pending until that review passes.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1: 2026-08-06T23:54:00Z

- Branch: `explainer-improvements`
- Tier: Tier 1 (Cursor native subagents)
- Dispatch policy: managed `high`
- Phases passed: 1; failed: 0; stopped: 0

| Phase | Outcome | Task commits                                                      | Review                                                       | Fix iterations      |
| ----- | ------- | ----------------------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| p03   | passed  | `58a9fd2` through `ba66d54b` plus recoveries `c9a0aee`, `01d3c99` | cycle 3 passed at `ba66d54b697d86de0bade8863587870af75e06da` | 2 review-fix rounds |

- Reviewer continuation used the already-accepted
  `oat-reviewer-claude-opus-5-thinking-high` handle after an interactive
  interruption; reconnaissance was not attempted.
- Outstanding items: two non-blocking Minor polish notes are deferred below;
  27 inherited `E_BROWSER_PROBE` recap-fixture failures remain outside p03.

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

### Artifact Review Received: plan-revision

**Date:** 2026-08-06
**Review artifact:**
`reviews/archived/artifact-plan-revision-review-2026-08-06T180042Z.md`

**Findings:** 0 Critical, 5 Important, 1 Medium, 1 Minor.

**Corrections applied:**

- made the operator revision authoritative throughout discovery;
- aligned lifecycle tasks with existing terminal outcomes;
- bound each new contract/recipe producer to live consumers and compatibility
  floors in the same task;
- restored exact callback/request root-cause reproduction for `sourceIds`;
- replaced every task's prose verification placeholder with runnable commands;
- expanded the p04 boundary to its required publisher/archive seams;
- cleared obsolete quick-start/spec metadata.

**Bounded verification:**

- Artifact:
  `reviews/archived/artifact-plan-revision-review-2026-08-06T181021Z.md`
- Result: passed with 0 Critical, 0 Important, 0 Medium, and 0 Minor findings.
- Scope was restricted to the seven listed corrections; no broad review loop
  was reopened.

**Next:** Resume implementation at p03-t01.

### Phase 2: canonical links and hard validation

- Added immutable author-request v3 canonical link tables while preserving v2
  replay and Markdown/HTML authoring.
- Added a manifest/site-tree internal-reference gate with one shared correction
  budget.
- Initial review found visual-correction revalidation and duplicate generated
  SVG-ID regressions; append-only correction `3f0dfe5` resolved both.
- Passing review:
  `reviews/archived/p02-review-2026-08-06T202708Z.md`.
- The broad e2e suite still has 27 pre-existing `E_BROWSER_PROBE` failures;
  none are caused by p02.

### Phase 3: publication integrity implementation and recovery

- p03-t01 through p03-t03 landed in `58a9fd2`, `cd65ad8`, and `74d3d09`.
- The authorized p03 recovery aligned the stale bundled skill-version
  assertion in append-only commit `c9a0aee`.
- The completed recovery handoff was independently validated before root
  bookkeeping settled the ledger at `used_attempts: 1` with no pending
  attempt.

### Review Received: p03

**Date:** 2026-08-06
**Review artifact:**
`reviews/archived/p03-review-2026-08-06T213553Z.md`
**Reviewed head:** `c9a0aeead5bce79a5e31bd6ce247e80a64ec1800`
**Invocation:** manual
**Review cycle:** 1 of 3

**Findings:**

- Critical: 2
- Important: 2
- Medium: 2
- Minor: 0

**Finding disposition map:**

- C1 → converted to p03-t04 (Moderate): make complete public/protected receipt
  v2 evidence durability-eligible by supplying exact generated-catalog context.
- C2 → converted to p03-t05 (Moderate): reject missing, duplicate,
  foreign-source, wrong-hash, and missing-catalog callback receipts before
  publication state is recorded.
- I1 → converted to p03-t06 (Minor): accept and directly execute packaged
  publish-request v1 replay and v2 production with exact schema/hash binding.
- I2 → converted to p03-t07 (Moderate): retain source identity, rendered path,
  S3 URI, canonical URL, hash, and verification facts in lifecycle summaries.
- M1 → converted to p03-t08 (Moderate): enforce unique one-to-one
  manifest/catalog receipt coverage in the private-wrapper compatibility
  reader.
- M2 → converted to p03-t09 (Minor): align shipped lifecycle and extension
  guidance with v2 emission/consumption and explicit v1 replay.

**New tasks added:** p03-t04, p03-t05, p03-t06, p03-t07, p03-t08, p03-t09

**Design drift / artifact alignment notes:**

- M2 found shipped contract guidance stale relative to the validated executable
  v2 producer/consumer behavior. The implementation is accepted as the source
  of truth because its immutable request/receipt contracts and compatibility
  tests define the live boundary; p03-t09 updates both canonical references
  while retaining explicit v1 replay.

**Resolution:**

- p03-t04 through p03-t09 landed in `c2aa4336`, `b9be685`, `a3c56bb`,
  `38ca2e4`, `2e6519a`, and `df0e904`.
- This exact artifact-bound review event is now `fixes_completed`.
- The focused re-review at `01d3c99` confirmed all six original findings are
  resolved and identified one bookkeeping item plus two Minor follow-ups.

### Review Received: p03 re-review

**Date:** 2026-08-06
**Review artifact:**
`reviews/archived/p03-review-2026-08-06T224958Z.md`
**Reviewed head:** `01d3c99075aa09ea5fb49b801d4deca1d5f3c51e`
**Invocation:** manual
**Review cycle:** 2 of 3

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 2

**Original finding status:**

- C1, C2, I1, I2, M1, and M2 from the first p03 review are resolved in the
  landed p03-t04 through p03-t09 commits.

**Finding disposition map:**

- M1 → resolved directly in lifecycle bookkeeping: marked p03-t04 through
  p03-t09 complete, reconciled p03 and project totals, recorded
  p03-recovery-002, settled its completed pending marker, and advanced the
  first artifact-bound p03 review event to `fixes_completed`. No code task was
  created.
- m1 → converted to p03-t10 (Minor): classify schema-valid but
  non-normalizable publish-receipt v2 roots as `E_PUBLISH`, retain fail-closed
  publication state, and preserve query/fragment policy plus v1 replay.
- m2 → converted to p03-t11 (Minor): explicitly document
  `explainer-kit.publish-summary/v2` evidence and reduced v1 summary replay,
  pinned by a focused guidance assertion.

**New tasks added:** p03-t10, p03-t11

**Accepted non-functional deviation:**

- p03-t08 planned
  `fix(p03-t08): validate private wrapper receipts one to one` but landed as
  `test(p03-t08): enforce private wrapper receipt coverage` in `2e6519a`. The
  commit substantively implements the planned shared-validator fixture change
  and mutation coverage; the subject difference changes no behavior or task
  identity and is accepted.

**Verification evidence:**

- Implementation/recovery: focused/direct p03 suites passed 231/231;
  release/smoke suites passed 31/31; repository `check`, `type-check`, `test`,
  `build`, `lint`, `format`, and diff checks passed.
- Re-review: focused core/connector/durability/contract/rebuildability/adapter
  suites passed 175/175; release/acceptance/wrapper/publish-boundary suites
  passed 31/31.
- The broad skill glob still reports exactly 27 inherited
  `E_BROWSER_PROBE` failures from the legacy trusted-browser recap fixtures.
  They are outside the p03 changed test and enforcement paths and are not p03
  blockers.

**Resolution:** p03-t10 and p03-t11 landed in `4a726147` and `ba66d54b`;
the final review below passed.

### Review Received: p03 final re-review

**Date:** 2026-08-06
**Review artifact:**
`reviews/archived/p03-review-2026-08-06T235124Z.md`
**Reviewed head:** `ba66d54b697d86de0bade8863587870af75e06da`
**Invocation:** manual
**Review cycle:** 3 of 3

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 2

**Resolved prior findings:**

- p03-t10 now classifies schema-valid but non-normalizable v2 publication roots
  as `E_PUBLISH`, records no publication state, and preserves v1/v2 behavior.
- p03-t11 documents immutable publication summary v2 evidence and reduced v1
  replay without implying in-place mutation.

**Deferred Findings:**

- m1 (Minor): the publisher callback observes an `incomplete` mid-publish
  manifest before the final persist. No in-repo consumer reads this intermediate
  state and the final manifest remains correct. Revisit if a mid-run manifest
  consumer is introduced or package-coverage ordering changes.
- m2 (Minor): an uncoded local write failure after successful upload can surface
  as `E_RUN` while the build record retains `E_PUBLISH`. This remains
  fail-closed and low-reachability. Revisit when local write-failure injection
  or publish error-code consistency is expanded.

**Disposition:** p03 passed. Both Minor findings are explicitly deferred as
optional polish; neither blocks the phase.

**Next:** Begin p04-t01.

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact   | Planned / Documented                                           | Actual / Accepted                                                                            | Reason                                                                             | Source of Truth                                     | Follow-up                                             |
| ------------- | ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| p01-t06       | focused re-review | one task commit                                                | one task commit plus one append-only correction                                              | WHATWG URL parsing normalized away empty delimiters                                | committed implementation and passing focused review | none                                                  |
| p02-t02       | phase review      | initial and corrected output revalidate                        | visual-correction branch initially bypassed the gate; unused duplicate SVG IDs were rejected | correction commit revalidates visual output and resolves only referenced fragments | committed implementation and passing focused review | 27 legacy browser-session failures remain outside p02 |
| plan revision | operator decision | structured renderer and golden matrix                          | executable kernel plus prose-led creative layer                                              | original plan overengineered judgment-oriented work                                | revised `design.md` and `plan.md`                   | golden-suite audit tracked separately                 |
| p03 review M2 | shipped guidance  | adapter omits `publicAccess`; wrappers produce only receipt v1 | adapter emits request v2 and wrappers consume complete receipt v2 with v1 replay             | executable immutable contracts and compatibility tests supersede stale prose       | p03 implementation at reviewed head `c9a0aee`       | p03-t09 aligns both canonical references              |
| p03-t08       | plan commit step  | `fix(p03-t08): validate private wrapper receipts one to one`   | `test(p03-t08): enforce private wrapper receipt coverage`                                    | landed commit implements the planned validator reuse and mutation coverage         | commit `2e6519a` and focused p03 re-review          | accepted; no code follow-up                           |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                            | Passed | Failed | Coverage                                           |
| ----- | ---------------------------------------------------- | ------ | ------ | -------------------------------------------------- |
| 1     | adapter/core focused suites; CLI tests; lint; format | passed | 0      | p01-t01–p01-t06 complete; focused re-review passed |
| 2     | declared p02 union; lint; format                     | passed | 0      | 176/176; focused re-review passed                  |
| 3     | focused/direct p03; release/smoke; repository gates  | passed | 0      | 228/228 + 31/31; final re-review passed 172/172    |
| 4     | lifecycle, evidence, archive, and canary gates       | passed | 0      | 6/6 tasks; terminal narrow re-review passed        |
| 5     | recipe, docs, release, and contract-reference gates  | passed | 0      | 4/4 tasks; focused re-review passed                |
| 6     | security, RC, ledger, and CLI canary task gates      | passed | 0      | 5/5 tasks; serial completion gates pending         |

The broad explainer skill glob is separately nonzero for 27 inherited
`E_BROWSER_PROBE` failures in legacy recap fixtures. Focused p03 suites and all
repository gates pass; the inherited broad-glob failures are not counted as
p03 task failures.

## Final Summary (for PR/docs)

**What shipped:**

- A provider-neutral explainer kernel with adaptive set planning, prose-led
  project recaps, validated authoring links, and bounded correction/review.
- Exact-byte public or protected S3 publication receipts, packaged-RC
  acceptance, destination hygiene, and closed code-only terminal evidence.

**Behavioral changes (user-facing):**

- Project and repository explainers derive credential-free destinations,
  preserve immutable v1 replay, and emit complete v2 publication evidence.
- Unsafe publication roots fail before run initialization or process launch;
  flagged and failed outcomes remain inspectable without retaining provider
  prose in terminal or CLI evidence.

**Key files / modules:**

- `.agents/skills/explainer-kit/scripts/run.mjs` — core lifecycle, evidence, and
  CLI projection.
- `.agents/skills/explainer-kit/scripts/lib/s3-roots.mjs` — canonical
  publication-root and artifact-destination boundary.
- `.agents/skills/oat-explainer-kit/scripts/run.mjs` — OAT adapter lifecycle and
  compatibility handoff.
- `tools/release/validate-explainer-acceptance.mjs` — packaged release evidence
  gate.

**Verification performed:**

- Focused core, adapter, schema, connector, wrapper, smoke, acceptance, and
  real packaged-RC integration suites.
- Repository check, type-check, test, build, lint, format, docs-build, and
  release validation gates; the final serial completion run is recorded after
  this bookkeeping commit.

**Design deltas (if any):**

- The approved p04 scope revision replaced open-ended retained-text scrubbing
  with closed local evidence codes. No unresolved p06 design delta remains;
  final acceptance still depends on the fresh full review.

### Review Received: final (second full review)

**Date:** 2026-08-16
**Review artifact:** `reviews/archived/final-review-2026-08-16T232006Z.md`
**Reviewed head:** `07e2c96d70b8130718f8a4203e60583f1cc817a1`

**Findings:**

- Critical: 1
- Important: 2
- Medium: 8
- Minor: 7

**New tasks added:** `p07-t01` through `p07-t16` (16 tasks; all 18 findings
converted, with `m1`/`m2` and `m5`/`m6` paired into single tasks).

**Review cycle:** 3 of 3. The bounded-loop cap was reached and explicitly
overridden by the operator, who directed conversion of these findings into a
fix phase. Recorded here so the override is durable rather than implicit.

**Scope decision — `publish-request/v1` is retained:**

The Critical is a fail-open validation gate, not a compatibility problem. Both
contract documents already scope v1 to replay only
(`extension-contract.md:29`, `lifecycle-contract.md:109`), and no in-repo
producer emits v1 — the adapter emits v2 exclusively
(`resolve-config.mjs:182`). Evidence gathered during this receive: six of nine
benign v1 root shapes pass strict v2 validation unchanged, and the three that
fail (uppercase bucket, underscore bucket, `http://` public root) are invalid
S3 bucket names or plaintext HTTP that should be rejected regardless. A
version-agnostic gate (`p07-t01`) therefore closes the Critical without a
breaking contract removal inside a patch release, and without leaving the
fail-open shape for a future v3 to fall into. Dropping `publish-request/v1` is
captured as a separate repo backlog item for a future minor;
`publish-receipt/v1` reading is retained regardless because
`publish-summary/v1` replay depends on it.

**Deferred-medium resurfacing (final-scope gate):**

Both previously deferred p03 Minor findings were dispositioned by the reviewer
and are now closed:

- `m1` (mid-publish `incomplete` manifest): **accepted** — the transition is
  contractually intended and gated at both publish entry points
  (`publication-policy.mjs:11-14,22-46`), and the catalog projection omits
  `outcome`/`warnings` so bytes cannot diverge. Its only residue is the
  undocumented third-party connector contract, now tracked as `p07-t16`.
- `m2` (`E_RUN` vs `E_PUBLISH`): **resolved, not deferred** — `E_RUN` exists
  nowhere in shipped code (removed by `6fbded0f2`); the sole repo-wide hit is
  inert fixture data. Its only residue is post-upload failure attribution, now
  tracked as `p07-t15`.

No deferred Medium findings remain undecided.

**Minor findings disposition:** all 7 converted. Each is a small, localized
test, code, or documentation change, and the two prior deferrals above resolve
cleanly only if their residues are closed in the same pass.

**Design drift / artifact alignment notes:**

- `M5`: `contracts.md:216-218` promises a retained internal-reference finding
  that the implementation does not produce — the gate throws and
  `executeStage` rethrows a scrubbed `E_QA`. Shipped implementation is
  defensible and is source of truth; `p07-t08` aligns the prose rather than
  building the retained finding.
- `M8`: `implementation.md:886-889` asserts a standing 27-failure carve-out
  that no longer holds — the full glob measured 546 pass, 0 fail at
  `07e2c96d7`. `p07-t11` corrects the stale claim; the historical p03-era
  statements at `:812-815` remain as immutable review narrative.
- `m4`: p06-t02 modified `build-explainer-rc.mjs` and
  `explainer-rc-contract.mjs` outside its declared file boundary. The change is
  necessary and correct, but unrecorded; `p07-t14` adds the Deviations row.

**Next:** Execute fix tasks via the `oat-project-implement` skill, starting at
`p07-t01`.

After the fix tasks are complete:

- Update this same artifact-identified review event to `fixes_completed`
- Re-run `oat-project-review-provide code final` then
  `oat-project-review-receive` to reach `passed`

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
- Handoff: `references/handoff-cyclone-case-study.md`
