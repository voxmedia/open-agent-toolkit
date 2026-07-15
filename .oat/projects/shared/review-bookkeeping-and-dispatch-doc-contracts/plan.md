---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-15
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: [['p01', 'p02']]
oat_plan_hill_phases: ['p03']
oat_auto_review_at_hill_checkpoints: true
oat_phase_review_gate:
  enabled: true
  phases: [p01, p02]
  review_type: code
  exit_nonzero_on: important
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: review-bookkeeping-and-dispatch-doc-contracts

> Execute this plan using `oat-project-implement`.

**Goal:** Make review-event bookkeeping monotonic, reconcile dispatch/lifecycle guidance, and recover validated late gate artifacts without regressing target selection.

**Architecture:** Keep the Markdown ledger, use artifact identity for distinct review events, and select the latest appended event on reads. Localize gate changes to process telemetry and post-execution envelope finalization, reusing existing run-ID correlation and validation.

**Tech Stack:** TypeScript, Vitest, Markdown skill contracts, Fumadocs, pnpm/Turborepo

## Parallelism

Phases p01 and p02 are file-disjoint and may run concurrently: p01 owns skills, control-plane routing, and skill tests; p02 owns gate code/tests/docs. Phase p03 runs after fan-in for sync, lockstep versions, and release validation.

## Planning Decisions

- `parseReviewTable` preserves duplicate-scope rows and `validate-plan` ignores Reviews uniqueness. The control-plane router does use the first `final` row, so distinct events need that small read-side fix.
- Event identity is scope + type + artifact filename. The first event may claim an unbound pending placeholder; each later artifact appends a row; an event only advances through the status ladder.
- Item 2 closes without behavior changes. Existing code/tests couple status and exit; the unused fixed-threshold `ReviewGateVerdict.blocking` is left alone to keep gate work cohesive.
- Timeout telemetry uses additive `noOutputProduced`. Valid run-correlated timeout artifacts retain `status: ok|blocked` and add `lateCompletion: true`.
- `workflow.completeBeforeMerge` is not added: both orderings already work and need only clear routing prose.
- Preserve the landed `stdin: 'ignore'` fix and do not modify target resolution or priority ordering.

## Phase 1: Lifecycle Contracts and Review Routing

### Task p01-t01: Make Reviews rows event-distinct and monotonic

**Files:** `.agents/skills/oat-project-{plan-writing,review-provide,review-receive,review-receive-remote,implement,pr-final,pr-progress,complete,next}/**`, `packages/control-plane/src/state/reviews.test.ts`, `packages/control-plane/src/recommender/router{,.test}.ts`, `packages/cli/src/commands/project/validate-plan/index.test.ts`, `packages/cli/src/validation/skills.test.ts`

**Implement:**

