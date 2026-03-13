---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-12
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: retroactive-project-capture

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Create an `oat-project-capture` skill that retroactively builds OAT project artifacts from an existing branch and conversation context.

**Architecture:** Single SKILL.md file following established OAT skill conventions. No CLI command, no new packages — pure skill definition.

**Tech Stack:** Markdown (SKILL.md)

**Commit Convention:** `feat(p01-tNN): {description}` - e.g., `feat(p01-t01): scaffold oat-project-capture skill`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Skill Implementation

### Task p01-t01: Create oat-project-capture SKILL.md

**Files:**

- Create: `.agents/skills/oat-project-capture/SKILL.md`

**Step 1: Write skill definition**

Create the SKILL.md with proper frontmatter and the full capture workflow:

Frontmatter:

- `name: oat-project-capture`
- `version: 1.0.0`
- `description: Use when work happened outside the OAT project workflow and needs retroactive project tracking. Creates a full project from an existing branch and conversation context.`
- `disable-model-invocation: true`
- `user-invocable: true`
- `allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion`

Sections to include:

1. **Prerequisites** — Active git branch with commits, conversation context available.

2. **Mode Assertion** — OAT MODE: Capture. Blocked: no new implementation code. Allowed: project scaffolding, artifact population, state updates.

3. **Progress Indicators** — Phase banner (`OAT ▸ CAPTURE`) and step indicators for 8 steps.

4. **Step 0: Resolve context** — Detect current branch, infer base branch (main/master), verify commits exist beyond base. Check for existing project with candidate name.

5. **Step 1: Name inference** — Propose a project name based on conversation context (what was accomplished). Present to user via `AskUserQuestion` with option to accept or rename. Do NOT default to branch name — use semantic understanding of the work.

6. **Step 2: Branch analysis** — Run `git log --oneline {base}..HEAD`, `git diff --stat {base}..HEAD`, count commits, list files changed. Store analysis for use in later steps.

7. **Step 3: Project scaffold** — Run `oat project new "{name}" --mode quick`. Update state.md:
   - `oat_workflow_mode: quick`
   - `oat_workflow_origin: captured` (new origin value to distinguish from native quick-start)
   - `oat_phase: implement`
   - `oat_phase_status: in_progress`

8. **Step 4: Discovery synthesis** — Populate `discovery.md` from conversation context:
   - Initial Request: what the user wanted to accomplish
   - Key Decisions: decisions made during the conversation
   - Solution Space: alternatives considered (if any)
   - Constraints: any constraints that shaped the work
   - Success Criteria: what "done" looks like
   - Set `oat_status: complete`, `oat_generated: true`
   - Ask user to confirm or clarify anything unclear via `AskUserQuestion`

9. **Step 5: Implementation capture** — Populate `implementation.md`:
   - Create one task entry per commit (or group related commits into logical tasks)
   - Each task includes: status (completed), commit SHA, outcome (from commit message + diff summary), files changed
   - Group into phases if natural stages exist (e.g., "foundation", "feature", "tests")
   - Set `oat_status: in_progress` or `complete` based on user's answer in Step 6
   - Include Progress Overview table
   - Set `oat_generated: true`

10. **Step 6: Lifecycle state** — Ask user via `AskUserQuestion`:
    - "Is this work ready for review, or still in progress?"
    - Options: "Ready for review (Recommended)" / "Still in progress"
    - Update state.md accordingly:
      - Ready: `oat_phase: implement`, `oat_phase_status: complete`
      - In progress: `oat_phase: implement`, `oat_phase_status: in_progress`

11. **Step 7: Refresh dashboard and report** — Run `oat state refresh`. Print summary of what was created and suggest next actions:
    - If ready for review: `oat-project-review-provide` or `oat-project-pr-final`
    - If in progress: continue working, then invoke capture again or use `oat-project-reconcile`

