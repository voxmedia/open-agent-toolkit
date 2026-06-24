---
name: oat-pjm-update-repo-reference
version: 1.2.0
description: Use when repo reference artifacts need updating — roadmap, decision records, backlog status, or completed history. Frequently invoked at project completion, often chained from `oat-project-document`, to ensure active `.oat/repo/pjm/` state and durable `.oat/repo/reference/` records reflect what shipped.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Update Repo Reference

Keep this repo's OAT reference documentation consistent as implementation evolves. Active operational state lives under `.oat/repo/pjm/` (current-state, roadmap, and the file-backed backlog); durable decision history lives under `.oat/repo/reference/decisions/`.

## Mode Assertion

**OAT MODE: Repo Reference Sync**

**Purpose:** Update backlog, roadmap, completed history, and decision records so active `pjm/` state and durable `reference/` records stay trustworthy after implementation changes.

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

### Step 2: Ensure Backlog Scaffold

Before editing any backlog files or running backlog regeneration, run:

```bash
oat backlog init
```

This command is idempotent and ensures `.oat/repo/pjm/backlog/index.md` exists with the exact managed markers required by the CLI:

```md
<!-- OAT BACKLOG-INDEX -->
<!-- END OAT BACKLOG-INDEX -->
```

Do not hand-author or rename those managed markers.

### Step 3: Mine Project Artifacts for Deferred Work and Decisions

For recently completed or in-progress projects, read `discovery.md`, `spec.md`, `design.md`, and `implementation.md` as applicable.

Promote notable findings into one of:

- Backlog item files under `.oat/repo/pjm/backlog/items/`
- Completed summaries in `.oat/repo/pjm/backlog/completed.md`
- Decision records under `.oat/repo/reference/decisions/`, created with
  `oat decision new "<title>"` (delegate to `oat-pjm-decision` for a guided
  capture). Do not hand-author decision files or write into a legacy
  `decision-record.md` monolith.
- Roadmap updates in `.oat/repo/pjm/roadmap.md`

### Step 4: Update Canonical Reference Docs

Update these files as applicable:

1. `.oat/repo/pjm/current-state.md`
2. `.oat/repo/pjm/roadmap.md`
   - Use the `Now / Next / Later` structure when editing roadmap priorities.
3. `.oat/repo/pjm/backlog/index.md`
   - Update only the `## Curated Overview` section by hand.
   - Do not hand-edit the managed marker section.
4. `.oat/repo/pjm/backlog/items/*.md`
   - Add or update active backlog items as file-backed records.
5. `.oat/repo/pjm/backlog/completed.md`
   - Keep newest completed summaries first.
6. `.oat/repo/pjm/backlog/archived/*.md`
   - Add rich historical item files only when a completed item needs preserved detail.
7. `.oat/repo/reference/decisions/`
   - Create new decisions with `oat decision new` (see `oat-pjm-decision`); the
     command writes one `DR-YYMMDD-slug` record and regenerates the managed
     decision index. Do not hand-edit `reference/decisions/index.md` inside its
     managed markers.

If you modify backlog item files or the completed archive structure, run:

```bash
oat backlog regenerate-index
```

### Step 5: Sanity Checks

Use the `Grep` tool for focused searches:

- Search for stale legacy references with pattern `reference/backlog|reference/roadmap|reference/current-state|decision-record\.md` across `.oat/repo`, `docs/oat`, `.agents/skills`, and `AGENTS.md`. These indicate active state still pointing at the retired `reference/` operational layout (legacy/migration notes excepted).
- Search for the active paths with pattern `\.oat/repo/pjm/backlog/(index|completed|items|archived)` and `\.oat/repo/reference/decisions/` across the same locations.

Confirm that:

- Active work lives in `pjm/backlog/items/`
- Human narrative updates stay in `pjm/backlog/index.md` curated section
- Completed summaries live in `pjm/backlog/completed.md`
- Roadmap wording matches the current `Now / Next / Later` structure in `pjm/roadmap.md`
- Decisions are file-per-record under `reference/decisions/`, created via `oat decision new`

### Step 6: Output

Provide:

- Files updated
- What changed in each file
- Whether `oat backlog regenerate-index` was run
- Any intentionally deferred inconsistencies

## Success Criteria

- Repo reference docs reflect current OAT behavior
- Active backlog, roadmap, and current-state updates live under `pjm/`
- Decision history is captured as file-per-record decisions under `reference/decisions/` via `oat decision new`, not in a legacy monolith
- Managed backlog and decision index sections are refreshed via CLI, not hand-edited
- Stale references to the retired `reference/` operational layout are removed or called out
