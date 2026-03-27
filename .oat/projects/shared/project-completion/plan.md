---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-27
oat_plan_source: spec-driven
oat_plan_hill_phases: ['p05']
oat_generated: false
---

# Implementation Plan: project-completion

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Extend the OAT project lifecycle with a summary artifact, post-PR revision workflow, and auto-review at checkpoints.

**Architecture:** Two new skills (summary, revise) + three skill updates (implement, pr-final, complete) + targeted CLI runtime changes (state routing, config schema) + documentation updates.

**Tech Stack:** Skill files (markdown), TypeScript (CLI runtime), Vitest (tests)

**Commit Convention:** `feat(pNN-tNN): description` for new capabilities, `docs(pNN-tNN): description` for documentation

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement

---

## Phase 1: Summary Artifact + Template

### Task p01-t01: Create summary.md template

**Files:**

- Create: `.oat/templates/summary.md`

**Step 1: Create template**

Create `.oat/templates/summary.md` with:

- Frontmatter: `oat_status: in_progress`, `oat_ready_for: null`, `oat_blockers: []`, `oat_last_updated: null`, `oat_generated: false`, `oat_summary_last_task: null`, `oat_summary_revision_count: 0`, `oat_summary_includes_revisions: []`
- 10 sections from design: Overview, What Was Implemented, Key Decisions, Design Deltas, Notable Challenges, Tradeoffs Made, Integration Notes, Revision History, Follow-up Items, Associated Issues
- Each section has a brief guidance comment (same pattern as other OAT templates)
- Include the section omission rule as a comment at the top: "Omit sections with no meaningful content. Minimum viable: Overview + What Was Implemented + Key Decisions."

**Step 2: Verify**

Run: `ls -la .oat/templates/summary.md`
Expected: File exists with valid YAML frontmatter

**Step 3: Commit**

```bash
git add .oat/templates/summary.md
git commit -m "feat(p01-t01): create summary.md template"
```

---

### Task p01-t02: Create oat-project-summary skill

**Files:**

- Create: `.agents/skills/oat-project-summary/SKILL.md`

**Step 1: Create skill directory and SKILL.md**

Create the full skill file following the design's component specification for `oat-project-summary`. Include:

- **Frontmatter:** `name: oat-project-summary`, `version: 1.0.0`, `description: Use when a project needs a summary artifact. Generates summary.md from project artifacts as institutional memory.`, `disable-model-invocation: true`, `user-invocable: true`, `allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion`
- **Mode assertion:** OAT MODE: Summary Generation
- **Progress indicators:** Banner + step indicators (resolve project, read artifacts, generate/update summary, commit)
- **Blocked/allowed activities**
- **Process steps** from design:
  1. Resolve active project (standard Step 0)
  2. Check implementation state — implementation.md must exist with meaningful progress
  3. Read all project artifacts: discovery.md, design.md, plan.md, implementation.md
  4. Check if summary.md exists → incremental update vs fresh generation from template
  5. Generate/update sections with 200-line conciseness constraint (NFR3)
  6. Update frontmatter tracking state (`oat_summary_last_task`, `oat_summary_revision_count`, `oat_summary_includes_revisions`)
  7. Commit
- **Incremental update logic:** Compare frontmatter tracking fields to current state; update only changed sections; no-op if nothing new
- **Section omission rule:** Omit sections with no content. Minimum viable = Overview + What Was Implemented + Key Decisions. Associated Issues and Integration Notes fold into other sections for most projects.
- **Success criteria**

**Step 2: Verify**

Run: `head -10 .agents/skills/oat-project-summary/SKILL.md`
Expected: Valid skill frontmatter with correct name and version

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-summary/
git commit -m "feat(p01-t02): create oat-project-summary skill"
```

---

### Task p01-t03: Update bundle-assets.sh for summary template and skill

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh`

**Step 1: Add skill to SKILLS array**

Add `oat-project-summary` to the `SKILLS=(...)` array in alphabetical order (after `oat-project-spec`).

**Step 2: Verify template bundling**

The existing script copies all templates via glob from `.oat/templates/`. Verify `summary.md` is included after build.

**Step 3: Verify**

Run: `pnpm build && ls packages/cli/assets/skills/oat-project-summary/SKILL.md && ls packages/cli/assets/templates/summary.md`
Expected: Both files exist in assets after build

**Step 4: Commit**

```bash
git add packages/cli/scripts/bundle-assets.sh
git commit -m "feat(p01-t03): bundle summary skill and template"
```

---

