---
name: oat-pjm-update-repo-reference
version: 1.0.0
description: Use when OAT implementation changes and the repo backlog, roadmap, and reference docs need to be synchronized with the file-per-item project-management structure.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Update Repo Reference

Keep this repo's OAT reference documentation consistent as implementation evolves, using the file-backed backlog structure under `.oat/repo/reference/backlog/`.

## Mode Assertion

**OAT MODE: Repo Reference Sync**

**Purpose:** Update backlog, roadmap, completed history, and decision records so repo reference docs stay trustworthy after implementation changes.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ UPDATE REPO REFERENCE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print short step indicators, e.g.:
  - `[1/4] Identifying changed OAT surfaces…`
  - `[2/4] Updating canonical reference docs…`
  - `[3/4] Regenerating managed backlog index…`
  - `[4/4] Running reference sanity checks…`

## Process

### Step 1: Identify What Changed

Write down a 1-3 bullet summary of the implementation change:

- New or updated skills
- New or updated templates
- New or updated CLI commands
- Repo-reference behavior changes
- File moves, renames, or retirements

### Step 2: Mine Project Artifacts for Deferred Work and Decisions

For recently completed or in-progress projects, read `discovery.md`, `spec.md`, `design.md`, and `implementation.md` as applicable.

Promote notable findings into one of:

- Backlog item files under `.oat/repo/reference/backlog/items/`
- Completed summaries in `.oat/repo/reference/backlog/completed.md`
- Decision record entries in `.oat/repo/reference/decision-record.md`
- Roadmap updates in `.oat/repo/reference/roadmap.md`

### Step 3: Update Canonical Reference Docs

Update these files as applicable:

1. `.oat/repo/reference/current-state.md`
2. `.oat/repo/reference/roadmap.md`
   - Use the `Now / Next / Later` structure when editing roadmap priorities.
3. `.oat/repo/reference/backlog/index.md`
   - Update only the `## Curated Overview` section by hand.
   - Do not hand-edit the managed marker section.
4. `.oat/repo/reference/backlog/items/*.md`
   - Add or update active backlog items as file-backed records.
5. `.oat/repo/reference/backlog/completed.md`
   - Keep newest completed summaries first.
6. `.oat/repo/reference/backlog/archived/*.md`
   - Add rich historical item files only when a completed item needs preserved detail.
7. `.oat/repo/reference/decision-record.md`

If you modify backlog item files or the completed archive structure, run:

```bash
oat backlog regenerate-index
```

### Step 4: Sanity Checks

Use the `Grep` tool for focused searches:

- Search for stale legacy references with pattern `backlog\.md|backlog-completed\.md|deferred-phases\.md` across `.oat/repo/reference`, `docs/oat`, `.agents/skills`, and `AGENTS.md`.
- Search for the new file-backed paths with pattern `\.oat/repo/reference/backlog/(index|completed|items|archived)` across the same locations.

Confirm that:

- Active work lives in `backlog/items/`
- Human narrative updates stay in `backlog/index.md` curated section
- Completed summaries live in `backlog/completed.md`
- Roadmap wording matches the current `Now / Next / Later` structure

### Step 5: Output

Provide:

- Files updated
- What changed in each file
- Whether `oat backlog regenerate-index` was run
- Any intentionally deferred inconsistencies

## Success Criteria

- Repo reference docs reflect current OAT behavior
- Backlog updates use the file-backed structure
- Managed backlog index section is refreshed via CLI, not hand-edited
- Stale references to retired backlog/deferred files are removed or called out
