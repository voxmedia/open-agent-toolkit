---
oat_status: complete
oat_ready_for: oat-project-document
oat_blockers: []
oat_last_updated: 2026-07-31
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p02', 'p03']] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: false
---

# Implementation Plan: bounded-recovery-authorization

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Prevent avoidable post-commit defects and automatically complete safe,
same-target append-only phase recovery without weakening fallback, review,
security, or destructive-action boundaries.

**Architecture:** The phase implementer runs discoverable proportionate checks
before commit, then applies a dedicated project-level bounded recovery policy
when later verification finds a mechanical in-scope defect. The root preserves
the exact target, validates immutable task plus recovery commits, and appends one
canonical recovery event for every recovered or stopped disposition.

**Tech Stack:** Canonical Markdown agent/skill contracts, TypeScript/Vitest CLI
contract tests, OAT provider synchronization, Fumadocs documentation, pnpm
workspace release validation.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Quick discovery and lightweight design approved
- [x] Evaluated phases for parallelism opportunities
- [x] Declared provider-sync and docs phases as file-disjoint parallel work
- [x] Set project dispatch policy to managed High
- [x] Disabled optional cross-runtime phase gates; built-in reviews remain
- [x] Confirm HiLL checkpoints when implementation starts

---

## Parallelism

Phase 1 establishes canonical semantics. Operator-authorized revision phase
`p-rev1` resolves the one attempt-boundary defect retained by the terminal
Phase 1 review. Phases 2 and 3 then run in isolated worktrees: provider
regeneration/tests modify generated agent surfaces and sync tests, while
documentation modifies only the authored implementation guide. After fan-in,
operator-authorized revision phase `p-rev2` repairs autonomy gate-inventory
coverage exposed by the full test gate. Phase 4 then runs because the release
bump and full validation must cover all outputs. Final-review fix Phase 5 runs
after the complete lifecycle review and becomes the configured final HiLL
checkpoint. No other phases are parallelized.

---

## Phase 1: Canonical Recovery Contract

### Task p01-t01: Separate Standing Recovery Authority from Fallback

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Pin the three-way taxonomy (RED)**

Add targeted assertions that distinguish forbidden accepted-launch route/model
replacement, caller-authorized same-target bounded recovery, and
scope-expanding/consequential recovery. Assert standing authority is
default-deny for wave execution, autonomous projects, cloud-project
orchestration, reviewers, and every consumer except `oat-project-implement`.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: New assertions fail against the absolute "new explicit action" rule.

**Step 2: Implement the authorization-aware dispatch contract (GREEN)**

Update the shared acceptance/recovery section without weakening accepted-launch
terminality. Permit standing recovery authority only when a caller-specific
contract explicitly supplies scope, exact target, numeric budget, canonical
recording, and stop conditions. Bump `oat-dispatch-subagents` once from `1.2.1`
to `1.2.2`.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: Test passes (GREEN)

**Step 3: Format**

Run: `pnpm format:fix`
Expected: Canonical and test files are formatted without unrelated semantic
changes.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm lint && pnpm format`
Expected: Dispatch contract, canonical skill validation, lint, and format pass.

**Step 5: Commit**

Commit: `fix(p01-t01): separate bounded recovery from fallback`

---

### Task p01-t02: Add Tiered Prevention and Bounded Phase Recovery

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify:
  `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify:
  `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
- Modify: `.oat/templates/state.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add behavior-focused recovery scenarios (RED)**

Add contract assertions covering:

- pre-commit formatting, declared verification, cheap checks, and scoped
  build/test for emitted-output or build/test configuration changes;
- dedicated `oat_phase_recovery_policy` defaults (`10`, per-phase `0`–`20`),
  one no-edit flake rerun, elevated-volume warning at three, and exact numeric
  exhaustion grants that never reset usage;
- project-default and phase-specific limits of `0`, each proving automatic
  post-commit recovery stops for direction without editing, committing,
  consuming an attempt, or launching fallback;
- no attempt consumption for the one no-edit flake rerun, followed by a
  no-edit stop when the repeated unexplained failure remains ambiguous;
- attempt consumption with no successful recovery commit when an edit, commit,
  or re-verification fails;
- one append-only recovery commit per successful attempt, immutable task
  commits, same-target/original-request provenance, and canonical recovery-event
  fields;
- an exact-target-loss stop and a fresh same-target recovery launch linked
  through the original request's `continuation_events`;
