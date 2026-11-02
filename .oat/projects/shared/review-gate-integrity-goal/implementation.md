---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-02
oat_current_task_id: p11
oat_generated: false
oat_template: false
---

# Implementation: review-gate-integrity-goal

**Started:** 2026-11-01
**Last Updated:** 2026-11-02

> This journal records execution of the Project Brief in `plan.md` and is used
> to resume interrupted sessions.
>
> Conventions:
>
> - Progress counts phase-units: each `## Phase pNN:` in `plan.md` is one unit,
>   accepted only by the exact line `**Status:** completed` in its section here.
>   A provisional phase never counts as complete.
> - `oat_current_task_id` points at the **next unit to do**: a phase ID (`p02`)
>   or an open execution record (`p02-t03`). Set it to `null` when every phase
>   is accepted.
> - Marker lines are exact, one per line, directly under the phase heading:
>   `**Status:** pending | in_progress | completed | failed | extracted`,
>   `**Base:** <full SHA>`, `**Head:** <full SHA>`, and
>   `**Executor:** root | phase-implementer:<id> | worker:<id> | inline:<exception-ref> | reconciled`.
>   `**Status:** extracted` always pairs with `**Extracted to:** <slug>` naming
>   the linked project; without it the phase reads as `pending`.
>   Phase ownership ends at the next heading, so a task record's status is never
>   read as its phase's status.
> - `### Task pNN-tNN:` blocks are execution records, opened when work starts
>   and closed at commit with the SHA or a terminal status
>   (`completed | failed | cancelled | no-change`). They never change phase totals.
> - Reviews are **not** units. Track review status in `plan.md` under `## Reviews`.

## Progress Overview

| Phase | Status    | Units | Accepted |
| ----- | --------- | ----- | -------- |
| p01   | completed | 1     | 1/1      |
| p02   | completed | 1     | 1/1      |
| p10   | completed | 1     | 1/1      |
| p11   | pending   | 1     | 0/1      |
| p07   | pending   | 1     | 0/1      |
| p08   | pending   | 1     | 0/1      |
| p09   | pending   | 1     | 0/1      |

**Total:** 3/7 phases accepted

---

## Phase p01: Verdict parser finding identification

**Status:** completed
**Base:** 56f55a3378d6e35dc3e67dc1437f9ca864477728
**Head:** ded0985d59ee8039415ad163c750cb9abe2f2c08
**Executor:** phase-implementer:rgi-p01-impl-20261101-01

Phase verification after the p01-t02 late fix: pass. Focused verdict tests 73/73, gate tests 461/461, isolated-HOME contract tests 1089/1089, CLI lint and type-check, `pnpm check`, `pnpm build`, root lint, and root format all exited 0. The p01-t01 branch-build probe remains recorded below.

Worktree: the project branch checkout (`goal/review-gate-integrity`). Committing owner: the phase implementer. Parallelism assessment: rung 3, one phase implementer. Rung 1 does not apply, because no parallel groups are declared. Rung 2 does not apply, because the parser grammar, its tests and fixtures, and the reviewer contract and hint are one coupled surface, with no two slices that pass the independence test. Rung 4 does not apply, because the phase changes an assurance-bearing parser contract. The base is the merge of `origin/main` `1299755e4` (wave 1, lockstep 0.3.39), reconciled before this phase started.

### Task p01-t01: Identify verdict findings with the captured narrow grammar

**Status:** completed
**Executor:** phase-implementer:rgi-p01-impl-20261101-01
**Handle:** direct:rgi-p01-impl-20261101-01:p01-t01
**Intent:** Parse captured explicit bold finding titles and their closed-label column-zero details as one finding, preserve list-item findings and all-source disagreement refusal, emit per-finding records, and align the reviewer contract and provider projections.
**Files:** `packages/cli/src/commands/gate/review-verdict.ts`, `packages/cli/src/commands/gate/review-verdict.test.ts`, `packages/cli/src/commands/gate/__fixtures__/issue-339-review-shape.md`, `packages/cli/src/commands/gate/__fixtures__/backlog-wave-5-exit-gate-r1-return.md`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts`, `.agents/agents/oat-reviewer.md`, and its generated Cursor and Codex reviewer views.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts`
**Commit:** 82df5ab2e933918c8195a124c40a55b63071945e

Verification: focused verdict suite 64/64 passed; CLI lint and type-check passed; isolated-HOME agent/skill contract suites 1089/1089 passed; scoped CLI build passed. `oat sync --scope project` regenerated and then confirmed all reviewer views current; `.oat/sync/manifest.json` had no generated delta.

Negative controls:

- With explicit-title recognition and detail ownership neutralized to the legacy list tally, the #339 body test failed with 6 Medium / 2 Low instead of 2 / 1 (exit 1); restoring the guards returned the suite to exit 0.
- With exact bold-label closure broadened so `**Issue: a genuinely separate finding**` was consumed as a detail, the title-precedence test failed with 1 Medium instead of 2 (exit 1); restoring exact matching returned the suite to exit 0.

Captured-output controls: the wave-5 returned-message fixture's pre-change expected outcome is a structured `findings_unrecognizable` refusal because it is not the separately parsed review artifact and has no canonical Findings sections or count line. The branch build parsed `.oat/projects/shared/review-gate-integrity-goal/reviews/archived/artifact-plan-review-2026-11-01T214129Z.md` as accepted with counts 0/0/0/0, zero finding records, and `blocking: false`.

### Review Received: p01

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p01-review-2026-11-01T220753Z.md

**Findings:** Critical 0 · High 0 · Medium 4 · Low 4

Reviewer request `rgi-p01-rev-20261101-01` (`oat-reviewer-claude-opus-5-5-high`); reviewed range `56f55a3378d6e35dc3e67dc1437f9ca864477728..ffa8f869881fea4fbf51b7e31105b4a1f033ec63`; reconnaissance not attempted. The phase threshold passes (no Critical or High), but M1 and M4 contradict p01's own Exit evidence and M2 and M3 undermine the records p02 consumes, so they are fixed before acceptance.

- M1 (Medium): detail ownership survives blank lines and repeated labels, so a separate plain-label finding is absorbed instead of refused as ambiguous → fix task p01-t02; R1 and Outcome 3 require an ambiguity refusal.
- M2 (Medium): explicit and generated finding IDs can collide → fix task p01-t02; the Design matches the verifier's coverage check by finding ID.
- M3 (Medium): finding records carry no completeness signal against `counts` → fix task p01-t02; p02's "every finding of the event is covered" check reads these records.
- M4 (Medium): no test parses the captured wave-5 title-and-label block → fix task p01-t02; Exit evidence requires the real-output fixture to evidence the title marker and its labels.
- L1 (Low): contract and hint do not say the separator must be an em dash → fix task p01-t02 (cheap; each miss costs a rerun).
- L2 (Low): `- **L1:** text` items give records titled `L1:` → approved deferral to p08 (see Deferred Findings); p08 owns the stable finding key.
- L3 (Low): the gate JSON envelope drops the structured refusal code → approved deferral (see Deferred Findings); no consumer yet (Feature Planning Triage).
- L4 (Low): a top-level list item starting with a closed label is now refused, unmentioned in the contract → fix task p01-t02 (contract sentence and pinning test).

**Outcome:** fixes queued: p01-t02

### Task p01-t02: Address p01 review findings

