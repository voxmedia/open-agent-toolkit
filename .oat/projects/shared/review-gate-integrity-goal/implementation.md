---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-02
oat_current_task_id: p10
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
| p10   | pending   | 1     | 0/1      |
| p11   | pending   | 1     | 0/1      |
| p07   | pending   | 1     | 0/1      |
| p08   | pending   | 1     | 0/1      |
| p09   | pending   | 1     | 0/1      |

**Total:** 2/7 phases accepted

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

**Status:** pending

## Phase p11: Implement and planning paths, docs and release

**Status:** pending

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