- exactly one event for every recovered, direction-required, or failed-attempt
  disposition, with defect, prompt, and successful-repair counts independently
  measurable;
- one atomic attempt/commit for mechanically related failures emitted by the
  same verification command, but separate attempts and commits for independent
  defects;
- automatic continuation for obvious in-scope lint/type/test/build/composition
  defects; and
- stops for ambiguity, architecture/security/product/requirements changes,
  non-mechanical boundary widening, destructive work, retry exhaustion, dirty
  history, inability to establish correctness, missing original-request or
  exact-target provenance, unverifiable commit range, malformed recovery event,
  or governance caps.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: New lifecycle scenarios fail.

**Step 2: Implement prevention, recovery, and bookkeeping contracts (GREEN)**

Update Phase Scope, report validation, commit-range validation, task-transition
and phase verification flow, dispatch target continuity, and the canonical
recovery-event shape. Keep review-fix/gate counters on
`oat_orchestration_retry_limit`; do not change review-cycle, severity,
protected-branch, credential, destructive-action, or security safeguards.
Prevent route escalation from applying to implementation recovery. Add the new
commented policy shape to the state template.

Preserve the existing `PHASE_BASE_HEAD=$(git rev-parse HEAD)` capture immediately
before each phase launch. Do not redesign base anchoring or attribute the
exposure to PR #176. Do not read, modify, link, or depend on
`.oat/projects/shared/review-plan-workflow`.

Bump `oat-project-implement` once from `2.2.3` to `2.2.4` and the canonical
phase agent from `1.0.10` to `1.0.11`.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: Lifecycle scenarios pass.

**Step 3: Format**

Run: `pnpm format:fix`
Expected: Canonical assets, template, and tests are formatted.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm lint && pnpm format`
Expected: Focused contracts and canonical asset validation pass, including the
unchanged phase-base capture.

Run:
`test -z "$(git diff --name-only "$(git merge-base HEAD main)"...HEAD -- .oat/projects/shared/review-plan-workflow)"`
Expected: The isolated active project contributes no file or dependency change.

**Step 5: Commit**

Commit: `feat(p01-t02): authorize bounded phase recovery`

---

**Phase 1 verification**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm lint && pnpm format`

Expected: Canonical recovery semantics, prevention ordering, budget accounting,
stop boundaries, skill versions, and non-consumer default-deny assertions pass.

---

## Revision Phase 1: Final Reserved Attempt Revision

### Task p-rev1-t01: (revision) Distinguish Pending Completion from New Reservation

**Authorization:** Explicit operator direction after the Phase 1 three-cycle
review cap was exhausted. This is a new planned revision phase, not a fourth
Phase 1 review/fix cycle.

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify:
  `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add attempt-boundary contract scenarios (RED)**

Add root and isolated phase-agent assertions for:

- `limit=1`, `used=1`, and a fully reconciled matching `pending_attempt`:
  continue and settle that same reserved attempt without incrementing usage;
- `limit=1`, `used=1`, and no pending attempt: stop direction-required before
  edit without reserving a new attempt or launching fallback.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: New boundary assertions fail against the unconditional
`used_attempts < limit` eligibility predicate.

**Step 2: Split reservation eligibility from pending completion (GREEN)**

Require `used_attempts < limit` only when reserving a new attempt. Permit an
existing matching pending attempt to finish only after complete ledger,
original-request, immutable-commit, bounded-diff, and exact-target
reconciliation. Do not increment usage for that continuation. Preserve the
direction-required stop when no matching pending attempt exists.

This task changes already-version-bumped canonical assets within the same PR;
do not bump their versions a second time. Do not read, modify, link, or depend
on `.oat/projects/shared/review-plan-workflow`.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: Both boundary scenarios and the existing recovery suite pass.

**Step 3: Format**

Run: `pnpm format:fix`
Expected: Canonical assets and tests are formatted.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm lint && pnpm format`
Expected: Focused contracts, canonical validation, lint, and format pass.

Run:
`test -z "$(git diff --name-only "$(git merge-base HEAD main)"...HEAD -- .oat/projects/shared/review-plan-workflow)"`
Expected: The isolated active project remains unchanged.

**Step 5: Commit**

Commit: `fix(p-rev1-t01): distinguish reserved recovery attempts`

---

