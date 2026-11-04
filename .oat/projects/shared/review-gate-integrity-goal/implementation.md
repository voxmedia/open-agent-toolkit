---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-03
oat_current_task_id: p-rev3-t04
oat_generated: false
oat_template: false
---

# Implementation: review-gate-integrity-goal

**Started:** 2026-11-01
**Last Updated:** 2026-11-03

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

| Phase  | Status      | Units | Accepted |
| ------ | ----------- | ----- | -------- |
| p01    | completed   | 1     | 1/1      |
| p02    | completed   | 1     | 1/1      |
| p10    | completed   | 1     | 1/1      |
| p11    | completed   | 1     | 1/1      |
| p07    | completed   | 1     | 1/1      |
| p12    | completed   | 1     | 1/1      |
| p13    | completed   | 1     | 1/1      |
| p-rev1 | completed   | 1     | 1/1      |
| p-rev2 | completed   | 1     | 1/1      |
| p-rev3 | in_progress | 1     | 0/1      |
| p08    | pending     | 1     | 0/1      |
| p09    | pending     | 1     | 0/1      |

**Total:** 9/12 phases accepted

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

Correction (m01 integrated review L1): this receipt applied m01's unreleased bookkeeping-only outcome to m01's own review, contrary to the brief's "No self-application in m01" decision. Under the installed ladder the result is the same: a 0/0/0/2 review passes (no Critical, High or Medium), and the root fixed the two Lows directly. Read the outcome as `passed (Lows addressed now)`; the bookkeeping-only note was applied ahead of release.

## Phase p11: Implement and planning paths, docs and release

**Status:** completed
**Base:** ba6405690aa0c5a980c5dac624dba4026c1560b8
**Head:** 5599af21d4927c7d39c668b9d1662509e5d3b403
**Executor:** phase-implementer:rgi-p11-impl-20261102-01

Worktree: the project branch checkout. Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`, per the operator's 2026-11-02 routing). Parallelism assessment: rung 3, one phase implementer. Rung 1 does not apply, because no parallel groups are declared. Rung 2 does not apply: the implement, planning-skill and docs slices all edit `autonomy-contract.md`, the shared contract tests and the skill version pins, so they fail the independence test. Rung 4 does not apply, because the phase repeats one shared branch across many skills plus a release. `origin/main` has not moved since the p10 base merge (checked at phase start).

Phase verification at the head: pass. The code state is `47264c1bb`; only journal commits follow it. The DoD gate list ran in CI order and each command exited 0:

1. `pnpm check`: 0 of 11 cached.
2. `pnpm type-check`: also forced uncached, 0 of 11 cached.
3. `pnpm test:evidence`: forced, isolated HOME, 0 of 12 cached. CLI 438 test files passed.
4. `pnpm build`: 5 of 5 cached (replayed). The forced `test:evidence` and `build:docs` runs executed all five package builds uncached.
5. `pnpm run check:skill-bumps`: 17 changed skill and agent role bumps against `origin/main`.
6. `pnpm release:check-versions`, after `git fetch origin main`.
7. `pnpm release:validate`: 5 packages at 0.3.44.
8. `pnpm build:docs`: also forced uncached, 0 of 6 cached.
9. The docs-index regeneration plus `git diff --exit-code -- apps/oat-docs/index.md`.

Also exited 0: `pnpm lint`, `pnpm format`, `pnpm test:skills`, `pnpm oat:validate-skills` (68 skills) and the isolated-HOME contract suites (`src/commands/init/tools/shared`, `src/validation`, 1170/1170). `oat project journal check --at review --scope p11` is ok. No post-commit recovery was needed (0 of 10 used). Concern: #233 does not qualify (p11-t04).

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

### Review Received: p11

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/p11-review-2026-11-02T210607Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 4

Reviewer request `rgi-p11-rev-20261102-01` (`oat-reviewer-claude-claude-opus-5-5-high`); reviewed range `a439d9289d4f5b9b2a2fb660009e366cfd2b273f..204a24f697c61947b64176a4516f33904f3261bf`; reconnaissance not attempted. Every path p11's Intent names carries the branch and names the shared definition; both walkthroughs trace accurately (#233 counter-example checked against `tkstang/personal-agents`, the substitute against `4578e261a`); contract suites 1170/1170; three negative controls each failed one test; bumps, lockstep 0.3.44, decision index, sync dry run, docs index and journal check all clean. Lows addressed now by the root in `395b90677db9487e42f01d31b045f4819f3d85ae`:

- L1 (Low): the docs table said the settled milestone exit carrier stands "while delivery check reads `ok`" → fixed: it reads `exit` fresh, and only the integrated review waits for `status: ok`.
- L2 (Low): limit 3 named only review-receive as the `passed` writer, but plan-writing's loop step 6 also writes it for a structured `plan` review → fixed: one sentence beside the pinned limit names step 6 as that receive branch; pinned (negative control: neutralizing it fails the pin).
- L3 (Low): the decision record dropped the archived-path inclusion and stated limit 3 loosely → fixed: inclusions restored verbatim, limit 3 restated, the plan-writing loop named as a settling owner; `oat decision regenerate-index` left the index unchanged.
- L4 (Low): the exit-gate freshness sentence omitted a non-default `projects.root` → fixed in implement and the docs page: it holds under the default root; outside it, or for a v1 generation, the generation goes stale (fails closed); pinned (negative control: neutralizing it fails the pin).

Root verification after the fix: isolated-HOME contract suites 1170/1170, `pnpm check`, `pnpm run check:skill-bumps`, docs-index regenerate plus `git diff --exit-code`, `pnpm lint` and `pnpm format` all exit 0.

**Outcome:** passed (Lows addressed now)

### Task p11-t06: Address p11 review Lows

**Status:** completed
**Executor:** root
**Source review:** `reviews/archived/p11-review-2026-11-02T210607Z.md` (L1, L2, L3, L4)
**Intent:** Fix the four Lows of the passing p11 review at receive: the docs exit-carrier cell, the plan-writing receive point beside limit 3, the decision record's inclusions and limit 3, and the exit-gate freshness qualifier for a non-default `projects.root`.
**Files:** `.agents/docs/bookkeeping-findings.md`, `.agents/skills/oat-project-implement/references/completion-and-closeout.md`, `.oat/repo/reference/decisions/DR-261102-bookkeeping-only-review.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`, `packages/cli/src/commands/init/tools/shared/bookkeeping-findings-contracts.test.ts`.
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** 395b90677db9487e42f01d31b045f4819f3d85ae
**Proof:** contract suites 1170/1170; negative controls for the two new pins each failed (exit 1) and were restored; `pnpm check`, `check:skill-bumps`, docs-index freshness, `pnpm lint`, `pnpm format` exit 0.

Late-fix rule: the m01 exit gate (run `d434e7e7`, M1) found the p11 `**Head:**` still at `8a97fe85d`, which left this review-fix commit outside every anchored m01 range. No later phase has a `**Base:**`, so the head is advanced to `395b90677db9487e42f01d31b045f4819f3d85ae`, base unchanged.

Late-fix rule (second advance): The head advanced again to `efba7a82519fbd12beae8a42c302220586b140b2`, the receive commit that closes the exit-gate review fixes, so that the gate artifacts committed by the gate CLI after `395b90677` fall inside the reviewed range (see `## Reviews and Gates`).

Late-fix rule (third advance): the second advance commit rewrote a recorded journal line, which the append-only rule and section 12.8 refuse after a reviewed head. Commit `1a5a37684f05492470952fdc54359a082ac9cc58` restored that line and appended the correction, so the head advances to it and the gate reviews a range that contains every rewrite.

### Task p11-t07: Address m01 integrated review findings

**Status:** completed
**Executor:** root
**Source review:** `reviews/archived/m01-review-2026-11-02T234808Z.md` (M1, L1, L2)
**Intent:** Close limit 1's review-artifact gap (review artifacts are moved or archived by receive, never edited; no fix edits a review artifact's findings, frontmatter or provenance) with a pin and a negative control; append the self-application correction after the p10 round-3 receipt; correct the p11 Progress Overview row.
**Files:** `.agents/docs/bookkeeping-findings.md`, `packages/cli/src/commands/init/tools/shared/bookkeeping-findings-contracts.test.ts`, `implementation.md`.
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** ea9f1d50db6b022068cc55ca731c31c2df79abf7
**Proof:** contract suites 1170/1170 (exit 0); negative control: trimming the new sentence to "findings." failed the pin (exit 1), restored; `pnpm check`, `check:skill-bumps` and `pnpm lint` exit 0; no new skill bump (every vendoring skill carries its single PR-scoped bump). L1 and L2 are journal corrections in this record's bookkeeping commit.

Late-fix rule (fourth advance): the m01 integrated-review fixes (p11-t07) advance the p11 head to `5599af21d4927c7d39c668b9d1662509e5d3b403`, the record commit that also carries the L1 and L2 journal corrections; the exit gate reruns over it before a new integrated review.

## Phase p07: Exact-event consistency, provenance and pending reviews

**Status:** completed
**Base:** eba04d813a4d342523a6235009019a0c31f880a3
**Head:** 34ebd3ef9c02d90a6797ece84d69b6ab7b54d201
**Executor:** phase-implementer:rgi-p07-impl-20261103-01

The heading keeps its original m01-era name because the journal is append-only; the phase's current name and scope are the brief's `## Phase p07: One row per review event and stranded-row detection`. Worktree: the project branch checkout (`goal/review-gate-integrity-m02`). Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`; task class hard-reasoning, because the phase spans templates, several lifecycle skills, the router and `oat review latest` readers, and a new read-only check whose supersession semantics are subtle). Parallelism assessment: rung 3, one phase implementer. Rung 1 does not apply, because no parallel groups are declared. Rung 2 does not apply: the template, skill and CLI-reader slices share the supersession definition, the contract tests, the skill version pins and the lockstep release bump, so they fail the independence test. Rung 4 does not apply, because the phase adds a new CLI surface. At phase start `origin/main` had moved (#401 docs, #402 backlog triage and the 0.3.45 release bump); it was merged into the branch at the base (`eba04d813`, clean merge), so this phase's lockstep bump must exceed 0.3.45.

Phase verification at the head: pass. The code state is `defaf818a`; only journal commits follow it. `origin/main` has not moved since the base merge (`c42fd95bd`, checked before the version gate). The DoD gate list ran in CI order and each command exited 0:

1. `pnpm check`: 0 of 11 cached.
2. `pnpm type-check`: 5 of 11 cached, then forced, 0 of 11 cached.
3. `pnpm test`: 5 of 12 cached; `pnpm test:evidence`: forced, isolated HOME, 0 of 12 cached, CLI 440 files and 9451 tests, control-plane 14 files.
4. `pnpm build`: 5 of 5 cached (replayed); the forced `test:evidence` executed all five package builds uncached.
5. `pnpm run check:skill-bumps`: 9 changed skills against `origin/main`.
6. `pnpm release:check-versions`, after `git fetch origin main`.
7. `pnpm release:validate`: 5 packages at 0.3.46.
8. `pnpm build:docs`: 6 of 6 cached, then forced, 0 of 6 cached.
9. The docs-index regeneration plus `git diff --exit-code -- apps/oat-docs/index.md`.

Also exited 0: `pnpm lint`, `pnpm format`, `pnpm test:skills`, `pnpm oat:validate-skills` (68 skills) and the isolated-HOME contract suites (`src/commands/init/tools/shared`, `src/validation`, 1185/1185). `oat project journal check --project <this project> --at review --scope p07` is `ok` with no reasons or warnings on both the installed 0.3.45 CLI and the branch build. On this project and on `delivery-evidence-and-knowledge-preflight` the installed and branch `oat project status` recommend the same skill (`oat-project-implement`, `oat-project-complete`), so the check and the reader change block no existing flow there. Exit evidence and controls are in p07-t01 and p07-t02 (scaffold rows, pinned Sol row, duplicate key, clean control, class, `-`, pending and descendant controls, corroboration unavailable, the stranded-row negative control) and p07-t03 (one-writer and reader pins, the one-`design`-row case). No post-commit recovery was needed (0 of 10 used).

Fix verification (rgi-p07-fix-20261103-01, p07-t05..t07; Head advanced from `6598a6e76` under the late-fix rule): each exited 0: isolated-HOME contract suites (28 files, 1186 tests), isolated-HOME CLI `test` (441 files, 9454 tests), `pnpm check` (0 cached), `pnpm type-check` and `pnpm lint` (package tasks uncached; only build dependencies replayed), `pnpm format`, `pnpm run check:skill-bumps` (9 skills), the docs-index regeneration diff, and `oat project journal check --at review --scope p07`.

### Task p07-t01: One placeholder row per review event in the scaffolds

**Status:** completed
**Executor:** phase-implementer:rgi-p07-impl-20261103-01
**Handle:** direct:rgi-p07-impl-20261103-01:p07-t01
**Intent:** Add a `plan` artifact placeholder row to `.oat/templates/plan.md` and `.oat/templates/plan-lite.md`, and stop quick, import and lite scaffolds from carrying the unused `spec`/`design` rows while spec-driven keeps them.
**Files:** `.oat/templates/plan.md`, `.oat/templates/plan-lite.md`, `packages/cli/assets/templates/plan-lite.md` (tracked bundled copy), `packages/cli/src/commands/project/new/scaffold.ts`, `packages/cli/src/commands/project/new/scaffold.test.ts`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new src/commands/project/promote`
**Commit:** cd5750fa5de1f4000f0f975d047c7f95f57a2da9
**Proof:** 167/167 (5 files) exit 0 after `pnpm build` refreshed the bundled assets (the first run failed 24 tests on a stale `assets 0.3.44` bundle from before the base merge, not on this change); CLI type-check and lint exit 0.

**Known Unknown settled (how quick, import and lite drop the `spec`/`design` rows).** A post-copy edit, not a separate template. `applyTemplateReplacements` (`scaffold.ts`) ends with `omitUnusedArtifactReviewRows`, which in quick, import and lite drops only an unclaimed placeholder (Scope `spec` or `design`, Type `artifact`, Status `pending`, Artifact `-`) from the `## Reviews` section; a bound row, any other scope and anything outside the section survive. Spec-driven, brief and goal are untouched. Quick and import share `plan.md` with spec-driven, so one template serves all three; `plan-lite.md` is lite-only, so its rows are removed at the source. The filter also covers `oat project promote` (lite → quick renders `plan.md` through the same function).

Scaffold placeholders now (real templates): spec-driven `spec`, `design`, `plan`; quick, import, lite, brief and goal `plan` only. Negative control: with the filter call neutralized (`return rendered;`), the quick and import cases of the new scaffold test fail (2 of 6), and pass again once restored.

### Task p07-t02: Read-side supersession in the review readers and a read-only ledger check

**Status:** completed
**Executor:** phase-implementer:rgi-p07-impl-20261103-01
**Handle:** direct:rgi-p07-impl-20261103-01:p07-t02
**Intent:** Treat a `received` row as superseded (same Scope, Type and Invocation class, a later recorded round, same or descendant head; `-` rows stay live) in the router's actionability and `oat review latest`, with descendancy precomputed by the CLI caller so the control-plane stays git-free; add `oat review check`, a read-only advisory check that reports superseded rows and duplicate event keys with structured diagnostics.
**Files:** `packages/control-plane/src/state/review-supersession.ts` (+ test), `packages/control-plane/src/{project,types,index}.ts`, `packages/control-plane/src/recommender/router.ts`, `packages/control-plane/src/project.test.ts`, `packages/cli/src/commands/review/{check,head-ancestry,latest,index}.ts`, `packages/cli/src/commands/review/__tests__/{check,latest}.test.ts`, `packages/cli/src/commands/review/__tests__/fixtures/review-gate-integrity-plan-c1a653b97.md`, `packages/cli/src/commands/project/{status,list}.ts`, `packages/cli/src/commands/help-snapshots.test.ts`, `.oxfmtrc.jsonc` (fixture formatter exclusion).
**Proof command:** `pnpm --filter @open-agent-toolkit/control-plane exec vitest run && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review src/commands/project/status.test.ts src/commands/project/list.test.ts src/commands/help-snapshots.test.ts`
**Commit:** 9de8d8e235537c3019bb5b15f6976679350cd86a
**Proof:** control-plane 312/312 (14 files) exit 0; CLI review, status, list and help-snapshot suites 147/147 exit 0; CLI and control-plane type-check and lint exit 0. The pinned fixture is byte-identical to `git show c1a653b97:<plan.md>` below its 9-line provenance comment, and `.oxfmtrc.jsonc` excludes the fixtures directory so the commit hook cannot reformat it.

**Known Unknown settled (where the check lives, which readers apply supersession, how the pure router evaluates descendancy).**

- **Where.** Its own command, `oat review check [--project <path>] [--json]`, beside `oat review latest`. It is read-only and advisory: exit 0 whenever it ran, whatever it reports; exit 1 only when no project resolves or `plan.md` cannot be read. Diagnostics: `superseded_received_row` (the row, its superseding row, `same-head` or `descendant-head`) and `duplicate_event_key` (Scope + Type + Artifact filename claimed by more than one row). Each row report carries `corroboration` (`artifact`, `reviewedHead` match/mismatch/unavailable, `gateRunId`), which never feeds the key. No lifecycle point runs it in m02; readers apply supersession themselves, so routing never depends on running it.
- **Which readers.** One pure rule in `packages/control-plane/src/state/review-supersession.ts`, used by: the project readers (`getProjectState`, `listProjects`), which mark `superseded: true` on a row, a read-side field, never a ledger cell; the router's review-receive actionability (`hasActionableReviewArtifacts`) and `toActiveReviewArtifacts`; `oat review latest` (actionability, so review-receive Step 1's `--actionable-project` resolver skips a superseded event); and `oat review check`. Newest-row readers (final review, integrated review, pr-final Step 2, cleanup) need no change: a superseded row always has a later row of the same Scope and Type.
- **Descendancy in the pure router.** The control-plane never runs git. `reviewSupersessionHeadPairs` lists the distinct-head pairs a ledger needs; the caller answers them. `getProjectState` and `listProjects` take an optional `resolveReviewHeadAncestry`; the CLI supplies one backed by `git merge-base --is-ancestor` (`packages/cli/src/commands/review/head-ancestry.ts`) for `oat project status`, `oat project list`, `oat review latest` and `oat review check`, so every CLI reader answers the same pairs the same way. With no resolver, or a pair git cannot answer, a distinct head counts as not descending and the older row stays live, which is today's behavior (`oat review check` reports the unresolved count under `headAncestry`).

**Probes (branch build, `node packages/cli/dist/index.js`).**

1. This project: `review check --project .oat/projects/shared/review-gate-integrity-goal --json` → exit 0, 24 rows, one diagnostic: `superseded_received_row`, row 16 (final, received, gate `codex-6-sol-xhigh`, `reviews/archived/final-review-2026-11-02T213631Z.md`) superseded by row 17 (final, passed, gate `claude-opus-5-5-high`) at the same head; corroboration `present`/`match`, `gateRunId` `48f5553c-f8fa-4f17-be77-7461789a416c`. No duplicate key: the three artifact-less `plan` rows and the `p07` placeholder form none.
2. Archived project `delivery-evidence-and-knowledge-preflight` → exit 0, 15 rows, one diagnostic: row 9 (p04, received, auto, `a03cecd1`) superseded by row 10 (p04, passed, auto, `90311a40`) at a descendant head, resolved by git (1 pair asked, 0 unresolved). Archived `backlog-wave-5` → one `duplicate_event_key` (rows 6 and 12, `plan/artifact/implementation.md`), a genuine pre-existing double row. The other six archived and shared projects report nothing. No run changed a file (`git status` clean after each).
3. Negative control, scratch repository `/tmp/p07-probe-4jAo` (two commits H1 → H2; a quick project at `pr_open`; `final | received | reviews/final-review-r1.md | H1 | gate | codex-6-sol-xhigh` with the artifact active in `reviews/`, followed by `final | passed | reviews/archived/final-review-r2.md | H2 | gate | claude-opus-5-5-high`). Before the change (released `oat` 0.3.45): `project status` recommends `oat-project-review-receive` ("Unprocessed review feedback exists") and `review latest --actionable-project` returns the stranded artifact, `actionable: true`. After (branch build): `project status` recommends `oat-project-complete`, `review latest --actionable-project` returns `path: null`, and `review check` reports `superseded_received_row`, `descendant-head`, row 2 by row 3, corroboration `present`/`match`. Valid control: with the later row's Invocation changed to `manual`, the branch build still recommends `oat-project-review-receive`, `review latest` returns `actionable: true` and `review check` reports nothing.

