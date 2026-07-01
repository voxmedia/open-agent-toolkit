---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-01
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p01']
oat_auto_review_at_hill_checkpoints: false
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: workflow-gate-target-selection

> Execute this plan using `oat-project-implement`.

**Goal:** Fix the workflow-gate target-selection regression from the merged PR,
align all gate-aware lifecycle skills with unpinned cross-runtime gate commands,
and verify `oat gate review` works through Codex, Claude, and Cursor CLI targets.

**Architecture:** Keep the V1 target registry and runtime-avoidance model. Repair
the review-specific gate path by assembling one provider prompt, then adjust
docs, skill guidance, live user config, and release metadata around that model.

**Tech Stack:** TypeScript CLI, Vitest-style command tests, markdown skills/docs,
OAT project artifacts, and shell-based CLI smoke checks with provider shims.

**Commit Convention:** `{type}({scope}): {description}` - include the task ID in
the scope when practical, e.g. `fix(p01-t02): assemble review gate prompt`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

This plan remains sequential. The CLI prompt-assembly tests must fail before the
implementation changes, docs and skill guidance depend on the settled command
shape, release bumps depend on knowing the final changed asset set, and live
config verification should run only after the CLI/docs shape is fixed.

---

## Phase 1: Review Gate Target Selection And Provider Prompt Repair

### Task p01-t01: Add CLI Regression Coverage For Review Gate Prompt Assembly

**Files:**

- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write tests (RED)**

Add focused tests that exercise `oat gate review` with `codex-default`,
`claude-default`, and `cursor-default` targets. Each test should assert that the
provider receives its base args plus exactly one assembled prompt argument
containing:

- gate-originated review context
- resolved project path
- review type and review scope hints
- the user prompt

Also keep or adjust coverage showing that unpinned review gates use the normal
cross-provider target selection path.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/gate/index.test.ts
```

Expected: the new prompt-assembly assertions fail before implementation.

**Step 2: Commit**

```bash
git add packages/cli/src/commands/gate/index.test.ts
git commit -m "test(p01-t01): cover review gate provider prompt assembly"
```

---

### Task p01-t02: Assemble Review Gate Metadata Into One Provider Prompt

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts` if test expectations
  need small alignment after implementation

**Step 1: Implement (GREEN)**

Change the review-gate path so it combines the gate context note, resolved
project path, review hints, and user prompt into one prompt string before
calling the selected target. Preserve `cross-provider-exec` generic prompt
behavior.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/gate/index.test.ts
```

Expected: the new Codex, Claude, Cursor, and existing gate tests pass.

**Step 2: Verify**

Run:

```bash
pnpm type-check
```

Expected: no TypeScript errors.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
git commit -m "fix(p01-t02): assemble review gate prompt for providers"
```

---

### Task p01-t03: Align Gate-Aware Lifecycle Skill Guidance

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Update guidance**

For all gate-aware lifecycle skills, replace the runtime selection note that
presents `--target <id>` as the skill-level precision path. The new wording
should state that reusable lifecycle skill-gate commands should normally omit
exact targets so `oat gate review` / `cross-provider-exec` can avoid the current
runtime. Exact targets are allowed only for manual dispatch, debugging, or a
deliberately local/user-specific override.

Bump each changed skill's frontmatter `version:` once.

**Step 2: Verify**

Run:

```bash
pnpm run oat:validate-skills
```

Expected: skill validation passes.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md .agents/skills/oat-project-implement/SKILL.md
git commit -m "docs(p01-t03): clarify lifecycle gate target selection"
```

---

### Task p01-t04: Update Workflow-Gate Docs And Repo Reference Notes

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md` if needed
- Modify: `.oat/repo/reference/current-state.md` if needed
- Modify: `.oat/repo/reference/decision-record.md` if needed
- Modify: `.oat/repo/reference/project-summaries/20260628-workflow-end-triggers.md` if needed
- Modify: `.oat/repo/reference/project-summaries/20260630-workflow-gate-improvements.md` if needed

**Step 1: Update docs**