**Phase p-rev1 verification**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm lint && pnpm format`

Expected: A reconciled final reservation can finish without admitting any new
over-budget attempt.

---

## Phase 2: Provider Materialization and Parity

### Task p02-t01: Regenerate and Validate Provider Agents

**Files:**

- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Regenerate: `.claude/agents/oat-phase-implementer.md`
- Regenerate: `.cursor/agents/oat-phase-implementer*.md`
- Regenerate: `.codex/agents/oat-phase-implementer*.toml`
- Regenerate: provider-linked skill views selected by `oat sync`
- Regenerate: `.oat/sync/manifest.json`

**Step 1: Add provider materialization assertions (RED)**

Extend the existing sync/materialization suite to read generated Claude, Codex,
base Cursor, and representative pinned Cursor phase agents. Assert equivalent
prevention, dedicated budget, recovery-event, exact-target, exhaustion, and stop
semantics, with no provider-specific fallback.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts`
Expected: New assertions fail before regeneration.

**Step 2: Regenerate from canonical sources (GREEN)**

Run: `oat sync --scope all`
Expected: Provider views and manifest are regenerated from canonical assets; no
provider copy is hand-edited.

**Step 3: Format**

Run: `pnpm format:fix`
Expected: Generated and test assets are formatted.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts && pnpm oat:validate-skills && oat status --scope project && pnpm lint && pnpm format`
Expected: Provider materialization, canonical validation, sync parity, lint,
and format pass.

**Step 5: Commit**

Commit: `test(p02-t01): enforce phase recovery provider parity`

---

## Phase 3: Public Recovery Documentation

### Task p03-t01: Explain Prevention, Recovery, and Migration

**Files:**

- Modify:
  `apps/oat-docs/docs/workflows/projects/implementation-execution.md`

**Step 1: Update the authored workflow guide**

Document task-local cheap checks and scoped build/test checks before commit;
broad phase-level verification and automatic same-target repair; dedicated
default-ten/per-phase recovery budgets; one no-edit flake rerun;
elevated-volume reporting; numeric exhaustion grants; canonical recovery-event
fields; the complete pre-change baseline of nine recovery events plus two
operator-recovery continuations; the distinction between defects, prompts,
continuations, and successful repair commits; why append-only history does not
require repeated approval; the fallback distinction; the exposure-not-regression
finding with PR #176 explicitly excluded; and migration commands
`oat tools update` followed by `oat sync --scope all`.

Do not add or move a page, so no navigation or generated root-index edit is
needed.

**Step 2: Cross-check every claim**

Compare the documentation against the canonical phase agent, project
implementation references, shared dispatch contract, state template, and
approved design. Remove any claim not encoded in the shipped contract.

**Step 3: Format**

Run: `pnpm format:fix`
Expected: The authored docs page is formatted.

**Step 4: Verify**

Run: `pnpm check && pnpm build:docs`
Expected: Markdown/docs checks and the production docs build pass.

**Step 5: Commit**

Commit: `docs(p03-t01): explain bounded phase recovery`

---

### Task p03-t02: (review) Clarify Recovery Ledger Ownership

**Files:**

- Modify:
  `apps/oat-docs/docs/workflows/projects/implementation-execution.md`

**Step 1: Understand the issue**

Review finding I1: the ownership section categorically says the phase
implementer does not mutate project bookkeeping, but the shipped recovery
contract requires a narrow durable attempt-ledger write.

Location:
`apps/oat-docs/docs/workflows/projects/implementation-execution.md:85`

**Step 2: Implement fix**

Qualify the ownership sentence: the phase implementer does not mutate general
project bookkeeping, but while it owns the worktree it may atomically update
only the active phase's authoritative
`oat_phase_recovery_policy.phase_attempt_usage.<pNN>` entry. State that the root
validates the entry and later clears a reconciled pending marker.

**Step 3: Verify**

Run: `pnpm check && pnpm build:docs && git diff --check`
Expected: Documentation checks and build pass; the ownership section matches
the canonical attempt-ledger contract.

**Step 4: Commit**

Commit: `fix(p03-t02): clarify recovery ledger ownership`

---

## Revision Phase 2: Autonomy Gate-Inventory Coverage

### Task p-rev2-t01: (revision) Map Recovery Prompt Sites

**Files:**

- Modify: `.agents/docs/autonomy-contract.md`

**Step 1: Reproduce the full-test blocker**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts`

