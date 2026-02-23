---
name: oat-idea-ideate
version: 1.0.0
description: Use when continuing brainstorming for an existing idea or starting from a scratchpad entry. Guides conversational ideation and refinement.
argument-hint: "[--global]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
---

# Ideate

Resume brainstorming on an existing idea, or pick one from the scratchpad to start exploring.

## Mode Assertion

**OAT MODE: Ideation**

**Purpose:** Lightweight brainstorming through natural, exploratory conversation. Capture the essence of an idea without formal structure or implementation detail.

**BLOCKED Activities:**
- No code writing or implementation details
- No formal requirements or specifications
- No technical designs or architecture
- No task breakdowns or plans
- No forced structure — let the idea breathe

**ALLOWED Activities:**
- Free-form discussion and exploration
- Asking open-ended questions
- Capturing thoughts and observations
- Exploring "what if" scenarios
- Noting related ideas and references
- Identifying open questions organically

**Self-Correction Protocol:**
If you catch yourself:
- Writing implementation details → STOP (capture as an Open Question instead)
- Formalizing requirements → STOP (keep it conversational)
- Creating structured deliverables → STOP (save for project workflow)

**Recovery:**
1. Acknowledge the deviation
2. Return to exploratory questioning
3. Capture the insight as a note or open question

## Progress Indicators (User-Facing)

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ IDEATE [project]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Replace `[project]` with `[global]` when operating at user level.

- Before multi-step work, print step indicators, e.g.:
  - `[1/3] Resolving active idea…`
  - `[2/3] Loading discovery document…`
  - `[3/3] Starting brainstorming session…`

## Process

### Step 0: Resolve Ideas Level

Determine whether to operate at project level or user (global) level.

**Resolution order:**

1. If `$ARGUMENTS` contains `--global` → use **user level**
2. If `.oat/active-idea` exists and points to a valid directory → use **project level**
3. If `~/.oat/active-idea` exists and points to a valid directory → use **user level**
4. If BOTH `.oat/ideas/` AND `~/.oat/ideas/` exist →
   ask: "Ideas exist at both project and user level. Where should this idea go?"
   options: "Project (.oat/ideas/)" / "Global (~/.oat/ideas/)"
5. If `.oat/ideas/` exists → use **project level**
6. If `~/.oat/ideas/` exists → use **user level**
7. Otherwise → ask: "Project-level or global (user-level) ideas?"

**Set variables:**

| Variable | Project Level | User Level |
|----------|--------------|------------|
| `IDEAS_ROOT` | `.oat/ideas` | `~/.oat/ideas` |
| `TEMPLATES_ROOT` | `.oat/templates/ideas` | `~/.oat/templates/ideas` |
| `ACTIVE_IDEA_FILE` | `.oat/active-idea` | `~/.oat/active-idea` |

### Step 1: Resolve Active Idea

Read `{ACTIVE_IDEA_FILE}`:

```bash
IDEA_PATH=$(cat {ACTIVE_IDEA_FILE} 2>/dev/null || true)
```

**If valid (directory exists with discovery.md):**
- Show the idea name and current state to the user
- Ask: "Continue with **{idea-name}**, or switch to a different idea?"
- If continuing, proceed to Step 2

**If missing or invalid:**
- List existing idea directories:
  ```bash
  ls -d {IDEAS_ROOT}/*/  2>/dev/null
  ```
- Read `{IDEAS_ROOT}/scratchpad.md` and extract unchecked entries (`- [ ]`), including any nested notes for context
- Present combined list to the user:
  - Existing ideas (with state: brainstorming/summarized)
  - Scratchpad entries marked as "not yet started"
- If user picks an existing idea → write `{ACTIVE_IDEA_FILE}` and proceed to Step 2
- If user picks a scratchpad entry → scaffold the idea inline by reading the **`oat-idea-new`** skill (`.agents/skills/oat-idea-new/SKILL.md`) and executing its Steps 3-7 (Initialize Ideas Directory, Scaffold Discovery Document, Update Backlog, Check Scratchpad, Set Active Idea Pointer). Then proceed to Step 2 with the new idea.
- If no ideas and no scratchpad entries exist → tell the user: "No ideas found. Run the `oat-idea-new` skill to create one, or run the `oat-idea-scratchpad` skill to capture a quick idea seed." Then stop.

### Step 2: Load Discovery Document

Read `{IDEAS_ROOT}/{idea-name}/discovery.md`.

Show the user a brief summary of the current state:
- Idea name
- State (brainstorming/summarized)
- Last updated date
- Key sections that have content vs. are still template placeholders

### Step 3: Handle Summarized State

If `oat_idea_state: summarized`:
- Warn: "This idea has already been summarized."
- Offer options:
  - **Reopen brainstorming** — set state back to `brainstorming`, continue to Step 4
  - **View summary** — read and display `summary.md`, then stop
  - **Start a different idea** — go back to Step 1

### Step 4: Start New Session

Add a new session header to the **Notes & Discussion** section:

```markdown
### Session: YYYY-MM-DD

```

Update frontmatter: `oat_idea_last_updated: YYYY-MM-DD`

### Step 5: Conversational Brainstorming

Enter a free-form conversational flow:

1. **Read current content** to understand where the idea stands
2. **Ask exploratory questions** based on what's been discussed so far:
   - If early stage: "What sparked this idea?", "What problem does this solve?"
   - If mid-stage: "What's changed since last time?", "Any new angles?"
   - If sections are thin: ask questions that naturally fill them out
3. **Capture responses** in the discovery document:
   - Update "What's the Idea?" if the core concept evolves
   - Update "Why Is It Interesting?" as motivations emerge
   - Update "What Would It Look Like?" as the vision takes shape
   - Add to "Open Questions" as unknowns surface
   - Add to "Related Ideas" as connections are made
   - Append detailed notes to the current session under "Notes & Discussion"
4. **Follow the user's energy** — explore tangents, let ideas evolve naturally
5. **Don't force completion** — ideation can be open-ended

### Step 6: Session Close

When the user signals they're done (or the conversation reaches a natural pause):

1. Update `oat_idea_last_updated` in frontmatter
2. Save all changes to `discovery.md`
3. Tell the user their progress is saved, then suggest these next steps (these are prompts for the user to run later — do **not** auto-invoke them):
   - **Continue later** — "Run the `oat-idea-ideate` skill to pick up where you left off"
   - **Summarize** — "Run the `oat-idea-summarize` skill to finalize this idea"
   - **Switch ideas** — "Run the `oat-idea-ideate` skill and pick a different idea"
   - **Quick capture** — "Run the `oat-idea-scratchpad` skill to jot down a new idea seed"

## Success Criteria

- ✅ Active idea resolved (or user guided to create one)
- ✅ New session header added to Notes & Discussion
- ✅ Discovery document updated with conversation content
- ✅ `oat_idea_last_updated` reflects today's date
- ✅ User offered clear next steps on session close
