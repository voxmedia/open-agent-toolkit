---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-16
oat_current_task_id: p07-t03
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
| p07   | completed | 16    | 16/16     |

**Total:** 50/50 tasks completed

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

| Task / Review | Source Artifact    | Planned / Documented                                                                                  | Actual / Accepted                                                                                                                                | Reason                                                                                                                                                                                      | Source of Truth                                                                                                    | Follow-up                                                                                                |
| ------------- | ------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| p01-t06       | focused re-review  | one task commit                                                                                       | one task commit plus one append-only correction                                                                                                  | WHATWG URL parsing normalized away empty delimiters                                                                                                                                         | committed implementation and passing focused review                                                                | none                                                                                                     |
| p02-t02       | phase review       | initial and corrected output revalidate                                                               | visual-correction branch initially bypassed the gate; unused duplicate SVG IDs were rejected                                                     | correction commit revalidates visual output and resolves only referenced fragments                                                                                                          | committed implementation and passing focused review                                                                | historical: 27 legacy browser-session failures, retired — the glob is green (see Test Results)           |
| plan revision | operator decision  | structured renderer and golden matrix                                                                 | executable kernel plus prose-led creative layer                                                                                                  | original plan overengineered judgment-oriented work                                                                                                                                         | revised `design.md` and `plan.md`                                                                                  | golden-suite audit tracked separately                                                                    |
| p03 review M2 | shipped guidance   | adapter omits `publicAccess`; wrappers produce only receipt v1                                        | adapter emits request v2 and wrappers consume complete receipt v2 with v1 replay                                                                 | executable immutable contracts and compatibility tests supersede stale prose                                                                                                                | p03 implementation at reviewed head `c9a0aee`                                                                      | p03-t09 aligns both canonical references                                                                 |
| p03-t08       | plan commit step   | `fix(p03-t08): validate private wrapper receipts one to one`                                          | `test(p03-t08): enforce private wrapper receipt coverage`                                                                                        | landed commit implements the planned validator reuse and mutation coverage                                                                                                                  | commit `2e6519a` and focused p03 re-review                                                                         | accepted; no code follow-up                                                                              |
| p06-t02       | final review m4    | two RC test files plus "production catalog helpers only if required to avoid fixture drift"           | commit `5ac0ce599` also changed `build-explainer-rc.mjs`, `explainer-rc-contract.mjs`, and `run-explainer-rc.test.mjs` recipe-identity semantics | `project-recap` now ships v1 and v2, so entries must be keyed by `(id, version)` rather than id alone; this is recipe-identity semantics, not a catalog helper                              | commit `5ac0ce599` and the passing RC suites                                                                       | accepted scope extension; the latent builder/contract sort divergence it left behind is fixed in p07-t13 |
| p07-t03 (fix) | round-1 review     | declared `s3-roots.mjs`, `catalog.mjs`, `s3-static.mjs`, `s3-static.test.mjs`, and the catalog schema | commit `6f20182cd` also changed `run.mjs`, `run.integration.test.mjs`, and `tools/smoke/.../publish-boundary.test.mjs`                           | three call sites must build a byte-identical catalog, so the policy option had to be threaded through all of them; verified non-breaking because `publish-receipt/v2` is new on this branch | commit `6f20182cd` and the passing skill and smoke suites                                                          | round-1 review accepted the expansion; `final-fix-003` completed the sweep and made the option mandatory |
| p07-t07       | declared files     | declared `run.mjs` only                                                                               | commit `0120c3418` also changed `run.integration.test.mjs`                                                                                       | two existing assertions pinned the `browser-review` mis-attribution the task fixes, so they are its direct verification                                                                     | commit `0120c3418`                                                                                                 | accepted; mechanically derived from the fix                                                              |
| p07-t05       | plan Step 2        | glob `tools/release/*.test.mjs` into a `test:release` script                                          | named-file `test:release` listing four hermetic suites                                                                                           | `validate-explainer-visuals.test.mjs` launches Playwright's `chrome-headless-shell` and CI installs no browsers; 7 of its 12 tests fail without it, so a glob would break CI                | `plan.md` p06-t02 correction block and the passing CI gate                                                         | the excluded suite remains covered by `pnpm release:validate`                                            |
| p07-t03       | operator direction | enforce that the public root path equals the S3 key prefix                                            | relational rule removed entirely; catalog carries `publicVerification` policy and divergence is a non-blocking warning                           | the S3-key-to-URL mapping is underdetermined by the two strings and lives in CDN config; a CloudFront Origin Path deployment legitimately maps a prefix to the distribution root            | operator direction after cross-model advisory; commits `32087f0cc` (superseded rule) and `6f20182cd` (replacement) | `BL-260817-verify-protected-mode-public` tracks authenticated end-to-end verification                    |

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

