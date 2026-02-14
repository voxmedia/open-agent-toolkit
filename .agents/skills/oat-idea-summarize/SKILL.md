---
name: oat-idea-summarize
description: Finalize an idea by generating a summary document and adding it to the ideas backlog.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Grep, AskUserQuestion
---

# Summarize Idea

Read the brainstorming discovery document, synthesize a clean summary, and update the ideas backlog.

## Prerequisites

- An active idea must exist (`.oat/active-idea` set, with a `discovery.md` that has meaningful content)

## Progress Indicators (User-Facing)

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ SUMMARIZE IDEA
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Print step indicators: "Reading discovery...", "Generating summary...", "Updating backlog..."

## Process

### Step 1: Resolve Active Idea

Read the file `.oat/active-idea` using the Read tool to get `IDEA_PATH`.

**If missing or invalid:**
- Use the Glob tool to list idea directories: `.oat/ideas/*/discovery.md`
- Ask the user to pick one
- Write `.oat/active-idea` with the chosen idea path

Derive `IDEA_NAME` from the directory basename.

### Step 2: Read Discovery Document

Read `.oat/ideas/$IDEA_NAME/discovery.md`.

**Validate content:** Check that the document has meaningful content beyond the template placeholders. Look for:
- "What's the Idea?" section has real content (not just `{Brief description...}`)
- At least one session in "Notes & Discussion"

**If mostly empty:**
- Warn: "This idea hasn't been explored much yet. Consider running `oat-idea-ideate` first."
- Ask: continue with summarization anyway, or brainstorm more?

### Step 3: Generate Summary

Copy the summary template and synthesize content from the discovery document:
- Source: `.oat/templates/ideas/idea-summary.md`
- Target: `.oat/ideas/$IDEA_NAME/summary.md`

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
- **Continue brainstorming** — discard summary, go back to `oat-idea-ideate`

If user chooses to continue brainstorming, do not update state or backlog. Stop here.

### Step 5: Update Discovery State

Update `.oat/ideas/$IDEA_NAME/discovery.md` frontmatter:

```yaml
oat_idea_state: summarized
oat_idea_last_updated: YYYY-MM-DD
```

### Step 6: Update Backlog

In `.oat/ideas/backlog.md`:

1. **Remove** the idea's entry from the **Active Brainstorming** section
2. **Add** an entry to the **Captured Ideas** section with the overview from the summary:

```markdown
- **{idea-name}** — {1-2 sentence overview from summary} *(Created: YYYY-MM-DD, Summarized: YYYY-MM-DD)*
```

### Step 7: Confirm Completion

Print a confirmation:

```
Idea "{Idea Name}" has been summarized.

Summary: .oat/ideas/{idea-name}/summary.md
Backlog: .oat/ideas/backlog.md (updated)

Next steps:
- Start a new idea: oat-idea-new
- Browse ideas: check .oat/ideas/backlog.md
- Promote to project: run oat-new-project {idea-name}, then seed its
  discovery phase with this idea's summary as the initial request
```

**Promotion contract (v1):** To promote an idea to a full OAT project:
1. Run `oat-new-project {idea-name}` to scaffold the project
2. Run `oat-discovery` — use the idea's `summary.md` as the initial request input
3. The idea's discovery and summary documents remain in `.oat/ideas/` as reference
4. Update the ideas backlog entry to `Archived` with reason: `promoted to project`

Future: a dedicated `oat-idea-promote` skill can automate steps 1-4.

## Success Criteria

- ✅ `summary.md` created with synthesized content
- ✅ `discovery.md` frontmatter updated to `oat_idea_state: summarized`
- ✅ Backlog entry moved from Active Brainstorming to Captured Ideas
- ✅ User reviewed and accepted the summary
