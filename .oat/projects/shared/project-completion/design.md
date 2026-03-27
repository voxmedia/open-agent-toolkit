---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-03-27
oat_generated: false
oat_template: false
---

# Design: project-completion

## Overview

This project extends the OAT project lifecycle with three coordinated capabilities: a durable summary artifact (`summary.md`), a post-PR revision workflow (the `pr_open` phase status + `oat-project-revise` skill), and automatic subagent review triggering at plan phase checkpoints. The design adds two new skills and modifies three existing skills while introducing one new artifact type, one new phase status value, and one new configuration key.

The approach is incremental: it extends existing lifecycle patterns (declarative frontmatter, phase-based state machine, review-receive task conversion) rather than introducing new architectural concepts. The summary skill follows the same read-artifacts-then-synthesize pattern used by `oat-project-pr-final`. The revision skill reuses the `review-receive` task conversion model but with a simpler inline path. Auto-review at checkpoints is a behavior change in the implement skill gated by configuration.

Changes span the skill layer (markdown instruction files), configuration schema, CLI state routing, and documentation. The bulk of the work is new and updated skills; targeted CLI runtime updates handle `pr_open` state routing and `autoReviewAtCheckpoints` config; docs and diagnostics are updated to reflect the new concepts.

## Architecture

### System Context

The changes live entirely within the OAT skill and artifact system. The affected boundary is the post-implementation lifecycle: everything from "final review passes" through "project archived."

**What this extends:**

- The skill chain: implement → pr-final → complete (adding summary and revise as new nodes)
- The `state.md` phase status vocabulary: adding `pr_open` alongside `in_progress` and `complete`
- The `plan.md` structure: adding revision phases (`p-revN`) alongside standard phases (`pNN`)
- The OAT configuration system: adding `autoReviewAtCheckpoints` key

**What this does NOT touch:**

- The discovery → spec → design → plan workflow
- The `oat-project-review-provide` skill (it already supports arbitrary scopes)
- The `oat-project-document` or `oat-pjm-update-repo-reference` skills
- CLI runtime beyond targeted updates: state generation routing (`pr_open`), config schema (`autoReviewAtCheckpoints`), and config get/set

### Key Components

- **`oat-project-summary`** (new skill): Reads project artifacts and generates `summary.md` with frontmatter-based state tracking for incremental updates
- **`oat-project-revise`** (new skill): Unified re-entry point for post-PR feedback — routes inline, GitHub PR, or review artifact feedback into revision tasks
- **`oat-project-implement`** (updated): Auto-review at checkpoints + updated post-completion guidance + revision task handling
- **`oat-project-pr-final`** (updated): Sets `pr_open` status + uses `summary.md` as PR description source
- **`oat-project-complete`** (updated): Invokes summary if missing + accepts any phase status permissively

### Component Diagram

```
                    ┌─────────────────────┐
                    │  oat-project-       │
                    │  implement          │
                    │  (updated)          │
                    └────────┬────────────┘
                             │ all tasks complete + final review passed
                             ▼
                    ┌─────────────────────┐
                    │  oat-project-       │
                    │  summary            │◄──── re-run after revisions
                    │  (new)              │
                    └────────┬────────────┘
                             │ summary.md generated
                             ▼
                    ┌─────────────────────┐
                    │  oat-project-       │
                    │  pr-final           │
                    │  (updated)          │
                    └────────┬────────────┘
                             │ PR created, sets pr_open
                             ▼
                ┌────────────────────────────┐
                │   state: pr_open           │
                │   "awaiting human review"  │
                └──────┬──────────────┬──────┘
                       │              │
            feedback   │              │ approved
                       ▼              ▼
              ┌──────────────┐  ┌──────────────────┐
              │ oat-project- │  │  oat-project-     │
              │ revise       │  │  complete          │
              │ (new)        │  │  (updated)         │
              └──────┬───────┘  └──────────────────┘
                     │
                     │ creates p-revN tasks
                     ▼
              ┌──────────────┐
              │ oat-project- │
              │ implement    │──── executes revision tasks
              └──────┬───────┘
                     │ revision tasks complete
                     ▼
              back to pr_open
```

**Auto-review at checkpoints (within implement):**

```
  Phase pNN tasks complete
           │
           ▼
  Is auto-review enabled?
     │            │
     no           yes
     │            │
     ▼            ▼
  Pause at     Spawn subagent:
  checkpoint   review-provide code pNN
                  │
                  ▼
               Auto-invoke
               review-receive
                  │
            ┌─────┴─────┐
            │            │
         findings     no findings
            │            │
            ▼            ▼
         Fix tasks    Pause at
         added →      checkpoint
         continue
         implementing
```

### Data Flow: State Transition Diagram

```
oat_phase_status values:

  in_progress ──────────────────────────────────────┐
       │                                             │
       │ all tasks + final review passed             │
       ▼                                             │
  complete ─────┐                                    │
       │        │                                    │
       │        │ oat-project-pr-final               │
       │        ▼                                    │
       │   pr_open ◄─────────────────────────────────┤
       │     │   │                                   │
       │     │   │ oat-project-revise                │
       │     │   └──► in_progress ───────────────────┘
       │     │         (revision tasks)
       │     │
       │     │ oat-project-complete (from any status)
       ▼     ▼
  ┌──────────────┐
  │  lifecycle   │
  │  complete    │
  └──────────────┘

Valid transitions:
  in_progress → complete (final review passed)
  complete → pr_open (pr-final runs)
  pr_open → in_progress (revise starts revision)
  in_progress → pr_open (revision tasks complete)
  {any} → lifecycle complete (oat-project-complete)
```

