---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_phase: plan
oat_phase_status: in_progress
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

**Goal:** Eliminate scaffold corruption and placeholder leakage, add complete CLI-native PJM record creation, then harden the affected workflows so failures are actionable and shipped grammar changes are detectable.

**Architecture:** Keep fixes local to the owning command/template surfaces. Reuse canonical templates and existing ID/index primitives for CLI-native record creation, add focused regression tests at each boundary, use `oat doctor` for repository-level stale-invocation detection, and finish with the required lockstep public-package release validation.

**Tech Stack:** TypeScript ESM, Commander, Vitest, YAML, Markdown templates, pnpm/Turborepo.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

---

## Parallelism

Phase p01 runs first because it fixes the project-creation corruption and is the highest-priority item. Phases p02-p06 then run concurrently: their write sets are disjoint across the plan template, tools update, backlog archive, PJM record creation/skill migration, doctor/release-note, and gate-runner surfaces. Tasks within p05 and p06 run sequentially in their respective isolated worktrees. The phases merge in order. Phase p07 runs only after all fixes merge because it owns the shared five-package version bump and repository-wide release gate.

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

## Phase 5: Create complete PJM records atomically

### Task p05-t01: Add decision and consequences inputs to decision creation

**Files:**

- Modify: `packages/cli/src/commands/decision/new.ts`
- Modify: `packages/cli/src/commands/decision/new.test.ts`
- Modify: `packages/cli/src/commands/decision/index.ts`
- Modify: `packages/cli/src/commands/decision/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts` if the help contract requires an update
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`

Before editing the canonical skill, rebase onto the latest integration base and inspect concurrent `oat-project-summary` changes, including the `orchestration-run-log` project’s declared surface. Preserve sibling prose and limit this task to the Step 6 decision-promotion clauses.

**Step 1: Write test (RED)**

Add core and command-wiring tests for `--decision <text>` and `--consequences <text>`, asserting those values fill the template sections and flow through `createDecisionRecord`. Add or update help coverage for both flags. Add a focused canonical-skill contract assertion that Step 6 passes `--context`, `--decision`, and `--consequences` in its promotion command.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision/new.test.ts src/commands/decision/index.test.ts src/commands/help-snapshots.test.ts src/validation/skills.test.ts`
Expected: Tests fail because the options do not exist, rendering hardcodes `TODO`, and the promotion contract does not pass all three sections.

**Step 2: Implement (GREEN)**

Thread optional decision and consequences fields through the command options, record-creation API, and renderer. Update `oat-project-summary` Step 6 to derive context, decision, and consequences from each grounded Key Decision and pass all three flags in the atomic `oat decision new` call. Bump that canonical skill exactly one patch from its then-current version after the rebase.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision/new.test.ts src/commands/decision/index.test.ts src/commands/help-snapshots.test.ts src/validation/skills.test.ts`
Expected: Explicit values populate all three sections, command help exposes both flags, and the skill promotion path passes all three values.

**Step 3: Refactor**

Keep backward-compatible defaults for callers that omit the new flags, but ensure the summary promotion path never emits literal TODO content.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/decision/new.test.ts src/commands/decision/index.test.ts src/commands/help-snapshots.test.ts src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main`
Expected: Decision tests, help snapshots, semantic skill-contract coverage, canonical skill validation, and the base-relative `oat-project-summary` patch-version bump all pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/decision/new.ts packages/cli/src/commands/decision/new.test.ts packages/cli/src/commands/decision/index.ts packages/cli/src/commands/decision/index.test.ts packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/validation/skills.test.ts .agents/skills/oat-project-summary/SKILL.md
git commit -m "feat(p05-t01): fill decision record sections at creation"
```

### Task p05-t02: Scaffold backlog items with a single command

**Files:**

- Create: `packages/cli/src/commands/backlog/new.ts`
- Create: `packages/cli/src/commands/backlog/new.test.ts`
- Modify: `packages/cli/src/commands/backlog/index.ts`
- Modify: `packages/cli/src/commands/backlog/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `.agents/skills/oat-pjm-add-backlog-item/SKILL.md`

Before editing the canonical skill, rebase onto the latest integration base and preserve concurrent changes. Bump `oat-pjm-add-backlog-item` exactly one patch from its then-current version, edit only the canonical `.agents/skills/` source, and refresh provider-linked views with `oat sync --scope all`.

**Step 1: Write tests (RED)**

Add core creation and command-wiring tests that point directly at the repository’s real `.oat/templates/backlog-item.md` and actual bundled `packages/cli/assets/templates/backlog-item.md`, never a copied fixture. Cover:

