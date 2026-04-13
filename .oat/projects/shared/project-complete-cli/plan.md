---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: project-complete-cli

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Move the remaining `oat-project-complete` completion-state mutation into CLI-owned code so the skill delegates canonical `state.md` frontmatter/body updates instead of performing inline shell edits.

**Architecture:** Add a narrow CLI-owned completion-state mutator for OAT project `state.md`, expose a shell-callable command surface that `oat-project-complete` can invoke, and keep archive/S3/summary side effects in the archive helper layer that already shipped.

**Tech Stack:** TypeScript CLI commands, Commander command wiring, existing project/archive utilities, markdown/frontmatter mutation helpers, and focused CLI tests.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add complete-state mutation contract`

## Planning Checklist

- [ ] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Capture and implement the completion-state contract

### Task p01-t01: Codify the canonical completed `state.md` contract in tests

**Files:**

- Create: `packages/cli/src/commands/project/complete-state/state-utils.test.ts`
- Review: `.agents/skills/oat-project-complete/SKILL.md`
- Review: `packages/cli/src/commands/cleanup/project/project.utils.ts`

**Step 1: Write test (RED)**

Add focused tests that capture the current required completion-state mutations from the skill contract:

- frontmatter contains `oat_lifecycle: complete`
- `oat_project_completed` and `oat_project_state_updated` are updated
- markdown body reflects `**Status:** Complete`
- `## Current Phase`, `## Progress`, and `## Next Milestone` are rewritten to the canonical completed shape

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/state-utils.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Create a pure completion-state mutation utility that accepts existing `state.md` content plus completion inputs and returns the fully updated canonical content.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/state-utils.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Factor shared string/frontmatter helpers only if they clearly reduce duplication without pulling archive behavior into this module.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/complete-state/state-utils.ts packages/cli/src/commands/project/complete-state/state-utils.test.ts
git commit -m "feat(p01-t01): codify completion-state mutation contract"
```

---

### Task p01-t02: Implement the CLI-owned completion-state mutator

**Files:**

- Create: `packages/cli/src/commands/project/complete-state/state-utils.ts`
- Modify: `packages/cli/src/commands/cleanup/project/project.utils.ts` (only if direct reuse is natural)
- Modify: `packages/cli/src/commands/cleanup/project/project.test.ts` (if helper alignment changes behavior)

**Step 1: Write test (RED)**

Add any missing coverage for edge cases discovered during extraction:

- existing `oat_lifecycle` field is updated, not duplicated
- missing progress bullet is added once
- archived vs non-archived completion text renders correctly

**Step 2: Implement (GREEN)**

Finish the mutator module so it can produce the completed `state.md` shape deterministically from a project name, date/timestamp, and archive status.

**Step 3: Refactor**

Align any overlapping cleanup utility logic only where that reduces drift without broadening scope.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/state-utils.test.ts src/commands/cleanup/project/project.test.ts`
Expected: Targeted tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/complete-state/state-utils.ts packages/cli/src/commands/cleanup/project/project.utils.ts packages/cli/src/commands/cleanup/project/project.test.ts
git commit -m "feat(p01-t02): implement complete-state mutator"
```

---

## Phase 2: Add CLI delegation and integrate the skill

### Task p02-t01: Add a shell-callable CLI command for completion-state mutation

**Files:**

- Create: `packages/cli/src/commands/project/complete-state/index.ts`
- Create: `packages/cli/src/commands/project/complete-state/index.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

Add command tests that cover:

- updating a project `state.md` to completed state
- passing archive status through to the rendered body text
- returning clear errors for missing project paths or missing `state.md`

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Add a narrow CLI surface that reads a target project path, applies the completion-state mutator, and writes the updated `state.md`.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/index.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep the command thin and push formatting logic down into the mutator module.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/index.test.ts`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/complete-state/index.ts packages/cli/src/commands/project/complete-state/index.test.ts packages/cli/src/commands/project/index.ts
git commit -m "feat(p02-t01): add project complete-state command"
```

---

### Task p02-t02: Delegate `oat-project-complete` state mutation to the CLI

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (if command-path changes affect contract validation)

**Step 1: Write test (RED)**

Add or adjust any skill-contract assertions needed to protect the new delegation path, or capture the expected command invocation in the skill text before removing the inline `sed`/`awk` block.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Test fails or current assertions expose the contract gap

**Step 2: Implement (GREEN)**

Replace the inline Step 5 `state.md` mutation block in `oat-project-complete` with a call to the new CLI command, keeping the surrounding archive, pointer-clear, summary, PR, and commit flow intact.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Updated assertions pass

**Step 3: Refactor**

Tighten the skill text so it clearly distinguishes CLI-owned completion-state mutation from the remaining skill-owned orchestration steps.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/index.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Both suites pass

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "refactor(p02-t02): delegate project completion state to cli"
```

---

## Phase 3: Focused verification and artifact alignment

### Task p03-t01: Run targeted verification and close the contract gap cleanly

**Files:**

- Modify: `packages/cli/src/commands/help-snapshots.test.ts` (only if the new command is user-facing)
- Modify: `.oat/repo/reference/backlog/items/project-complete-cli-helper.md` (only if a small implementation note update is warranted after the shape is final)

**Step 1: Write test (RED)**

If the chosen command surface is public, add or update help snapshot coverage before final verification.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/help-snapshots.test.ts`
Expected: Test fails only if the command surface changed help output

**Step 2: Implement (GREEN)**

Apply any final help/backlog-note updates required by the chosen CLI surface and implementation shape.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/help-snapshots.test.ts`
Expected: Targeted help coverage passes

**Step 3: Refactor**

Remove any dead inline mutation text or duplicate helper references discovered during verification.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/complete-state/index.test.ts src/commands/project/complete-state/state-utils.test.ts src/commands/cleanup/project/project.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Focused suites pass and CLI compiles cleanly

**Step 5: Commit**

```bash
git add packages/cli/src/commands/help-snapshots.test.ts .oat/repo/reference/backlog/items/project-complete-cli-helper.md
git commit -m "chore(p03-t01): verify project complete cli flow"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - codify and implement the canonical completion-state mutation contract
- Phase 2: 2 tasks - add CLI delegation surface and update `oat-project-complete` to use it
- Phase 3: 1 task - run focused verification and clean up any remaining contract drift

**Total: 5 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (required in spec-driven mode; optional in quick/import mode)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Backlog: `.oat/repo/reference/backlog/items/project-complete-cli-helper.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