**Status:** completed
**Executor:** phase-implementer:rgi-p01-impl-20261101-01
**Handle:** direct:rgi-p01-fix-20261101-01:p01-t02
**Source review:** `reviews/archived/p01-review-2026-11-01T220753Z.md` (M1, M2, M3, M4, L1, L4)
**Intent:** Refuse ambiguous detail ownership and duplicate finding IDs, expose record completeness, pin the captured wave-5 title block, and clarify the exact separator and closed-label list-item contracts.
**Files:** `packages/cli/src/commands/gate/review-verdict.ts`, `packages/cli/src/commands/gate/review-verdict.test.ts`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `.agents/agents/oat-reviewer.md`, and regenerated provider views.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts`
**Commit:** `bd88679646b232cc544c1672ca1abaa85dc0a27a`
**Negative controls:**

- M1 second-run guard neutralized: `refuses a second detail run under one explicit title` resolved instead of refusing and failed as expected (exit 1); restored test passed.
- M1 repeated-label guard neutralized: `refuses a repeated closed label within one owned detail run` resolved instead of refusing and failed as expected (exit 1); restored test passed.
- M2 duplicate-ID guard neutralized: `refuses duplicate explicit finding IDs across the artifact` resolved instead of refusing and failed as expected (exit 1); restored test passed.
- M2 generated-ID collision skip neutralized: `skips explicit IDs when generating list-finding IDs` failed with `finding_id_duplicate` (exit 1); restored test passed with `H2` and `H3`.
- M3 completeness calculation neutralized to always true: the count-line-only and partial-section tests both failed their `findingsComplete: false` assertions (exit 1); restored tests passed.
- M4 explicit-title recognition neutralized: the verbatim wave-5 H1 test failed with `finding_detail_orphaned` (exit 1); restored test passed with one High, the exact title, and the exact location.
- L1 exact-em-dash guard widened to accept a hyphen: the hyphen-separator refusal test resolved instead of refusing and failed as expected (exit 1); restored test passed.
- L4 closed-label classification neutralized: the top-level `Fix:` test resolved instead of refusing and failed as expected (exit 1); restored test passed.

**Verification:**

- Focused verdict suite: 73 tests passed, exit 0.
- Gate suites: 461 tests passed across 9 files, exit 0.
- CLI lint and type-check: exit 0.
- Isolated-HOME contract suites: 1,089 tests passed across 26 files, exit 0.
- `pnpm check`, `pnpm build`, direct CLI build, root lint, and root format: exit 0.
- `oat sync --scope project`: exit 0; 65 tracked reviewer projections regenerated and the sync manifest remained unchanged.

### Review Received: p01 (round 2)

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p01-review-2026-11-01T222248Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 2

Reviewer request `rgi-p01-rev-20261101-02` (`oat-reviewer-claude-opus-5-5-high`); reviewed range `56f55a3378d6e35dc3e67dc1437f9ca864477728..ded0985d59ee8039415ad163c750cb9abe2f2c08`; reconnaissance not attempted. The reviewer confirmed every round-1 fix in `bd8867964` and reproduced all eight journaled negative controls in an isolated copy; the L2 and L3 deferrals remain valid.

- L1 (Low): a wrapped or nested detail line under a bold title refuses the artifact as orphaned, with a misleading cause → approved deferral (see Deferred Findings); fails closed and never accepts wrongly.
- L2 (Low): a plain list finding followed by an explicit `**M1 — …**` is refused as a duplicate `M1` (order-dependent) → approved deferral to p08 (see Deferred Findings); fails closed, and p08 owns finding identity.

**Outcome:** passed

p01 accepted 2026-11-01: per-phase review passed in round 2, every review disposition is settled, and no phase gate is selected for p01.

## Phase p02: Retire the clerical-resolution verifier

**Status:** completed
**Base:** c8a12f51dc6ee7a4f863a0fbb0c58290377e2292
**Head:** 8427732e8bfd661a536997096ed43af0bc5376d1
**Executor:** phase-implementer:rgi-p02-impl-20261101-01
**Amendment (2026-11-02):** the operator-approved brief amendment retired the verifier this phase built and dropped the optional phase gates, so no p02 phase gate runs. The root made the revert commit inline under p02-ie1; earlier records keep their phase-implementer executor.
**Retirement verification (2026-11-02, p02-t04, inline:p02-ie1):** the revert commit `8427732e8` restores every verifier path to `23c7d5ae9`; CLI type-check exited 0 and the isolated-HOME CLI suite passed 9299/9299.
**Verification:** built-CLI verifier and unchanged goal-successor suites passed 93/93; isolated-HOME help and contract suites passed 1157/1157; CLI lint, CLI type-check, `pnpm check`, and `pnpm build` each exited 0. The restored refusal guard passed all 13 verifier tests after its negative-control neutralization run.
**Late-fix verification:** after p02-t02, the built-CLI verifier, help snapshot and unchanged delivery suites passed 175/175; isolated-HOME help/contracts passed 1157/1157 on the no-edit rerun after a concurrent-build race; CLI lint, CLI type-check, `pnpm check`, direct CLI build and `pnpm build` exited 0. Twenty-seven restored verifier controls passed after the per-guard neutralization probes recorded below.
**Late-fix round-2 verification:** after p02-t03, the built-CLI verifier, help snapshot and unchanged delivery suites passed 194/194; isolated-HOME help/contracts passed 1157/1157; direct CLI build, CLI lint, CLI type-check, `pnpm check` and `pnpm build` exited 0. The restored verifier suite passed 30/30 after the eleven per-guard neutralization probes recorded below.

Worktree: the project branch checkout. Committing owner: the phase implementer. Parallelism assessment: rung 3, one phase implementer. Rung 1 does not apply, because no parallel groups are declared. Rung 2 does not apply, because the verifier command, its settlement-entry definition, and its controls share the module, fixtures and test harness, and fail the independence test. Rung 4 does not apply, because this is a new assurance-bearing CLI surface. The selected phase gate runs after the per-phase review passes.

### Task p02-t01: Add the read-only clerical-settlement verifier

**Status:** completed
**Executor:** phase-implementer:rgi-p02-impl-20261101-01
**Handle:** direct:rgi-p02-impl-20261101-01:p02-t01
**Intent:** Define the settlement record and `resolved` semantics, implement first-settlement and committed-evidence replay verification with the unchanged goal bookkeeping-successor contract, and expose the verifier through a documented read-only CLI command.
**Files:** `packages/cli/src/commands/project/clerical-settlement/**`, `packages/cli/src/commands/project/index.ts`, `packages/cli/src/commands/project/delivery/check.ts`, `packages/cli/src/commands/project/delivery/index.ts`, `packages/cli/src/commands/help-snapshots.test.ts`, `packages/cli/README.md`, and `apps/oat-docs/docs/reference/cli-reference.md`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli build && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/clerical-settlement`
**Commit:** fcb556d4edb9cd6e5edc1b2ecc16026a7816480e
**Proof:** CLI build passed; the built-CLI verifier, help snapshot, delivery check, and delivery evidence suites passed 161/161; CLI lint and type-check passed; `pnpm check` passed.

**Known Unknowns resolved:**

- Command and rationale: `oat project clerical-settlement verify --project <path> --proposal <json-file>` is a project-scoped, explicitly read-only verifier. It writes no tracking state, always emits schema-versioned JSON, exits zero only for `status: verified`, and returns ordered per-check reasons so p03 can consume a stable assurance result without embedding verifier policy.
- Proposal and output shape: proposal schema v1 selects one exact `{ scope, type, artifact }` event, `first-settlement` or `replay`, a full-SHA repair range, one `Review Received:` receipt heading, and exactly one entry per finding with ID, one closed repair kind, corrected field, permitted record, and authoritative source. Goal delivery events also carry their exact subject and published head. Output schema v1 contains the mode, selected tuple, repair range, ordered `{ id, status, reason }` checks, terminal status/reason, and the settlement record when verification succeeds.
- Settlement entry and `resolved`: `### Clerical Settlement: <deterministic-id>` under `## Reviews and Gates` contains fenced JSON schema v1 bound to the event tuple, receipt heading and digest, complete per-finding records and counts, immutable reviewed revision, repair range, artifact digest/metadata, and retained gate proof when applicable. Reviews `resolved` means the verifier authorized no-re-review routing; it is terminal for that routing decision but never means reviewer `passed`.
- Task-plan applicability: goal milestone/delivery events use the production delivery scope builder and unchanged brief-contract section 12.8 successor evaluator. Task-plan and other non-delivery scopes do not inherit the brief-specific plan/journal grammar from `delivery/evidence.ts`; they receive strict per-commit named-field enforcement and the invariant that the reviewed subject has no changes outside project records.

**Assurance controls:** the production suite ran against real temporary Git repositories and the built CLI. Each negative fixture was first observed refused with the named reason below. The refusal catch boundary was then temporarily neutralized so a refusal reported `verified`; the same suite produced 10 failing negative-control groups and 24 failed assertions while every paired positive control still passed. After restoring the guard, all 13 tests passed:

- `findingLocation: app.ts:1`: neutralized `verified`; restored `finding-location-mismatch`; genuine archived-reference control `verified`.
- `artifactType: artifact` and `artifactType: missing`: neutralized `verified`; restored `review-type-ineligible`; code-review archived-reference control `verified`.
- Goal `repairField: Reviewed Head`: neutralized `verified`; restored `goal-12.8-substantive-change`; goal archived-reference control `verified`.
- Replay with `rewriteObservation: true`: neutralized `verified`; restored `goal-12.8-substantive-change` naming the recorded journal line; unchanged replay control `verified`.
- `repairStatus: passed` and `inventReviewedHead: true`: neutralized `verified`; restored `repair-field-overreach` and `reviewed-revision-mismatch`; archived-reference control `verified`.
- `duplicateEvent: true`: neutralized `verified`; restored `event-not-unique`; unique-event control `verified`.
- `archiveDifferentRun: true`: neutralized `verified`; restored `archive-identity-mismatch`; byte- and identity-equal archive control `verified`.
- `gateProofMismatch: true`: neutralized `verified`; restored `gate-proof-mismatch`; corroborated gate run/target control `verified`.
- Reviewed Head sourced from the selected Reviews row: neutralized `verified`; restored `reviewed-head-self-oracle`; artifact-sourced control `verified`.
- Replay after omitting committed proof: neutralized `verified`; restored `durable-proof-missing`; replay with the local review file deleted and durable proof retained `verified`.
- Genuine archived-reference repair: remained `verified` with `archive-identity` and `goal-successor-chain` passing.

### Review Received: p02

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p02-review-2026-11-01T224642Z.md

**Findings:** Critical 0 · High 4 · Medium 5 · Low 4

Reviewer request `rgi-p02-rev-20261101-01` (`oat-reviewer-claude-opus-5-5-high`); reviewed range `c8a12f51dc6ee7a4f863a0fbb0c58290377e2292..09d8f57b55dbf2ab0b2d8f5c9183d212e86974ae`; reconnaissance not attempted. The verifier is read-only and the `delivery/check.ts` refactor preserves behavior, but built-CLI probes found Design gaps. Every finding cites a Design or Decision clause, so all are fixed in p02.

- H1 (High): archive-reference repair reads the original file, so a genuine repair after receive's `mv` is refused with ENOENT (the fixture copied instead of moving) → fix task p02-t02.
- H2 (High): a substantive finding can verify by sharing another finding's corrected field, and the eligibility binding is path-only → fix task p02-t02.
- H3 (High): non-goal replay always fails on head mismatch, and a smuggled `goal` field lets later substantive changes inherit verification → fix task p02-t02.
- H4 (High): gate run/target corroboration reads a proof format no producer emits → fix task p02-t02; corroborate against real retained gate evidence.
- M1 (Medium): replay does not require the ledger type to be `code` → fix task p02-t02.
- M2 (Medium): the named receipt is not bound to the event's scope, artifact, counts and finding IDs → fix task p02-t02.
- M3 (Medium): per-clause fail-ability was not proven; one catch-all neutralization stood in for every guard → fix task p02-t02 (AGENTS.md per-clause rule).
- M4 (Medium): the descriptive-prose kind can target any journal heading, including receipts and gate markers → fix task p02-t02.
- M5 (Medium): the reviewed-subject diff misses a file moved into the project directory (rename detection) → fix task p02-t02.
- L1 (Low): settlement entries are accepted anywhere in the journal and are not schema-validated → fix task p02-t02.
- L2 (Low): no up-front refusal for a proposal already known to violate section 12.8 → fix task p02-t02 (static refusal, or record that p04's proposal step owns it).
- L3 (Low): replay mixes committed blobs with working-tree state → fix task p02-t02.
- L4 (Low): scope equality may refuse genuine goal delivery-scope events (`dNN`, `<id>: …`) → fix task p02-t02.

**Outcome:** fixes queued: p02-t02

### Task p02-t02: Address p02 review findings

**Status:** completed
**Executor:** phase-implementer:rgi-p02-impl-20261101-01
**Handle:** direct:rgi-p02-fix-20261101-01:p02-t02
**Source review:** `reviews/archived/p02-review-2026-11-01T224642Z.md` (H1, H2, H3, H4, M1, M2, M3, M4, M5, L1, L2, L3, L4)
**Intent:** Make archive, finding, replay, gate, receipt, settlement-schema, descriptive-record, committed-state, and goal-scope corroboration match the accepted p02 Design, with one load-bearing negative-control probe per refusal clause.
**Files:** `packages/cli/src/commands/project/clerical-settlement/**`, `packages/cli/README.md`, and `apps/oat-docs/docs/reference/cli-reference.md`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli build && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/clerical-settlement src/commands/project/delivery`
**Commit:** 56bae738d81454b669858508150b520c6a045706
**Proof:** The built-CLI verifier, help snapshot, delivery check and delivery evidence suites passed 175/175; CLI lint and type-check, `pnpm check`, isolated-HOME help/contracts (1157/1157), direct CLI build and `pnpm build` exited 0.

**Review fixes:**

- H1: archive corroboration now treats a missing moved-away source as normal, requires the archived artifact's event/revision/date/invocation/gate identity to agree with the row and receipt, checks a surviving source byte-for-byte, and tests real move plus collision-suffix semantics.
- H2: proposal targets are unique by record and field; locations resolve to the selected row or exact journal field line; finding claims name their corrected field. Shared-repair and substantive-on-genuine-repair controls refuse.
- H3: every replay names top-level `publishedHead`; non-goal subject checks and clerical-only settlement-successor checks extend through it; goal-only fields are scope-bound; settlement commits cannot rewrite Reviewed Head.
- H4: retained gate proof is captured production `oat --json gate review` shape (`runId`, `target`, `artifactPath`, `generatedAt`) and is corroborated with artifact frontmatter, source/archive mapping and the row. The fixture records its production provenance.
- M1-M5: replay rechecks code type; receipts bind scope/artifact/counts/finding IDs; per-guard proof is recorded below; descriptive prose is restricted to exact fields under `Clerical Observation:`; subject diffs disable rename detection.
- L1-L4: settlement entries are strict-schema records only under `## Reviews and Gates`; known goal section 12.8 violations refuse before repair inspection; tracked project dirt refuses; labelled milestone/delivery identities normalize through the delivery subject.

**Per-guard negative controls:** every row temporarily neutralized only the named guard, rebuilt the CLI, ran all built-CLI verifier tests, observed the named test fail, and then restored the guard. All unrelated tests passed in each run (24/24, 25/25, or 26/26 according to the then-current suite size).

| Guard neutralized                  | Targeted control                          | Neutralized outcome                                    | Restored outcome                   |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------ | ---------------------------------- |
| Archived generated-at/row identity | different-run archive                     | Target test failed; bad archive verified               | `reviewed-revision-mismatch`       |
| Unique `(record, field)` ownership | two findings sharing Artifact             | Target test failed; shared repair verified             | `repair-target-shared`             |
| Exact location line                | clerical claim at `plan.md:1`             | Target test failed; wrong line verified                | `finding-location-record-mismatch` |
| Claim-to-field binding             | substantive Medium on genuine Date repair | Target test failed; substantive claim verified         | `finding-claim-field-mismatch`     |
| Finding path binding               | substantive finding at `app.ts:1`         | Target test failed at the next line guard              | `finding-location-mismatch`        |
| Explicit replay `publishedHead`    | replay proposal omitting it               | Target test failed; parser reached verifier            | proposal `error`                   |
| Goal-only field scope              | `goal` on phase event                     | Target test failed; smuggled field verified            | `goal-scope-mismatch`              |
| Post-repair successor path         | later `app.ts` commit                     | Target test failed at the next successor guard         | `settlement-successor-substantive` |
| Settlement journal boundary        | settlement commit rewrites observation    | Target test failed at goal section 12.8                | `settlement-successor-overreach`   |
| Immutable replay Reviewed Head     | settlement commit rewrites row head       | Target test failed at successor overreach              | `durable-proof-contradictory`      |
| Gate run corroboration             | captured gate result has another run      | Target test failed; mismatch verified                  | `gate-proof-mismatch`              |
| Replay code type                   | artifact row with code-claiming entry     | Target test failed at later durable binding            | `durable-proof-missing`            |
| Receipt scope                      | receipt for `p99`                         | Target test failed; wrong receipt verified             | `receipt-event-mismatch`           |
| Receipt artifact                   | unrelated citation                        | Target test failed; wrong citation verified            | `receipt-artifact-mismatch`        |
| Receipt counts                     | Medium/Low mismatch                       | Target test failed; wrong counts verified              | `receipt-counts-mismatch`          |
| Receipt finding IDs                | IDs omitted                               | Target test failed; incomplete receipt verified        | `receipt-findings-mismatch`        |
| Descriptive heading allowlist      | Review Received receipt target            | Target test failed at exact-field enforcement          | `repair-kind-ineligible`           |
| Non-goal `--no-renames`            | move reviewed `app.ts` into project       | Target test failed; moved subject verified             | `reviewed-subject-changed`         |
| Settlement section placement       | entry outside Reviews and Gates           | Target test failed at successor enforcement            | `settlement-entry-not-unique`      |
| Settlement schema errors           | missing proof                             | Both schema-targeted tests failed; 23 unrelated passed | `settlement-entry-malformed`       |
| Static goal section 12.8 refusal   | goal Reviewed Head proposal               | Target test failed later in the unchanged evaluator    | `goal-12.8-known-ineligible`       |
| Committed-state cleanliness        | dirty tracked `plan.md`                   | Target test failed; committed blobs verified           | `project-state-dirty`              |
| Goal scope normalization           | `m01: implementation review`              | Positive target failed before delivery evaluation      | verified after normalization       |
| Exact event uniqueness             | duplicate Reviews rows                    | Target test failed at repair snapshot ambiguity        | `event-not-unique`                 |
| Reviewed Head self-oracle          | Reviews row as source                     | Target test failed at repair-kind eligibility          | `reviewed-head-self-oracle`        |
| Status exclusion from repair mask  | Status promoted to passed                 | Target test failed; promotion escaped field check      | `repair-field-overreach`           |
| First-settlement code-only type    | artifact review event                     | Target test failed; artifact review verified           | `review-type-ineligible`           |

### Review Received: p02 (round 2)

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p02-review-2026-11-01T232603Z.md

**Findings:** Critical 0 · High 3 · Medium 1 · Low 2

Reviewer request `rgi-p02-rev-20261101-02` (`oat-reviewer-claude-opus-5-5-high`); reviewed range `c8a12f51dc6ee7a4f863a0fbb0c58290377e2292..4497d05f532e3d52984efaf7fde684c65f008b71`; reconnaissance not attempted. All 13 round-1 fixes were confirmed, and three per-guard controls were re-proven in a throwaway copy. New gaps follow.

- H1 (High): first settlement refuses every real Reviews row, because `Date` must equal the full artifact timestamp while producers write date-only cells (fixtures used full timestamps) → fix task p02-t03.
- H2 (High): replay refuses ordinary lifecycle bookkeeping after settlement (for example the goal `reviewing → delivering` state write) that section 12.8 accepts; the allowlist the round-1 guidance prescribed is too narrow → fix task p02-t03.
- H3 (High): gate-event replay verifies when the committed settlement entry omits its gate proof → fix task p02-t03.
- M1 (Medium): the claim-to-field binding is a raw substring test, so a finding titled "Update …" satisfies `Date` → fix task p02-t03.
- L1 (Low): the descriptive-prose kind can only target a `Clerical Observation:` heading that nothing produces → fix task p02-t03; bind it to real descriptive prose that is not a marker or receipt.
- L2 (Low): p02 Reviews row still `fixes_added` and round-1 review and fix run lines absent → rejected with rationale: this round's Review Scope named review-outcome bookkeeping and run-line updates out of scope; Step 7b writes them after the review settles.

**Outcome:** fixes queued: p02-t03 (fix round 2 of 2)

### Task p02-t03: Address p02 round-2 findings

**Status:** completed
**Executor:** phase-implementer:rgi-p02-impl-20261101-01
**Handle:** direct:rgi-p02-fix-20261101-02:p02-t03
**Source review:** `reviews/archived/p02-review-2026-11-01T232603Z.md` (H1, H2, H3, M1, L1; L2 rejected as out-of-scope bookkeeping)
**Intent:** Make first settlement accept real date-only Reviews rows, make replay reuse the production bookkeeping judgments while preserving bound evidence, require committed gate proof, strictly bind claims to corrected fields, and fail closed on descriptive prose until p04 defines a real producer.
**Files:** `packages/cli/src/commands/project/clerical-settlement/**`, `packages/cli/README.md`, and `apps/oat-docs/docs/reference/cli-reference.md`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli build && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/clerical-settlement src/commands/project/delivery`.
**Commit:** 7cb72f013bae1c3282da74b72e4b771e0e06e8da
**Proof:** Direct CLI build and the built-CLI verifier, delivery and help suites passed 194/194; CLI lint, CLI type-check, `pnpm check`, isolated-HOME help/contracts (1157/1157), and `pnpm build` exited 0.

**Review fixes:**

- H1: Reviews `Date` is the UTC date of artifact `generated_at`; absent artifact invocation normalizes to the real row sentinel `-` in first-settlement and replay. Archive identity uses the archived frontmatter plus generated-at filename lineage and accepts a receive-style move whose source is gone.
- H2: goal replay delegates the whole chain to the unchanged section 12.8 production evaluator. Non-goal replay keeps the strict reviewed-subject check and delegates post-repair commits to the same production per-file bookkeeping judgments instead of maintaining a narrower allowlist. A real `reviewing → delivering` state transition and appended observation verify; later code and recorded-evidence rewrites refuse.
- H3: gate replay requires the settlement entry's committed gate proof and corroborates its run, target, generated-at, reviewed head, archive and retained artifact path against the other committed bindings.
- M1: finding titles must contain the exact corrected field token followed by `cell` or `column`, case-insensitively and at word boundaries; `Update …` cannot satisfy `Date`.
- L1: descriptive prose is fail-closed with `descriptive-prose-target-unavailable` until p04 defines a real lifecycle-produced prose target. L2 remains intentionally untouched as review-outcome bookkeeping outside this fix scope.

**Per-guard negative controls:** each row temporarily neutralized only the named guard, rebuilt the CLI, ran the complete built-CLI verifier suite, observed the targeted control fail, and restored the guard. The final restored suite passed 30/30.

| Guard neutralized                                | Targeted control                                 | Neutralized outcome                                                      | Restored outcome                       |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------- |
| First-settlement date-only source                | real date-only Reviews metadata                  | Target failed; 25 unrelated tests passed                                 | verified                               |
| Replay date-only binding                         | replay without local artifact                    | Target failed; 24 unrelated tests passed                                 | verified                               |
| First-settlement absent-invocation normalization | date-only row with Invocation `-`                | Target failed; 29 unrelated tests passed                                 | verified                               |
| Replay absent-invocation normalization           | committed proof with null invocation and row `-` | Target failed; 29 unrelated tests passed                                 | verified                               |
| Archived generated-at filename lineage           | archived counterpart from a different run        | Target failed; bad archive verified; 29 unrelated tests passed           | `archive-identity-mismatch`            |
| Non-goal production successor judgment           | rewritten recorded journal observation           | Target failed; rewrite verified; 29 unrelated tests passed               | bookkeeping-successor refusal          |
| Goal section 12.8 successor judgment             | later substantive `app.ts` commit                | Target failed; substantive successor verified; 28 unrelated tests passed | `goal-12.8-disallowed-path`            |
| Committed gate-proof presence                    | gate replay with `proof.gate: null`              | Target failed; missing proof verified; 29 unrelated tests passed         | `durable-proof-missing`                |
| Committed gate-proof contradiction               | gate replay with another artifact path           | Target failed; contradiction verified; 29 unrelated tests passed         | `gate-proof-mismatch`                  |
| Exact field token and suffix                     | `Update review metadata` proposed for Date       | Two claim-binding targets failed; 28 unrelated tests passed              | `finding-claim-field-mismatch`         |
| Descriptive-prose target unavailable             | invented `Clerical Observation` target           | Target failed; invented target verified; 29 unrelated tests passed       | `descriptive-prose-target-unavailable` |

### Review Received: p02 (round 3)

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p02-review-2026-11-02T001304Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 4

Reviewer request `rgi-p02-rev-20261101-03` (`oat-reviewer-claude-opus-5-5-high`); reviewed range `c8a12f51dc6ee7a4f863a0fbb0c58290377e2292..9ef1fcb89807a67dd9da78bbe4b6b8e45810116c`; reconnaissance not attempted. All round-2 fixes hold under real-shaped inputs. The fix loop used both retries (limit 2); no blocking finding remains.

- M1 (Medium): the verifier requires the Reviews `Date` cell to equal the artifact's UTC `oat_generated_at` date, but receive writes its local run day, so a genuine repair can be refused (it fails closed) → approved deferral to p03's first record (see Deferred Findings): drop Date from the identity check, since the reviewed head and archived timestamp identify the run.
- L1 (Low): the p02-t01 task-plan applicability note is stale, and its controls run on a brief-shaped `plan.md` → approved deferral to p03 (see Deferred Findings).
- L2 (Low): a later phase's code commit stales a phase-scope settlement, and replay runs only when HEAD equals the published head; the p03 consumer decision is unrecorded → handoff to p03 (see Deferred Findings).
- L3 (Low): two fixture-only constraints (a finding title naming the "`<Field>` cell" or column; a placeholder receipt Outcome line before settlement) are not handed to p04 → handoff to p04 (see Deferred Findings).
- L4 (Low): Git and I/O failures return `refused` with exit 1 instead of a distinguishable operational failure → approved deferral to p03 (see Deferred Findings).

**Outcome:** passed (per-phase review); the selected p02 phase gate follows.

### Inline exception p02-ie1: retire the verifier by revert

Recorded before editing, under the 2026-11-02 amendment. The remaining p02 work is a revert of `fcb556d4e`, `56bae738d` and `7cb72f013`: no new surface, no unresolved design, no consequential change, and one existing proof command (CLI type-check plus the CLI test suite). The root executes it inline as committing owner; the phase keeps its `**Base:**` and earlier records, and a fresh per-phase review covers the revert.

### Task p02-t04: Revert the clerical-settlement verifier

**Status:** completed
**Executor:** inline:p02-ie1
**Intent:** Revert the three verifier commits in one implementation commit so no verifier code, tests, help snapshot, CLI reference or README entry remains.
**Files:** the paths `fcb556d4e`, `56bae738d` and `7cb72f013` touched.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli type-check && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli test`.
**Commit:** 8427732e8bfd661a536997096ed43af0bc5376d1
**Proof:** `git diff 23c7d5ae9 8427732e8` over the seven touched paths is empty and `packages/cli/src/commands/project/clerical-settlement/` is gone; CLI type-check exited 0; the isolated-HOME CLI suite passed 437 files and 9299 tests.

### Review Received: p02 (round 4, verifier retirement)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/p02-review-2026-11-02T162147Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 2

Reviewer request `rgi-p02-rev-20261102-04` (`oat-reviewer-claude-claude-opus-5-5-high`); reviewed range `c8a12f51dc6ee7a4f863a0fbb0c58290377e2292..8427732e8bfd661a536997096ed43af0bc5376d1`; reconnaissance not attempted. The revert restores all 13 verifier-touched files to `23c7d5ae9`, no reference to the removed command remains, and the branch CLI rejects `clerical-settlement`.

- L1 (Low): the phase Executor line and start paragraph still described a phase-implementer owner and a selected phase gate → addressed now with a dated amendment line in this section.
- L2 (Low): journal last-updated dates and the p02 Progress Overview row were stale → addressed now.

**Outcome:** passed

## Phase p10: Bookkeeping definition and the receive rule

**Status:** completed
**Base:** 234c9b281bf3e8c8bbf419cc9d44fbf28a462920
**Head:** d8b3a7c74650f0073bddef8b84c987265c89ce75
**Executor:** phase-implementer:rgi-p10-impl-20261102-01

Worktree: the project branch checkout. Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`, per the operator's 2026-11-02 routing). Parallelism assessment: rung 3, one phase implementer. Rung 1 does not apply, because no parallel groups are declared. Rung 2 does not apply, because the shared definition, the receive branch, the gate write rule, the reviewer marker and their contract pins share the definition text and the contract test files, so slices fail the independence test. Rung 4 does not apply, because the phase adds a new shared rule across several skills. `origin/main` was merged at the phase base (#391, #394, #396, #397, #398, #399).

Phase verification at the head: pass. Isolated-HOME contract suites (`src/commands/init/tools/shared`, `src/validation`) 1113/1113; gate and delivery suites 587/587, including the verdict suite; `pnpm run check:skill-bumps` (12 changed skill and agent role bumps); `pnpm lint`; `pnpm format`; `pnpm check` and `pnpm type-check` (the CLI tasks were cache misses and executed) all exited 0. `oat project journal check --at review --scope p10` is ok. One post-commit recovery (`rgi-p10-rec-01`, 1 of 10) is recorded under p10-t01.

After the review fix round (p10-t04, `rgi-p10-fix-20261102-01`), verification at the new head passes. Focused suites (`src/commands/init/tools/shared`, `src/validation`, the verdict and delivery-check suites) ran 1228/1228. `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format` and `pnpm check` all exited 0. The branch-build `sync --scope project --dry-run` plans 0 operations. No new recovery attempt was used.

After the round-2 fix round (p10-t05, `rgi-p10-fix-20261102-02`), verification at the new head passes. Focused suites ran 1230/1230. `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format` and `pnpm check` all exited 0. The branch-build `sync --scope project --dry-run` plans 0 operations. No recovery attempt was used.

### Task p10-t01: Shared bookkeeping definition, receive branch and gate write rule

**Status:** completed
**Executor:** phase-implementer:rgi-p10-impl-20261102-01
**Handle:** direct:rgi-p10-impl-20261102-01:p10-t01
**Intent:** Write the Outcome 2 definition once in a shared doc, add the all-bookkeeping branch to `oat-project-review-receive` (single `passed` exception, no re-review, no cycle count, goal clean-receive delivery check), add the bookkeeping-only gate write rule to the gate approval record, update the REVIEWRECEIVE autonomy rows, and pin all of it with contract tests.
**Files:** `.agents/docs/bookkeeping-findings.md`, `.agents/skills/oat-project-review-receive/SKILL.md`, `.agents/skills/oat-project-review-receive/references/docs/bookkeeping-findings.md` (link), `.agents/docs/gate-approval-record.md`, `.agents/docs/autonomy-contract.md`, version bumps of the skills that vendor the changed shared docs, `packages/cli/scripts/bundle-inputs.mjs`, contract tests under `packages/cli/src/commands/init/tools/shared/` and `packages/cli/src/validation/`.
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** 7f41ac534eeef510a0f9bb01d62beb1863988fd2
**Recovery commit:** c7b22894fa944b3344c4ca6a3ea9746993b5f866 (event `rgi-p10-rec-01`, attempt 1 of 10)
**Proof:** isolated-HOME contract suites 1112/1112 (27 files) exit 0 before the commit and again at the recovery head; `pnpm run check:skill-bumps` exit 0 at the recovery head (12 changed skill and agent role bumps); oxfmt check exit 0 on every touched file.

**Known Unknowns settled:**

- Shared-definition location: a new shared doc, `.agents/docs/bookkeeping-findings.md`, vendored as `references/docs/bookkeeping-findings.md` by link, exactly as `gate-approval-record.md` and `complexity-review-fallback.md` are. Reason: each consuming skill reads it locally at installed scope (the bundle copies skills with `cp -RL`), with no cross-skill load that `named-skill-load-contract` would have to classify, and p11 only adds one link per skill it changes. The cost is one `linkedFiles` entry in `packages/cli/scripts/bundle-inputs.mjs`, one live-inventory count in `named-skill-load-contract.test.ts` (8 to 9), and one `* -> NG` coverage row in the autonomy contract. p10 links it into `oat-project-review-receive` only.
- Gate receipts and the raw verdict: today's receipts already keep the raw counts (the `### Review Received` receipt's `**Findings:**` line and the gate's terminal line under `## Reviews and Gates`), but nothing stopped a writer from recording only the carrier's `allowed`/`passed`. The new write rule in `gate-approval-record.md` adds one requirement: both lines keep the reported verdict and counts unchanged, with the note `bookkeeping-only fixes applied at receive`, and `reviewed_head` stays the gate's reviewed commit.

**Shape of the change:** the receive branch is one block at the top of Step 2.6, checked before every other mode, fix-task creation and gate failure policy; the single `passed` exception sits directly after the pinned "use `fixes_completed` until a re-review passes" note; status semantics, the fix-task route, the goal clean-receive transition, Step 8, Steps 10 and 10A and the Step 11 summary each gain one sentence beside their existing text. Step 8's count skips an artifact whose receipt Outcome reads `passed — bookkeeping-only fixes applied at receive (reviews/archived/<file>)`. Changing the two shared docs required one version bump for each skill that vendors them (brief, document, goal, implement, lite, next, pr-final, progress, quick-start, and `oat-project-autonomous` through its `references/gate-inventory.md` link), so p11 must not bump those again.

**Negative controls** (each neutralization run against `bookkeeping-findings-contracts.test.ts`, then restored byte-identical; restored suite 23/23):

- Single `passed` exception line removed from review-receive: 1 failed (exit 1).
- Step 8 bookkeeping-only skip line removed: the executed cycle-count snippet returned 2 instead of 1, 1 failed (exit 1).
- Gate rule "No attempt is counted and the gate is not relaunched." replaced with "An attempt is counted.": 1 failed (exit 1).
- Limit 3 removed from the shared definition: 1 failed (exit 1).
- Bookkeeping-only block moved below the other handling modes: the branch slice no longer precedes the artifact mode and the suite refused to load (exit 1).

### Recovery Event rgi-p10-rec-01

- Phase/task: p10 / p10-t01
- Original request: rgi-p10-impl-20261102-01
- Original commit: 7f41ac534eeef510a0f9bb01d62beb1863988fd2
- Defect class: composition
- Discovered by: `pnpm run check:skill-bumps`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: c7b22894fa944b3344c4ca6a3ea9746993b5f866
- Verification: pre-commit, the bump validator in a throwaway worktree commit and the contract suites (1112/1112) passed; at the committed head, `pnpm run check:skill-bumps` (exit 0) and the contract suites (1112/1112, exit 0) passed.
- Reason: `oat-project-autonomous` vendors `autonomy-contract.md` through `references/gate-inventory.md`, so the REVIEWRECEIVE row edits required its version bump too. A one-line version bump, mechanically derived and in phase, with no behavior change. The validator diffs committed history only, which is why the pre-commit prevention run missed it.

### Task p10-t02: Advisory reviewer marker and parser twin test

**Status:** completed
**Executor:** phase-implementer:rgi-p10-impl-20261102-01
**Handle:** direct:rgi-p10-impl-20261102-01:p10-t02
**Intent:** Document the optional `(bookkeeping)` mark inside the bold finding title in `oat-reviewer.md` as advisory, pin it, and prove with a parser test that a marked finding in the list-item and bold-title shapes yields the same counts, severities and verdict as its unmarked twin.
**Files:** `.agents/agents/oat-reviewer.md`, its regenerated provider views, `packages/cli/src/commands/gate/review-verdict.test.ts`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts`
**Commit:** da51950603655fe24c599e3ff11eda84a4af03d4
**Proof:** verdict suite 74/74 exit 0; isolated-HOME contract plus gate suites 1575/1575 (36 files) exit 0; oxfmt check exit 0; `pnpm run check:skill-bumps` exit 0. `oat-reviewer.md` keeps its single branch bump (1.2.14 against `origin/main` 1.2.13).

The mark is documented in `oat-reviewer.md` Step 7 (advisory, inside the bold title, never after the closing `**` or on a detail line) and named in the gate parsing contract. The parser test parses one artifact with a list-item High, a bold-title Medium with closed-label details, and a numbered Low, with and without ` (bookkeeping)` inside each bold title, under a declared count line: counts 0/1/1/1, `blocking: true`, `findingsComplete`, finding IDs, severities and locations are identical, and each marked title equals its unmarked twin plus the mark.

**Negative control:** `parseExplicitFindingTitle` temporarily refused titles containing `(bookkeeping)`; the twin test failed with `finding_detail_orphaned` on the Medium (exit 1). Restored with no diff; the test passed again.

**Provider views:** `oat sync --scope project` regenerated 65 tracked reviewer views (`.codex/agents/oat-reviewer*.toml`, `.cursor/agents/oat-reviewer*.md`), each changed by exactly the two reviewer edits (17 insertions, 1 deletion per file). Sync also deleted the eight `gpt-6-1-terra` Codex views, rewrote `.codex/config.toml` and bumped `oatVersion` in `.oat/sync/manifest.json` from the machine's installed CLI; all three were restored with `git checkout --`, so the manifest has no p10 change (it carries no per-view content hashes).

### Task p10-t03: Goal delivery-check probe for a bookkeeping-only receive fix

**Status:** completed
**Executor:** phase-implementer:rgi-p10-impl-20261102-01
**Handle:** direct:rgi-p10-impl-20261102-01:p10-t03
**Intent:** Show through the production scope builder that a section 12.8-permitted bookkeeping fix commit after a goal integrated review leaves `oat project delivery check` at `status: ok`, while a fix that rewrites a recorded journal line reports stale; keep it as an automated test and repeat it with the branch build.
**Files:** `packages/cli/src/commands/project/delivery/check.test.ts`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery/check.test.ts`
**Commit:** 3dc1a862744267689621dad2145a9ffff893ec6d
**Proof:** delivery suites 125/125 (3 files) exit 0; CLI lint exit 0.

**Automated probe** (kept in `check.test.ts`, production scope builder over a real scratch Git repository from the existing `goal-repo` harness): after the milestone's integrated review is received (row `passed`, `delivering`, `no_gate` exit carrier), one commit applies three bookkeeping fixes: a Progress Overview counter (`0/1` to `1/1`), an appended correcting journal line, and a Reviews row date cell. `delivery check --subject m01` stays `status: ok`, review fresh, exit fresh. The control commit rewrites the recorded line `Build recorded.` instead of appending; the check reports `undeliverable` with `recorded journal line "Build recorded." was removed or rewritten` naming the fix commit. A registered delivery (`d01`) was tried first and dropped: it is judged at its observed member heads, so a later fix commit never enters its range and the control cannot fail there; the milestone is the subject the receive transition checks.

**Negative control:** the evaluator's recorded-line guard (`judgeJournalChange`) temporarily neutralized; the stale control failed (exit 1) while the permitted case still passed. Restored with no diff.

**Branch-build probe:** `pnpm --filter @open-agent-toolkit/cli build` (exit 0), then a scratch script (outside the repository) built the same two scenarios with the harness and ran `node packages/cli/dist/index.js --json project delivery check --project .oat/projects/shared/goal --subject m01` in each scratch repository. Permitted fix: exit 0, `status: ok`, review `fresh: true`, `reason: null`, exit carrier fresh, `deliverable: true`. Rewrite control: exit 1, `status: undeliverable`, review `fresh: false`, reason `substantive-change: <fix sha> makes a substantive change to .oat/projects/shared/goal/implementation.md: recorded journal line "Build recorded." was removed or rewritten`, `deliverable: false`.

### Task p10-t04: (review) Address p10 review findings

**Status:** completed
**Executor:** phase-implementer:rgi-p10-impl-20261102-01
**Handle:** direct:rgi-p10-fix-20261102-01:p10-t04
**Source review:** reviews/archived/p10-review-2026-11-02T170200Z.md (H1, M1, M2, L2, L3)
**Intent:** Replace the walkthrough incident with an unambiguous recorded bookkeeping-only rerun (H1); let the receive branch and Step 6 admit monotonic correction of another event's stale non-`passed` cells while barring `passed` promotion, added rows and `Reviewed Head` edits (M1); regenerate the stale reviewer views with the branch build (M2); name the tracking files (L2); pin the reviewer's restated lists against the shared doc (L3).
**Files:** `.agents/docs/bookkeeping-findings.md`, `.agents/skills/oat-project-review-receive/SKILL.md`, `.agents/agents/oat-reviewer.md`, `packages/cli/src/commands/init/tools/shared/bookkeeping-findings-contracts.test.ts`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, regenerated `.codex/agents/oat-reviewer*.toml` and `.cursor/agents/oat-reviewer*.md` views; this journal (walkthrough, journal commit).
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/gate/review-verdict.test.ts src/commands/project/delivery/check.test.ts`
**Commit:** 9e9f96811c4f2db3c7c738680246fa067b53bd5a
**Proof:** focused suites 1228/1228 (29 files) exit 0; `pnpm run check:skill-bumps` exit 0 (12 changed skill and agent role bumps, no new bump: review-receive stays 1.6.15, `oat-reviewer.md` 1.2.14); `pnpm lint` exit 0; `pnpm format` exit 0; `pnpm check` exit 0 (CLI tasks cache misses).

- H1: the walkthrough below now traces the `wave-skills-promotion` p05 gate, whose only finding (a stale `state.md` pointer and progress prose) is bookkeeping without doubt; history spent one more gate run on it. `claude-effort-levels` stays as a short counter-example. The definition is not widened.
- M1: receive branch step 3 now reads "Never set any other event to `passed`." A sentence after the Step 6 Reviews snippet, beside "update only that row", lets a bookkeeping-only fix correct another existing event's stale non-`passed` Status, Date or Artifact cell monotonically. It never changes that event's `Reviewed Head` and never adds a missing row. The Status semantics monotonic bullet names that exception. Shared limit 3 says the same, and adds that a missing row is not a stale cell. New pins: branch sentence (old sentence asserted absent), Step 6 sentence and its position, the monotonic exception, and the limit 3 sentences.
- M2: branch build (`pnpm --filter @open-agent-toolkit/cli build`, exit 0). First dry run (`node packages/cli/dist/index.js --json sync --scope project --dry-run`, exit 0) planned 69 operations, all `update` of `oat-reviewer` views: 38 `.codex/agents/oat-reviewer*.toml`, the four `gpt-6-1-terra` views included, and 31 `.cursor/agents/oat-reviewer*.md`, all from the L3 edit. It planned no deletion, and `.codex/config.toml` was `skip`. `node packages/cli/dist/index.js sync --scope project` exited 0. The manifest's only change is `oatVersion` 0.3.40 to 0.3.43, the branch CLI version. Second dry run: `plannedOperations: 0`, both before and after the commit.
- L2: limit 1 now names the tracking files: `state.md`, the Reviews table and progress totals of `plan.md`, `implementation.md`, `project-log.md`, `summary.md` and the review artifacts. It states that `discovery.md`, `spec.md` and `design.md` are never tracking files. Pinned.
- L3: the reviewer paragraph now says "completion of unfinished work" and restates the last exclusion verbatim ("a Reviews row's `Reviewed Head`, or a set-once delivery field (brief contract section 12.8)"). The marker test now reads every Definition and Exclusions bullet from the shared doc and requires each in the reviewer marker paragraph.

**Negative controls** (each neutralized in the working tree, the contract suites run, then restored byte-identical):

1. Step 6 sentence altered: the Step 6 allowance pin fails.
2. Branch reverted to "Never set any other event's Status.": the branch pin fails.
3. Shared-doc missing-row sentence removed: the limit 3 pin fails.
4. L2 requirement-artifact sentence removed: the tracking-files pin fails.
5. Reviewer "completion of" dropped: the L3 marker test fails.

All restored; suites exit 0.

### Task p10-t05: (review) Address p10 round-2 findings

**Status:** completed
**Executor:** phase-implementer:rgi-p10-impl-20261102-01
**Handle:** direct:rgi-p10-fix-20261102-02:p10-t05
**Source review:** reviews/archived/p10-review-2026-11-02T172814Z.md (H1, M1, L1, L2)
**Intent:** Record the operator's pointer decision (round-2 receipt) as one pinned sentence in the shared definition (H1). Correct the walkthrough trace for the legacy gate artifact: the Step 1.5 stop and tier rename, `High`, Reviewed Head `-` (M1). Name the acceptance markers (L1). State how a gate-invoked phase review meets Outcome 1's second incident and where the Step 8 skip is proven (L2).
**Files:** `.agents/docs/bookkeeping-findings.md`, `packages/cli/src/commands/init/tools/shared/bookkeeping-findings-contracts.test.ts`; this journal (walkthrough, record).
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/gate/review-verdict.test.ts src/commands/project/delivery/check.test.ts`
**Commit:** a5565f8a3c40ef35d6750702b2e9a871dedfdaa0
**Proof:** focused suites 1230/1230 (29 files) exit 0. `pnpm run check:skill-bumps` exit 0 (no new bump: review-receive 1.6.15, `oat-reviewer.md` 1.2.14). `pnpm lint`, `pnpm format` and `pnpm check` exit 0 (CLI tasks were cache misses). Branch-build `sync --scope project --dry-run` plans 0 operations.

- **H1, operator decision (2026-11-02, round-2 receipt).**
  - One sentence after the Definition bullets now reads: "A pointer such as `oat_current_task` or another resume pointer is bookkeeping when the fix copies state the journal already records. A pointer or a completion inferred from commits is never bookkeeping." It is prose outside the bullets, so the reviewer paragraph and its views are unchanged.
  - Walkthrough step 2 cites the decision. It shows `p06-t01` copied from the reviewed-head journal (`oat_current_task_id: p06-t01`, Phase 5 completed, Phase 6 blocked), and 23/27 copied from its recorded total. `plan.md` is not edited.
- **M1, trace corrected.**
  - Step 1 now records the Step 1.5 stop on the `### Important` and `### Minor` tiers and the `important`/`minor` count line, then the tier-only rename. The raw counts are kept in the receipt.
  - The receipt note uses `H1 (High)`, and Step 5 and the Outcome write Reviewed Head `-`.
  - Re-checking the other steps found and corrected one more error: a phase gate has no carrier in `gate-approval-record.md`, so branch step 5 writes no carrier.
  - Branch step 5 now notes that implement's phase-gate loop gets the matching branch in p11. Step 1 provenance (invocation `gate`, target `codex-5-6-sol-max`), the Step 6 row lookup and write, and the Step 7.5 archive name were checked against the current text.
- **L1.** A sentence after the Exclusions bullets names the acceptance markers as the phase and task `**Status:**` lines in `implementation.md`, and calls `state.md`'s summary `**Status:**` line a progress label.
- **L2.** A "Coverage against Outcome 1" paragraph says why this phase-scope gate-produced review is the phase review rerun, and that the Step 8 skip is proven by the executed Step 8 test and its p10-t01 negative control.

**Negative controls** (each neutralized in the working tree, then restored byte-identical; the contract suites ran 123/123 before and after):

1. H1: removing "A pointer or a completion inferred from commits is never bookkeeping." fails the pointer pin (exit 1).
2. L1: removing the acceptance-marker sentence fails the marker pin (exit 1).

### Walkthrough: a recorded bookkeeping-only review rerun under the amended receive text

**Incident.** `wave-skills-promotion` (spec-driven), phase p05, operator-configured cross-runtime phase gate (`oat_phase_review_gate`). Gate run `811c64e3-d0df-47ca-b021-c89f4810c2ee` (target `codex-5-6-sol-max`) reviewed `oat_commit_range: b0824ce6d22c..17a56f3945f24fb12ec24111d3697cb0e5ee3440` and wrote `reviews/p05-review-2026-07-18T184321Z.md` (`oat_review_scope: p05`, `oat_review_invocation: gate`, no `oat_review_head_sha`). It reported `Findings: 0 critical, 1 important, 0 medium, 0 minor`, verdict BLOCKING at the Important threshold. Its only finding, under `### Important`, is "Project state still routes to completed p05 work" (`state.md:2`). The reviewed head's bookkeeping commit `17a56f39` had left `state.md` behind the journal: frontmatter `oat_current_task: p05-t01`, body `**Status:** Discovery`, "Ready for implementation", `implementation.md` "not started", and "Awaiting implementation". The fix it asks for: point `oat_current_task` at `p06-t01`, and refresh the Status, Current Phase, Artifacts, Progress, Blockers and Next Milestone prose to say p01–p05 are complete and p06 waits on the explainer-kit RC, keeping the project in `implement` / `in_progress`. History spent one more gate run on it. Fix commit `1c4cd7e09008ecc703dd75777acab1e2eb78dabf` ("advance project state to p06 gate boundary (p05 gate fix)") touched `state.md` only, +31 −30. The bounded relaunch, run `c221ce46-309b-462c-9ec6-7a393808750d`, reviewed only `fa7e872ad..1c4cd7e09`, and its artifact `p05-review-2026-07-18T185045Z.md` found nothing. The ledger kept two events: `184321Z` `fixes_completed` and `185045Z` `passed`.

**Reproduce.** The project landed squashed in PR #158 (`4578e261a`).

- Artifacts: `git show 4578e261a:.oat/projects/shared/wave-skills-promotion/reviews/archived/p05-review-2026-07-18T184321Z.md`, and the same path ending `...T185045Z.md`.
- Reviews rows: `git show 4578e261a:.oat/projects/shared/wave-skills-promotion/plan.md`, lines 752–753.
- Fix diff: `gh api repos/voxmedia/open-agent-toolkit/commits/1c4cd7e09008ecc703dd75777acab1e2eb78dabf` (parent `fa7e872ad42a337c16583ec8e079ccf25c164f0a`). The branch commits are not in the local object store, but the PR keeps them.
- Reviewed head: `gh api repos/voxmedia/open-agent-toolkit/commits/17a56f3945f24fb12ec24111d3697cb0e5ee3440` ("chore(oat): bookkeeping after p05 pass").
- Journal at the reviewed head: `gh api -H 'Accept: application/vnd.github.raw' 'repos/voxmedia/open-agent-toolkit/contents/.oat/projects/shared/wave-skills-promotion/implementation.md?ref=17a56f3945f24fb12ec24111d3697cb0e5ee3440'`.

**Under the amended text:**

1. **Step 1.** The active artifact `reviews/p05-review-2026-07-18T184321Z.md` resolves. `SOURCE_REVIEW_FILENAME` and `REVIEW_FILENAME` are both `p05-review-2026-07-18T184321Z.md`, because nothing with that name is archived yet.
   - Provenance: `oat_review_invocation` is `gate` and `oat_gate_target` is `codex-5-6-sol-max`. The artifact has no `oat_review_head_sha`, only `oat_commit_range`. Receive never infers a head from a range, so the Reviewed Head is `-`.
   - **Step 1.5.** The artifact uses the retired tiers: `### Important` and `### Minor` headings and the `important`/`minor` count line. Receive stops here, before parsing, counting, choosing a mode or touching any project artifact, and reports the three forms.
   - Step 1.5 offers two ways forward. Re-running the reviewer would spend the very run this walkthrough removes, so the user takes the other: rename the tiers, `Important` to `High` and `Minor` to `Low`, including the count line's keys. The rename changes no finding, severity rank or count. The gate's raw report stays as reported: the receipt's `**Findings:**` line keeps the original counts (branch step 5).
   - Receive then restarts and passes Step 1.5. **Step 2** reads 0 Critical, 1 High, 0 Medium, 0 Low, so the clean-pass path is not entered.
2. **Step 2.6, bookkeeping-only mode.** This mode is checked before every other mode and before any gate failure policy. The receiver classifies the finding, H1 (High), against `references/docs/bookkeeping-findings.md`.
   - **The pointer.** The operator decided (2026-11-02, round-2 receipt below) that a pointer corrected by copying state the journal already records is bookkeeping, while a pointer or completion inferred from commits stays excluded. The shared definition now states this. `p06-t01` is copied, not inferred. At the reviewed head, the journal's own frontmatter records `oat_current_task_id: p06-t01 # blocked on explainer-kit RC gate` (`implementation.md:6`), its Phase 5 section records `**Status:** completed` (line 173), and Phase 6 records `**Status:** blocked` (line 210). The fix copies the journal's pointer. It derives nothing from commits.
   - **The counter.** The "23/27 tasks" is copied from the journal's recorded `**Total:** 23/27 tasks completed`, a derived counter.
   - **The prose.** The Current Phase, Artifacts, Progress, Blockers and Next Milestone prose are progress labels. The p06 blocker restates the plan-declared RC gate that the old Blockers prose already named.
   - **The body Status line.** The body `**Status:**` line in `state.md` is a progress label. The shared definition names the acceptance markers as the phase and task `**Status:**` lines in `implementation.md`, and the fix leaves those untouched.
   - **Exclusions.** The finding asks for none of them. There is no missing review. There is no requirement change: "the shipped p05 implementation itself is defensible". There is no approval: the p05 HiLL checkpoint stays pending. There is no new receipt. Nothing unfinished is completed: p05 was already recorded complete, and p06 stays blocked. No `Reviewed Head` or set-once field changes.
   - **Limits.** The fix touches only `state.md`, a tracking file (limit 1). The project is spec-driven, so section 12.8 does not apply (limit 2). Only the received event becomes `passed` (limit 3).
   - Every finding is bookkeeping, so the branch applies. Severity does not matter: a High finding can be bookkeeping.
3. **Branch step 1.** One commit touches only `state.md` and applies exactly the finding's fix. History's `1c4cd7e0` also added an `oat_blockers` frontmatter entry and deleted a commented template block. The finding asked for neither, so the branch commit leaves both out.
4. **Branch step 2.** The receipt lists `H1 (High): state.md still routes to completed p05 work → fixed at receive (bookkeeping): oat_current_task p06-t01, copied from the journal; Status, Current Phase, Artifacts, Progress, Blockers and Next Milestone now say p01–p05 complete (23/27) and p06 RC-gated`. Its Outcome line reads `passed — bookkeeping-only fixes applied at receive (reviews/archived/p05-review-2026-07-18T184321Z.md)`.
5. **Branch step 3 and Step 6.** The receiver finds the event by scope `p05`, type `code` and `SOURCE_REVIEW_FILENAME`, then updates only that row. It writes Status `passed` (the single exception), Date, Artifact `reviews/archived/p05-review-2026-07-18T184321Z.md`, Reviewed Head `-`, Invocation `gate` and Gate Target `codex-5-6-sol-max`. History wrote `fixes_completed`. No other event is touched.
6. **Branch step 4.** No fix task, no execution record, no re-review routing. Step 8 is skipped for this result. Gate-originated artifacts never count a cycle in Step 8 in any case.
7. **Branch step 5.** The result is gate-originated, so the receipt records the gate as satisfied by bookkeeping-only fixes. The Step 11 summary adds `Gate: satisfied by bookkeeping-only fixes; raw verdict BLOCKING and counts kept in the receipt; no attempt used`, and the receipt's `**Findings:**` line keeps the reported 0 critical / 1 important / 0 medium / 0 minor. No carrier is written. `.agents/docs/gate-approval-record.md` defines carriers only for the implement exit, quick-start, brief and goal milestone gates, and a phase gate has none. The receive text uses no attempt and asks for no relaunch, so run `c221ce46` and its `185045Z` artifact and row never happen. Implement's phase-gate loop (`references/phase-execution.md`) gets the matching branch in p11, whose Intent names it.
8. **Branch step 6.** Not a goal integrated review, so it does not apply.
9. **Branch step 7.** Step 7.5 moves `reviews/p05-review-2026-07-18T184321Z.md` to `reviews/archived/` under the name resolved in Step 1. Step 7.6 commits. Step 10 routes onward as a clean pass does: the gate owner resumes, and the next stop is the p05 HiLL checkpoint, which the branch leaves pending. Step 11 reports `Review cycle: not counted (bookkeeping-only fixes applied at receive)`.

**Outcome.** The same `state.md` correction lands with one gate run fewer, no gate attempt used and no review cycle counted. The ledger holds one `passed` event, Reviewed Head `-` because the legacy artifact has no `oat_review_head_sha`, instead of `fixes_completed` plus a second `passed` event. The legacy tier rename at Step 1.5 is the one manual step, and the rename only.

**Coverage against Outcome 1.** This counts as Outcome 1's "one bookkeeping-only phase or final review rerun" because it is a phase-scope code review (`oat_review_scope: p05`, `oat_review_type: code`) that the phase gate produced, and history reran that phase review. The #233 incident that p11 traces is a different gate. Because gate-originated artifacts never count a cycle, this incident cannot show the Step 8 cycle-count skip. That skip is shown by the executed Step 8 test in `bookkeeping-findings-contracts.test.ts` ("excludes an artifact whose receipt records the bookkeeping-only outcome") and by its p10-t01 negative control: with the skip line removed, the snippet counted 2 instead of 1.

**Correction (p10 round-3 review, L1 and L2).** The run `c221ce46` and its artifact never happening (step 7) and "one gate run fewer" (Outcome) hold under the receive text. End to end they also need implement's phase-gate branch, which p11 adds. Until then `references/phase-execution.md` still re-runs root review and the gate after a `blocked` result. In step 5, the incident's Reviews table is the legacy five-column shape, so Step 6 first adds `Reviewed Head`, `Invocation` and `Gate Target` to the header and pads every existing row with `-`. No other event's recorded value changes, so limit 3 and the conclusion stand.

**Counter-example: today's flow still applies.** `claude-effort-levels` p-rev1 re-review `p-rev1-review-2026-09-23T010920Z.md` (reproduce with `git show 6df4aae89:.oat/projects/shared/claude-effort-levels/reviews/p-rev1-review-2026-09-23T010920Z.md`) has one Medium finding.

- It asks to archive the prior artifact, which is an archived-artifact path reference.
- It asks to align completion from 17/20 to 20/20, which is a derived counter.
- It also asks to append the prior event's missing `fixes_completed` row. A missing row is not a stale cell (limit 3), and the call is at best doubtful, so the finding is not bookkeeping.

The result follows the existing modes: a fix task and the re-review `011458Z` are still required, and Step 8 counts the cycle.

### Review Received: p10

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/p10-review-2026-11-02T170200Z.md

**Findings:** Critical 0 · High 1 · Medium 2 · Low 3

Reviewer request `rgi-p10-rev-20261102-01` (`oat-reviewer-claude-claude-opus-5-5-high`); reviewed range `e9c2b783654a954ac89962ec96d66e768e4ab1be..73b277434f24cb95f785ac4fa36618b09b6d20e7`; reconnaissance not attempted. Branch ordering, the single `passed` exception, the gate write rule, the autonomy rows, the marker documentation, the probe and the bumps all checked out. The reviewer re-ran the Step 8 negative control (2, 1, 2).

- H1 (High): the walkthrough's incident adds a missing Reviews row for a prior event, which the amended branch ("Never set any other event's Status") and Step 6 forbid, and the journal itself calls it doubtful, so under the doubt rule it is not bookkeeping; the exit evidence is unmet → fix task p10-t04: replace it with a recorded rerun whose findings are unambiguously in the definition (keep this incident only as a counter-example if useful). The definition is not widened.
- M1 (Medium): the shared definition (Outcome 2: "a stale Reviews row cell or status label"; limit 3 bars only `passed`) admits correcting another event's stale non-`passed` status, while the receive branch forbids touching any other event's Status → fix task p10-t04, aligned to the approved Outcome 2: the branch bars setting any other event to `passed`, and one sentence beside Step 6 lets a bookkeeping-only fix correct an existing event's stale non-`passed` Status, Date or Artifact cell, monotonically, never its `Reviewed Head` and never by adding a row. This follows the approved brief, so it is not an operator call.
- M2 (Medium): the four `.codex/agents/oat-reviewer-gpt-6-1-terra-*.toml` views (merged from main at the p10 base) lack the p01 and p10 reviewer text; a branch-build `sync --dry-run` plans exactly those 4 updates → fix task p10-t04: regenerate with the branch build and confirm a second dry run plans 0.
- L1 (Low): when the goal delivery check reports stale, the `passed` row and the receipt note stay on record and Step 8 keeps skipping that artifact; a new integrated review is still forced, so no re-review is skipped → deferred (see Deferred Findings).
- L2 (Low): "tracking files" is undefined outside goal mode → fix task p10-t04: name them in the shared doc and state that requirement artifacts (`discovery.md`, `spec.md`, `design.md`) are never tracking files (a clarification of limit 1, not a new guarantee).
- L3 (Low): the reviewer's restated inclusion and exclusion lists have no drift pin against the shared doc → fix task p10-t04: pin them.

**Outcome:** fixes queued: p10-t04

### Review Received: p10 (round 2)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/p10-review-2026-11-02T172814Z.md

**Findings:** Critical 0 · High 1 · Medium 1 · Low 2

Reviewer request `rgi-p10-rev-20261102-02` (`oat-reviewer-claude-claude-opus-5-5-high`); reviewed range `e9c2b783654a954ac89962ec96d66e768e4ab1be..2eca1422aaee6e93a0b7be53e6b86aa5c2d34b9c` (fix range from `c2d6f096b`); reconnaissance not attempted. Round-1 M1, M2, L2 and L3 resolved; the L1 deferral accepted; no new bumps; journal check ok.

- H1 (High): the replacement walkthrough's main fix moves `oat_current_task`, a machine-read routing pointer, while the approved brief lists "Routing or progress pointer repair" as out of scope, so the classification is doubtful. Operator decision (2026-11-02, asked by the root): a pointer corrected by copying state the journal already records is bookkeeping; a pointer or completion inferred from commits stays excluded (the Out of Scope line's original rationale). → fix task p10-t05: add that sentence to the shared definition and pin it; the walkthrough cites the decision and shows the `p06-t01` pointer is copied from recorded journal state.
- M1 (Medium): the trace misstates Step 1.5 (the legacy artifact's `Important`/`Minor` tiers stop receive until renamed) and the Reviewed Head (no `oat_review_head_sha`, so the cell is `-`) → fix task p10-t05.
- L1 (Low): the shared doc never says which `**Status:**` lines are acceptance markers → fix task p10-t05: name the `implementation.md` phase and task `**Status:**` lines as the markers and `state.md`'s summary `**Status:**` line as a progress label; pin it (a clarification).
- L2 (Low): both m01 walkthroughs are gate reruns, so "no cycle count" is shown only vacuously → fix task p10-t05: one sentence on why a gate-invoked phase review satisfies Outcome 1's second incident and that the Step 8 skip is covered by the executed control.

**Outcome:** fixes queued: p10-t05

### Review Received: p10 (round 3)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/p10-review-2026-11-02T193214Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 2

Reviewer request `rgi-p10-rev-20261102-03` (`oat-reviewer-claude-claude-opus-5-5-high`); reviewed range `e9c2b783654a954ac89962ec96d66e768e4ab1be..cf26ae9c9f9dc7df0ed17be40f99822ae63ad6e9` (fix range from `997109f45`); reconnaissance not attempted. Round-2 H1, M1, L1 and L2 resolved. The operator's pointer decision is stated faithfully and opens nothing wider. Regression pass clean: one bump per changed skill, branch-build sync plans 0 operations, focused suites 1230/1230, journal check ok. Review cycle 3 of 3.

- L1 (Low): the walkthrough's "never happen" (step 7) and "one gate run fewer" (Outcome) omit the qualifier that implement's phase-gate loop still relaunches until p11 → fixed at receive (bookkeeping): appended a correcting paragraph after the walkthrough's coverage paragraph.
- L2 (Low): walkthrough step 5 omits that Step 6 widens the legacy five-column Reviews table and pads every row → fixed at receive (bookkeeping): same correcting paragraph.

**Outcome:** passed — bookkeeping-only fixes applied at receive (reviews/archived/p10-review-2026-11-02T193214Z.md)

## Phase p11: Implement and planning paths, docs and release

**Status:** in_progress
**Base:** ba6405690aa0c5a980c5dac624dba4026c1560b8
**Executor:** phase-implementer:rgi-p11-impl-20261102-01

Worktree: the project branch checkout. Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`, per the operator's 2026-11-02 routing). Parallelism assessment: rung 3, one phase implementer. Rung 1 does not apply, because no parallel groups are declared. Rung 2 does not apply: the implement, planning-skill and docs slices all edit `autonomy-contract.md`, the shared contract tests and the skill version pins, so they fail the independence test. Rung 4 does not apply, because the phase repeats one shared branch across many skills plus a release. `origin/main` has not moved since the p10 base merge (checked at phase start).

### Task p11-t01: Bookkeeping-only branch on implement's review and gate paths

**Status:** completed
**Executor:** phase-implementer:rgi-p11-impl-20261102-01
**Handle:** direct:rgi-p11-impl-20261102-01:p11-t01
**Intent:** Add the all-bookkeeping branch, naming the shared definition, beside today's sentences in implement's per-phase review loop, optional phase gate and Step 7b row transitions (`references/phase-execution.md`), and in the final review, the implement exit gate receive and policy rules and the goal milestone exit gate (`references/completion-and-closeout.md`); vendor the shared definition into implement; pin each branch with contract tests.
**Files:** `.agents/skills/oat-project-implement/references/phase-execution.md`, `.agents/skills/oat-project-implement/references/completion-and-closeout.md`, `.agents/skills/oat-project-implement/references/docs/bookkeeping-findings.md` (link), `.agents/docs/autonomy-contract.md` (coverage row), `packages/cli/src/commands/init/tools/shared/bookkeeping-findings-contracts.test.ts`, `packages/cli/src/validation/named-skill-load-contract.test.ts`.
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** 249a26cb3cdd1d236d891f7fbd3a1d50fbf8d2e6
**Proof:** isolated-HOME contract suites 1128/1128 (27 files) exit 0; CLI type-check exit 0; oxlint on the test file 0 findings; `pnpm run check:skill-bumps` exit 0 after the commit (12 changed skill and agent role bumps; implement keeps its p10 bump 2.3.26).

Each branch sits beside today's text, which stays as it was:

- **Per-phase loop.** A "Bookkeeping-only round (checked first)" paragraph opens the Bounded Fix and Re-Review Loop. The root fixes in one tracking-file commit and receives through review-receive Step 2.6. No fix child, no reviewer round, no retry round. In brief modes the fix commit does not advance `**Head:**`.
- **Optional phase gate.** A `blocked` bullet for an all-bookkeeping result follows today's `blocked` bullet and is checked before it: the gate has passed, no retry round, no relaunch, raw verdict and counts kept, no carrier.
- **Step 7b.** A settled round or gate counts as a pass for the phase row transitions.
- **Final review.** Both routes, autonomous and interactive, continue to Step 14 on a bookkeeping-only result.
- **Implement exit gate.** A Structured-outcomes bullet persists `allowed/passed`, leaves `attempts_completed` unchanged, keeps the reviewed basis and `envelope_status: blocked`, and admits the fix commit between `receive_pre_head` and the receive bookkeeping commit. A Step 5 paragraph keeps the result out of `onFailure`.
- **Goal milestone exit carrier.** It records `allowed`/`passed` with no attempt and no relaunch, `reviewed_head` unchanged. When step 3 reads `exit` stale because of the fix commit, the result reverts to `blocked` and today's attempt flow.

**Freshness, verified and relied on.** The effective-delta v2 exclusion set (`completion-and-closeout.md` Step 14) excludes `$PROJECT_PATH/state.md`, `.oat/projects` and `.oat/repo` by literal pathspec. A new executed test reads those three pathspecs from the doc and builds a scratch repository. After a tracking-only fix (Reviews cell, journal line, `state.md` pointer) under `.oat/projects/`, `git diff --raw -z --no-renames --no-abbrev` gives byte-identical output, while a later code change does not.

**Negative controls** (each neutralized in the working tree, the suite run, then restored byte-identical; 1 of 38 failed each time):

1. Phase loop: "this loop does not run" changed to "this loop runs".
2. Phase gate: "consume no gate retry round" changed to "consume one gate retry round".
3. Step 7b: the counts-as-a-pass clause cut.
4. Exit gate: "leaves `attempts_completed` unchanged" changed to "increments `attempts_completed`".
5. Exit gate policy: "never reaches these policies" changed to "reaches these policies".
6. Final review (autonomous): "no further reviewer dispatch" changed to "after a re-review".
7. Milestone carrier: "uses no attempt and is not relaunched" changed to "uses an attempt and is relaunched".
8. v2 exclusion: the doc's `.oat/projects` pathspec renamed. Separately, the test's extracted `.oat/projects` exclusion was dropped before hashing, so the executed hash comparison failed.

### Task p11-t02: Bookkeeping-only branch in the planning gates and the shared artifact-review loop

**Status:** completed
**Executor:** phase-implementer:rgi-p11-impl-20261102-01
**Handle:** direct:rgi-p11-impl-20261102-01:p11-t02
**Intent:** Add the all-bookkeeping branch beside the `onFailure` policies in the Gate Execution sections of quick-start, plan, import-plan, brief, goal, lite, discover and design, and beside the fix and retry rules of the plan-writing Auto Artifact-Review Loop. Name it in the brief and goal Step 3.6 dispositions. Record the gate outcome in the quick-start and brief carriers. Vendor the shared definition into each skill. Bump the five skills p10 did not bump (discover, design, plan, import-plan, plan-writing), and pin all of it.
**Files:** the nine planning `SKILL.md` files and their `references/docs/bookkeeping-findings.md` links, `.agents/docs/autonomy-contract.md` (coverage rows), `packages/cli/src/commands/init/tools/shared/bookkeeping-findings-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts` (version pins), `packages/cli/src/validation/named-skill-load-contract.test.ts` (link count comment).
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** 3ca5ed4f80866865123f5d38da5a57baee54f37d
**Proof:** isolated-HOME contract suites 1151/1151 (27 files) exit 0; `oxfmt --check '.agents/skills/**/*.{md,mjs,js,cjs}'` exit 0; `pnpm run check:skill-bumps` exit 0 after the commit (17 changed skill and agent role bumps: discover 2.2.12, design 2.3.9, plan 1.4.20, import-plan 1.4.22, plan-writing 1.2.39; the other planning skills keep their p10 bump).