## Phase 2: pr_open Status + Revision Skill

### Task p02-t01: Update oat-project-pr-final — pr_open status

**Files:**

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`

**Step 1: Update Step 6 (Update Project State Milestone)**

Replace the current Step 6 content. Current behavior sets next milestone to "Run `oat-project-complete`." New behavior:

- Set `state.md` frontmatter: `oat_phase_status: pr_open`, `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- Set `state.md` content:
  - Current Phase: "Implementation — PR open, awaiting human review."
  - Progress: add "✓ PR created" and "⧗ Awaiting human review"
  - Next Milestone: "PR is open for review.\n- To incorporate feedback: run `oat-project-revise`\n- When approved: run `oat-project-complete`"

**Step 2: Verify**

Run: `grep -c "pr_open" .agents/skills/oat-project-pr-final/SKILL.md`
Expected: At least 1 match

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-pr-final/SKILL.md
git commit -m "feat(p02-t01): pr-final sets pr_open status after PR creation"
```

---

### Task p02-t02: Create oat-project-revise skill

**Files:**

- Create: `.agents/skills/oat-project-revise/SKILL.md`

**Step 1: Create skill directory and SKILL.md**

Create the full skill file following the design's component specification. Include:

- **Frontmatter:** `name: oat-project-revise`, `version: 1.0.0`, `description: Use when a project has an open PR and human feedback needs to be incorporated. Creates revision tasks and re-enters implementation.`, `disable-model-invocation: true`, `user-invocable: true`, `allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion`
- **Mode assertion:** OAT MODE: Revision
- **Progress indicators:** Banner + step indicators
- **Process steps** from design:
  1. Resolve active project (standard Step 0)
  2. Read state.md — confirm revisable state (pr_open, in_progress, or complete)
  3. Pre-PR guard: warn if no PR artifact at `{PROJECT_PATH}/pr/project-pr-*.md`, allow user to proceed
  4. Detect feedback source: inline text vs GitHub PR vs review artifact
  5. **Inline path:** Parse feedback → create `p-revN` phase in plan.md (_before_ `## Implementation Complete`) with `prevN-tNN` task IDs and `(revision)` prefix → update `## Implementation Complete` totals → update implementation.md with "Revision Received" entry → set state `oat_phase_status: in_progress`, `oat_current_task: prevN-t01` → route to implement
  6. **Delegated paths:** Set state to `in_progress` → delegate to `oat-project-review-receive-remote` (GitHub PR) or `oat-project-review-receive` (review artifact). These use existing `(review)` conventions, not `(revision)` format. After delegation: return to `pr_open` if no tasks, stay `in_progress` if tasks added.
  7. After revision/review tasks complete (handled by implement skill): state returns to `pr_open`
- **Key design decisions:** Inline skips severity triage. Delegated paths use existing review-receive conventions. Revise adds state management + "don't start new project" framing.
- **Success criteria**

**Step 2: Verify**

Run: `head -10 .agents/skills/oat-project-revise/SKILL.md`
Expected: Valid skill frontmatter

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-revise/
git commit -m "feat(p02-t02): create oat-project-revise skill for post-PR feedback"
```

---

### Task p02-t03: Update oat-project-complete — permissiveness (FR7)

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Step 1: Add phase status permissiveness**

At the start of Step 3 (Check Completion Gates), add explicit handling:

- Read `oat_phase_status` from state.md
- `in_progress`: Note "Project is still in progress. Completing anyway." — proceed
- `complete`: Proceed normally
- `pr_open`: Proceed normally (expected entry point after pr-final)
- All three are valid. No additional confirmation for `pr_open`.

**Step 2: Verify**

Run: `grep -c "pr_open" .agents/skills/oat-project-complete/SKILL.md`
Expected: At least 1 match

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md
git commit -m "feat(p02-t03): complete skill accepts pr_open and any phase status"
```

---

### Task p02-t04: Update bundle-assets.sh for revise skill

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh`

**Step 1: Add skill to SKILLS array**

Add `oat-project-revise` to `SKILLS=(...)` in alphabetical order (after `oat-project-reconcile`).

**Step 2: Verify**

Run: `pnpm build && ls packages/cli/assets/skills/oat-project-revise/SKILL.md`
Expected: File exists in assets

**Step 3: Commit**

```bash
git add packages/cli/scripts/bundle-assets.sh
git commit -m "feat(p02-t04): bundle revise skill"
```

---

## Phase 3: Skill Integration — Summary + Auto-Review

### Task p03-t01: Update oat-project-pr-final — summary integration (FR3)

**Files:**

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`