12. **Self-Correction Protocol** — If catching yourself writing implementation code → STOP. If generating a plan.md → STOP (capture doesn't need a plan, the work is done).

**Step 2: Verify**

- Confirm SKILL.md frontmatter is valid YAML
- Confirm all sections follow conventions from existing skills (mode assertion, progress indicators, step numbering)
- Confirm `AskUserQuestion` is used at every uncertain decision point (name, discovery content, lifecycle state)

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-capture/SKILL.md
git commit -m "feat(p01-t01): add oat-project-capture skill for retroactive project creation"
```

---

### Task p01-t02: Register skill for sync and CLI distribution

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh` (add to SKILLS array)
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` (add to WORKFLOW_SKILLS)

**Step 1: Register in bundle-assets.sh**

Add `oat-project-capture` to the `SKILLS` array in alphabetical order within the workflow skills group.

**Step 2: Register in install-workflows.ts**

Add `oat-project-capture` to the `WORKFLOW_SKILLS` constant (alphabetical).

**Step 3: Sync and validate**

```bash
oat sync
pnpm build
pnpm oat:validate-skills
pnpm test
```

Verify skill appears in `packages/cli/assets/skills/` after build. If a test asserts the exact skill list, update it to include the new skill.

**Step 4: Commit**

```bash
git add packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/init/tools/workflows/install-workflows.ts
git commit -m "feat(p01-t02): register oat-project-capture for CLI distribution"
```

---

### Task p01-t03: Update backlog to reflect in-progress status

**Files:**

- Modify: `.oat/repo/reference/backlog.md`

**Step 1: Update backlog**

Move the `oat-project-capture` entry from Inbox to In Progress with a link to the project.

**Step 2: Verify**

Read backlog.md and confirm the entry moved correctly.

**Step 3: Commit**

```bash
git add .oat/repo/reference/backlog.md
git commit -m "chore(p01-t03): move oat-project-capture to in-progress in backlog"
```

---

### Task p01-t04: (review) Fix allowed-tools to include oat commands

**Files:**

- Modify: `.agents/skills/oat-project-capture/SKILL.md`

**Step 1: Understand the issue**

Review finding: The skill's `allowed-tools` frontmatter limits Bash to `git:*`, but the skill runs `oat project new` and `oat state refresh`. Hosts honoring the contract would block those commands.
Location: `.agents/skills/oat-project-capture/SKILL.md:7`

**Step 2: Implement fix**

Update the `allowed-tools` frontmatter to include `Bash(oat:*)` alongside `Bash(git:*)`, or use a broader pattern that covers the skill's actual command usage. Check how other workflow skills (e.g., `oat-project-complete`) declare their tool access.

**Step 3: Verify**

Run: `pnpm oat:validate-skills`
Expected: All skills pass validation

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-capture/SKILL.md
git commit -m "fix(p01-t04): broaden allowed-tools to include oat commands"
```

---

### Task p01-t05: (review) Fix implementation.md task ID mapping

**Files:**

- Modify: `.oat/projects/shared/retroactive-project-capture/implementation.md`

**Step 1: Understand the issue**

Review finding: Plan defines `p01-t03` as the backlog move, but `implementation.md` records `p01-t03` as validation fixes, breaking plan-to-implementation traceability.
Location: `implementation.md:92`

**Step 2: Implement fix**

Reassign task IDs in `implementation.md` so:

- `p01-t03` = backlog update (matching plan)
- `p01-t04` (or a deviation entry) = validation fixes

Update the Deviations from Plan table accordingly.

**Step 3: Verify**

Confirm task IDs in implementation.md match plan.md task definitions.

**Step 4: Commit**

```bash
git add .oat/projects/shared/retroactive-project-capture/implementation.md
git commit -m "fix(p01-t05): align implementation task IDs with plan"
```

---

### Task p01-t06: (review) Clarify plan.md contract around scaffold-created plan.md

**Files:**

- Modify: `.agents/skills/oat-project-capture/SKILL.md`

**Step 1: Understand the issue**

Review finding: Skill says capture must not generate `plan.md`, but `oat project new --mode quick` unconditionally creates one. The success criterion is unattainable as written.
Location: `.agents/skills/oat-project-capture/SKILL.md:44,58,147`

**Step 2: Implement fix**

Relax the wording in the Mode Assertion and Self-Correction Protocol to clarify the distinction: the skill doesn't _author_ a plan, but the scaffold template that `oat project new` creates is acceptable (it's a blank template, not retroactive plan generation). Update the success criterion to match.

