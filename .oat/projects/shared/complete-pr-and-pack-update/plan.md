---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-30
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02']
oat_auto_review_at_checkpoints: true
oat_plan_source: imported # spec-driven | quick | imported
oat_import_reference: references/imported-plan.md # e.g., references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/.codex/worktrees/1422/open-agent-toolkit/.oat/repo/reference/external-plans/complete-pr-and-pack-update-2026-03-30.md # original source path provided by user
oat_import_provider: codex # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: complete-pr-and-pack-update

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Fix two OAT workflow issues: skip redundant PR creation prompts during project completion when a PR is already tracked, and reconcile newly added bundled tools when updating installed packs.

**Architecture:** Keep each fix close to its existing ownership boundary. OAT lifecycle state and skill instructions own PR tracking, while CLI update logic and pack manifests own reconciliation of missing bundled tools for installed packs.

**Tech Stack:** TypeScript, Vitest, OAT skill markdown, OAT CLI command modules

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: PR Tracking at Project Completion

### Task p01-t01: Add explicit PR metadata to project state and final PR flow

**Files:**

- Modify: `.oat/templates/state.md`
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`
- Modify: any lifecycle/state docs or skill references that define project PR state semantics

**Step 1: Write test (RED)**

Add or extend focused tests that fail until import/project state handling recognizes `oat_pr_status` and `oat_pr_url` as first-class fields for project PR lifecycle tracking.

Run: `pnpm --filter @tkstang/oat-cli test -- state`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Add `oat_pr_status` and `oat_pr_url` to the canonical state template and update `oat-project-pr-final` so it records `ready` before PR creation and `open` plus the PR URL after successful creation.

Run: `pnpm --filter @tkstang/oat-cli test -- state`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Normalize wording so `pr_open` remains routing state while the new PR fields are the source of truth for whether a real PR exists.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli lint && pnpm --filter @tkstang/oat-cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .oat/templates/state.md .agents/skills/oat-project-pr-final/SKILL.md
git commit -m "feat(p01-t01): track PR metadata in project state"
```

---

### Task p01-t02: Skip completion PR prompt when project state already tracks an open PR

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: related lifecycle guidance that currently implies the completion flow should always ask about opening a PR

**Step 1: Write test (RED)**

Add or extend acceptance coverage that fails when `oat-project-complete` still asks the PR question despite `oat_pr_status: open`.

**Step 2: Implement (GREEN)**

Update `oat-project-complete` to suppress the PR question when state shows an open PR, preserve the prompt for `null` or `ready`, and report the tracked PR URL in completion output when present.

**Step 3: Refactor**

Keep the question batching and completion gate flow unchanged outside the PR-specific branch.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- complete`
Expected: Relevant lifecycle coverage passes

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md
git commit -m "feat(p01-t02): skip duplicate PR prompt on completion"
```

---

## Phase 2: Reconcile Missing Tools for Installed Packs

### Task p02-t01: Extend `oat tools update` to reconcile missing bundled members for installed packs

**Files:**

- Modify: `packages/cli/src/commands/tools/update/update-tools.ts`
- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: shared helpers around pack manifests or scan logic as needed

**Step 1: Write test (RED)**

Add or extend unit tests that fail when `--pack <pack>` or `--all` ignores newly added bundled tools that belong to an already-installed pack in the same scope.

Run: `pnpm --filter @tkstang/oat-cli test -- update-tools`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Detect installed packs from existing bundled members, enumerate canonical pack contents from the manifest source of truth, and treat missing bundled members as update candidates for `--pack <pack>` and `--all` while leaving name-based update behavior unchanged.

Run: `pnpm --filter @tkstang/oat-cli test -- update-tools`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep reconciliation logic isolated from `tools list` and `tools outdated`, and avoid introducing installs for packs that are not already present in a scope.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli lint && pnpm --filter @tkstang/oat-cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/update/update-tools.ts packages/cli/src/commands/tools/update/index.ts
git commit -m "feat(p02-t01): reconcile missing bundled tools on update"
```

---

### Task p02-t02: Cover reconciliation edge cases and core pack side effects

**Files:**

- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.test.ts` or adjacent helper tests as needed
- Modify: relevant docs if command semantics need clarification

**Step 1: Write test (RED)**

Add focused cases for:

- `--all` only reconciling packs already installed in a scope
- name-based updates remaining update-only
- core pack reconciliation refreshing `.oat/docs` even when reached through `--all`

Run: `pnpm --filter @tkstang/oat-cli test -- update-tools scan-tools`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Finish any test-driven adjustments so reconciliation behavior, scope boundaries, and core pack side effects are enforced by automated coverage.

