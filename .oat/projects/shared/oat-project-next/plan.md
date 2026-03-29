---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-29
oat_phase: plan
oat_phase_status: in_progress
oat_plan_source: spec-driven
oat_plan_hill_phases: ['p03']
oat_auto_review_at_checkpoints: true
oat_generated: false
oat_template: false
---

# Implementation Plan: oat-project-next

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Create an `oat-project-next` skill that acts as a stateful router for the OAT project lifecycle, plus fix `oat-project-pr-final` to auto-create PRs.

**Architecture:** Single skill file with state reader → boundary detector → review checker → phase router → dispatcher. Read-only — never mutates state. Adjacent fix modifies existing pr-final skill.

**Tech Stack:** Markdown skill file (no code packages). Skill registration via `.agents/skills/` + `oat sync`.

**Commit Convention:** `feat(pNN-tNN): description`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement

---

## Phase 1: Core Skill File

### Task p01-t01: Create skill file with frontmatter and skeleton

**Files:**

- Create: `.agents/skills/oat-project-next/SKILL.md`

**Step 1: Create the skill file**

Create `.agents/skills/oat-project-next/SKILL.md` with:

- Standard frontmatter: `name: oat-project-next`, `version: 1.0.0`, `description`, `disable-model-invocation: true`, `user-invocable: true`, `allowed-tools: Read, Glob, Grep, Bash(git:*), Skill`
- Phase banner format (OAT ▸ NEXT)
- Step indicators: `[1/3] Reading project state…`, `[2/3] Determining next action…`, `[3/3] Invoking target skill…`
- Top-level section headings as placeholders for the routing algorithm (Process, Step 0: Resolve Active Project, etc.)

**Step 2: Verify**

Run: `ls .agents/skills/oat-project-next/SKILL.md`
Expected: File exists

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md
git commit -m "feat(p01-t01): create oat-project-next skill skeleton"
```

---

### Task p01-t02: Implement State Reader (Step 0-1)

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`

**Step 1: Write the State Reader section**

Add Step 0 (Resolve Active Project) and Step 1 (Read Project State):

- Step 0: Resolve `PROJECT_PATH` from `.oat/config.local.json` via `oat config get activeProject`
  - Error: no active project + no projects exist → suggest `oat-project-new`, `oat-project-quick-start`, `oat-project-import-plan`
  - Error: no active project + projects exist → suggest `oat-project-open`
  - Error: project path doesn't exist → report error
- Step 1: Read `state.md` frontmatter → extract fields: `oat_phase`, `oat_phase_status`, `oat_workflow_mode`, `oat_execution_mode`, `oat_hill_checkpoints`, `oat_hill_completed`, `oat_blockers`
  - Map `oat_phase` to artifact file using the phase-to-artifact table from design
  - Read artifact frontmatter → extract `oat_status`, `oat_ready_for`, `oat_template`
  - Error: state.md missing → suggest running previous phase skill

**Step 2: Verify**

Read through skill file and confirm all state fields and error cases from design are covered.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md
git commit -m "feat(p01-t02): implement state reader for oat-project-next"
```

---

### Task p01-t03: Implement Boundary Detector (Step 2)

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`

**Step 1: Write the Boundary Detector section**

Add Step 2 (Classify Artifact State) with the four-tier algorithm:

- **Tier 1 (Complete with target):** `oat_status == "complete"` AND `oat_ready_for` is not null → use `oat_ready_for` as target
- **Tier 1b (Complete without target):** `oat_status == "complete"` AND `oat_ready_for` is null → treat as Tier 2 (advance to next phase)
- **Tier 2 (Substantive):** `oat_status == "in_progress"` AND `oat_template != true` AND no template placeholders → route to NEXT phase skill
- **Tier 3 (Template/Empty):** `oat_template == true` OR contains `{Project Name}`/`{Copy of` placeholders OR file doesn't exist → route to CURRENT phase skill

Document primary signal (`oat_template` field) and fallback heuristic (placeholder patterns).

**Step 2: Verify**

Confirm all four tiers match the design's boundary detector exactly, including the Tier 1b gap fix from review.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md
git commit -m "feat(p01-t03): implement boundary detector with four-tier algorithm"
```

---

### Task p01-t04: Implement Phase Router with routing tables (Step 3)

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`

