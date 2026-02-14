---
name: oat-idea-new
description: Create a new idea directory for lightweight brainstorming and capture, then start brainstorming immediately.
argument-hint: "<idea-name>"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
---

# New Idea

Create a new idea directory under `.oat/ideas/`, scaffold a discovery document, and transition into brainstorming mode.

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
   OAT ▸ NEW IDEA
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work (directory creation, template scaffolding), print 2-5 short step indicators.
- For long-running operations, print a brief "starting..." line and a matching "done" line.

## Process

### Step 1: Get Idea Name

If not provided in `$ARGUMENTS`, ask the user for an idea name.

**Validation:** Slug format only — alphanumeric, dashes, and underscores. No spaces or special characters.

### Step 2: Check for Existing Idea

```bash
test -d ".oat/ideas/$IDEA_NAME"
```

**If exists:** Tell the user and offer to resume brainstorming via `oat-idea-ideate` instead. Stop here unless they want a different name.

### Step 3: Initialize Ideas Directory

Create the ideas directory structure if it doesn't exist:

```bash
mkdir -p ".oat/ideas/$IDEA_NAME"
```

If `.oat/ideas/backlog.md` doesn't exist, copy from template:
- Source: `.oat/templates/ideas/ideas-backlog.md`
- Target: `.oat/ideas/backlog.md`

If `.oat/ideas/scratchpad.md` doesn't exist, copy from template:
- Source: `.oat/templates/ideas/ideas-scratchpad.md`
- Target: `.oat/ideas/scratchpad.md`

### Step 4: Scaffold Discovery Document

Copy template and apply replacements:
- Source: `.oat/templates/ideas/idea-discovery.md`
- Target: `.oat/ideas/$IDEA_NAME/discovery.md`

Replacements:
- `{Idea Name}` → actual idea name (title case from slug)
- `YYYY-MM-DD` → today's date (ISO format)

### Step 5: Update Backlog

Add an entry to `.oat/ideas/backlog.md` under the **Active Brainstorming** section:

```markdown
- **{idea-name}** — {placeholder: to be filled during brainstorming} *(Created: YYYY-MM-DD)*
```

### Step 6: Check Scratchpad

Read `.oat/ideas/scratchpad.md` and look for an unchecked entry matching the idea name.

If found, check it off and append a note:

```markdown
- [x] **{idea-name}** - {original note} *(YYYY-MM-DD)* → started (`.oat/ideas/{idea-name}/`)
```

### Step 7: Set Active Idea Pointer

Write the idea path to `.oat/active-idea`:

```
.oat/ideas/{idea-name}
```

### Step 8: Transition to Brainstorming

Now enter the same conversational flow as `oat-idea-ideate`:

1. Read the discovery document
2. If the user provided context about the idea (in their original message or arguments), capture it in the "What's the Idea?" section
3. Add a session header: `### Session: {today's date}`
4. Ask open-ended exploratory questions to help the user flesh out the idea:
   - "What sparked this idea?"
   - "Who would benefit from this?"
   - "What's the simplest version of this?"
   - "What existing things is this similar to or different from?"
5. Capture responses naturally in the discovery document — update the appropriate sections as themes emerge
6. When the user signals they're done or the conversation reaches a natural pause, update `oat_idea_last_updated` and offer:
   - Continue later with `oat-idea-ideate`
   - Summarize now with `oat-idea-summarize`

## Success Criteria

- ✅ `.oat/ideas/{idea-name}/` directory exists
- ✅ `discovery.md` scaffolded with correct name and date
- ✅ `.oat/ideas/backlog.md` exists and includes the new idea
- ✅ `.oat/ideas/scratchpad.md` exists (initialized if first idea)
- ✅ `.oat/active-idea` points to the new idea
- ✅ Brainstorming session started with exploratory questions
