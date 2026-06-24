---
name: oat-pjm-add-backlog-item
version: 1.2.0
description: Use when the user requests or confirms adding a new repo backlog item — e.g. "add a backlog item for X", "capture that as backlog", "track that follow-up", "file a backlog ticket", or confirms a previously offered backlog capture. Do NOT auto-invoke when a follow-up is mentioned. Creates the item file in the file-per-item backlog structure, regenerates the index, and prompts for curated overview updates.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Add Backlog Item

Create a new file-backed backlog item under `.oat/repo/pjm/backlog/items/` and refresh the generated backlog index.

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

### Step 2: Ensure Backlog Scaffold

Before generating IDs or editing backlog files, run:

```bash
oat backlog init
```

This command is idempotent. Use it even in existing repos so the canonical backlog scaffold and exact managed index markers are present before `oat backlog regenerate-index` runs.

Do not hand-create the managed marker block in `backlog/index.md`. The scaffold writes the exact markers required by the CLI:

```md
<!-- OAT BACKLOG-INDEX -->
<!-- END OAT BACKLOG-INDEX -->
```

### Step 3: Generate ID

Run:

```bash
oat backlog generate-id "{title}"
```

The CLI returns a deterministic `BL-YYMMDD-slug` value derived from the creation date and the title. It performs no scan, hash, counter, or random allocation.

If the command reports a same-day same-slug filename collision against an existing `items/<id>.md` or `archived/<id>.md`, do not overwrite the existing record. Disambiguate by using a more specific title and re-running `oat backlog generate-id`.

### Step 4: Prepare Output Path

Set the output path using the returned ID so the filename stem equals the ID:

```bash
ITEM_PATH=".oat/repo/pjm/backlog/items/{id}.md"
```

### Step 5: Copy Template and Fill Frontmatter

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

### Step 6: Write the Backlog Item

Write the completed file to the path resolved in Step 4:

```bash
.oat/repo/pjm/backlog/items/{id}.md
```

Use the template field order from `.oat/templates/backlog-item.md`.

### Step 7: Regenerate Managed Index

Run:

```bash
oat backlog regenerate-index
```

This refreshes the managed table inside `.oat/repo/pjm/backlog/index.md`.

### Step 8: Update Curated Overview

Read `.oat/repo/pjm/backlog/index.md` and update the `## Curated Overview` section with a brief human-written note when helpful, for example:

- New theme added to the backlog
- Priority or sequencing implications
- Linkage to an active OAT project

Do not edit inside the managed marker section.

### Step 9: Summarize to the User

Report:

- Item file path
- Generated backlog ID
- Confirmed scope estimate
- Whether the managed index was regenerated
- Any curated overview note that was added

## Success Criteria

- New item file exists under `.oat/repo/pjm/backlog/items/` with a `BL-YYMMDD-slug` filename matching its `id`
- Item includes populated frontmatter and both required body sections
- `scope_estimate` was proposed and confirmed
- `oat backlog regenerate-index` ran successfully
- `.oat/repo/pjm/backlog/index.md` remains valid, with managed section untouched except by regeneration
