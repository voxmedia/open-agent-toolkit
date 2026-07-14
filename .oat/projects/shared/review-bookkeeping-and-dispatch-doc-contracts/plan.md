---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-14
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [['p01', 'p02']]
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
oat_template: true
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

**Files:** `.agents/skills/oat-project-{plan-writing,review-provide,review-receive,implement,pr-final,complete,next}/**`, `packages/control-plane/src/state/reviews.test.ts`, `packages/control-plane/src/recommender/router{,.test}.ts`, `packages/cli/src/commands/project/validate-plan/index.test.ts`, `packages/cli/src/validation/skills.test.ts`

**Implement:**

1. Add RED tests proving duplicate-scope rows parse/validate and the latest `final` event controls routing.
2. Define append-ordered event rows in plan-writing; claim only an unbound placeholder, otherwise append distinct artifacts, match later mutations by artifact filename, and forbid status regression.
3. Apply the contract to provide, receive, implementation fix bookkeeping, and final-row readers; change the control-plane router to the last matching row.
4. Bump each changed skill once: plan-writing `1.2.14`, review-provide `1.3.17`, review-receive `1.5.8`, implement `2.1.1`, pr-final `1.5.2`, complete `1.5.1`, next `1.0.8`; update pinned tests.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references/phase-execution.md .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-next/SKILL.md packages/control-plane/src/state/reviews.test.ts packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts packages/cli/src/commands/project/validate-plan/index.test.ts packages/cli/src/validation/skills.test.ts`

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

## Reviews

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |
| plan   | artifact | pending | -    | -        |

**Status:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

- Phase 1: 4 tasks — lifecycle and skill contracts
- Phase 2: 2 tasks — gate recovery and docs
- Phase 3: 1 task — sync and release validation

**Total: 7 tasks**

## References

- Discovery: `discovery.md`
- Gate implementation: `packages/cli/src/commands/gate/index.ts`
- Review parser: `packages/control-plane/src/state/reviews.ts`
- Shared planning contract: `.agents/skills/oat-project-plan-writing/SKILL.md`
