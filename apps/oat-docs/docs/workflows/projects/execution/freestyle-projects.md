---
title: Running a Freestyle Project
description: 'The orchestrator branch, lane ledger, lane brief and reports, decisions and memories, reshape checkpoints, and linked projects of a freestyle project.'
---

# Running a Freestyle Project

A freestyle project has no lifecycle workflow: once
[oat-project-freestyle](../planning/starting-projects.md#oat-project-freestyle)
has shaped it, its orchestrator runs it as `shape.md` says. OAT keeps the
records that a long, multi-lane run would otherwise hold only in the
conversation, where compaction loses them. This page covers those records and
the commands that write them.

None of these commands commits or pushes the records it writes unless asked,
except that `oat project new --link-to` saves the new child's scaffold as its
scope does (see [Linked projects](#linked-projects)). The orchestrator saves
the records by the rule the project's `AGENTS.md` gives for its scope: an
exact-path commit on the orchestrator's branch for a shared project,
`oat project push` for a synced project, and nothing for a local one. Run
`oat project scope <project-path> --format value` to see the current scope.

`oat project lane set --commit` and `oat project log append --commit` make the
shared project's exact-path commit in the same command: `lane set` commits
`lanes.md` and the report the update filed, `log append` the project log, and
any other change in the checkout stays uncommitted. In a synced or local
project the code branch holds no records, so they report `nothing-to-commit`.
Neither pushes; pushing (`git push`, or `oat project push` for a synced
project) stays its own step.

## Project files

| File                 | What it holds                                                                                                        | Written by                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `AGENTS.md`          | OAT's fixed rules. Its first line: read `shape.md`, then the `## Live` section of `decisions.md`, then `memories.md` | OAT only; agents never edit it                                                  |
| `shape.md`           | How the project runs, agreed with you                                                                                | The orchestrator, by hand                                                       |
| `decisions.md`       | What the project chose about its work, and why (`## Live`, `## Superseded`)                                          | The orchestrator, by hand                                                       |
| `memories.md`        | What a returning agent should keep in mind (`## User preferences`, `## Gotchas`, `## Context`)                       | The orchestrator, by hand                                                       |
| `state.md`           | The mode, the orchestrator's branch and, for a linked project, its parent                                            | `oat project new`, `oat project orchestrator set`, `oat project complete-state` |
| `linked-projects.md` | One row per linked project, open until acknowledged                                                                  | `oat project new --link-to`, `oat project linked add` and `ack`                 |
| `lanes.md`           | The lane ledger                                                                                                      | `oat project lane set` only                                                     |
| `lane-reports/`      | Each lane's filed reports, one per dispatch, never edited                                                            | `oat project lane set --report`                                                 |
| `project-log.md`     | What happened and when, when the project log is enabled                                                              | `oat project log append` and `synthesize`                                       |

`oat project new --mode freestyle` scaffolds the first five, and
`project-log.md` when the project log is enabled; the others appear on first
use. Apart from `AGENTS.md`, which only OAT changes, only the orchestrator
writes these files, by hand or through the commands above. A lane, or any other
delegate, returns its results to the orchestrator and never edits a project
record. A writable lane on the orchestrator's machine returns an ignored
report file's absolute path; a remote or read-only lane returns the report in
its final message. Its pull request holds code only.

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
delegate in its own worktree and branch, or a
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
- `## Closed` holds one line per merged, completed or superseded lane.
- `## History` holds one append-only line per update, with its update ID.

A lane ID not yet listed creates the lane, with dispatch `d01` open. `--state`
sets one of `dispatched`, `running`, `turn-finished`, `work-settled`,
`review-accepted`, `merged`, `completed`, `blocked` or `superseded`. The terminal
states `merged`, `completed` and `superseded` move the lane to `## Closed`
permanently. A blocked lane takes
`--waiting-on owner|lane|linked-project|external`. `--dispatch` opens the
next dispatch once the last one has closed, `--steer "<text>"` records a
message sent while the lane runs, and `--no-report` closes an interrupted
turn. `--worktree` sets the placement: this checkout is `shared-worktree`, any
other path `own-worktree`. Run `oat project lane set --help` for every field;
`--commit` commits what the update wrote (see the start of this page).
Worktrees inside the repository are stored relative to it, paths elsewhere
under your home as `~/...`, and other paths as absolute values. Placement is
derived from the full path before shortening; older absolute entries keep
working when updated without `--worktree`. Active blocks keep task and thread
handles; new History lines omit them. Write all records, including ledger
free text, for their scope's audience: everyone who can read `origin` from
creation for synced projects, everyone who can read the branch once pushed
for shared projects, and this checkout only for local projects.

Use `oat project lane set l12 --state completed` when you accept a verification
or advisory result that needs no PR merge. The final dispatch must be settled.
You can file its report with `--report <file>` in the same update. A filed report
ends the dispatch, and `completed` ends the lane. The Closed row retains the
head and report pointer, and History records the transition.

The project `AGENTS.md` keeps the resume rule: read `lanes.md` and reconcile
open dispatches before acting. Before dispatching or re-dispatching a lane,
when it reports back and before integrating its branch, read the lane guide
with `oat template resolve lane-guide --output <path>`. It holds the Dispatch,
Lane brief, Lane reports and Lane placement rules.

Every lane follows the same standing rules, so they ship as a template
instead of being repeated in each brief. Copy them with
`oat template resolve lane-brief --output <path>` and embed them whole at the
start of every dispatch brief. The bundled `lane-brief.md` has five sections:
Your dispatch (what the brief adds), Project records (the lane writes none, and
the orchestrator files its report), Lane notes, Paths and commits (exact-path
commits in the orchestrator's checkout, every commit listed in the report) and
Report (every turn end gets one, and its Tested SHA equals the delivered head).
The brief then adds only what is particular to the dispatch: the lane and
dispatch IDs, the paths of `AGENTS.md` and `shape.md`, the worktree and branch
or the `paths:` the lane may change, its lane notes and report paths and the task. Both paths are authorized scratch
outside a same-checkout lane's `paths:`. Confirm they are ignored with
`git check-ignore`; if either is not, authorize paths outside the checkout
instead, for example under `$TMPDIR`.

Each dispatch brief also embeds the report shape, copied with
`oat template resolve lane-report --output <path>`. The bundled
`lane-report.md` asks for Summary (this round and the lane so far), Delivered,
Verification, Decisions, Deviations, Steering received, Review findings,
Learnings, Open items and Proposed log entries. A `lane-guide.md`, `lane-brief.md` or
`lane-report.md` at the repository or user template tier overrides the bundled
one (see
[File Locations](../../../reference/file-locations.md)).

A lane with write access on the orchestrator's machine writes its report to
the authorized ignored file beside its notes and names the absolute path in
its final message. A remote or read-only lane returns the report as its final
message; the orchestrator saves that text verbatim outside the project
records. Before acting on either report and before removing the lane's
worktree, the orchestrator runs
`oat project lane set <lane> --report <file> --head <delivered head>`. That
one update copies the file verbatim into `lane-reports/<lane>-<dispatch>.md`,
sets the report pointer and head, and closes the dispatch. A different file
already at that path is refused, because a filed report is never edited. In a
repository whose commit hooks format Markdown, exclude `lane-reports/` from
them so the committed report stays verbatim. The orchestrator then appends
the log entries it accepts, keyed by the dispatch ID (`--source l01-d02` for a
judgment entry, `--ref l01-d02` for a structural one), and promotes accepted
decisions and gotchas (see
[Decisions and memories](#decisions-and-memories)).

**Head-ahead check.** For a lane in its own worktree with a recorded branch
and head whose dispatch has closed (`reported` or `no-report`), `lane set` and
`status` warn when the branch head in this clone has moved past the last
report's head, or no longer contains it after a rebase or reset:
`Lane head ahead of its report: l01 (branch lane/l01) is 2 commits past the last report's head <sha>; do not merge unreported commits unreviewed.`
After rebasing a lane's branch, record with `lane set --head` the rebased
equivalent of the last reported commit, not the new branch tip. If you cannot
identify that commit, leave the warning in place.
A branch that no longer contains the reported head gets the same warning,
saying it has moved off that head. While the lane's dispatch is `open` its work
is in flight, so the lane is not checked (`lane set --json` reports `headCheck`
as `null`). A lane in the orchestrator's checkout is not checked either, and a
branch that is not in this clone is not flagged (`lane set --json` reports its
`headCheck` as `unknown`).

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

## Reshape checkpoints

`shape.md` lists the moments to revisit how the project runs. At each one, and
when a plan written after shaping is accepted, the orchestrator asks two
questions, which the `shape.md` template, the project's `AGENTS.md` and the
skill's reshape reference all carry:

1. **Does the shape still fit?**
2. **Is the plan and its process proportionate to its value?** It is tested by
   process time against code time (above about 3x needs a stated reason, a
   prompt to explain rather than a hard rule), by what risk each safeguard
   covers and whether that risk exists now, and by the lightest process that
   keeps the real gates: the reviews and approvals that you or the repository
   require.

Each answer carries its reason; a bare "no change" answers neither. A "no"
reaches you as a recommendation with the lighter alternative, even in an
unattended run, and the shape changes only once you agree, through
[oat-project-freestyle](../planning/starting-projects.md#oat-project-freestyle).

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

## Closing the project

Invoke `oat-project-complete` when you are ready to close. It asks you to
confirm `shape.md`'s done criteria and offers a retrospective and documentation
sync. Neither is required. Documentation uses the shape's documents,
`decisions.md` `## Live`, lane reports, the project log and merged changes;
retro uses the available evidence and names anything missing. Neither needs a
lifecycle plan or journal. Their commits and pushes follow `shape.md` and the
scope: local records stay uncommitted. Retro apply proposals stay pending when
their required durable receipts cannot be saved.

On an active synced project, completion, documentation and retro refresh the
checkout before reading the shape. They can continue with uncommitted edits
when the checkout is already at the fetched revision. A stale dirty checkout
or another pull failure stops the run. Optional work invoked by completion
uses the checkout that completion already checked.

Completion synthesizes an existing project log only while synthesis is pending,
keeps an existing synthesis and skips an absent log. It then runs
`oat project complete-state <project-path>`. For synced scope it runs the
agreed `oat project push <project-path>` before
`oat project archive <project-path>`. Withheld publication leaves the project
**complete locally, with archive pending until the agreed push succeeds**;
the checkout and active pointer stay in place. Archive's own commit and storage
publication also follow the shape. Shared and local archives need no project-ref
push, and local records remain uncommitted. For every scope, the skill previews
archive with `--dry-run --json` and checks its actual effects against the scope
and shape. A non-null `s3Path` would upload the records; local records are never
uploaded automatically. If publication is not permitted, the completed checkout
and pointer remain in place with archive pending. A retry after synced archive
uses the existing receipt, including when the remote retains a matching active
alias or local checkout cleanup was interrupted. Its preview and shape still
govern any effects. The skill reports archive's actual
result and any pending work.

Freestyle requires no final review, summary or PR, and completion runs none.
`oat-project-summary` and `oat-project-pr-final` still stop for freestyle.

## Older projects

A project created by an earlier OAT has an `AGENTS.md` without the newer
sections. On every resume, after the claim, `oat-project-freestyle` compares
the file's `##` headings with OAT's current `project-agents` template. When
one is missing, it replaces the file whole, because the file holds no project
answers. An older project may also lack `## Closing the project`. An m03-era project lacks `## Working with lanes`, so the refresh adds that
section and removes the four sections now in the lane guide. It then creates a missing `decisions.md` or `memories.md`. A project
with no `oat_orchestrator_branch` reads as unclaimed until its orchestrator
runs `oat project orchestrator set`.

## Related

- [oat-project-freestyle](../planning/starting-projects.md#oat-project-freestyle)
- [Project Log](project-log.md)
- [CLI Reference](../../../reference/cli-reference.md)
- [Project Artifacts](../../../reference/project-artifacts.md)
