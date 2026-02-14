---
name: oat-idea-new
description: Create a new idea directory for lightweight brainstorming and capture, then hand off to oat-idea-ideate.
argument-hint: "<idea-name>"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
---

# New Idea

Create a new idea directory under `.oat/ideas/`, scaffold a discovery document, verify setup, and hand off to `oat-idea-ideate` for brainstorming.

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

### Step 8: Verify and Hand Off

Verify all success criteria are met, then tell the user:

```
Idea "{Idea Name}" created successfully.

Directory: .oat/ideas/{idea-name}/
Backlog:   .oat/ideas/backlog.md (entry added)
Active:    .oat/active-idea (set)

Starting brainstorming...
```

Then immediately invoke the **`oat-idea-ideate`** skill (located at `.agents/skills/oat-idea-ideate/SKILL.md`) to begin the first brainstorming session. Read that skill file and follow its process from Step 1. The ideate skill owns all conversational brainstorming behavior — do not duplicate it here.

## Success Criteria

- ✅ `.oat/ideas/{idea-name}/` directory exists
- ✅ `discovery.md` scaffolded with correct name and date
- ✅ `.oat/ideas/backlog.md` exists and includes the new idea
- ✅ `.oat/ideas/scratchpad.md` exists (initialized if first idea)
- ✅ `.oat/active-idea` points to the new idea
- ✅ `oat-idea-ideate` skill invoked and brainstorming started