**Known Unknown settled (which planning skills restate the retry rules).** All nine named skills do:

- Eight restate the gate block-and-retry rule in Gate Execution: quick-start, plan, import-plan, discover, design, brief, goal and lite.
- The artifact-review retry loop lives once, in plan-writing's Auto Artifact-Review Loop. Quick-start, plan, import-plan, lite, brief and goal load that loop. Brief and goal also restate their dispositions in Step 3.6.

**Shape of the change.**

- **Gate Execution.** In each of the eight skills, one paragraph follows the `warn` bullet. A receive-eligible `blocked` result settled at receive as bookkeeping-only has satisfied the gate: skip `onFailure`, count no attempt, no rerun. Quick-start and brief persist it as `allowed/passed` with a new carrier list item. Goal holds it as an allowed `passed` outcome for Step 3.7, so the milestone `plan` carrier still waits for approval.
- **plan-writing.** Step 4 gains a bookkeeping-only bullet for the `plan` target, checked before the fix bullets. It makes one tracking-file commit, starts no new attempt and consumes no retry. Interactive runs still offer Medium and Low edits first. Step 6 records `passed` with the note and never reports it as clean. The `analysis` target is untouched, because analysis artifacts are not project tracking files.
- **Coverage.** Eight `* -> NG` coverage rows cover the new links under the inventory's skill roots. plan-writing is not one of them. The named-skill inventory comment now counts eleven links onto the shared doc. The realpath count of shared docs stays 9.

