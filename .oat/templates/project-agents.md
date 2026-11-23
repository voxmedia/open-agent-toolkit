---
oat_template: true
oat_template_name: project-agents
---

Read `shape.md` in this folder before acting: it holds how this project runs.

# Freestyle project: {Project Name}

This is a freestyle OAT project: OAT keeps its structure and records and runs
no lifecycle workflow, so there are no gates, checkpoints, required reviews,
automatic commits, pushes or PRs. This file holds the fixed rules OAT supplies.
It is OAT-owned: agents do not edit it, and only OAT-supplied content changes
it. Agreements made with the user belong in `shape.md`, never here.

## Project files

- `AGENTS.md` (this file): the fixed rules.
- `shape.md`: the current operating shape, agreed with the user and owned by
  the orchestrator and the user. Its sections are the shaping topics; a section
  reading `_Not yet shaped._` still needs the shaping conversation, and
  `## Undecided` lists deferred items with the moment each becomes due.
- `state.md`: the project's identity (`oat_workflow_mode: freestyle`), the
  orchestrator's branch (`oat_orchestrator_branch`) and, for a linked project,
  its parent (`oat_linked_from`); it has no lifecycle fields.
- The project's documents, listed in `shape.md` under `## Documents`.
- `linked-projects.md`, once a project is linked to this one: one row per
  linked project, open until this project acknowledges it.
- `lanes.md`, once a lane is recorded: the lane ledger, one block per open
  lane, one line per closed lane and one history line per update.
- `lane-reports/`: each lane's filed reports, one per dispatch
  (`<lane>-<dispatch>.md`), never edited.
- `project-log.md`, when the project log is enabled.

## Single writer

Only the orchestrator, the agent running this project with the user, writes
the project records: `shape.md`, the project's documents, `lanes.md`,
`lane-reports/`, `linked-projects.md` and `project-log.md`, and it alone claims
the project with `oat project orchestrator set`. Delegates (subagents, lanes,
other sessions) return their results to the orchestrator and never edit these
files, the lane ledger included: a lane's final message is its report, which
the orchestrator files. A delegate's PR holds code only. Each project writes only its own records: a
linked project never writes another project's. On resume, reconcile the
records against the forge (open and merged PRs, branch heads) before acting on
them.

## Where records live

A project can move between scopes, and a move copies this folder unchanged, so
resolve the current scope before writing, committing or publishing records:

```bash
oat project scope <project-path> --format value
```

- `shared`: the records are committed on the orchestrator's branch, which is
  the integration branch. Keep the orchestrator's checkout on it and do side
  work and trial merges in other worktrees. Commit records with exact paths
  (`oat internal commit-paths`), never a broad `git add`.
- `synced`: the records live in the project's nested worktree, which the code
  branch ignores, and are published to `refs/oat/projects/<slug>` with
  `oat project push`; `oat project pull` brings in another checkout's copy.
  Never stage them on the code branch.
- `local`: the records stay uncommitted in this checkout, on one machine.
  There is nothing to commit, push or pull.

When records are committed, pushed or opened as PRs is agreed in `shape.md`
under `## Commits, PRs and merges`. OAT does none of it after creation; while
that section is not yet shaped or is deferred, commit and push nothing.

## Orchestrator branch

`state.md` records `oat_orchestrator_branch`, the branch the orchestrator
works on. `oat project status` prints it beside this checkout's branch and
says when this checkout is not the orchestrator.

You are a lane if your brief says so, wherever you run. If
`oat_orchestrator_branch` is empty or absent, the project is unclaimed: the
session designated as its orchestrator runs `oat project orchestrator set`
before shaping or writing records. Once it is claimed, if your branch isn't
`oat_orchestrator_branch`, you are a lane even with no brief. Lanes don't write
project records.

- `oat project orchestrator set` records this checkout's branch, or
  `--branch <name>`; changing a recorded branch needs `--replace`. It writes
  `state.md` only: save it as the other records are saved.
- The record-writing commands (`oat project new --link-to` on the parent,
  `oat project linked add`, `oat project linked ack` and
  `oat project lane set`) refuse to run off the recorded branch, on a detached
  HEAD, or while the project is unclaimed.