**Fixed-outcome controls in the tests.** Pinned Sol row superseded and nothing else reported (`check.test.ts`); duplicate-key fixture (#305 shape, synthetic, labelled so) reported; clean ledger reports nothing; a gate row followed only by a manual round, a `-` Invocation row, and a row followed only by a `pending` placeholder all stay live; a descendant head supersedes through real git ancestry and an ancestor head never does; an unresolvable pair stays live; absent artifact files report `unavailable`, never `mismatch`; the check never edits `plan.md`. The repeated-blocking-gate fixture (`review-supersession.test.ts`, six ledger states after each disposition) leaves only the newest row as a live `received` event; the single-round path is unchanged; the same ledger read without supersession strands round 1.

**Guard can fail.** With `markSupersededReviews` neutralized (never sets `superseded`), 10 of 312 control-plane tests fail: five repeated-gate steps, the regression case, two resolver cases and both stranded-row project-reader cases (which then route to `oat-project-review-receive`). Restored byte-identical; 312/312.

### Task p07-t03: One-writer rule and reader supersession in the lifecycle skills

**Status:** completed
**Executor:** phase-implementer:rgi-p07-impl-20261103-01
**Handle:** direct:rgi-p07-impl-20261103-01:p07-t03
**Intent:** State the event key, the one-writer rule and read-side supersession once in `oat-project-plan-writing`'s Review Table Preservation Rules; have review-provide Step 9 state the one-writer rule from the writer's side and review-receive Step 1 state that a superseded row is never received; have the planning skills (quick-start, plan, import-plan, brief, goal, lite) record a structured plan review on its own event row; pin all of it and show a quick lightweight-design review still records exactly one `design` row.
**Files:** the nine `SKILL.md` files of `oat-project-{plan-writing,review-provide,review-receive,quick-start,plan,import-plan,brief,goal,lite}` (one patch bump each), `packages/cli/src/commands/init/tools/shared/review-event-row-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts` (version pins), `.oat/sync/manifest.json`.
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** 67d8296fc4d9a2bedb53e1f73827748ed1f2d98e
**Proof:** isolated-HOME contract suites 1185/1185 exit 0 (the autonomy inventory and named-skill execution contracts included); `pnpm run check:skill-bumps` exit 0 after the commit (9 changed skills, each one patch bump against `origin/main`: plan-writing 1.2.40, review-provide 1.5.18, review-receive 1.6.16, quick-start 2.3.25, plan 1.4.21, import-plan 1.4.23, brief 1.0.8, goal 1.0.4, lite 1.1.14); `oat sync --scope project` (branch build) refreshed only `.oat/sync/manifest.json` (`oatVersion` 0.3.43 → 0.3.45); provider views are links, so no view content changed.

**Shape.** The rules live once, in plan-writing's Review Table Preservation Rules, beside the existing event-identity bullets: the key from ledger cells alone with `-` artifacts never keying; one writer per event (update the row a gate child or Step 9 wrote; a structured review claims the unbound placeholder and appends only when none remains); and supersession, read-side only, with the class, head and `-` limits and no edit, promotion or deletion. Plan-writing step 6 adds one bullet: the structured `plan` review records on its own row, never on the gate's. The other skills add one sentence each beside today's text. Two pins forced wording choices: p11's pin of step 6's original sentence kept the addition in its own bullet, and the named-skill execution contract classified a backticked `oat-project-review-receive` in Step 9 as a call site, so Step 9 names the skills in plain words.

**Lightweight design.** On the real `plan.md` template rendered for quick (no `design` placeholder), Step 9's documented placeholder-or-append rule records exactly one `design` row; spec-driven claims its placeholder and also ends with exactly one (`review-event-row-contracts.test.ts`, which pins the Step 9 sentence it simulates).

**Pins can fail** (each neutralized in the working tree, the new test file run, then restored byte-identical; 1 of 15 failed each time): plan-writing "never appends a second row" changed to "may append a second row"; plan-writing "Readers that select a review event ignore a superseded row" changed to "still select a superseded row"; review-receive "never receives it or edits its row" changed to "receives it".

### Task p07-t04: Docs, instructions and the lockstep 0.3.46 release bump

**Status:** completed
**Executor:** phase-implementer:rgi-p07-impl-20261103-01
**Handle:** direct:rgi-p07-impl-20261103-01:p07-t04
**Intent:** Document `oat review check`, the `oat review latest` supersession rule, the one-row-per-event scaffolds and the control-plane `ProjectReadOptions` API; record the control-plane "never run git" convention in its `AGENTS.md`; bump the five lockstep public packages from 0.3.45 to 0.3.46 once for m02; confirm the generated docs index is unchanged.
**Files:** `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`, `packages/control-plane/README.md`, `packages/control-plane/AGENTS.md`, `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`.
**Proof command:** `pnpm --filter oat-docs docs:check && pnpm --filter oat-docs docs:lint && pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && git diff --exit-code -- apps/oat-docs/index.md`
**Commit:** defaf818a50b7001e3999d083bef6f2c6a7b92b5
**Proof:** `docs:check` exit 0 (0 errors; the new lines add only the page-wide `provenance` warning class the existing `--project .oat/projects/shared/example` examples already carry); `docs:lint` exit 0 (91 files, 0 errors); docs-index regeneration exit 0 and `git diff --exit-code -- apps/oat-docs/index.md` exit 0 (no reader page added or renamed). The first commit attempt was refused by commitlint (header over 100 characters) with nothing committed; the retry used the same identity and a shorter header.

Instruction files: `packages/control-plane/AGENTS.md` gains one convention (never run git in the package; take commit ancestry from the caller, as Reviews supersession does). No other instruction fact changed: no command, directory, version pin or workflow named in an `AGENTS.md` moved. Lockstep packages `cli`, `control-plane`, `docs-config`, `docs-theme` and `docs-transforms` and `packages/cli/assets/public-package-versions.json` are at 0.3.46 (`origin/main` is at 0.3.45).

### Task p07-t05: (review) Pin the git-ancestry wiring of status, list and latest

**Status:** completed
**Executor:** phase-implementer:rgi-p07-fix-20261103-01
**Commit:** 07a00505b17d9baff5d58ecaacded3e02b4a1009
**Source review:** reviews/archived/p07-review-2026-11-03T184519Z.md (M1)

Intent: no test exercises the default-dependency bindings that give `oat project status` (`status.ts:35`, `getProjectStateWithReviewAncestry`), `oat project list` (`list.ts:81`, `listProjectsWithReviewAncestry`) and `oat review latest` (`latest.ts:472`, `createGitReviewHeadAncestryResolver`) the git ancestry resolver, so a revert to the plain reader would leave the suites green while those readers diverge from `oat review check` on descendant-head rows. Add a real-git test (reuse the `createRepoWithHistory` helper from `check.test.ts`) that runs the three commands through their default dependencies over a `received` gate row at a parent commit and a later gate row at a child commit: status and list do not recommend `oat-project-review-receive`, and latest with `--actionable-project` returns `path: null`. Prove it can fail by swapping one binding back to the plain reader.
Files: `packages/cli/src/commands/project/` and `packages/cli/src/commands/review/` test files (test-only).
Proof: the new test plus `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project src/commands/review`

**Result:** `packages/cli/src/commands/review/__tests__/ancestry-wiring.test.ts` builds a real two-commit repo and runs `oat project status --project-path`, `oat project list --scope shared` and `oat review latest --actionable-project` with only `buildCommandContext` (and list's `processEnv`) overridden. Control: with the later gate row at an unresolvable head all three still surface the `received` round; at the child head status and list stop recommending `oat-project-review-receive` and latest returns `path: null`.
**Proof result:** the proof command passed (66 files, 1837 tests). Can-fail: swapping each binding back to the plain reader in turn (`status.ts` `getProjectState`, `list.ts` `listProjects`, `latest.ts` resolver set to `undefined`) failed the descendant-head test on that command's assertion; each source file was restored and the test passes again.

### Task p07-t06: (review) Correct the stated reason quick, import and lite seed no spec/design rows

**Status:** completed
**Executor:** phase-implementer:rgi-p07-fix-20261103-01
**Commit:** ca7f4183a759b6053b96069253b4b6e2684b4aae
**Source review:** reviews/archived/p07-review-2026-11-03T184519Z.md (L1)

Intent: four places say those modes "never review" `spec`/`design`, but quick's lightweight design can be reviewed (the p07 Exit evidence requires its single `design` row). Reword to: those modes seed no `spec`/`design` placeholder; a review of those artifacts, such as a quick lightweight-design review, appends its own row under review-provide Step 9. Behavior is unchanged.
Files: `.oat/templates/plan.md` (and its tracked CLI asset copy if one exists), `.agents/skills/oat-project-plan/SKILL.md` (already bumped to 1.4.21 on this branch; sync provider views), `packages/cli/src/commands/project/new/scaffold.ts` comments, `apps/oat-docs/docs/workflows/projects/reviews/index.md`.
Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/project/new` and `pnpm --filter oat-docs docs:lint`

**Result:** the four named places now say those modes seed no `spec`/`design` placeholder and that a review of either artifact, such as a quick lightweight-design review, appends its own row under review-provide Step 9. The same overstatement in the `scaffold.test.ts` case comment was corrected as mechanical propagation. `.oat/templates/plan.md` has no tracked CLI asset copy (`packages/cli/assets/templates/plan.md` is gitignored). `oat sync --scope project` changed only `.oat/sync/manifest.json` (`oatVersion` 0.3.46), which is included. Behavior is unchanged.
**Proof result:** the isolated-HOME proof suites passed (30 files, 1298 tests) after a CLI build refreshed the bundled assets; `docs:lint` exit 0 (91 files, 0 errors).

### Task p07-t07: (review) Filter superseded rows in review-receive's CLI-unavailable fallback

**Status:** completed
**Executor:** phase-implementer:rgi-p07-fix-20261103-01
**Commit:** d7549e7db1d95379940abe282be7eb67743e9cda
**Source review:** reviews/archived/p07-review-2026-11-03T184519Z.md (L2)

Intent: the `ls -t "$PROJECT_PATH/reviews/"*.md` fallback in review-receive Step 1 can still pick a superseded `received` round. Add one clause: before processing a fallback candidate, read its `## Reviews` row and skip it when a later row of the same Scope, Type and Invocation class records a review at the same head; a descendant-head case cannot be decided without the CLI, so it stays live.
Files: `.agents/skills/oat-project-review-receive/SKILL.md` (already bumped to 1.6.16 on this branch; sync provider views).
Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`

**Result:** review-receive Step 1 now follows the `ls -t` fallback with one paragraph: read the candidate's `## Reviews` row and skip it when a later row of the same Scope, Type and Invocation class records a review at the same Reviewed Head; a later row at a different head leaves it live, since only the CLI resolves descent; a row whose Invocation or Reviewed Head is `-` is never skipped. `review-event-row-contracts.test.ts` pins the paragraph. `oat sync --scope project` reported no changes (provider views are links).
**Proof result:** the isolated-HOME proof suites passed (28 files, 1186 tests). Can-fail: with the skill restored to its pre-fix text the new pin failed (1 of 16 in that file); the fix text was restored.

### Review Received: p07

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p07-review-2026-11-03T184519Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 3

- M1 (Medium): no test pins the git-ancestry default-dependency wiring of `oat project status`, `oat project list` and `oat review latest`, so a revert would pass the suites while those readers diverge from `oat review check` on descendant-head rows → fix task p07-t05; agreed, the Known Unknown required the readers not to diverge and only a one-off probe shows it today.
- L1 (Low): four places say quick, import and lite "never review" `spec`/`design`, which overstates quick (its lightweight design is reviewable) → fix task p07-t06; the wording could mislead an agent, the behavior is right.
- L2 (Low): review-receive's CLI-unavailable `ls -t` fallback can still select a superseded `received` artifact → fix task p07-t07; one clause closes it for the same-head case.
- L3 (Low, bookkeeping): the journal header `**Last Updated:**` read 2026-11-02 → fixed in this receive's bookkeeping commit (set to 2026-11-03).

Reviewer: fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-p07-rev-20261103-01`, reconnaissance not attempted). It reproduced the pinned Sol row, the archived descendant-head case, the released-CLI negative control and a six-case agreement probe across status, list, latest and check.

**Outcome:** fixes queued: p07-t05, p07-t06, p07-t07

**Outcome:** fixes queued: p07-t05, p07-t06, p07-t07; all three completed (head `34ebd3ef9`) and passed re-review (reviews/archived/p07-review-2026-11-03T190319Z.md)

### Review Received: p07 (re-review of the fix records)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p07-review-2026-11-03T190319Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

Scope: the fix range `6598a6e76..34ebd3ef9` (p07-t05, p07-t06, p07-t07), fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-p07-rev-20261103-02`, reconnaissance not attempted). It confirmed M1, L1 and L2 resolved; for M1 it removed each of the three ancestry bindings in turn and the new test failed on that command's assertion each time, then restored a clean tree.

- L1 (Low): the review-receive fallback clause added by p07-t07 (`.agents/skills/oat-project-review-receive/SKILL.md:163`) does not say the candidate's own row must be `received`, nor name the two Invocation classes → approved deferral to p12 (see Deferred Findings); p12 rewrites this same receive artifact-selection step to consume the gate-named event, and fixing it now would open a third review cycle for a one-clause clarification. The fallback candidates are top-level artifacts, whose rows are not yet `passed` or `fixes_completed`, so the omission does not misroute a processed event.

**Outcome:** passed (deferred items only)

## Phase p12: Exact-event consumption for gate handoffs

**Status:** completed
**Base:** f3a9603f74ee358b80eeb6572085b46975801302
**Head:** 8016d7d98f8799010d40ff497aa526b180508dbf
**Executor:** phase-implementer:rgi-p12-impl-20261103-01

Head advanced from `d99e598dd` to the p12-t05 record commit after the reviewedHead amendment; at that code state `pnpm check`, `pnpm type-check`, `pnpm test:evidence` (0 of 12 cached), the isolated-HOME contract suites, `pnpm lint`, `pnpm format`, `check:skill-bumps`, the forced docs build with the index diff and the p12 journal check all exit 0.

Head advanced from `c92b11dfb` to the p12-t07 record commit after the review fixes p12-t06 and p12-t07 (code state `e67f07e0d`); the contract suites, `pnpm test:evidence` (0 of 12 cached), `pnpm check`, `pnpm type-check`, `pnpm lint`, `pnpm format`, `check:skill-bumps`, `release:check-versions` (after `git fetch origin main`, still `c42fd95bd`), `release:validate`, the forced docs build with the index diff and the p12 journal check all exit 0.

Worktree: the project branch checkout (`goal/review-gate-integrity-m02`). Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`; task class hard-reasoning: a gate result field captured at dispatch, a new fail-closed event resolver, receive Step 1 and eleven adopting gate paths whose prose must stay consistent). Parallelism assessment: rung 3, one phase implementer. Rung 1 does not apply, because no parallel groups are declared. Rung 2 does not apply: the gate, resolver and skill slices share the event contract, the contract tests and the skill version pins, so they fail the independence test. Rung 4 does not apply, because the phase adds a CLI surface and changes gate output. p12 was made concrete at `f3a9603f7` before this start (project log). `origin/main` has not moved since the p07 base merge.

Phase verification at the head: pass. The code state is `7b22eb1f0`; only journal commits follow it. `origin/main` is still `c42fd95bd`, checked by `git fetch origin main` before the version gate. The DoD gate list ran in CI order and each command exited 0:

Correction (p12 review L4, 2026-11-03): the code state at the head is `a7c50a2df` (p12-t05), not `7b22eb1f0`; the numbered DoD list below is the pre-t05 run, and the post-t05 rerun is recorded in the head-advance note. `pnpm release:check-versions` and `pnpm release:validate` were not re-run after t05, which changed no version.

1. `pnpm check`: 0 of 11 cached.
2. `pnpm type-check`: 5 of 11 cached.
3. `pnpm test`: 5 of 12 cached. `pnpm test:evidence`: forced, isolated HOME, 0 of 12 cached; CLI 442 files and 9495 tests, control-plane 14 files and 312 tests.
4. `pnpm build`: 5 of 5 cached (replayed). The forced `test:evidence` built all five packages uncached.
5. `pnpm run check:skill-bumps`: 12 changed skills and agent roles against `origin/main`.
6. `pnpm release:check-versions`.
7. `pnpm release:validate`: 5 packages at 0.3.46.
8. `pnpm build:docs`: 6 of 6 cached, then forced (`turbo run build --filter=oat-docs... --force`), 0 of 6 cached.
9. The docs-index regeneration plus `git diff --exit-code -- apps/oat-docs/index.md`.

Also exited 0:

- `pnpm lint` and `pnpm format` (5 of 10 cached each);
- `pnpm test:skills` (721 tests);
- `pnpm oat:validate-skills` (68 skills);
- the isolated-HOME contract suites (`src/commands/init/tools/shared` and `src/validation`, 1202/1202).

`oat project journal check --project <this project> --at review --scope p12` is `ok`, with no reasons or warnings, on both the installed 0.3.45 CLI and the branch build. No post-commit recovery was needed (0 of 10 used).

Exit evidence:

- p12-t01: `reviewedHead` and its corroboration, with can-fail proofs.
- p12-t02: resolver probes, the released-CLI negative control and can-fail proofs.
- p12-t03: the receive Step 1 event input, the ten hand-offs, the Gate Target rule, the L1 fold and pin can-fail proofs.
- p12-t04: docs.

**Real branch-build gate run.** The command was:

```bash
node packages/cli/dist/index.js --json gate review \
  --project .oat/projects/shared/tiny --target claude-opus-5-5-high \
  --review-type code --review-scope base_sha=df83ac6… --exit-nonzero-on high …
```

It ran in the scratch repository `/tmp/p12-gate-G1dj`: a lite project `tiny` and one two-line code commit, `a9878b266`. The gate exited 0. The result:

- `status: ok`, `receiveEligible: true`, counts 0/0/1/1;
- run `05d374ed-9e46-4851-b311-0be2ef9d08a7`;
- `reviewedHead: a9878b266bf6836885b9b721ccf30d2b64a811f2`, the HEAD at dispatch;
- `corroboration.reviewedHead`: `match` against the artifact's `oat_review_head_sha`;
- run and invocation corroboration `matched`.

The installed review-provide then wrote a `received` row with Invocation `gate` and Gate Target `claude-opus-5-5-high`, followed by two bookkeeping commits. The branch `oat review resolve`, given that real result's `artifactPath`, `scope`, `reviewType`, `runId` and `reviewedHead`, exited 0 with every check `match`.

**Single-round manual and auto flows** keep their selection. Receive Step 1 without an event is unchanged, and the existing `oat review latest` (15), check (12) and ancestry-wiring (2) tests pass, as do the p07 supersession pins.

**Observation.** In that scratch repository `oat project new --mode lite` rendered no `plan` placeholder row. The scratch repository has no `.oat/templates/`, so template resolution used the maintainer's user-tier `~/.oat/templates/plan-lite.md`, which is from 0.3.45. This is the known repository → user → bundle resolution order (root `AGENTS.md`), not a p12 change.

### Task p12-t01: Capture the reviewed head at gate dispatch

**Status:** completed
**Executor:** phase-implementer:rgi-p12-impl-20261103-01
**Handle:** direct:rgi-p12-impl-20261103-01:p12-t01
**Intent:** `oat gate review` reads `HEAD` immediately before it dispatches the reviewer child and adds it to the ok and blocked results as `reviewedHead`. The corroboration then compares it with the artifact's full-SHA `oat_review_head_sha`, reporting `match`, `ancestor`, `mismatch` or `unavailable`. The comparison is reporting only and never changes receive eligibility. Failure envelopes are unchanged.
**Files:** `packages/cli/src/commands/gate/index.ts`, `packages/cli/src/commands/gate/index.test.ts`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate`
**Commit:** 5b92ce575c765650ce45df0db2c15136b3681787
**Proof:** gate suites 468/468 (9 files) exit 0; CLI `type-check` and `lint` exit 0.

**Why `ancestor`.** The Intent names `match`, `mismatch` and `unavailable`. In practice the dispatch HEAD is usually a bookkeeping commit after the reviewed range head. This project's m01 exit-gate reruns show it. The 23:31Z run was dispatched at `38c6d11f9`, and its artifact and row record `395b90677`. The 23:56Z run was dispatched at `a6ea16e0c` and records `5599af21d`. In both cases the recorded head is an ancestor of the dispatch HEAD. With only three values, every anchored brief or goal review would report `mismatch`, so a fourth value, `ancestor`, separates the normal anchored case. A git failure on the ancestry question reads as `mismatch`, because the dispatch HEAD then does not provably contain the artifact's head. The corroboration is reporting only and leaves `receiveEligible` unchanged.

**Tests pinned (`index.test.ts`, describe `reviewedHead`, on a real git root).**

| Case                               | Result                            | `reviewedHead`                          | Corroboration |
| ---------------------------------- | --------------------------------- | --------------------------------------- | ------------- |
| Artifact head is the dispatch HEAD | ok                                | the dispatch HEAD                       | `match`       |
| Artifact head is the parent commit | blocked                           | the dispatch HEAD                       | `ancestor`    |
| Reviewer commits after dispatch    | ok                                | the pre-dispatch head, not the new HEAD | `match`       |
| Unrelated full SHA                 | ok, still `receiveEligible: true` | the dispatch HEAD                       | `mismatch`    |
| Artifact has no head               | ok                                | the dispatch HEAD                       | `unavailable` |
| Root is not a git repository       | ok                                | `null`                                  | `unavailable` |

The post-selection recovery test now also pins `reviewedHead` and a `match` head corroboration.

**Can-fail proofs.** Each guard was neutralized in the working tree and the named test run, then the file was restored byte-identical (`cmp`):

1. Capture moved after `executeTarget`: the "captures HEAD before dispatch" test fails (1 failed).
2. The ancestor branch forced to `mismatch`: the ancestor test fails (1 failed).
3. The recovery path's head set to `null`: the recovery test fails (1 failed).

**Correction (p12-t05, after the Intent amendment at `9775df23a`).** The rationale above is superseded in part. `reviewedHead` is no longer the dispatch HEAD: it is the artifact's full-SHA `oat_review_head_sha` when present, otherwise the HEAD captured at dispatch. `ancestor` stays a corroboration value (the artifact head against the dispatch HEAD, reporting only), but it no longer justifies anything at receive: the resolver compares the row head with the event head by exact equality. The table's `reviewedHead` column now reads the artifact head for the parent, unrelated-SHA and non-git rows (the non-git test now gives its artifact a head); see p12-t05.

### Task p12-t02: `oat review resolve`, a fail-closed resolver for a gate event

**Status:** completed
**Executor:** phase-implementer:rgi-p12-impl-20261103-01
**Handle:** direct:rgi-p12-impl-20261103-01:p12-t02
**Intent:** Add a read-only `oat review resolve` that takes a gate event (`--artifact`, `--scope`, `--type`, `--run-id`, `--reviewed-head`). It binds the `## Reviews` row by the p07 event key and validates the row's Scope, Type, Artifact and Reviewed Head and the artifact's `oat_gate_run_id` against the event. Any mismatch, a missing or duplicate row, or a missing artifact gets a structured diagnostic and a nonzero exit. A `-` Reviewed Head cell reads `unavailable` and is accepted.
**Files:** `packages/cli/src/commands/review/{resolve,check,index}.ts`, `packages/cli/src/commands/review/__tests__/resolve.test.ts`, `packages/cli/src/commands/help-snapshots.test.ts`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review src/commands/help-snapshots.test.ts`
**Commit:** c432cc04164c4eb3924783e0608916709fe4dbef
**Proof:** 116/116 (5 files) exit 0, including 18 new resolver tests and the `review --help` and `review resolve --help` snapshots; CLI `type-check` and `lint` exit 0.

**Shape.** `oat review resolve [--project <path>] --artifact <path> --scope <scope> --type <code|artifact> --run-id <id> --reviewed-head <sha> [--json]`. Each flag carries the same-named field of the gate result (`artifactPath`, `scope`, `reviewType`, `runId`, `reviewedHead`).

- It binds the row by the p07 key. `check.ts` now exports `reviewEventKey` and `buildReviewLedgerRowReport`, so the key and the row report are one definition for `check` and `resolve`.
- When no row binds and exactly one row claims the artifact filename under another Scope or Type, that row is reported with the disagreement instead of a bare `row_not_bound`.
- It reads the Reviewed Head relation with `resolveGitReviewHeadAncestry` from `head-ancestry.ts`. The row's head may equal the event's head (`match`) or be an ancestor of it (`ancestor`, the anchored case; see p12-t01). A `-` cell reads `unavailable` and is accepted. A head that is neither is `reviewed_head_mismatch`, and a pair git cannot answer is `reviewed_head_unresolved`; both are refused.
- Output: `status` is `ok` or `refused`, with `path` (the artifact receive consumes), the bound `row`, per-field `checks` and `diagnostics`. Each diagnostic has `code`, `severity: error`, `source` (`event`, `artifact`, `ledger` or `row`), `expected`, `actual` and `message`. Exit 0 only for `ok`. A refusal, an incomplete event or an abbreviated head exits 1.
- Codes: `artifact_not_active`, `artifact_not_found`, `ledger_unavailable`, `row_not_bound`, `duplicate_event_key`, `scope_mismatch`, `type_mismatch`, `artifact_mismatch`, `reviewed_head_mismatch`, `reviewed_head_unresolved`, `gate_run_id_missing` and `gate_run_id_mismatch`. It never writes.

**Branch-build probes** (`node packages/cli/dist/index.js`, build at `c432cc041`). The scratch repository `/tmp/p12-probe-kjNb` has two commits, P1 → P2, and a quick project `demo`.

Its ledger has two `received` p01 rows:

- the gate row: artifact `reviews/p01-review-2026-11-03T120000Z.md`, Reviewed Head P1, `gate`, `claude-opus-5-5-high`, `oat_gate_run_id` `0f6c7a10-…`;
- a newer manual row: artifact `…T130000Z.md`, Reviewed Head P2, `manual`, `oat_generated_at` one hour later, no run ID.

The gate event names the 12:00 artifact with dispatch head P2.

| #   | Probe                                   | Exit | Result                                                                         |
| --- | --------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| 1   | The gate event                          | 0    | `ok`; checks scope, type, artifact and run ID `match`; reviewedHead `ancestor` |
| 2   | Wrong artifact (the newer manual one)   | 1    | `refused`, `gate_run_id_missing`                                               |
| 3   | Wrong head (an unrelated root commit)   | 1    | `refused`, `reviewed_head_mismatch` from the row                               |
| 4   | Wrong scope (`p02`)                     | 1    | `refused`, `scope_mismatch` from the artifact and the row                      |
| 5   | Wrong type (`artifact`)                 | 1    | `refused`, `type_mismatch` from the artifact and the row                       |
| 6   | Wrong run ID                            | 1    | `refused`, `gate_run_id_mismatch`                                              |
| 7   | No bound row (gate row removed)         | 1    | `refused`, `row_not_bound`                                                     |
| 8   | The gate row's Reviewed Head set to `-` | 0    | `ok`; reviewedHead `unavailable`                                               |
| 9   | Ledger restored, gate event again       | 0    | `ok`                                                                           |
| 10  | Abbreviated `--reviewed-head abc1234`   | 1    | `status: error`                                                                |

**Negative control.**

- **Pre-change state.** On the same scratch project, the released `oat` 0.3.45 runs `oat --json review latest --project … --actionable-project`. It returns the newer manual artifact (`…T130000Z.md`, `actionable: true`), not the gate-named one. The released CLI has no `review resolve` (`error: unknown command 'resolve'`).
- **Post-change state.** The branch resolver, given the gate event, consumes the named artifact (probe 1, exit 0) and refuses the other (probe 2, exit 1).
- **Valid control.** Probe 9 passes after the ledger is restored.

**Can-fail proofs.** Each guard was neutralized in the working tree and `resolve.test.ts` run, then the file was restored byte-identical (`cmp`):

1. Ancestry forced true: the wrong-head and unresolved-head tests fail (2 failed).
2. The run-ID comparison disabled: the wrong-run-ID test and the CLI exit-1 test fail (2 failed).
3. The row and artifact scope comparisons disabled: the wrong-scope test fails (1 failed).

**Correction (p12-t05, after the Intent amendment at `9775df23a`).** The ancestor acceptance described above is removed. The resolver now requires the row's Reviewed Head to equal the event's `reviewedHead` exactly; an ancestor is `reviewed_head_mismatch`, and `reviewed_head_unresolved` and the git dependency are gone. Probe 1's event used dispatch head P2 and passed as `ancestor`; under the amendment that event is refused, and the matching event carries P1. The re-run probes and can-fail proofs are in p12-t05.

### Task p12-t03: Receive consumes the gate-named event on every adopting path

**Status:** completed
**Executor:** phase-implementer:rgi-p12-impl-20261103-01
**Handle:** direct:rgi-p12-impl-20261103-01:p12-t03
**Intent:** Several prose changes, plus pins that fail when the text is reverted:

- review-receive Step 1 accepts a gate event and consumes it through `oat review resolve`, failing closed. Without an event, Step 1 is unchanged.
- Every path that runs `oat gate review` and then receive passes the event to receive.
- review-provide Step 9 and receive's ledger rule record `Invocation: gate` and the exact `oat_gate_target` for every gate review, artifact reviews included.
- The p07 re-review L1 deferral is folded into receive's CLI-unavailable fallback clause.

**Files:** `.agents/skills/oat-project-{review-receive,review-provide,goal,brief,lite,discover,design,quick-start,plan,import-plan}/SKILL.md`, `.agents/skills/oat-project-implement/SKILL.md` (version only), `.agents/skills/oat-project-implement/references/{completion-and-closeout,phase-execution}.md`, `packages/cli/src/commands/init/tools/shared/review-event-row-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts` (version pins).
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** 19fb8190dc3fd3e03c9ef0c559d9ee8ab90b68e0
**Proof:** isolated-HOME contract suites 1202/1202 (28 files) exit 0, the autonomy inventory included. Also exit 0:

- `pnpm oat:validate-skills` (68 skills);
- `pnpm exec oxlint .agents/skills`;
- `oxfmt --check` on the changed files;
- `pnpm run check:skill-bumps` after the commit (12 changed skills and agent roles against `origin/main`).

`oat sync --scope project` (branch build) reported no changes, because the provider views are links.

**Known Unknown settled (how receive is given the gate's event, and which paths adopt it).**

- **Input.** Explicit fields, not the gate JSON. The caller passes the ok or blocked result's `artifactPath`, `scope`, `reviewType`, `runId` and `reviewedHead` as receive's Step 1 gate event. Receive runs `oat --json review resolve --project "$PROJECT_PATH" --artifact … --scope … --type … --run-id … --reviewed-head …`.
- **On exit 0,** `REVIEW_PATH` is the result's `path`, and the `oat review latest` selection and its `ls -t` fallback do not run.
- **On a nonzero exit,** receive stops and reports each diagnostic. It receives, archives and edits nothing, and never falls back.
- **A missing `reviewedHead`.** A gate result from a CLI older than 0.3.46 has no full-SHA `reviewedHead`. It cannot name its event and stops the same way.
- **Adopting paths.** The ten paths that run `oat gate review` and then receive:
  - implement Step 14 (`completion-and-closeout.md`), which on resume reads the event from the persisted `launch_result_receipt` and which the goal milestone exit gate delegates to;
  - the optional phase gate (`phase-execution.md`);
  - the Gate Execution sections of goal, brief, lite, discover, design, quick-start, plan and import-plan.

  Each carries one identical sentence, pinned once per path.

- **Manual and auto reviews** pass no event, and Step 1 is unchanged for them (its existing `--actionable-project` pin and the p07 supersession pins still pass).

**Gate Target rule.** review-provide Step 9 and receive's Step 6 ledger rule now write `Invocation: gate` and the exact `oat_gate_target` for every gate review, artifact reviews included. An artifact review keeps `Reviewed Head` at `-`. Receive also reads `oat_review_invocation` and `oat_gate_target` from an artifact review's frontmatter. The code-only phrasings are pinned absent.

**p07 re-review L1 folded.** Receive's CLI-unavailable fallback clause now skips a candidate only when its own row is `received`. It names the two Invocation classes, gate (`gate`, any Gate Target) and lifecycle (`manual` or `auto`), and says rows of different classes never supersede each other. The p07 pin was updated to the new text.

**Version bumps.** Three skills had no bump on this branch: `oat-project-discover` 2.2.12 → 2.2.13, `oat-project-design` 2.3.9 → 2.3.10, and `oat-project-implement` 2.3.26 → 2.3.27. Their `skills.test.ts` pins were updated mechanically (eight `implement` pins, two `design` pins and one `discover` pin). The other eight skills changed here already carry their single PR-scoped p07 bump.

**Autonomy inventory.** The new lines avoid the scan's trigger words. No line the scan already maps was edited, so the inventory needed no coverage entries and passes unchanged.

**Pins can fail.** Each change was made in the working tree and `review-event-row-contracts.test.ts` run, then the file was restored byte-identical (`cmp`). Each failed 1 of 32:

1. The hand-off sentence removed from `phase-execution.md`.
2. Receive's "never fall back to" changed to "may fall back to".
3. review-provide's Gate Target line reverted to "for gate code reviews".
4. The L1 `received` clause removed from the fallback.

### Task p12-t04: Document `reviewedHead`, `oat review resolve` and the gate-event hand-off

**Status:** completed
**Executor:** phase-implementer:rgi-p12-impl-20261103-01
**Handle:** direct:rgi-p12-impl-20261103-01:p12-t04
**Intent:** Document the gate result's `reviewedHead` and its head corroboration, the `oat review resolve` command, receive's gate-event consumption, and the Gate Target rule for artifact-gate rows. Confirm the generated docs index is unchanged.
**Files:** `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/advanced/workflow-gates.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`.
**Proof command:** `pnpm --filter oat-docs docs:check && pnpm --filter oat-docs docs:lint && pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && git diff --exit-code -- apps/oat-docs/index.md`
**Commit:** 7b22eb1f001e34a45d918c367712baf6018a2a44
**Proof:** every part of the proof command exited 0.

- `docs:check`: 0 errors. The new lines add two `provenance` warnings, on the reviews page's new `.oat/projects/shared/example` resolve example. That class already appears on the page's existing `oat review latest` examples. The page-length warnings predate this change.
- `docs:lint`: 91 files, 0 errors.
- Docs-index regeneration and `git diff --exit-code -- apps/oat-docs/index.md`: no reader page was added or renamed.

**Documentation and instructions.**

- The CLI reference gains an `oat review resolve` entry, and its `oat gate review` entry now names `reviewedHead`, `corroboration.reviewedHead` and the gate-event hand-off.
- Workflow Gates describes the same fields and the hand-off.
- The Reviews page gains "Consuming a gate's review event" and the Gate Target rule for artifact-gate rows.

`packages/cli/README.md` and the root `README.md` list no review subcommands, so they need no change. No `AGENTS.md` fact changed: no command, directory, version pin, workflow or footgun named in an instruction file moved. The lockstep packages stay at 0.3.46 (bumped once for m02 by p07).

### Task p12-t05: The event's reviewedHead is the artifact head; the resolver uses exact equality

**Status:** completed
**Executor:** phase-implementer:rgi-p12-impl-20261103-01
**Handle:** direct:rgi-p12-impl-20261103-01:p12-t05
**Intent:** Apply the p12 Intent amendment at `9775df23a`. The gate result's `reviewedHead` is the artifact's validated full-SHA `oat_review_head_sha` when present, otherwise the HEAD captured at dispatch. `corroboration.reviewedHead` keeps `match`, `ancestor`, `mismatch` and `unavailable`, now comparing the artifact head with the dispatch HEAD, reporting only. `oat review resolve` compares the row's Reviewed Head with the event's `reviewedHead` by exact equality: a `-` row head is `unavailable` and accepted, and any other difference, an ancestor included, is `reviewed_head_mismatch` with exit 1. Ancestor acceptance and `reviewed_head_unresolved` are removed. Tests, docs and the code comments follow.
**Files:** `packages/cli/src/commands/gate/index.ts`, `packages/cli/src/commands/gate/index.test.ts`, `packages/cli/src/commands/review/resolve.ts`, `packages/cli/src/commands/review/__tests__/resolve.test.ts`, `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/advanced/workflow-gates.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate src/commands/review src/commands/help-snapshots.test.ts`
**Commit:** a7c50a2dfe7587bc9a9a8678d68a462a5fc0d258
**Proof:** 585/585 (14 files) exit 0; CLI `type-check` and `lint`, `docs:check` and `docs:lint` exit 0.

**Changes.** The gate's `eventReviewedHead` returns the artifact head, else the dispatch head, on the normal and the post-selection recovery paths. The resolver's head check is `-` → `unavailable`, equal → `match`, anything else → `reviewed_head_mismatch`; its `git` option and `head-ancestry` import are removed. The gate tests now pin `reviewedHead` as the anchored artifact head (`parent`, corroboration `ancestor`), the unrelated head (`mismatch`), the non-git root's artifact head (`unavailable`), and the dispatch-head fallback when the artifact has none. The resolver tests add an anchored event whose head is the row head (accepted), and refuse an event the row head is only an ancestor of, a row head that descends from the event head, and an unknown head. No skill prose described ancestor acceptance, so no skill changed and no version bump is needed.

**Branch-build probes** (`node packages/cli/dist/index.js`, rebuilt uncached at `a7c50a2df`; the p12-t02 scratch repository and ledger):

| #   | Probe                                   | Exit | Result                                                     |
| --- | --------------------------------------- | ---- | ---------------------------------------------------------- |
| 1   | Matching event, head P1                 | 0    | `ok`, every check `match`                                  |
| 2   | Ancestor-head event, head P2            | 1    | `refused`, `reviewed_head_mismatch` from the row           |
| 3   | Wrong artifact (the newer manual one)   | 1    | `refused`, `gate_run_id_missing`, `reviewed_head_mismatch` |
| 4   | Wrong head (an unrelated root commit)   | 1    | `refused`, `reviewed_head_mismatch`                        |
| 5   | Wrong scope (`p02`)                     | 1    | `refused`, `scope_mismatch` from the artifact and the row  |
| 6   | Wrong type (`artifact`)                 | 1    | `refused`, `type_mismatch` from the artifact and the row   |
| 7   | Wrong run ID                            | 1    | `refused`, `gate_run_id_mismatch`                          |
| 8   | No bound row                            | 1    | `refused`, `row_not_bound`                                 |
| 9   | Row head `-`, event head P2             | 0    | `ok`, reviewedHead `unavailable`                           |
| 10  | Ledger restored (`cmp`), matching event | 0    | `ok`                                                       |
| 11  | Abbreviated `--reviewed-head abc1234`   | 1    | `status: error`                                            |

**Negative control.** Pre-change: the released 0.3.45 `oat --json review latest --project … --actionable-project` still returns the newer manual artifact (`…T130000Z.md`, `actionable: true`), and 0.3.45 has no `review resolve`. Post-change: the resolver consumes the gate-named artifact (probe 1) and refuses the other (probe 3) and the ancestor-head event (probe 2). Valid control: probe 10.

**Real gate fields.** The real branch-build gate result from p12 (run `05d374ed-…`) has `reviewedHead` `a9878b266…`, equal to its artifact's `oat_review_head_sha` and its row's Reviewed Head (corroboration `match`). Passed through the rebuilt resolver, it exits 0 with every check `match` and no diagnostics.

**Can-fail proofs.** Each guard was neutralized in the working tree and its suite run, then the file was restored byte-identical (`cmp`):

1. The resolver's exact-equality test replaced with `true`: `resolve.test.ts` fails 3 of 19 (the ancestor, descendant and unknown-head refusals).
2. `eventReviewedHead` reverted to the dispatch head: `gate/index.test.ts` fails 3 of 284 (the anchored, unrelated-head and non-git cases).

### Task p12-t06: (review) The resolver refuses a superseded or already-processed row

**Status:** completed
**Executor:** phase-implementer:rgi-p12-fix-20261103-01
**Handle:** direct:rgi-p12-fix-20261103-01:p12-t06
**Commit:** 4e644183055ab537467788fcf5de44b4c090ff6f
**Source review:** reviews/archived/p12-review-2026-11-03T200007Z.md (M1)

Intent: `oat review resolve` binds the row but never checks supersession or status, so it accepted a superseded `received` row (one `oat review check` reports and `oat review latest` skips) and a `passed` row. Outcome 4 says readers ignore a superseded row. Run p07's supersession evaluation (exported from `check.ts`, with the same git ancestry helper `check` uses for the descendant-head clause) for the bound row and refuse with a structured diagnostic naming the superseding row (e.g. `row_superseded`); refuse a bound row whose status is not `received` (review-provide Step 9 writes `received`; a processed row means the event was already consumed), e.g. `row_not_received`. Add resolver tests and a branch-build probe (superseded, passed, valid control); update the CLI reference code list and receive Step 1's bullet.
Files: `packages/cli/src/commands/review/{resolve,check}.ts`, `packages/cli/src/commands/review/__tests__/resolve.test.ts`, `apps/oat-docs/docs/reference/cli-reference.md`, `.agents/skills/oat-project-review-receive/SKILL.md` (already bumped on this branch).
Proof: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review` plus the isolated-HOME contract suites.

**Proof:** review suites plus help snapshots 119/119 exit 0; isolated-HOME contract suites 1202/1202 exit 0; CLI `type-check` and `lint`, `oxlint .agents/skills`, `oat:validate-skills`, `docs:lint` and `oxfmt --check` on the changed files exit 0. `oat sync --scope project` (branch build): no changes required.

**Changes.** `check.ts` exports `evaluateReviewSupersession(git, repoRoot, rows)`, p07's evaluation (`reviewSupersessionHeadPairs`, `resolveGitReviewHeadAncestry`, `findSupersededReviews`), and `describeReviewLedgerRow`; `oat review check` now calls the same function, so the two commands share one rule. After binding a row, `oat review resolve` refuses a Status other than `received` (`row_not_received`, expected `received`) and, for a `received` row, a p07 supersession (`row_superseded`, expected `current`, actual `row N`, with the superseding row's report as `supersededBy`). `checks` gains `rowStatus` and `supersession` (`current`, `superseded`, `unavailable`). The resolver takes a `git` option and command dependency. A head pair git cannot answer counts as not descending, as in every other p07 reader. The CLI reference lists both codes and the new checks; receive's superseded-row bullet says the resolver applies the same rule on the gate-event path. The existing "different artifact path" test now uses a `received` row, so it keeps a single cause.

