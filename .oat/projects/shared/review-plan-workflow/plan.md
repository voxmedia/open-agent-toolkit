---
oat_plan_source: spec-driven
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-30
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p07']
oat_auto_review_at_hill_checkpoints: true
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
oat_template_name: plan
---

# Implementation Plan: review-plan-workflow

> Execute this plan using `oat-project-implement` — sequential by default,
> parallel only when `oat_plan_parallel_groups` is explicitly confirmed.

**Goal:** Make broad project code reviews create and validate an authoritative
ReviewPlan before evidence work, load evidence selectively, and expose exact,
non-actionable-aware coverage accounting across artifact and structured sinks.

**Architecture:** A shared CLI review runtime owns metadata preparation,
short-TTL validation state, plan/output validation, and sink projection.
Canonical reviewer and lifecycle skills retain provider handles and adopt that
runtime without transferring reviewer judgment or weakening gate independence.

**Tech Stack:** TypeScript ESM, Commander, Vitest, Node.js standard-library
Git/process/crypto/fs primitives, Markdown skill contracts, Fumadocs, pnpm, and
Turborepo.

**Commit Convention:** `{type}(pNN-tNN): {description}`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Preserve absence of `oat_phase_review_gate` until shared setup runs
- [x] Resolve complete dispatch ladder and project named ceiling
- [x] Confirm task breakdown with user
- [x] Evaluate adjacent phases for confirmed parallel groups
- [x] Set `oat_plan_parallel_groups: []` as the unconfirmed sequential default
- [x] Configure optional Phase gate review
- [x] Record explicit operator disposition for plan review and configured gate

## Task Execution Boundaries

Every task starts from a clean task boundary. Before its format step, run
`git status --short` and require every existing changed or untracked path to
appear in that task's `Files` list. After the documented formatter runs, compare
`git diff --name-only` plus `git ls-files --others --exclude-standard` with the
same list. If any formatter-created path falls outside the declared boundary,
stop, report the paths, and do not stage or commit. Never use `git add .` or
`git add -A`; stage only the task's declared paths. A task whose format step
uses the required no-command warning still applies the same before/after
boundary checks.

---

## Parallelism

No parallel group is declared. Adjacent phases intentionally share canonical
runtime, skill, config, gate, docs, and release files. Any candidate group must
be file-disjoint and explicitly confirmed before this frontmatter changes.

---

## Phase 1: Baseline and Production Contract Foundations

**Milestone:** The CLI has one production-owned review contract boundary,
strict versioned shapes, provider-neutral preflight seams, and pinned baseline
behavior without promoting the reference dispatcher.

**Verification:** Run
`pnpm --filter @open-agent-toolkit/cli test && pnpm type-check`.

### Task p01-t01: Establish the review runtime import boundary

**Files:**

- Create: `packages/cli/src/review/index.ts`
- Create: `packages/cli/src/review/index.test.ts`
- Modify: `packages/cli/tsconfig.json`
- Modify: `packages/cli/vitest.config.ts`

**Step 1: Write test (RED)** Add an alias import test for
`REVIEW_CONTRACT_VERSION`; verify it fails before `@review/*` resolves.

**Step 2: Implement (GREEN)** Export
`REVIEW_CONTRACT_VERSION = 1 as const` and add matching TypeScript/Vitest
aliases.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/index.test.ts`
Expected: alias and contract-version assertions pass.

**Step 5: Commit** `feat(p01-t01): establish review runtime boundary`

### Task p01-t02: Record the deterministic large-review baseline

**Files:**

- Create: `packages/cli/src/review/__fixtures__/large-scope-baseline.v1.json`
- Create: `packages/cli/src/review/baseline.test.ts`

**Step 1: Write test (RED)** Require a 237-file deterministic ledger with
content-diff operations, full-file reads, semantic replay, tool steps,
completion outcome, and accounting bytes; reject approximate prose values.

**Step 2: Implement (GREEN)** Add `ReviewCostBaselineV1` fixture data grounded
in the fixed synthetic operation ledger.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/baseline.test.ts`
Expected: all six baseline metrics are exact and stable.

**Step 5: Commit** `test(p01-t02): record large review operation baseline`

### Task p01-t03: Freeze the coordinator inventory

**Files:**

- Create: `packages/cli/src/review/coordinator-inventory.ts`
- Create: `packages/cli/src/review/coordinator-inventory.test.ts`

**Step 1: Write test (RED)** Require the five direct and two indirect
coordinator rows from the design, plus explicit exclusions for ad-hoc and
non-code rails.

**Step 2: Implement (GREEN)** Define `ReviewCoordinatorInventoryEntry` and
`REVIEW_COORDINATOR_INVENTORY` with owner, tier, sink, and authority.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/coordinator-inventory.test.ts`
Expected: every broad code-review rail has exactly one declared owner.

**Step 5: Commit** `test(p01-t03): freeze review coordinator inventory`

### Task p01-t04: Define common review and CLI envelope types

**Files:**

- Create: `packages/cli/src/review/types.ts`
- Create: `packages/cli/src/review/types.test.ts`
- Modify: `packages/cli/src/review/index.ts`

**Step 1: Write test (RED)** Assert exact invocation, sink, progress,
error-category, JSON-value, and `ReviewCliEnvelope<T>` unions.

**Step 2: Implement (GREEN)** Add the common types and safe error-code shape;
export them through `@review/index`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/types.test.ts`
Expected: exact success/error envelope fixtures type-check.

**Step 5: Commit** `feat(p01-t04): define common review contracts`

### Task p01-t05: Define preparation and telemetry contracts

**Files:**

- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/types.test.ts`

**Step 1: Write test (RED)** Add representative `ChangeMapV1`,
`HostTelemetryEvidenceV1`, `ReviewPreparationV1`,
`PreparedReviewContextV1`, and `PrepareReviewContextResultV1` fixtures.

**Step 2: Implement (GREEN)** Add exact schema-version, correlation, budget,
telemetry-digest, command-template, and private draft-path fields.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/types.test.ts`
Expected: pre/post-artifact contexts remain distinct and complete.

**Step 5: Commit** `feat(p01-t05): define review preparation contracts`

### Task p01-t06: Define ReviewPlan and receipt contracts

**Files:**

- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/types.test.ts`

**Step 1: Write test (RED)** Require compact-inline and delegated fixtures with
lanes, classifications, seams, whole-diff policy, time allocation, contingency,
assignment projection, and full receipt identity.

**Step 2: Implement (GREEN)** Add `ReviewPlanV1`,
`ValidatedAssignmentProjectionV1`, and `PlanValidationReceiptV1`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/types.test.ts`
Expected: FR5-FR7 fields are structurally present in both strategies.

**Step 5: Commit** `feat(p01-t06): define review plan contracts`

### Task p01-t07: Define dossier, accounting, and terminal contracts

**Files:**

- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/types.test.ts`

**Step 1: Write test (RED)** Cover complete/partial dossiers, typed evidence
registries, claim dispositions, `ReviewAccountingV1`, private artifact
candidates, and complete/blocked `ReviewerTerminalV1`.

**Step 2: Implement (GREEN)** Add the versioned worker, evidence, accounting,
candidate, and provider-neutral terminal types.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/types.test.ts`
Expected: blocked terminals cannot carry a candidate or actionable verdict.

**Step 5: Commit** `feat(p01-t07): define review output contracts`

### Task p01-t08: Validate preparation schemas strictly

**Files:**

- Create: `packages/cli/src/review/schemas.ts`
- Create: `packages/cli/src/review/schemas.test.ts`
- Modify: `packages/cli/src/review/index.ts`

**Step 1: Write test (RED)** Reject wrong versions, unknown fields, malformed
SHAs, duplicate paths/obligations, non-normalized paths, and invalid
correlation/draft-path combinations.

**Step 2: Implement (GREEN)** Add
`parseReviewPreparationV1(value)` and
`parsePreparedReviewContextV1(value)` with strict keys.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/schemas.test.ts`
Expected: valid fixtures parse and every malformed boundary rejects.

**Step 5: Commit** `feat(p01-t08): validate preparation schemas`

### Task p01-t09: Validate plan and terminal schemas strictly

**Files:**

- Modify: `packages/cli/src/review/schemas.ts`
- Modify: `packages/cli/src/review/schemas.test.ts`

**Step 1: Write test (RED)** Reject missing delegation/verification fields,
unknown enums, malformed receipts, complete terminals without candidates, and
blocked terminals with candidates.

**Step 2: Implement (GREEN)** Add `parseReviewPlanV1`,
`parsePlanValidationReceiptV1`, and `parseReviewerTerminalV1`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/schemas.test.ts`
Expected: all plan/receipt/terminal schema branches pass.

**Step 5: Commit** `feat(p01-t09): validate review plan and terminal schemas`

### Task p01-t10: Add sink-aware capability preflight

**Files:**

- Create: `packages/cli/src/review/preflight.ts`
- Create: `packages/cli/src/review/preflight.test.ts`
- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/index.ts`

**Step 1: Write test (RED)** Verify artifact and structured sinks reject only
their missing sink-specific capability while unavailable telemetry remains
allowed and reviewer self-report is ignored.

**Step 2: Implement (GREEN)** Add `ReviewPlanCapabilities`,
`ReviewPlanPreflightInput`, and `preflightReviewPlan`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/preflight.test.ts`
Expected: the full sink × capability matrix passes.

**Step 5: Commit** `feat(p01-t10): add review capability preflight`

### Task p01-t11: Define the host telemetry seam

**Files:**

- Create: `packages/cli/src/review/telemetry.ts`
- Create: `packages/cli/src/review/telemetry.test.ts`
- Modify: `packages/cli/src/review/index.ts`

**Step 1: Write test (RED)** Cover missing, stale, future, non-monotonic,
wrong-adapter, and arithmetically inconsistent observations.

**Step 2: Implement (GREEN)** Add `HostContextTelemetryAdapter.observe` and
`observeHostTelemetry` returning private `HostTelemetryEvidenceV1`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/telemetry.test.ts`
Expected: only synchronous adapter-bound observations expose numeric budget.

**Step 5: Commit** `feat(p01-t11): define host telemetry boundary`

### Task p01-t12: Extract the pure structured-findings validator

**Files:**

- Create: `packages/cli/src/review/structured-findings.ts`
- Create: `packages/cli/src/review/structured-findings.test.ts`
- Modify: `packages/cli/src/review-remote/reviewer-dispatch.ts`
- Modify: `packages/cli/src/review-remote/reviewer-dispatch.test.ts`
- Modify: `packages/cli/src/review/index.ts`

**Step 1: Write test (RED)** Reproduce every valid and malformed current
structured-findings case through a pure validator before changing imports.

**Step 2: Implement (GREEN)** Move only
`validateStructuredFindings(value)`; leave `dispatchStructuredReview` unwired
and provider-handle ownership unchanged.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/structured-findings.test.ts src/review-remote/reviewer-dispatch.test.ts`
Expected: parity is exact and dispatch behavior is unchanged.

**Step 5: Commit** `refactor(p01-t12): extract structured findings validator`

### Task p01-t13: Guard reference-dispatch ownership

**Files:**

- Create: `packages/cli/src/review/dispatch-ownership.test.ts`

**Step 1: Write test (RED)** Reject coordinator/store imports,
replacement/retry APIs, or accepted-continuation ownership in
`reviewer-dispatch.ts`.

**Step 2: Implement (GREEN)** Add a source-contract assertion that permits
payload building, one spawn wrapper, and pure validation only.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/dispatch-ownership.test.ts src/review-remote/reviewer-dispatch.test.ts`
Expected: the reference helper cannot become an authoritative coordinator.

**Step 5: Commit** `test(p01-t13): guard reference dispatch ownership`

---

## Phase 2: ChangeMap and Validation Runtime

**Milestone:** An invocation can prepare authoritative metadata, seal
post-artifact budget evidence, validate an exact ReviewPlan, issue a receipt,
and atomically authorize evidence through thin JSON commands.

**Verification:** Run
`pnpm --filter @open-agent-toolkit/cli test && pnpm type-check`.

### Task p02-t01: Normalize authoritative review paths

**Files:**

- Create: `packages/cli/src/review/review-paths.ts`
- Create: `packages/cli/src/review/review-paths.test.ts`

**Step 1: Write test (RED)** Cover separator normalization and rejection of
absolute, escaping, empty, NUL, and duplicate normalized paths.

**Step 2: Implement (GREEN)** Add `normalizeReviewPath` and
`normalizeReviewPaths` returning sorted repository-relative POSIX paths.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/review-paths.test.ts`
Expected: every traversal and normalization boundary passes.

**Step 5: Commit** `feat(p02-t01): normalize authoritative review paths`

### Task p02-t02: Parse Git name-status metadata

**Files:**

- Create: `packages/cli/src/review/git-metadata.ts`
- Create: `packages/cli/src/review/git-metadata.test.ts`

**Step 1: Write test (RED)** Parse NUL-delimited add/modify/delete/rename rows,
including previous paths; reject malformed and duplicate entries.

**Step 2: Implement (GREEN)** Add
`parseNameStatusZ(output: Buffer): ChangeFileV1[]`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/git-metadata.test.ts`
Expected: all four statuses preserve exact path provenance.

**Step 5: Commit** `feat(p02-t02): parse change status metadata`

### Task p02-t03: Parse and merge numstat metadata

**Files:**

- Modify: `packages/cli/src/review/git-metadata.ts`
- Modify: `packages/cli/src/review/git-metadata.test.ts`

**Step 1: Write test (RED)** Cover numeric, binary, rename, missing-path, and
conflicting numstat rows plus deterministic totals and generated/bookkeeping
hints.

**Step 2: Implement (GREEN)** Add `parseNumstatZ` and
`mergeChangeMetadata(status, numstat)`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/git-metadata.test.ts`
Expected: merged metadata is sorted and hints never authorize skips.

**Step 5: Commit** `feat(p02-t03): merge change numstat metadata`

### Task p02-t04: Apply the denial-only numstat precheck

**Files:**

- Create: `packages/cli/src/review/patch-estimate.ts`
- Create: `packages/cli/src/review/patch-estimate.test.ts`

**Step 1: Write test (RED)** Missing telemetry or a line estimate above
remaining tokens must return `coarse-denied` without invoking a patch counter.