- repo-local template precedence plus installed-CLI bundled fallback, with both `oat_template` and `oat_template_name` absent from generated frontmatter;
- deterministic `BL-YYMMDD-slug` creation through the existing generator with same-day collisions in both `items/` and `archived/` rejected without overwrite, including proof that an existing active item’s bytes are unchanged;
- idempotent backlog initialization before creation when the scaffold is absent;
- canonical default frontmatter (`status: open`, `priority: medium`, `scope: task`, `scope_estimate: null`, `labels: []`, `assignee: null`, `associated_issues: []`, `external_plans: []`) and normalized ISO 8601 UTC `created`/`updated` timestamps;
- `--priority`, `--scope`, `--scope-estimate`, comma-delimited `--labels`, and `--description` overrides, plus rejection of unsupported enum/input values before any mutation: invalid invocations against an absent scaffold create no backlog directories/files, while invalid invocations against an existing scaffold preserve item and index bytes exactly;
- structured YAML round trips for YAML-significant title/label values (apostrophes, colons, and `#`) while description and Acceptance Criteria body content remains literal;
- the real description placeholder retained when omitted and the template Acceptance Criteria placeholders preserved;
- managed-index regeneration that adds one item row, leaves `## Curated Overview` byte-for-byte unchanged, and produces identical index content on an immediate second regeneration;
- forced post-write index-regeneration failure that removes only the new item while preserving pre-existing files and exact index bytes;
- help/JSON output and a canonical-skill contract requiring the confirmed scope estimate to be passed to `oat backlog new`, preserving acceptance-criteria enrichment while rejecting the old `generate-id` + hand-authored creation sequence.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/new.test.ts src/commands/backlog/index.test.ts src/commands/help-snapshots.test.ts src/validation/skills.test.ts`
Expected: Tests fail because `oat backlog new` and the updated skill contract do not exist.

**Step 2: Implement (GREEN)**

Create a focused backlog-item creator that performs these operations in order:

- normalizes and validates every user-controlled input (title, timestamp, priority, scope, scope estimate, labels, and description) and generates the candidate ID before any filesystem write;
- resolves repo-local `backlog-item.md` with bundled-assets fallback and renders the real template without shipping either template-only metadata key;
- runs the existing idempotent `initializeBacklog` semantics only after validation succeeds;
- reuses `generateBacklogId` and performs preflight collision checks against both active and archived paths;
- serializes user-controlled frontmatter structurally through YAML so exact titles/labels round-trip safely while rendering the description/Acceptance Criteria body from the real template;
- writes the canonical frontmatter defaults and optional scope estimate, regenerates the managed index through `regenerateBacklogIndex`, and removes the newly written item if regeneration fails;
- returns the item ID/path and index result for human and JSON command output.

Register `oat backlog new <title>` with `--priority`, `--scope`, optional `--scope-estimate`, `--labels`, `--description`, and the existing `--backlog-root` convention. Update `oat-pjm-add-backlog-item` to preserve its scope-estimate and Acceptance Criteria collection, pass the confirmed estimate into the new command before its atomic index regeneration, replace the generate-ID/hand-authored creation sequence, retain only post-create enrichment for non-index-visible fields, and keep the optional Curated Overview prompt.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/new.test.ts src/commands/backlog/index.test.ts src/commands/help-snapshots.test.ts src/validation/skills.test.ts`
Expected: Real-template precedence/fallback, metadata stripping, YAML-safe creation, pre-initialization input validation with zero mutation on absent/existing scaffolds, no-overwrite collision protection, rollback, defaults/flags, index idempotence, command output, and the canonical-skill command contract pass.

**Step 3: Refactor**

Keep generation, initialization, and index behavior delegated to existing backlog primitives; centralize only creation-specific template rendering, structured frontmatter serialization, option normalization, collision handling, and rollback. Do not duplicate or hand-edit the managed index block.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/new.test.ts src/commands/backlog/index.test.ts src/commands/backlog/regenerate-index.test.ts src/commands/backlog/shared/generate-id.test.ts src/commands/help-snapshots.test.ts src/validation/skills.test.ts && pnpm --filter @open-agent-toolkit/cli type-check && pnpm oat:validate-skills && pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main`
Expected: Focused backlog fallback/failure/serialization, ID, index, help, semantic skill-contract, type-check, canonical skill validation, and the base-relative `oat-pjm-add-backlog-item` patch-version bump all pass; `git status --short` shows no hand-edited provider copy.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/backlog/new.ts packages/cli/src/commands/backlog/new.test.ts packages/cli/src/commands/backlog/index.ts packages/cli/src/commands/backlog/index.test.ts packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/validation/skills.test.ts .agents/skills/oat-pjm-add-backlog-item/SKILL.md
git commit -m "feat(p05-t02): scaffold backlog items from the CLI"
```

---

## Phase 6: Strengthen CLI upgrade and gate hygiene

### Task p06-t01: Add a minimal stale-invocation doctor check and release callout

**Files:**