**Branch-build probes** (rebuilt CLI, the p12-t02 scratch repository; event: the gate artifact `…T120000Z.md`, head P1, run `0f6c7a10-…`):

| Probe                                                    | Exit | Result                                                                                                          |
| -------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------- |
| Valid control: gate row at P1, later manual row at P2    | 0    | `ok`, `rowStatus: match`, `supersession: current` (lifecycle rows never supersede gate rows)                    |
| Superseded: a later `received` gate row at descendant P2 | 1    | `refused`, `row_superseded` naming row 3 (`…T140000Z.md`); `oat review check` reports row 1 superseded by row 3 |
| Processed: the gate row's Status set to `passed`         | 1    | `refused`, `row_not_received`, `supersession: unavailable`                                                      |
| Ledger restored (`cmp`), same event                      | 0    | `ok`                                                                                                            |

**Can-fail proofs.** Each guard was neutralized in the working tree and `resolve.test.ts` run, then restored byte-identical (`cmp`):

1. The supersession lookup never matching the bound row: the superseded-row test fails (1 of 21).
2. The `received` status check disabled: the processed-row test fails (1 of 21).

### Task p12-t07: (review) Artifact scope and type absent from frontmatter

**Status:** completed
**Executor:** phase-implementer:rgi-p12-fix-20261103-01
**Handle:** direct:rgi-p12-fix-20261103-01:p12-t07
**Commit:** e67f07e0d81a26ed1d5f5cdf76721ead9cca64f8
**Source review:** reviews/archived/p12-review-2026-11-03T200007Z.md (L1)

