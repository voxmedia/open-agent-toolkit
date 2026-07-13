---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-13
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: [['p02', 'p03', 'p04', 'p05', 'p06']]
oat_phase_review_gate:
  enabled: true
  phases: [p01, p06]
  review_type: code
  exit_nonzero_on: important
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: cli-scaffold-and-ergonomics-fixes

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Eliminate scaffold corruption and placeholder leakage, then harden the affected CLI workflows so failures are actionable and shipped grammar changes are detectable.

**Architecture:** Keep fixes local to the owning command/template surfaces. Add focused regression tests at each boundary, use `oat doctor` for repository-level stale-invocation detection, and finish with the required lockstep public-package release validation.

**Tech Stack:** TypeScript ESM, Commander, Vitest, YAML, Markdown templates, pnpm/Turborepo.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

---

## Parallelism

Phase p01 runs first because it fixes the project-creation corruption and is the highest-priority item. Phases p02-p06 then run concurrently: their write sets are disjoint across the plan template, tools update, backlog archive, decision/summary, and doctor/release-note surfaces. They merge in phase order. Phase p07 runs only after all fixes merge because it owns the shared five-package version bump and repository-wide release gate.

---

## Phase 1: Repair project scaffolding

### Task p01-t01: Render and validate real scaffold templates

**Files:**

- Modify: `.oat/templates/state.md` only if token normalization is needed
- Modify: `packages/cli/src/commands/project/new/scaffold.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`

**Step 1: Write test (RED)**

Replace the masking state fixture with the real repository template (or copy that template into the temp repository), scaffold every workflow mode, parse the generated frontmatter, and assert:

- `oat_hill_checkpoints`, `oat_phase`, and `oat_workflow_mode` have the expected array/scalar types and values.
- No rendered artifact contains an unresolved single-brace `{ OAT_* }` or `{OAT_*}` token.
- The real template audit identifies no OAT placeholder that the scaffolder leaves unresolved.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`
Expected: The real-template regression fails because the space-padded state tokens survive rendering.

**Step 2: Implement (GREEN)**

Make OAT placeholder replacement tolerate optional internal whitespace so both canonical and legacy forms render. After rendering each scaffold artifact, reject any remaining single-brace OAT placeholder before writing it. Keep normal prose placeholders and docs-app double-brace dependency tokens outside this check.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`
Expected: All scaffold modes render valid state values and unresolved OAT placeholders fail closed.

**Step 3: Refactor**

Centralize OAT-token matching/rejection in a small local helper so replacement and defense-in-depth validation use the same token grammar.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Focused tests and CLI type checking pass.

**Step 5: Commit**

```bash
git add .oat/templates/state.md packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/scaffold.test.ts
git commit -m "fix(p01-t01): reject unresolved scaffold placeholders"
```

---

## Phase 2: Clarify plan task-shape guidance

### Task p02-t01: Document TDD as the default, not a validator requirement

**Files:**

- Modify: `.oat/templates/plan.md`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`

**Step 1: Write test (RED)**

Add a real-template assertion that the plan template permits non-TDD task bodies while naming the required invariants: stable `pNN-tNN` IDs, per-task verification, and atomic commits.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`
Expected: The assertion fails because the current template presents RED/GREEN/Refactor as mandatory.

**Step 2: Implement (GREEN)**

Add a concise note before the example task: RED/GREEN/Refactor is the recommended default where testable, but plans may use another task-body shape when appropriate as long as the three invariants remain.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`
Expected: The guidance assertion passes without changing `validate-plan`.

**Step 3: Refactor**

Keep the existing TDD example intact and avoid adding a second full template variant.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`
Expected: Focused template/scaffold tests pass.

**Step 5: Commit**

```bash
git add .oat/templates/plan.md packages/cli/src/commands/project/new/scaffold.test.ts
git commit -m "docs(p02-t01): clarify plan task-shape invariants"
```

---

## Phase 3: Improve tools update no-args feedback

### Task p03-t01: Suggest the exact all-tools update command

**Files:**

- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/update/index.test.ts`

**Step 1: Write test (RED)**

Exercise `oat tools update` without a name, `--pack`, or `--all` and assert exit code 1 plus a copy-pasteable `oat tools update --all` suggestion. Preserve the existing mutually-exclusive target behavior.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/update/index.test.ts`
Expected: The test fails because the current error names `--all` without the full suggested command.

