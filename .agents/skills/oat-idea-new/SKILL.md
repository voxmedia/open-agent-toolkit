---
name: oat-idea-new
description: Use when starting ideation for a new concept or problem. Creates an idea directory for lightweight capture and handoff to ongoing ideation.
argument-hint: "<idea-name> [--global]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
---

# New Idea

Create a new idea directory, scaffold a discovery document, verify setup, and hand off to `oat-idea-ideate` for brainstorming.

## Progress Indicators (User-Facing)

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ NEW IDEA [project]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Replace `[project]` with `[global]` when operating at user level.

- Before multi-step work, print step indicators, e.g.:
  - `[1/4] Validating idea name…`
  - `[2/4] Scaffolding idea directory…`
  - `[3/4] Updating backlog + scratchpad…`
  - `[4/4] Handing off to ideation…`

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

### Step 1: Get Idea Name

If not provided in `$ARGUMENTS`, ask the user for an idea name.

**Validation:** Slug format only — alphanumeric, dashes, and underscores. No spaces or special characters.

### Step 2: Check for Existing Idea

```bash
test -d "{IDEAS_ROOT}/$IDEA_NAME"
```

**If exists:** Tell the user this idea already exists and suggest: "Run the `oat-idea-ideate` skill to resume brainstorming on it." Stop here unless they want a different name.

### Step 3: Initialize Ideas Directory

Create the ideas directory structure if it doesn't exist:

```bash
mkdir -p "{IDEAS_ROOT}/$IDEA_NAME"
```

If `{IDEAS_ROOT}/backlog.md` doesn't exist, copy from template:
- Source: `{TEMPLATES_ROOT}/ideas-backlog.md`
- Target: `{IDEAS_ROOT}/backlog.md`

If `{IDEAS_ROOT}/scratchpad.md` doesn't exist, copy from template:
- Source: `{TEMPLATES_ROOT}/ideas-scratchpad.md`
- Target: `{IDEAS_ROOT}/scratchpad.md`

### Step 4: Scaffold Discovery Document

Copy template and apply replacements:
- Source: `{TEMPLATES_ROOT}/idea-discovery.md`
- Target: `{IDEAS_ROOT}/$IDEA_NAME/discovery.md`

Replacements:
- `{Idea Name}` → actual idea name (title case from slug)
- `YYYY-MM-DD` → today's date (ISO format)

### Step 5: Update Backlog

Add an entry to `{IDEAS_ROOT}/backlog.md` under the **Active Brainstorming** section:

```markdown
- **{idea-name}** — {placeholder: to be filled during brainstorming} *(Created: YYYY-MM-DD)*
```

### Step 6: Check Scratchpad

Read `{IDEAS_ROOT}/scratchpad.md` and look for an unchecked entry matching the idea name.

If found, check it off and append a note. Preserve any nested bullet notes beneath the entry:

```markdown
- [x] **{idea-name}** - {original note} *(YYYY-MM-DD)* → started (`{IDEAS_ROOT}/{idea-name}/`)
  - {preserved quick note 1}
  - {preserved quick note 2}
```

### Step 7: Set Active Idea Pointer

Write the idea path to `{ACTIVE_IDEA_FILE}`:

```
{IDEAS_ROOT}/{idea-name}
```

### Step 8: Verify and Hand Off

Verify all success criteria are met, then tell the user:

```
Idea "{Idea Name}" created successfully.

Level:     {project | global}
Directory: {IDEAS_ROOT}/{idea-name}/
Backlog:   {IDEAS_ROOT}/backlog.md (entry added)
Active:    {ACTIVE_IDEA_FILE} (set)

Starting brainstorming...
```

Then immediately invoke the **`oat-idea-ideate`** skill (located at `.agents/skills/oat-idea-ideate/SKILL.md`) to begin the first brainstorming session. Read that skill file and follow its process from Step 1. The ideate skill owns all conversational brainstorming behavior — do not duplicate it here.

## Success Criteria

- ✅ `{IDEAS_ROOT}/{idea-name}/` directory exists
- ✅ `discovery.md` scaffolded with correct name and date
- ✅ `{IDEAS_ROOT}/backlog.md` exists and includes the new idea
- ✅ `{IDEAS_ROOT}/scratchpad.md` exists (initialized if first idea)
- ✅ `{ACTIVE_IDEA_FILE}` points to the new idea
- ✅ `oat-idea-ideate` skill invoked and brainstorming started