The broad explainer skill glob is green. The final reviewer measured
`node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs`
at `07e2c96d7` as **546 tests, 546 pass, 0 fail, 0 skipped**, with the three
Chromium golden benchmarks neither env-gated nor failing. The same glob measures
**573 tests, 573 pass, 0 fail, 0 skipped** after the p07 and `final-fix-003`
additions. That figure is the narrow glob
(`node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs`);
the broader `pnpm test:skills` glob (`.agents/skills/*/tests/*.test.mjs`, which
CI runs) measures **577 tests, 577 pass, 0 fail, 0 skipped**. The two figures
differ because they are different globs, not because either drifted. The earlier
carve-out for 27 inherited `E_BROWSER_PROBE` failures in legacy recap fixtures
is historical and no longer applies; it is retained only in the p03-era
narrative above. From p07-t05 onward this glob runs as part of `pnpm test`, so
a regression fails an ordinary repository gate rather than needing a manual run.

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

### Orchestration Run 1 — Phase p07 (stopped: direction-required)

**Date:** 2026-08-16
**Request ID:** `p07-impl-001`
**Tier:** 1 (subagents) · **Dispatch target:** `claude/opus`
**Dispatch stamp:** `Dispatch: scope=p07 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=opus`
**Task class:** `consequential` (phase scope analysis — security-boundary work dominates)
**Selection reason:** `native-catalog` · **Candidates considered:** `[opus]`
**Phase base:** `0dc360b684a370c58cbfff3ec7dd9d304606667e` · **Head:** `143e15a86`
**Commit range:** `279fc4dcc..143e15a86`
**Phases passed:** 0 · **failed:** 0 · **stopped:** 1 (p07)

**Task outcomes (4 of 16):**

| Task                | Status                    | Commit      | Verification                               |
| ------------------- | ------------------------- | ----------- | ------------------------------------------ |
| `p07-t01`           | complete                  | `279fc4dcc` | pass — contracts 42/42; skill glob 549/549 |
| `p07-t02`           | complete                  | `e3a503e24` | pass — contracts 43/43; skill glob 550/550 |
| `p07-t03`           | committed, then defective | `32087f0cc` | task-level pass; fails phase-level smoke   |
| `p07-t04`           | complete                  | `143e15a86` | pass — s3-static 23/23; skill glob 555/555 |
| `p07-t05`…`p07-t16` | not started               | —           | —                                          |

Every commit stayed inside its declared file boundary (root-verified). No
`SKILL.md` changed, so no skill version bump was required. No package versions
were touched — the five lockstep packages remain at `0.2.29` from p05.
`packages/cli/assets/` is gitignored (`.gitignore:21`) and regenerated by
`packages/cli/scripts/bundle-assets.sh`, so the bundled mirror is not
hand-editable and was correctly left alone.

**Root-verified security outcomes** (re-run independently, not taken on report):

- Critical closed: a credential-bearing `publish-request/v1` block inside a
  run-request now fails with `$.durability.publish [publish-roots]`. The
  reproduction that previously returned `v1 valid=true` now returns
  `v1 valid=false`.
- `p07-t02`: NUL and SOH are rejected in both `s3Uri` and `publicBaseUrl`.
- `p07-t04`: `https://127.0.0.1:8443/p` and `https://169.254.169.254/p` are
  rejected as public roots.

