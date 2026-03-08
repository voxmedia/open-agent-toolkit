---
name: oat-idea-summarize
version: 1.2.0
description: Use when an idea is mature enough to move from brainstorming into the backlog. Generates a summary document and adds the idea to the backlog.
argument-hint: "[--global]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Grep, AskUserQuestion
---

# Summarize Idea

Read the brainstorming discovery document, synthesize a clean summary, and update the ideas backlog.

## Prerequisites

- An active idea must exist (`activeIdea` set in config, with a `discovery.md` that has meaningful content)

## Progress Indicators (User-Facing)

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ SUMMARIZE IDEA [project]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Replace `[project]` with `[global]` when operating at user level.

- Before multi-step work, print step indicators, e.g.:
  - `[1/4] Resolving active idea…`
  - `[2/4] Reading discovery document…`
  - `[3/4] Generating summary…`
  - `[4/4] Updating backlog…`

## Process

### Step 0: Resolve Ideas Level

Determine whether to operate at project level or user (global) level.

**Resolution order:**

1. If `$ARGUMENTS` contains `--global` → use **user level**
2. If `.oat/config.local.json` has `activeIdea` pointing to a valid directory → use **project level**
3. If `~/.oat/config.json` has `activeIdea` pointing to a valid directory → use **user level**
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

### Step 1: Resolve Active Idea

Read `activeIdea` from config (`oat config get activeIdea`) to get `IDEA_PATH`.

**If missing or invalid:**
- Use the Glob tool to list idea directories: `{IDEAS_ROOT}/*/discovery.md`
- Ask the user to pick one
- Run `oat config set activeIdea "{chosen-idea-path}"`

Derive `IDEA_NAME` from the directory basename.

### Step 2: Read Discovery Document

Read `{IDEAS_ROOT}/$IDEA_NAME/discovery.md`.

**Validate content:** Check that the document has meaningful content beyond the template placeholders. Look for:
- "What's the Idea?" section has real content (not just `{Brief description...}`)
- At least one session in "Notes & Discussion"

**If mostly empty:**
- Warn: "This idea hasn't been explored much yet. Consider running the `oat-idea-ideate` skill first to flesh it out."
- Ask: continue with summarization anyway, or brainstorm more? If user chooses to brainstorm, read the **`oat-idea-ideate`** skill (`.agents/skills/oat-idea-ideate/SKILL.md`) and follow its process from Step 4.

### Step 3: Generate Summary

Copy the summary template and synthesize content from the discovery document:
- Source: `{TEMPLATES_ROOT}/idea-summary.md`
- Target: `{IDEAS_ROOT}/$IDEA_NAME/summary.md`

**Synthesis guidelines:**
- **Overview:** 2-4 sentence synthesis drawn from "What's the Idea?" and "Why Is It Interesting?"
- **Key Points:** 3-5 bullets capturing the most important insights from the entire discovery
- **Why This Matters:** Value proposition from "Why Is It Interesting?" and session discussions
- **What It Would Take:** High-level effort sense from "What Would It Look Like?" and discussions (if discussed)
- **Next Steps:** Actionable items if the idea were to be pursued
- **Open Questions:** Carry over unresolved questions from discovery
- **References:** Carry over from "Related Ideas"

Apply replacements:
- `{Idea Name}` → actual idea name
- `oat_idea_created` → original creation date from discovery frontmatter
- `oat_idea_summarized` → today's date

### Step 4: Show Summary for Review

Display the generated summary to the user. Ask:
- **Accept** — finalize and update backlog
- **Refine** — edit the summary (make changes, then re-confirm)
- **Continue brainstorming** — discard summary and resume brainstorming

If user chooses to continue brainstorming, do not update state or backlog. Read the **`oat-idea-ideate`** skill (`.agents/skills/oat-idea-ideate/SKILL.md`) and follow its process from Step 4 (Start New Session) to resume the conversation.

### Step 5: Update Discovery State

Update `{IDEAS_ROOT}/$IDEA_NAME/discovery.md` frontmatter:

```yaml
oat_idea_state: summarized
oat_idea_last_updated: YYYY-MM-DD
```

### Step 6: Update Backlog

In `{IDEAS_ROOT}/backlog.md`:

1. **Remove** the idea's entry from the **Active Brainstorming** section
2. **Add** an entry to the **Captured Ideas** section with the overview from the summary:

```markdown
- **{idea-name}** — {1-2 sentence overview from summary} *(Created: YYYY-MM-DD, Summarized: YYYY-MM-DD)*
```

### Step 7: Confirm Completion

Print a confirmation:

```
Idea "{Idea Name}" has been summarized.

Level:   {project | global}
Summary: {IDEAS_ROOT}/{idea-name}/summary.md
Backlog: {IDEAS_ROOT}/backlog.md (updated)

Next steps (suggest to the user — do not auto-invoke):
- Start a new idea: run the `oat-idea-new` skill
- Browse ideas: check {IDEAS_ROOT}/backlog.md
- Quick capture: run the `oat-idea-scratchpad` skill to jot down a new idea seed
- Promote to project: run the `oat-project-new` skill, then seed its
  discovery phase with this idea's summary as the initial request
```

**Promotion contract (v1):** To promote an idea to a full OAT project:
1. Run `oat-project-new {idea-name}` to scaffold the project
2. Run `oat-project-discover` — use the idea's `summary.md` as the initial request input
3. The idea's discovery and summary documents remain in `{IDEAS_ROOT}/` as reference
4. Update the ideas backlog entry to `Archived` with reason: `promoted to project`

Future: a dedicated `oat-idea-promote` skill can automate steps 1-4.

## Success Criteria

- ✅ `summary.md` created with synthesized content
- ✅ `discovery.md` frontmatter updated to `oat_idea_state: summarized`
- ✅ Backlog entry moved from Active Brainstorming to Captured Ideas
- ✅ User reviewed and accepted the summary