**Step 1: Add summary check to Step 3 (Collect Project Summary)**

Before reading artifacts:

1. Check if `{PROJECT_PATH}/summary.md` exists
2. If missing: invoke `oat-project-summary`. If fails or declined, fall back to raw artifact synthesis.
3. If exists: read and use as primary source for PR description `## Summary` section
4. PR Summary = condensed version of summary.md Overview + What Was Implemented (reviewer-oriented, not copy-paste)

**Step 2: Verify**

Run: `grep -c "summary.md" .agents/skills/oat-project-pr-final/SKILL.md`
Expected: At least 2 matches

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-pr-final/SKILL.md
git commit -m "feat(p03-t01): pr-final uses summary.md as PR description source"
```

---

### Task p03-t02: Update oat-project-complete — summary gate (FR4)

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Step 1: Add Step 3.5 (Summary Gate)**

Insert between Step 3 (gates) and Step 4 (archive reviews):

1. Check if `{PROJECT_PATH}/summary.md` exists
2. If missing: suggest "Generate project summary before completing?" → invoke `oat-project-summary` if agreed
3. If generation fails mid-way: warn, clean up partial file, proceed without
4. If user declines: warn and proceed (not a hard gate)
5. If exists: note as available for archive cover page

**Step 2: Update Step 7 (Generate PR Description)**

Note: if summary.md exists, pass to pr-final process as source.

**Step 3: Verify**

Run: `grep -c "summary" .agents/skills/oat-project-complete/SKILL.md`
Expected: At least 3 matches

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md
git commit -m "feat(p03-t02): complete skill generates summary if missing"
```

---

### Task p03-t03: Update oat-project-implement — auto-review at checkpoints (FR8)

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Update Step 2.5 — auto-review prompt (Touchpoint A)**

Add a fourth question after checkpoint behavior choice, with config-aware default:

- Read `.oat/config.json` `autoReviewAtCheckpoints`
- If config explicitly `true`: skip prompt, write `oat_auto_review_at_checkpoints: true` to plan.md frontmatter, print "Auto-review at checkpoints: enabled (from config)"
- If config `false` or absent: ask "Auto-review at checkpoints? (yes/no, default: no)"
- Write confirmed value to plan.md frontmatter alongside `oat_plan_hill_phases`
- On resume: if `oat_auto_review_at_checkpoints` already in frontmatter, skip entirely

**Step 2: Update Step 8 — auto-review trigger (Touchpoint B)**

After all tasks in a checkpoint phase complete, before pausing:

1. Read `oat_auto_review_at_checkpoints` from plan.md frontmatter (fall back to config)
2. If enabled: find last **`passed`** review row (`fixes_added`/`fixes_completed` don't count). Scope = phases since last passed + 1 through current. Final phase → scope `final`.
3. Spawn: `oat-project-review-provide code {scope}` with `oat_review_invocation: auto` context
4. Auto-invoke: `oat-project-review-receive` with auto-disposition mode
5. Fix tasks added → continue implementing automatically
6. Scope passed → proceed to checkpoint pause

**Step 3: Verify**

Run: `grep -c "auto_review" .agents/skills/oat-project-implement/SKILL.md`
Expected: At least 3 matches

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p03-t03): implement skill auto-reviews at checkpoints when configured"
```

---

### Task p03-t04: Update oat-project-implement — post-completion guidance + revision handling (FR9)

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Update Step 15 (Prompt for PR) — post-completion guidance**

Replace "Open PR now / Exit" with:

```
Final review passed. Next steps:
1. Generate project summary (oat-project-summary)
2. Sync documentation (oat-project-document) — if applicable
3. Create final PR (oat-project-pr-final)
Or: Run all three in sequence now?
```

Do not route directly to complete. pr-final sets `pr_open` which guides to revise or complete.

**Step 2: Update Step 3 — revision task recognition**

Add: when resuming, detect `p-revN` phases in plan.md. Treat `prevN-tNN` task IDs identically to `pNN-tNN` for execution.

**Step 3: Add revision phase completion handling**

After all tasks in a `p-revN` phase complete:

- Set `oat_phase_status: pr_open`, `oat_current_task: null`
- Invoke `oat-project-summary` to update summary.md (implement owns this)
- Next milestone: "Revision complete. Push changes. Run oat-project-revise for more feedback or oat-project-complete when approved."

**Step 4: Verify**

Run: `grep -c "p-rev" .agents/skills/oat-project-implement/SKILL.md`
Expected: At least 2 matches

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p03-t04): implement handles revisions and updated post-completion guidance"
```