Intent: the resolver skips the artifact's `oat_review_scope`/`oat_review_type` comparison when the field is absent, while the CLI reference says both are validated (the run ID fails closed when absent). Refuse an absent field with `scope_missing`/`type_missing`, mirroring `gate_run_id_missing`, or, if a real gate artifact can lack them, report them unavailable and document it; pick the option consistent with what gate artifacts actually carry and say which in the record.
Files: `packages/cli/src/commands/review/resolve.ts`, its test, `apps/oat-docs/docs/reference/cli-reference.md`.
Proof: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review`

**Proof:** review suites plus help snapshots 120/120 exit 0; CLI `type-check`, `lint` and `docs:lint` exit 0.

**Which case applies: refuse.** Real gate artifacts carry both fields. The reviewer's artifact frontmatter contract writes `oat_review_scope` and `oat_review_type` (`packages/cli/assets/agents/oat-reviewer.md`, the frontmatter block), and every gate review artifact found on this machine (9 under a `reviews/` directory carrying `oat_gate_run_id`, in this checkout, the main checkout and the p12 real-gate scratch repository) has both. So an absent field is refused like an absent run ID: `scope_missing` and `type_missing` (source `artifact`, expected the event value, actual `null`), and `checks.scope` or `checks.type` reads `mismatch`. The CLI reference now says all three artifact fields fail closed when absent and lists both codes.

**Branch-build probe** (rebuilt CLI, the p12-t02 scratch repository, the matching P1 event): with both fields removed from the gate artifact, exit 1, `refused`, `scope_missing` and `type_missing`; with the artifact restored (`cmp`), exit 0, `ok`.

**Can-fail proof.** Both absent-field guards disabled in the working tree: the new test fails (1 of 22); the file was restored byte-identical (`cmp`).

### Review Received: p12

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p12-review-2026-11-03T200007Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 4

- M1 (Medium): `oat review resolve` accepts a superseded `received` row and a `passed` row, contradicting Outcome 4 and receive Step 1 → fix task p12-t06; agreed, a stale persisted or retried event is realistic.
- L1 (Low): artifact scope and type are validated only when present in frontmatter, contrary to the CLI reference → fix task p12-t07.
- L2 (Low): the optional phase gate and the eight planning gates pass the gate event only in-session, so an interruption between gate and receive leaves receive with newest-artifact selection (Step 14 persists it) → approved deferral (see Deferred Findings); persisting those gate results is a new robustness requirement outside p12's adopting-path Intent (Feature Planning Triage), and p07 supersession still protects that path.
- L3 (Low): the mid-phase amendment `9775df23a` of p12's Intent and Exit evidence records no operator acknowledgement → accepted; the root made p12 concrete at `f3a9603f7` under the brief's authority to make provisional phases concrete and corrected that concrete text before any review, tightening the guarantee to exact equality, within Outcome 4. The amendment and its reason were reported to the operator in the run report on 2026-11-03; any operator objection reopens it.
- L4 (Low, bookkeeping): the phase paragraph's stale code-state sentence → corrected by an appended line in this receive's bookkeeping commit.

Reviewer: fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-p12-rev-20261103-01`, reconnaissance not attempted); reproduced the negative control and proved two guards can fail.

**Outcome:** fixes queued: p12-t06, p12-t07

**Outcome:** fixes queued: p12-t06, p12-t07; both completed (head `8016d7d98`) and passed re-review (reviews/archived/p12-review-2026-11-03T201925Z.md)

### Review Received: p12 (re-review of the fix records)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p12-review-2026-11-03T201925Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

Scope: the fix range `c92b11dfb..8016d7d98` (p12-t06, p12-t07), fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-p12-rev-20261103-02`, reconnaissance not attempted). It confirmed M1 and L1 resolved: `oat review resolve` and `oat review check` share `evaluateReviewSupersession`; the round-1 probe (run-1 event, run-2 at a descendant head) now refuses with `row_superseded` naming row 2 and exits 1, and nine further supersession cases follow the p07 rule. It neutralized each new guard in turn, saw exactly its test fail, and restored a clean tree. `row_not_received` cannot block a legitimate resumed receive, because a partial Step 6 write was already refused by `artifact_mismatch` or `artifact_not_active`. The unpinned receive Step 1 sentence is explanatory; the operative stop-on-refusal rule is pinned at `review-event-row-contracts.test.ts:224-227`.

**Outcome:** passed

## Phase p13: Pending required reviews before a pull request

**Status:** completed
**Base:** 579379cf27b6e3ceddc9a7c731200c6c53b2d82d
**Head:** 2375b77bd1b1326b5feec60ae7258f3bbeb7556a
**Executor:** phase-implementer:rgi-p13-impl-20261103-01

Head advanced from `2f1dae7a0` to the p13-t07 record commit after the review fixes p13-t05, p13-t06 and p13-t07 (code state `890aa4879`); each exited 0: `pnpm check` (0 of 11 cached), `pnpm type-check` (5 of 11 cached), `pnpm test` (5 of 12 cached), `pnpm test:evidence` (0 of 12 cached; CLI 444 files and 9520 tests, control-plane 314 tests), `pnpm build` (5 of 5 cached), `check:skill-bumps` (16 skills and agent roles), `release:check-versions` (after `git fetch origin main`, still `c42fd95bd`), `release:validate` (0.3.46), the forced docs build (0 of 6 cached) with the index diff, `pnpm lint`, `pnpm format`, the isolated-HOME contract suites (34 files, 1272 tests), `pnpm test:smoke`, `pnpm test:skills`, `oat:validate-skills` and `oat project journal check --at review --scope p13`. Branch-build probe `review pending --scope project` on this project: `missing` empty with p08 and p09 provisional and rowless; a scratch copy with p08 made concrete lists `p08 code` under `missing`.

Worktree: the project branch checkout (`goal/review-gate-integrity-m02`). Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`; task class hard-reasoning: a new read-only review command whose required-row rules must agree with pr-final Step 2, delivery check and Outcome 4, plus a new autonomy row and two PR skills whose prose must stay consistent). Parallelism assessment: rung 3, one phase implementer. Rung 1 does not apply, because no parallel groups are declared. Rung 2 does not apply: the command, the skill prose and the autonomy row share the required-row and waiver contract and the contract tests, so they fail the independence test. Rung 4 does not apply, because the phase adds a CLI surface and an autonomy boundary. p13 was made concrete at `579379cf2` before this start (project log). `origin/main` has not moved since the p07 base merge.

Phase verification at the head: pass. The code state is `6a5a4b806` (p13-t04); only journal commits follow it. `origin/main` is still `c42fd95bd`, checked by `git fetch origin main` before the version gate. The DoD gate list ran in CI order and each command exited 0:

1. `pnpm check`: 0 of 11 cached.
2. `pnpm type-check`: 5 of 11 cached.
3. `pnpm test`: 5 of 12 cached. `pnpm test:evidence`: forced, isolated HOME, 0 of 12 cached; CLI 444 files and 9516 tests, control-plane 14 files and 314 tests.
4. `pnpm build`: 5 of 5 cached (replayed). The forced `test:evidence` built all five packages uncached.
5. `pnpm run check:skill-bumps`: 16 changed skills and agent roles against `origin/main`.
6. `pnpm release:check-versions`.
7. `pnpm release:validate`: 5 packages at 0.3.46.
8. `pnpm build:docs`: 6 of 6 cached, then forced (`turbo run build --filter=oat-docs... --force`), 0 of 6 cached.
9. The docs-index regeneration plus `git diff --exit-code -- apps/oat-docs/index.md`.

Also exited 0: `pnpm lint` and `pnpm format` (5 of 10 cached each); `pnpm test:skills` (721 tests); `pnpm oat:validate-skills` (68 skills); the isolated-HOME contract suites (`src/commands/init/tools/shared` and `src/validation`, 1205/1205). `oat project journal check --project <this project> --at review --scope p13` is `ok`, with no reasons or warnings, on both the installed 0.3.45 CLI and the branch build. One post-commit recovery (rgi-p13-rec-01, 1 of 10 used). Exit evidence: p13-t01 (unit fixtures, guard-can-fail N1 to N5, branch-build probes 1 to 5 with the released-CLI negative control, the waived row still `pending`, closeout-check and delivery check unchanged, journal check accepting a waiver line), p13-t02 (delivery check pinned unchanged by a waiver), p13-t03 (listing and stop pins with C1 to C4, `PRFINAL-06` in the autonomy inventory, version bumps) and p13-t04 (docs).

### Task p13-t01: `oat review pending`, a read-only listing of pending required reviews

**Status:** completed
**Executor:** phase-implementer:rgi-p13-impl-20261103-01
**Handle:** direct:rgi-p13-impl-20261103-01:p13-t01
**Intent:** Add `oat review pending --project <path> --scope <pNN[,pNN…]|mNN|project> [--json]`. It reads the latest `## Reviews` row per Scope + Type; required keys are the `code` rows of the scope's phases that exist in the plan (`mNN` through the Milestones table, `project` for every phase) plus `plan | artifact` for a `project` scope unless the plan-review skip line is recorded. It reports `pending` and `waived` separately, applies a `**Review waived:**` line under the journal's `## Reviews and Gates` only to a required key whose latest row is still `pending`, always exits 0 on a readable project, and decides nothing. Export the plan-review skip-line predicate from the control-plane instead of copying its regex.
**Files:** `packages/control-plane/src/state/quick-plan-readiness.ts` (+ test), `packages/control-plane/src/index.ts`, `packages/control-plane/README.md`, `packages/cli/src/commands/review/{pending,index}.ts`, `packages/cli/src/commands/review/__tests__/pending.test.ts`, `packages/cli/src/commands/help-snapshots.test.ts`.
**Proof command:** `pnpm --filter @open-agent-toolkit/control-plane exec vitest run && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review src/commands/help-snapshots.test.ts`
**Commit:** f831a2fa964503d42c20effd210049ef1d6733bb
**Proof:** control-plane 314/314 exit 0; CLI review suites plus help snapshots 133/133 exit 0 (12 new `pending.test.ts` cases, the `review pending --help` snapshot and the updated `review --help` listing); CLI and control-plane `type-check` and `lint` exit 0. `packages/control-plane/README.md` documents the new `hasPlanReviewSkipLine` export.

**Known Unknown settled (which pending rows count as required, and where a waiver is recorded).** As the concrete Intent states: the journal slot. The row stays `pending`; a waiver is one line under `## Reviews and Gates` in `implementation.md`. The plan-review skip rule is shared, not copied: the control-plane exports `hasPlanReviewSkipLine(planContent)`, the same record-line rule inside `## Reviews` the quick readiness guard applies (the guard now calls it).

**Choices settled within the Intent.**