**Step 2: Implement (GREEN)** Add `decidePatchCounting` with
`NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR = 4`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/patch-estimate.test.ts`
Expected: denial remains conservative and cannot authorize whole-diff.

**Step 5: Commit** `feat(p02-t04): deny oversized patch counting early`

### Task p02-t05: Count and cap patch bytes

**Files:**

- Modify: `packages/cli/src/review/patch-estimate.ts`
- Modify: `packages/cli/src/review/patch-estimate.test.ts`

**Step 1: Write test (RED)** Assert exact byte/token estimation and
lower-bound outcomes when the 64 MiB or preparation deadline cap terminates the
stream.

**Step 2: Implement (GREEN)** Add `countPatchBytes`,
`computePreparationDeadline`, and `PATCH_BYTES_PER_TOKEN = 3`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/patch-estimate.test.ts`
Expected: only a completed stream produces an exact estimate.

**Step 5: Commit** `feat(p02-t05): cap patch estimation work`

### Task p02-t06: Collect ChangeMapV1 from Git

**Files:**

- Create: `packages/cli/src/review/change-map.ts`
- Create: `packages/cli/src/review/change-map.test.ts`
- Modify: `packages/cli/src/review/index.ts`

**Step 1: Write test (RED)** Use a temporary repository with
add/modify/delete/rename/binary changes and explicit Git failures.

**Step 2: Implement (GREEN)** Add `GitChangeMapAdapter` and
`collectChangeMap(input, adapter): Promise<ChangeMapV1>`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/change-map.test.ts`
Expected: metadata is authoritative and collection failures are explicit.

**Step 5: Commit** `feat(p02-t06): collect authoritative change maps`

### Task p02-t07: Add the obligation grammar fixture corpus

**Files:**

- Create: `packages/cli/src/review/__fixtures__/obligations/spec-v1.md`
- Create: `packages/cli/src/review/__fixtures__/obligations/spec-v1.json`
- Create: `packages/cli/src/review/__fixtures__/obligations/plan-v1.md`
- Create: `packages/cli/src/review/__fixtures__/obligations/plan-v1.json`
- Create: `packages/cli/src/review/__fixtures__/obligations/implementation-v1.md`
- Create: `packages/cli/src/review/__fixtures__/obligations/implementation-v1.json`
- Create: `packages/cli/src/review/obligation-fixtures.test.ts`

**Step 1: Write test (RED)** Require each fixture source/expectation pair to
load, preserve byte-for-byte source bytes, and expose parser-dependent
normalization cases as explicit `it.todo` entries.

**Step 2: Implement (GREEN)** Add v1 source/expectation fixtures without parser
logic.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/obligation-fixtures.test.ts`
Expected: fixture integrity assertions pass and parser-dependent cases remain
visible as todo until their owning parser tasks.

**Step 5: Commit** `test(p02-t07): add obligation grammar fixtures`

### Task p02-t08: Implement common Markdown lexical grammar

**Files:**

- Create: `packages/cli/src/review/markdown-grammar.ts`
- Create: `packages/cli/src/review/markdown-grammar.test.ts`

**Step 1: Write test (RED)** Cover strict UTF-8/NUL handling, CRLF/CR
normalization, fenced-region masking, escaped pipes, exact structural lines,
and strict table widths.

**Step 2: Implement (GREEN)** Add `normalizeMarkdownSource`,
`scanStructuralLines`, and `parseStrictMarkdownTable`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/markdown-grammar.test.ts`
Expected: exact lexical and table boundaries pass.

**Step 5: Commit** `feat(p02-t08): implement obligation markdown grammar`

### Task p02-t09: Parse Requirement Index obligations

**Files:**

- Create: `packages/cli/src/review/obligations.ts`
- Create: `packages/cli/src/review/obligations.test.ts`

**Step 1: Write test (RED)** Parse canonical FR/NFR rows and reject duplicate
headings/IDs, wrong headers/widths, malformed intervals, or trailing content.

**Step 2: Implement (GREEN)** Add
`parseRequirementObligations(source, sourcePath)`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/obligations.test.ts`
Expected: the exact Requirement Index set is returned.

**Step 5: Commit** `feat(p02-t09): parse requirement obligations`

### Task p02-t10: Parse plan-task obligations

**Files:**

- Modify: `packages/cli/src/review/obligations.ts`
- Modify: `packages/cli/src/review/obligations.test.ts`

**Step 1: Write test (RED)** Cover exact task headings, one Files block,
create/modify/delete lines, path normalization, duplicates, and malformed block
termination.

**Step 2: Implement (GREEN)** Add
`parsePlanTaskObligations(source, sourcePath)`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/obligations.test.ts`
Expected: task IDs and allowed files match the canonical plan exactly.

**Step 5: Commit** `feat(p02-t10): parse plan task obligations`

### Task p02-t11: Parse deviations and deferred findings

**Files:**

- Modify: `packages/cli/src/review/obligations.ts`
- Modify: `packages/cli/src/review/obligations.test.ts`

**Step 1: Write test (RED)** Validate fully populated deviation rows,
placeholder handling, malformed partial rows, deferred-block duplicates, and
latest deferred/resolved/dismissed supersession.

**Step 2: Implement (GREEN)** Add `parseDeviationObligations` and
`parseDeferredFindingObligations`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/obligations.test.ts`
Expected: only current accepted/deferred obligations remain.

**Step 5: Commit** `feat(p02-t11): parse implementation obligations`

### Task p02-t12: Select exact scope obligations

**Files:**

- Modify: `packages/cli/src/review/obligations.ts`
- Modify: `packages/cli/src/review/obligations.test.ts`
- Modify: `packages/cli/src/review/index.ts`

**Step 1: Write test (RED)** Cover named task, phase prefix, spec-driven final,
and quick/import final unions with additive deviations/deferred findings.

**Step 2: Implement (GREEN)** Add
`collectReviewObligations(input): Promise<ReviewObligationV1[]>`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/obligations.test.ts src/review/obligation-fixtures.test.ts`
Expected: every scope returns an exact, sorted obligation set.

**Step 5: Commit** `feat(p02-t12): collect scope obligations exactly`

### Task p02-t13: Adapt prior evidence without verdict authority

**Files:**

- Create: `packages/cli/src/review/prior-evidence.ts`
- Create: `packages/cli/src/review/prior-evidence.test.ts`

**Step 1: Write test (RED)** Same-project/target and same-gate-lineage evidence
may retain navigation/history/deferred IDs but never severity, validity, or
verdict disposition.

**Step 2: Implement (GREEN)** Add
`adaptPriorReviewEvidence(input): PriorReviewEvidenceV1[]`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/prior-evidence.test.ts`
Expected: lineage failures reject and prior verdict data is absent.

**Step 5: Commit** `feat(p02-t13): sanitize prior review evidence`

### Task p02-t14: Canonicalize and hash review state

**Files:**

- Create: `packages/cli/src/review/canonical-json.ts`
- Create: `packages/cli/src/review/canonical-json.test.ts`

**Step 1: Write test (RED)** Assert key-order independence, own-digest and
lifecycle-timestamp exclusion, telemetry-evidence inclusion, duplicate-key
rejection, and stable SHA-256 output.

**Step 2: Implement (GREEN)** Add `canonicalizeJson` and `hashCanonicalJson`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/canonical-json.test.ts`
Expected: semantically identical values hash identically.

**Step 5: Commit** `feat(p02-t14): hash review state canonically`

### Task p02-t15: Allocate outer review time budgets

**Files:**

- Create: `packages/cli/src/review/budget.ts`
- Create: `packages/cli/src/review/budget.test.ts`

**Step 1: Write test (RED)** Assert null-budget semantics, rejection at 119,999
ms, and all named planning/evidence/reconciliation/output floors at 120,000 ms.

**Step 2: Implement (GREEN)** Add `allocateReviewTimeBudget` and named policy
constants without changing the general gate timeout minimum.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/budget.test.ts`
Expected: deadlines and reserves obey the design matrix.

**Step 5: Commit** `feat(p02-t15): allocate review time budgets`

### Task p02-t16: Derive context budget and whole-diff eligibility

**Files:**

- Modify: `packages/cli/src/review/budget.ts`
- Modify: `packages/cli/src/review/budget.test.ts`

**Step 1: Write test (RED)** Missing/invalid telemetry yields null; whole-diff
requires exact size, sufficient evidence budget, one coherent lane, and no
consequential seam.

**Step 2: Implement (GREEN)** Add `buildContextBudget` and
`evaluateWholeDiffEligibility`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/budget.test.ts`
Expected: file count alone never authorizes whole-diff.

**Step 5: Commit** `feat(p02-t16): derive sealed evidence budgets`

### Task p02-t17: Create private validation runs

**Files:**

- Create: `packages/cli/src/review/validation-store.ts`
- Create: `packages/cli/src/review/validation-store.test.ts`

**Step 1: Write test (RED)** Require random run directories at `0700`, state
and precreated draft files at `0600`, exclusive/no-follow creation, and stored
draft inode/device.

**Step 2: Implement (GREEN)** Add
`ValidationStore.createRun(input): Promise<StoredValidationRun>`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-store.test.ts`
Expected: unsafe pre-existing paths and symlinks reject.

**Step 5: Commit** `feat(p02-t17): create private validation runs`

### Task p02-t18: Read state and correlate gate attempts safely

**Files:**

- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`

**Step 1: Write test (RED)** Reject wrong inode/link/schema/expiry; require
atomic `(gateRunId, launchAttemptId) → validationRunId` bind/resolve/delete and
sibling isolation.

**Step 2: Implement (GREEN)** Add `readRun`, `updateRun`,
`bindGateCorrelation`, `resolveGateCorrelation`, and locked deletion.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-store.test.ts`
Expected: store and correlation index remain one atomic authority.

**Step 5: Commit** `feat(p02-t18): correlate validation state safely`

### Task p02-t19: Apply TTL and bounded reaping

**Files:**

- Create: `packages/cli/src/review/validation-reaper.ts`
- Create: `packages/cli/src/review/validation-reaper.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`

**Step 1: Write test (RED)** Cover exact budget-derived TTLs, live
preservation, expired run/terminal receipt deletion, and bounded entry scans.

**Step 2: Implement (GREEN)** Add `computeValidationTtlMs` and
`reapExpiredValidationState`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-reaper.test.ts src/review/validation-store.test.ts`
Expected: reaping never scans project review trees.

**Step 5: Commit** `feat(p02-t19): reap expired validation state`

### Task p02-t20: Issue command capabilities and bind accepted handles

**Files:**

- Create: `packages/cli/src/review/command-capabilities.ts`
- Create: `packages/cli/src/review/command-capabilities.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`

**Step 1: Write test (RED)** Require distinct one-shot checkpoint/plan tokens,
safe argv rendering, rejection before handle binding/rebinding, sibling
isolation, and digest-only handle storage.

**Step 2: Implement (GREEN)** Add `issueCommandCapabilities`,
`renderReviewCommands`, and `bindAcceptedHandle`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/command-capabilities.test.ts src/review/validation-store.test.ts`
Expected: trusted payloads work while logs/digests/reviewer JSON redact tokens.

**Step 5: Commit** `feat(p02-t20): bind review command capabilities`

### Task p02-t21: Seal the post-artifact checkpoint

**Files:**

- Create: `packages/cli/src/review/review-lifecycle.ts`
- Create: `packages/cli/src/review/review-lifecycle.test.ts`

**Step 1: Write test (RED)** Checkpoint succeeds once after handle binding,
records post-artifact telemetry evidence/digest, preserves time budget, and
rejects replay or post-plan calls.

**Step 2: Implement (GREEN)** Add
`checkpointArtifactsLoaded(input, deps): Promise<PreparedReviewContextV1>`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/review-lifecycle.test.ts`
Expected: sealed context and telemetry evidence remain immutable.

**Step 5: Commit** `feat(p02-t21): seal post artifact context`

### Task p02-t22: Validate exact path and obligation ownership

**Files:**

- Create: `packages/cli/src/review/plan-validator.ts`
- Create: `packages/cli/src/review/plan-validator.test.ts`

**Step 1: Write test (RED)** Return precise pointers for missing, duplicate,
fabricated, contradictory path/obligation owners and invalid seam references.

**Step 2: Implement (GREEN)** Add `validatePlanPathAccounting` and
`validatePlanObligationAccounting`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/plan-validator.test.ts`
Expected: authoritative sets are covered exactly once.

**Step 5: Commit** `feat(p02-t22): validate exact review assignments`

### Task p02-t23: Validate classifications, budgets, and projection

**Files:**

- Modify: `packages/cli/src/review/plan-validator.ts`
- Modify: `packages/cli/src/review/plan-validator.test.ts`

**Step 1: Write test (RED)** Generated/bookkeeping cannot skip inspection;
exclusions require authority; whole-diff/time fields must equal sealed policy;
projection sorting is deterministic.

**Step 2: Implement (GREEN)** Add classification/whole-diff/time validators and
`projectValidatedAssignments(plan)`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/plan-validator.test.ts`
Expected: policy drift and invalid cutoffs reject.

**Step 5: Commit** `feat(p02-t23): validate plan policy and projection`

### Task p02-t24: Issue receipts and begin evidence atomically

**Files:**

- Modify: `packages/cli/src/review/review-lifecycle.ts`
- Modify: `packages/cli/src/review/review-lifecycle.test.ts`

**Step 1: Write test (RED)** Permit initial plan plus one correction, bind the
receipt to run/attempt/handle/context/plan/assignment, then reject replay,
mismatch, expiry, pre-validation, or terminal evidence starts.

**Step 2: Implement (GREEN)** Add `validateAndReceiptPlan` and
`beginEvidence`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/review-lifecycle.test.ts`
Expected: `plan_validated → evidence_started` occurs once.

**Step 5: Commit** `feat(p02-t24): authorize receipt bound evidence`

### Task p02-t25: Prepare authoritative review context

**Files:**

- Create: `packages/cli/src/review/prepare-context.ts`
- Create: `packages/cli/src/review/prepare-context.test.ts`
- Modify: `packages/cli/src/review/index.ts`

**Step 1: Write test (RED)** Preparation must reap first, validate
range/correlation, collect ChangeMap/obligations/prior evidence, observe
denial-only telemetry, create private state/draft, and return trusted commands.

**Step 2: Implement (GREEN)** Add
`prepareReviewContext(input, deps): Promise<PrepareReviewContextResultV1>`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/prepare-context.test.ts`
Expected: preparation exposes metadata but no content diff.

**Step 5: Commit** `feat(p02-t25): prepare authoritative review context`

### Task p02-t26: Standardize review JSON command behavior

**Files:**

- Create: `packages/cli/src/commands/review/review-json.ts`
- Create: `packages/cli/src/commands/review/review-json.test.ts`

**Step 1: Write test (RED)** Assert bounded stdin, exactly one JSON document
plus newline, no stdout prose, and deterministic exit 0/1/2 mapping for
success/contract/system outcomes.

**Step 2: Implement (GREEN)** Add `readBoundedJsonStdin` and
`runReviewJsonCommand`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review/review-json.test.ts`
Expected: every envelope/exit branch passes.