---

### Task p03-t05: Update review-provide + review-receive — auto-review invocation contract

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`

**Step 1: Update review-provide — auto-review frontmatter**

Document: when spawned by auto-review (implement skill passes context), include `oat_review_invocation: auto` in the generated review artifact's frontmatter alongside `oat_review_scope` and `oat_review_type`.

**Step 2: Update review-receive — auto-disposition mode**

In Step 2.6, add handling for `oat_review_invocation: auto`:

- Critical/Important/Medium: convert to fix tasks (same as manual)
- Minor: auto-convert to fix tasks unless clearly out of scope (unlike manual which auto-defers for non-final scopes)
- No user prompts for disposition
- Genuinely ambiguous findings deferred with a note

**Step 3: Verify**

Run: `grep -c "oat_review_invocation" .agents/skills/oat-project-review-provide/SKILL.md && grep -c "oat_review_invocation" .agents/skills/oat-project-review-receive/SKILL.md`
Expected: At least 1 match in each

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md
git commit -m "feat(p03-t05): review skills support auto-review invocation contract"
```

---

### Task p03-t06: Add autoReviewAtCheckpoints to config.json

**Files:**

- Modify: `.oat/config.json`

**Step 1: Add config key**

Add `"autoReviewAtCheckpoints": false` to `.oat/config.json` (default off).

**Step 2: Verify**

Run: `grep "autoReviewAtCheckpoints" .oat/config.json`
Expected: 1 match

**Step 3: Commit**

```bash
git add .oat/config.json
git commit -m "feat(p03-t06): add autoReviewAtCheckpoints config key (default false)"
```

---

## Phase 4: CLI Runtime + Templates

### Task p04-t01: Update state/generate.ts — pr_open routing

**Files:**

- Modify: `packages/cli/src/commands/state/generate.ts`
- Modify or create: test file for state generation (co-located)

**Step 1: Write test (RED)**

Add test case for `pr_open` routing:

- Input: `phase: 'implement'`, `phaseStatus: 'pr_open'`
- Expected: route step mentions `oat-project-revise` and/or `oat-project-complete`, reason describes "PR open"

**Step 2: Implement (GREEN)**

Add `pr_open` to the routing logic in `generate.ts`. Two options based on code structure:

Option A — add to `sharedMap` (around line 385):

```typescript
'implement:pr_open': {
  step: 'oat-project-revise',
  reason: 'PR open — run oat-project-revise for feedback or oat-project-complete when approved',
},
```

Option B — add as a dedicated block after the `implement:complete` handling (around line 403).

Choose whichever matches existing code style better.

**Step 3: Verify**

Run: `pnpm --filter @tkstang/oat-cli test && pnpm --filter @tkstang/oat-cli type-check`
Expected: All pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/state/
git commit -m "feat(p04-t01): state routing handles pr_open phase status"
```

---

### Task p04-t02: Update config schema + get/set for autoReviewAtCheckpoints

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Add test cases:

- `oat config get autoReviewAtCheckpoints` returns value from config.json
- `oat config set autoReviewAtCheckpoints true` writes to config.json

**Step 2: Update OatConfig interface**

In `oat-config.ts` line ~15-21, add to `OatConfig`:

```typescript
export interface OatConfig {
  version: number;
  worktrees?: { root: string };
  projects?: { root: string };
  documentation?: OatDocumentationConfig;
  localPaths?: string[];
  autoReviewAtCheckpoints?: boolean; // NEW
}
```

**Step 3: Update config get/set command**

In `config/index.ts`, add `autoReviewAtCheckpoints` as a recognized key routed to `config.json`. Follow existing patterns for boolean config values.

**Step 4: Verify**

Run: `pnpm --filter @tkstang/oat-cli test && pnpm --filter @tkstang/oat-cli type-check`
Expected: All pass

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p04-t02): config schema and get/set support autoReviewAtCheckpoints"
```

---

### Task p04-t03: Update state.md template + verify bundling

**Files:**

- Modify: `.oat/templates/state.md`

**Step 1: Update state.md template**

Change the `oat_phase_status` comment from:

```yaml
oat_phase_status: in_progress # Status: in_progress | complete
```

to:

```yaml
oat_phase_status: in_progress # Status: in_progress | complete | pr_open
```

**Step 2: Verify bundling**

Confirm `bundle-assets.sh` SKILLS array includes both `oat-project-summary` and `oat-project-revise` (added in p01-t03 and p02-t04).