- Create: `packages/cli/src/commands/doctor/stale-invocations.ts`
- Create: `packages/cli/src/commands/doctor/stale-invocations.test.ts`
- Create: `packages/cli/src/validation/release-guidance.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `.github/PULL_REQUEST_TEMPLATE.md`
- Modify: `apps/oat-docs/docs/contributing/code.md`

**Step 1: Write test (RED)**

Add focused scanner tests with clean content and the known-stale form `oat --scope all sync`, plus doctor integration coverage that reports a warning with file/line evidence and the corrected `oat sync --scope all` form. Assert the check is project-scoped and leaves the intentional per-command `--scope` design unchanged. Add a repository-contract test that requires both release-guidance surfaces to include the `Breaking CLI grammar changes` callout plus before/after commands and a migration action.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/stale-invocations.test.ts src/commands/doctor/index.test.ts src/validation/release-guidance.test.ts`
Expected: Tests fail because doctor has no stale-grammar scanner and the release-guidance contract is not implemented.

**Step 2: Implement (GREEN)**

Add a small data-driven known-stale-forms list and scan bounded repository script/documentation surfaces, excluding dependencies, build output, archived/project artifacts, and generated provider views. Emit a passing check when clean and a warning with exact migration guidance when matches exist. Add a contributor/PR convention requiring a prominent `Breaking CLI grammar changes` callout with before/after commands and migration action; generated release notes must receive a visibly breaking PR title/callout.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/stale-invocations.test.ts src/commands/doctor/index.test.ts src/validation/release-guidance.test.ts`
Expected: Doctor flags known stale forms without adding a global `--scope` alias, and both release-guidance surfaces satisfy the callout content contract.

**Step 3: Refactor**

Keep pattern definitions and filesystem scanning outside the command registration module; bound the scan for predictable doctor latency.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/stale-invocations.test.ts src/commands/doctor/index.test.ts src/commands/create-program.test.ts src/validation/release-guidance.test.ts && pnpm exec oxfmt --check .github/PULL_REQUEST_TEMPLATE.md apps/oat-docs/docs/contributing/code.md`
Expected: Doctor coverage passes, the no-global-scope regression remains green, and release guidance is semantically complete and formatted.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/doctor/stale-invocations.ts packages/cli/src/commands/doctor/stale-invocations.test.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts packages/cli/src/validation/release-guidance.test.ts .github/PULL_REQUEST_TEMPLATE.md apps/oat-docs/docs/contributing/code.md
git commit -m "feat(p06-t01): detect stale CLI invocation grammar"
```

### Task p06-t02: Close stdin for noninteractive gate targets

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Add focused gate-runner coverage asserting that an exec target with captured stdout/stderr receives an explicit closed/ignored stdin rather than inheriting the parent stream. Preserve existing target selection, output forwarding, timeout, and liveness behavior.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: The regression fails because captured gate execution currently maps `stdio: 'pipe'` to `['inherit', 'pipe', 'pipe']`.

**Step 2: Implement (GREEN)**

Make the noninteractive gate stdin policy explicit in the process-launch boundary: gate prompts remain argv-based, stdin is ignored/closed, and stdout/stderr remain piped for diagnostics and liveness tracking. Do not encode shell redirection in target configuration or alter review instructions.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: A Codex-style target can begin immediately without waiting for parent stdin EOF, and existing gate behavior remains green.

**Step 3: Refactor**

Keep input and output policies independently legible so future interactive process uses cannot accidentally inherit the noninteractive gate default.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Focused gate tests and CLI type checking pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
git commit -m "fix(p06-t02): close stdin for gate targets"
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
- Modify: `packages/cli/assets/public-package-versions.json`
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

Confirm only expected source, test, docs, project-artifact, five-package version files, and the generated public-package version manifest changed; confirm no derived provider-skill copies or sibling-project prose were swept in. Assert `packages/cli/assets/public-package-versions.json` matches the final common package version after build/release validation. Review any docs build-generated index delta and include it only when it follows from the authored contributor-doc change. Recheck that `oat-project-summary` preserves concurrent changes and carries exactly one patch bump relative to the final base.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json pnpm-lock.yaml
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
| plan   | artifact | received | 2026-07-13 | reviews/artifact-plan-review-2026-07-14T002324Z.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no unresolved Critical/Important/Medium findings and all applicable final-scope disposition gates satisfied)

---

## Implementation Complete

**Summary:**

- Phase 1: 1 task - Repair project scaffolding
- Phase 2: 1 task - Clarify plan task-shape guidance
- Phase 3: 1 task - Improve tools update no-args feedback
- Phase 4: 1 task - Prevent placeholder backlog summaries
- Phase 5: 2 tasks - Create complete PJM records atomically
- Phase 6: 2 tasks - Strengthen CLI upgrade and gate hygiene
- Phase 7: 1 task - Prepare and validate the release

**Total: 9 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- State: `state.md`