**Step 1: Write the Phase Router section**

Add Step 3 (Route to Target Skill) with:

- HiLL Gate Override check (applied first): if `oat_phase` is in `oat_hill_checkpoints` AND NOT in `oat_hill_completed` → route to current phase skill
- Behavioral divergence note from progress skill
- Three routing tables from design:
  - **Spec-driven mode:** discovery → spec → design → plan → implement → post-impl
  - **Quick mode:** discovery → plan → implement → post-impl
  - **Import mode:** plan → implement → post-impl
- Each table row maps (phase, phase_status, boundary_tier) → target skill
- Execution mode check: `subagent-driven` → use `oat-project-subagent-implement` instead of `oat-project-implement`
- `implement complete/pr_open` → delegate to Post-Implementation Router (Step 4, added in Phase 2)

**Step 2: Verify**

Cross-reference every routing table row against the design tables. Verify HiLL override is applied before table lookup.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md
git commit -m "feat(p01-t04): implement phase router with workflow-mode routing tables"
```

---

### Task p01-t05: Implement Dispatcher (Step 5)

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`

**Step 1: Write the Dispatcher section**

Add Step 5 (Announce and Invoke):

- Announcement format:
  ```
  OAT ▸ NEXT banner
  Project: {project-name}
  Current: {oat_phase} ({oat_phase_status}) — {tier description}
  Routing: → {target-skill-name}
  Reason: {one-line explanation}
  ```
- Blocker warning: if `oat_blockers` non-empty, add `⚠️ Blockers: {descriptions}` line
- Invocation instruction: invoke target skill using the Skill tool
- Note that `disable-model-invocation: true` skills are loaded and followed directly by the agent

**Step 2: Verify**

Confirm announcement format matches design's Dispatcher section exactly.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md
git commit -m "feat(p01-t05): implement dispatcher with announcement and skill invocation"
```

---

### Task p01-t06: Sync skill to provider views

**Files:**

- Modified by sync tooling: `.claude/skills/oat-project-next/SKILL.md` (generated)

**Step 1: Run sync**

```bash
pnpm run cli -- sync --scope all
```

**Step 2: Verify**

```bash
ls .claude/skills/oat-project-next/SKILL.md
```

Expected: File exists and matches `.agents/skills/oat-project-next/SKILL.md`

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/ .claude/skills/oat-project-next/
git commit -m "feat(p01-t06): sync oat-project-next to provider views"
```

---

## Phase 2: Review Safety Check + Post-Implementation Router

### Task p02-t01: Implement Review Checker (Step 3.5)

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`

**Step 1: Write the Review Checker section**

Add Step 3.5 (Check for Unprocessed Reviews) between Phase Router and Dispatcher:

- Scan `{PROJECT_PATH}/reviews/` directory (exclude `archived/` subdirectory)
- If no files found → skip, continue to dispatcher
- Cross-reference against plan.md Reviews table:
  - Status `passed` → processed
  - Status `fixes_added` or `fixes_completed` → processed
  - Any other status (blank, `pending`, `in_progress`) → UNPROCESSED
  - File in directory but no Reviews table entry → UNPROCESSED
- If any unprocessed reviews → override routing target to `oat-project-review-receive`
- Include the Design Decision note explaining why `fixes_added`/`fixes_completed` are treated as processed (from review fix M1)

**Step 2: Verify**

Confirm the algorithm matches the design's Review Checker exactly, including the removal of "deferred" from processed statuses (review fix I2).

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md
git commit -m "feat(p02-t01): implement review checker with dual-signal detection"
```

---