- **Command.** `oat review pending [--project <path>] --scope <project|mNN|pNN[,pNN…]> [--json]`. `--project` defaults to the active project, like `check`, `resolve` and `latest`.
- **Scope.** `project` takes every `## Phase` heading the plan declares (task-mode `## Phase N:` and brief/goal `## Phase pNN:` alike, through the shared journal record reader) and adds `plan | artifact` unless the skip line is recorded. One `mNN` (normalized, so `m2` is `m02`) expands through `readMilestoneMembership` and `milestonePhaseScope`; an unknown milestone or an invalid Milestones table exits 1 with the membership errors. A comma list takes each normalized `pNN`/`p-revN`; any other token (`final`, `m01` inside a list) exits 1. Requested phases the plan does not declare are reported under `scope.ignored` and never listed. Extracted goal phases are not filtered: no PR skill passes a `project` scope in goal mode (pr-final's goal path passes the terminal phases, pr-progress the milestone), and a stray row could still be waived.
- **Required and latest.** The latest `## Reviews` row per Scope + Type, with phase scopes normalized (`p1` = `p01`). `required` lists every required key with its latest `status` and 1-based `row`, `null` when the key has no row; such a key is not pending (the Intent lists rows still `pending`), but it is visible.
- **JSON.** `{ status: "ok", project, scope: { requested, kind: phases|milestone|project, phases, ignored, plan: required|skipped|not-in-scope }, required, pending, waived, waivers }`. `waived` entries carry `waiver: { line, waivedBy, date, reason }`. `waivers` lists every parsed waiver line with `applied` and `unapplied` (`not-required`, `review-recorded`, `no-row`, `missing-reason`, or `null`). Exit 0 on any readable project and scope; exit 1 only for a missing `--scope`, no project, an unreadable `plan.md` or an unresolvable scope.
- **Waiver parsing.** A record line anywhere inside the journal's `## Reviews and Gates` section, `###` receipts included, so a line appended at the end of the slot counts; fenced or indented examples and lines in any other section do not. It matches the `**Review waived:**` label, optionally as a `-`/`*`/`+` list item, then the scope and type tokens (backticks tolerated). `**Waived by:**` and `**Date:**` read up to the next `·`; `**Reason:**` reads to the end of the line, so a reason may contain `·`. A waiver applies only to a required key whose latest row is `pending` and only with a non-empty reason (the acceptance criteria require "a waiver with a reason"); it is inert once the latest row records a review.

**Branch-build probes** (`pnpm build` exit 0, then `node packages/cli/dist/index.js`).

1. **This project, `--scope m02`:** exit 0; required p07 `passed` (row 23), p12 `passed` (row 25), p13 `pending` (row 26); pending `p13 code`; no waivers.
2. **Negative control, scratch quick project `/tmp/p13-quick-rQA3`** (`p01 passed`, `p02 pending`, `final passed`, `plan passed`). Pre-change: the released `oat` 0.3.45 has no `review pending` (`error: unknown command 'pending'`, exit 1), and pr-final Step 2's ledger read selects only `| final | code | passed |`, so the pending `p02` row passes unlisted (the bad state is accepted). Post-change: the branch lists `pending [p02 code, row 2]`, exit 0. Valid control: with `p02` recorded `passed`, nothing is pending and the waiver reports `review-recorded`.
3. **Waiver, same scratch project:** one `**Review waived:** p02 code · **Waived by:** tstang · **Date:** 2026-11-03 · **Reason:** …` line under `## Reviews and Gates`, committed. The branch lists `waived [p02 code, status pending]` and nothing pending; `plan.md` row 28 still reads `| p02 | code | pending | - | - | - | - | - |`; `project closeout-check` output before and after is byte-identical (exit 0, `not_required`).
4. **Goal milestone, delivery and closeout unchanged:** a scratch script (`/tmp/p13-scripts/goal-waiver-probe.mts`, run with `tsx`) built the delivery suite's `goal-repo` received-milestone scenario, then appended a `## Reviews and Gates` waiver line and committed it (`b69ba4eb3`). Branch `project delivery check --subject m01`: before and after exit 0, `status: ok`, review fresh, exit carrier fresh, `deliverable: true`, JSON identical apart from `publishedHeads`. Branch `project closeout-check`: before and after identical (exit 1, `incomplete`, `goal_not_declared`).
5. **Journal check accepts a waiver line:** in a scratch clone of this branch, a real `**Review waived:** p13 code · …` line appended under this project's `## Reviews and Gates` leaves `oat project journal check --at review --scope p13` at `ok` with no reasons or warnings on both the branch build and the released 0.3.45; `review pending --scope m02` then reports `p13 code` waived with its row still `pending`. No grammar change was needed.

**Guard can fail** (each neutralized in the working tree, `pending.test.ts` run, then restored byte-identical with `cmp`; 1 of 12 failed each time): N1 the waiver applicability guard forced to `applied: true` (the unapplied-waiver test fails); N2 the `## Reviews and Gates` section filter removed (the placement test fails); N3 the skip line ignored (the never-listed test fails); N4 requested phases not intersected with the plan (the never-listed test fails); N5 the milestone scope replaced by every plan phase (the `mNN` test fails).

### Task p13-t02: Pin delivery check unchanged by an appended review waiver

**Status:** completed
**Executor:** phase-implementer:rgi-p13-impl-20261103-01
**Handle:** direct:rgi-p13-impl-20261103-01:p13-t02
**Intent:** Keep the exit evidence that a waiver line leaves `oat project delivery check` unchanged as an automated test, not only a one-off probe: on the `goal-repo` received-milestone scenario, appending a `**Review waived:**` line under `## Reviews and Gates` and committing it leaves the `m01` check `status: ok`, deliverable, with the same exit code and JSON apart from `publishedHeads`. Test-only.
**Files:** `packages/cli/src/commands/project/delivery/check.test.ts`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery`
**Commit:** 4e5d062fa38e4e50fe3a578085e0b57590e5349b
**Proof:** delivery suites 126/126 (3 files) exit 0; CLI `lint` exit 0. The record was written after the commit rather than opened before it; the commit is the record's one implementation commit.

**Test can fail.** With `judgeJournalChange` (`delivery/evidence.ts`) made to refuse any journal that contains `**Review waived:**`, the new test fails (1 failed); the file was restored byte-identical (`cmp`). The branch-build counterpart is p13-t01 probe 4.

### Task p13-t03: pr-progress and pr-final list pending required reviews before a PR

**Status:** completed
**Executor:** phase-implementer:rgi-p13-impl-20261103-01
**Handle:** direct:rgi-p13-impl-20261103-01:p13-t03
**Intent:** Before PR creation, `oat-project-pr-progress` (new Step 3.5; in goal mode before Step 5.5 item 4 writes `registering`) and `oat-project-pr-final` (new Step 2.5; in goal mode inside Step 1.5 before registration item 4) run `oat review pending` for the PR's scope. With pending rows and no waiver, an interactive run offers run, waive with a recorded reason, or stop; a non-interactive run stops. pr-final's stop is the new autonomy row `PRFINAL-06` with its prompt-site coverage keys; pr-progress states the same stop in prose. Pin the listing and stop sentences; bump pr-progress to 1.3.8 and pr-final to 1.6.17.
**Files:** `.agents/skills/oat-project-pr-progress/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`, `.agents/docs/autonomy-contract.md`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts` (version pins), `.oat/sync/manifest.json` (if sync changes it).
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
**Commit:** 43817937d42a0ffc6e5db20c9c01b46cd188ca19
**Proof:** isolated-HOME contract suites 1205/1205 (29 files) exit 0, the autonomy inventory and the named-skill execution contract included; `pnpm oat:validate-skills` (68 skills), `pnpm exec oxlint .agents/skills` and `oxfmt --check` on the changed files exit 0. `oat sync --scope project` (branch build) reported no changes, because the provider views are links; `.oat/sync/manifest.json` is unchanged. `pnpm run check:skill-bumps` after the commit failed on two skills that vendor the autonomy contract; see Recovery Event rgi-p13-rec-01 below.

**Shape.**

- **pr-progress Step 3.5** (new, between Step 3 and Step 4) runs `oat --json review pending --project "$PROJECT_PATH" --scope "$PENDING_SCOPE"` before Step 6 creates a pull request and, in goal mode, before Step 5.5 item 4 writes `registering` (Step 5.5's intro says so too). `PENDING_SCOPE` is `pNN`, a contiguous run's phase ids as a comma list, the active milestone's `mNN`, or a registered delivery's frozen phase ids; a `range=`/`base_sha=` scope runs no listing. Interactive: run (route to review-provide `code <pNN>` then review-receive, and end the run), waive with a recorded reason, or stop. Non-interactive (`OAT_NON_INTERACTIVE=1` or `OAT_AUTONOMOUS=1`): stop at the boundary, report each pending row, write no waiver, create, register or push nothing. pr-progress is not an autonomy-inventory root, so the stop is prose only.
- **pr-final Step 2.5** (new, between Step 2 and Step 3) lists `--scope project` outside goal mode. Goal Step 1.5 replaces Steps 2–6, so item 3 gains a paragraph: before item 4 writes a terminal delivery's `registering` entry, run Step 2.5 with that delivery's terminal phase ids. `OAT_AUTONOMOUS=1` or `OAT_NON_INTERACTIVE=1` stops at `PRFINAL-06`: never waive, never proceed, record the blocker, and stop before the PR artifact, push, PR or `registering` entry. Otherwise the user chooses run, waive or stop.
- **Waiver line** (both skills, identical): `**Review waived:** <scope> <type> · **Waived by:** <user> · **Date:** <YYYY-MM-DD> · **Reason:** <text>`, appended under `## Reviews and Gates` only on the user's explicit choice; the `## Reviews` row stays `pending`; the line is committed alone as bookkeeping (`oat project push` for a synced project), and the listing is re-run to confirm the row reads `waived`.
- **Autonomy contract.** New row `PRFINAL-06` (Required reviews pending without a waiver; `boundary:unresolved-critical-findings`, like `PRFINAL-03`), and the one new prompt-scan site (`- Otherwise ask the user to choose one option for the pending rows:`) is mapped `db86a9d44b48 -> PRFINAL-06`. No mapped line was edited.
- **Named-skill contract.** The run options and the `PRFINAL-06` resume target name review-provide and review-receive in backticks, so three `non-executing` `CALL_SITE_MATRIX` rows classify them, matching the existing Step 2 rows (terminal handoff or boundary resume target; the skill stops before either runs).
- **Pins** (`pending-review-listing-contracts.test.ts`): each step's position (pr-progress Step 3.5 before Step 5.5; pr-final Step 2.5 before Step 3 and its goal paragraph between items 3 and 4), the listing command, the non-interactive and `PRFINAL-06` stop sentences, the interactive choice, the waiver template and "Leave the `## Reviews` row `pending`.", the `PRFINAL-06` contract row, and a cross-check that the documented waiver line, filled in, is applied by `listPendingReviews`. Step 2.5 avoids the words the existing Step 2 slice pins as absent (`archived`, `PRFINAL-05`).
- **Versions.** pr-progress 1.3.7 → 1.3.8 and pr-final 1.6.16 → 1.6.17 (one bump each against `origin/main`); `skills.test.ts` pins updated (three).

**Pins can fail** (each made in the working tree, the new test file run, then both skills restored byte-identical with `cmp`): C1 pr-progress "stop at this boundary" changed to "continue" (1 of 3 failed); C2 pr-final's "Never write a waiver and never proceed." removed (1 of 3); C3 pr-final's goal paragraph removed from Step 1.5 (1 of 3); C4 pr-final's waiver label changed to `**Waiver:**` (2 of 3: the pin and the parser cross-check).

### Recovery Event rgi-p13-rec-01

- Phase/task: p13 / p13-t03
- Original request: rgi-p13-impl-20261103-01
- Original commit: 43817937d42a0ffc6e5db20c9c01b46cd188ca19
- Defect class: lint
- Discovered by: pnpm run check:skill-bumps
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: 0d17557c73d5a3bdcf2b3981f531af72b39bf901
- Verification: focused `pnpm run check:skill-bumps` exit 0 (16 changed skills and agent roles against `origin/main`) before and after the commit; phase isolated-HOME contract suites 1205/1205 exit 0 before and after; `pnpm oat:validate-skills` exit 0.
- Reason: `.agents/docs/autonomy-contract.md` (the new `PRFINAL-06` row and its coverage key) is vendored by symlink into seven skills. Five already carried their single m02 bump; `oat-project-document` (1.8.13) and `oat-project-autonomous` (1.0.24, through `references/gate-inventory.md`) did not, so the gate failed. The correction is mechanical, in-phase and behavior-free: one patch bump each (1.8.14, 1.0.25) and the two `skills.test.ts` document pins. Reservation committed at `fdfb2e97f` before editing; the ledger entry is `completed` in the recovery commit.

### Task p13-t04: Document `oat review pending`, the waiver line and the pre-PR listing

**Status:** completed
**Executor:** phase-implementer:rgi-p13-impl-20261103-01
**Handle:** direct:rgi-p13-impl-20261103-01:p13-t04
**Intent:** Document the `oat review pending` command (CLI reference), the pending-review listing and the waiver line on the Reviews page, and the pre-PR listing and `PRFINAL-06` stop in the PR flow; confirm the generated docs index is unchanged and that no `AGENTS.md` fact changed.
**Files:** `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`, `apps/oat-docs/docs/workflows/projects/closeout/pr-flow.md`.
**Proof command:** `pnpm --filter oat-docs docs:check && pnpm --filter oat-docs docs:lint && pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && git diff --exit-code -- apps/oat-docs/index.md`
**Commit:** 6a5a4b806da49761b78dd1dc15b979b3982c0c6c
**Proof:** every part of the proof command exited 0. `docs:check`: 0 errors; the new lines add three `provenance` warnings, on the Reviews page's new `--project .oat/projects/shared/example` examples, the class the page's existing `oat review latest` and `oat review resolve` examples already carry. `docs:lint`: 91 files, 0 errors. The docs-index regeneration and `git diff --exit-code -- apps/oat-docs/index.md`: no reader page was added or renamed.

**Documentation and instructions.**

- The CLI reference gains an `oat review pending` entry: scope forms, required rows, the waiver line and when it applies, the JSON shape, and the exit codes.
- The Reviews page gains "Pending required reviews before a PR": the listing, the run/waive/stop choice, `PRFINAL-06`, the waiver line example, and why a waiver is never a review.
- The PR Flow page states the pre-PR listing and links to that section.
- `packages/control-plane/README.md` already documents `hasPlanReviewSkipLine` (p13-t01).

`packages/cli/README.md` and the root `README.md` list no review subcommands, so they need no change. No `AGENTS.md` fact changed: no command, directory, version pin, workflow or footgun named in an instruction file moved (`git grep` over `*AGENTS.md` and `.agents/rules/` finds only the control-plane "never run git" convention, which still holds). The lockstep packages stay at 0.3.46.

### Task p13-t05: (review) List required phases that have no Reviews row

**Status:** completed
**Commit:** 5809d88f5af73f6a15e492fd03780f06512c8b98
**Executor:** phase-implementer:rgi-p13-fix-20261103-01
**Handle:** direct:rgi-p13-fix-20261103-01:p13-t05
**Source review:** reviews/archived/p13-review-2026-11-03T210640Z.md (M1)

Intent: per the operator decision recorded in the p13 Intent (2026-11-03), `oat review pending` reports a required key whose phase is concrete (not `**Provisional:** yes`) but has no `## Reviews` row in a separate `missing` list, while a provisional phase with no row stays unlisted; a `**Review waived:**` line applies to a `missing` key (moving it to `waived`) instead of reporting `no-row`. pr-progress Step 3.5 and pr-final Step 2.5 (and the goal Step 1.5 paragraph) treat `missing` like `pending`: run, waive or stop, and a non-interactive run stops (`PRFINAL-06` for pr-final). Add unit tests, a guard-can-fail control and pins; update the CLI reference and the reviews and PR-flow docs.
Files: `packages/cli/src/commands/review/pending.ts`, `packages/cli/src/commands/review/__tests__/pending.test.ts`, `.agents/skills/oat-project-pr-progress/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md` (both already bumped on this branch), `.agents/docs/autonomy-contract.md` if the row text changes, `packages/cli/src/commands/init/tools/shared/pending-review-listing-contracts.test.ts`, `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`, `apps/oat-docs/docs/workflows/projects/closeout/pr-flow.md`.
Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review src/commands/init/tools/shared src/validation`

Correction (p13 re-review L1, bookkeeping, 2026-11-03): the p13-t05 missing-list guard can fail. The implementer's fix report recorded these controls: `isMissing` forced false failed 4 tests; the provisional exclusion removed failed 4. The re-reviewer reproduced them independently: the missing list failed 5 tests, the provisional exclusion 4 and the missing-key waiver rule 3, each restored byte-identical with a clean tree (reviews/archived/p13-review-2026-11-03T213802Z.md).

### Task p13-t06: (review) Route a pending plan row to an artifact plan review

**Status:** completed
**Commit:** a653f1aa4fc0f6560eeec35a1248684743d419e1
**Executor:** phase-implementer:rgi-p13-fix-20261103-01
**Handle:** direct:rgi-p13-fix-20261103-01:p13-t06
**Source review:** reviews/archived/p13-review-2026-11-03T210640Z.md (L1)

Intent: pr-final's **Run them** option and its `PRFINAL-06` resume target send every listed row to `oat-project-review-provide` with `code <scope>`, which is invalid for the `plan | artifact` row. Say `code <pNN>` for a phase row and `artifact plan` for the plan row, and extend the pin.
Files: `.agents/skills/oat-project-pr-final/SKILL.md`, `packages/cli/src/commands/init/tools/shared/pending-review-listing-contracts.test.ts`.
Proof: the isolated-HOME contract suites.

### Task p13-t07: (review) Scope pr-progress Step 3's do-not-block sentence

**Status:** completed
**Commit:** 890aa4879a148c2f6a509ac2f8cdc812fcd8224b
**Executor:** phase-implementer:rgi-p13-fix-20261103-01
**Handle:** direct:rgi-p13-fix-20261103-01:p13-t07
**Source review:** reviews/archived/p13-review-2026-11-03T210640Z.md (L2)

Intent: pr-progress Step 3 ends "Do not block PR generation; this is a progress PR." directly before Step 3.5, which can stop. Scope it to Step 3's warning, for example "Do not block PR generation on this warning; Step 3.5 governs pending required reviews." Check existing Step 3 pins first.
Files: `.agents/skills/oat-project-pr-progress/SKILL.md`, the pinning contract test if one covers the sentence.
Proof: the isolated-HOME contract suites.

### Review Received: p13

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p13-review-2026-11-03T210640Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 3

- M1 (Medium): a required concrete phase with no `## Reviews` row is never listed as pending, so a PR (autonomous included) proceeds; real on this project (p12's row first appeared with its review event) → put to the operator first, because it extends the literal Intent (AGENTS.md); the operator chose the `missing` list on 2026-11-03 → fix task p13-t05, and the p13 Intent and Exit evidence record the decision.
- L1 (Low): pr-final's run option and `PRFINAL-06` resume target route a pending `plan | artifact` row to `code <scope>` → fix task p13-t06.
- L2 (Low): pr-progress Step 3's unscoped "Do not block PR generation" sits before Step 3.5, which can stop → fix task p13-t07.
- L3 (Low): `BL-261002-list-pending-required-reviews` still says the waiver is recorded in the Reviews table; the journal-slot departure is authorized by the Known Unknown and logged → approved deferral to the backlog item's closure at m02 delivery (see Deferred Findings).

Reviewer: fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-p13-rev-20261103-01`, reconnaissance not attempted); re-ran the branch-build probes and proved three guards can fail.

**Outcome:** fixes queued: p13-t05, p13-t06, p13-t07

**Outcome:** fixes queued: p13-t05, p13-t06, p13-t07; all three completed (head `2375b77bd`) and passed re-review (reviews/archived/p13-review-2026-11-03T213802Z.md)

### Review Received: p13 (re-review of the fix records)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p13-review-2026-11-03T213802Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

Scope: the fix range `2f1dae7a0..2375b77bd` (p13-t05, p13-t06, p13-t07), fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-p13-rev-20261103-02`, reconnaissance not attempted). It confirmed M1, L1 and L2 resolved, neutralized the missing-list, provisional and missing-key waiver guards in turn (5, 4 and 3 tests failed), restored a clean tree, and probed `--scope project` on this project (`missing: []`, provisional p08 and p09 excluded) and a scratch task-mode project. The implementer's plan-row concern is not a gap: every template, the brief and goal skills seed `plan | artifact`, and a disabled plan review records the skip line.

- L1 (Low, bookkeeping): the p13-t05 record does not cite the guard-can-fail control the amended Exit evidence requires → fixed at receive (bookkeeping): an appended correction line after the p13-t05 record cites the implementer's and the re-reviewer's controls.

**Outcome:** passed — bookkeeping-only fixes applied at receive (reviews/archived/p13-review-2026-11-03T213802Z.md)

## Phase p-rev1: Refuse a malformed Reviewed Head in review resolve

**Status:** completed
**Base:** efea9ac0a6923fe62af1abbcc78180df7312d3ec
**Head:** 2c341cff58b74a8cb13ff9e80c4e27690ea27210
**Executor:** phase-implementer:rgi-prev1-impl-20261103-01
**Corrects:** p12

Worktree: the project branch checkout (`goal/review-gate-integrity-m02`). Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`). Parallelism assessment: rung 3, one phase implementer; p-rev2 follows sequentially (no parallel group declared). Added at `efea9ac0a` by the m02 exit gate receive. `origin/main` has not moved since the p07 base merge.

Phase verification at the head: pass. The code state is `c16a278ab`, and only the journal commit follows it. `git fetch origin main` showed that `origin/main` has not moved past the merge base. The DoD gates ran in CI order and each exited 0:

- `pnpm check` (5 of 11 cached);
- `pnpm type-check` (5 of 11 cached);
- `pnpm test` (5 of 12 cached) and `pnpm test:evidence` (0 of 12 cached);
- `pnpm build` (a FULL TURBO replay of the uncached 0-of-5 build of the same source run before the task commit);
- `pnpm run check:skill-bumps` (16 checks; no skill changed in this phase);
- `release:check-versions`;
- `release:validate` (five packages at 0.3.46);
- `pnpm build:docs` (cache replay, then forced with 0 of 6 cached);
- the docs index regeneration, with `git diff --exit-code -- apps/oat-docs/index.md` exiting 0.

`pnpm lint`, `pnpm format`, the isolated-HOME contract suites (`src/commands/init/tools/shared` and `src/validation`, 1205/1205) and the p-rev1 journal check at review also exited 0. No version bump was needed: the lockstep packages are already at 0.3.46 and no skill or agent changed.

### Task p-rev1-t01: `oat review resolve` refuses a Reviewed Head that is neither a full SHA nor `-`

**Status:** completed
**Executor:** phase-implementer:rgi-prev1-impl-20261103-01
**Handle:** direct:rgi-prev1-impl-20261103-01:p-rev1-t01
**Intent:** Fix M1 of the m02 exit gate. The resolver reads the raw Reviewed Head cell of the bound row instead of the parser's validated `reviewedHead`. A `-` cell, or a ledger without a Reviewed Head column, still reads `unavailable` and is accepted. Any other cell that is not a full SHA, such as an abbreviated SHA or `not-a-sha`, refuses with the new diagnostic `reviewed_head_invalid`, `checks.reviewedHead: mismatch` and exit 1. `parseReviewTable` keeps its default output; only the resolver opts in to the raw cell, so no other reader changes.
**Files:** `packages/control-plane/src/{types,index}.ts`, `packages/control-plane/src/state/reviews.ts`, `packages/control-plane/src/state/reviews.test.ts`, `packages/control-plane/README.md`, `packages/cli/src/commands/review/resolve.ts`, `packages/cli/src/commands/review/__tests__/resolve.test.ts`, `apps/oat-docs/docs/reference/cli-reference.md`.
**Proof command:** `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/reviews.test.ts && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review src/commands/help-snapshots.test.ts`, then the gate artifact's M1 reproduction against the rebuilt branch CLI.
**Commit:** c16a278abea0aa19891cb9b207d022c33b653f10
**Proof:** control-plane `reviews.test.ts` 15/15 exit 0 (2 new tests); CLI `src/commands/review` plus `help-snapshots.test.ts` 142/142 (6 files) exit 0 (5 new resolver tests); control-plane and CLI `type-check` and `lint` exit 0; `docs:check` and `docs:lint` exit 0; `pnpm build` exit 0 (0 of 5 cached).

**Changes.** `parseReviewTable(planContent, { rawReviewedHead: true })` also returns the unvalidated cell as `reviewedHeadCell` when the table has a Reviewed Head column (empty when a short row has no cell). The option is off by default, so `getProjectState`, `review latest`, `review check` and `review pending` get the same rows as before. The resolver opts in. A missing column or a `-` cell reads `unavailable`. A full SHA compares by exact equality as before. Anything else, including an empty cell, is `reviewed_head_invalid`, with `source: row`, `expected` set to the event head, `actual` set to the raw cell, `checks.reviewedHead: mismatch` and exit 1. The `ReviewStatus` type, the control-plane README and the CLI reference document the field and the new code. The CLI reference code list now names `reviewed_head_invalid`. The receive skill's Step 1 tells the reader to report each diagnostic's `code`, `expected` and `actual` and does not list codes, so it stays true and no skill changed. `reviews/index.md` still reads true: it says any difference other than `-` is a mismatch.

**M1 reproduction** (the gate artifact's probe, verbatim, `python3 -I` from the repository root):

| Case              | Pre-change branch build (390fb8391)         | Branch build (c16a278ab)                               |
| ----------------- | ------------------------------------------- | ------------------------------------------------------ |
| match             | exit 0, `ok`, `match`                       | exit 0, `ok`, `match`                                  |
| wrong-full        | exit 1, `refused`, `reviewed_head_mismatch` | exit 1, `refused`, `reviewed_head_mismatch`            |
| abbreviated       | exit 0, `ok`, `unavailable` (the M1 defect) | exit 1, `refused`, `mismatch`, `reviewed_head_invalid` |
| malformed         | exit 0, `ok`, `unavailable` (the M1 defect) | exit 1, `refused`, `mismatch`, `reviewed_head_invalid` |
| unavailable (`-`) | exit 0, `ok`, `unavailable`                 | exit 0, `ok`, `unavailable`                            |

A legacy five-column ledger with no Reviewed Head column on the branch build gives exit 0, `ok`, `unavailable`, no diagnostics. The released `0.3.45` `oat` on PATH has no `review resolve`: it exits 1 with `unknown command 'resolve'`. The pre-change branch build is therefore the bad state that accepts the malformed cells.

**Negative control.** In the bad state, the pre-change branch build at `390fb8391` accepted the abbreviated and the malformed cell as `unavailable` with exit 0. After the fix, the branch build refuses the same cells with `reviewed_head_invalid` and exit 1. The valid controls still pass: the matching full SHA and `-` are accepted, and a legacy column-less ledger reads `unavailable`.

**Can-fail proofs.** Each guard was neutralized in the working tree and its suite run. The file was then restored and checked byte-identical with `cmp`.

1. The resolver's `!FULL_SHA.test(rowHead)` branch was disabled. `resolve.test.ts` failed 4 of 27: the abbreviated, malformed and empty-cell refusals, and the CLI exit-1 test.
2. The parser's `reviewedHeadCell` emission was disabled. `reviews.test.ts` failed 1 of 15: the raw-cell test.
3. The resolver's `rawReviewedHead: true` opt-in was dropped, which restores the pre-change read. `resolve.test.ts` failed 11 of 27, the three invalid-cell refusals among them.

### Review Received: p-rev1

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p-rev1-review-2026-11-03T221746Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

Scope: `efea9ac0a..2c341cff5` (p-rev1-t01, corrects p12), fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-prev1-rev-20261103-01`, reconnaissance not attempted). It re-ran the gate's M1 reproduction plus uppercase-SHA, empty-cell and legacy-table cases on the branch build (match, uppercase, `-` and legacy accepted; wrong full SHA `reviewed_head_mismatch`; abbreviated, malformed and empty `reviewed_head_invalid`), confirmed every other reader sees unchanged rows, scanned 514 local `plan.md` files for empty cells (none), and proved two guards can fail. The m02 exit gate's M1 is resolved.

