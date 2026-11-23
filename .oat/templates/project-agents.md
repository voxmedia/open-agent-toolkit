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
- `project-log.md`, when the project log is enabled.

## Single writer

Only the orchestrator, the agent running this project with the user, writes
the project records: `shape.md`, the project's documents, `linked-projects.md`
and `project-log.md`, and it alone claims the project with
`oat project orchestrator set`. Delegates (subagents, lanes, other sessions)
return their results to the orchestrator and never edit these files; a
delegate's PR holds code only. Each project writes only its own records: a
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
  `oat project linked add` and `oat project linked ack`) refuse to run off the
  recorded branch, on a detached HEAD, or while the project is unclaimed.
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

## Records commands

- `oat project status --project-path <project-path>`: the mode, the paths of
  this file and `shape.md`, the orchestrator branch beside this checkout's
  branch, and the open linked projects.
- `oat project orchestrator set [--branch <name>] [--replace]`: claim the
  project or change its orchestrator branch.
- `oat project linked add <child> --purpose <text>` and
  `oat project linked ack <child>`: open and close rows in
  `linked-projects.md`.
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
  starting point for a project document.
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