**Negative controls** (each neutralized in the working tree, the suite run, then restored byte-identical; 1 of 61 failed each time):

1. quick-start: "and do not re-run the gate" changed to "and re-run the gate".
2. discover: "skip `onFailure`" changed to "apply `onFailure`".
3. lite: "count no attempt" changed to "count the attempt".
4. goal: the hold-as-`passed` clause cut.
5. brief: the carrier list item removed.
6. plan-writing step 4: "starts no new review attempt and consumes no retry" changed to "starts a new review attempt and consumes one retry".
7. plan-writing step 6: "never report it as a clean review" changed to "report it as a clean review".
8. design: the vendored link removed. The vendoring test failed.

### Task p11-t03: Brief contract, autonomy rows and workflow docs

**Status:** completed
**Executor:** phase-implementer:rgi-p11-impl-20261102-01
**Handle:** direct:rgi-p11-impl-20261102-01:p11-t03
**Intent:** State the settlement where the brief contract restates the retry and attempt rules: section 5's review ladder, section 12.5's goal routing and section 12.8's successor rule. Update the autonomy rows that govern the changed paths. Document the rule, and where it applies, in the workflow docs. Pin the contract and rows.
**Files:** `.agents/skills/oat-project-brief/references/brief-contract.md`, `.agents/docs/autonomy-contract.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`, `apps/oat-docs/docs/workflows/projects/reviews/review-flavors.md`, `apps/oat-docs/docs/workflows/advanced/workflow-gates.md`, `apps/oat-docs/docs/workflows/advanced/autonomy.md`, `apps/oat-docs/docs/workflows/approvals-and-automation.md`, `apps/oat-docs/docs/workflows/projects/execution/implementation-execution.md`, `apps/oat-docs/docs/workflows/projects/execution/execution-skills.md`, `packages/cli/src/commands/init/tools/shared/bookkeeping-findings-contracts.test.ts`.
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** e35bb85bb20b2888e8d0455e1757dd52d15cb1b6
**Proof:** isolated-HOME contract suites 1170/1170 (27 files) exit 0; `pnpm --filter oat-docs docs:check` exit 0 (0 errors, no warnings on the new lines); markdownlint over the seven changed pages exit 0; `pnpm run check:skill-bumps` exit 0 after the commit (17 bumps; brief keeps its p10 bump).