1. Add characterization tests proving duplicate-scope rows parse/validate, plus a RED test proving the latest `final` event controls routing.
2. Define append-ordered event rows in plan-writing; claim only an unbound placeholder, otherwise append distinct artifacts, match later mutations by artifact filename, and forbid status regression.
3. Apply the contract to provide, local and remote receive, implementation fix bookkeeping, and final/phase-status readers; change the control-plane router and progress-PR phase review check to select the latest matching scope/type event. For remote receive, record an event-distinct review artifact rather than identifying the ledger entry only by scope and `github-pr #<N>`.
4. Bump each changed skill once: plan-writing `1.2.14`, review-provide `1.3.17`, review-receive `1.5.8`, review-receive-remote `1.4.1`, implement `2.1.1`, pr-final `1.5.2`, pr-progress `1.2.2`, complete `1.5.1`, next `1.0.8`; update pinned tests, including a focused progress-PR latest-event assertion.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md .agents/skills/oat-project-review-receive-remote/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references/phase-execution.md .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-pr-progress/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-next/SKILL.md packages/control-plane/src/state/reviews.test.ts packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts packages/cli/src/commands/project/validate-plan/index.test.ts packages/cli/src/validation/skills.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/reviews.test.ts src/recommender/router.test.ts && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan/index.test.ts src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm --filter @open-agent-toolkit/cli type-check`

**Commit:** `fix(p01-t01): preserve distinct review events`

### Task p01-t02: Make resolver selection paths mutually exclusive

**Files:** `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`, `packages/cli/src/validation/skills.test.ts`

**Implement:**

1. Add RED assertions that the prose defines two mutually exclusive branches, scopes every `--preferred` instruction to the preferred branch, and forbids exact-candidate guidance from inheriting it. Keep a literal-command check as a secondary guard.
2. Present preferred selection and exact-candidate selection as mutually exclusive from first mention.
3. Remove the Claude implication that managed-capped exact-candidate calls also carry `--preferred`; preserve runtime re-resolution and priority routing.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md packages/cli/src/validation/skills.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

**Commit:** `docs(p01-t02): separate resolver selection paths`

### Task p01-t03: Mandate unambiguous cross-runtime phase-gate prompts

**Files:** `.agents/skills/oat-project-{plan-writing,plan,quick-start}/SKILL.md`, `packages/cli/src/validation/skills.test.ts`

**Implement:**

1. Add RED prompt-contract assertions.
2. Require the question to name the “cross-runtime phase gate review,” say built-in per-phase root reviews and final review run regardless, and avoid bare `(Recommended)` labels.
3. Apply the requirement in plan and quick-start without changing eligibility, outcomes, HiLL independence, or target neutrality.
4. Bump plan to `1.3.15` and quick-start to `2.2.2`; plan-writing was bumped in p01-t01.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md packages/cli/src/validation/skills.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

**Commit:** `docs(p01-t03): clarify cross-runtime phase gate choice`

### Task p01-t04: Name both supported PR completion orderings

**Files:** `.agents/skills/oat-project-{pr-final,progress,complete}/SKILL.md`, `packages/cli/src/validation/skills.test.ts`

**Implement:**

1. Add RED assertions for an `implement | pr_open` route in every mode and both supported orderings.
2. Replace pr-final’s merge-first implication; add `pr_open → oat-project-complete` to spec-driven, quick, and import progress tables.
3. State that an open PR is not a blocker and archival syncs its body. Do not add configuration.
4. Bump progress to `1.2.6`; pr-final/complete were bumped in p01-t01.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-progress/SKILL.md .agents/skills/oat-project-complete/SKILL.md packages/cli/src/validation/skills.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

**Commit:** `docs(p01-t04): support completion before or after merge`

## Phase 2: Gate Timeout Recovery and Telemetry

### Task p02-t01: Recover run-correlated artifacts after timeout

**Files:** `packages/cli/src/commands/gate/index.ts`, `packages/cli/src/commands/gate/index.test.ts`

**Implement:**

1. Add RED tests for clean/blocking late artifacts and zero/nonzero-output bare timeouts.
2. Count stdout/stderr bytes in the process result.
3. On timeout, re-scan and resolve the invocation run ID before failure. Feed one correlated artifact through existing project, timestamp, invocation, normalization, threshold, and handoff checks.
4. Add `lateCompletion: true` to recovered `ok|blocked` envelopes; add `noOutputProduced` to unrecovered timeout failures.
5. Do not alter stdin, target selection, priority, or availability code.

**Format:** `pnpm exec oxfmt --write packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli lint`

**Commit:** `fix(p02-t01): recover late gate review artifacts`

### Task p02-t02: Document timeout controls and recovery fields

**Files:** `apps/oat-docs/docs/cli-utilities/workflow-gates.md`, `apps/oat-docs/docs/reference/cli-reference.md`

**Implement:**

1. Document `OAT_GATE_EXEC_TIMEOUT_MS` in milliseconds with its 15-minute default.
2. Document recovered `lateCompletion: true` and unrecovered timeout `noOutputProduced`.
3. Keep receive routing based on `status`, `receiveEligible`, and `handoff`; add no new positive status.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/reference/cli-reference.md`

**Verify:** `pnpm docs:check-links && pnpm build:docs`

**Commit:** `docs(p02-t02): explain gate timeout recovery`

## Phase 3: Sync and Release Validation

### Task p03-t01: Synchronize and validate the lockstep release