- The check compares branches, so a lane on the orchestrator's own branch (a
  subagent in the orchestrator's checkout, or another clone on that branch)
  passes it; its brief and the single-writer rule are its guard.

## Linked projects

A linked project is a whole project related to this one, usually a part of a
larger one (as a story is to an epic), with its own `shape.md`, orchestrator,
lanes and PRs. A lane never contains a linked project; a lane can wait on one.

- **Creating one.** The parent's orchestrator runs
  `oat project new <child> --mode freestyle --link-to <parent> --purpose "<one line>"`:
  the child records `oat_linked_from: <parent>` and starts unclaimed, and the
  parent gets an open row in its own `linked-projects.md`.
  `oat project linked add <child> --purpose "<one line>"` links an existing
  freestyle project by writing only the parent's row. Neither commits or
  pushes the row: save it by the records rule for the parent's scope.
- **Running one.** A separate orchestrator session runs the child, opened by
  the user or by the parent's orchestrator. It first claims the child with
  `oat project orchestrator set` on its own branch, then shapes it with the
  `oat-project-freestyle` skill. A shared child's scaffold, and a synced
  child's pointer, are committed on the parent's branch, so the child's
  orchestrator starts its own branch from there in its own worktree (and runs
  `oat project pull <child>` for a synced child) before claiming. A local child
  exists only in the checkout that created it. The child never writes the
  parent's records.
- **Acknowledging one.** After every merge and on resume, check
  `oat project status` for `Open linked project:` lines. For each, read the
  child's records (pull a synced child first), update this project's
  documents, then run `oat project linked ack <child>`: it closes the row and
  attempts a `project-log.md` entry naming the child as source project, so it
  works with the project log disabled.

## Dispatch

A lane is one delegated line of work inside this project: a delegate in its
own worktree and branch with its own PR, or a subagent in the orchestrator's
checkout limited to the `paths:` its ledger entry gives it. A lane has no
records or orchestrator of its own. A dispatch is one request to a lane that
ends in one report: the first launch, then each follow-up after the lane's turn
ends. Lanes are numbered `l01`, `l02`, ...; dispatches are numbered per lane,
`d01`, `d02`, ...; ledger updates are `u001`, `u002`, ...

`lanes.md` is written only by `oat project lane set`, so a lane's state
survives compaction. Record each launch, change and observation as it
happens:

- `oat project lane set l01 --task <handle> --thread <handle> --worktree <path> --branch <branch> --base <sha> --next "<one line>" --owner <who>`
  creates the lane with dispatch `d01` open. Add `--provider`, `--model`,
  `--effort` and `--observed-model` when they are known, and `--wake` for what
  wakes you for this lane.
- `--state` is one of `dispatched`, `running`, `turn-finished`,
  `work-settled`, `review-accepted`, `merged`, `blocked` (with
  `--waiting-on owner|lane|linked-project|external` and `--blocker "<one line>"`)
  or `superseded` (with `--replaced-by <lane>`). Merged and superseded lanes
  move to the closed list and are not reopened.
- `--dispatch` opens the lane's next dispatch once its last one has closed.
- A message to a lane while it runs (a steer) amends the open dispatch: record
  it with `--steer "<one line>"`. Wakes are notifications, not dispatches.
- Every turn end, partial ones included, gets a report (see Lane reports). An
  interrupted turn closes its dispatch with `--no-report`.
- The ledger holds no reasoning beyond a one-line next action or blocker; an
  empty value (`--blocker ""`) clears a field.

Each dispatch brief names the lane and dispatch IDs; the paths of this file
and `shape.md`; the lane's worktree and branch, or the `paths:` it may change in
the orchestrator's checkout; that the lane writes no project records; and the
report shape. Copy the shape with
`oat template resolve lane-report --output <path>` and embed it whole, with the
instruction to return it filled in as the lane's final message.

On resume, read `lanes.md` before acting. For each active lane with an open
dispatch, check its task or thread handle and the forge (its PR, its branch
head) and record what you find with `lane set` before any redispatch: a lane
that is still running is waited on or steered, not dispatched again.

## Lane reports