**Step 5: Commit** `feat(p02-t26): standardize review JSON commands`

### Task p02-t27: Add prepare and checkpoint commands

**Files:**

- Create: `packages/cli/src/commands/review/prepare-context.ts`
- Create: `packages/cli/src/commands/review/prepare-context.test.ts`
- Create: `packages/cli/src/commands/review/checkpoint-artifacts.ts`
- Create: `packages/cli/src/commands/review/checkpoint-artifacts.test.ts`

**Step 1: Write test (RED)** Enforce budget pairing and gate-only correlation
options; prohibit numeric telemetry input; require run plus opaque checkpoint
token and one sealed-context result.

**Step 2: Implement (GREEN)** Add
`createPrepareContextCommand` and `createCheckpointArtifactsCommand` as thin
factories.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review/prepare-context.test.ts src/commands/review/checkpoint-artifacts.test.ts`
Expected: both commands delegate all business logic.

**Step 5: Commit** `feat(p02-t27): add review preparation commands`

### Task p02-t28: Add plan-validation and evidence-start commands

**Files:**

- Create: `packages/cli/src/commands/review/validate-plan.ts`
- Create: `packages/cli/src/commands/review/validate-plan.test.ts`
- Create: `packages/cli/src/commands/review/begin-evidence.ts`
- Create: `packages/cli/src/commands/review/begin-evidence.test.ts`
- Modify: `packages/cli/src/commands/review/index.ts`

**Step 1: Write test (RED)** Validate bounded strict plan stdin, receipt
success, structured exit-1 rejection, one-shot begin success, replay errors,
and command-tree help registration.

**Step 2: Implement (GREEN)** Add both thin command factories and register all
four new review commands beside `latest`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review/validate-plan.test.ts src/commands/review/begin-evidence.test.ts`
Expected: successful and rejected paths emit one valid envelope.

**Step 5: Commit** `feat(p02-t28): add review plan boundary commands`

### Task p02-t29: Verify lifecycle and recovery end to end

**Files:**

- Create: `packages/cli/src/review/review-lifecycle.integration.test.ts`
- Create: `packages/cli/src/review/validation-recovery.integration.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)** Execute
prepare → bind → checkpoint → validate → begin in a temporary repository;
simulate crash reaping and sibling gate-attempt isolation; verify CLI help.

**Step 2: Implement (GREEN)** Add only integration harnesses and any missing
thin registration glue.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/review-lifecycle.integration.test.ts src/review/validation-recovery.integration.test.ts src/commands/help-snapshots.test.ts src/commands/commands.integration.test.ts`
Expected: receipt precedes the evidence sentinel and abandoned state is reaped.

**Step 5: Commit** `test(p02-t29): verify review validation lifecycle`

### Task p02-t30: (review C1) Parse canonical implementation deviations

**Files:**

- Modify: `packages/cli/src/review/obligations.ts`
- Modify: `packages/cli/src/review/obligations.test.ts`
- Modify: `packages/cli/src/review/obligation-fixtures.test.ts`

**Step 1: Reproduce** Pin the canonical explanatory prose and current
seven-column deviations table from `.oat/templates/implementation.md` and this
project's `implementation.md`; preserve fail-closed placeholder and partial-row
behavior.

**Step 2: Implement** Locate exactly one canonical deviations table within the
section and parse its current exact headers without treating introductory prose
as a table row.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/obligations.test.ts src/review/obligation-fixtures.test.ts`.
Expected: canonical implementation artifacts parse and malformed tables reject.

**Step 5: Commit** `fix(p02-t30): parse canonical implementation deviations`

### Task p02-t31: (review C2) Enforce strict ReviewPlan CLI parsing

**Files:**

- Modify: `packages/cli/src/commands/review/validate-plan.ts`
- Modify: `packages/cli/src/commands/review/validate-plan.test.ts`
- Modify: `packages/cli/src/review/review-lifecycle.integration.test.ts`

**Step 1: Reproduce** Add command and spawned-lifecycle cases for unknown keys,
malformed nested values, and the invalid string-array `requiredClaims` fixture.

**Step 2: Implement** Parse bounded stdin with `parseReviewPlanV1` before
semantic validation and translate schema failures to a stable exit-1
input/contract envelope.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review/validate-plan.test.ts src/review/review-lifecycle.integration.test.ts`.
Expected: malformed plans never reach lifecycle validation or become receipts.

**Step 5: Commit** `fix(p02-t31): enforce strict review plan input`

### Task p02-t32: (review C3) Enforce whole-diff execution policy

**Files:**

- Modify: `packages/cli/src/review/plan-validator.ts`
- Modify: `packages/cli/src/review/plan-validator.test.ts`

**Step 1: Reproduce** Add negative cases for `whole-diff-inline` and
whole-diff lane evidence under every denied eligibility reason.

**Step 2: Implement** Require top-level strategy, echoed eligibility, and lane
evidence strategies to be mutually consistent with the sealed whole-diff
policy.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/plan-validator.test.ts`.
Expected: denied whole-diff execution cannot obtain a receipt.

**Step 5: Commit** `fix(p02-t32): enforce whole diff policy`

### Task p02-t33: (review C4) Make gate correlation injective

**Files:**

- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`
- Modify: `packages/cli/src/review/validation-recovery.integration.test.ts`

**Step 1: Reproduce** Pin the colliding tuples `("a-b", "c")` and
`("a", "b-c")`, plus tampered index and loaded-run mismatch cases.

**Step 2: Implement** Encode correlation tuples injectively, persist both
components, and verify the index record and loaded run against the requested
tuple before returning.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-store.test.ts src/review/validation-recovery.integration.test.ts`.
Expected: no alternate tuple can resolve another run.

**Step 5: Commit** `fix(p02-t33): encode gate correlation exactly`

### Task p02-t34: (review C5) Isolate and authenticate validation state

**Files:**

- Create: `packages/cli/src/review/validation-store-authority.ts`
- Create: `packages/cli/src/review/validation-store-authority.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.test.ts`
- Modify: `packages/cli/src/commands/review/checkpoint-artifacts.ts`
- Modify: `packages/cli/src/commands/review/checkpoint-artifacts.test.ts`
- Modify: `packages/cli/src/commands/review/validate-plan.ts`
- Modify: `packages/cli/src/commands/review/validate-plan.test.ts`
- Modify: `packages/cli/src/commands/review/begin-evidence.ts`
- Modify: `packages/cli/src/commands/review/begin-evidence.test.ts`
- Modify: `packages/cli/src/review/review-lifecycle.integration.test.ts`

**Step 1: Reproduce** Demonstrate that repository-local same-UID plaintext
edits can currently forge phase, capability, plan, or receipt state.

**Step 2: Implement** Move authoritative state outside the repository, strictly
parse every persisted load, and introduce launcher-owned authentication or a
service boundary so possession of a run ID and repository access cannot forge
valid transitions. Preserve short TTL, `0700` directories, `0600` files, and
one-shot command capabilities.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-store-authority.test.ts src/review/validation-store.test.ts src/commands/review/prepare-context.test.ts src/commands/review/checkpoint-artifacts.test.ts src/commands/review/validate-plan.test.ts src/commands/review/begin-evidence.test.ts src/review/review-lifecycle.integration.test.ts`.
Expected: direct repository or plaintext state mutation cannot authorize a
transition.

**Step 5: Commit** `fix(p02-t34): isolate validation state authority`

### Task p02-t35: (review I1) Make lifecycle transitions crash-safe

**Files:**

- Modify: `packages/cli/src/review/command-capabilities.ts`
- Modify: `packages/cli/src/review/command-capabilities.test.ts`
- Modify: `packages/cli/src/review/review-lifecycle.ts`
- Modify: `packages/cli/src/review/review-lifecycle.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`
- Modify: `packages/cli/src/review/validation-recovery.integration.test.ts`

**Step 1: Reproduce** Simulate crashes between capability verification and
phase commit, and a process death while holding the store lock.

**Step 2: Implement** Consume one-shot capabilities in the same atomic mutation
that commits checkpoint or receipt state, and replace the permanent lock file
with owner/lease-based stale-lock recovery.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/command-capabilities.test.ts src/review/review-lifecycle.test.ts src/review/validation-store.test.ts src/review/validation-recovery.integration.test.ts`.
Expected: interruption cannot burn a token without its transition or wedge the
store permanently.

**Step 5: Commit** `fix(p02-t35): make validation transitions crash safe`

### Task p02-t36: (review I2) Enforce patch-stream wall-clock deadlines

**Files:**

- Modify: `packages/cli/src/review/patch-estimate.ts`
- Modify: `packages/cli/src/review/patch-estimate.test.ts`
- Modify: `packages/cli/src/review/change-map.ts`
- Modify: `packages/cli/src/review/change-map.test.ts`

**Step 1: Reproduce** Race a never-yielding iterator and a child that ignores
normal completion past the configured deadline.

**Step 2: Implement** Race stream reads against a real timer or abort signal,
terminate the producer at deadline, await cleanup, and return a conservative
lower-bound estimate.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/patch-estimate.test.ts src/review/change-map.test.ts`.
Expected: stalled reads terminate within the bounded deadline.

**Step 5: Commit** `fix(p02-t36): enforce patch stream deadlines`

### Task p02-t37: (review I3) Classify lifecycle command errors safely

**Files:**

- Create: `packages/cli/src/review/errors.ts`
- Create: `packages/cli/src/review/errors.test.ts`
- Modify: `packages/cli/src/review/review-lifecycle.ts`
- Modify: `packages/cli/src/review/review-lifecycle.test.ts`
- Modify: `packages/cli/src/commands/review/review-json.ts`
- Modify: `packages/cli/src/commands/review/review-json.test.ts`
- Modify: `packages/cli/src/commands/review/checkpoint-artifacts.test.ts`
- Modify: `packages/cli/src/commands/review/validate-plan.test.ts`
- Modify: `packages/cli/src/commands/review/begin-evidence.test.ts`

**Step 1: Reproduce** Cover replay, invalid token, receipt mismatch,
pre-validation begin, expiry, malformed ranges, budget rejection, and genuine
store/I/O failures at command boundaries.

**Step 2: Implement** Introduce typed domain errors, map expected
input/contract/validation rejections to stable safe exit-1 envelopes, and
reserve sanitized exit-2 responses for system failures.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/errors.test.ts src/review/review-lifecycle.test.ts src/commands/review/review-json.test.ts src/commands/review/checkpoint-artifacts.test.ts src/commands/review/validate-plan.test.ts src/commands/review/begin-evidence.test.ts`.
Expected: deterministic rejection classes do not leak internal errors.

**Step 5: Commit** `fix(p02-t37): classify review command errors`

### Task p02-t38: (review I4) Validate lane evidence cutoffs

**Files:**

- Modify: `packages/cli/src/review/plan-validator.ts`
- Modify: `packages/cli/src/review/plan-validator.test.ts`

**Step 1: Reproduce** Add lanes before, at, and after planning, evidence, and
output cutoffs with mode-appropriate null/non-null deadline shapes.

**Step 2: Implement** Validate every lane deadline against the sealed
allocation and reject evidence work beyond its authorized interval.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/plan-validator.test.ts`.
Expected: no lane can execute evidence after its sealed cutoff.

**Step 5: Commit** `fix(p02-t38): validate lane evidence cutoffs`

### Task p02-t39: (review M3) Represent trusted commands portably

**Files:**

- Create: `packages/cli/src/review/command-invocation.ts`
- Create: `packages/cli/src/review/command-invocation.test.ts`
- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/schemas.ts`
- Modify: `packages/cli/src/review/schemas.test.ts`
- Modify: `packages/cli/src/review/command-capabilities.ts`
- Modify: `packages/cli/src/review/command-capabilities.test.ts`

**Step 1: Reproduce** Pin arguments containing POSIX, PowerShell, and
`cmd.exe` metacharacters without relying on shell quoting.

**Step 2: Implement** Preserve trusted commands as executable-plus-argv data
and execute without a shell, or apply an explicit launcher-selected rendering
strategy. Keep tokens out of logs and digests.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/command-invocation.test.ts src/review/command-capabilities.test.ts src/review/schemas.test.ts`.
Expected: command identity and arguments round-trip across supported platforms.

**Step 5: Commit** `fix(p02-t39): represent trusted commands portably`

### Task p02-t40: (review I5) Preserve branch-local command identity

**Files:**

- Modify: `packages/cli/src/review/prepare-context.ts`
- Modify: `packages/cli/src/review/prepare-context.test.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.test.ts`
- Modify: `packages/cli/src/review/review-lifecycle.integration.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Reproduce** Run source and branch-local preparation while an older
global `oat` appears first on `PATH`.

**Step 2: Implement** Carry the exact launcher-owned executable and argv prefix
through preparation and execute every returned command against that same
candidate build.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/prepare-context.test.ts src/commands/review/prepare-context.test.ts src/review/review-lifecycle.integration.test.ts src/commands/commands.integration.test.ts`.
Expected: trusted follow-up commands cannot drift to an ambient installation.

**Step 5: Commit** `fix(p02-t40): preserve branch local review commands`

### Task p02-t41: (review I6) Align the plan-step design grammar

**Files:**

- Modify: `.oat/projects/shared/review-plan-workflow/design.md`
- Modify: `.oat/projects/shared/review-plan-workflow/implementation.md`

**Step 1: Confirm** Preserve the implemented acceptance of canonical inline
prose and standalone fully-bold Step lines.

**Step 2: Align artifacts** Update the stale design regex and add the accepted
drift to the canonical deviations table, naming implementation and canonical
plan syntax as the source of truth.

**Step 3: Format** Run `pnpm exec oxfmt --write` on both modified Markdown
files.

**Step 4: Verify** Run `git diff --check` and confirm the deviations table uses
the canonical seven-column header.

**Step 5: Commit** `docs(p02-t41): align plan step grammar`

### Task p02-t42: (review M1) Connect the obligation fixture corpus

**Files:**

- Modify: `packages/cli/src/review/obligation-fixtures.test.ts`
- Modify: `packages/cli/src/review/review-lifecycle.integration.test.ts`

**Step 1: Reproduce** Replace every parser-dependent todo with an executable
source/expectation assertion and make malformed integration fixtures fail
runtime schema parsing.

