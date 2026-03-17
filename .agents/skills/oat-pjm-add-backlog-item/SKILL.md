---
name: oat-pjm-add-backlog-item
version: 1.0.0
description: Use when a new repo backlog item needs to be captured in the file-per-item backlog structure. Creates the item file, regenerates the index, and prompts for curated overview updates.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Add Backlog Item

Create a new file-backed backlog item under `.oat/repo/reference/backlog/items/` and refresh the generated backlog index.

## Mode Assertion

**OAT MODE: Repo Backlog Capture**

**Purpose:** Capture backlog work in the canonical file-per-item structure with consistent frontmatter, generated IDs, and refreshed index state.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ ADD BACKLOG ITEM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print short step indicators, e.g.:
  - `[1/4] Resolving item details…`
  - `[2/4] Generating ID + populating template…`
  - `[3/4] Regenerating backlog index…`
  - `[4/4] Updating curated overview guidance…`

## Process

### Step 1: Resolve Inputs

Collect the item details from the user or surrounding context:

- Title
- Description / context
- Acceptance criteria
- Optional labels, priority, scope, assignee, and related issue refs

If the title is missing, ask the user.
If the description is missing, ask for 1-3 sentences of context.

### Step 2: Prepare Paths and Filename

1. Derive a kebab-case slug from the title.
2. Set the output path:

```bash
ITEM_PATH=".oat/repo/reference/backlog/items/{slug}.md"
```

3. If the file already exists, ask the user whether to overwrite it or pick a different slug.

### Step 3: Generate ID

Run:

```bash
oat backlog generate-id "{slug}"
```

Use the returned `bl-XXXX` value as the backlog item ID.

If the initial hash collides with an existing backlog item ID, the CLI should retry with a disambiguated seed until it returns an unused ID. If the command reports a duplicate or collision issue, do not continue writing the item until the generated ID is unique across `backlog/items/*.md`.

### Step 4: Copy Template and Fill Frontmatter

1. Use `.oat/templates/backlog-item.md` as the source template.
2. Fill:
   - `id`
   - `title`
   - `created`
   - `updated`
   - `status` (default `open`)
   - `priority` (default `medium` unless the user says otherwise)
   - `scope` (default `task` unless the user says otherwise)
   - `labels`
   - `assignee`
   - `associated_issues`
3. The agent should propose an initial `scope_estimate` based on the described work, then ask the user to confirm or adjust it.
4. Write the item body with:
   - `## Description`
   - `## Acceptance Criteria`

### Step 5: Write the Backlog Item

Write the completed file to:

```bash
.oat/repo/reference/backlog/items/{slug}.md
```

Use the template field order from `.oat/templates/backlog-item.md`.

### Step 6: Regenerate Managed Index

Run:

```bash
oat backlog regenerate-index
```

This refreshes the managed table inside `.oat/repo/reference/backlog/index.md`.

### Step 7: Update Curated Overview

Read `.oat/repo/reference/backlog/index.md` and update the `## Curated Overview` section with a brief human-written note when helpful, for example:

- New theme added to the backlog
- Priority or sequencing implications
- Linkage to an active OAT project

Do not edit inside the managed marker section.

### Step 8: Summarize to the User

Report:

- Item file path
- Generated backlog ID
- Confirmed scope estimate
- Whether the managed index was regenerated
- Any curated overview note that was added

## Success Criteria

- New item file exists under `.oat/repo/reference/backlog/items/`
- Item includes populated frontmatter and both required body sections
- `scope_estimate` was proposed and confirmed
- `oat backlog regenerate-index` ran successfully
- `.oat/repo/reference/backlog/index.md` remains valid, with managed section untouched except by regeneration