A lane's final message for a dispatch is its report. File it before acting on
it:

1. Save the returned text verbatim to a file outside the project records, for
   example under `$TMPDIR`.
2. Run `oat project lane set <lane> --report <file> --head <delivered head>`:
   it copies the file into `lane-reports/<lane>-<dispatch>.md`, sets the lane's
   report pointer and head and closes the dispatch in one write. A filed report
   is never edited.
3. Append the accepted proposed log entries with `oat project log append`,
   keyed by the dispatch ID (for example `--ref l01-d02`).

When a lane merges, or another event matters to the project's story, append a
structural log entry (see Records commands) whose `--ref` is the update ID that
`lane set` printed for the update recording the event; other ledger updates get
no log entry.

The ledger's `head` is the head the lane's last report delivered. For a lane
in its own worktree, `oat project lane set` and `oat project status` flag a
branch head that has moved past it. Do not merge unreported commits
unreviewed: dispatch the lane to report them, or review them yourself first.

## Lane placement

You decide per lane whether it works in its own worktree or as a subagent in
your checkout; OAT supports both and prescribes neither. `lane set` derives the
placement from `--worktree`: this checkout is `shared-worktree`, any other is
`own-worktree`.

- **Own worktree.** The lane has its own worktree, branch and PR. Record
  `--worktree`, `--branch` and `--base`; the head-ahead check applies, and its
  work reaches the orchestrator's branch by the merge rules in `shape.md`.
- **Your checkout.** A subagent works in your worktree, on your branch,
  limited to the `--paths` its entry gives it. Its commits use exact paths
  (`oat internal commit-paths`), never a broad `git add`; attribution comes
  from the commit list in its report; you verify the combined head after its
  turn, and the head-ahead check does not apply.

## Records commands

- `oat project status --project-path <project-path>`: the mode, the paths of
  this file and `shape.md`, the orchestrator branch beside this checkout's
  branch (naming the lane `lanes.md` lists on it), the lanes whose branch head
  is past their last report, and the open linked projects. Run in a lane's
  worktree, point `--project-path` at the orchestrator checkout's copy of the
  project to read the current ledger.
- `oat project orchestrator set [--branch <name>] [--replace]`: claim the
  project or change its orchestrator branch.
- `oat project linked add <child> --purpose <text>` and
  `oat project linked ack <child>`: open and close rows in
  `linked-projects.md`.
- `oat project lane set <lane> [...]`: create or update a lane in `lanes.md`
  and file its reports (see `--help`).
- `oat project scope <project-path> --format value`: the current scope.
- `oat project log append --project <project-path> ...`: append a project-log
  entry (see `--help`). A `skipped` result means the project log is disabled;
  `shape.md` must still stand on its own. A structural entry
  (`--structural --producer <name> --ref <ref>`) can record an event such as
  `merged`: `--time` adds the UTC time of the append, `--subject <id>` the
  phase or other id it is about, and `--source-project <name>` the
  project it came from.
- `oat project journal check --at completion --project <project-path>`: a
  coverage report of the phases it recognized, validated and skipped (with
  reasons) in `plan.md` and `implementation.md`, when the project keeps them.
  A missing file is reported, not an error. `--at` is required: `completion`
  and `implement-preflight` give the same report, and `review` also needs a
  `--scope` of phases those documents name.
- `oat template resolve <name> --output <path>`: copy an OAT template as the
  starting point for a project document, or `lane-report` for a dispatch
  brief.
- `oat project push` and `oat project pull`: publish and fetch the records of
  a synced project.

## Shaping and reshaping

`shape.md` is shaped with the user through the `oat-project-freestyle` skill,
which resumes at the first section not yet shaped. To change how the project
runs, follow the `oat-project-freestyle` skill's own `references/reshape.md`
(in the installed skill's folder, not this project's `references/`): edit only
the affected `shape.md` sections, update `Last shaped:`, state when the change
takes effect, and attempt a `decision` entry in the project log.

When a review recorded in `shape.md` comes due, re-check its mechanism before
using it. If it is unavailable, keep the review's intent, tell the user, log
it, and reshape: an agreement that stopped working is a reshape trigger.