**Step 2: Implement (GREEN)**

Keep no-args non-mutating and update the actionable error text to include the exact safer command. Do not default to an all-tools mutation.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/update/index.test.ts`
Expected: No-args exits 1 with the exact remediation.

**Step 3: Refactor**

Keep target validation centralized and avoid duplicating command-selection logic in the test harness.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/update/index.test.ts`
Expected: Focused update tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/update/index.ts packages/cli/src/commands/tools/update/index.test.ts
git commit -m "fix(p03-t01): suggest all-tools update command"
```

---

## Phase 4: Prevent placeholder backlog summaries

### Task p04-t01: Require a summary before closing backlog items

**Files:**

- Modify: `packages/cli/src/commands/backlog/archive.ts`
- Modify: `packages/cli/src/commands/backlog/archive.test.ts`

**Step 1: Write test (RED)**

Change the current TODO-seeding test to assert that closing without a non-empty summary raises `BacklogArchiveError` before any status rewrite, completed-ledger write, move, or index regeneration. Keep `--wont-do` without a summary as the existing no-ledger-entry path.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts`
Expected: The test fails because the current closed path writes `TODO: summarize outcome`.

**Step 2: Implement (GREEN)**

Validate and trim the closed-path summary before the first mutation. Return an actionable error that tells the caller to rerun with `--summary "<outcome>"`; remove the TODO fallback constant.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts`
Expected: Closed items require a real summary and no completed ledger line can contain the TODO placeholder.

**Step 3: Refactor**

Keep terminal-status validation and summary validation ordered before all writes.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts src/commands/backlog/index.test.ts`
Expected: Archive core and command wiring remain green.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/backlog/archive.ts packages/cli/src/commands/backlog/archive.test.ts
git commit -m "fix(p04-t01): require closed backlog summaries"
```

---

## Phase 5: Fill decision records atomically

### Task p05-t01: Add decision and consequences inputs to decision creation

**Files:**

- Modify: `packages/cli/src/commands/decision/new.ts`
- Modify: `packages/cli/src/commands/decision/new.test.ts`
- Modify: `packages/cli/src/commands/decision/index.ts`
- Modify: `packages/cli/src/commands/decision/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts` if the help contract requires an update
- Modify: `.agents/skills/oat-project-summary/SKILL.md`

Before editing the canonical skill, rebase onto the latest integration base and inspect concurrent `oat-project-summary` changes, including the `orchestration-run-log` project’s declared surface. Preserve sibling prose and limit this task to the Step 6 decision-promotion clauses.

**Step 1: Write test (RED)**

Add core and command-wiring tests for `--decision <text>` and `--consequences <text>`, asserting those values fill the template sections and flow through `createDecisionRecord`. Add or update help coverage for both flags.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision/new.test.ts src/commands/decision/index.test.ts src/commands/help-snapshots.test.ts`
Expected: Tests fail because the options do not exist and rendering hardcodes `TODO`.

**Step 2: Implement (GREEN)**

Thread optional decision and consequences fields through the command options, record-creation API, and renderer. Update `oat-project-summary` Step 6 to derive context, decision, and consequences from each grounded Key Decision and pass all three flags in the atomic `oat decision new` call. Bump that canonical skill exactly one patch from its then-current version after the rebase.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision/new.test.ts src/commands/decision/index.test.ts src/commands/help-snapshots.test.ts`
Expected: Explicit values populate all three sections and command help exposes both flags.

**Step 3: Refactor**

Keep backward-compatible defaults for callers that omit the new flags, but ensure the summary promotion path never emits literal TODO content.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision/new.test.ts src/commands/decision/index.test.ts src/commands/help-snapshots.test.ts && pnpm oat:validate-skills`
Expected: Decision tests, help snapshots, and canonical skill validation pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/decision/new.ts packages/cli/src/commands/decision/new.test.ts packages/cli/src/commands/decision/index.ts packages/cli/src/commands/decision/index.test.ts packages/cli/src/commands/help-snapshots.test.ts .agents/skills/oat-project-summary/SKILL.md
git commit -m "feat(p05-t01): fill decision record sections at creation"
```

---

## Phase 6: Detect stale CLI grammar

### Task p06-t01: Add a minimal stale-invocation doctor check and release callout

**Files:**

- Create: `packages/cli/src/commands/doctor/stale-invocations.ts`
- Create: `packages/cli/src/commands/doctor/stale-invocations.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `.github/PULL_REQUEST_TEMPLATE.md`
- Modify: `apps/oat-docs/docs/contributing/code.md`