**Stop condition — `p07-t03` root correspondence:**

`p07-t03` implemented the plan's prescribed rule: strict equality between the
S3 key prefix and the public root path. That passed its own declared
verification but regressed `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
from 5/5 to 3/5 (root-verified at `143e15a86`).

The counterexample is this repository's own smoke fixture at
`tools/smoke/explainer-kit/fixtures/private-wrapper.mjs:14,17`:

```text
s3Uri:         s3://tkstang-open-agent-toolkit/explainers   -> key prefix "explainers"
publicBaseUrl: https://dy4vzrzaexuy5.cloudfront.net         -> path ""
```

That is a legitimate CloudFront **Origin Path** deployment, in which a bucket
prefix is mapped to the distribution root. The same public root is named as the
confirmed production value in
`.agents/skills/oat-explainer-kit/references/migration.md`. It directly refutes
the review finding M2's premise that "the path suffix corresponds in every
legitimate example" — the premise from which the plan's rule was derived.

Isolation evidence (three independent runs by the implementer, failure state
re-verified by the root): base `s3-roots.mjs` → 5/5 pass; committed `p07-t03`
→ 2 fail; `p07-t02` + `p07-t04` present with only the correspondence check
removed → 5/5 pass. The regression is exactly and only the `p07-t03` rule.

`oat_phase_recovery_policy.default_attempt_limit` is `0` and p07 has no
override, so automatic post-commit recovery is disabled. Independently, the
correct rule is a public-behavior and security-semantics decision rather than a
mechanical correction. Both conditions require stopping for direction.

### Recovery Event p07-rec-001

- Phase/task: p07 / `p07-t03`
- Original request: `p07-impl-001`
- Original commit: `32087f0cc`
- Defect class: test
- Discovered by: `node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
- Disposition: direction-required
- Authorization: phase-standing
- Attempt: 0/0
- Dispatch target: `opus`
- Recovery commit: -
- Verification: wrapper smoke 2/5 fail at `143e15a86`; 5/5 with the `p07-t03` rule removed
- Reason: `phase_recovery_limit=0` forbids a new reservation; no
  `pending_attempt` exists; the correction requires an operator decision on
  correspondence semantics rather than a mechanical fix. No reservation, edit,
  or recovery commit was made; `used_attempts` unchanged; `pending_attempt`
  remains `null`.

**Carried-forward findings for `p07-t05` (investigated, deliberately not committed):**

- CI installs no Playwright browsers, but the skill glob is CI-safe: 559/559
  with `PLAYWRIGHT_BROWSERS_PATH` pointed at an empty directory, because the
  golden benchmarks degrade gracefully.
- `tools/release/*.test.mjs` must **not** be globbed wholesale.
  `validate-explainer-visuals.test.mjs` is 5/12 without Playwright's
  `chrome-headless-shell` — pre-existing and environmental. The review's "30
  release tests" are exactly the three hermetic files; a named-file
  `test:release` works where a glob would break CI.
- Turbo caches past `.agents/skills` changes: `pnpm build` reported `FULL TURBO`
  and left `packages/cli/assets/` stale, which produced a spurious smoke failure
  until `pnpm --filter @open-agent-toolkit/cli run build` was forced. This is a
  latent trap for any gate that assumes bundled assets are fresh.

**Outstanding concerns raised by the implementer:**

- C1 control range (`0x80`–`0x9f`) is not screened. The plan prescribed exactly
  `< 0x20`, `0x7f`, and `\`; finding M1's title says "C0/C1", so CSI (`0x9b`)
  remains accepted. Flagged rather than widened unilaterally.
- The address policy is literal-only: `https://vault.internal/p` is still
  accepted, because name resolution would be TOCTOU-prone. Documented in code.
- New opt-in environment variable `EXPLAINER_KIT_ALLOW_PRIVATE_PUBLIC_ROOT`
  (following the existing `EXPLAINER_KIT_HEADLESS_PROBE` convention) is
  undocumented in `apps/oat-docs/`.