- L1 (Low, optional): the resolver's JSON `row` report shows `reviewedHead: null` for an invalid cell as for `-`, while the `reviewed_head_invalid` diagnostic carries the raw cell → approved deferral (see Deferred Findings); no consumer reads the row field to tell the two apart, and the refusal already reports the raw value.

**Outcome:** passed (deferred items only)

## Phase p-rev2: Resolve synced-project review ancestry in the source repository

**Status:** completed
**Base:** 33d1edfef88633cfeab8a28c3441b09bb2922bf1
**Head:** d128a41181d86d258be802500c4129bf45ed0fa0
**Executor:** phase-implementer:rgi-prev2-impl-20261103-01
**Corrects:** p07

Worktree: the project branch checkout (`goal/review-gate-integrity-m02`). Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`). Parallelism assessment: rung 3, one phase implementer, after p-rev1 was accepted at `33d1edfef`. `origin/main` has not moved since the p07 base merge.

Phase verification at the head: pass. The code state is `564d91470`; only the journal commit follows it. `git fetch origin main` showed that `origin/main` has not moved past the merge base. The DoD gates ran in CI order and each exited 0:

- `pnpm check` (9 of 11 cached);
- `pnpm type-check` (9 of 11 cached);
- `pnpm test` (9 of 12 cached) and `pnpm test:evidence` (0 of 12 cached);
- `pnpm build` (a FULL TURBO replay of the build of the same source run before the task commit, in which the CLI task was rebuilt);
- `pnpm run check:skill-bumps` (16 checks; no skill or agent role changed in this phase);
- `release:check-versions`;
- `release:validate` (five packages at 0.3.46);
- `pnpm build:docs` (a cache replay, then forced with 0 of 6 cached);
- the docs index regeneration, with `git diff --exit-code -- apps/oat-docs/index.md` exiting 0.

`pnpm lint`, `pnpm format`, the isolated-HOME contract suites (`src/commands/init/tools/shared` and `src/validation`, 1205/1205) and the p-rev2 journal check at review also exited 0. No version bump was needed: the lockstep packages are already at 0.3.46 and no skill or agent changed.

### Task p-rev2-t01: `oat project status` resolves review head ancestry in the repository that contains the project

**Status:** completed
**Executor:** phase-implementer:rgi-prev2-impl-20261103-01
**Handle:** direct:rgi-prev2-impl-20261103-01:p-rev2-t01
**Intent:** Fix M2 of the m02 exit gate. `getProjectStateWithReviewAncestry` runs `git merge-base --is-ancestor` with `cwd` at the project directory, so when that directory is its own nested repository the source commits a Reviewed Head names do not resolve and `oat project status` keeps a superseded `received` event live. Run its ancestry queries from the project's parent directory instead, the boundary `oat project list` already uses (its `cwd` is the scope root), so git discovers the source repository that `review latest` and `review check` query. The control-plane reader stays pure.
**Files:** `packages/cli/src/commands/review/head-ancestry.ts`, `packages/cli/src/commands/review/__tests__/ancestry-wiring.test.ts`.
**Proof command:** `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review src/commands/project/status.test.ts src/commands/project/list.test.ts`, then the gate artifact's M2 reproduction against the rebuilt branch CLI.
**Commit:** 564d91470973a83f66564f511270eea7acfa8b74
**Proof:** the proof command passed 121/121 tests in 7 files, exit 0. `ancestry-wiring.test.ts` now runs each case in both the `shared` and the `synced-nested` layout, 4 tests in all. CLI `type-check` and `lint` exited 0, and so did `oxfmt --check` on both files. `pnpm build` exited 0, with 4 of 5 tasks cached; the CLI task was rebuilt.

**Which readers diverged.** The pre-change branch build ran over a supplementary reader probe: the M2 ledger in three layouts, read by `project status`, `project list --scope synced`, `review latest --actionable-project` and `review check`, all with cwd at the source repository root. Only `project status` diverged, and only when the project directory was an independent nested repository.

- `project list` already agreed: `listProjectsWithReviewAncestry` runs git from the scope root, the project's parent directory.
- `review latest` and `review check` already agreed: they run git from `resolveProjectRoot(cwd)`.
- A linked-worktree synced checkout already agreed under every reader. `oat project new` and `oat project pull` create synced checkouts this way, and a linked worktree shares the source object store, so the source heads resolve in it.

**Fix.** `getProjectStateWithReviewAncestry` now runs git from `dirname(resolve(projectPath))`, the boundary `project list` uses for the same project. From there git discovers the repository that contains the project. Nothing else changed:

- the status command and its dependency signature are unchanged;
- an absolute `--project-path` still reads without resolving a repository from cwd (the existing `status.test.ts` control passes);
- the control-plane reader still takes precomputed ancestry and runs no git.

No doc describes the git working directory, so none changed. The CLI reference and the reviews page say only that ancestry is answered with `git merge-base --is-ancestor`. The control-plane `AGENTS.md` and README say the CLI supplies the resolver. All of these remain true.

**M2 reproduction.** The gate artifact's probe was extracted verbatim (sha256 `a669787d…e30be`) and run with `python3 -I` from the repository root:

| Layout          | Pre-change branch build (78eae1e55)                                                               | Branch build (564d91470)                                                   |
| --------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| no nested git   | status `oat-project-summary`, latest null, check `superseded_received_row`                        | status `oat-project-summary`, latest null, check `superseded_received_row` |
| nested git (M2) | status `oat-project-review-receive` (the M2 defect), latest null, check `superseded_received_row` | status `oat-project-summary`, latest null, check `superseded_received_row` |

**Supplementary reader probe** (branch build). The descendant later head retires the event in every reader in every layout: ordinary, nested and linked worktree; status, list, latest and check. The unresolvable later head (`f`×40) keeps the event live in every reader in every layout: status and list route to receive, latest returns `reviews/r1.md`, and check reports nothing.

**Negative control.**

- Bad state: the pre-change branch build routed `project status` to `oat-project-review-receive` for the nested layout, while latest and check treated the event as superseded.
- After the fix: the branch build retires the event in status, so all four readers agree.
- Valid controls still pass. The ordinary layout gives the same results before and after the fix. The unresolvable, non-descendant head stays live in every reader.

**Can-fail proof.** The fix was neutralized in the working tree by restoring `projectPath` as git's cwd, and the wiring test was run. `ancestry-wiring.test.ts` failed 1 of 4: the `synced-nested` descendant case, at the status assertion (`expected 'oat-project-review-receive' not to be 'oat-project-review-receive'`). The file was then restored and checked byte-identical with `cmp`.

### Review Received: p-rev2

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p-rev2-review-2026-11-03T223853Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

Scope: `33d1edfef..d128a4118` (p-rev2-t01, corrects p07), fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-prev2-rev-20261103-01`, reconnaissance not attempted). It confirmed every implementer claim (only `project status` diverged; `project list` already used the scope root; linked-worktree synced checkouts never diverged), re-ran the gate's M2 reproduction verbatim (all readers agree in both layouts), proved the new wiring's test can fail, and found no regression for shared or local projects or the absolute `--project-path` contract. The m02 exit gate's M2 is resolved.

- L1 (Low): `review latest` and `review check` still resolve the repository from the caller's cwd (`latest.ts:462`, `check.ts:329`), so run from inside a nested independent project repository, or with a separate-repository synced scope root, they can disagree with `project status` → approved deferral (see Deferred Findings); pre-existing, and only in layouts OAT never creates (`oat project new` and `pull` make linked worktrees).

**Outcome:** passed (deferred items only)

## Phase p-rev3: Keep a retired waiver from hiding a later pending review

**Status:** in_progress
**Base:** 91d2e491f289528577d23d832584c2cda10b44a6
**Head:** c08b2c054d95dda0691fc3a247b70c5acdaa8007
**Executor:** phase-implementer:rgi-prev3-impl-20261103-01
**Corrects:** p13

Worktree: the project branch checkout (`goal/review-gate-integrity-m02`). Committing owner: the phase implementer (`oat-phase-implementer-claude-claude-opus-5-5-high`). Parallelism assessment: rung 3, one phase implementer. Added at `91d2e491f` by the m02 exit gate rerun receive. `origin/main` has not moved since the p07 base merge.

Phase verification at the head: pass. The code state is `f29800f5a` (p-rev3-t01), and only the journal record commit follows it. `git fetch origin main` showed `origin/main` still at the merge base `c42fd95bd`. The DoD gates ran in CI order and each exited 0:

- `pnpm check` (5 of 11 cached);
- `pnpm type-check` (5 of 11 cached);
- `pnpm test` (5 of 12 cached) and `pnpm test:evidence` (0 of 12 cached; CLI 444 files and 9533 tests, control-plane 14 files and 316 tests);
- `pnpm build` (5 of 5 cached, a replay; the forced `test:evidence` built all five packages uncached, and an uncached 0-of-5 build of the same source ran before the probes);
- `pnpm run check:skill-bumps` (16 checks; pr-progress and pr-final already carry their m02 bump);
- `release:check-versions`;
- `release:validate` (five packages at 0.3.46);
- `pnpm build:docs` (6 of 6 cached, then forced with 0 of 6 cached);
- the docs index regeneration, with `git diff --exit-code -- apps/oat-docs/index.md` exiting 0.

