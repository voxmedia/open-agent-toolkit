---
oat_template: true
oat_template_name: pjm-agents
---

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

**Close-out (primary path).** Run `oat backlog archive <id>` — add `--wont-do`
for abandoned work and `--summary "<text>"` to record the outcome. The command
performs the whole close-out atomically: it flips `status` to the terminal
value and bumps `updated`, appends the canonical `backlog/completed.md` entry
(always for `closed`; for `wont_do` only when `--summary` is given), moves the
item file from `backlog/items/` to `backlog/archived/`, and regenerates
`backlog/index.md`. Stage the resulting changes with the shipping commit/PR.

**Manual fallback.** These are the steps the command automates — follow them, in
order, only when closing out by hand:

1. In the item file, set `status: closed` (or `wont_do`) and bump `updated`.
2. Append a summary entry to `backlog/completed.md` (newest first; entry format
   is documented at the top of that file). Add the entry for a `wont_do` item
   only when the abandonment itself is worth recording (an explicit summary).
3. `git mv` the item file from `backlog/items/` to `backlog/archived/`.
4. Run `oat backlog regenerate-index` and stage the regenerated
   `backlog/index.md`.
5. If the completion changes the operating picture, refresh
   `current-state.md` and the curated overview section of `backlog/index.md`.

A partial close-out (status flipped or `completed.md` updated, but the file
left in `items/`) is how drift starts — finish all steps or none. `oat pjm
doctor` surfaces this drift.

**When reviewing backlog state** (e.g. `oat-pjm-review-backlog`), cross-check
recent commits against open items: work that shipped without a close-out
should be closed retroactively with a note.

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
    (`git rm`) in that same PR.
- **Staleness:** if a later alignment pass drops an item from the kickoff
  stack, delete its handoff in that pass rather than letting it drift.
- Every backlog item reference — in review output, alignment docs, and
  handoffs — pairs the ID with its human-readable title. No bare IDs.
