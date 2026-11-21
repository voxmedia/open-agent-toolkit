---
name: oat-project-freestyle
description: Use when creating or resuming a freestyle OAT project (OAT structure and records, no lifecycle workflow), or when shaping or reshaping how one runs in its shape.md. Not for spec-driven, quick, lite, brief, goal or import projects.
argument-hint: '<project-name> ["project description"] [--scope shared|local|synced]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
metadata:
  version: 1.0.0
---

# Freestyle Project

Create or resume a **freestyle** OAT project and shape it with the user. A
freestyle project has OAT's structure and records but no lifecycle workflow: no
gates, checkpoints, required reviews, automatic commits, pushes or PRs. How it
runs is agreed with the user in a shaping conversation and written into the
project's `shape.md`. This skill owns that conversation and every later
reshape. It does not run the project's work: once the shape is agreed, the
orchestrator works as `shape.md` says.

## Prerequisites

- A repository initialized for OAT (`.oat/` exists).
- An `oat` CLI that scaffolds freestyle projects: `oat project new --help`
  lists `freestyle` among the `--mode` choices. If it does not, stop and ask
  the user to update the OAT CLI; do not build the scaffold by hand.

## Mode Assertion

**OAT MODE: Freestyle**

**Purpose:** Create the project with the CLI, then shape it with the user one
topic at a time, writing each answer into `shape.md` as it is given, so the
shape survives a detour, a restart or context compaction.

**BLOCKED Activities:**

- No commit, push or PR after creation unless `shape.md`'s
  `## Commits, PRs and merges` section agrees to it, and none at all while that
  section is not yet shaped or is deferred.
- No edits to the project `AGENTS.md`; it is OAT-owned.
- No lifecycle machinery: no `oat_phase` or other lifecycle fields in
  `state.md`, no gates, HiLL checkpoints or required reviews.
- No fixed scripted interview: ask in proportion to the project's size.
- No implementation work.

**ALLOWED Activities:**

- Creating the project with `oat project new --mode freestyle`.
- Writing `shape.md`, and the project documents the user agrees to.
- Copying an OAT template as a document's starting point.
- A brainstorm or discovery detour, and later reshapes.

## Progress Indicators (User-Facing)

Print this banner once after entry:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ FREESTYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use these compact progress lines:

- `[1/4] Resolving the freestyle project…`
- `[2/4] Reading AGENTS.md and shape.md…`
- `[3/4] Shaping from <topic>…` or `[3/4] Reshaping <topic>…`
- `[4/4] Reporting the shape…`

## Writing shape.md

`shape.md` is the checklist and the only durable record of the shaping
conversation:

- Write each answer into its topic section as soon as the user gives it,
  replacing `_Not yet shaped._`. Never hold an answer only in conversation.
- After every change, set `**Last shaped:**` to today's date (UTC,
  `YYYY-MM-DD`).
- Keep the section headings exactly as scaffolded; the skill and OAT's future
  additions find sections by them. The text inside a section is free-form.
- The CLI never reads `shape.md`. Nothing validates it but this skill and the
  user.

## Process

### Step 1: Resolve or Create the Project

Surface the working tree first: run `git status --porcelain` and show the user
anything dirty. This skill commits nothing, and `oat project new` commits only
the files it creates, so unrelated changes stay where they are.

**Resume.** When the user names an existing project, or the active project
(`oat config get activeProject`) has `oat_workflow_mode: freestyle` in its
`state.md`, resume it: never re-scaffold, and never copy a template over
`shape.md`. Continue at Step 2.

**Another mode.** When the active project is in another mode and the user did
not ask for a new project, say that this skill only shapes freestyle projects
and stop. Promotion to or from freestyle does not exist.

**Create.** Otherwise resolve a project name and a one-line description from
the arguments, asking for whatever is missing. Choose the scope with the user,
recommending the repository default; scope is chosen here, not shaped:

- `shared`: the project folder is committed on the current branch;
  `oat project new` commits the scaffold unless `--no-commit` is passed.
- `local`: the project stays uncommitted in this checkout, on one machine.
- `synced`: the project lives in a nested worktree and is published to
  `refs/oat/projects/<slug>`; it needs an `origin` remote.

```bash
oat project new "{project-name}" --mode freestyle --scope "{scope}"
PROJECT_PATH=$(oat config get activeProject)
```

Confirm that `"$PROJECT_PATH/state.md"` reports `oat_workflow_mode: freestyle`
and that `"$PROJECT_PATH/AGENTS.md"` and `"$PROJECT_PATH/shape.md"` exist. A
missing file or another mode stops the run before any write. Keep the
description for the Goal topic; do not write it into `shape.md` until the user
confirms the goal.

### Step 2: Read the Project

Read `"$PROJECT_PATH/AGENTS.md"` first, then `"$PROJECT_PATH/shape.md"`.
Determine:

1. the first topic section, in order, that still reads `_Not yet shaped._`,
   and any `**Shaping resumes at:**` line left by a detour;
2. the `## Undecided` items whose moment has come; and
3. the checkpoints under `## Reshape checkpoints` that have been reached.

Then choose what to load:

- A topic is not yet shaped → read `references/kickoff.md` and continue at
  Step 3.
- Every topic is shaped, and an Undecided item is due, a reshape checkpoint is
  reached, or the user wants to change how the project runs → read
  `references/reshape.md` and continue at Step 4.
- Otherwise report that the shape is complete and nothing is due, and stop.

Report what you found before asking anything: which topics are shaped, which
are deferred, and where shaping resumes.

### Step 3: Shape

Follow `references/kickoff.md` from the first topic not yet shaped. Never
re-ask a topic that already holds an answer; changing an answer is a reshape.
An Undecided item that comes due during shaping is asked when its topic's turn
comes or at the end, as the user prefers.

### Step 4: Reshape

Follow `references/reshape.md`. Edit only the sections the change affects.

### Step 5: Report

Summarize for the user: the project path and scope, the topics shaped and the
items deferred with when each is due, and the paths of `AGENTS.md` and
`shape.md` (`oat project status --project-path "$PROJECT_PATH"` names both).
State plainly whether `shape.md` and any new documents are committed, and why:
they are committed only as the `## Commits, PRs and merges` section agrees,
following the records rule in `AGENTS.md` for the project's scope. Then stop;
the orchestrator runs the project from here.

## Success Criteria

- ✅ A new project is created only through `oat project new --mode freestyle`,
  in the scope the user chose, and the skill confirms `state.md`, `AGENTS.md`
  and `shape.md` before writing.
- ✅ Every answer is in `shape.md` as soon as it is given, and
  `**Last shaped:**` is current.
- ✅ A resumed project continues at the first topic not yet shaped, without
  re-asking answered ones, and checks Undecided items and reshape checkpoints.
- ✅ No commit, push or PR is made except as `shape.md` agrees; none while the
  commit agreement is not yet shaped or is deferred.
- ✅ The project `AGENTS.md` is never edited.