- **Brief contract.**
  - Section 5 settles a bookkeeping-only result at receive. That settlement is not a correction round and turns no other finding into acceptance.
  - Section 12.5: such a result queues no fixes and never takes the queued-fix route. A settled exit gate records `allowed`/`passed`, and both settlements stand only while `oat project delivery check` reads the evidence fresh.
  - Section 12.8: a goal-path bookkeeping fix is a bookkeeping successor, and a fix the section would call substantive is not bookkeeping.
- **Autonomy rows.**
  - Gate rows QS-12, LITE-09, BRIEF-10, GOAL-10, DISC-08, DES-08, PLAN-11, IMPORT-09 and IMPLEMENT-18 now say an all-bookkeeping `blocked` result is settled without a stop, with no attempt and no relaunch.
  - Review-loop rows QS-11, LITE-08, BRIEF-09, GOAL-09, PLAN-09 and IMPORT-08 record such a result `passed` with no re-review and no retry.
  - IMPLEMENT-12 continues to the exit gate. IMPLEMENT-12 and IMPLEMENT-18 carry the guard: a bookkeeping repair never infers completion, waives HiLL, grants approval or accepts an unresolved Critical.
  - PRFINAL-03 and COMPLETE-03 needed no change, because a settled final review is `passed`.
  - The IMPLEMENT-18 cell grew past the table's widest cell, so oxfmt re-padded the gate inventory table: 144 lines changed, 17 with `git diff -w`.