- `defaultHttpGet` is now exported from `s3-static.mjs` with an injectable
  `fetchImpl`, solely to make the `redirect: 'error'` policy assertable.

### Operator Direction: `p07-t03` correspondence semantics (resolved)

**Date:** 2026-08-16
**Disposition:** authorize changed scope (exhaustion outcome 2). `p07-t03` is
respecified; `32087f0cc` remains immutable and is superseded by a new commit.

**Decision:** remove the relational rule entirely; do not replace it with
suffix-containment. Surface the surviving uncertainty at the catalog boundary
instead, and keep divergence detection only as a non-blocking suppressible
warning.

**Rationale (written so a later reader does not read this as convenience):**

Review finding M2 identified a genuine gap but prescribed an invalid proxy
control. The mapping from an S3 key to a public URL is **underdetermined by the
two strings** — it lives in CDN configuration the tool cannot read. A
committed, production-backed counterexample disproves the claimed invariant:
the CloudFront Origin Path fixture maps bucket prefix `explainers` to the
distribution root, so the paths legitimately do not correspond. Equality caused
a false rejection of that real deployment. Suffix-containment is both
incomplete and sometimes vacuous — an empty public path is a suffix of
everything, so it passes the very case it was meant to accommodate, while
path-rewriting behaviors still produce false rejections.

`publish-receipt/v2` already separates `objectVerification` (authenticated S3
hash — proves the uploaded object) from `publicVerification` (closed `oneOf`
of `verified` or `skipped-protected` — proves, or explicitly declines to prove,
reachability). The receipt therefore never overstated. The generated catalog
did: its entries carry `url` with no verification signal at all, and the
catalog is what advertises URLs to consumers. The corrective commit removes the
unsound invariant and makes the remaining uncertainty visible at that
consumer-facing boundary.

Accepted cost: the revert gives up a typo-catching heuristic. It is retained as
a clearly labeled suppressible warning rather than a security gate.

**Cross-model advisory (Codex, high confidence, `phone-a-friend`):** concurred
independently and contributed two corrections now folded into the respec.
First, the catalog is serialized and uploaded as a hashed artifact
(`s3-static.mjs:113,125,139`) **before** any verification runs (`:256`), so it
must carry verification _policy/state_, never an outcome — root-verified
against the source. Second, the framing is "underdetermined from the two
strings," not "arbitrary": the mapping is knowable from CDN configuration, just
not from these two inputs. It also flagged receipt/catalog state drift (derive
both from one internal result and assert correspondence) and identified the
genuinely sound long-term control — an authenticated end-to-end GET through the
advertised URL using deployment-appropriate signing, plus the existing body-hash
comparison — with the caveat that such credentials must be scoped and host-bound
so a misconfigured URL cannot exfiltrate signing material. That control needs
new configuration surface and is filed as repo backlog rather than p07 scope.

**Next:** resume p07 from the respecified `p07-t03` through `p07-t16`.

### Phase p07 Outcome: PASSED at `bcf479807`

**Date:** 2026-08-17
**Tasks:** 16 of 16 complete · **Fix rounds:** 1 of 2 · **Review rounds:** 2

| Round | Artifact                                   | Result                       |
| ----- | ------------------------------------------ | ---------------------------- |
| 1     | `reviews/p07-review-2026-08-17T053431Z.md` | 1 C, 2 I, 6 M, 8 m — blocked |
| fix   | `159c8901c`, `bcf479807` (`p07-fix-001`)   | 3 blocking findings resolved |
| 2     | `reviews/p07-review-2026-08-17T061620Z.md` | 0 C, 0 I, 1 M, 4 m — passed  |

All eight gates independently re-run by the root at `bcf479807`: `check`,
`type-check`, `test`, `build`, `lint`, `format`, `build:docs`,
`release:validate`. Skill tests 566 → 569.

