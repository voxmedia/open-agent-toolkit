---
name: oat-pjm-update-repo-reference
description: Use when repo reference artifacts need updating — roadmap, decision records, backlog status, or completed history. Frequently invoked at project completion, often chained from `oat-project-document`, to ensure active `.oat/repo/pjm/` state and durable `.oat/repo/reference/` records reflect what shipped.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
metadata:
  version: 1.4.2
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

### Step 0: Verify Repository PJM Adoption

Run the read-only preflight before any file write:

```bash
oat pjm doctor --json
```

Inspect the exact `adoption.state` field. Continue only for `declared` or
`inferred-legacy`. For `none` or `partial-initialization`, stop before writing
and tell the user to run `oat pjm init`. Installed project-management skills
show capability availability only, not repository adoption.

### Step 1: Identify What Changed

Write down a 1-3 bullet summary of the implementation change:

- New or updated skills
- New or updated templates
- New or updated CLI commands
- Repo-reference behavior changes
- File moves, renames, or retirements

### Step 2: Verify Backlog Scaffold

After the adoption preflight succeeds, confirm that
`.oat/repo/pjm/backlog/index.md` exists with the exact managed markers required
by the CLI:

```md
<!-- OAT BACKLOG-INDEX -->
<!-- END OAT BACKLOG-INDEX -->
```

Do not hand-author or rename those managed markers. If they are absent, stop and
repair the repository with `oat pjm init`.

### Step 3: Mine Project Artifacts for Deferred Work and Decisions

For recently completed or in-progress projects, read `discovery.md`, `spec.md`, `design.md`, and `implementation.md` as applicable.

Promote notable findings into one of:

- Backlog item files under `.oat/repo/pjm/backlog/items/`
- Completed close-outs via `oat backlog archive <id>` (see Step 4) — the atomic
  command flips the item's `status`, appends the canonical
  `.oat/repo/pjm/backlog/completed.md` entry, moves the item file into
  `archived/`, and regenerates the index in one step. Reserve hand-editing
  `completed.md` for narrative touch-ups the command does not own.
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
   - Keep newest completed summaries first. Prefer letting `oat backlog archive <id>`
     append the canonical entry (see below) over hand-editing.
6. `.oat/repo/pjm/backlog/archived/*.md`
   - Item files land here automatically when you run `oat backlog archive <id>`.
     Only hand-add or enrich a file here when a completed item needs preserved
     detail the command did not capture.
7. `.oat/repo/reference/decisions/`
   - Create new decisions with `oat decision new` (see `oat-pjm-decision`); the
     command writes one `DR-YYMMDD-slug` record and regenerates the managed
     decision index. Do not hand-edit `reference/decisions/index.md` inside its
     managed markers.

To close out a completed backlog item, run the atomic close-out command rather
than moving files by hand:

```bash
oat backlog archive <id> --summary "one-line outcome" --json
# abandoned work: oat backlog archive <id> --wont-do --summary "why" --json
```

This flips the item's `status` to a terminal value (`closed`/`wont_do` — never
invent variants like `done`), stamps `updated`, appends the canonical
newest-first `completed.md` entry, moves the item file from `items/` into
`archived/`, and regenerates the managed index in one step. Only when you edit
backlog files by hand outside this command (curated overview text, an enriched
`archived/` record) re-run the index regeneration:

```bash
oat backlog regenerate-index
```

Archive never stages files. Capture each successful `--json` result and retain
its complete `affectedPaths` array, including the old tracked item deletion,
the archived destination, completed ledger, index and rewritten references.
On retry use the returned operation paths; do not reconstruct ownership from
all files that mention the item. If this close-out owns a kickoff handoff,
remove it with a filesystem operation and append its tracked deletion path.
Convert returned absolute paths to literal repository-relative files using
the same repository root (avoiding checkout/scratch-path aliases).
Deduplicate the exact file list, format only existing supported text files
with the repository's documented formatter, and commit that list through
`oat internal commit-paths` with enabled hooks. Verify helper availability
first; if unavailable, stop and update the CLI. Set a unique `COMMIT_IDENTITY`
before the first attempt and retain the identity, message and literal paths
through retries; a blocked/failed helper result stops close-out. Unrelated
staged and unstaged work must remain intact. An empty settled-noop path list
needs no commit; omit a missing source path only if Git proves it was never
tracked, never omit a tracked old path or the new destination.

```bash
oat internal commit-paths --help || exit 1
# ARCHIVE_OWNED_FILES is the literal affectedPaths union plus owned handoff deletion.
# Format the existing text members with the repository's documented write command.
oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:backlog-closeout" --message "chore(pjm): archive completed backlog work" -- "${ARCHIVE_OWNED_FILES[@]}" || exit 1
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