Expected: The repository-HEAD coverage test reports stable keys
`4d6c519131e5`, `81db07214b06`, and `4aa21120295f` as unmapped.

**Step 2: Add exact non-gate mappings**

Add `4d6c519131e5 -> NG` to the
`oat-project-implement/references/dispatch-and-dry-run.md` HEAD coverage row.
Add `81db07214b06 -> NG` and `4aa21120295f -> NG` to the
`oat-project-implement/references/phase-execution.md` HEAD coverage row. Preserve
all existing mappings and the immutable line-number baseline.

**Step 3: Format and verify**

Run:
`pnpm exec oxfmt --write .agents/docs/autonomy-contract.md && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts && pnpm test && pnpm format && git diff --check`

Expected: Focused inventory coverage, the full test suite, formatting, and diff
checks pass.

**Step 4: Commit**

Commit: `test(p-rev2-t01): map recovery prompt sites`

---

## Phase 4: Lockstep Release and Full Verification

### Task p04-t01: Bump Public Packages and Validate the Release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Apply the lockstep version bump**

Advance all five public packages and bundled public-package inventory together
from `0.2.26` to `0.2.27`. Do not update unrelated dependency versions.

**Step 2: Format**

Run: `pnpm format:fix`
Expected: Package and inventory JSON are formatted.

**Step 3: Run surface-required checks**

Run: `pnpm lint && pnpm format && pnpm build:docs`
Expected: Skill/smoke lint and format plus docs production build pass.

**Step 4: Run CI gates in repository order**

Run: `pnpm check && pnpm type-check && pnpm test && pnpm build`
Expected: All four CI gates pass in documented order.

**Step 5: Run release and diff validation**

Run: `pnpm release:validate && git diff --check`
Expected: All five `0.2.27` tarballs validate and the diff has no whitespace
errors.

**Step 6: Commit**

Commit: `chore(p04-t01): bump public packages for bounded recovery`

---

**Phase 4 verification**

Run:
`pnpm lint && pnpm format && pnpm build:docs && pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate && git diff --check`

Expected: Surface checks, CI gates, docs build, release validation, and diff
validation all pass from a clean post-task tree.

---

## Phase 5: Final Review Ledger Handoff Fix

### Task p05-t01: (review) Reconcile Recovery Ledger Validation and Clearing

**Files:**

- Modify:
  `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Regenerate: `.claude/agents/oat-phase-implementer.md`
- Regenerate: `.cursor/agents/oat-phase-implementer*.md`
- Regenerate: `.codex/agents/oat-phase-implementer*.toml`
- Regenerate: provider-linked views and `.oat/sync/manifest.json`
- Modify conditionally: `.agents/docs/autonomy-contract.md` only if the exact
  prompt-site inventory changes

**Step 1: Add relational transition coverage (RED)**

Add a transition-matrix regression that spans reservation → committed
`completed` marker → root validation → root clear while preserving
`used_attempts`. Add rejection cases for a prematurely cleared recovery marker,
a mismatched terminal status, and an active or unreconciled pending marker. Add
the analogous validated `failed` terminal handoff and assert generated-provider
semantic parity.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/sync/index.test.ts`

Expected: The new ordered-transition assertions fail against the circular
settled-ledger precondition.

**Step 2: Define pre-bookkeeping and post-bookkeeping states (GREEN)**

In the root contract, accept a matching committed `completed` pending marker as
the pre-bookkeeping success state only while validating the report, immutable
history, exact target, event, attempt count, and verification. After validation,
root bookkeeping clears `pending_attempt` and preserves `used_attempts`; reserve
`pending_attempt: null` and “settled ledger” for the post-bookkeeping state.

For a failed attempt, require and validate the analogous matching `failed`
marker before root bookkeeping clears it while preserving usage and the
terminal-stop disposition. Keep active, contradictory, prematurely cleared, or
unreconciled markers fail-closed. A phase with no recovery attempt may still
return with a settled null marker. Preserve the final-attempt, exact-target,
append-only, canonical-event, and no-fallback contracts.

Update the canonical phase-agent wording to match, then run
`oat sync --scope all`; do not hand-edit provider copies. The canonical skill
and agent versions were already bumped once for this PR, so do not bump them
again. The public packages were already bumped to `0.2.27`; do not perform a
second release bump.

**Step 3: Format and run focused verification**