**What round 1 found, and why it matters beyond the individual bugs.** The
three blocking findings were one pattern, not three defects. `p07-t03` added a
`publicAccess` option to `catalogFromManifest`; it was threaded through the
call sites inside the task's declared file boundary and missed the ones
outside. The reviewer's structural observation: the four files carrying the gap
— `durability.mjs`, `durability.test.mjs`, `private-wrapper.mjs`,
`wrapper-compatibility.test.mjs` — are exactly the four absent from
`6f20182cd`'s seven-file diff. Consequence: because the omitted option
defaulted to the permissive branch, a `protected` run published a catalog
marked `skipped-by-policy` and the verifier rebuilt it as `required`, so
protected-mode publication could never reach `built-durable` — a total
functional regression in the mode the handoff exists to serve. A third finding
showed the same shape in a different dimension: `contracts.mjs:487-489` still
pinned the receipt branch to an exact version string, fourteen lines below the
`p07-t01` comment condemning exactly that construct, leaving a
credential-bearing `publish-receipt/v1` unvalidated.

Every one of these was invisible to all eight gates.

**Why the tests did not catch it.** Both concealing fixtures built their
expected value with the same omission as the code under test:
`durability.test.mjs:630` and `wrapper-compatibility.test.mjs:354` each receive
`publicAccess`, use it for neighbouring fields, and drop it for the catalog.
Verifier and fixture agreed with each other and both disagreed with the real
producer. This is the third distinct vacuous-fixture defect in this project
(the prior final review's M2 was a vacuous canary row; `p07-t12` exists to
de-vacuum those rows).

**How the fix round addressed the class rather than the instances.**
`catalogFromManifest` and `validateInitiativeCatalog` now _require_ an explicit
`{ publicAccess }`; omission throws. An explicit `{ publicAccess: undefined }`
is permitted and reads as `public`, which is correct for v1 records that carry
no such field. Round 2 assessed this design specifically and judged it sound:
the distinction is drawn against the call site's **syntax**
(`'publicAccess' in options`), which cannot be satisfied by accident of data
flow, so it targets exactly the defect class rather than renaming the default.
No new failure mode on v1 paths — v1 records never reach either function
(`durability.mjs:380` is v2-gated, `run.mjs:2876-2877` early-returns) and on v2
branches `publicAccess` is schema-required with `enum: ["public","protected"]`.
30 call sites verified threaded, with two deliberate unthreaded calls in the
guard test.

**Evidence standard applied to the fixture claims.** Given the vacuous-fixture
history, neither the root nor round 2 accepted the author's red-then-green
account. Round 2 mutation-tested all three fixes in a disposable worktree; each
reintroduced defect turns its fixture red (durability 13/15, wrapper 4/5,
contracts 44/45), corroborating the reported figures. The fix round also added
`records durability from a receipt the real connector produced, in both access
modes`, which drives the shipped `publishS3Static` through the real
`incomplete`/`publish: running` transition into the real `recordDurability`,
faking only the `aws` process boundary.

**Two root premises corrected by round 2**, recorded because the corrections
were against instructions the root supplied: the guard test does **not** skip
the explicit-`undefined` case — it skips it inside the throw loop, correctly,
then asserts it separately at `contracts.test.mjs:786-790` (root verified); and
there are **two** deliberate unthreaded calls (`:767` and `:773`), not one.
Round 2 also refuted a worker claim rather than passing it through: marker
direction is not single-point-anchored, being independently pinned at
`s3-static.test.mjs:143-145`, `:196-211`, and `publish-boundary.test.mjs:158`.

**Non-blocking findings carried to final review.** Round 1's 6 Medium and 8
Minor and round 2's 1 Medium and 4 Minor are recorded without blocking, per the
phase-gate contract. Known items include: `validateInitiativeCatalog` is still
not invoked from `durability.mjs`; the strict guard converts a forgotten
argument into a hard error but leaves an expression that evaluates to
`undefined` silently permissive (no site exposed today); a pre-existing
tautology in the RC release-lane fixture; and the two new vacuous assertions
round 1 identified at `e2e-recap.test.mjs:594-599` and `catalog.mjs:156-166`.

