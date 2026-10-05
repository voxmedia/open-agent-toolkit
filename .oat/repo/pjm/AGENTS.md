# PJM Guidance

This directory owns active project-management state.

- `current-state.md` records the present operating picture.
- `roadmap.md` records prioritized direction and sequencing.
- `backlog/` stores file-per-record backlog items and generated indexes.
- `handoffs/` stores one-shot project-kickoff prompts for backlog items
  (see `handoffs/README.md`); each is deleted in the PR that ships its item.
- Do not store durable research, brainstorms, imported plans, or decision
  history here.

## Backlog Lifecycle

Invariant: `backlog/items/` holds only active work (`status: open` or
`in_progress`). Completed and abandoned records live in `backlog/archived/`.
`backlog/completed.md` is the newest-first summary of what shipped.

**Trigger.** Close an item out when either is true:

- an item's `status` changes to `closed` or `wont_do` (these are the only
  terminal values — never invent variants like `done`), or
- a commit or PR satisfies an item's acceptance criteria — **even when the work
  happened outside an OAT project lifecycle** (small doc commits included).

The agent or person shipping the work owns the close-out, in the same
commit/PR as the work whenever practical.

**Close-out (primary path).** Run
`oat backlog archive <id> --summary "<outcome>"` for completed work; the
nonblank summary is required before the default `closed` path mutates
anything. Add `--wont-do` for abandoned work; that path may omit the summary
and completed-ledger entry. The command performs the whole close-out
atomically: it flips `status` to the terminal value and bumps `updated`,
appends the canonical `backlog/completed.md` entry (always for `closed`; for
`wont_do` only when `--summary` is given), moves the item file from
`backlog/items/` to `backlog/archived/`, rewrites inbound `.oat/repo` links and
path references to the moved file (reporting each rewritten file), and
regenerates `backlog/index.md`.
Commit the complete operation with the shipping commit/PR as described below.

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

**Manual fallback.** These are the steps the command automates — follow them, in
order, only when closing out by hand:

1. In the item file, set `status: closed` (or `wont_do`) and bump `updated`.
2. Append a summary entry to `backlog/completed.md` (newest first; entry format
   is documented at the top of that file). Add the entry for a `wont_do` item
   only when the abandonment itself is worth recording (an explicit summary).
3. Move the item file with a filesystem rename (`mv`, without staging) from `backlog/items/` to `backlog/archived/`, then
   rewrite inbound `.oat/repo` links to `archived/` (plans, decision records,
   other items, and repository-root paths such as `oat_external_plan_sources`).
4. Run `oat backlog regenerate-index`; include the regenerated
   `backlog/index.md` in the exact owned path list.
5. If the completion changes the operating picture, refresh
   `current-state.md` and the curated overview section of `backlog/index.md`.
6. Collect both old/new item names, every written ledger/index/reference and
   any owned handoff deletion, format existing text, then commit the complete
   operation through `oat internal commit-paths` as above.

A partial close-out (status flipped or `completed.md` updated, but the file
left in `items/`) is how drift starts — finish all steps or none. `oat pjm
doctor` surfaces this drift.

**When reviewing backlog state** (e.g. `oat-pjm-review-backlog`), cross-check
recent commits against open items: work that shipped without a close-out
should be closed retroactively with a note.

## External Plan Reverse Links

Backlog item frontmatter may include `external_plans`, a YAML string array of
repo-relative paths under `.oat/repo/reference/external-plans/`.
`oat-repo-improve` owns additions to this field after a plan write succeeds.
Preserve existing links, deduplicate additions, and never link a failed or
partial write. These are durable source-to-plan references, not project status.

## Project Kickoff Handoffs

`handoffs/` holds one-shot kickoff prompts — consumable context for turning a
backlog item into a project, not documentation. The item file and `reference/`
remain the source of truth. See `handoffs/README.md` for the directory
convention.

- **When to generate:** when a priority-alignment pass concludes (e.g. the
  walkthrough at the end of `oat-pjm-review-backlog`), write or refresh one
  handoff per item in the agreed kickoff stack. Kickoff-stack membership, lane
  count, and ordering are the human's call — present them, do not choose them.
  Do not generate handoffs for parked or queued items until they are actually
  next.
- **Naming:** one file per backlog item, `handoffs/<BL-id>.md`.
- **Required content:**
  - the backlog item reference — its ID **and** human-readable title **and**
    path (never a bare ID);
  - the recommended project mode (`oat-project-quick-start` vs
    `oat-project-new`), including which artifacts (spec/design/plan) to
    pre-populate from existing research when it exists;
  - authoritative input pointers (research directories, decision records, code
    paths);
  - repo conventions and verification gates the item file does not restate;
  - a close-out section requiring (a) the **Backlog Lifecycle** above executed
    in the same PR that ships the item and (b) deletion of the handoff file
    (filesystem removal, included as an owned tracked deletion in
    the same exact-path commit) in that same PR.
- **Staleness:** if a later alignment pass drops an item from the kickoff
  stack, delete its handoff in that pass rather than letting it drift.
- Every backlog item reference — in review output, alignment docs, and
  handoffs — pairs the ID with its human-readable title. No bare IDs.
