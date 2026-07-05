---
title: Backlog Lifecycle
description: The states a file-backed backlog item moves through, how oat backlog archive closes it out atomically, and how oat pjm doctor catches lifecycle drift.
---

# Backlog Lifecycle

The file-backed backlog under `.oat/repo/pjm/backlog/` tracks work as one Markdown file per item. This page describes the lifecycle those items move through, the atomic close-out command that keeps the pieces in sync, and the diagnostics that flag drift when a close-out is done by hand and something is missed.

For the flag-by-flag command reference, see [`oat backlog archive`](config-and-local-state.md#oat-backlog-archive). For the two-layer PJM surface that hosts the backlog, see [Tool Packs](tool-packs.md#install-vs-initialize).

## Where a backlog item lives

- **`items/<id>.md`** - active, file-backed records. Each carries frontmatter with a `status` and an `updated` timestamp.
- **`archived/<id>.md`** - the resting place for closed-out items, preserving the full item file as history.
- **`completed.md`** - a newest-first summary log of completed work, one line per entry (`YYYY-MM-DD — BL-YYMMDD-slug — Title — one-line outcome`).
- **`index.md`** - the human-facing curated overview plus a managed, generated index table rebuilt from item frontmatter.

## Item statuses

An item's `status` frontmatter field is one of exactly four values:

- `open` - captured, not yet started.
- `in_progress` - actively being worked.
- `closed` - completed.
- `wont_do` - abandoned or intentionally declined.

`closed` and `wont_do` are the two **terminal** statuses. These are the only valid values — never invent variants like `done`. A terminal item belongs in `archived/`, not `items/`.

## Closing out an item

When an item reaches a terminal state, close it out with the atomic command rather than editing files by hand:

```bash
# completed work
oat backlog archive BL-260705-example --summary "shipped the thing"

# abandoned work
oat backlog archive BL-260705-example --wont-do --summary "superseded by BL-260706-other"
```

A single `oat backlog archive` run performs the whole close-out so its parts cannot drift apart:

1. Sets the terminal `status` (`closed` by default, `wont_do` with `--wont-do`) and stamps `updated`.
2. Appends a canonical newest-first entry to `completed.md`. `closed` items always get an entry (with a visible `TODO: summarize outcome` placeholder when `--summary` is omitted, so the gap stays visible); `wont_do` items get one only when you pass `--summary`.
3. Moves `items/<id>.md` into `archived/` — with `git mv` inside a work tree, or a plain rename outside git.
4. Regenerates the managed backlog index.

The command is safe to re-run: an item already in `archived/` produces a no-op warning with no writes. An out-of-enum current status (for example a hand-set `done`) is a hard error that names the file, lists the valid statuses, and tells you how to recover. See the [command reference](config-and-local-state.md#oat-backlog-archive) for exit codes and the `--json` payload.

## Catching lifecycle drift

The manual close-out this command replaces is exactly where the two motivating repos drifted — an item was marked closed in frontmatter and summarized in `completed.md` but never moved to `archived/`, and one shipped with the invalid status `done`. `oat pjm doctor` (and therefore `oat doctor`, which aggregates the `pjm:*` checks) now surfaces that drift:

- **`pjm:backlog_terminal_in_items`** (fail) - a `closed` or `wont_do` item is still sitting in `items/`. Fix: run `oat backlog archive <id>` to finish the move.
- **`pjm:backlog_invalid_status`** (fail) - an item carries an out-of-enum or missing `status`. The message lists the offending file paths and the valid statuses.
- **`pjm:backlog_archived_open`** (warn) - an `open` or `in_progress` item is in `archived/`, which usually means it was archived prematurely.
- **`pjm:backlog_completed_unarchived`** (warn) - `completed.md` references an item whose file still lives in `items/`.

Doctor reports drift; it never auto-fixes. A human or agent runs `oat backlog archive` (or corrects the status) and re-runs doctor to confirm the backlog is clean again.
