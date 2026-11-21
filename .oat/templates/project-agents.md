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
- `state.md`: the project's identity (`oat_workflow_mode: freestyle`); it has no
  lifecycle fields.
- The project's documents, listed in `shape.md` under `## Documents`.
- `project-log.md`, when the project log is enabled.

## Single writer

Only the orchestrator, the agent running this project with the user, writes
the project records: `shape.md`, the project's documents and `project-log.md`.
Delegates (subagents, lanes, other sessions) return their results to the
orchestrator and never edit these files; a delegate's PR holds code only. On
resume, reconcile the records against the forge (open and merged PRs, branch
heads) before acting on them.

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

## Records commands

- `oat project status --project-path <project-path>`: the mode and the paths
  of this file and `shape.md`.
- `oat project scope <project-path> --format value`: the current scope.
- `oat project log append --project <project-path> ...`: append a project-log
  entry (see `--help`). A `skipped` result means the project log is disabled;
  `shape.md` must still stand on its own.
- `oat template resolve <name> --output <path>`: copy an OAT template as the
  starting point for a project document.
- `oat project push` and `oat project pull`: publish and fetch the records of
  a synced project.

## Shaping and reshaping

`shape.md` is shaped with the user through the `oat-project-freestyle` skill,
which resumes at the first section not yet shaped. To change how the project
runs, follow that skill's reshape reference (`references/reshape.md`): edit only
the affected `shape.md` sections, update `Last shaped:`, state when the change
takes effect, and attempt a `decision` entry in the project log.