**Step 1: Write test (RED)**

Add focused scanner tests with clean content and the known-stale form `oat --scope all sync`, plus doctor integration coverage that reports a warning with file/line evidence and the corrected `oat sync --scope all` form. Assert the check is project-scoped and leaves the intentional per-command `--scope` design unchanged.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/stale-invocations.test.ts src/commands/doctor/index.test.ts`
Expected: Tests fail because doctor has no stale-grammar scanner.

**Step 2: Implement (GREEN)**

Add a small data-driven known-stale-forms list and scan bounded repository script/documentation surfaces, excluding dependencies, build output, archived/project artifacts, and generated provider views. Emit a passing check when clean and a warning with exact migration guidance when matches exist. Add a contributor/PR convention requiring a prominent `Breaking CLI grammar changes` callout with before/after commands and migration action; generated release notes must receive a visibly breaking PR title/callout.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/stale-invocations.test.ts src/commands/doctor/index.test.ts`
Expected: Doctor flags known stale forms without adding a global `--scope` alias.

**Step 3: Refactor**

Keep pattern definitions and filesystem scanning outside the command registration module; bound the scan for predictable doctor latency.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/stale-invocations.test.ts src/commands/doctor/index.test.ts src/commands/create-program.test.ts && pnpm exec oxfmt --check .github/PULL_REQUEST_TEMPLATE.md apps/oat-docs/docs/contributing/code.md`
Expected: Doctor coverage passes, the no-global-scope regression remains green, and release guidance is formatted.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/doctor/stale-invocations.ts packages/cli/src/commands/doctor/stale-invocations.test.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts .github/PULL_REQUEST_TEMPLATE.md apps/oat-docs/docs/contributing/code.md
git commit -m "feat(p06-t01): detect stale CLI invocation grammar"
```

---

## Phase 7: Prepare and validate the release

### Task p07-t01: Bump lockstep packages and run completion gates

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml` only if pnpm updates workspace metadata

**Step 1: Establish the release version**

After rebasing/merging any sibling change that lands first, determine the next unused common public-package version. Bump all five packages to that exact version once; if this branch lands second, rebase and re-bump rather than preserving a colliding version.

**Step 2: Run focused and workspace verification**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm format && pnpm type-check && pnpm build && pnpm build:docs`
Expected: CLI tests, all workspace static/build checks, and the production docs build pass.

**Step 3: Run the publishable-package gate**

Run: `pnpm release:validate`
Expected: All five public packages build, pack, satisfy metadata/content contracts, and pass lockstep version validation.

**Step 4: Verify working-tree release hygiene**

Confirm only expected source, test, docs, project-artifact, and five-package version files changed; confirm no derived provider-skill copies or sibling-project prose were swept in. Review any docs build-generated index delta and include it only when it follows from the authored contributor-doc change. Recheck that `oat-project-summary` preserves concurrent changes and carries exactly one patch bump relative to the final base.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "chore(p07-t01): bump public packages for CLI fixes"
```

If `pnpm-lock.yaml` is unchanged, omit it from `git add`.

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                           |
| ------ | -------- | -------- | ---------- | -------------------------------------------------- |
| p01    | code     | pending  | -          | -                                                  |
| p02    | code     | pending  | -          | -                                                  |
| p03    | code     | pending  | -          | -                                                  |
| p04    | code     | pending  | -          | -                                                  |
| p05    | code     | pending  | -          | -                                                  |
| p06    | code     | pending  | -          | -                                                  |
| p07    | code     | pending  | -          | -                                                  |
| final  | code     | pending  | -          | -                                                  |
| spec   | artifact | pending  | -          | -                                                  |
| design | artifact | pending  | -          | -                                                  |
| plan   | artifact | received | 2026-07-13 | reviews/artifact-plan-review-2026-07-13T223614Z.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 1 task - Repair project scaffolding
- Phase 2: 1 task - Clarify plan task-shape guidance
- Phase 3: 1 task - Improve tools update no-args feedback
- Phase 4: 1 task - Prevent placeholder backlog summaries
- Phase 5: 1 task - Fill decision records atomically
- Phase 6: 1 task - Detect stale CLI grammar
- Phase 7: 1 task - Prepare and validate the release

**Total: 7 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- State: `state.md`
