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