**Still open from the source review, unchanged by p07:** the unscreened C1
control range (`0x80`–`0x9f`, including CSI `0x9b`); the literal-only address
policy (`https://vault.internal/p` still accepted); and the undocumented
`EXPLAINER_KIT_ALLOW_PRIVATE_PUBLIC_ROOT` and
`EXPLAINER_KIT_SUPPRESS_ROOT_DIVERGENCE_WARNING` environment variables.

**Next:** all implementation phases are complete. Run
`oat-project-review-provide code final` to move the `final` review event from
`fixes_added` to `passed`.

### Final Review Round 2 Received and Resolved (`final-fix-001`)

**Date:** 2026-08-17
**Review artifact:** `reviews/final-review-2026-08-17T064111Z.md` (0 Critical,
2 Important, 9 Medium, 7 Minor; 16 of the 18 prior findings fully resolved,
2 partial)

Both Important findings were project-scope release-hygiene issues neither
task-scoped phase review had vantage on, and both are now resolved:

- **Catalog wire-shape versioning** (`8963b19a1`): `initiative-catalog` bumped
  to `v2` after operator direction, because p07 added `publicVerification` to a
  shape already published at `0.2.30` under `v1`. The fix's v1-replay
  determination — no read-acceptance added, because the path is unreachable —
  is evidenced four ways in the fix report: all three catalog-rebuild sites are
  v2-gated, `origin/main` emits `publish-receipt/v1` only (`publish-receipt/v2`
  does not exist there), a cross-check against main's actual lib reproduced the
  v1 hash byte-exactly, and 0.2.30 could never verify the catalog entry in its
  own receipt (a pre-existing hole, out of scope). The new version-binding test
  was proven non-vacuous by breaking the source both ways (45/1 and 44/2).
- **Version drift vs published `main`** (`8bda0b22b`): `origin/main` (0.2.30)
  merged; all five public packages lockstep-bumped to `0.2.31`. Seven conflicts
  resolved. The first resolution of the `autonomy-contract.md` prompt-site
  table was **wrong** — the table lists files twice, the union script matched
  first occurrences, and the union heuristic itself was invalid because the
  gate-inventory test rejects stale mappings. Corrected in `f70c7e641` using
  `packages/cli/src/validation/autonomy-gate-inventory.test.ts` as the oracle
  (now 4/4). Recorded as a caution against hand-merging that table without
  running its validator.

Also in this range, outside the review's findings:

- `c6a01adbd` publishes the CLI asset bundle by staged rename instead of an
  in-place `rm -rf` + repopulate, narrowing a pre-existing smoke-suite race in
  `package-coverage-consumers.test.mjs` (measured 3/3 failing runs → 1/3). The
  completing fix (reader-side `OAT_ASSETS_DIR` override) is parked as backlog
  `BL-260817-let-resolveassetsroot-honor` because it adds a runtime knob to
  production CLI surface.

**Not addressed, by scope:** the review's 9 Medium and 7 Minor findings,
including those marked "should now be fixed". They await disposition at the
next receive.

**Next:** dispatch a narrowed final re-review over `68196ba71..HEAD` to verify
both Important fixes and reach `passed`.

### Final Review Round 3 Received; `final-fix-002` Applied

**Date:** 2026-08-17
**Review artifact:** `reviews/final-review-2026-08-17T092205Z.md` (0 Critical,
1 Important, 10 Medium, 8 Minor over `68196ba71..8eb45413e`)

Round 3 verdicts: catalog-versioning Important **closed** (the reviewer
independently re-ran both mutations against scratch copies — 45/1 and 44/2 —
proving the version-binding test non-vacuous); the v1-replay determination
**sound** (both evidence legs re-verified directly, plus two checks the fix
never claimed: no code path parses a catalog it did not build, and nothing
pins the old version anywhere); the merge **clean** (20-file two-sided surface
re-derived independently; 18 files exact numstat symmetry, 2 read at line
level; `main` touched zero files under the p07 surface).