- **Docs.**
  - `workflows/projects/reviews/index.md` gains a "Bookkeeping-only findings" section: the rule, what counts, a table of the paths it applies to, freshness and the autonomy guard. Its phase-gate, artifact-loop and complexity-review text points to that section.
  - One paragraph or bullet points to it from each of `review-flavors.md`, `workflow-gates.md` (`onFailure` and `maxAttempts`), `autonomy.md`, `approvals-and-automation.md`, `implementation-execution.md` (budget exhaustion) and `execution-skills.md`.
  - `README.md` and the package READMEs do not describe review or gate retry behavior, so they are unchanged.

**Negative controls** (each neutralized in the working tree, the suite run, then restored byte-identical; 1 of 80 failed each time):

1. DES-08: the bookkeeping clause removed.
2. IMPLEMENT-12: "no adequate route stops" changed to "continues".
3. Brief contract section 5: "not a correction round" changed to "a correction round".
4. Brief contract section 12.5: "never takes the first route" changed to "takes the first route".

### Task p11-t04: Walkthrough of the #233 incident under the amended gate text

**Status:** no-change
**Executor:** phase-implementer:rgi-p11-impl-20261102-01
**Handle:** direct:rgi-p11-impl-20261102-01:p11-t04
**Intent:** Find the #233 incident in recorded history. Trace its blocking gate through the amended text step by step: provenance, Step 1.5, Reviewed Head, the receive branch and the gate owner's branch. Classify each finding against the shared definition, including the operator's pointer decision. Show whether the gate is satisfied with no attempt and no relaunch, now that p11 adds implement's and the planning skills' branches. Report rather than force a finding that does not qualify.
**Files:** this journal only. The walkthrough is the record, so no implementation commit exists.
**Proof command:** `gh api -H 'Accept: application/vnd.github.raw' 'repos/tkstang/personal-agents/contents/.oat/projects/shared/executor-reminders-pilot/reviews/artifact-plan-review-2026-08-28T225920Z.md?ref=5b7fa0eac18bc6b7dac6f49820290af8fe020e6c'`

