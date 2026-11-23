---
title: Running a Freestyle Project
description: 'The orchestrator branch, lane ledger and reports, decisions and memories, and linked projects of a freestyle project.'
---

# Running a Freestyle Project

A freestyle project has no lifecycle workflow: once
[oat-project-freestyle](../planning/starting-projects.md#oat-project-freestyle)
has shaped it, its orchestrator runs it as `shape.md` says. OAT keeps the
records that a long, multi-lane run would otherwise hold only in the
conversation, where compaction loses them. This page covers those records and
the commands that write them.

None of these commands commits or pushes the records it writes, except that
`oat project new --link-to` saves the new child's scaffold as its scope does
(see [Linked projects](#linked-projects)). The orchestrator saves the records
by the rule the project's `AGENTS.md` gives for its scope: an exact-path commit
on the orchestrator's branch for a shared project, `oat project push` for a
synced project, and nothing for a local one. Run
`oat project scope <project-path> --format value` to see the current scope.

## Project files

| File                 | What it holds                                                                                                        | Written by                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `AGENTS.md`          | OAT's fixed rules. Its first line: read `shape.md`, then the `## Live` section of `decisions.md`, then `memories.md` | OAT only; agents never edit it                                  |
| `shape.md`           | How the project runs, agreed with you                                                                                | The orchestrator, by hand                                       |
| `decisions.md`       | What the project chose about its work, and why (`## Live`, `## Superseded`)                                          | The orchestrator, by hand                                       |
| `memories.md`        | What a returning agent should keep in mind (`## User preferences`, `## Gotchas`, `## Context`)                       | The orchestrator, by hand                                       |
| `state.md`           | The mode, the orchestrator's branch and, for a linked project, its parent                                            | `oat project new`, `oat project orchestrator set`               |
| `linked-projects.md` | One row per linked project, open until acknowledged                                                                  | `oat project new --link-to`, `oat project linked add` and `ack` |
| `lanes.md`           | The lane ledger                                                                                                      | `oat project lane set` only                                     |
| `lane-reports/`      | Each lane's filed reports, one per dispatch, never edited                                                            | `oat project lane set --report`                                 |
| `project-log.md`     | What happened and when, when the project log is enabled                                                              | `oat project log append`                                        |

`oat project new --mode freestyle` scaffolds the first five, and
`project-log.md` when the project log is enabled; the others appear on first
use. Apart from `AGENTS.md`, which only OAT changes, only the orchestrator
writes these files, by hand or through the commands above. A lane, or any other
delegate, returns its results to the orchestrator and never edits a project
record. Its final message is its report, and its pull request holds code
only.

## The orchestrator branch

`state.md` records the orchestrator's branch as `oat_orchestrator_branch`.
`oat project new` sets it to the current branch. It is left empty on a
detached HEAD, and for a child created with `--link-to`, because the parent
creates that child but does not run it. A project created before the field
existed has none. An empty or absent value means the project is unclaimed.

- `oat project orchestrator set [--project <name-or-path>] [--branch <name>]`
  claims the project with this checkout's branch, or with the branch you name.
  It refuses to change a different recorded branch unless you pass
  `--replace`. It needs `--branch` on a detached HEAD. It writes only
  `state.md`.
- `oat project status` prints `Orchestrator branch:` (or `unclaimed`) and
  `Current branch:`, and says whether this checkout is the orchestrator. When
  it is not, the line names the lane that `lanes.md` lists on this branch, or
  says the checkout is `a lane`. `--json` adds an `orchestrator` object.
- The commands that write freestyle records are `oat project new --link-to`
  (checked against the parent), `oat project linked add`,
  `oat project linked ack` and `oat project lane set`. Each refuses, before any
  write, when the project is unclaimed, when this checkout is on another
  branch, or when it is on a detached HEAD. `oat project log append` is not
  guarded.

The check compares branch names, so it identifies a checkout on another
branch. A lane on the orchestrator's own branch passes it: a subagent in the
orchestrator's checkout, or another clone on that branch. For such a lane,
its brief and the single-writer rule are the guard. The project's `AGENTS.md`
gives every session this test: you are a lane if your brief says so; once the
project is claimed, you are also a lane if your branch is not
`oat_orchestrator_branch`; lanes do not write project records.

## Lanes and lane reports

A lane is one delegated line of work inside the project. It is either a
delegate in its own worktree and branch, with its own pull request, or a
subagent in the orchestrator's checkout limited to the paths its ledger entry
gives it. A dispatch is one request to a lane that ends in one report: the
first launch, then each follow-up after the lane's turn ends. Lanes are
numbered `l01`, `l02`, and so on, dispatches per lane `d01`, `d02`, and ledger
updates `u001`, `u002`.

`oat project lane set <lane>` is the only writer of `lanes.md`, and it
replaces the file in one atomic write. The ledger has three sections:

- `## Active` holds one block per open lane, rewritten in place, with fields
  such as state, dispatch, next action and owner, handles, worktree, branch,
  base, head and report pointer.
- `## Closed` holds one line per merged or superseded lane.
- `## History` holds one append-only line per update, with its update ID.

A lane ID not yet listed creates the lane, with dispatch `d01` open. `--state`
sets one of `dispatched`, `running`, `turn-finished`, `work-settled`,
`review-accepted`, `merged`, `blocked` or `superseded`; a merged or superseded
lane moves to `## Closed` and cannot be updated again. A blocked lane takes
`--waiting-on owner|lane|linked-project|external`. `--dispatch` opens the
next dispatch once the last one has closed, `--steer "<text>"` records a
message sent while the lane runs, and `--no-report` closes an interrupted
turn. `--worktree` sets the placement: this checkout is `shared-worktree`, any
other path `own-worktree`. Run `oat project lane set --help` for every field.

Each dispatch brief embeds the report shape, copied with
`oat template resolve lane-report --output <path>`. The bundled
`lane-report.md` asks for Summary (this round and the lane so far), Delivered,
Verification, Decisions, Deviations, Steering received, Review findings,
Learnings, Open items and Proposed log entries. A `lane-report.md` at the
repository or user template tier overrides it (see
[File Locations](../../../reference/file-locations.md)).

When the lane returns its report, the orchestrator saves the text to a file
outside the project records and runs
`oat project lane set <lane> --report <file> --head <delivered head>`. That
one update copies the file verbatim into `lane-reports/<lane>-<dispatch>.md`,
sets the report pointer and head, and closes the dispatch. A different file
already at that path is refused, because a filed report is never edited. In a
repository whose commit hooks format Markdown, exclude `lane-reports/` from
them so the committed report stays verbatim. The orchestrator then appends
the log entries it accepts, keyed by the dispatch ID (`--ref l01-d02`), and
promotes accepted decisions and gotchas (see
[Decisions and memories](#decisions-and-memories)).

**Head-ahead check.** For a lane in its own worktree with a recorded branch
and head, `lane set` and `status` warn when the branch head in this clone has
moved past the last report's head, or no longer contains it after a rebase or
reset:
`Lane head ahead of its report: l01 (branch lane/l01) is 2 commits past the last report's head <sha>; do not merge unreported commits unreviewed.`
A branch that no longer contains the reported head gets the same warning,
saying it has moved off that head. A lane in the orchestrator's checkout is not
checked, and a branch that is not in this clone is not flagged
(`lane set --json` reports its `headCheck` as `unknown`).

**Lane notes.** A lane writes each decision and gotcha, as it happens, to an
uncommitted notes file in its own checkout,
`.oat/analysis/lane-notes/<lane>-<dispatch>.md`, and builds its report's
Decisions and Learnings from it. The brief names that path as authorized
scratch. Where the repository does not ignore that path (ignoring it is an
`oat init` choice), the brief names a path outside the checkout instead. A
read-only delegate keeps no notes and returns its decisions and learnings in
its final message.

**On resume**, after `shape.md`, the `## Live` section of `decisions.md` and
`memories.md`, the orchestrator reads `lanes.md` before acting. For each open
dispatch, it checks the lane's handle and the forge, and records what it finds
with `lane set` before dispatching again. In a lane's worktree of a shared
project, `status` reads the copy of `lanes.md` committed on that branch. To
read the current ledger there, pass `--project-path` with the orchestrator
checkout's project folder.

## Decisions and memories

Each file answers one question: `shape.md` how the project works,
`decisions.md` what it chose about the work and why, `memories.md` what a
returning agent should keep in mind, and `project-log.md` what happened and
when. A change to how the project works is a reshape and stays in
`shape.md`. A project document with its own decisions section, such as a
brief's `## Decisions`, points to `decisions.md` instead of repeating it.

- A decision is a `### drNN · <decision statement>` entry under `## Live`,
  with its date, two to four lines of why and its source: a dispatch ID such
  as `l07-d02`, a document, or you.
- When a decision replaces an earlier one, the new entry carries
  `Supersedes: drNN`. The replaced entry moves intact to `## Superseded`, with
  `Superseded by drNN, <date>` added. `## Live` therefore holds only current
  decisions, and a resuming agent reads all of it.
- A memory is one dated, sourced bullet under `## User preferences`,
  `## Gotchas` or `## Context`, corrected or pruned in place when it stops
  being true.

The orchestrator writes both files by hand; no command writes them. A project
created before OAT scaffolded them gets each file on its next resume through
`oat-project-freestyle`, which runs
`oat template resolve <decisions|memories> --output <path>` only when the file
is absent, because the copy replaces its target. A linked child starts with
its own empty files.

## Linked projects

A linked project is a whole freestyle project related to another, usually as
a part of a larger one, with its own `shape.md`, orchestrator, lanes and pull
requests. A lane never contains a linked project, but a blocked lane can wait
on one (`--waiting-on linked-project`). Linked projects are separate from
reviewer links (`oat project links`) and from the coordination fields of a
split project (`oat_parent`, `oat_children`).

- **Create one.** From the parent's orchestrator checkout, run
  `oat project new <child> --mode freestyle --link-to <parent> --purpose "<one line>"`.
  The child records `oat_linked_from: <parent>` and starts unclaimed. The
  parent gets an open row (name, path, scope, purpose, date) in its own
  `linked-projects.md`, and stays the active project. The child's scaffold is
  committed or published as its scope does on creation; the parent's row is
  not.
- **Link an existing one.** `oat project linked add <child> --purpose "<one line>"`
  writes only the parent's row. Both projects must be freestyle, and a second
  open row for the same child is refused.
- **Run the child.** A separate orchestrator session runs the child. For a
  shared or synced child, it starts its own branch from the parent's branch in
  its own worktree, first running `oat project pull <child>` for a synced
  child. A local child exists only in the checkout that created it, so its
  orchestrator runs there. It then claims the child with
  `oat project orchestrator set --project <child>` (the parent stays the
  active project where the child was created) and shapes it with
  `oat-project-freestyle`, whose first question for a linked child is whether
  to adopt the parent's shape. Adopting copies the parent's `shape.md` as a
  snapshot, with `## Goal` reset and an `**Adopted from:**` line naming the
  parent and its `Last shaped:` date. The child never writes the parent's
  records.
- **Acknowledge it.** `oat project status` on the parent prints one
  `Open linked project:` line per open row (`--json`: `linkedProjects.open`).
  After every merge and on resume, the parent's orchestrator reads each open
  child's records and updates its own documents. It then runs
  `oat project linked ack <child>`, which moves the row to `## Closed` with
  the date and attempts a structural log entry,
  `### <date> · structural · oat-project-linked · <child>`, with the time and
  the child as source project. With the project log disabled the entry is
  `skipped` and the row still closes.

`--link-to`, `linked add`, `linked ack` and `--project` take a project name or
a path. A name is looked up in the shared, local and synced projects of this
checkout, except that `linked ack` matches its child argument, or the last part
of a path, against the parent's open rows. A name found in more than one scope
is refused as ambiguous. A synced project that is not pulled here is refused
with the `oat project pull <name>` instruction.

## Older projects

A project created by an earlier OAT has an `AGENTS.md` without the newer
sections. On every resume, after the claim, `oat-project-freestyle` compares
the file's `##` headings with OAT's current `project-agents` template. When
one is missing, it replaces the file whole, because the file holds no project
answers. It then creates a missing `decisions.md` or `memories.md`. A project
with no `oat_orchestrator_branch` reads as unclaimed until its orchestrator
runs `oat project orchestrator set`.

## Related

- [oat-project-freestyle](../planning/starting-projects.md#oat-project-freestyle)
- [Project Log](project-log.md)
- [CLI Reference](../../../reference/cli-reference.md)
- [Project Artifacts](../../../reference/project-artifacts.md)