**Step 2: Implement** Exercise all canonical corpus entries through their
owning parsers and correct the integration fixture to the actual
`requiredClaims` contract.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/obligation-fixtures.test.ts src/review/review-lifecycle.integration.test.ts`.
Expected: no obligation fixture remains todo and every integration plan is
schema-valid.

**Step 5: Commit** `test(p02-t42): connect obligation fixture corpus`

### Task p02-t43: (review M2) Reject trailing Requirement Index content

**Files:**

- Modify: `packages/cli/src/review/obligations.ts`
- Modify: `packages/cli/src/review/obligations.test.ts`

**Step 1: Reproduce** Add blank-then-content, multiple-blank, next-heading, and
EOF cases after the Requirement Index table.

**Step 2: Implement** Scan the entire interval through the next exact
level-two heading or EOF and permit only blank lines.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/obligations.test.ts`.
Expected: trailing non-heading content rejects even after blank lines.

**Step 5: Commit** `fix(p02-t43): reject trailing requirement content`

### Task p02-t44: (review2 C1) Broker validation authority outside reviewer processes

**Files:**

- Create: `packages/cli/src/review/validation-authority-broker.ts`
- Create: `packages/cli/src/review/validation-authority-broker.test.ts`
- Create: `packages/cli/src/commands/review/authority-broker.ts`
- Create: `packages/cli/src/commands/review/authority-broker.test.ts`
- Modify: `packages/cli/src/review/validation-store-authority.ts`
- Modify: `packages/cli/src/review/validation-store-authority.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`
- Modify: `packages/cli/src/review/command-invocation.ts`
- Modify: `packages/cli/src/review/command-invocation.test.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.test.ts`
- Modify: `packages/cli/src/commands/review/checkpoint-artifacts.ts`
- Modify: `packages/cli/src/commands/review/checkpoint-artifacts.test.ts`
- Modify: `packages/cli/src/commands/review/validate-plan.ts`
- Modify: `packages/cli/src/commands/review/validate-plan.test.ts`
- Modify: `packages/cli/src/commands/review/begin-evidence.ts`
- Modify: `packages/cli/src/commands/review/begin-evidence.test.ts`
- Modify: `packages/cli/src/commands/review/index.ts`
- Modify: `packages/cli/src/review/review-lifecycle.integration.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Reproduce** Spawn an arbitrary reviewer-side child, prove it cannot
read the authority key or re-sign modified state, and prove trusted follow-up
commands still authenticate across separate processes.

**Step 2: Implement** Keep the state-authentication key exclusively in a
launcher-owned broker process/service. Route capability-bearing operations
through that authority without placing the key or an administrative signing
capability in reviewer environment variables, argv, stdin, files, or returned
command objects. Preserve one-shot run-bound capabilities, short TTL, cleanup,
and shell-free command invocation.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-authority-broker.test.ts src/commands/review/authority-broker.test.ts src/review/validation-store-authority.test.ts src/review/validation-store.test.ts src/review/command-invocation.test.ts src/commands/review/prepare-context.test.ts src/commands/review/checkpoint-artifacts.test.ts src/commands/review/validate-plan.test.ts src/commands/review/begin-evidence.test.ts src/review/review-lifecycle.integration.test.ts src/commands/commands.integration.test.ts`.
Expected: reviewer processes cannot obtain signing authority or forge state,
while every trusted lifecycle command composes through the broker.

**Step 5: Commit** `fix(p02-t44): broker validation state authority`

### Task p02-t45: (review2 I1) Fence stale-lock reclamation

**Files:**

- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`
- Modify: `packages/cli/src/review/validation-recovery.integration.test.ts`

**Step 1: Reproduce** Deterministically interleave two stale-lock reclaimers so
one acquires before the delayed remover acts, and hold a live owner beyond the
current lease.

**Step 2: Implement** Reclaim only when inode and nonce still match the observed
stale owner, fence writes from superseded owners, and renew leases or otherwise
prevent a live operation from expiring. Preserve operation-over-cleanup error
precedence.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-store.test.ts src/review/validation-recovery.integration.test.ts`.
Expected: delayed reclaimers cannot remove a new lock and live owners retain
exclusive mutation authority.

**Step 5: Commit** `fix(p02-t45): fence stale lock recovery`

### Task p02-t46: (review2 I2) Strictly parse prepare-context input

**Files:**

- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/types.test.ts`
- Modify: `packages/cli/src/review/schemas.ts`
- Modify: `packages/cli/src/review/schemas.test.ts`
- Modify: `packages/cli/src/review/prepare-context.ts`
- Modify: `packages/cli/src/review/prepare-context.test.ts`
- Modify: `packages/cli/src/review/budget.ts`
- Modify: `packages/cli/src/review/budget.test.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.test.ts`

**Step 1: Reproduce** Add malformed nested range, budget, scope,
obligation-source, correlation, unknown-key, and budget-floor cases at the
actual command boundary.

**Step 2: Implement** Strictly parse the complete versioned preparation input
before production use and translate every deterministic range, budget, scope,
source, and correlation rejection to stable safe exit-1 input/contract errors.
Reserve exit 2 for I/O, corruption, and unexpected failures.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/types.test.ts src/review/schemas.test.ts src/review/prepare-context.test.ts src/review/budget.test.ts src/commands/review/prepare-context.test.ts`.
Expected: malformed or policy-invalid preparation never reaches production and
never emits a system-error envelope.

**Step 5: Commit** `fix(p02-t46): parse preparation input strictly`

### Task p02-t47: (review2 I3) Preserve active loader arguments

**Files:**

- Modify: `packages/cli/src/commands/gate/branch-local-cli.ts`
- Modify: `packages/cli/src/commands/gate/branch-local-cli.test.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.test.ts`
- Modify: `packages/cli/src/review/prepare-context.ts`
- Modify: `packages/cli/src/review/prepare-context.test.ts`
- Modify: `packages/cli/src/review/review-lifecycle.integration.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Reproduce** Invoke the documented `pnpm run cli:source` path, obtain
all returned commands, and show that dropping `process.execArgv` loader
arguments fails on the TypeScript entrypoint.

**Step 2: Implement** Reuse the canonical branch-local launch resolver so the
review command prefix preserves resolved `--require`/`--import` loader
arguments and the exact active candidate entrypoint.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/branch-local-cli.test.ts src/commands/review/prepare-context.test.ts src/review/prepare-context.test.ts src/review/review-lifecycle.integration.test.ts src/commands/commands.integration.test.ts`.
Expected: every trusted follow-up command spawned from source mode executes the
same checkout successfully.

**Step 5: Commit** `fix(p02-t47): preserve active cli loader args`

### Task p02-t48: (review2 I4) Align command invocation design models

**Files:**

- Modify: `.oat/projects/shared/review-plan-workflow/design.md`
- Modify: `.oat/projects/shared/review-plan-workflow/implementation.md`

**Step 1: Confirm** Treat the shell-free `ReviewCommandInvocationV1`
executable, argv, and stdin discriminant as the authoritative shipped contract.

**Step 2: Align artifacts** Add the versioned invocation model to the design,
replace all three string command fields and flow prose with structured
invocation semantics, and record the accepted alignment in the canonical
deviations table.

**Step 3: Format** Run `pnpm exec oxfmt --write` on both modified Markdown
files.

**Step 4: Verify** Run `git diff --check` and confirm no design passage still
defines trusted review commands as shell strings.

**Step 5: Commit** `docs(p02-t48): align command invocation models`

### Task p02-t49: (review2 M1) Strictly parse persisted telemetry state

**Files:**

- Modify: `packages/cli/src/review/canonical-json.ts`
- Modify: `packages/cli/src/review/canonical-json.test.ts`
- Modify: `packages/cli/src/review/schemas.ts`
- Modify: `packages/cli/src/review/schemas.test.ts`
- Modify: `packages/cli/src/review/validation-store-authority.ts`
- Modify: `packages/cli/src/review/validation-store-authority.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`

**Step 1: Reproduce** Add duplicate-key/trailing-value authenticated envelopes,
malformed adapter IDs/timestamps/rejection reasons/observations, and
phase-incoherent persisted states.

**Step 2: Implement** Expose and use the repository's duplicate-key and
trailing-value rejecting JSON boundary, strictly parse complete
`HostTelemetryEvidenceV1` entries and phase-dependent state coherence, and
reject malformed authenticated state before lifecycle use.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/canonical-json.test.ts src/review/schemas.test.ts src/review/validation-store-authority.test.ts src/review/validation-store.test.ts`.
Expected: no malformed or duplicate-key authenticated state crosses the
persisted-schema boundary.

**Step 5: Commit** `fix(p02-t49): parse persisted telemetry strictly`

### Task p02-t50: (review3 C1) Complete the bound broker lifecycle

**Files:**

- Modify: `packages/cli/src/review/validation-authority-broker.ts`
- Modify: `packages/cli/src/review/validation-authority-broker.test.ts`
- Modify: `packages/cli/src/commands/review/authority-broker.ts`
- Modify: `packages/cli/src/commands/review/authority-broker.test.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.ts`
- Modify: `packages/cli/src/commands/review/prepare-context.test.ts`
- Modify: `packages/cli/src/commands/review/checkpoint-artifacts.test.ts`
- Modify: `packages/cli/src/commands/review/validate-plan.test.ts`
- Modify: `packages/cli/src/commands/review/begin-evidence.test.ts`
- Modify: `packages/cli/src/review/command-capabilities.ts`
- Modify: `packages/cli/src/review/command-capabilities.test.ts`
- Modify: `packages/cli/src/review/review-lifecycle.integration.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Reproduce** Run the real source `prepare-context`, require it to exit,
bind an accepted handle without reconstructing the key/store, then execute the
returned checkpoint, validate, and begin commands as separate keyless
processes.

**Step 2: Implement** Add a distinct launcher-only accepted-continuation
binding channel that is unavailable through reviewer-visible socket data or
capabilities. Bind before enabling reviewer mutations, and fully close/unref
every broker startup pipe after the handshake so preparation terminates while
the detached broker remains usable.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-authority-broker.test.ts src/commands/review/authority-broker.test.ts src/commands/review/prepare-context.test.ts src/commands/review/checkpoint-artifacts.test.ts src/commands/review/validate-plan.test.ts src/commands/review/begin-evidence.test.ts src/review/command-capabilities.test.ts src/review/review-lifecycle.integration.test.ts src/commands/commands.integration.test.ts`.
Expected: the real source lifecycle terminates and composes without exposing
signing or launcher-binding authority.

**Step 5: Commit** `fix(p02-t50): complete bound broker lifecycle`

### Task p02-t51: (review3 I1) Preserve broker domain error envelopes

**Files:**

- Modify: `packages/cli/src/review/validation-authority-broker.ts`
- Modify: `packages/cli/src/review/validation-authority-broker.test.ts`
- Modify: `packages/cli/src/review/errors.ts`
- Modify: `packages/cli/src/review/errors.test.ts`
- Modify: `packages/cli/src/commands/review/review-json.ts`
- Modify: `packages/cli/src/commands/review/review-json.test.ts`
- Modify: `packages/cli/src/commands/review/checkpoint-artifacts.test.ts`
- Modify: `packages/cli/src/commands/review/validate-plan.test.ts`
- Modify: `packages/cli/src/commands/review/begin-evidence.test.ts`

**Step 1: Reproduce** Exercise broker-backed replay, phase, expiry, receipt,
capability, transport, corruption, and unexpected runtime failures.

**Step 2: Implement** Use a strict versioned broker error envelope carrying
safe category, code, message, and details. Reconstruct typed domain errors at
the client boundary so deterministic rejection remains exit 1 and reserve exit
2 for transport, corruption, and unexpected failures.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-authority-broker.test.ts src/review/errors.test.ts src/commands/review/review-json.test.ts src/commands/review/checkpoint-artifacts.test.ts src/commands/review/validate-plan.test.ts src/commands/review/begin-evidence.test.ts`.
Expected: broker transport preserves domain rejection semantics without
leaking internal errors.

**Step 5: Commit** `fix(p02-t51): preserve broker domain errors`

### Task p02-t52: (review3 I2) Strictly validate broker requests before mutation

**Files:**

- Modify: `packages/cli/src/review/canonical-json.ts`
- Modify: `packages/cli/src/review/canonical-json.test.ts`
- Modify: `packages/cli/src/review/schemas.ts`
- Modify: `packages/cli/src/review/schemas.test.ts`
- Modify: `packages/cli/src/review/validation-authority-broker.ts`
- Modify: `packages/cli/src/review/validation-authority-broker.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`

**Step 1: Reproduce** Send duplicate-key, unknown-action-field, malformed
correlation/token, and unknown/malformed nested plan requests directly to the
reviewer-visible socket; assert state and capability remain unchanged.

**Step 2: Implement** Strictly parse an exact versioned broker request,
including `parseReviewPlanV1`, before any lifecycle mutation. Validate the
complete next persisted state before atomic rename so failed validation cannot
commit corruption or consume a capability.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/canonical-json.test.ts src/review/schemas.test.ts src/review/validation-authority-broker.test.ts src/review/validation-store.test.ts`.
Expected: malformed direct requests reject before any authoritative state
change.

**Step 5: Commit** `fix(p02-t52): validate broker requests strictly`

### Task p02-t53: (review3 M1) Enforce lifecycle coherence without telemetry

**Files:**

- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`
- Modify: `packages/cli/src/review/validation-recovery.integration.test.ts`

**Step 1: Reproduce** Add valid empty-telemetry states for every supported
phase and malformed post-checkpoint states missing context, plan, assignment,
or receipt.

**Step 2: Implement** Decouple lifecycle phase coherence from telemetry
cardinality. Permit an empty legacy telemetry array where compatible while
always requiring context after checkpoint, no plan/receipt at
`artifacts_loaded`, and complete plan/assignment/receipt state for later
phases.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-store.test.ts src/review/validation-recovery.integration.test.ts`.
Expected: empty telemetry remains compatible without bypassing phase
coherence.

**Step 5: Commit** `fix(p02-t53): enforce telemetry free coherence`

### Task p02-t54: (review4 I1) Bound broker connection lifetime

**Files:**

- Modify: `packages/cli/src/review/validation-authority-broker.ts`
- Modify: `packages/cli/src/review/validation-authority-broker.test.ts`
- Modify: `packages/cli/src/commands/review/authority-broker.ts`
- Modify: `packages/cli/src/commands/review/authority-broker.test.ts`

**Step 1: Reproduce** Hold a partial, unterminated reviewer-visible socket
connection open while completing checkpoint, validate, and begin. Assert that
terminal shutdown still resolves and the detached broker exits within a fixed
deadline.

**Step 2: Implement** Track accepted sockets, enforce a bounded per-connection
read deadline, destroy tracked connections during terminal close after the
active response flushes, and add an absolute shutdown deadline so `closed`
always resolves and signing authority cannot remain resident indefinitely.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-authority-broker.test.ts src/commands/review/authority-broker.test.ts`.
Expected: unterminated and slow socket clients cannot pin the broker beyond its
bounded shutdown deadline, while normal command responses remain complete.