**Files:** five public `packages/*/package.json` manifests; `packages/cli/assets/public-package-versions.json`; sync-managed provider views and `.oat/sync/manifest.json`

**Implement:**

1. Bump cli, control-plane, docs-config, docs-theme, and docs-transforms from `0.1.65` to `0.1.66`.
2. Regenerate `packages/cli/assets/public-package-versions.json` through the CLI bundle step and verify every bundled package entry records `0.1.66`.
3. Run `pnpm run cli -- sync --scope all`; never hand-edit provider views.
4. Run `pnpm format:fix` so every final changed file satisfies artifact hygiene.

**Verify:** `pnpm format && pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/control-plane test && pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm type-check && pnpm build:docs && pnpm release:validate && node -e "const v=JSON.parse(require('fs').readFileSync('packages/cli/assets/public-package-versions.json','utf8')); if(Object.values(v).some(x=>x!=='0.1.66')) process.exit(1)"`

**Commit:** `chore(p03-t01): validate release assets and versions`

## Phase 4: Final Review Fixes

### Task p04-t01: (review) Keep active project reviews actionable

**Files:** `packages/cli/src/commands/review/latest.ts`, `packages/cli/src/commands/review/__tests__/latest.test.ts`, `.agents/skills/oat-project-review-receive/SKILL.md`, `packages/cli/src/validation/skills.test.ts`

**Implement:**

1. Add regression coverage with an older active project artifact and a newer archived artifact while preserving the existing all-history latest-review behavior for other callers.
2. Add an explicit active/actionable project-review resolution path and make local project review-receive use it before rejecting historical results.
3. Keep exact-candidate receive handoffs and ad-hoc review discovery unchanged.
4. Bump `oat-project-review-receive` once for all p04 changes in this PR.

**Format:** `pnpm exec oxfmt --write packages/cli/src/commands/review/latest.ts packages/cli/src/commands/review/__tests__/latest.test.ts .agents/skills/oat-project-review-receive/SKILL.md packages/cli/src/validation/skills.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review/__tests__/latest.test.ts src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli type-check`

**Commit:** `fix(p04-t01): keep active project reviews actionable`

### Task p04-t02: (review) Scope final-state readers to the Reviews ledger

**Files:** `.agents/skills/oat-project-complete/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`, `.agents/skills/oat-project-implement/references/completion-and-closeout.md`, `packages/cli/src/validation/skills.test.ts`

**Implement:**

1. Add fixtures where a later non-ledger `final | code` example conflicts with the latest event in `## Reviews`.
2. Make completion, final-PR, and implementation-closeout readers extract `## Reviews` through the next level-two heading before selecting the last final code event.
3. Assert all three readers honor the ledger event and preserve append-ordered status semantics.
4. Bump each changed canonical skill once for this PR.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-implement/references/completion-and-closeout.md packages/cli/src/validation/skills.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

**Commit:** `fix(p04-t02): confine final status reads to reviews`

### Task p04-t03: (review) Resolve archive identity before writing references

**Files:** `.agents/skills/oat-project-review-receive/SKILL.md`, `packages/cli/src/validation/skills.test.ts`

**Implement:**

1. Add a validation fixture for an already-occupied archive destination.
2. Resolve the collision-free destination and final basename before mutating plan, implementation, or review-event references.
3. Use that same basename for event identity, written references, the archive move, and the final summary in both code- and artifact-review paths.
4. Reuse the single PR-scoped `oat-project-review-receive` version bump from p04-t01.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-project-review-receive/SKILL.md packages/cli/src/validation/skills.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

**Commit:** `fix(p04-t03): preserve archive event identity`

### Task p04-t04: (review) Synchronize and validate review-fix release assets

**Files:** `packages/cli/src/commands/help-snapshots.test.ts`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `.agents/docs/autonomy-contract.md`, `.agents/skills/oat-project-autonomous/SKILL.md`; five public `packages/*/package.json` manifests; `packages/cli/assets/public-package-versions.json`; sync-managed provider views and `.oat/sync/manifest.json`

**Implement:**