`pnpm lint` and `pnpm format` (5 of 10 cached each), the isolated-HOME contract suites (`src/commands/init/tools/shared` and `src/validation`, 1205/1205), `pnpm test:skills`, `pnpm oat:validate-skills` (68 skills) and the p-rev3 journal check at review (branch build) also exited 0. Exit evidence: p-rev3-t01 (the gate's M1 reproduction lists the new row pending; active, inert-after-review and fresh-waiver controls; pre/post branch-build negative control; guard-can-fail G1 to G3; skills, CLI reference and Reviews page state the rule). No version bump was needed and no recovery attempt was used (0 of 10).

Head advanced from `8ce9e2a54` to the p-rev3-t02 record commit `08a2dc6d5` after the review fix p-rev3-t02 (request `rgi-prev3-fix-20261103-01`, code state `bc77d8025`); no later phase has a Base. Each gate exited 0, in CI order: `pnpm check` (5 of 11 cached), `pnpm type-check` (5 of 11 cached), `pnpm test` (5 of 12 cached), `pnpm test:evidence` (0 of 12 cached; CLI 9534 tests, control-plane 317), `pnpm build` (5 of 5 cached, a replay; an uncached 0-of-5 build of the same source ran before the probes, and the forced evidence run rebuilt), `check:skill-bumps` (16 checks), `release:check-versions` (after `git fetch origin main`, still `c42fd95bd`), `release:validate` (0.3.46), `pnpm build:docs` (cached, then forced with 0 of 6 cached) and the docs index regeneration with an empty diff. `pnpm lint` and `pnpm format` (5 of 10 cached each), the isolated-HOME contract suites (1205/1205) and the p-rev3 journal check at review also exited 0. No version bump was needed (the lockstep packages are at 0.3.46 and no skill changed); recovery attempts 0 of 10.

Head advanced from `08a2dc6d5` to the p-rev3-t03 record commit `edc4b4eee` after the review fix p-rev3-t03 (request `rgi-prev3-fix-20261103-02`, code state `ee5d306c8`); no later phase has a Base. Each gate exited 0, in CI order: `pnpm check` (5 of 11 cached), `pnpm type-check` (5 of 11 cached), `pnpm test` (5 of 12 cached), `pnpm test:evidence` (0 of 12 cached; CLI 9535 tests, control-plane 317), `pnpm build` (5 of 5 cached, a replay; an uncached 0-of-5 build of the same source ran before the probes, and the forced evidence run rebuilt), `check:skill-bumps`, `release:check-versions` (after `git fetch origin main`, still `c42fd95bd`), `release:validate` (0.3.46), `pnpm build:docs` (cached, then forced with 0 of 6 cached) and the docs index regeneration with an empty diff. `pnpm lint` and `pnpm format` (5 of 10 cached each), the isolated-HOME contract suites (1205/1205) and the p-rev3 journal check at review also exited 0. No version bump was needed; recovery attempts 0 of 10.

Head advanced from `edc4b4eee` to the p-rev3-t04 record commit `c08b2c054` after the review fix p-rev3-t04 (request `rgi-prev3-fix-20261103-03`, code state `c5e3d2ee5`); no later phase has a Base. Each gate exited 0, in CI order: `pnpm check` (0 of 11 cached), `pnpm type-check` (5 of 11 cached), `pnpm test` (5 of 12 cached), `pnpm test:evidence` (0 of 12 cached; CLI 9535 tests, control-plane 317), `pnpm build` (5 of 5 cached, a replay; the forced evidence run rebuilt uncached, and t04 changed no package source), `check:skill-bumps` (16 checks), `release:check-versions` (after `git fetch origin main`, still `c42fd95bd`), `release:validate`, `pnpm build:docs` (cached, then forced with 0 of 6 cached) and the docs index regeneration with an empty diff. `pnpm lint` and `pnpm format` (5 of 10 cached each), the isolated-HOME contract suites (1205/1205) and the p-rev3 journal check at review also exited 0. No version bump was needed; recovery attempts 0 of 10.

### Task p-rev3-t01: A review waiver applies only to the pending row it names

**Status:** completed
**Executor:** phase-implementer:rgi-prev3-impl-20261103-01
**Handle:** direct:rgi-prev3-impl-20261103-01:p-rev3-t01
**Intent:** Correct p13 for the m02 exit gate rerun finding M1. `oat review pending` decides waiver applicability from the latest Scope + Type row only, so a waiver retired by a later recorded review applies again to a new `pending` row of the same key. Bind a waiver to the pending obligation it was written for: the waiver line names the listed row (`**Row:** <n>`), and applies only while that row is the key's latest row and still `pending`; a line that names no row (`-` or no `**Row:**` label, the p13 form) applies only while no row of its key records a review. Any order that cannot be established lists the key as pending. Update the waiver template in pr-progress Step 3.5 and pr-final Step 2.5, the CLI reference and the Reviews docs.
**Files:** `packages/cli/src/commands/review/pending.ts`, `packages/cli/src/commands/review/__tests__/pending.test.ts`, `packages/cli/src/commands/init/tools/shared/pending-review-listing-contracts.test.ts`, `.agents/skills/oat-project-pr-progress/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`, `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`.
**Proof command:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review` and `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`, plus the branch-build probe `/tmp/prev3-scripts/probe.py` before and after the change.
**Commit:** f29800f5a51175dc6fcdd233ea73762faac2e90e
**Proof:** `src/commands/review` plus help snapshots and `src/commands/project/delivery`: 9 files, 276 tests, exit 0 (`pending.test.ts` 22, six new). The isolated-HOME contract suites `src/commands/init/tools/shared` and `src/validation`: 29 files, 1205 tests, exit 0. CLI `type-check` and `lint` exit 0. `check:skill-bumps` exit 0 (16 checks; pr-progress and pr-final already carry their single m02 bump, so no further bump). `oat sync --scope project`: no changes. `docs:check` (0 errors) and `docs:lint` (91 files, 0 errors) exit 0. `oxfmt --check` on the seven files exit 0.

**Ordering rule chosen.** Dates cannot order a waiver against a review: the ledger Date and the waiver Date are days, and same-day events are the norm (every event of this project's m02 is dated 2026-11-03), so a date rule would either reapply a same-day retired waiver or, failing closed, refuse every fresh same-day waiver. The Intent's fallback applies instead: the waiver line names what it waives, backward-compatibly. The template gains `**Row:** <row>`, the 1-based row number the listing already reports for each pending entry (`-` for a `missing` entry). A line naming a row applies only while that row is the key's latest row and still `pending`; a recorded review in place, a later recorded row, or any later appended row (`row-mismatch`) retires it. A line naming no row (`-` or the p13 form without the field) applies only while no row of its key records a review (`review-recorded` otherwise), because it cannot be ordered against one. A malformed row (for example `03`) and a named row on a key with no row are `row-mismatch`; a `**Row:**` inside the reason is never read. Every unordered case lists the key as pending. No Reviews column, status or ledger edit is added; JSON `waivers` entries gain `row` (as written, `null` when none) and the `unapplied` set gains `row-mismatch`. Both PR skills state the rule and the field; the CLI reference and the Reviews page document it.

**Negative control** (branch build, `/tmp/prev3-scripts/probe.py`, one temporary goal project per case, scope `p01`; rows 1 `pending`, 2 `passed` 2026-11-02, 3 `pending` where shown; every run exit 0):

| Case                                                                         | Pre-change build at `7c844c203` | Post-change build at `f29800f5a`                     |
| ---------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| 1 rowless waiver over the only pending row (active control)                  | waived                          | waived                                               |
| 2 rowless waiver, then a recorded review                                     | `review-recorded`               | `review-recorded`                                    |
| 3 rowless waiver (2026-11-01), recorded review, new pending row (gate M1)    | **waived by the old line**      | **pending row 3**, `review-recorded`                 |
| 4 same rows, no waiver                                                       | pending row 3                   | pending row 3                                        |
| 5 `**Row:** 1` over the only pending row (active control)                    | waived                          | waived                                               |
| 6 old line plus fresh `**Row:** 3` after the new pending row (fresh control) | waived (by the old line)        | waived by the fresh line; old line `review-recorded` |
| 7 stale `**Row:** 1` with rows 1 to 3                                        | **waived**                      | **pending row 3**, `row-mismatch`                    |
| 8 fresh rowless line (2026-11-03) after the review                           | **waived**                      | **pending row 3**, `review-recorded` (fails closed)  |

The gate artifact's M1 script, extracted verbatim from `range-review-2026-11-03T224623Z.md` and run against the post-change build, now matches every expected outcome: `valid-waiver` waived, `recorded-review` inactive, `new-pending-after-review` lists row 3 as pending with the waiver `review-recorded`, `new-pending-no-waiver` lists row 3.

**Journal check accepts the new field:** in a scratch clone of this branch, a `**Review waived:** p13 code · **Row:** 26 · …` line appended under `## Reviews and Gates` leaves `oat project journal check --at review --scope p13` at `ok` with no reasons or warnings (branch build), and `review pending --scope m02` reports that line `row-mismatch` (row 26 is no longer the latest `p13` row).

**Guard can fail** (each neutralized in the working tree, `pending.test.ts` and `pending-review-listing-contracts.test.ts` run, then restored and checked byte-identical with `cmp`): G1, the rowless retirement guard disabled: 3 of 25 fail, the gate reproduction among them; G2, the named-row binding guard disabled: 4 of 25 fail, including the skills' documented-line cross-check; G3, `**Row:** <row>` removed from pr-final's template: 2 of 3 contract tests fail.

### Task p-rev3-t02: (review) Number waiver rows by physical table position

**Status:** completed
**Executor:** phase-implementer:rgi-prev3-fix-20261103-01 (continuation of rgi-prev3-impl-20261103-01)
**Handle:** direct:rgi-prev3-fix-20261103-01:p-rev3-t02
**Source review:** reviews/archived/p-rev3-review-2026-11-03T231519Z.md (L1)

Intent: the waiver `**Row:**` number counts only rows `parseReviewTable` accepts, which drops a row with a blank required cell, so after such a row the numbering shifts and a retired waiver can bind to a newly appended `pending` row (reproduced on the branch build, `pending.ts:352`, `reviews.ts:124-126`). Number rows by their physical position among the `## Reviews` table's data rows, so the number the listing reports and the user writes is stable whatever a row contains; a named row that does not parse is `row-mismatch`. Add the regression and a guard-can-fail control; keep the docs and skill wording true.
Files: `packages/cli/src/commands/review/pending.ts`, `packages/cli/src/commands/review/__tests__/pending.test.ts`, and the docs or skills only if their wording changes.
Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review src/commands/init/tools/shared src/validation`
**Files:** `packages/control-plane/src/state/reviews.ts` (+ `reviews.test.ts`), `packages/control-plane/src/types.ts`, `packages/control-plane/README.md`, `packages/cli/src/commands/review/pending.ts`, `packages/cli/src/commands/review/__tests__/pending.test.ts`, `apps/oat-docs/docs/reference/cli-reference.md`. The control-plane files widen the declared list mechanically: the reviewer's suggested fix, an opt-in `parseReviewTable` option beside `rawReviewedHead`, is the only place the physical data-line index exists.
**Commit:** bc77d8025b1c32c7c6743cbcf579c18ea15976e2
**Proof:** the proof command exited 0 (34 files, 1286 tests); control-plane 317/317; CLI and control-plane `type-check` and `lint` exit 0; `docs:lint` 0 errors; `oxfmt --check` on the seven files exit 0.

**Change.** `parseReviewTable(planContent, { dataLine: true })` adds `dataLine`, each row's 1-based position among the table's data lines, counted before rows with an empty required cell are dropped (off by default; `ProjectState.reviews` never carries it). `oat review pending` numbers rows with it, so the `row` it reports, and the `**Row:**` the skills tell users to copy from it, are the same physical number; a named row whose line does not parse can never equal a key's latest row, so it is `row-mismatch`. The skills' wording ("the row number the listing reports") stays true and is unchanged; the CLI reference and the control-plane README state the numbering.

**Negative control** (branch build, `/tmp/prev3-scripts/l1.py`, five-column ledger, scope `p01`, every run exit 0):

| Case                                                                             | Pre-fix build at `6936c2fed`     | Post-fix build at `bc77d8025`     |
| -------------------------------------------------------------------------------- | -------------------------------- | --------------------------------- |
| L1: `**Row:** 1` waiver, row 1 claimed with a blank Date cell, new `pending` row | **waived (row 1)**, applied      | **pending row 2**, `row-mismatch` |
| Well-formed claimed row 1, new `pending` row (control)                           | pending row 2, `row-mismatch`    | pending row 2, `row-mismatch`     |
| Fresh `**Row:** 2` after the malformed row                                       | waived by the stale line (row 1) | waived by the fresh line (row 2)  |
| Active `**Row:** 1` over the only pending row                                    | waived                           | waived                            |

**Second table inside `## Reviews`:** not fixed, as directed. Physical numbering counts every table line after the first separator, so a second table's header and separator still take row numbers; a narrow second table (no Date or Artifact column), whose lines the old numbering dropped, now also takes numbers (probe: `p01` row 1, a trailing `p02` row 5 after a two-column table, previously 2). The listing and the user-written number still agree.

**Guard can fail** (each neutralized in the working tree, the test run, then restored and checked byte-identical with `cmp`): G4, `pending.ts` calling `parseReviewTable(planContent)` without `dataLine`: the L1 regression fails (1 of 23); G5, `reviews.ts` returning `dataLine: 0 + 1` for every row: the control-plane `dataLine` test fails (1 of 16).

### Review Received: p-rev3

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p-rev3-review-2026-11-03T231519Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

Scope: `91d2e491f..8ce9e2a54` (p-rev3-t01, corrects p13), fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-prev3-rev-20261103-01`, reconnaissance not attempted). The gate rerun's M1 reproduction passes; fail-closed cases (missing key, pending after review, several waivers, cross-key row, malformed or empty row, `**Row:**` in the reason) hold; numbering is stable under oxfmt; both skills carry the same template; journal check accepts old and new lines; two guards proved able to fail.

- L1 (Low): row numbers skip rows `parseReviewTable` drops (a blank required cell), so a retired waiver can bind to a later pending row → fix task p-rev3-t02; a fail-open path in an assurance guard, and p-rev3 is still the latest phase, so its head may advance.

**Outcome:** fixes queued: p-rev3-t02

**Outcome:** fixes queued: p-rev3-t02; completed (head `08a2dc6d5`); its re-review queued p-rev3-t03

### Task p-rev3-t03: (review) Retire rowless waivers when a Reviews data row does not parse

**Status:** completed
**Executor:** phase-implementer:rgi-prev3-fix-20261103-02 (continuation of rgi-prev3-impl-20261103-01)
**Handle:** direct:rgi-prev3-fix-20261103-02:p-rev3-t03
**Source review:** reviews/archived/p-rev3-review-2026-11-03T233325Z.md (L1)

Intent: a rowless (p13-form) waiver cannot see a review recorded in a row `parseReviewTable` drops (a blank required cell), so it still applies to a later pending row of its key (reproduced on the branch build, `pending.ts:320`). Fail closed: in `listPendingReviews`, treat any gap in the `dataLine` sequence as an unparseable data row and retire every rowless waiver while one exists (the key may be unreadable from the malformed line). Add the regression and a guard-can-fail control; keep docs true.
Files: `packages/cli/src/commands/review/pending.ts`, `packages/cli/src/commands/review/__tests__/pending.test.ts`, docs only if wording changes.
Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review`
**Files:** `packages/cli/src/commands/review/pending.ts`, `packages/cli/src/commands/review/__tests__/pending.test.ts`, `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`.
**Commit:** ee5d306c84a79cd483801d01eb30dc5e98b00395
**Proof:** the proof command plus `src/commands/init/tools/shared` and `src/validation` under the isolated HOME exited 0 (34 files, 1287 tests); CLI `type-check` and `lint` exit 0; `docs:check` (0 errors) and `docs:lint` exit 0; `oxfmt --check` on the four files exit 0.

**Change.** `listPendingReviews` sets `ledgerHasUnparsedRow` when the parsed rows' `dataLine` values are not exactly `1..n`, which means a data line before the last parsed row did not parse. While it is set, every waiver line naming no row is unapplied with the new reason `unparsed-row` (checked after `review-recorded`, so a visible review still reports that reason). The key is not recovered from the malformed line. Named-row waivers keep their rules (`row-mismatch`). A dropped line after the last parsed row is not a gap: no `pending` row follows it to be hidden. The CLI reference adds `unparsed-row` to the reason list and one clause to the rowless rule; the Reviews page adds one sentence.

**Negative control** (branch build, `/tmp/prev3-scripts/l1b.py`, five-column ledger, scope `p01`, every run exit 0):

| Case                                                                 | Pre-fix build at `21c67c4c0` | Post-fix build at `ee5d306c8`     |
| -------------------------------------------------------------------- | ---------------------------- | --------------------------------- |
| Rowless waiver, row 1 claimed with a blank Date, new `pending` row 2 | **waived (row 2)**           | **pending row 2**, `unparsed-row` |
| Same with a blank Scope cell                                         | **waived (row 2)**           | **pending row 2**, `unparsed-row` |
| Well-formed claimed row 1, new `pending` row (control)               | pending 2, `review-recorded` | pending 2, `review-recorded`      |
| Rowless waiver over a well-formed pending row (active control)       | waived 1                     | waived 1                          |
| `**Row:** 2` after the blank-Date row (named control)                | waived 2                     | waived 2                          |
| Dropped line after the only pending row (trailing control)           | waived 1                     | waived 1                          |

**Guard can fail:** G6, the `unparsed-row` check neutralized (`false &&`): the new regression fails (1 of 24); restored and checked byte-identical with `cmp`.

### Review Received: p-rev3 (re-review of p-rev3-t02)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p-rev3-review-2026-11-03T233325Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

Scope: `8ce9e2a54..08a2dc6d5` (p-rev3-t02), fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-prev3-rev-20261103-02`, reconnaissance not attempted). L1 resolved (the prior reproduction lists row 2 pending and the stale `**Row:** 1` reads `row-mismatch`); other readers unchanged; two guards proved able to fail; second-table numbering adds no fail-open.

- L1 (Low): a rowless waiver still applies after a recorded review whose row does not parse → fix task p-rev3-t03 (review cycle 2 of 3; a fail-open path in an assurance guard with a small fail-closed fix).

**Outcome:** fixes queued: p-rev3-t03

**Outcome:** fixes queued: p-rev3-t03; completed (head `edc4b4eee`); its re-review (cycle 3) queued p-rev3-t04

### Task p-rev3-t04: (review) Name the unparsed-row case in the PR skills' waiver rule

**Status:** completed
**Executor:** phase-implementer:rgi-prev3-fix-20261103-03 (continuation of rgi-prev3-impl-20261103-01)
**Handle:** direct:rgi-prev3-fix-20261103-03:p-rev3-t04
**Source review:** reviews/archived/p-rev3-review-2026-11-03T234849Z.md (L1)

Intent: pr-progress Step 3.5 and pr-final Step 2.5 describe the rowless-waiver rule without the `unparsed-row` case, so with an unparseable Reviews row a `**Row:** -` waiver for a missing key stays `missing` with no next step; the Reviews page's advice to name the row cannot work for a missing key. Add one clause to each skill (an `unparsed-row` waiver means fix the malformed Reviews row, then re-run the listing) and correct the Reviews page wording; update any pin that covers the rule. Both skills are already bumped on this branch.
Files: `.agents/skills/oat-project-pr-progress/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`, `packages/cli/src/commands/init/tools/shared/pending-review-listing-contracts.test.ts` if a pin covers it.
Proof: the isolated-HOME contract suites.
**Files:** `.agents/skills/oat-project-pr-progress/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`, `apps/oat-docs/docs/workflows/projects/reviews/index.md`, `packages/cli/src/commands/init/tools/shared/pending-review-listing-contracts.test.ts`.
**Commit:** c5e3d2ee54d2b3ca4366a8395efcfc55b382f666
**Proof:** the isolated-HOME contract suites (`src/commands/init/tools/shared` and `src/validation`) exited 0, 1205/1205. `check:skill-bumps` exit 0 (16 checks; both skills already carry their m02 bump, so none added), `oat sync --scope project` no changes, `oat:validate-skills` exit 0, `docs:lint` exit 0, `oxfmt --check` on the four files exit 0.

**Change.** Both skills' rowless sentence now reads, identically: "A line naming no row stops applying once any row of its key records a review, and while a `## Reviews` row that does not parse sits above a parsed row (`unapplied: unparsed-row`); fix that row, then re-run the listing." The Reviews page names `unparsed-row`, says to fix the row and re-run the listing, and states that a waiver naming its row also applies but a `missing` key has no row to name, so fixing the row is its only remedy. The existing `WAIVER_RETIRED` pin, asserted in both skills' step sections, carries the full sentence.

**Pin can fail:** G7, the clause removed from pr-progress: the pr-progress pin fails (1 of 3); G8, the clause removed from pr-final: the pr-final pin fails (1 of 3). Each skill was restored and checked byte-identical with `cmp`.

### Review Received: p-rev3 (re-review of p-rev3-t03, cycle 3 of 3)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/p-rev3-review-2026-11-03T234849Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

Scope: `08a2dc6d5..edc4b4eee` (p-rev3-t03), fresh `oat-reviewer-claude-claude-opus-5-5-high` (request `rgi-prev3-rev-20261103-03`, reconnaissance not attempted). L1 resolved (blank Date and blank Scope reproductions list the new row pending with `unparsed-row`; controls hold); the trailing-line exception is caught once a pending row follows; the ledger-wide trade-off is documented; no other reader changed; two guards proved able to fail.

- L1 (Low): the PR skills omit the `unparsed-row` case from the rowless-waiver rule → the review-cycle cap is reached, so the root put it to the operator, who chose (2026-11-03) to fix it as p-rev3-t04 with the m02 exit gate rerun over `p07-p-rev3` as its review, instead of a fourth p-rev3 cycle.

**Outcome:** fixes queued: p-rev3-t04 (operator decision at the cycle cap; reviewed by the exit gate rerun)

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
- run/v1 · request=rgi-p11-impl-20261102-01 · scope=p11 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p11 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p11-rev-20261102-01 · scope=p11 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p11 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- Root-inline phase: p11 review fix (p11-t06) · reason: four Lows of a passing review, fixed at receive · root model claude-opus-5-5
- Root-inline phase: p11 m01-integrated-review fix (p11-t07) · reason: one Medium and two Lows, a one-sentence definition change plus journal corrections · root model claude-opus-5-5
- run/v1 · request=rgi-m01-rev-20261102-02 · scope=m01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=m01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p07-impl-20261103-01 · scope=p07 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p07 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p07-rev-20261103-01 · scope=p07 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p07 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p07-fix-20261103-01 · scope=p07-fix · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p07-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=rgi-p07-impl-20261103-01 · observed=~ · match=~
- run/v1 · request=rgi-p07-rev-20261103-02 · scope=p07 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p07 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p12-impl-20261103-01 · scope=p12 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p12 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p12-rev-20261103-01 · scope=p12 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p12 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
-
- run/v1 · request=rgi-p12-fix-20261103-01 · scope=p12-fix · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p12-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=rgi-p12-impl-20261103-01 · observed=~ · match=~
- run/v1 · request=rgi-p12-rev-20261103-02 · scope=p12 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p12 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p13-impl-20261103-01 · scope=p13 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p13 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p13-rev-20261103-01 · scope=p13 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p13 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-p13-fix-20261103-01 · scope=p13-fix · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p13-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=rgi-p13-impl-20261103-01 · observed=~ · match=~
- run/v1 · request=rgi-p13-rev-20261103-02 · scope=p13 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p13 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-prev1-impl-20261103-01 · scope=p-rev1 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev1 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-prev1-rev-20261103-01 · scope=p-rev1 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev1 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-prev2-impl-20261103-01 · scope=p-rev2 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev2 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-prev2-rev-20261103-01 · scope=p-rev2 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev2 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-prev3-impl-20261103-01 · scope=p-rev3 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev3 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-prev3-rev-20261103-01 · scope=p-rev3 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev3 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-prev3-fix-20261103-01 · scope=p-rev3-fix · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev3-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=rgi-prev3-impl-20261103-01 · observed=~ · match=~
- run/v1 · request=rgi-prev3-rev-20261103-02 · scope=p-rev3 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev3 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=rgi-prev3-fix-20261103-02 · scope=p-rev3-fix · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev3-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=rgi-prev3-impl-20261103-01 · observed=~ · match=~
- run/v1 · request=rgi-prev3-rev-20261103-03 · scope=p-rev3 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p-rev3 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

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

### Review Received: final (m01 exit gate)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/final-review-2026-11-02T211656Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 1

The configured `oat-project-implement` exit gate (run `d434e7e7-9a58-43f4-9e0c-e95a543e865d`, target `claude-opus-5-5-high`) reviewed m01 (`p01, p02, p10, p11`) at the anchored head `8a97fe85dbaa5d47f4450fa46703403097f71a88`. The gate reported `achieved: same-family - no diverse target available`: the producers span both families (p01 and p02 on `gpt-5.6-sol-high`, p10 and p11 on Opus 5.5), so no cross-family target existed.

- M1 (Medium): the p11 `**Head:**` excluded the root review-fix commit `395b90677` → fixed: head advanced under the late-fix rule (p11-t06). The fix changes the anchored range, so the gate result is stale and the gate reruns over the new head.
- L1 (Low): Outcome 2 omits the operator-approved resume-pointer inclusion → fixed: Deviations row added.

**Outcome:** fixes_completed (gate passed its threshold; rerun required over the advanced head)

- Gate `oat-project-implement` (code, m01 exit, attempt 1): `ok`, `review_completed_gate_passed`, threshold `high`, counts 0/0/1/1, receive-eligible, received 2026-11-02; no attempt consumed (not blocked); same-family warning recorded above.
- Operator routing (m01 exit gate rerun, 2026-11-02): the operator directed the rerun to `--target codex-6-sol-xhigh`, matching the 2026-11-02 routing "Sol gates", because the configured selection falls back to same-family Opus when both families produced the code. One-off routing for this rerun only, not a configuration change.
- Gate `oat-project-implement` (code, m01 exit, rerun `48f5553c-f8fa-4f17-be77-7461789a416c`, `--target codex-6-sol-xhigh`): `review_failed`, `unexpected_post_selection_failure` at `target-dispatch` ("Branch-local gate route did not return JSON."). The Sol reviewer finished and the gate CLI committed its artifact `reviews/final-review-2026-11-02T213631Z.md` (0/0/0/0, reviewed head `395b90677`, Reviews row `received`), but the branch-local route receipt the gate reads after the child exits was missing or empty, so no valid envelope exists. Under Step 14 a matching artifact without a valid result envelope is `blocked/launch_result_reconciliation_required`: it cannot produce an allowed disposition and is not relaunched automatically. No attempt consumed. Carrier `m01.exit` stays at attempt 1 (`allowed`, `stale`).
- Operator choice (2026-11-02): retire the failed Sol rerun `48f5553c` (its artifact stays a local-only citation; its `received` row is not a gate result and receives no further disposition) and rerun the configured command unchanged, which selects Opus 5.5 high (same-family warning). A backlog item tracks the Codex route-receipt failure.

### Review Received: final (m01 exit gate, rerun)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/final-review-2026-11-02T233110Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

The configured `oat-project-implement` exit gate (run `0380f6e0-36ff-47cc-bf80-bc951388df6a`, target `claude-opus-5-5-high`, same-family warning as attempt 1) re-reviewed m01 (`p01, p02, p10, p11`) at the advanced head `395b90677db9487e42f01d31b045f4819f3d85ae`, narrowed by review-provide to the delta from the prior gate-reviewed head `8a97fe85d`. It re-evaluated attempt 1's M1 and L1 as resolved.

**Outcome:** passed

- Gate `oat-project-implement` (code, m01 exit, rerun `0380f6e0`): `ok`, `review_completed_gate_passed`, threshold `high`, counts 0/0/0/0, receive-eligible, received 2026-11-02. Carrier `oat_milestone_gates.m01.exit` rewritten `allowed`/`passed` at `395b90677`.
- Freshness after the rerun (`oat project delivery check --subject m01`): `exit` stale, `disallowed-path` on `40e839667`. The gate CLI committed attempt 1's artifact after `395b90677`, and section 12.8 admits a gate artifact only when its row's Reviewed Head equals the carrier's, so that commit, the Sol rerun's artifact and their archive moves can never be bookkeeping successors of `395b90677`. Recovery: the p11 head advances again under the late-fix rule to this receive commit, which closes the exit-gate review fixes, and the configured gate reruns over it. Passing reruns consume no attempt.

### Review Received: final (m01 exit gate, rerun at advanced head)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/final-review-2026-11-02T233729Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

The configured `oat-project-implement` exit gate (run `96d2da99-c2db-41e5-9361-f98e0eed24b0`, target `claude-opus-5-5-high`, same-family warning) re-reviewed m01 (`p01, p02, p10, p11`) at the advanced p11 head `1a5a37684f05492470952fdc54359a082ac9cc58`, narrowed to the delta from `395b90677`.

**Outcome:** passed

- Gate `oat-project-implement` (code, m01 exit, rerun `96d2da99`): `ok`, `review_completed_gate_passed`, threshold `high`, counts 0/0/0/0, receive-eligible, received 2026-11-02. Carrier `oat_milestone_gates.m01.exit` rewritten `allowed`/`passed` at `1a5a37684`; `oat project delivery check --subject m01` reads `exit` fresh; `oat_milestone_status` moves `implementing` → `reviewing`.

### Review Received: m01 (integrated review)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/m01-review-2026-11-02T234808Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 2

Integrated delivery review of m01 (`p01, p02, p10, p11`; range `56f55a3378d6e35dc3e67dc1437f9ca864477728..1a5a37684f05492470952fdc54359a082ac9cc58`, integration commit `234c9b281`), reviewer `oat-reviewer-claude-claude-opus-5-5-high`, manual invocation, reconnaissance not attempted. Composition across p10 and p11 holds on every path; changed-boundary probes on the branch build confirm the marker is count-neutral and the parser deferrals fail closed; suites 1282 passed; bumps, versions, docs index and sync dry run clean; p02 retirement leaves no residue; all six deferrals remain acceptable. Received under the installed ladder (no self-application in m01): review cycle 1 for m01.

- M1 (Medium): limit 1 lists the project's review artifacts as editable tracking files, which with the "provenance wording" inclusion admits edits to reviewer-owned provenance (`oat_review_head_sha`, gate fields) that receive copies into the ledger; Constraint 1 forbids rewriting raw reviewer output → fix task p11-t07: review artifacts are moved or archived by receive and never edited, plus an exclusion for edits to a review artifact's findings, frontmatter or provenance; extend the pin.
- L1 (Low): the p10 round-3 receipt applied m01's unreleased bookkeeping-only outcome to m01's own review, contrary to the brief's "No self-application in m01" decision → fix task p11-t07: append a correcting line (no rewrite).
- L2 (Low): the Progress Overview p11 row reads `pending 0/1` though p11 is accepted → fix task p11-t07.

**Outcome:** fixes queued: p11-t07 (late-fix rule: p11 is the last phase of the set and no later phase has a `**Base:**`)

### Review Received: final (m01 exit gate, rerun after p11-t07)

**Date:** 2026-11-02
**Review artifact (local-only):** reviews/archived/final-review-2026-11-02T235632Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

The configured `oat-project-implement` exit gate (run `f588e505-bf2e-4904-b833-d054ccee624a`, target `claude-opus-5-5-high`, same-family warning) re-reviewed m01 (`p01, p02, p10, p11`) at the advanced p11 head `5599af21d4927c7d39c668b9d1662509e5d3b403`, narrowed to the delta from `1a5a37684`, after the m01 integrated-review fixes (p11-t07). It confirmed the new limit-1 pin can fail (negative control: one changed word, one failing test).

- L1 (Low): limit 1's list of tracking files still names "the project's review artifacts" beside the new sentence saying receive never edits them; wording only, the limit already closes m01 M1 → deferred (see Deferred Findings).

**Outcome:** passed

- Gate `oat-project-implement` (code, m01 exit, rerun `f588e505`): `ok`, `review_completed_gate_passed`, threshold `high`, counts 0/0/0/1, received 2026-11-02. Carrier `oat_milestone_gates.m01.exit` rewritten `allowed`/`passed`/fresh at `5599af21d`; the m01 integrated-review row moves `fixes_added` → `fixes_completed`; `oat_milestone_status` moves `implementing` → `reviewing` for integrated review cycle 2.

### Review Received: m01 (integrated review, cycle 2)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/m01-review-2026-11-03T000239Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

Integrated delivery review of m01 (`p01, p02, p10, p11`; range `56f55a3378d6e35dc3e67dc1437f9ca864477728..5599af21d4927c7d39c668b9d1662509e5d3b403`, integration commit `234c9b281`), reviewer `oat-reviewer-claude-claude-opus-5-5-high`, manual invocation, reconnaissance not attempted, re-review of the delta since cycle 1 (`1a5a37684..5599af21d4927c7d39c668b9d1662509e5d3b403`) with unchanged coverage inherited from cycle 1. Cycle-1 M1, L1 and L2 confirmed resolved by p11-t07 (the new limit-1 pin fails under a trimmed sentence); the new wording composes with every branch that names the shared definition; `check:skill-bumps` and `release:check-versions` pass (lockstep 0.3.44); docs index fresh; 1282 contract, verdict and delivery tests pass; all seven deferrals remain acceptable. Review cycle 2 for m01.

**Outcome:** passed

- PR: d01 (m01: p01, p02, p10, p11) registered and opened at https://github.com/voxmedia/open-agent-toolkit/pull/400 on 2026-11-03 (base `892ecdc0a`, reviewed head `5599af21d`); milestone m01 `delivered`, endpoint merged.

### Review Received: plan (m02 amendment, structured artifact review)

**Date:** 2026-11-03
**Review artifact:** none (structured mode, `oat-reviewer-claude-claude-opus-5-5-high`, Auto Artifact-Review Loop, retry bound 2)

**Findings:** attempt 1 at `c1a653b97`: High 2 · Medium 3 · Low 7; attempt 2 at `248f3ba72`: Medium 1 · Low 3; attempt 3 at `f293a5877`: Medium 2 · Low 1.

- Attempt 1 H1 (material): the stranded-row repair would promote another event to `passed`, against bookkeeping limit 3 and the 48f5553c ruling. The operator chose read-side supersession, replacing the earlier bookkeeping-receive repair choice. H2/M1: event key made precise (ledger cells; `-` artifact rows never form a duplicate key). M2 is moot after H1; M3: the check is advisory in m02. L1–L7 folded; L6 (`Total: 9 phases`) was bookkeeping.
- Attempt 2 M1 (material): the "later round" definition was too loose across manual and gate lanes. The operator chose same lane, a recorded later round, at the same or a descendant head. L1–L3 folded.
- Attempt 3 (retry bound exhausted): M1 defines the classes (gate with any target; lifecycle = `manual`/`auto`; `-` rows stay live) with a cross-target control; M2 adds the pure-router descendant-head question to p07's Known Unknown, with a descendant-head control; L1 aligns p13's waiver wording with its Known Unknown. These were folded as artifact-local precision of the operator decisions, unreviewed by the loop; the configured `oat-project-goal` gate reviews the result.

**Outcome:** fixes_completed (residual attempt-3 findings folded; no further loop attempt)

### Review Received: plan (m02 amendment, gate)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/artifact-plan-review-2026-11-03T023206Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

- The `oat-project-goal` lifecycle gate (run `6cf18b35-39f7-4103-9625-ad09950fd3c7`, target `codex-6-sol-xhigh`, `gpt-6.1-sol` xhigh, different family from the declared `claude-opus-5-5` producer; installed CLI 0.3.45, Codex route receipt persisted) reviewed the m02 amendment bundle at `ee377dd7bcbedec4e0c66cc8d12a754c45c1587d` for m02 (`p07, p12, p13`).
- L1 (low): `state.md` descriptive prose still directed work to m01 → fixed at receive (bookkeeping): Status, Current Phase, Progress and Next Milestone prose copied from the recorded state (m01 merged at its endpoint, m02 aligning); no frontmatter, acceptance marker or gate binding changed.

**Outcome:** passed — bookkeeping-only fixes applied at receive (reviews/archived/artifact-plan-review-2026-11-03T023206Z.md)

- Gate `oat-project-goal` (plan, m02 amendment): `ok`, `review_completed_gate_passed`, threshold `high`, raw counts 0/0/0/1, receive-eligible, received 2026-11-03. First use of the released m01 bookkeeping rule on this project.
- Approval (m02 amendment): approved 2026-11-03 by user at `ee377dd7bcbedec4e0c66cc8d12a754c45c1587d` (the gate-reviewed bundle). `oat_milestone_gates.m02.plan` written `allowed`/`passed`, `config_fingerprint` `sha256:28b8b9f6da5833e6ea531f943c006778961c25070c434ebba17124cffc317b75` = sha256 of the compact JSON of `oat gate resolve oat-project-goal` `effectiveGate` (no CLI emits a canonical fingerprint; m01's value used an unrecorded method).
- Gate `oat-project-implement` (code, m02 exit, run `788ae91a-3479-436f-8d7d-08bfa2e064f8`, configured command unchanged, default selection `claude-opus-5-5-high`, released 0.3.45): `review_failed`, `review_did_not_complete`. The reviewer refused before reviewing: `--review-scope final` expands to every accepted phase (p01, p02, p10, p11, p07, p12, p13), and m01's phase heads are not ancestors of this branch after PR #400's squash merge (`c7cd3b715`), so sequential continuity fails (p07's base does not descend from p11's head `5599af21d`). No artifact, no Reviews row, no carrier written. No attempt consumed: the refusal is deterministic and the review never ran, like m01's launch-reconciliation case.
- Operator routing (m02 exit gate, 2026-11-03): run the configured gate once with `--review-scope p07-p13` (target, threshold and prompt unchanged), which resolves to exactly m02's phases p07, p12, p13 over `eba04d813..2375b77bd`, the scope `oat project delivery check --subject m02` expects. One-off routing for this run only, not a configuration change. A backlog item tracks the contract gap: in goal mode a configured `final` exit gate cannot resolve after an earlier milestone ships by squash merge.

### Review Received: p07-p13 (m02 exit gate)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/range-review-2026-11-03T215601Z.md

**Findings:** Critical 0 · High 0 · Medium 2 · Low 0

The configured `oat-project-implement` exit gate (run `93e1b0a1-9b04-4c31-9aa2-e032b9820a9d`, scope `p07-p13` under the operator's routing, default selection `codex-6-sol-xhigh`, cross-family: m02 was produced by Opus 5.5) reviewed m02 (`p07, p12, p13`) over `eba04d813..2375b77bd`. The event was validated with the branch-build `oat review resolve` (every check `match`, supersession `current`).

- M1 (Medium): `oat review resolve` reads an abbreviated or malformed Reviewed Head as the `-` placeholder and accepts it as `unavailable`, contradicting p12's exact equality → revision phase p-rev1 (`**Corrects:** p12`); a later phase has a `**Base:**`, so the late-fix rule requires a revision phase.
- M2 (Medium): in a synced project the review ancestry runs git in the nested tracking checkout, so `project status` keeps a superseded `received` event live while `review latest` and `review check` do not, contradicting Outcome 4's reader agreement → revision phase p-rev2 (`**Corrects:** p07`).

**Outcome:** fixes queued: p-rev1, p-rev2 (gate passed its threshold; the exit gate reruns over the milestone set `p07-p-rev2` after both are accepted)

- Gate `oat-project-implement` (code, m02 exit, run `93e1b0a1-9b04-4c31-9aa2-e032b9820a9d`, `--review-scope p07-p13`): `ok`, `review_completed_gate_passed`, threshold `important`, counts 0/0/2/0, receive-eligible, received 2026-11-03; no attempt consumed (not blocked). No carrier written: queued fixes require the rerun, which writes `oat_milestone_gates.m02.exit`.
- Operator routing applied to the rerun (m02 exit gate, 2026-11-03): the fixes queued by run `93e1b0a1` require the exit gate to rerun over the milestone set, so the rerun uses the same m02-phases scope the operator chose, now `--review-scope p07-p-rev2` (p07, p12, p13, p-rev1, p-rev2), with target, threshold and prompt unchanged.

### Review Received: p07-p-rev2 (m02 exit gate rerun)

**Date:** 2026-11-03
**Review artifact (local-only):** reviews/archived/range-review-2026-11-03T224623Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 0

The exit gate rerun (run `d738cd0e-5795-48ef-a387-e3ec184f90e5`, scope `p07-p-rev2`, default selection `codex-6-sol-xhigh`, cross-family) reviewed m02 (`p07, p12, p13, p-rev1, p-rev2`) over `eba04d813..d128a4118`. It found the first run's M1 and M2 resolved.

- M1 (Medium): `oat review pending` judges a waiver against the latest Scope + Type row only, so a waiver retired by a later recorded review applies again to a newly appended `pending` row and a PR proceeds without a review or a fresh waiver, contradicting p13's "inert once a later row records a review" → revision phase p-rev3 (`**Corrects:** p13`).

**Outcome:** fixes queued: p-rev3 (gate passed its threshold; the exit gate reruns over `p07-p-rev3` after p-rev3 is accepted)

- Gate `oat-project-implement` (code, m02 exit rerun, run `d738cd0e-5795-48ef-a387-e3ec184f90e5`, `--review-scope p07-p-rev2`): `ok`, `review_completed_gate_passed`, threshold `important`, counts 0/0/1/0, receive-eligible, received 2026-11-03; no attempt consumed. No carrier written: queued fixes require another rerun.

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

- p01 review L2 (Low): `- **L1:** text` list items parse with title `L1:` and no explicit ID. Deferred to p08, which owns the stable finding key over p01's records. Trigger: p08 start.
- p01 review round 2 L1 (Low): a wrapped or nested detail line under a bold finding title is refused as orphaned, and the reviewer contract does not warn about the shape. It fails closed. Deferred. Trigger: the first observed refusal of this shape in a real gate run, or p08.
- p01 review round 2 L2 (Low): explicit-ID duplicate refusal is order-dependent (a plain list finding before `**M1 — …**` is refused as a duplicate). It fails closed. Deferred to p08, which owns finding identity and keys.
- p02 review round 3 M1 and L1 to L4: closed without action by the 2026-11-02 brief amendment, which retires the verifier they concern (operator-approved scope change; see the brief's Decisions).
- p01 review L3 (Low): the gate JSON validation-failure envelope carries only `message`, not the typed refusal `code`. Deferred: no consumer branches on it yet (Feature Planning Triage). Trigger: the first consumer (m03 or later) that needs the code without matching message text.
- p10 review L1 (Low): after a bookkeeping-only goal integrated-review receive whose delivery check then reports stale, the `passed` row and the receipt note stay on record and Step 8 keeps skipping that artifact. No re-review is skipped (the stale result forces a new integrated review), and no contract source requires the record to change; amending the receipt in place would itself be a journal rewrite. Deferred. Trigger: the first real stale fallback after a bookkeeping-only receive, or m03 (convergence).
- m01 exit gate (rerun after p11-t07) L1 (Low): limit 1 of `.agents/docs/bookkeeping-findings.md` still lists review artifacts among the tracking files, next to the sentence saying receive only moves or archives them. Read together the two agree, and a fix breaking a limit is not bookkeeping. Deferred: wording only, and fixing it now would reopen the exit gate. Trigger: the next edit of the shared definition (m02 or later).
- PR #400 self-review (testing and complexity lenses, fresh Opus reviewer, 0 blocking) C1 (non-blocking): the verdict parser's `findingsComplete` flag, duplicate-ID refusal and ID-prefix/severity mismatch refusal (`packages/cli/src/commands/gate/review-verdict.ts`) served only the reverted p02 verifier; no code reads them, and they can refuse a review whose counts agree. Deferred to p08 by operator decision on 2026-11-03 (removing them now would reopen m01's exit gate and integrated review). Trigger: p08 start, which owns stable finding keys. Bundled with it: T2 (the closed-label test asserts no negative), T3/C3 (two effective-delta tests in `bookkeeping-findings-contracts.test.ts` repeat `post-implement-sequence-contracts.test.ts` coverage), and T4/C2 (`ReviewVerdictValidationError`'s unused `kind`, `status` and `receiveEligible` fields and the tests asserting them). T1 (a wrapped detail line refuses as orphaned) is the existing p01 review round 2 L1 deferral.

- PR #400 Cursor Bugbot (review of 2fd06ff2b), fixed in the branch on 2026-11-03 by operator decision, with no re-review or gate: (High) review-receive Step 2.6 item 7 routed a bookkeeping-only final receive from Step 7.6 to Step 10, past the Step 8.5 deferred-Medium resurfacing that item 3 requires; item 7 now runs Step 8.5 first for `final` scope. (Medium) plan-writing step 4's bookkeeping-only `plan` branch could record `passed` after an interactive decline; a declined edit now leaves the finding residual and never `passed`. Both are post-gate skill-prose changes after reviewed head 5599af21d, so d01's bound revisions and the m01 exit gate predate them; the operator chose to merge without re-gating. Contract tests (`src/commands/init/tools/shared`, `src/validation`) and `oat:validate-skills` pass.
- p07 re-review L1 (Low): the review-receive CLI-unavailable fallback clause (`.agents/skills/oat-project-review-receive/SKILL.md:163`) omits that the candidate's own row must be `received` and does not name the gate and lifecycle Invocation classes. Deferred by the root under review-receive Step 9 (Low, concrete rationale): p12 rewrites this receive artifact-selection step, and fixing it now would open a third p07 review cycle. Trigger: p12 start; fold the clarification into p12's receive change and its pin test.
- p12 review L2 (Low): the optional phase gate and the eight planning gates (goal, brief, lite, discover, design, quick-start, plan, import-plan) hand the gate event to receive only in-session; after an interruption the router's receive route has no event and falls back to newest-artifact selection, protected only by p07 supersession. Implement Step 14 persists its event. Deferred by the root (Feature Planning Triage: a new persistence requirement outside p12's adopting-path Intent). Trigger: the first observed interrupted gate→receive handoff, or p13/m03 if they touch these gate paths.
- p13 review L3 (Low): `BL-261002-list-pending-required-reviews` acceptance criteria still say the waiver is recorded in the Reviews table; p13 records it as a `**Review waived:**` line under `## Reviews and Gates` with the row left `pending`, authorized by the p13 Known Unknown (`rgi-p13-concrete-20261103`). Deferred by the root to the item's closure. Trigger: m02 delivery, when the item is closed with that note.
- p-rev1 review L1 (Low): `oat review resolve`'s JSON `row` report shows `reviewedHead: null` for both an invalid cell and `-`; the `reviewed_head_invalid` diagnostic carries the raw cell. Deferred by the root: no consumer distinguishes them through the row field (Feature Planning Triage). Trigger: the first consumer that reads the row report's head.
- p-rev2 review L1 (Low): `review latest` and `review check` resolve the git repository from the caller's cwd, so in a nested independent project repository (run from inside it) or under a separate-repository synced scope root they can disagree with `project status` on supersession. Pre-existing; OAT never creates either layout. Deferred by the root. Trigger: OAT creating or supporting an independent nested project repository, or an observed disagreement.

## Deviations from Plan / Design

Document any intentional deviations from the brief. Include accepted review findings where the shipped implementation is source of truth and the brief needs alignment.

| Phase / Review                     | Source Artifact                    | Planned / Documented                                                                                                                          | Actual / Accepted                                                                                                                                                                                                                                                                                                                                                                                     | Reason                                                                                                                                                 | Source of Truth                                                              | Follow-up |
| ---------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | --------- |
| p10 (operator decision), Outcome 2 | plan.md Outcome 2 and Out of Scope | Six inclusions; "Routing or progress pointer repair" out of scope                                                                             | The shared definition, docs and `DR-261102-bookkeeping-only-review` also include a resume pointer corrected by copying journal-recorded state; a pointer or completion inferred from commits stays excluded                                                                                                                                                                                           | The p10 round-2 review found the Out of Scope line ambiguous; the operator decided on 2026-11-02 (p10 round-2 receipt)                                 | The shipped definition; the brief is not edited in place                     | None      |
| p11 (exit evidence), Outcome 1     | plan.md Outcome 1, Phase p11       | A walkthrough of the #233 gate relaunch shows a blocking gate whose only findings were bookkeeping, satisfied with no attempt and no relaunch | #233 (executor-reminders-pilot plan gate attempt 1) is not bookkeeping-only (a missing-review finding plus plan content), so it is traced as a counter-example where today's flow correctly applies; the qualifying blocking-gate walkthrough is the wave-skills-promotion p05 phase gate (run 811c64e3, one stale state.md finding), traced end to end through implement's new gate branch (p11-t04) | The brief assumed #233 was bookkeeping-only; the trace showed otherwise. Operator chose "Accept the substitute" on 2026-11-02, with no brief amendment | This journal record; the milestone Outcome audit judges Outcome 1 against it | None      |

## Final Summary (for PR/docs)

Filled at terminal closeout.

## References

- Brief: `plan.md`
- Research: `references/research/`
- Project log: `project-log.md`