**Step 5: Commit** `fix(p02-t54): bound broker connection lifetime`

### Task p02-t55: (review4 M1) Confine broker sockets to private directories

**Files:**

- Modify: `packages/cli/src/review/validation-authority-broker.ts`
- Modify: `packages/cli/src/review/validation-authority-broker.test.ts`

**Step 1: Reproduce** Launch a real broker and assert that its containing
directory is private to the current user and is removed after normal,
expiration, and forced shutdown.

**Step 2: Implement** Create a per-run temporary directory with mode `0700`,
place the broker socket inside it, and remove the socket and directory
idempotently from every terminal cleanup path.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-authority-broker.test.ts`.
Expected: the socket is unreachable to other local users and all temporary
broker paths are removed after shutdown.

**Step 5: Commit** `fix(p02-t55): confine broker socket directory`

---

## Phase 3: Reviewer Plan and Evidence Contract

**Milestone:** Canonical reviewers create validated plans before evidence,
delegate only when economics justify it, preserve partial dossier coverage, and
use selective evidence for both delegated and inline paths.

**Verification:** Run
`pnpm --filter @open-agent-toolkit/cli test && pnpm type-check`.

### Task p03-t01: Define the canonical plan-first reviewer contract

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)** Require the exact artifacts → checkpoint → plan →
validation receipt → begin-evidence → evidence sequence, mandatory FR5-FR7
fields, no replacement, typed terminal output, no unconditional source read,
and exactly one canonical `## Review Accounting` heading followed by a fenced
`ReviewAccountingV1` JSON block. Preserve the existing `Findings:` count line
and four severity subsections used by gate parsing.

**Step 2: Implement (GREEN)** Update only the canonical reviewer contract,
including the artifact accounting block emitted for completed and blocked
artifact reviews. Launcher-owned commands and validators remain authoritative.
Defer its one PR-scoped version bump to p06-t03.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`
Expected: canonical sequence and authority boundaries are pinned.

**Step 5: Commit** `feat(p03-t01): define plan first reviewer contract`

### Task p03-t02: Enforce delegation gates and dossier contracts

**Files:**

- Create: `packages/cli/src/review/worker-dossier.ts`
- Create: `packages/cli/src/review/worker-dossier.test.ts`
- Modify: `packages/cli/src/review/plan-validator.ts`
- Modify: `packages/cli/src/review/plan-validator.test.ts`

**Step 1: Write test (RED)** Reject fewer than two independent substantial
lanes, missing economics, semantic-only delegation, and invalid contingency;
accept bounded complete/partial dossiers with globally valid IDs.

**Step 2: Implement (GREEN)** Add `validateWorkerDossier`,
`validatePrimaryContingency`, and structural delegation checks to
`validateReviewPlan`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/worker-dossier.test.ts src/review/plan-validator.test.ts`
Expected: delegation, replay, and primary-contingency matrices pass.

**Step 5: Commit** `feat(p03-t02): enforce reviewer delegation gates`

### Task p03-t03: Pin accepted-handle evidence ordering

**Files:**

- Create: `packages/cli/src/review/reviewer-boundary.integration.test.ts`

**Step 1: Write test (RED)** Assert mutation rejection before handle binding,
sibling capability rejection, receipt replay rejection, the atomic evidence
transition, and absence of a replacement-launch API.

**Step 2: Implement (GREEN)** Add an integration harness over the Phase 2
runtime; do not add a second coordinator.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/reviewer-boundary.integration.test.ts`
Expected: only the retained continuation crosses every mutation boundary.

**Step 5: Commit** `test(p03-t03): enforce receipt bound evidence ordering`

### Task p03-t04: Replace local Tier 3 read-all behavior

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)** Require Tier 3 to use preparation, checkpoint,
validated plan, begin-evidence, selective evidence, and `ReviewerTerminalV1`;
forbid `read all FILES_CHANGED`.

**Step 2: Implement (GREEN)** Make the current planning parent the accepted
inline continuation and adopt validated whole-diff eligibility. Defer the one
PR-scoped skill version bump to p06-t03.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`
Expected: inline review shares the plan-first contract.

**Step 5: Commit** `feat(p03-t04): replace inline read all review`

### Task p03-t05: Prove selective evidence reduces broad operations

**Files:**

- Create: `packages/cli/src/review/operation-metrics.ts`
- Create: `packages/cli/src/review/operation-metrics.test.ts`
- Create: `packages/cli/src/review/__fixtures__/large-scope-selective.v1.json`
- Create: `packages/cli/src/review/__fixtures__/small-scope-inline.v1.json`

**Step 1: Write test (RED)** Compare the Phase 1 baseline with large selective
and small compact fixtures; require fewer broad reads/replay without a
wall-clock claim.

**Step 2: Implement (GREEN)** Add `compareOperationMetrics` and deterministic
candidate fixtures.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/operation-metrics.test.ts`
Expected: large scopes improve measured operations and small scopes stay inline.

**Step 5: Commit** `test(p03-t05): pin selective review operation savings`

### Task p03-t06: (review C1) Enforce verifiable plan boundaries

**Files:**

- Modify: `packages/cli/src/review/plan-validator.ts`
- Modify: `packages/cli/src/review/plan-validator.test.ts`
- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/types.test.ts`
- Modify: `packages/cli/src/review/schemas.ts`
- Modify: `packages/cli/src/review/schemas.test.ts`

**Step 1: Reproduce** Add adversarial plans with duplicate classification IDs,
full-file lanes masquerading as non-replayed deterministic evidence, empty or
fabricated positive coverage, incomplete/duplicate direct claim kinds, and
inline or empty enabled contingencies.

**Step 2: Implement** Require globally unique lane/classification IDs, the
complete duplicate-free direct-claim-kind set, non-empty existing
positive-coverage lanes and rationale, structurally provenance-producing
strategies for every accepted/non-replayed lane, and a non-empty delegated
contingency subset. Keep delegation economics explicitly validated at the
strongest mechanically enforceable structure without treating free prose as a
numeric proof.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/plan-validator.test.ts src/review/types.test.ts src/review/schemas.test.ts`.
Expected: every malformed FR5/FR7 boundary rejects before plan receipt while
valid delegated and inline plans remain accepted.

**Step 5: Commit** `fix(p03-t06): enforce verifiable plan boundaries`

### Task p03-t07: (review C2) Parse worker dossiers strictly

**Files:**

- Modify: `packages/cli/src/review/worker-dossier.ts`
- Modify: `packages/cli/src/review/worker-dossier.test.ts`
- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/types.test.ts`

**Step 1: Reproduce** Add unknown-input fixtures for wrong schema versions,
unknown/duplicate keys, malformed nested records, invalid timestamps and result
discriminants, empty or out-of-lane scopes, command-result digest mismatch, and
partial dossiers without explicit uncertainty or uncovered coverage.

**Step 2: Implement** Add a strict unknown-to-`WorkerDossierV1` parser and bind
every command/evidence record to non-empty in-lane scopes and the canonical
referenced command-result digest. Require explicit, coherent uncertainty and
coverage for every partial outcome.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/worker-dossier.test.ts src/review/types.test.ts`.
Expected: malformed, replayable, unscoped, or ambiguous dossiers reject at the
external worker-data boundary.

**Step 5: Commit** `fix(p03-t07): parse worker dossiers strictly`

### Task p03-t08: (review C3) Derive operation savings from traces

**Files:**

- Modify: `packages/cli/src/review/operation-metrics.ts`
- Modify: `packages/cli/src/review/operation-metrics.test.ts`
- Modify: `packages/cli/src/review/__fixtures__/large-scope-selective.v1.json`
- Modify: `packages/cli/src/review/__fixtures__/small-scope-inline.v1.json`

**Step 1: Reproduce** Show that arbitrary smaller aggregate counters pass the
current comparison without representing any production strategy or evidence
operation.

**Step 2: Implement** Define a production-owned non-aggregate operation trace
and derive broad-read/replay counts from validated trace events. Replace
hand-authored aggregate fixtures with deterministic traces tied to selective
and compact-inline strategies, and add a broad/replay-heavy negative trace
that fails the threshold. Preserve the prohibition on wall-clock claims.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/operation-metrics.test.ts`.
Expected: operation savings are derived from validated production-owned events,
and broad/replay-heavy traces fail.

**Step 5: Commit** `fix(p03-t08): derive operation savings from traces`

### Task p03-t09: (re-review C1) Require provenance evidence in accepted dossiers

**Files:**

- Modify: `packages/cli/src/review/worker-dossier.ts`
- Modify: `packages/cli/src/review/worker-dossier.test.ts`

**Step 1: Reproduce** Build a plan that passes `validateReviewPlan` with a
non-replayed deterministic command lane using `accept-provenance`, then show
that a complete dossier with empty `commands` and `evidence` currently passes.
Add the equivalent empty-inventory case and positive command/inventory cases.

**Step 2: Implement** Bind dossier completeness to the accepted lane strategy:
every `accept-provenance` command lane must contain at least one in-scope
command evidence record bound to a canonical command-result digest, and every
accepted inventory lane must contain non-empty in-scope inventory provenance.
Keep complete inline/replayed lanes and valid partial dossiers compatible with
their declared contracts.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/worker-dossier.test.ts src/review/plan-validator.test.ts`.
Expected: evidence-free accepted-provenance dossiers reject while valid command,
inventory, inline, and partial dossiers remain accepted.

**Step 5: Commit** `fix(p03-t09): require accepted dossier provenance`

### Task p03-t10: (re-review C2) Produce operation traces from validated execution

**Files:**

- Modify: `packages/cli/src/review/operation-metrics.ts`
- Modify: `packages/cli/src/review/operation-metrics.test.ts`
- Modify: `packages/cli/src/review/__fixtures__/large-scope-selective.v1.json`
- Modify: `packages/cli/src/review/__fixtures__/small-scope-inline.v1.json`

**Step 1: Reproduce** Show that a caller-authored complete selective trace with
the expected producer string, non-empty changed-file scope, and zero events
passes and claims maximum savings.

**Step 2: Implement** Generate candidate traces through a production-owned
deterministic strategy/evidence harness over validated ChangeMap and ReviewPlan
inputs, rather than trusting fixture-authored producer identity or event lists.
Bind completion and operation events to the executor output, reject complete
non-empty selective scopes with no evidence operations, and retain the
broad/replay-heavy negative case. Preserve the prohibition on wall-clock
claims.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/operation-metrics.test.ts`.
Expected: hand-authored empty or forged traces cannot establish savings, valid
production-derived selective/compact traces pass, and replay-heavy traces fail.

**Step 5: Commit** `fix(p03-t10): bind operation traces to execution`

---

## Phase 4: Output Accounting and Coordinator Integration

**Milestone:** Both sinks accept only exact, claim-addressable accounting;
repairs cannot mutate review substance; every direct broad-review rail uses the
same accepted-continuation coordinator.

**Verification:** Run
`pnpm --filter @open-agent-toolkit/cli test && pnpm type-check`.

### Task p04-t01: Parse exact artifact accounting grammar

**Files:**

- Create: `packages/cli/src/review/artifact-accounting.ts`
- Create: `packages/cli/src/review/artifact-accounting.test.ts`

**Step 1: Write test (RED)** Cover strict encoding/newlines, fence tracking,
the exact heading/fence, 1 MiB cap, blank-only tail, duplicate headings/keys,
alternate fences, trailing JSON, and schema mismatch. Add a producer/consumer
round-trip assertion proving the canonical reviewer template's accounting block
parses while its existing severity-count contract remains intact.

**Step 2: Implement (GREEN)** Add `extractReviewAccounting` and
`parseStrictReviewAccountingJson`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/artifact-accounting.test.ts`
Expected: only `accounting-grammar/v1` parses.

**Step 5: Commit** `feat(p04-t01): parse canonical review accounting`

### Task p04-t02: Validate terminal accounting and ID registries

**Files:**

- Create: `packages/cli/src/review/output-validator.ts`
- Create: `packages/cli/src/review/output-validator.test.ts`

**Step 1: Write test (RED)** Reject receipt/digest/projection drift, duplicate
command/evidence/claim/finding IDs, broken references, invalid claim
dispositions, contradictory outcomes, and passing incomplete coverage.

**Step 2: Implement (GREEN)** Add
`validateReviewOutput(context, terminal): OutputValidationResult` using one map
per global final namespace.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/output-validator.test.ts`
Expected: incomplete state requires blocked-incomplete accounting and terminal.

**Step 5: Commit** `feat(p04-t02): validate reviewer terminal accounting`

### Task p04-t03: Stage and publish artifact snapshots safely

**Files:**

- Create: `packages/cli/src/review/artifact-staging.ts`
- Create: `packages/cli/src/review/artifact-staging.test.ts`

**Step 1: Write test (RED)** Cover no-follow/exclusive draft creation,
inode/link replacement rejection, immutable descriptor snapshot, embedded versus
envelope accounting equality, digest recheck, atomic publication, and blocked
draft deletion.

**Step 2: Implement (GREEN)** Add `createArtifactDraft`,
`snapshotArtifactDraft`, and `publishAcceptedArtifact`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/artifact-staging.test.ts`
Expected: only validated snapshot bytes reach a discoverable path.

**Step 5: Commit** `feat(p04-t03): stage review artifacts privately`

### Task p04-t04: Constrain immutable same-handle repair

**Files:**

- Create: `packages/cli/src/review/coordinator-contract.ts`
- Create: `packages/cli/src/review/coordinator-contract.test.ts`
- Modify: `packages/cli/src/review/output-validator.ts`
- Modify: `packages/cli/src/review/output-validator.test.ts`

**Step 1: Write test (RED)** Accept only identity/assignment allowlist fixes;
reject mutations to findings, severity, verdict, evidence/references, commands,
claims, outcomes, uncertainty, strategy, or budget; cap repairs at two.

**Step 2: Implement (GREEN)** Add `immutableReviewSubstanceDigest` and
`validateAndRepair(session, output)` with no replacement-launch method.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/coordinator-contract.test.ts src/review/output-validator.test.ts`
Expected: repair uses only the recorded continuation and frozen substance.

**Step 5: Commit** `feat(p04-t04): constrain accounting repair`

### Task p04-t05: Add the validate-output JSON command

**Files:**

- Create: `packages/cli/src/commands/review/validate-output.ts`
- Create: `packages/cli/src/commands/review/validate-output.test.ts`
- Modify: `packages/cli/src/commands/review/index.ts`