1. Refresh the `review latest` help snapshot for the explicit actionable-project flag.
2. Update the bundled review-skill contract to require the new active-only receive command.
3. Map the new descriptive receive prose in the autonomy prompt-site inventory and bump `oat-project-autonomous` once for this PR.
4. Bump the five lockstep public packages together for the shipped CLI and bundled skill changes.
5. Regenerate bundled public-package metadata and run `pnpm run cli -- sync --scope all`.
6. Verify canonical skill versions, provider views, and release metadata include all p04 changes.
7. Run the publishable-package release validation required by repository policy.

**Format:** `pnpm format:fix`

**Verify:** `pnpm format && pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm type-check && pnpm build:docs && pnpm release:validate`

**Commit:** `chore(p04-t04): validate review-fix release assets`

## Phase 5: Terminal Gate Regression Fixes

**Goal:** Repair exact Reviews-ledger extraction, prevent consumed artifacts from remaining actionable, preserve timeout correlation diagnostics, align closeout artifacts and open-PR routing, and validate the final release.

### Task p05-t01: (review) Match the exact Reviews heading

**Files:** `packages/cli/src/commands/cleanup/project/project.utils.ts`, `packages/cli/src/commands/cleanup/project/project.test.ts`, `packages/control-plane/src/state/reviews.ts`, `packages/control-plane/src/state/reviews.test.ts`

**Implement:**

1. Add regression fixtures containing inline or code-formatted `## Reviews` text before the real level-two heading.
2. Locate the exact `## Reviews` heading line and slice only through the next level-two heading in both production readers.
3. Assert the authoritative project plan yields every ledger row, the latest final event, and a complete project result.

**Format:** `pnpm exec oxfmt --write packages/cli/src/commands/cleanup/project/project.utils.ts packages/cli/src/commands/cleanup/project/project.test.ts packages/control-plane/src/state/reviews.ts packages/control-plane/src/state/reviews.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/cleanup/project/project.test.ts && pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/reviews.test.ts`

**Commit:** `fix(p05-t01): match exact reviews heading`

### Task p05-t02: (review) Exclude consumed reviews from actionable routing

**Files:** `packages/cli/src/commands/review/latest.ts`, `packages/cli/src/commands/review/__tests__/latest.test.ts`, `packages/control-plane/src/recommender/router.ts`, `packages/control-plane/src/recommender/router.test.ts`, `.agents/skills/oat-project-review-receive-remote/SKILL.md`, `packages/cli/src/validation/skills.test.ts`; active project review artifacts and their exact plan rows

**Implement:**

1. Add fixtures where top-level artifacts are bound to `passed` or `fixes_added` ledger events alongside a genuinely `received` event.
2. Correlate project review artifacts by scope, type, and artifact filename so only receive-eligible ledger states are actionable in CLI and control-plane routing.
3. Align remote receive archival behavior with the consumed-artifact contract and bump the changed canonical skill once for this PR.
4. Move the already-passed p04 review artifact to history and update only its artifact-identified plan event.

**Format:** `pnpm format:fix`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/review/__tests__/latest.test.ts src/validation/skills.test.ts && pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts && pnpm oat:validate-skills`

**Commit:** `fix(p05-t02): exclude consumed reviews from routing`

### Task p05-t03: (review) Preserve timeout correlation failures

**Files:** `packages/cli/src/commands/gate/index.ts`, `packages/cli/src/commands/gate/index.test.ts`

**Implement:**

1. Add timeout regressions for duplicate run-ID matches and a changed artifact carrying a mismatched run ID.
2. Emit an unrecoverable timeout only when no matching paths and no diagnostic artifact exist.
3. Let correlation anomalies fall through to the existing `targeting_correlation_failed` path while preserving `noOutputProduced` for a genuine zero-output timeout.

**Format:** `pnpm exec oxfmt --write packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts`

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`

**Commit:** `fix(p05-t03): preserve timeout correlation failures`

### Task p05-t04: (review) Synchronize and validate the terminal-fix release

