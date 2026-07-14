---
name: oat-pjm-add-backlog-item
version: 1.3.1
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
  - `[2/4] Creating the item + managed index atomically…`
  - `[3/4] Enriching acceptance criteria…`
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

Propose an initial scope estimate (`XS`, `S`, `M`, `L`, `XL`, or `XXL`) from the described work, then ask the user to confirm or adjust it before creation.

### Step 2: Create the Backlog Item Atomically

Run the single creation command with the confirmed values:

```bash
oat backlog new "{title}" --priority "<priority>" --scope "<scope>" --scope-estimate "<confirmed-scope-estimate>" --labels "<comma-delimited-labels>" --description "<description>"
```

The command validates all inputs, initializes the scaffold when needed, generates and collision-checks the `BL-YYMMDD-slug` ID, renders the canonical template, writes the item, and regenerates the managed index. If it reports a collision, do not overwrite the existing active or archived record; use a more specific title and rerun the same command.

Use the item path and ID reported by the command. Do not hand-author frontmatter or edit the managed index block. The command initializes `external_plans: []`; `oat-repo-improve` owns later reverse-link additions.

### Step 3: Enrich Acceptance Criteria

Read the created item and replace only the placeholder bullets under `## Acceptance Criteria` with the acceptance criteria confirmed in Step 1. Preserve the command-generated frontmatter and description. This post-create enrichment is safe because Acceptance Criteria are not index-visible fields.

The item must retain both required body sections:

- `## Description`
- `## Acceptance Criteria`

### Step 4: Update Curated Overview

Read `.oat/repo/pjm/backlog/index.md` and update the `## Curated Overview` section with a brief human-written note when helpful, for example:

- New theme added to the backlog
- Priority or sequencing implications
- Linkage to an active OAT project

Do not edit inside the managed marker section.

### Step 5: Summarize to the User

Report:

- Item file path
- Generated backlog ID
- Confirmed scope estimate
- Whether the managed index was regenerated
- Any curated overview note that was added

## Success Criteria

- New item file exists under `.oat/repo/pjm/backlog/items/` with a `BL-YYMMDD-slug` filename matching its `id`
- Item includes populated frontmatter and both required body sections
- Item initializes `external_plans: []` for future reverse links
- `scope_estimate` was proposed and confirmed
- `oat backlog new` created the item and regenerated the managed index successfully
- `.oat/repo/pjm/backlog/index.md` remains valid, with managed section untouched except by regeneration