### Data Flow: Summary Generation

```
  ┌────────────┐   ┌───────────┐   ┌──────────┐   ┌──────────────────┐
  │ discovery  │   │ design    │   │ plan     │   │ implementation   │
  │ .md        │   │ .md       │   │ .md      │   │ .md              │
  └─────┬──────┘   └─────┬─────┘   └────┬─────┘   └────────┬─────────┘
        │                │              │                    │
        └────────┬───────┴──────┬───────┘                   │
                 │              │                            │
                 ▼              ▼                            ▼
          ┌─────────────────────────────────────────────────────┐
          │              oat-project-summary                     │
          │                                                     │
          │  1. Read all artifacts                               │
          │  2. Check frontmatter: what has summary "seen"?     │
          │  3. Synthesize / incrementally update sections       │
          │  4. Update frontmatter tracking state               │
          └──────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │  summary.md  │
                          └──────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
             ┌──────────────┐         ┌──────────────┐
             │  pr-final    │         │  complete     │
             │  (Summary    │         │  (archive     │
             │   section)   │         │   cover page) │
             └──────────────┘         └──────────────┘
```

## Component Design

### oat-project-summary (New Skill)

**Purpose:** Generate a durable project summary artifact from project lifecycle artifacts.

**Responsibilities:**

- Read all project artifacts (discovery, design, plan, implementation) to understand what happened
- Synthesize a structured 10-section summary document grounded in actual outcomes, not plans
- Track generation state via frontmatter so re-runs after revisions perform incremental updates
- Omit sections that don't apply to the specific project (e.g., revision history when no revisions occurred)
- Remain idempotent when nothing has changed since the last run

**Skill Frontmatter:**

```yaml
---
name: oat-project-summary
version: 1.0.0
description: Use when a project needs a summary artifact. Generates summary.md from project artifacts as institutional memory.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---
```

**Process:**

1. Resolve active project (standard Step 0 pattern)
2. Check implementation state — implementation.md must exist with meaningful progress
3. Read all project artifacts: discovery.md, design.md, plan.md, implementation.md
4. Check if summary.md exists:
   - **If exists:** Read frontmatter tracking fields. Determine what's new since last generation.
   - **If not:** Initialize from `.oat/templates/summary.md`
5. Generate/update summary sections (see Data Models for section structure)
   - **Conciseness constraint (NFR3):** Target under 200 lines total. If a draft exceeds this, trim narrative sections (What Was Implemented, Notable Challenges) to essential points only. Revision History entries are capped at 2-3 sentences per round.
6. Update summary frontmatter tracking state
7. Commit: `docs: generate summary for {project-name}`
8. Output: "Summary generated for {project-name}. Sections: {list of non-empty sections}."

**Incremental Update Logic:**

```
On re-run:
  current_last_task = last task ID in implementation.md (completed tasks)
  current_rev_count = count of p-revN phases in plan.md
  current_rev_list  = list of p-revN phase IDs in plan.md

  if summary.oat_summary_last_task == current_last_task
     AND summary.oat_summary_revision_count == current_rev_count:
    → No changes detected. Skip update.

  if current_rev_count > summary.oat_summary_revision_count:
    → New revision phases exist. Update:
      - "Revision History" section (add new revision entries)
      - "What Was Implemented" section (add revision outcomes)
      - "Follow-up Items" section (check for new deferred work)

  if current_last_task > summary.oat_summary_last_task:
    → New tasks completed. Update:
      - "What Was Implemented" section
      - "Notable Challenges" section (check new task notes)
      - "Tradeoffs Made" section (check new task decisions)
```

**Dependencies:**

- Project artifacts: discovery.md, design.md, plan.md, implementation.md
- Template: `.oat/templates/summary.md`
- Standard OAT project resolution and config patterns

**Design Decisions:**

- **Standalone skill, not embedded in complete:** Summary is useful before complete (feeds PR description, posts to Linear). Making it standalone enables the "generate summary → pr-final → revise → re-generate summary" loop.
- **Frontmatter tracking over diffing:** Using explicit frontmatter fields (last_task, revision_count) is more reliable than trying to diff the summary content itself. It's also inspectable by humans.
- **Omit rather than empty:** Sections with no content are omitted entirely rather than showing "N/A" placeholders. This keeps summaries concise (NFR3).

### oat-project-revise (New Skill)

**Purpose:** Unified re-entry point for post-PR human feedback that creates revision tasks without starting a new project.

**Responsibilities:**

- Detect feedback source: inline conversation, GitHub PR comments, or review artifact
- For inline feedback: create revision tasks directly (no severity classification or triage ceremony)
- For GitHub PR feedback: delegate to `oat-project-review-receive-remote`
- For review artifact feedback: delegate to `oat-project-review-receive`
- Create `p-revN` revision phases in plan.md with proper task ID conventions
- Manage state transitions: `pr_open` → `in_progress` → (implement) → `pr_open`

**Skill Frontmatter:**

```yaml
---
name: oat-project-revise
version: 1.0.0
description: Use when a project has an open PR and human feedback needs to be incorporated. Creates revision tasks and re-enters implementation.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---
```

**Process:**

1. Resolve active project (standard Step 0 pattern)
2. Read state.md — confirm project is in a revisable state (pr_open or in_progress or complete)
3. **Pre-PR guard:** If `oat_phase_status` is `in_progress` and no PR artifact exists at `{PROJECT_PATH}/pr/project-pr-*.md`:
   - Warn: "No PR has been created yet. Revise is designed for post-PR feedback. Continue anyway?"
   - If user declines: exit. If user confirms: proceed (the revision workflow is still valid for pre-PR inline feedback, just potentially premature).