**Files:** five public `packages/*/package.json` manifests; `packages/cli/assets/public-package-versions.json`; sync-managed provider views and `.oat/sync/manifest.json`; compatibility fixtures exposed by full validation

**Implement:**

1. Bump all five lockstep public packages together for the shipped reader, routing, and timeout-correlation fixes.
2. Regenerate bundled public-package metadata and run `pnpm run cli -- sync --scope all`.
3. Repair only compatibility fixtures directly exposed by the complete validation run.
4. Run formatting, skill validation, full CLI and control-plane tests, lint, type-check, docs build, and release validation.

**Format:** `pnpm format:fix`

**Verify:** `pnpm format && pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/control-plane test && pnpm lint && pnpm type-check && pnpm build:docs && pnpm release:validate`

**Commit:** `chore(p05-t04): validate terminal review fixes`

### Task p05-t05: (review) Refresh final closeout artifacts

**Files:** `.oat/projects/shared/review-bookkeeping-and-dispatch-doc-contracts/summary.md`; PR #151 body when derived closeout content is stale

**Implement:**

1. Update the project summary metadata and prose for p04/p05, the final package version, and current verification results.
2. Preserve the implemented decisions while adding the terminal-gate and PR-review regression fixes.
3. Refresh the open PR body if its generated summary facts are stale.
4. Record for root closeout that an open PR requires `oat_phase_status: pr_open`; `complete` is invalid while `oat_pr_status: open`.

**Format:** `pnpm exec oxfmt --write .oat/projects/shared/review-bookkeeping-and-dispatch-doc-contracts/summary.md`

**Verify:** Inspect the summary and PR body for matching phase, release, and verification facts; root verifies final state uses `pr_open`.

**Commit:** `docs(p05-t05): refresh final closeout summary`

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- |
| p01    | code     | fixes_completed | 2026-07-14 | reviews/archived/code-p01-review-2026-07-14T224102Z.md      |
| p02    | code     | passed          | 2026-07-14 | reviews/archived/code-p02-review-2026-07-14T224102Z.md      |
| p03    | code     | passed          | 2026-07-14 | reviews/archived/code-p03-review-2026-07-14T234442Z.md      |
| final  | code     | passed          | 2026-07-15 | reviews/archived/final-review-2026-07-15T000317Z.md         |
| spec   | artifact | pending         | -          | -                                                           |
| design | artifact | pending         | -          | -                                                           |
| plan   | artifact | passed          | 2026-07-14 | reviews/archived/artifact-plan-review-2026-07-14T214355Z.md |
| p01    | code     | passed          | 2026-07-14 | reviews/archived/code-p01-fix-review-2026-07-14T225418Z.md  |
| p01    | code     | passed          | 2026-07-14 | reviews/archived/p01-review-2026-07-14T230713Z.md           |
| p02    | code     | passed          | 2026-07-14 | reviews/archived/p02-review-2026-07-14T231735Z.md           |
| final  | code     | received        | 2026-07-15 | reviews/archived/final-review-2026-07-15T004643Z.md         |
| final  | code     | fixes_completed | 2026-07-15 | reviews/archived/final-review-2026-07-15T010249Z.md         |
| p04    | code     | passed          | 2026-07-15 | reviews/archived/code-p04-review-2026-07-15T014808Z.md      |
| final  | code     | fixes_completed | 2026-07-15 | reviews/archived/final-review-2026-07-15T015430Z.md         |
| p05    | code     | fixes_completed | 2026-07-15 | reviews/code-p05-review-2026-07-15T024654Z.md               |

**Status:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

- Phase 1: 4 tasks — lifecycle and skill contracts
- Phase 2: 2 tasks — gate recovery and docs
- Phase 3: 1 task — sync and release validation
- Phase 4: 4 tasks — final gate review fixes and release validation
- Phase 5: 5 tasks — terminal gate and PR-review regression fixes

**Total: 16 tasks**

## References

- Discovery: `discovery.md`
- Gate implementation: `packages/cli/src/commands/gate/index.ts`
- Review parser: `packages/control-plane/src/state/reviews.ts`
- Shared planning contract: `.agents/skills/oat-project-plan-writing/SKILL.md`