**Step 1: Write test (RED)** Submit complete `ReviewerTerminalV1` on bounded
stdin; compare artifact accounting copies; assert exit 0/1/2 and one JSON
envelope for success, validation rejection, and system failure.

**Step 2: Implement (GREEN)** Add
`createValidateOutputCommand(deps)` as a thin adapter and register it.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review/validate-output.test.ts`
Expected: no invalid terminal becomes actionable.

**Step 5: Commit** `feat(p04-t05): add review output validation command`

### Task p04-t06: Wire local artifact Tier 1 and Tier 3

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Create: `packages/cli/src/review/local-coordinator.integration.test.ts`

**Step 1: Write test (RED)** Require both tiers to
prepare → bind → checkpoint → validate plan → begin evidence → validate/repair
terminal → publish/bookkeep; blocked output must stay non-actionable.

**Step 2: Implement (GREEN)** Update canonical local orchestration and retain
the inline host as Tier 3's accepted continuation. Defer its version bump to
p06-t03.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/review/local-coordinator.integration.test.ts`
Expected: local publication and ledgers occur after acceptance only.

**Step 5: Commit** `feat(p04-t06): validate local review coordinators`

### Task p04-t07: Wire remote structured Tier 1 and Tier 3

**Files:**

- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Modify: `packages/cli/src/review-remote/reviewer-dispatch.ts`
- Modify: `packages/cli/src/review-remote/reviewer-dispatch.test.ts`
- Modify: `packages/cli/src/review-remote/__integration__/project/project-rail.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)** Ensure accepted remote handles return terminal
envelopes; no finding mapping, fallback tier, or GitHub post occurs before
validation or after accepted timeout/blocked/malformed output.

**Step 2: Implement (GREEN)** Adapt both tiers to the shared coordinator while
keeping spawn ownership in the provider/skill runtime. Defer the canonical
skill version bump to p06-t03.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/reviewer-dispatch.test.ts src/review-remote/__integration__/project/project-rail.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`
Expected: remote structured output validates before posting.

**Step 5: Commit** `feat(p04-t07): validate remote structured reviews`

### Task p04-t08: Wire direct phase review and close inventory

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/review/coordinator-inventory.ts`
- Modify: `packages/cli/src/review/coordinator-inventory.test.ts`
- Create: `packages/cli/src/review/direct-phase-coordinator.integration.test.ts`

**Step 1: Write test (RED)** Require direct phase review to adopt shared
preparation/acceptance and prove all five direct/two indirect owners, with no
duplicate context for gate or checkpoint/final aliases.

**Step 2: Implement (GREEN)** Update canonical implementation execution and
inventory only; defer the skill's one version bump to p06-t03.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts src/review/coordinator-inventory.test.ts src/review/direct-phase-coordinator.integration.test.ts`
Expected: every in-scope rail resolves exactly one coordinator.

**Step 5: Commit** `feat(p04-t08): adopt validated direct phase reviews`

### Task p04-t09: Preserve remote reference-dispatch ownership

**Files:**

- Modify: `packages/cli/src/review-remote/reviewer-dispatch.ts`
- Modify: `packages/cli/src/review-remote/reviewer-dispatch.test.ts`
- Modify: `packages/cli/src/review-remote/__integration__/project/project-rail.test.ts`
- Verify: `packages/cli/src/review/dispatch-ownership.test.ts`

**Step 1: Reproduce** Run the ownership contract and show that the reference
dispatcher now imports coordinator authority, adapts the accepted continuation,
and performs same-handle repair despite the design explicitly reserving those
responsibilities for the provider/skill coordinator.

**Step 2: Implement** Restore `reviewer-dispatch.ts` to the design-prescribed
reference boundary: payload construction, exactly one injected spawn, and pure
`StructuredFindings` validation only. It must not import coordinator,
validation-store, or lifecycle authority and must not own accepted-continuation,
repair, retry, replacement, publication, or posting behavior. Keep the
production remote skill's launcher-owned `ReviewerTerminalV1` →
`validate-output` → same-handle accounting repair sequence as the actual
coordinator contract; adjust wrapper and project-rail tests so they do not
misrepresent the unwired reference as that coordinator.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/dispatch-ownership.test.ts src/review-remote/reviewer-dispatch.test.ts src/review-remote/__integration__/project/project-rail.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`.
Expected: the reference wrapper remains pure and single-spawn while the
canonical remote skill retains validation-before-posting and same-handle repair.

**Step 5: Commit** `fix(p04-t09): preserve remote dispatch ownership`

### Task p04-t10: Align validate-output command compatibility contracts

**Files:**

- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Reproduce** Run the complete review-command lifecycle inventory and
`review --help` snapshot; show that both omit the new `validate-output`
subcommand registered by p04-t05.

**Step 2: Implement** Add `validate-output` to the expected lifecycle command
inventory and refresh only the affected review-help snapshot with the exact
registered command description and ordering.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/commands.integration.test.ts src/commands/help-snapshots.test.ts`.
Expected: command registration and help contracts include `validate-output`
without unrelated snapshot churn.

**Step 5: Commit** `test(p04-t10): align validate-output command contracts`

### Task p04-t11: (review C1) Keep final artifact paths launcher-private

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/review/local-coordinator.integration.test.ts`

**Step 1: Reproduce** Assert that Tier 1 instructions currently pass the
pre-computed discoverable final path after stating that the reviewer receives
only the private draft path.

**Step 2: Implement** Pass only `artifactDraftPath` to the accepted reviewer and
retain the final publication path exclusively in the launcher. Reject any Tier
1 payload/instruction that exposes the discoverable final path before output
acceptance.

**Step 3: Format** Run `pnpm format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/review/local-coordinator.integration.test.ts`.
Expected: no local reviewer can create the final artifact before validation and
publication.

**Step 5: Commit** `fix(p04-t11): keep final artifact paths launcher private`

### Task p04-t12: (review C2) Enforce the final verification boundary

**Files:**

- Modify: `packages/cli/src/review/output-validator.ts`
- Modify: `packages/cli/src/review/output-validator.test.ts`
- Modify: `packages/cli/src/review/types.ts`
- Modify: `packages/cli/src/review/types.test.ts`
- Modify: `packages/cli/src/review/schemas.ts`
- Modify: `packages/cli/src/review/schemas.test.ts`
- Modify: `packages/cli/src/review/artifact-accounting.ts`
- Modify: `packages/cli/src/review/artifact-accounting.test.ts`

**Step 1: Reproduce** Validate a complete output with an empty evidence/claim
registry against a plan requiring all direct claim kinds and positive coverage;
also show that artifact findings are absent from promoted-finding checks.

**Step 2: Implement** Require the exact planned direct-claim kinds and positive
coverage samples, with evidence for every required direct/sample claim. Add a
strict typed artifact finding-ID projection bound to the immutable artifact
accounting/snapshot so promoted artifact findings receive the same exactly-once
verification checks as structured findings.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/output-validator.test.ts src/review/types.test.ts src/review/schemas.test.ts src/review/artifact-accounting.test.ts`.
Expected: omitted direct/sample claims and unprojected artifact findings reject.

**Step 5: Commit** `fix(p04-t12): enforce final verification boundary`

### Task p04-t13: (review C3) Require exact assignment bucket identities

**Files:**

- Modify: `packages/cli/src/review/output-validator.ts`
- Modify: `packages/cli/src/review/output-validator.test.ts`

**Step 1: Reproduce** Repeat one valid lane/classification ID while omitting a
different required ID without changing the bucket count.

**Step 2: Implement** Reject duplicate lane/classification IDs and require the
exact output ID sets to equal the stored assignment projection before validating
bucket content or references.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/output-validator.test.ts`.
Expected: duplicate, missing, and substituted buckets reject.

**Step 5: Commit** `fix(p04-t13): require exact assignment buckets`

### Task p04-t14: (review C4) Derive coverage through permitted contingency

**Files:**

- Modify: `packages/cli/src/review/output-validator.ts`
- Modify: `packages/cli/src/review/output-validator.test.ts`

**Step 1: Reproduce** Mark a delegated lane uncovered, set primary completion
to complete, and self-declare full coverage when the stored contingency is not
allowed or does not cover the claimed subset.

**Step 2: Implement** Validate primary completion against the stored
`primaryContingency`, reject unpermitted execution, require exact completed
path/obligation subsets with evidence, and derive final coverage from worker
plus primary evidence instead of trusting `inspectionCoverage`.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/output-validator.test.ts`.
Expected: uncovered or partial lanes cannot fabricate complete coverage.

**Step 5: Commit** `fix(p04-t14): derive contingency coverage`

### Task p04-t15: (review C5) Persist immutable same-handle output repair

**Files:**

- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`
- Modify: `packages/cli/src/review/coordinator-contract.ts`
- Modify: `packages/cli/src/review/coordinator-contract.test.ts`
- Modify: `packages/cli/src/commands/review/validate-output.ts`
- Modify: `packages/cli/src/commands/review/validate-output.test.ts`
- Modify: `packages/cli/src/review/validation-recovery.integration.test.ts`

**Step 1: Reproduce** Submit an invalid initial terminal, then a changed
substance terminal, and submit more repair attempts than the allowed maximum
through the production CLI/store path.

**Step 2: Implement** Persist the initial immutable review-substance digest and
output attempt/repair count in launcher-owned validation state. Route
`validate-output` through the coordinator transition, permit only accounting
allowlist repairs through the retained accepted continuation, reject substance
mutation and a fourth total submission, and terminalize exhausted runs.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-store.test.ts src/review/coordinator-contract.test.ts src/commands/review/validate-output.test.ts src/review/validation-recovery.integration.test.ts`.
Expected: production state, not prose or an isolated helper, enforces immutable
same-handle repair and the two-repair cap.

**Step 5: Commit** `fix(p04-t15): persist output repair state`

### Task p04-t16: (review I1) Publish through a descriptor-safe atomic rename

**Files:**

- Modify: `packages/cli/src/review/artifact-staging.ts`
- Modify: `packages/cli/src/review/artifact-staging.test.ts`

**Step 1: Reproduce** Replace the publication temporary pathname after write
and verification but before destination creation.

**Step 2: Implement** Keep the temporary descriptor and inode identity bound
through verification, reject path/link/inode drift, and atomically rename that
exact verified temporary file within the destination directory. Never reopen
and hard-link an untrusted pathname.

**Step 3: Format** Run
`pnpm --filter @open-agent-toolkit/cli format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/artifact-staging.test.ts`.
Expected: publication-temp replacement cannot publish unverified bytes.

**Step 5: Commit** `fix(p04-t16): publish verified artifact atomically`

### Task p04-t17: (review C6) Bind publication to the accepted snapshot

**Files:**

- Modify: `packages/cli/src/review/artifact-staging.ts`
- Modify: `packages/cli/src/review/artifact-staging.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`
- Modify: `packages/cli/src/commands/review/validate-output.ts`
- Modify: `packages/cli/src/commands/review/validate-output.test.ts`
- Create: `packages/cli/src/commands/review/publish-output.ts`
- Create: `packages/cli/src/commands/review/publish-output.test.ts`
- Modify: `packages/cli/src/commands/review/index.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/review/local-coordinator.integration.test.ts`

**Step 1: Reproduce** Validate an artifact draft, mutate its prose while
preserving accounting, re-snapshot through the available API, and publish the
post-validation bytes.

**Step 2: Implement** Persist an opaque accepted-snapshot identity and immutable
bytes/digest in launcher-owned private state, atomically bind it to the accepted
terminal, and add a launcher-only
`oat review publish-output --run-id <id> --destination <path> --json` command
that consumes exactly that snapshot once. Keep the destination launcher-owned,
update exact command/help contracts, and never re-snapshot reviewer-controlled
draft bytes after validation. Blocked/invalid output deletes or leaves no
discoverable artifact.

**Step 3: Format** Run `pnpm format:fix`.

**Step 4: Verify** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/artifact-staging.test.ts src/review/validation-store.test.ts src/commands/review/validate-output.test.ts src/commands/review/publish-output.test.ts src/commands/commands.integration.test.ts src/commands/help-snapshots.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/review/local-coordinator.integration.test.ts`.
Expected: only the once-consumed accepted snapshot reaches the discoverable
review path.

**Step 5: Commit** `fix(p04-t17): bind publication to accepted snapshot`

---

## Phase 5: Gate Diagnostics and Compatibility

**Milestone:** Explicit enforce mode fails closed with actionable diagnostics,
legacy remains the initial default, and gates preserve exact launch correlation,
override/BLOCKED/receive semantics, and a 20-minute built-in artifact-review
budget.

**Verification:** Run
`pnpm --filter @open-agent-toolkit/cli test && pnpm type-check`.

### Task p05-t01: Add reviewPlanMode configuration

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)** Unset resolves to `legacy`; resolution order is
local, then shared, then user, then default; invalid values fail; explicit
enforce persists; existing config is not rewritten.

**Step 2: Implement (GREEN)** Add `workflow.reviewPlanMode` to schema,
resolution, and config CLI without changing `MIN_GATE_TIMEOUT_MS`.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: compatibility mode resolves through normal precedence.

**Step 5: Commit** `feat(p05-t01): add review plan compatibility mode`

### Task p05-t02: Enforce capability and 120-second preflight

**Files:**

- Modify: `packages/cli/src/review/preflight.ts`
- Modify: `packages/cli/src/review/preflight.test.ts`
- Modify: `packages/cli/src/review/budget.ts`
- Modify: `packages/cli/src/review/budget.test.ts`

**Step 1: Write test (RED)** Enforce rejects missing capability and 119,999 ms
before launch, accepts 120,000 ms/null budget, names both migration remedies,
and never silently downgrades; legacy creates no state and marks its output
`legacy-unvalidated`.

**Step 2: Implement (GREEN)** Resolve mode into preflight and add
`review-budget-below-minimum` diagnostics with source/value/floor/remedies.
Project `legacy-unvalidated` on legacy output without creating validation state.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/preflight.test.ts src/review/budget.test.ts`
Expected: enforce and legacy boundaries are exact.

**Step 5: Commit** `feat(p05-t02): enforce review launch preflight`

### Task p05-t03: Wire mode resolution through every coordinator

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write test (RED)** Every direct rail preflights enforce before model
launch, legacy uses the current path without validation state, explicit enforce
cannot fall back, and indirect aliases create no duplicate context.

**Step 2: Implement (GREEN)** Add mode/preflight branches to canonical owners;
defer all one-time version increments to p06-t03.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: inventory-wide mode behavior is pinned.