**Step 3: Verify**

Read the updated sections and confirm internal consistency.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-capture/SKILL.md
git commit -m "fix(p01-t06): clarify plan.md contract for scaffold templates"
```

---

### Task p01-t07: (review) Update backlog status to match project state

**Files:**

- Modify: `.oat/repo/reference/backlog.md`

**Step 1: Understand the issue**

Review finding: Backlog says "Implementation in progress" but the project state is `complete`, "Ready for review or PR."
Location: `.oat/repo/reference/backlog.md:155`

**Step 2: Implement fix**

Update the backlog entry to reflect that implementation is complete and awaiting review/PR.

**Step 3: Verify**

Read backlog.md and confirm status matches project state.

**Step 4: Commit**

```bash
git add .oat/repo/reference/backlog.md
git commit -m "fix(p01-t07): update backlog status to match project state"
```

---

### Task p01-t08: (review) Update project bookkeeping to reflect completed fixes

**Files:**

- Modify: `.oat/projects/shared/retroactive-project-capture/implementation.md`
- Modify: `.oat/projects/shared/retroactive-project-capture/state.md`
- Modify: `.oat/projects/shared/retroactive-project-capture/plan.md`

**Step 1: Understand the issue**

Review finding: Fix tasks p01-t04 through p01-t07 were implemented in commit `450c1257` but project artifacts weren't advanced to completed state. Plan still says `fixes_added`, implementation shows `3/7` and `oat_current_task_id: p01-t04`, state says `in_progress` while body says "Ready for review."
Location: `plan.md:303`, `implementation.md:2,21`, `state.md:9,22`

**Step 2: Implement fix**

- Mark p01-t04 through p01-t07 as completed in implementation.md with commit `450c1257`
- Update Progress Overview to `7/7` (then `9/9` after these review fixes)
- Set `oat_current_task_id: null`, `oat_status: complete`
- Update state.md frontmatter: `oat_phase_status: complete`, `oat_current_task: null`
- Make state.md body consistent with frontmatter
- Update plan.md review row to `fixes_completed`

**Step 3: Verify**

Confirm all artifact frontmatter values are internally consistent.

**Step 4: Commit**

```bash
git add .oat/projects/shared/retroactive-project-capture/
git commit -m "fix(p01-t08): update project bookkeeping to reflect completed fixes"
```

---

### Task p01-t09: (review) Replace non-canonical p01-t03-dev task ID

**Files:**

- Modify: `.oat/projects/shared/retroactive-project-capture/implementation.md`

**Step 1: Understand the issue**

Review finding: `p01-t03-dev` breaks the `pNN-tNN` canonical task ID pattern. Downstream tooling may skip it.
Location: `implementation.md:107`

**Step 2: Implement fix**

Remove the `### Task p01-t03-dev` heading. Fold the validation fix work into p01-t03's Notes section as additional context, since both are about backlog/validation bookkeeping in the same commit. The deviation is already recorded in the Deviations table.

**Step 3: Verify**

Confirm no `p01-t03-dev` headings remain and deviations table still records the extra work.

**Step 4: Commit**

```bash
git add .oat/projects/shared/retroactive-project-capture/implementation.md
git commit -m "fix(p01-t09): replace non-canonical task ID with deviation note"
```

---

## Reviews

| Scope | Type | Status          | Date       | Artifact                                       |
| ----- | ---- | --------------- | ---------- | ---------------------------------------------- |
| p01   | code | pending         | -          | -                                              |
| final | code | fixes_completed | 2026-03-12 | reviews/archived/final-review-2026-03-12-v2.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 9 tasks - Skill creation, CLI registration, backlog update, and review fixes (2 rounds)

**Total: 9 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