Make the lifecycle gate examples use unpinned `oat gate review` commands. Keep
target setup examples in the exec-target section, and keep explicit `--target`
examples only for manual dispatch/debug language.

If repo reference notes currently imply pinned lifecycle gates are recommended,
align them with the new rule.

**Step 2: Verify**

Run:

```bash
pnpm build:docs
```

Expected: docs build succeeds.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/cli-utilities/config-and-local-state.md .oat/repo/reference/current-state.md .oat/repo/reference/decision-record.md .oat/repo/reference/project-summaries/20260628-workflow-end-triggers.md .oat/repo/reference/project-summaries/20260630-workflow-gate-improvements.md
git diff --cached --quiet || git commit -m "docs(p01-t04): prefer unpinned lifecycle gates"
```

---

### Task p01-t05: Bump Release Metadata For Shipped CLI And Bundled Assets

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Bump versions**

Bump all five public package manifests from `0.1.36` to the next lockstep patch
version and update the generated public package version asset to match.

**Step 2: Verify**

Run:

```bash
pnpm release:validate
```

Expected: release validation passes.

**Step 3: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p01-t05): bump workflow gate release versions"
```

---

### Task p01-t06: Update Live Gate Config And Verify Provider CLI Commands

**Files:**

- No committed repo files expected unless verification discovers additional
  source changes.
- Update user-level OAT config on the mini and laptop.
- Update `.oat/projects/shared/workflow-gate-target-selection/implementation.md`
  with verification evidence.

**Step 1: Update live user-level gates**

On the mini and laptop, rewrite these user-level gates to remove exact target
pins while preserving review type, scope, severity threshold, and descriptions:

- `oat-project-quick-start`
- `oat-project-plan`
- `oat-project-import-plan`
- `oat-project-implement`

Use durable `oat gate review ...` commands. Verify `oat gate resolve <skill>
--json` for all four skills on both machines no longer includes `--target
codex-5.5-xhigh`.

**Step 2: Verify provider command behavior through the CLI**

Run CLI smoke checks with temporary shims named `codex`, `claude`, and
`cursor-agent` on `PATH`. For each provider target:

- run `oat gate review --target <provider-default> --review-type artifact
--review-scope plan --exit-nonzero-on important "Use oat-project-review-provide
artifact plan."`
- assert the shim receives exactly one assembled prompt argument after its base
  provider args
- have the shim write a clean gate review artifact
- verify the CLI exits zero and reports the produced artifact

**Step 3: Full verification**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/gate/index.test.ts src/commands/gate/review-verdict.test.ts
pnpm run oat:validate-skills
pnpm type-check
pnpm build
pnpm build:docs
pnpm release:validate
```

Expected: all commands pass.

**Step 4: Commit tracking updates**

```bash
git add .oat/projects/shared/workflow-gate-target-selection/implementation.md .oat/projects/shared/workflow-gate-target-selection/state.md .oat/projects/shared/workflow-gate-target-selection/plan.md
git diff --cached --quiet || git commit -m "chore(oat): record workflow gate verification"
```

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                              |
| ------ | -------- | -------- | ---------- | ------------------------------------- |
| p01    | code     | passed   | 2026-07-01 | reviews/final-review-2026-07-01.md    |
| final  | code     | received | 2026-07-01 | reviews/final-review-2026-07-01-v2.md |
| spec   | artifact | pending  | -          | -                                     |
| design | artifact | pending  | -          | -                                     |
| plan   | artifact | passed   | 2026-07-01 | inline quick-start artifact review    |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks - CLI prompt repair, lifecycle skill guidance, docs/reference
  alignment, release metadata, live config update, and provider CLI smoke
  verification.

**Total: 6 tasks**

Implementation tasks and final verification are complete. Awaiting final code
review.

---

## References

- Discovery: `discovery.md`
- Feedback source: `/Users/thomas.stang/orca/workspaces/orc/teach-session-observer/oat-wf-gate-feedback.md`
- Merged PR: `https://github.com/voxmedia/open-agent-toolkit/pull/121`
- Related backlog: `.oat/repo/reference/backlog/items/gate-same-target-execution.md`
