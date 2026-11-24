---
oat_template: true
oat_template_name: project-agents
---

Read `shape.md`, then the `## Live` section of `decisions.md`, then `memories.md` in this folder before acting: they hold how this project runs, what it has decided and what to keep in mind.

# Freestyle project: {Project Name}

This is a freestyle OAT project: OAT keeps its structure and records and runs
no lifecycle workflow, so there are no gates, checkpoints, required reviews,
automatic commits, pushes or PRs after creation.

A shared project's creation commits its scaffold unless `--no-commit` is
passed. Synced creation publishes its initial ref and writes its pointer,
committing the pointer on the code branch unless `--no-commit` is passed.
`--no-commit` does not stop the synced publish. Nothing else is committed or
pushed until commits are shaped.

This file holds the fixed rules OAT supplies.
It is OAT-owned: agents do not edit it, and only OAT-supplied content changes
it. Agreements made with the user belong in `shape.md`, never here.

## Project files

- `AGENTS.md` (this file): the fixed rules.
- `shape.md`: the current operating shape, agreed with the user and owned by
  the orchestrator and the user. Its sections are the shaping topics; a section
  reading `_Not yet shaped._` still needs the shaping conversation, and
  `## Undecided` lists deferred items with the moment each becomes due.
- `decisions.md`: what the project chose about its work and why, one
  `### drNN` entry per decision; `## Live` holds the current decisions and
  `## Superseded` the replaced ones.
- `memories.md`: what a returning agent should keep in mind, as dated and
  sourced bullets under `## User preferences`, `## Gotchas` and `## Context`.
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
the project records: `shape.md`, `decisions.md`, `memories.md`, the
project's documents, `lanes.md`, `lane-reports/`, `linked-projects.md` and
`project-log.md`, and it alone claims the project with
`oat project orchestrator set`. Delegates (subagents, lanes,
other sessions) return their results to the orchestrator and never edit these
files, the lane ledger included. A writable lane on the orchestrator's machine
writes an ignored report file beside its notes and names its absolute path in
its final message; a remote or read-only lane's final message is its report.
The orchestrator files either report with `lane set --report` before the
lane's worktree is removed, and stays the only writer of `lane-reports/`.
A delegate's PR holds code only. Each project writes only its own records: a
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

Write all records, including ledger free text, for their audience: everyone
who can read `origin` from creation in synced scope; everyone who can read the
branch once pushed in shared scope; this checkout only in local scope.

When records are committed, pushed or opened as PRs is agreed in `shape.md`
under `## Commits, PRs and merges`. OAT does none of it after creation; while
that section is not yet shaped or is deferred, commit and push nothing.

## Decisions and memories

Each file answers one question: `shape.md` how this project works,
`decisions.md` what it chose about the work and why, `memories.md` what a
returning agent should keep in mind, and `project-log.md` what happened and
when.

- **Authority.** A change to how the project works is a reshape: it stays in
  `shape.md`, with its `decision` entry in the project log. A decision about
  the work lives only in `decisions.md`: a project document with its own
  decisions section, such as a brief's `## Decisions`, points to
  `decisions.md` instead of repeating it, and a `decision` log entry may cite
  a `drNN`. What is still true goes in `memories.md`; what happened goes in
  the log.
- **Writing.** The orchestrator writes both files by hand, with no command, as
  it writes `shape.md`, and saves them by the records rule above. A decision
  is a `### drNN · <decision statement>` entry under `## Live`, numbered after
  the highest `drNN` in the file, with its date, two to four lines of why and
  its source: a dispatch ID such as `l07-d02`, a document, or the user. A
  memory is one bullet under `## User preferences`, `## Gotchas` or
  `## Context` with its date and source; correct or prune it in place when it
  stops being true.
