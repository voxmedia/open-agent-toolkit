---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-31
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04']
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
- [ ] Confirm HiLL checkpoints when implementation starts

---

## Parallelism

Phase 1 establishes canonical semantics and must complete first. Phases 2 and 3
then run in isolated worktrees: provider regeneration/tests modify generated
agent surfaces and sync tests, while documentation modifies only the authored
implementation guide. Phase 4 runs after fan-in because the release bump and
full validation must cover both outputs. No other phases are parallelized.

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

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                 | Reviewed Head                            | Invocation | Gate Target |
| ------ | -------- | ----------- | ---------- | ---------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| p01    | code     | fixes_added | 2026-07-31 | reviews/p01-review-2026-07-31T171149Z.md | 31fd3a86fb44c7abb24cf4bc183e5a3793681876 | auto       | -           |
| p02    | code     | pending     | -          | -                                        | -                                        | -          | -           |
| p03    | code     | pending     | -          | -                                        | -                                        | -          | -           |
| p04    | code     | pending     | -          | -                                        | -                                        | -          | -           |
| final  | code     | pending     | -          | -                                        | -                                        | -          | -           |
| spec   | artifact | pending     | -          | -                                        | -                                        | -          | -           |
| design | artifact | passed      | 2026-07-31 | user-approved lightweight design         | -                                        | manual     | -           |
| plan   | artifact | passed      | 2026-07-31 | structured review rounds 1-3             | -                                        | auto       | -           |

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
- Phase 2: 1 task - Provider regeneration and semantic parity
- Phase 3: 1 task - Public recovery and migration documentation
- Phase 4: 1 task - Lockstep release bump and full verification

**Total: 5 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: N/A (quick workflow)
- Discovery: `discovery.md`
- Historical intent: [PR #138](https://github.com/voxmedia/open-agent-toolkit/pull/138),
  [PR #141](https://github.com/voxmedia/open-agent-toolkit/pull/141), and
  [PR #187](https://github.com/voxmedia/open-agent-toolkit/pull/187)