4. Detect feedback source:
   - If user provides inline text → inline path (Step 5)
   - If user says "GitHub PR" or provides PR number → delegated path: GitHub PR (Step 6)
   - If user references a review artifact → delegated path: review artifact (Step 6)
5. **Inline path (the new behavior):**
   a. Parse user's feedback into discrete change items
   b. Determine next revision phase number:

   ```
   existing_revs = count of p-revN phases in plan.md
   next_rev = p-rev{existing_revs + 1}
   ```

   c. Create revision phase in plan.md with tasks (placed _before_ `## Implementation Complete`):

   ```markdown
   ## Phase p-rev1: Revision 1

   ### Task prev1-t01: (revision) {Change description}

   **Files:**

   - Modify: `{file}`

   **Step 1:** {What to change}
   **Step 2:** Verify
   **Step 3:** Commit
   ```

   d. Update plan.md `## Implementation Complete` totals to include revision phases/tasks
   e. Update implementation.md with "Revision Received" entry
   f. Update state.md:
   - `oat_phase_status: in_progress`
   - `oat_current_task: prev1-t01`
     g. Route to `oat-project-implement` for execution

6. **Delegated paths (GitHub PR / review artifact):**
   a. Set state.md `oat_phase_status: in_progress` (the state management revise adds)
   b. Delegate to the appropriate skill:
   - GitHub PR → `oat-project-review-receive-remote`
   - Review artifact → `oat-project-review-receive`
     c. These skills use their existing conventions: `(review)` task prefix, severity classification, standard task IDs (appended to the last plan phase, not in `p-revN` phases). This is correct — structured review feedback should go through the structured triage model.
     d. After delegation completes, update state based on outcome:
   - If fix tasks were added: state stays `in_progress`, route to implement
   - If no actionable findings: return to `pr_open`
     e. **What revise adds over invoking review-receive directly:** The state transition management (`pr_open` → `in_progress` → `pr_open`) and the "don't start a new project" framing. Without revise, an agent in a new session seeing `pr_open` wouldn't know to invoke review-receive.
7. **After revision/review tasks complete** (handled by implement skill):
   - Set `oat_phase_status: pr_open`
   - Push changes to update the PR

**Inline Feedback Parsing:**

Unlike review-receive, inline feedback does NOT use the severity classification model (Critical/Important/Medium/Minor). Instead:

- Each discrete change the user describes becomes one task
- Tasks are prefixed with `(revision)` following the `(review)` convention in review-receive
- No triage prompt — all requested changes become tasks
- The agent may ask clarifying questions about ambiguous feedback but does not gate on severity

**State Transition Detail:**

```
Entry state: pr_open (or complete/in_progress — permissive)
  │
  ▼ oat-project-revise creates tasks
  state: in_progress, oat_current_task: prevN-t01
  │
  ▼ oat-project-implement executes revision tasks
  │
  ▼ all revision tasks complete
  state: pr_open, oat_current_task: null
  Next milestone: "Revision complete. Run oat-project-revise for more feedback
                   or oat-project-complete when approved."
```

**Dependencies:**

- `oat-project-review-receive-remote` (for GitHub PR delegation)
- `oat-project-review-receive` (for review artifact delegation)
- `oat-project-implement` (for executing revision tasks — implement also owns summary re-generation at revision phase completion)

**Design Decisions:**

- **No severity classification for inline feedback:** The user is telling us directly what to change. There's no ambiguity about whether something is Critical vs Medium — it's all "do this." Severity classification adds friction without value in the inline case.
- **Revision phases are separate from original phases:** Using `p-revN` naming makes it clear these are post-PR revision work, not original plan tasks. This prevents confusion when reading plan.md.
- **Returns to pr_open, not complete:** After revisions, the PR is updated but still open for review. The user must explicitly run `oat-project-complete` to close the project. This prevents premature closure.

### oat-project-implement (Updated)

**Purpose:** Execute plan tasks sequentially with state tracking. Updated for auto-review, post-completion guidance, and revision handling.

**Changes from current version:**

#### Change 1: Auto-Review at Checkpoints (FR8)

**Location:** Two touchpoints in the implement skill.

**Touchpoint A: Step 2.5 (Confirm Plan HiLL Checkpoints) — first run only.**

Read `.oat/config.json` `autoReviewAtCheckpoints` first:

- **If config explicitly sets `true`:** Skip the prompt. Write `oat_auto_review_at_checkpoints: true` to plan.md frontmatter silently, and note "Auto-review at checkpoints: enabled (from config)" in the checkpoint summary output.
- **If config is `false` or absent (default):** Add one question after the checkpoint behavior choice:

```
4. Auto-review at checkpoints?
   - yes: automatically spawn a subagent code review when a checkpoint phase completes
   - no (default): manual review triggering (current behavior)
```

When user confirms: write `oat_auto_review_at_checkpoints: true|false` to `plan.md` frontmatter alongside `oat_plan_hill_phases`. On resume runs: if `oat_auto_review_at_checkpoints` is already present in plan.md frontmatter, skip Touchpoint A entirely — do not re-ask, do not re-read config, do not print the auto-review note. The stored value is authoritative.

**Touchpoint B: Step 8 (Check Plan Phase Completion) — runtime behavior.**

After all tasks in a checkpoint phase complete, before pausing for user:

1. Read `oat_auto_review_at_checkpoints` from plan.md frontmatter (already confirmed in Step 2.5).
   - If not present in frontmatter, fall back to `.oat/config.json` `autoReviewAtCheckpoints` (default: false).

2. If enabled, determine review scope:
   - Find the last checkpoint phase that has a **`passed`** review row in plan.md Reviews table. Rows with `fixes_added` or `fixes_completed` do NOT count — those reviews didn't pass and should be re-covered by the next scope.
   - Scope = all phases from (last passed checkpoint + 1) through current checkpoint
   - Example: checkpoints at p02, p05. Completing p02 → scope is "p01-p02". Completing p05 → scope is "p03-p05" (assuming p02 review passed). If p02 review had `fixes_added` (not `passed`), completing p05 → scope is "p01-p05".
   - Special case: if this is the final phase, use scope `final` (triggers `code final` review)

3. Spawn subagent review:

   ```
   oat-project-review-provide code {scope}
   ```

4. Auto-invoke review-receive with auto-disposition mode:

   ```
   oat-project-review-receive
   ```

   When invoked as part of auto-review (not manually by the user), review-receive operates with relaxed disposition defaults:
   - **Critical/Important/Medium:** Convert to fix tasks (same as manual mode)
   - **Minor:** Auto-convert to fix tasks unless clearly out of scope (e.g., cosmetic polish unrelated to the changed code). In manual mode, minors are auto-deferred for non-final scopes — but in auto-review mode, the goal is to fix everything while context is fresh, so minors are included by default.
   - **No user prompts for disposition:** The auto-review path should not pause for triage decisions. Findings that genuinely need human judgment (e.g., an ambiguous medium the agent disagrees with) are deferred with a note, not held for interactive resolution.

   **Invocation detection contract:** The review artifact frontmatter carries the signal. When `oat-project-review-provide` is spawned by auto-review, the implement skill instructs it to include `oat_review_invocation: auto` in the generated review artifact's frontmatter (alongside the existing `oat_review_scope`, `oat_review_type` fields). Review-receive already reads artifact frontmatter — it checks for `oat_review_invocation: auto` and adjusts disposition defaults accordingly. No new files or side channels needed.

5. If review-receive adds fix tasks: continue implementing (these are added to the current phase, implementation resumes automatically — no user prompt)
6. If review-receive marks scope as passed: proceed to checkpoint pause

**Scope calculation pseudocode:**

```
checkpoints = oat_plan_hill_phases from plan.md  # e.g., ["p02", "p05"]
all_phases = ordered list of all pNN phases in plan.md
current_phase = phase just completed

# Find last reviewed phase from Reviews table
reviewed_phases = phases with a "passed" row in Reviews table
last_reviewed = max(reviewed_phases) or null

# Determine scope start
if last_reviewed:
  scope_start = phase after last_reviewed
else:
  scope_start = first phase (p01)

scope_end = current_phase

if current_phase == all_phases[-1]:  # final phase
  scope = "final"
else:
  scope = "{scope_start}-{scope_end}"
```

#### Change 2: Updated Post-Completion Guidance (FR9)

**Location:** Step 15 (Prompt for PR), after final review passes.

**Current behavior:** Offers "Open PR now" or "Exit."

**New behavior:**

```
Final review passed for {project-name}.

All tasks complete and verified. Next steps:

1. Generate project summary (oat-project-summary)
2. Sync documentation (oat-project-document) — if applicable
3. Create final PR (oat-project-pr-final)

Or: Run all three in sequence now?

Choose:
```

The implement skill no longer routes directly to `oat-project-complete`. Instead, it routes to summary → document → pr-final. The `pr_open` status set by pr-final then guides the user to revise or complete.

#### Change 3: Revision Task Handling (FR6/FR9)

**Location:** Step 3 (Check Implementation State) and Step 8 (Phase Completion).

**New behavior in Step 3:**

- When resuming, detect `p-revN` phases in plan.md
- Treat them identically to regular `pNN` phases for execution purposes
- The `prev{N}-t{NN}` task ID format is recognized by the standard task ID parsing

**New behavior at revision phase completion:**

- After all tasks in a `p-revN` phase complete:
  - Set `oat_phase_status: pr_open` (not `complete`)
  - Set `oat_current_task: null`
  - Update summary.md if it exists (invoke oat-project-summary)
  - Next milestone: "Revision complete. Push changes to update PR. Run oat-project-revise for more feedback or oat-project-complete when approved."

**Dependencies:**

- `oat-project-review-provide` (for auto-review spawning)
- `oat-project-review-receive` (for auto-review findings processing)
- `oat-project-summary` (for post-revision summary update)

### oat-project-pr-final (Updated)

**Purpose:** Create final PR description. Updated to use summary.md as source and set pr_open status.

**Changes from current version:**

#### Change 1: Summary Integration (FR3)

**Location:** Step 3 (Collect Project Summary), before reading artifacts.

**New behavior:**

```
1. Check if summary.md exists at {PROJECT_PATH}/summary.md
2. If missing:
   a. Invoke oat-project-summary to generate it
   b. If generation fails or user declines, fall back to current behavior
      (synthesize from raw artifacts)
3. If exists:
   a. Read summary.md
   b. Use its content as the primary source for the PR description's
      "Summary" section
   c. Still read other artifacts for "Changes", "Verification", etc.
```

The PR description `## Summary` section should be a condensed version of summary.md's Overview + What Was Implemented sections, not a copy-paste. Keep it reviewer-oriented (actionable, concise) while summary.md is institutional memory (reflective, thorough).

#### Change 2: pr_open Status (FR5)

**Location:** Step 6 (Update Project State Milestone).