### Task p02-t02: Implement Post-Implementation Router (Step 4)

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`

**Step 1: Write the Post-Implementation Router section**

Add Step 4 (Post-Implementation Routing) for when `oat_phase == implement` AND `oat_phase_status` is `complete` or `pr_open`:

Decision tree (in priority order):

1. **Incomplete revision tasks:** grep plan.md for `p-revN` phases, check implementation.md for incomplete tasks → route to implement/subagent-implement
2. **Unprocessed reviews:** delegate to Review Checker (Step 3.5) → route to `oat-project-review-receive`
3. **Final code review not done or not passed:** parse Reviews table for `Scope=final, Type=code`
   - No row or `Status=pending` → route to `oat-project-review-provide` with hint "code final"
   - Row exists with status != `passed` (e.g., `fixes_added`, `fixes_completed`) → route to `oat-project-review-receive`
4. **Summary not done:** read `summary.md` — missing or `oat_status != complete` → route to `oat-project-summary`
5. **PR not created:** `oat_phase_status != pr_open` → route to `oat-project-pr-final`
6. **PR is open:** `oat_phase_status == pr_open` → route to `oat-project-complete`

Include announcement messages for each branch.

**Step 2: Verify**

Walk through the decision tree mentally for each scenario in the design's test scenarios (Scenario Group 3: Post-Implementation Chain). Confirm every branch matches the design, including the review fix I1 (require `passed` status for final review).

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md
git commit -m "feat(p02-t02): implement post-implementation router with full chain"
```

---

### Task p02-t03: Re-sync skill to provider views

**Files:**

- Modified by sync tooling: `.claude/skills/oat-project-next/SKILL.md` (generated)

**Step 1: Run sync**

```bash
pnpm run cli -- sync --scope all
```

**Step 2: Verify**

```bash
diff .agents/skills/oat-project-next/SKILL.md .claude/skills/oat-project-next/SKILL.md
```

Expected: Files match (or diff shows only expected provider-specific differences)

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-next/ .claude/skills/oat-project-next/
git commit -m "feat(p02-t03): re-sync oat-project-next after review checker and post-impl router"
```

---

## Phase 3: Adjacent Fix — oat-project-pr-final Auto-Create PR

### Task p03-t01: Remove PR creation confirmation prompt

**Files:**

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`

**Step 1: Update Step 5 of oat-project-pr-final**

Change "Step 5: Optional - Open PR" to "Step 5: Create PR":

- Remove the `AskUserQuestion` prompt that asks "Do you want to open a PR now? 1) Yes 2) No"
- Make PR creation the default behavior — strip frontmatter, push, and `gh pr create` automatically
- Keep the `gh` availability check — if `gh` is not installed, instruct manual PR creation using the artifact
- Keep the YAML frontmatter stripping logic (CRITICAL section) unchanged
- Update the step title from "Optional - Open PR" to "Create PR"

**Step 2: Verify**

Read through the modified step and confirm:

- No confirmation prompt remains
- Frontmatter stripping logic is preserved
- `gh` availability fallback is preserved
- Step 6 (Update Project State) still references PR creation correctly

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-pr-final/SKILL.md
git commit -m "feat(p03-t01): auto-create PR in oat-project-pr-final without confirmation"
```

---

### Task p03-t02: Sync pr-final to provider views

**Files:**

- Modified by sync tooling: `.claude/skills/oat-project-pr-final/SKILL.md` (generated)

**Step 1: Run sync**

```bash
pnpm run cli -- sync --scope all
```

**Step 2: Verify**

```bash
diff .agents/skills/oat-project-pr-final/SKILL.md .claude/skills/oat-project-pr-final/SKILL.md
```

Expected: Files match

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-pr-final/ .claude/skills/oat-project-pr-final/
git commit -m "feat(p03-t02): sync oat-project-pr-final after auto-create PR fix"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                 |
| ------ | -------- | ------- | ---------- | -------------------------------------------------------- |
| p01    | code     | pending | -          | -                                                        |
| p02    | code     | pending | -          | -                                                        |
| p03    | code     | pending | -          | -                                                        |
| final  | code     | passed  | 2026-03-29 | reviews/archived/code-final-review-2026-03-29.md         |
| spec   | artifact | pending | -          | -                                                        |
| design | artifact | passed  | 2026-03-29 | reviews/archived/artifact-design-review-2026-03-29-v2.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks - Core skill file (state reader, boundary detector, phase router, dispatcher, sync)
- Phase 2: 3 tasks - Review safety check + post-implementation router + sync
- Phase 3: 2 tasks - Adjacent fix: oat-project-pr-final auto-create PR + sync

**Total: 11 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