#### Walkthrough A: the #233 incident (does not qualify)

**Finding the incident.**

- Issue #233 reports its evidence only in generalized form. It cites a plan gate that blocked on a design ledger row reading `passed`, and says "Two further full design review rounds were run purely to earn a later 'zero-Important' ledger event".
- Issue #232 was filed one second earlier (2026-08-29T19:35:48Z; #233 at 19:35:49Z) and names the run: "a design-artifact gate (round 8 of an artifact review loop)".
- `gh search commits` across the operator's repositories finds the project: `tkstang/personal-agents`, `.oat/projects/shared/executor-reminders-pilot` (spec-driven). There, on 2026-08-28, are design gate rounds 1–6, plan gate attempt 1, design rounds 7 and 8, then plan gate attempt 2. On 2026-08-29 at 19:32, that project's retro recorded "the decision that bookkeeping findings are fixed without re-review (RP-04)" (`44ff1503c`), three minutes before #233 was filed.
- Stoa memory and vault searches returned no record of the incident. The memory search was not degraded.

**The blocking gate.**

- Plan gate attempt 1: run `ad3d89ca-d6f4-4946-b43b-587f38b503ba`, target `codex-5-6-sol-xhigh`, threshold `important`, `onFailure: block`, attempt 1 of 2.
- Artifact `reviews/artifact-plan-review-2026-08-28T225920Z.md`, committed in `5b7fa0eac18bc6b7dac6f49820290af8fe020e6c`.
- `Findings: 0 critical, 3 important, 3 medium, 0 minor`.
- History's receive (`0a02c400755439d0fa9f0b405761c70bd63de429`) is in that project's `implementation.md` under "Review Received: plan (artifact, gate attempt 1)".

**Under the amended text** (`oat-project-plan` Gate Execution, then review-receive):

1. **Gate Execution item 5.** Assume today's envelope: `status: blocked`, `receiveEligible: true` and a non-null `handoff`, so receive is invoked. The run predates some envelope fields.
2. **Receive Step 1, provenance.**
   - `oat_review_type: artifact`, `oat_review_scope: plan`.
   - `oat_review_invocation: gate`, `oat_gate_target: codex-5-6-sol-xhigh`, `oat_gate_run_id` as above.
   - The artifact has no `oat_review_head_sha`, so the Reviewed Head is `-`.
3. **Step 1.5.** The artifact uses the retired tiers: `### Important`, `### Minor` and the `important`/`minor` count line. Receive stops until they are renamed `High` and `Low`. The rename changes no finding or count, and the receipt keeps the reported counts.
4. **Step 2.** 0 Critical, 3 High, 3 Medium, 0 Low. Not a clean pass.
5. **Step 2.6, bookkeeping-only mode (checked first).** No finding carries a `(bookkeeping)` mark. Each finding against `references/docs/bookkeeping-findings.md`:
   - **I1 (High), "The plan claims the upstream design gate passed, but the cited review is blocking"** (`plan.md:904`, the design row `passed` for `artifact-design-review-2026-08-28T223615Z.md`, which reported 0/4/2/0). Not bookkeeping, for three independent reasons:
     - Its Fix asks to "run a new design artifact review … Record `passed` only on a new zero-blocking review event". That is a **missing review**, an exclusion.
     - The only record correction it admits is moving that design event from `passed` to `fixes_completed`, which is what history did in `0a02c4007`. That moves another event's status backward, which limit 3 forbids ("monotonically (never moving a status backward)").
     - It is at best doubtful, and a doubtful finding is not bookkeeping.
     - The operator's pointer decision does not apply: no resume pointer is involved.
   - **I2 (High), destructive rollbacks** (`plan.md:673`). It asks for snapshot-and-restore steps in plan tasks p03-t04 and p03-t06 and the launchd task, under FR2, FR6 and NFR4. Plan task content is outside the tracking sections of `plan.md` (limit 1), and it is a content change. Not bookkeeping.
   - **I3 (High), no safe handoff for the redacted approval handle** (`plan.md:715`). It asks for a handle lifecycle and a new test. Content. Not bookkeeping.
   - **M1, M2, M3 (Medium).** Each asks for content: a missing `verified → accepted` finalization step, an authenticated post-rotation HTTP probe, and a docs-index checker that can fail. Not bookkeeping.
   - Result: five findings are content and the sixth is excluded, so the mode is skipped entirely. Every finding, I1 included, follows the artifact mode, as in history.
6. **Gate Execution item 6 (`oat-project-plan`).**
   - The new paragraph applies only to a result receive settled as bookkeeping-only, so it does not apply.
   - `block` applies: attempt 1 of 2 is consumed and the gate is re-run after remediation.
   - History matches. The plan was revised (`0a02c4007`). I1's missing review drove design gate rounds 7 (`3407de32c`) and 8 (`bc0fce1b3`). Plan gate attempt 2 followed (`1338f7a41c7e958d40dc789e77ace87db0a3aca6`).
7. **The follow-on rounds do not qualify either.**
   - Design round 7 (`artifact-design-review-2026-08-28T232718Z.md`, run `8e24dbed-…`) reported 0/2/2/0. Its High findings ask for a typed ingress contract for `diffInfrastructure` and a consistent closed error-code set in `design.md`.
   - Design round 8 (`…T233302Z.md`, run `dd951814-…`) reported 0/0/3/1, all `design.md` content.
   - `design.md` is a requirement artifact and never a tracking file (limit 1). #233 says the two further rounds "each found only Minor wording", but the recorded round 7 has two High content findings.
   - Plan gate attempt 2 (`…T234917Z.md`, run `72076952-…`) reported 0/4/2/0. Five findings are content. Its M2 asks to rewrite the `passed` definition in the Reviews status explanation, which changes a contract and is doubtful at best.