**Current behavior:**

```markdown
## Next Milestone

Run `oat-project-complete`.
```

**New behavior:**

Update `state.md` frontmatter:

- `oat_phase_status: pr_open`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

Update `state.md` content:

```markdown
## Current Phase

Implementation — PR open, awaiting human review.

## Next Milestone

PR is open for review.

- To incorporate feedback: run `oat-project-revise`
- When approved: run `oat-project-complete`
```

This is the critical change that eliminates the "dead zone" — agents reading state.md in a new session will see `pr_open` status and guidance pointing to revise/complete, not just complete.

### oat-project-complete (Updated)

**Purpose:** Mark project lifecycle as complete. Updated for summary integration and phase status permissiveness.

**Changes from current version:**

#### Change 1: Summary Integration (FR4)

**Location:** Between Step 3 (Check Completion Gates) and Step 7 (Generate PR Description).

**New step (Step 3.5): Summary Gate**

```
1. Check if summary.md exists at {PROJECT_PATH}/summary.md
2. If missing:
   a. Suggest: "No summary.md found. Generate project summary before completing?"
   b. If user agrees: invoke oat-project-summary
      - If generation succeeds: proceed with summary available
      - If generation fails mid-way (context limits, missing artifacts, etc.):
        warn "Summary generation failed: {reason}. Proceeding without summary."
        Do NOT leave a half-written summary.md — either it completes fully or
        clean up the partial file and proceed without it.
   c. If user declines: warn and proceed (summary is not a hard gate)
3. If exists: note as available for archive cover page
```

**In Step 7 (Generate PR Description):**

- If summary.md exists, pass it to the pr-final process as a source (same as FR3)

**In Step 8 (Archive):**

- summary.md is included in the archived project directory alongside all other artifacts
- It serves as the "cover page" — the first thing a future reader would check

#### Change 2: Permissiveness (FR7)

**Location:** Step 3 (Check Completion Gates) and throughout.

**Current behavior:** Implicitly expects `oat_phase_status: complete`.

**New behavior:**

At the start of Step 3, read `oat_phase_status` from state.md:

- `in_progress`: Proceed with a note — "Project is still in progress. Completing anyway."
- `complete`: Proceed normally
- `pr_open`: Proceed normally — this is the expected entry point after pr-final