**Step 5: Commit** `feat(p05-t03): wire review mode across coordinators`

### Task p05-t04: Bind gate and validation runs by exact tuple

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `packages/cli/src/commands/gate/gate-hardening.integration.test.ts`
- Modify: `packages/cli/src/review/validation-store.ts`
- Modify: `packages/cli/src/review/validation-store.test.ts`

**Step 1: Write test (RED)** Generate a random launch-attempt ID before each
provider launch; exact pairs resolve once; sibling/mismatched/duplicate pairs
reject; pre-start rejection deletes and regenerates; acceptance forbids
replacement.

**Step 2: Implement (GREEN)** Thread the gate/attempt tuple through child launch
context, markers, private index, and cleanup.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/validation-store.test.ts src/commands/gate/index.test.ts src/commands/gate/gate-hardening.integration.test.ts`
Expected: translation never scans run directories or crosses attempts.

**Step 5: Commit** `feat(p05-t04): correlate gate validation attempts`

### Task p05-t05: Translate accounting-invalid gate completion

**Files:**

- Create: `packages/cli/src/commands/gate/review-plan-failure.ts`
- Create: `packages/cli/src/commands/gate/review-plan-failure.test.ts`
- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `packages/cli/src/commands/gate/gate-hardening.integration.test.ts`

**Step 1: Write test (RED)** Exact receipts yield
`review_complete_accounting_invalid` with all three IDs, attempt counts, safe
pointer, null artifact/handoff, and false eligibility; preserve timeout,
BLOCKED, correlation, and artifact-validation envelopes.

**Step 2: Implement (GREEN)** Add tuple-based terminal resolver, minimal
diagnostic materialization, parent cleanup, and typed translation.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-plan-failure.test.ts src/commands/gate/index.test.ts src/commands/gate/gate-hardening.integration.test.ts`
Expected: every terminal class remains distinguishable and non-actionable.

**Step 5: Commit** `fix(p05-t05): translate accounting invalid gates`

### Task p05-t06: Create tracked enforce-default rollout item

**Files:**

- Create: `.oat/repo/pjm/backlog/items/BL-260730-flip-reviewplan-enforcement.md`
- Modify: `.oat/repo/pjm/backlog/index.md`

**Step 1: Write test (RED)** Define checklist evidence for coordinator parity,
the explicit-enforce matrix, terminal fixtures, seven-day soak, zero unresolved
P0/P1, release validation, day-14 disposition, owner, and next review.

**Step 2: Implement (GREEN)** Create the fixed-ID backlog item, then run:
`pnpm run cli:source -- backlog regenerate-index`.

**Step 3: Format** No documented write/fix command covers the declared files. Warn once with `no format command discovered in repo instructions; skipping`, then continue without formatting.

**Step 4: Verify** Run:
`pnpm run cli:source -- --json pjm doctor`
Expected: Stage A and Stage B are separately tracked with no PJM error.

**Step 5: Commit** `chore(p05-t06): track review plan default flip`

### Task p05-t07: Raise the built-in artifact review timeout

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)** With no CLI, target, config, or environment
override, require every artifact review scope to resolve 1,200,000 ms with
source `scope-default`. Pin task-scoped code reviews at 900,000 ms and
phase/range/final code reviews at 1,800,000 ms. Preserve the existing timeout
precedence and accepted bounds.

**Step 2: Implement (GREEN)** Raise only the built-in artifact-review default
from 900,000 to 1,200,000 ms. Do not change code-review defaults,
`MIN_GATE_TIMEOUT_MS`, `MAX_GATE_TIMEOUT_MS`, or any configured override.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: artifact reviews receive 20 minutes universally while all precedence
and code-scope budgets remain unchanged.

**Step 5: Commit** `fix(p05-t07): extend artifact review timeout`

---

## Phase 6: Documentation, Provider Sync, and Compatibility Release

**Milestone:** Stage A ships the complete explicit-enforce path with `legacy`
as the initial default, synchronized assets, lockstep public packages, complete
validation, and a recorded publication timestamp that starts the soak.

**Verification:** Run
`pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate`.

### Task p06-t01: Document review workflow behavior

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/workflows/projects/hill-checkpoints.md`

**Step 1: Write check (RED)** Produce a documentation delta analysis for the
listed pages covering missing plan-first sequence, selective evidence,
accepted-handle repair, blocked semantics, direct phase-review adoption, and
independence from HiLL/Phase gate review. Present the proposed substantive
changes and obtain explicit user approval before editing.

**Step 2: Implement (GREEN)** After approval, update existing pages only; do
not create a new navigation page or hand-edit the generated index. If approval
is withheld, stop with the delta analysis intact and leave the pages unchanged.

**Step 3: Format** Run the documented docs formatter:
`pnpm --filter oat-docs docs:format`

**Step 4: Verify** Run:
`pnpm --filter oat-docs docs:format:check && pnpm --filter oat-docs docs:lint`
Expected: authored workflow docs pass local checks.

**Step 5: Commit** `docs(p06-t01): document plan first reviews`

### Task p06-t02: Document CLI, config, gate, and directory contracts

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify: `apps/oat-docs/index.md`

**Step 1: Write check (RED)** Produce a documentation delta analysis for the
listed pages covering missing review commands, JSON exits, `reviewPlanMode`,
120-second enforce floor, 20-minute built-in artifact-review default, unchanged
code-review defaults and timeout precedence, terminal subtype, temporary store,
legacy default, remedies, and rollback guidance. Present the proposed
substantive changes and obtain explicit user approval before editing.

**Step 2: Implement (GREEN)** After approval, update authored pages, then
regenerate (never hand-edit) the index with:
`pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`.
If approval is withheld, stop with the delta analysis intact and leave the
pages and generated index unchanged.

**Step 3: Format** Run the documented docs formatter:
`pnpm --filter oat-docs docs:format`

**Step 4: Verify** Run:
`pnpm docs:check-links && pnpm build:docs`
Expected: generated index, links, and docs build pass.

**Step 5: Commit** `docs(p06-t02): document review runtime rollout`

### Task p06-t03: Bump changed canonical asset versions once

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Write check (RED)** Diff each canonical asset against the merge base;
require exactly one frontmatter version increment for every changed agent/skill
and no generated-view version edits.

**Step 2: Implement (GREEN)** Increment each changed canonical owner once,
regardless of how many earlier tasks edited it.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: canonical versions and contracts validate.

**Step 5: Commit** `chore(p06-t03): version review plan assets`

### Task p06-t04: Synchronize provider views and bundled assets

**Files:**

- Modify: `.oat/sync/manifest.json`
- Modify: `.codex/agents/oat-reviewer.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-luna-low.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-luna-medium.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-luna-high.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-luna-xhigh.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-terra-low.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-terra-medium.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-terra-high.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-terra-xhigh.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-sol-low.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-sol-medium.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-sol-high.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-sol-xhigh.toml`
- Modify: `.codex/agents/oat-reviewer-gpt-5-6-sol-max.toml`
- Modify: `.cursor/agents/oat-reviewer-composer-2-5.md`
- Modify: `.cursor/agents/oat-reviewer-cursor-grok-4-5-high.md`
- Modify: `.cursor/agents/oat-reviewer-gpt-5-6-luna-high.md`
- Modify: `.cursor/agents/oat-reviewer-gpt-5-6-luna-xhigh.md`
- Modify: `.cursor/agents/oat-reviewer-gpt-5-6-terra-high.md`
- Modify: `.cursor/agents/oat-reviewer-gpt-5-6-sol-high.md`
- Modify: `.cursor/agents/oat-reviewer-gpt-5-6-sol-medium.md`
- Modify: `.cursor/agents/oat-reviewer-gpt-5-6-sol-xhigh.md`
- Modify: `.cursor/agents/oat-reviewer-gpt-5-6-sol-max.md`
- Modify: `.cursor/agents/oat-reviewer-claude-sonnet-5-high.md`
- Modify: `.cursor/agents/oat-reviewer-claude-fable-5-thinking-high.md`
- Modify: `.cursor/agents/oat-reviewer-claude-fable-5-thinking-xhigh.md`
- Modify: `.cursor/agents/oat-reviewer-claude-opus-4-8-thinking-xhigh.md`
- Modify: `.cursor/agents/oat-reviewer-claude-opus-5-thinking-low.md`
- Modify: `.cursor/agents/oat-reviewer-claude-opus-5-thinking-medium.md`
- Modify: `.cursor/agents/oat-reviewer-claude-opus-5-thinking-high.md`
- Modify: `.cursor/agents/oat-reviewer-claude-opus-5-thinking-xhigh.md`
- Modify: `.cursor/agents/oat-reviewer-claude-opus-5-thinking-max.md`

**Step 1: Write check (RED)** Run `oat sync --scope all`; capture the exact
manifest-owned generated paths and reject any hand-edited provider mirror.

**Step 2: Implement (GREEN)** Stage only sync-reported provider views and
bundled assets; then run `oat --json sync --scope all --dry-run`.

**Step 3: Format** Run the generator-owned sync only; do not reformat generated
provider files independently.

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/shared/markdown-agent-codec.test.ts src/providers/cursor/codec/sync-extension.test.ts src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: dry run is clean and provider/bundle parity passes.

**Step 5: Commit** `chore(p06-t04): sync review plan provider views`

### Task p06-t05: Advance the Stage A lockstep package version

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Write check (RED)** Resolve the next common unpublished version at
execution time; reject unequal versions or unrelated lockfile drift.

**Step 2: Implement (GREEN)** Apply one version to all five packages, run
`pnpm install --lockfile-only`, and regenerate bundled assets with
`bash packages/cli/scripts/bundle-assets.sh`.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run: `pnpm release:check-versions`
Expected: all public package versions are lockstep.

**Step 5: Commit** `chore(p06-t05): bump compatibility packages`

### Task p06-t06: Validate and dogfood explicit enforce

**Files:**

- Modify: `.oat/repo/pjm/backlog/items/BL-260730-flip-reviewplan-enforcement.md`
- Modify: `.oat/projects/shared/review-plan-workflow/implementation.md`

**Step 1: Write check (RED)** Run the focused config/review/gate/skill/bundle
test matrix and record any failing cell before live dogfood.

**Step 2: Implement (GREEN)** Create an isolated local fixture with
`DOGFOOD_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/oat-review-plan-dogfood.XXXXXX")" && git worktree add --detach "$DOGFOOD_ROOT/repo" HEAD`,
set `DOGFOOD_PROJECT="$DOGFOOD_ROOT/repo/.oat/projects/shared/review-plan-workflow"`,
then run
`pnpm --dir "$DOGFOOD_ROOT/repo" run cli:source -- config set workflow.reviewPlanMode enforce --local`.
Resolve the fixture value with
`MODE_JSON="$(pnpm --dir "$DOGFOOD_ROOT/repo" --silent run cli:source -- --json config get workflow.reviewPlanMode)"`,
and fail unless
`node -e 'const d=JSON.parse(process.argv[1]); if(d.value!=="enforce" || d.source!=="local") process.exit(1)' "$MODE_JSON"`
passes.

Before remote rows, push the candidate branch and open its draft release PR:
`git push -u origin HEAD && STAGE_A_PR_URL="$(gh pr create --draft --title "ReviewPlan Stage A compatibility release" --body "Stage A release candidate; dogfood evidence will be added before ready-for-review.")" && STAGE_A_PR_NUMBER="$(gh pr view "$STAGE_A_PR_URL" --json number --jq .number)"`.
Obtain the remote skill's explicit posting approval separately for each remote
row; one approval does not carry to another. Then run this matrix:

| Rail                               | Exact invocation                                                                                                                                                                                                 | Fixture and scope                             | Required sink and terminal result                                                    | Evidence and cleanup                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Local artifact Tier 1              | Invoke `oat-project-review-provide code p06` with exact Tier 1 dispatch                                                                                                                                          | `$DOGFOOD_PROJECT`; reviewed HEAD through p06 | Published local review artifact from a `complete` terminal                           | Record run ID, reviewed HEAD, artifact digest, and verdict in `implementation.md`      |
| Remote structured Tier 1           | Invoke `oat-project-review-provide-remote code final --pr "$STAGE_A_PR_NUMBER" --project ".oat/projects/shared/review-plan-workflow"` with exact Tier 1 dispatch                                                 | Stage A draft PR; full PR range               | One posted structured GitHub PR review from a `complete` terminal                    | Record PR review URL and dispatch report; remote skill removes its ephemeral worktree  |
| Local artifact Tier 3              | Invoke `oat-project-review-provide code p06` with an explicit inline/Tier 3 request                                                                                                                              | `$DOGFOOD_PROJECT`; reviewed HEAD through p06 | Published local review artifact from a validated `complete` inline terminal          | Record artifact digest and verdict; retain no untracked fixture edits                  |
| Remote structured Tier 3           | Invoke `oat-project-review-provide-remote code final --pr "$STAGE_A_PR_NUMBER" --project ".oat/projects/shared/review-plan-workflow"` with an explicit inline/Tier 3 request                                     | Stage A draft PR; full PR range               | One posted validated inline GitHub PR review from a `complete` terminal              | Record PR review URL and terminal subtype; remote skill removes its ephemeral worktree |
| Direct implementation phase review | Invoke the root-owned `oat-project-implement` phase-review contract for `p06`                                                                                                                                    | `$DOGFOOD_PROJECT`; p06 commit range          | Published local artifact and exact p06 code-review event from a `complete` terminal  | Record artifact digest, event identity, and verdict in `implementation.md`             |
| Gate review                        | From `$DOGFOOD_ROOT/repo`, run `pnpm run cli:source -- --json gate review --project "$DOGFOOD_PROJECT" --review-type code --review-scope p06 --exit-nonzero-on important '$oat-project-review-provide code p06'` | `$DOGFOOD_PROJECT`; p06 commit range          | Corroborated `ok`, `receiveEligible: true`, non-null artifact, and non-null handoff  | Record gate run ID, target, handoff, artifact digest, and disposition                  |
| Checkpoint alias                   | Invoke `oat-project-review-provide code p01-p06` through the implementation checkpoint path                                                                                                                      | `$DOGFOOD_PROJECT`; contiguous p01-p06 range  | Published local artifact with exact `p01-p06` scope from a `complete` terminal       | Record invocation alias, event identity, reviewed range, and verdict                   |
| Final alias                        | Invoke `oat-project-review-provide code final` through the implementation final path                                                                                                                             | `$DOGFOOD_PROJECT`; full implementation range | Published local artifact with exact `final` scope from a `complete` terminal         | Record invocation alias, event identity, reviewed range, and verdict                   |
| Injected local `BLOCKED`           | Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review/local-coordinator.integration.test.ts`                                                                                                     | Fake accepted local continuation              | `blocked-incomplete`; no discoverable artifact, actionable verdict, or passing event | Record the blocked-case test name and result                                           |
| Injected remote `BLOCKED`          | Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/__integration__/project/project-rail.test.ts`                                                                                       | Fake accepted remote continuation             | `blocked-incomplete`; no GitHub post or structured pass                              | Record the blocked-case test name and result                                           |
| Injected gate `BLOCKED`            | Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/gate-hardening.integration.test.ts`                                                                                                 | Correlated fake gate attempt                  | `status: blocked`, `receiveEligible: false`, null artifact, and null handoff         | Record the gate fixture name and envelope                                              |