**Outcome.** The amended rule does **not** settle #233's blocking gate, and it should not. The brief characterizes #233 as "a blocking gate whose only findings are such records". The recorded plan gate result had one ledger finding beside five content findings, and that ledger finding demanded new review evidence. Under the definition's exclusions (a missing review, and no backward status move), the result follows today's flow: one attempt used, the gate relaunched and the extra design rounds run. The issue's real cost, two design rounds "to earn a later zero-Important ledger event", is the missing-review class that the operator chose not to settle without review when verified settlement was dropped. This does not meet the "no attempt, no relaunch" half of the exit evidence for #233. The incident's facts do not support it, and the walkthrough reports that rather than widening the definition.

**Reproduce.**

- Artifacts: `gh api -H 'Accept: application/vnd.github.raw' 'repos/tkstang/personal-agents/contents/.oat/projects/shared/executor-reminders-pilot/reviews/<artifact>?ref=<commit>'` with the artifact and commit pairs above (`5b7fa0eac…`, `3407de32c51574474b2e6f215e7b705a8dfe4acb`, `bc0fce1b34b11a3cdd2a5f448a932baae3996a42`, `1338f7a41…`).
- History's receive and the design-row change: `gh api repos/tkstang/personal-agents/commits/0a02c400755439d0fa9f0b405761c70bd63de429`.

#### Walkthrough B: a qualifying blocking gate, end to end through implement's new branch

p10 traced the `wave-skills-promotion` p05 phase gate through review-receive. Its round-3 correction said the run and the relaunch disappear end to end only once implement's phase-gate loop gets the branch. That branch is now in place. Facts are from `git show 4578e261a:.oat/projects/shared/wave-skills-promotion/...`:

- `oat_phase_review_gate`: `phases: ['p05']`, `exit_nonzero_on: important`.
- Retry limit: the default 2.
- Gate run `811c64e3-d0df-47ca-b021-c89f4810c2ee`, target `codex-5-6-sol-max`, reviewing `b0824ce6d22c..17a56f3945f2`.
- `Findings: 0 critical, 1 important, 0 medium, 0 minor`. The only finding is the stale `state.md` routing.

1. **Optional External Phase Review Gate.** The gate runs after both Step 7 halves and returns `blocked`. Assume today's envelope with all three receive-eligibility conditions, as in A.1.
2. **Receive.** p10's trace applies unchanged:
   - the Step 1.5 tier rename;
   - H1 classified as bookkeeping (pointer copied from the journal's `oat_current_task_id: p06-t01`, counter 23/27, progress labels, the `state.md` summary line a progress label; no exclusion; limits 1–3 hold);
   - one `state.md`-only fix commit;
   - the receipt Outcome `passed — bookkeeping-only fixes applied at receive (reviews/archived/p05-review-2026-07-18T184321Z.md)`;
   - the p05 event `passed` with Reviewed Head `-`.
3. **Implement, `blocked` with only bookkeeping findings** (the new bullet, checked before today's `blocked` bullet). The gate has passed for p05:
   - no fixes are routed to the phase implementer;
   - neither root review nor the gate is re-run;
   - no gate retry round is consumed, so 0 of 2 are used;
   - the receipt and the gate's terminal line keep the raw `0/1/0/0` and verdict BLOCKING;
   - a phase gate writes no carrier.
4. **Step 7b phase row transition.** A `blocked` gate settled as bookkeeping-only counts as a passed gate. Nothing is queued, so the bookkeeping commit that records the gate sets p05 `complete`. Execution then reaches the p05 HiLL checkpoint, which stays pending.
5. **Result.** Relaunch run `c221ce46-309b-462c-9ec6-7a393808750d`, its artifact `p05-review-2026-07-18T185045Z.md` and its `passed` row never happen, end to end: one gate run fewer and no retry round used.

**The exit gate path, by text.** Neither incident is an implement exit gate, but its branch was traced on the same terms. After a durable receive, a bookkeeping-only `blocked` envelope persists `allowed/passed`. `attempts_completed` is unchanged, and Step 5's `onFailure` is never reached. The fix commit falls inside the effective-delta v2 exclusion (`.oat/projects`), so the generation stays fresh. A new p11 test executes that last point against a scratch repository.

### Task p11-t05: Lockstep 0.3.44 release bump and the bookkeeping decision record

**Status:** completed
**Commit:** 47264c1bba454e291ec92cfd950a8b9322096e7c
**Executor:** phase-implementer:rgi-p11-impl-20261102-01
**Handle:** direct:rgi-p11-impl-20261102-01:p11-t05
**Intent:** Bump the five lockstep public packages to 0.3.44 (`origin/main` is at 0.3.43), together with `packages/cli/assets/public-package-versions.json`. Record a decision with `oat decision new` stating the rule, its exclusions and limits, the operator's pointer decision and why verified settlement was dropped. Regenerate the decision index.
**Files:** `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `.oat/repo/reference/decisions/DR-261102-bookkeeping-only-review.md`, `.oat/repo/reference/decisions/index.md` (regenerated by `oat decision regenerate-index`, not hand-edited).
**Proof command:** `pnpm release:check-versions && pnpm release:validate`

- `oat pjm doctor --json` reported `adoption.state: declared` before the decision write. Read `.oat/repo/reference/decisions/AGENTS.md` and the index. The related records are `DR-261011-bookkeeping-successors-keep` (12.8 successors) and `DR-260928-exclude-project-and-repository` (exit-gate effective delta). The new record extends both and contradicts neither.
- Decision `DR-261102-bookkeeping-only-review` (accepted): "Bookkeeping-only review findings settle at receive without a rerun".
- No test or doc pins the package version, so no other file changed. `pnpm release:check-versions` and `pnpm release:validate` both exited 0 (5 public packages validated at 0.3.44).

## Phase p07: Exact-event consistency, provenance and pending reviews

**Status:** pending

## Phase p08: Gate convergence visibility and classification reporting

**Status:** pending

## Phase p09: Non-goal closeout freshness for every required receipt

**Status:** pending

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

- run/v1 · request=rgi-p01-impl-20261101-01 · scope=project:review-gate-integrity-goal:p01 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p01-rev-20261101-01 · scope=project:review-gate-integrity-goal:p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p01-fix-20261101-01 · scope=project:review-gate-integrity-goal:p01 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p01-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=resume:rgi-p01-impl-20261101-01 · observed=~ · match=~
- run/v1 · request=rgi-p01-rev-20261101-02 · scope=project:review-gate-integrity-goal:p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p02-impl-20261101-01 · scope=project:review-gate-integrity-goal:p02 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p02-rev-20261101-01 · scope=project:review-gate-integrity-goal:p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p02-fix-20261101-01 · scope=project:review-gate-integrity-goal:p02 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p02-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=resume:rgi-p02-impl-20261101-01 · observed=~ · match=~
- run/v1 · request=rgi-p02-rev-20261101-02 · scope=project:review-gate-integrity-goal:p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p02-fix-20261101-02 · scope=project:review-gate-integrity-goal:p02 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p02-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=resume:rgi-p02-impl-20261101-01 · observed=~ · match=~
- run/v1 · request=rgi-p02-rev-20261101-03 · scope=project:review-gate-integrity-goal:p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p02-rev-20261102-04 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p10-impl-20261102-01 · scope=p10 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p10 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p10-fix-20261102-01 · scope=p10 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p10 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=rgi-p10-impl-20261102-01 · observed=~ · match=~
- run/v1 · request=rgi-p10-fix-20261102-02 · scope=p10 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p10 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=rgi-p10-impl-20261102-01 · observed=~ · match=~
- run/v1 · request=rgi-p10-rev-20261102-01 · scope=p10 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p10 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p10-rev-20261102-02 · scope=p10 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p10 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p10-rev-20261102-03 · scope=p10 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p10 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

<!-- orchestration-runs-end -->

## Reviews and Gates

<!-- Receipts for final, milestone and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

### Review Received: plan

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/artifact-plan-review-2026-11-01T214129Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

- No findings. The `oat-project-goal` lifecycle gate (run `5e3ad377-2f84-4f4d-8906-f8577b7a604e`, target `codex-6-sol-xhigh`, `gpt-6.1-sol` xhigh, cross-family achieved) reviewed the brief bundle at `cbc8836c7ca14d56742831a13fc0cd8e1fba2057` for m01 (`p01, p02, p03, p04, p05`). It noted that main commit `1299755e4` touches `oat-project-implement` (retry-limit argument hint and version bump), which implementation reconciles at phase start.

**Outcome:** passed

- Gate `oat-project-goal` (plan, m01): `ok`, `review_completed_gate_passed`, threshold `high`, counts 0/0/0/0, receive-eligible, received 2026-11-01.
- Brief approved 2026-11-01 by user at `cbc8836c7ca14d56742831a13fc0cd8e1fba2057`; `oat_milestone_gates.m01.plan` written `allowed` / `passed`.

- Gate `oat_phase_review_gate` (code, p02): `review_failed`, outcome `unexpected_post_selection_failure`, run `c9c091b6-d051-428b-a998-a95b68b37d78`, target `claude-opus-5-5-high` (cross-family from the `gpt-5.6-sol-high` producer). The target reported "You've hit your weekly limit · resets 11am (America/Chicago)", so no artifact was produced and no retry was consumed. The phase stays in_progress; this is an operator boundary (wait for the reset, or explicitly route another independent target).

- Operator routing (p02 phase gate, 2026-11-01): the operator's orchestrator directed this gate attempt to `--target cursor-opus-5-5-high`, because the configured selection `claude-opus-5-5-high` was unavailable (run `c9c091b6-d051-428b-a998-a95b68b37d78`, `review_failed`, no attempt consumed). Cursor-hosted Claude is billed through Cursor, and the target stays cross-family from the `gpt-5.6-sol-high` producer. This is one-off routing for this gate only, not a configuration change. If it also fails for availability, fall back to waiting for the 11am CT reset and rerunning unchanged.

### Review Received: plan (m01 amendment)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/artifact-plan-review-2026-11-02T155547Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

- No findings. The `oat-project-goal` lifecycle gate (run `803a6f3e-a36a-4bd8-a4d8-fc2047ee60aa`, target `codex-6-sol-xhigh`, `gpt-6.1-sol` xhigh, cross-family from the declared `claude-opus-5-5` producer) reviewed the amended brief bundle at `b2a38a09005e35818eccfa4191ad97444316e020` for m01 (`p01, p02, p10, p11`).

**Outcome:** passed

- Gate `oat-project-goal` (plan, m01 amendment): `ok`, `review_completed_gate_passed`, threshold `high`, counts 0/0/0/0, receive-eligible, received 2026-11-02.
- The 2026-11-02 amendment withdrew the pending p02 phase gate (run `c9c091b6-d051-428b-a998-a95b68b37d78`); it needs no rerun, and the optional phase gates are dropped.

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

- p01 review L2 (Low): `- **L1:** text` list items parse with title `L1:` and no explicit ID. Deferred to p08, which owns the stable finding key over p01's records. Trigger: p08 start.
- p01 review round 2 L1 (Low): a wrapped or nested detail line under a bold finding title is refused as orphaned, and the reviewer contract does not warn about the shape. It fails closed. Deferred. Trigger: the first observed refusal of this shape in a real gate run, or p08.
- p01 review round 2 L2 (Low): explicit-ID duplicate refusal is order-dependent (a plain list finding before `**M1 — …**` is refused as a duplicate). It fails closed. Deferred to p08, which owns finding identity and keys.
- p02 review round 3 M1 and L1 to L4: closed without action by the 2026-11-02 brief amendment, which retires the verifier they concern (operator-approved scope change; see the brief's Decisions).
- p01 review L3 (Low): the gate JSON validation-failure envelope carries only `message`, not the typed refusal `code`. Deferred: no consumer branches on it yet (Feature Planning Triage). Trigger: the first consumer (m03 or later) that needs the code without matching message text.
- p10 review L1 (Low): after a bookkeeping-only goal integrated-review receive whose delivery check then reports stale, the `passed` row and the receipt note stay on record and Step 8 keeps skipping that artifact. No re-review is skipped (the stale result forces a new integrated review), and no contract source requires the record to change; amending the receipt in place would itself be a journal rewrite. Deferred. Trigger: the first real stale fallback after a bookkeeping-only receive, or m03 (convergence).

## Deviations from Plan / Design

Document any intentional deviations from the brief. Include accepted review findings where the shipped implementation is source of truth and the brief needs alignment.

| Phase / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| -------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -              | -               | -                    | -                 | -      | -               | -         |

## Final Summary (for PR/docs)

Filled at terminal closeout.

## References

- Brief: `plan.md`
- Research: `references/research/`
- Project log: `project-log.md`