All three are valid. No additional confirmation is required for `pr_open` (it's the happy path). The existing completion gates (final review, docs sync) remain as warnings, not hard blocks.

**Complete Flow Ordering (updated):**

```
Step 1:   Resolve project + detect shared status
Step 2:   Upfront user questions (archive? open PR?)
Step 3:   Check completion gates (warnings only)
Step 3.5: Summary gate (generate if missing, warn if declined)  ← NEW
Step 4:   Archive residual review artifacts
Step 5:   Set lifecycle complete
Step 6:   Clear active project pointer
Step 7:   Generate PR description (uses summary.md as source)  ← UPDATED
Step 8:   Archive project (conditional)
Step 9:   Regenerate dashboard
Step 10:  Commit + push
Step 11:  Open PR (conditional)
Step 12:  Confirm to user
```

## Data Models

### summary.md Frontmatter Schema

```yaml
---
oat_status: complete # in_progress | complete
oat_ready_for: null # not used for summary (no downstream phase)
oat_blockers: []
oat_last_updated: 2026-03-27 # date of last generation/update
oat_generated: true # always true (agent-generated)
oat_summary_last_task: p03-t05 # last task ID from implementation.md when generated
oat_summary_revision_count: 0 # number of p-revN phases in plan.md when generated
oat_summary_includes_revisions: [] # which p-revN phase IDs are reflected, e.g. ["p-rev1"]
---
```

**Field semantics:**

| Field                            | Type                     | Purpose                                                                                                                                     |
| -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat_summary_last_task`          | string (task ID) or null | The highest completed task ID from implementation.md at generation time. Used to detect new task completions on re-run.                     |
| `oat_summary_revision_count`     | integer                  | Count of `p-revN` phases in plan.md at generation time. Used to detect new revision phases on re-run.                                       |
| `oat_summary_includes_revisions` | string array             | List of `p-revN` phase IDs whose outcomes are reflected in the summary. Used to determine which revision phases need to be added on re-run. |

### summary.md Content Structure

```markdown
# Summary: {project-name}

## Overview

{2-3 sentences: what the project was and why it existed}

## What Was Implemented

{Capability-level narrative of what shipped. Grounded in implementation.md outcomes,
not design.md plans. Written for a reader who hasn't seen any other artifact.}

## Key Decisions

{Design choices with rationale. Pulled from design.md decisions and
implementation.md notes where the decision was made or changed during implementation.}

## Design Deltas

{Where the final result diverged from the original design and why. Pulled from
implementation.md deviations table. Omit if no deviations.}

## Notable Challenges

{What was harder than expected and how it was resolved. Pulled from implementation.md
task notes flagged as issues/blockers. Omit if none.}

## Tradeoffs Made

{Explicit tradeoffs with reasoning. Pulled from implementation.md decisions and
design.md tradeoff sections. Omit if none.}

## Integration Notes

{Things other projects, developers, or agents need to know when working in areas
this project touched. Omit if none.}

## Revision History

{If revisions happened post-PR, what changed and why. One entry per revision round,
2-3 sentences each. Omit if no revisions.}

## Follow-up Items

{Deferred work, known limitations, spawned backlog items with refs. Pulled from
implementation.md deferred findings and plan.md deferred items.}

## Associated Issues

{Which backlog items, Linear issues, or GitHub issues this project satisfied.
Pulled from state.md associated_issues field. Omit if none.}
```

**Section omission rule:** If a section would have no meaningful content for a given project, omit it entirely (don't include the heading). The minimum viable summary is: Overview + What Was Implemented + Key Decisions. In practice, most small projects will produce only these three plus Follow-up Items. Associated Issues and Integration Notes are included only when they have content worth calling out separately — for many projects, any relevant integration notes fold naturally into What Was Implemented, and associated issues fold into Follow-up Items.

### summary.md Template

Location: `.oat/templates/summary.md`

The template contains the section structure with guidance comments (similar to other OAT templates). It will be copied to the project directory and populated by the skill. The template frontmatter uses placeholder values:

```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: null
oat_generated: false
oat_summary_last_task: null
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---
```

### Revision Phase Format in plan.md

**Phase naming:** `p-rev{N}` where N starts at 1 and increments per revision round.

**Task ID format:** `prev{N}-t{NN}` — e.g., `prev1-t01`, `prev1-t02`, `prev2-t01`.

**Task name prefix:** `(revision)` — following the existing `(review)` convention from review-receive.

**Example plan.md addition:**

````markdown
## Phase p-rev1: Revision 1

Source: inline feedback (2026-03-27)

### Task prev1-t01: (revision) Fix CLI help text for new command

**Files:**

- Modify: `.agents/skills/oat-project-summary/SKILL.md`

**Step 1: Update help text**
Change the description to match the final implementation.

**Step 2: Verify**
Run: `pnpm build`
Expected: Build passes

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-summary/SKILL.md
git commit -m "fix(prev1-t01): update summary skill help text"
```
````

### Task prev1-t02: (revision) Add missing error handling

**Files:**

- Modify: `.agents/skills/oat-project-revise/SKILL.md`

**Step 1: Add error case**
Handle the case where plan.md doesn't exist when revise is invoked.

**Step 2: Verify**
Run: `pnpm build`

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-revise/SKILL.md
git commit -m "fix(prev1-t02): add missing error handling in revise skill"
```

````

**Integration with existing plan.md structure:**

- Revision phases are inserted *before* `## Implementation Complete` — that section is the terminal summary and must remain last. Revision phases go after the last original `pNN` phase and before `## Implementation Complete`.
- The `## Implementation Complete` totals are updated to include revision phases/tasks
- The Reviews table can include revision-scope entries (e.g., scope `p-rev1`)

### Auto-Review Configuration Schema

**Global default in `.oat/config.json`:**

```json
{
  "version": 1,
  "autoReviewAtCheckpoints": false,
  ...existing keys...
}
````

**Per-project override in plan.md frontmatter:**

```yaml
---
oat_auto_review_at_checkpoints: true
---
```

**Cascading priority (highest wins):**

1. `plan.md` frontmatter `oat_auto_review_at_checkpoints` (per-project override)
2. `.oat/config.json` `autoReviewAtCheckpoints` (global default, committed)

Note: The OAT config system is partition-based, not hierarchical — `oat config get` routes each key to a predetermined file. There is no automatic cascading between `config.json` and `config.local.json` for the same key. Adding a `config.local.json` layer would require CLI runtime changes to `getConfigValue()`, which is out of scope. Two layers (global config + plan.md frontmatter) provide sufficient control: per-project override via frontmatter covers the "different behavior per repo" use case since each project's plan.md is repo-local.

```
auto_review = false  # default

# Layer 1: global config (.oat/config.json)
global_val = oat config get autoReviewAtCheckpoints
if global_val is not null: auto_review = global_val

# Layer 2: project config (plan.md frontmatter — per-project override)
plan_val = plan.md frontmatter oat_auto_review_at_checkpoints
if plan_val is not null: auto_review = plan_val
```

### pr_open Phase Status Extension

**New valid value for `oat_phase_status`:** `pr_open`

Full set of valid values: `in_progress`, `complete`, `pr_open`

**state.md frontmatter when pr_open:**

```yaml
---
oat_phase: implement
oat_phase_status: pr_open
oat_current_task: null
oat_project_state_updated: '2026-03-27T15:00:00Z'
---
```

**state.md content when pr_open:**

```markdown
## Current Phase

Implementation — PR open, awaiting human review.

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ✓ Design complete
- ✓ Plan complete
- ✓ Implementation tasks complete
- ✓ Final review passed
- ✓ Summary generated
- ✓ PR created
- ⧗ Awaiting human review

## Next Milestone

PR is open for review.

- To incorporate feedback: run `oat-project-revise`
- When approved: run `oat-project-complete`
```

**Agent interpretation:** An agent encountering `oat_phase_status: pr_open` in a new session should understand:

- The project is NOT done
- Implementation is complete but the PR is open for human review
- The user may want revisions (→ `oat-project-revise`) or completion (→ `oat-project-complete`)
- Do NOT start a new project or suggest starting fresh

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification                                          | Key Scenarios                                                                                                                                                                                       |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | manual: end-to-end lifecycle                          | Generate summary on completed project; verify all 10 sections present when applicable; verify sections omitted when not applicable; verify content grounded in implementation.md outcomes           |
| FR2  | manual: generate-revise-regenerate                    | Generate summary → add revision phase → re-run summary → verify only updated sections change; re-run with no changes → verify no modifications                                                      |
| FR3  | manual: pr-final with/without summary                 | Run pr-final without summary.md → verify it invokes summary generation; run pr-final with summary.md → verify PR Summary section draws from it                                                      |
| FR4  | manual: complete with/without summary                 | Run complete without summary.md → verify warning + optional generation; run complete with summary.md → verify it's preserved in archive                                                             |
| FR5  | manual: verify state after pr-final                   | Run pr-final → check state.md shows `pr_open`; check next milestone references both revise and complete; verify agent in new session interprets correctly                                           |
| FR6  | manual: inline feedback → tasks → implement → pr_open | Invoke revise with inline feedback → verify p-revN phase created → implement tasks → verify return to pr_open; test GitHub PR delegation; test review artifact delegation                           |
| FR7  | manual: complete from various states                  | Run complete from `in_progress` → succeeds; from `pr_open` → succeeds; from `complete` → succeeds; verify gates are warnings not blocks                                                             |
| FR8  | manual: enable config, verify triggers                | Enable auto-review in config → complete checkpoint phase → verify subagent review spawned; verify scope covers correct phases; verify final phase triggers `code final`; verify disabled by default |
| FR9  | manual: verify post-completion guidance               | Complete all tasks → verify guidance mentions summary/document/pr-final (not just "create PR"); verify revision re-entry picks up revision tasks correctly                                          |
| NFR2 | manual: skill structure review                        | Verify new skills have correct frontmatter, progress indicators, mode assertion, allowed-tools; verify consistency with existing skill patterns                                                     |
| NFR3 | manual: summary length check                          | Generate summary on real project → verify under 200 lines; add revision history → verify still concise                                                                                              |

### Manual Verification Plan

Since all changes are skill files (markdown), verification is manual end-to-end lifecycle testing:

**Test Scenario 1: Happy Path (Full Lifecycle)**

1. Complete implementation on a test project
2. Run `oat-project-summary` → verify summary.md generated
3. Run `oat-project-pr-final` → verify state shows `pr_open`, PR description uses summary
4. Run `oat-project-revise` with inline feedback → verify revision tasks created
5. Run `oat-project-implement` → verify revision tasks execute
6. Verify state returns to `pr_open`
7. Run `oat-project-complete` → verify permissive completion from `pr_open`

**Test Scenario 2: Auto-Review at Checkpoints**

1. Enable `autoReviewAtCheckpoints: true` in config
2. Run `oat-project-implement` on a multi-phase plan
3. At first checkpoint → verify subagent review auto-triggers
4. Verify review scope covers correct phases
5. At final phase → verify `code final` scope triggers

**Test Scenario 3: Summary Re-runnability**

1. Generate summary on a completed project
2. Add a revision phase (via revise)
3. Re-run summary → verify incremental update (revision history added, other sections updated)
4. Re-run again with no changes → verify no modifications

**Test Scenario 4: Backward Compatibility**

1. Run complete on an existing project without summary.md → verify completes normally
2. Test state.md files without `pr_open` → verify no skill breaks

## Implementation Phases

### Phase 1: Summary Artifact + Template

**Goal:** Establish the summary.md artifact type and generation skill.

**Tasks:**

- Create `.oat/templates/summary.md` template
- Create `oat-project-summary` SKILL.md with full generation logic
- Create summary frontmatter schema with tracking fields
- Register the skill in `.agents/skills/oat-project-summary/`
- Bundle the template in `packages/cli/scripts/bundle-assets.sh`

**Verification:** Generate summary on the npm-publish project (already completed with full artifacts). Verify sections, frontmatter, and content quality.

### Phase 2: pr_open Status + Revision Skill

**Goal:** Eliminate the post-PR dead zone and enable clean revision re-entry.

**Tasks:**

- Create `oat-project-revise` SKILL.md with inline/GitHub/artifact routing
- Update `oat-project-pr-final` Step 6: set `pr_open` status and revised next-milestone guidance
- Update `oat-project-complete` Step 3: accept `pr_open` as valid entry status (FR7)
- Add `pr_open` documentation to state.md conventions
- Define revision phase naming convention (`p-revN` / `prevN-tNN`)

**Verification:** Run pr-final → verify `pr_open` state → run revise with inline feedback → verify revision tasks → run implement → verify return to `pr_open` → run complete → verify permissive completion.

### Phase 3: Skill Integration Updates + Auto-Review

**Goal:** Wire summary into pr-final and complete; add auto-review at checkpoints.

**Tasks:**

- Update `oat-project-pr-final` Step 3: check for summary.md, generate if missing, use as source (FR3)
- Update `oat-project-complete`: add Step 3.5 summary gate (FR4)
- Update `oat-project-implement` Step 8: add auto-review checkpoint logic (FR8)
- Update `oat-project-implement` Step 15: update post-completion guidance (FR9)
- Update `oat-project-implement` revision task completion: return to `pr_open` state
- Add `autoReviewAtCheckpoints` to `.oat/config.json` schema
- Add `oat_auto_review_at_checkpoints` frontmatter support to plan.md

**Verification:** Enable auto-review → run implement → verify auto-review triggers at checkpoints. Run pr-final with/without summary → verify integration. Run complete with/without summary → verify gate behavior.

### Phase 4a: CLI Runtime + Templates

**Goal:** Make the CLI correctly handle `pr_open` status and `autoReviewAtCheckpoints` config. These are functional changes that block correct behavior.

**Tasks:**

- Update `packages/cli/src/commands/state/generate.ts` — add `pr_open` to state machine routing. When `oat_phase_status: pr_open`, the dashboard/next-step guidance should show "PR open — run revise for feedback or complete when approved" (same message as state.md content).
- Update `packages/cli/src/config/oat-config.ts` — add `autoReviewAtCheckpoints?: boolean` to `OatConfig` interface
- Update `packages/cli/src/commands/config/index.ts` — add `autoReviewAtCheckpoints` as a recognized key for get/set, routed to `config.json`
- Update `.oat/templates/state.md` — add `pr_open` to the comment showing valid `oat_phase_status` values
- Update `packages/cli/scripts/bundle-assets.sh` — ensure new skills and template are bundled

**Verification:** Run `oat state refresh` on a project with `pr_open` status — verify dashboard renders correctly. Run `oat config get autoReviewAtCheckpoints` — verify it resolves. Run `pnpm test` and `pnpm build` — verify no regressions.

### Phase 4b: Documentation + Diagnostics

**Goal:** Ensure docs and diagnostics reflect all new concepts. Important but non-blocking — skills work correctly without these updates.

**Tasks:**

Docs (bundled + app, keep in sync):

- Update `packages/cli/assets/docs/guide/workflow/lifecycle.md` — add summary artifact, pr_open status, revise loop, auto-review at checkpoints
- Update `packages/cli/assets/docs/guide/workflow/state-machine.md` — add `pr_open` transitions and the revision loop state diagram
- Update `packages/cli/assets/docs/reference/oat-directory-structure.md` — document `autoReviewAtCheckpoints` config key, `summary.md` as a project artifact
- Mirror the above in `apps/oat-docs/docs/guide/workflow/lifecycle.md` and `state-machine.md`

Skill registry:

- Update `.agents/skills/oat-doctor/SKILL.md` — add `oat-project-summary` and `oat-project-revise` to the bundled skill manifest

**Verification:** Run `oat doctor` — verify no warnings about unknown skills. Build docs (`pnpm build:docs`) — verify no broken references.

## Open Questions

All spec-phase open questions have been resolved in this design:

| Question                              | Resolution                                                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revision phase naming                 | `p-revN` phases with `prevN-tNN` task IDs, `(revision)` prefix                                                                                                        |
| Summary template location             | `.oat/templates/summary.md` alongside other templates                                                                                                                 |
| Complete flow ordering                | Summary generation → PR description → archive                                                                                                                         |
| Auto-review config key                | `autoReviewAtCheckpoints` (boolean), two layers: plan.md frontmatter > config.json. Asked during Step 2.5 checkpoint confirmation (skipped if config already `true`). |
| Auto-review + review-receive chaining | Auto-invokes review-receive after the subagent review completes (seamless)                                                                                            |
| Summary frontmatter schema            | `oat_summary_last_task`, `oat_summary_revision_count`, `oat_summary_includes_revisions`                                                                               |

**Remaining design-level questions (minor, can resolve during implementation):**

None — all questions resolved during design review. The revision phase placement question was resolved: revision phases go _before_ `## Implementation Complete` (that section is the terminal summary).

## Dependencies

### Internal Dependencies

- **Existing skills:** `oat-project-implement`, `oat-project-pr-final`, `oat-project-complete`, `oat-project-review-provide`, `oat-project-review-receive`, `oat-project-review-receive-remote` — all are modified or used by new skills
- **Template system:** `.oat/templates/` — new summary.md template follows existing template conventions
- **Configuration system:** `oat config get/set` — used for auto-review config resolution
- **Plan conventions:** `pNN-tNN` task ID format — extended with `prevN-tNN` for revisions
- **State conventions:** `state.md` frontmatter — extended with `pr_open` status value
- **Bundle system:** `packages/cli/scripts/bundle-assets.sh` — new template and skills must be bundled
- **State generation:** `packages/cli/src/commands/state/generate.ts` — routing logic for `pr_open` status
- **Config system:** `packages/cli/src/config/oat-config.ts` + `packages/cli/src/commands/config/index.ts` — schema and get/set for `autoReviewAtCheckpoints`
- **Docs (bundled):** `packages/cli/assets/docs/guide/workflow/` — lifecycle and state machine docs
- **Docs (app):** `apps/oat-docs/docs/guide/workflow/` — mirrors bundled docs
- **Doctor skill:** `.agents/skills/oat-doctor/SKILL.md` — skill manifest

### External Dependencies

- None. All changes are internal to the OAT skill and artifact system.

## Risks and Mitigation

- **State complexity from pr_open + revision loops:** Medium probability | Medium impact
  - **Mitigation:** `pr_open` is guidance only, not a gate. `oat-project-complete` accepts any status. The state transition diagram is simple: only three valid values for `oat_phase_status`, and any value can transition to lifecycle complete.
  - **Contingency:** If edge cases surface, add a "state repair" utility or make complete even more permissive.

- **Summary bloat on large projects with many revisions:** Low probability | Medium impact
  - **Mitigation:** Cap revision history at 2-3 sentences per round. Omit empty sections. Target under 200 lines.
  - **Contingency:** Add a `--concise` flag to the summary skill if needed.

- **Skill interaction complexity across 5 skills:** Medium probability | High impact
  - **Mitigation:** Implementation phases are ordered by dependency (summary first, then revise/pr_open, then integration). Each phase is independently testable. End-to-end lifecycle test covers the full chain.
  - **Contingency:** If integration issues surface, add a lifecycle integration test script that walks through all states.

- **Auto-review environment dependency:** Low probability | Low impact
  - **Mitigation:** Opt-in, disabled by default. If subagent spawning fails, falls back to manual review prompt (existing behavior).
  - **Contingency:** Skip auto-review and inform user to trigger manually.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
- Existing skills: `oat-project-implement`, `oat-project-pr-final`, `oat-project-complete`, `oat-project-review-receive`, `oat-project-review-receive-remote`