**Step 3: Verify**

Run: `pnpm build`
Expected: Build succeeds, assets include updated template and both new skills

**Step 4: Commit**

```bash
git add .oat/templates/state.md
git commit -m "feat(p04-t03): state template shows pr_open as valid status"
```

---

## Phase 5: Documentation + Diagnostics

### Task p05-t01: Update bundled workflow docs — lifecycle + state machine

**Files:**

- Modify: `packages/cli/assets/docs/guide/workflow/lifecycle.md`
- Modify: `packages/cli/assets/docs/guide/workflow/state-machine.md`

**Step 1: Update lifecycle.md**

Add sections documenting:

- Summary artifact as first-class project artifact
- `pr_open` phase status and what it signals
- Revision loop: pr_open → revise → in_progress → implement → pr_open
- Auto-review at checkpoints (opt-in)
- Updated post-implementation flow: implement → summary → document → pr-final → pr_open → (revise) → complete

**Step 2: Update state-machine.md**

Add `pr_open` transitions:

- `implement:complete → implement:pr_open` (via pr-final)
- `implement:pr_open → implement:in_progress` (via revise)
- `implement:in_progress → implement:pr_open` (revision complete)
- `implement:pr_open → lifecycle:complete` (via complete)
- Include the revision loop diagram

**Step 3: Verify**

Run: `grep -c "pr_open" packages/cli/assets/docs/guide/workflow/lifecycle.md && grep -c "pr_open" packages/cli/assets/docs/guide/workflow/state-machine.md`
Expected: Multiple matches in both

**Step 4: Commit**

```bash
git add packages/cli/assets/docs/guide/workflow/lifecycle.md packages/cli/assets/docs/guide/workflow/state-machine.md
git commit -m "docs(p05-t01): lifecycle and state machine docs cover pr_open and revision loop"
```

---

### Task p05-t02: Update bundled reference docs — directory structure

**Files:**

- Modify: `packages/cli/assets/docs/reference/oat-directory-structure.md`

**Step 1: Document new config key**

Add `autoReviewAtCheckpoints` to config keys: "Boolean (default: false). When true, completing a plan phase checkpoint automatically spawns a subagent code review."

**Step 2: Document new artifact**

Add `summary.md` to project artifacts: "Institutional memory artifact generated from project lifecycle artifacts."

**Step 3: Verify**

Run: `grep "autoReviewAtCheckpoints" packages/cli/assets/docs/reference/oat-directory-structure.md && grep "summary.md" packages/cli/assets/docs/reference/oat-directory-structure.md`
Expected: At least 1 match each

**Step 4: Commit**

```bash
git add packages/cli/assets/docs/reference/oat-directory-structure.md
git commit -m "docs(p05-t02): reference docs cover autoReviewAtCheckpoints and summary.md"
```

---

### Task p05-t03: Update app docs + oat-doctor skill manifest

**Files:**

- Modify: `apps/oat-docs/docs/guide/workflow/lifecycle.md`
- Modify: `apps/oat-docs/docs/guide/workflow/state-machine.md`
- Modify: `.agents/skills/oat-doctor/SKILL.md`

**Step 1: Mirror bundled docs to app docs**

Copy lifecycle.md and state-machine.md changes from p05-t01 into app docs versions.

**Step 2: Update oat-doctor skill manifest**

Add `oat-project-summary` and `oat-project-revise` to the bundled skill manifest list in alphabetical order.

**Step 3: Verify**

Run: `pnpm build:docs`
Expected: Docs build succeeds

Run: `grep "oat-project-summary" .agents/skills/oat-doctor/SKILL.md && grep "oat-project-revise" .agents/skills/oat-doctor/SKILL.md`
Expected: Both listed

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/guide/workflow/lifecycle.md apps/oat-docs/docs/guide/workflow/state-machine.md .agents/skills/oat-doctor/SKILL.md
git commit -m "docs(p05-t03): app docs mirror lifecycle changes, doctor knows new skills"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| p04    | code     | pending | -    | -        |
| p05    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks — Summary artifact template + skill + bundling
- Phase 2: 4 tasks — pr_open in pr-final + revise skill + complete permissiveness + bundling
- Phase 3: 6 tasks — Summary in pr-final/complete + auto-review in implement + revision handling + review contract + config
- Phase 4: 3 tasks — CLI state routing + config schema + state template
- Phase 5: 3 tasks — Lifecycle docs + reference docs + app docs/doctor

**Total: 19 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