The remaining Important: the version-drift fix was only half done. Both this
branch and `origin/main` independently bumped `oat-project-complete`
`1.6.0 → 1.6.1`, so the merged content differed from main's under the same
declared version. CI's `validate-skill-version-bumps --base-ref origin/main`
(`ci.yml:43`) fails on exactly this. The systemic cause the reviewer proved:
**no root `package.json` script invokes that command, so the local eight-gate
list is not a superset of CI's steps** — "all eight gates green" has never
implied CI green. That gap explains how the collision survived two rounds.

**Root-inline fix deviation (`final-fix-002`, commit `5e6fcc83b`):** the root
applied this fix inline rather than dispatching a subagent. Reason: a
three-line mechanical change (one frontmatter version string, two pinned test
literals) whose correctness oracle is the CI gate command itself; dispatch
overhead exceeded the work. Root model: opus-class session. Verified by
running the exact CI gate (now "OK: validated 3 changed canonical skill
version bump checks") and both pinned test files (165/165) before commit.

**Carried forward, open at this head: 18** — the prior 9 Medium + 7 Minor
(all re-checked by round 3, all still open) plus two new from round 3:
`release:check-versions` wired to no workflow (Medium), and `bundle-assets.sh`
staging siblings not gitignored plus a cleanup-trap edge in the rename window
(Minor). All await disposition at receive.

**Next:** narrowed final re-review over `8eb45413e..HEAD` (round 4) to confirm
`final-fix-002` and reach `passed`.

### Final Round 4 Clean; Operator Disposition of the 18 Open Findings

**Date:** 2026-08-17
**Round 4 artifact:** `reviews/final-review-2026-08-17T094116Z.md` — 0
Critical, 0 Important, 0 Medium, 0 Minor over `8eb45413e..7440118a3`;
`final-fix-002` verified closed by independent reproduction of the CI gate.

**Operator decision (final-scope disposition gate):** recommended split.

**Convert to fix batch `final-fix-003` (16 items):**

- Code/tests: `$id`-form contract-kind bypass of the version-agnostic root
  gate plus the receipt-verification exact-version pins (`contracts.mjs:473,
488,1112,1180`); C1 control-range screening (`s3-roots.mjs`); catalog-policy
  guard tested and invoked from `durability.mjs`; vacuous `p07-t06`
  unjustified-expansion assertion; `p07-t15` dead re-record code and false
  comment; `p07-t13` strict-prefix test and comparator duplication;
  case-study identifiers scrubbed from core; staging siblings gitignored and
  the cleanup-trap window closed; the RC lane's tautological catalog assertion
  made real (its CI-browser half deferred, below).
- Docs/bookkeeping: destination-contract updated (remove the required
  correspondence rule the operator deleted; document the catalog shape, the
  address policy, and redirect refusal); the two environment variables
  documented; `implementation.md` auditability and contradictory-count
  corrections.
- CI/process quick items: wire `release:check-versions` into a workflow; add
  the CI skill-version-bump gate to `AGENTS.md` Definition of Done and a root
  script so local gates are a superset of CI.

**Explicitly deferred with rationale (2 items):**

- RC end-to-end test in CI (`BL-260817-run-the-rc-explainer-end`): requires a
  CI browser-provisioning decision; the code-side tautology is fixed in the
  batch, so the remaining risk is coverage breadth, not correctness.
- System-Chromium merge-gate policy (`BL-260817-decide-and-pin-the-system`):
  a CI environment policy call; the benchmarks degrade gracefully without
  browsers, so the exposure is an unpinned implicit dependency, not a red
  gate.

**Review-cycle note:** the final scope is past the three-cycle governance cap;
every round since the cap has run under explicit standing operator direction,
recorded at each step.

**Next:** execute `final-fix-003`, re-verify all gates with explicit exit
codes, then one narrowed review round to move `final` to `passed`.

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
- Handoff: `references/handoff-cyclone-case-study.md`