Run: `pnpm --filter @tkstang/oat-cli test -- update-tools scan-tools`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Tighten helper naming and test fixtures so future bundled-pack growth is easy to maintain.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test && pnpm --filter @tkstang/oat-cli type-check`
Expected: Package tests and type-check pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/update/update-tools.test.ts packages/cli/src/commands/tools/shared/scan-tools.test.ts
git commit -m "test(p02-t02): cover pack reconciliation behavior"
```

---

## Phase p-rev1: Review Fixes from Final Review

### Task prev1-t01: (review) Add negative coverage for name-targeted updates staying update-only

**Files:**

- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts`

**Step 1: Understand the issue**

Review finding: The final review identified that the imported plan explicitly required proof that `oat tools update <name>` does not reconcile uninstalled siblings from the same pack, but the current tests never exercise that negative case.
Location: `packages/cli/src/commands/tools/update/update-tools.test.ts`

**Step 2: Implement fix**

Add a name-targeted update test where one member of a pack is installed, another pack member is missing, and the update target is the installed tool by name. Assert that only the named tool is updated and no sibling pack member is copied into the scope.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- update-tools`
Expected: The new negative test passes and the targeted update path remains update-only.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/update/update-tools.test.ts
git commit -m "test(prev1-t01): cover name-targeted updates staying scoped"
```

---

### Task prev1-t02: (review) Distinguish synthesized installs from versioned updates in CLI output

**Files:**

- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/update/index.test.ts`

**Step 1: Understand the issue**

Review finding: Synthesized missing bundled members currently render as `? -> ?` in update output, even though they are being newly installed rather than updated from one version to another.
Location: `packages/cli/src/commands/tools/update/index.ts:149`

**Step 2: Implement fix**

Adjust the CLI output so synthesized tools with no installed version are presented as installs or additions rather than as ordinary version-to-version updates. Add focused coverage that locks the new output semantics down.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test -- update-tools`
Expected: The CLI output reflects installs distinctly and the update command tests pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/update/index.ts packages/cli/src/commands/tools/update/index.test.ts
git commit -m "fix(prev1-t02): clarify synthesized install output"
```

---

### Task prev1-t03: (review) Remove final-summary placeholder bullets from implementation summary

**Files:**

- Modify: `implementation.md`

**Step 1: Understand the issue**

Review finding: `implementation.md` still contains template bullets `{capability 1}` and `{capability 2}` in the Final Summary section, which can leak into downstream PR-generation output.
Location: `implementation.md:333`

**Step 2: Implement fix**

Remove the leftover placeholder bullets while preserving the real shipped-summary content that follows them.

**Step 3: Verify**

Run: `rg -n "\\{capability [12]\\}" .oat/projects/shared/complete-pr-and-pack-update/implementation.md`
Expected: No placeholder capability bullets remain.

**Step 4: Commit**

```bash
git add .oat/projects/shared/complete-pr-and-pack-update/implementation.md
git commit -m "chore(prev1-t03): remove summary placeholders"
```

---

### Task prev1-t04: (review) Consolidate duplicated implementation log entry

**Files:**

- Modify: `implementation.md`

**Step 1: Understand the issue**

Review finding: The implementation log repeats part of the same session, which makes the review trail noisier than necessary.
Location: `implementation.md:282`

**Step 2: Implement fix**

Consolidate the duplicated log entry or clearly distinguish it so the implementation history reflects one coherent sequence of work.

**Step 3: Verify**

Run: `sed -n '220,340p' .oat/projects/shared/complete-pr-and-pack-update/implementation.md`
Expected: The implementation log no longer duplicates the same session content.

**Step 4: Commit**

```bash
git add .oat/projects/shared/complete-pr-and-pack-update/implementation.md
git commit -m "chore(prev1-t04): clean implementation log duplication"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date       | Artifact                                       |
| ------ | -------- | ------- | ---------- | ---------------------------------------------- |
| p01    | code     | pending | -          | -                                              |
| p02    | code     | pending | -          | -                                              |
| final  | code     | passed  | 2026-03-30 | reviews/archived/final-review-2026-03-30-v3.md |
| spec   | artifact | pending | -          | -                                              |
| design | artifact | pending | -          | -                                              |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Persist PR state and remove redundant completion prompting when a PR is already tracked
- Phase 2: 2 tasks - Reconcile newly added bundled tools for installed packs and lock behavior down with tests
- Phase p-rev1: 4 tasks - Address final review findings before re-review

**Total: 8 tasks**

Ready for review-fix implementation, then re-review.

---

## References

- Design: `design.md` (required in spec-driven mode; optional in quick/import mode)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md`