Run:
`pnpm format:fix && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/sync/index.test.ts src/validation/autonomy-gate-inventory.test.ts && pnpm oat:validate-skills`

Expected: Transition coverage, generated-provider parity, autonomy inventory,
canonical validation, and formatting pass.

**Step 4: Run full and release verification**

Run:
`pnpm lint && pnpm format && pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate && git diff --check`

Expected: All repository, package, and release gates pass with the lockstep
version remaining `0.2.27`.

**Step 5: Commit**

Commit: `fix(p05-t01): reconcile recovery ledger handoff`

---

**Phase 5 verification**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/sync/index.test.ts src/validation/autonomy-gate-inventory.test.ts && pnpm oat:validate-skills && pnpm lint && pnpm format && pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate && git diff --check`

Expected: The end-to-end ledger handoff is relationally covered, all provider
views remain synchronized, all five `0.2.27` tarballs validate, and the clean
post-task tree passes.

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                            | Reviewed Head                            | Invocation | Gate Target          |
| ------ | -------- | -------- | ---------- | --------------------------------------------------- | ---------------------------------------- | ---------- | -------------------- |
| p01    | code     | received | 2026-07-31 | reviews/p01-review-2026-07-31T175303Z.md            | a2d875bb379941301c3ed811b40cfee7a40148e8 | auto       | -                    |
| p-rev1 | code     | passed   | 2026-07-31 | reviews/p-rev1-review-2026-07-31T191244Z.md         | 53777c7d26db7d93dfd3eaa9bb4b7b781f2256bc | auto       | -                    |
| p02    | code     | passed   | 2026-07-31 | reviews/p02-review-2026-07-31T193213Z.md            | 395fca50e96ec4f895d3b9ad828b0900f67ce95e | auto       | -                    |
| p03    | code     | passed   | 2026-07-31 | reviews/p03-review-2026-07-31T200025Z.md            | 4f6d934b955b030dfacb06ae91e2e81d92c3b30a | auto       | -                    |
| p-rev2 | code     | passed   | 2026-07-31 | reviews/p-rev2-review-2026-07-31T213539Z.md         | 0adcee7f8e143221e14b6f50579ab35e9bc0425a | auto       | -                    |
| p04    | code     | passed   | 2026-07-31 | reviews/p04-review-2026-07-31T215112Z.md            | 0fe8d0d9c154f56ab6a36bba2c9547d83f9a6d3c | auto       | -                    |
| p05    | code     | passed   | 2026-07-31 | reviews/p05-review-2026-07-31T222411Z.md            | 0eaaf85a1926607a3d864fca21791ee4637c91ce | auto       | -                    |
| final  | code     | passed   | 2026-07-31 | reviews/final-review-2026-07-31T223213Z.md          | cd7fd7aef3d39c6c545ac8d4f62017ae710e7b1b | auto       | -                    |
| spec   | artifact | pending  | -          | -                                                   | -                                        | -          | -                    |
| design | artifact | passed   | 2026-07-31 | user-approved lightweight design                    | -                                        | manual     | -                    |
| plan   | artifact | passed   | 2026-07-31 | structured review rounds 1-3                        | -                                        | auto       | -                    |
| final  | code     | passed   | 2026-07-31 | reviews/archived/final-review-2026-07-31T224851Z.md | 7aec7f31ec00c8949ab2f96a005256efbcb316a1 | gate       | cursor-fable-5-xhigh |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Canonical dispatch and phase recovery contracts
- Phase p-rev1: 1 task - Final reserved-attempt boundary revision
- Phase 2: 1 task - Provider regeneration and semantic parity
- Phase 3: 2 tasks - Public recovery and migration documentation
- Phase p-rev2: 1 task - Autonomy gate-inventory coverage
- Phase 4: 1 task - Lockstep release bump and full verification
- Phase 5: 1 task - Final-review recovery-ledger handoff correction

**Total: 9 tasks**

Implementation complete: all nine tasks, superseding revision phases, final
lifecycle review, and the configured implementation exit gate passed.

---

## References

- Design: `design.md`
- Spec: N/A (quick workflow)
- Discovery: `discovery.md`
- Historical intent: [PR #138](https://github.com/voxmedia/open-agent-toolkit/pull/138),
  [PR #141](https://github.com/voxmedia/open-agent-toolkit/pull/141), and
  [PR #187](https://github.com/voxmedia/open-agent-toolkit/pull/187)