Copy the evidence rows into `implementation.md`, then run
`git worktree remove --force "$DOGFOOD_ROOT/repo" && rm -rf "$DOGFOOD_ROOT"`.
An actionable-findings gate envelope with `status: blocked` and
`receiveEligible: true` is not a reviewer `BLOCKED` terminal and does not
satisfy the injected gate row. Any missing required sink, unexpected sink on an
injected blocked row, uncorroborated envelope, cleanup failure, or terminal
outside the declared set blocks release.

**Step 3: Format** No documented write/fix command covers the declared files. Warn once with `no format command discovered in repo instructions; skipping`, then continue without formatting.

**Step 4: Verify** Run:
`pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm lint && pnpm format && pnpm build:docs && pnpm release:validate`
Expected: every repository/release gate and dogfood cell passes.

**Step 5: Commit** `test(p06-t06): record enforced review matrix`; push the
evidence commit to the existing Stage A draft PR, run
`gh pr ready "$STAGE_A_PR_NUMBER"`, and stop until its merge is externally
confirmed.

### Task p06-t07: Publish Stage A and start the soak

**Files:**

- Modify: `.oat/repo/pjm/backlog/items/BL-260730-flip-reviewplan-enforcement.md`
- Modify: `.oat/projects/shared/review-plan-workflow/implementation.md`

**Step 1: Write check (RED)** Confirm the Stage A release PR is merged, Stage A
packages are publishable, and p06-t06 evidence is complete.

**Step 2: Implement (GREEN)** Refresh the merged base and create the dedicated
`review-plan-stage-a-publication-record` bookkeeping branch. Through the
authorized release pipeline, publish the lockstep Stage A version, record
release links/timestamp, start the seven-calendar-day soak, and reserve the
immediate next release for Stage B. Do not reuse or amend the merged Stage A
release branch.

**Step 3: Format** No documented write/fix command covers the declared files. Warn once with `no format command discovered in repo instructions; skipping`, then continue without formatting.

**Step 4: Verify** Expected: publication is externally confirmed and the soak
start is durable. This is a real cross-release blocker; Phase 7 must not begin
early.

**Step 5: Commit** `chore(p06-t07): record compatibility release`; open and
merge the Stage A post-publication bookkeeping PR before starting the soak
clock used by p07-t01.

---

## Phase 7: Enforce-Default Flip

**Milestone:** After the mandatory soak and rollout gate, a separate Stage B
release makes enforce the default, retains explicit temporary legacy opt-out,
revalidates all boundaries, and closes rollout tracking.

**Verification:** Run
`pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate`.

### Task p07-t01: Evaluate the rollout gate

**Files:**

- Modify: `.oat/repo/pjm/backlog/items/BL-260730-flip-reviewplan-enforcement.md`

**Step 1: Write check (RED)** Require exhaustive coordinator parity, complete
dogfood, at least seven calendar days since Stage A, no unresolved P0/P1,
distinct terminal fixtures, and green release validation.

**Step 2: Implement (GREEN)** Record evidence and disposition. If any criterion
fails, stop before code changes; at day 14 record owner, dated fix/rollback or
time-bounded extension, and next review.

**Step 3: Format** No documented write/fix command covers the declared files. Warn once with `no format command discovered in repo instructions; skipping`, then continue without formatting.

**Step 4: Verify** Expected: every rollout checkbox has durable evidence or
Phase 7 remains blocked.

**Step 5: Commit** `chore(p07-t01): record enforce rollout evidence`

### Task p07-t02: Flip the default and retain legacy opt-out

**Files:**

- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)** Unset now resolves to enforce; explicit
local/shared/user legacy still wins; configs are not rewritten; failed enforce
preflight never falls back.

**Step 2: Implement (GREEN)** Change only the resolved default and associated
catalog/help text.

**Step 3: Format** Run the documented package formatter:
`pnpm --filter @open-agent-toolkit/cli format:fix`

**Step 4: Verify** Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts src/commands/config/index.test.ts src/review/preflight.test.ts`
Expected: enforce is default and legacy remains explicit.

**Step 5: Commit** `feat(p07-t02): enable review plan enforcement`

### Task p07-t03: Document enforce-default behavior

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/workflows/projects/hill-checkpoints.md`
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify: `apps/oat-docs/index.md`

**Step 1: Write check (RED)** Produce a documentation delta analysis that
locates every Stage A statement calling legacy the default and every missing
temporary-opt-out/removal-criteria note. Present the proposed substantive
changes and obtain explicit user approval before editing.

**Step 2: Implement (GREEN)** After approval, update authored pages, then
regenerate the index with the same p06-t02 command; do not hand-edit it. If
approval is withheld, stop with the delta analysis intact and leave the pages
and generated index unchanged.

**Step 3: Format** Run the documented docs formatter:
`pnpm --filter oat-docs docs:format`

**Step 4: Verify** Run:
`pnpm --filter oat-docs docs:format:check && pnpm --filter oat-docs docs:lint && pnpm docs:check-links && pnpm build:docs`
Expected: docs consistently describe enforce default.

**Step 5: Commit** `docs(p07-t03): document enforce default reviews`

### Task p07-t04: Advance the Stage B lockstep package version

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Write check (RED)** Resolve the next common unpublished Stage B
version and reject unequal manifests or unrelated lockfile drift.

**Step 2: Implement (GREEN)** Apply the lockstep version, then run
`pnpm install --lockfile-only` and
`bash packages/cli/scripts/bundle-assets.sh`. Reject unrelated lockfile drift
and verify the generated public-package version asset before release checks.

**Step 3: Format** Run the documented repository formatter:
`pnpm format:fix`

**Step 4: Verify** Run:
`pnpm release:check-versions && pnpm release:validate`
Expected: Stage B package and bundled versions agree.

**Step 5: Commit** `chore(p07-t04): bump enforce default packages`

### Task p07-t05: Revalidate and dogfood the Stage B release candidate

**Files:**

- Modify: `.oat/repo/pjm/backlog/items/BL-260730-flip-reviewplan-enforcement.md`
- Modify: `.oat/projects/shared/review-plan-workflow/implementation.md`

**Step 1: Write check (RED)** Run
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts src/commands/config/index.test.ts`
and require the Stage B assertions that an unset setting resolves to enforce
without rewriting config. Record failures before release.

**Step 2: Implement (GREEN)** Reuse the p06-t06 fixture setup. Before adding a
fixture-local override, create `"$DOGFOOD_ROOT/home"` and resolve with no user
config:
`MODE_JSON="$(HOME="$DOGFOOD_ROOT/home" pnpm --dir "$DOGFOOD_ROOT/repo" --silent run cli:source -- --json config get workflow.reviewPlanMode)"`.
Require
`node -e 'const d=JSON.parse(process.argv[1]); if(d.value!=="enforce" || d.source!=="default") process.exit(1)' "$MODE_JSON"`
to pass, proving neither tracked config nor the isolated home overrides the
Stage B default. Then set and assert a fixture-local enforce override exactly
as in p06-t06 so live rails cannot be contaminated by an operator's user-level
legacy setting.

Push the candidate branch and open its draft release PR before remote rows:
`git push -u origin HEAD && STAGE_B_PR_URL="$(gh pr create --draft --title "ReviewPlan Stage B enforce-default release" --body "Stage B release candidate; dogfood evidence will be added before ready-for-review.")" && STAGE_B_PR_NUMBER="$(gh pr view "$STAGE_B_PR_URL" --json number --jq .number)"`.
Obtain separate explicit posting approval for each remote row. Run the p06-t06
matrix with `$STAGE_B_PR_NUMBER`, the Stage B candidate, the same evidence
schema, and the same cleanup. Record each result. This task ends at the
pre-publication merge boundary; do not publish or write post-publication
records on the release branch.

**Step 3: Format** No documented write/fix command covers the declared files. Warn once with `no format command discovered in repo instructions; skipping`, then continue without formatting.

**Step 4: Verify** Run:
`pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm lint && pnpm format && pnpm build:docs && pnpm release:validate`
Expected: the Stage B release candidate and every dogfood cell pass with no
unresolved P0/P1 regression.

**Step 5: Commit** `test(p07-t05): validate enforce default release`; push the
evidence commit to the existing Stage B draft PR, run
`gh pr ready "$STAGE_B_PR_NUMBER"`, and stop until its merge is externally
confirmed.

### Task p07-t06: Publish Stage B and close rollout tracking

**Files:**

- Modify: `.oat/projects/shared/review-plan-workflow/implementation.md`
- Delete: `.oat/repo/pjm/backlog/items/BL-260730-flip-reviewplan-enforcement.md`
- Delete: `.oat/repo/pjm/backlog/items/BL-260729-implement-reviewplan-first.md`
- Create: `.oat/repo/pjm/backlog/archived/BL-260730-flip-reviewplan-enforcement.md`
- Create: `.oat/repo/pjm/backlog/archived/BL-260729-implement-reviewplan-first.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Modify: `.oat/repo/pjm/backlog/index.md`

**Step 1: Write check (RED)** Confirm the Stage B release PR is merged and both
backlog items' acceptance criteria pass; keep legacy removal open until two
enforce-default releases and 30 days.

**Step 2: Implement (GREEN)** Refresh the merged base and create the dedicated
`review-plan-stage-b-publication-record` bookkeeping branch. Publish Stage B
through the authorized release pipeline, record release links/results in
`implementation.md`, archive both items with
`oat backlog archive <id> --summary "<release outcome>"`, and regenerate
backlog indexes. Do not reuse or amend the merged Stage B release branch.

**Step 3: Format** No documented write/fix command covers the declared files. Warn once with `no format command discovered in repo instructions; skipping`, then continue without formatting.

**Step 4: Verify** Run:
`pnpm run cli:source -- backlog regenerate-index && pnpm run cli:source -- --json pjm doctor`
Expected: Stage B publication is externally confirmed, both shipped items are
archived, and PJM reports no drift.

**Step 5: Commit** `chore(p07-t06): close review plan rollout`; open the Stage
B post-publication bookkeeping PR.

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| p01    | code     | fixes_completed | 2026-07-30 | reviews/archived/p01-review-2026-07-30T213813Z.md           | 6f119c18ed8aa2c5aa12a4184206fdad0db16321 | auto       | -           |
| p01    | code     | passed          | 2026-07-30 | reviews/archived/p01-review-2026-07-30T215327Z.md           | 40fa861fe199f755f66cce784feafbc1e0ff68c1 | auto       | -           |
| p02    | code     | fixes_completed | 2026-07-30 | reviews/archived/p02-review-2026-07-30T234200Z.md           | d6c204514b076d57eaf2ee277d72e6de9a995a53 | auto       | -           |
| p02    | code     | fixes_completed | 2026-07-31 | reviews/archived/p02-review-2026-07-31T014800Z.md           | f7452e5b6fc64256f24d12c2a323be7494bbf08a | auto       | -           |
| p02    | code     | fixes_completed | 2026-07-31 | reviews/archived/p02-review-2026-07-31T040400Z.md           | f179344bdc12d0edc397d526f8665572826a9ad1 | auto       | -           |
| p02    | code     | passed          | 2026-07-31 | reviews/archived/p02-review-2026-07-31T051943Z.md           | a2605f967a543f4772833e0af90cb0ef35ad93df | manual     | -           |
| p03    | code     | fixes_completed | 2026-07-31 | reviews/archived/p03-review-2026-07-31T140054Z.md           | 4243aeb6bc992543f0da5ebe88f03b83dfd9db77 | auto       | -           |
| p03    | code     | fixes_completed | 2026-07-31 | reviews/p03-review-2026-07-31T143803Z.md                    | 46cc835170ab90aa7f016c5c698d3bf4772e010b | auto       | -           |
| p03    | code     | passed          | 2026-07-31 | reviews/p03-review-2026-07-31T150048Z.md                    | 9d3952313c3d1d4ddabf13e63c3e41eac116623b | auto       | -           |
| p04    | code     | fixes_completed | 2026-07-31 | reviews/p04-review-2026-07-31T155658Z.md                    | 9d199314f0956290c70babcc3139c7edebb36869 | auto       | -           |
| p05    | code     | pending         | -          | -                                                           | -                                        | -          | -           |
| p06    | code     | pending         | -          | -                                                           | -                                        | -          | -           |
| p07    | code     | pending         | -          | -                                                           | -                                        | -          | -           |
| final  | code     | pending         | -          | -                                                           | -                                        | -          | -           |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -           |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -           |
| plan   | artifact | passed          | 2026-07-30 | -                                                           | -                                        | -          | -           |
| plan   | artifact | fixes_completed | 2026-07-30 | reviews/archived/artifact-plan-review-2026-07-30T161239Z.md | -                                        | -          | -           |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

**Operator disposition:** Planning was manually unblocked on 2026-07-30. The
latest manual artifact-review fixes remain `fixes_completed` without re-review,
and configured gate run `21b68483-5f01-498c-bfb7-60fd79a8504c` retains its
`review_failed` outcome. The override authorizes implementation without
rewriting either historical result as passed.

---

## Implementation Complete

**Summary:**

- Phase 1: 13 tasks - baseline, contracts, portability seams
- Phase 2: 55 tasks - authoritative metadata, validation runtime, and review fixes
- Phase 3: 10 tasks - reviewer planning, selective evidence, and review fixes
- Phase 4: 17 tasks - accounting, repair, coordinator adoption, compatibility, and review fixes
- Phase 5: 7 tasks - gate diagnostics, timeout, and compatibility mode
- Phase 6: 7 tasks - docs, sync, Stage A release and soak
- Phase 7: 6 tasks - gated enforce-default Stage B release

**Total: 115 tasks**

Phase 6 ends at a real release/soak boundary. Phase 7 is a later release and
must not begin until its rollout gate passes.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Implementation log: `implementation.md`
- Source backlog: `.oat/repo/pjm/backlog/items/BL-260729-implement-reviewplan-first.md`
