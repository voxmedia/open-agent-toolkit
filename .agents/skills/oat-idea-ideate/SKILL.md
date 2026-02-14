---
name: oat-idea-ideate
description: Resume brainstorming on an existing idea through conversational discussion, or start from a scratchpad entry.
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
   OAT ▸ IDEATE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- When resolving or listing ideas, print a brief status line.

## Process

### Step 1: Resolve Active Idea

Read `.oat/active-idea`:

```bash
IDEA_PATH=$(cat .oat/active-idea 2>/dev/null || true)
```

**If valid (directory exists with discovery.md):**
- Show the idea name and current state to the user
- Ask: "Continue with **{idea-name}**, or switch to a different idea?"
- If continuing, proceed to Step 2

**If missing or invalid:**
- List existing idea directories:
  ```bash
  ls -d .oat/ideas/*/  2>/dev/null
  ```
- Read `.oat/ideas/scratchpad.md` and extract unchecked entries (`- [ ]`)
- Present combined list to the user:
  - Existing ideas (with state: brainstorming/summarized)
  - Scratchpad entries marked as "not yet started"
- If user picks an existing idea → write `.oat/active-idea` and proceed to Step 2
- If user picks a scratchpad entry → run the `oat-idea-new` creation flow inline:
  1. Create `.oat/ideas/{idea-name}/` directory
  2. Scaffold `discovery.md` from template
  3. Add entry to backlog
  4. Check off the scratchpad entry
  5. Set `.oat/active-idea`
  6. Proceed to Step 2 with the new idea
- If no ideas and no scratchpad entries exist → tell the user to run `oat-idea-new` to create one, then stop

### Step 2: Load Discovery Document

Read `.oat/ideas/{idea-name}/discovery.md`.

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
3. Offer next steps:
   - **Continue later** — "Run `oat-idea-ideate` to pick up where you left off"
   - **Summarize** — "Run `oat-idea-summarize` to finalize this idea"
   - **Switch ideas** — "Run `oat-idea-ideate` and pick a different idea"

## Success Criteria

- ✅ Active idea resolved (or user guided to create one)
- ✅ New session header added to Notes & Discussion
- ✅ Discovery document updated with conversation content
- ✅ `oat_idea_last_updated` reflects today's date
- ✅ User offered clear next steps on session close