- **Superseding.** When a decision replaces an earlier one, add the new entry
  under `## Live` with `Supersedes: drNN`, then move the replaced entry intact
  to `## Superseded` and add `Superseded by drNN, <date>` to it, naming the
  new entry. `## Live` then holds only current decisions: on resume, read all
  of it, and never act on a superseded entry.
- **First use.** A project created before these files existed has neither.
  Create each missing one with
  `oat template resolve <decisions|memories> --output <project-path>/<name>.md`,
  and only when it is absent, because the copy replaces an existing file. The
  `oat-project-freestyle` skill does this on resume.
- **Linked projects.** A linked project starts with its own empty files.

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
  `oat project orchestrator set --project <child>` on its own branch, then
  shapes it with the `oat-project-freestyle` skill. A shared child's scaffold,
  and a synced child's pointer, are committed on the parent's branch, so the
  child's orchestrator starts its own branch from there in its own worktree
  (and runs `oat project pull <child>` for a synced child) before claiming. A
  local child exists only in the checkout that created it. The child never
  writes the parent's records.
- **Acknowledging one.** After every merge and on resume, check
  `oat project status` for `Open linked project:` lines. For each, read the
  child's records (pull a synced child first), update this project's
  documents, then run `oat project linked ack <child>`: it closes the row and
  attempts a `project-log.md` entry naming the child as source project, so it
  works with the project log disabled.

## Working with lanes

On resume, read `lanes.md` before acting. For each active lane with an open
dispatch, check its task or thread handle and the forge (its PR, its branch
head) and record what you find with `lane set` before any redispatch: a lane
that is still running is waited on or steered, not dispatched again.

Read the lane guide before dispatching or re-dispatching a lane, when a lane
reports back and before integrating a lane's branch. Resolve it with
`oat template resolve lane-guide --output <path>`; it holds Dispatch, Lane
brief, Lane reports and Lane placement rules.

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
  project it came from. `--idempotency-key` is optional here: without one the
  command derives a key from the entry, so running the same append again
  writes nothing; a key the body lacks is added to its end.
- `oat project journal check --at completion --project <project-path>`: a
  coverage report of the phases it recognized, validated and skipped (with
  reasons) in `plan.md` and `implementation.md`, when the project keeps them.
  A missing file is reported, not an error. `--at` is required: `completion`
  and `implement-preflight` give the same report, and `review` also needs a
  `--scope` of phases those documents name.
- `oat template resolve <name> --output <path>`: copy an OAT template as the
  starting point for a project document, `lane-brief` and `lane-report` for a
  dispatch brief, or `decisions` and `memories` when the file is absent.
- `--commit` on `oat project lane set` and `oat project log append`: commit
  `lanes.md` and the report the update filed, or the project log, by exact
  path, leaving every other change uncommitted. In a synced or local project
  the code branch holds no records, so there is nothing to commit. Neither
  pushes: when `shape.md` says records are pushed, run `git push` (shared) or
  `oat project push` (synced) after it.
- `oat project push` and `oat project pull`: publish and fetch the records of
  a synced project.

## Shaping and reshaping

`shape.md` is shaped with the user through the `oat-project-freestyle` skill,
which resumes at the first section not yet shaped. To change how the project
runs, follow the `oat-project-freestyle` skill's own `references/reshape.md`
(in the installed skill's folder, not this project's `references/`): edit only
the affected `shape.md` sections, update `Last shaped:`, state when the change
takes effect, and attempt a `decision` entry in the project log.

At each reshape checkpoint, and when a plan written after shaping is accepted,
ask the two checkpoint questions in that reference: does the shape still fit,
and is the plan and its process proportionate to its value (process time
against code time, the risk each safeguard covers, the lightest process that
keeps the real gates)? A "no" goes to the owner as a recommendation, even in
an unattended run.

When a review recorded in `shape.md` comes due, re-check its mechanism before
using it. If it is unavailable, keep the review's intent, tell the user, log
it, and reshape: an agreement that stopped working is a reshape trigger.
